"use client";

import type { StickyNote, Task, Teacher } from "@/lib/types";
import { getTeacherFocusTasks } from "@/lib/decisionSupport";
import { getDaysLeft } from "@/lib/reminders";
import { TaskCard } from "./TaskCard";
import { ActionButton } from "./ActionBar";

type TeacherPortalProps = {
  teacher: Teacher;
  tasks: Task[];
  notes: StickyNote[];
  teachers: Teacher[];
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  onQuickComment: (taskId: string, body: string) => void;
  onToggleNote: (noteId: string) => void;
};

export function TeacherPortal({
  teacher,
  tasks,
  notes,
  teachers,
  onStatusChange,
  onQuickComment,
  onToggleNote
}: TeacherPortalProps) {
  const myTasks = tasks.filter((task) => task.ownerIds.includes(teacher.id));
  const focusTasks = getTeacherFocusTasks(tasks, teacher.id, 2);
  const myNotes = notes.filter((note) => note.assigneeId === teacher.id && !note.done);

  return (
    <div className="space-y-6" id="teacher-portal">
      <section className="rounded-lg bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-xl font-bold text-forest-700">教師端</p>
            <h2 className="text-5xl font-black text-ink">我的任務</h2>
          </div>
          <p className="rounded-md bg-forest-50 px-4 py-3 text-xl font-black text-forest-800">
            {teacher.name}，今天先看這裡就好
          </p>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <h3 className="text-4xl font-black">本週重點</h3>
        <p className="mt-1 text-lg font-bold text-stone-600">
          系統只挑 1 到 2 件較需要先處理的任務。
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {focusTasks.length ? (
            focusTasks.map(({ task, score, reasons }) => (
              <TaskCard
                key={task.id}
                task={task}
                teachers={teachers}
                compact
                onStatusChange={onStatusChange}
                onQuickComment={onQuickComment}
                priorityScore={score}
                priorityReasons={reasons}
              />
            ))
          ) : (
            <p className="rounded-lg bg-rice p-5 text-2xl font-black text-forest-800">
              目前沒有急件，維持既有進度即可。
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-lg bg-white p-5 shadow-soft">
          <h3 className="text-4xl font-black">我的全部任務</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {myTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                teachers={teachers}
                compact
                onStatusChange={onStatusChange}
                onQuickComment={onQuickComment}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-soft">
          <h3 className="text-4xl font-black">我的便利貼</h3>
          <div className="mt-4 space-y-3">
            {myNotes.length ? (
              myNotes.map((note) => {
                const daysLeft = note.dueDate ? getDaysLeft(note.dueDate) : undefined;
                return (
                  <div key={note.id} className="rounded-lg border border-forest-100 bg-rice p-4">
                    <p className="text-xl font-black">{note.body}</p>
                    <p className="mt-2 text-lg font-bold text-stone-700">
                      {daysLeft === undefined
                        ? "未設定截止日"
                        : daysLeft < 0
                          ? `逾期 ${Math.abs(daysLeft)} 天`
                          : `剩 ${daysLeft} 天`}
                    </p>
                    <div className="mt-3">
                      <ActionButton tone="primary" onClick={() => onToggleNote(note.id)}>
                        完成
                      </ActionButton>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-lg bg-forest-50 p-5 text-xl font-black text-forest-800">
                目前沒有指派給你的便利貼。
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
