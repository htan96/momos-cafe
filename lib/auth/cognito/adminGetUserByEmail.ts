import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoConfig } from "@/lib/auth/cognito/config";

export type CognitoUserLookup = {
  username: string;
  email: string;
  sub?: string;
};

/**
 * Resolves a pool user by **email as `Username`** (common for email-alias pools). MVP behavior.
 */
export async function adminGetUserByEmail(email: string): Promise<CognitoUserLookup | null> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;

  const cfg = getCognitoConfig();
  if (!cfg) return null;

  const region = cfg.region;
  const userPoolId = cfg.userPoolId;

  const client = new CognitoIdentityProviderClient({ region });
  try {
    const res = await client.send(
      new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: trimmed,
      })
    );

    const attrs = res.UserAttributes ?? [];
    const emailAttr = attrs.find((a) => a.Name === "email")?.Value?.trim();
    const subAttr = attrs.find((a) => a.Name === "sub")?.Value?.trim();

    return {
      username: res.Username ?? trimmed,
      email: emailAttr ?? trimmed,
      sub: subAttr,
    };
  } catch (e: unknown) {
    const name = typeof e === "object" && e && "name" in e ? String((e as { name?: string }).name) : "";
    if (name === "UserNotFoundException") return null;
    console.error("[cognito] AdminGetUser failed", e);
    throw e;
  }
}
