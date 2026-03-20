import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client with service role key.
 * Bypasses RLS - use only in API routes, never expose to client.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (from Supabase Dashboard → Settings → API).
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
