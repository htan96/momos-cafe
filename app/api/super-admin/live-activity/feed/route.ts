import { NextResponse } from "next/server";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import {
  parseLiveActivityFeedQuery,
  queryLiveActivityFeed,
} from "@/lib/liveActivity/queryLiveActivityFeed";

export async function GET(request: Request) {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = parseLiveActivityFeedQuery(searchParams);
  const result = await queryLiveActivityFeed(query);
  return NextResponse.json(result);
}
