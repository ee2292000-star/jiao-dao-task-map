"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setMessage("請輸入 Email 與密碼。");
      return;
    }

    setIsSigningIn(true);
    setMessage("");

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl: "/auth/redirect"
    });

    setIsSigningIn(false);

    if (result?.error) {
      setMessage("帳號或密碼不正確，請再確認一次。");
      return;
    }

    router.replace(result?.url ?? "/auth/redirect");
  }

  return (
    <main className="min-h-screen bg-rice px-5 py-10 text-ink">
      <section className="mx-auto max-w-xl rounded-lg border border-forest-100 bg-white p-6 shadow-soft">
        <p className="text-xl font-black text-forest-700">教導處任務地圖</p>
        <h1 className="mt-2 text-4xl font-black">登入系統</h1>
        <p className="mt-3 text-lg font-bold text-stone-700">
          請使用學校 Email 與密碼登入。主任會進入主任工作駕駛艙，教師只會看到自己的任務。
        </p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-lg font-black">
            Email
            <input
              className="rounded-md border border-forest-100 bg-warm px-4 py-3 text-xl font-bold"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@school.edu.tw"
              autoComplete="email"
            />
          </label>
          <label className="grid gap-2 text-lg font-black">
            密碼
            <input
              className="rounded-md border border-forest-100 bg-warm px-4 py-3 text-xl font-bold"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="請輸入密碼"
              autoComplete="current-password"
            />
          </label>
          {message && (
            <p className="rounded-md bg-forest-50 px-4 py-3 text-lg font-black text-forest-800">
              {message}
            </p>
          )}
          <button
            className="rounded-md bg-forest-700 px-5 py-3 text-xl font-black text-white hover:bg-forest-800 disabled:opacity-60"
            disabled={isSigningIn}
          >
            {isSigningIn ? "登入中..." : "登入"}
          </button>
        </form>
      </section>
    </main>
  );
}
