"use client";

import { useEffect, useMemo, useState } from "react";
import type { Event, StickyColor, StickyNote, Task, Teacher } from "@/lib/types";
import {
  getAssigneeIds,
  getStatusLabel,
  getTodayFocusTasks
} from "@/lib/decisionSupport";
import { buildReminders, getDaysLeft, isTaskClosed } from "@/lib/reminders";
import { ActionButton } from "./ActionBar";

type DashboardProps = {
  tasks: Task[];
  teachers: Teacher[];
  events: Event[];
  notes: StickyNote[];
  filter: string;
  actionMessage?: string;
  currentUserId: string;
  onFilterChange: (filter: string) => void;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  onPriorityChange: (taskId: string, priority: Task["priority"]) => void;
  onAssign: (taskId: string, ownerId: string) => void;
  onOpenTask: (taskId: string) => void;
  onRemind: (message: string) => void;
  onBalanceTasks: () => void;
  onDeferTask: (taskId: string) => void;
  onCreateNote: (input: {
    title?: string;
    body: string;
    assigneeId: string;
    dueDate: string;
    color: StickyColor;
    authorId?: string;
  }) => void;
};

const READ_STORAGE_KEY = "jiao-dao-task-map:read-activity:v1";
const ALL_STICKY_RECIPIENT_ID = "__all__";

type ActivityItem = {
  id: string;
  kind: "sticky" | "urgent" | "task-due" | "task-overdue" | "task-review" | "task-done";
  title: string;
  detail: string;
  time: string;
  targetId: string;
  targetType: "task" | "sticky";
};

function teacherName(id: string | undefined, teachers: Teacher[]) {
  if (id === ALL_STICKY_RECIPIENT_ID) return "全體教師";
  if (!id) return "主任";
  return teachers.find((teacher) => teacher.id === id)?.name ?? "尚未指派";
}

function taskOwners(task: Task, teachers: Teacher[]) {
  const names = teachers.filter((teacher) => getAssigneeIds(task).includes(teacher.id)).map((teacher) => teacher.name);
  return names.length ? names.join("、") : "尚未指派";
}

function stickyLabel(color: StickyColor) {
  const labels: Record<StickyColor, string> = {
    yellow: "提醒",
    blue: "想法",
    pink: "問題",
    green: "回報",
    red: "急件"
  };
  return labels[color];
}

function stickyClass(color: StickyColor) {
  const classes: Record<StickyColor, string> = {
    yellow: "border-yellow-200 bg-yellow-50",
    blue: "border-blue-200 bg-blue-50",
    pink: "border-pink-200 bg-pink-50",
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50"
  };
  return classes[color];
}

function useReadActivities() {
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(READ_STORAGE_KEY);
      if (raw) setReadIds(JSON.parse(raw));
    } catch {
      setReadIds([]);
    }
  }, []);

  function markRead(id: string) {
    setReadIds((current) => {
      const next = Array.from(new Set([...current, id]));
      window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return { readIds, markRead };
}

export function Dashboard({
  tasks,
  teachers,
  events,
  notes,
  filter,
  actionMessage,
  currentUserId,
  onFilterChange,
  onStatusChange,
  onPriorityChange,
  onAssign,
  onOpenTask,
  onRemind,
  onBalanceTasks,
  onDeferTask,
  onCreateNote
}: DashboardProps) {
  const [quickTitle, setQuickTitle] = useState("");
  const [quickBody, setQuickBody] = useState("");
  const [quickTarget, setQuickTarget] = useState(ALL_STICKY_RECIPIENT_ID);
  const [quickColor, setQuickColor] = useState<StickyColor>("yellow");
  const { readIds, markRead } = useReadActivities();
  const teacherOptions = teachers.filter((teacher) => teacher.enabled !== false);
  const priorityContext = { tasks, teachers, events };
  const todayFocus = getTodayFocusTasks(tasks, priorityContext, 3);
  const reminders = buildReminders(tasks).slice(0, 6);

  const activities = useMemo<ActivityItem[]>(() => {
    const noteActivities = notes.map((note) => ({
      id: `sticky-${note.id}-${note.updatedAt}`,
      kind: (note.color === "red" ? "urgent" : "sticky") as ActivityItem["kind"],
      title: note.color === "red" ? `急件便利貼：${note.title}` : `新增便利貼：${note.title}`,
      detail: `${teacherName(note.authorId, teachers)} 給 ${teacherName(note.assigneeId, teachers)}｜${stickyLabel(note.color)}`,
      time: note.updatedAt || note.createdAt,
      targetId: note.id,
      targetType: "sticky" as const
    }));

    const taskActivities = tasks.flatMap((task) => {
      const days = getDaysLeft(task.dueDate);
      const rows: ActivityItem[] = [];
      if (!isTaskClosed(task) && days < 0) {
        rows.push({
          id: `task-overdue-${task.id}-${task.updatedAt}`,
          kind: "task-overdue",
          title: `任務已逾期：${task.title}`,
          detail: `${taskOwners(task, teachers)}｜已逾期 ${Math.abs(days)} 天`,
          time: task.updatedAt,
          targetId: task.id,
          targetType: "task"
        });
      } else if (!isTaskClosed(task) && days <= 3) {
        rows.push({
          id: `task-due-${task.id}-${task.dueDate}`,
          kind: "task-due",
          title: `任務即將到期：${task.title}`,
          detail: `${taskOwners(task, teachers)}｜剩 ${Math.max(0, days)} 天`,
          time: task.updatedAt,
          targetId: task.id,
          targetType: "task"
        });
      }
      if (task.status === "review") {
        rows.push({
          id: `task-review-${task.id}-${task.updatedAt}`,
          kind: "task-review",
          title: `待主任確認：${task.title}`,
          detail: `${taskOwners(task, teachers)} 已送出確認`,
          time: task.updatedAt,
          targetId: task.id,
          targetType: "task"
        });
      }
      if (task.status === "done") {
        rows.push({
          id: `task-done-${task.id}-${task.updatedAt}`,
          kind: "task-done",
          title: `任務已完成：${task.title}`,
          detail: `${taskOwners(task, teachers)}｜已完成`,
          time: task.updatedAt,
          targetId: task.id,
          targetType: "task"
        });
      }
      return rows;
    });

    return [...noteActivities, ...taskActivities]
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 8);
  }, [notes, tasks, teachers]);

  const unreadCount = activities.filter((item) => !readIds.includes(item.id)).length;
  const activeNotes = notes
    .filter((note) => note.status !== "archived")
    .slice()
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
    .slice(0, 5);

  const summary = {
    dueSoon: tasks.filter((task) => {
      const days = getDaysLeft(task.dueDate);
      return !isTaskClosed(task) && days >= 0 && days <= 3;
    }).length,
    overdue: tasks.filter((task) => !isTaskClosed(task) && getDaysLeft(task.dueDate) < 0).length,
    review: tasks.filter((task) => task.status === "review").length,
    doing: tasks.filter((task) => task.status === "doing").length,
    done: tasks.filter((task) => task.status === "done").length
  };

  function openActivity(item: ActivityItem) {
    markRead(item.id);
    if (item.targetType === "task") {
      onOpenTask(item.targetId);
      return;
    }
    document.getElementById("sticky")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function submitQuickNote() {
    const title = quickTitle.trim();
    const body = quickBody.trim() || title;
    if (!body) return;
    onCreateNote({
      title: title || body.slice(0, 24),
      body,
      assigneeId: quickTarget,
      dueDate: "",
      color: quickColor,
      authorId: currentUserId
    });
    setQuickTitle("");
    setQuickBody("");
    setQuickTarget(ALL_STICKY_RECIPIENT_ID);
    setQuickColor("yellow");
  }

  return (
    <div className="space-y-6" id="dashboard">
      {actionMessage && (
        <div className="rounded-lg border border-forest-100 bg-forest-50 px-5 py-3 text-xl font-black text-forest-800 shadow-soft">
          {actionMessage}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.1fr_1fr_1fr]">
        <div className="rounded-lg border border-forest-100 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-black text-forest-700">今日行政動態</p>
              <h2 className="mt-1 text-4xl font-black text-ink">誰有訊息、什麼事要處理</h2>
            </div>
            <span className="rounded-md bg-amber-50 px-3 py-2 text-lg font-black text-amber-900">
              未讀 {unreadCount}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {activities.length ? (
              activities.map((item) => {
                const unread = !readIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    className={`w-full rounded-lg border p-4 text-left ${unread ? "border-amber-200 bg-amber-50" : "border-forest-100 bg-warm"}`}
                    type="button"
                    onClick={() => openActivity(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-black text-ink">{item.title}</p>
                        <p className="mt-1 text-base font-bold text-stone-700">{item.detail}</p>
                      </div>
                      {unread && <span className="rounded-md bg-forest-700 px-2 py-1 text-sm font-black text-white">新</span>}
                    </div>
                    <p className="mt-2 text-sm font-bold text-stone-500">{item.time}</p>
                  </button>
                );
              })
            ) : (
              <p className="rounded-lg bg-rice p-5 text-xl font-black text-forest-800">
                目前沒有新的行政動態。
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-forest-100 bg-white p-5 shadow-soft">
          <p className="text-xl font-black text-forest-700">任務推進狀態</p>
          <h2 className="mt-1 text-4xl font-black text-ink">先看進度，再做決定</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["即將到期", summary.dueSoon, "week", "bg-amber-50 text-amber-900"],
              ["已逾期", summary.overdue, "overdue", "bg-red-50 text-red-800"],
              ["待主任確認", summary.review, "review", "bg-purple-50 text-purple-800"],
              ["進行中", summary.doing, "doing", "bg-blue-50 text-blue-800"],
              ["已完成", summary.done, "done", "bg-forest-50 text-forest-800"]
            ].map(([label, value, nextFilter, className]) => (
              <button
                key={String(label)}
                className={`rounded-lg p-4 text-left ${className} ${filter === nextFilter ? "ring-4 ring-amber-200" : ""}`}
                type="button"
                onClick={() => onFilterChange(filter === nextFilter ? "all" : String(nextFilter))}
              >
                <p className="text-base font-black">{label}</p>
                <p className="mt-1 text-4xl font-black">{value}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-lg font-black text-forest-800">今日建議先看</p>
            {todayFocus.length ? (
              todayFocus.map(({ task, score, reasons }) => (
                <div key={task.id} className="rounded-lg border border-forest-100 bg-rice p-3">
                  <button className="text-left text-xl font-black text-ink" type="button" onClick={() => onOpenTask(task.id)}>
                    {task.title}
                  </button>
                  <p className="mt-1 text-base font-bold text-stone-700">
                    {taskOwners(task, teachers)}｜{getStatusLabel(task.status)}｜分數 {score}
                  </p>
                  <p className="mt-1 text-sm font-bold text-stone-600">原因：{reasons.slice(0, 2).join("、") || "依期限排序"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ActionButton tone="primary" onClick={() => onStatusChange(task.id, "doing")}>推進</ActionButton>
                    <ActionButton tone="quiet" onClick={() => onOpenTask(task.id)}>查看</ActionButton>
                    <ActionButton tone="warm" onClick={() => onPriorityChange(task.id, "high")}>標優先</ActionButton>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-rice p-4 text-lg font-black text-forest-800">
                目前沒有需要優先處理的任務。
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-forest-100 bg-white p-5 shadow-soft">
          <p className="text-xl font-black text-forest-700">交流便利貼</p>
          <h2 className="mt-1 text-4xl font-black text-ink">行政訊息先記下來</h2>

          <div className="mt-5 grid gap-3 rounded-lg border border-forest-100 bg-warm p-4">
            <input className="rounded-md border border-forest-100 bg-white px-3 py-2 text-lg font-bold" value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="便利貼標題" />
            <textarea className="min-h-20 rounded-md border border-forest-100 bg-white px-3 py-2 text-lg font-bold" value={quickBody} onChange={(event) => setQuickBody(event.target.value)} placeholder="內容，例如：請各班協助回報名單" />
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="rounded-md border border-forest-100 bg-white px-3 py-2 font-black" value={quickTarget} onChange={(event) => setQuickTarget(event.target.value)}>
                <option value={ALL_STICKY_RECIPIENT_ID}>給全體教師</option>
                <option value="">給主任</option>
                {teacherOptions.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>給{teacher.name}</option>
                ))}
              </select>
              <select className="rounded-md border border-forest-100 bg-white px-3 py-2 font-black" value={quickColor} onChange={(event) => setQuickColor(event.target.value as StickyColor)}>
                <option value="yellow">提醒</option>
                <option value="blue">想法</option>
                <option value="pink">問題</option>
                <option value="green">回報</option>
                <option value="red">急件</option>
              </select>
            </div>
            <ActionButton tone="primary" onClick={submitQuickNote}>新增便利貼</ActionButton>
          </div>

          <div className="mt-5 space-y-3">
            {activeNotes.length ? (
              activeNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left ${stickyClass(note.color)}`}
                  onClick={() => document.getElementById("sticky")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-lg font-black text-ink">{note.title}</p>
                    <span className="rounded-md bg-white px-2 py-1 text-sm font-black">{stickyLabel(note.color)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-base font-bold text-stone-700">{note.body}</p>
                </button>
              ))
            ) : (
              <p className="rounded-lg bg-rice p-4 text-lg font-black text-forest-800">目前沒有便利貼。</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-lg font-bold text-forest-700">提醒摘要</p>
            <h2 className="text-3xl font-black text-ink">近期要注意的任務</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton tone="quiet" onClick={onBalanceTasks}>檢視分工</ActionButton>
            <ActionButton tone="primary" onClick={() => document.getElementById("kanban")?.scrollIntoView({ behavior: "smooth" })}>前往任務看板</ActionButton>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {reminders.length ? (
            reminders.map((reminder) => (
              <div key={reminder.id} className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                <p className="text-lg font-black text-amber-900">{reminder.message}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ActionButton tone="primary" onClick={() => onOpenTask(reminder.taskId)}>立即處理</ActionButton>
                  <ActionButton tone="quiet" onClick={() => onDeferTask(reminder.taskId)}>延後</ActionButton>
                  <ActionButton tone="quiet" onClick={() => onRemind(reminder.message)}>催辦</ActionButton>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-lg bg-rice p-4 text-lg font-black text-forest-800 lg:col-span-2">
              目前沒有提醒。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
