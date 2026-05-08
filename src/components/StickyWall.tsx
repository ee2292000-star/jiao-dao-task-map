"use client";

import { useMemo, useState } from "react";
import type { StickyColor, StickyNote, Teacher } from "@/lib/types";
import { getDaysLeft } from "@/lib/reminders";
import { ActionBar, ActionButton } from "./ActionBar";

const ALL_STICKY_RECIPIENT_ID = "__all__";

type StickyWallProps = {
  notes: StickyNote[];
  teachers: Teacher[];
  currentUserId: string;
  canManageAll: boolean;
  onToggle: (noteId: string) => void;
  onConvert: (noteId: string) => void;
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
};

const colorClass: Record<StickyColor, string> = {
  yellow: "bg-yellow-100 border-yellow-200",
  pink: "bg-pink-100 border-pink-200",
  green: "bg-green-100 border-green-200",
  blue: "bg-blue-100 border-blue-200",
  red: "bg-red-100 border-red-200"
};

const colorLabel: Record<StickyColor, string> = {
  yellow: "黃色提醒",
  blue: "藍色想法",
  green: "綠色已處理",
  red: "紅色急件",
  pink: "粉色討論"
};

function teacherName(id: string | undefined, teachers: Teacher[]) {
  if (id === ALL_STICKY_RECIPIENT_ID) return "全體教師與主任";
  if (!id) return "教導處主任";
  return teachers.find((teacher) => teacher.id === id)?.name ?? "教導處主任";
}

function dueText(note: StickyNote) {
  if (!note.dueDate) return "沒有設定提醒日";
  const daysLeft = getDaysLeft(note.dueDate);
  if (daysLeft < 0) return `已逾期 ${Math.abs(daysLeft)} 天`;
  if (daysLeft === 0) return "今天提醒";
  return `剩 ${daysLeft} 天`;
}

function statusLabel(status: StickyNote["status"]) {
  if (status === "archived") return "已封存";
  if (status === "replied") return "已回覆";
  return "一般";
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
  onSetStatus
}: StickyWallProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [assigneeId, setAssigneeId] = useState(ALL_STICKY_RECIPIENT_ID);
  const [dueDate, setDueDate] = useState("");
  const [color, setColor] = useState<StickyColor>("yellow");
  const [statusFilter, setStatusFilter] = useState<"all" | StickyNote["status"]>("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [editingNoteId, setEditingNoteId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const teacherOptions = teachers.filter((teacher) => teacher.enabled !== false);

  const filteredNotes = useMemo(
    () =>
      notes
        .filter((note) => (statusFilter === "all" ? true : note.status === statusFilter))
        .filter((note) => (authorFilter === "all" ? true : note.authorId === authorFilter))
        .filter((note) => (targetFilter === "all" ? true : (note.assigneeId || "") === targetFilter))
        .slice()
        .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)),
    [authorFilter, notes, statusFilter, targetFilter]
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
    if (!editBody.trim()) return;
    onUpdate(noteId, { title: editTitle.trim() || editBody.slice(0, 24), body: editBody.trim() });
    setEditingNoteId("");
  }

  function confirmDelete(noteId: string) {
    if (!window.confirm("確定要刪除此便利貼嗎？此動作無法復原。")) return;
    onDelete(noteId);
  }

  function renderNote(note: StickyNote) {
    const canManage = canManageAll || note.authorId === currentUserId;
    return (
      <article key={note.id} className={`rounded-lg border p-4 ${colorClass[note.color]}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-stone-700">{colorLabel[note.color]} / {statusLabel(note.status)}</p>
            <h3 className="text-2xl font-black text-ink">{note.title}</h3>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {canManage && (
              <button className="rounded-md bg-white px-2 py-1 text-sm font-black" onClick={() => startEdit(note)} type="button">編輯</button>
            )}
            <button
              className="rounded-md bg-white px-2 py-1 text-sm font-black"
              onClick={() => onSetStatus(note.id, note.status === "archived" ? "normal" : "archived")}
              type="button"
            >
              {note.status === "archived" ? "還原" : "封存"}
            </button>
            {canManage && (
              <button className="rounded-md bg-red-50 px-2 py-1 text-sm font-black text-red-700" onClick={() => confirmDelete(note.id)} type="button">刪除</button>
            )}
          </div>
        </div>

        {editingNoteId === note.id ? (
          <div className="mt-3 grid gap-2">
            <input className="rounded-md border border-forest-100 bg-white px-3 py-2 font-bold" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            <textarea className="min-h-24 rounded-md border border-forest-100 bg-white px-3 py-2 font-bold" value={editBody} onChange={(event) => setEditBody(event.target.value)} />
            <div className="flex gap-2">
              <ActionButton tone="primary" onClick={() => saveEdit(note.id)}>儲存</ActionButton>
              <ActionButton tone="quiet" onClick={() => setEditingNoteId("")}>取消</ActionButton>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-lg font-bold leading-relaxed text-ink">{note.body}</p>
        )}

        <div className="mt-4 space-y-1 text-base font-bold text-stone-700">
          <p>來自：{teacherName(note.authorId, teachers)}</p>
          <p>對象：{teacherName(note.assigneeId, teachers)}</p>
          <p>提醒：{dueText(note)}</p>
          <p>更新：{note.updatedAt}</p>
        </div>

        <ActionBar subtle>
          <ActionButton tone="primary" onClick={() => onConvert(note.id)} disabled={Boolean(note.convertedTaskId)}>
            {note.convertedTaskId ? "已轉任務" : "轉正式任務"}
          </ActionButton>
          <select className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black" value={note.assigneeId ?? ""} onChange={(event) => onAssign(note.id, event.target.value)}>
            <option value="">教導處主任</option>
            <option value={ALL_STICKY_RECIPIENT_ID}>全體教師與主任</option>
            {teacherOptions.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
            ))}
          </select>
          <ActionButton tone="quiet" onClick={() => onSetStatus(note.id, "replied")}>標記已回覆</ActionButton>
        </ActionBar>
      </article>
    );
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="sticky">
      <div>
        <p className="text-xl font-bold text-forest-700">主任端與教師端的簡易訊息交流</p>
        <h2 className="text-4xl font-black">便利貼交流牆</h2>
      </div>

      <div className="mt-5 rounded-lg border border-forest-100 bg-warm p-4">
        <h3 className="text-2xl font-black">新增便利貼</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
          <input className="rounded-md border border-forest-100 bg-white px-4 py-3 text-lg font-bold" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="標題" />
          <select className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            <option value="">教導處主任</option>
            <option value={ALL_STICKY_RECIPIENT_ID}>全體教師與主任</option>
            {teacherOptions.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
            ))}
          </select>
          <input className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <textarea className="mt-3 min-h-28 w-full rounded-md border border-forest-100 bg-white px-4 py-3 text-lg font-bold" value={body} onChange={(event) => setBody(event.target.value)} placeholder="內容" />
        <div className="mt-3 flex flex-wrap gap-2">
          <select className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black" value={color} onChange={(event) => setColor(event.target.value as StickyColor)}>
            <option value="yellow">黃色提醒</option>
            <option value="blue">藍色想法</option>
            <option value="green">綠色已處理</option>
            <option value="red">紅色急件</option>
            <option value="pink">粉色討論</option>
          </select>
          <ActionButton tone="primary" onClick={submitNote}>發布便利貼</ActionButton>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <select className="rounded-md border border-forest-100 bg-rice px-3 py-2 text-base font-black" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | StickyNote["status"])}>
          <option value="all">全部狀態</option>
          <option value="normal">未處理</option>
          <option value="replied">已回覆</option>
          <option value="archived">已封存</option>
        </select>
        <select className="rounded-md border border-forest-100 bg-rice px-3 py-2 text-base font-black" value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)}>
          <option value="all">全部對象</option>
          <option value="">教導處主任</option>
          <option value={ALL_STICKY_RECIPIENT_ID}>全體教師與主任</option>
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
