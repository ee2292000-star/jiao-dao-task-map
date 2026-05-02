import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/password";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type LoginUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher";
};

type TeacherAccount = {
  id?: string;
  name: string;
  email: string;
  password: string;
  enabled?: boolean;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function getTeacherAccounts() {
  if (!process.env.TEACHER_ACCOUNTS) return [];

  try {
    const parsed = JSON.parse(process.env.TEACHER_ACCOUNTS);
    return Array.isArray(parsed) ? (parsed as TeacherAccount[]) : [];
  } catch {
    return [];
  }
}

function findTeacherAccount(email: string, password: string): LoginUser | null {
  const teacher = getTeacherAccounts().find(
    (account) =>
      account.enabled !== false &&
      normalizeEmail(account.email) === email &&
      account.password === password
  );

  if (!teacher) return null;

  return {
    id: teacher.id ?? normalizeEmail(teacher.email),
    name: teacher.name,
    email: normalizeEmail(teacher.email),
    role: "teacher"
  };
}

async function findTeacherAccountFromDatabase(email: string, password: string): Promise<LoginUser | null> {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from("teacher_accounts")
    .select("id, teacher_id, name, email, password_hash, enabled")
    .eq("email", email)
    .maybeSingle();

  if (error || !data || data.enabled === false) return null;

  const passwordHash = data.password_hash as string;
  if (!verifyPassword(password, passwordHash)) return null;

  return {
    id: (data.teacher_id as string | null) ?? (data.id as string),
    name: data.name as string,
    email: data.email as string,
    role: "teacher"
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "EmailPassword",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email);
        const password = credentials?.password ?? "";
        const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
        const adminPassword = process.env.ADMIN_PASSWORD ?? "";

        if (email && password && email === adminEmail && password === adminPassword) {
          return {
            id: "admin",
            name: process.env.ADMIN_NAME ?? "主任",
            email,
            role: "admin"
          } as LoginUser;
        }

        const databaseUser = await findTeacherAccountFromDatabase(email, password);
        if (databaseUser) return databaseUser;

        return findTeacherAccount(email, password);
      }
    })
  ],
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const loginUser = user as LoginUser;
        token.sub = loginUser.id;
        token.email = loginUser.email;
        token.name = loginUser.name;
        token.role = loginUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? token.email ?? "";
        session.user.name = token.name ?? "";
        session.user.email = token.email ?? "";
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
