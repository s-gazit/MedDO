// The single serverless function: POST /api/ask
// CORS -> method -> auth (Supabase session) -> input validation -> file read -> Gemini -> structure check -> JSON.
// Always answers JSON. Logs only error codes and statuses, never document content.
import {
  MAX_FILE_BYTES, MAX_TEXT_CHARS, MAX_ISSUES, MAX_ISSUE_NAME, ALLOWED_MIME, STORAGE_BUCKET,
} from '../lib/config.js';
import { MESSAGES, STATUS } from '../lib/messages.js';
import { extract, GeminiError } from '../lib/gemini.js';
import { validateOutput } from '../lib/validate.js';

function setCors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

function fail(res, code) {
  console.error('ask_error', code, STATUS[code]);
  res.status(STATUS[code]).json({ ok: false, error: { code, message: MESSAGES[code] } });
}

async function isAuthenticated(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: authHeader },
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Returns a normalized input object, or null when invalid.
function validateInput(body) {
  if (!body || typeof body !== 'object') return null;

  const issues = body.issues ?? [];
  if (!Array.isArray(issues) || issues.length > MAX_ISSUES) return null;
  for (const i of issues) {
    if (!i || typeof i.id !== 'string' || typeof i.name !== 'string' || i.name.length > MAX_ISSUE_NAME) return null;
  }
  const cleanIssues = issues.map((i) => ({ id: i.id, name: i.name }));

  if (body.mode === 'text') {
    if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > MAX_TEXT_CHARS) return null;
    return { mode: 'text', text: body.text, issues: cleanIssues };
  }
  if (body.mode === 'file') {
    const prefix = `${process.env.SUPABASE_URL}/storage/v1/object/sign/${STORAGE_BUCKET}/`;
    if (typeof body.file_url !== 'string' || !body.file_url.startsWith(prefix)) return null;
    if (!ALLOWED_MIME.includes(body.mime_type)) return null;
    return { mode: 'file', fileUrl: body.file_url, mimeType: body.mime_type, issues: cleanIssues };
  }
  return null;
}

class InputError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

async function readFile(url) {
  let r;
  try {
    r = await fetch(url);
  } catch {
    throw new InputError('unavailable');
  }
  if (!r.ok) throw new InputError('bad_request'); // expired or invalid signed URL
  const declared = Number(r.headers.get('content-length') || 0);
  if (declared > MAX_FILE_BYTES) throw new InputError('too_large');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_FILE_BYTES) throw new InputError('too_large');
  return buf.toString('base64');
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowed = process.env.ALLOWED_ORIGIN;

  // 1. CORS. A request without an Origin header is treated as an unauthorized origin.
  if (!origin || !allowed || origin !== allowed) return fail(res, 'forbidden_origin');
  setCors(res, origin);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // 2. Method
  if (req.method !== 'POST') return fail(res, 'method_not_allowed');

  // 3. Auth
  if (!(await isAuthenticated(req.headers.authorization))) return fail(res, 'unauthorized');

  // 4. Input
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const input = validateInput(body);
  if (!input) return fail(res, 'bad_request');

  try {
    // 5. File (read by the function itself from the signed URL)
    const doc = input.mode === 'text'
      ? { text: input.text }
      : { mimeType: input.mimeType, base64: await readFile(input.fileUrl) };

    // 6. Gemini
    const raw = await extract(doc, input.issues);

    // 7. Structure check
    const data = validateOutput(raw);
    if (!data) return fail(res, 'unreadable');

    // 8. Answer
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    const code = err instanceof GeminiError || err instanceof InputError ? err.code : 'unavailable';
    return fail(res, code);
  }
}
