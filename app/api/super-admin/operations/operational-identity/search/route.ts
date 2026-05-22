import { NextResponse } from "next/server";
import { requireSuperStaffJson } from "@/lib/auth/cognito/requireSuperStaff";
import { searchOperationalIdentityCandidates } from "@/lib/super-admin/operationalIdentity/resolveOperationalIdentity";
import {
  OPERATIONAL_IDENTITY_SEARCH_MIN_Q,
} from "@/lib/super-admin/operationalIdentity/constants";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSuperStaffJson();
  if (gate) return gate;

  const { searchParams } = new URL(request.url);
  const qRaw = typeof searchParams.get("q") === "string" ? searchParams.get("q")!.trim() : "";

  const qLimited = qRaw.slice(0, 128);

  if (qLimited.length > 0 && qLimited.length < OPERATIONAL_IDENTITY_SEARCH_MIN_Q) {
    return NextResponse.json({
      candidates: [],
      hint: `Query must be at least ${OPERATIONAL_IDENTITY_SEARCH_MIN_Q} characters.`,
    });
  }

  const candidates =
    qLimited.length === 0 ? [] : await searchOperationalIdentityCandidates(qLimited);

  return NextResponse.json({ q: qLimited, candidates });
}
