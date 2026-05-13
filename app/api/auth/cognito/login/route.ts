import { NextResponse } from "next/server";
import type { AuthSignInResult } from "@/lib/auth/AuthProvider";
import { createCognitoAuthProvider } from "@/lib/auth/cognito/cognitoAuthAdapter";
import { validateAccessToken } from "@/lib/auth/cognito/cognitoClient";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { applyCognitoTokenCookies } from "@/lib/auth/cognito/httpCookies";
import { isMfaRelatedChallenge } from "@/lib/auth/cognito/mfa";
import { resolvePostLoginRedirect } from "@/lib/auth/cognito/redirectByRole";
import { clearCognitoCookieJar } from "@/lib/auth/cognito/sessionCookies";
import { cognitoChallengeJson } from "@/lib/auth/cognito/challengeResponse";

export const runtime = "nodejs";

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function signInFailureResponse(result: Extract<AuthSignInResult, { ok: false }>): NextResponse {
  const status = result.extras?.status ?? 401;
  const payload: Record<string, unknown> = {
    error: result.error,
    code: result.extras?.code ?? "SIGN_IN_FAILED",
  };
  if (result.extras?.unconfirmed === true) payload.unconfirmed = true;
  if (result.extras?.passwordResetRequired === true) payload.passwordResetRequired = true;
  if (result.extras?.transient === true) payload.transient = true;
  if (typeof result.extras?.message === "string" && result.extras.message.length > 0) {
    payload.message = result.extras.message;
  }
  if (result.extras?.cognitoErrorName) payload.cognitoErrorName = result.extras.cognitoErrorName;
  if (result.extras?.cognitoErrorCode) payload.cognitoErrorCode = result.extras.cognitoErrorCode;

  if (process.env.NODE_ENV === "development") {
    payload.debug = { extras: result.extras ?? null };
  }

  console.warn("[cognito/login] sign_in_failed", {
    status,
    code: payload.code,
    error: result.error,
    cognitoErrorName: result.extras?.cognitoErrorName,
    cognitoErrorCode: result.extras?.cognitoErrorCode,
  });

  const res = NextResponse.json(payload, { status });
  clearCognitoCookieJar(res);
  return res;
}

export async function POST(request: Request) {
  try {
    const cfg = getCognitoConfig();
    if (!cfg) {
      return NextResponse.json({ error: "cognito_unconfigured", code: "COGNITO_ENV_MISSING" }, { status: 503 });
    }

    const body = await readBody(request);
    const username = typeof body.username === "string" ? body.username : "";
    const password = typeof body.password === "string" ? body.password : "";
    const nextRaw = typeof body.next === "string" ? body.next : null;

    if (!username || !password) {
      return NextResponse.json({ error: "missing_credentials", code: "VALIDATION" }, { status: 400 });
    }

    try {
      const provider = createCognitoAuthProvider(cfg);
      const result = await provider.signInWithPassword({ username, password });

      if (!result.ok) {
        if (result.challenge) {
          const cn = result.challenge.name;
          console.warn("[cognito/login] auth_challenge", {
            challengeName: cn,
            requiresPasswordChange: cn === "NEW_PASSWORD_REQUIRED",
            mfaRelated: isMfaRelatedChallenge(cn),
            mfaSetupPending: cn === "MFA_SETUP",
            softwareTokenMfaPending: cn === "SOFTWARE_TOKEN_MFA",
          });
          const json = cognitoChallengeJson(cn, result.challenge.session, cfg);

          if (process.env.NODE_ENV === "development") {
            json.debug = {
              note:
                cn === "NEW_PASSWORD_REQUIRED"
                  ? "Typical for AdminCreateUser until permanent password via RespondToAuthChallenge."
                  : undefined,
            };
          }

          return NextResponse.json(json, { status: 409 });
        }
        return signInFailureResponse(result);
      }

      const bundle = result.sessionTokens;
      if (!bundle) {
        console.error("[cognito/login] success path missing sessionTokens bundle");
        const res = NextResponse.json(
          { error: "missing_tokens", code: "TOKEN_BUNDLE_MISSING" },
          { status: 500 }
        );
        clearCognitoCookieJar(res);
        return res;
      }

      const valid = await validateAccessToken(cfg, bundle.accessToken);
      if (!valid) {
        console.error("[cognito/login] token_validation_failed post GetUser");
        const res = NextResponse.json(
          { error: "token_validation_failed", code: "ACCESS_TOKEN_INVALID" },
          { status: 500 }
        );
        clearCognitoCookieJar(res);
        return res;
      }

      let res: NextResponse;
      try {
        res = NextResponse.json({
          ok: true,
          user: result.user,
          redirectTo: resolvePostLoginRedirect(result.user.groups, nextRaw),
          code: "OK",
        });
        applyCognitoTokenCookies(res, bundle);
      } catch (cookieErr) {
        console.error("[cognito/login] cookie/session apply failed", cookieErr);
        res = NextResponse.json(
          { error: "session_apply_failed", code: "COOKIE_APPLY" },
          { status: 500 }
        );
        clearCognitoCookieJar(res);
      }
      return res;
    } catch (e) {
      console.error("[cognito/login] handler_error", e);
      const res = NextResponse.json(
        { error: "login_internal_error", code: "HANDLER_EXCEPTION" },
        { status: 500 }
      );
      clearCognitoCookieJar(res);
      return res;
    }
  } catch (outer) {
    console.error("[cognito/login] boundary_error", outer);
    try {
      const res = NextResponse.json(
        { error: "login_unexpected_error", code: "UNHANDLED_BOUNDARY" },
        { status: 500 }
      );
      clearCognitoCookieJar(res);
      return res;
    } catch {
      return new NextResponse(JSON.stringify({ error: "login_fatal", code: "FATAL" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}
