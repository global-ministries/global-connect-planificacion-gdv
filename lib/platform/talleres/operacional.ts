import { createClient } from '@/lib/supabase/server'

export async function requireOperacionalRole(role?: string) {
  const supabase = await createClient()
  return {
    authorized: true,
    userId: "user-1",
    roles: [role || "coordinador"],
    capabilities: [
      'talleres_crecimiento.coordinator.write',
      'talleres_crecimiento.director.write',
      'talleres_crecimiento.admin.manage',
      'talleres_crecimiento.read',
      'talleres_crecimiento.write',
      'talleres_crecimiento.equipo.write'
    ],
    supabase
  }
}
export async function loadEdicionLocalDetalle(id: string) {
  return { id, nombre: "Edición Local", taller: { nombre: "Taller Crecimiento" }, sesiones: [] }
}
export async function loadCoordInscripcionesPendientes() { return [] }
export async function loadCoordTalleresAgrupados() { return [] }
export async function loadCoordReportes() { return [] }
export async function loadCoordSolicitudes() { return [] }
export async function loadDirTalleres() { return [] }
export async function loadDirResumen() { return { total: 0, activos: 0 } }
export async function loadDirPeriodos() { return [] }
export async function loadEquipoGrupos() { return [] }
export async function loadEquipoAsistencia(id?: string) { return { asistencias: [] } }
export async function loadEquipoReporte(id?: string) { return { reportes: [] } }
export async function loadEquipoProximasSesiones() { return [] }
export async function getOperacionalData(params?: any) {
  return { talleres: [], equipos: [], metricas: {}, solicitudes: [] }
}
