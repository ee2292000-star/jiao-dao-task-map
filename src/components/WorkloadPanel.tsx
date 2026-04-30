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
          <p className="text-xl font-bold text-forest-700">決策用，不是排名用</p>
          <h2 className="text-4xl font-black">人員負荷分析</h2>
        </div>
        <div className="rounded-lg bg-amber-50 p-4 text-lg font-black text-amber-900">
          {suggestions.map((suggestion) => (
            <p key={suggestion}>{suggestion}</p>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {rows.map(({ teacher, owned, active, soon, overdue }) => (
          <div key={teacher.id} className="rounded-lg border border-forest-100 bg-warm p-4">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-2xl">{teacher.name}</strong>
              <span className="text-lg font-bold text-stone-600">{teacher.role}</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <p className="rounded-md bg-white p-3 text-lg font-black">全部 {owned.length}</p>
              <p className="rounded-md bg-blue-50 p-3 text-lg font-black text-blue-800">
                未完 {active.length}
              </p>
              <p className="rounded-md bg-amber-50 p-3 text-lg font-black text-amber-800">
                到期 {soon.length}
              </p>
              <p className="rounded-md bg-red-50 p-3 text-lg font-black text-red-800">
                逾期 {overdue.length}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
