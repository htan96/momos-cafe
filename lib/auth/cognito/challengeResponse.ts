import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import { isMfaRelatedChallenge } from "@/lib/auth/cognito/mfa";

/** Stable Cognito-auth challenge envelope for `/login` (409) and follow-on `/new-password` responses. */
export function cognitoChallengeJson(
  challengeName: string,
  session: string | null | undefined,
  cfg: CognitoEnvConfig,
  options?: { requiresPasswordChange?: boolean; code?: string }
): Record<string, unknown> {
  const cn = challengeName;
  const requiresPasswordChange = options?.requiresPasswordChange ?? cn === "NEW_PASSWORD_REQUIRED";
  const code = options?.code ?? "AUTH_CHALLENGE";
  return {
    error: "auth_challenge",
    code,
    challengeName: cn,
    session: session ?? null,
    mfaOptional: cfg.mfaOptional,
    requiresPasswordChange,
    mfaRelated: isMfaRelatedChallenge(cn),
    mfaSetupPending: cn === "MFA_SETUP",
    softwareTokenMfaPending: cn === "SOFTWARE_TOKEN_MFA",
    smsMfaPending: cn === "SMS_MFA",
    selectMfaTypePending: cn === "SELECT_MFA_TYPE",
  };
}
