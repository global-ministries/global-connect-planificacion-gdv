import { z } from 'zod'

export type TipoPresencia = 'presente' | 'ausente' | 'tardanza' | 'justificado' | 'permiso'
export type TiempoTardanza = 'menos_15' | '15_30' | 'mas_30' | string
export type MotivoTardanza = 'trabajo' | 'transporte' | 'familia' | 'salud' | 'otro' | string
export type NivelSalud = 'normal' | 'atencion' | 'riesgo' | 'critico'

export const modoCierreSchema = z.enum(['manual', 'semanal_automatico', 'por_evento', 'nunca']).or(z.string())
export type ModoCierre = z.infer<typeof modoCierreSchema>

export const registrarAsistenciaPayloadSchema = z.object({
  grupo_id: z.string(),
  evento_id: z.string().optional(),
  fecha: z.string(),
  asistencias: z.array(
    z.object({
      miembro_id: z.string(),
      presente: z.boolean().optional(),
      tipo_presencia: z.string().optional(),
      motivo: z.string().optional(),
      nota: z.string().optional(),
      tiempo_tardanza: z.string().optional(),
      motivo_tardanza: z.string().optional(),
      motivo_tardanza_otro: z.string().optional(),
    })
  ),
  total_visitantes: z.number().optional(),
  tema_tratado: z.string().optional(),
  puntos_oracion: z.string().optional(),
  ofrenda: z.number().optional(),
  observaciones: z.string().optional(),
})

export type RegistrarAsistenciaPayload = z.infer<typeof registrarAsistenciaPayloadSchema>

export const resultadoAsistenciaSchema = z.object({
  evento_id: z.string(),
  total_presentes: z.number().optional(),
  total_ausentes: z.number().optional(),
})

export type ResultadoAsistencia = z.infer<typeof resultadoAsistenciaSchema>

export const saludMiembroSchema = z.object({
  usuario_id: z.string(),
  nombre: z.string(),
  apellido: z.string(),
  email: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  foto_perfil_url: z.string().nullable().optional(),
  rol: z.string().optional(),
  nivel_salud: z.enum(['normal', 'atencion', 'riesgo', 'critico']),
  asistencias_consecutivas: z.number().optional(),
  ausencias_consecutivas: z.number().optional(),
  porcentaje_asistencia: z.number().optional(),
  ultima_asistencia: z.string().nullable().optional(),
  dias_sin_asistir: z.number().optional(),
})

export type SaludMiembro = z.infer<typeof saludMiembroSchema>

export const dashboardRiesgoSchema = z.object({
  total_miembros: z.number(),
  en_riesgo: z.number(),
  en_atencion: z.number(),
  criticos: z.number(),
  saludables: z.number(),
  miembros: z.array(saludMiembroSchema),
})

export type DashboardRiesgo = z.infer<typeof dashboardRiesgoSchema>

export const reporteRetencionSchema = z.object({
  periodo: z.string(),
  tasa_retencion: z.number(),
  nuevos_miembros: z.number(),
  miembros_activos: z.number(),
  miembros_inactivos: z.number(),
})

export type ReporteRetencion = z.infer<typeof reporteRetencionSchema>

export const reporteCrecimientoNetoSchema = z.object({
  periodo: z.string(),
  crecimiento_neto: z.number(),
  altas: z.number(),
  bajas: z.number(),
})

export type ReporteCrecimientoNeto = z.infer<typeof reporteCrecimientoNetoSchema>
