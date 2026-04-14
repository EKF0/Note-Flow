import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { NoteCategory, NoteStatus } from "../types";

// Configuration
const MODEL_CONFIG = {
  FLASH: 'gemini-2.5-flash',
  FLASH_LITE: 'gemini-2.5-flash-lite-latest',
  PRO: 'gemini-3-pro-preview',
  IMAGE: 'gemini-2.5-flash-image',
  IMAGE_PRO: 'gemini-3-pro-image-preview',
  TTS: 'gemini-2.5-flash-preview-tts',
} as const;

const THINKING_BUDGET = 32768;
const DEFAULT_VOICE = 'Kore';

// Helper to ensure we use the latest API key from the environment (injected after key selection)
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helpers
const fileToPart = (data: string, mimeType: string) => {
  const base64Data = data.includes('base64,') ? data.split('base64,')[1] : data;
  return {
    inlineData: {
      data: base64Data,
      mimeType
    }
  };
};

const extractSources = (chunks: any[]): string => {
  return chunks
    .filter((chunk: any) => chunk.web?.uri)
    .map((chunk: any) => `\n- [${chunk.web.title || 'Source'}](${chunk.web.uri})`)
    .join('');
};

const extractImageData = (response: any): string | null => {
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

// Error handling utilities
const handleAiError = (error: unknown, context: string, fallback?: any) => {
  console.error(`${context}:`, error);
  return fallback;
};

export const geminiService = {
  async summarizeNote(content: string): Promise<string> {
    if (!content) return "";
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: MODEL_CONFIG.FLASH,
        contents: `Summarize the following note strictly in 2-3 sentences: \n\n${content}`,
      });
      return response.text || "Could not generate summary.";
    } catch (error) {
      return handleAiError(error, "AI Summarization", "Error connecting to AI.");
    }
  },

  async categorizeAndPredict(content: string, title: string): Promise<{ category: NoteCategory, status: NoteStatus, tags: string[] }> {
    const prompt = `
      Analyze this note (Title: ${title}, Content: ${content}).
      1. Categorize it into exactly one of: Work, Personal, Ideas, Uncategorized.
      2. Predict its status based on completeness: Draft, In Progress, Completed.
      3. Generate up to 3 short keyword tags.
    `;

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, enum: Object.values(NoteCategory) },
        status: { type: Type.STRING, enum: Object.values(NoteStatus) },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["category", "status", "tags"]
    };

    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: MODEL_CONFIG.FLASH_LITE,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        }
      });
      
      const jsonText = response.text;
      if (!jsonText) throw new Error("Empty AI response");
      
      return JSON.parse(jsonText);
    } catch (error) {
      console.error("AI Analysis Error:", error);
      return {
        category: NoteCategory.UNCATEGORIZED,
        status: NoteStatus.DRAFT,
        tags: []
      };
    }
  },

  async searchGrounding(query: string): Promise<string> {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: MODEL_CONFIG.FLASH,
        contents: query,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      const text = response.text || "";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = extractSources(chunks);

      return text + (sources ? "\n\nSources:" + sources : "");
    } catch (error) {
      return handleAiError(error, "Search Grounding", "Error performing search.");
    }
  },

  async mapGrounding(query: string, location?: {latitude: number, longitude: number}): Promise<string> {
    try {
      const ai = getAi();
      const config: any = {
        tools: [{ googleMaps: {} }],
      };
      
      if (location) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: location
          }
        };
      }

      const response = await ai.models.generateContent({
        model: MODEL_CONFIG.FLASH,
        contents: query,
        config: config
      });
      
      return response.text || "No maps data found.";
    } catch (error) {
      return handleAiError(error, "Map Grounding", "Error querying maps.");
    }
  },

  async complexThinking(prompt: string): Promise<string> {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: MODEL_CONFIG.PRO,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: THINKING_BUDGET }
        }
      });
      return response.text || "No response generated.";
    } catch (error) {
      return handleAiError(error, "Complex Thinking", "Error in thinking mode.");
    }
  },

  async chatMessage(history: {role: string, parts: {text: string}[]}[], message: string): Promise<string> {
    try {
        const ai = getAi();
        const chat = ai.chats.create({
            model: MODEL_CONFIG.PRO,
            history: history
        });
        const result = await chat.sendMessage({ message });
        return result.text || "";
    } catch (error) {
        return handleAiError(error, "Chat", "Chat Error.");
    }
  },

  async generateImage(prompt: string, size: '1K' | '2K' | '4K'): Promise<string | null> {
    try {
      const ai = getAi();
      const isHighRes = size === '2K' || size === '4K';
      const model = isHighRes ? MODEL_CONFIG.IMAGE_PRO : MODEL_CONFIG.IMAGE;
      
      const config: any = isHighRes ? {
        imageConfig: { imageSize: size }
      } : {};

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }] },
        config: config
      });

      return extractImageData(response);
    } catch (error) {
      console.error("Image Gen Error:", error);
      throw error;
    }
  },

  async editImage(base64Image: string, prompt: string): Promise<string | null> {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: MODEL_CONFIG.IMAGE,
        contents: {
          parts: [
            fileToPart(base64Image, 'image/png'),
            { text: prompt }
          ]
        }
      });

      return extractImageData(response);
    } catch (error) {
      console.error("Image Edit Error:", error);
      throw error;
    }
  },

  async transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: MODEL_CONFIG.FLASH,
        contents: {
          parts: [
            fileToPart(base64Audio, mimeType),
            { text: "Transcribe this audio accurately." }
          ]
        }
      });
      return response.text || "";
    } catch (error) {
      return handleAiError(error, "Audio Transcription", "Error transcribing audio.");
    }
  },

  async generateSpeech(text: string): Promise<string | null> {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: MODEL_CONFIG.TTS,
        contents: { parts: [{ text }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: DEFAULT_VOICE }
            }
          }
        }
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return base64Audio || null;
    } catch (error) {
        console.error("TTS Error:", error);
        return null;
    }
  },

  async analyzeVideo(base64Video: string, mimeType: string, prompt: string): Promise<string> {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: MODEL_CONFIG.PRO,
        contents: {
          parts: [
            fileToPart(base64Video, mimeType),
            { text: prompt || "Analyze this video." }
          ]
        }
      });
      return response.text || "";
    } catch (error) {
        return handleAiError(error, "Video Analysis", "Error analyzing video.");
    }
  }
};