// App start: load the fixed lists and the case names, then start the router.
import { startRouter } from './router.js';
import { S } from './strings.js';

export let lists = null;
export let caseInfo = null; // { subject_name, manager_name } — dummy names, used for the greeting only

async function loadLists() {
  const res = await fetch('./config/lists.json');
  if (!res.ok) throw new Error('lists.json not loaded');
  lists = await res.json();
}

// Optional: without it the greeting has no name.
async function loadCase() {
  try {
    const res = await fetch('./config/case.json');
    if (res.ok) caseInfo = await res.json();
  } catch { /* greeting without a name */ }
}

try {
  await Promise.all([loadLists(), loadCase()]);
  startRouter();
} catch {
  document.getElementById('app').innerHTML = `<main class="page"><p class="form-error" role="alert">${S.loadError}</p></main>`;
}
