/**
 * Safe extraction of AWS Cognito Identity Provider SDK errors (no passwords or secrets).
 */

export type SafeCognitoSdkFields = {
  cognitoErrorName?: string;
  cognitoErrorCode?: string;
};

export function extractSafeCognitoSdkFields(err: unknown): SafeCognitoSdkFields {
  if (!err || typeof err !== "object") return {};
  const o = err as Record<string, unknown>;
  const cognitoErrorName = typeof o.name === "string" ? o.name : undefined;
  const cognitoErrorCode =
    typeof o.Code === "string"
      ? o.Code
      : typeof o.code === "string"
        ? o.code
        : typeof o.__type === "string"
          ? o.__type.split("#").pop()
          : undefined;
  return { cognitoErrorName, cognitoErrorCode };
}

/** Cognito / AWS SDK error message (no stack); used to distinguish session errors from bad credentials. */
export function extractCognitoErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const o = err as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  if (typeof o.Message === "string") return o.Message;
  return "";
}

function isConsumedOrInvalidChallengeSessionMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("session can only be used once") ||
    m.includes("invalid session for the user") ||
    (m.includes("invalid session") && m.includes("user"))
  );
}

function isSessionExpiredMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (m.includes("session") && m.includes("expir")) || m.includes("session expired");
}

export type CognitoLoginFailureClassification = SafeCognitoSdkFields & {
  error: string;
  httpStatus: number;
  code: string;
  unconfirmed: boolean;
  passwordResetRequired: boolean;
  mfaSetupPending: boolean;
  softwareTokenMfaPending: boolean;
  smsMfaPending: boolean;
  transient: boolean;
  /** Safe copy for JSON `message` on select codes (e.g. stale challenge session). */
  message?: string;
};

function boolForName(name: string | undefined, ...matches: string[]): boolean {
  if (!name) return false;
  return matches.includes(name);
}

/**
 * Maps SDK exception names to stable API JSON fields and suggested HTTP status.
 */
export function classifyCognitoAuthFailure(err: unknown): CognitoLoginFailureClassification {
  const { cognitoErrorName, cognitoErrorCode } = extractSafeCognitoSdkFields(err);
  const name = cognitoErrorName ?? "";
  const cognitoMessage = extractCognitoErrorMessage(err);

  if (boolForName(name, "UserNotConfirmedException")) {
    return {
      error: "user_not_confirmed",
      code: "USER_NOT_CONFIRMED",
      httpStatus: 403,
      unconfirmed: true,
      passwordResetRequired: false,
      mfaSetupPending: false,
      softwareTokenMfaPending: false,
      smsMfaPending: false,
      transient: false,
      cognitoErrorName,
      cognitoErrorCode,
    };
  }

  if (boolForName(name, "PasswordResetRequiredException")) {
    return {
      error: "password_reset_required",
      code: "PASSWORD_RESET_REQUIRED",
      httpStatus: 401,
      unconfirmed: false,
      passwordResetRequired: true,
      mfaSetupPending: false,
      softwareTokenMfaPending: false,
      smsMfaPending: false,
      transient: false,
      cognitoErrorName,
      cognitoErrorCode,
    };
  }

  /**
   * Stale/consumed USER_PASSWORD_AUTH challenge sessions surface as NotAuthorizedException
   * (“Invalid session for the user, session can only be used once”) until the user signs in again.
   */
  if (
    boolForName(name, "NotAuthorizedException") &&
    isConsumedOrInvalidChallengeSessionMessage(cognitoMessage)
  ) {
    return {
      error: "challenge_session_invalid",
      code: "CHALLENGE_SESSION_INVALID",
      httpStatus: 409,
      unconfirmed: false,
      passwordResetRequired: false,
      mfaSetupPending: false,
      softwareTokenMfaPending: false,
      smsMfaPending: false,
      transient: false,
      cognitoErrorName,
      cognitoErrorCode,
      message: "Your sign-in step is no longer valid. Sign in again to start fresh.",
    };
  }

  if (
    boolForName(name, "NotAuthorizedException") &&
    !isConsumedOrInvalidChallengeSessionMessage(cognitoMessage) &&
    isSessionExpiredMessage(cognitoMessage)
  ) {
    return {
      error: "session_expired",
      code: "SESSION_EXPIRED",
      httpStatus: 409,
      unconfirmed: false,
      passwordResetRequired: false,
      mfaSetupPending: false,
      softwareTokenMfaPending: false,
      smsMfaPending: false,
      transient: false,
      cognitoErrorName,
      cognitoErrorCode,
      message: "Your sign-in session expired. Sign in again to continue.",
    };
  }

  if (boolForName(name, "NotAuthorizedException", "UserLambdaValidationException")) {
    return {
      error: "invalid_credentials",
      code: "NOT_AUTHORIZED",
      httpStatus: 401,
      unconfirmed: false,
      passwordResetRequired: false,
      mfaSetupPending: false,
      softwareTokenMfaPending: false,
      smsMfaPending: false,
      transient: false,
      cognitoErrorName,
      cognitoErrorCode,
    };
  }

  if (boolForName(name, "TooManyRequestsException", "LimitExceededException")) {
    return {
      error: "rate_limited",
      code: "RATE_LIMITED",
      httpStatus: 429,
      unconfirmed: false,
      passwordResetRequired: false,
      mfaSetupPending: false,
      softwareTokenMfaPending: false,
      smsMfaPending: false,
      transient: true,
      cognitoErrorName,
      cognitoErrorCode,
    };
  }

  if (boolForName(name, "InvalidParameterException")) {
    return {
      error: "invalid_request",
      code: "INVALID_PARAMETER",
      httpStatus: 400,
      unconfirmed: false,
      passwordResetRequired: false,
      mfaSetupPending: false,
      softwareTokenMfaPending: false,
      smsMfaPending: false,
      transient: false,
      cognitoErrorName,
      cognitoErrorCode,
    };
  }

  if (boolForName(name, "ResourceNotFoundException", "InvalidUserPoolConfigurationException")) {
    return {
      error: "cognito_misconfigured",
      code: "POOL_OR_CLIENT_CONFIG",
      httpStatus: 503,
      unconfirmed: false,
      passwordResetRequired: false,
      mfaSetupPending: false,
      softwareTokenMfaPending: false,
      smsMfaPending: false,
      transient: true,
      cognitoErrorName,
      cognitoErrorCode,
    };
  }

  // Networking / unknown service faults
  if (
    boolForName(
      name,
      "TimeoutError",
      "NetworkingError",
      "ServiceUnavailable",
      "InternalServerError",
      "InternalErrorException"
    )
  ) {
    return {
      error: "cognito_unavailable",
      code: "TRANSIENT",
      httpStatus: 503,
      unconfirmed: false,
      passwordResetRequired: false,
      mfaSetupPending: false,
      softwareTokenMfaPending: false,
      smsMfaPending: false,
      transient: true,
      cognitoErrorName,
      cognitoErrorCode,
    };
  }

  return {
    error: "cognito_error",
    code: "COGNITO_ERROR",
    httpStatus: 500,
    unconfirmed: false,
    passwordResetRequired: false,
    mfaSetupPending: false,
    softwareTokenMfaPending: false,
    smsMfaPending: false,
    transient: false,
    cognitoErrorName,
    cognitoErrorCode,
  };
}

export function unexpectedAuthResponseFailure(): CognitoLoginFailureClassification {
  return {
    error: "unexpected_auth_response",
    code: "UNEXPECTED_AUTH_RESPONSE",
    httpStatus: 500,
    unconfirmed: false,
    passwordResetRequired: false,
    mfaSetupPending: false,
    softwareTokenMfaPending: false,
    smsMfaPending: false,
    transient: false,
  };
}
