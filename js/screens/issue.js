// Medical issue screens:
// - #/issue/:id       the issue: status, opening date, next step, tasks and documents (filter by content type).
// - #/issue/new       new issue form. From inside the add flow, the new issue is kept in the flow and written
//                     to the table only on "approve and save". Opened on its own (from "Topics") it is saved now.
// - #/issue/:id/edit  the same form in edit mode: name, status (open/closed) and next step.
import { S } from '../strings.js';
import { go, flowFrame, backPath, prevBackPath } from '../router.js';
import { icon } from '../icons.js';
import { options, label, esc, formatDate } from '../format.js';
import { createIssue, updateIssue, getIssue, listIssueTasks, listIssueDocuments } from '../data.js';
import { issueState, sortIssueTasks, dateOfTimestamp } from '../case-state.js';
import { taskRow, issueDot, issueStatusTag } from '../components.js';
import { getFlow, NEW_ISSUE } from './add-flow.js';

const MAX_NAME = 100;
const MAX_NEXT_STEP = 200;

// ---------- issue screen ----------

export async function renderIssue(main, id) {
  main.innerHTML = `<p class="lead">${S.common.loading}</p>`;

  let issue;
  let tasks;
  let docs;
  try {
    [issue, tasks, docs] = await Promise.all([getIssue(id), listIssueTasks(id), listIssueDocuments(id)]);
  } catch {
    // An id that is not a uuid makes the task/doc queries fail; treat it like a missing issue below.
    try { issue = await getIssue(id); } catch { issue = undefined; }
    if (issue !== null) {
      main.innerHTML = `<p class="form-error" role="alert">${S.loadError}</p>`;
      return;
    }
  }
  if (!issue) {
    main.innerHTML = `
      <div class="status-panel">
        <h1 class="t-h2">${S.issue.notFound}</h1>
        <a class="btn btn-secondary" href="#/issues">${S.issue.backToIssues}</a>
      </div>`;
    return;
  }

  const state = issueState(issue, tasks);
  const issueInfo = new Map([[issue.id, { name: issue.name, state }]]);
  const sortedTasks = sortIssueTasks(tasks);
  const opened = formatDate(dateOfTimestamp(issue.created_at));

  main.innerHTML = `
    <div class="issue-head">
      <div class="issue-head-row">
        <button type="button" class="icon-btn back-btn" aria-label="${S.back}">${icon('back')}</button>
        <h1 class="t-h2 issue-title">${issueDot(state)}<span>${esc(issue.name)}</span></h1>
        <a class="btn btn-secondary btn-small" href="#/issue/${issue.id}/edit">${icon('pencil')} ${S.issue.edit}</a>
      </div>
      <div class="issue-head-meta">${issueStatusTag(issue.status)} <span>${S.issue.openedOn(opened)}</span></div>
    </div>

    <section class="zone zone-coral" aria-labelledby="h-next">
      ${headWithIcon('flag', S.issue.nextStepTitle, 'h-next')}
      <div class="next-box">
        ${issue.next_step
          ? `<p>${esc(issue.next_step)}</p>`
          : `<p class="lead">${S.issue.noNextStep}</p>
             <a class="btn-text link-small" href="#/issue/${issue.id}/edit">${S.issue.addNextStep}</a>`}
      </div>
    </section>

    <section class="issue-section" aria-labelledby="h-tasks">
      <div class="section-head">
        <h2 class="t-h3" id="h-tasks">${S.issue.tasksTitle}</h2>
        <a class="btn btn-soft btn-small" href="#/task/new?issue=${issue.id}">${icon('plus')} ${S.issue.newTask}</a>
      </div>
      ${sortedTasks.length
        ? `<ul class="trow-list trow-list-card">${sortedTasks.map((t) => taskRow(t, 'issue', issueInfo)).join('')}</ul>`
        : `<p class="zone-empty">${S.issue.noTasks}</p>`}
    </section>

    <section class="issue-section" aria-labelledby="h-docs">
      <div class="section-head"><h2 class="t-h3" id="h-docs">${S.issue.docsTitle}</h2></div>
      ${docs.length ? `
        <div class="chips" role="group" aria-label="${S.issue.filterLabel}">
          ${chip('', S.issue.filterAll, true)}
          ${options('content_types').map((o) => chip(o.code, o.label, false)).join('')}
        </div>
        <div class="doc-list-wrap"></div>`
        : `<p class="zone-empty">${S.issue.noDocs}</p>`}
    </section>`;

  main.querySelector('.back-btn').addEventListener('click', () => {
    const prev = prevBackPath();
    go(prev.startsWith('/issue/') ? '/issues' : prev);
  });

  const wrap = main.querySelector('.doc-list-wrap');
  if (!wrap) return;
  const showDocs = (type) => {
    const shown = type ? docs.filter((d) => d.content_type === type) : docs;
    wrap.innerHTML = shown.length
      ? `<ul class="trow-list trow-list-card">${shown.map(docRow).join('')}</ul>`
      : `<p class="zone-empty">${S.issue.noDocsOfType}</p>`;
  };
  showDocs('');
  main.querySelector('.chips').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    main.querySelectorAll('.chips [data-type]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    showDocs(btn.dataset.type);
  });
}

function headWithIcon(iconName, title, id) {
  return `<div class="zone-head"><h2 class="t-h3">${icon(iconName)} <span id="${id}">${title}</span></h2></div>`;
}

function chip(code, text, pressed) {
  return `<button type="button" class="chip" data-type="${code}" aria-pressed="${pressed}">${text}</button>`;
}

// Document name: "content type – specialty", whichever exists.
function docName(d) {
  const parts = [label('content_types', d.content_type), d.specialty].filter(Boolean);
  return parts.length ? parts.join(' – ') : S.issue.untitledDoc;
}

function docRow(d) {
  const meta = [d.doc_date ? formatDate(d.doc_date) : '', d.provider || ''].filter(Boolean);
  return `
    <li>
      <a class="trow trow-link" href="#/document/${d.id}">
        <span class="type-tile tile-doc" aria-hidden="true">${icon('doc')}</span>
        <span class="trow-body">
          <span class="trow-title">${esc(docName(d))}</span>
          ${meta.length ? `<span class="trow-meta">${meta.map(esc).join(' · ')}</span>` : ''}
        </span>
        <span class="row-arrow" aria-hidden="true">${icon('chevron')}</span>
      </a>
    </li>`;
}

// ---------- new / edit form ----------

export function renderIssueNew() {
  const f = getFlow();
  const fromFlow = f?.step === 'review';
  const back = () => go(fromFlow ? '/add' : backPath());
  const initial = (fromFlow && f.newIssue) || { name: '', status: 'open', next_step: '' };

  issueForm(flowFrame(S.issueForm.title, back), initial, async (issue) => {
    if (fromFlow) {
      f.newIssue = issue;
      f.issueId = NEW_ISSUE;
      f.issueDraft = undefined;
      delete f.errors.issue;
      go('/add');
      return;
    }
    await createIssue(issue);
    back();
  });
}

export async function renderIssueEdit(params, id) {
  const back = () => go(`/issue/${id}`);
  const main = flowFrame(S.issueForm.editTitle, back);
  main.innerHTML = `<p class="lead">${S.common.loading}</p>`;
  let issue;
  try {
    issue = await getIssue(id);
  } catch {
    main.innerHTML = `<p class="form-error" role="alert">${S.loadError}</p>`;
    return;
  }
  if (!issue) return go('/issues');
  issueForm(main, issue, async (changes) => {
    await updateIssue(id, changes);
    back();
  });
}

// Draws the issue form into main and calls onSave({ name, status, next_step }) on a valid submit.
function issueForm(main, initial, onSave) {
  main.innerHTML = `
    <p class="lead">${S.issueForm.intro}</p>
    <form novalidate>
      <div class="field">
        <label for="issue-name">${S.issueForm.name}</label>
        <input type="text" class="input" id="issue-name" maxlength="${MAX_NAME}" placeholder="${S.issueForm.namePlaceholder}"
          value="${esc(initial.name)}" aria-describedby="err-issue-name">
        <p class="field-error" id="err-issue-name" hidden></p>
      </div>
      <div class="field">
        <label for="issue-status">${S.issueForm.status}</label>
        <select class="input" id="issue-status">
          ${options('issue_statuses').map((o) => `<option value="${o.code}" ${o.code === initial.status ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="issue-next">${S.issueForm.nextStep}</label>
        <input type="text" class="input" id="issue-next" maxlength="${MAX_NEXT_STEP}" placeholder="${S.issueForm.nextStepPlaceholder}"
          value="${esc(initial.next_step)}">
      </div>
      <div class="form-error" role="alert" hidden></div>
      <button type="submit" class="btn btn-primary btn-block">${S.save}</button>
    </form>`;

  const form = main.querySelector('form');
  const nameInput = form.querySelector('#issue-name');
  const nameError = form.querySelector('#err-issue-name');
  const formError = form.querySelector('.form-error');
  const button = form.querySelector('button[type="submit"]');

  nameInput.addEventListener('input', () => {
    nameInput.removeAttribute('aria-invalid');
    nameError.hidden = true;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const issue = {
      name: nameInput.value.trim(),
      status: form.querySelector('#issue-status').value,
      next_step: form.querySelector('#issue-next').value.trim(),
    };
    if (!issue.name) {
      nameError.innerHTML = `${icon('warning')} <span>${S.issueForm.nameRequired}</span>`;
      nameError.hidden = false;
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.focus();
      return;
    }
    button.disabled = true;
    formError.hidden = true;
    try {
      await onSave(issue);
    } catch {
      button.disabled = false;
      formError.textContent = S.issueForm.saveFailed;
      formError.hidden = false;
    }
  });

  nameInput.focus();
}
