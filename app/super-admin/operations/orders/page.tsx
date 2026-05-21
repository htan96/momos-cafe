import { redirect } from "next/navigation";

/** Canonical fulfillment surface stays on order operations until IA converges under `/operations/orders`. */
export default function OperationsOrdersRoutingPage() {
  redirect("/super-admin/order-operations");
}
