import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AdminSettings } from "@/lib/useAdminSettings";

const ROW_ID = "default";

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("admin_settings")
      .select("data")
      .eq("id", ROW_ID)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(null);
      }
      console.error("Supabase admin_settings fetch error:", error);
      return NextResponse.json(null);
    }

    if (!data?.data) return NextResponse.json(null);
    return NextResponse.json(data.data as AdminSettings);
  } catch (err) {
    console.error("Admin settings fetch error:", err);
    return NextResponse.json(null);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from("admin_settings")
      .upsert(
        { id: ROW_ID, data: body, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );

    if (error) {
      console.error("Supabase admin_settings upsert error:", error);
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin settings save error:", err);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
