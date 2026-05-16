/**
 * Operational commerce visibility helpers — deep links and metadata hints only.
 * Env vars that enable link composition (any one is enough to resolve sandbox vs production host):
 * - `SQUARE_ENVIRONMENT` or `NEXT_PUBLIC_SQUARE_ENVIRONMENT` (`sandbox` → squareupsandbox.com, else squareup.com)
 * - `SQUARE_MERCHANT_ID` — optional; when set, links still use the same dashboard host (merchant id is reserved for future URL variants)
 * - `SQUARE_LOCATION_ID`, `NEXT_PUBLIC_SQUARE_LOCATION_ID`, or `SQUARE_ACCESS_TOKEN` — treated as signals that Square is configured
 *
 * **Deep links** (`payment`, `order`) additionally require Square ids passed via `context`.
 * Dashboard paths follow the Seller Dashboard; Square may adjust URLs — if a link 404s, fall back to `transactions`.
 */
export const COMMERCE_OPS_PHILOSOPHY =
  "Momos enriches operational commerce visibility (timestamps, local payment rows, timeline correlation, and Square console deep links). It does not clone Square: money movement, refunds, disputes, and authoritative payment state remain in Square. Use this stack to see what happened on our side and jump into Square when operators need the financial console.";

export type SquareDashboardLinks = {
  payment?: string;
  order?: string;
  transactions?: string;
};

type LinkEnv = NodeJS.ProcessEnv;

function envSquareConfigured(env: LinkEnv): boolean {
  return [
    env.SQUARE_ENVIRONMENT,
    env.NEXT_PUBLIC_SQUARE_ENVIRONMENT,
    env.SQUARE_MERCHANT_ID,
    env.SQUARE_LOCATION_ID,
    env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
    env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
    env.NEXT_PUBLIC_SQUARE_APP_ID,
    env.SQUARE_ACCESS_TOKEN,
  ].some((v) => (v?.trim() ?? "") !== "");
}

function dashboardOrigin(env: LinkEnv): string | undefined {
  if (!envSquareConfigured(env)) return undefined;
  const raw = (env.SQUARE_ENVIRONMENT ?? env.NEXT_PUBLIC_SQUARE_ENVIRONMENT ?? "production").trim().toLowerCase();
  return raw === "sandbox" ? "https://squareupsandbox.com" : "https://squareup.com";
}

export function buildSquareDashboardLinks(
  env: LinkEnv,
  context?: { squarePaymentId?: string | null; squareOrderId?: string | null }
): SquareDashboardLinks {
  const origin = dashboardOrigin(env);
  if (!origin) return {};

  const links: SquareDashboardLinks = {
    transactions: `${origin}/dashboard/sales/transactions`,
  };

  const payId = context?.squarePaymentId?.trim();
  if (payId) {
    links.payment = `${origin}/dashboard/sales/payments/${encodeURIComponent(payId)}`;
  }

  const ordId = context?.squareOrderId?.trim();
  if (ordId) {
    links.order = `${origin}/dashboard/orders/order/${encodeURIComponent(ordId)}`;
  }

  // Optional: merchant id currently acts as a configuration signal only (see module doc).

  return links;
}

/** Square order id sometimes mirrored in checkout metadata (not a Prisma column on `CommerceOrder`). */
export function readSquareOrderIdFromJson(meta: unknown): string | undefined {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return undefined;
  const m = meta as Record<string, unknown>;
  const direct = m.squareOrderId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const nested = m.correlation;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const c = nested as Record<string, unknown>;
    const co = c.squareOrderId;
    if (typeof co === "string" && co.trim()) return co.trim();
  }
  return undefined;
}

/** Human-readable lines for ops UI — only keys that look webhook/sync related. */
export function collectWebhookSyncHints(label: string, meta: unknown): string[] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const o = meta as Record<string, unknown>;
  const lines: string[] = [];
  for (const [k, v] of Object.entries(o)) {
    const kl = k.toLowerCase();
    if (!/webhook|square.*sync|square_sync|last.*webhook|last.*sync|square.*event/.test(kl)) continue;
    if (v == null) continue;
    const rendered = typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v);
    lines.push(`${label} metadata · ${k}: ${rendered}`);
  }
  return lines;
}
