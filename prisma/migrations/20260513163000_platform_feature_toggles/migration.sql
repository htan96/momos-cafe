-- CreateTable
CREATE TABLE "platform_feature_toggles" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,

    CONSTRAINT "platform_feature_toggles_pkey" PRIMARY KEY ("key")
);
