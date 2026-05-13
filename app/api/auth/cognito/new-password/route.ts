import { NextResponse } from "next/server";
import {
  extractUserFromIdToken,
  respondToNewPasswordChallenge,
  validateAccessToken,
} from "@/lib/auth/cognito/cognitoClient";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
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
  const cfg = getCognitoConfig();
  if (!cfg) {
    return NextResponse.json({ error: "cognito_unconfigured" }, { status: 503 });
  }

  const body = await readBody(request);
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const session = typeof body.session === "string" ? body.session : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const nextRaw = typeof body.next === "string" ? body.next : null;

  if (!username || !session || !newPassword) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const out = await respondToNewPasswordChallenge({
      cfg,
      username,
      session,
      newPassword,
    });

    if (out.kind === "challenge") {
      console.warn("[cognito/new-password] follow-on challenge after NEW_PASSWORD", {
        challengeName: out.challengeName,
      });
      return NextResponse.json(
        {
          error: "auth_challenge",
          challengeName: out.challengeName,
          session: out.session ?? null,
          mfaOptional: cfg.mfaOptional,
          requiresPasswordChange: false,
        },
        { status: 409 }
      );
    }

    const user = extractUserFromIdToken(out.idToken);
    if (!user) {
      return NextResponse.json({ error: "bad_id_token" }, { status: 502 });
    }

    const valid = await validateAccessToken(cfg, out.accessToken);
    if (!valid) {
      const res = NextResponse.json({ error: "token_validation_failed" }, { status: 502 });
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
    console.warn("[cognito/new-password] RespondToAuthChallenge failed", e);
    const res = NextResponse.json({ error: "password_change_failed" }, { status: 401 });
    clearCognitoCookieJar(res);
    return res;
  }
}
