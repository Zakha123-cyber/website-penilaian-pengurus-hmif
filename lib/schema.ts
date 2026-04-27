import {
    mysqlTable,
    mysqlEnum,
    varchar,
    tinyint,
    int,
    datetime,
    text,
    json,
    unique,
    index,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = mysqlEnum("role", [
    "ADMIN",
    "BPI",
    "KADIV",
    "ANGGOTA",
    "KASUBDIV",
]);

export const eventTypeEnum = mysqlEnum("type", ["PERIODIC", "PROKER"]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const periods = mysqlTable("period", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: tinyint("isActive").notNull().default(0),
    startYear: int("startYear").notNull(),
    endYear: int("endYear").notNull(),
    createdAt: datetime("createdAt", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const users = mysqlTable("user", {
    id: varchar("id", { length: 36 }).primaryKey(),
    nim: varchar("nim", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    role: mysqlEnum("role", ["ADMIN", "BPI", "KADIV", "ANGGOTA", "KASUBDIV"]).notNull(),
    isActive: tinyint("isActive").notNull().default(1),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    passwordUpdatedAt: datetime("passwordUpdatedAt", { mode: "date" }),
    periodId: varchar("periodId", { length: 36 }).notNull(),
    divisionId: varchar("divisionId", { length: 36 }),
    subdivisionId: varchar("subdivisionId", { length: 36 }),
    createdAt: datetime("createdAt", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const divisions = mysqlTable("division", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: datetime("createdAt", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const subdivisions = mysqlTable("subdivision", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    divisionId: varchar("divisionId", { length: 36 }).notNull(),
    createdAt: datetime("createdAt", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const prokers = mysqlTable("proker", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    divisionId: varchar("divisionId", { length: 36 }).notNull(),
    periodId: varchar("periodId", { length: 36 }).notNull(),
    createdAt: datetime("createdAt", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const panitia = mysqlTable("panitia", {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("userId", { length: 36 }).notNull(),
    prokerId: varchar("prokerId", { length: 36 }).notNull(),
});

export const evaluationEvents = mysqlTable("evaluationevent", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["PERIODIC", "PROKER"]).notNull(),
    isOpen: tinyint("isOpen").notNull().default(1),
    startDate: datetime("startDate", { mode: "date" }).notNull(),
    endDate: datetime("endDate", { mode: "date" }).notNull(),
    periodId: varchar("periodId", { length: 36 }).notNull(),
    prokerId: varchar("prokerId", { length: 36 }),
    createdAt: datetime("createdAt", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const indicators = mysqlTable("indicator", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["PERIODIC", "PROKER"]).notNull().default("PERIODIC"),
    evaluatorRole: mysqlEnum("evaluatorRole", ["ADMIN", "BPI", "KADIV", "ANGGOTA", "KASUBDIV"]),
    evaluateeRole: mysqlEnum("evaluateeRole", ["ADMIN", "BPI", "KADIV", "ANGGOTA", "KASUBDIV"]),
    isActive: tinyint("isActive").notNull().default(1),
    createdAt: datetime("createdAt", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const indicatorSnapshots = mysqlTable("indicatorsnapshot", {
    id: varchar("id", { length: 36 }).primaryKey(),
    indicatorId: varchar("indicatorId", { length: 36 }).notNull(),
    eventId: varchar("eventId", { length: 36 }).notNull(),
});

export const evaluations = mysqlTable(
    "evaluation",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        evaluatorId: varchar("evaluatorId", { length: 36 }).notNull(),
        evaluateeId: varchar("evaluateeId", { length: 36 }).notNull(),
        eventId: varchar("eventId", { length: 36 }).notNull(),
        feedback: text("feedback"),
        createdAt: datetime("createdAt", { mode: "date" }).notNull().$defaultFn(() => new Date()),
    },
    (table) => ({
        uniqueEval: unique().on(table.evaluatorId, table.evaluateeId, table.eventId),
    })
);

export const evaluationScores = mysqlTable("evaluationscore", {
    id: varchar("id", { length: 36 }).primaryKey(),
    evaluationId: varchar("evaluationId", { length: 36 }).notNull(),
    indicatorSnapshotId: varchar("indicatorSnapshotId", { length: 36 }).notNull(),
    score: int("score").notNull(),
    createdAt: datetime("createdAt", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const auditLogs = mysqlTable(
    "auditlog",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        userId: varchar("userId", { length: 36 }),
        action: varchar("action", { length: 255 }).notNull(),
        success: tinyint("success").notNull(),
        ip: varchar("ip", { length: 255 }),
        userAgent: text("userAgent"),
        metadata: json("metadata"),
        createdAt: datetime("createdAt", { mode: "date" }).notNull().$defaultFn(() => new Date()),
    },
    (table) => ({
        actionIdx: index("AuditLog_action_idx").on(table.action),
        userIdx: index("AuditLog_userId_idx").on(table.userId),
    })
);

// ─── Relations ─────────────────────────────────────────────────────────────────

export const periodsRelations = relations(periods, ({ many }) => ({
    users: many(users),
    events: many(evaluationEvents),
    prokers: many(prokers),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
    period: one(periods, { fields: [users.periodId], references: [periods.id] }),
    division: one(divisions, { fields: [users.divisionId], references: [divisions.id] }),
    subdivision: one(subdivisions, { fields: [users.subdivisionId], references: [subdivisions.id] }),
    panitia: many(panitia),
    evaluationsGiven: many(evaluations, { relationName: "evaluator" }),
    evaluationsReceived: many(evaluations, { relationName: "evaluatee" }),
    auditLogs: many(auditLogs),
}));

export const divisionsRelations = relations(divisions, ({ many }) => ({
    users: many(users),
    prokers: many(prokers),
    subdivisions: many(subdivisions),
}));

export const subdivisionsRelations = relations(subdivisions, ({ one, many }) => ({
    division: one(divisions, { fields: [subdivisions.divisionId], references: [divisions.id] }),
    users: many(users),
}));

export const prokersRelations = relations(prokers, ({ one, many }) => ({
    division: one(divisions, { fields: [prokers.divisionId], references: [divisions.id] }),
    period: one(periods, { fields: [prokers.periodId], references: [periods.id] }),
    panitia: many(panitia),
    events: many(evaluationEvents),
}));

export const panitiaRelations = relations(panitia, ({ one }) => ({
    user: one(users, { fields: [panitia.userId], references: [users.id] }),
    proker: one(prokers, { fields: [panitia.prokerId], references: [prokers.id] }),
}));

export const evaluationEventsRelations = relations(evaluationEvents, ({ one, many }) => ({
    period: one(periods, { fields: [evaluationEvents.periodId], references: [periods.id] }),
    proker: one(prokers, { fields: [evaluationEvents.prokerId], references: [prokers.id] }),
    indicators: many(indicatorSnapshots),
    evaluations: many(evaluations),
}));

export const indicatorsRelations = relations(indicators, ({ many }) => ({
    snapshots: many(indicatorSnapshots),
}));

export const indicatorSnapshotsRelations = relations(indicatorSnapshots, ({ one, many }) => ({
    indicator: one(indicators, { fields: [indicatorSnapshots.indicatorId], references: [indicators.id] }),
    event: one(evaluationEvents, { fields: [indicatorSnapshots.eventId], references: [evaluationEvents.id] }),
    scores: many(evaluationScores),
}));

export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
    evaluator: one(users, { fields: [evaluations.evaluatorId], references: [users.id], relationName: "evaluator" }),
    evaluatee: one(users, { fields: [evaluations.evaluateeId], references: [users.id], relationName: "evaluatee" }),
    event: one(evaluationEvents, { fields: [evaluations.eventId], references: [evaluationEvents.id] }),
    scores: many(evaluationScores),
}));

export const evaluationScoresRelations = relations(evaluationScores, ({ one }) => ({
    evaluation: one(evaluations, { fields: [evaluationScores.evaluationId], references: [evaluations.id] }),
    indicatorSnapshot: one(indicatorSnapshots, {
        fields: [evaluationScores.indicatorSnapshotId],
        references: [indicatorSnapshots.id],
    }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

// ─── Inferred types ───────────────────────────────────────────────────────────

export type Period = typeof periods.$inferSelect;
export type User = typeof users.$inferSelect;
export type Division = typeof divisions.$inferSelect;
export type Subdivision = typeof subdivisions.$inferSelect;
export type Proker = typeof prokers.$inferSelect;
export type Panitia = typeof panitia.$inferSelect;
export type EvaluationEvent = typeof evaluationEvents.$inferSelect;
export type Indicator = typeof indicators.$inferSelect;
export type IndicatorSnapshot = typeof indicatorSnapshots.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;
export type EvaluationScore = typeof evaluationScores.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
