import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation";
import { authenticate, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const rl = rateLimit(`login:${ip}`);
  if (!rl.ok) {
    await logAudit({ action: "login_rate_limited", userId: null, success: false, ip, userAgent: req.headers.get("user-agent") ?? undefined, metadata: { retryAfter: rl.retryAfter } });
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429, headers: { "Retry-After": rl.retryAfter.toString() } });
  }

  try {
    const { payload, token } = await authenticate(parsed.data.nim, parsed.data.password);
    const res = NextResponse.json({ userId: payload.userId, role: payload.role, periodId: payload.periodId, suggestPasswordChange: payload.mustSuggestPasswordChange ?? false });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    await logAudit({ action: "login", userId: payload.userId, success: true, ip, userAgent: req.headers.get("user-agent") ?? undefined });
    return res;
  } catch (err) {
    await logAudit({ action: "login", userId: null, success: false, ip, userAgent: req.headers.get("user-agent") ?? undefined });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
