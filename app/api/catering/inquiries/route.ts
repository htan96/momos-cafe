import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  try {
    const body = (await request.json()) as CateringInquiryBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const eventDate =
      typeof body.event_date === "string" ? body.event_date.trim() : "";
    const guestCount =
      typeof body.guest_count === "number" && Number.isFinite(body.guest_count)
        ? body.guest_count
        : Number(body.guest_count);
    const eventType =
      typeof body.event_type === "string" ? body.event_type.trim() : null;
    const details =
      typeof body.details === "string" ? body.details.trim() : null;

    if (!name || !email || !phone || !eventDate || Number.isNaN(guestCount)) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

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
    return NextResponse.json(
      { error: "Could not save your request" },
      { status: 500 }
    );
  }
}
