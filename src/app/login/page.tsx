"use client";

import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    searchParams.get("sent") ? "請至信箱點擊登入連結。" : ""
  );
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setIsSending(true);
    setMessage("");

    const result = await signIn("email", {
      email: email.trim(),
      redirect: false,
      callbackUrl: "/auth/redirect"
    });

    setIsSending(false);
    setMessage(result?.error ? "登入信寄送失敗，請確認 Email 設定。" : "請至信箱點擊登入連結。");
  }

  return (
    <section className="mx-auto max-w-xl rounded-lg border border-forest-100 bg-white p-6 shadow-soft">
      <p className="text-xl font-black text-forest-700">教導處任務地圖</p>
      <h1 className="mt-2 text-4xl font-black">Email 登入</h1>
      <p className="mt-3 text-lg font-bold text-stone-700">
        請輸入學校信箱，系統會寄出登入連結。點擊信件後，就能依身分進入主任端或教師端。
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
        {message && (
          <p className="rounded-md bg-forest-50 px-4 py-3 text-lg font-black text-forest-800">
            {message}
          </p>
        )}
        <button
          className="rounded-md bg-forest-700 px-5 py-3 text-xl font-black text-white hover:bg-forest-800 disabled:opacity-60"
          disabled={isSending}
        >
          {isSending ? "寄送中..." : "寄送登入連結"}
        </button>
      </form>
    </section>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-rice px-5 py-10 text-ink">
      <Suspense
        fallback={
          <section className="mx-auto max-w-xl rounded-lg border border-forest-100 bg-white p-6 shadow-soft">
            <p className="text-xl font-black text-forest-700">教導處任務地圖</p>
            <h1 className="mt-2 text-4xl font-black">準備登入中...</h1>
          </section>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
