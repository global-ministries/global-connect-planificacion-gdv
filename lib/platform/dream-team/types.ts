export type personaId = string
export const personaId = 'personaId'
export const DREAM_TEAM_MOTIVOS = ["baja_voluntaria", "traslado", "inactividad", "otro"] as const
export const DREAM_TEAM_ESTADOS = ["activo", "inactivo", "en_pausa", "postulante"] as const
export interface ServicioDreamTeam {
  id: string
  nombre: string
  [key: string]: any
}
