import { redirect } from "next/navigation";

/** Security controls not yet surfaced in-account; use storefront auth flows from Profile. */
export default function AccountSettingsSecurityRedirect() {
  redirect("/account/settings/profile");
}
