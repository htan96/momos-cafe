import GovPageHeader from "@/components/governance/GovPageHeader";
import SettingsPanel from "@/components/admin/SettingsPanel";

export default function SuperAdminRestaurantSettingsPage() {
  return (
    <div className="space-y-8">
      <GovPageHeader
        eyebrow="Settings · Restaurant"
        title="Hours, prep rules & storefront details"
        subtitle="Weekly open hours, optional kitchen window overrides, lead time, last-order cutoff, pickup spacing, and restaurant timezone control when guests can order food and how pickup slots are generated. Address and phone here also feed maps, labels, and shipping origin."
      />
      <div className="max-w-4xl">
        <SettingsPanel
          panelTitle="Live tenant settings"
          panelDescription="Edits debounce to the database and apply on the next site load. You must be signed in as staff (admin or super admin) when Cognito is configured."
        />
      </div>
    </div>
  );
}
