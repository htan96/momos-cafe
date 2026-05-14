export type ShippingDomainEvent =
  | {
      domain: "shipping";
      name: "shipment.label_purchased";
      shipmentId: string;
      provider: "shippo";
    }
  | { domain: "shipping"; name: "shipment.scan"; shipmentId: string; carrierStatus: string }
  | {
      domain: "shipping";
      name: "shipment.exception";
      shipmentId: string;
      exceptionType: string;
    };
