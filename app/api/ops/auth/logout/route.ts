import { NextResponse } from "next/server";
import { OPS_SESSION_COOKIE } from "@/lib/ops/sessionCrypto";

export async function POST() {
  const secure = process.env.NODE_ENV === "production";
  const res = NextResponse.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${OPS_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`
  );
  return res;
}
