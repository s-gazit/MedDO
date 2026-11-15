// Modal dialogs on the browser's own <dialog> element (no library).
// Esc and "cancel" close without changes. Focus returns to the element that opened the dialog.
import { S } from './strings.js';
import { icon } from './icons.js';
import { options, esc, formatTime } from './format.js';

// Draws a dialog and resolves when it closes.
// onSubmit(form) -> errors object ({ fieldName: message }) to keep it open, or a promise; a thrown error shows failMsg.
function showDialog({ title, body, submitLabel, submitClass = 'btn-primary', failMsg, onSubmit }) {
  return new Promise((resolve) => {
    const opener = document.activeElement;
    const dlg = document.createElement('dialog');
    dlg.className = 'dialog';
    dlg.setAttribute('aria-labelledby', 'dlg-title');
    dlg.innerHTML = `
      <form novalidate>
        <h2 class="t-h3" id="dlg-title">${title}</h2>
        ${body}
        <div class="form-error" role="alert" hidden></div>
        <div class="dialog-actions">
          <button type="submit" class="btn ${submitClass}">${submitLabel}</button>
          <button type="button" class="btn btn-secondary" data-cancel>${S.cancel}</button>
        </div>
      </form>`;
    document.body.appendChild(dlg);

    let result = false;
    const form = dlg.querySelector('form');
    const formError = form.querySelector('.form-error');
    const submit = form.querySelector('[type="submit"]');

    dlg.addEventListener('close', () => {
      dlg.remove();
      if (opener && opener.isConnected) opener.focus();
      resolve(result);
    });
    form.querySelector('[data-cancel]').addEventListener('click', () => dlg.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors(form);
      formError.hidden = true;
      let outcome;
      try {
        outcome = onSubmit(form);
        if (outcome && typeof outcome.then === 'function') {
          submit.disabled = true;
          await outcome;
          outcome = null;
        }
      } catch {
        submit.disabled = false;
        formError.textContent = failMsg;
        formError.hidden = false;
        return;
      }
      if (outcome && Object.keys(outcome).length) {
        showErrors(form, outcome);
        return;
      }
      result = true;
      dlg.close();
    });

    dlg.showModal();
    // Focus the checked option or the first field.
    (form.querySelector('input:checked') || form.querySelector('input, select, button')).focus();
  });
}

function clearErrors(form) {
  form.querySelectorAll('.field-error').forEach((p) => { p.hidden = true; });
  form.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
}

function showErrors(form, errors) {
  let first = null;
  for (const [name, msg] of Object.entries(errors)) {
    const input = form.querySelector(`[name="${name}"]`);
    const p = form.querySelector(`#dlg-err-${name}`);
    if (p) {
      p.innerHTML = `${icon('warning')} <span>${msg}</span>`;
      p.hidden = false;
    }
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      first = first || input;
    }
  }
  first?.focus();
}

function field(name, labelText, type, value = '') {
  return `
    <div class="field" data-field="${name}">
      <label for="dlg-${name}">${labelText}</label>
      <input type="${type}" class="input" id="dlg-${name}" name="${name}" value="${esc(value)}"
        aria-describedby="dlg-err-${name}">
      <p class="field-error" id="dlg-err-${name}" hidden></p>
    </div>`;
}

// Yes/no question. Resolves true on confirm.
export function confirmDialog({ title, confirmLabel, onConfirm, failMsg }) {
  return showDialog({ title, body: '', submitLabel: confirmLabel, failMsg, onSubmit: () => onConfirm() });
}

// Status picker. A task without a due date needs one before it moves to "todo" or "done" (PRD 4.4).
// onSave(changes) saves { status, due_date? }. Resolves true when saved.
// preselect: a status to choose in advance (the quick "done" button of a task without a date).
export function statusDialog(task, onSave, preselect = task.status) {
  const radios = options('task_statuses').map((o) => `
    <label class="choice">
      <input type="radio" name="status" value="${o.code}" ${o.code === preselect ? 'checked' : ''}>
      <span class="tag tag-status-${o.code}">${icon(o.code)} ${o.label}</span>
    </label>`).join('');
  const body = `
    <p class="lead">${esc(task.description)}</p>
    <fieldset class="choices"><legend class="visually-hidden">${S.taskStatus.title}</legend>${radios}</fieldset>
    ${task.due_date ? '' : `<div class="dlg-date" ${preselect === 'waiting' ? 'hidden' : ''}>
      <p class="field-hint">${S.taskStatus.needsDate}</p>
      ${field('due_date', S.taskForm.due, 'date')}
    </div>`}`;

  const promise = showDialog({
    title: S.taskStatus.title,
    body,
    submitLabel: S.save,
    failMsg: S.taskForm.saveFailed,
    onSubmit: (form) => {
      const status = form.querySelector('[name="status"]:checked').value;
      if (status === task.status) return null;
      const changes = { status };
      if (!task.due_date && status !== 'waiting') {
        const due = form.querySelector('[name="due_date"]').value;
        if (!due) return { due_date: S.taskForm.dueRequired };
        changes.due_date = due;
      }
      return onSave(changes);
    },
  });

  // Show the date field only when the chosen status needs it.
  const dlg = document.querySelector('dialog.dialog:last-of-type');
  const dateBox = dlg.querySelector('.dlg-date');
  if (dateBox) {
    dlg.querySelector('.choices').addEventListener('change', (e) => {
      dateBox.hidden = e.target.value === 'waiting';
    });
  }
  return promise;
}

// "Add to calendar" for an appointment with no time (and maybe no date).
// onOk(date, time) opens the calendar and saves; it runs inside the submit event, so the new tab is allowed.
export function calendarDialog(task, onOk) {
  const body = `
    <p>${esc(task.description)}</p>
    <p class="lead">${task.due_date ? S.calendar.missingTime : S.calendar.missingDateTime}</p>
    ${task.due_date ? '' : field('due_date', S.taskForm.due, 'date')}
    ${field('due_time', S.taskForm.time, 'time', formatTime(task.due_time))}`;
  return showDialog({
    title: S.calendar.question,
    body,
    submitLabel: S.calendar.open,
    failMsg: S.calendar.saveFailed,
    onSubmit: (form) => {
      const date = task.due_date || form.querySelector('[name="due_date"]').value;
      const time = form.querySelector('[name="due_time"]').value;
      const errors = {};
      if (!task.due_date && !date) errors.due_date = S.calendar.dateRequired;
      if (!time) errors.due_time = S.calendar.timeRequired;
      if (Object.keys(errors).length) return errors;
      return onOk(date, time);
    },
  });
}
