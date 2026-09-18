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
import { isAdmin, isSuperAdmin } from "@/lib/auth/cognito/roles";
import { enrichAuthUserFromDb, resolveUserAuthority, upsertUserOnSignup } from "@/lib/auth/userAuthority";
import { clearCognitoCookieJar } from "@/lib/auth/cognito/sessionCookies";
import { cognitoChallengeJson } from "@/lib/auth/cognito/challengeResponse";
import { OperationalActivitySeverity } from "@prisma/client";
import { syncCommerceCustomerForCognitoCustomerUser } from "@/lib/account/commerceCustomerProfile";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";
import { emitPlatformEvent } from "@/lib/platform/events/emitPlatformEvent";
import { PLATFORM_EVENT_SUBTYPE } from "@/lib/platform/events/taxonomy";
import {
  bootstrapAdminAuthEnabled,
  isBootstrapAdminEmail,
} from "@/lib/bootstrap/config";

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
      void emitPlatformEvent({
        subtype: PLATFORM_EVENT_SUBTYPE.AUTH_LOGIN_FAILED,
        category: "AUTH_EVENT",
        lifecycle: "failed",
        severity: OperationalActivitySeverity.error,
        actorType: "customer",
        message: "Cognito login blocked — environment incomplete",
        detail: { stage: "env_check", code: "COGNITO_ENV_MISSING" },
        source: { handler: "POST app/api/auth/cognito/login" },
        sourceTag: "api.auth.cognito.login",
      });
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

    if (bootstrapAdminAuthEnabled() && isBootstrapAdminEmail(username)) {
      return await runStage(
        "response_send",
        async () =>
          NextResponse.json(
            {
              error: "bootstrap_required",
              code: "BOOTSTRAP_REQUIRED",
              message: "Use bootstrap sign-in for this account.",
            },
            { status: 403 }
          ),
        { httpStatus: 403, outcome: "bootstrap_required" }
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
          async () => {
            void emitPlatformEvent({
              subtype: PLATFORM_EVENT_SUBTYPE.AUTH_LOGIN_FAILED,
              category: "AUTH_EVENT",
              lifecycle: "failed",
              severity: OperationalActivitySeverity.warning,
              actorType: "customer",
              message: "Cognito sign-in refused",
              detail: {
                outcome: "sign_in_failed",
                code: result.extras?.code ?? "SIGN_IN_FAILED",
                cognitoKey: typeof result.error === "string" ? result.error : "unknown_error",
                cognitoErrorName: result.extras?.cognitoErrorName ?? null,
                cognitoErrorCode: result.extras?.cognitoErrorCode ?? null,
                transient: !!result.extras?.transient,
                httpStatus: result.extras?.status ?? 401,
              },
              source: { handler: "POST app/api/auth/cognito/login" },
              sourceTag: "api.auth.cognito.login",
            });
            return signInFailureResponse(result);
          },
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
        () => {
          const groups = result.user?.groups ?? [];
          return {
            hasUser: true,
            hasGroups: groups.length > 0,
            groupCountFromIdToken: groups.length,
            /** Same claim as middleware gate: ID JWT `cognito:groups` via `extractUserFromIdToken`. */
            cognitoGroupsClaimPath: "cognito:groups",
          };
        }
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
            void emitPlatformEvent({
              subtype: PLATFORM_EVENT_SUBTYPE.AUTH_LOGIN_FAILED,
              category: "AUTH_EVENT",
              lifecycle: "failed",
              severity: OperationalActivitySeverity.error,
              actorType: "customer",
              message: "Access token failed validation after Cognito authentication",
              detail: { outcome: "token_validation_failed", code: "ACCESS_TOKEN_INVALID", httpStatus: 500 },
              source: { handler: "POST app/api/auth/cognito/login" },
              sourceTag: "api.auth.cognito.login",
            });
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

      const enrichedUser = await enrichAuthUserFromDb(result.user);
      if (!(await resolveUserAuthority(enrichedUser.sub, enrichedUser.groups))) {
        await upsertUserOnSignup({
          cognitoSub: enrichedUser.sub,
          email: enrichedUser.email,
        });
      }
      const sessionUser = await enrichAuthUserFromDb(enrichedUser);

      const redirectTo = await runStage(
        "redirect_resolve",
        async () => resolvePostLoginRedirect(sessionUser, nextRaw),
        (path) => ({ redirectPathLength: path.length })
      );

      const res = await runStage(
        "response_send",
        async () =>
          NextResponse.json({
            ok: true,
            user: {
              ...sessionUser,
              role: sessionUser.role ?? null,
              status: sessionUser.status ?? null,
            },
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
            void emitPlatformEvent({
              subtype: PLATFORM_EVENT_SUBTYPE.AUTH_LOGIN_FAILED,
              category: "AUTH_EVENT",
              lifecycle: "failed",
              severity: OperationalActivitySeverity.error,
              actorType: "customer",
              message: "Session cookies could not be applied after Cognito authentication",
              detail: { outcome: "cookie_apply_failed", code: "COOKIE_APPLY", httpStatus: 500 },
              source: { handler: "POST app/api/auth/cognito/login" },
              sourceTag: "api.auth.cognito.login",
            });
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

      if (isAdmin(sessionUser)) {
        await emitOperationalEvent({
          type: OPERATIONAL_EVENT_TYPES.AUTH_LOGIN,
          severity: OperationalActivitySeverity.info,
          actorType: isSuperAdmin(sessionUser) ? "super_admin" : "admin",
          actorId: sessionUser.sub,
          message: "Staff signed in via Cognito",
          metadata: {
            staffRole: sessionUser.role ?? null,
            staffGroups: sessionUser.groups.filter((g) => g === "admin" || g === "super_admin"),
          },
          source: "api.auth.cognito.login",
        });
      }

      try {
        await syncCommerceCustomerForCognitoCustomerUser({
          sub: sessionUser.sub,
          email: sessionUser.email ?? null,
          groups: sessionUser.groups,
          role: sessionUser.role,
        });
      } catch (syncErr) {
        console.warn("[cognito/login] commerce_customer_sync_failed", syncErr);
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
          void emitPlatformEvent({
            subtype: PLATFORM_EVENT_SUBTYPE.AUTH_LOGIN_FAILED,
            category: "AUTH_EVENT",
            lifecycle: "failed",
            severity: OperationalActivitySeverity.critical,
            actorType: "customer",
            message: "Unhandled exception escaped Cognito login handler",
            detail: {
              outcome: "handler_exception",
              code: "HANDLER_EXCEPTION",
              httpStatus: 500,
              errorName: err.name,
            },
            source: { handler: "POST app/api/auth/cognito/login" },
            sourceTag: "api.auth.cognito.login",
          });
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
      void emitPlatformEvent({
        subtype: PLATFORM_EVENT_SUBTYPE.AUTH_LOGIN_FAILED,
        category: "AUTH_EVENT",
        lifecycle: "failed",
        severity: OperationalActivitySeverity.critical,
        actorType: "customer",
        message: "Unhandled outer-boundary Cognito login failure",
        detail: {
          outcome: "unhandled_outer",
          code: "UNHANDLED_BOUNDARY",
          httpStatus: 500,
          errorName: err.name,
        },
        source: { handler: "POST app/api/auth/cognito/login" },
        sourceTag: "api.auth.cognito.login",
      });
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
