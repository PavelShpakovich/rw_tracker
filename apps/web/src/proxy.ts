import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, sessionToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  // On Vercel, APP_PASSWORD must be set — refuse to serve unprotected.
  if (process.env.VERCEL && !process.env.APP_PASSWORD) {
    return new NextResponse(
      "APP_PASSWORD is not configured. Set it in Vercel Project Settings → Environment Variables.",
      { status: 503, headers: { "Content-Type": "text/plain" } },
    );
  }

  const expected = sessionToken();
  if (!expected) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/login") return NextResponse.next();
  if (request.cookies.get(AUTH_COOKIE)?.value === expected) return NextResponse.next();

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon).*)"],
};
