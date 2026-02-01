import { GoogleGenAI } from '@google/genai';

// Initialize the client once
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY // Use process.env for Node.js
});

// Export the specific model you want to use
export const model = ai.models.get('gemini-2.5-flash');