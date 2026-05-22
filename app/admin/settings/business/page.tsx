import OpsPageHeader from "@/components/operations/OpsPageHeader";
import SettingsPanel from "@/components/admin/SettingsPanel";

/**
 * Persisted tenant configuration (Prisma `admin_settings`) — mirrors
 * `/super-admin/settings/restaurant` and shares `PUT /api/admin/settings`.
 */
export default function AdminSettingsBusinessPage() {
  return (
    <div className="space-y-8">
      <OpsPageHeader
        title="Restaurant & storefront settings"
        subtitle="Hours, prep rules, lead time and cutoff, pickup spacing, timezone, address and phone (maps and shipping origin), plus ordering-window rules — all saved to the database. Kill switches stay under Governance › Feature controls."
      />
      <div className="max-w-4xl">
        <SettingsPanel
          panelTitle="Live tenant settings"
          panelDescription="Edits debounce to the database and apply on the next site load. Requires a signed-in staff admin or super admin when Cognito is configured."
        />
      </div>
    </div>
  );
}
