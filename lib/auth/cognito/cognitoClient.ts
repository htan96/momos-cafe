import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import { cognitoSecretHash } from "@/lib/auth/cognito/secretHash";
import { decodeCognitoIdTokenUnsafe } from "@/lib/auth/cognito/tokens";

const clients = new Map<string, CognitoIdentityProviderClient>();

function client(cfg: CognitoEnvConfig): CognitoIdentityProviderClient {
  let c = clients.get(cfg.region);
  if (!c) {
    c = new CognitoIdentityProviderClient({ region: cfg.region });
    clients.set(cfg.region, c);
  }
  return c;
}

function authParamSecretHash(cfg: CognitoEnvConfig, username: string): Record<string, string> {
  if (!cfg.clientSecret) return {};
  return { SECRET_HASH: cognitoSecretHash(username, cfg.clientId, cfg.clientSecret) };
}

function commandSecretHash(cfg: CognitoEnvConfig, username: string): { SecretHash?: string } {
  if (!cfg.clientSecret) return {};
  return { SecretHash: cognitoSecretHash(username, cfg.clientId, cfg.clientSecret) };
}

export type PasswordAuthResult =
  | {
      kind: "tokens";
      idToken: string;
      accessToken: string;
      refreshToken?: string;
    }
  | {
      kind: "challenge";
      challengeName: string;
      session?: string | null;
    };

export async function signInWithPassword(
  cfg: CognitoEnvConfig,
  params: { username: string; password: string }
): Promise<PasswordAuthResult> {
  const username = params.username.trim();
  const resp = await client(cfg).send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: cfg.clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: params.password,
        ...authParamSecretHash(cfg, username),
      },
    })
  );

  if (resp.AuthenticationResult?.IdToken && resp.AuthenticationResult?.AccessToken) {
    return {
      kind: "tokens",
      idToken: resp.AuthenticationResult.IdToken,
      accessToken: resp.AuthenticationResult.AccessToken,
      refreshToken: resp.AuthenticationResult.RefreshToken ?? undefined,
    };
  }

  if (resp.ChallengeName) {
    return { kind: "challenge", challengeName: resp.ChallengeName, session: resp.Session };
  }

  throw new Error("Unexpected InitiateAuth response");
}

export async function refreshTokens(
  cfg: CognitoEnvConfig,
  params: { refreshToken: string; cognitoUsername: string }
): Promise<{ idToken: string; accessToken: string; refreshToken?: string }> {
  const username = params.cognitoUsername.trim();
  const resp = await client(cfg).send(
    new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: cfg.clientId,
      AuthParameters: {
        REFRESH_TOKEN: params.refreshToken,
        ...authParamSecretHash(cfg, username),
      },
    })
  );

  const idToken = resp.AuthenticationResult?.IdToken;
  const accessToken = resp.AuthenticationResult?.AccessToken;

  if (!idToken || !accessToken) {
    throw new Error("Refresh rejected");
  }

  return {
    idToken,
    accessToken,
    refreshToken: resp.AuthenticationResult?.RefreshToken ?? undefined,
  };
}

/** Calls Cognito GetUser — validates the access token with the IdP when you need authoritative proof. */
export async function validateAccessToken(
  cfg: CognitoEnvConfig,
  accessToken: string
): Promise<{ username?: string | null } | null> {
  try {
    const out = await client(cfg).send(new GetUserCommand({ AccessToken: accessToken }));
    return { username: out.Username };
  } catch {
    return null;
  }
}

export async function signOutEverywhere(cfg: CognitoEnvConfig, accessToken: string | null | undefined): Promise<void> {
  if (!accessToken) return;
  try {
    await client(cfg).send(new GlobalSignOutCommand({ AccessToken: accessToken }));
  } catch {
    // Offline refresh states may already be invalid — still clear cookies downstream.
  }
}

export async function signUpEmailOrUsername(
  cfg: CognitoEnvConfig,
  params: { username: string; password: string; email?: string }
): Promise<void> {
  const username = params.username.trim();
  const attrs =
    params.email && params.email.trim().length > 0
      ? [{ Name: "email", Value: params.email.trim() }]
      : undefined;

  await client(cfg).send(
    new SignUpCommand({
      ClientId: cfg.clientId,
      Username: username,
      Password: params.password,
      UserAttributes: attrs,
      ...commandSecretHash(cfg, username),
    })
  );
}

export async function confirmSignUp(
  cfg: CognitoEnvConfig,
  params: { username: string; code: string }
): Promise<void> {
  const username = params.username.trim();
  await client(cfg).send(
    new ConfirmSignUpCommand({
      ClientId: cfg.clientId,
      Username: username,
      ConfirmationCode: params.code.trim(),
      ...commandSecretHash(cfg, username),
    })
  );
}

export async function forgotPassword(cfg: CognitoEnvConfig, username: string): Promise<void> {
  const u = username.trim();
  await client(cfg).send(
    new ForgotPasswordCommand({
      ClientId: cfg.clientId,
      Username: u,
      ...commandSecretHash(cfg, u),
    })
  );
}

export async function confirmForgotPassword(
  cfg: CognitoEnvConfig,
  params: { username: string; code: string; newPassword: string }
): Promise<void> {
  const username = params.username.trim();
  await client(cfg).send(
    new ConfirmForgotPasswordCommand({
      ClientId: cfg.clientId,
      Username: username,
      ConfirmationCode: params.code.trim(),
      Password: params.newPassword,
      ...commandSecretHash(cfg, username),
    })
  );
}

export async function respondToNewPasswordChallenge(_params: {
  cfg: CognitoEnvConfig;
  session: string;
  username: string;
  newPassword: string;
}): Promise<PasswordAuthResult> {
  // Intentionally minimal — pool policies differ; wire when NEW_PASSWORD_REQUIRED is enabled.
  void _params;
  throw new Error("NEW_PASSWORD_REQUIRED handling not implemented");
}

export function extractUserFromIdToken(idToken: string) {
  return decodeCognitoIdTokenUnsafe(idToken);
}
