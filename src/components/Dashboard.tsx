"use client";

import { useState } from "react";
import type { Event, StickyNote, Task, Teacher } from "@/lib/types";
import {
  getEventProgress,
  getEventRisks,
  getStatusLabel,
  getStickyActionSummary,
  getRiskTasks,
  getTeacherLoadSuggestions,
  getTodayFocusTasks
} from "@/lib/decisionSupport";
import { buildReminders, getDaysLeft } from "@/lib/reminders";
import { ActionBar, ActionButton } from "./ActionBar";

type DashboardProps = {
  tasks: Task[];
  teachers: Teacher[];
  events: Event[];
  notes: StickyNote[];
  filter: string;
  actionMessage?: string;
  onFilterChange: (filter: string) => void;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  onPriorityChange: (taskId: string, priority: Task["priority"]) => void;
  onAssign: (taskId: string, ownerId: string) => void;
  onOpenTask: (taskId: string) => void;
  onRemind: (message: string) => void;
  onBalanceTasks: () => void;
  onDeferTask: (taskId: string) => void;
};

function ownerNames(task: Task, teachers: Teacher[]) {
  const names = teachers
    .filter((teacher) => task.ownerIds.includes(teacher.id))
    .map((teacher) => teacher.name);
  return names.length ? names.join("、") : "尚未指派";
}

function dayText(daysLeft: number) {
  return daysLeft < 0 ? `已逾期 ${Math.abs(daysLeft)} 天` : `剩 ${daysLeft} 天`;
}

export function Dashboard({
  tasks,
  teachers,
  events,
  notes,
  filter,
  actionMessage,
  onFilterChange,
  onStatusChange,
  onPriorityChange,
  onAssign,
  onOpenTask,
  onRemind,
  onBalanceTasks,
  onDeferTask
}: DashboardProps) {
  const [editingTaskId, setEditingTaskId] = useState("");
  const [ignoredReminderIds, setIgnoredReminderIds] = useState<string[]>([]);
  const dueThisWeek = tasks.filter((task) => {
    const days = getDaysLeft(task.dueDate);
    return days >= 0 && days <= 7 && task.status !== "done";
  });
  const done = tasks.filter((task) => task.status === "done");
  const doing = tasks.filter((task) => task.status === "doing");
  const overdue = tasks.filter((task) => getDaysLeft(task.dueDate) < 0 && task.status !== "done");
  const priorityContext = { tasks, teachers, events };
  const topPriorities = getTodayFocusTasks(tasks, priorityContext, 3);
  const riskItems = getRiskTasks(tasks, priorityContext, 3);
  const workloadHighlights = getTeacherLoadSuggestions(tasks, teachers).slice(0, 3);
  const reminders = buildReminders(tasks)
    .filter((reminder) => reminder.type !== "assigned" && !ignoredReminderIds.includes(reminder.id))
    .slice(0, 4);
  const stickySummary = getStickyActionSummary(notes);
  const unassigned = tasks.filter((task) => task.ownerIds.length === 0 && task.status !== "done");
  const unrepliedComments = tasks.filter((task) => task.comments.length > 0 && task.status !== "done");
  const teacherOptions = teachers.filter((teacher) => teacher.role !== "主任");

  const overviewCards = [
    { id: "week", label: "本週到期", value: dueThisWeek.length, className: "bg-white text-ink" },
    { id: "done", label: "已完成", value: done.length, className: "bg-forest-700 text-white" },
    { id: "doing", label: "進行中", value: doing.length, className: "bg-white text-ink" },
    { id: "overdue", label: "逾期", value: overdue.length, className: "bg-red-700 text-white" }
  ];

  return (
    <div className="space-y-6" id="dashboard">
      {actionMessage && (
        <div className="rounded-lg border border-forest-100 bg-forest-50 px-5 py-3 text-xl font-black text-forest-800 shadow-soft">
          {actionMessage}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.25fr_1fr_1fr]">
        <div className="rounded-lg border border-amber-200 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-black text-amber-800">今日重點</p>
              <h2 className="mt-1 text-4xl font-black text-ink">不用想，照順序處理</h2>
            </div>
            <span className="rounded-md bg-amber-50 px-3 py-2 text-base font-black text-amber-900">
              3 件
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {topPriorities.map(({ task, daysLeft, score, reasons }, index) => (
              <div
                key={task.id}
                className={`group rounded-lg border p-4 ${
                  daysLeft < 0 ? "border-red-200 bg-red-50" : "border-amber-100 bg-amber-50"
                }`}
              >
                <div className="grid gap-3 2xl:grid-cols-[42px_1fr_280px] 2xl:items-center">
                  <span className="grid size-10 place-items-center rounded-md bg-white text-xl font-black">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <button
                      className="text-left text-2xl font-black leading-snug text-ink"
                      onClick={() => onOpenTask(task.id)}
                    >
                      {task.title}
                    </button>
                    <p className="mt-2 text-lg font-bold text-stone-700">
                      {ownerNames(task, teachers)}｜{getStatusLabel(task.status)}｜
                      <span className={daysLeft < 0 ? "text-red-700" : "text-amber-800"}>
                        {dayText(daysLeft)}
                      </span>
                    </p>
                    <p className="mt-1 text-base font-bold text-stone-600">
                      排序原因：{reasons.slice(0, 2).join("、") || "依規則排序"}
                      <span className="ml-2 text-sm text-stone-500">分數 {score}</span>
                    </p>
                  </div>
                  <ActionBar subtle>
                    <ActionButton tone="primary" onClick={() => setEditingTaskId(editingTaskId === task.id ? "" : task.id)}>
                      處理
                    </ActionButton>
                    <ActionButton tone="quiet" onClick={() => onStatusChange(task.id, "done")}>
                      完成
                    </ActionButton>
                    <select
                      className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black"
                      value={task.ownerIds[0] ?? ""}
                      onChange={(event) => onAssign(task.id, event.target.value)}
                      aria-label="改派"
                    >
                      <option value="">改派</option>
                      {teacherOptions.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                    <ActionButton tone="warm" onClick={() => onRemind(`已催辦：${task.title}`)}>
                      催辦
                    </ActionButton>
                  </ActionBar>
                </div>
                {editingTaskId === task.id && (
                  <div className="mt-3 grid gap-2 rounded-md border border-forest-100 bg-white p-3 md:grid-cols-3">
                    <select
                      className="rounded-md border border-forest-100 bg-warm px-3 py-2 font-bold"
                      value={task.status}
                      onChange={(event) => onStatusChange(task.id, event.target.value as Task["status"])}
                    >
                      <option value="todo">待辦</option>
                      <option value="doing">進行中</option>
                      <option value="done">完成</option>
                    </select>
                    <select
                      className="rounded-md border border-forest-100 bg-warm px-3 py-2 font-bold"
                      value={task.priority}
                      onChange={(event) => onPriorityChange(task.id, event.target.value as Task["priority"])}
                    >
                      <option value="high">高優先</option>
                      <option value="normal">一般</option>
                      <option value="low">低</option>
                    </select>
                    <ActionButton tone="primary" onClick={() => onStatusChange(task.id, "doing")}>
                      設為處理中
                    </ActionButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-orange-100 bg-white p-5 shadow-soft">
          <p className="text-xl font-black text-red-700">風險與卡關</p>
          <h2 className="mt-1 text-4xl font-black text-ink">直接做決策</h2>
          <div className="mt-5 space-y-3">
            {riskItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-orange-100 bg-orange-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xl font-black text-ink">{item.reason}</p>
                    <p className="mt-1 text-base font-bold text-stone-700">
                      {item.eventName}｜{item.category}｜分數 {item.score}
                    </p>
                  </div>
                  <span className="rounded-md bg-white px-2 py-1 text-sm font-black text-red-700">
                    {item.category}
                  </span>
                </div>
                <p className="mt-2 text-base font-bold leading-relaxed text-stone-700">
                  {item.suggestion} 原因：{item.reasons.slice(0, 2).join("、")}
                </p>
                <ActionBar subtle>
                  {item.taskId && (
                    <>
                      <select
                        className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black"
                        defaultValue=""
                        onChange={(event) => item.taskId && onAssign(item.taskId, event.target.value)}
                        aria-label="立即指派"
                      >
                        <option value="">立即指派</option>
                        {teacherOptions.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                      </select>
                      <ActionButton tone="warm" onClick={() => onPriorityChange(item.taskId!, "high")}>
                        設為優先
                      </ActionButton>
                      <ActionButton tone="quiet" onClick={() => onOpenTask(item.taskId!)}>
                        查看任務
                      </ActionButton>
                    </>
                  )}
                  <ActionButton
                    tone="primary"
                    onClick={() =>
                      item.taskId
                        ? onRemind(`已建立快速補救：${item.reason}，今日追蹤`)
                        : onFilterChange("week")
                    }
                  >
                    快速補救
                  </ActionButton>
                </ActionBar>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-forest-100 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-black text-forest-700">分工與負荷</p>
              <h2 className="mt-1 text-4xl font-black text-ink">立刻調整</h2>
            </div>
            <ActionButton tone="primary" onClick={onBalanceTasks}>一鍵平均分配</ActionButton>
          </div>
          <div className="mt-5 space-y-3">
            {workloadHighlights.map((item) => (
              <div key={item.teacher.id} className="rounded-lg border border-forest-100 bg-rice p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-2xl font-black">{item.teacher.name}</p>
                  <p className="text-base font-bold text-stone-600">{item.teacher.role}</p>
                </div>
                <p className="mt-2 text-lg font-black text-forest-800">
                  任務 {item.taskCount} 件、即將到期 {item.dueSoonCount} 件、逾期 {item.overdueCount} 件
                </p>
                <p className="mt-1 text-base font-bold leading-relaxed text-stone-700">
                  {item.suggestion}
                </p>
                <ActionBar subtle>
                  <ActionButton tone="quiet" onClick={() => onFilterChange(`teacher:${item.teacher.id}`)}>
                    查看任務
                  </ActionButton>
                  <ActionButton tone="warm" onClick={() => onFilterChange("unassigned")}>
                    分配任務
                  </ActionButton>
                  <select
                    className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black"
                    defaultValue=""
                    onChange={(event) => {
                      const task = tasks.find(
                        (candidate) =>
                          candidate.status !== "done" &&
                          candidate.ownerIds.includes(item.teacher.id) &&
                          !candidate.isKeyTask
                      );
                      if (task) onAssign(task.id, event.target.value);
                    }}
                    aria-label="重新分配"
                  >
                    <option value="">重新分配</option>
                    {teacherOptions
                      .filter((teacher) => teacher.id !== item.teacher.id)
                      .map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          給 {teacher.name}
                        </option>
                      ))}
                  </select>
                </ActionBar>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-lg font-bold text-forest-700">輔助資訊，也能直接操作</p>
            <h2 className="text-3xl font-black text-ink">任務數據與提醒摘要</h2>
          </div>
          <p className="text-base font-bold text-stone-600">點擊數據卡可篩選下方任務看板</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {overviewCards.map((card) => (
            <button
              key={card.id}
              className={`rounded-lg p-4 text-left shadow-soft ${card.className} ${
                filter === card.id ? "ring-4 ring-amber-300" : ""
              }`}
              onClick={() => onFilterChange(filter === card.id ? "all" : card.id)}
            >
              <p className="text-lg font-bold opacity-80">{card.label}</p>
              <p className="mt-2 text-4xl font-black">{card.value}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <button className="rounded-lg bg-rice p-4 text-left text-lg font-black" onClick={() => onFilterChange("unassigned")}>
            未指派任務：{unassigned.length}
          </button>
          <button className="rounded-lg bg-rice p-4 text-left text-lg font-black" onClick={() => onFilterChange("comments")}>
            未回覆留言：{unrepliedComments.length}
          </button>
          <p className="rounded-lg bg-rice p-4 text-lg font-black">
            便利貼待辦：{stickySummary.open}，快到期 {stickySummary.dueSoon}
          </p>
          <ActionButton tone="primary" onClick={() => reminders[0] && onOpenTask(reminders[0].taskId)}>
            處理第一則提醒
          </ActionButton>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="rounded-lg border border-amber-100 bg-amber-50 p-3">
              <p className="text-lg font-black text-amber-900">{reminder.message}</p>
              <ActionBar subtle>
                <ActionButton tone="primary" onClick={() => onOpenTask(reminder.taskId)}>
                  立即處理
                </ActionButton>
                <ActionButton tone="quiet" onClick={() => onDeferTask(reminder.taskId)}>
                  延後
                </ActionButton>
                <ActionButton tone="quiet" onClick={() => setIgnoredReminderIds((ids) => [...ids, reminder.id])}>
                  忽略
                </ActionButton>
              </ActionBar>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <div>
          <p className="text-lg font-bold text-forest-700">活動進度也能操作</p>
          <h2 className="text-3xl font-black text-ink">大型活動進度</h2>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {events.map((event) => {
            const percent = getEventProgress(event, tasks);
            const risks = getEventRisks(event, tasks);
            const eventTasks = tasks.filter((task) => task.eventId === event.id);
            const firstUnassigned = eventTasks.find((task) => task.ownerIds.length === 0 && task.status !== "done");
            return (
              <div key={event.id} className="rounded-lg border border-forest-100 bg-warm p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl font-black">{event.name}</span>
                  <span className="text-2xl font-black text-forest-700">{percent}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-md bg-forest-50">
                  <div className="h-full bg-forest-500" style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-3 text-base font-bold text-amber-800">卡關：{risks.blocking}</p>
                <p className="mt-1 text-base font-bold text-red-800">風險：{risks.risk}</p>
                <ActionBar subtle>
                  <ActionButton tone="quiet" onClick={() => onFilterChange(`event:${event.id}`)}>
                    查看任務
                  </ActionButton>
                  <ActionButton
                    tone="warm"
                    onClick={() => firstUnassigned && onAssign(firstUnassigned.id, teacherOptions[0]?.id ?? "")}
                    disabled={!firstUnassigned}
                  >
                    補齊未指派
                  </ActionButton>
                  <ActionButton tone="primary" onClick={() => onRemind(`已提醒${event.name}全部負責人`)}>
                    提醒全部
                  </ActionButton>
                </ActionBar>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
