import { NextResponse } from "next/server";
import { requireSuperStaffJson } from "@/lib/auth/cognito/requireSuperStaff";
import { evaluateAndPersistHealth } from "@/lib/operations/integrationHealth/evaluateAndPersistHealth";

/** Super-admin trigger for integration health checks (probes + incident batch eval). */
export async function POST() {
  const gate = await requireSuperStaffJson();
  if (gate) return gate;

  const result = await evaluateAndPersistHealth();
  return NextResponse.json({ ok: true, ...result });
}
