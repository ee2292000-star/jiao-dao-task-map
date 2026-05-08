"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuthRole, Task, Teacher, TeacherAccount } from "@/lib/types";
import { ActionButton } from "./ActionBar";

type TeacherDraft = {
  id?: string;
  name: string;
  role: string;
  teachingScope: string;
  enabled: boolean;
  avatar?: string;
};

type ManagementDraft = {
  accountId: string;
  teacherId: string;
  name: string;
  email: string;
  password: string;
  accountRole: AuthRole;
  enabled: boolean;
  teachingScope: string;
};

type TeacherManagementProps = {
  teachers: Teacher[];
  tasks: Task[];
  onCreateTeacher: (input: TeacherDraft) => void;
  onUpdateTeacher: (teacherId: string, input: TeacherDraft) => void;
  onDeleteTeacher: (teacherId: string) => void;
};

const emptyDraft: ManagementDraft = {
  accountId: "",
  teacherId: "",
  name: "",
  email: "",
  password: "",
  accountRole: "teacher",
  enabled: true,
  teachingScope: ""
};

function teacherAvatar(name: string) {
  return name.trim().slice(0, 1) || "師";
}

function teacherPayload(id: string, name: string, teachingScope: string, enabled: boolean): TeacherDraft {
  return {
    id,
    name,
    role: "教師",
    teachingScope,
    enabled,
    avatar: teacherAvatar(name)
  };
}

export function TeacherManagement({
  teachers,
  tasks,
  onCreateTeacher,
  onUpdateTeacher,
  onDeleteTeacher
}: TeacherManagementProps) {
  const [accounts, setAccounts] = useState<TeacherAccount[]>([]);
  const [draft, setDraft] = useState<ManagementDraft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const taskStats = useMemo(() => {
    const emptyStats = { total: 0, done: 0, doing: 0, todo: 0, waiting: 0, review: 0, archived: 0 };
    const stats = new Map<string, typeof emptyStats>();
    teachers.forEach((teacher) => stats.set(teacher.id, { ...emptyStats }));
    tasks.forEach((task) => {
      const ids = new Set([task.assignedTo, ...task.ownerIds, ...task.assignees].filter(Boolean) as string[]);
      ids.forEach((id) => {
        const current = stats.get(id) ?? { ...emptyStats };
        current.total += 1;
        current[task.status] += 1;
        stats.set(id, current);
      });
    });
    return stats;
  }, [tasks, teachers]);

  function ensureTeacherRecord(account: TeacherAccount) {
    if (account.role !== "teacher" || !account.enabled) return;
    const teacherId = account.teacherId || `teacher-${account.id}`;
    const exists = teachers.some((teacher) => teacher.id === teacherId);
    if (!exists) {
      onCreateTeacher(teacherPayload(teacherId, account.name, "", account.enabled));
    }
  }

  async function loadAccounts() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/teacher-accounts");
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "無法讀取教師帳號。");
        return;
      }

      const nextAccounts = (result.accounts ?? []) as TeacherAccount[];
      setAccounts(nextAccounts);
      nextAccounts.forEach(ensureTeacherRecord);
    } catch {
      setMessage("教師帳號暫時無法讀取，請稍後再試。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setDraft(emptyDraft);
    setMessage("");
  }

  function edit(account: TeacherAccount) {
    const teacher = teachers.find((item) => item.id === account.teacherId);
    setDraft({
      accountId: account.id,
      teacherId: account.teacherId ?? "",
      name: account.name,
      email: account.email,
      password: "",
      accountRole: account.role,
      enabled: account.enabled,
      teachingScope: teacher?.teachingScope ?? ""
    });
    setMessage("已載入教師資料，可直接修改；密碼留空代表不變更。");
  }

  async function saveAccount(nextDraft: ManagementDraft, teacherId: string) {
    const method = nextDraft.accountId ? "PATCH" : "POST";
    const response = await fetch("/api/teacher-accounts", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: nextDraft.accountId,
        teacherId: nextDraft.accountRole === "teacher" ? teacherId : "",
        name: nextDraft.name,
        email: nextDraft.email,
        password: nextDraft.password,
        role: nextDraft.accountRole,
        enabled: nextDraft.enabled
      })
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "儲存教師帳號失敗。");
    }

    return result.account as TeacherAccount;
  }

  async function submit() {
    const name = draft.name.trim();
    const email = draft.email.trim().toLowerCase();
    if (!name || !email) {
      setMessage("請輸入教師姓名與 Email。");
      return;
    }
    if (!draft.accountId && draft.password.length < 4) {
      setMessage("初始密碼至少需要 4 個字。");
      return;
    }

    const teacherId = draft.teacherId || (draft.accountRole === "teacher" ? `teacher-${Date.now()}` : "");

    try {
      if (draft.accountRole === "teacher") {
        const payload = teacherPayload(teacherId, name, draft.teachingScope, draft.enabled);
        if (teachers.some((teacher) => teacher.id === teacherId)) {
          onUpdateTeacher(teacherId, payload);
        } else {
          onCreateTeacher(payload);
        }
      }

      const saved = await saveAccount({ ...draft, name, email }, teacherId);
      setAccounts((current) =>
        draft.accountId
          ? current.map((account) => (account.id === saved.id ? saved : account))
          : [saved, ...current]
      );
      setDraft(emptyDraft);
      setMessage(draft.accountId ? "教師資料已更新。" : "已新增教師，登入帳號也建立完成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "教師資料儲存失敗。");
    }
  }

  async function remove(account: TeacherAccount) {
    if (!window.confirm(`確定要刪除 ${account.name} 嗎？此教師將無法登入，相關任務會改為尚未指派。`)) return;

    const response = await fetch(`/api/teacher-accounts?id=${account.id}`, { method: "DELETE" });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error ?? "刪除失敗。");
      return;
    }

    if (account.teacherId) onDeleteTeacher(account.teacherId);
    setAccounts((current) => current.filter((item) => item.id !== account.id));
    setMessage("教師資料已刪除。");
  }

  async function toggleEnabled(account: TeacherAccount) {
    const teacher = teachers.find((item) => item.id === account.teacherId);
    const saved = await saveAccount(
      {
        accountId: account.id,
        teacherId: account.teacherId ?? "",
        name: account.name,
        email: account.email,
        password: "",
        accountRole: account.role,
        enabled: !account.enabled,
        teachingScope: teacher?.teachingScope ?? ""
      },
      account.teacherId ?? ""
    );
    setAccounts((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    if (account.teacherId && teacher) {
      onUpdateTeacher(account.teacherId, {
        name: teacher.name,
        role: teacher.role,
        teachingScope: teacher.teachingScope ?? "",
        enabled: saved.enabled,
        avatar: teacher.avatar
      });
    }
    setMessage(saved.enabled ? "教師帳號已啟用。" : "教師帳號已停用。");
  }

  return (
    <section className="rounded-lg border border-forest-100 bg-white p-5 shadow-soft" id="settings">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xl font-black text-forest-700">系統設定</p>
          <h2 className="text-4xl font-black text-ink">教師管理</h2>
        </div>
        <p className="rounded-md bg-forest-50 px-4 py-3 text-lg font-bold text-forest-800">
          主任可建立教師資料與登入帳號，停用後教師將無法登入。
        </p>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg bg-warm p-4 xl:grid-cols-[1fr_1fr_150px_1fr_130px]">
        <input
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold"
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          placeholder="教師姓名"
        />
        <input
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold"
          type="email"
          value={draft.email}
          onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
          placeholder="teacher@school.edu.tw"
        />
        <select
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold"
          value={draft.accountRole}
          onChange={(event) =>
            setDraft((current) => ({ ...current, accountRole: event.target.value as AuthRole }))
          }
        >
          <option value="teacher">教師</option>
          <option value="admin">主任</option>
        </select>
        <input
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold"
          type="password"
          value={draft.password}
          onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
          placeholder={draft.accountId ? "留空代表不變更密碼" : "初始密碼"}
        />
        <label className="flex items-center justify-center gap-2 rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-black">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
          />
          啟用
        </label>
        <input
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold xl:col-span-5"
          value={draft.teachingScope}
          onChange={(event) =>
            setDraft((current) => ({ ...current, teachingScope: event.target.value }))
          }
          placeholder="任教班級或負責領域，例如：五年級、資訊、生活教育"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ActionButton tone="primary" onClick={submit}>
          {draft.accountId ? "儲存教師資料" : "新增教師"}
        </ActionButton>
        {draft.accountId && (
          <ActionButton tone="quiet" onClick={resetForm}>
            取消編輯
          </ActionButton>
        )}
        <ActionButton tone="quiet" onClick={loadAccounts}>
          重新整理
        </ActionButton>
        {isLoading && <p className="text-lg font-black text-forest-700">讀取中...</p>}
      </div>

      {message && (
        <p className="mt-3 rounded-md bg-forest-50 px-4 py-3 text-lg font-black text-forest-800">
          {message}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {accounts.length ? (
          accounts.map((account) => {
            const stats = account.teacherId ? taskStats.get(account.teacherId) : undefined;
            const teacherTasks = account.teacherId
              ? tasks.filter((task) =>
                  [task.assignedTo, ...task.ownerIds, ...task.assignees].includes(account.teacherId!)
                )
              : [];
            return (
              <div key={account.id} className="rounded-lg border border-forest-100 bg-rice p-4">
                <div className="grid gap-3 xl:grid-cols-[1fr_1fr_130px_170px_220px] xl:items-center">
                  <div>
                    <p className="text-2xl font-black text-ink">{account.name}</p>
                    <p className="text-base font-bold text-stone-600">{account.email}</p>
                  </div>
                  <p className="text-lg font-bold text-stone-700">
                    任務 {stats?.total ?? 0} 件，完成 {stats?.done ?? 0}，進行中 {stats?.doing ?? 0}
                  </p>
                  <p className="text-lg font-black text-forest-800">
                    {account.role === "admin" ? "主任" : "教師"}
                  </p>
                  <p className="text-lg font-black text-forest-800">
                    {account.enabled ? "啟用" : "停用"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton tone="quiet" onClick={() => edit(account)}>
                      編輯
                    </ActionButton>
                    <ActionButton tone="warm" onClick={() => toggleEnabled(account)}>
                      {account.enabled ? "停用" : "啟用"}
                    </ActionButton>
                    <ActionButton tone="warm" onClick={() => remove(account)}>
                      刪除
                    </ActionButton>
                  </div>
                </div>
                {teacherTasks.length > 0 && (
                  <div className="mt-3 rounded-md bg-white p-3">
                    <p className="text-base font-black text-forest-700">指派任務</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {teacherTasks.slice(0, 6).map((task) => (
                        <span
                          key={task.id}
                          className="rounded-md bg-forest-50 px-3 py-2 text-base font-bold text-ink"
                        >
                          {task.title} / {task.status}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="rounded-lg bg-rice p-5 text-2xl font-black text-forest-800">
            尚未建立教師資料
          </p>
        )}
      </div>
    </section>
  );
}
