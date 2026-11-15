// Calls the single function (/api/ask). Always resolves to { ok: true, data } or { ok: false, code }.
import { supabase } from './supabase.js';
import { FUNCTION_URL } from './config.js';

const CLIENT_TIMEOUT_MS = 60000;

export async function analyzeDocument(payload) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, code: 'unauthorized' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    if (body?.ok === true && body.data) return { ok: true, data: body.data };
    return { ok: false, code: body?.error?.code || 'unavailable' };
  } catch {
    // Network error or timeout.
    return { ok: false, code: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}
