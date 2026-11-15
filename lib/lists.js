// Fixed lists for the function, read once from config/lists.json (single source of codes).
import { readFileSync } from 'node:fs';

const lists = JSON.parse(readFileSync(new URL('../config/lists.json', import.meta.url), 'utf8'));

export const CONTENT_TYPES = lists.content_types.map((x) => x.code);
export const TASK_TYPES = lists.task_types.map((x) => x.code);
