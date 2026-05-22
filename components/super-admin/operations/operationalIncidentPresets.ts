import { OPERATIONS_RUNBOOK_PATHS, type OperationalIncidentContext } from "./operationalIncidentContext";

/** Square orphan webhook / receipt drift entry points (payments + payment integrity). */
export function orphanSquarePaymentOperationalContext(meta?: { page?: "payment_integrity" }): OperationalIncidentContext {
  const toolItems: OperationalIncidentContext["groups"][number]["items"] = [
    { href: "/super-admin/platform/feature-controls", label: "Governance controls" },
    { href: "/super-admin/operations/webhook-replay", label: "Webhook replay" },
    { href: "/super-admin/operations/payments", label: "Payments ops" },
  ];
  if (meta?.page !== "payment_integrity") {
    toolItems.push({ href: "/super-admin/operations/payment-integrity", label: "Payment integrity" });
  }

  return {
    scenario:
      "Confirm Square dashboard payment state, review governance kill-switches, then use webhook replay or the authenticated square-payment recovery route — never mutate money from these read-only views alone.",
    groups: [
      {
        heading: "Related tools",
        items: toolItems,
      },
      {
        heading: "Runbook",
        items: [
          {
            kind: "repo_doc",
            label: "Repo playbook",
            repoPath: OPERATIONS_RUNBOOK_PATHS.paymentsShippingIntegrity,
            hint: "Open from your local checkout or source host.",
          },
        ],
      },
    ],
  };
}

/** Notification outbox incidents: requeue tooling + SES/webhook correlation. */
export function notificationDeliveryFailureOperationalContext(): OperationalIncidentContext {
  return {
    scenario:
      "Inspect backlog leases and terminal errors on this page, then use Phase A/B operator requeue (card below). If transport receipts look wrong or missing, open webhook replay plus governance SES posture — avoid dead-letter rewind without explicit diner impact review.",
    groups: [
      {
        heading: "Related tools",
        items: [
          {
            href: "/super-admin/operations/notifications-health#notification-operator-requeue",
            label: "Jump to operator requeue",
            hint: "Anchors the Operator actions card on this route.",
          },
          { href: "/super-admin/operations/webhook-replay", label: "Webhook replay" },
          { href: "/super-admin/platform/feature-controls", label: "Governance · notifications / SES switches" },
          { href: "/super-admin/live-activity", label: "Live activity feed" },
        ],
      },
      {
        heading: "Runbook",
        items: [
          {
            kind: "repo_doc",
            label: "Repo playbook",
            repoPath: OPERATIONS_RUNBOOK_PATHS.notificationsWebhooksReplay,
          },
        ],
      },
    ],
  };
}

/** Shippo receipt drift / orphan tracking rows. */
export function shippoWebhookDriftOperationalContext(): OperationalIncidentContext {
  return {
    scenario:
      "Resolve local Shipment / tracking linkage first, then replay with authentic Shippo JSON if needed. Cross-check lifecycle coordination scans before editing commerce shells.",
    groups: [
      {
        heading: "Related tools",
        items: [
          { href: "/super-admin/operations/lifecycle-integrity", label: "Lifecycle integrity" },
          { href: "/super-admin/operations/webhook-replay", label: "Webhook replay" },
          { href: "/super-admin/operations/deliveries", label: "Shipments workspace" },
          { href: "/super-admin/operations/failures", label: "Failures inbox" },
        ],
      },
      {
        heading: "Runbook",
        items: [
          {
            kind: "repo_doc",
            label: "Repo playbook",
            repoPath: OPERATIONS_RUNBOOK_PATHS.paymentsShippingIntegrity,
          },
        ],
      },
    ],
  };
}

/** Webhook replay console — reciprocal links for common precedents. */
export function webhookReplayIncidentContext(): OperationalIncidentContext {
  return {
    scenario:
      "Paste vendor-sourced JSON only. For Square money movement or Shippo label hydrate side effects, correlate with payment integrity, notification outbox health, and governance kill-switches before replaying.",
    groups: [
      {
        heading: "Related tools",
        items: [
          { href: "/super-admin/operations/payment-integrity", label: "Payment integrity" },
          { href: "/super-admin/operations/notifications-health", label: "Notification outbox health" },
          { href: "/super-admin/operations/shippo-webhooks", label: "Shippo webhooks" },
          { href: "/super-admin/platform/feature-controls", label: "Governance controls" },
        ],
      },
      {
        heading: "Runbook",
        items: [
          {
            kind: "repo_doc",
            label: "Notifications & webhooks",
            repoPath: OPERATIONS_RUNBOOK_PATHS.notificationsWebhooksReplay,
          },
        ],
      },
    ],
  };
}

export function operationalReadinessIncidentContext(): OperationalIncidentContext {
  return {
    scenario:
      "Walk env scan rows first — missing secrets commonly explain webhook drift. Tie Operational Safety rollup numbers to governance controls before changing infrastructure.",
    groups: [
      {
        heading: "Related tools",
        items: [
          { href: "/super-admin/operations/safety", label: "Operational safety" },
          { href: "/super-admin/platform/feature-controls", label: "Governance controls" },
          { href: "/super-admin/live-activity", label: "Live activity" },
        ],
      },
      {
        heading: "Runbook",
        items: [
          {
            kind: "repo_doc",
            label: "Governance readiness & SES",
            repoPath: OPERATIONS_RUNBOOK_PATHS.governanceReadinessSes,
          },
        ],
      },
    ],
  };
}

export function operationalSafetyIncidentContext(): OperationalIncidentContext {
  return {
    scenario:
      "Use severity tiers to prioritize revenue versus benign ignored webhook noise — then drill into payments and failures before editing admin order shells manually.",
    groups: [
      {
        heading: "Related tools",
        items: [
          { href: "/super-admin/operations/payments", label: "Payments ops" },
          { href: "/super-admin/operations/payment-integrity", label: "Payment integrity" },
          { href: "/super-admin/operations/readiness", label: "Operational readiness" },
          { href: "/super-admin/operations/webhook-replay", label: "Webhook replay" },
        ],
      },
      {
        heading: "Runbook",
        items: [
          {
            kind: "repo_doc",
            label: "Payments & shipping integrity",
            repoPath: OPERATIONS_RUNBOOK_PATHS.paymentsShippingIntegrity,
          },
        ],
      },
    ],
  };
}

export function lifecycleIntegrityIncidentContext(): OperationalIncidentContext {
  return {
    scenario:
      "Follow entity refs into order consoles; reconcile authority domains cited on each finding. Shipment-heavy codes should pair with Shippo receipts plus webhook replay before reconciliation fixes.",
    groups: [
      {
        heading: "Related tools",
        items: [
          { href: "/super-admin/operations/shippo-webhooks", label: "Shippo webhooks" },
          { href: "/super-admin/operations/payment-integrity", label: "Payment integrity" },
          { href: "/super-admin/operations/notifications-health", label: "Notification outbox health" },
          { href: "/super-admin/operations/webhook-replay", label: "Webhook replay" },
        ],
      },
      {
        heading: "Runbook",
        items: [
          {
            kind: "repo_doc",
            label: "Payments & shipping integrity",
            repoPath: OPERATIONS_RUNBOOK_PATHS.paymentsShippingIntegrity,
          },
        ],
      },
    ],
  };
}
