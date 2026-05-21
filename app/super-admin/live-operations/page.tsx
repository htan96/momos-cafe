import { redirect } from "next/navigation";

/** @deprecated Canonical route is `/super-admin/live-activity`. */
export default function LegacyLiveOperationsRedirectPage() {
  redirect("/super-admin/live-activity");
}
