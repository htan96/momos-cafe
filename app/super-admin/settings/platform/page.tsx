import { redirect } from "next/navigation";

export default function LegacySettingsPlatformRedirectPage() {
  redirect("/super-admin/platform/feature-controls");
}
