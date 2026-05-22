import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { applyCognitoTokenCookies } from "@/lib/auth/cognito/httpCookies";
import { performCognitoRefreshFromTokens } from "@/lib/auth/cognito/performRefreshFromTokens";
import { syncCommerceCustomerForCognitoCustomerUser } from "@/lib/account/commerceCustomerProfile";
import {
  COGNITO_ID_TOKEN_COOKIE,
  COGNITO_REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/cognito/sessionCookies";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";

export const runtime = "nodejs";

export async function GET() {
  let user = await getCognitoServerSession();

  if (user) {
    return NextResponse.json({
      authenticated: true,
      user,
    });
  }
  const jar = await cookies();
  const refresh = jar.get(COGNITO_REFRESH_TOKEN_COOKIE)?.value;
  const existingId = jar.get(COGNITO_ID_TOKEN_COOKIE)?.value;

  const result = await performCognitoRefreshFromTokens({ refreshToken: refresh, existingIdToken: existingId });
  if (!result.ok) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  const res = NextResponse.json({
    authenticated: true,
    user: result.user ?? null,
  });
  applyCognitoTokenCookies(res, {
    idToken: result.tokens.idToken,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
  });
  try {
    if (result.user) {
      await syncCommerceCustomerForCognitoCustomerUser({
        sub: result.user.sub,
        email: result.user.email ?? null,
        groups: result.user.groups,
      });
    }
  } catch (syncErr) {
    console.warn("[cognito/session] commerce_customer_sync_failed", syncErr);
  }
  return res;
}
