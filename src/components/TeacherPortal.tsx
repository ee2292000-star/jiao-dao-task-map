"use client";

import type { StickyNote, Task, Teacher } from "@/lib/types";
import { getTeacherFocusTasks } from "@/lib/decisionSupport";
import { getDaysLeft } from "@/lib/reminders";
import { TaskCard } from "./TaskCard";
import { ActionButton } from "./ActionBar";

type TeacherPortalProps = {
  teacher: Teacher;
  teacherIds?: string[];
  currentUserId?: string;
  editableCommentAuthorIds?: string[];
  tasks: Task[];
  notes: StickyNote[];
  teachers: Teacher[];
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  onQuickComment: (taskId: string, body: string) => void;
  onUpdateComment?: (taskId: string, commentId: string, body: string) => void;
  onDeleteComment?: (taskId: string, commentId: string) => void;
  onToggleNote: (noteId: string) => void;
};

function assignedToTeacher(task: Task, teacherId: string) {
  return task.assignedTo === teacherId || task.ownerIds.includes(teacherId) || task.assignees.includes(teacherId);
}

function assignedToAnyTeacherId(task: Task, teacherIds: string[]) {
  return teacherIds.some((teacherId) => assignedToTeacher(task, teacherId));
}

export function TeacherPortal({
  teacher,
  teacherIds,
  currentUserId,
  editableCommentAuthorIds,
  tasks,
  notes,
  teachers,
  onStatusChange,
  onQuickComment,
  onUpdateComment,
  onDeleteComment,
  onToggleNote
}: TeacherPortalProps) {
  const identityIds = teacherIds?.length ? teacherIds : [teacher.id];
  const myTasks = tasks.filter((task) => assignedToAnyTeacherId(task, identityIds));
  const focusTasks = identityIds
    .flatMap((teacherId) => getTeacherFocusTasks(tasks, teacherId, 2))
    .filter((item, index, allItems) => allItems.findIndex((other) => other.task.id === item.task.id) === index)
    .slice(0, 2);
  const myNotes = notes.filter((note) => identityIds.includes(note.assigneeId ?? "") && !note.done);

  return (
    <div className="space-y-6" id="teacher-portal">
      <section className="rounded-lg bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-xl font-bold text-forest-700">我的任務、低壓提醒、狀態回報</p>
            <h2 className="text-4xl font-black text-ink">我的任務</h2>
          </div>
          <p className="rounded-md bg-forest-50 px-4 py-3 text-xl font-black text-forest-800">
            {teacher.name}，這裡只顯示與你有關的任務。
          </p>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-soft">
        <h3 className="text-4xl font-black">本週重點</h3>
        <p className="mt-1 text-lg font-bold text-stone-600">系統會挑出最需要先看的 1 到 2 件任務。</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {focusTasks.length ? (
            focusTasks.map(({ task, score, reasons }) => (
              <TaskCard
                key={task.id}
                task={task}
                teachers={teachers}
                compact
                currentUserId={currentUserId}
                editableCommentAuthorIds={editableCommentAuthorIds}
                onStatusChange={onStatusChange}
                onQuickComment={onQuickComment}
                onUpdateComment={onUpdateComment}
                onDeleteComment={onDeleteComment}
                priorityScore={score}
                priorityReasons={reasons}
              />
            ))
          ) : (
            <p className="rounded-lg bg-rice p-5 text-2xl font-black text-forest-800">
              目前沒有需要優先處理的任務
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-lg bg-white p-5 shadow-soft">
          <h3 className="text-4xl font-black">我的任務列表</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {myTasks.length ? (
              myTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  teachers={teachers}
                  compact
                  currentUserId={currentUserId}
                  editableCommentAuthorIds={editableCommentAuthorIds}
                  onStatusChange={onStatusChange}
                  onQuickComment={onQuickComment}
                  onUpdateComment={onUpdateComment}
                  onDeleteComment={onDeleteComment}
                />
              ))
            ) : (
              <p className="rounded-lg bg-rice p-5 text-xl font-black text-forest-800 lg:col-span-2">
                目前沒有指派給你的任務。
              </p>
            )}
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
                        ? "沒有設定截止日"
                        : daysLeft < 0
                          ? `已逾期 ${Math.abs(daysLeft)} 天`
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
