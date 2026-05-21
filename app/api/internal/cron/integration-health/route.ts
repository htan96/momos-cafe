import { NextResponse } from "next/server";
import { evaluateAndPersistHealth } from "@/lib/operations/integrationHealth/evaluateAndPersistHealth";
import { verifyInternalSecretFromRequest } from "@/lib/server/internalAuth";

async function handleCron(request: Request) {
  if (!verifyInternalSecretFromRequest(request)) {
    return NextResponse.json({ error: "unauthorized", code: "INTERNAL_AUTH_REQUIRED" }, { status: 401 });
  }

  const result = await evaluateAndPersistHealth();
  return NextResponse.json({ ok: true, ...result });
}

/** Scheduled integration health + incident batch evaluation — guard with `INTERNAL_API_SECRET`. */
export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
