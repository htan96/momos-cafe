import QRCode from "qrcode";
import { generateSecret, generateURI, verify } from "otplib";

import { normalizedBootstrapAdminEmail } from "@/lib/bootstrap/config";

const ISSUER = "Momo's Vallejo";

export function createBootstrapTotpSecret(): string {
  return generateSecret();
}

export function bootstrapOtpAuthUri(secret: string, email: string): string {
  return generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });
}

export async function bootstrapQrDataUrl(secret: string): Promise<string> {
  const email = normalizedBootstrapAdminEmail();
  if (!email) throw new Error("bootstrap_email_unconfigured");
  const uri = bootstrapOtpAuthUri(secret, email);
  return QRCode.toDataURL(uri, { margin: 2, width: 220 });
}

export async function verifyBootstrapTotpCode(
  secret: string,
  token: string
): Promise<boolean> {
  const code = token.replace(/\D/g, "").slice(0, 6);
  if (code.length !== 6) return false;
  const result = await verify({ secret, token: code });
  return result.valid === true;
}
