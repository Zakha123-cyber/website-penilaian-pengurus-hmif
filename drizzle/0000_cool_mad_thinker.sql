CREATE TYPE "public"."evaluation_event_type" AS ENUM('PERIODIC', 'PROKER');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'BPI', 'KADIV', 'ANGGOTA', 'KASUBDIV');--> statement-breakpoint
CREATE TABLE "auditlog" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" varchar(36),
	"action" varchar(255) NOT NULL,
	"success" boolean NOT NULL,
	"ip" varchar(255),
	"userAgent" text,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "division" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluationevent" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "evaluation_event_type" NOT NULL,
	"isOpen" boolean DEFAULT true NOT NULL,
	"startDate" timestamp with time zone NOT NULL,
	"endDate" timestamp with time zone NOT NULL,
	"periodId" varchar(36) NOT NULL,
	"prokerId" varchar(36),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluationscore" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"evaluationId" varchar(36) NOT NULL,
	"indicatorSnapshotId" varchar(36) NOT NULL,
	"score" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"evaluatorId" varchar(36) NOT NULL,
	"evaluateeId" varchar(36) NOT NULL,
	"eventId" varchar(36) NOT NULL,
	"feedback" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_evaluatorId_evaluateeId_eventId_unique" UNIQUE("evaluatorId","evaluateeId","eventId")
);
--> statement-breakpoint
CREATE TABLE "indicatorsnapshot" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"indicatorId" varchar(36) NOT NULL,
	"eventId" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicator" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(255) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "panitia" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" varchar(36) NOT NULL,
	"prokerId" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "period" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"isActive" boolean DEFAULT false NOT NULL,
	"startYear" integer NOT NULL,
	"endYear" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proker" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"divisionId" varchar(36) NOT NULL,
	"periodId" varchar(36) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"nim" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"role" "user_role" NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"passwordHash" varchar(255) NOT NULL,
	"passwordUpdatedAt" timestamp with time zone,
	"periodId" varchar(36) NOT NULL,
	"divisionId" varchar(36),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_nim_unique" UNIQUE("nim")
);
--> statement-breakpoint
CREATE INDEX "AuditLog_action_idx" ON "auditlog" USING btree ("action");--> statement-breakpoint
CREATE INDEX "AuditLog_userId_idx" ON "auditlog" USING btree ("userId");