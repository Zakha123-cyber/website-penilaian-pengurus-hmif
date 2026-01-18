import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const hardIndicators = [
  "Perencanaan Program",
  "Eksekusi Tugas",
  "Manajemen Waktu",
  "Dokumentasi",
  "Penggunaan Tools Digital",
  "Analisis Data",
  "Penyusunan Laporan",
  "Kepatuhan Prosedur",
  "Problem Solving Teknis",
  "Kualitas Deliverable",
  "Kolaborasi Teknis",
  "Kerapihan Administrasi",
];

const softIndicators = ["Komunikasi", "Kepemimpinan", "Kerja Tim", "Inisiatif", "Adaptabilitas", "Tanggung Jawab", "Integritas"];

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "Changeme123!";
const DEFAULT_PERIOD = {
  name: "2025/2026",
  startYear: 2025,
  endYear: 2026,
  isActive: true,
};

const DEFAULT_DIVISIONS = ["BPI", "PSDM", "Keuangan"];

const DEFAULT_USERS = [
  { nim: "0001", name: "Super Admin", role: "ADMIN" as const, division: null },
  { nim: "1001", name: "Pengurus BPI", role: "BPI" as const, division: "BPI" },
  { nim: "2001", name: "Kadiv PSDM", role: "KADIV" as const, division: "PSDM" },
  { nim: "3001", name: "Anggota Keuangan", role: "ANGGOTA" as const, division: "Keuangan" },
];

async function seedIndicators() {
  console.log("Seeding indicators...");
  for (const name of hardIndicators) {
    const existing = await prisma.indicator.findFirst({ where: { name } });
    if (!existing) {
      await prisma.indicator.create({ data: { name, category: "hardskill" } });
    }
  }

  for (const name of softIndicators) {
    const existing = await prisma.indicator.findFirst({ where: { name } });
    if (!existing) {
      await prisma.indicator.create({ data: { name, category: "softskill" } });
    }
  }
}

async function seedProker(periodId: string, divisionMap: Record<string, string>) {
  console.log("Seeding sample proker...");
  const name = "Pengembangan Kepemimpinan";
  const existing = await prisma.proker.findFirst({ where: { name, periodId } });
  if (existing) return existing.id;

  const divisionId = divisionMap["PSDM"] ?? Object.values(divisionMap)[0];
  const proker = await prisma.proker.create({ data: { name, periodId, divisionId } });
  return proker.id;
}

async function seedEventsAndEvaluations(periodId: string, prokerId: string | null, userMap: Record<string, string>) {
  console.log("Seeding events, snapshots, and evaluations...");

  const indicators = await prisma.indicator.findMany({ orderBy: { name: "asc" } });
  const hard = indicators.filter((i) => i.category === "hardskill").slice(0, 2);
  const soft = indicators.filter((i) => i.category === "softskill").slice(0, 2);
  const chosenIndicators = [...hard, ...soft];
  if (chosenIndicators.length === 0) {
    console.warn("No indicators found; skipping event seeding.");
    return;
  }

  const periodicEvent =
    (await prisma.evaluationEvent.findFirst({ where: { name: "Evaluasi Tengah Periode", periodId } })) ??
    (await prisma.evaluationEvent.create({
      data: {
        name: "Evaluasi Tengah Periode",
        type: "PERIODIC",
        periodId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isOpen: true,
      },
    }));

  const prokerEvent = prokerId
    ? ((await prisma.evaluationEvent.findFirst({ where: { name: "Evaluasi Proker PSDM", periodId, prokerId } })) ??
      (await prisma.evaluationEvent.create({
        data: {
          name: "Evaluasi Proker PSDM",
          type: "PROKER",
          prokerId,
          periodId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          isOpen: true,
        },
      })))
    : null;

  async function ensureSnapshots(eventId: string) {
    const existing = await prisma.indicatorSnapshot.findMany({ where: { eventId } });
    if (existing.length > 0) return existing;
    await prisma.indicatorSnapshot.createMany({
      data: chosenIndicators.map((ind) => ({ indicatorId: ind.id, eventId })),
    });
    return prisma.indicatorSnapshot.findMany({ where: { eventId } });
  }

  const periodicSnapshots = await ensureSnapshots(periodicEvent.id);
  const prokerSnapshots = prokerEvent ? await ensureSnapshots(prokerEvent.id) : [];

  const scoresA = [4, 5, 4, 5];
  const scoresB = [3, 4, 3, 4];

  async function createEvaluation(eventId: string, evaluatorNim: string, evaluateeNim: string, snapshotList: typeof periodicSnapshots, scores: number[], feedback?: string) {
    const evaluatorId = userMap[evaluatorNim];
    const evaluateeId = userMap[evaluateeNim];
    if (!evaluatorId || !evaluateeId) return;

    const evaluation = await prisma.evaluation.upsert({
      where: {
        evaluatorId_evaluateeId_eventId: {
          evaluatorId,
          evaluateeId,
          eventId,
        },
      },
      update: { feedback },
      create: { evaluatorId, evaluateeId, eventId, feedback },
    });

    const existingScores = await prisma.evaluationScore.findMany({ where: { evaluationId: evaluation.id } });
    if (existingScores.length === 0) {
      await prisma.evaluationScore.createMany({
        data: snapshotList.map((snap, idx) => ({
          evaluationId: evaluation.id,
          indicatorSnapshotId: snap.id,
          score: scores[idx] ?? scores[scores.length - 1] ?? 4,
        })),
      });
    }
  }

  // Periodic event evaluations
  await createEvaluation(periodicEvent.id, "0001", "2001", periodicSnapshots, scoresA, "Kinerja solid, teruskan ritme.");
  await createEvaluation(periodicEvent.id, "1001", "3001", periodicSnapshots, scoresB, "Perbaiki dokumentasi dan komunikasi.");

  // Proker event evaluations
  if (prokerEvent) {
    await createEvaluation(prokerEvent.id, "0001", "3001", prokerSnapshots, scoresA, "Eksekusi proker baik, deadline terjaga.");
    await createEvaluation(prokerEvent.id, "2001", "3001", prokerSnapshots, scoresB, "Butuh lebih proaktif koordinasi.");
  }
}

async function seedUserPasswords() {
  console.log("Backfilling password hashes for existing users (if needed)...");
  const users = await prisma.user.findMany({ select: { id: true, passwordHash: true } });
  const targets = users.filter((u) => !u.passwordHash || u.passwordHash.length < 20 || !u.passwordHash.startsWith("$2"));
  if (targets.length === 0) return;

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await Promise.all(
    targets.map((u) =>
      prisma.user.update({
        where: { id: u.id },
        data: { passwordHash: hash },
      }),
    ),
  );
  console.log(`Updated passwordHash for ${targets.length} user(s) with default password.`);
}

async function seedPeriodAndDivisions() {
  console.log("Seeding period and divisions...");
  const existingPeriod = await prisma.period.findFirst({ where: { name: DEFAULT_PERIOD.name } });
  const period =
    existingPeriod ??
    (await prisma.period.create({
      data: DEFAULT_PERIOD,
    }));

  const divisionMap: Record<string, string> = {};
  for (const name of DEFAULT_DIVISIONS) {
    const existingDivision = await prisma.division.findFirst({ where: { name } });
    const division =
      existingDivision ??
      (await prisma.division.create({
        data: { name },
      }));
    divisionMap[name] = division.id;
  }

  return { periodId: period.id, divisionMap };
}

async function seedUsers(periodId: string, divisionMap: Record<string, string>) {
  console.log("Seeding default users...");
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (const u of DEFAULT_USERS) {
    try {
      await prisma.user.upsert({
        where: { nim: u.nim },
        update: {
          name: u.name,
          role: u.role,
          isActive: true,
          periodId,
          divisionId: u.division ? divisionMap[u.division] : null,
          passwordHash: hash,
        },
        create: {
          nim: u.nim,
          name: u.name,
          role: u.role,
          isActive: true,
          periodId,
          divisionId: u.division ? divisionMap[u.division] : null,
          passwordHash: hash,
        },
      });
      console.log(`Upserted user ${u.nim}`);
    } catch (err) {
      console.error(`Failed to upsert user ${u.nim}`, err);
      throw err;
    }
  }
  console.log(`Seeded/updated ${DEFAULT_USERS.length} default users.`);

  const users = await prisma.user.findMany({ select: { id: true, nim: true } });
  return users.reduce<Record<string, string>>((acc, u) => {
    acc[u.nim] = u.id;
    return acc;
  }, {});
}

async function main() {
  const { periodId, divisionMap } = await seedPeriodAndDivisions();
  await seedIndicators();
  const userMap = await seedUsers(periodId, divisionMap);
  await seedUserPasswords();
  const prokerId = await seedProker(periodId, divisionMap);
  await seedEventsAndEvaluations(periodId, prokerId, userMap);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
