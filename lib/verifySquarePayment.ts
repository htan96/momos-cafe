import type { SquareClient } from "square";

/** Square `Payment` statuses that mean the charge succeeded (autocomplete on). */
const CAPTURED_OK = new Set(["COMPLETED", "APPROVED"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unwrapPaymentGet(result: unknown): {
  id?: string;
  status?: string;
  amountMoney?: { amount?: bigint | string | number };
  receiptNumber?: string;
} | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const p =
    (r.payment as Record<string, unknown> | undefined) ??
    ((r.body as Record<string, unknown> | undefined)?.payment as Record<string, unknown> | undefined);
  if (!p || typeof p !== "object") return null;
  return p as {
    id?: string;
    status?: string;
    amountMoney?: { amount?: bigint | string | number };
    receiptNumber?: string;
  };
}

function toBigIntAmount(amount: unknown): bigint | null {
  if (amount == null) return null;
  if (typeof amount === "bigint") return amount;
  if (typeof amount === "number" && Number.isFinite(amount)) return BigInt(Math.round(amount));
  if (typeof amount === "string" && amount !== "") return BigInt(amount);
  return null;
}

export type VerifyPaymentResult =
  | { ok: true; status: string; receiptNumber?: string }
  | { ok: false; reason: string; lastStatus?: string };

/**
 * Confirms the payment exists in Square and is in a success state with matching amount.
 * Retries briefly in case of read-after-write lag.
 */
export async function verifySquarePaymentCaptured(
  client: SquareClient,
  paymentId: string,
  expectedAmountMinorUnits: bigint,
  options?: { attempts?: number; delayMs?: number }
): Promise<VerifyPaymentResult> {
  const attempts = Math.max(1, options?.attempts ?? 4);
  const delayMs = options?.delayMs ?? 500;
  let lastReason = "Could not verify payment";
  let lastStatus: string | undefined;

  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(delayMs);
    try {
      const raw = await client.payments.get({ paymentId });
      const p = unwrapPaymentGet(raw);
      if (!p?.id) {
        lastReason = "Square returned no payment";
        continue;
      }
      const status = (p.status ?? "").toUpperCase();
      lastStatus = p.status;

      if (status === "FAILED" || status === "CANCELED" || status === "CANCELLED") {
        return { ok: false, reason: `Payment status is ${p.status}`, lastStatus: p.status };
      }

      if (!CAPTURED_OK.has(status)) {
        lastReason = `Payment not complete yet (status: ${p.status})`;
        continue;
      }

      const charged = toBigIntAmount(p.amountMoney?.amount);
      if (charged !== null && charged !== expectedAmountMinorUnits) {
        return {
          ok: false,
          reason: `Amount mismatch: expected ${expectedAmountMinorUnits}¢, Square has ${charged}¢`,
          lastStatus: p.status,
        };
      }

      return {
        ok: true,
        status: p.status ?? status,
        receiptNumber: typeof p.receiptNumber === "string" ? p.receiptNumber : undefined,
      };
    } catch (e) {
      lastReason = e instanceof Error ? e.message : String(e);
    }
  }

  return { ok: false, reason: lastReason, lastStatus };
}
