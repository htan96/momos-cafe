/**
 * Static read-only governance view of planned / stubbed communications — not live inventory.
 */

import type { WorkflowId } from "@/domains/communications/workflowIds";
import { EMAIL_WORKFLOW_REGISTRY } from "@/lib/email/workflows";

export type CommunicationGovernanceCatalogRow = {
  group: string;
  templateOrRouteKey: string;
  trigger: string;
  owner: string;
  transport: string;
};

const WORKFLOW_GROUP_LABEL: Record<WorkflowId, string> = {
  transactionalCommerce: "Commerce transactional",
  catering: "Catering lifecycle",
  accountSecurity: "Account & security",
  promotional: "Promotional",
  internalOps: "Internal ops alerts",
  inboundPlaceholder: "Inbound placeholder",
};

function workflowRows(): CommunicationGovernanceCatalogRow[] {
  return (Object.keys(EMAIL_WORKFLOW_REGISTRY) as WorkflowId[]).map((wf) => ({
    group: "EMAIL_WORKFLOW_REGISTRY",
    templateOrRouteKey: wf,
    trigger: `Workflow bucket — ${EMAIL_WORKFLOW_REGISTRY[wf].label} (${WORKFLOW_GROUP_LABEL[wf]})`,
    owner: "Momos (orchestration code)",
    transport:
      wf === "accountSecurity" ? "Cognito + app-hosted templates where applicable"
      : wf === "inboundPlaceholder" ? "SES + operational parsing (planned)"
      : "SES outbound (fallback Resend transitional — see transactional send module)",
  }));
}

/** Doc parity with `notificationTypeSupportsOutboundEmail` — transactional mail bridge. */
const NOTIFICATION_EMAIL_BRIDGE_NOTE =
  "`notificationTypeSupportsOutboundEmail` admits types prefixed `email.transactional.*` before `deliverOutboundEmail` routing.";

export const COMMUNICATION_GOVERNANCE_CATALOG_ROWS: CommunicationGovernanceCatalogRow[] = [
  {
    group: "Outbound stubs",
    templateOrRouteKey: "buildOrderConfirmationEmailStub",
    trigger: "Manual / storefront order.confirm (pending wiring)",
    owner: "Momos",
    transport: "SES (application)",
  },
  {
    group: "Outbound stubs",
    templateOrRouteKey: "buildPickupReadyEmailStub",
    trigger: "Fulfillment READY transition (kitchen retail mix — emitter TBD)",
    owner: "Momos",
    transport: "SES (application)",
  },
  {
    group: "Outbound stubs",
    templateOrRouteKey: "buildShipmentTrackingEmailStub",
    trigger: "Shipment label purchased / carrier event fan-out",
    owner: "Momos",
    transport: "SES (application)",
  },
  {
    group: "Outbound stubs",
    templateOrRouteKey: "buildCateringReceivedEmailStub",
    trigger: "Catering inquiry form accepted",
    owner: "Momos",
    transport: "SES (application)",
  },
  {
    group: "Outbound stubs",
    templateOrRouteKey: "buildOpsAlertEmailStub",
    trigger: "Internal ops escalation / watchdog",
    owner: "Momos",
    transport: "SES (application)",
  },
  ...workflowRows(),
  {
    group: "Notification ⇄ mail bridge",
    templateOrRouteKey: "notificationEmailBridge",
    trigger: NOTIFICATION_EMAIL_BRIDGE_NOTE,
    owner: "Momos (`lib/email/notificationEmailBridge.ts`)",
    transport: "Queue → SES / provider adapter",
  },
  {
    group: "SES inbound addressing",
    templateOrRouteKey: "SES_INBOUND_REPLY_DOMAIN",
    trigger: "`resolveSesInboundOperationalDomain()` — explicit env or inferred from SES_FROM_EMAIL domain",
    owner: "Momos infra",
    transport: "SES receipt → app webhook ingestion",
  },
  {
    group: "SES inbound addressing",
    templateOrRouteKey: "reply+<token>@<domain>",
    trigger: "`matchOperationalRecipient` — correlate plus-address tokens to threads",
    owner: "Momos",
    transport: "SES → operational inbound webhook",
  },
  {
    group: "SES inbound addressing",
    templateOrRouteKey: "SES_OPS_SUPPORT_LOCALPART (+ SES_OPS_CATERING_LOCALPART)",
    trigger:
      "Shared mailbox aliases (defaults `support` / `catering`) on the inbound SES domain (`lib/email/inboundOperationalEnv`).",
    owner: "Momos",
    transport: "SES → ops mailbox processing",
  },
  {
    group: "PSP receipts (not Momos SES body)",
    templateOrRouteKey: "square.payment_receipts",
    trigger: "Square buyer-facing transactional payment / order confirmations",
    owner: "Square",
    transport: "Square email channel",
  },
  {
    group: "Planned",
    templateOrRouteKey: "sms.transactional.commerce (stub)",
    trigger: "Planned storefront lifecycle echoes — no SMS provider wired in repo",
    owner: "Momos",
    transport: "TBD (e.g., Twilio) — SMS not implemented",
  },
];
