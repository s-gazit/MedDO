// Function constants. The model name is checked against the Gemini docs at build time.
export const MODEL = 'gemini-3.8-flash';

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_TEXT_CHARS = 20000;
export const MAX_ISSUES = 50;
export const MAX_ISSUE_NAME = 100;
export const GEMINI_TIMEOUT_MS = 50000;

export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const STORAGE_BUCKET = 'documents';
