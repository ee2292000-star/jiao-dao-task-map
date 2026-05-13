"use client";

import { useMemo, useState } from "react";
import type { StickyColor, StickyNote, Task, Teacher } from "@/lib/types";
import { getTeacherFocusTasks } from "@/lib/decisionSupport";
import { getDaysLeft } from "@/lib/reminders";
import { TaskCard } from "./TaskCard";
import { ActionButton } from "./ActionBar";
import { StickyNoteCard } from "./StickyNoteCard";

const ALL_STICKY_RECIPIENT_ID = "__all__";

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
    title?: string;
    body: string;
    assigneeId: string;
    dueDate: string;
    color: StickyColor;
    authorId?: string;
  }) => void;
  onUpdateNote: (noteId: string, changes: Partial<StickyNote>) => void;
  onDeleteNote: (noteId: string) => void;
  onSetNoteStatus: (noteId: string, status: StickyNote["status"]) => void;
};

const colorLabel: Record<StickyColor, string> = {
  yellow: "提醒",
  pink: "問題",
  green: "回報",
  blue: "想法",
  red: "急件"
};

const colorClass: Record<StickyColor, string> = {
  yellow: "border-yellow-200 bg-yellow-100",
  pink: "border-pink-200 bg-pink-100",
  green: "border-green-200 bg-green-100",
  blue: "border-blue-200 bg-blue-100",
  red: "border-red-200 bg-red-100"
};

function assignedToTeacher(task: Task, teacherId: string) {
  return task.assignedTo === teacherId || task.ownerIds.includes(teacherId) || task.assignees.includes(teacherId);
}

function assignedToAnyTeacherId(task: Task, teacherIds: string[]) {
  return teacherIds.some((teacherId) => assignedToTeacher(task, teacherId));
}

function noteRecipient(note: StickyNote, teachers: Teacher[]) {
  if (note.assigneeId === ALL_STICKY_RECIPIENT_ID) return "全體教師";
  if (!note.assigneeId) return "主任";
  return teachers.find((item) => item.id === note.assigneeId)?.name ?? "尚未設定";
}

function noteAuthor(note: StickyNote, teachers: Teacher[], currentTeacher: Teacher) {
  if (note.authorId === currentTeacher.id) return currentTeacher.name;
  return teachers.find((item) => item.id === note.authorId)?.name ?? "主任";
}

function noteDueText(note: StickyNote) {
  if (!note.dueDate) return "未設定期限";
  const daysLeft = getDaysLeft(note.dueDate);
  if (daysLeft < 0) return `已逾期 ${Math.abs(daysLeft)} 天`;
  if (daysLeft === 0) return "今天到期";
  return `剩 ${daysLeft} 天`;
}

function isNoteRelatedToTeacher(note: StickyNote, identityIds: string[]) {
  return (
    note.assigneeId === ALL_STICKY_RECIPIENT_ID ||
    !note.assigneeId ||
    identityIds.includes(note.assigneeId) ||
    identityIds.includes(note.authorId)
  );
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
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onSetNoteStatus
}: TeacherPortalProps) {
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteAssigneeId, setNoteAssigneeId] = useState("");
  const [noteColor, setNoteColor] = useState<StickyColor>("green");
  const [noteDueDate, setNoteDueDate] = useState("");
  const [editingNoteId, setEditingNoteId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [showArchive, setShowArchive] = useState(false);

  const identityIds = teacherIds?.length ? teacherIds : [teacher.id];
  const myTasks = tasks.filter((task) => assignedToAnyTeacherId(task, identityIds));
  const focusTasks = identityIds
    .flatMap((teacherId) => getTeacherFocusTasks(tasks, teacherId, 2))
    .filter((item, index, allItems) => allItems.findIndex((other) => other.task.id === item.task.id) === index)
    .slice(0, 2);
  const relatedNotes = useMemo(
    () =>
      notes
        .filter((note) => isNoteRelatedToTeacher(note, identityIds))
        .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)),
    [identityIds, notes]
  );
  const activeNotes = relatedNotes.filter((note) => note.status !== "archived");
  const archivedNotes = relatedNotes.filter((note) => note.status === "archived");
  const teacherOptions = teachers.filter((item) => item.enabled !== false);

  function submitNote() {
    const title = noteTitle.trim();
    const body = noteBody.trim() || title;
    if (!body) return;
    onCreateNote({
      title,
      body,
      assigneeId: noteAssigneeId,
      dueDate: noteDueDate,
      color: noteColor,
      authorId: teacher.id
    });
    setNoteTitle("");
    setNoteBody("");
    setNoteAssigneeId("");
    setNoteColor("green");
    setNoteDueDate("");
  }

  function startEditNote(note: StickyNote) {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
  }

  function saveEditNote(noteId: string) {
    const nextBody = editBody.trim();
    if (!nextBody) return;
    onUpdateNote(noteId, { title: editTitle.trim() || nextBody.slice(0, 24), body: nextBody });
    setEditingNoteId("");
  }

  function deleteNote(noteId: string) {
    if (!window.confirm("確定要刪除此便利貼嗎？此動作無法復原。")) return;
    onDeleteNote(noteId);
  }

  function renderNote(note: StickyNote) {
    const isMine = identityIds.includes(note.authorId);
    return (
      <article key={note.id} className="space-y-3">
        <StickyNoteCard
          body={editingNoteId === note.id ? undefined : note.body}
          category={colorLabel[note.color]}
          footer={
            <div className="space-y-1">
              <p>{noteAuthor(note, teachers, teacher)} / ?? {note.updatedAt}</p>
              <p>{noteRecipient(note, teachers)}</p>
              <p>{noteDueText(note)}</p>
            </div>
          }
          onEdit={isMine ? () => startEditNote(note) : undefined}
          rotation={note.id.charCodeAt(0) % 2 === 0 ? 1 : -1}
          title={note.title}
          tone={note.color}
        />

        {editingNoteId === note.id ? (
          <div className="grid gap-2 rounded-lg border border-forest-100 bg-white p-3">
            <input className="rounded-md border border-forest-100 bg-white px-3 py-2 font-bold" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            <textarea className="min-h-24 rounded-md border border-forest-100 bg-white px-3 py-2 font-bold" value={editBody} onChange={(event) => setEditBody(event.target.value)} />
            <div className="flex gap-2">
              <ActionButton tone="primary" onClick={() => saveEditNote(note.id)}>??</ActionButton>
              <ActionButton tone="quiet" onClick={() => setEditingNoteId("")}>??</ActionButton>
            </div>
          </div>
        ) : null}

        {isMine && (
          <div className="flex flex-wrap gap-2">
            <ActionButton tone="quiet" onClick={() => onSetNoteStatus(note.id, note.status === "archived" ? "normal" : "archived")}>
              {note.status === "archived" ? "??" : "??"}
            </ActionButton>
            <ActionButton tone="danger" onClick={() => deleteNote(note.id)}>??</ActionButton>
          </div>
        )}
      </article>
    );
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
        <p className="mt-1 text-lg font-bold text-stone-700">系統會挑出最需要先看的 1 到 2 件任務。</p>
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
            <p className="rounded-lg bg-rice p-5 text-2xl font-black text-forest-800">目前沒有需要優先處理的任務。</p>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-lg bg-white p-5 shadow-soft">
          <h3 className="text-4xl font-black">任務列表</h3>
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
              <p className="rounded-lg bg-rice p-5 text-xl font-black text-forest-800 lg:col-span-2">目前沒有指派給你的任務。</p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg bg-white p-5 shadow-soft">
            <p className="text-xl font-bold text-forest-700">傳給主任或同事的協作訊息</p>
            <h3 className="text-4xl font-black">新增便利貼</h3>
            <div className="mt-4 grid gap-3">
              <input className="rounded-md border border-forest-100 bg-warm px-4 py-3 text-lg font-bold" value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="便利貼標題" />
              <textarea className="min-h-28 rounded-md border border-forest-100 bg-warm px-4 py-3 text-lg font-bold" value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="內容，例如：午餐宣導海報已完成，想請主任確認。" />
              <div className="grid gap-2 md:grid-cols-2">
                <select className="rounded-md border border-forest-100 bg-warm px-3 py-2 text-base font-black" value={noteAssigneeId} onChange={(event) => setNoteAssigneeId(event.target.value)}>
                  <option value="">送給主任</option>
                  <option value={ALL_STICKY_RECIPIENT_ID}>送給全體教師</option>
                  {teacherOptions.map((item) => (
                    <option key={item.id} value={item.id}>送給{item.name}</option>
                  ))}
                </select>
                <input className="rounded-md border border-forest-100 bg-warm px-3 py-2 text-base font-black" type="date" value={noteDueDate} onChange={(event) => setNoteDueDate(event.target.value)} />
              </div>
              <select className="rounded-md border border-forest-100 bg-warm px-3 py-2 text-base font-black" value={noteColor} onChange={(event) => setNoteColor(event.target.value as StickyColor)}>
                <option value="yellow">提醒</option>
                <option value="blue">想法</option>
                <option value="pink">問題</option>
                <option value="green">回報</option>
                <option value="red">急件</option>
              </select>
              <ActionButton tone="primary" onClick={submitNote}>送出便利貼</ActionButton>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-4xl font-black">我的便利貼</h3>
              <button className="rounded-md bg-rice px-3 py-2 text-base font-black" type="button" onClick={() => setShowArchive((value) => !value)}>
                {showArchive ? "回到主要便利貼" : `封存區 ${archivedNotes.length}`}
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {(showArchive ? archivedNotes : activeNotes).length ? (
                (showArchive ? archivedNotes : activeNotes).map(renderNote)
              ) : (
                <p className="rounded-lg bg-forest-50 p-5 text-xl font-black text-forest-800">
                  {showArchive ? "封存區目前沒有便利貼。" : "目前沒有與你有關的便利貼。"}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
