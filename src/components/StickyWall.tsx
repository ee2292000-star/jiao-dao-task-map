"use client";

import { useMemo, useState } from "react";
import type { Priority, StickyColor, StickyNote, Teacher } from "@/lib/types";
import { getDaysLeft } from "@/lib/reminders";
import { ActionBar, ActionButton } from "./ActionBar";
import { StickyNoteCard } from "./StickyNoteCard";

const ALL_STICKY_RECIPIENT_ID = "__all__";

type ConvertOptions = {
  assigneeId: string;
  dueDate: string;
  taskType: string;
  priority: Priority;
};

type StickyWallProps = {
  notes: StickyNote[];
  teachers: Teacher[];
  currentUserId: string;
  canManageAll: boolean;
  onToggle: (noteId: string) => void;
  onConvert: (noteId: string, options: ConvertOptions) => void;
  onAssign: (noteId: string, teacherId: string) => void;
  onCreate: (input: {
    title?: string;
    body: string;
    assigneeId: string;
    dueDate: string;
    color: StickyColor;
    authorId?: string;
  }) => void;
  onUpdate: (noteId: string, changes: Partial<StickyNote>) => void;
  onDelete: (noteId: string) => void;
  onSetStatus: (noteId: string, status: StickyNote["status"]) => void;
  onOpenTask?: (taskId: string) => void;
};

const colorClass: Record<StickyColor, string> = {
  yellow: "bg-yellow-100 border-yellow-200",
  pink: "bg-pink-100 border-pink-200",
  green: "bg-green-100 border-green-200",
  blue: "bg-blue-100 border-blue-200",
  red: "bg-red-100 border-red-200"
};

const colorLabel: Record<StickyColor, string> = {
  yellow: "提醒",
  blue: "想法",
  pink: "問題",
  green: "回報",
  red: "急件"
};

function teacherName(id: string | undefined, teachers: Teacher[]) {
  if (id === ALL_STICKY_RECIPIENT_ID) return "全體教師";
  if (!id) return "主任";
  return teachers.find((teacher) => teacher.id === id)?.name ?? "尚未設定";
}

function dueText(note: StickyNote) {
  if (!note.dueDate) return "未設定期限";
  const daysLeft = getDaysLeft(note.dueDate);
  if (daysLeft < 0) return `已逾期 ${Math.abs(daysLeft)} 天`;
  if (daysLeft === 0) return "今天到期";
  return `剩 ${daysLeft} 天`;
}

function statusLabel(status: StickyNote["status"]) {
  if (status === "archived") return "已封存";
  if (status === "replied") return "已回覆";
  return "一般";
}

function addDaysString(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("sv-SE");
}

export function StickyWall({
  notes,
  teachers,
  currentUserId,
  canManageAll,
  onConvert,
  onAssign,
  onCreate,
  onUpdate,
  onDelete,
  onSetStatus,
  onOpenTask
}: StickyWallProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [assigneeId, setAssigneeId] = useState(ALL_STICKY_RECIPIENT_ID);
  const [dueDate, setDueDate] = useState("");
  const [color, setColor] = useState<StickyColor>("yellow");
  const [statusFilter, setStatusFilter] = useState<"all" | StickyNote["status"]>("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState<"all" | StickyColor>("all");
  const [editingNoteId, setEditingNoteId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [convertingNoteId, setConvertingNoteId] = useState("");
  const [convertDraft, setConvertDraft] = useState<ConvertOptions>({
    assigneeId: "",
    dueDate: addDaysString(7),
    taskType: "行政協作",
    priority: "normal"
  });
  const teacherOptions = teachers.filter((teacher) => teacher.enabled !== false);

  const filteredNotes = useMemo(
    () =>
      notes
        .filter((note) => (statusFilter === "all" ? true : note.status === statusFilter))
        .filter((note) => (authorFilter === "all" ? true : note.authorId === authorFilter))
        .filter((note) => (targetFilter === "all" ? true : (note.assigneeId || "") === targetFilter))
        .filter((note) => (colorFilter === "all" ? true : note.color === colorFilter))
        .slice()
        .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)),
    [authorFilter, colorFilter, notes, statusFilter, targetFilter]
  );

  const directorAnnouncements = filteredNotes.filter((note) => note.authorId === currentUserId && note.status !== "archived");
  const teacherFeedback = filteredNotes.filter((note) => note.authorId !== currentUserId && note.status !== "archived");
  const archivedNotes = filteredNotes.filter((note) => note.status === "archived");

  function submitNote() {
    const nextTitle = title.trim();
    const nextBody = body.trim() || nextTitle;
    if (!nextBody) return;
    onCreate({
      title: nextTitle || nextBody.slice(0, 24),
      body: nextBody,
      assigneeId,
      dueDate,
      color,
      authorId: currentUserId
    });
    setTitle("");
    setBody("");
    setAssigneeId(ALL_STICKY_RECIPIENT_ID);
    setDueDate("");
    setColor("yellow");
  }

  function startEdit(note: StickyNote) {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
  }

  function saveEdit(noteId: string) {
    const nextBody = editBody.trim();
    if (!nextBody) return;
    onUpdate(noteId, { title: editTitle.trim() || nextBody.slice(0, 24), body: nextBody });
    setEditingNoteId("");
  }

  function confirmDelete(noteId: string) {
    if (!window.confirm("確定要刪除此便利貼嗎？此動作無法復原。")) return;
    onDelete(noteId);
  }

  function startConvert(note: StickyNote) {
    setConvertingNoteId(note.id);
    setConvertDraft({
      assigneeId: note.assigneeId && note.assigneeId !== ALL_STICKY_RECIPIENT_ID ? note.assigneeId : "",
      dueDate: note.dueDate || addDaysString(7),
      taskType: "行政協作",
      priority: note.color === "red" ? "high" : "normal"
    });
  }

  function submitConvert(noteId: string) {
    onConvert(noteId, convertDraft);
    setConvertingNoteId("");
  }

  function renderNote(note: StickyNote) {
    const canManage = canManageAll || note.authorId === currentUserId;
    return (
      <article key={note.id} className="space-y-3">
        <StickyNoteCard
          body={editingNoteId === note.id ? undefined : note.body}
          category={colorLabel[note.color] + " / " + statusLabel(note.status)}
          footer={
            <div className="space-y-1">
              <p>{teacherName(note.authorId, teachers)} / ?? {note.updatedAt}</p>
              <p>{dueText(note)}</p>
              {note.convertedTaskId && <p>?????</p>}
            </div>
          }
          onEdit={canManage ? () => startEdit(note) : undefined}
          rotation={note.id.charCodeAt(0) % 2 === 0 ? 1 : -1}
          title={note.title}
          tone={note.color}
        />

        {editingNoteId === note.id ? (
          <div className="grid gap-2 rounded-lg border border-forest-100 bg-white p-3">
            <input className="rounded-md border border-forest-100 bg-white px-3 py-2 font-bold" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            <textarea className="min-h-24 rounded-md border border-forest-100 bg-white px-3 py-2 font-bold" value={editBody} onChange={(event) => setEditBody(event.target.value)} />
            <div className="flex gap-2">
              <ActionButton tone="primary" onClick={() => saveEdit(note.id)}>??</ActionButton>
              <ActionButton tone="quiet" onClick={() => setEditingNoteId("")}>??</ActionButton>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {canManageAll && (
            <ActionButton tone="primary" onClick={() => (note.convertedTaskId ? onOpenTask?.(note.convertedTaskId) : startConvert(note))}>
              {note.convertedTaskId ? "????" : "????"}
            </ActionButton>
          )}
          {canManageAll && <ActionButton tone="quiet" onClick={() => onSetStatus(note.id, "replied")}>?????</ActionButton>}
          {canManage && (
            <ActionButton tone="quiet" onClick={() => onSetStatus(note.id, note.status === "archived" ? "normal" : "archived")}>
              {note.status === "archived" ? "??" : "??"}
            </ActionButton>
          )}
          {canManage && <ActionButton tone="danger" onClick={() => confirmDelete(note.id)}>??</ActionButton>}
        </div>

        {canManageAll && convertingNoteId === note.id && !note.convertedTaskId && (
          <div className="rounded-lg border border-forest-100 bg-white p-3">
            <p className="text-lg font-black text-forest-800">??????</p>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <select className="rounded-md border border-forest-100 bg-warm px-3 py-2 font-black" value={convertDraft.assigneeId} onChange={(event) => setConvertDraft((current) => ({ ...current, assigneeId: event.target.value }))}>
                <option value="">?????</option>
                {teacherOptions.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
              </select>
              <input className="rounded-md border border-forest-100 bg-warm px-3 py-2 font-black" type="date" value={convertDraft.dueDate} onChange={(event) => setConvertDraft((current) => ({ ...current, dueDate: event.target.value }))} />
              <input className="rounded-md border border-forest-100 bg-warm px-3 py-2 font-black" value={convertDraft.taskType} onChange={(event) => setConvertDraft((current) => ({ ...current, taskType: event.target.value }))} />
              <select className="rounded-md border border-forest-100 bg-warm px-3 py-2 font-black" value={convertDraft.priority} onChange={(event) => setConvertDraft((current) => ({ ...current, priority: event.target.value as Priority }))}>
                <option value="low">?</option>
                <option value="normal">??</option>
                <option value="high">?</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton tone="primary" onClick={() => submitConvert(note.id)}>????</ActionButton>
              <ActionButton tone="quiet" onClick={() => setConvertingNoteId("")}>??</ActionButton>
            </div>
          </div>
        )}
      </article>
    );
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="sticky">
      <div>
        <p className="text-xl font-bold text-forest-700">主任與教師的行政交流</p>
        <h2 className="text-4xl font-black">便利貼交流牆</h2>
      </div>

      <div className="mt-5 rounded-lg border border-forest-100 bg-warm p-4">
        <h3 className="text-2xl font-black">新增便利貼</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
          <input className="rounded-md border border-forest-100 bg-white px-4 py-3 text-lg font-bold" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="標題" />
          <select className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            <option value="">給主任</option>
            <option value={ALL_STICKY_RECIPIENT_ID}>給全體教師</option>
            {teacherOptions.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>給{teacher.name}</option>
            ))}
          </select>
          <input className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <textarea className="mt-3 min-h-28 w-full rounded-md border border-forest-100 bg-white px-4 py-3 text-lg font-bold" value={body} onChange={(event) => setBody(event.target.value)} placeholder="內容" />
        <div className="mt-3 flex flex-wrap gap-2">
          <select className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black" value={color} onChange={(event) => setColor(event.target.value as StickyColor)}>
            <option value="yellow">提醒</option>
            <option value="blue">想法</option>
            <option value="pink">問題</option>
            <option value="green">回報</option>
            <option value="red">急件</option>
          </select>
          <ActionButton tone="primary" onClick={submitNote}>送出便利貼</ActionButton>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <select className="rounded-md border border-forest-100 bg-rice px-3 py-2 text-base font-black" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | StickyNote["status"])}>
          <option value="all">全部狀態</option>
          <option value="normal">一般</option>
          <option value="replied">已回覆</option>
          <option value="archived">已封存</option>
        </select>
        <select className="rounded-md border border-forest-100 bg-rice px-3 py-2 text-base font-black" value={colorFilter} onChange={(event) => setColorFilter(event.target.value as "all" | StickyColor)}>
          <option value="all">全部分類</option>
          <option value="yellow">提醒</option>
          <option value="blue">想法</option>
          <option value="pink">問題</option>
          <option value="green">回報</option>
          <option value="red">急件</option>
        </select>
        <select className="rounded-md border border-forest-100 bg-rice px-3 py-2 text-base font-black" value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)}>
          <option value="all">全部對象</option>
          <option value="">主任</option>
          <option value={ALL_STICKY_RECIPIENT_ID}>全體教師</option>
          {teacherOptions.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
          ))}
        </select>
        <select className="rounded-md border border-forest-100 bg-rice px-3 py-2 text-base font-black" value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value)}>
          <option value="all">全部發布者</option>
          <option value={currentUserId}>主任</option>
          {teacherOptions.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div>
          <h3 className="mb-3 text-2xl font-black text-forest-800">主任公告</h3>
          <div className="space-y-4">
            {directorAnnouncements.length ? directorAnnouncements.map(renderNote) : <p className="rounded-lg bg-rice p-4 text-lg font-black">目前沒有主任公告。</p>}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-2xl font-black text-forest-800">教師回饋</h3>
          <div className="space-y-4">
            {teacherFeedback.length ? teacherFeedback.map(renderNote) : <p className="rounded-lg bg-rice p-4 text-lg font-black">目前沒有教師回饋。</p>}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-2xl font-black text-forest-800">封存區</h3>
          <div className="space-y-4">
            {archivedNotes.length ? archivedNotes.map(renderNote) : <p className="rounded-lg bg-rice p-4 text-lg font-black">封存區目前沒有便利貼。</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
