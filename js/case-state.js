// Computed views of the case. Pure functions: no Supabase, no DOM.
// Nothing here is stored in the tables (ARCHITECTURE 1.1, PRD 4.4).

// A "todo" task due within this many days from today (or overdue) goes to "what to do now".
export const NOW_WINDOW_DAYS = 14;

const TZ = 'Asia/Jerusalem';

// Today as 'YYYY-MM-DD' in Israel time.
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// Date of a timestamp (e.g. created_at) as 'YYYY-MM-DD' in Israel time.
export function dateOfTimestamp(ts) {
  return ts ? todayISO(new Date(ts)) : null;
}

// 'YYYY-MM-DD' plus n days, calendar arithmetic in UTC (no hours involved).
export function addDaysISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

function byDueDate(a, b) {
  if (a.due_date === b.due_date) return 0;
  if (!a.due_date) return 1; // no date last
  if (!b.due_date) return -1;
  return a.due_date < b.due_date ? -1 : 1;
}

// Splits tasks into the three dashboard sections. "done" tasks are left out.
export function splitDashboard(tasks, today = todayISO()) {
  const limit = addDaysISO(today, NOW_WINDOW_DAYS);
  const now = [];
  const later = [];
  const waiting = [];
  for (const t of tasks) {
    if (t.status === 'waiting') waiting.push(t);
    else if (t.status === 'todo') {
      if (t.due_date && t.due_date <= limit) now.push(t);
      else later.push(t);
    }
  }
  return { now: now.sort(byDueDate), later: later.sort(byDueDate), waiting: waiting.sort(byDueDate) };
}

// Computed state of an issue: 'closed', 'action' (has a "todo" task) or 'waiting' (anything else).
export function issueState(issue, tasks) {
  if (issue.status === 'closed') return 'closed';
  return tasks.some((t) => t.medical_issue_id === issue.id && t.status === 'todo') ? 'action' : 'waiting';
}

// Distinct types of the open tasks of an issue, in the order of the fixed list.
export function openTaskTypes(issueId, tasks, typeOrder) {
  const types = new Set(tasks
    .filter((t) => t.medical_issue_id === issueId && (t.status === 'todo' || t.status === 'waiting'))
    .map((t) => t.type));
  return typeOrder.filter((code) => types.has(code));
}

// Tasks of one issue for the issue screen: todo, then waiting, then done; by due date inside each.
export function sortIssueTasks(tasks) {
  const rank = { todo: 0, waiting: 1, done: 2 };
  return [...tasks].sort((a, b) => (rank[a.status] - rank[b.status]) || byDueDate(a, b));
}
