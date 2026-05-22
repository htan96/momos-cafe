import { hasLikelyResolvableAwsCredentials, resolveAwsRegion } from "@/lib/aws/awsRuntimeEnv";

export type SesOutboundNotReadyReason =
  | "ses_from_missing"
  | "aws_region_missing"
  | "no_credential_chain_hint"
  | "credential_env_asymmetric_hint"
  /** Heuristic readiness failed — specific gate not classified (avoid in normal paths). */
  | "unknown";

export type SesOutboundConfig =
  | { ok: true }
  | { ok: false; reason: SesOutboundNotReadyReason };

export type SesReadinessDiag = {
  /** Best-effort reason SES was skipped when `resolved` is false. Emitted / logged sparingly — not authoritative. */
  sesBlockingReason?:
    | "ses_from_missing"
    | "aws_region_missing"
    | "no_credential_chain_hint"
    | "credential_env_asymmetric_hint";
};

/** Detect likely misconfigured static keys (presence of ACCESS_KEY_ID without SECRET etc.). Never blocks SDK resolution; ops signal only. */
function credentialChainAsymmetricHint(): boolean {
  const hasAk = Boolean(process.env.AWS_ACCESS_KEY_ID?.trim());
  const hasSk = Boolean(process.env.AWS_SECRET_ACCESS_KEY?.trim());
  const hasSts =
    Boolean(process.env.AWS_WEB_IDENTITY_TOKEN_FILE?.trim()) ||
    Boolean(process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI?.trim()) ||
    Boolean(process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI?.trim()) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME?.trim());
  if ((hasAk && !hasSk) || (!hasAk && hasSk && !hasSts)) return true;
  return false;
}

/**
 * Explains SES readiness gates for logging / telemetry when SES is unavailable.
 * Lightweight — does not probe IAM or SES APIs (see sesAccountProbe elsewhere).
 */
export function diagnoseSesReadinessForLogs(): SesReadinessDiag {
  const fromMissing = !process.env.SES_FROM_EMAIL?.trim();
  const regionMissing = !resolveAwsRegion();
  const credentialHintMissing = !hasLikelyResolvableAwsCredentials();
  if (credentialChainAsymmetricHint()) {
    return { sesBlockingReason: "credential_env_asymmetric_hint" };
  }
  if (fromMissing) return { sesBlockingReason: "ses_from_missing" };
  if (regionMissing) return { sesBlockingReason: "aws_region_missing" };
  if (credentialHintMissing) return { sesBlockingReason: "no_credential_chain_hint" };
  return {};
}

/**
 * Canonical outbound transactional readiness — SES only (`POST /api/email/send`).
 * Thin env heuristic: does not invoke SES APIs (see integration health probes).
 */
export function resolveSesOutboundConfig(): SesOutboundConfig {
  if (isSesOutboundReady()) return { ok: true };
  const diag = diagnoseSesReadinessForLogs();
  const r = diag.sesBlockingReason;
  if (
    r === "ses_from_missing" ||
    r === "aws_region_missing" ||
    r === "no_credential_chain_hint" ||
    r === "credential_env_asymmetric_hint"
  ) {
    return { ok: false, reason: r };
  }
  return { ok: false, reason: "unknown" };
}

/** True when SES can be attempted for transactional outbound send (thin env heuristic). */
export function isSesOutboundReady(): boolean {
  const from = process.env.SES_FROM_EMAIL?.trim();
  const region = resolveAwsRegion();
  return Boolean(from && region && hasLikelyResolvableAwsCredentials());
}
