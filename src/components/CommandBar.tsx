"use client";

import { useMemo, useState } from "react";
import type { Task, Teacher } from "@/lib/types";

type CommandBarProps = {
  tasks: Task[];
  teachers: Teacher[];
  onOpenTask: (taskId: string) => void;
  onFilterTeacher: (teacherId: string) => void;
  onAssignMode: () => void;
};

export function CommandBar({
  tasks,
  teachers,
  onOpenTask,
  onFilterTeacher,
  onAssignMode
}: CommandBarProps) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const keyword = query.trim();
    if (!keyword) return [];
    if (keyword.includes("指派")) return [{ id: "assign", label: "進入分派模式", type: "action" }];

    const taskMatches = tasks
      .filter((task) => task.title.includes(keyword))
      .slice(0, 3)
      .map((task) => ({ id: task.id, label: `開啟任務：${task.title}`, type: "task" }));
    const teacherMatches = teachers
      .filter((teacher) => teacher.name.includes(keyword))
      .slice(0, 2)
      .map((teacher) => ({ id: teacher.id, label: `查看 ${teacher.name} 的任務`, type: "teacher" }));

    return [...taskMatches, ...teacherMatches];
  }, [query, tasks, teachers]);

  function runCommand(id: string, type: string) {
    if (type === "task") onOpenTask(id);
    if (type === "teacher") onFilterTeacher(id);
    if (type === "action") onAssignMode();
    setQuery("");
  }

  return (
    <div className="relative w-full max-w-xl">
      <input
        className="w-full rounded-lg border border-forest-100 bg-white px-4 py-3 text-xl font-bold shadow-soft outline-none focus:ring-4 focus:ring-amber-200"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="快速指令：輸入任務、教師，或「指派」"
        aria-label="快速指令欄"
      />
      {matches.length > 0 && (
        <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-lg border border-forest-100 bg-white shadow-soft">
          {matches.map((match) => (
            <button
              key={`${match.type}-${match.id}`}
              className="block w-full px-4 py-3 text-left text-lg font-black hover:bg-rice"
              onClick={() => runCommand(match.id, match.type)}
            >
              {match.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
