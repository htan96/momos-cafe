import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCognitoServerSession } from "@/lib/auth/cognito/serverSession";
import { isAdmin } from "@/lib/auth/cognito/roles";
import { mapCateringInquiryToApi } from "@/lib/catering/mapCateringInquiryToApi";
import { isCateringInquiryStatus } from "@/lib/catering/cateringInquiryStatus";

export async function GET(request: NextRequest) {
  const user = await getCognitoServerSession();
  if (!user || !isAdmin(user.groups)) {
    return NextResponse.json({ error: "forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const statusParam = request.nextUrl.searchParams.get("status");
    const status =
      statusParam && isCateringInquiryStatus(statusParam) ? statusParam : undefined;

    const rows = await prisma.cateringInquiry.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(rows.map(mapCateringInquiryToApi));
  } catch (err) {
    console.error("Catering inquiries fetch error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch catering inquiries";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
