import { NextResponse } from "next/server";
import { getMenuFromSquare } from "@/lib/square";

export async function GET() {
  try {
    const categories = await getMenuFromSquare();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching menu from Square:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu" },
      { status: 500 }
    );
  }
}
