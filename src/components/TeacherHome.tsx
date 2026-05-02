"use client";

import type { Task, Teacher } from "@/lib/types";
import { getTeacherFocusTasks } from "@/lib/decisionSupport";
import { TaskCard } from "./TaskCard";

type TeacherHomeProps = {
  teacher: Teacher;
  tasks: Task[];
  teachers: Teacher[];
  onStatusChange: (taskId: string, status: Task["status"]) => void;
};

function assignedToTeacher(task: Task, teacherId: string) {
  return task.assignedTo === teacherId || task.ownerIds.includes(teacherId) || task.assignees.includes(teacherId);
}

export function TeacherHome({ teacher, tasks, teachers, onStatusChange }: TeacherHomeProps) {
  const myTasks = tasks.filter((task) => assignedToTeacher(task, teacher.id));
  const focusTasks = getTeacherFocusTasks(tasks, teacher.id, 2);

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="teacher">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xl font-bold text-forest-700">教師端預覽</p>
          <h2 className="text-4xl font-black">我的任務</h2>
        </div>
        <p className="rounded-md bg-forest-50 px-4 py-3 text-xl font-black text-forest-800">
          {teacher.name} 的任務畫面
        </p>
      </div>

      <div className="mt-5 rounded-lg bg-rice p-4">
        <h3 className="text-3xl font-black">本週重點</h3>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {focusTasks.length ? (
            focusTasks.map(({ task }) => (
              <TaskCard
                key={task.id}
                task={task}
                teachers={teachers}
                compact
                onStatusChange={onStatusChange}
              />
            ))
          ) : (
            <p className="rounded-lg bg-white p-4 text-xl font-black text-forest-800">
              目前沒有需要優先處理的任務。
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {myTasks.length ? (
          myTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              teachers={teachers}
              compact
              onStatusChange={onStatusChange}
            />
          ))
        ) : (
          <p className="rounded-lg bg-rice p-5 text-xl font-black text-forest-800 lg:col-span-2">
            目前沒有指派給這位教師的任務。
          </p>
        )}
      </div>
    </section>
  );
}
