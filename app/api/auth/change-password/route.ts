import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authenticate, getSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const ok = await bcrypt.compare(parsed.data.oldPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Password lama salah" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash, passwordUpdatedAt: new Date() } as any });

  // Refresh session cookie to extend expiry
  const { token } = await authenticate(user.nim, parsed.data.newPassword);
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  await logAudit({
    action: "change_password",
    userId: user.id,
    success: true,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown",
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return res;
}
