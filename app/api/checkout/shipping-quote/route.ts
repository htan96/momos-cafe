import { NextResponse } from "next/server";
import { parseUnifiedCartLines } from "@/lib/commerce/parseUnifiedCartLines";
import { isUnifiedMerchLine } from "@/lib/commerce/parseUnifiedCartLines";
import { buildParcelEstimate } from "@/lib/shipping/buildParcelEstimate";
import { getShippoRates, readShippoWarehouseAddress } from "@/lib/shipping/shippoClient";
import type { UnifiedMerchLine } from "@/types/commerce";
import type { AddressCreateRequest } from "shippo";

function exposeShippingQuoteDetailToClient(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DEBUG_SHIPPING === "1"
  );
}

/**
 * POST /api/checkout/shipping-quote
 * Carrier rate preview for eligible shop lines — server-side integration only (no carrier branding in UI).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      lines?: unknown;
      address?: {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
      };
      contact?: { name?: string; phone?: string; email?: string };
    };

    const { lines, issues } = parseUnifiedCartLines(body.lines);
    if (issues.length > 0) {
      return NextResponse.json({ error: "invalid_cart", issues }, { status: 422 });
    }

    const merchShippable = lines.filter(
      (l): l is UnifiedMerchLine =>
        isUnifiedMerchLine(l) && l.shippingEligible && l.kind === "merch" && l.fulfillmentSlug !== "gift_card"
    );

    if (merchShippable.length === 0) {
      return NextResponse.json({ options: [], message: "no_ship_items" });
    }

    const street = body.address?.street?.trim() ?? "";
    const city = body.address?.city?.trim() ?? "";
    const state = body.address?.state?.trim() ?? "";
    const postalCode = body.address?.postalCode?.trim() ?? "";
    if (street.length < 3 || city.length < 2 || state.length < 2 || postalCode.replace(/\D/g, "").length < 5) {
      return NextResponse.json({ error: "address_incomplete" }, { status: 400 });
    }

    const name =
      body.contact?.name?.trim().length && body.contact.name.trim().length >= 2
        ? body.contact.name.trim().slice(0, 255)
        : "Guest";
    const phoneDigits = (body.contact?.phone ?? "").replace(/\D/g, "");
    const phone =
      phoneDigits.length >= 10 ? body.contact!.phone!.trim().slice(0, 32) : "+15555555555";

    const from = readShippoWarehouseAddress();
    if (!from) {
      console.error("[checkout/shipping-quote] Missing SHIPPO_FROM_* warehouse address env");
      return NextResponse.json(
        {
          options: [],
          message: "Delivery quotes are not available right now. Try shop pickup or contact the restaurant.",
        },
        { status: 503 }
      );
    }

    const to: AddressCreateRequest = {
      name,
      street1: street.slice(0, 120),
      city: city.slice(0, 120),
      state: state.slice(0, 8),
      zip: postalCode.slice(0, 16),
      country: "US",
      phone,
      ...(body.contact?.email?.trim() ? { email: body.contact.email.trim().slice(0, 254) } : {}),
    };

    const parcel = buildParcelEstimate(merchShippable);
    const result = await getShippoRates({ from, to, parcel });

    if (!result.ok) {
      console.error("[checkout/shipping-quote] Rate lookup failed:", result.logDetail);
      return NextResponse.json({
        options: [],
        message:
          "We couldn’t load delivery prices right now. Check your address, choose contactless shop pickup, or try again shortly.",
        ...(exposeShippingQuoteDetailToClient() ? { detail: "rate_unavailable" } : {}),
      });
    }

    const options = result.options;

    return NextResponse.json({
      options,
      ...(exposeShippingQuoteDetailToClient() && options.length === 0 ? { detail: "no_rates" } : {}),
      ...(options.length === 0
        ? {
            message:
              "No delivery options matched this address yet. Try another ZIP or choose shop pickup.",
          }
        : {}),
    });
  } catch (e) {
    console.error("[checkout/shipping-quote POST]", e);
    return NextResponse.json(
      {
        error: "quote_failed",
        message: "Something went wrong loading delivery options. Please try again.",
      },
      { status: 500 }
    );
  }
}
