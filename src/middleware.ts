import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Pages that require the user to be logged in
const PROTECTED_PAGES = ["/account", "/connect-analytics"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only gate page routes — API routes handle their own auth via `auth()`
  const needsAuth = PROTECTED_PAGES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    if (pathname.startsWith("/connect-analytics")) {
      loginUrl.searchParams.set("callbackUrl", "/connect-analytics");
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/connect-analytics/:path*"],
};
