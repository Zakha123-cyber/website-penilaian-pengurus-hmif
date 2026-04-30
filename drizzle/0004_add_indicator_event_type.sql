ALTER TABLE "indicator" ADD COLUMN "eventType" "evaluation_event_type" NOT NULL DEFAULT 'PERIODIC';
--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "evaluatorRole" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "evaluateeRole" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "indicator" ALTER COLUMN "eventType" DROP DEFAULT;
