import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { divisions } from "@/lib/schema";
import { getSession } from "@/lib/auth";
import { canManageRoles } from "@/lib/permissions";
import { createDivisionSchema } from "@/lib/validation";
import { asc } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (!canManageRoles(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await db.select().from(divisions).orderBy(asc(divisions.name));
  return NextResponse.json({ divisions: result });
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
  const parsed = createDivisionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.insert(divisions).values({ id, name: parsed.data.name, createdAt: new Date() });

  return NextResponse.json({ division: { id, ...parsed.data } }, { status: 201 });
}
