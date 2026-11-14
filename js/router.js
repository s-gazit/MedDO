// Hash routing, route guard and the shared app shell (header, navigation, disclaimer).
// The guard is a convenience only: real protection is RLS in Supabase.
import { getSession, signOut } from './auth.js';
import { S } from './strings.js';
import { renderLogin } from './screens/login.js';
import { renderDashboard } from './screens/dashboard.js';
import { renderIssues } from './screens/issues.js';
import { renderTasks } from './screens/tasks.js';

const app = document.getElementById('app');

// Screens that live inside the app shell, keyed by hash path.
const SHELL_ROUTES = {
  '/': { render: renderDashboard, nav: 'home' },
  '/issues': { render: renderIssues, nav: 'issues' },
  '/tasks': { render: renderTasks, nav: 'tasks' },
};

const ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  issues: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  tasks: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
};

function currentPath() {
  const path = location.hash.replace(/^#/, '') || '/';
  return path;
}

export function go(path) {
  if (currentPath() === path) route();
  else location.hash = '#' + path;
}

function navLinks(active) {
  return ['home', 'issues', 'tasks'].map((key) => {
    const href = key === 'home' ? '#/' : `#/${key}`;
    const current = key === active ? ' aria-current="page"' : '';
    return { key, href, current };
  });
}

function shell(active) {
  const links = navLinks(active);
  app.innerHTML = `
    <header class="app-header">
      <div class="app-header-inner">
        <a class="brand" href="#/"><img src="./assets/img/logo-mark.png" alt=""><span>${S.appName}</span></a>
        <nav class="top-nav" aria-label="${S.nav.label}">
          ${links.map((l) => `<a href="${l.href}"${l.current}>${S.nav[l.key]}</a>`).join('')}
        </nav>
        <div class="header-actions">
          <button type="button" class="btn btn-secondary btn-small" data-action="logout">${S.logout}</button>
        </div>
      </div>
    </header>
    <main class="page has-bottom-nav" id="main"></main>
    <footer class="disclaimer has-bottom-nav">${S.disclaimer}</footer>
    <nav class="bottom-nav" aria-label="${S.nav.label}">
      ${links.map((l) => `<a href="${l.href}"${l.current}><svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[l.key]}</svg><span>${S.nav[l.key]}</span></a>`).join('')}
    </nav>`;
  app.querySelector('[data-action="logout"]').addEventListener('click', async () => {
    await signOut();
    go('/login');
  });
  return app.querySelector('#main');
}

async function route() {
  const path = currentPath();
  const session = await getSession();

  if (path === '/login') {
    if (session) return go('/');
    return renderLogin(app);
  }
  if (!session) return go('/login');

  const entry = SHELL_ROUTES[path];
  if (!entry) return go('/');
  const main = shell(entry.nav);
  await entry.render(main);
  window.scrollTo(0, 0);
}

export function startRouter() {
  window.addEventListener('hashchange', route);
  route();
}
