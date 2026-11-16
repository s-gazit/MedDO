// Shared behavior of task rows on every screen: the status tag button and "add to calendar".
// One delegated listener per screen container. refresh() redraws the screen after a change.
import { updateTask } from './data.js';
import { statusDialog, calendarDialog } from './dialogs.js';
import { openCalendar } from './calendar.js';
import { S } from './strings.js';

export function bindTaskActions(container, tasks, refresh) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const prevStatus = new Map(); // task id -> status before the quick "done" switch
  const dated = new Set(); // tasks that got a due date from the picker on this screen

  container.addEventListener('click', async (e) => {
    const statusBtn = e.target.closest('[data-status-task]');
    if (statusBtn) {
      const task = byId.get(statusBtn.dataset.statusTask);
      if (!task) return;
      const saved = await statusDialog(task, (changes) => updateTask(task.id, changes));
      if (saved) refresh();
      return;
    }

    // Quick "done": saves at once; a task without a due date asks for one first (PRD 4.4).
    const doneBtn = e.target.closest('[data-done-task]');
    if (doneBtn) {
      const task = byId.get(doneBtn.dataset.doneTask);
      if (!task) return;
      // A done task stays on screen, struck through, until the user leaves the screen.
      // Turning the switch off again restores the status the task had before.
      const setOn = (on) => {
        doneBtn.setAttribute('aria-checked', String(on));
        const lbl = doneBtn.querySelector('.sw-label');
        if (lbl) lbl.textContent = on ? S.taskStatus.markDone : S.taskStatus.notDone;
        doneBtn.closest('.trow')?.classList.toggle('is-done', on);
      };
      const turnOn = doneBtn.getAttribute('aria-checked') !== 'true';
      if (!prevStatus.has(task.id)) prevStatus.set(task.id, task.status);

      // No due date yet: the status picker asks for one and saves "done" itself.
      if (turnOn && !task.due_date && !dated.has(task.id)) {
        const saved = await statusDialog(task, (changes) => updateTask(task.id, changes), 'done');
        if (saved) { dated.add(task.id); setOn(true); }
        return;
      }
      doneBtn.disabled = true;
      setOn(turnOn);
      try {
        await updateTask(task.id, { status: turnOn ? 'done' : prevStatus.get(task.id) });
      } catch {
        setOn(!turnOn);
        alert(S.taskForm.saveFailed);
      }
      doneBtn.disabled = false;
      return;
    }

    const calBtn = e.target.closest('[data-cal-task]');
    if (calBtn) {
      const task = byId.get(calBtn.dataset.calTask);
      if (!task) return;
      if (task.due_date && task.due_time) {
        openCalendar(task.description, task.due_date, task.due_time);
        return;
      }
      // Missing time (and maybe date): ask, open the calendar, then keep what was entered.
      const saved = await calendarDialog(task, (date, time) => {
        openCalendar(task.description, date, time);
        const changes = { due_time: time };
        if (!task.due_date) changes.due_date = date;
        return updateTask(task.id, changes);
      });
      if (saved) refresh();
    }
  });
}
