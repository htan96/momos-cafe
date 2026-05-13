import { NextResponse } from "next/server";
import { createCognitoAuthProvider } from "@/lib/auth/cognito/cognitoAuthAdapter";
import { validateAccessToken } from "@/lib/auth/cognito/cognitoClient";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { applyCognitoTokenCookies } from "@/lib/auth/cognito/httpCookies";
import { resolvePostLoginRedirect } from "@/lib/auth/cognito/redirectByRole";
import { clearCognitoCookieJar } from "@/lib/auth/cognito/sessionCookies";
import { isMfaRelatedChallenge } from "@/lib/auth/cognito/mfa";

export const runtime = "nodejs";

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const cfg = getCognitoConfig();
    if (!cfg) {
      return NextResponse.json({ error: "cognito_unconfigured" }, { status: 503 });
    }

    const body = await readBody(request);
    const username = typeof body.username === "string" ? body.username : "";
    const password = typeof body.password === "string" ? body.password : "";
    const nextRaw = typeof body.next === "string" ? body.next : null;

    if (!username || !password) {
      return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
    }

    const provider = createCognitoAuthProvider(cfg);
    try {
      const result = await provider.signInWithPassword({ username, password });
      if (!result.ok) {
        if (result.challenge) {
          const cn = result.challenge.name;
          console.warn("[cognito/login] auth_challenge", {
            challengeName: cn,
            requiresPasswordChange: cn === "NEW_PASSWORD_REQUIRED",
            mfaRelated: isMfaRelatedChallenge(cn),
            note:
              cn === "NEW_PASSWORD_REQUIRED"
                ? "Typical for AdminCreateUser / invited users until permanent password is set via RespondToAuthChallenge."
                : undefined,
          });
          // TODO(MFA): Surface RespondToAuthChallenge UX here when COGNITO_TEMP_DISABLE_USER_MFA_BEFORE_LOGIN is off.
          return NextResponse.json(
            {
              error: "auth_challenge",
              challengeName: cn,
              session: result.challenge.session ?? null,
              mfaOptional: cfg.mfaOptional,
              requiresPasswordChange: cn === "NEW_PASSWORD_REQUIRED",
            },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: result.error }, { status: 401 });
      }

      const bundle = result.sessionTokens;
      if (!bundle) {
        return NextResponse.json({ error: "missing_tokens" }, { status: 502 });
      }

      const valid = await validateAccessToken(cfg, bundle.accessToken);
      if (!valid) {
        const res = NextResponse.json({ error: "token_validation_failed" }, { status: 502 });
        clearCognitoCookieJar(res);
        return res;
      }

      const res = NextResponse.json({
        ok: true,
        user: result.user,
        redirectTo: resolvePostLoginRedirect(result.user.groups, nextRaw),
      });
      applyCognitoTokenCookies(res, bundle);
      return res;
    } catch {
      const res = NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
      clearCognitoCookieJar(res);
      return res;
    }
  } catch (e) {
    console.error("[cognito/login] unexpected", e);
    return NextResponse.json({ error: "login_unexpected_error" }, { status: 500 });
  }
}
