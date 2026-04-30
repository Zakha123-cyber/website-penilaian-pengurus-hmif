import {
    pgTable,
    pgEnum,
    varchar,
    boolean,
    integer,
    timestamp,
    text,
    jsonb,
    unique,
    index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("user_role", [
    "ADMIN",
    "BPI",
    "KADIV",
    "ANGGOTA",
    "KASUBDIV",
]);

export const eventTypeEnum = pgEnum("evaluation_event_type", ["PERIODIC", "PROKER"]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const periods = pgTable("period", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: boolean("isActive").notNull().default(false),
    startYear: integer("startYear").notNull(),
    endYear: integer("endYear").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("user", {
    id: varchar("id", { length: 36 }).primaryKey(),
    nim: varchar("nim", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    role: roleEnum("role").notNull(),
    isActive: boolean("isActive").notNull().default(true),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    passwordUpdatedAt: timestamp("passwordUpdatedAt", { mode: "date", withTimezone: true }),
    periodId: varchar("periodId", { length: 36 }).notNull(),
    divisionId: varchar("divisionId", { length: 36 }),
    subdivisionId: varchar("subdivisionId", { length: 36 }),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

export const divisions = pgTable("division", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

export const subdivisions = pgTable("subdivision", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    divisionId: varchar("divisionId", { length: 36 }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

export const prokers = pgTable("proker", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    divisionId: varchar("divisionId", { length: 36 }).notNull(),
    periodId: varchar("periodId", { length: 36 }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

export const panitia = pgTable("panitia", {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("userId", { length: 36 }).notNull(),
    prokerId: varchar("prokerId", { length: 36 }).notNull(),
});

export const evaluationEvents = pgTable("evaluationevent", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: eventTypeEnum("type").notNull(),
    isOpen: boolean("isOpen").notNull().default(true),
    startDate: timestamp("startDate", { mode: "date", withTimezone: true }).notNull(),
    endDate: timestamp("endDate", { mode: "date", withTimezone: true }).notNull(),
    periodId: varchar("periodId", { length: 36 }).notNull(),
    prokerId: varchar("prokerId", { length: 36 }),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

export const indicators = pgTable("indicator", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    eventType: eventTypeEnum("eventType").notNull(),
    evaluatorRole: roleEnum("evaluatorRole"),
    evaluateeRole: roleEnum("evaluateeRole"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

export const indicatorSnapshots = pgTable("indicatorsnapshot", {
    id: varchar("id", { length: 36 }).primaryKey(),
    indicatorId: varchar("indicatorId", { length: 36 }).notNull(),
    eventId: varchar("eventId", { length: 36 }).notNull(),
});

export const evaluations = pgTable(
    "evaluation",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        evaluatorId: varchar("evaluatorId", { length: 36 }).notNull(),
        evaluateeId: varchar("evaluateeId", { length: 36 }).notNull(),
        eventId: varchar("eventId", { length: 36 }).notNull(),
        feedback: text("feedback"),
        createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    },
    (table) => ({
        uniqueEval: unique().on(table.evaluatorId, table.evaluateeId, table.eventId),
    })
);

export const evaluationScores = pgTable("evaluationscore", {
    id: varchar("id", { length: 36 }).primaryKey(),
    evaluationId: varchar("evaluationId", { length: 36 }).notNull(),
    indicatorSnapshotId: varchar("indicatorSnapshotId", { length: 36 }).notNull(),
    score: integer("score").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable(
    "auditlog",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        userId: varchar("userId", { length: 36 }),
        action: varchar("action", { length: 255 }).notNull(),
        success: boolean("success").notNull(),
        ip: varchar("ip", { length: 255 }),
        userAgent: text("userAgent"),
        metadata: jsonb("metadata"),
        createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
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
