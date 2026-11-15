// Task form (screen 10):
// - #/task/new          a manual task. ?issue=<id> preselects the medical issue.
// - #/task/:id          the same form in edit mode, with "delete" and a confirm dialog.
// A task created from a document keeps the issue of its document: the issue field is shown but locked.
// Save and delete go back to the screen the user came from.
import { S } from '../strings.js';
import { go, flowFrame, backPath } from '../router.js';
import { icon } from '../icons.js';
import { options, esc, formatTime } from '../format.js';
import { listIssues, getTask, createTask, updateTask, deleteTask } from '../data.js';
import { confirmDialog } from '../dialogs.js';

const MAX_DESC = 200;

export async function renderTaskForm(params, id) {
  const isEdit = id !== null;
  const back = () => go(backPath());
  const main = flowFrame(isEdit ? S.taskForm.editTitle : S.taskForm.title, back);
  main.innerHTML = `<p class="lead">${S.common.loading}</p>`;

  let issues;
  let task = null;
  try {
    [issues, task] = await Promise.all([listIssues(), isEdit ? getTask(id) : null]);
  } catch {
    main.innerHTML = `<p class="form-error" role="alert">${S.loadError}</p>`;
    return;
  }
  if (isEdit && !task) {
    main.innerHTML = `
      <div class="status-panel">
        <h2 class="t-h2">${S.taskForm.notFound}</h2>
        <a class="btn btn-secondary" href="#/tasks">${S.taskForm.toAllTasks}</a>
      </div>`;
    return;
  }

  const preIssue = params.get('issue');
  const t = task || {
    description: '', type: '', status: 'todo', due_date: null, due_time: null, document_id: null,
    medical_issue_id: issues.some((i) => i.id === preIssue) ? preIssue : null,
  };
  const fromDoc = !!t.document_id;
  const openIssues = issues.filter((i) => i.status !== 'closed');
  const closedIssues = issues.filter((i) => i.status === 'closed');
  const issueOption = (i, suffix = '') =>
    `<option value="${i.id}" ${i.id === t.medical_issue_id ? 'selected' : ''}>${esc(i.name)}${suffix}</option>`;

  main.innerHTML = `
    <form novalidate>
      <div class="field">
        <label for="task-desc">${S.taskForm.desc}</label>
        <input type="text" class="input" id="task-desc" name="description" maxlength="${MAX_DESC}"
          placeholder="${S.taskForm.descPlaceholder}" value="${esc(t.description)}" aria-describedby="err-description">
        <p class="field-error" id="err-description" hidden></p>
      </div>
      <div class="field-pair">
        <div class="field">
          <label for="task-type">${S.taskForm.type}</label>
          <select class="input" id="task-type" name="type" aria-describedby="err-type">
            ${t.type ? '' : `<option value="">${S.review.choose}</option>`}
            ${options('task_types').map((o) => `<option value="${o.code}" ${o.code === t.type ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
          <p class="field-error" id="err-type" hidden></p>
        </div>
        <div class="field">
          <label for="task-status">${S.taskForm.status}</label>
          <select class="input" id="task-status" name="status">
            ${options('task_statuses').map((o) => `<option value="${o.code}" ${o.code === t.status ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-pair">
        <div class="field">
          <label for="task-due">${S.taskForm.due}</label>
          <input type="date" class="input" id="task-due" name="due_date" value="${esc(t.due_date || '')}" aria-describedby="err-due_date">
          <p class="field-error" id="err-due_date" hidden></p>
        </div>
        <div class="field" id="time-field" ${t.type === 'appointment' ? '' : 'hidden'}>
          <label for="task-time">${S.taskForm.time}</label>
          <input type="time" class="input" id="task-time" name="due_time" value="${esc(formatTime(t.due_time))}">
        </div>
      </div>
      <div class="field">
        <label for="task-issue">${S.taskForm.issue}</label>
        <select class="input" id="task-issue" name="medical_issue_id" ${fromDoc ? 'disabled aria-describedby="issue-locked"' : ''}>
          <option value="">${S.common.noIssue}</option>
          ${openIssues.map((i) => issueOption(i)).join('')}
          ${closedIssues.map((i) => issueOption(i, ` ${S.review.issueClosed}`)).join('')}
        </select>
        ${fromDoc ? `<p class="field-hint" id="issue-locked">${S.taskForm.issueLocked}</p>` : ''}
      </div>
      <div class="form-error" role="alert" hidden></div>
      <button type="submit" class="btn btn-primary btn-block">${S.save}</button>
      ${isEdit ? `<button type="button" class="btn btn-text btn-danger btn-block" data-delete>${S.taskForm.delete}</button>` : ''}
    </form>`;

  const form = main.querySelector('form');
  const formError = form.querySelector('.form-error');
  const submit = form.querySelector('[type="submit"]');
  const typeSelect = form.querySelector('#task-type');
  const timeField = form.querySelector('#time-field');

  typeSelect.addEventListener('change', () => {
    timeField.hidden = typeSelect.value !== 'appointment';
  });
  form.addEventListener('input', (e) => {
    const name = e.target.name;
    if (!name) return;
    e.target.removeAttribute('aria-invalid');
    const p = form.querySelector(`#err-${name}`);
    if (p) p.hidden = true;
    // The due date error depends on the status too.
    if (name === 'status') clearError(form, 'due_date');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = {
      description: form.description.value.trim(),
      type: typeSelect.value,
      status: form.status.value,
      due_date: form.due_date.value || null,
      due_time: typeSelect.value === 'appointment' ? (form.due_time.value || null) : null,
    };
    if (!fromDoc) values.medical_issue_id = form.medical_issue_id.value || null;

    const errors = {};
    if (!values.description) errors.description = S.taskForm.descRequired;
    if (!values.type) errors.type = S.taskForm.typeRequired;
    if (values.status !== 'waiting' && !values.due_date) errors.due_date = S.taskForm.dueRequired;
    if (Object.keys(errors).length) {
      showErrors(form, errors);
      return;
    }

    submit.disabled = true;
    formError.hidden = true;
    try {
      if (isEdit) await updateTask(id, values);
      else await createTask({ ...values, document_id: null });
      back();
    } catch {
      submit.disabled = false;
      formError.textContent = S.taskForm.saveFailed;
      formError.hidden = false;
    }
  });

  form.querySelector('[data-delete]')?.addEventListener('click', async () => {
    const deleted = await confirmDialog({
      title: S.taskForm.deleteQuestion,
      confirmLabel: S.taskForm.delete,
      failMsg: S.taskForm.deleteFailed,
      onConfirm: () => deleteTask(id),
    });
    if (deleted) back();
  });

  form.description.focus();
}

function clearError(form, name) {
  form.querySelector(`[name="${name}"]`)?.removeAttribute('aria-invalid');
  const p = form.querySelector(`#err-${name}`);
  if (p) p.hidden = true;
}

function showErrors(form, errors) {
  let first = null;
  for (const [name, msg] of Object.entries(errors)) {
    const input = form.querySelector(`[name="${name}"]`);
    const p = form.querySelector(`#err-${name}`);
    p.innerHTML = `${icon('warning')} <span>${msg}</span>`;
    p.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    first = first || input;
  }
  first.focus();
}
