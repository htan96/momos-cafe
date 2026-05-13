import { createHmac } from "crypto";

/** Cognito `SECRET_HASH` for app clients configured with a client secret. */
export function cognitoSecretHash(username: string, clientId: string, clientSecret: string): string {
  const hmac = createHmac("sha256", clientSecret);
  hmac.update(`${username}${clientId}`);
  return hmac.digest("base64");
}
