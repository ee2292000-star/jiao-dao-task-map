"use client";

import { useMemo, useState } from "react";
import type { Event, StickyColor, StickyNote, Task, Teacher } from "@/lib/types";
import { getAssigneeIds, getPriorityLabel, getStatusLabel, getTodayFocusTasks } from "@/lib/decisionSupport";
import { getDaysLeft, isTaskClosed } from "@/lib/reminders";

type AdminTaskMapProps = {
  tasks: Task[];
  teachers: Teacher[];
  events: Event[];
  notes: StickyNote[];
  actionMessage?: string;
  currentUserId: string;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  onPriorityChange: (taskId: string, priority: Task["priority"]) => void;
  onOpenTask: (taskId: string) => void;
  onNavigate?: (section: string) => void;
  onCreateNote: (input: {
    title?: string;
    body: string;
    assigneeId: string;
    dueDate: string;
    color: StickyColor;
    authorId?: string;
  }) => void;
};

type TeacherMode = "doing" | "today" | "overdue" | "week" | "done";

const allRecipientId = "__all__";

const text = {
  title: "\u5168\u6821\u4efb\u52d9\u5730\u5716",
  kicker: "\u5de5\u4f5c\u6982\u6cc1\u3001\u5354\u4f5c\u63d0\u9192\u3001\u4efb\u52d9\u63a8\u9032",
  overview: "\u5168\u6821\u4efb\u52d9\u7e3d\u89bd",
  teachers: "\u6559\u5e2b\u5de5\u4f5c\u6982\u6cc1",
  action: "\u4eca\u65e5\u5efa\u8b70\u5148\u770b",
  sticky: "\u4ea4\u6d41\u4fbf\u5229\u8cbc",
  allTasks: "\u5168\u90e8\u4efb\u52d9",
  doing: "\u9032\u884c\u4e2d",
  todayDue: "\u4eca\u65e5\u5230\u671f",
  overdue: "\u903e\u671f",
  done: "\u5df2\u5b8c\u6210",
  weekDoneRate: "\u672c\u9031\u5b8c\u6210\u7387",
  workTemp: "\u5de5\u4f5c\u6eab\u5ea6",
  stable: "\u7a69\u5b9a",
  busy: "\u5fd9\u788c",
  high: "\u8ca0\u8377\u504f\u9ad8",
  support: "\u9700\u8981\u652f\u63f4",
  noTeachers: "\u5c1a\u672a\u5efa\u7acb\u6559\u5e2b\u8cc7\u6599\u3002",
  noTasks: "\u76ee\u524d\u6c92\u6709\u4efb\u52d9\u3002",
  noFocus: "\u76ee\u524d\u6c92\u6709\u9700\u8981\u512a\u5148\u8655\u7406\u7684\u4efb\u52d9\u3002",
  open: "\u67e5\u770b",
  promote: "\u63a8\u9032",
  highPriority: "\u6a19\u512a\u5148",
  close: "\u95dc\u9589",
  drawerTitle: "\u6559\u5e2b\u4efb\u52d9\u5074\u908a\u6e05\u55ae",
  dueDate: "\u5230\u671f",
  status: "\u72c0\u614b",
  priority: "\u512a\u5148",
  progressNote: "\u9032\u5ea6\u56de\u5831",
  noProgress: "\u5c1a\u672a\u56de\u5831",
  createSticky: "\u65b0\u589e\u4fbf\u5229\u8cbc",
  stickyTitle: "\u4fbf\u5229\u8cbc\u6a19\u984c",
  stickyBody: "\u7c21\u77ed\u5167\u5bb9",
  sendAll: "\u7d66\u5168\u9ad4\u6559\u5e2b",
  sendDirector: "\u7d66\u4e3b\u4efb",
  send: "\u9001\u51fa",
  secondary: "\u6b21\u8981\u529f\u80fd",
  kanban: "\u4efb\u52d9\u770b\u677f",
  workload: "\u4eba\u54e1\u5206\u5de5",
  timeline: "\u6d3b\u52d5\u6642\u9593\u8ef8",
  stickyWall: "\u4ea4\u6d41\u4fbf\u5229\u8cbc"
};

function activeTeacherIds(task: Task) {
  return new Set([...getAssigneeIds(task), task.assignedTo].filter(Boolean) as string[]);
}

function taskAssignedTo(task: Task, teacherId: string) {
  return activeTeacherIds(task).has(teacherId);
}

function isDueToday(task: Task) {
  return !isTaskClosed(task) && getDaysLeft(task.dueDate) === 0;
}

function isOverdue(task: Task) {
  return !isTaskClosed(task) && getDaysLeft(task.dueDate) < 0;
}

function isDueThisWeek(task: Task) {
  const days = getDaysLeft(task.dueDate);
  return !isTaskClosed(task) && days >= 0 && days <= 7;
}

function tempFor(doing: number, today: number, overdue: number) {
  if (doing >= 7 || overdue >= 1) return { label: text.high, className: "bg-red-50 text-red-800" };
  if (doing >= 4 || today >= 2) return { label: text.busy, className: "bg-amber-50 text-amber-900" };
  return { label: text.stable, className: "bg-forest-50 text-forest-800" };
}

function modeTitle(mode: TeacherMode) {
  if (mode === "doing") return text.doing;
  if (mode === "today") return text.todayDue;
  if (mode === "overdue") return text.overdue;
  if (mode === "week") return "\u672c\u9031\u5230\u671f";
  return text.done;
}

function taskRowClass(task: Task) {
  if (isOverdue(task)) return "border-red-200 bg-red-50";
  if (isDueToday(task)) return "border-amber-200 bg-amber-50";
  if (task.needsSupport) return "border-yellow-200 bg-yellow-50";
  return "border-forest-100 bg-white";
}

export function AdminTaskMap({
  tasks,
  teachers,
  events,
  notes,
  actionMessage,
  currentUserId,
  onStatusChange,
  onPriorityChange,
  onOpenTask,
  onNavigate,
  onCreateNote
}: AdminTaskMapProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [teacherMode, setTeacherMode] = useState<TeacherMode>("doing");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickBody, setQuickBody] = useState("");
  const [quickTarget, setQuickTarget] = useState(allRecipientId);

  const activeTeachers = teachers.filter((teacher) => teacher.enabled !== false);
  const summary = {
    all: tasks.filter((task) => task.status !== "archived").length,
    doing: tasks.filter((task) => task.status === "doing").length,
    today: tasks.filter(isDueToday).length,
    overdue: tasks.filter(isOverdue).length,
    done: tasks.filter((task) => task.status === "done").length
  };
  const focusTasks = getTodayFocusTasks(tasks, { tasks, teachers, events }, 4);
  const latestNotes = notes
    .filter((note) => note.status !== "archived")
    .slice()
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
    .slice(0, 4);
  const selectedTeacher = activeTeachers.find((teacher) => teacher.id === selectedTeacherId);
  const selectedTeacherTasks = useMemo(() => {
    if (!selectedTeacher) return [];
    const teacherTasks = tasks.filter((task) => taskAssignedTo(task, selectedTeacher.id) && task.status !== "archived");
    if (teacherMode === "doing") return teacherTasks.filter((task) => task.status === "doing");
    if (teacherMode === "today") return teacherTasks.filter(isDueToday);
    if (teacherMode === "overdue") return teacherTasks.filter(isOverdue);
    if (teacherMode === "week") return teacherTasks.filter(isDueThisWeek);
    return teacherTasks.filter((task) => task.status === "done" || task.status === "review");
  }, [selectedTeacher, teacherMode, tasks]);

  function teacherStats(teacher: Teacher) {
    const teacherTasks = tasks.filter((task) => taskAssignedTo(task, teacher.id) && task.status !== "archived");
    const doing = teacherTasks.filter((task) => task.status === "doing").length;
    const today = teacherTasks.filter(isDueToday).length;
    const overdue = teacherTasks.filter(isOverdue).length;
    const weekTasks = teacherTasks.filter((task) => task.status === "done" || isDueThisWeek(task));
    const done = weekTasks.filter((task) => task.status === "done").length;
    const rate = weekTasks.length ? Math.round((done / weekTasks.length) * 100) : 0;
    const support = teacherTasks.some((task) => task.needsSupport);
    return { doing, today, overdue, rate, support, temp: tempFor(doing, today, overdue) };
  }

  function openTeacher(teacherId: string, mode: TeacherMode) {
    setSelectedTeacherId(teacherId);
    setTeacherMode(mode);
  }

  function submitSticky() {
    const title = quickTitle.trim();
    const body = quickBody.trim() || title;
    if (!body) return;
    onCreateNote({
      title: title || body.slice(0, 24),
      body,
      assigneeId: quickTarget,
      dueDate: "",
      color: "yellow",
      authorId: currentUserId
    });
    setQuickTitle("");
    setQuickBody("");
    setQuickTarget(allRecipientId);
  }

  return (
    <div className="space-y-6" id="dashboard">
      {actionMessage && (
        <div className="rounded-lg border border-forest-100 bg-forest-50 px-5 py-3 text-xl font-black text-forest-800 shadow-soft">
          {actionMessage}
        </div>
      )}

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <p className="text-xl font-bold text-forest-700">{text.kicker}</p>
        <h2 className="mt-2 text-5xl font-black leading-tight text-ink">{text.title}</h2>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-lg bg-white p-5 shadow-soft">
          <h3 className="text-4xl font-black text-ink">{text.overview}</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              [text.allTasks, summary.all, "bg-rice text-ink"],
              [text.doing, summary.doing, "bg-blue-50 text-blue-900"],
              [text.todayDue, summary.today, "bg-amber-50 text-amber-900"],
              [text.overdue, summary.overdue, "bg-red-50 text-red-800"],
              [text.done, summary.done, "bg-forest-50 text-forest-800"]
            ].map(([label, value, className]) => (
              <div key={label} className={`rounded-lg p-4 ${className}`}>
                <p className="text-base font-black">{label}</p>
                <p className="mt-1 text-4xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-soft">
          <h3 className="text-4xl font-black text-ink">{text.action}</h3>
          <div className="mt-4 grid gap-3">
            {focusTasks.length ? focusTasks.map(({ task, score, reasons }) => (
              <article key={task.id} className={`rounded-lg border p-4 ${taskRowClass(task)}`}>
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                  <div>
                    <h4 className="text-2xl font-black leading-snug text-ink">{task.title}</h4>
                    <p className="mt-1 text-base font-bold text-stone-700">
                      {getStatusLabel(task.status)} / {text.priority}: {getPriorityLabel(task.priority)} / {text.dueDate}: {task.dueDate}
                    </p>
                    <p className="mt-1 text-sm font-bold text-stone-600">{reasons.slice(0, 2).join(" | ")} / {score}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-md bg-forest-700 px-3 py-2 text-base font-black text-white" type="button" onClick={() => onStatusChange(task.id, "doing")}>{text.promote}</button>
                    <button className="rounded-md bg-white px-3 py-2 text-base font-black text-ink" type="button" onClick={() => onOpenTask(task.id)}>{text.open}</button>
                    <button className="rounded-md bg-amber-100 px-3 py-2 text-base font-black text-amber-900" type="button" onClick={() => onPriorityChange(task.id, "high")}>{text.highPriority}</button>
                  </div>
                </div>
              </article>
            )) : <p className="rounded-lg bg-rice p-5 text-xl font-black text-forest-800">{text.noFocus}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <h3 className="text-4xl font-black text-ink">{text.teachers}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeTeachers.length ? activeTeachers.map((teacher) => {
            const stats = teacherStats(teacher);
            return (
              <article key={teacher.id} className="rounded-lg border border-forest-100 bg-warm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-2xl font-black text-ink">{teacher.name}</h4>
                    <p className="mt-1 text-base font-bold text-stone-600">{teacher.teachingScope || "\u672a\u8a2d\u5b9a\u8ca0\u8cac\u9818\u57df"}</p>
                  </div>
                  <span className={`rounded-md px-3 py-2 text-base font-black ${stats.temp.className}`}>{stats.temp.label}</span>
                </div>
                {stats.support && <p className="mt-3 rounded-md bg-yellow-100 px-3 py-2 text-base font-black text-yellow-900">{text.support}</p>}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button className="rounded-md bg-blue-50 p-3 text-left" type="button" onClick={() => openTeacher(teacher.id, "doing")}>
                    <p className="text-sm font-black text-blue-800">{text.doing}</p>
                    <p className="text-3xl font-black text-blue-900">{stats.doing}</p>
                  </button>
                  <button className="rounded-md bg-amber-50 p-3 text-left" type="button" onClick={() => openTeacher(teacher.id, "today")}>
                    <p className="text-sm font-black text-amber-800">{text.todayDue}</p>
                    <p className="text-3xl font-black text-amber-900">{stats.today}</p>
                  </button>
                  <button className="rounded-md bg-red-50 p-3 text-left" type="button" onClick={() => openTeacher(teacher.id, "overdue")}>
                    <p className="text-sm font-black text-red-800">{text.overdue}</p>
                    <p className="text-3xl font-black text-red-900">{stats.overdue}</p>
                  </button>
                </div>
                <button className="mt-3 w-full rounded-md bg-white px-3 py-2 text-left text-base font-black text-forest-800" type="button" onClick={() => openTeacher(teacher.id, "done")}>
                  {text.weekDoneRate}: {stats.rate}%
                </button>
              </article>
            );
          }) : <p className="rounded-lg bg-rice p-5 text-xl font-black text-forest-800 md:col-span-2 xl:col-span-3">{text.noTeachers}</p>}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
        <div className="rounded-lg bg-white p-5 shadow-soft">
          <h3 className="text-4xl font-black text-ink">{text.sticky}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {latestNotes.length ? latestNotes.map((note) => (
              <article key={note.id} className="rounded-lg border border-forest-100 bg-rice p-4">
                <h4 className="text-xl font-black text-ink">{note.title}</h4>
                <p className="mt-2 line-clamp-2 text-base font-bold text-stone-700">{note.body}</p>
              </article>
            )) : <p className="rounded-lg bg-rice p-5 text-xl font-black text-forest-800 md:col-span-2">{text.noTasks}</p>}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-soft">
          <h3 className="text-3xl font-black text-ink">{text.createSticky}</h3>
          <div className="mt-4 grid gap-3">
            <input className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold" value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder={text.stickyTitle} />
            <textarea className="min-h-24 rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-bold" value={quickBody} onChange={(event) => setQuickBody(event.target.value)} placeholder={text.stickyBody} />
            <select className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" value={quickTarget} onChange={(event) => setQuickTarget(event.target.value)}>
              <option value={allRecipientId}>{text.sendAll}</option>
              <option value="">{text.sendDirector}</option>
              {activeTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
            <button className="rounded-md bg-forest-700 px-4 py-3 text-lg font-black text-white" type="button" onClick={submitSticky}>{text.send}</button>
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <p className="text-lg font-bold text-forest-700">{text.secondary}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [text.kanban, "kanban"],
            [text.workload, "workload"],
            [text.timeline, "timeline"],
            [text.stickyWall, "sticky"]
          ].map(([label, section]) => (
            <button key={section} className="rounded-lg border border-forest-100 bg-warm px-4 py-4 text-left text-xl font-black text-forest-800" type="button" onClick={() => onNavigate?.(section)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {selectedTeacher && (
        <aside className="fixed inset-y-0 right-0 z-40 w-full overflow-y-auto border-l border-forest-100 bg-white p-5 shadow-2xl md:max-w-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-forest-700">{text.drawerTitle}</p>
              <h3 className="mt-1 text-3xl font-black text-ink">{selectedTeacher.name} / {modeTitle(teacherMode)}</h3>
            </div>
            <button className="rounded-md bg-rice px-3 py-2 text-base font-black" type="button" onClick={() => setSelectedTeacherId("")}>{text.close}</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["doing", "today", "overdue", "week", "done"] as TeacherMode[]).map((mode) => (
              <button key={mode} className={`rounded-md px-3 py-2 text-base font-black ${teacherMode === mode ? "bg-forest-700 text-white" : "bg-rice text-ink"}`} type="button" onClick={() => setTeacherMode(mode)}>
                {modeTitle(mode)}
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {selectedTeacherTasks.length ? selectedTeacherTasks.map((task) => (
              <article key={task.id} className={`rounded-lg border p-4 ${taskRowClass(task)}`}>
                <button className="text-left text-2xl font-black leading-snug text-ink" type="button" onClick={() => onOpenTask(task.id)}>
                  {task.title}
                </button>
                <div className="mt-2 grid gap-1 text-base font-bold text-stone-700">
                  <p>{text.dueDate}: {task.dueDate}</p>
                  <p>{text.status}: {getStatusLabel(task.status)}</p>
                  <p>{text.priority}: {getPriorityLabel(task.priority)}</p>
                  <p>{text.progressNote}: {task.teacherProgressNote || text.noProgress}</p>
                </div>
                {task.needsSupport && <p className="mt-2 rounded-md bg-yellow-100 px-3 py-2 text-base font-black text-yellow-900">{text.support}</p>}
              </article>
            )) : <p className="rounded-lg bg-rice p-5 text-xl font-black text-forest-800">{text.noTasks}</p>}
          </div>
        </aside>
      )}
    </div>
  );
}
