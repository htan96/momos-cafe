import type { TransactionalContent } from "@/lib/email/types";

const STUB_NOTICE =
  "This template is scaffolded — connect NotificationEvent orchestration before production send.";

export function buildOrderConfirmationEmailStub(orderRef: string): TransactionalContent {
  return {
    subject: `Momo's order ${orderRef} — confirmation`,
    textBody: [`Thanks for dining with Vallejo warmth. (${STUB_NOTICE})`].join("\n"),
    htmlBody: `<p>Order ${orderRef} · stub</p><p>${STUB_NOTICE}</p>`,
  };
}

export function buildPickupReadyEmailStub(orderRef: string): TransactionalContent {
  return {
    subject: `${orderRef} is ready — Momo's pickup`,
    textBody: [`Your pickup bundle is staged. (${STUB_NOTICE})`].join("\n"),
    htmlBody: `<p>${orderRef} ready · stub</p>`,
  };
}

export function buildShipmentTrackingEmailStub(
  carrier: string,
  tracking: string,
  orderRef: string
): TransactionalContent {
  return {
    subject: `${orderRef} · tracking update`,
    textBody: `${carrier} ${tracking}. ${STUB_NOTICE}`,
    htmlBody: `<p>${carrier} · ${tracking}</p>`,
  };
}

export function buildCateringReceivedEmailStub(name: string): TransactionalContent {
  return {
    subject: `${name}, we received your catering note`,
    textBody: `Thanks for dreaming with Momo's. (${STUB_NOTICE})`,
    htmlBody: `<p>Catering stub for ${escape(name)}.</p>`,
  };
}

export function buildOpsAlertEmailStub(label: string): TransactionalContent {
  return {
    subject: `[Ops] ${label}`,
    textBody: `Operational heartbeat: ${label}. (${STUB_NOTICE})`,
    htmlBody: `<p>Ops alert · ${escape(label)}</p>`,
  };
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;");
}
