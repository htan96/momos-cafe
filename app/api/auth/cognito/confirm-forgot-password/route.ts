import { NextResponse } from "next/server";
import { confirmForgotPassword } from "@/lib/auth/cognito/cognitoClient";
import { getCognitoConfig } from "@/lib/auth/cognito/config";

export const runtime = "nodejs";

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const cfg = getCognitoConfig();
  if (!cfg) {
    return NextResponse.json({ error: "cognito_unconfigured" }, { status: 503 });
  }

  const body = await readBody(request);
  const username = typeof body.username === "string" ? body.username : "";
  const code = typeof body.code === "string" ? body.code : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!username || !code || !newPassword) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    await confirmForgotPassword(cfg, { username, code, newPassword });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "confirm_failed", detail: message }, { status: 400 });
  }
}
