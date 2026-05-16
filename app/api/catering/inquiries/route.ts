import { NextResponse } from "next/server";
import { CateringInquiryStatus, OperationalActivitySeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitOperationalEvent } from "@/lib/operations/emitOperationalEvent";
import { OPERATIONAL_EVENT_TYPES } from "@/lib/operations/operationalEventTypes";

type CateringInquiryBody = {
  name?: string;
  email?: string;
  phone?: string;
  event_date?: string;
  guest_count?: number;
  event_type?: string | null;
  details?: string | null;
};

export async function POST(request: Request) {
  let name = "";
  let email = "";
  let phone = "";
  let eventDate = "";
  let guestCount = NaN;
  let eventType: string | null = null;
  let details: string | null = null;
  let validatedForPersistence = false;

  try {
    const body = (await request.json()) as CateringInquiryBody;
    name = typeof body.name === "string" ? body.name.trim() : "";
    email = typeof body.email === "string" ? body.email.trim() : "";
    phone = typeof body.phone === "string" ? body.phone.trim() : "";
    eventDate = typeof body.event_date === "string" ? body.event_date.trim() : "";
    guestCount =
      typeof body.guest_count === "number" && Number.isFinite(body.guest_count)
        ? body.guest_count
        : Number(body.guest_count);
    eventType = typeof body.event_type === "string" ? body.event_type.trim() : null;
    details = typeof body.details === "string" ? body.details.trim() : null;

    if (!name || !email || !phone || !eventDate || Number.isNaN(guestCount)) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    validatedForPersistence = true;

    await prisma.cateringInquiry.create({
      data: {
        name,
        email,
        phone,
        eventDate,
        guestCount,
        eventType: eventType || null,
        details: details || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Catering inquiry POST error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);

    void emitOperationalEvent({
      type: OPERATIONAL_EVENT_TYPES.CATERING_INQUIRY_FAILED,
      severity: OperationalActivitySeverity.warning,
      actorType: "customer",
      actorId: email || undefined,
      actorName: name || undefined,
      message: "Catering inquiry submission failed (intake pipeline)",
      metadata: {
        hadValidPayload: validatedForPersistence,
        email: email || null,
        eventDate: eventDate || null,
      },
      source: "api.catering.inquiries",
    });

    /**
     * When validation passed but persistence failed, store a `failed_submission` row so ops can see the
     * attempt without inferring from a missing row. Parse/validation failures return 400 above and do not
     * hit this path for row insert (nothing reliable to persist).
     */
    if (validatedForPersistence) {
      try {
        await prisma.cateringInquiry.create({
          data: {
            name,
            email,
            phone,
            eventDate,
            guestCount,
            eventType: eventType || null,
            details: details || null,
            status: CateringInquiryStatus.failed_submission,
            submissionError: errMsg.slice(0, 4000),
          },
        });
      } catch (persistErr) {
        console.error("Catering inquiry failed_submission persistence error:", persistErr);
      }
    }

    return NextResponse.json(
      { error: "Could not save your request" },
      { status: 500 }
    );
  }
}
