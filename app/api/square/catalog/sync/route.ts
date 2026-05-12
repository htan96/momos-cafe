import { NextResponse } from "next/server";
import { syncSquareCatalogSandbox } from "@/lib/square/catalogSync";

export async function POST() {
  try {
    const result = await syncSquareCatalogSandbox();
    return NextResponse.json(result);
  } catch (e) {
    console.error("[square/catalog/sync POST]", e);
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
