import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminSettings } from "@/lib/useAdminSettings";

const ROW_ID = "default";

export async function GET() {
  try {
    const row = await prisma.adminSettings.findUnique({
      where: { id: ROW_ID },
    });

    if (!row?.data) return NextResponse.json(null);
    return NextResponse.json(row.data as AdminSettings);
  } catch (err) {
    console.error("Admin settings fetch error:", err);
    return NextResponse.json(null);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const data = body as Prisma.InputJsonValue;

    await prisma.adminSettings.upsert({
      where: { id: ROW_ID },
      create: {
        id: ROW_ID,
        data,
      },
      update: {
        data,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin settings save error:", err);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
