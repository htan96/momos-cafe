export type CommunicationsDomainEvent =
  | { domain: "communications"; name: "message.dispatch_queued"; recordId: string; channel: string }
  | { domain: "communications"; name: "thread.linked_to_order"; threadId: string; orderId: string };
