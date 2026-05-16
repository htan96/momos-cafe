import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { CateringInquiryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isAdmin } from "@/lib/auth/cognito/roles";
import { mapCateringInquiryToApi } from "@/lib/catering/mapCateringInquiryToApi";
import { isCateringInquiryStatus } from "@/lib/catering/cateringInquiryStatus";

function forbidden() {
  return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCognitoServerSession();
  if (!user || !isAdmin(user.groups)) return forbidden();

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const row = await prisma.cateringInquiry.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(mapCateringInquiryToApi(row));
  } catch (err) {
    console.error("Catering inquiry GET error:", err);
    const message = err instanceof Error ? err.message : "Failed to load inquiry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCognitoServerSession();
  if (!user || !isAdmin(user.groups)) return forbidden();

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const data: Prisma.CateringInquiryUpdateInput = {};

    if ("assignedTo" in b) {
      if (b.assignedTo !== null && typeof b.assignedTo !== "string") {
        return NextResponse.json({ error: "assignedTo must be string or null" }, { status: 400 });
      }
      data.assignedTo = b.assignedTo === null ? null : b.assignedTo.trim() || null;
    }

    if ("internalNotes" in b) {
      if (b.internalNotes !== null && typeof b.internalNotes !== "string") {
        return NextResponse.json({ error: "internalNotes must be string or null" }, { status: 400 });
      }
      data.internalNotes = b.internalNotes === null ? null : b.internalNotes;
    }

    if ("lastFollowUpAt" in b) {
      if (b.lastFollowUpAt === null) {
        data.lastFollowUpAt = null;
      } else if (typeof b.lastFollowUpAt === "string") {
        const d = new Date(b.lastFollowUpAt);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: "invalid lastFollowUpAt" }, { status: 400 });
        }
        data.lastFollowUpAt = d;
      } else {
        return NextResponse.json({ error: "invalid lastFollowUpAt" }, { status: 400 });
      }
    }

    if ("status" in b) {
      if (b.status === null) {
        return NextResponse.json({ error: "status cannot be null" }, { status: 400 });
      }
      if (typeof b.status !== "string" || !isCateringInquiryStatus(b.status)) {
        return NextResponse.json({ error: "invalid status" }, { status: 400 });
      }
      data.status = b.status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "no_updates", message: "Provide status, assignedTo, internalNotes, and/or lastFollowUpAt" },
        { status: 400 }
      );
    }

    const existing = await prisma.cateringInquiry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (typeof b.status === "string" && isCateringInquiryStatus(b.status) && b.status === CateringInquiryStatus.contacted) {
      const now = new Date();
      data.contactedAt = now;
      if (!("lastFollowUpAt" in b)) {
        data.lastFollowUpAt = now;
      }
    }

    const row = await prisma.cateringInquiry.update({
      where: { id },
      data,
    });

    return NextResponse.json(mapCateringInquiryToApi(row));
  } catch (err) {
    console.error("Catering inquiry PATCH error:", err);
    const message = err instanceof Error ? err.message : "Failed to update inquiry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCognitoServerSession();
  if (!user || !isAdmin(user.groups)) return forbidden();

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.cateringInquiry.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Catering inquiry delete API error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
