import type { CateringDomainEvent } from "@/domains/catering/events";
import type { CommunicationsDomainEvent } from "@/domains/communications/events";
import type { FulfillmentDomainEvent } from "@/domains/fulfillment/events";
import type { GovernanceDomainEvent } from "@/domains/governance/events";
import type { OrderDomainEvent } from "@/domains/orders/events";
import type { RefundDomainEvent } from "@/domains/refunds/events";
import type { ShippingDomainEvent } from "@/domains/shipping/events";
import type { SupportDomainEvent } from "@/domains/support/events";

/** Compose-only union — discriminators vary by `domain` + `name` pair. */
export type DomainEvent =
  | OrderDomainEvent
  | FulfillmentDomainEvent
  | ShippingDomainEvent
  | CateringDomainEvent
  | SupportDomainEvent
  | CommunicationsDomainEvent
  | GovernanceDomainEvent
  | RefundDomainEvent;
