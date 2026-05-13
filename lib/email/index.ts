export type { SesDispatchContext, TransactionalContent } from "@/lib/email/types";
export { momosEmailShell } from "@/lib/email/layout";
export {
  buildCateringReceivedEmailStub,
  buildOpsAlertEmailStub,
  buildOrderConfirmationEmailStub,
  buildPickupReadyEmailStub,
  buildShipmentTrackingEmailStub,
} from "@/lib/email/templates/transactionalStubs";
