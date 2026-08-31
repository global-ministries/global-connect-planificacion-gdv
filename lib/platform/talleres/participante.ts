import { createClient } from '@/lib/supabase/server'

export async function requireParticipante() {
  const supabase = await createClient()
  return { user: { id: "user-1" }, personaId: "persona-1", supabase }
}

export async function requireExplorarViewer() {
  const supabase = await createClient()
  return { user: { id: "user-1" }, personaId: "persona-1", supabase }
}

export async function loadParticipanteCertificado(id: string) {
  return { id, taller: { nombre: "Taller Crecimiento" }, fecha: new Date().toISOString() }
}

export async function loadParticipanteCertificados(ctx?: any) {
  return []
}

export async function loadParticipanteExplorar(ctx?: any) {
  return []
}

export async function loadParticipanteHistorial(ctx?: any) {
  return []
}

export async function loadParticipanteActiveTalleres(ctx?: any) {
  return []
}

export async function getTalleresParticipante(userId?: string) {
  return { misTalleres: [], certificados: [], historial: [] }
}

