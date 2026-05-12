import {
  Shippo,
  TransactionStatusEnum,
  type AddressCreateRequest,
  type ParcelCreateRequest,
  type TransactionCreateRequest,
} from "shippo";

export type NormalizedShippingQuoteOption = {
  uid: string;
  name: string;
  amountCents: number;
  estimatedDays?: number;
  provider?: string;
};

/** Live Shippo only — sandbox tokens are rejected */
function isShippoProductionEnv(): boolean {
  const m = (process.env.SHIPPO_ENV ?? "").trim().toLowerCase();
  return m === "production" || m === "live";
}

function isDisallowedTestApiKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  return k.startsWith("shippo_test_") || k.includes("shippo_test");
}

export function createShippoClient(): Shippo | null {
  const key = process.env.SHIPPO_API_KEY?.trim();
  if (!key) return null;
  if (!isShippoProductionEnv()) {
    console.error(
      "[shippo] SHIPPO_ENV must be production or live — sandbox mode is disabled for Momo's shipping."
    );
    return null;
  }
  if (isDisallowedTestApiKey(key)) {
    console.error(
      "[shippo] Test/sandbox API keys are not allowed — use SHIPPO_API_KEY=shippo_live_* with SHIPPO_ENV=production."
    );
    return null;
  }
  return new Shippo({ apiKeyHeader: key });
}

function amountToCents(amountStr: string): number {
  const n = Number.parseFloat(amountStr);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function rateDisplayName(provider: string, serviceName?: string): string {
  const svc = serviceName?.trim() || "Standard";
  return `${provider} · ${svc}`;
}

/**
 * Create a shipment (sync) and return normalized rate options for storefront checkout.
 */
export async function getShippoRates(params: {
  from: AddressCreateRequest;
  to: AddressCreateRequest;
  parcel: ParcelCreateRequest;
}): Promise<
  | { ok: true; options: NormalizedShippingQuoteOption[] }
  | { ok: false; logDetail: string }
> {
  const client = createShippoClient();
  if (!client) {
    return { ok: false, logDetail: "shippo_client_unavailable_or_misconfigured" };
  }

  try {
    const shipment = await client.shipments.create({
      addressFrom: params.from,
      addressTo: params.to,
      parcels: [params.parcel],
      async: false,
    });

    const rates = Array.isArray(shipment.rates) ? shipment.rates : [];
    const options: NormalizedShippingQuoteOption[] = [];

    for (const r of rates) {
      if (r.currency !== "USD") continue;
      const cents = amountToCents(r.amount);
      if (cents <= 0) continue;
      const provider = r.provider?.trim() || "Carrier";
      const svc = r.servicelevel?.name?.trim();
      options.push({
        uid: r.objectId,
        name: rateDisplayName(provider, svc),
        amountCents: cents,
        estimatedDays: typeof r.estimatedDays === "number" ? r.estimatedDays : undefined,
        provider,
      });
    }

    options.sort((a, b) => a.amountCents - b.amountCents);

    return { ok: true, options };
  } catch (e) {
    const detail =
      e && typeof e === "object" && "body" in e
        ? String((e as { body?: unknown }).body ?? e)
        : e instanceof Error
          ? e.message
          : String(e);
    return { ok: false, logDetail: detail.slice(0, 4000) };
  }
}

export type PurchaseLabelResult =
  | {
      ok: true;
      trackingNumber?: string;
      carrier?: string;
      labelUrl?: string;
      transactionId?: string;
    }
  | { ok: false; logDetail: string };

/**
 * Purchase a label for a previously quoted rate id (ops / fulfillment automation).
 * Keeps all failure detail server-side; callers map to guest-safe copy.
 */
export async function purchaseShippoLabel(rateObjectId: string): Promise<PurchaseLabelResult> {
  const client = createShippoClient();
  if (!client) {
    return { ok: false, logDetail: "shippo_client_unavailable_or_misconfigured" };
  }

  try {
    const body: TransactionCreateRequest = {
      rate: rateObjectId,
      async: false,
    };
    const tx = await client.transactions.create(body);

    if (tx.status !== TransactionStatusEnum.Success) {
      const msgs = tx.messages?.map((m) => m.text).filter(Boolean).join("; ");
      return {
        ok: false,
        logDetail: `transaction_status=${tx.status}${msgs ? `; ${msgs}` : ""}`,
      };
    }

    let carrier: string | undefined;
    if (tx.rate && typeof tx.rate === "object") {
      carrier = tx.rate.provider?.trim();
    }

    return {
      ok: true,
      trackingNumber: tx.trackingNumber ?? undefined,
      carrier,
      labelUrl: tx.labelUrl ?? undefined,
      transactionId: tx.objectId,
    };
  } catch (e) {
    const detail =
      e && typeof e === "object" && "body" in e
        ? String((e as { body?: unknown }).body ?? e)
        : e instanceof Error
          ? e.message
          : String(e);
    return { ok: false, logDetail: detail.slice(0, 4000) };
  }
}
