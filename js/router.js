// Hash routing, route guard and the two page frames:
// the app shell (header, navigation, disclaimer) and the flow frame (title, back arrow, disclaimer).
// The guard is a convenience only: real protection is RLS in Supabase.
import { getSession, signOut } from './auth.js';
import { S } from './strings.js';
import { icon } from './icons.js';
import { renderLogin } from './screens/login.js';
import { renderDashboard } from './screens/dashboard.js';
import { renderIssues } from './screens/issues.js';
import { renderTasks } from './screens/tasks.js';
import { renderAdd, leaveFlow } from './screens/add-flow.js';
import { renderOriginalFromFlow } from './screens/document.js';
import { renderIssueNew } from './screens/issue.js';

const app = document.getElementById('app');

// Screens that live inside the app shell, keyed by hash path.
const SHELL_ROUTES = {
  '/': { render: renderDashboard, nav: 'home' },
  '/issues': { render: renderIssues, nav: 'issues' },
  '/tasks': { render: renderTasks, nav: 'tasks' },
};

// Screens with a title and back arrow, no navigation bar. They draw their frame with flowFrame().
const FLOW_ROUTES = {
  '/add': renderAdd,
  '/add/original': renderOriginalFromFlow,
  '/issue/new': renderIssueNew,
};

// Paths that keep the add-info flow alive. Leaving them discards the flow (and its uploaded file).
const ADD_FLOW_PATHS = ['/add', '/add/original', '/issue/new'];

const ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  issues: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  tasks: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
};

// The last app-shell screen, so back arrows of flow screens return there.
let lastShellPath = '/';
export function backPath() {
  return lastShellPath;
}

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  return { path: path || '/', params: new URLSearchParams(query) };
}

export function currentPath() {
  return parseHash().path;
}

export function go(path) {
  if (location.hash.replace(/^#/, '') === path) route();
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
          <a class="btn btn-primary btn-small desktop-only" href="#/add">${S.addInfo} ${icon('plus')}</a>
          <button type="button" class="btn btn-secondary btn-small" data-action="logout">${S.logout}</button>
        </div>
      </div>
    </header>
    <main class="page has-bottom-nav" id="main"></main>
    <footer class="disclaimer has-bottom-nav">${S.disclaimer}</footer>
    <nav class="bottom-nav" aria-label="${S.nav.label}">
      ${links.map((l) => `<a href="${l.href}"${l.current}><svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[l.key]}</svg><span>${S.nav[l.key]}</span></a>`).join('')}
      <a class="fab" href="#/add" aria-label="${S.addInfo}">${icon('plus')}</a>
    </nav>`;
  app.querySelector('[data-action="logout"]').addEventListener('click', async () => {
    await signOut();
    go('/login');
  });
  return app.querySelector('#main');
}

// Frame for flow and form screens: back arrow and title on top, disclaimer at the bottom.
export function flowFrame(title, onBack) {
  app.innerHTML = `
    <header class="flow-header">
      <div class="flow-header-inner">
        <button type="button" class="icon-btn back-btn" aria-label="${S.back}">${icon('back')}</button>
        <h1 class="flow-title">${title}</h1>
      </div>
    </header>
    <main class="page page-narrow" id="main"></main>
    <footer class="disclaimer">${S.disclaimer}</footer>`;
  app.querySelector('.back-btn').addEventListener('click', onBack);
  return app.querySelector('#main');
}

async function route() {
  const { path, params } = parseHash();
  if (!ADD_FLOW_PATHS.includes(path)) leaveFlow();

  const session = await getSession();

  if (path === '/login') {
    if (session) return go('/');
    return renderLogin(app);
  }
  if (!session) return go('/login');

  const flowRender = FLOW_ROUTES[path];
  if (flowRender) {
    await flowRender(params);
    window.scrollTo(0, 0);
    return;
  }

  const entry = SHELL_ROUTES[path];
  if (!entry) return go('/');
  lastShellPath = path;
  const main = shell(entry.nav);
  await entry.render(main);
  window.scrollTo(0, 0);
}

export function startRouter() {
  window.addEventListener('hashchange', route);
  route();
}
