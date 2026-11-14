// App start: load the fixed lists, then start the router.
import { startRouter } from './router.js';
import { S } from './strings.js';

export let lists = null;

async function loadLists() {
  const res = await fetch('./config/lists.json');
  if (!res.ok) throw new Error('lists.json not loaded');
  lists = await res.json();
}

try {
  await loadLists();
  startRouter();
} catch {
  document.getElementById('app').innerHTML = `<main class="page"><p class="form-error" role="alert">${S.loadError}</p></main>`;
}
