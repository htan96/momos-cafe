import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { resolveCommerceCustomerId } from "@/lib/account/effectiveAccountContext";
import { getCustomerSession } from "@/lib/auth/getCustomerSession";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { verifyInternalSecretFromRequest } from "@/lib/server/internalAuth";

/** Guest order read — storefront supplies this header when reloading order JSON without a Cognito session. */
export const MOMOS_GUEST_CART_TOKEN_HEADER = "x-momos-guest-cart-token";

export type CommerceOrderAccessSubject =
  | { kind: "internal" }
  | { kind: "ops_admin"; sub: string; email: string }
  | { kind: "customer"; customerId: string }
  | { kind: "guest_cart"; guestCartToken: string };

function timingSafeUtf8Eq(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ab.length !== bb.length || ab.length === 0) return false;
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/** Minimal row for authorization decisions. */
export type CommerceOrderAccessRow = {
  id: string;
  customerId: string | null;
  guestCartToken: string | null;
};

const FORBIDDEN = NextResponse.json(
  {
    error: "forbidden",
    code: "ORDER_ACCESS_DENIED",
    message: `Provide Cognito session (customer/admin), Bearer internal secret, or ${MOMOS_GUEST_CART_TOKEN_HEADER} for guest drafts.`,
  },
  { status: 403 }
);

/**
 * Allowed readers: internal tooling, authenticated ops/admin, authenticated customer-owner, or matching guest-cart token.
 */
export async function assertReadableCommerceOrder(
  req: Request,
  order: CommerceOrderAccessRow
): Promise<{ ok: true; subject: CommerceOrderAccessSubject } | { ok: false; response: NextResponse }> {
  if (verifyInternalSecretFromRequest(req)) {
    return { ok: true, subject: { kind: "internal" } };
  }

  const opsSession = await getOpsSession();
  if (opsSession && opsCan(opsSession.role, "console:read")) {
    return {
      ok: true,
      subject: { kind: "ops_admin", sub: opsSession.sub, email: opsSession.email },
    };
  }

  const cust = await getCustomerSession();
  if (cust?.email) {
    const customerId = await resolveCommerceCustomerId({ cognitoSub: cust.sub, email: cust.email });
    if (customerId && order.customerId === customerId) {
      return { ok: true, subject: { kind: "customer", customerId } };
    }
  }

  const guestHeader = req.headers.get(MOMOS_GUEST_CART_TOKEN_HEADER)?.trim() ?? "";
  if (guestHeader && order.guestCartToken && timingSafeUtf8Eq(guestHeader, order.guestCartToken)) {
    return { ok: true, subject: { kind: "guest_cart", guestCartToken: order.guestCartToken } };
  }

  return { ok: false, response: FORBIDDEN };
}

/**
 * Operational lifecycle mutations (`PATCH` order status / fulfillment under `/api/orders`).
 * Requires internal secret OR ops session with adequate permission — never anonymous.
 */
export function assertOperationalCommerceOrderMutation(
  req: Request,
  session: Awaited<ReturnType<typeof getOpsSession>>,
  permission: "orders:write" | "fulfillment:write"
): { ok: true } | { ok: false; response: NextResponse } {
  if (verifyInternalSecretFromRequest(req)) return { ok: true };
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "forbidden", code: "OPS_OR_INTERNAL_AUTH_REQUIRED" },
        { status: 403 }
      ),
    };
  }
  if (!opsCan(session.role, permission)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden", code: "INSUFFICIENT_OPS_PERMISSION" }, { status: 403 }),
    };
  }
  return { ok: true };
}

export async function loadOpsSessionForOrderMutation(): Promise<Awaited<ReturnType<typeof getOpsSession>>> {
  return getOpsSession();
}
