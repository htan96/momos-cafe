import { NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/auth/customerSessionCrypto";

export async function POST() {
  const secure = process.env.NODE_ENV === "production";
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 0,
  });
  return res;
}
