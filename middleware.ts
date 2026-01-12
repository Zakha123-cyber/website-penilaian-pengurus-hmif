import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/", "/api/auth/login", "/api/auth/logout", "/api/auth/session", "/_next", "/favicon.ico", "/public", "/api/health", "/change-password"];
const SESSION_COOKIE = "app_session";

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    const verified = await jwtVerify(token, getSecret());
    const payload: any = verified.payload;

    // Pass through suggest flag for client hints if needed
    const requestHeaders = new Headers(req.headers);
    if (payload?.mustSuggestPasswordChange) {
      requestHeaders.set("x-suggest-password-change", "1");
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (err) {
    return NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
