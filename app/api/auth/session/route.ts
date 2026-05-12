import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth/getCustomerSession";

export async function GET() {
  const session = await getCustomerSession();
  return NextResponse.json({
    authenticated: Boolean(session),
    email: session?.email ?? null,
    customerId: session?.sub ?? null,
  });
}
