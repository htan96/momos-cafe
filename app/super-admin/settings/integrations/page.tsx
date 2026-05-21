import { redirect } from "next/navigation";

export default function LegacySuperAdminSettingsIntegrationsRedirectPage() {
  redirect("/super-admin/system/integrations");
}
