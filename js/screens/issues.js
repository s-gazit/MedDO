// "Topics" screen: every medical issue, open ones first (newest on top), then closed ones (faded).
import { S } from '../strings.js';
import { icon } from '../icons.js';
import { options } from '../format.js';
import { listOpenTasks, listIssuesFull } from '../data.js';
import { issueState, openTaskTypes } from '../case-state.js';
import { issueCard } from '../components.js';

export async function renderIssues(main) {
  main.innerHTML = `
    <div class="title-row">
      <h1 class="t-h1">${S.issues.title}</h1>
      <a class="btn btn-primary btn-small" href="#/issue/new">${S.issues.newIssue} ${icon('plus')}</a>
    </div>
    <p class="lead title-lead">${S.issues.intro}</p>
    <div class="issues-content"><p class="lead">${S.common.loading}</p></div>`;
  const content = main.querySelector('.issues-content');

  let tasks;
  let issues;
  try {
    [tasks, issues] = await Promise.all([listOpenTasks(), listIssuesFull()]);
  } catch {
    content.innerHTML = `<p class="form-error" role="alert">${S.loadError}</p>`;
    return;
  }

  if (!issues.length) {
    content.innerHTML = `<p class="zone-empty">${S.issues.empty}</p>`;
    return;
  }

  const typeOrder = options('task_types').map((o) => o.code);
  const newestFirst = [...issues].reverse();
  const ordered = [...newestFirst.filter((i) => i.status === 'open'), ...newestFirst.filter((i) => i.status !== 'open')];
  content.innerHTML = `
    <div class="issue-list">
      ${ordered.map((i) => issueCard(i, issueState(i, tasks), {
        showStatus: true,
        types: openTaskTypes(i.id, tasks, typeOrder),
      })).join('')}
    </div>`;
}
