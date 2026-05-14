import type { AuditActionType } from "@/domains/governance/audit";

export type GovernanceDomainEvent =
  | {
      domain: "governance";
      name: "audit.append";
      action: AuditActionType;
      actorId?: string;
    }
  | { domain: "governance"; name: "security.signal"; signal: string };
