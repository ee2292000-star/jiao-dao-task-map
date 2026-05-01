"use client";

import { useEffect, useState } from "react";
import type { Teacher } from "@/lib/types";
import { ActionButton } from "./ActionBar";

type TeacherDraft = {
  name: string;
  role: string;
  teachingScope: string;
  enabled: boolean;
};

type TeacherManagementProps = {
  teachers: Teacher[];
  onCreateTeacher: (input: TeacherDraft) => void;
  onUpdateTeacher: (teacherId: string, input: TeacherDraft) => void;
  onDeleteTeacher: (teacherId: string) => void;
};

const emptyDraft: TeacherDraft = {
  name: "",
  role: "教師",
  teachingScope: "",
  enabled: true
};

export function TeacherManagement({
  teachers,
  onCreateTeacher,
  onUpdateTeacher,
  onDeleteTeacher
}: TeacherManagementProps) {
  const [draft, setDraft] = useState<TeacherDraft>(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const editingTeacher = teachers.find((teacher) => teacher.id === editingId);

  useEffect(() => {
    if (!editingTeacher) return;
    setDraft({
      name: editingTeacher.name,
      role: editingTeacher.role,
      teachingScope: editingTeacher.teachingScope ?? "",
      enabled: editingTeacher.enabled ?? true
    });
  }, [editingTeacher]);

  function resetForm() {
    setDraft(emptyDraft);
    setEditingId("");
  }

  function submit() {
    const name = draft.name.trim();
    if (!name) return;
    const payload = { ...draft, name, role: draft.role.trim() || "教師" };
    if (editingId) {
      onUpdateTeacher(editingId, payload);
    } else {
      onCreateTeacher(payload);
    }
    resetForm();
  }

  return (
    <section className="rounded-lg border border-forest-100 bg-white p-5 shadow-soft" id="settings">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xl font-black text-forest-700">系統設定</p>
          <h2 className="text-4xl font-black text-ink">教師管理</h2>
        </div>
        <p className="rounded-md bg-forest-50 px-4 py-3 text-lg font-bold text-forest-800">
          任務指派會讀取這份正式名單
        </p>
      </div>

      <div className="mt-5 grid gap-4 rounded-lg bg-warm p-4 lg:grid-cols-[1fr_180px_1fr_140px]">
        <input
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold"
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          placeholder="教師姓名"
          aria-label="教師姓名"
        />
        <input
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold"
          value={draft.role}
          onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
          placeholder="職稱 / 角色"
          aria-label="職稱或角色"
        />
        <input
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold"
          value={draft.teachingScope}
          onChange={(event) =>
            setDraft((current) => ({ ...current, teachingScope: event.target.value }))
          }
          placeholder="任教班級或負責領域"
          aria-label="任教班級或負責領域"
        />
        <label className="flex items-center justify-center gap-2 rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-black">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
          />
          啟用
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton tone="primary" onClick={submit}>
          {editingId ? "儲存教師" : "新增教師"}
        </ActionButton>
        {editingId && (
          <ActionButton tone="quiet" onClick={resetForm}>
            取消編輯
          </ActionButton>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {teachers.length ? (
          teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="grid gap-3 rounded-lg border border-forest-100 bg-rice p-4 lg:grid-cols-[1fr_160px_1fr_120px_180px] lg:items-center"
            >
              <p className="text-2xl font-black text-ink">{teacher.name}</p>
              <p className="text-lg font-bold text-stone-700">{teacher.role}</p>
              <p className="text-lg font-bold text-stone-700">
                {teacher.teachingScope || "未設定負責領域"}
              </p>
              <p className="text-lg font-black text-forest-800">
                {teacher.enabled === false ? "停用" : "啟用"}
              </p>
              <div className="flex flex-wrap gap-2">
                <ActionButton tone="quiet" onClick={() => setEditingId(teacher.id)}>
                  編輯
                </ActionButton>
                <ActionButton tone="warm" onClick={() => onDeleteTeacher(teacher.id)}>
                  刪除
                </ActionButton>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-rice p-5 text-2xl font-black text-forest-800">
            尚未建立教師資料
          </p>
        )}
      </div>
    </section>
  );
}
