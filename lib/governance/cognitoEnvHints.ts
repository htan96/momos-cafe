/**
 * Non-secret shape hints for operators — never prints raw secrets.
 */
export function getCognitoEnvHintLines(): string[] {
  const region = process.env.COGNITO_REGION?.trim();
  const pool = process.env.COGNITO_USER_POOL_ID?.trim();
  const client = process.env.COGNITO_CLIENT_ID?.trim();
  const hosted = process.env.COGNITO_HOSTED_UI_DOMAIN?.trim();
  const secretSet = !!process.env.COGNITO_CLIENT_SECRET?.trim();

  const lines: string[] = [];
  lines.push(`COGNITO_REGION=${region || "(not set)"}`);
  lines.push(
    `COGNITO_USER_POOL_ID=${pool ? `${pool.slice(0, 6)}…${pool.slice(-4)}` : "(not set)"}`
  );
  lines.push(
    `COGNITO_CLIENT_ID=${client ? `${client.slice(0, 4)}…${client.slice(-3)}` : "(not set)"}`
  );
  lines.push(`COGNITO_CLIENT_SECRET=${secretSet ? "present (masked)" : "(not set)"}`);
  lines.push(`COGNITO_HOSTED_UI_DOMAIN=${hosted || "(not set)"}`);
  return lines;
}
