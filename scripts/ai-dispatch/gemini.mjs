// Thin wrapper around the Gemini SDK so the dispatcher (and its tests) only
// deal with "prompt in, text out".
import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// 429 (rate limit) and 5xx ("model is experiencing high demand") are usually
// over within a minute, so retry those before giving up.
const RETRY_DELAYS_MS = [5000, 15000, 40000];
const retryable = err => err?.status === 429 || (err?.status >= 500 && err?.status < 600);
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function withRetry(fn, { delays = RETRY_DELAYS_MS, log = console.log } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!retryable(err) || attempt >= delays.length) throw err;
      log(`Gemini returned ${err.status}; retrying in ${delays[attempt] / 1000}s`);
      await wait(delays[attempt]);
    }
  }
}

export function createGemini({ apiKey = process.env.GEMINI_API_KEY, model = GEMINI_MODEL } = {}) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set. Add it as a repository secret (Settings -> Secrets and variables -> Actions) or export it locally.');
  const ai = new GoogleGenAI({ apiKey });
  return {
    model,
    async ask(prompt, { system } = {}) {
      const response = await withRetry(() => ai.models.generateContent({
        model,
        contents: prompt,
        config: system ? { systemInstruction: system } : undefined
      }));
      const text = (response.text || '').trim();
      if (!text) throw new Error('Gemini returned an empty response.');
      return text;
    }
  };
}
