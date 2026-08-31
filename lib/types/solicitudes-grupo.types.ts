export type TipoSolicitud =
  | 'ingreso'
  | 'traslado'
  | 'cambio_rol'
  | 'egreso'
  | 'activacion_grupo'

export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada' | 'expirada'

export interface SolicitudPendiente {
  id: string
  tipo: TipoSolicitud
  estado: EstadoSolicitud
  usuario_id: string
  usuario_nombre?: string
  usuario_apellido?: string
  usuario_email?: string | null
  usuario_telefono?: string | null
  usuario_foto_perfil_url?: string | null
  grupo_id: string
  grupo_nombre?: string
  grupo_origen_id?: string | null
  grupo_origen_nombre?: string | null
  rol_solicitado?: string | null
  motivo?: string | null
  notas?: string | null
  solicitante_id?: string
  solicitante_nombre?: string
  solicitante_apellido?: string
  solicitado_en?: string
  expira_en?: string
  creado_en?: string
  [key: string]: any
}

export interface SolicitudCompletada extends SolicitudPendiente {
  procesado_por?: string | null
  procesado_en?: string | null
  resolucion_notas?: string | null
}

export interface CrearSolicitudRpcResultado {
  ok: boolean
  modo: 'directo' | 'solicitud'
  tipo?: string
  solicitud_id?: string
}

export interface ProcesarSolicitudRpcResultado {
  ok: boolean
  modo: string
  solicitud_id: string
}

export interface MovimientoHistorial {
  id: string
  usuario_id: string
  usuario_nombre?: string
  usuario_apellido?: string
  grupo_id: string
  grupo_nombre?: string
  grupo_origen_id?: string | null
  grupo_origen_nombre?: string | null
  tipo_movimiento: string
  motivo?: string | null
  creado_en?: string
  [key: string]: any
}

export interface MiSolicitud {
  id: string
  tipo: TipoSolicitud
  estado: EstadoSolicitud
  grupo_id: string
  grupo_nombre?: string
  grupo_origen_id?: string | null
  grupo_origen_nombre?: string | null
  rol_solicitado?: string | null
  motivo?: string | null
  creado_en?: string
  expira_en?: string
  [key: string]: any
}
