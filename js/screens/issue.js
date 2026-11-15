// Medical issue screens. In this milestone: only the "new issue" form in create mode (#/issue/new).
// From inside the add flow, the new issue is kept in the flow and written to the table only on
// "approve and save". Opened on its own (from "Topics", later milestone), it is saved right away.
import { S } from '../strings.js';
import { go, flowFrame, backPath } from '../router.js';
import { icon } from '../icons.js';
import { options, esc } from '../format.js';
import { createIssue } from '../data.js';
import { getFlow, NEW_ISSUE } from './add-flow.js';

const MAX_NAME = 100;

export function renderIssueNew() {
  const f = getFlow();
  const fromFlow = f?.step === 'review';
  const back = () => go(fromFlow ? '/add' : backPath());
  const initial = (fromFlow && f.newIssue) || { name: '', status: 'open', next_step: '' };

  const main = flowFrame(S.issueForm.title, back);
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
        <input type="text" class="input" id="issue-next" maxlength="200" placeholder="${S.issueForm.nextStepPlaceholder}"
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

    if (fromFlow) {
      f.newIssue = issue;
      f.issueId = NEW_ISSUE;
      f.issueDraft = undefined;
      delete f.errors.issue;
      return go('/add');
    }

    button.disabled = true;
    formError.hidden = true;
    try {
      await createIssue(issue);
      back();
    } catch {
      button.disabled = false;
      formError.textContent = S.issueForm.saveFailed;
      formError.hidden = false;
    }
  });

  nameInput.focus();
}
