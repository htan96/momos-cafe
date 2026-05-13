import { NextResponse } from "next/server";
import type { AuthSignInResult } from "@/lib/auth/AuthProvider";
import { createCognitoAuthProvider } from "@/lib/auth/cognito/cognitoAuthAdapter";
import { validateAccessToken } from "@/lib/auth/cognito/cognitoClient";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import { applyCognitoTokenCookies } from "@/lib/auth/cognito/httpCookies";
import {
  logCognitoLoginEvent,
  runStage,
  serializeCauseForLog,
} from "@/lib/auth/cognito/loginInstrumentation";
import { isMfaRelatedChallenge } from "@/lib/auth/cognito/mfa";
import { resolvePostLoginRedirect } from "@/lib/auth/cognito/redirectByRole";
import { clearCognitoCookieJar } from "@/lib/auth/cognito/sessionCookies";
import { cognitoChallengeJson } from "@/lib/auth/cognito/challengeResponse";

export const runtime = "nodejs";

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

  const res = NextResponse.json(payload, { status });
  clearCognitoCookieJar(res);
  return res;
}

export async function POST(request: Request) {
  console.error(
    "[cognito/login]",
    JSON.stringify({
      stage: "route_entry",
      ok: true,
      event: true,
      message: "handler_start",
    })
  );

  try {
    const { username, password, nextRaw } = await runStage(
      "parse_request",
      async () => {
        let raw: Record<string, unknown> = {};
        try {
          raw = (await request.json()) as Record<string, unknown>;
        } catch (parseErr) {
          const e = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
          console.error(
            "[cognito/login]",
            JSON.stringify({
              stage: "parse_request",
              ok: false,
              subphase: "json_parse",
              name: e.name,
              message: String(e),
              stack: e.stack,
              cause: serializeCauseForLog(e.cause),
            })
          );
          raw = {};
        }
        const u = typeof raw.username === "string" ? raw.username : "";
        const p = typeof raw.password === "string" ? raw.password : "";
        const next = typeof raw.next === "string" ? raw.next : null;
        return { username: u, password: p, nextRaw: next };
      },
      (parsed) => ({
        hasUsername: parsed.username.length > 0,
        hasPassword: parsed.password.length > 0,
        hasNextParam: parsed.nextRaw != null,
      })
    );

    const cfg = await runStage("env_check", async () => getCognitoConfig(), (c) => ({
      configured: c != null,
    }));

    if (!cfg) {
      return await runStage(
        "response_send",
        async () =>
          NextResponse.json({ error: "cognito_unconfigured", code: "COGNITO_ENV_MISSING" }, { status: 503 }),
        { httpStatus: 503, outcome: "cognito_unconfigured" }
      );
    }

    if (!username || !password) {
      return await runStage(
        "response_send",
        async () =>
          NextResponse.json({ error: "missing_credentials", code: "VALIDATION" }, { status: 400 }),
        { httpStatus: 400, outcome: "missing_credentials" }
      );
    }

    try {
      logCognitoLoginEvent("initiate_auth", { phase: "before" });

      const result = await runStage(
        "initiate_auth",
        async () => {
          const provider = createCognitoAuthProvider(cfg);
          return provider.signInWithPassword({ username, password });
        },
        (r) => {
          if (r.ok) {
            return {
              outcome: "tokens",
              authenticationResultPath: true,
              accessTokenLength: r.sessionTokens?.accessToken.length,
              idTokenLength: r.sessionTokens?.idToken.length,
              refreshTokenPresent: !!r.sessionTokens?.refreshToken,
            };
          }
          if (r.challenge) {
            return {
              outcome: "challenge",
              challengeNamePresent: true,
              challengeName: r.challenge.name,
              authenticationResultPath: false,
            };
          }
          return {
            outcome: "failure",
            challengeNamePresent: false,
            authenticationResultPath: false,
            signInErrorKey: r.error,
          };
        }
      );

      if (!result.ok) {
        const challenge = result.challenge;
        if (challenge) {
          const cn = challenge.name;

          const json = await runStage(
            "challenge_branch",
            async () => {
              const base = cognitoChallengeJson(cn, challenge.session, cfg);

              if (process.env.NODE_ENV === "development") {
                base.debug = {
                  note:
                    cn === "NEW_PASSWORD_REQUIRED"
                      ? "Typical for AdminCreateUser until permanent password via RespondToAuthChallenge."
                      : undefined,
                };
              }

              return base;
            },
            () => ({
              challengeName: cn,
              requiresPasswordChange: cn === "NEW_PASSWORD_REQUIRED",
              mfaRelated: isMfaRelatedChallenge(cn),
              mfaSetupPending: cn === "MFA_SETUP",
              softwareTokenMfaPending: cn === "SOFTWARE_TOKEN_MFA",
            })
          );

          return await runStage(
            "response_send",
            async () => NextResponse.json(json, { status: 409 }),
            { httpStatus: 409, outcome: "auth_challenge" }
          );
        }

        return await runStage(
          "response_send",
          async () => signInFailureResponse(result),
          {
            outcome: "sign_in_failed",
            httpStatus: result.extras?.status ?? 401,
            signInCode: result.extras?.code,
            cognitoErrorName: result.extras?.cognitoErrorName,
            cognitoErrorCode: result.extras?.cognitoErrorCode,
          }
        );
      }

      await runStage(
        "jwt_decode",
        async () => {
          if (!result.user) throw new Error("missing_user_after_signin");
        },
        () => ({
          hasUser: true,
          hasGroups: (result.user?.groups?.length ?? 0) > 0,
        })
      );

      const bundle = await runStage(
        "token_extract",
        async () => {
          const b = result.sessionTokens;
          if (!b) throw new Error("missing_session_tokens");
          return b;
        },
        (b) => ({
          accessTokenLength: b.accessToken.length,
          idTokenLength: b.idToken.length,
          refreshTokenPresent: !!b.refreshToken,
        })
      );

      const valid = await runStage(
        "validate_access_token",
        async () => validateAccessToken(cfg, bundle.accessToken),
        (v) => ({
          getUserOk: !!v,
          gotUsername: !!v?.username,
        })
      );

      if (!valid) {
        return await runStage(
          "response_send",
          async () => {
            const res = NextResponse.json(
              { error: "token_validation_failed", code: "ACCESS_TOKEN_INVALID" },
              { status: 500 }
            );
            clearCognitoCookieJar(res);
            return res;
          },
          { httpStatus: 500, outcome: "token_validation_failed" }
        );
      }

      const redirectTo = await runStage(
        "redirect_resolve",
        async () => resolvePostLoginRedirect(result.user.groups, nextRaw),
        (path) => ({ redirectPathLength: path.length })
      );

      const res = await runStage(
        "response_send",
        async () =>
          NextResponse.json({
            ok: true,
            user: result.user,
            redirectTo,
            code: "OK",
          }),
        { httpStatus: 200, outcome: "login_success" }
      );

      try {
        await runStage("cookie_apply", async () => {
          applyCognitoTokenCookies(res, bundle);
        });
      } catch {
        return await runStage(
          "response_send",
          async () => {
            const r = NextResponse.json(
              { error: "session_apply_failed", code: "COOKIE_APPLY" },
              { status: 500 }
            );
            clearCognitoCookieJar(r);
            return r;
          },
          { httpStatus: 500, outcome: "cookie_apply_failed" }
        );
      }

      return res;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error(
        "[cognito/login]",
        JSON.stringify({
          stage: "handler_catch",
          ok: false,
          name: err.name,
          message: String(err),
          stack: err.stack,
          cause: serializeCauseForLog(err.cause),
        })
      );
      return await runStage(
        "response_send",
        async () => {
          const r = NextResponse.json(
            { error: "login_internal_error", code: "HANDLER_EXCEPTION" },
            { status: 500 }
          );
          clearCognitoCookieJar(r);
          return r;
        },
        { httpStatus: 500, outcome: "handler_exception" }
      );
    }
  } catch (outer) {
    const err = outer instanceof Error ? outer : new Error(String(outer));
    console.error(
      "[cognito/login] unhandled",
      JSON.stringify({
        name: err.name,
        message: String(err),
        stack: err.stack,
        cause: serializeCauseForLog(err.cause),
      })
    );
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
