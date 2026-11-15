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

const ISSUE_COLS = 'id, name, status, next_step, created_at';

export async function listIssuesFull() {
  return check(await supabase.from('medical_issues').select(ISSUE_COLS).order('created_at'));
}

// One issue, or null when it does not exist (or the id is not a valid uuid).
export async function getIssue(id) {
  if (!isUuid(id)) return null;
  return check(await supabase.from('medical_issues').select(ISSUE_COLS).eq('id', id).maybeSingle());
}

export async function updateIssue(id, { name, status, next_step }) {
  check(await supabase.from('medical_issues')
    .update({ name, status, next_step: next_step || null }).eq('id', id));
}

// ---------- documents ----------

export async function createDocument(doc) {
  const row = check(await supabase.from('documents').insert(doc).select('id').single());
  return row.id;
}

export async function listIssueDocuments(issueId) {
  return check(await supabase.from('documents')
    .select('id, content_type, specialty, doc_date, provider, file_mime, created_at')
    .eq('medical_issue_id', issueId)
    .order('doc_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false }));
}

// One document with the name and status of its issue, or null.
export async function getDocument(id) {
  if (!isUuid(id)) return null;
  return check(await supabase.from('documents')
    .select('id, content_type, doc_date, file_path, file_mime, input_text, medical_issue_id, medical_issues(name, status)')
    .eq('id', id).maybeSingle());
}

// ---------- tasks ----------

const TASK_COLS = 'id, description, type, status, due_date, due_time, document_id, medical_issue_id';

export async function createTasks(tasks) {
  if (!tasks.length) return;
  check(await supabase.from('tasks').insert(tasks));
}

// All "todo" and "waiting" tasks, by due date (no date last).
export async function listOpenTasks() {
  return check(await supabase.from('tasks').select(TASK_COLS)
    .in('status', ['todo', 'waiting'])
    .order('due_date', { ascending: true, nullsFirst: false }));
}

// All tasks of one issue, including done ones.
export async function listIssueTasks(issueId) {
  return check(await supabase.from('tasks').select(TASK_COLS)
    .eq('medical_issue_id', issueId)
    .order('due_date', { ascending: true, nullsFirst: false }));
}

// Every task, including done ones, by due date (no date last).
export async function listAllTasks() {
  return check(await supabase.from('tasks').select(TASK_COLS)
    .order('due_date', { ascending: true, nullsFirst: false }));
}

// One task, or null when it does not exist (or the id is not a valid uuid).
export async function getTask(id) {
  if (!isUuid(id)) return null;
  return check(await supabase.from('tasks').select(TASK_COLS).eq('id', id).maybeSingle());
}

export async function createTask(task) {
  check(await supabase.from('tasks').insert(task));
}

export async function updateTask(id, changes) {
  check(await supabase.from('tasks').update(changes).eq('id', id));
}

export async function deleteTask(id) {
  check(await supabase.from('tasks').delete().eq('id', id));
}

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
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
