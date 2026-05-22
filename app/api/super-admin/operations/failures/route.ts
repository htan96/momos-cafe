import { NextResponse } from "next/server";
import { requireSuperStaffJson } from "@/lib/auth/cognito/requireSuperStaff";
import {
  parseOperationalFailuresQuery,
  queryOperationalFailures,
} from "@/lib/operations/failures/queryOperationalFailures";
import { OPERATIONAL_FAILURE_TYPES } from "@/lib/operations/failures/failureSubtypes";
import { PLATFORM_EVENT_CATEGORY } from "@/lib/platform/events/taxonomy";

export async function GET(request: Request) {
  const gate = await requireSuperStaffJson();
  if (gate) return gate;

  const { searchParams } = new URL(request.url);
  const filters = parseOperationalFailuresQuery(searchParams);
  const result = await queryOperationalFailures(filters);

  return NextResponse.json({
    ...result,
    filters,
    facets: {
      subtypes: [...OPERATIONAL_FAILURE_TYPES],
      categories: [...PLATFORM_EVENT_CATEGORY],
      severities: ["info", "warning", "error", "critical"],
      triageStates: ["new", "acknowledged", "investigating", "resolved", "ignored"],
    },
  });
}
