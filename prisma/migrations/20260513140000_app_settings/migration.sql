-- CreateTable
CREATE TABLE "app_settings" (
    "setting_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "description" TEXT,
    "last_updated" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("setting_id")
);
