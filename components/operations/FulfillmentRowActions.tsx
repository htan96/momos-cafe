"use client";

import FulfillmentTransitionButtons from "@/components/operations/order-console/FulfillmentTransitionButtons";
import ConfirmFulfillmentButton from "@/components/operations/order-console/ConfirmFulfillmentButton";
import type { FulfillmentPipeline } from "@/types/commerce";

/** Fulfillment PATCH actions + scripted transitions for admin + legacy dark surfaces. */
export default function FulfillmentRowActions({
  orderId,
  groupId,
  pipeline,
  status,
  canFulfillmentWrite,
  fulfillmentApprovedAt,
  variant = "default",
}: {
  orderId: string;
  groupId: string;
  pipeline: FulfillmentPipeline;
  status: string;
  canFulfillmentWrite: boolean;
  fulfillmentApprovedAt?: Date | string | null;
  variant?: "default" | "ops";
}) {
  return (
    <div className={variant === "ops" ? "space-y-3" : "space-y-4"}>
      <ConfirmFulfillmentButton
        orderId={orderId}
        groupId={groupId}
        pipeline={pipeline}
        canFulfillmentWrite={canFulfillmentWrite}
        fulfillmentApprovedAt={fulfillmentApprovedAt}
        variant={variant}
      />
      <FulfillmentTransitionButtons
        orderId={orderId}
        groupId={groupId}
        pipeline={pipeline}
        status={status}
        canFulfillmentWrite={canFulfillmentWrite}
        variant={variant}
      />
    </div>
  );
}
