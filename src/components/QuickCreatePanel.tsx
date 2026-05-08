"use client";

import { useState } from "react";
import type { EventTemplate, Priority, StickyColor, Teacher } from "@/lib/types";
import { ActionButton } from "./ActionBar";

type QuickTaskInput = {
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  priority: Priority;
  isCritical: boolean;
};

type QuickNoteInput = {
  body: string;
  assigneeId: string;
  dueDate: string;
  color: StickyColor;
};

type QuickEventInput = {
  name: string;
  endDate: string;
  templateId: string;
};

type QuickCreatePanelProps = {
  teachers: Teacher[];
  templates: EventTemplate[];
  onCreateTask: (input: QuickTaskInput) => void;
  onCreateNote: (input: QuickNoteInput) => void;
  onCreateEvent: (input: QuickEventInput) => void;
};

function getTodayString() {
  return new Date().toLocaleDateString("sv-SE");
}

function addDaysString(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("sv-SE");
}

export function QuickCreatePanel({ teachers, templates, onCreateTask, onCreateNote, onCreateEvent }: QuickCreatePanelProps) {
  const teacherOptions = teachers.filter((teacher) => teacher.enabled !== false);
  const today = getTodayString();
  const defaultDueDate = addDaysString(6);
  const [taskInput, setTaskInput] = useState<QuickTaskInput>({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: defaultDueDate,
    priority: "normal",
    isCritical: false
  });
  const [noteInput, setNoteInput] = useState<QuickNoteInput>({
    body: "",
    assigneeId: "",
    dueDate: defaultDueDate,
    color: "yellow"
  });
  const [eventInput, setEventInput] = useState<QuickEventInput>({
    name: "",
    endDate: "2026-06-30",
    templateId: templates[0]?.id ?? ""
  });

  function submitTask() {
    if (!taskInput.title.trim()) return;
    onCreateTask({ ...taskInput, title: taskInput.title.trim() });
    setTaskInput({ title: "", description: "", assigneeId: "", dueDate: defaultDueDate, priority: "normal", isCritical: false });
  }

  function submitNote() {
    if (!noteInput.body.trim()) return;
    onCreateNote({ ...noteInput, body: noteInput.body.trim() });
    setNoteInput({ body: "", assigneeId: "", dueDate: defaultDueDate, color: "yellow" });
  }

  function submitEvent() {
    if (!eventInput.name.trim()) return;
    onCreateEvent({ ...eventInput, name: eventInput.name.trim() });
    setEventInput({ name: "", endDate: "2026-06-30", templateId: templates[0]?.id ?? "" });
  }

  return (
    <section className="grid gap-5 xl:grid-cols-3" id="quick-create">
      <div className="rounded-lg border border-forest-100 bg-white p-5 shadow-soft">
        <p className="text-xl font-black text-forest-700">新增任務</p>
        <h2 className="mt-1 text-3xl font-black text-ink">把要處理的事放進任務看板</h2>
        <div className="mt-4 grid gap-3">
          <input className="rounded-md border border-forest-100 bg-warm px-4 py-3 text-xl font-bold" value={taskInput.title} onChange={(event) => setTaskInput((current) => ({ ...current, title: event.target.value }))} placeholder="任務名稱" />
          <textarea className="min-h-24 rounded-md border border-forest-100 bg-warm px-4 py-3 text-lg font-bold" value={taskInput.description} onChange={(event) => setTaskInput((current) => ({ ...current, description: event.target.value }))} placeholder="任務說明，可先空著" />
          <div className="grid gap-3 md:grid-cols-4">
            <select className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" value={taskInput.assigneeId} onChange={(event) => setTaskInput((current) => ({ ...current, assigneeId: event.target.value }))}>
              <option value="">先不指派</option>
              {teacherOptions.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
            <input className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" type="date" min={today} value={taskInput.dueDate} onChange={(event) => setTaskInput((current) => ({ ...current, dueDate: event.target.value }))} />
            <select className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" value={taskInput.priority} onChange={(event) => setTaskInput((current) => ({ ...current, priority: event.target.value as Priority }))}>
              <option value="normal">一般</option>
              <option value="high">優先</option>
              <option value="low">低</option>
            </select>
            <label className="flex items-center justify-center gap-2 rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black">
              <input type="checkbox" checked={taskInput.isCritical} onChange={(event) => setTaskInput((current) => ({ ...current, isCritical: event.target.checked }))} />
              關鍵
            </label>
          </div>
          <ActionButton tone="primary" onClick={submitTask}>新增任務</ActionButton>
        </div>
      </div>

      <div className="rounded-lg border border-forest-100 bg-white p-5 shadow-soft">
        <p className="text-xl font-black text-forest-700">交流便利貼</p>
        <h2 className="mt-1 text-3xl font-black text-ink">先記下來，也能轉成任務</h2>
        <div className="mt-4 grid gap-3">
          <textarea className="min-h-32 rounded-md border border-forest-100 bg-warm px-4 py-3 text-xl font-bold" value={noteInput.body} onChange={(event) => setNoteInput((current) => ({ ...current, body: event.target.value }))} placeholder="便利貼內容，例如：請主任確認活動座位圖" />
          <div className="grid gap-3 md:grid-cols-3">
            <select className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" value={noteInput.assigneeId} onChange={(event) => setNoteInput((current) => ({ ...current, assigneeId: event.target.value }))}>
              <option value="">給主任</option>
              {teacherOptions.map((teacher) => <option key={teacher.id} value={teacher.id}>給{teacher.name}</option>)}
            </select>
            <input className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" type="date" min={today} value={noteInput.dueDate} onChange={(event) => setNoteInput((current) => ({ ...current, dueDate: event.target.value }))} />
            <select className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" value={noteInput.color} onChange={(event) => setNoteInput((current) => ({ ...current, color: event.target.value as StickyColor }))}>
              <option value="yellow">提醒</option>
              <option value="blue">想法</option>
              <option value="pink">問題</option>
              <option value="green">回報</option>
              <option value="red">急件</option>
            </select>
          </div>
          <ActionButton tone="primary" onClick={submitNote}>新增交流便利貼</ActionButton>
        </div>
      </div>

      <div className="rounded-lg border border-forest-100 bg-white p-5 shadow-soft">
        <p className="text-xl font-black text-forest-700">新增活動</p>
        <h2 className="mt-1 text-3xl font-black text-ink">套用行政模板產生任務</h2>
        <div className="mt-4 grid gap-3">
          <input className="rounded-md border border-forest-100 bg-warm px-4 py-3 text-xl font-bold" value={eventInput.name} onChange={(event) => setEventInput((current) => ({ ...current, name: event.target.value }))} placeholder="活動名稱" />
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" type="date" min={today} value={eventInput.endDate} onChange={(event) => setEventInput((current) => ({ ...current, endDate: event.target.value }))} />
            <select className="rounded-md border border-forest-100 bg-warm px-3 py-3 text-base font-black" value={eventInput.templateId} onChange={(event) => setEventInput((current) => ({ ...current, templateId: event.target.value }))}>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </div>
          <p className="rounded-md bg-forest-50 p-3 text-base font-bold text-forest-800">
            選擇活動模板後，系統會依活動日期產生相關任務，主任仍可再調整分工與期限。
          </p>
          <ActionButton tone="primary" onClick={submitEvent}>新增活動並產生任務</ActionButton>
        </div>
      </div>
    </section>
  );
}
