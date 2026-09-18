import type { NextResponse } from "next/server";

import {
  MOMOS_BOOTSTRAP_PENDING_COOKIE,
  bootstrapPendingMaxAgeSec,
} from "@/lib/bootstrap/config";

export {
  sealBootstrapPending,
  unsealBootstrapPending,
  type BootstrapPendingClaims,
  type BootstrapPendingPhase,
} from "@/lib/bootstrap/pendingSeal";

export function pendingCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export function clearPendingCookie(res: Pick<NextResponse, "cookies">) {
  res.cookies.set(MOMOS_BOOTSTRAP_PENDING_COOKIE, "", {
    ...pendingCookieOptions(0),
    maxAge: 0,
  });
}
