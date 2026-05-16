export const IMPERSONATION_COOKIE = "momos_impersonation";

/** `customer` is fully supported (ledger + storefront session). `admin` is reserved — see `impersonation/start` (501 until middleware supports effective groups). */
export type ImpersonationScope = "customer" | "admin";
