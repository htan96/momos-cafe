import {
  AdminAddUserToGroupCommand,
  AdminSetUserMFAPreferenceCommand,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { CognitoEnvConfig } from "@/lib/auth/cognito/config";
import {
  classifyCognitoAuthFailure,
  extractSafeCognitoSdkFields,
  unexpectedAuthResponseFailure,
  type CognitoLoginFailureClassification,
} from "@/lib/auth/cognito/cognitoSdkError";
import { cognitoSecretHash } from "@/lib/auth/cognito/secretHash";
import { decodeCognitoIdTokenUnsafe } from "@/lib/auth/cognito/tokens";
import { isMfaRelatedChallenge } from "@/lib/auth/cognito/mfa";

/** Self-service sign-ups are assigned pool group `customer` via `provisionCustomerGroupBestEffort`. */
export const CUSTOMER_POOL_GROUP_NAME = "customer" as const;

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
    }
  | { kind: "failure"; classification: CognitoLoginFailureClassification };

/** Tokens or challenge — `{ kind: "failure" }` applies only to `signInWithPassword`. */
export type PasswordAuthFlowResult = Extract<PasswordAuthResult, { kind: "tokens" } | { kind: "challenge" }>;

export async function signInWithPassword(
  cfg: CognitoEnvConfig,
  params: { username: string; password: string }
): Promise<PasswordAuthResult> {
  const username = params.username.trim();
  const initiate = () =>
    client(cfg).send(
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

  let resp: Awaited<ReturnType<typeof initiate>>;
  try {
    resp = await initiate();
  } catch (e) {
    const classification = classifyCognitoAuthFailure(e);
    const sdk = extractSafeCognitoSdkFields(e);
    console.warn("[cognito] InitiateAuth(USER_PASSWORD_AUTH) failed", {
      code: classification.code,
      cognitoErrorName: sdk.cognitoErrorName,
      cognitoErrorCode: sdk.cognitoErrorCode,
    });
    return { kind: "failure", classification };
  }

  function tokensFrom(
    r: Awaited<ReturnType<typeof initiate>>
  ): PasswordAuthResult | undefined {
    if (r.AuthenticationResult?.IdToken && r.AuthenticationResult?.AccessToken) {
      return {
        kind: "tokens",
        idToken: r.AuthenticationResult.IdToken,
        accessToken: r.AuthenticationResult.AccessToken,
        refreshToken: r.AuthenticationResult.RefreshToken ?? undefined,
      };
    }
    return undefined;
  }

  const first = tokensFrom(resp);
  if (first) return first;

  if (
    resp.ChallengeName &&
    isMfaRelatedChallenge(resp.ChallengeName) &&
    cfg.tempDisableUserMfaBeforeLogin
  ) {
    // TODO(MFA): Implement RespondToAuthChallenge for SOFTWARE_TOKEN_MFA / SMS_MFA / MFA_SETUP.
    // TODO(super_admin): Require TOTP for super_admin only once challenge UX exists — remove this bypass path for staff tiers.
    try {
      await client(cfg).send(
        new AdminSetUserMFAPreferenceCommand({
          UserPoolId: cfg.userPoolId,
          Username: username,
          SMSMfaSettings: { Enabled: false, PreferredMfa: false },
          SoftwareTokenMfaSettings: { Enabled: false, PreferredMfa: false },
        })
      );
      try {
        resp = await initiate();
      } catch (e) {
        const classification = classifyCognitoAuthFailure(e);
        const sdk = extractSafeCognitoSdkFields(e);
        console.warn("[cognito] InitiateAuth retry after MFA preference clear failed", {
          code: classification.code,
          cognitoErrorName: sdk.cognitoErrorName,
          cognitoErrorCode: sdk.cognitoErrorCode,
        });
        return { kind: "failure", classification };
      }
      const second = tokensFrom(resp);
      if (second) {
        console.warn(
          "[cognito] MFA challenge bypassed (AdminSetUserMFAPPreference + retry). Disable COGNITO_TEMP_DISABLE_USER_MFA_BEFORE_LOGIN when MFA UX is ready."
        );
        return second;
      }
    } catch (e) {
      console.warn(
        "[cognito] MFA bypass (AdminSetUserMFAPPreference) failed — ensure IAM cognito-idp:AdminSetUserMFAPPreference",
        extractSafeCognitoSdkFields(e)
      );
    }
  }

  if (resp.ChallengeName) {
    return { kind: "challenge", challengeName: resp.ChallengeName, session: resp.Session };
  }

  console.error("[cognito] InitiateAuth returned neither AuthenticationResult nor ChallengeName");
  return { kind: "failure", classification: unexpectedAuthResponseFailure() };
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

/**
 * IAM: `cognito-idp:AdminAddUserToGroup` on the pool. Duplicate membership is typically a successful no-op in Cognito.
 */
export async function adminAddUserToGroup(
  cfg: CognitoEnvConfig,
  params: { username: string; groupName: string }
): Promise<void> {
  const username = params.username.trim();
  await client(cfg).send(
    new AdminAddUserToGroupCommand({
      UserPoolId: cfg.userPoolId,
      Username: username,
      GroupName: params.groupName.trim(),
    })
  );
}

/** After successful signup/confirm: ensure `customer` group. Retry once; never throws — logs structured JSON warnings. */
export async function provisionCustomerGroupBestEffort(
  cfg: CognitoEnvConfig,
  usernameRaw: string,
  source: "signup" | "confirm_signup"
): Promise<void> {
  const username = usernameRaw.trim();
  if (!username) {
    console.warn(
      "[cognito] customer_group",
      JSON.stringify({ ok: false, source, stage: "skip", reason: "blank_username" } satisfies Record<string, unknown>)
    );
    return;
  }

  const swallowUserNotFound = (err: unknown): boolean => {
    const { cognitoErrorName } = extractSafeCognitoSdkFields(err);
    if (cognitoErrorName !== "UserNotFoundException") return false;
    console.warn(
      "[cognito] customer_group",
      JSON.stringify({
        ok: false,
        source,
        handled: true,
        reason: "user_not_found",
        username,
        cognitoErrorName,
      } satisfies Record<string, unknown>)
    );
    return true;
  };

  let lastErr: unknown;
  const attempt = async (): Promise<boolean> => {
    try {
      await adminAddUserToGroup(cfg, { username, groupName: CUSTOMER_POOL_GROUP_NAME });
      return true;
    } catch (e) {
      lastErr = e;
      if (swallowUserNotFound(e)) return true;
      return false;
    }
  };

  if (await attempt()) return;

  await new Promise((r) => setTimeout(r, 275));
  if (await attempt()) return;

  console.warn(
    "[cognito] customer_group_failed",
    JSON.stringify({
      ok: false,
      source,
      username,
      ...extractSafeCognitoSdkFields(lastErr),
      message:
        typeof lastErr === "object" && lastErr && "message" in lastErr && typeof lastErr.message === "string"
          ? lastErr.message
          : String(lastErr ?? ""),
      code: "CUSTOMER_GROUP_PROVISION_WARNING",
      note: "signup_or_confirm_already_succeeded; retry_ops_or_post_confirm_lambda",
    } satisfies Record<string, unknown>)
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

export async function respondToNewPasswordChallenge(params: {
  cfg: CognitoEnvConfig;
  session: string;
  username: string;
  newPassword: string;
}): Promise<PasswordAuthFlowResult> {
  const username = params.username.trim();
  const session = params.session.trim();
  if (!session || !username || !params.newPassword) {
    throw new Error("missing_new_password_challenge_fields");
  }

  const resp = await client(params.cfg).send(
    new RespondToAuthChallengeCommand({
      ClientId: params.cfg.clientId,
      ChallengeName: "NEW_PASSWORD_REQUIRED",
      Session: session,
      ChallengeResponses: {
        USERNAME: username,
        NEW_PASSWORD: params.newPassword,
        ...authParamSecretHash(params.cfg, username),
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
    console.warn("[cognito] RespondToAuthChallenge(NEW_PASSWORD) returned another challenge:", resp.ChallengeName);
    return { kind: "challenge", challengeName: resp.ChallengeName, session: resp.Session };
  }

  throw new Error("Unexpected RespondToAuthChallenge response after NEW_PASSWORD");
}

export function extractUserFromIdToken(idToken: string) {
  return decodeCognitoIdTokenUnsafe(idToken);
}
