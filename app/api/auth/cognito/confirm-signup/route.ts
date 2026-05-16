import { NextResponse } from "next/server";
import { confirmSignUp, provisionCustomerGroupBestEffort } from "@/lib/auth/cognito/cognitoClient";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { createHash } from "crypto";
import { OperationalActivitySeverity } from "@prisma/client";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";

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
    await emitOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.CUSTOMER_REGISTERED,
      severity: OperationalActivitySeverity.info,
      actorType: "customer",
      actorId: createHash("sha256").update(username).digest("hex").slice(0, 32),
      message: "Customer confirmed email signup",
      metadata: { flow: "confirm_signup" },
      source: "api.auth.cognito.confirm-signup",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "confirm_failed", detail: message }, { status: 400 });
  }
}
