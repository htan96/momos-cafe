-- Expand governance_audit_events for attributable permanent audit history (camelCase columns mapped in Prisma).

DROP INDEX IF EXISTS "governance_audit_events_type_idx";

ALTER TABLE "governance_audit_events" RENAME COLUMN "type" TO "action_type";
ALTER TABLE "governance_audit_events" RENAME COLUMN "actor_sub" TO "actor_id";
ALTER TABLE "governance_audit_events" RENAME COLUMN "actor_email" TO "actor_name";
ALTER TABLE "governance_audit_events" RENAME COLUMN "target_email" TO "target_name";
ALTER TABLE "governance_audit_events" RENAME COLUMN "meta" TO "metadata";

ALTER TABLE "governance_audit_events" ADD COLUMN "category" TEXT;
ALTER TABLE "governance_audit_events" ADD COLUMN "actor_role" TEXT;
ALTER TABLE "governance_audit_events" ADD COLUMN "target_type" TEXT;
ALTER TABLE "governance_audit_events" ADD COLUMN "target_id" TEXT;
ALTER TABLE "governance_audit_events" ADD COLUMN "description" TEXT;
ALTER TABLE "governance_audit_events" ADD COLUMN "reason" TEXT;
ALTER TABLE "governance_audit_events" ADD COLUMN "ip_address" VARCHAR(64);

UPDATE "governance_audit_events" SET "action_type" = CASE "action_type"
  WHEN 'impersonation_start' THEN 'IMPERSONATION_STARTED'
  WHEN 'impersonation_end' THEN 'IMPERSONATION_ENDED'
  WHEN 'perspective_change' THEN 'PERSPECTIVE_CHANGED'
  WHEN 'platform_feature_patch' THEN 'PLATFORM_FEATURE_UPDATED'
  WHEN 'governance_control_patch' THEN 'GOVERNANCE_CONTROL_UPDATED'
  ELSE "action_type"
END;

CREATE INDEX "governance_audit_events_action_type_idx" ON "governance_audit_events"("action_type");
