import {
  worstOperationalFourTierSeverity,
  type OperationalReadinessSeverity,
} from "@/lib/operations/semantics/severity";
import {
  getShippoInboundWebhookSecretTrimmed,
  shippoInboundIsProductionLikeRuntime,
} from "@/lib/webhooks/shippo/shippoInboundProductionGate";
import { resolveSesOutboundConfig } from "@/lib/email/outboundTransportEnv";

export type { OperationalReadinessSeverity };

/**
 * Env-driven readiness issue row — severity uses {@link OperationalReadinessSeverity} (`@/lib/operations/semantics/severity`).
 */
export type OperationalEnvIssue = {
  code: string;
  severity: OperationalReadinessSeverity;
  message: string;
  remediation: string;
};

/** Production-like hosts (Square / Shippo operational gates align on this heuristic). */
export function isOperationalProductionLikeRuntime(): boolean {
  return shippoInboundIsProductionLikeRuntime();
}

function nonempty(v: string | undefined): string {
  return v?.trim() ?? "";
}

function pushSquareIssues(out: OperationalEnvIssue[], prodLike: boolean) {
  const token = nonempty(process.env.SQUARE_ACCESS_TOKEN);
  const location = nonempty(process.env.SQUARE_LOCATION_ID);
  const sigKey = nonempty(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY);
  const notifyUrl = nonempty(process.env.SQUARE_WEBHOOK_NOTIFICATION_URL);

  const severityForMissing = (area: "payments" | "webhooks"): OperationalReadinessSeverity =>
    prodLike ? "CRITICAL" : area === "payments" ? "WARNING" : "WARNING";

  if (!token) {
    out.push({
      code: "square_payment_access_token_missing",
      severity: severityForMissing("payments"),
      message: "Square payments / catalog calls need `SQUARE_ACCESS_TOKEN`.",
      remediation:
        "Set `SQUARE_ACCESS_TOKEN` from the Square Developer Dashboard for the configured `SQUARE_ENVIRONMENT`.",
    });
  }

  if (!location) {
    out.push({
      code: "square_payment_location_id_missing",
      severity: severityForMissing("payments"),
      message: "`SQUARE_LOCATION_ID` unset — storefront settlement and catalog scoping depend on it.",
      remediation: "Copy the Location ID from Square Dashboard → Locations into `SQUARE_LOCATION_ID`.",
    });
  }

  if (!sigKey) {
    out.push({
      code: "square_webhook_signature_key_missing",
      severity: severityForMissing("webhooks"),
      message: "`SQUARE_WEBHOOK_SIGNATURE_KEY` unset — webhook signature verification cannot succeed.",
      remediation:
        "Square Developer Dashboard → Webhooks → subscription → Signature key → `SQUARE_WEBHOOK_SIGNATURE_KEY`.",
    });
  }

  if (!notifyUrl) {
    out.push({
      code: "square_webhook_notification_url_missing",
      severity: prodLike ? "CRITICAL" : "WARNING",
      message: "`SQUARE_WEBHOOK_NOTIFICATION_URL` unset.",
      remediation:
        "Set to the webhook subscription Notification URL exactly (scheme, host, path, trailing slash) for `POST /api/webhooks/square`.",
    });
  }

  const nodeProd = process.env.NODE_ENV === "production";
  if (nodeProd && !notifyUrl) {
    out.push({
      code: "square_webhook_url_missing_while_node_production",
      severity: "CRITICAL",
      message: "`NODE_ENV=production` but `SQUARE_WEBHOOK_NOTIFICATION_URL` is empty — operators cannot reconcile subscription URL drift via env.",
      remediation:
        "Set `SQUARE_WEBHOOK_NOTIFICATION_URL` to match the live Square webhook subscription, or downgrade `NODE_ENV` only in non-hosted dev (never for production deployments).",
    });
  }

  const envHint = nonempty(process.env.SQUARE_ENVIRONMENT);
  if (!envHint) {
    out.push({
      code: "square_environment_unset",
      severity: prodLike ? "HIGH" : "INFO",
      message: "`SQUARE_ENVIRONMENT` unset — token/endpoint alignment may drift between sandbox and production.",
      remediation: "Set `SQUARE_ENVIRONMENT` to `production` or `sandbox` matching the issued access token.",
    });
  }
}

function pushShippoIssues(out: OperationalEnvIssue[], prodLike: boolean) {
  const secretOk = getShippoInboundWebhookSecretTrimmed().length > 0;
  const apiKey = nonempty(process.env.SHIPPO_API_KEY);
  const shippoEnv = nonempty(process.env.SHIPPO_ENV);

  if (prodLike && !secretOk) {
    out.push({
      code: "shippo_webhook_secret_missing_production",
      severity: "CRITICAL",
      message:
        "`SHIPPO_WEBHOOK_SECRET` missing in a production-like runtime — `/api/webhooks/shippo` fail-closes (503).",
      remediation:
        "Set `SHIPPO_WEBHOOK_SECRET` to the Shippo dashboard webhook signing secret; matches `rejectShippoWebhookIfProductionMisconfigured`.",
    });
  } else if (!prodLike && !secretOk) {
    out.push({
      code: "shippo_webhook_secret_missing_non_production",
      severity: "INFO",
      message: "`SHIPPO_WEBHOOK_SECRET` unset — acceptable for local webhook testing only.",
      remediation: "Before pointing Shippo production subscriptions at this host, set `SHIPPO_WEBHOOK_SECRET`.",
    });
  }

  if (prodLike && !apiKey) {
    out.push({
      code: "shippo_api_key_missing_production",
      severity: "HIGH",
      message: "`SHIPPO_API_KEY` unset — quoting, label purchase, and Shippo-backed ops cannot authenticate.",
      remediation: "Set a live Shippo API key (`shippo_live_*`) with `SHIPPO_ENV=production` per `lib/shipping/shippoClient.ts`.",
    });
  } else if (!prodLike && !apiKey) {
    out.push({
      code: "shippo_api_key_missing_non_production",
      severity: "WARNING",
      message: "`SHIPPO_API_KEY` unset — shipping surfaces will remain disabled until configured.",
      remediation: "Set `SHIPPO_API_KEY` when exercising label flows locally or in staging.",
    });
  }

  if (apiKey && !shippoEnv) {
    out.push({
      code: "shippo_env_unset_with_api_key",
      severity: "WARNING",
      message: "`SHIPPO_ENV` unset while `SHIPPO_API_KEY` is present.",
      remediation: "Set `SHIPPO_ENV=production` (or `live`) for live tokens — see Shippo client guards.",
    });
  }
}

function pushSesOutboundIssues(out: OperationalEnvIssue[], prodLike: boolean) {
  const cfg = resolveSesOutboundConfig();
  if (cfg.ok) return;

  const sevBase: OperationalReadinessSeverity = prodLike ? "HIGH" : "WARNING";
  switch (cfg.reason) {
    case "ses_from_missing":
      out.push({
        code: "ses_outbound_from_missing",
        severity: sevBase,
        message: "`SES_FROM_EMAIL` unset — transactional SES send path (`resolveSesOutboundConfig`) reports not ready.",
        remediation: "Set `SES_FROM_EMAIL` to a verified SES identity.",
      });
      break;
    case "aws_region_missing":
      out.push({
        code: "ses_outbound_aws_region_missing",
        severity: sevBase,
        message: "AWS region unresolved (`AWS_REGION` / `AWS_DEFAULT_REGION`) — SES client cannot bind.",
        remediation: "Set `AWS_REGION` (preferred) or `AWS_DEFAULT_REGION` in the deployment environment.",
      });
      break;
    case "no_credential_chain_hint":
      out.push({
        code: "ses_outbound_credentials_unhinted",
        severity: prodLike ? "HIGH" : "WARNING",
        message:
          "No static AWS key hints and no instance/Lambda/container credential env — `hasLikelyResolvableAwsCredentials` is false.",
        remediation:
          "Use IAM/instance role on AWS, set `AWS_ACCESS_KEY_ID`+`AWS_SECRET_ACCESS_KEY` for bootstrap, or document runtime-specific credential injection.",
      });
      break;
    case "credential_env_asymmetric_hint":
      out.push({
        code: "ses_outbound_credentials_asymmetric",
        severity: "WARNING",
        message: "Asymmetric credential env (`AWS_ACCESS_KEY_ID` vs secret / STS hints) — may block SDK wiring.",
        remediation: "Pair access key with secret key, or remove stray partial vars; prefer role-based credentials.",
      });
      break;
    default:
      out.push({
        code: "ses_outbound_unknown",
        severity: "WARNING",
        message: "SES outbound readiness check returned an unknown failure bucket.",
        remediation: "Inspect `resolveSesOutboundConfig` / deployment env alongside CloudWatch SES errors.",
      });
  }
}

function pushSesInboundIssues(out: OperationalEnvIssue[], prodLike: boolean) {
  const topic = nonempty(process.env.SES_INBOUND_SNS_TOPIC_ARN);
  if (topic) return;

  out.push({
    code: "ses_inbound_sns_topic_missing",
    severity: prodLike ? "HIGH" : "WARNING",
    message:
      "`SES_INBOUND_SNS_TOPIC_ARN` unset — SNS allow-list routing for SES receive → `/api/email/inbound-ses` cannot be configured.",
    remediation:
      "Create an SNS topic for SES inbound notifications and set `SES_INBOUND_SNS_TOPIC_ARN` to match the subscription allow-list in code.",
  });
}

function pushInternalIssues(out: OperationalEnvIssue[], prodLike: boolean) {
  const secret = nonempty(process.env.INTERNAL_API_SECRET);
  if (!secret) {
    out.push({
      code: "internal_api_secret_missing",
      severity: prodLike ? "CRITICAL" : "WARNING",
      message: "`INTERNAL_API_SECRET` unset — orchestration middleware and `verifyInternalSecretFromRequest` reject callers.",
      remediation: "Set `INTERNAL_API_SECRET` to a random string ≥ 24 chars (matches `lib/server/internalAuth.ts`).",
    });
    return;
  }
  if (secret.length < 24) {
    out.push({
      code: "internal_api_secret_too_short",
      severity: prodLike ? "CRITICAL" : "HIGH",
      message: `\`INTERNAL_API_SECRET\` is ${secret.length} chars — helpers require length ≥ 24.`,
      remediation: "Rotate to a longer secret (≥24 characters) across env + callers.",
    });
  }
}

function pushCognitoIssues(out: OperationalEnvIssue[], prodLike: boolean) {
  const region = nonempty(process.env.COGNITO_REGION);
  const pool = nonempty(process.env.COGNITO_USER_POOL_ID);
  const client = nonempty(process.env.COGNITO_CLIENT_ID);
  const sev = prodLike ? "CRITICAL" : "WARNING";

  if (!region) {
    out.push({
      code: "cognito_region_missing",
      severity: sev,
      message: "`COGNITO_REGION` unset — Cognito SDK clients cannot resolve an endpoint.",
      remediation: "Set `COGNITO_REGION` to the pool home region (e.g. `us-west-2`).",
    });
  }
  if (!pool) {
    out.push({
      code: "cognito_user_pool_id_missing",
      severity: sev,
      message: "`COGNITO_USER_POOL_ID` unset — authentication and admin layouts cannot bind to an IdP.",
      remediation: "Copy User Pool ID from Cognito console → `COGNITO_USER_POOL_ID`.",
    });
  }
  if (!client) {
    out.push({
      code: "cognito_client_id_missing",
      severity: sev,
      message: "`COGNITO_CLIENT_ID` unset — browser / server OAuth and password flows lack an app client.",
      remediation: "Set `COGNITO_CLIENT_ID` from App integration → App clients.",
    });
  }
}

/**
 * Thin, synchronous scan of deployment env vars (no network, no Prisma).
 * Intended for super-admin readiness UI only — does not gate request handlers.
 */
export function scanEnvironmentOperationalIssues(): OperationalEnvIssue[] {
  const out: OperationalEnvIssue[] = [];
  const prodLike = isOperationalProductionLikeRuntime();

  pushSquareIssues(out, prodLike);
  pushShippoIssues(out, prodLike);
  pushSesOutboundIssues(out, prodLike);
  pushSesInboundIssues(out, prodLike);
  pushInternalIssues(out, prodLike);
  pushCognitoIssues(out, prodLike);

  return dedupeOperationalEnvIssues(out);
}

export function worstOperationalReadinessSeverity(levels: OperationalReadinessSeverity[]): OperationalReadinessSeverity | null {
  return worstOperationalFourTierSeverity(levels);
}

function dedupeOperationalEnvIssues(issues: OperationalEnvIssue[]): OperationalEnvIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    if (seen.has(i.code)) return false;
    seen.add(i.code);
    return true;
  });
}
