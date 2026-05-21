import { NextResponse } from "next/server";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import {
  parseOperationalFailuresQuery,
  queryOperationalFailures,
} from "@/lib/operations/failures/queryOperationalFailures";
import { OPERATIONAL_FAILURE_TYPES } from "@/lib/operations/failures/failureSubtypes";
import { PLATFORM_EVENT_CATEGORY } from "@/lib/platform/events/taxonomy";

export async function GET(request: Request) {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

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
