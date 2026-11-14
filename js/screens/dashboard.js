// Empty shell for this screen. Feature content arrives in a later milestone.
import { S } from '../strings.js';

export function renderDashboard(main) {
  main.innerHTML = `<h1 class="t-display shell-title">${S.home.title}</h1>`;
}
