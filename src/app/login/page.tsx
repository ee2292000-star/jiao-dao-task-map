"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_STORAGE_KEY, findUser, publicUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) router.replace("/");
  }, [router]);

  function handleLogin() {
    const user = findUser(username, password);
    if (!user) {
      setMessage("帳號或密碼不正確。");
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(publicUser(user)));
    router.replace("/");
  }

  return (
    <main className="min-h-screen bg-rice px-5 py-10 text-ink">
      <section className="mx-auto max-w-xl rounded-lg border border-forest-100 bg-white p-6 shadow-soft">
        <p className="text-xl font-black text-forest-700">教導處任務地圖</p>
        <h1 className="mt-2 text-4xl font-black">登入系統</h1>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-lg font-black">
            帳號
            <input
              className="rounded-md border border-forest-100 bg-warm px-4 py-3 text-xl font-bold"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin 或 teacher1"
              autoComplete="username"
            />
          </label>
          <label className="grid gap-2 text-lg font-black">
            密碼
            <input
              className="rounded-md border border-forest-100 bg-warm px-4 py-3 text-xl font-bold"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="1234"
              autoComplete="current-password"
              onKeyDown={(event) => {
                if (event.key === "Enter") handleLogin();
              }}
            />
          </label>
          {message && (
            <p className="rounded-md bg-red-50 px-4 py-3 text-lg font-black text-red-700">
              {message}
            </p>
          )}
          <button
            className="rounded-md bg-forest-700 px-5 py-3 text-xl font-black text-white hover:bg-forest-800"
            onClick={handleLogin}
          >
            登入
          </button>
        </div>
        <div className="mt-6 rounded-md bg-forest-50 p-4 text-base font-bold text-forest-800">
          測試帳號：admin / 1234，teacher1 / 1234
        </div>
      </section>
    </main>
  );
}
