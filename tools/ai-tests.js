// Stage 0 runner: each test document goes through the real path:
// shrink (images) -> upload to Storage -> signed URL -> POST /api/ask -> delete the file.
// Development tool only. Not linked from the app.
import { supabase } from '../js/supabase.js';
import { getSession, signIn } from '../js/auth.js';
import { FUNCTION_URL } from '../js/config.js';
import { prepareFile } from '../js/image.js';

const PAUSE_MS = 7000; // Gemini rate limit is about 10 requests per minute
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let results = null;
window.aiTestResults = null; // readable from the dev tools

async function init() {
  const session = await getSession();
  if (session) return showRunner();
  const form = $('login');
  form.hidden = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = await signIn(form.email.value.trim(), form.password.value).catch(() => false);
    if (ok) {
      form.hidden = true;
      showRunner();
    } else {
      const err = form.querySelector('.form-error');
      err.textContent = 'הכניסה לא הצליחה';
      err.hidden = false;
    }
  });
}

function showRunner() {
  $('runner').hidden = false;
  $('run').addEventListener('click', runAll);
  $('download').addEventListener('click', download);
}

function row(file) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td dir="ltr">${file}</td><td>ממתין</td><td></td>`;
  $('rows').append(tr);
  return tr;
}

async function runOne(file, issues, session) {
  const ext = file.split('.').pop().toLowerCase();
  const res = await fetch(`../ai-tests/${encodeURIComponent(file)}`);
  if (!res.ok) throw new Error('missing_file');
  const prepared = await prepareFile(await res.blob(), MIME[ext]);

  const path = `${session.user.id}/${crypto.randomUUID()}.${prepared.ext}`;
  const up = await supabase.storage.from('documents').upload(path, prepared.blob, { contentType: prepared.mimeType });
  if (up.error) throw new Error('upload_failed');
  try {
    const signed = await supabase.storage.from('documents').createSignedUrl(path, 300);
    if (signed.error) throw new Error('sign_failed');
    const r = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ mode: 'file', file_url: signed.data.signedUrl, mime_type: prepared.mimeType, issues }),
    });
    return { http: r.status, bytes: prepared.blob.size, body: await r.json().catch(() => null) };
  } finally {
    await supabase.storage.from('documents').remove([path]);
  }
}

async function runAll() {
  $('run').disabled = true;
  $('download').disabled = true;
  $('rows').innerHTML = '';
  const session = await getSession();
  const docs = await (await fetch('../ai-tests/expected.json', { cache: 'no-store' })).json();
  const { data: issueRows } = await supabase.from('medical_issues').select('id, name').eq('status', 'open');
  const issues = issueRows || [];

  results = { run_at: new Date().toISOString(), issues_sent: issues.length, documents: [] };
  for (let i = 0; i < docs.documents.length; i++) {
    const file = docs.documents[i].file;
    const tr = row(file);
    $('status').textContent = `מריץ ${i + 1} מתוך ${docs.documents.length}...`;
    const t0 = performance.now();
    let entry;
    try {
      entry = { file, ...(await runOne(file, issues, session)) };
    } catch (e) {
      entry = { file, error: e.message };
    }
    entry.ms = Math.round(performance.now() - t0);
    results.documents.push(entry);
    const ok = entry.body?.ok === true;
    tr.children[1].textContent = ok ? 'נקרא' : (entry.body?.error?.code || entry.error || `HTTP ${entry.http}`);
    tr.children[1].className = ok ? 'ok' : 'bad';
    tr.children[2].textContent = `${(entry.ms / 1000).toFixed(1)} שנ׳`;
    if (i < docs.documents.length - 1) await sleep(PAUSE_MS);
  }
  window.aiTestResults = results;
  $('status').textContent = 'ההרצה הסתיימה.';
  $('run').disabled = false;
  $('download').disabled = false;
}

function download() {
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ai-tests-results-${results.run_at.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

init();
