import type { AuthProvider, AuthSignInFailureExtras } from "@/lib/auth/AuthProvider";
import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import {
  extractUserFromIdToken,
  refreshTokens,
  signInWithPassword,
  signOutEverywhere,
} from "@/lib/auth/cognito/cognitoClient";
import type { CognitoLoginFailureClassification } from "@/lib/auth/cognito/cognitoSdkError";

function extrasFromClassification(c: CognitoLoginFailureClassification): AuthSignInFailureExtras {
  return {
    status: c.httpStatus,
    code: c.code,
    unconfirmed: c.unconfirmed || undefined,
    passwordResetRequired: c.passwordResetRequired || undefined,
    cognitoErrorName: c.cognitoErrorName,
    cognitoErrorCode: c.cognitoErrorCode,
    transient: c.transient || undefined,
  };
}

/**
 * Server-side `AuthProvider` binding for Cognito. Route handlers can still call `cognitoClient` directly;
 * this factory exists to keep a stable seam for future Google/Apple bridges.
 */
export function createCognitoAuthProvider(config: CognitoEnvConfig): AuthProvider {
  return {
    id: "cognito",
    async signInWithPassword({ username, password }) {
      const out = await signInWithPassword(config, { username, password });
      if (out.kind === "failure") {
        return {
          ok: false,
          error: out.classification.error,
          extras: extrasFromClassification(out.classification),
        };
      }
      if (out.kind === "challenge") {
        return {
          ok: false,
          error: "auth_challenge",
          challenge: { name: out.challengeName, session: out.session ?? undefined },
        };
      }
      const user = extractUserFromIdToken(out.idToken);
      if (!user) {
        return {
          ok: false,
          error: "bad_id_token",
          extras: { status: 500, code: "TOKEN_DECODE" },
        };
      }
      return {
        ok: true,
        user,
        sessionTokens: {
          idToken: out.idToken,
          accessToken: out.accessToken,
          refreshToken: out.refreshToken,
        },
      };
    },
    async signOut({ accessToken }) {
      await signOutEverywhere(config, accessToken);
    },
    async refreshSession({ refreshToken, idTokenUsername }) {
      try {
        return await refreshTokens(config, {
          refreshToken,
          cognitoUsername: idTokenUsername,
        });
      } catch {
        return null;
      }
    },
  };
}
