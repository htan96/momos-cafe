"use client";

import FulfillmentTransitionButtons from "@/components/operations/order-console/FulfillmentTransitionButtons";
import type { FulfillmentPipeline } from "@/types/commerce";

/** Thin wrapper — ops console palette for `PATCH /api/ops/fulfillment/.../transition`. */
export default function OpsFulfillmentRowActions({
  orderId,
  groupId,
  pipeline,
  status,
  canFulfillmentWrite,
}: {
  orderId: string;
  groupId: string;
  pipeline: FulfillmentPipeline;
  status: string;
  canFulfillmentWrite: boolean;
}) {
  return (
    <FulfillmentTransitionButtons
      orderId={orderId}
      groupId={groupId}
      pipeline={pipeline}
      status={status}
      canFulfillmentWrite={canFulfillmentWrite}
      variant="ops"
    />
  );
}
