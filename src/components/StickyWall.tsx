"use client";

import type { StickyNote, Teacher } from "@/lib/types";
import { getDaysLeft } from "@/lib/reminders";
import { ActionBar, ActionButton } from "./ActionBar";

const ALL_STICKY_RECIPIENT_ID = "__all__";

type StickyWallProps = {
  notes: StickyNote[];
  teachers: Teacher[];
  onToggle: (noteId: string) => void;
  onConvert: (noteId: string) => void;
  onAssign: (noteId: string, teacherId: string) => void;
};

const colorClass: Record<StickyNote["color"], string> = {
  yellow: "bg-yellow-100 border-yellow-200",
  pink: "bg-pink-100 border-pink-200",
  green: "bg-green-100 border-green-200",
  blue: "bg-blue-100 border-blue-200"
};

function teacherName(id: string | undefined, teachers: Teacher[]) {
  if (id === ALL_STICKY_RECIPIENT_ID) return "全體教師與主任";
  if (!id) return "教導處主任";
  return teachers.find((teacher) => teacher.id === id)?.name ?? "未指定對象";
}

function dueText(note: StickyNote) {
  if (!note.dueDate) return "沒有設定提醒日";
  const daysLeft = getDaysLeft(note.dueDate);
  if (daysLeft < 0) return `已逾期 ${Math.abs(daysLeft)} 天`;
  if (daysLeft === 0) return "今天提醒";
  return `剩 ${daysLeft} 天`;
}

export function StickyWall({ notes, teachers, onToggle, onConvert, onAssign }: StickyWallProps) {
  const teacherOptions = teachers.filter((teacher) => teacher.enabled !== false);

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="sticky">
      <div>
        <p className="text-xl font-bold text-forest-700">協作訊息、提醒、想法集中區</p>
        <h2 className="text-4xl font-black">共筆便利貼</h2>
      </div>

      {!notes.length && (
        <p className="mt-5 rounded-lg bg-rice p-5 text-2xl font-black text-forest-800">
          目前沒有便利貼。教師可從教師端送出訊息給主任或同事。
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {notes.map((note) => (
          <article key={note.id} className={`rounded-lg border p-4 ${colorClass[note.color]}`}>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-2 size-5"
                checked={note.done}
                onChange={() => onToggle(note.id)}
              />
              <span className={`text-xl font-black leading-snug ${note.done ? "line-through opacity-60" : ""}`}>
                {note.body}
              </span>
            </label>

            <div className="mt-4 space-y-2 text-lg font-bold">
              <p>來自：{teacherName(note.authorId, teachers)}</p>
              <p>收件：{teacherName(note.assigneeId, teachers)}</p>
              <p>提醒：{dueText(note)}</p>
              <p className="text-base text-stone-600">建立：{note.createdAt}</p>
            </div>

            <ActionBar subtle>
              <ActionButton tone="primary" onClick={() => onConvert(note.id)} disabled={Boolean(note.convertedTaskId)}>
                {note.convertedTaskId ? "已轉任務" : "轉正式任務"}
              </ActionButton>
              <select
                className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black"
                value={note.assigneeId ?? ""}
                onChange={(event) => onAssign(note.id, event.target.value)}
                aria-label="便利貼收件對象"
              >
                <option value="">教導處主任</option>
                <option value={ALL_STICKY_RECIPIENT_ID}>全體教師與主任</option>
                {teacherOptions.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
              <ActionButton tone="quiet" onClick={() => onToggle(note.id)}>
                {note.done ? "重新開啟" : "完成"}
              </ActionButton>
            </ActionBar>
          </article>
        ))}
      </div>
    </section>
  );
}
