import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "directus_access_token";

const PROTECTED_PREFIXES = ["/dashboard", "/saved", "/jobs"];

/**
 * Edge Middleware cannot rely on non-NEXT_PUBLIC env vars (e.g. DIRECTUS_SECRET)
 * in many Next.js setups — JWT verification runs in Node instead: see (app)/layout.tsx.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE)?.value;
  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/dashboard/:path*", "/saved/:path*", "/jobs/:path*"],
};
