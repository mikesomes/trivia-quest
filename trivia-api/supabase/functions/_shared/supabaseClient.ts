import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0'

// Service role client — full DB access, only used server-side
export function createServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

// Anon client for user-context operations (respects RLS)
export function createAnonClient(authHeader: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anonKey) throw new Error('Missing Supabase env vars')
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
}
