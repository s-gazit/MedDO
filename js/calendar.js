// Google Calendar template link (ARCHITECTURE 5.6). No API, no OAuth.
// Only the appointment description, date and time leave the app. No other medical detail.
import { addDaysISO } from './case-state.js';
import { S } from './strings.js';

const EVENT_HOURS = 1;

// '2026-11-17', '09:30' -> '20261117T093000'
function stamp(dateISO, hh, mm) {
  return `${dateISO.replace(/-/g, '')}T${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
}

// dateISO 'YYYY-MM-DD', time 'HH:MM' or 'HH:MM:SS'. The event lasts one hour (may cross midnight).
export function calendarUrl(description, dateISO, time) {
  const [h, m] = time.split(':').map(Number);
  const endTotal = h + EVENT_HOURS;
  const endDate = endTotal >= 24 ? addDaysISO(dateISO, 1) : dateISO;
  const dates = `${stamp(dateISO, h, m)}/${stamp(endDate, endTotal % 24, m)}`;
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + `&text=${encodeURIComponent(description)}`
    + `&dates=${encodeURIComponent(dates)}`
    + `&details=${encodeURIComponent(S.calendar.details)}`
    + `&ctz=${encodeURIComponent('Asia/Jerusalem')}`;
}

// Opens the link in a new tab. Must run inside the click (or submit) handler, or the browser may block it.
export function openCalendar(description, dateISO, time) {
  window.open(calendarUrl(description, dateISO, time), '_blank', 'noopener');
}
