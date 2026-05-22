import { NextResponse } from "next/server";
import { requireSuperStaffJson } from "@/lib/auth/cognito/requireSuperStaff";
import { queryLiveActivitySnapshots } from "@/lib/liveActivity/queryLiveActivitySnapshots";

export async function GET() {
  const gate = await requireSuperStaffJson();
  if (gate) return gate;

  const snapshots = await queryLiveActivitySnapshots();
  return NextResponse.json(snapshots);
}
