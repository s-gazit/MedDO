// Date helpers for the function. All arithmetic is on calendar dates (UTC), never in the model.

const pad = (n) => String(n).padStart(2, '0');

// Returns the same string if it is a real YYYY-MM-DD date, otherwise null.
export function validDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return s;
}

// Returns the same string if it is a real HH:MM time, otherwise null.
export function validTime(s) {
  if (typeof s !== 'string' || !/^\d{2}:\d{2}$/.test(s)) return null;
  const [h, min] = s.split(':').map(Number);
  return h <= 23 && min <= 59 ? s : null;
}

// docDate (YYYY-MM-DD) + {amount, unit}. Months and years clamp to the last day of the target month.
export function addRelative(docDate, rel) {
  if (!validDate(docDate) || !rel || !Number.isInteger(rel.amount) || rel.amount < 0 || rel.amount > 1000) return null;
  const [y, m, d] = docDate.split('-').map(Number);
  let dt;
  if (rel.unit === 'days' || rel.unit === 'weeks') {
    const days = rel.unit === 'weeks' ? rel.amount * 7 : rel.amount;
    dt = new Date(Date.UTC(y, m - 1, d + days));
  } else if (rel.unit === 'months' || rel.unit === 'years') {
    const months = rel.unit === 'years' ? rel.amount * 12 : rel.amount;
    const target = new Date(Date.UTC(y, m - 1 + months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    dt = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, lastDay)));
  } else {
    return null;
  }
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

// Explicit valid due_date wins; otherwise doc_date + due_relative; otherwise null.
export function resolveDueDate(dueDate, dueRelative, docDate) {
  return validDate(dueDate) ?? addRelative(docDate, dueRelative);
}
