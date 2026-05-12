import { NextResponse } from "next/server";
import { parseUnifiedCartLines } from "@/lib/commerce/parseUnifiedCartLines";
import { isUnifiedMerchLine } from "@/lib/commerce/parseUnifiedCartLines";
import { fetchSquareShippingQuotes } from "@/lib/shipping/squareShippingQuote";
import type { UnifiedMerchLine } from "@/types/commerce";

/**
 * POST /api/checkout/shipping-quote
 * Square **Orders.calculateOrder** — see `lib/shipping/squareShippingQuote.ts`.
 */
export async function POST(req: Request) {
  try {
    const locationId = process.env.SQUARE_LOCATION_ID?.trim();
    if (!locationId) {
      return NextResponse.json({ error: "checkout_unavailable" }, { status: 503 });
    }

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
      (l): l is UnifiedMerchLine => isUnifiedMerchLine(l) && l.shippingEligible
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
      phoneDigits.length >= 10 ? body.contact!.phone!.trim() : "+15555555555";

    const { options, detail } = await fetchSquareShippingQuotes({
      locationId,
      merchShippableLines: merchShippable,
      address: { street, city, state, postalCode },
      contact: {
        name,
        phone,
        email: body.contact?.email?.trim() || undefined,
      },
    });

    return NextResponse.json({
      options,
      ...(detail ? { detail } : {}),
      ...(options.length === 0
        ? {
            message:
              "We could not load live rates yet. Double-check your address, or choose contactless shop pickup.",
          }
        : {}),
    });
  } catch (e) {
    console.error("[checkout/shipping-quote POST]", e);
    return NextResponse.json({ error: "quote_failed" }, { status: 500 });
  }
}
