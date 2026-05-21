import { redirect } from "next/navigation";

export default function LegacySuperAdminAuditRedirectPage() {
  redirect("/super-admin/security/audit-logs");
}
