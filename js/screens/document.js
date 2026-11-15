// "Original document" screen. In this milestone: only from inside the add flow (#/add/original),
// before saving, so there is no details line yet. Image and free text are shown in the screen;
// a PDF opens in a new tab through a short-lived signed URL.
import { S } from '../strings.js';
import { go, flowFrame } from '../router.js';
import { icon } from '../icons.js';
import { esc } from '../format.js';
import { signedUrl } from '../data.js';
import { getFlow } from './add-flow.js';

export function renderOriginalFromFlow() {
  const f = getFlow();
  if (!f?.source || f.step !== 'review') return go('/add');

  const main = flowFrame(S.original.title, () => go('/add'));
  const src = f.source;
  let content;
  if (src.mode === 'text') {
    content = `<div class="original-text">${esc(src.text)}</div>`;
  } else if (src.mime.startsWith('image/')) {
    content = `<img class="original-image" src="${src.localUrl}" alt="${S.original.imageAlt}">`;
  } else {
    content = `
      <div class="original-file">
        ${icon('doc', 'icon-lg')}
        <button type="button" class="btn btn-soft" data-act="open-file">${S.original.openFile}</button>
        <p class="form-error" role="alert" hidden></p>
      </div>`;
  }
  main.innerHTML = `<div class="original-panel">${content}</div>`;

  main.querySelector('[data-act="open-file"]')?.addEventListener('click', async () => {
    const error = main.querySelector('.form-error');
    error.hidden = true;
    // Open the tab now (inside the click), then point it at the signed URL, so pop-up blockers allow it.
    const tab = window.open('', '_blank');
    try {
      const url = await signedUrl(src.path);
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
