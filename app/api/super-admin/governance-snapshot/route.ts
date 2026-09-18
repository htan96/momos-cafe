import { NextResponse } from "next/server";
import { requireSuperStaffJson } from "@/lib/auth/cognito/requireSuperStaff";
import { loadGovernanceSnapshot } from "@/lib/governance/governanceSnapshot";

export async function GET() {
  const gate = await requireSuperStaffJson();
  if (gate) return gate;

  const snapshot = await loadGovernanceSnapshot();
  return NextResponse.json(snapshot);
}
