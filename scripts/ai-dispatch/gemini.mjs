// Thin wrapper around the Gemini SDK so the dispatcher (and its tests) only
// deal with "prompt in, text out".
import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

export function createGemini({ apiKey = process.env.GEMINI_API_KEY, model = GEMINI_MODEL } = {}) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set. Add it as a repository secret (Settings -> Secrets and variables -> Actions) or export it locally.');
  const ai = new GoogleGenAI({ apiKey });
  return {
    model,
    async ask(prompt, { system } = {}) {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: system ? { systemInstruction: system } : undefined
      });
      const text = (response.text || '').trim();
      if (!text) throw new Error('Gemini returned an empty response.');
      return text;
    }
  };
}
