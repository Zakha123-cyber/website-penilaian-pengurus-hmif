ALTER TABLE "indicator" ADD COLUMN "evaluatorRole" "user_role" NOT NULL DEFAULT 'ANGGOTA';
--> statement-breakpoint
ALTER TABLE "indicator" ADD COLUMN "evaluateeRole" "user_role" NOT NULL DEFAULT 'KADIV';
--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "evaluatorRole" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "evaluateeRole" DROP DEFAULT;
