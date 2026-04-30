"use client";

import type { StickyNote, Teacher } from "@/lib/types";
import { getDaysLeft } from "@/lib/reminders";
import { ActionBar, ActionButton } from "./ActionBar";

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

export function StickyWall({ notes, teachers, onToggle, onConvert, onAssign }: StickyWallProps) {
  const teacherOptions = teachers.filter((teacher) => teacher.role !== "主任");

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft" id="sticky">
      <div>
        <p className="text-xl font-bold text-forest-700">共筆便利貼升級版</p>
        <h2 className="text-4xl font-black">輕任務牆</h2>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {notes.map((note) => {
          const assignee = teachers.find((teacher) => teacher.id === note.assigneeId);
          const daysLeft = note.dueDate ? getDaysLeft(note.dueDate) : undefined;
          return (
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
                <p>指派：{assignee?.name ?? "未指派"}</p>
                <p>
                  截止：
                  {note.dueDate
                    ? daysLeft !== undefined && daysLeft < 0
                      ? `逾期 ${Math.abs(daysLeft)} 天`
                      : `剩 ${daysLeft} 天`
                    : "未設定"}
                </p>
              </div>
              <ActionBar subtle>
                <ActionButton
                  tone="primary"
                  onClick={() => onConvert(note.id)}
                  disabled={Boolean(note.convertedTaskId)}
                >
                  {note.convertedTaskId ? "已轉任務" : "轉正式任務"}
                </ActionButton>
                <select
                  className="rounded-md border border-forest-100 bg-white px-3 py-2 text-base font-black"
                  value={note.assigneeId ?? ""}
                  onChange={(event) => onAssign(note.id, event.target.value)}
                  aria-label="便利貼指派"
                >
                  <option value="">指派</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
                <ActionButton tone="quiet" onClick={() => onToggle(note.id)}>
                  完成
                </ActionButton>
              </ActionBar>
            </article>
          );
        })}
      </div>
    </section>
  );
}
