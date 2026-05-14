import { validateAccessToken } from "@/lib/auth/cognito/cognitoClient";
import { createCognitoAuthProvider } from "@/lib/auth/cognito/cognitoAuthAdapter";
import { decodeCognitoIdTokenUnsafe } from "@/lib/auth/cognito/tokens";
import { getCognitoConfig } from "@/lib/auth/cognito/config";
import type { AuthUser } from "@/lib/auth/AuthProvider";

export type PerformRefreshFailureCode =
  | "unconfigured"
  | "missing_refresh"
  | "bad_id_token"
  | "refresh_rejected"
  | "token_validation_failed";

export type PerformRefreshResult =
  | {
      ok: true;
      tokens: { idToken: string; accessToken: string; refreshToken: string };
      user: AuthUser | null;
    }
  | { ok: false; code: PerformRefreshFailureCode };

/**
 * Shared Cognito refresh (Node / Route Handlers). Middleware uses the HTTP refresh route instead.
 */
export async function performCognitoRefreshFromTokens(params: {
  refreshToken: string | null | undefined;
  existingIdToken: string | null | undefined;
}): Promise<PerformRefreshResult> {
  const cfg = getCognitoConfig();
  if (!cfg) {
    return { ok: false, code: "unconfigured" };
  }

  const refresh = params.refreshToken;
  const existingId = params.existingIdToken;
  if (!refresh || !existingId) {
    return { ok: false, code: "missing_refresh" };
  }

  const hint = decodeCognitoIdTokenUnsafe(existingId)?.username;
  if (!hint) {
    return { ok: false, code: "bad_id_token" };
  }

  const provider = createCognitoAuthProvider(cfg);
  const nextTokens = await provider.refreshSession({
    refreshToken: refresh,
    idTokenUsername: hint,
  });

  if (!nextTokens) {
    return { ok: false, code: "refresh_rejected" };
  }

  const valid = await validateAccessToken(cfg, nextTokens.accessToken);
  if (!valid) {
    return { ok: false, code: "token_validation_failed" };
  }

  const refreshOut = nextTokens.refreshToken ?? refresh;
  const user = decodeCognitoIdTokenUnsafe(nextTokens.idToken);

  return {
    ok: true,
    tokens: {
      idToken: nextTokens.idToken,
      accessToken: nextTokens.accessToken,
      refreshToken: refreshOut,
    },
    user: user ?? null,
  };
}
