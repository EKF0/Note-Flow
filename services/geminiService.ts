import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Note, NoteCategory, NoteStatus } from "../types";

// Note: In a production app, the API Key should be proxy-served or strictly env-managed.
// Assuming process.env.API_KEY is available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

export const geminiService = {
  async summarizeNote(content: string): Promise<string> {
    if (!content) return "";
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Summarize the following note strictly in 2-3 sentences: \n\n${content}`,
      });
      return response.text || "Could not generate summary.";
    } catch (error) {
      console.error("AI Error:", error);
      return "Error connecting to AI.";
    }
  },

  async suggestImprovements(content: string): Promise<string> {
    if (!content) return "";
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Review the following note content. Suggest 3 concise improvements or point out missing key details if it looks like a plan. Format as a bulleted list.\n\n${content}`,
      });
      return response.text || "No suggestions available.";
    } catch (error) {
      console.error("AI Error:", error);
      return "Error fetching suggestions.";
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
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
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
  }
};