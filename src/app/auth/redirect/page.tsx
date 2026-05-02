"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AuthRedirectPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    router.replace(session.user.role === "admin" ? "/admin/dashboard" : "/teacher/dashboard");
  }, [router, session, status]);

  return (
    <main className="grid min-h-screen place-items-center bg-rice p-6 text-ink">
      <div className="rounded-lg bg-white p-6 text-2xl font-black text-forest-800 shadow-soft">
        正在進入系統...
      </div>
    </main>
  );
}
