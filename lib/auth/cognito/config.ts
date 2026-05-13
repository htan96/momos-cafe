export type CognitoEnvConfig = {
  region: string;
  userPoolId: string;
  clientId: string;
  /** Confidential app clients must send SECRET_HASH on many operations. Prefer public SPA + PKCE when possible. */
  clientSecret?: string;
  /** Reserved for STS / temporary AWS credentials flows (Amplify-like). Wired via env only for now. */
  identityPoolId?: string;
  /** e.g. `your-domain.auth.us-west-2.amazoncognito.com` — no scheme. Optional Hosted UI bootstrap. */
  hostedUiDomain?: string;
  oauthRedirectUri?: string;
  oauthLogoutUri?: string;
  /**
   * When false, application code SHOULD treat MFA challenges as blocking until implemented end-to-end.
   * Stub hooks remain for TOTP enrollment + challenge response.
   */
  mfaOptional: boolean;
};

/**
 * Returns parsed Cognito wiring from env, or null if required keys are missing.
 * Safe on Edge — no SDK imports here.
 */
export function getCognitoConfig(): CognitoEnvConfig | null {
  const region = process.env.COGNITO_REGION?.trim();
  const userPoolId = process.env.COGNITO_USER_POOL_ID?.trim();
  const clientId = process.env.COGNITO_CLIENT_ID?.trim();
  if (!region || !userPoolId || !clientId) return null;

  return {
    region,
    userPoolId,
    clientId,
    clientSecret: process.env.COGNITO_CLIENT_SECRET?.trim() || undefined,
    identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID?.trim() || undefined,
    hostedUiDomain: process.env.COGNITO_HOSTED_UI_DOMAIN?.trim() || undefined,
    oauthRedirectUri: process.env.COGNITO_OAUTH_REDIRECT_URI?.trim() || undefined,
    oauthLogoutUri: process.env.COGNITO_OAUTH_LOGOUT_URI?.trim() || undefined,
    mfaOptional: process.env.COGNITO_MFA_OPTIONAL?.trim() !== "false",
  };
}

/** Issuer Cognito emits on User Pool JWTs (`iss` claim). */
export function cognitoIssuer(config: CognitoEnvConfig): string {
  return `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`;
}
