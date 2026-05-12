import {
  FulfillmentFulfillmentLineItemApplication,
  SquareClient,
  SquareEnvironment,
  SquareError,
} from "square";
import type Square from "square";
import type { UnifiedMerchLine } from "@/types/commerce";
import {
  merchLinesToSquareLineItems,
  SQUARE_ORDER_TAX_PERCENT_STRING,
  squareMoneyAmountToCents,
} from "@/lib/squareOrderFromCart";

export type ShippingQuoteAddress = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
};

export type ShippingQuoteOption = {
  /** Stable id for the UI — Square service charge uid when present */
  uid: string;
  name: string;
  amountCents: number;
};

function createSquareClient(): SquareClient | null {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN?.trim();
  if (!accessToken) return null;
  const isProduction = process.env.SQUARE_ENVIRONMENT === "production";
  return new SquareClient({
    token: accessToken,
    environment: isProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });
}

function unwrapCalculatedOrder(result: unknown): Square.Order | undefined {
  if (!result || typeof result !== "object") return undefined;
  const r = result as Record<string, unknown>;
  const nested =
    (r.order as Square.Order | undefined) ??
    ((r.body as Record<string, unknown> | undefined)?.order as Square.Order | undefined) ??
    ((r.result as Record<string, unknown> | undefined)?.order as Square.Order | undefined);
  return nested;
}

function stringifySquareCalculateErrors(errors: unknown): string {
  if (!Array.isArray(errors) || errors.length === 0) return "";
  try {
    return JSON.stringify(errors);
  } catch {
    return String(errors.length);
  }
}

function logSquareCaughtError(context: string, e: unknown): void {
  if (e instanceof SquareError) {
    const errs = stringifySquareCalculateErrors(e.errors);
    const bodyPreview =
      e.body !== undefined ? safeJsonSnippet(e.body) : "";
    console.error(context, `status=${e.statusCode}`, errs || bodyPreview || e.message || e);
    return;
  }
  console.error(context, e);
}

function safeJsonSnippet(value: unknown, maxLen = 2000): string {
  try {
    const s = JSON.stringify(value);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return "[unserializable]";
  }
}

/**
 * Preview ship-to-home pricing via **OrdersApi.calculateOrder** (`POST /v2/orders/calculate`)
 * with a `SHIPMENT` fulfillment and catalog or ad hoc line items for ship-eligible merch.
 *
 * Returned options come from Square-calculated `serviceCharges` on the order (for example
 * seller-configured delivery charges). When Square returns none, the caller should treat
 * shipping as unquoted and prompt the guest to try again or contact the shop.
 */
export async function fetchSquareShippingQuotes(params: {
  locationId: string;
  merchShippableLines: UnifiedMerchLine[];
  address: ShippingQuoteAddress;
  contact: { name: string; phone: string; email?: string };
}): Promise<{
  options: ShippingQuoteOption[];
  /** Stable machine-readable diagnostics (never include PII) */
  detail?: string;
}> {
  const client = createSquareClient();
  if (!client) {
    return { options: [], detail: "unavailable" };
  }

  if (params.merchShippableLines.length === 0) {
    return { options: [] };
  }

  const merchWithoutVariation = params.merchShippableLines.filter((l) => !l.squareVariationId?.trim());
  if (merchWithoutVariation.length > 0) {
    console.warn(
      "[squareShippingQuote] Merch lines without catalog variation ids (Square uses ad hoc line items). Shipping rules tied to catalog items may not apply.",
      { missingCount: merchWithoutVariation.length, totalMerchLines: params.merchShippableLines.length },
    );
  }

  /** Explicit uids tie SHIPMENT fulfillments to line items per Orders API Fulfillment semantics. */
  const lineItems = merchLinesToSquareLineItems(params.merchShippableLines).map((li, i) => ({
    ...li,
    uid: `ship-li-${i}`,
  })) as Square.OrderLineItem[];

  const order = {
    locationId: params.locationId,
    lineItems,
    taxes: [
      {
        uid: "web-order-sales-tax",
        name: "Sales tax",
        percentage: SQUARE_ORDER_TAX_PERCENT_STRING,
        scope: "ORDER" as const,
      },
    ],
    fulfillments: [
      {
        uid: "ship-fulfillment-preview",
        type: "SHIPMENT" as const,
        state: "PROPOSED" as const,
        lineItemApplication: FulfillmentFulfillmentLineItemApplication.All,
        shipmentDetails: {
          recipient: {
            displayName: params.contact.name.trim().slice(0, 255),
            phoneNumber: params.contact.phone.replace(/\s/g, "").slice(0, 17),
            ...(params.contact.email?.trim()
              ? { emailAddress: params.contact.email.trim().slice(0, 255) }
              : {}),
            address: {
              addressLine1: params.address.street.trim().slice(0, 255),
              locality: params.address.city.trim().slice(0, 255),
              administrativeDistrictLevel1: params.address.state.trim().slice(0, 255),
              postalCode: params.address.postalCode.replace(/\D/g, "").slice(0, 12),
              country: "US",
            },
          },
        },
      },
    ],
  };

  try {
    const resp = await client.orders.calculate({
      order: order as Square.Order,
    });
    const calc = resp as Square.CalculateOrderResponse;
    /** SDK returns `{ order?, errors? }`; keep legacy unwrap for mocked tests and older shapes. */
    const calculated = calc.order ?? unwrapCalculatedOrder(resp);

    /** CalculateOrder can still return HTTP 200 with warnings in `errors`. */
    const softErrors = calc.errors ?? undefined;
    const errSnippet = stringifySquareCalculateErrors(softErrors);
    if (softErrors?.length) {
      console.error("[squareShippingQuote] CalculateOrder reported errors:", errSnippet);
    }

    if (!calculated) {
      return { options: [], detail: softErrors?.length ? "no_order_calc_errors" : "no_order" };
    }

    const charges = calculated.serviceCharges ?? [];
    const options: ShippingQuoteOption[] = [];
    for (const sc of charges) {
      const cents = squareMoneyAmountToCents(sc.appliedMoney?.amount ?? sc.totalMoney?.amount);
      if (cents <= 0) continue;
      const name =
        (typeof sc.name === "string" && sc.name.trim().length > 0
          ? sc.name.trim()
          : "Delivery") ?? "Delivery";
      const uid =
        typeof sc.uid === "string" && sc.uid.length > 0 ? sc.uid : `charge-${options.length}`;
      options.push({ uid, name, amountCents: cents });
    }

    if (options.length === 0 && charges.length > 0) {
      console.error(
        "[squareShippingQuote] Square returned serviceCharges but none have positive amounts (sample):",
        safeJsonSnippet(
          charges.map((sc) => ({
            uid: sc.uid,
            name: sc.name,
            appliedMoney: sc.appliedMoney,
            totalMoney: sc.totalMoney,
          })),
          2500,
        ),
      );
    } else if (options.length === 0) {
      console.error(
        "[squareShippingQuote] Empty calculated serviceCharges;",
        softErrors?.length ? `square_errors=${errSnippet.slice(0, 500)}` : "square_errors=[]",
      );
    }

    let detailOut: string | undefined;
    if (options.length === 0) {
      detailOut =
        merchWithoutVariation.length > 0 ? "no_rates_some_ad_hoc_lines" : "no_rates_square_config_or_address";
      if (softErrors?.length) {
        detailOut = `${detailOut};calc_warnings`;
      }
    }

    return { options, ...(detailOut ? { detail: detailOut } : {}) };
  } catch (e) {
    logSquareCaughtError("[squareShippingQuote] calculate threw", e);
    return {
      options: [],
      detail: e instanceof SquareError ? `square_http_${e.statusCode ?? "err"}` : "square_error",
    };
  }
}
