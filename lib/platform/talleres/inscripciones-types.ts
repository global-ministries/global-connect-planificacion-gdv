export interface InscripcionTaller {
  id: string
  taller_id: string
  taller_nombre?: string
  usuario_id: string
  usuario_nombre?: string
  estado: string
  creado_en?: string
  [key: string]: any
}
