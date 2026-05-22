/** Read `customer.email` from persisted `cafe_orders.customer` JSON. */
export function readCafeOrderCustomerEmail(customerJson: unknown): string | null {
  if (!customerJson || typeof customerJson !== "object" || Array.isArray(customerJson)) return null;
  const email = (customerJson as Record<string, unknown>).email;
  const t = typeof email === "string" ? email.trim().toLowerCase() : "";
  return t.includes("@") ? t : null;
}
