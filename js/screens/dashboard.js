// Home screen (dashboard): what to do now, what is waiting, later (collapsed) and open issues.
// The split and the issue states are computed here from the loaded rows (case-state.js).
import { S } from '../strings.js';
import { icon } from '../icons.js';
import { esc } from '../format.js';
import { caseInfo } from '../main.js';
import { listOpenTasks, listIssuesFull } from '../data.js';
import { splitDashboard, issueState } from '../case-state.js';
import { taskRow, issueCard, zoneHead } from '../components.js';

export async function renderDashboard(main) {
  const name = caseInfo?.manager_name?.trim();
  main.innerHTML = `
    <h1 class="t-display shell-title">${name ? esc(S.home.greeting(name)) : S.home.title}</h1>
    <a class="btn btn-primary btn-block phone-only dash-add" href="#/add">${S.addInfo} ${icon('plus')}</a>
    <div class="dash-content"><p class="lead">${S.common.loading}</p></div>`;
  const content = main.querySelector('.dash-content');

  let tasks;
  let issues;
  try {
    [tasks, issues] = await Promise.all([listOpenTasks(), listIssuesFull()]);
  } catch {
    content.innerHTML = `<p class="form-error" role="alert">${S.loadError}</p>`;
    return;
  }

  // Name and computed state of every issue (a closed issue can still own an open task).
  const issueInfo = new Map(issues.map((i) => [i.id, { name: i.name, state: issueState(i, tasks) }]));
  const { now, later, waiting } = splitDashboard(tasks);
  const openIssues = issues.filter((i) => i.status === 'open').reverse();

  const list = (rows, variant) => `<ul class="trow-list">${rows.map((t) => taskRow(t, variant, issueInfo)).join('')}</ul>`;
  const empty = (text) => `<p class="zone-empty">${text}</p>`;

  content.innerHTML = `
    <div class="dash-grid">
      <section class="zone zone-coral" aria-labelledby="h-now">
        ${zoneHead('bolt', `<span id="h-now">${S.home.nowTitle}</span>`, S.common.tasksCount(now.length))}
        ${now.length ? list(now, 'now') : empty(S.home.nowEmpty)}
      </section>
      <section class="zone zone-amber" aria-labelledby="h-waiting">
        ${zoneHead('waiting', `<span id="h-waiting">${S.home.waitingTitle}</span>`, S.common.tasksCount(waiting.length))}
        ${waiting.length ? list(waiting, 'waiting') : empty(S.home.waitingEmpty)}
      </section>
    </div>
    ${later.length ? `
    <section class="zone zone-plain later" aria-labelledby="h-later">
      <h2 class="later-head">
        <button type="button" class="later-toggle" aria-expanded="false" aria-controls="later-list">
          <span class="t-h3" id="h-later">${S.home.laterTitle}</span>
          <span class="count-badge">${S.common.tasksCount(later.length)}</span>
          ${icon('expand', 'later-chevron')}
        </button>
      </h2>
      <div id="later-list" hidden>${list(later, 'now')}</div>
    </section>` : ''}
    <section class="zone zone-mint" aria-labelledby="h-issues">
      ${zoneHead('folder', `<span id="h-issues">${S.home.issuesTitle}</span>`, undefined,
        `<a class="btn-text link-small zone-link" href="#/issues">${S.home.allIssues}</a>`)}
      ${openIssues.length
        ? `<div class="issue-grid">${openIssues.map((i) => issueCard(i, issueInfo.get(i.id).state)).join('')}</div>`
        : empty(S.home.issuesEmpty)}
    </section>`;

  const toggle = content.querySelector('.later-toggle');
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    content.querySelector('#later-list').hidden = open;
  });
}
