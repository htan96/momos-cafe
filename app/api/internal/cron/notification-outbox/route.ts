import { NextResponse } from "next/server";
import { processNotificationOutbox } from "@/lib/notifications/processNotificationOutbox";
import { verifyInternalSecretFromRequest } from "@/lib/server/internalAuth";

async function handleCron(request: Request) {
  if (!verifyInternalSecretFromRequest(request)) {
    return NextResponse.json({ error: "unauthorized", code: "INTERNAL_AUTH_REQUIRED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "25");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 25;

  const result = await processNotificationOutbox({ limit });
  return NextResponse.json({ ok: true, ...result });
}

/** Stub cron route for notification outbox skeleton processor — guard with `INTERNAL_API_SECRET`. */
export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
