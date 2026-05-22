import { NextResponse } from "next/server";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { OPS_ENTITY_UUID_RE } from "@/lib/operations/operationalContextLinks";
import { buildOperationalCommunicationTimeline } from "@/lib/operations/communications/buildOperationalCommunicationTimeline";

export const runtime = "nodejs";

function deny(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: Request) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "console:read")) {
    return deny("forbidden", 403);
  }

  const { searchParams } = new URL(req.url);
  const commerceOrderId = searchParams.get("commerceOrderId")?.trim() ?? "";
  if (!OPS_ENTITY_UUID_RE.test(commerceOrderId)) {
    return deny("commerceOrderId_uuid_required");
  }

  const timeline = await buildOperationalCommunicationTimeline(commerceOrderId);
  return NextResponse.json({ timeline });
}
