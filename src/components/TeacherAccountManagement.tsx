"use client";

import { useEffect, useState } from "react";
import type { Teacher, TeacherAccount } from "@/lib/types";
import { ActionButton } from "./ActionBar";

type Draft = {
  id: string;
  teacherId: string;
  name: string;
  email: string;
  password: string;
  enabled: boolean;
};

const emptyDraft: Draft = {
  id: "",
  teacherId: "",
  name: "",
  email: "",
  password: "",
  enabled: true
};

export function TeacherAccountManagement({ teachers }: { teachers: Teacher[] }) {
  const [accounts, setAccounts] = useState<TeacherAccount[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadAccounts() {
    setIsLoading(true);
    setMessage("");
    const response = await fetch("/api/teacher-accounts");
    const result = await response.json();
    setIsLoading(false);

    if (!response.ok) {
      setMessage(result.error ?? "教師帳號讀取失敗。");
      return;
    }

    setAccounts(result.accounts ?? []);
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  function edit(account: TeacherAccount) {
    setDraft({
      id: account.id,
      teacherId: account.teacherId ?? "",
      name: account.name,
      email: account.email,
      password: "",
      enabled: account.enabled
    });
    setMessage("正在編輯教師帳號；密碼欄空白代表不變更。");
  }

  function reset() {
    setDraft(emptyDraft);
    setMessage("");
  }

  async function submit() {
    if (!draft.name.trim() || !draft.email.trim()) {
      setMessage("請輸入教師姓名與 Email。");
      return;
    }
    if (!draft.id && draft.password.length < 4) {
      setMessage("新增帳號時密碼至少 4 碼。");
      return;
    }

    const method = draft.id ? "PATCH" : "POST";
    const response = await fetch("/api/teacher-accounts", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error ?? "帳號儲存失敗。");
      return;
    }

    const saved = result.account as TeacherAccount;
    setAccounts((current) =>
      draft.id ? current.map((account) => (account.id === saved.id ? saved : account)) : [saved, ...current]
    );
    setDraft(emptyDraft);
    setMessage(draft.id ? "教師帳號已更新。" : "教師帳號已新增，老師可以用 Email 與密碼登入。");
  }

  async function remove(account: TeacherAccount) {
    if (!window.confirm(`確定要刪除 ${account.name} 的登入帳號嗎？`)) return;

    const response = await fetch(`/api/teacher-accounts?id=${account.id}`, { method: "DELETE" });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error ?? "帳號刪除失敗。");
      return;
    }

    setAccounts((current) => current.filter((item) => item.id !== account.id));
    setMessage("教師登入帳號已刪除。");
  }

  return (
    <section className="rounded-lg border border-forest-100 bg-white p-5 shadow-soft" id="teacher-accounts">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xl font-black text-forest-700">系統設定</p>
          <h2 className="text-4xl font-black text-ink">教師登入帳號</h2>
        </div>
        <p className="rounded-md bg-forest-50 px-4 py-3 text-lg font-bold text-forest-800">
          主任可建立教師 Email 與初始密碼，停用後教師將無法登入。
        </p>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg bg-warm p-4 xl:grid-cols-[1fr_1fr_1fr_180px_130px]">
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
        <input
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold"
          type="password"
          value={draft.password}
          onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
          placeholder={draft.id ? "新密碼，可空白" : "初始密碼"}
        />
        <select
          className="rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-bold"
          value={draft.teacherId}
          onChange={(event) => setDraft((current) => ({ ...current, teacherId: event.target.value }))}
        >
          <option value="">不綁定教師資料</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
        <label className="flex items-center justify-center gap-2 rounded-md border border-forest-100 bg-white px-3 py-3 text-lg font-black">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
          />
          啟用
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ActionButton tone="primary" onClick={submit}>
          {draft.id ? "儲存帳號" : "新增帳號"}
        </ActionButton>
        {draft.id && (
          <ActionButton tone="quiet" onClick={reset}>
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
          accounts.map((account) => (
            <div
              key={account.id}
              className="grid gap-3 rounded-lg border border-forest-100 bg-rice p-4 xl:grid-cols-[1fr_1fr_130px_190px] xl:items-center"
            >
              <div>
                <p className="text-2xl font-black text-ink">{account.name}</p>
                <p className="text-base font-bold text-stone-600">
                  {account.teacherId ? "已綁定教師資料" : "未綁定教師資料"}
                </p>
              </div>
              <p className="text-lg font-bold text-stone-700">{account.email}</p>
              <p className="text-lg font-black text-forest-800">
                {account.enabled ? "可登入" : "已停用"}
              </p>
              <div className="flex flex-wrap gap-2">
                <ActionButton tone="quiet" onClick={() => edit(account)}>
                  編輯
                </ActionButton>
                <ActionButton tone="warm" onClick={() => remove(account)}>
                  刪除
                </ActionButton>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-rice p-5 text-2xl font-black text-forest-800">
            尚未建立教師登入帳號
          </p>
        )}
      </div>
    </section>
  );
}
