import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("CateringInquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Catering inquiries fetch error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("Catering inquiries API error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch catering inquiries";
    const isConfigError = message.includes("SERVICE_ROLE") || message.includes("Missing");
    return NextResponse.json(
      { error: isConfigError ? "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase Dashboard → Settings → API)" : message },
      { status: 500 }
    );
  }
}
