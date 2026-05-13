import { NextResponse } from "next/server";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCognitoServerSession();
  return NextResponse.json({
    authenticated: Boolean(session),
    user: session ?? null,
  });
}
