import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { NoteCategory, NoteStatus } from "../types";

// Helper to ensure we use the latest API key from the environment (injected after key selection)
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helpers
const fileToPart = (data: string, mimeType: string) => {
  // strip base64 prefix if present
  const base64Data = data.includes('base64,') ? data.split('base64,')[1] : data;
  return {
    inlineData: {
      data: base64Data,
      mimeType
    }
  };
};

export const geminiService = {
  // Core: Summarize (Standard Flash)
  async summarizeNote(content: string): Promise<string> {
    if (!content) return "";
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Summarize the following note strictly in 2-3 sentences: \n\n${content}`,
      });
      return response.text || "Could not generate summary.";
    } catch (error) {
      console.error("AI Error:", error);
      return "Error connecting to AI.";
    }
  },

  // Feature: Fast AI Responses (Flash Lite)
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
      // using gemini-2.5-flash-lite for low latency
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite-latest',
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

  // Feature: Search Grounding
  async searchGrounding(query: string): Promise<string> {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      // Extract grounding metadata if needed, but text usually contains the answer
      // For this app, we return the text content which includes citations in many cases
      const text = response.text || "";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      let sources = "";
      chunks.forEach((chunk: any) => {
          if (chunk.web?.uri) {
              sources += `\n- [${chunk.web.title || 'Source'}](${chunk.web.uri})`;
          }
      });

      return text + (sources ? "\n\nSources:" + sources : "");
    } catch (error) {
      console.error("Search Error:", error);
      return "Error performing search.";
    }
  },

  // Feature: Maps Grounding
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
        model: 'gemini-2.5-flash',
        contents: query,
        config: config
      });
      
      return response.text || "No maps data found.";
    } catch (error) {
      console.error("Maps Error:", error);
      return "Error querying maps.";
    }
  },

  // Feature: Thinking Mode (Gemini 3 Pro)
  async complexThinking(prompt: string): Promise<string> {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });
      return response.text || "No response generated.";
    } catch (error) {
      console.error("Thinking Error:", error);
      return "Error in thinking mode.";
    }
  },

  // Feature: Chat (Gemini 3 Pro)
  async chatMessage(history: {role: string, parts: {text: string}[]}[], message: string): Promise<string> {
    try {
        const ai = getAi();
        const chat = ai.chats.create({
            model: 'gemini-3-pro-preview',
            history: history
        });
        const result = await chat.sendMessage({ message });
        return result.text || "";
    } catch (error) {
        console.error("Chat Error:", error);
        return "Chat Error.";
    }
  },

  // Feature: Image Generation
  async generateImage(prompt: string, size: '1K' | '2K' | '4K'): Promise<string | null> {
    try {
      const ai = getAi();
      
      // Default to Flash Image for 1K (standard) to avoid permission issues with Pro models if not needed.
      // 2.5 Flash Image is generally cheaper and more accessible.
      let model = 'gemini-2.5-flash-image';
      let config: any = {};

      // Upgrade to Pro Image Preview ONLY if high resolution is explicitly requested
      if (size === '2K' || size === '4K') {
          model = 'gemini-3-pro-image-preview';
          config = {
              imageConfig: {
                  imageSize: size
              }
          };
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }] },
        config: config
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Image Gen Error:", error);
      throw error;
    }
  },

  // Feature: Image Editing (Nano Banana - Gemini 2.5 Flash Image)
  async editImage(base64Image: string, prompt: string): Promise<string | null> {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            fileToPart(base64Image, 'image/png'), // Assuming png/jpeg compatible
            { text: prompt }
          ]
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Image Edit Error:", error);
      throw error;
    }
  },

  // Feature: Audio Transcription (Gemini 2.5 Flash)
  async transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            fileToPart(base64Audio, mimeType),
            { text: "Transcribe this audio accurately." }
          ]
        }
      });
      return response.text || "";
    } catch (error) {
      console.error("Transcription Error:", error);
      return "Error transcribing audio.";
    }
  },

  // Feature: Generate Speech (TTS)
  async generateSpeech(text: string): Promise<string | null> {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: { parts: [{ text }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }
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

  // Feature: Video Understanding (Gemini 3 Pro)
  async analyzeVideo(base64Video: string, mimeType: string, prompt: string): Promise<string> {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            fileToPart(base64Video, mimeType),
            { text: prompt || "Analyze this video." }
          ]
        }
      });
      return response.text || "";
    } catch (error) {
        console.error("Video Analysis Error:", error);
        return "Error analyzing video.";
    }
  }
};