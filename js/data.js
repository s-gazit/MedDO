// Data access: Supabase tables and the private Storage bucket. Throws on any error.
import { supabase } from './supabase.js';

const BUCKET = 'documents';
const SIGNED_URL_SECONDS = 300;

function check({ data, error }) {
  if (error) throw error;
  return data;
}

// ---------- medical_issues ----------

export async function listIssues() {
  return check(await supabase.from('medical_issues').select('id, name, status').order('created_at'));
}

export async function createIssue({ name, status, next_step }) {
  const row = check(await supabase.from('medical_issues')
    .insert({ name, status, next_step: next_step || null }).select('id').single());
  return row.id;
}

// ---------- documents ----------

export async function createDocument(doc) {
  const row = check(await supabase.from('documents').insert(doc).select('id').single());
  return row.id;
}

// ---------- tasks ----------

export async function createTasks(tasks) {
  if (!tasks.length) return;
  check(await supabase.from('tasks').insert(tasks));
}

// ---------- Storage ----------

// Uploads to {user_id}/{uuid}.{ext} and returns the path.
export async function uploadFile(blob, mimeType, ext) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error('no_session');
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  check(await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mimeType }));
  return path;
}

export async function signedUrl(path) {
  return check(await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS)).signedUrl;
}

export async function removeFile(path) {
  check(await supabase.storage.from(BUCKET).remove([path]));
}
