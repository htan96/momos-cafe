import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/auth/cognito/roles";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import {
  persistIntegrationHealthSnapshots,
  runIntegrationHealthChecks,
} from "@/lib/operations/integrationHealth/runIntegrationHealthChecks";

/** Super-admin trigger for integration health checks (same probes as Live Operations page load). */
export async function POST() {
  const user = await getCognitoServerSession();
  if (!user?.groups || !isSuperAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const results = await runIntegrationHealthChecks();
  await persistIntegrationHealthSnapshots(results);
  return NextResponse.json({ ok: true, results });
}
