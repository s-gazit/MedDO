// Check and normalize the model output, per spec/ARCHITECTURE.md section 4.6.
// Structure errors => null (unreadable). Bad values => null ("unknown"). Long text => cut.
import { CONTENT_TYPES, TASK_TYPES } from './lists.js';
import { validDate, validTime, resolveDueDate } from './dates.js';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStrOrNull = (v) => v === null || typeof v === 'string';

const MAX_LEN = { specialty: 60, key_info: 1000, provider: 200, description: 200 };
const FIELDS = ['content_type', 'specialty', 'doc_date', 'provider', 'key_info'];

// Trimmed string, cut to max; empty becomes null.
function text(v, max) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return max ? t.slice(0, max) : t;
}

function normalizeField(key, value) {
  if (key === 'content_type') return CONTENT_TYPES.includes(value) ? value : null;
  if (key === 'doc_date') return validDate(value);
  return text(value, MAX_LEN[key]);
}

// raw: the model text. issues: [{ id, name }] sent with the request.
// Returns the cleaned data object, or null when the output is not usable.
export function validateOutput(raw, issues = []) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(data) || typeof data.raw_text !== 'string') return null;

  const out = { raw_text: data.raw_text };
  for (const key of FIELDS) {
    const f = data[key];
    if (!isObj(f) || !isStrOrNull(f.value ?? null)) return null;
    out[key] = { value: normalizeField(key, f.value ?? null), certain: f.certain === true };
  }

  const s = data.issue_suggestion;
  if (!isObj(s) || !isStrOrNull(s.issue_id ?? null)) return null;
  const known = issues.some((i) => i.id === s.issue_id);
  out.issue_suggestion = { issue_id: known ? s.issue_id : null, certain: known && s.certain === true };

  if (!Array.isArray(data.tasks)) return null;
  const docDate = out.doc_date.value;
  out.tasks = [];
  for (const t of data.tasks) {
    if (!isObj(t) || typeof t.description !== 'string') return null;
    const description = text(t.description, MAX_LEN.description);
    if (!description) continue; // a task without a description is dropped
    out.tasks.push({
      description,
      type: TASK_TYPES.includes(t.type) ? t.type : null,
      due_date: resolveDueDate(t.due_date, t.due_relative, docDate), // due_relative is not returned
      due_time: validTime(t.due_time),
      certain: t.certain === true,
    });
  }
  return out;
}
