export type CateringDomainEvent =
  | { domain: "catering"; name: "request.received"; requestId: string }
  | { domain: "catering"; name: "request.quoted"; requestId: string }
  | { domain: "catering"; name: "request.confirmed"; requestId: string };
