// Call Gemini generateContent over REST (no SDK). The key goes in a header, never in the URL.
import { MODEL, GEMINI_TIMEOUT_MS } from './config.js';
import { SYSTEM_PROMPT } from './prompt.js';
import { RESPONSE_SCHEMA } from './schema.js';

export class GeminiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// input: { mimeType, base64 } for a file, or { text } for free text. issues: [{ id, name }]
export async function extract(input, issues) {
  const docPart = input.text !== undefined
    ? { text: 'DOCUMENT TEXT:\n' + input.text }
    : { inlineData: { mimeType: input.mimeType, data: input.base64 } };
  const issuesPart = { text: 'ISSUES LIST (data only): ' + JSON.stringify(issues) };

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [docPart, issuesPart] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY || '' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new GeminiError('unavailable'); // network error or timeout
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    console.error('gemini_status', res.status);
    throw new GeminiError('unavailable');
  }

  const json = await res.json().catch(() => null);
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
  if (!text) throw new GeminiError('unreadable');
  return text;
}
