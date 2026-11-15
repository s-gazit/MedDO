// "Tasks and follow-ups" screen (screens 9 and 14).
// Filter by status (all / todo / waiting / done). Phone: groups by status with counts. Desktop: a table.
// Both layouts are drawn; CSS shows one by screen width. Filtering happens here, on the loaded rows.
import { S } from '../strings.js';
import { icon } from '../icons.js';
import { options, label, esc } from '../format.js';
import { listAllTasks, listIssuesFull } from '../data.js';
import { issueState, sortIssueTasks } from '../case-state.js';
import { taskRow, zoneHead, typeTag, statusButton, overdueTag, calendarButton, issueLabel, dueText, docArrow } from '../components.js';
import { bindTaskActions } from '../task-actions.js';
import { reload } from '../router.js';

// Kept while the app is open, so coming back from the edit form keeps the filter.
let filter = '';

const GROUPS = {
  todo: { zone: 'zone-coral', icon: 'todo' },
  waiting: { zone: 'zone-amber', icon: 'waiting' },
  done: { zone: 'zone-mint', icon: 'done' },
};

export async function renderTasks(main) {
  main.innerHTML = `
    <div class="title-row">
      <h1 class="t-h1">${S.tasks.title}</h1>
      <a class="btn btn-primary btn-small" href="#/task/new">${S.tasks.newTask} ${icon('plus')}</a>
    </div>
    <div class="chips tasks-filter" role="group" aria-label="${S.tasks.filterLabel}">
      ${chip('', S.tasks.filterAll)}
      ${options('task_statuses').map((o) => chip(o.code, o.label)).join('')}
    </div>
    <div class="tasks-content"><p class="lead">${S.common.loading}</p></div>`;
  const content = main.querySelector('.tasks-content');

  let tasks;
  let issues;
  try {
    [tasks, issues] = await Promise.all([listAllTasks(), listIssuesFull()]);
  } catch {
    content.innerHTML = `<p class="form-error" role="alert">${S.loadError}</p>`;
    return;
  }

  const issueInfo = new Map(issues.map((i) => [i.id, { name: i.name, state: issueState(i, tasks) }]));
  const sorted = sortIssueTasks(tasks); // todo, waiting, done; by due date inside each

  const draw = () => {
    const shown = filter ? sorted.filter((t) => t.status === filter) : sorted;
    content.innerHTML = `
      <div class="phone-only tasks-groups">${phoneGroups(sorted, issueInfo)}</div>
      <div class="desktop-only">${shown.length ? table(shown, issueInfo) : `<p class="zone-empty">${S.tasks.empty}</p>`}</div>`;
  };
  draw();
  bindTaskActions(content, tasks, reload);

  main.querySelector('.tasks-filter').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-status]');
    if (!btn) return;
    filter = btn.dataset.status;
    main.querySelectorAll('.tasks-filter [data-status]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    draw();
  });
}

function chip(code, text) {
  return `<button type="button" class="chip" data-status="${code}" aria-pressed="${code === filter}">${text}</button>`;
}

// Phone: one zone per status. A filter shows only its own group.
function phoneGroups(sorted, issueInfo) {
  const codes = filter ? [filter] : Object.keys(GROUPS);
  return codes.map((code) => {
    const rows = sorted.filter((t) => t.status === code);
    const g = GROUPS[code];
    return `
      <section class="zone ${g.zone}" aria-labelledby="h-group-${code}">
        ${zoneHead(g.icon, `<span id="h-group-${code}">${label('task_statuses', code)}</span>`, S.common.tasksCount(rows.length))}
        ${rows.length
          ? `<ul class="trow-list">${rows.map((t) => taskRow(t, 'list', issueInfo)).join('')}</ul>`
          : `<p class="zone-empty">${S.tasks.empty}</p>`}
      </section>`;
  }).join('');
}

// Desktop: type, description, medical issue, due date, status, and an actions column.
function table(rows, issueInfo) {
  return `
    <div class="table-wrap">
      <table class="task-table">
        <thead>
          <tr>
            <th scope="col">${S.tasks.colType}</th>
            <th scope="col">${S.tasks.colDesc}</th>
            <th scope="col">${S.tasks.colIssue}</th>
            <th scope="col">${S.tasks.colDue}</th>
            <th scope="col">${S.tasks.colStatus}</th>
            <th scope="col"><span class="visually-hidden">${S.tasks.colActions}</span></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((t) => `
          <tr class="ttr">
            <td>${typeTag(t.type)}</td>
            <td><a class="trow-title trow-edit" href="#/task/${t.id}">${esc(t.description)}</a></td>
            <td class="cell-muted">${issueLabel(t, issueInfo)}</td>
            <td class="cell-due">${dueText(t) || `<span class="cell-muted">${S.tasks.noDate}</span>`} ${overdueTag(t)}</td>
            <td>${statusButton(t)}</td>
            <td><div class="cell-actions">${calendarButton(t)}${docArrow(t)}</div></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}
