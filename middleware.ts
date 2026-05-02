import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(request) {
    const token = request.nextauth.token;
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    }

    if (pathname.startsWith("/teacher") && !token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token)
    },
    pages: {
      signIn: "/login"
    }
  }
);

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*"]
};
