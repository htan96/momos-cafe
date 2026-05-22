import { NextResponse } from "next/server";
import { requireSuperStaffJson } from "@/lib/auth/cognito/requireSuperStaff";
import { queryOperationalFailureDetail } from "@/lib/operations/failures/queryOperationalFailures";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireSuperStaffJson();
  if (gate) return gate;

  const { eventId } = await context.params;
  const detail = await queryOperationalFailureDetail(eventId);
  if (!detail) {
    return NextResponse.json({ error: "not_found", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
