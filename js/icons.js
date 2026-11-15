// Line icons (stroke 2, round caps), 24x24. Decorative: always paired with a word or an aria-label.
const PATHS = {
  upload: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M5 20h14"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  pencil: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  warning: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
  back: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  chevron: '<path d="M15 6l-6 6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  flag: '<path d="M6 21V4h11l-2 4 2 4H6"/>',
  // task types
  appointment: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  test: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
  result: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  medication: '<rect x="3" y="9" width="18" height="7" rx="3.5"/><path d="M12 9v7"/>',
  refund: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  // task statuses
  todo: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  waiting: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  done: '<path d="M5 12l5 5 9-10"/>',
  new: '<path d="M12 5v14M5 12h14"/>',
};

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${PATHS[name] || ''}</svg>`;
}
