/** Human path for operators; keep to one short sentence. */
export type OperationalIncidentScenario = string;

export type OperationalCrossLinkItem =
  | {
      kind?: "route";
      href: string;
      label: string;
      /** Sets rel="noreferrer" + target="_blank" */
      external?: boolean;
      hint?: string;
    }
  | {
      kind: "repo_doc";
      /** Repository-relative markdown path shown as monospace — open from your checkout / Git host. */
      repoPath: string;
      label: string;
      hint?: string;
    };

export type OperationalCrossLinkGroup = {
  /** e.g. "Next steps" · "Related tools" */
  heading: string;
  items: OperationalCrossLinkItem[];
};

/**
 * Optional bundle for drill-in: canned scenario copy plus grouped deep links.
 */
export type OperationalIncidentContext = {
  scenario?: OperationalIncidentScenario;
  groups: OperationalCrossLinkGroup[];
};

export const OPERATIONS_RUNBOOK_PATHS = {
  paymentsShippingIntegrity: "docs/runbooks/payments-shipping-and-integrity.md",
  notificationsWebhooksReplay: "docs/runbooks/notifications-webhooks-replay-and-backlog.md",
  governanceReadinessSes: "docs/runbooks/governance-readiness-and-ses.md",
} as const;
