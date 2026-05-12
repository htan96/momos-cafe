import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.cateringInquiry.findMany({
      orderBy: { createdAt: "desc" },
    });

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      event_date: r.eventDate,
      guest_count: r.guestCount,
      event_type: r.eventType,
      details: r.details,
      created_at: r.createdAt.toISOString(),
    }));

    return NextResponse.json(data);
  } catch (err) {
    console.error("Catering inquiries fetch error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch catering inquiries";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
