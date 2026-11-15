// Home screen. The task and issue sections arrive in Milestone 4; for now the title and the
// "add info" button that opens the add flow (on desktop the button sits in the header).
import { S } from '../strings.js';
import { icon } from '../icons.js';

export function renderDashboard(main) {
  main.innerHTML = `
    <h1 class="t-display shell-title">${S.home.title}</h1>
    <a class="btn btn-primary btn-block phone-only" href="#/add">${S.addInfo} ${icon('plus')}</a>`;
}
