import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Note: This client should ONLY be used in Server Actions or API routes
// where you need to bypass RLS or manage users. NEVER expose the service role key to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
