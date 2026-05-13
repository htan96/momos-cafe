import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";

/**
 * AWS-side TOTP MFA (Authenticator apps) checklist:
 * - User Pool → Sign-in experience → MFA → Optional or Required per your policy.
 * - App client must ALLOW `USER_PASSWORD_AUTH` (already required here) plus MFA challenges.
 * - Users must enroll an MFA device (AssociateSoftwareToken + VerifySoftwareToken flows).
 *
 * Implementation note: MFA challenges surface as `InitiateAuth` / `RespondToAuthChallenge` with
 * `MFA_SETUP` / `SOFTWARE_TOKEN_MFA` / `SMS_MFA` responses. Hooks below intentionally stay stubbed — flip
 * `COGNITO_MFA_OPTIONAL=false` locally to force handling before production hardening.
 */

export type TotpEnrollmentStub = {
  status: "not_implemented";
  message: string;
};

/** Begin software token MFA device association (Authenticator). */
export async function beginTotpEnrollment(_params: {
  config: CognitoEnvConfig;
  accessToken?: string | null;
}): Promise<TotpEnrollmentStub> {
  return {
    status: "not_implemented",
    message: "Wire AssociateSoftwareToken + VerifySoftwareToken when enabling TOTP MFA for operators.",
  };
}

export type CognitoTotpChallengeResponseStub = {
  stub: true;
  reason: string;
};

/** Respond to SOFTWARE_TOKEN_MFA / SMS MFA challenges issued after password auth. */
export async function respondToTotpChallenge(_params: {
  config: CognitoEnvConfig;
  challengeName?: string | null;
  session?: string | null;
  mfaCode: string;
  usernameHint: string;
}): Promise<CognitoTotpChallengeResponseStub> {
  return {
    stub: true,
    reason:
      "MFA RespondToAuthChallenge path not implemented — return SOFTWARE_TOKEN challenge payload and complete flow here.",
  };
}

export function mfaConfiguredAsOptional(cfg: CognitoEnvConfig): boolean {
  return cfg.mfaOptional;
}

/** Challenges that block password-only login until `RespondToAuthChallenge` (or AWS-side MFA policy change). */
export function isMfaRelatedChallenge(challengeName: string): boolean {
  switch (challengeName) {
    case "SMS_MFA":
    case "SOFTWARE_TOKEN_MFA":
    case "MFA_SETUP":
    case "SELECT_MFA_TYPE":
      return true;
    default:
      return false;
  }
}
