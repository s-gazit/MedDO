// Add-info flow (#/add): input -> analyzing -> review (or unreadable) -> save.
// The flow state lives in memory only (never localStorage). Nothing is written to the tables before
// "approve and save". An uploaded file is deleted when analysis fails or the user leaves the flow.
import { S } from '../strings.js';
import { go, flowFrame, backPath, currentPath } from '../router.js';
import { signOut } from '../auth.js';
import { icon } from '../icons.js';
import { formatDate, formatTime, label, options, esc } from '../format.js';
import { prepareFile } from '../image.js';
import { analyzeDocument } from '../ai-client.js';
import {
  listIssues, createIssue, createDocument, createTasks, uploadFile, signedUrl, removeFile,
} from '../data.js';

const FIELD_KEYS = ['content_type', 'specialty', 'doc_date', 'provider', 'key_info'];
const FIELD_MAX = { specialty: 60, provider: 200, key_info: 1000 };
const MAX_TEXT = 20000;
const TEXT_COUNT_FROM = 18000; // show the character counter near the limit
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ISSUES = 50;
const MAX_ISSUE_NAME = 100;
export const NEW_ISSUE = '__new'; // issueId value for an issue opened inside the flow, not saved yet

const TITLES = {
  input: S.add.title,
  analyzing: S.analyzing.title,
  unreadable: S.unreadable.title,
  review: S.review.title,
};

let flow = null;
let frame = { main: null, step: null };

function newFlow() {
  return {
    step: 'input',
    source: null,          // { mode:'file', blob, mime, ext, path, localUrl } | { mode:'text', text }
    draftText: '',
    notice: null,          // { text, retry }
    focusText: false,
    issues: null,          // [{ id, name, status }]
    data: null,            // function output
    fields: null,          // { key: { value, certain, source } }
    suggestedId: null,
    suggestionCertain: true,
    issueId: null,         // chosen issue id, or NEW_ISSUE
    newIssue: null,        // { name, status, next_step } opened from this flow
    tasks: [],
    fieldDrafts: {},       // fields being edited: { key: value }
    issueDraft: undefined, // issue select being edited
    errors: {},
    formError: null,
    saving: false,
    saved: {},             // { newIssueId, documentId, docIssueId } so a retry never saves twice
    token: 0,
  };
}

export function getFlow() {
  return flow;
}

// Delete the uploaded file unless a document row already points to it.
function discardFile(f) {
  const src = f.source;
  if (src?.mode !== 'file') return;
  if (src.path && !f.saved.documentId) removeFile(src.path).catch(() => {});
  if (src.localUrl) URL.revokeObjectURL(src.localUrl);
}

function clearSource(f) {
  discardFile(f);
  f.source = null;
}

// Called by the router on every route outside the flow, and after a successful save.
export function leaveFlow() {
  if (!flow) return;
  const f = flow;
  flow = null;
  frame = { main: null, step: null };
  discardFile(f);
}

// ---------- Rendering ----------

export function renderAdd() {
  if (!flow) flow = newFlow();
  frame.main = null;
  render();
}

function render() {
  if (!flow || currentPath() !== '/add') return;
  const f = flow;
  const stepChanged = frame.step !== f.step;
  let main = frame.main;
  if (!main || !main.isConnected || stepChanged) {
    main = flowFrame(TITLES[f.step], () => go(backPath()));
    frame = { main, step: f.step };
    main.onclick = onClick;
    main.oninput = onInput;
    main.onchange = onChange;
  }
  // On a new step, move focus to its title first; the step itself may then focus a field.
  if (stepChanged) {
    const title = document.querySelector('.flow-title');
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  }
  STEPS[f.step](main, f);
}

function renderInput(main, f) {
  main.innerHTML = `
    <p class="lead">${S.add.intro}</p>
    ${f.notice ? `
      <div class="notice" role="alert">
        <p>${icon('warning')} <span>${esc(f.notice.text)}</span></p>
        ${f.notice.retry ? `<button type="button" class="btn btn-secondary btn-small" data-act="retry">${S.add.retry}</button>` : ''}
      </div>` : ''}
    <div class="zone zone-mint pick-list">
      ${pickRow('upload', S.add.uploadTitle, S.add.uploadHint, 'accept="image/*,application/pdf"')}
      ${pickRow('camera', S.add.cameraTitle, S.add.cameraHint, 'accept="image/*" capture="environment"')}
    </div>
    <div class="field">
      <label for="free-text">${S.add.textLabel}</label>
      <textarea class="input textarea" id="free-text" maxlength="${MAX_TEXT}" placeholder="${S.add.textPlaceholder}"
        aria-describedby="text-error text-count">${esc(f.draftText)}</textarea>
      <p class="field-error" id="text-error" hidden></p>
      <p class="field-hint" id="text-count" hidden></p>
    </div>
    <button type="button" class="btn btn-primary btn-block" data-act="analyze">${S.add.analyze}</button>`;
  updateCount(main, f.draftText);
  if (f.focusText) {
    f.focusText = false;
    main.querySelector('#free-text').focus();
  }
}

function pickRow(kind, title, hint, attrs) {
  return `
    <label class="pick-row">
      <span class="pick-icon">${icon(kind)}</span>
      <span class="pick-text"><span class="pick-title">${title}</span><span class="pick-hint">${hint}</span></span>
      ${icon('chevron', 'pick-chevron')}
      <input type="file" class="visually-hidden" data-file ${attrs}>
    </label>`;
}

function updateCount(main, text) {
  const el = main.querySelector('#text-count');
  if (!el) return;
  el.hidden = text.length < TEXT_COUNT_FROM;
  el.textContent = S.add.textCount(text.length, MAX_TEXT);
}

function renderAnalyzing(main) {
  main.innerHTML = `
    <div class="status-panel" role="status">
      <div class="spinner" aria-hidden="true"></div>
      <h2 class="t-h2">${S.analyzing.heading}</h2>
      <p>${S.analyzing.text}</p>
    </div>`;
}

function renderUnreadable(main) {
  main.innerHTML = `
    <div class="status-panel">
      <div class="warn-tile">${icon('warning')}</div>
      <h2 class="t-h2">${S.unreadable.heading}</h2>
      <p>${S.unreadable.text}</p>
    </div>
    <div class="stack">
      <button type="button" class="btn btn-primary btn-block" data-act="again">${icon('camera')} ${S.unreadable.again}</button>
      <button type="button" class="btn btn-soft btn-block" data-act="as-text">${S.unreadable.asText}</button>
    </div>`;
}

function renderReview(main, f) {
  main.innerHTML = `
    <button type="button" class="btn btn-soft btn-block" data-act="original">${icon('doc')} ${S.review.showOriginal}</button>
    <p class="review-question">${S.review.question}</p>
    <div class="card field-list">
      ${FIELD_KEYS.map((k) => fieldRow(f, k)).join('')}
      ${issueRow(f)}
    </div>
    <section class="zone zone-coral" aria-labelledby="tasks-title">
      <div class="zone-head">
        <h2 class="t-h3" id="tasks-title">${icon('flag')} ${S.review.tasksTitle}</h2>
        <span class="count-badge" aria-label="${S.review.tasksCount(f.tasks.length)}">${f.tasks.length}</span>
      </div>
      ${f.tasks.length
        ? `<ul class="task-list">${f.tasks.map((t) => taskItem(f, t)).join('')}</ul>`
        : `<p class="zone-empty">${S.review.noTasks}</p>`}
    </section>
    ${f.formError ? `<div class="form-error" role="alert">${esc(f.formError)}</div>` : ''}
    <button type="button" class="btn btn-primary btn-block" data-act="save" ${f.saving ? 'disabled' : ''}>
      ${f.saving ? S.review.saving : S.review.submit}
    </button>`;
}

function uncertainNote() {
  return `<p class="uncertain">${icon('warning')} <span>${S.review.uncertain}</span></p>`;
}

function fieldDisplay(k, v) {
  if (k === 'content_type') return label('content_types', v) || v;
  if (k === 'doc_date') return formatDate(v);
  return v;
}

function fieldRow(f, k) {
  const fld = f.fields[k];
  const name = S.review.fields[k];
  const editing = k in f.fieldDrafts;
  let body;
  if (editing) {
    body = fieldEditor(k, f.fieldDrafts[k]);
  } else if (fld.value == null || fld.value === '') {
    body = `<span class="value-unknown">${S.review.unknown}</span>
      <button type="button" class="hint-link" data-edit="${k}">${S.review.notFound}</button>`;
  } else {
    body = `<span class="field-value">${esc(fieldDisplay(k, fld.value))}</span>${fld.certain ? '' : uncertainNote()}`;
  }
  return `
    <div class="frow" id="row-${k}">
      <div class="frow-body"><span class="frow-label" id="lbl-${k}">${name}</span>${body}</div>
      ${editing ? '' : `<button type="button" class="icon-btn" data-edit="${k}" aria-label="${S.review.edit(name)}">${icon('pencil')}</button>`}
    </div>`;
}

function fieldEditor(k, v) {
  const common = `id="in-${k}" data-draft="${k}" aria-labelledby="lbl-${k}"`;
  let control;
  if (k === 'content_type') {
    control = `<select class="input" ${common}>
      <option value="">${S.review.choose}</option>
      ${options('content_types').map((o) => `<option value="${o.code}" ${o.code === v ? 'selected' : ''}>${o.label}</option>`).join('')}
    </select>`;
  } else if (k === 'doc_date') {
    control = `<input type="date" class="input" ${common} value="${esc(v)}">`;
  } else if (k === 'key_info') {
    control = `<textarea class="input textarea textarea-sm" ${common} maxlength="${FIELD_MAX[k]}">${esc(v)}</textarea>`;
  } else {
    control = `<input type="text" class="input" ${common} maxlength="${FIELD_MAX[k]}" value="${esc(v)}">`;
  }
  return `${control}
    <div class="inline-actions">
      <button type="button" class="btn btn-primary btn-small" data-fsave="${k}">${S.save}</button>
      <button type="button" class="btn btn-secondary btn-small" data-fcancel="${k}">${S.cancel}</button>
    </div>`;
}

function issueName(f, id) {
  if (id === NEW_ISSUE) return f.newIssue?.name ?? '';
  return f.issues.find((i) => i.id === id)?.name ?? '';
}

function sortedIssues(f) {
  return [...f.issues.filter((i) => i.status !== 'closed'), ...f.issues.filter((i) => i.status === 'closed')];
}

function issueRow(f) {
  const editing = f.issueDraft !== undefined;
  const err = f.errors.issue;
  let body;
  if (editing) {
    body = `
      <select class="input" id="in-issue" data-issue-draft aria-labelledby="lbl-issue"
        ${err ? 'aria-invalid="true" aria-describedby="err-issue"' : ''}>
        <option value="">${S.review.choose}</option>
        ${f.newIssue ? `<option value="${NEW_ISSUE}" ${f.issueDraft === NEW_ISSUE ? 'selected' : ''}>${esc(f.newIssue.name)} (${S.review.issueNew})</option>` : ''}
        ${sortedIssues(f).map((i) => `<option value="${i.id}" ${i.id === f.issueDraft ? 'selected' : ''}>${esc(i.name)}${i.status === 'closed' ? ` ${S.review.issueClosed}` : ''}</option>`).join('')}
      </select>
      <div class="inline-actions">
        <button type="button" class="btn btn-primary btn-small" data-isave>${S.save}</button>
        <button type="button" class="btn btn-secondary btn-small" data-icancel>${S.cancel}</button>
      </div>`;
  } else if (f.issueId) {
    let tag = '';
    if (f.issueId === NEW_ISSUE) tag = `<span class="tag tag-new">${icon('new')} ${S.review.issueNew}</span>`;
    else if (f.issueId === f.suggestedId) tag = `<span class="tag tag-suggest">${S.review.issueSuggested}</span>`;
    body = `<span class="field-value"><span class="dot" aria-hidden="true"></span>${esc(issueName(f, f.issueId))} ${tag}</span>
      ${f.issueId === f.suggestedId && !f.suggestionCertain ? uncertainNote() : ''}`;
  } else {
    body = `<span class="value-unknown">${S.review.issueNone}</span>`;
  }
  return `
    <div class="frow" id="row-issue">
      <div class="frow-body">
        <span class="frow-label" id="lbl-issue">${S.review.issueLabel}</span>
        ${body}
        <button type="button" class="btn-text link-small" data-act="new-issue">${S.review.newIssue}</button>
        ${err ? `<p class="field-error" id="err-issue">${icon('warning')} <span>${err}</span></p>` : ''}
      </div>
      ${editing ? '' : `<button type="button" class="icon-btn" data-edit="issue" aria-label="${S.review.edit(S.review.issueFieldName)}">${icon('pencil')}</button>`}
    </div>`;
}

function typeTag(type) {
  if (!type) return `<span class="tag tag-unknown">${S.review.unknown}</span>`;
  return `<span class="tag tag-type-${type}">${icon(type)} ${label('task_types', type)}</span>`;
}

function statusTag(status) {
  return `<span class="tag tag-status-${status}">${icon(status)} ${label('task_statuses', status)}</span>`;
}

function dueText(t) {
  if (!t.due_date) return `<span class="value-unknown">${S.review.dueUnknown}</span>`;
  const time = t.type === 'appointment' && t.due_time ? `, ${formatTime(t.due_time)}` : '';
  return `<span>${S.review.dueBy(formatDate(t.due_date))}${time}</span>`;
}

function taskItem(f, t) {
  if (t.editing) return `<li class="task-item task-editing" id="task-${t.key}">${taskEditor(f, t)}</li>`;
  const desc = t.description || S.review.unknown;
  return `
    <li class="task-item" id="task-${t.key}">
      <div class="task-body">
        <span class="task-title">${esc(desc)}</span>
        <span class="task-meta">${typeTag(t.type)} ${statusTag(t.status)} ${dueText(t)}</span>
        ${t.certain ? '' : uncertainNote()}
      </div>
      <div class="task-actions">
        <button type="button" class="icon-btn" data-tedit="${t.key}" aria-label="${esc(S.review.taskEdit(desc))}">${icon('pencil')}</button>
        <button type="button" class="icon-btn" data-tdel="${t.key}" aria-label="${esc(S.review.taskDelete(desc))}">${icon('close')}</button>
      </div>
    </li>`;
}

function errAttrs(f, id) {
  return f.errors[id] ? `aria-invalid="true" aria-describedby="err-${id.replace('.', '-')}"` : '';
}
function errText(f, id) {
  const e = f.errors[id];
  return e ? `<p class="field-error" id="err-${id.replace('.', '-')}">${icon('warning')} <span>${e}</span></p>` : '';
}

function taskEditor(f, t) {
  const d = t.draft;
  const p = `t${t.key}`;
  const k = t.key;
  return `
    <div class="field">
      <label for="${p}-desc">${S.review.taskDesc}</label>
      <input type="text" class="input" id="${p}-desc" data-tdraft="${k}" data-k="description" maxlength="200"
        value="${esc(d.description)}" ${errAttrs(f, `${k}.description`)}>
      ${errText(f, `${k}.description`)}
    </div>
    <div class="field-pair">
      <div class="field">
        <label for="${p}-type">${S.review.taskType}</label>
        <select class="input" id="${p}-type" data-tdraft="${k}" data-k="type" ${errAttrs(f, `${k}.type`)}>
          ${d.type ? '' : `<option value="">${S.review.choose}</option>`}
          ${options('task_types').map((o) => `<option value="${o.code}" ${o.code === d.type ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
        ${errText(f, `${k}.type`)}
      </div>
      <div class="field">
        <label for="${p}-status">${S.review.taskStatus}</label>
        <select class="input" id="${p}-status" data-tdraft="${k}" data-k="status">
          ${options('task_statuses').map((o) => `<option value="${o.code}" ${o.code === d.status ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field-pair">
      <div class="field">
        <label for="${p}-due">${S.review.taskDue}</label>
        <input type="date" class="input" id="${p}-due" data-tdraft="${k}" data-k="due_date" value="${esc(d.due_date)}"
          ${errAttrs(f, `${k}.due_date`)}>
        ${errText(f, `${k}.due_date`)}
      </div>
      ${d.type === 'appointment' ? `
      <div class="field">
        <label for="${p}-time">${S.review.taskTime}</label>
        <input type="time" class="input" id="${p}-time" data-tdraft="${k}" data-k="due_time" value="${esc(formatTime(d.due_time))}">
      </div>` : ''}
    </div>
    <div class="inline-actions">
      <button type="button" class="btn btn-primary btn-small" data-tsave="${k}">${S.save}</button>
      <button type="button" class="btn btn-secondary btn-small" data-tcancel="${k}">${S.cancel}</button>
    </div>`;
}

const STEPS = { input: renderInput, analyzing: renderAnalyzing, unreadable: renderUnreadable, review: renderReview };

// ---------- Events ----------

function onClick(e) {
  const f = flow;
  if (!f) return;
  const el = e.target.closest('button');
  if (!el) return;
  const ds = el.dataset;

  switch (ds.act) {
    case 'analyze': return startText(f);
    case 'retry': return analyze(f);
    case 'again': f.step = 'input'; return render();
    case 'as-text': f.step = 'input'; f.focusText = true; return render();
    case 'original': return go('/add/original');
    case 'new-issue': return go('/issue/new');
    case 'save': return save(f);
    default: break;
  }

  if (ds.edit === 'issue') {
    f.issueDraft = f.issueId ?? '';
    render();
    return focus('#in-issue');
  }
  if (ds.edit) {
    f.fieldDrafts[ds.edit] = f.fields[ds.edit].value ?? '';
    render();
    return focus(`#in-${ds.edit}`);
  }
  if (ds.fsave) {
    commitField(f, ds.fsave);
    render();
    return focus(`#row-${ds.fsave} .icon-btn`);
  }
  if (ds.fcancel) {
    delete f.fieldDrafts[ds.fcancel];
    render();
    return focus(`#row-${ds.fcancel} .icon-btn`);
  }
  if ('isave' in ds) {
    commitIssue(f);
    render();
    return focus('#row-issue .icon-btn');
  }
  if ('icancel' in ds) {
    f.issueDraft = undefined;
    render();
    return focus('#row-issue .icon-btn');
  }
  const task = (key) => f.tasks.find((t) => t.key === key);
  if (ds.tedit) {
    const t = task(ds.tedit);
    t.editing = true;
    t.draft = { description: t.description, type: t.type, status: t.status, due_date: t.due_date, due_time: t.due_time };
    render();
    return focus(`#t${t.key}-desc`);
  }
  if (ds.tsave) {
    commitTask(f, task(ds.tsave));
    render();
    return focus(`[data-tedit="${ds.tsave}"]`);
  }
  if (ds.tcancel) {
    const t = task(ds.tcancel);
    t.editing = false;
    t.draft = null;
    clearTaskErrors(f, t.key);
    render();
    return focus(`[data-tedit="${t.key}"]`);
  }
  if (ds.tdel) {
    f.tasks = f.tasks.filter((t) => t.key !== ds.tdel);
    clearTaskErrors(f, ds.tdel);
    render();
    return focus('#tasks-title');
  }
}

function onInput(e) {
  const f = flow;
  if (!f) return;
  const el = e.target;
  if (el.id === 'free-text') {
    f.draftText = el.value;
    el.removeAttribute('aria-invalid');
    frame.main.querySelector('#text-error').hidden = true;
    updateCount(frame.main, el.value);
    return;
  }
  updateDraft(f, el);
}

function onChange(e) {
  const f = flow;
  if (!f) return;
  const el = e.target;
  if (el.matches('[data-file]')) {
    const file = el.files?.[0];
    el.value = '';
    return startFile(f, file);
  }
  updateDraft(f, el);
  // The time field appears only for appointments.
  if (el.dataset.k === 'type') {
    render();
    focus(`#${el.id}`);
  }
}

function updateDraft(f, el) {
  if (el.dataset.draft) f.fieldDrafts[el.dataset.draft] = el.value;
  else if ('issueDraft' in el.dataset) f.issueDraft = el.value;
  else if (el.dataset.tdraft) {
    const t = f.tasks.find((x) => x.key === el.dataset.tdraft);
    if (t?.draft) t.draft[el.dataset.k] = el.value;
  }
}

function focus(selector) {
  frame.main?.querySelector(selector)?.focus();
}

// ---------- Drafts ----------

function commitField(f, k) {
  const raw = String(f.fieldDrafts[k] ?? '').trim();
  const value = raw || null;
  if (value !== f.fields[k].value) f.fields[k] = { value, certain: true, source: 'user' };
  delete f.fieldDrafts[k];
}

function commitIssue(f) {
  f.issueId = f.issueDraft || null;
  f.issueDraft = undefined;
  if (f.issueId) delete f.errors.issue;
}

function commitTask(f, t) {
  const d = t.draft;
  t.description = String(d.description ?? '').trim();
  t.type = d.type || null;
  t.status = d.status;
  t.due_date = d.due_date || null;
  t.due_time = d.due_time || null;
  t.certain = true; // reviewed by the user
  t.editing = false;
  t.draft = null;
  clearTaskErrors(f, t.key);
}

function clearTaskErrors(f, key) {
  for (const id of Object.keys(f.errors)) if (id.startsWith(`${key}.`)) delete f.errors[id];
}

function commitAllDrafts(f) {
  for (const k of Object.keys(f.fieldDrafts)) commitField(f, k);
  if (f.issueDraft !== undefined && f.issueDraft) commitIssue(f);
  for (const t of f.tasks) if (t.editing) commitTask(f, t);
}

// ---------- Input -> analysis ----------

function showNotice(f, text, retry = false) {
  if (flow !== f) return;
  f.notice = { text, retry };
  f.step = 'input';
  render();
}

async function startFile(f, file) {
  if (!file) return;
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImage = file.type.startsWith('image/');
  if (!isPdf && !isImage) return showNotice(f, S.addErrors.unsupported);

  let prepared;
  try {
    prepared = await prepareFile(file, isPdf ? 'application/pdf' : file.type);
  } catch {
    return showNotice(f, S.addErrors.openFailed);
  }
  if (flow !== f) return;
  if (prepared.blob.size > MAX_FILE_BYTES) return showNotice(f, S.addErrors.too_large);

  clearSource(f);
  f.source = {
    mode: 'file',
    blob: prepared.blob,
    mime: prepared.mimeType,
    ext: prepared.ext,
    path: null,
    localUrl: URL.createObjectURL(prepared.blob),
  };
  analyze(f);
}

function startText(f) {
  const text = f.draftText.trim();
  if (!text) {
    const input = frame.main.querySelector('#free-text');
    const err = frame.main.querySelector('#text-error');
    err.textContent = S.add.textEmpty;
    err.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  clearSource(f);
  f.source = { mode: 'text', text };
  analyze(f);
}

async function analyze(f) {
  if (!f.source) return;
  const my = ++f.token;
  const alive = () => flow === f && f.token === my;
  f.step = 'analyzing';
  f.notice = null;
  render();

  try {
    if (!f.issues) f.issues = await listIssues();
    if (!alive()) return;
    const issues = f.issues.slice(0, MAX_ISSUES).map((i) => ({ id: i.id, name: i.name.slice(0, MAX_ISSUE_NAME) }));

    let payload;
    if (f.source.mode === 'file') {
      if (!f.source.path) {
        let path;
        try {
          path = await uploadFile(f.source.blob, f.source.mime, f.source.ext);
        } catch {
          return showNotice(f, S.addErrors.uploadFailed, true);
        }
        if (flow !== f) {
          removeFile(path).catch(() => {}); // the user left while uploading
          return;
        }
        f.source.path = path;
      }
      payload = { mode: 'file', file_url: await signedUrl(f.source.path), mime_type: f.source.mime, issues };
    } else {
      payload = { mode: 'text', text: f.source.text, issues };
    }

    const res = await analyzeDocument(payload);
    if (!alive()) return;
    if (res.ok) return startReview(f, res.data);
    return handleError(f, res.code);
  } catch {
    if (alive()) showNotice(f, S.addErrors.unavailable, true);
  }
}

async function handleError(f, code) {
  if (code === 'unreadable') {
    clearSource(f);
    f.step = 'unreadable';
    return render();
  }
  if (code === 'unauthorized') {
    leaveFlow();
    await signOut();
    return go('/login');
  }
  if (code === 'too_large' || code === 'bad_request') {
    clearSource(f);
    return showNotice(f, S.addErrors[code]);
  }
  return showNotice(f, S.addErrors.unavailable, true);
}

function startReview(f, data) {
  f.data = data;
  f.fields = Object.fromEntries(FIELD_KEYS.map((k) => [k, {
    value: data[k]?.value ?? null,
    certain: data[k]?.certain !== false,
    source: 'ai',
  }]));
  const sid = data.issue_suggestion?.issue_id ?? null;
  f.suggestedId = f.issues.some((i) => i.id === sid) ? sid : null;
  f.suggestionCertain = data.issue_suggestion?.certain !== false;
  f.issueId = f.suggestedId;
  f.tasks = (data.tasks || []).map((t, i) => ({
    key: String(i),
    description: t.description || '',
    type: t.type || null,
    status: 'todo',
    due_date: t.due_date || null,
    due_time: t.due_time || null,
    certain: t.certain !== false,
    editing: false,
    draft: null,
  }));
  f.fieldDrafts = {};
  f.issueDraft = undefined;
  f.errors = {};
  f.formError = null;
  f.step = 'review';
  render();
}

// ---------- Validation and save ----------

function validate(f) {
  const errors = {};
  if (!f.issueId) errors.issue = S.review.issueRequired;
  for (const t of f.tasks) {
    if (!t.description) errors[`${t.key}.description`] = S.review.descRequired;
    if (!t.type) errors[`${t.key}.type`] = S.review.typeRequired;
    if (t.status !== 'waiting' && !t.due_date) errors[`${t.key}.due_date`] = S.review.dueRequired;
  }
  f.errors = errors;
  if (errors.issue) f.issueDraft = '';
  // Open the edit form of every task with an error, so the error shows next to its field.
  for (const t of f.tasks) {
    if (Object.keys(errors).some((id) => id.startsWith(`${t.key}.`))) {
      t.editing = true;
      t.draft = { description: t.description, type: t.type, status: t.status, due_date: t.due_date, due_time: t.due_time };
    }
  }
  return Object.keys(errors).length === 0;
}

function documentRow(f, issueId) {
  const src = f.source;
  const v = (k) => f.fields[k].value;
  return {
    file_path: src.mode === 'file' ? src.path : null,
    file_mime: src.mode === 'file' ? src.mime : null,
    input_text: src.mode === 'text' ? src.text : null,
    extracted_text: f.data.raw_text || '',
    content_type: v('content_type'),
    specialty: v('specialty'),
    doc_date: v('doc_date'),
    provider: v('provider'),
    key_info: v('key_info'),
    medical_issue_id: issueId,
    fields: Object.fromEntries(FIELD_KEYS.map((k) => [k, { ...f.fields[k] }])),
  };
}

async function save(f) {
  if (f.saving) return;
  commitAllDrafts(f);
  f.formError = null;
  if (!validate(f)) {
    f.formError = S.review.fixErrors;
    render();
    frame.main.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  f.saving = true;
  render();
  try {
    // Order (ARCHITECTURE 1.2, step 6): new issue -> document -> tasks. Each step is skipped on retry if done.
    let issueId;
    if (f.saved.documentId) {
      issueId = f.saved.docIssueId;
    } else if (f.issueId === NEW_ISSUE) {
      if (!f.saved.newIssueId) f.saved.newIssueId = await createIssue(f.newIssue);
      issueId = f.saved.newIssueId;
    } else {
      issueId = f.issueId;
    }

    if (!f.saved.documentId) {
      f.saved.documentId = await createDocument(documentRow(f, issueId));
      f.saved.docIssueId = issueId;
    }

    await createTasks(f.tasks.map((t) => ({
      description: t.description,
      type: t.type,
      status: t.status,
      due_date: t.due_date,
      due_time: t.type === 'appointment' ? t.due_time : null,
      document_id: f.saved.documentId,
      medical_issue_id: issueId,
    })));

    leaveFlow(); // the document now owns the file, so it is not deleted
    go('/');
  } catch {
    if (flow !== f) return;
    f.saving = false;
    f.formError = S.review.saveFailed;
    render();
  }
}
