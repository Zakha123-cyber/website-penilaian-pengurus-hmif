import { db } from "@/lib/db";
import {
  users,
  evaluations,
  panitia,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";

type EventRow = {
  id: string;
  type: "PERIODIC" | "PROKER";
  periodId: string;
  prokerId: string | null;
};

export async function generateAssignmentsForEvent(event: EventRow) {
  if (event.type === "PERIODIC") {
    return await generatePeriodicAssignments(event.id, event.periodId);
  } else if (event.type === "PROKER" && event.prokerId) {
    return await generateProkerAssignments(event.id, event.prokerId, event.periodId);
  }
  return 0;
}

async function generatePeriodicAssignments(eventId: string, periodId: string) {
  const allUsers = await db
    .select({ id: users.id, role: users.role, divisionId: users.divisionId, subdivisionId: users.subdivisionId })
    .from(users)
    .where(and(eq(users.periodId, periodId), eq(users.isActive, true)));

  const bpi = allUsers.filter((u) => u.role === "BPI");
  const kadiv = allUsers.filter((u) => u.role === "KADIV");
  const kasubdiv = allUsers.filter((u) => u.role === "KASUBDIV");
  const anggota = allUsers.filter((u) => u.role === "ANGGOTA");

  const pairs: { id: string; evaluatorId: string; evaluateeId: string; eventId: string; createdAt: Date }[] = [];

  const addPair = (evaluatorId: string, evaluateeId: string) => {
    if (evaluatorId !== evaluateeId)
      pairs.push({ id: crypto.randomUUID(), evaluatorId, evaluateeId: evaluateeId, eventId, createdAt: new Date() });
  };

  for (const ev of allUsers) {
    if (ev.role === "BPI") {
      // BPI menilai semua KADIV dan KASUBDIV
      for (const target of [...kadiv, ...kasubdiv]) addPair(ev.id, target.id);

    } else if (ev.role === "KADIV") {
      // KADIV menilai BPI + ANGGOTA sedivisi + KASUBDIV sedivisi
      const sameDivAnggota = anggota.filter((a) => a.divisionId === ev.divisionId);
      const sameDivKasubdiv = kasubdiv.filter((k) => k.divisionId === ev.divisionId);
      for (const target of [...bpi, ...sameDivKasubdiv, ...sameDivAnggota]) addPair(ev.id, target.id);

    } else if (ev.role === "KASUBDIV") {
      // KASUBDIV menilai KADIV sedivisi + ANGGOTA sesubdivisi
      const sameDivKadiv = kadiv.filter((k) => k.divisionId === ev.divisionId);
      const sameSubdivAnggota = anggota.filter((a) => a.subdivisionId && a.subdivisionId === ev.subdivisionId);
      for (const target of [...sameDivKadiv, ...sameSubdivAnggota]) addPair(ev.id, target.id);

    } else if (ev.role === "ANGGOTA") {
      // ANGGOTA menilai BPI + KADIV sedivisi + KASUBDIV sedivisi + sesama ANGGOTA sedivisi
      const sameDivKadiv = kadiv.filter((k) => k.divisionId === ev.divisionId);
      const sameDivKasubdiv = kasubdiv.filter((k) => k.divisionId === ev.divisionId);
      const sameDivAnggota = anggota.filter((a) => a.divisionId === ev.divisionId && a.id !== ev.id);
      for (const target of [...bpi, ...sameDivKadiv, ...sameDivKasubdiv, ...sameDivAnggota]) addPair(ev.id, target.id);
    }
  }

  if (pairs.length > 0) {
    for (let i = 0; i < pairs.length; i += 100) {
      await db.insert(evaluations).values(pairs.slice(i, i + 100)).onConflictDoNothing();
    }
  }

  console.log(`[Assignment Generator] PERIODIC event ${eventId}: ${allUsers.length} users → ${pairs.length} assignments`);
  return pairs.length;
}

async function generateProkerAssignments(eventId: string, prokerId: string, _periodId: string) {
  const panitiaRows = await db
    .select()
    .from(panitia)
    .where(eq(panitia.prokerId, prokerId))
    .innerJoin(users, eq(panitia.userId, users.id));

  console.log(`[Assignment Generator] PROKER event ${eventId}: Found ${panitiaRows.length} total panitia for proker ${prokerId}`);

  const activeUsers = panitiaRows.filter((p) => p.user.isActive).map((p) => p.user);

  console.log(`[Assignment Generator] PROKER event ${eventId}: ${activeUsers.length} active users after filtering`);
  if (activeUsers.length > 0) {
    console.log(`[Assignment Generator] Active user IDs: ${activeUsers.map((u) => u.id).join(", ")}`);
  }

  if (activeUsers.length < 2) {
    throw new Error(
      `Gagal membuat assignment: Proker ini hanya memiliki ${activeUsers.length} panitia aktif. ` +
      `Minimal 2 panitia aktif diperlukan untuk membuat pasangan evaluasi.`
    );
  }

  const pairs: { id: string; evaluatorId: string; evaluateeId: string; eventId: string; createdAt: Date }[] = [];
  for (const eva of activeUsers) {
    for (const evb of activeUsers) {
      if (eva.id !== evb.id) {
        pairs.push({ id: crypto.randomUUID(), evaluatorId: eva.id, evaluateeId: evb.id, eventId, createdAt: new Date() });
      }
    }
  }

  if (pairs.length > 0) {
    for (let i = 0; i < pairs.length; i += 100) {
      await db.insert(evaluations).values(pairs.slice(i, i + 100)).onConflictDoNothing();
    }
  }

  console.log(`[Assignment Generator] PROKER event ${eventId}: Created ${pairs.length} assignment pairs`);
  return pairs.length;
}
