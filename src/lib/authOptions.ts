import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";

function userRole(email?: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  return email?.toLowerCase() === adminEmail ? "admin" : "teacher";
}

export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM
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
