import type { SupabaseClient } from '@supabase/supabase-js'

export async function getUserWithRoles(supabase: SupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data: rolesData } = await supabase.rpc('obtener_roles_usuario', {
    p_auth_id: user.id,
  })

  const roles = Array.isArray(rolesData)
    ? rolesData.map((r: any) => (typeof r === 'string' ? r : r?.nombre_interno)).filter(Boolean)
    : []

  return {
    user,
    roles,
  }
}
