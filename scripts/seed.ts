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
      })
    )
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
}

async function main() {
  const { periodId, divisionMap } = await seedPeriodAndDivisions();
  await seedIndicators();
  await seedUsers(periodId, divisionMap);
  await seedUserPasswords();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
