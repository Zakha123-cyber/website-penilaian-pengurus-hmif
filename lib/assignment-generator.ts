import { Prisma, EventType } from "@prisma/client";

// Generate evaluation assignments for an event based on role rules.
export async function generateAssignmentsForEvent(tx: Prisma.TransactionClient, event: { id: string; type: EventType; periodId: string; prokerId: string | null }) {
  if (event.type === "PERIODIC") {
    await generatePeriodicAssignments(tx, event.id, event.periodId);
  } else if (event.type === "PROKER" && event.prokerId) {
    await generateProkerAssignments(tx, event.id, event.prokerId, event.periodId);
  }
}

async function generatePeriodicAssignments(tx: Prisma.TransactionClient, eventId: string, periodId: string) {
  const users = await tx.user.findMany({
    where: { periodId, isActive: true },
    select: { id: true, role: true, divisionId: true },
  });

  const bpi = users.filter((u) => u.role === "BPI");
  const kadiv = users.filter((u) => u.role === "KADIV");
  const anggota = users.filter((u) => u.role === "ANGGOTA");

  const pairs: { evaluatorId: string; evaluateeId: string; eventId: string }[] = [];

  for (const ev of users) {
    if (ev.role === "BPI") {
      for (const target of users) {
        if (target.id !== ev.id) pairs.push({ evaluatorId: ev.id, evaluateeId: target.id, eventId });
      }
    } else if (ev.role === "KADIV") {
      const sameDivAnggota = anggota.filter((a) => a.divisionId && a.divisionId === ev.divisionId);
      for (const target of [...bpi, ...sameDivAnggota]) {
        if (target.id !== ev.id) pairs.push({ evaluatorId: ev.id, evaluateeId: target.id, eventId });
      }
    } else if (ev.role === "ANGGOTA") {
      const sameDivAnggota = anggota.filter((a) => a.divisionId && a.divisionId === ev.divisionId && a.id !== ev.id);
      const sameDivKadiv = kadiv.filter((k) => k.divisionId && k.divisionId === ev.divisionId);
      for (const target of [...bpi, ...sameDivKadiv, ...sameDivAnggota]) {
        if (target.id !== ev.id) pairs.push({ evaluatorId: ev.id, evaluateeId: target.id, eventId });
      }
    }
  }

  if (pairs.length > 0) {
    await tx.evaluation.createMany({ data: pairs, skipDuplicates: true });
  }
}

async function generateProkerAssignments(tx: Prisma.TransactionClient, eventId: string, prokerId: string, periodId: string) {
  const panitia = await tx.panitia.findMany({
    where: { prokerId },
    include: { user: true },
  });

  const activeUsers = panitia.filter((p) => p.user && p.user.isActive && p.user.periodId === periodId).map((p) => p.user);

  const pairs: { evaluatorId: string; evaluateeId: string; eventId: string }[] = [];
  for (const eva of activeUsers) {
    for (const evb of activeUsers) {
      if (eva.id !== evb.id) {
        pairs.push({ evaluatorId: eva.id, evaluateeId: evb.id, eventId });
      }
    }
  }

  if (pairs.length > 0) {
    await tx.evaluation.createMany({ data: pairs, skipDuplicates: true });
  }
}
