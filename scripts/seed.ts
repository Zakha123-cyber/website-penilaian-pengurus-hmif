import dotenv from "dotenv";
dotenv.config({ override: true });
import { db } from "../lib/db";
import {
  indicators, periods, divisions, subdivisions, users,
  prokers, panitia, evaluationEvents, indicatorSnapshots, evaluations,
} from "../lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateAssignmentsForEvent } from "../lib/assignment-generator";

type Role = "BPI" | "KADIV" | "KASUBDIV" | "ANGGOTA";
type EventType = "PERIODIC" | "PROKER";

// ─── Indicators ───────────────────────────────────────────────────────────────

const INDICATORS: { name: string; eventType: EventType; evaluatorRole?: Role; evaluateeRole?: Role }[] = [
  // BPI → BPI
  { name: "Kolaborasi antar pengurus inti",   eventType: "PERIODIC", evaluatorRole: "BPI",      evaluateeRole: "BPI"      },
  { name: "Komunikasi internal BPI",          eventType: "PERIODIC", evaluatorRole: "BPI",      evaluateeRole: "BPI"      },
  { name: "Kontribusi dalam rapat BPI",       eventType: "PERIODIC", evaluatorRole: "BPI",      evaluateeRole: "BPI"      },
  // BPI → KADIV
  { name: "Kemampuan memimpin divisi",        eventType: "PERIODIC", evaluatorRole: "BPI",      evaluateeRole: "KADIV"    },
  { name: "Koordinasi dengan BPI",            eventType: "PERIODIC", evaluatorRole: "BPI",      evaluateeRole: "KADIV"    },
  { name: "Pelaporan progres divisi",         eventType: "PERIODIC", evaluatorRole: "BPI",      evaluateeRole: "KADIV"    },
  // BPI → KASUBDIV
  { name: "Pengelolaan subdivisi",            eventType: "PERIODIC", evaluatorRole: "BPI",      evaluateeRole: "KASUBDIV" },
  { name: "Responsivitas terhadap arahan",    eventType: "PERIODIC", evaluatorRole: "BPI",      evaluateeRole: "KASUBDIV" },
  // KADIV → BPI
  { name: "Kejelasan arahan dari BPI",        eventType: "PERIODIC", evaluatorRole: "KADIV",    evaluateeRole: "BPI"      },
  { name: "Dukungan BPI terhadap divisi",     eventType: "PERIODIC", evaluatorRole: "KADIV",    evaluateeRole: "BPI"      },
  { name: "Keterbukaan BPI dalam komunikasi", eventType: "PERIODIC", evaluatorRole: "KADIV",    evaluateeRole: "BPI"      },
  // KADIV → KASUBDIV
  { name: "Koordinasi dengan KADIV",          eventType: "PERIODIC", evaluatorRole: "KADIV",    evaluateeRole: "KASUBDIV" },
  { name: "Pengelolaan anggota subdivisi",    eventType: "PERIODIC", evaluatorRole: "KADIV",    evaluateeRole: "KASUBDIV" },
  // KADIV → ANGGOTA
  { name: "Eksekusi tugas",                   eventType: "PERIODIC", evaluatorRole: "KADIV",    evaluateeRole: "ANGGOTA"  },
  { name: "Kedisiplinan",                     eventType: "PERIODIC", evaluatorRole: "KADIV",    evaluateeRole: "ANGGOTA"  },
  { name: "Kualitas deliverable",             eventType: "PERIODIC", evaluatorRole: "KADIV",    evaluateeRole: "ANGGOTA"  },
  { name: "Inisiatif",                        eventType: "PERIODIC", evaluatorRole: "KADIV",    evaluateeRole: "ANGGOTA"  },
  // KASUBDIV → KADIV
  { name: "Pengayoman KADIV terhadap subdivisi", eventType: "PERIODIC", evaluatorRole: "KASUBDIV", evaluateeRole: "KADIV" },
  { name: "Kejelasan instruksi KADIV",        eventType: "PERIODIC", evaluatorRole: "KASUBDIV", evaluateeRole: "KADIV"    },
  // KASUBDIV → ANGGOTA
  { name: "Keterlibatan dalam tugas subdivisi", eventType: "PERIODIC", evaluatorRole: "KASUBDIV", evaluateeRole: "ANGGOTA" },
  { name: "Kerja sama dalam subdivisi",       eventType: "PERIODIC", evaluatorRole: "KASUBDIV", evaluateeRole: "ANGGOTA"  },
  // ANGGOTA → BPI
  { name: "Transparansi BPI",                 eventType: "PERIODIC", evaluatorRole: "ANGGOTA",  evaluateeRole: "BPI"      },
  { name: "Keterlibatan BPI dalam kegiatan",  eventType: "PERIODIC", evaluatorRole: "ANGGOTA",  evaluateeRole: "BPI"      },
  // ANGGOTA → KADIV
  { name: "Pengayoman KADIV terhadap anggota",     eventType: "PERIODIC", evaluatorRole: "ANGGOTA", evaluateeRole: "KADIV" },
  { name: "Kemampuan KADIV mengorganisir divisi",  eventType: "PERIODIC", evaluatorRole: "ANGGOTA", evaluateeRole: "KADIV" },
  { name: "Komunikasi KADIV dengan anggota",       eventType: "PERIODIC", evaluatorRole: "ANGGOTA", evaluateeRole: "KADIV" },
  // ANGGOTA → KASUBDIV
  { name: "Kepemimpinan KASUBDIV",            eventType: "PERIODIC", evaluatorRole: "ANGGOTA",  evaluateeRole: "KASUBDIV" },
  { name: "Arahan KASUBDIV kepada anggota",   eventType: "PERIODIC", evaluatorRole: "ANGGOTA",  evaluateeRole: "KASUBDIV" },
  // ANGGOTA → ANGGOTA
  { name: "Kerja sama tim",                   eventType: "PERIODIC", evaluatorRole: "ANGGOTA",  evaluateeRole: "ANGGOTA"  },
  { name: "Tanggung jawab tugas",             eventType: "PERIODIC", evaluatorRole: "ANGGOTA",  evaluateeRole: "ANGGOTA"  },
  { name: "Kontribusi dalam kegiatan",        eventType: "PERIODIC", evaluatorRole: "ANGGOTA",  evaluateeRole: "ANGGOTA"  },
  // PROKER (general)
  { name: "Perencanaan kegiatan",             eventType: "PROKER" },
  { name: "Pelaksanaan kegiatan",             eventType: "PROKER" },
  { name: "Kerja sama panitia",               eventType: "PROKER" },
  { name: "Komunikasi antar panitia",         eventType: "PROKER" },
  { name: "Tanggung jawab tugas panitia",     eventType: "PROKER" },
];

// ─── Static config ─────────────────────────────────────────────────────────────

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "JayalahHimpunanku123!";

const DEFAULT_PERIOD = { name: "2025/2026", startYear: 2025, endYear: 2026, isActive: true };

const DEFAULT_DIVISIONS = ["BPI", "PSDM", "Kewirausahaan", "Mediatek", "Humas", "Litbang"];

const DEFAULT_SUBDIVISIONS: { name: string; division: string }[] = [
  { name: "HUBLU",  division: "Humas"    },
  { name: "KONTEN", division: "Humas"    },
  { name: "MEDIA",  division: "Mediatek" },
  { name: "TEKNO",  division: "Mediatek" },
];

// nim, name, role, division, subdivision (null = tanpa subdivisi)
type UserSeed = {
  nim: string;
  name: string;
  role: "ADMIN" | Role;
  division: string | null;
  subdivision: string | null;
};

const DEFAULT_USERS: UserSeed[] = [
  // Super Admin
  { nim: "18082018", name: "Super Admin",       role: "ADMIN",    division: null,           subdivision: null    },

  // BPI
  { nim: "20010001", name: "Andi Pratama",      role: "BPI",      division: "BPI",          subdivision: null    },

  // PSDM
  { nim: "20020001", name: "Budi Santoso",      role: "KADIV",    division: "PSDM",         subdivision: null    },
  { nim: "20020002", name: "Citra Dewi",        role: "ANGGOTA",  division: "PSDM",         subdivision: null    },
  { nim: "20020003", name: "Dian Rahmat",       role: "ANGGOTA",  division: "PSDM",         subdivision: null    },

  // Kewirausahaan
  { nim: "20030001", name: "Eka Putri",         role: "KADIV",    division: "Kewirausahaan", subdivision: null   },
  { nim: "20030002", name: "Fajar Nugroho",     role: "ANGGOTA",  division: "Kewirausahaan", subdivision: null   },
  { nim: "20030003", name: "Gita Lestari",      role: "ANGGOTA",  division: "Kewirausahaan", subdivision: null   },

  // Mediatek — KADIV tanpa subdivisi, KASUBDIV + ANGGOTA per subdivisi
  { nim: "20040001", name: "Hendra Wijaya",     role: "KADIV",    division: "Mediatek",     subdivision: null    },
  { nim: "20040002", name: "Irma Sari",         role: "KASUBDIV", division: "Mediatek",     subdivision: "MEDIA" },
  { nim: "20040003", name: "Joko Susilo",       role: "ANGGOTA",  division: "Mediatek",     subdivision: "MEDIA" },
  { nim: "20040004", name: "Kartika Sari",      role: "KASUBDIV", division: "Mediatek",     subdivision: "TEKNO" },
  { nim: "20040005", name: "Lutfi Hakim",       role: "ANGGOTA",  division: "Mediatek",     subdivision: "TEKNO" },

  // Humas — KADIV tanpa subdivisi, KASUBDIV + ANGGOTA per subdivisi
  { nim: "20050001", name: "Maya Indah",        role: "KADIV",    division: "Humas",        subdivision: null    },
  { nim: "20050002", name: "Nanda Rizki",       role: "KASUBDIV", division: "Humas",        subdivision: "HUBLU" },
  { nim: "20050003", name: "Ovi Rahmawati",     role: "ANGGOTA",  division: "Humas",        subdivision: "HUBLU" },
  { nim: "20050004", name: "Putra Armanda",     role: "KASUBDIV", division: "Humas",        subdivision: "KONTEN"},
  { nim: "20050005", name: "Qori Fathonah",     role: "ANGGOTA",  division: "Humas",        subdivision: "KONTEN"},

  // Litbang
  { nim: "20060001", name: "Rendi Saputra",     role: "KADIV",    division: "Litbang",      subdivision: null    },
  { nim: "20060002", name: "Sinta Mawarni",     role: "ANGGOTA",  division: "Litbang",      subdivision: null    },
  { nim: "20060003", name: "Taufik Hidayat",    role: "ANGGOTA",  division: "Litbang",      subdivision: null    },
];

// ─── Seed functions ────────────────────────────────────────────────────────────

async function seedIndicators() {
  console.log("Seeding indicators...");
  for (const ind of INDICATORS) {
    const existing = await db.query.indicators.findFirst({ where: eq(indicators.name, ind.name) });
    if (!existing) {
      await db.insert(indicators).values({
        id: crypto.randomUUID(),
        name: ind.name,
        eventType: ind.eventType,
        evaluatorRole: ind.evaluatorRole ?? null,
        evaluateeRole: ind.evaluateeRole ?? null,
      });
    }
  }
  console.log(`Seeded ${INDICATORS.length} indicators.`);
}

async function seedPeriodAndDivisions() {
  console.log("Seeding period and divisions...");
  let period = await db.query.periods.findFirst({ where: eq(periods.name, DEFAULT_PERIOD.name) });
  if (!period) {
    const id = crypto.randomUUID();
    await db.insert(periods).values({ id, ...DEFAULT_PERIOD });
    period = await db.query.periods.findFirst({ where: eq(periods.id, id) });
  }

  const divisionMap: Record<string, string> = {};
  for (const name of DEFAULT_DIVISIONS) {
    let division = await db.query.divisions.findFirst({ where: eq(divisions.name, name) });
    if (!division) {
      const id = crypto.randomUUID();
      await db.insert(divisions).values({ id, name });
      division = await db.query.divisions.findFirst({ where: eq(divisions.id, id) });
    }
    divisionMap[name] = division!.id;
  }

  return { periodId: period!.id, divisionMap };
}

async function seedSubdivisions(divisionMap: Record<string, string>) {
  console.log("Seeding subdivisions...");
  const subdivisionMap: Record<string, string> = {};
  for (const sub of DEFAULT_SUBDIVISIONS) {
    const divisionId = divisionMap[sub.division];
    if (!divisionId) continue;
    let existing = await db.query.subdivisions.findFirst({ where: eq(subdivisions.name, sub.name) });
    if (!existing) {
      const id = crypto.randomUUID();
      await db.insert(subdivisions).values({ id, name: sub.name, divisionId });
      existing = await db.query.subdivisions.findFirst({ where: eq(subdivisions.id, id) });
    }
    subdivisionMap[sub.name] = existing!.id;
  }
  console.log(`Seeded ${DEFAULT_SUBDIVISIONS.length} subdivisions.`);
  return subdivisionMap;
}

async function seedUsers(
  periodId: string,
  divisionMap: Record<string, string>,
  subdivisionMap: Record<string, string>,
) {
  console.log("Seeding users...");
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const u of DEFAULT_USERS) {
    const existing = await db.query.users.findFirst({ where: eq(users.nim, u.nim) });
    const userData = {
      name: u.name,
      role: u.role,
      isActive: true,
      periodId,
      divisionId: u.division ? (divisionMap[u.division] ?? null) : null,
      subdivisionId: u.subdivision ? (subdivisionMap[u.subdivision] ?? null) : null,
      passwordHash: hash,
    };
    if (existing) {
      await db.update(users).set(userData).where(eq(users.id, existing.id));
    } else {
      await db.insert(users).values({ id: crypto.randomUUID(), nim: u.nim, ...userData });
    }
    console.log(`  Upserted user ${u.nim} — ${u.name} (${u.role})`);
  }

  console.log(`Seeded/updated ${DEFAULT_USERS.length} users.`);

  // Return nim → id map
  const allUsers = await db.query.users.findMany({ columns: { id: true, nim: true } });
  return allUsers.reduce<Record<string, string>>((acc, u) => {
    acc[u.nim] = u.id;
    return acc;
  }, {});
}

async function seedProkerAndEvents(periodId: string, divisionMap: Record<string, string>) {
  console.log("Seeding proker and events...");

  // ── Proker: Pengembangan SDM PSDM ──────────────────────────────────────────
  const prokerName = "Pengembangan SDM";
  const psdmDivisionId = divisionMap["PSDM"];
  let proker = await db.query.prokers.findFirst({
    where: eq(prokers.name, prokerName),
  });
  if (!proker) {
    const id = crypto.randomUUID();
    await db.insert(prokers).values({ id, name: prokerName, divisionId: psdmDivisionId, periodId });
    proker = await db.query.prokers.findFirst({ where: eq(prokers.id, id) });
  }
  const prokerId = proker!.id;

  // Daftarkan panitia proker: semua user dari divisi PSDM
  const psdmUsers = await db.query.users.findMany({
    where: eq(users.divisionId, psdmDivisionId),
    columns: { id: true },
  });
  for (const u of psdmUsers) {
    const exists = await db.query.panitia.findFirst({
      where: eq(panitia.userId, u.id),
    });
    if (!exists) {
      await db.insert(panitia).values({ id: crypto.randomUUID(), userId: u.id, prokerId });
    }
  }
  console.log(`  Proker "${prokerName}" — ${psdmUsers.length} panitia dari PSDM`);

  // ── Ambil semua indikator aktif ────────────────────────────────────────────
  const allIndicators = await db.query.indicators.findMany({
    where: eq(indicators.isActive, true),
  });
  const periodicIndicators = allIndicators.filter((i) => i.eventType === "PERIODIC");
  const prokerIndicators   = allIndicators.filter((i) => i.eventType === "PROKER");

  // ── Event Periodik ──────────────────────────────────────────────────────────
  const periodicEventName = "Evaluasi Tengah Periode 2025/2026";
  let periodicEvent = await db.query.evaluationEvents.findFirst({
    where: eq(evaluationEvents.name, periodicEventName),
  });
  if (!periodicEvent) {
    const id = crypto.randomUUID();
    const now = new Date();
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 hari ke depan
    await db.insert(evaluationEvents).values({
      id,
      name: periodicEventName,
      type: "PERIODIC",
      periodId,
      prokerId: null,
      startDate: now,
      endDate: end,
      isOpen: true,
    });
    periodicEvent = await db.query.evaluationEvents.findFirst({ where: eq(evaluationEvents.id, id) });
    console.log(`  Created periodic event: "${periodicEventName}"`);
  }

  // Snapshot indikator periodik
  const existingPeriodicSnaps = await db.query.indicatorSnapshots.findMany({
    where: eq(indicatorSnapshots.eventId, periodicEvent!.id),
  });
  if (existingPeriodicSnaps.length === 0 && periodicIndicators.length > 0) {
    await db.insert(indicatorSnapshots).values(
      periodicIndicators.map((ind) => ({ id: crypto.randomUUID(), indicatorId: ind.id, eventId: periodicEvent!.id }))
    );
    console.log(`  Snapshotted ${periodicIndicators.length} periodic indicators`);
  }

  // Generate assignments untuk event periodik
  const existingPeriodicEvals = await db.query.evaluations.findMany({
    where: eq(evaluations.eventId, periodicEvent!.id),
    columns: { id: true },
  });
  if (existingPeriodicEvals.length === 0) {
    const count = await generateAssignmentsForEvent({
      id: periodicEvent!.id,
      type: "PERIODIC",
      periodId,
      prokerId: null,
    });
    console.log(`  Generated ${count} periodic assignments`);
  } else {
    console.log(`  Periodic assignments already exist (${existingPeriodicEvals.length}), skipping`);
  }

  // ── Event Proker ────────────────────────────────────────────────────────────
  const prokerEventName = `Evaluasi Proker ${prokerName}`;
  let prokerEvent = await db.query.evaluationEvents.findFirst({
    where: eq(evaluationEvents.name, prokerEventName),
  });
  if (!prokerEvent) {
    const id = crypto.randomUUID();
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 hari ke depan
    await db.insert(evaluationEvents).values({
      id,
      name: prokerEventName,
      type: "PROKER",
      periodId,
      prokerId,
      startDate: now,
      endDate: end,
      isOpen: true,
    });
    prokerEvent = await db.query.evaluationEvents.findFirst({ where: eq(evaluationEvents.id, id) });
    console.log(`  Created proker event: "${prokerEventName}"`);
  }

  // Snapshot indikator proker
  const existingProkerSnaps = await db.query.indicatorSnapshots.findMany({
    where: eq(indicatorSnapshots.eventId, prokerEvent!.id),
  });
  if (existingProkerSnaps.length === 0 && prokerIndicators.length > 0) {
    await db.insert(indicatorSnapshots).values(
      prokerIndicators.map((ind) => ({ id: crypto.randomUUID(), indicatorId: ind.id, eventId: prokerEvent!.id }))
    );
    console.log(`  Snapshotted ${prokerIndicators.length} proker indicators`);
  }

  // Generate assignments untuk event proker
  const existingProkerEvals = await db.query.evaluations.findMany({
    where: eq(evaluations.eventId, prokerEvent!.id),
    columns: { id: true },
  });
  if (existingProkerEvals.length === 0) {
    const count = await generateAssignmentsForEvent({
      id: prokerEvent!.id,
      type: "PROKER",
      periodId,
      prokerId,
    });
    console.log(`  Generated ${count} proker assignments`);
  } else {
    console.log(`  Proker assignments already exist (${existingProkerEvals.length}), skipping`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { periodId, divisionMap } = await seedPeriodAndDivisions();
  const subdivisionMap = await seedSubdivisions(divisionMap);
  await seedIndicators();
  await seedUsers(periodId, divisionMap, subdivisionMap);
  await seedProkerAndEvents(periodId, divisionMap);

  console.log("\n✓ Seeding selesai.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
