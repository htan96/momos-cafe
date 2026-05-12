import { NextResponse } from "next/server";

/** Lightweight liveness for deploy scripts / load balancers — no DB coupling */
export async function GET() {
  return NextResponse.json({ ok: true, service: "momos-web" });
}
