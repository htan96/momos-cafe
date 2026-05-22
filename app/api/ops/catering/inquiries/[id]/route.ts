import { NextResponse } from "next/server";
import { mapCateringInquiryToApi } from "@/lib/catering/mapCateringInquiryToApi";
import {
  cateringInquiryPatchHasUpdates,
  parseCateringInquiryPatchBody,
} from "@/lib/catering/cateringInquiryPatchSchema";
import { patchCateringInquiryById } from "@/lib/catering/patchCateringInquiry";
import { prisma } from "@/lib/prisma";
import { getOpsSession } from "@/lib/ops/getOpsSession";
import { opsCan } from "@/lib/ops/permissions";
import { revalidateCateringAdminViews } from "@/lib/catering/revalidateCateringAdminViews";

function forbidden() {
  return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "console:read")) return forbidden();

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const row = await prisma.cateringInquiry.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(mapCateringInquiryToApi(row));
  } catch (err) {
    console.error("[ops catering GET]", err);
    const message = err instanceof Error ? err.message : "Failed to load inquiry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "orders:write")) return forbidden();

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const parsedAttempt = parseCateringInquiryPatchBody(raw);
    if (!parsedAttempt.ok) {
      return NextResponse.json({ error: "invalid_body", message: parsedAttempt.error }, { status: 400 });
    }
    if (!cateringInquiryPatchHasUpdates(parsedAttempt.value)) {
      return NextResponse.json(
        { error: "no_updates", message: "Provide status, assignedTo, internalNotes, and/or lastFollowUpAt" },
        { status: 400 }
      );
    }

    const result = await patchCateringInquiryById({
      id,
      patch: parsedAttempt.value,
    });

    if (!result.ok) {
      const body =
        result.code ?
          { error: result.code, message: result.message }
        : { error: result.message };

      return NextResponse.json(body, {
        status: result.status,
      });
    }

    return NextResponse.json(mapCateringInquiryToApi(result.row));
  } catch (err) {
    console.error("[ops catering PATCH]", err);
    const message = err instanceof Error ? err.message : "Failed to update inquiry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOpsSession();
  if (!session || !opsCan(session.role, "orders:write")) return forbidden();

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.cateringInquiry.delete({ where: { id } });

    revalidateCateringAdminViews(id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ops catering DELETE]", err);
    const message = err instanceof Error ? err.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
