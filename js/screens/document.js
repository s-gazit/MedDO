// "Original document" screen.
// - #/add/original  inside the add flow, before saving: no details line yet (they are not approved).
// - #/document/:id  a saved document, with the details line (content type, date, issue).
// Image and free text are shown in the screen; a PDF opens in a new tab through a short-lived signed URL.
import { S } from '../strings.js';
import { go, flowFrame, backPath } from '../router.js';
import { icon } from '../icons.js';
import { esc, label, formatDate } from '../format.js';
import { signedUrl, getDocument, listIssueTasks } from '../data.js';
import { issueState } from '../case-state.js';
import { issueDot } from '../components.js';
import { getFlow } from './add-flow.js';

export function renderOriginalFromFlow() {
  const f = getFlow();
  if (!f?.source || f.step !== 'review') return go('/add');

  const main = flowFrame(S.original.title, () => go('/add'));
  const src = f.source;
  if (src.mode === 'text') return showPanel(main, { text: src.text });
  if (src.mime.startsWith('image/')) return showPanel(main, { imageUrl: src.localUrl });
  return showPanel(main, { pdfPath: src.path });
}

export async function renderDocument(params, id) {
  const main = flowFrame(S.original.title, () => go(backPath()));
  main.innerHTML = `<p class="lead">${S.common.loading}</p>`;

  let doc;
  try {
    doc = await getDocument(id);
  } catch {
    main.innerHTML = `<p class="form-error" role="alert">${S.loadError}</p>`;
    return;
  }
  if (!doc) {
    main.innerHTML = `<p class="lead">${S.original.notFound}</p>`;
    return;
  }

  // The dot shows the issue's computed state, like everywhere else.
  let state = doc.medical_issues?.status === 'closed' ? 'closed' : 'waiting';
  try {
    const tasks = await listIssueTasks(doc.medical_issue_id);
    state = issueState({ id: doc.medical_issue_id, status: doc.medical_issues?.status }, tasks);
  } catch { /* keep the simple color */ }

  const line = [doc.doc_date ? formatDate(doc.doc_date) : '', doc.medical_issues?.name || ''].filter(Boolean);
  const typeLabel = label('content_types', doc.content_type);
  const details = `
    <div class="doc-details">
      ${typeLabel ? `<span class="tag tag-doctype">${icon('doc')} ${typeLabel}</span>` : ''}
      <span class="issue-ref">${issueDot(state)}${line.map(esc).join(' · ')}</span>
    </div>`;

  if (doc.input_text) return showPanel(main, { text: doc.input_text }, details);
  if (doc.file_mime?.startsWith('image/')) {
    let url;
    try {
      url = await signedUrl(doc.file_path);
    } catch {
      return showPanel(main, { error: true }, details);
    }
    return showPanel(main, { imageUrl: url }, details);
  }
  return showPanel(main, { pdfPath: doc.file_path }, details);
}

// Draws the panel. content: { text } | { imageUrl } | { pdfPath } | { error }.
function showPanel(main, content, details = '') {
  let inner;
  if (content.text !== undefined) {
    inner = `<div class="original-text">${esc(content.text)}</div>`;
  } else if (content.imageUrl) {
    inner = `<img class="original-image" src="${esc(content.imageUrl)}" alt="${S.original.imageAlt}">`;
  } else if (content.error) {
    inner = `<p class="form-error" role="alert">${S.original.openFailed}</p>`;
  } else {
    inner = `
      <div class="original-file">
        ${icon('doc', 'icon-lg')}
        <button type="button" class="btn btn-soft" data-act="open-file">${S.original.openFile}</button>
        <p class="form-error" role="alert" hidden></p>
      </div>`;
  }
  main.innerHTML = `${details}<div class="original-panel">${inner}</div>`;

  main.querySelector('[data-act="open-file"]')?.addEventListener('click', async () => {
    const error = main.querySelector('.original-file .form-error');
    error.hidden = true;
    // Open the tab now (inside the click), then point it at the signed URL, so pop-up blockers allow it.
    const tab = window.open('', '_blank');
    try {
      const url = await signedUrl(content.pdfPath);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener');
      }
    } catch {
      tab?.close();
      error.textContent = S.original.openFailed;
      error.hidden = false;
    }
  });
}
