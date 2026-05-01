import type { Event, StickyNote, Task, Teacher } from "./types";
import { getDaysLeft } from "./reminders";

function getTodayString() {
  return new Date().toLocaleDateString("sv-SE");
}

export type PriorityContext = {
  tasks: Task[];
  teachers: Teacher[];
  events: Event[];
  today?: Date;
};

export function getPriorityLabel(priority: Task["priority"]) {
  return priority === "high" ? "高" : priority === "normal" ? "中" : "低";
}

export function getStatusLabel(status: Task["status"]) {
  return status === "todo" ? "待辦" : status === "doing" ? "進行中" : "完成";
}

function getAssigneeIds(task: Task) {
  return task.assignees.length ? task.assignees : task.ownerIds;
}

function getEvent(task: Task, context: PriorityContext) {
  return context.events.find((event) => event.id === task.eventId);
}

function getEventTasks(eventId: string | undefined, context: PriorityContext) {
  if (!eventId) return [];
  return context.tasks.filter((task) => task.eventId === eventId);
}

export function getEventProgress(event: Event, tasks: Task[]) {
  const eventTasks = tasks.filter((task) => task.eventId === event.id);
  const done = eventTasks.filter((task) => task.status === "done").length;
  return eventTasks.length ? Math.round((done / eventTasks.length) * 100) : 0;
}

export function calculatePriorityScore(task: Task, context: PriorityContext) {
  const today = context.today ?? new Date();
  const daysLeft = getDaysLeft(task.dueDate, today);
  const assigneeIds = getAssigneeIds(task);
  let score = 0;

  if (daysLeft < 0) score += 100;
  else if (daysLeft <= 1) score += 80;
  else if (daysLeft <= 2) score += 60;
  else if (daysLeft <= 3) score += 40;
  else if (daysLeft <= 7) score += 20;

  if (task.status === "todo") score += 30;
  if (task.status === "doing") score += 10;
  if (task.status === "done") score -= 999;

  if (task.isCritical || task.isKeyTask) score += 50;
  if (task.isBlocked) score += 40;
  if (assigneeIds.length === 0) score += 40;

  if (task.priority === "high") score += 50;
  if (task.priority === "normal") score += 10;
  if (task.priority === "low") score -= 10;

  assigneeIds.forEach((assigneeId) => {
    const unfinished = context.tasks.filter(
      (candidate) =>
        candidate.status !== "done" && getAssigneeIds(candidate).includes(assigneeId)
    );
    const hasOverdue = unfinished.some((candidate) => getDaysLeft(candidate.dueDate, today) < 0);
    if (unfinished.length > 4) score += 20;
    if (hasOverdue) score += 20;
  });

  const event = getEvent(task, context);
  if (event) {
    const progress = getEventProgress(event, context.tasks);
    const eventDaysLeft = getDaysLeft(event.endDate, today);
    if (progress < 30 && eventDaysLeft < 14) score += 30;
    if ((task.isCritical || task.isKeyTask) && task.status !== "done") score += 40;
  }

  return score;
}

export function getPriorityReasons(task: Task, context: PriorityContext) {
  const today = context.today ?? new Date();
  const daysLeft = getDaysLeft(task.dueDate, today);
  const assigneeIds = getAssigneeIds(task);
  const reasons: string[] = [];

  if (task.status === "done") return ["已完成"];
  if (daysLeft < 0) reasons.push(`已逾期 ${Math.abs(daysLeft)} 天`);
  else if (daysLeft <= 3) reasons.push(`${daysLeft} 天內到期`);
  else if (daysLeft <= 7) reasons.push("本週到期");

  if (task.status === "todo") reasons.push("尚未開始");
  if (task.isCritical || task.isKeyTask) reasons.push("關鍵任務尚未完成");
  if (task.isBlocked) reasons.push("目前卡關");
  if (assigneeIds.length === 0) reasons.push("尚未指派");
  if (task.priority === "high") reasons.push("主任標記高優先");

  const hasLoadedAssignee = assigneeIds.some((assigneeId) => {
    const unfinished = context.tasks.filter(
      (candidate) =>
        candidate.status !== "done" && getAssigneeIds(candidate).includes(assigneeId)
    );
    return unfinished.length > 4;
  });
  const hasOverdueAssignee = assigneeIds.some((assigneeId) =>
    context.tasks.some(
      (candidate) =>
        candidate.status !== "done" &&
        getAssigneeIds(candidate).includes(assigneeId) &&
        getDaysLeft(candidate.dueDate, today) < 0
    )
  );
  if (hasLoadedAssignee) reasons.push("負責人任務較多");
  if (hasOverdueAssignee) reasons.push("負責人已有逾期任務");

  const event = getEvent(task, context);
  if (event) {
    const progress = getEventProgress(event, context.tasks);
    const eventDaysLeft = getDaysLeft(event.endDate, today);
    if (progress < 30 && eventDaysLeft < 14) reasons.push("活動進度偏低");
    if (eventDaysLeft < 14) reasons.push("活動即將到期");
  }

  return [...new Set(reasons)].slice(0, 3);
}

export function getTodayFocusTasks(tasks: Task[], context: PriorityContext, limit = 3) {
  return tasks
    .filter((task) => task.status !== "done")
    .map((task) => ({
      task,
      daysLeft: getDaysLeft(task.dueDate, context.today),
      score: calculatePriorityScore(task, context),
      reasons: getPriorityReasons(task, context)
    }))
    .sort((a, b) => b.score - a.score || a.daysLeft - b.daysLeft)
    .slice(0, limit);
}

export function getRiskTasks(tasks: Task[], context: PriorityContext, limit = 3) {
  return tasks
    .filter((task) => {
      const daysLeft = getDaysLeft(task.dueDate, context.today);
      return (
        task.status !== "done" &&
        (daysLeft < 0 ||
          getAssigneeIds(task).length === 0 ||
          task.isBlocked ||
          task.isCritical ||
          task.isKeyTask)
      );
    })
    .map((task) => {
      const daysLeft = getDaysLeft(task.dueDate, context.today);
      const event = getEvent(task, context);
      const category =
        getAssigneeIds(task).length === 0
          ? "未指派"
          : daysLeft < 0
            ? "延遲"
            : task.isBlocked
              ? "卡關"
              : "未開始";
      return {
        id: `risk-${task.id}`,
        taskId: task.id,
        task,
        eventName: event?.name ?? "日常行政",
        category,
        reason: `${task.title}${category === "延遲" ? "已逾期" : category === "未指派" ? "尚未指派" : category === "卡關" ? "目前卡關" : "尚未完成"}`,
        suggestion:
          category === "未指派"
            ? "建議先指定負責人，再由負責人回報需求。"
            : category === "延遲"
              ? "建議今日追蹤進度，確認是否需要支援。"
              : category === "卡關"
                ? "建議主任先確認卡點，必要時拆成較小任務。"
                : "建議確認此關鍵任務是否已開始。",
        score: calculatePriorityScore(task, context),
        reasons: getPriorityReasons(task, context)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getTeacherLoadSuggestions(tasks: Task[], teachers: Teacher[], today = new Date()) {
  const rows = teachers
    .filter((teacher) => teacher.enabled !== false)
    .map((teacher) => {
      const active = tasks.filter(
        (task) => task.status !== "done" && getAssigneeIds(task).includes(teacher.id)
      );
      const dueSoon = active.filter((task) => {
        const days = getDaysLeft(task.dueDate, today);
        return days >= 0 && days <= 3;
      });
      const overdue = active.filter((task) => getDaysLeft(task.dueDate, today) < 0);
      return { teacher, taskCount: active.length, dueSoonCount: dueSoon.length, overdueCount: overdue.length };
    });

  const leastLoaded = [...rows].sort((a, b) => a.taskCount - b.taskCount)[0];

  return rows
    .map((row) => {
      let suggestion = "目前負荷可控，維持關心即可。";
      if (row.overdueCount > 0) {
        suggestion = `有逾期任務，建議主任確認是否需要協助。`;
      } else if (row.taskCount > 4) {
        suggestion = "任務較多，建議暫緩新增任務。";
      } else if (row.taskCount <= 1) {
        suggestion = "目前任務較少，可協助支援活動資料整理。";
      } else if (row.dueSoonCount >= 2) {
        suggestion = "多件任務即將到期，建議先確認是否需要支援。";
      }

      if (row.taskCount > 4 && leastLoaded && leastLoaded.teacher.id !== row.teacher.id) {
        suggestion = `任務較多，建議暫緩新增任務，必要時可請${leastLoaded.teacher.name}支援。`;
      }

      return { ...row, suggestion };
    })
    .sort((a, b) => {
      const aScore = a.overdueCount * 10 + a.dueSoonCount * 4 + a.taskCount;
      const bScore = b.overdueCount * 10 + b.dueSoonCount * 4 + b.taskCount;
      return bScore - aScore;
    });
}

export function getTopPriorities(tasks: Task[], limit = 5) {
  return getTodayFocusTasks(tasks, { tasks, teachers: [], events: [] }, limit);
}

export function getDecisionRiskItems(events: Event[], tasks: Task[], limit = 3) {
  return getRiskTasks(tasks, { tasks, teachers: [], events }, limit);
}

export function getTeacherFocusTasks(tasks: Task[], teacherId: string, limit = 2) {
  return getTodayFocusTasks(
    tasks.filter((task) => getAssigneeIds(task).includes(teacherId)),
    { tasks, teachers: [], events: [] },
    limit
  );
}

export function getEventRisks(event: Event, tasks: Task[]) {
  const eventTasks = tasks.filter((task) => task.eventId === event.id);
  const blocking = eventTasks.find((task) => (task.isCritical || task.isKeyTask) && task.status !== "done");
  const unassigned = eventTasks.find((task) => getAssigneeIds(task).length === 0);
  const delayed = eventTasks.find(
    (task) => getDaysLeft(task.dueDate) < 0 && task.status !== "done"
  );

  return {
    blocking: blocking ? `${blocking.title.replace(`${event.name} - `, "")}未完成` : "目前無明顯卡關",
    risk: unassigned
      ? `${unassigned.title.replace(`${event.name} - `, "")}尚未指派`
      : delayed
        ? `${delayed.title.replace(`${event.name} - `, "")}已延遲`
        : "風險可控"
  };
}

export function getWorkloadRows(teachers: Teacher[], tasks: Task[]) {
  return getTeacherLoadSuggestions(tasks, teachers).map((row) => ({
    teacher: row.teacher,
    owned: tasks.filter((task) => getAssigneeIds(task).includes(row.teacher.id)),
    active: tasks.filter((task) => task.status !== "done" && getAssigneeIds(task).includes(row.teacher.id)),
    soon: tasks.filter((task) => {
      const days = getDaysLeft(task.dueDate);
      return task.status !== "done" && getAssigneeIds(task).includes(row.teacher.id) && days >= 0 && days <= 3;
    }),
    overdue: tasks.filter(
      (task) => task.status !== "done" && getAssigneeIds(task).includes(row.teacher.id) && getDaysLeft(task.dueDate) < 0
    )
  }));
}

export function getWorkloadHighlights(teachers: Teacher[], tasks: Task[], limit = 3) {
  return getTeacherLoadSuggestions(tasks, teachers).slice(0, limit);
}

export function getWorkloadSuggestions(teachers: Teacher[], tasks: Task[]) {
  return getTeacherLoadSuggestions(tasks, teachers)
    .slice(0, 2)
    .map((row) => `${row.teacher.name}：${row.suggestion}`);
}

export function balanceTaskAssignments(tasks: Task[], teachers: Teacher[]) {
  const teacherIds = teachers.filter((teacher) => teacher.enabled !== false).map((teacher) => teacher.id);
  const activeCounts = new Map(
    teacherIds.map((id) => [
      id,
      tasks.filter((task) => task.status !== "done" && getAssigneeIds(task).includes(id)).length
    ])
  );

  return tasks.map((task) => {
    if (task.status === "done" || task.isCritical || task.isKeyTask) return task;

    const currentOwner = getAssigneeIds(task)[0];
    const leastLoaded = [...activeCounts.entries()].sort((a, b) => a[1] - b[1])[0];
    const currentCount = currentOwner ? activeCounts.get(currentOwner) ?? 0 : Number.POSITIVE_INFINITY;

    if (!leastLoaded) return task;

    const shouldMove = getAssigneeIds(task).length === 0 || currentCount - leastLoaded[1] >= 2;
    if (!shouldMove || currentOwner === leastLoaded[0]) return task;

    if (currentOwner) activeCounts.set(currentOwner, Math.max(0, currentCount - 1));
    activeCounts.set(leastLoaded[0], leastLoaded[1] + 1);

    return { ...task, assignees: [leastLoaded[0]], ownerIds: [leastLoaded[0]], updatedAt: getTodayString() };
  });
}

export function getStickyActionSummary(notes: StickyNote[]) {
  const openNotes = notes.filter((note) => !note.done);
  const dueNotes = openNotes.filter((note) => note.dueDate && getDaysLeft(note.dueDate) <= 3);
  return { open: openNotes.length, dueSoon: dueNotes.length };
}
