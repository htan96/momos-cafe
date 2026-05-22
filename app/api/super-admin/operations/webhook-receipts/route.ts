import { NextResponse } from "next/server";
import { WebhookProcessingStatus } from "@prisma/client";
import { requireSuperStaffJson } from "@/lib/auth/cognito/requireSuperStaff";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/server/apiErrors";

export const runtime = "nodejs";

const TARGET_STATUSES: WebhookProcessingStatus[] = [WebhookProcessingStatus.failed, WebhookProcessingStatus.ignored];

export async function GET(request: Request) {
  const gate = await requireSuperStaffJson();
  if (gate) return gate;

  const { searchParams } = new URL(request.url);
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 50;
  const provider = searchParams.get("provider")?.trim();

  const rows = await prisma.webhookDeliveryReceipt.findMany({
    where: {
      processingStatus: { in: TARGET_STATUSES },
      ...(provider ? { provider } : {}),
    },
    orderBy: { receivedAt: "desc" },
    take: limit,
    select: {
      id: true,
      provider: true,
      externalEventId: true,
      eventType: true,
      processingStatus: true,
      errorCode: true,
      receivedAt: true,
      payloadHash: true,
      commerceOrderId: true,
      paymentRecordId: true,
      signatureValid: true,
      httpStatus: true,
    },
  });

  return NextResponse.json({
    rows,
    query: { limit, provider: provider ?? null, statuses: TARGET_STATUSES },
  });
}
