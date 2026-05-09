"use client";

import { useState } from "react";
import type { Task, Teacher } from "@/lib/types";
import { getAssigneeIds, getStatusLabel, getWorkloadRows } from "@/lib/decisionSupport";
import { getDaysLeft, isTaskClosed } from "@/lib/reminders";

type WorkloadPanelProps = {
  teachers: Teacher[];
  tasks: Task[];
};

function dueText(task: Task) {
  const days = getDaysLeft(task.dueDate);
  if (isTaskClosed(task)) return task.dueDate;
  if (days < 0) return `${task.dueDate}｜已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return `${task.dueDate}｜今天到期`;
  return `${task.dueDate}｜剩 ${days} 天`;
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

export function WorkloadPanel({ teachers, tasks }: WorkloadPanelProps) {
  const [expandedTeacherId, setExpandedTeacherId] = useState("");
  const rows = getWorkloadRows(teachers, tasks);

  function teacherTasks(teacher: Teacher) {
    return tasks
      .filter((task) => getAssigneeIds(task).includes(teacher.id))
      .filter((task) => task.status !== "archived")
      .sort((a, b) => {
        const aClosed = isTaskClosed(a) ? 1 : 0;
        const bClosed = isTaskClosed(b) ? 1 : 0;
        return aClosed - bClosed || a.dueDate.localeCompare(b.dueDate);
      });
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="workload">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xl font-bold text-forest-700">行政工作清單</p>
          <h2 className="text-4xl font-black">人員分工</h2>
        </div>
        <p className="rounded-lg bg-forest-50 p-4 text-lg font-black text-forest-800">
          點選教師卡片，可在下方展開該教師目前負責的任務。
        </p>
      </div>

      <div className="mt-5 grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.length ? (
          rows.map(({ teacher, active, soon }) => {
            const isExpanded = expandedTeacherId === teacher.id;
            const list = teacherTasks(teacher);
            return (
              <article key={teacher.id} className="rounded-lg border border-forest-100 bg-warm shadow-soft">
                <button
                  className="grid min-h-32 w-full gap-3 p-4 text-left"
                  type="button"
                  onClick={() => setExpandedTeacherId(isExpanded ? "" : teacher.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-black text-ink">{teacher.name}</h3>
                      <p className="mt-1 text-base font-bold text-stone-600">
                        {teacher.teachingScope || "未設定負責領域"}
                      </p>
                    </div>
                    <span className="rounded-md bg-white px-3 py-2 text-base font-black text-forest-800">
                      {isExpanded ? "收合" : "展開"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-blue-50 px-3 py-3">
                      <p className="text-sm font-black text-blue-700">進行中</p>
                      <p className="text-3xl font-black text-blue-900">{active.length}</p>
                    </div>
                    <div className="rounded-md bg-amber-50 px-3 py-3">
                      <p className="text-sm font-black text-amber-700">即將到期</p>
                      <p className="text-3xl font-black text-amber-900">{soon.length}</p>
                    </div>
                  </div>
                </button>

                <div
                  className={`overflow-hidden border-t border-forest-100 transition-[max-height,opacity] duration-200 ${
                    isExpanded ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="space-y-2 p-4">
                    {list.length ? (
                      list.map((task) => (
                        <div key={task.id} className="rounded-lg border border-forest-100 bg-white p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-lg font-black leading-snug text-ink">{task.title}</p>
                              <p className="mt-1 text-sm font-bold text-stone-600">到期日：{dueText(task)}</p>
                            </div>
                            <span className={`shrink-0 rounded-md px-3 py-1 text-sm font-black ${statusClass(task)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg bg-white p-4 text-lg font-black text-forest-800">
                        目前沒有任務
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="rounded-lg bg-rice p-5 text-2xl font-black text-forest-800 md:col-span-2 xl:col-span-3">
            尚未建立教師資料。
          </p>
        )}
      </div>
    </section>
  );
}
