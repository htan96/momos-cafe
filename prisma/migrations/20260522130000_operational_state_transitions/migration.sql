-- Minimal append-only operational transition audit (support workflow first).

CREATE TABLE "operational_state_transitions" (
    "id" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "domain" VARCHAR(32) NOT NULL,
    "entity_id" VARCHAR(40) NOT NULL,
    "from_status" VARCHAR(64) NOT NULL,
    "to_status" VARCHAR(64) NOT NULL,
    "actor_type" VARCHAR(32) NOT NULL,
    "actor_id" VARCHAR(128) NOT NULL,
    "actor_name" VARCHAR(320),
    "source_system" VARCHAR(64) NOT NULL,
    "note" TEXT,
    "metadata" JSONB,

    CONSTRAINT "operational_state_transitions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operational_state_transitions_domain_entity_id_idx" ON "operational_state_transitions"("domain", "entity_id");
