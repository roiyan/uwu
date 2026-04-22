import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only admin client with the service-role key. Bypasses RLS.
 * Never import this into a Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
