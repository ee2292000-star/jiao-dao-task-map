"use client";

import { useState } from "react";
import type { StickyColor, StickyNote, Task, Teacher } from "@/lib/types";
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
  onCreateNote: (input: {
    body: string;
    assigneeId: string;
    dueDate: string;
    color: StickyColor;
    authorId?: string;
  }) => void;
};

function assignedToTeacher(task: Task, teacherId: string) {
  return task.assignedTo === teacherId || task.ownerIds.includes(teacherId) || task.assignees.includes(teacherId);
}

function assignedToAnyTeacherId(task: Task, teacherIds: string[]) {
  return teacherIds.some((teacherId) => assignedToTeacher(task, teacherId));
}

function noteRecipient(note: StickyNote, teachers: Teacher[]) {
  if (!note.assigneeId) return "教導處主任";
  return teachers.find((teacher) => teacher.id === note.assigneeId)?.name ?? "未指定對象";
}

function noteAuthor(note: StickyNote, teachers: Teacher[], currentTeacher: Teacher) {
  if (note.authorId === currentTeacher.id) return currentTeacher.name;
  return teachers.find((teacher) => teacher.id === note.authorId)?.name ?? "教師";
}

function noteDueText(note: StickyNote) {
  if (!note.dueDate) return "沒有設定截止日";
  const daysLeft = getDaysLeft(note.dueDate);
  if (daysLeft < 0) return `已逾期 ${Math.abs(daysLeft)} 天`;
  if (daysLeft === 0) return "今天到期";
  return `剩 ${daysLeft} 天`;
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
  onToggleNote,
  onCreateNote
}: TeacherPortalProps) {
  const [noteBody, setNoteBody] = useState("");
  const [noteAssigneeId, setNoteAssigneeId] = useState("");
  const [noteColor, setNoteColor] = useState<StickyColor>("yellow");
  const [noteDueDate, setNoteDueDate] = useState("");

  const identityIds = teacherIds?.length ? teacherIds : [teacher.id];
  const myTasks = tasks.filter((task) => assignedToAnyTeacherId(task, identityIds));
  const focusTasks = identityIds
    .flatMap((teacherId) => getTeacherFocusTasks(tasks, teacherId, 2))
    .filter((item, index, allItems) => allItems.findIndex((other) => other.task.id === item.task.id) === index)
    .slice(0, 2);
  const relatedNotes = notes.filter(
    (note) => !note.done && (identityIds.includes(note.assigneeId ?? "") || identityIds.includes(note.authorId))
  );
  const teacherOptions = teachers.filter((item) => item.enabled !== false && item.id !== teacher.id);

  function submitNote() {
    const body = noteBody.trim();
    if (!body) return;
    onCreateNote({
      body,
      assigneeId: noteAssigneeId,
      dueDate: noteDueDate,
      color: noteColor,
      authorId: teacher.id
    });
    setNoteBody("");
    setNoteAssigneeId("");
    setNoteColor("yellow");
    setNoteDueDate("");
  }

  return (
    <div className="space-y-6" id="teacher-portal">
      <section className="rounded-lg bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-xl font-bold text-forest-700">我的任務、低壓提醒、狀態回報</p>
            <h2 className="text-4xl font-black text-ink">我的任務</h2>
          </div>
          <p className="rounded-md bg-forest-50 px-4 py-3 text-xl font-black text-forest-800">
            {teacher.name}，這裡只顯示與你有關的任務與便利貼。
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

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
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

        <div className="space-y-5">
          <div className="rounded-lg bg-white p-5 shadow-soft">
            <p className="text-xl font-bold text-forest-700">給主任或同事的協作訊息</p>
            <h3 className="text-4xl font-black">新增便利貼</h3>
            <div className="mt-4 grid gap-3">
              <textarea
                className="min-h-28 rounded-md border border-forest-100 bg-warm px-4 py-3 text-lg font-bold"
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="例如：午餐宣導海報已完成，想請主任確認。"
                aria-label="便利貼內容"
              />
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  className="rounded-md border border-forest-100 bg-warm px-3 py-2 text-base font-black"
                  value={noteAssigneeId}
                  onChange={(event) => setNoteAssigneeId(event.target.value)}
                  aria-label="收件對象"
                >
                  <option value="">送給教導處主任</option>
                  {teacherOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      送給{item.name}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-md border border-forest-100 bg-warm px-3 py-2 text-base font-black"
                  type="date"
                  value={noteDueDate}
                  onChange={(event) => setNoteDueDate(event.target.value)}
                  aria-label="提醒日期"
                />
              </div>
              <select
                className="rounded-md border border-forest-100 bg-warm px-3 py-2 text-base font-black"
                value={noteColor}
                onChange={(event) => setNoteColor(event.target.value as StickyColor)}
                aria-label="便利貼分類"
              >
                <option value="yellow">黃：提醒</option>
                <option value="pink">粉：討論</option>
                <option value="green">綠：已決定</option>
                <option value="blue">藍：想法</option>
              </select>
              <ActionButton tone="primary" onClick={submitNote}>
                送出便利貼
              </ActionButton>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-soft">
            <h3 className="text-4xl font-black">我的便利貼</h3>
            <div className="mt-4 space-y-3">
              {relatedNotes.length ? (
                relatedNotes.map((note) => {
                  const isSentByMe = identityIds.includes(note.authorId);
                  return (
                    <div key={note.id} className="rounded-lg border border-forest-100 bg-rice p-4">
                      <p className="text-xl font-black">{note.body}</p>
                      <p className="mt-2 text-base font-bold text-stone-700">
                        {isSentByMe ? `送給：${noteRecipient(note, teachers)}` : `來自：${noteAuthor(note, teachers, teacher)}`}
                      </p>
                      <p className="mt-1 text-base font-bold text-stone-700">{noteDueText(note)}</p>
                      {!isSentByMe && (
                        <div className="mt-3">
                          <ActionButton tone="primary" onClick={() => onToggleNote(note.id)}>
                            標記完成
                          </ActionButton>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="rounded-lg bg-forest-50 p-5 text-xl font-black text-forest-800">
                  目前沒有與你有關的便利貼。
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
