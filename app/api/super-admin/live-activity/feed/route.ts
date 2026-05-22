import { NextResponse } from "next/server";
import { requireSuperStaffJson } from "@/lib/auth/cognito/requireSuperStaff";
import {
  parseLiveActivityFeedQuery,
  queryLiveActivityFeed,
} from "@/lib/liveActivity/queryLiveActivityFeed";

export async function GET(request: Request) {
  const gate = await requireSuperStaffJson();
  if (gate) return gate;

  const { searchParams } = new URL(request.url);
  const query = parseLiveActivityFeedQuery(searchParams);
  const result = await queryLiveActivityFeed(query);
  return NextResponse.json(result);
}
