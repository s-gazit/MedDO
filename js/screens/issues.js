// Empty shell for this screen. Feature content arrives in a later milestone.
import { S } from '../strings.js';

export function renderIssues(main) {
  main.innerHTML = `<h1 class="t-h1 shell-title">${S.issues.title}</h1>`;
}
