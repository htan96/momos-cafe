import { SignJWT, jwtVerify } from "jose";

import {
  bootstrapPendingMaxAgeSec,
  normalizedBootstrapAdminEmail,
} from "@/lib/bootstrap/config";
import { bootstrapSessionHmacKeyMaterial } from "@/lib/bootstrap/sessionKey";

export type BootstrapPendingPhase = "password_ok" | "totp_setup";

export type BootstrapPendingClaims = {
  email: string;
  phase: BootstrapPendingPhase;
};

export async function sealBootstrapPending(
  claims: BootstrapPendingClaims
): Promise<string> {
  const key = bootstrapSessionHmacKeyMaterial();
  return await new SignJWT({
    typ: "bootstrap_pending",
    email: claims.email,
    phase: claims.phase,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${bootstrapPendingMaxAgeSec()}s`)
    .sign(key);
}

export async function unsealBootstrapPending(
  compact: string | null | undefined
): Promise<BootstrapPendingClaims | null> {
  if (!compact?.length) return null;
  const guard = normalizedBootstrapAdminEmail();
  if (!guard) return null;

  try {
    const key = bootstrapSessionHmacKeyMaterial();
    const { payload } = await jwtVerify(compact, key);
    if (payload.typ !== "bootstrap_pending") return null;
    const email =
      typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (email !== guard) return null;
    const phase = payload.phase;
    if (phase !== "password_ok" && phase !== "totp_setup") return null;
    return { email, phase };
  } catch {
    return null;
  }
}
