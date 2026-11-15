// Display helpers: dates and labels from config/lists.json.
import { lists } from './main.js';
import { todayISO } from './case-state.js';

// Overdue: a "todo" or "waiting" task whose due date is before today. Computed, never stored.
export function isOverdue(task, today = todayISO()) {
  return (task.status === 'todo' || task.status === 'waiting') && !!task.due_date && task.due_date < today;
}

// '2026-10-12' -> '12.10.2026'
export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// '09:30:00' -> '09:30'
export function formatTime(t) {
  return t ? t.slice(0, 5) : '';
}

// Label of a code in one of the fixed lists ('content_types', 'task_types', ...).
export function label(listName, code) {
  return lists?.[listName]?.find((i) => i.code === code)?.label ?? '';
}

export function options(listName) {
  return lists?.[listName] ?? [];
}

// Escape text before putting it inside HTML.
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// '2026-11-12' -> '12.11'
export function formatDayMonth(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

// '2026-11-12' -> { day: '12', month: 'נוב׳' } for the date tile. Month names come from strings.js.
export function dateTileParts(iso, monthNames) {
  const [, m, d] = iso.split('-');
  return { day: String(Number(d)), month: monthNames[Number(m) - 1] };
}
