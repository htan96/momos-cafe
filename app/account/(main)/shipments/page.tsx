import { redirect } from "next/navigation";

/** Shipments are surfaced from active orders — no standalone customer board yet. */
export default function AccountShipmentsRedirectPage() {
  redirect("/account");
}
