// Shared HTML pieces for the case screens: task rows, issue cards and tags.
// Every status or state is shown with a word and an icon, never by color alone.
import { S } from './strings.js';
import { icon } from './icons.js';
import { label, esc, formatDate, formatDayMonth, formatTime, dateTileParts } from './format.js';

export function typeTag(type) {
  if (!type) return `<span class="tag tag-unknown">${S.review.unknown}</span>`;
  return `<span class="tag tag-type-${type}">${icon(type)} ${label('task_types', type)}</span>`;
}

export function statusTag(status) {
  return `<span class="tag tag-status-${status}">${icon(status)} ${label('task_statuses', status)}</span>`;
}

// Computed issue state tag: 'action' (needs attention) or 'waiting'. Closed issues show issueStatusTag.
export function issueStateTag(state) {
  if (state === 'action') return `<span class="tag tag-state-action">${icon('attention')} ${S.common.stateAction}</span>`;
  return `<span class="tag tag-status-waiting">${icon('waiting')} ${S.common.stateWaiting}</span>`;
}

// Issue status tag: open / closed.
export function issueStatusTag(status) {
  return `<span class="tag tag-issue-${status}">${icon(status)} ${label('issue_statuses', status)}</span>`;
}

// Color dot of an issue, by its computed state. Always shown next to the issue name.
export function issueDot(state) {
  return `<span class="dot dot-${state}" aria-hidden="true"></span>`;
}

// "dot · issue name" for a task row. issueInfo: Map id -> { name, state }.
function issueLabel(task, issueInfo) {
  const info = task.medical_issue_id && issueInfo.get(task.medical_issue_id);
  if (!info) return `<span>${S.common.noIssue}</span>`;
  return `<span class="issue-ref">${issueDot(info.state)}${esc(info.name)}</span>`;
}

function dueText(t) {
  if (!t.due_date) return '';
  const time = t.type === 'appointment' && t.due_time ? `, ${formatTime(t.due_time)}` : '';
  // Keep "17.11, 09:30" in left-to-right order inside the Hebrew line.
  return S.common.dueBy(`<bdi dir="ltr">${formatDayMonth(t.due_date)}${time}</bdi>`);
}

// Arrow to the original document. Only for a task created from a document.
function docArrow(t) {
  if (!t.document_id) return '';
  return `<a class="icon-btn row-arrow" href="#/document/${t.document_id}"
    aria-label="${esc(S.common.openOriginal(t.description))}">${icon('chevron')}</a>`;
}

function dateTile(iso) {
  const { day, month } = dateTileParts(iso, S.common.months);
  return `<span class="date-tile" aria-hidden="true"><b>${day}</b><span>${month}</span></span>`;
}

function typeTile(type) {
  return `<span class="type-tile tile-${type}" aria-hidden="true">${icon(type)}</span>`;
}

const sep = '<span aria-hidden="true">·</span>';

// Task row. variant: 'now' (also used for "later"), 'waiting' or 'issue'.
export function taskRow(t, variant, issueInfo = new Map()) {
  let lead;
  let meta;
  let tags = '';
  if (variant === 'now') {
    lead = dateTile(t.due_date);
    meta = `${issueLabel(t, issueInfo)} ${sep} <span>${label('task_types', t.type)}</span>
      <span class="visually-hidden">${S.common.dueBy(formatDate(t.due_date))}</span>`;
    tags = `<span class="desktop-tag">${statusTag(t.status)}</span>`;
  } else if (variant === 'waiting') {
    lead = typeTile(t.type);
    const due = dueText(t);
    meta = `${issueLabel(t, issueInfo)}${due ? ` ${sep} <span>${due}</span>` : ''}`;
    tags = statusTag(t.status);
  } else {
    lead = typeTile(t.type);
    const due = dueText(t);
    meta = `${due ? `<span>${due}</span>` : ''} ${typeTag(t.type)}`;
    tags = statusTag(t.status);
  }
  return `
    <li class="trow">
      ${lead}
      <div class="trow-body">
        <span class="trow-title">${esc(t.description)}</span>
        <span class="trow-meta">${meta}</span>
      </div>
      <div class="trow-tags">${tags}</div>
      ${docArrow(t)}
    </li>`;
}

// Issue card: a link to the issue screen. opts: { showStatus, types } (topics screen).
export function issueCard(issue, state, opts = {}) {
  if (state === 'closed') {
    return `
      <a class="issue-card issue-closed state-closed" href="#/issue/${issue.id}">
        <span class="issue-card-body"><span class="issue-card-name">${esc(issue.name)}</span></span>
        <span class="issue-card-tags">${issueStatusTag('closed')}</span>
      </a>`;
  }
  const typeTags = (opts.types || []).map(typeTag).join('');
  return `
    <a class="issue-card state-${state}" href="#/issue/${issue.id}">
      <span class="issue-card-body">
        <span class="issue-card-name">${esc(issue.name)}</span>
        ${issue.next_step ? `<span class="issue-card-next">${esc(S.common.nextStep(issue.next_step))}</span>` : ''}
        ${typeTags ? `<span class="issue-card-types">${typeTags}</span>` : ''}
      </span>
      <span class="issue-card-tags">
        ${issueStateTag(state)}
        ${opts.showStatus ? issueStatusTag('open') : ''}
      </span>
    </a>`;
}

// Zone header: icon, title, optional count badge and extra content (e.g. a link).
export function zoneHead(iconName, title, count, extra = '', level = 'h2') {
  const badge = count === undefined ? '' : `<span class="count-badge">${count}</span>`;
  return `
    <div class="zone-head">
      <${level} class="t-h3">${icon(iconName)} ${title}</${level}>
      ${badge}${extra}
    </div>`;
}
