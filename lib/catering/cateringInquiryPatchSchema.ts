import { z } from "zod";
import { CATERING_INQUIRY_STATUS_VALUES } from "@/lib/catering/cateringInquiryStatus";

const statusEnum = z.enum(
  [...CATERING_INQUIRY_STATUS_VALUES] as unknown as readonly [string, ...string[]]
);

/** PATCH body keys are all optional — empty object rejects at route via `hasKeys` helper. */
export const cateringInquiryPatchBodySchema = z
  .object({
    status: statusEnum.optional(),
    assignedTo: z.union([z.string(), z.null()]).optional(),
    internalNotes: z.union([z.string(), z.null()]).optional(),
    lastFollowUpAt: z.union([z.string(), z.null()]).optional(),
  })
  .strict();

export type CateringInquiryPatchBody = z.infer<typeof cateringInquiryPatchBodySchema>;

export function parseCateringInquiryPatchBody(raw: unknown):
  | { ok: true; value: CateringInquiryPatchBody }
  | { ok: false; error: string } {
  const result = cateringInquiryPatchBodySchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const message =
      first ? `${first.path.join(".") || "body"} — ${first.message}` : "Invalid request body";
    return { ok: false, error: message };
  }
  return { ok: true, value: result.data };
}

export function cateringInquiryPatchHasUpdates(parsed: CateringInquiryPatchBody): boolean {
  return (
    parsed.status !== undefined ||
    parsed.assignedTo !== undefined ||
    parsed.internalNotes !== undefined ||
    parsed.lastFollowUpAt !== undefined
  );
}
