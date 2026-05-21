import { redirect } from "next/navigation";

export default function LegacySuperAdminSecuritySettingsRedirectPage() {
  redirect("/super-admin/security/events");
}
