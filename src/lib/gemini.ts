import { GoogleGenAI, GenerateContentParameters } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});

// Export a typed function for generating content
export const generateContent = async (params: Omit<GenerateContentParameters, 'model'>) => {
  return ai.models.generateContent({
    model: 'gemini-2.0-flash', // ✅ Use correct model name
    ...params
  });
};