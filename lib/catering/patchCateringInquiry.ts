import type { CateringInquiry, Prisma } from "@prisma/client";
import { CateringInquiryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isCateringInquiryStatus } from "@/lib/catering/cateringInquiryStatus";
import type { CateringInquiryPatchBody } from "@/lib/catering/cateringInquiryPatchSchema";
import { revalidateCateringAdminViews } from "@/lib/catering/revalidateCateringAdminViews";

function buildUpdateFragment(patch: CateringInquiryPatchBody): Prisma.CateringInquiryUpdateInput {
  const data: Prisma.CateringInquiryUpdateInput = {};

  if (patch.assignedTo !== undefined) {
    data.assignedTo =
      patch.assignedTo === null ? null : patch.assignedTo.trim() === "" ? null : patch.assignedTo.trim();
  }

  if (patch.internalNotes !== undefined) {
    data.internalNotes = patch.internalNotes;
  }

  if (patch.lastFollowUpAt !== undefined) {
    if (patch.lastFollowUpAt === null) {
      data.lastFollowUpAt = null;
    } else {
      const d = new Date(patch.lastFollowUpAt);
      if (Number.isNaN(d.getTime())) {
        throw new Error("invalid_lastFollowUpAt");
      }
      data.lastFollowUpAt = d;
    }
  }

  if (patch.status !== undefined) {
    if (!isCateringInquiryStatus(patch.status)) {
      throw new Error("invalid_status");
    }
    data.status = patch.status;
  }

  return data;
}

/** Keeps parity with legacy handler: stamping `contacted` sets `contactedAt`, auto-fills follow-up unless client sent lastFollowUpAt. */
function applyContactedSemantics(patch: CateringInquiryPatchBody): Prisma.CateringInquiryUpdateInput {
  if (patch.status !== CateringInquiryStatus.contacted) return {};
  const now = new Date();
  const out: Prisma.CateringInquiryUpdateInput = {
    contactedAt: now,
  };
  if (patch.lastFollowUpAt === undefined) {
    out.lastFollowUpAt = now;
  }
  return out;
}

export async function patchCateringInquiryById(params: {
  id: string;
  patch: CateringInquiryPatchBody;
}): Promise<
  | { ok: false; status: number; message: string; code?: string }
  | { ok: true; row: CateringInquiry }
> {
  const { id, patch } = params;

  try {
    const guard = await prisma.cateringInquiry.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!guard) {
      return { ok: false, status: 404, message: "Not found" };
    }

    const fragment = buildUpdateFragment(patch);
    /** Contact semantics override implicit follow-up stamps when callers send explicit timestamps. */
    const merged: Prisma.CateringInquiryUpdateInput = {
      ...applyContactedSemantics(patch),
      ...fragment,
    };

    if (Object.keys(merged).length === 0) {
      return {
        ok: false,
        status: 400,
        message: "Provide status, assignedTo, internalNotes, and/or lastFollowUpAt",
        code: "no_updates",
      };
    }

    const row = await prisma.cateringInquiry.update({
      where: { id },
      data: merged,
    });

    revalidateCateringAdminViews(id);

    return { ok: true, row };
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "invalid_lastFollowUpAt") {
        return { ok: false, status: 400, message: "Invalid lastFollowUpAt" };
      }
      if (e.message === "invalid_status") {
        return { ok: false, status: 400, message: "Invalid status" };
      }
    }
    console.error("patchCateringInquiryById", e);
    return { ok: false, status: 500, message: "Failed to update inquiry" };
  }
}
