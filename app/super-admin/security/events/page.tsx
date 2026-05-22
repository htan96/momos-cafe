import { redirect } from "next/navigation";

/** Honest shim — authoritative security KPIs belong in provider consoles, not synthesized tiles here. */
export default function SuperAdminSecurityEventsRedirectPage() {
  redirect("/super-admin/security/audit-logs?notice=security-events-deferred");
}
