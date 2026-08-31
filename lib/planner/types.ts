/**
 * GlobalConnect GDV Planner - Tipos de Datos y Modelos
 */

export type RolEnGrupo = 'lider' | 'co_lider' | 'aprendiz' | 'miembro' | 'anfitrion'

export type SegmentoGDV = 'matrimonios' | 'jovenes' | 'adultos' | 'profesionales' | 'mixto' | 'mujeres' | 'hombres' | string

export type CiudadGDV = 'Barquisimeto' | 'Cabudare' | 'Otro'

export interface SegmentoInfo {
  id: string
  nombre: string
  slug?: string
  descripcion?: string
  icono?: string
  total_grupos?: number
  total_miembros?: number
}

export interface PersonaPlanner {
  id: string
  nombre: string
  apellido: string
  email?: string | null
  telefono?: string | null
  ciudad?: string | null
  zona?: string | null
  direccion?: string | null
  segmento_id?: string | null
  segmento_nombre?: string | null
  segmento_sugerido?: SegmentoGDV | null
  es_lider_potencial?: boolean
  grupo_actual_id?: string | null
  grupo_actual_nombre?: string | null
  rol_actual?: RolEnGrupo | null
  // Relación conyugal
  conyuge_id?: string | null
  conyuge_nombre?: string | null
  // Historial temporada previa
  lider_anterior_id?: string | null
  lider_anterior_nombre?: string | null
  asistencia_promedio_previa?: number | null // porcentaje 0-100
  // Datos demográficos y edad
  fecha_nacimiento?: string | null
  edad?: number | null
  genero?: string | null
}

export interface MiembroAsignado {
  persona_id: string
  persona: PersonaPlanner
  rol: RolEnGrupo
  fecha_asignacion?: string
}

export interface GrupoGDVPlanner {
  id: string
  temporada_id: string
  segmento_id?: string | null
  codigo?: string
  nombre: string
  segmento: SegmentoGDV
  segmento_nombre?: string
  ciudad: CiudadGDV
  zona: string
  sector?: string
  dia_reunion?: string
  hora_reunion?: string
  direccion_reunion?: string
  capacidad_maxima: number
  estado: 'borrador' | 'activo' | 'cerrado' | 'planificacion'
  lider_principal?: PersonaPlanner | null
  co_lider?: PersonaPlanner | null
  aprendices: PersonaPlanner[]
  miembros: MiembroAsignado[]
  advertencias?: AdvertenciaPlanificacion[]
}

export interface TemporadaPlanner {
  id: string
  nombre: string
  codigo: string
  fecha_inicio: string
  fecha_fin: string
  estado: 'planificacion' | 'activa' | 'cerrada' | string
  es_activa: boolean
  total_grupos?: number
  grupos_count?: number
  miembros_asignados_count?: number
}

export interface GrupoDiagnosticoInfo {
  id: string
  nombre: string
  segmentoId?: string | null
  segmentoNombre: string
  lideresNombres: string[]
  aprendicesNombres: string[]
  miembrosCount: number
  capacidad?: number
  salud?: string
  tieneAprendiz: boolean
  candidatoMultiplicacion?: boolean
  ciudad: CiudadGDV
  zona: string
  diaReunion?: string | null
  horaReunion?: string | null
}

export interface ResumenSaludGrupos {
  sobresaturados?: number
  saludables?: number
  pequenos?: number
  gruposConAprendiz: number
  gruposSinAprendiz: number
  porcentajeCoberturaSucesion: number
}

export interface ZonaDistribucionInfo {
  zona: string
  municipio: string
  gruposCount: number
  miembrosCount: number
}

export interface RecomendacionEstrategica {
  id: string
  categoria: 'multiplicacion' | 'sucesion' | 'territorio' | 'matrimonios' | 'salud'
  titulo: string
  descripcion: string
  prioridad: 'alta' | 'media' | 'baja'
}

export interface ParejaLiderazgoInfo {
  id: string
  esposoId: string
  esposoNombre: string
  esposaId: string
  esposaNombre: string
  grupoNombre: string
  rolEsposo: string
  rolEsposa: string
  ambosLideran: boolean
}

export interface AnalisisTemporadaCierre {
  temporadaCierreId: string
  temporadaCierreNombre: string
  temporadaPlanificarId: string
  temporadaPlanificarNombre: string
  segmentoSeleccionadoId: string
  segmentoSeleccionadoNombre: string
  totalGruposCerrando: number
  totalLideresPrincipales?: number
  totalCoLideres?: number
  totalLideresCerrando: number
  totalAprendicesGraduables: number
  totalMiembrosActivos: number
  totalParejasConyuges: number
  promedioMiembrosPorGrupo: number
  saludGrupos: ResumenSaludGrupos
  gruposDetalle: GrupoDiagnosticoInfo[]
  gruposPorSegmento: {
    segmentoId: string
    segmentoNombre: string
    gruposCount: number
    miembrosCount: number
  }[]
  distribucionZonas: ZonaDistribucionInfo[]
  parejasLiderazgo: ParejaLiderazgoInfo[]
  recomendaciones: RecomendacionEstrategica[]
  lideresDetalle: {
    id: string
    nombre: string
    apellido: string
    grupoNombre: string
    rol: string
    tieneConyuge: boolean
    conyugeNombre?: string | null
  }[]
  aprendicesListos: {
    id: string
    nombre: string
    apellido: string
    grupoActualNombre: string
    segmentoNombre?: string
    esCandidatoApertura: boolean
  }[]
  proyeccion: {
    metaGruposNuevos: number
    capacidadTotalRequerida: number
    gruposBarquisimeto: number
    gruposCabudare: number
  }
}

export interface ConfiguracionPlanificacion {
  segmentoId: string // 'todos' or UUID
  segmentoNombre: string
  temporadaCierreId: string
  temporadaPlanificarId: string
  temporadasExcluidasIds?: string[] // IDs de temporadas activas simultáneas cuyos miembros se excluyen del pool disponible
  modoInicio?: 'importar_cierre' | 'en_blanco' | 'existente'
}

export type TipoAdvertencia = 
  | 'conyuge_separado' 
  | 'ciudad_incompatible' 
  | 'sobrecupo' 
  | 'sin_lider' 
  | 'bajo_cupo'
  | 'lider_sin_co_lider'
  | 'repite_lider'

export interface AdvertenciaPlanificacion {
  id: string
  tipo: TipoAdvertencia
  nivel: 'error' | 'warning' | 'info'
  mensaje: string
  grupo_id?: string
  persona_id?: string
  persona_relacionada_id?: string
}

export interface FiltrosPlanner {
  busqueda: string
  segmento?: SegmentoGDV | 'todos'
  ciudad?: CiudadGDV | 'todas'
  zona?: string | 'todas'
  soloSinGrupo?: boolean
  soloLideres?: boolean
  soloConConyuge?: boolean
}

// Segmentos canónicos de la iglesia sincronizados con la BD
export const SEGMENTOS_CANONICOS: SegmentoInfo[] = [
  { id: 'fff5cad9-e81e-4857-b24a-74aa0dad4c83', nombre: 'Matrimonios', slug: 'matrimonios', descripcion: 'Parejas casadas y vida familiar (72 grupos en BD)', icono: 'Heart' },
  { id: 'f4022f5f-6df5-4511-8a73-689f73ef709c', nombre: 'Mujeres +36', slug: 'mujeres-36', descripcion: 'Ministerio de mujeres adultas +36 (63 grupos en BD)', icono: 'Sparkle' },
  { id: 'b644f02e-6d82-4d43-b4fb-e9bf2d05e8a7', nombre: 'Mujeres de 26 a 35', slug: 'mujeres-26-35', descripcion: 'Mujeres jóvenes y profesionales (16 grupos en BD)', icono: 'Sparkles' },
  { id: '7eb1813a-6e31-4b55-804c-a5346b0cc8af', nombre: 'Hombre +36', slug: 'hombre-36', descripcion: 'Ministerio de hombres adultos +36 (11 grupos en BD)', icono: 'Shield' },
  { id: 'e710e9d1-ab87-4e26-990d-ad438305555a', nombre: 'Hombres de 26 a 35', slug: 'hombres-26-35', descripcion: 'Hombres jóvenes y profesionales (8 grupos en BD)', icono: 'Briefcase' }
]

// Temporadas canónicas por defecto si no existen en BD
export const TEMPORADAS_CANONICAS: TemporadaPlanner[] = [
  {
    id: 'temp-2026-2',
    nombre: '2026-II',
    codigo: 'TEMP-2026-II',
    fecha_inicio: '2026-09-11',
    fecha_fin: '2027-09-11',
    estado: 'planificacion',
    es_activa: false
  },
  {
    id: 'temp-2026-1',
    nombre: '2026-I',
    codigo: 'TEMP-2026-I',
    fecha_inicio: '2026-02-15',
    fecha_fin: '2027-02-04',
    estado: 'activa',
    es_activa: true
  },
  {
    id: 'temp-2025-2',
    nombre: '2025 - II',
    codigo: 'TEMP-2025-II',
    fecha_inicio: '2025-10-12',
    fecha_fin: '2026-10-10',
    estado: 'activa',
    es_activa: true
  },
  {
    id: 'temp-2025-1',
    nombre: '2025-I',
    codigo: 'TEMP-2025-I',
    fecha_inicio: '2025-01-31',
    fecha_fin: '2026-01-30',
    estado: 'inactiva',
    es_activa: false
  },
  {
    id: 'temp-2024-2',
    nombre: '2024-II',
    codigo: 'TEMP-2024-II',
    fecha_inicio: '2024-09-14',
    fecha_fin: '2025-10-04',
    estado: 'inactiva',
    es_activa: false
  }
]

