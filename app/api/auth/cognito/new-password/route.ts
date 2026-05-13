import { NextResponse } from "next/server";
import {
  extractUserFromIdToken,
  respondToNewPasswordChallenge,
  validateAccessToken,
} from "@/lib/auth/cognito/cognitoClient";
import { classifyCognitoAuthFailure, extractSafeCognitoSdkFields } from "@/lib/auth/cognito/cognitoSdkError";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { cognitoChallengeJson } from "@/lib/auth/cognito/challengeResponse";
import { applyCognitoTokenCookies } from "@/lib/auth/cognito/httpCookies";
import { resolvePostLoginRedirect } from "@/lib/auth/cognito/redirectByRole";
import { clearCognitoCookieJar } from "@/lib/auth/cognito/sessionCookies";

export const runtime = "nodejs";

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Completes Cognito `NEW_PASSWORD_REQUIRED` after `USER_PASSWORD_AUTH` returned a challenge.
 */
export async function POST(request: Request) {
  try {
    const cfg = getCognitoConfig();
    if (!cfg) {
      return NextResponse.json({ error: "cognito_unconfigured", code: "COGNITO_ENV_MISSING" }, { status: 503 });
    }

    const body = await readBody(request);
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const session = typeof body.session === "string" ? body.session : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const nextRaw = typeof body.next === "string" ? body.next : null;

    if (!username || !session || !newPassword) {
      return NextResponse.json({ error: "missing_fields", code: "VALIDATION" }, { status: 400 });
    }

    let out: Awaited<ReturnType<typeof respondToNewPasswordChallenge>>;
    try {
      out = await respondToNewPasswordChallenge({
        cfg,
        username,
        session,
        newPassword,
      });
    } catch (e) {
      const c = classifyCognitoAuthFailure(e);
      const sdk = extractSafeCognitoSdkFields(e);
      console.warn("[cognito/new-password] RespondToAuthChallenge failed", {
        code: c.code,
        cognitoErrorName: sdk.cognitoErrorName,
        cognitoErrorCode: sdk.cognitoErrorCode,
      });
      const res = NextResponse.json(
        {
          error: c.error,
          code: c.code,
          ...(c.unconfirmed === true ? { unconfirmed: true } : {}),
          ...(c.passwordResetRequired === true ? { passwordResetRequired: true } : {}),
          ...(c.transient === true ? { transient: true } : {}),
          ...(sdk.cognitoErrorName ? { cognitoErrorName: sdk.cognitoErrorName } : {}),
          ...(sdk.cognitoErrorCode ? { cognitoErrorCode: sdk.cognitoErrorCode } : {}),
        },
        { status: c.httpStatus >= 400 ? c.httpStatus : 401 }
      );
      clearCognitoCookieJar(res);
      return res;
    }

    if (out.kind === "challenge") {
      console.warn("[cognito/new-password] follow-on challenge after NEW_PASSWORD", {
        challengeName: out.challengeName,
      });
      return NextResponse.json(
        cognitoChallengeJson(out.challengeName, out.session, cfg, {
          requiresPasswordChange: false,
          code: "FOLLOW_ON_CHALLENGE",
        }),
        { status: 409 }
      );
    }

    const user = extractUserFromIdToken(out.idToken);
    if (!user) {
      return NextResponse.json({ error: "bad_id_token", code: "TOKEN_DECODE" }, { status: 500 });
    }

    const valid = await validateAccessToken(cfg, out.accessToken);
    if (!valid) {
      const res = NextResponse.json(
        { error: "token_validation_failed", code: "ACCESS_TOKEN_INVALID" },
        { status: 500 }
      );
      clearCognitoCookieJar(res);
      return res;
    }

    const res = NextResponse.json({
      ok: true,
      user,
      redirectTo: resolvePostLoginRedirect(user.groups, nextRaw),
    });
    applyCognitoTokenCookies(res, {
      idToken: out.idToken,
      accessToken: out.accessToken,
      refreshToken: out.refreshToken ?? undefined,
    });
    return res;
  } catch (e) {
    console.error("[cognito/new-password] unhandled", e);
    const res = NextResponse.json(
      { error: "internal_error", code: "UNHANDLED" },
      { status: 500 }
    );
    clearCognitoCookieJar(res);
    return res;
  }
}
