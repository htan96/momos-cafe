import { redirect } from "next/navigation";

/** Placeholder drained from nav IA — broadcasts still route through governance backlogs elsewhere. */
export default function SuperAdminPlatformNotificationsDeferredPage() {
  redirect("/super-admin/platform/feature-controls?notice=platform-notifications-deferred#operational-presets");
}
