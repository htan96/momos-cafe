import { redirect } from "next/navigation";

export default function LegacySuperAdminSettingsHealthRedirectPage() {
  redirect("/super-admin/system/service-health");
}
