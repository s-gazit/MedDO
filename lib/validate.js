// Structural check of the model output. Milestone 1: shape only.
// Value normalization (codes, dates, lengths, issue ids, relative dates) is added in Milestone 2.

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStrOrNull = (v) => v === null || typeof v === 'string';

const FIELDS = ['content_type', 'specialty', 'doc_date', 'provider', 'key_info'];

// Returns the cleaned data object, or null when the output is not usable (=> unreadable).
export function validateOutput(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(data) || typeof data.raw_text !== 'string') return null;

  const out = { raw_text: data.raw_text };
  for (const key of FIELDS) {
    const f = data[key];
    if (!isObj(f) || !isStrOrNull(f.value ?? null)) return null;
    out[key] = { value: f.value ?? null, certain: f.certain === true };
  }

  const s = data.issue_suggestion;
  if (!isObj(s) || !isStrOrNull(s.issue_id ?? null)) return null;
  out.issue_suggestion = { issue_id: s.issue_id ?? null, certain: s.certain === true };

  if (!Array.isArray(data.tasks)) return null;
  out.tasks = [];
  for (const t of data.tasks) {
    if (!isObj(t) || typeof t.description !== 'string') return null;
    out.tasks.push({
      description: t.description,
      type: typeof t.type === 'string' ? t.type : null,
      due_date: typeof t.due_date === 'string' ? t.due_date : null,
      due_time: typeof t.due_time === 'string' ? t.due_time : null,
      certain: t.certain === true,
    });
  }
  return out;
}
