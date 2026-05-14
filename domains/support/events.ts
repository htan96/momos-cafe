export type SupportDomainEvent =
  | { domain: "support"; name: "ticket.created"; ticketId: string }
  | { domain: "support"; name: "ticket.status_changed"; ticketId: string; status: string }
  | {
      domain: "support";
      name: "ticket.escalated";
      ticketId: string;
      level: string;
    };
