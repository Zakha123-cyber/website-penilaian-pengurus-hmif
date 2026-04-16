import { db } from "@/lib/db";
import {
  users,
  evaluationEvents,
  evaluations,
  indicatorSnapshots,
  panitia,
} from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";

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
    .select({ id: users.id, role: users.role, divisionId: users.divisionId })
    .from(users)
    .where(and(eq(users.periodId, periodId), eq(users.isActive, true)));

  const bpi = allUsers.filter((u) => u.role === "BPI");
  const kadiv = allUsers.filter((u) => u.role === "KADIV");
  const anggota = allUsers.filter((u) => u.role === "ANGGOTA");

  const pairs: { id: string; evaluatorId: string; evaluateeId: string; eventId: string; createdAt: Date }[] = [];

  for (const ev of allUsers) {
    if (ev.role === "BPI") {
      for (const target of allUsers) {
        if (target.id !== ev.id)
          pairs.push({ id: crypto.randomUUID(), evaluatorId: ev.id, evaluateeId: target.id, eventId, createdAt: new Date() });
      }
    } else if (ev.role === "KADIV") {
      const sameDivAnggota = anggota.filter((a) => a.divisionId && a.divisionId === ev.divisionId);
      for (const target of [...bpi, ...sameDivAnggota]) {
        if (target.id !== ev.id)
          pairs.push({ id: crypto.randomUUID(), evaluatorId: ev.id, evaluateeId: target.id, eventId, createdAt: new Date() });
      }
    } else if (ev.role === "ANGGOTA") {
      const sameDivAnggota = anggota.filter((a) => a.divisionId && a.divisionId === ev.divisionId && a.id !== ev.id);
      const sameDivKadiv = kadiv.filter((k) => k.divisionId && k.divisionId === ev.divisionId);
      for (const target of [...bpi, ...sameDivKadiv, ...sameDivAnggota]) {
        if (target.id !== ev.id)
          pairs.push({ id: crypto.randomUUID(), evaluatorId: ev.id, evaluateeId: target.id, eventId, createdAt: new Date() });
      }
    }
  }

  if (pairs.length > 0) {
    // Insert in batches of 100 to avoid large queries
    for (let i = 0; i < pairs.length; i += 100) {
      await db.insert(evaluations).ignore().values(pairs.slice(i, i + 100));
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

  const activeUsers = panitiaRows.filter((p) => p.User.isActive).map((p) => p.User);

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
      await db.insert(evaluations).ignore().values(pairs.slice(i, i + 100));
    }
  }

  console.log(`[Assignment Generator] PROKER event ${eventId}: Created ${pairs.length} assignment pairs`);
  return pairs.length;
}
