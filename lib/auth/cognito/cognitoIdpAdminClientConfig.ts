import type { CognitoIdentityProviderClientConfig } from "@aws-sdk/client-cognito-identity-provider";

/**
 * Dedicated IAM user keys for Cognito IdP Admin and ListUsers APIs (recommended on Vercel when there is no ECS task role).
 * Falls back to AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY used by SES and other SDK clients.
 */
export function cognitoAdminStaticCredentialsResolved(): boolean {
  const dAk = process.env.COGNITO_IDP_ADMIN_ACCESS_KEY_ID?.trim();
  const dSk = process.env.COGNITO_IDP_ADMIN_SECRET_ACCESS_KEY?.trim();
  if (dAk && dSk) return true;
  const ak = process.env.AWS_ACCESS_KEY_ID?.trim();
  const sk = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  return Boolean(ak && sk);
}

/**
 * Build CognitoIdentityProviderClient init for routes that call Admin* and ListUsers APIs.
 *
 * Without static keys and without container, instance, or Lambda role, the default chain throws CredentialsProviderError.
 */
export function buildCognitoIdpAdminClientConfig(region: string): CognitoIdentityProviderClientConfig {
  const dAk = process.env.COGNITO_IDP_ADMIN_ACCESS_KEY_ID?.trim();
  const dSk = process.env.COGNITO_IDP_ADMIN_SECRET_ACCESS_KEY?.trim();
  const ak = dAk || process.env.AWS_ACCESS_KEY_ID?.trim();
  const sk = dSk || process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();

  if (ak && sk) {
    return {
      region,
      credentials: {
        accessKeyId: ak,
        secretAccessKey: sk,
        ...(sessionToken ? { sessionToken } : {}),
      },
    };
  }

  return { region };
}

export function cognitoIdpAdminClientCacheKey(region: string): string {
  return `${region}:${cognitoAdminStaticCredentialsResolved() ? "static" : "default_chain"}`;
}
