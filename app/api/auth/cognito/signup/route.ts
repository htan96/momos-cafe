import { NextResponse } from "next/server";
import { provisionCustomerGroupBestEffort, signUpEmailOrUsername } from "@/lib/auth/cognito/cognitoClient";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { governanceJsonResponse, isControlEnabled } from "@/lib/governance/governanceControls";

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
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const email =
    typeof body.email === "string" ? body.email.trim() : "";

  if (!username || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "missing_email", code: "VALIDATION" }, { status: 400 });
  }

  if (await isControlEnabled("registrations_disabled")) {
    return governanceJsonResponse("REGISTRATIONS_DISABLED");
  }

  try {
    await signUpEmailOrUsername(cfg, {
      username,
      password,
      email,
    });
    await provisionCustomerGroupBestEffort(cfg, username, "signup");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "signup_failed", detail: message }, { status: 400 });
  }
}
