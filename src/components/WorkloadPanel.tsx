"use client";

import { useState } from "react";
import type { Task, Teacher } from "@/lib/types";
import { getAssigneeIds, getStatusLabel } from "@/lib/decisionSupport";
import { getDaysLeft, isTaskClosed } from "@/lib/reminders";

type WorkloadPanelProps = {
  teachers: Teacher[];
  tasks: Task[];
};

type ListMode = "all" | "doing" | "soon";

const text = {
  sectionKicker: "\u884c\u653f\u5de5\u4f5c\u6e05\u55ae",
  sectionTitle: "\u4eba\u54e1\u5206\u5de5",
  hint: "\u9ede\u6559\u5e2b\u59d3\u540d\u770b\u5168\u90e8\u4efb\u52d9\uff1b\u9ede\u6578\u5b57\u5361\uff0c\u53ea\u770b\u8a72\u985e\u4efb\u52d9\u3002",
  noScope: "\u672a\u8a2d\u5b9a\u8ca0\u8cac\u9818\u57df",
  collapse: "\u6536\u5408",
  expand: "\u5c55\u958b",
  doing: "\u9032\u884c\u4e2d",
  soon: "\u5373\u5c07\u5230\u671f",
  allTasks: "\u5168\u90e8\u4efb\u52d9",
  doingTasks: "\u9032\u884c\u4e2d\u7684\u4efb\u52d9",
  soonTasks: "\u5373\u5c07\u5230\u671f\u7684\u4efb\u52d9",
  dueDate: "\u5230\u671f\u65e5",
  noTasks: "\u76ee\u524d\u6c92\u6709\u4efb\u52d9",
  noTeachers: "\u5c1a\u672a\u5efa\u7acb\u6559\u5e2b\u8cc7\u6599\u3002",
  overdue: "\u5df2\u903e\u671f",
  todayDue: "\u4eca\u5929\u5230\u671f",
  left: "\u5269",
  days: "\u5929"
};

function dueText(task: Task) {
  const days = getDaysLeft(task.dueDate);

  if (isTaskClosed(task)) return task.dueDate;
  if (days < 0) return `${task.dueDate} | ${text.overdue} ${Math.abs(days)} ${text.days}`;
  if (days === 0) return `${task.dueDate} | ${text.todayDue}`;
  return `${task.dueDate} | ${text.left} ${days} ${text.days}`;
}

function statusClass(task: Task) {
  if (!isTaskClosed(task) && getDaysLeft(task.dueDate) < 0) return "bg-red-50 text-red-700";

  const classes: Record<Task["status"], string> = {
    todo: "bg-stone-100 text-stone-700",
    doing: "bg-blue-100 text-blue-800",
    waiting: "bg-yellow-100 text-yellow-900",
    review: "bg-purple-100 text-purple-800",
    done: "bg-forest-100 text-forest-700",
    archived: "bg-stone-100 text-stone-500"
  };

  return classes[task.status];
}

function isSoon(task: Task) {
  const days = getDaysLeft(task.dueDate);
  return !isTaskClosed(task) && days >= 0 && days <= 3;
}

function modeTitle(mode: ListMode) {
  if (mode === "doing") return text.doingTasks;
  if (mode === "soon") return text.soonTasks;
  return text.allTasks;
}

export function WorkloadPanel({ teachers, tasks }: WorkloadPanelProps) {
  const [expanded, setExpanded] = useState<{ teacherId: string; mode: ListMode }>({
    teacherId: "",
    mode: "all"
  });

  const activeTeachers = teachers.filter((teacher) => teacher.enabled !== false);

  function teacherAllTasks(teacher: Teacher) {
    return tasks
      .filter((task) => getAssigneeIds(task).includes(teacher.id))
      .filter((task) => task.status !== "archived")
      .sort((a, b) => {
        const aClosed = isTaskClosed(a) ? 1 : 0;
        const bClosed = isTaskClosed(b) ? 1 : 0;
        return aClosed - bClosed || a.dueDate.localeCompare(b.dueDate);
      });
  }

  function filterTasksByMode(list: Task[], mode: ListMode) {
    if (mode === "doing") return list.filter((task) => task.status === "doing");
    if (mode === "soon") return list.filter(isSoon);
    return list;
  }

  function toggleList(teacherId: string, mode: ListMode) {
    setExpanded((current) =>
      current.teacherId === teacherId && current.mode === mode ? { teacherId: "", mode: "all" } : { teacherId, mode }
    );
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="workload">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xl font-bold text-forest-700">{text.sectionKicker}</p>
          <h2 className="text-4xl font-black text-ink">{text.sectionTitle}</h2>
        </div>
        <p className="rounded-lg bg-forest-50 p-4 text-lg font-black text-forest-800">{text.hint}</p>
      </div>

      <div className="mt-5 grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {activeTeachers.length ? (
          activeTeachers.map((teacher) => {
            const allTasks = teacherAllTasks(teacher);
            const doingTasks = allTasks.filter((task) => task.status === "doing");
            const soonTasks = allTasks.filter(isSoon);
            const isExpanded = expanded.teacherId === teacher.id;
            const visibleTasks = isExpanded ? filterTasksByMode(allTasks, expanded.mode) : [];

            return (
              <article key={teacher.id} className="rounded-lg border border-forest-100 bg-warm shadow-soft">
                <div className="grid min-h-32 gap-3 p-4">
                  <button
                    className="flex items-start justify-between gap-3 text-left"
                    type="button"
                    onClick={() => toggleList(teacher.id, "all")}
                    aria-expanded={isExpanded}
                  >
                    <div>
                      <h3 className="text-2xl font-black text-ink">{teacher.name}</h3>
                      <p className="mt-1 text-base font-bold text-stone-600">
                        {teacher.teachingScope || text.noScope}
                      </p>
                    </div>
                    <span className="rounded-md bg-white px-3 py-2 text-base font-black text-forest-800">
                      {isExpanded ? text.collapse : text.expand}
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={`rounded-md px-3 py-3 text-left transition ${
                        isExpanded && expanded.mode === "doing" ? "bg-blue-100 ring-2 ring-blue-300" : "bg-blue-50"
                      }`}
                      type="button"
                      onClick={() => toggleList(teacher.id, "doing")}
                    >
                      <p className="text-sm font-black text-blue-700">{text.doing}</p>
                      <p className="text-3xl font-black text-blue-900">{doingTasks.length}</p>
                    </button>
                    <button
                      className={`rounded-md px-3 py-3 text-left transition ${
                        isExpanded && expanded.mode === "soon" ? "bg-amber-100 ring-2 ring-amber-300" : "bg-amber-50"
                      }`}
                      type="button"
                      onClick={() => toggleList(teacher.id, "soon")}
                    >
                      <p className="text-sm font-black text-amber-700">{text.soon}</p>
                      <p className="text-3xl font-black text-amber-900">{soonTasks.length}</p>
                    </button>
                  </div>
                </div>

                <div
                  className={`overflow-hidden border-t border-forest-100 transition-[max-height,opacity] duration-200 ${
                    isExpanded ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="space-y-2 p-4">
                    <p className="px-1 text-base font-black text-forest-800">{modeTitle(expanded.mode)}</p>
                    {visibleTasks.length ? (
                      visibleTasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-forest-100 bg-white p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-lg font-black leading-snug text-ink">{task.title}</p>
                              <p className="mt-1 text-sm font-bold text-stone-600">
                                {text.dueDate}: {dueText(task)}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-md px-3 py-1 text-sm font-black ${statusClass(task)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg bg-white p-4 text-lg font-black text-forest-800">{text.noTasks}</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="rounded-lg bg-rice p-5 text-2xl font-black text-forest-800 md:col-span-2 xl:col-span-3">
            {text.noTeachers}
          </p>
        )}
      </div>
    </section>
  );
}
