"use client";

import type { Task, Teacher } from "@/lib/types";
import { getWorkloadRows, getWorkloadSuggestions } from "@/lib/decisionSupport";

type WorkloadPanelProps = {
  teachers: Teacher[];
  tasks: Task[];
};

export function WorkloadPanel({ teachers, tasks }: WorkloadPanelProps) {
  const rows = getWorkloadRows(teachers, tasks);
  const suggestions = getWorkloadSuggestions(teachers, tasks);

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="workload">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xl font-bold text-forest-700">協作分工與支援判斷</p>
          <h2 className="text-4xl font-black">人員分工</h2>
        </div>
        <div className="rounded-lg bg-amber-50 p-4 text-lg font-black text-amber-900">
          {suggestions.length
            ? suggestions.map((suggestion) => <p key={suggestion}>{suggestion}</p>)
            : "目前沒有需要調整分工的提醒。"}
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {rows.length ? (
          rows.map(({ teacher, owned, active, soon, overdue }) => (
            <div key={teacher.id} className="rounded-lg border border-forest-100 bg-warm p-4">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-2xl">{teacher.name}</strong>
                <span className="text-lg font-bold text-stone-600">{teacher.role}</span>
              </div>
              <p className="mt-1 text-base font-bold text-stone-600">
                {teacher.teachingScope || "未設定負責領域"}
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <p className="rounded-md bg-white p-3 text-lg font-black">全部 {owned.length}</p>
                <p className="rounded-md bg-blue-50 p-3 text-lg font-black text-blue-800">
                  進行 {active.length}
                </p>
                <p className="rounded-md bg-amber-50 p-3 text-lg font-black text-amber-800">
                  將到 {soon.length}
                </p>
                <p className="rounded-md bg-red-50 p-3 text-lg font-black text-red-800">
                  逾期 {overdue.length}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-rice p-5 text-2xl font-black text-forest-800 lg:col-span-2">
            尚未建立教師資料
          </p>
        )}
      </div>
    </section>
  );
}
