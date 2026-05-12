import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  OPS_SESSION_COOKIE,
  isOpsRole,
  opsSigningKeyMaterial,
  signOpsSessionPayload,
} from "@/lib/ops/sessionCrypto";
import type { OpsRole } from "@/lib/ops/types";

/** Ensures bcrypt work on unknown emails without leaking validity via timing. */
const DUMMY_BCRYPT_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function POST(req: Request) {
  const signingReady = opsSigningKeyMaterial();
  if (!signingReady) {
    return NextResponse.json({ error: "ops_unconfigured" }, { status: 503 });
  }

  const adminEmail = normalizeEmail(process.env.OPS_ADMIN_EMAIL ?? "");
  const adminHash = process.env.OPS_ADMIN_PASSWORD_HASH?.trim() ?? "";
  if (!adminEmail || !adminHash) {
    console.error("[ops/login] OPS_ADMIN_EMAIL / OPS_ADMIN_PASSWORD_HASH not set");
    return NextResponse.json({ error: "ops_unconfigured" }, { status: 503 });
  }

  let body: { email?: string; password?: string; role?: OpsRole };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const role: OpsRole =
    body.role && isOpsRole(body.role) ? body.role : "admin";

  if (!email || !password) {
    return NextResponse.json({ error: "credentials_required" }, { status: 400 });
  }

  if (email !== adminEmail) {
    await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, adminHash);
  if (!ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const token = await signOpsSessionPayload({ email, role, exp });
  if (!token) {
    return NextResponse.json({ error: "session_sign_failed" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, email, role });
  const secure = process.env.NODE_ENV === "production";
  res.headers.append(
    "Set-Cookie",
    `${OPS_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${secure ? "; Secure" : ""}`
  );
  return res;
}
