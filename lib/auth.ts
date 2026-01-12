import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "app_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: string;
  role: string;
  periodId: string;
  mustSuggestPasswordChange?: boolean;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required");
  }
  return new TextEncoder().encode(secret);
}

export async function authenticate(nim: string, password: string): Promise<{ payload: SessionPayload; token: string }> {
  const user = await prisma.user.findUnique({ where: { nim } });
  if (!user || !user.isActive) {
    throw new Error("Invalid credentials");
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new Error("Invalid credentials");
  }

  const mustSuggestPasswordChange = !(user as any).passwordUpdatedAt;

  const payload: SessionPayload = {
    userId: user.id,
    role: user.role,
    periodId: user.periodId,
    mustSuggestPasswordChange,
  };

  const token = await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`).sign(getSecret());

  return { payload, token };
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const session = payload as SessionPayload;
    return session;
  } catch (err) {
    return null;
  }
}
