import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { periods } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createPeriodSchema } from "@/lib/validation";
import { desc } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (!canManageRoles(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await db.select().from(periods).orderBy(desc(periods.startYear));
  return NextResponse.json({ periods: result });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (!canManageRoles(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createPeriodSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, startYear, endYear, isActive } = parsed.data;

  if (isActive) {
    await db.update(periods).set({ isActive: 0 });
  }

  const id = crypto.randomUUID();
  await db.insert(periods).values({
    id,
    name,
    startYear,
    endYear,
    isActive: isActive ? 1 : 0,
    createdAt: new Date(),
  });

  return NextResponse.json({ period: { id, name, startYear, endYear, isActive: isActive ? 1 : 0 } }, { status: 201 });
}
