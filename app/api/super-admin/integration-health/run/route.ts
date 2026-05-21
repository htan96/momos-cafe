import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { evaluateAndPersistHealth } from "@/lib/operations/integrationHealth/evaluateAndPersistHealth";

/** Super-admin trigger for integration health checks (probes + incident batch eval). */
export async function POST() {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const result = await evaluateAndPersistHealth();
  return NextResponse.json({ ok: true, ...result });
}
