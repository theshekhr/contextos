import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only client. Uses the service role key, which bypasses RLS.
// NEVER import this file in a "use client" component.
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}