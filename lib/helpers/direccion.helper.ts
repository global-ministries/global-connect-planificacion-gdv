import type { SupabaseClient } from '@supabase/supabase-js'

export interface DireccionInput {
  calle?: string
  barrio?: string
  codigo_postal?: string
  referencia?: string
  lat?: number
  lng?: number
  parroquia_id?: string
}

export async function upsertDireccion(
  supabase: SupabaseClient,
  direccionId: string | null,
  data: DireccionInput
): Promise<string | null> {
  const payload = {
    calle: data.calle || null,
    barrio: data.barrio || null,
    codigo_postal: data.codigo_postal || null,
    referencia: data.referencia || null,
    latitud: data.lat ?? null,
    longitud: data.lng ?? null,
    parroquia_id: data.parroquia_id || null,
  }

  if (direccionId) {
    const { error } = await supabase
      .from('direcciones')
      .update(payload)
      .eq('id', direccionId)
    if (!error) return direccionId
  }

  const { data: newDir, error } = await supabase
    .from('direcciones')
    .insert([payload])
    .select('id')
    .single()

  if (error || !newDir) return null
  return newDir.id
}
