import { SupabaseAdapter } from "@auth/supabase-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";

function userRole(email?: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  return email?.toLowerCase() === adminEmail ? "admin" : "teacher";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendResendMagicLink({
  identifier,
  url,
  from
}: {
  identifier: string;
  url: string;
  from: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  const safeUrl = escapeHtml(url);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: identifier,
      subject: "登入教導處任務地圖",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #1f2933;">
          <h1 style="font-size: 24px; margin-bottom: 12px;">教導處任務地圖</h1>
          <p>請點擊下方按鈕完成登入。</p>
          <p>
            <a href="${safeUrl}" style="display: inline-block; background: #2f6846; color: white; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">
              登入系統
            </a>
          </p>
          <p style="color: #6b7280;">如果不是你本人操作，可以忽略這封信。</p>
        </div>
      `,
      text: `請開啟以下連結登入教導處任務地圖：${url}`
    })
  });

  if (!response.ok) {
    throw new Error(`Resend failed: ${await response.text()}`);
  }
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const authOptions: NextAuthOptions = {
  adapter:
    supabaseUrl && supabaseServiceRoleKey
      ? SupabaseAdapter({
          url: supabaseUrl,
          secret: supabaseServiceRoleKey
        })
      : undefined,
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
      maxAge: 10 * 60,
      async sendVerificationRequest({ identifier, url, provider }) {
        await sendResendMagicLink({
          identifier,
          url,
          from: provider.from
        });
      }
    })
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?sent=1"
  },
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        token.role = userRole(user.email);
      }
      if (!token.role) token.role = userRole(token.email);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? token.email ?? "";
        session.user.role = token.role === "admin" ? "admin" : "teacher";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    }
  }
};
