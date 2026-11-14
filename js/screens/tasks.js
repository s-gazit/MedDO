// Empty shell for this screen. Feature content arrives in a later milestone.
import { S } from '../strings.js';

export function renderTasks(main) {
  main.innerHTML = `<h1 class="t-h1 shell-title">${S.tasks.title}</h1>`;
}
