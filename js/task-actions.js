// Shared behavior of task rows on every screen: the status tag button and "add to calendar".
// One delegated listener per screen container. refresh() redraws the screen after a change.
import { updateTask } from './data.js';
import { statusDialog, calendarDialog } from './dialogs.js';
import { openCalendar } from './calendar.js';
import { S } from './strings.js';

export function bindTaskActions(container, tasks, refresh) {
  const byId = new Map(tasks.map((t) => [t.id, t]));

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
      if (!task.due_date) {
        const saved = await statusDialog(task, (changes) => updateTask(task.id, changes), 'done');
        if (saved) refresh();
        return;
      }
      doneBtn.disabled = true;
      try {
        await updateTask(task.id, { status: 'done' });
        refresh();
      } catch {
        doneBtn.disabled = false;
        alert(S.taskForm.saveFailed);
      }
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
