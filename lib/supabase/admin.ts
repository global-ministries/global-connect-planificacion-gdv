import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

let adminClient: ReturnType<typeof createClient<Database>> | null = null

export function createSupabaseAdminClient() {
  if (adminClient) return adminClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wcnqocyqtksxhthnquta.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy'

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}

export function getAdminClient() {
  return createSupabaseAdminClient()
}

export const adminClientInstance = createSupabaseAdminClient()
