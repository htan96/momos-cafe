/** Classify infra-style Cognito/AWS SDK faults (credential chain, IAM, throttle) — not user-not-found. */

export type CognitoSdkInfraFailureKind = "credentials" | "access_denied" | "throttling" | "invalid_parameter" | "unknown";

export function classifyCognitoSdkInfraFailure(err: unknown): {
  failureKind: CognitoSdkInfraFailureKind;
  code: string;
  detail: string;
} {
  const detail = err instanceof Error ? err.message : String(err ?? "");
  const name =
    typeof err === "object" && err !== null && "name" in err && typeof (err as { name?: unknown }).name === "string"
      ? (err as { name: string }).name
      : "";

  const hay = `${name} ${detail}`;

  if (
    name === "CredentialsProviderError" ||
    /Could not load credentials from/i.test(detail) ||
    /credentials could not be loaded/i.test(detail) ||
    /Could not resolve credentials/i.test(detail)
  ) {
    return { failureKind: "credentials", code: name || "CredentialsProviderError", detail };
  }

  if (/InvalidParameter/i.test(name) || /Invalid parameter/i.test(detail)) {
    return { failureKind: "invalid_parameter", code: name || "InvalidParameter", detail };
  }

  if (/NotAuthorized|Forbidden|AccessDenied|AccessDeniedException|Unauthorized/i.test(hay)) {
    return { failureKind: "access_denied", code: name || "ACCESS_DENIED", detail };
  }

  if (/TooManyRequests|Throttl|Rate exceeded/i.test(hay)) {
    return { failureKind: "throttling", code: name || "THROTTLING", detail };
  }

  return { failureKind: "unknown", code: name || "COGNITO_INFRA", detail };
}
