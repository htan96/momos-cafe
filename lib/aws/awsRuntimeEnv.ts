/**
 * Lightweight env predicates for initializing AWS SDK v3 clients outside of secrets handling.
 * For credential behavior, defer to AWS SDK standard chain (IAM role, SSO profile, keys, containers, Lambda, etc.).
 *
 * **Region:** Prefer **`AWS_REGION`** in deployments. **`AWS_DEFAULT_REGION`** is accepted as an AWS SDK-compatible
 * alternate; `resolveAwsRegion` reads `AWS_REGION` first, then `AWS_DEFAULT_REGION`.
 */
export function resolveAwsRegion(): string | null {
  const raw = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  const t = typeof raw === "string" ? raw.trim() : "";
  return t.length > 0 ? t : null;
}

/** Heuristic hint that credential resolution likely succeeds — not a substitute for probing the API in health checks. */
export function hasLikelyResolvableAwsCredentials(): boolean {
  if (process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim()) {
    return true;
  }
  if (process.env.AWS_WEB_IDENTITY_TOKEN_FILE?.trim() && process.env.AWS_ROLE_ARN?.trim()) {
    return true;
  }
  if (process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI?.trim()) return true;
  if (process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI?.trim()) return true;
  if (process.env.AWS_EXECUTION_ENV?.trim()) return true;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME?.trim()) return true;
  return false;
}
