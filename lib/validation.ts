import { z } from "zod";

// Helper: converts boolean/truthy input to 0|1 for MySQL tinyint columns
const tinyBool = (defaultVal: 0 | 1) =>
  z.coerce
    .boolean()
    .optional()
    .default(defaultVal === 1)
    .transform((v) => (v ? 1 : 0) as 0 | 1);

export const loginSchema = z.object({
  nim: z.string().min(3),
  password: z.string().min(6),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const createPeriodSchema = z
  .object({
    name: z.string().min(1, "Nama wajib diisi"),
    startYear: z.coerce.number().int(),
    endYear: z.coerce.number().int(),
    isActive: tinyBool(0),
  })
  .refine((data) => data.startYear <= data.endYear, {
    message: "Tahun mulai harus lebih kecil atau sama dengan tahun akhir",
    path: ["startYear"],
  });

const roleEnum = z.enum(["ADMIN", "BPI", "KADIV", "KASUBDIV", "ANGGOTA"]);

export const createUserSchema = z.object({
  nim: z.string().min(3),
  name: z.string().min(1),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  role: roleEnum,
  periodId: z.string().min(1),
  divisionId: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : v)),
  subdivisionId: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : v)),
  password: z.string().min(6),
  isActive: tinyBool(1),
});

export const updateUserSchema = z.object({
  nim: z.string().min(3),
  name: z.string().min(1),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  role: roleEnum,
  periodId: z.string().min(1),
  divisionId: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : v)),
  subdivisionId: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : v)),
  password: z
    .string()
    .min(6)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  isActive: tinyBool(1),
});

export const createDivisionSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
});

export const createProkerSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  divisionId: z.string().min(1),
  periodId: z.string().min(1),
});

export const updateProkerSchema = createProkerSchema;

export const addPanitiaSchema = z.object({
  userId: z.string().min(1),
});

const hierarchyRoleEnum = z.enum(["BPI", "KADIV", "KASUBDIV", "ANGGOTA"]);

export const createIndicatorSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  type: z.enum(["PERIODIC", "PROKER"]).default("PERIODIC"),
  evaluatorRole: hierarchyRoleEnum.nullable().optional().or(z.literal("")).transform(v => v === "" ? null : v),
  evaluateeRole: hierarchyRoleEnum.nullable().optional().or(z.literal("")).transform(v => v === "" ? null : v),
  isActive: tinyBool(1),
}).refine(data => data.type === "PROKER" || (data.evaluatorRole && data.evaluateeRole), {
  message: "Hierarki peran wajib diisi untuk indikator periodik",
  path: ["evaluatorRole"]
});

export const updateIndicatorSchema = createIndicatorSchema;

export const createEventSchema = z
  .object({
    name: z.string().min(1, "Nama wajib diisi"),
    type: z.enum(["PERIODIC", "PROKER"]),
    periodId: z.string().min(1),
    prokerId: z.string().optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isOpen: tinyBool(1),
    indicatorIds: z.array(z.string().min(1)).min(1, "Pilih minimal 1 indikator"),
  })
  .refine((data) => (data.type === "PROKER" ? !!data.prokerId : true), {
    message: "Proker wajib diisi untuk event PROKER",
    path: ["prokerId"],
  });

export const updateEventSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  isOpen: tinyBool(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const submitEvaluationSchema = z.object({
  evaluationId: z.string().min(1),
  feedback: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === undefined ? "" : v)),
  scores: z
    .array(
      z.object({
        indicatorSnapshotId: z.string().min(1),
        score: z.coerce.number().int().min(1).max(5),
      })
    )
    .min(1, "Minimal satu nilai"),
});
