import { NextResponse } from "next/server";
import { confirmSignUp, provisionCustomerGroupBestEffort } from "@/lib/auth/cognito/cognitoClient";
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

  if (!username || !code) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    await confirmSignUp(cfg, { username, code });
    await provisionCustomerGroupBestEffort(cfg, username, "confirm_signup");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "confirm_failed", detail: message }, { status: 400 });
  }
}
