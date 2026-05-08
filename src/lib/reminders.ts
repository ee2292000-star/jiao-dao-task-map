import type { Reminder, Task } from "./types";

export function getDaysLeft(dueDate: string, today = new Date()): number {
  const start = new Date(today.toDateString()).getTime();
  const due = new Date(`${dueDate}T00:00:00`).getTime();
  return Math.ceil((due - start) / (1000 * 60 * 60 * 24));
}

export function isTaskClosed(task: Task) {
  return task.status === "done" || task.status === "archived";
}

export function buildReminders(tasks: Task[], teacherId?: string): Reminder[] {
  return tasks
    .filter((task) => !teacherId || task.ownerIds.includes(teacherId))
    .flatMap((task) => {
      const daysLeft = getDaysLeft(task.dueDate);
      const reminders: Reminder[] = [];

      if (daysLeft < 0 && !isTaskClosed(task)) {
        reminders.push({
          id: `${task.id}-overdue`,
          type: "overdue",
          taskId: task.id,
          message: `${task.title} 已逾期 ${Math.abs(daysLeft)} 天`,
          level: "danger"
        });
      } else if (daysLeft <= 3 && !isTaskClosed(task)) {
        reminders.push({
          id: `${task.id}-soon`,
          type: "due-soon",
          taskId: task.id,
          message: `${task.title} 剩 ${Math.max(0, daysLeft)} 天到期`,
          level: "warning"
        });
      }

      if (teacherId && task.ownerIds.includes(teacherId) && !isTaskClosed(task)) {
        reminders.push({
          id: `${task.id}-assigned`,
          type: "assigned",
          taskId: task.id,
          message: `你被指派：${task.title}`,
          level: "info"
        });
      }

      return reminders;
    });
}
