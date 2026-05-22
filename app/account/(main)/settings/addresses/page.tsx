import { redirect } from "next/navigation";

export default function AccountSettingsAddressesRedirect() {
  redirect("/account/settings/profile");
}
