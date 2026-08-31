'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

async function getPlannerSupabaseClient(): Promise<any> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (
    serviceKey &&
    serviceKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy' &&
    !serviceKey.includes('your-service-role-key')
  ) {
    try {
      return createSupabaseAdminClient()
    } catch {
      // Fallback
    }
  }
  return await createSupabaseServerClient()
}
import {
  GrupoGDVPlanner,
  PersonaPlanner,
  TemporadaPlanner,
  SegmentoInfo,
  AnalisisTemporadaCierre,
  GrupoDiagnosticoInfo,
  ResumenSaludGrupos,
  ZonaDistribucionInfo,
  RecomendacionEstrategica,
  ParejaLiderazgoInfo,
  ConfiguracionPlanificacion,
  RolEnGrupo,
  CiudadGDV,
  SegmentoGDV,
  MiembroAsignado,
  SEGMENTOS_CANONICOS,
  TEMPORADAS_CANONICAS
} from './types'
import { validarReglasPlanificacion, generarNomenclaturaGDV } from './rules'
import { revalidatePath } from 'next/cache'

/**
 * Obtiene los datos base de configuración:
 * - Lista de temporadas reales de la BD (con fallback robusto)
 * - Lista de segmentos reales de la BD (con todos los segmentos canónicos)
 * - Sugerencias de temporada que cierra (activa) vs temporada a planificar (siguiente)
 */
export async function obtenerDatosBasePlanificador() {
  try {
    const supabase = await getPlannerSupabaseClient()

    // 1. Obtener temporadas de Supabase
    let temporadas: TemporadaPlanner[] = []
    const { data: temporadasDB, error: errTemp } = await supabase
      .from('temporadas')
      .select('id, nombre, activa, fecha_inicio, fecha_fin')
      .order('fecha_inicio', { ascending: false })

    if (errTemp) {
      console.error('Error al consultar temporadas:', errTemp)
    }

    // 2. Obtener grupos y miembros para calcular estadísticas en tiempo real (solo activos y no eliminados)
    const { data: todosGruposDB } = await supabase
      .from('grupos')
      .select('id, nombre, temporada_id, segmento_id, activo, eliminado, estado_ciclo')
      .eq('activo', true)
      .neq('eliminado', true)

    const { data: todosMiembrosDB } = await supabase
      .from('grupo_miembros')
      .select('id, grupo_id')

    const miembrosPorGrupo: Record<string, number> = {}
    for (const m of todosMiembrosDB || []) {
      miembrosPorGrupo[m.grupo_id] = (miembrosPorGrupo[m.grupo_id] || 0) + 1
    }

    if (temporadasDB && temporadasDB.length > 0) {
      temporadas = temporadasDB.map(t => {
        const gruposEnTemp = (todosGruposDB || []).filter((g: any) => g.temporada_id === t.id && g.activo === true && !g.eliminado)
        const totalMiembros = gruposEnTemp.reduce((acc: number, g: any) => acc + (miembrosPorGrupo[g.id] || 0), 0)
        const gruposEnPlanificacion = gruposEnTemp.filter((g: any) => g.estado_ciclo === 'planificacion').length

        return {
          id: t.id,
          nombre: t.nombre || 'Temporada',
          codigo: `TEMP-${(t.nombre || 'GDV').replace(/\s+/g, '-').toUpperCase()}`,
          fecha_inicio: t.fecha_inicio || '2026-01-01',
          fecha_fin: t.fecha_fin || '2026-12-31',
          estado: t.activa ? 'activa' : 'inactiva',
          es_activa: Boolean(t.activa),
          total_grupos: gruposEnTemp.length,
          total_miembros: totalMiembros,
          grupos_en_planificacion: gruposEnPlanificacion
        }
      })
    }

    // Si la BD no tiene temporadas, asegurar las temporadas canónicas
    if (temporadas.length === 0) {
      temporadas = [...TEMPORADAS_CANONICAS]
    }

    // 3. Obtener segmentos reales de Supabase
    const { data: segmentosDB, error: errSeg } = await supabase
      .from('segmentos')
      .select('id, nombre, campus_id')
      .order('nombre', { ascending: true })

    if (errSeg) {
      console.error('Error al consultar segmentos:', errSeg)
    }

    const dbSegs = segmentosDB || []
    let segmentos: SegmentoInfo[] = []

    if (dbSegs.length > 0) {
      // Usar estrictamente los segmentos reales de la base de datos de la iglesia
      segmentos = dbSegs.map((dbs: any) => {
        const canonicoMatch = SEGMENTOS_CANONICOS.find(
          cs => cs.nombre.toLowerCase().trim() === dbs.nombre.toLowerCase().trim() || cs.id === dbs.id
        )
        const gruposDelSeg = (todosGruposDB || []).filter((g: any) => g.segmento_id === dbs.id)
        const totalMiembros = gruposDelSeg.reduce((acc: number, g: any) => acc + (miembrosPorGrupo[g.id] || 0), 0)

        return {
          id: dbs.id,
          nombre: dbs.nombre,
          slug: dbs.nombre.toLowerCase().replace(/\s+/g, '-'),
          descripcion: canonicoMatch?.descripcion || `${gruposDelSeg.length} grupos registrados • ${totalMiembros} miembros`,
          icono: canonicoMatch?.icono || 'Users',
          total_grupos: gruposDelSeg.length,
          total_miembros: totalMiembros
        }
      })
    } else {
      segmentos = [...SEGMENTOS_CANONICOS]
    }

    // 4. Determinar inteligentemente la temporada de cierre y la de planificación
    // Para cierre: preferir la temporada activa con grupos cerrando (ej. 2025 - II o 2026-I)
    const temporadasActivasConGrupos = temporadas.filter(t => t.es_activa && (t.total_grupos || 0) > 0)
    const temporadaCierreDefecto = temporadasActivasConGrupos[0] ||
      temporadas.find(t => (t.total_grupos || 0) > 0) ||
      temporadas[0] ||
      TEMPORADAS_CANONICAS[0]

    // Para planificación:
    // 1ro: Si hay una temporada con grupos en planificación activa (guardados previamente por un director)
    // 2do: Si hay una temporada futura/inactiva con grupos
    // 3ro: Temporada con 0 grupos o futura
    const temporadaConPlanificacionGuardada = temporadas.find(
      t => t.id !== temporadaCierreDefecto?.id && ((t as any).grupos_en_planificacion > 0 || (!t.es_activa && (t.total_grupos || 0) > 0))
    )

    const temporadaPlanificarDefecto =
      temporadaConPlanificacionGuardada ||
      temporadas.find(t => (t.total_grupos || 0) === 0 && t.id !== temporadaCierreDefecto?.id) ||
      temporadas.find(t => !t.es_activa && t.id !== temporadaCierreDefecto?.id) ||
      temporadas[1] ||
      TEMPORADAS_CANONICAS[1]

    return {
      success: true,
      temporadas,
      segmentos,
      temporadaCierreDefecto,
      temporadaPlanificarDefecto
    }
  } catch (error: unknown) {
    console.error('Error en obtenerDatosBasePlanificador:', error)
    return {
      success: true, // Retornar canónicos en vez de fallar
      error: error instanceof Error ? error.message : 'Error inesperado al consultar base de datos',
      temporadas: TEMPORADAS_CANONICAS,
      segmentos: SEGMENTOS_CANONICOS,
      temporadaCierreDefecto: TEMPORADAS_CANONICAS[0],
      temporadaPlanificarDefecto: TEMPORADAS_CANONICAS[1]
    }
  }
}

/**
 * Realiza un análisis y diagnóstico de la temporada que va a cerrar
 * para un segmento específico (o todos los segmentos), conectándose directamente
 * a los registros de la base de datos (grupos, miembros, líderes, aprendices,
 * matrimonios, ubicaciones y salud de GDVs).
 */
export async function generarDiagnosticoCierre(config: {
  temporadaCierreId: string
  temporadaPlanificarId: string
  segmentoId: string // UUID o 'todos'
}): Promise<{ success: boolean; analisis?: AnalisisTemporadaCierre; error?: string }> {
  try {
    // Usar cliente de admin para poder consultar de forma íntegra todos los registros operativos
    let supabase: any
    try {
      supabase = createSupabaseAdminClient()
    } catch {
      supabase = await createSupabaseServerClient()
    }

    const isUUID = (str: unknown): str is string =>
      typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())

    // 1. Obtener datos de las temporadas
    let tempCierre: any = null
    let tempPlanificar: any = null

    if (isUUID(config.temporadaCierreId)) {
      const { data } = await supabase
        .from('temporadas')
        .select('id, nombre, activa, fecha_inicio, fecha_fin')
        .eq('id', config.temporadaCierreId)
        .maybeSingle()
      tempCierre = data
    }
    if (!tempCierre) {
      const { data } = await supabase
        .from('temporadas')
        .select('id, nombre, activa, fecha_inicio, fecha_fin')
        .eq('activa', true)
        .maybeSingle()
      tempCierre = data
    }

    if (isUUID(config.temporadaPlanificarId)) {
      const { data } = await supabase
        .from('temporadas')
        .select('id, nombre, activa, fecha_inicio, fecha_fin')
        .eq('id', config.temporadaPlanificarId)
        .maybeSingle()
      tempPlanificar = data
    }

    const nombreTempCierre = tempCierre?.nombre || 'Temporada Actual'
    const nombreTempPlanificar = tempPlanificar?.nombre || 'Temporada Próxima'

    // 2. Obtener segmento seleccionado y mapa de todos los segmentos
    let nombreSegmento = 'Todos los Segmentos'
    const { data: todosSegmentosDB } = await supabase
      .from('segmentos')
      .select('id, nombre')
      .order('nombre', { ascending: true })

    const segMap = new Map<string, string>()
    for (const s of (todosSegmentosDB || []) as any[]) {
      segMap.set(s.id, s.nombre)
    }

    if (config.segmentoId && config.segmentoId !== 'todos') {
      const segNombreFound = segMap.get(config.segmentoId)
      if (segNombreFound) {
        nombreSegmento = segNombreFound
      }
    }

    // 3. Consultar grupos de la temporada que cierra (solo activos y no eliminados)
    let gruposDB: any[] = []

    let queryGrupos = supabase
      .from('grupos')
      .select('id, nombre, temporada_id, segmento_id, activo, dia_reunion, hora_reunion, campus_id, direccion_anfitrion_id, eliminado')
      .eq('activo', true)
      .neq('eliminado', true)

    if (isUUID(config.temporadaCierreId)) {
      const { data: gDataExact, error: gErrExact } = await queryGrupos.eq('temporada_id', config.temporadaCierreId)
      if (!gErrExact && gDataExact && gDataExact.length > 0) {
        gruposDB = gDataExact
      }
    }

    // Si no se encontraron por UUID exacto, buscar grupos por la temporada activa o todos los grupos activos
    if (gruposDB.length === 0) {
      const { data: gDataFallback } = await supabase
        .from('grupos')
        .select('id, nombre, temporada_id, segmento_id, activo, dia_reunion, hora_reunion, campus_id, direccion_anfitrion_id, eliminado')
        .eq('activo', true)
        .neq('eliminado', true)

      gruposDB = gDataFallback || []
    }

    // Filtrar expresamente grupos activos y no eliminados
    gruposDB = gruposDB.filter((g: any) => g.activo === true && !g.eliminado)

    // Filtrar por segmento si no es 'todos'
    if (config.segmentoId && config.segmentoId !== 'todos' && gruposDB.length > 0) {
      gruposDB = gruposDB.filter((g: any) => g.segmento_id === config.segmentoId)
    }

    const gruposIds = gruposDB.map((g: any) => g.id).filter(id => isUUID(id))

    // 4. Consultar miembros de esos grupos
    let miembrosCierreDB: { id: string; grupo_id: string; usuario_id: string; rol: string; estado?: string | null }[] = []
    if (gruposIds.length > 0) {
      const { data: mData, error: mErr } = await supabase
        .from('grupo_miembros')
        .select('id, grupo_id, usuario_id, rol, estado')
        .in('grupo_id', gruposIds)

      if (!mErr && mData) {
        // Filtrar solo los miembros activos o con estado nulo (evitar expresamente inactivos o eliminados)
        miembrosCierreDB = (mData as any[]).filter((m: any) => {
          const est = String(m.estado || '').toLowerCase().trim()
          return est !== 'inactivo' && est !== 'eliminado' && est !== 'egresado' && est !== 'rechazado'
        })
      }
    }

    // 5. Consultar datos de los usuarios involucrados
    const usuarioIdsSet = new Set<string>(miembrosCierreDB.map(m => m.usuario_id).filter(id => isUUID(id)))
    const usuarioIds = Array.from(usuarioIdsSet)

    interface UsuarioInfoSimple {
      id: string
      nombre: string
      apellido: string
      email: string | null
      telefono: string | null
      estado_civil: string | null
      genero: string | null
      direccion_id?: string | null
    }

    const usuariosMap = new Map<string, UsuarioInfoSimple>()
    if (usuarioIds.length > 0) {
      const { data: uData } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email, telefono, estado_civil, genero, direccion_id')
        .in('id', usuarioIds)

      if (uData) {
        for (const u of (uData as any[])) {
          usuariosMap.set(u.id, u)
        }
      }
    }

    // 6. Consultar direcciones y ubicaciones territoriales
    const dirIds = Array.from(new Set(Array.from(usuariosMap.values()).map(u => u.direccion_id).filter(id => isUUID(id)))) as string[]
    let dirData: any[] = []
    if (dirIds.length > 0) {
      try {
        const { data: dData } = await supabase.from('direcciones').select('id, barrio, calle, parroquia_id').in('id', dirIds)
        dirData = dData || []
      } catch {
        dirData = []
      }
    }

    const dirMap = new Map<string, { barrio: string | null; calle: string | null; parroquia_id: string | null }>()
    for (const d of dirData) {
      dirMap.set(d.id, d)
    }

    // Consultar parroquias y municipios para distribución de forma segura
    let parroquiasDB: any[] = []
    let municipiosDB: any[] = []
    try {
      const { data: pData } = await supabase.from('parroquias').select('id, nombre, municipio_id')
      parroquiasDB = pData || []
      const { data: mData } = await supabase.from('municipios').select('id, nombre')
      municipiosDB = mData || []
    } catch {
      // Ignorar si no están presentes
    }

    const muniMap = new Map<string, string>()
    for (const m of municipiosDB) muniMap.set(m.id, m.nombre)
    const parrMap = new Map<string, { nombre: string; municipio: string }>()
    for (const p of parroquiasDB) {
      parrMap.set(p.id, {
        nombre: p.nombre,
        municipio: muniMap.get(p.municipio_id) || 'Iribarren'
      })
    }

    // 7. Consultar relaciones conyugales / matrimonios en la base de datos de forma segura
    const conyugesMap = new Map<string, string>()
    try {
      const { data: relData } = await supabase
        .from('relaciones_usuarios')
        .select('usuario1_id, usuario2_id, tipo_relacion')
        .in('tipo_relacion', ['conyuge', 'esposo', 'esposa', 'matrimonio'])

      if (relData) {
        for (const r of (relData as any[])) {
          conyugesMap.set(r.usuario1_id, r.usuario2_id)
          conyugesMap.set(r.usuario2_id, r.usuario1_id)
        }
      }
    } catch {
      // Fallback
    }

    // Normalizador de roles tolerante a acentos y mayúsculas
    // Nota pastoral: En este modelo, co-líder y aprendiz representan la misma función de relevo/co-liderazgo
    const normalizarRol = (r: string): 'lider' | 'aprendiz' | 'miembro' => {
      const limpio = r.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
      if (limpio.includes('aprendiz') || limpio.includes('co_lider') || limpio.includes('colider') || limpio.includes('co-lider') || limpio.includes('sublider') || limpio.includes('timoteo')) return 'aprendiz'
      if (limpio.includes('lider') || limpio.includes('director') || limpio.includes('pastor')) return 'lider'
      return 'miembro'
    }

    // 8. Construir análisis detallado grupo por grupo
    const grupoMap = new Map<string, any>()
    for (const g of gruposDB) {
      grupoMap.set(g.id, g)
    }

    const miembrosPorGrupo = new Map<string, typeof miembrosCierreDB>()
    for (const m of miembrosCierreDB) {
      const list = miembrosPorGrupo.get(m.grupo_id) || []
      list.push(m)
      miembrosPorGrupo.set(m.grupo_id, list)
    }

    const lideresDetalle: AnalisisTemporadaCierre['lideresDetalle'] = []
    const aprendicesListos: AnalisisTemporadaCierre['aprendicesListos'] = []
    const gruposDetalle: GrupoDiagnosticoInfo[] = []
    const parejasLiderazgo: ParejaLiderazgoInfo[] = []
    const parejasVistas = new Set<string>()

    let totalLideresPrincipalesCount = 0
    let totalCoLideresCount = 0
    let totalLideresCount = 0
    let totalAprendicesCount = 0
    let totalMiembrosActivosCount = miembrosCierreDB.length
    let totalParejasCount = 0

    let gruposConAprendizCount = 0
    let gruposSinAprendizCount = 0

    const zonaStatsMap = new Map<string, { zona: string; municipio: string; gruposCount: number; miembrosCount: number }>()

    for (const g of gruposDB) {
      const gMiembros = miembrosPorGrupo.get(g.id) || []
      const segNombre = segMap.get(g.segmento_id) || 'Segmento General'
      const count = gMiembros.length

      const lideresGrupo: string[] = []
      const aprendicesGrupo: string[] = []
      let tieneAprendiz = false

      // Detectar ciudad y zona del grupo a través de los miembros o el nombre
      let ciudadGrupo: CiudadGDV = 'Barquisimeto'
      let zonaGrupo = 'Centro / Este'

      for (const m of gMiembros) {
        const u = usuariosMap.get(m.usuario_id)
        const rolNorm = normalizarRol(m.rol || 'miembro')

        if (u) {
          const nombreCompleto = `${u.nombre} ${u.apellido}`

          // Evaluar ubicación
          if (u.direccion_id && dirMap.has(u.direccion_id)) {
            const dir = dirMap.get(u.direccion_id)!
            if (dir.barrio) zonaGrupo = dir.barrio
            if (dir.parroquia_id && parrMap.has(dir.parroquia_id)) {
              const p = parrMap.get(dir.parroquia_id)!
              zonaGrupo = p.nombre
              if (p.municipio.toLowerCase().includes('palavecino') || p.nombre.toLowerCase().includes('cabudare')) {
                ciudadGrupo = 'Cabudare'
              }
            }
          }

          // Evaluar cónyuges
          if (conyugesMap.has(u.id)) {
            const conyId = conyugesMap.get(u.id)!
            const conyU = usuariosMap.get(conyId)
            const parejaKey = [u.id, conyId].sort().join('-')
            if (!parejasVistas.has(parejaKey)) {
              parejasVistas.add(parejaKey)
              totalParejasCount++
            }

            if ((rolNorm === 'lider' || rolNorm === 'aprendiz') && conyU) {
              parejasLiderazgo.push({
                id: `pareja-${parejaKey}`,
                esposoId: u.genero === 'M' ? u.id : conyU.id,
                esposoNombre: u.genero === 'M' ? nombreCompleto : `${conyU.nombre} ${conyU.apellido}`,
                esposaId: u.genero === 'F' ? u.id : conyU.id,
                esposaNombre: u.genero === 'F' ? nombreCompleto : `${conyU.nombre} ${conyU.apellido}`,
                grupoNombre: g.nombre,
                rolEsposo: u.genero === 'M' ? (rolNorm === 'lider' ? 'Líder' : 'Aprendiz / Co-líder') : 'Cónyuge',
                rolEsposa: u.genero === 'F' ? (rolNorm === 'lider' ? 'Líder' : 'Aprendiz / Co-líder') : 'Cónyuge',
                ambosLideran: gMiembros.some(gm => gm.usuario_id === conyId && ['lider', 'aprendiz'].includes(normalizarRol(gm.rol)))
              })
            }
          }

          if (rolNorm === 'lider') {
            totalLideresPrincipalesCount++
            totalLideresCount++
            lideresGrupo.push(`${nombreCompleto} (Líder)`)
            lideresDetalle.push({
              id: u.id,
              nombre: u.nombre,
              apellido: u.apellido,
              grupoNombre: g.nombre,
              rol: 'Líder Principal',
              tieneConyuge: conyugesMap.has(u.id),
              conyugeNombre: conyugesMap.has(u.id) && usuariosMap.get(conyugesMap.get(u.id)!)
                ? `${usuariosMap.get(conyugesMap.get(u.id)!)!.nombre} ${usuariosMap.get(conyugesMap.get(u.id)!)!.apellido}`
                : null
            })
          } else if (rolNorm === 'aprendiz') {
            totalAprendicesCount++
            tieneAprendiz = true
            aprendicesGrupo.push(nombreCompleto)
            aprendicesListos.push({
              id: u.id,
              nombre: u.nombre,
              apellido: u.apellido,
              grupoActualNombre: g.nombre,
              segmentoNombre: segNombre,
              esCandidatoApertura: true
            })
          }
        }
      }

      // Si el nombre del grupo dice Cabudare
      if ((g.nombre || '').toLowerCase().includes('cabudare') || (g.nombre || '').toLowerCase().includes('palavecino')) {
        ciudadGrupo = 'Cabudare'
      }

      if (tieneAprendiz) {
        gruposConAprendizCount++
      } else {
        gruposSinAprendizCount++
      }

      gruposDetalle.push({
        id: g.id,
        nombre: g.nombre,
        segmentoId: g.segmento_id,
        segmentoNombre: segNombre,
        lideresNombres: lideresGrupo,
        aprendicesNombres: aprendicesGrupo,
        miembrosCount: count,
        tieneAprendiz,
        ciudad: ciudadGrupo,
        zona: zonaGrupo,
        diaReunion: g.dia_reunion,
        horaReunion: g.hora_reunion
      })

      // Estadísticas por zona
      const zonaKey = `${ciudadGrupo}-${zonaGrupo}`
      const statZona = zonaStatsMap.get(zonaKey) || {
        zona: zonaGrupo,
        municipio: ciudadGrupo === 'Cabudare' ? 'Palavecino' : 'Iribarren',
        gruposCount: 0,
        miembrosCount: 0
      }
      statZona.gruposCount++
      statZona.miembrosCount += count
      zonaStatsMap.set(zonaKey, statZona)
    }

    const totalGrupos = gruposDB.length
    const promedioMiembros = totalGrupos > 0 ? Math.round(totalMiembrosActivosCount / totalGrupos) : 0
    const porcentajeCoberturaSucesion = totalGrupos > 0 ? Math.round((gruposConAprendizCount / totalGrupos) * 100) : 0

    // 9. Agrupación por segmento
    const recuentoSegMap = new Map<string, { grupos: number; miembros: number }>()
    for (const g of gruposDetalle) {
      const sId = g.segmentoId || 'sin_segmento'
      const actual = recuentoSegMap.get(sId) || { grupos: 0, miembros: 0 }
      actual.grupos++
      actual.miembros += g.miembrosCount
      recuentoSegMap.set(sId, actual)
    }

    const gruposPorSegmento = Array.from(recuentoSegMap.entries()).map(([sId, stats]) => ({
      segmentoId: sId,
      segmentoNombre: segMap.get(sId) || 'Segmento General',
      gruposCount: stats.grupos,
      miembrosCount: stats.miembros
    }))

    // 10. Generar Recomendaciones Estratégicas y Pastorales Automatizadas
    const recomendaciones: RecomendacionEstrategica[] = []

    if (totalAprendicesCount > 0) {
      recomendaciones.push({
        id: 'rec-apertura-aprendices',
        categoria: 'sucesion',
        titulo: `${totalAprendicesCount} Aprendiz(ces) capacitados para abrir nuevos GDVs`,
        descripcion: `Cuentas con líderes aprendices listos para ser promovidos a Líderes Principales en la nueva temporada ${nombreTempPlanificar}.`,
        prioridad: 'alta'
      })
    }

    if (gruposSinAprendizCount > 0) {
      recomendaciones.push({
        id: 'rec-sin-aprendiz',
        categoria: 'sucesion',
        titulo: `${gruposSinAprendizCount} Grupo(s) sin Aprendiz asignado`,
        descripcion: `La cobertura de sucesión es del ${porcentajeCoberturaSucesion}%. Se recomienda coordinar la designación de aprendices para fortalecer el relevo ministerial.`,
        prioridad: 'media'
      })
    }

    if (totalParejasCount > 0 && (nombreSegmento.toLowerCase().includes('matrimonio') || config.segmentoId === 'todos')) {
      recomendaciones.push({
        id: 'rec-liderazgo-matrimonial',
        categoria: 'matrimonios',
        titulo: `${totalParejasCount} Parejas conyugales registradas`,
        descripcion: `Excelente potencial para consolidación y liderazgo conjunto en Grupos de Vida en Barquisimeto y Cabudare.`,
        prioridad: 'media'
      })
    }

    // 11. Proyecciones Numéricas
    const metaGruposNuevos = Math.max(1, Math.ceil(totalGrupos * 1.15) + Math.min(totalAprendicesCount, 5))
    const capacidadTotalRequerida = metaGruposNuevos * 12

    const analisis: AnalisisTemporadaCierre = {
      temporadaCierreId: config.temporadaCierreId,
      temporadaCierreNombre: nombreTempCierre,
      temporadaPlanificarId: config.temporadaPlanificarId,
      temporadaPlanificarNombre: nombreTempPlanificar,
      segmentoSeleccionadoId: config.segmentoId,
      segmentoSeleccionadoNombre: nombreSegmento,
      totalGruposCerrando: totalGrupos,
      totalLideresPrincipales: totalLideresPrincipalesCount,
      totalCoLideres: totalCoLideresCount,
      totalLideresCerrando: totalLideresCount,
      totalAprendicesGraduables: totalAprendicesCount,
      totalMiembrosActivos: totalMiembrosActivosCount,
      totalParejasConyuges: totalParejasCount,
      promedioMiembrosPorGrupo: promedioMiembros,
      saludGrupos: {
        gruposConAprendiz: gruposConAprendizCount,
        gruposSinAprendiz: gruposSinAprendizCount,
        porcentajeCoberturaSucesion
      },
      gruposDetalle,
      gruposPorSegmento,
      distribucionZonas: Array.from(zonaStatsMap.values()),
      parejasLiderazgo,
      recomendaciones,
      lideresDetalle,
      aprendicesListos,
      proyeccion: {
        metaGruposNuevos,
        capacidadTotalRequerida,
        gruposBarquisimeto: Math.ceil(metaGruposNuevos * 0.65),
        gruposCabudare: Math.floor(metaGruposNuevos * 0.35)
      }
    }

    return {
      success: true,
      analisis
    }
  } catch (error: unknown) {
    console.error('Error al generar diagnóstico de cierre:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al procesar el diagnóstico'
    }
  }
}

/**
 * Carga el espacio de trabajo con los datos filtrados y listos para planificar
 */
export async function cargarWorkspacePlanificador(config: ConfiguracionPlanificacion) {
  try {
    const supabase = await getPlannerSupabaseClient()

    // 1. Obtener temporadas y segmentos
    const { data: temporadasDB } = await supabase
      .from('temporadas')
      .select('id, nombre, activa, estado, fecha_inicio, fecha_fin')
      .order('fecha_inicio', { ascending: false })

    const temporadas: TemporadaPlanner[] = (temporadasDB || []).map((t: any) => ({
      id: t.id,
      nombre: t.nombre,
      codigo: `TEMP-${t.nombre.replace(/\s+/g, '-').toUpperCase()}`,
      fecha_inicio: t.fecha_inicio,
      fecha_fin: t.fecha_fin,
      estado: t.estado || (t.activa ? 'activa' : 'planificacion'),
      es_activa: Boolean(t.activa)
    }))

    const temporadaActual = temporadas.find(t => t.id === config.temporadaPlanificarId) || temporadas[0] || null

    // 2. Obtener lista de segmentos
    const { data: segmentosDB } = await supabase
      .from('segmentos')
      .select('id, nombre')
      .order('nombre', { ascending: true })

    const segMap = new Map<string, string>()
    for (const s of (segmentosDB || []) as any[]) {
      segMap.set(s.id, s.nombre)
    }

    // 3. Determinar temporadas activas simultáneas a excluir (ej. 2026-I si estamos planificando 2025-II -> 2026-II)
    const temporadasExcluidas = (config.temporadasExcluidasIds && config.temporadasExcluidasIds.length > 0)
      ? config.temporadasExcluidasIds
      : temporadas
          .filter(t => t.es_activa && t.id !== config.temporadaCierreId && t.id !== config.temporadaPlanificarId)
          .map(t => t.id)

    // Obtener miembros de grupos activos en las temporadas excluidas para no contaminar el banco de personas
    const usuariosExcluidosSet = new Set<string>()
    if (temporadasExcluidas.length > 0) {
      const { data: gruposExcluidosDB } = await supabase
        .from('grupos')
        .select('id')
        .in('temporada_id', temporadasExcluidas)
        .eq('activo', true)
        .neq('eliminado', true)

      const gExcluidosIds = (gruposExcluidosDB || []).map((g: any) => g.id)
      if (gExcluidosIds.length > 0) {
        const { data: mExcluidosDB } = await supabase
          .from('grupo_miembros')
          .select('usuario_id, estado')
          .in('grupo_id', gExcluidosIds)

        for (const m of (mExcluidosDB || []) as any[]) {
          const est = String(m.estado || '').toLowerCase().trim()
          if (est !== 'inactivo' && est !== 'eliminado' && m.usuario_id) {
            usuariosExcluidosSet.add(m.usuario_id)
          }
        }
      }
    }

    // 4. Determinar los grupos a cargar en el workspace (solo activos y no eliminados)
    let gruposRaw: any[] = []

    if (config.modoInicio === 'en_blanco') {
      gruposRaw = []
    } else if (config.modoInicio === 'existente') {
      let queryGruposPlan = supabase
        .from('grupos')
        .select('*')
        .eq('temporada_id', config.temporadaPlanificarId)
        .neq('eliminado', true)

      if (config.segmentoId && config.segmentoId !== 'todos') {
        queryGruposPlan = queryGruposPlan.eq('segmento_id', config.segmentoId)
      }

      const { data: gExistentes } = await queryGruposPlan
      gruposRaw = gExistentes || []
    } else {
      // Modo 'importar_cierre' o por defecto:
      // 1. Primero intentar cargar grupos de la temporada destino si ya existen guardados (incluyendo borradores)
      let queryGruposPlan = supabase
        .from('grupos')
        .select('*')
        .eq('temporada_id', config.temporadaPlanificarId)
        .neq('eliminado', true)

      if (config.segmentoId && config.segmentoId !== 'todos') {
        queryGruposPlan = queryGruposPlan.eq('segmento_id', config.segmentoId)
      }

      const { data: gExistentes } = await queryGruposPlan
      if (gExistentes && gExistentes.length > 0) {
        gruposRaw = gExistentes
      } else {
        // 2. Si no existen en destino, cargar los de la temporada de cierre (solo activos y no eliminados)
        let queryGruposCierre = supabase
          .from('grupos')
          .select('*')
          .eq('activo', true)
          .neq('eliminado', true)

        if (config.temporadaCierreId) {
          const { data: gCierreExact } = await queryGruposCierre.eq('temporada_id', config.temporadaCierreId)
          if (gCierreExact && gCierreExact.length > 0) {
            gruposRaw = gCierreExact
          }
        }

        // Fallback: si no hay por ID exacto, buscar todos los grupos activos
        if (gruposRaw.length === 0) {
          const { data: gCierreActivos } = await supabase
            .from('grupos')
            .select('*')
            .eq('activo', true)
            .neq('eliminado', true)

          gruposRaw = gCierreActivos || []
        }

        // Filtrar por segmento si no es 'todos'
        if (config.segmentoId && config.segmentoId !== 'todos' && gruposRaw.length > 0) {
          gruposRaw = gruposRaw.filter((g: any) => g.segmento_id === config.segmentoId)
        }
      }
    }

    // Filtrar expresamente en memoria para garantizar que no haya eliminados
    gruposRaw = gruposRaw.filter((g: any) => !g.eliminado)

    // 5. Cargar asignaciones de miembros para esos grupos
    const gruposIds = gruposRaw.map(g => g.id)
    let miembrosDB: { id: string; grupo_id: string; usuario_id: string; rol: string; fecha_asignacion: string; estado?: string }[] = []

    if (gruposIds.length > 0) {
      const { data: mData } = await supabase
        .from('grupo_miembros')
        .select('id, grupo_id, usuario_id, rol, fecha_asignacion, estado')
        .in('grupo_id', gruposIds)
      
      miembrosDB = ((mData || []) as any[]).filter(m => {
        const est = String(m.estado || '').toLowerCase().trim()
        return est !== 'inactivo' && est !== 'eliminado'
      })
    }

    // Conjunto de usuarios que pertenecen a los grupos del plan actual
    const usuariosEnGruposPlan = new Set<string>()
    for (const m of miembrosDB) {
      if (m.usuario_id) usuariosEnGruposPlan.add(m.usuario_id)
    }

    // 6. Obtener usuarios completos (hasta 1500)
    const { data: usuariosDB } = await supabase
      .from('usuarios')
      .select(`
        id,
        nombre,
        apellido,
        email,
        telefono,
        estado_civil,
        genero,
        fecha_nacimiento,
        direccion_id
      `)
      .limit(1500)

    // Direcciones para inferir ciudad
    const { data: direccionesDB } = await supabase
      .from('direcciones')
      .select('id, barrio, calle')

    const dirMap = new Map<string, { barrio: string | null; calle: string | null }>()
    for (const d of (direccionesDB || []) as any[]) {
      dirMap.set(d.id, { barrio: d.barrio, calle: d.calle })
    }

    // Relaciones conyugales
    const { data: relacionesDB } = await supabase
      .from('relaciones_usuarios')
      .select('usuario1_id, usuario2_id, tipo_relacion')
      .eq('tipo_relacion', 'conyuge')

    const conyugeMap = new Map<string, string>()
    if (relacionesDB) {
      for (const r of (relacionesDB as any[])) {
        conyugeMap.set(r.usuario1_id, r.usuario2_id)
        conyugeMap.set(r.usuario2_id, r.usuario1_id)
      }
    }

    // Mapear personas disponibles (excluyendo miembros de temporadas paralelas no seleccionadas)
    const personasMap = new Map<string, PersonaPlanner>()
    const listaPersonas: PersonaPlanner[] = []

    for (const u of (usuariosDB || []) as any[]) {
      // Si el usuario pertenece a otra temporada activa excluida y no está en los grupos a planificar, se excluye
      if (usuariosExcluidosSet.has(u.id) && !usuariosEnGruposPlan.has(u.id)) {
        continue
      }

      const dir = u.direccion_id ? dirMap.get(u.direccion_id) : null
      const conyugeId = conyugeMap.get(u.id) || null

      // Deducir ciudad
      let ciudad: CiudadGDV = 'Barquisimeto'
      if (dir?.barrio?.toLowerCase().includes('cabudare') || dir?.calle?.toLowerCase().includes('cabudare') || dir?.barrio?.toLowerCase().includes('palavecino')) {
        ciudad = 'Cabudare'
      }

      // Calcular edad a partir de fecha_nacimiento
      let edad: number | null = null
      if (u.fecha_nacimiento) {
        const hoy = new Date()
        const fn = new Date(u.fecha_nacimiento)
        if (!isNaN(fn.getTime())) {
          let diff = hoy.getFullYear() - fn.getFullYear()
          const m = hoy.getMonth() - fn.getMonth()
          if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) {
            diff--
          }
          if (diff >= 0 && diff <= 120) {
            edad = diff
          }
        }
      }

      const persona: PersonaPlanner = {
        id: u.id,
        nombre: u.nombre || 'Sin nombre',
        apellido: u.apellido || '',
        email: u.email,
        telefono: u.telefono,
        ciudad,
        zona: dir?.barrio || 'Centro',
        direccion: dir?.calle || null,
        conyuge_id: conyugeId,
        conyuge_nombre: null,
        es_lider_potencial: false,
        fecha_nacimiento: u.fecha_nacimiento || null,
        edad,
        genero: u.genero || null
      }

      personasMap.set(u.id, persona)
      listaPersonas.push(persona)
    }

    // Asignar nombres de cónyuges
    for (const p of listaPersonas) {
      if (p.conyuge_id && personasMap.has(p.conyuge_id)) {
        const c = personasMap.get(p.conyuge_id)!
        p.conyuge_nombre = `${c.nombre} ${c.apellido}`
      }
    }

    const miembrosPorGrupo = new Map<string, { usuario_id: string; rol: string; fecha_asignacion: string }[]>()
    for (const m of miembrosDB) {
      const list = miembrosPorGrupo.get(m.grupo_id) || []
      list.push(m)
      miembrosPorGrupo.set(m.grupo_id, list)
    }

    // Normalizador de roles
    const normalizarRol = (r: string): 'lider' | 'aprendiz' | 'miembro' => {
      const limpio = (r || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
      if (limpio.includes('aprendiz') || limpio.includes('co_lider') || limpio.includes('colider') || limpio.includes('co-lider') || limpio.includes('sublider') || limpio.includes('timoteo')) return 'aprendiz'
      if (limpio.includes('lider') || limpio.includes('director') || limpio.includes('pastor')) return 'lider'
      return 'miembro'
    }

    // 6. Ensamblar grupos para el planificador
    const grupos: GrupoGDVPlanner[] = []

    for (const g of gruposRaw) {
      const rawMiembros = miembrosPorGrupo.get(g.id) || []
      let liderPrincipal: PersonaPlanner | null = null
      let coLider: PersonaPlanner | null = null
      const aprendices: PersonaPlanner[] = []
      const miembrosAsignados: MiembroAsignado[] = []

      for (const rm of rawMiembros) {
        let persona = personasMap.get(rm.usuario_id)
        if (!persona) {
          persona = {
            id: rm.usuario_id,
            nombre: 'Miembro',
            apellido: '',
            email: null,
            telefono: null,
            ciudad: 'Barquisimeto',
            zona: 'Centro',
            direccion: null,
            conyuge_id: null,
            conyuge_nombre: null,
            es_lider_potencial: false
          }
          personasMap.set(rm.usuario_id, persona)
          listaPersonas.push(persona)
        }

        const rolNorm = normalizarRol(rm.rol)

        if (rolNorm === 'lider') {
          if (!liderPrincipal) {
            liderPrincipal = persona
            persona.rol_actual = 'lider'
            persona.grupo_actual_id = g.id
            persona.grupo_actual_nombre = g.nombre
          } else if (!coLider) {
            coLider = persona
            persona.rol_actual = 'co_lider'
            persona.grupo_actual_id = g.id
            persona.grupo_actual_nombre = g.nombre
          } else {
            miembrosAsignados.push({
              persona_id: persona.id,
              persona,
              rol: 'lider',
              fecha_asignacion: rm.fecha_asignacion
            })
            persona.rol_actual = 'miembro'
            persona.grupo_actual_id = g.id
            persona.grupo_actual_nombre = g.nombre
          }
        } else if (rolNorm === 'aprendiz') {
          aprendices.push(persona)
          persona.rol_actual = 'aprendiz'
          persona.grupo_actual_id = g.id
          persona.grupo_actual_nombre = g.nombre
        } else {
          miembrosAsignados.push({
            persona_id: persona.id,
            persona,
            rol: (rm.rol as RolEnGrupo) || 'miembro',
            fecha_asignacion: rm.fecha_asignacion
          })
          persona.rol_actual = (rm.rol as RolEnGrupo) || 'miembro'
          persona.grupo_actual_id = g.id
          persona.grupo_actual_nombre = g.nombre
        }
      }

      // Si es un grupo de matrimonios (o el líder tiene cónyuge) y no hay co-líder asignado:
      const segNombreTemp = segMap.get(g.segmento_id) || 'Mixto'
      const esMatrimonios = segNombreTemp.toLowerCase().includes('matrimonio') || (g.nombre || '').toLowerCase().includes('matrimonio')
      if (liderPrincipal && !coLider && liderPrincipal.conyuge_id) {
        // Buscar si el cónyuge está en aprendices
        const apIndex = aprendices.findIndex(a => a.id === liderPrincipal!.conyuge_id)
        if (apIndex !== -1) {
          const [conyugeExtraido] = aprendices.splice(apIndex, 1)
          coLider = conyugeExtraido
          coLider.rol_actual = 'co_lider'
          coLider.grupo_actual_id = g.id
          coLider.grupo_actual_nombre = g.nombre
        } else {
          // Buscar si el cónyuge está en miembrosAsignados
          const conyugeIndex = miembrosAsignados.findIndex(m => m.persona_id === liderPrincipal!.conyuge_id)
          if (conyugeIndex !== -1) {
            const [conyugeExtraido] = miembrosAsignados.splice(conyugeIndex, 1)
            coLider = conyugeExtraido.persona
            coLider.rol_actual = 'co_lider'
            coLider.grupo_actual_id = g.id
            coLider.grupo_actual_nombre = g.nombre
          } else if (esMatrimonios && personasMap.has(liderPrincipal.conyuge_id)) {
            // Si es grupo de matrimonios, traer al cónyuge a co-liderazgo
            coLider = personasMap.get(liderPrincipal.conyuge_id)!
            coLider.rol_actual = 'co_lider'
            coLider.grupo_actual_id = g.id
            coLider.grupo_actual_nombre = g.nombre
          }
        }
      }

      // Asignar el líder de este grupo como líder previo a los miembros para trazabilidad de rotación
      if (liderPrincipal) {
        if (coLider && !coLider.lider_anterior_id) {
          coLider.lider_anterior_id = liderPrincipal.id
          coLider.lider_anterior_nombre = `${liderPrincipal.nombre} ${liderPrincipal.apellido}`.trim()
        }
        for (const ap of aprendices) {
          if (ap.id !== liderPrincipal.id && !ap.lider_anterior_id) {
            ap.lider_anterior_id = liderPrincipal.id
            ap.lider_anterior_nombre = `${liderPrincipal.nombre} ${liderPrincipal.apellido}`.trim()
          }
        }
        for (const m of miembrosAsignados) {
          if (m.persona && m.persona.id !== liderPrincipal.id && !m.persona.lider_anterior_id) {
            m.persona.lider_anterior_id = liderPrincipal.id
            m.persona.lider_anterior_nombre = `${liderPrincipal.nombre} ${liderPrincipal.apellido}`.trim()
          }
        }
      }

      const segNombre = segMap.get(g.segmento_id) || 'Mixto'
      const segSlug = segNombre.toLowerCase() as SegmentoGDV

      grupos.push({
        id: g.id,
        temporada_id: config.temporadaPlanificarId, // contextualizado a la temporada a planificar
        segmento_id: g.segmento_id,
        nombre: g.nombre,
        segmento: segSlug,
        segmento_nombre: segNombre,
        ciudad: (g.nombre || '').toLowerCase().includes('cabudare') ? 'Cabudare' : 'Barquisimeto',
        zona: 'Centro',
        dia_reunion: g.dia_reunion || 'Jueves',
        hora_reunion: g.hora_reunion || '19:30',
        capacidad_maxima: g.capacidad_maxima || 12,
        estado: 'planificacion',
        lider_principal: liderPrincipal,
        co_lider: coLider,
        aprendices,
        miembros: miembrosAsignados
      })
    }

    // 7. Validar reglas de gobernanza y pastoral en tiempo real
    const advertencias = validarReglasPlanificacion(grupos, listaPersonas)

    // 8. Consultar estado de aprobación en la temporada destino
    let totalAprobados = 0
    let totalPendientes = 0
    let estaPublicada = false

    try {
      const { data: estadoGruposDB } = await supabase
        .from('grupos')
        .select('id, estado_aprobacion, estado_ciclo')
        .eq('temporada_id', config.temporadaPlanificarId)
        .eq('activo', true)
        .neq('eliminado', true)

      if (estadoGruposDB && estadoGruposDB.length > 0) {
        totalAprobados = estadoGruposDB.filter((g: any) => g.estado_aprobacion === 'aprobado').length
        totalPendientes = estadoGruposDB.filter((g: any) => g.estado_aprobacion === 'pendiente' || !g.estado_aprobacion).length
        estaPublicada = totalAprobados === estadoGruposDB.length && totalAprobados > 0
      }
    } catch {
      // No bloquear carga
    }

    return {
      success: true,
      temporadas,
      temporadaActual,
      segmentos: (segmentosDB || []).map((s: any) => ({ id: s.id, nombre: s.nombre })),
      grupos,
      personas: listaPersonas,
      advertencias,
      estadoPlanificacion: {
        totalAprobados,
        totalPendientes,
        estaPublicada
      }
    }
  } catch (error: unknown) {
    console.error('Error al cargar workspace del planner:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al conectar con la base de datos',
      temporadas: [],
      temporadaActual: null,
      segmentos: [],
      grupos: [],
      personas: [],
      advertencias: []
    }
  }
}

/**
 * Crea un nuevo GDV con la nomenclatura estandarizada en la base de datos
 */
export async function crearGrupoGDV(
  temporadaId: string,
  segmentoId: string | null,
  ciudad: CiudadGDV,
  segmentoNombre: string,
  zona: string,
  secuenciaActual: number = 1
) {
  try {
    const supabase = await getPlannerSupabaseClient()
    const nombreOficial = generarNomenclaturaGDV(ciudad, segmentoNombre as SegmentoGDV, secuenciaActual)

    // Buscar si existe segmento_id válido
    let segId = segmentoId
    if (!segId || segId === 'todos') {
      const { data: primerSeg } = await supabase.from('segmentos').select('id').limit(1).maybeSingle()
      segId = primerSeg ? (primerSeg as any).id : null
    }

    if (!segId) {
      return { success: false, error: 'No se encontró un segmento válido para asociar el grupo' }
    }

    const nuevoGrupo: any = {
      nombre: nombreOficial,
      temporada_id: temporadaId,
      segmento_id: segId,
      capacidad_maxima: 12,
      dia_reunion: 'Jueves',
      hora_reunion: '19:30',
      estado_ciclo: 'activo',
      estado_aprobacion: 'pendiente',
      activo: true,
      eliminado: false
    }

    const { data, error } = await supabase
      .from('grupos')
      .insert([nuevoGrupo])
      .select()
      .single()

    if (error) {
      console.error('Error al crear grupo GDV:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/planner')
    return { success: true, data }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Error al crear grupo' }
  }
}

/**
 * Guarda las asignaciones de un grupo en la base de datos
 */
export async function guardarAsignacionesGrupo(
  grupoId: string,
  liderPrincipalId: string | null,
  coLiderId: string | null,
  aprendicesIds: string[],
  miembrosIds: string[]
) {
  try {
    const supabase = await getPlannerSupabaseClient()

    // 1. Eliminar asignaciones previas del grupo para sobreescribir limpiamente
    const { error: errDel } = await supabase
      .from('grupo_miembros')
      .delete()
      .eq('grupo_id', grupoId)

    if (errDel) {
      console.error('Error al eliminar asignaciones previas:', errDel)
      return { success: false, error: `Error al limpiar miembros previos: ${errDel.message}` }
    }

    const nuevasAsignaciones: {
      grupo_id: string
      usuario_id: string
      rol: 'Líder' | 'Colíder' | 'Miembro'
      estado: string
      fecha_asignacion: string
    }[] = []

    const hoy = new Date().toISOString().split('T')[0]

    if (liderPrincipalId) {
      nuevasAsignaciones.push({
        grupo_id: grupoId,
        usuario_id: liderPrincipalId,
        rol: 'Líder',
        estado: 'activo',
        fecha_asignacion: hoy
      })
    }

    if (coLiderId) {
      nuevasAsignaciones.push({
        grupo_id: grupoId,
        usuario_id: coLiderId,
        rol: 'Líder',
        estado: 'activo',
        fecha_asignacion: hoy
      })
    }

    for (const apId of aprendicesIds) {
      nuevasAsignaciones.push({
        grupo_id: grupoId,
        usuario_id: apId,
        rol: 'Colíder',
        estado: 'activo',
        fecha_asignacion: hoy
      })
    }

    for (const mId of miembrosIds) {
      nuevasAsignaciones.push({
        grupo_id: grupoId,
        usuario_id: mId,
        rol: 'Miembro',
        estado: 'activo',
        fecha_asignacion: hoy
      })
    }

    if (nuevasAsignaciones.length > 0) {
      const { error } = await supabase
        .from('grupo_miembros')
        .insert(nuevasAsignaciones)

      if (error) {
        console.error('Error al insertar asignaciones:', error)
        return { success: false, error: error.message }
      }
    }

    revalidatePath('/planner')
    revalidatePath('/grupos-vida')
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Error al guardar asignaciones' }
  }
}

/**
 * Guarda toda la planificación en la temporada destino:
 * 1. Asegura que cada grupo exista físicamente en la temporada a planificar (temporada_id = temporadaPlanificarId)
 * 2. Guarda todas las asignaciones de líderes, co-líderes, aprendices y miembros en grupo_miembros con el enum exacto de Postgres
 * 3. Garantiza persistencia total al recargar la aplicación o iniciar sesión
 */
export async function guardarPlanificacionCompleta(
  temporadaPlanificarId: string,
  grupos: GrupoGDVPlanner[]
) {
  try {
    const supabase = await getPlannerSupabaseClient()

    if (!temporadaPlanificarId) {
      return { success: false, error: 'No se especificó la temporada a planificar' }
    }

    // 1. Obtener grupos existentes en la temporada destino para mapeo (sin filtrar por activo para mapear borradores y evitar colisiones de grupos_unico)
    const { data: gruposDestinoExistentes, error: errConsulta } = await supabase
      .from('grupos')
      .select('id, nombre, temporada_id, activo, eliminado')
      .eq('temporada_id', temporadaPlanificarId)

    if (errConsulta) {
      console.error('Error al consultar grupos destino:', errConsulta)
      return { success: false, error: `Error al consultar grupos de la temporada destino: ${errConsulta.message}` }
    }

    const mapaPorNombre = new Map<string, string>()
    const mapaPorId = new Set<string>()
    for (const gd of (gruposDestinoExistentes || []) as any[]) {
      const nombreClave = (gd.nombre || '').toLowerCase().trim()
      if (nombreClave) {
        mapaPorNombre.set(nombreClave, gd.id)
      }
      mapaPorId.add(gd.id)
    }

    // 2. Obtener un segmento por defecto si algún grupo no lo tiene
    const { data: primerSeg } = await supabase.from('segmentos').select('id').limit(1).maybeSingle()
    const defaultSegId = primerSeg ? (primerSeg as any).id : null

    const gruposActualizados: { idViejo: string; idNuevo: string }[] = []
    let gruposGuardados = 0

    for (const g of grupos) {
      let targetGrupoId: string | null = null

      // Si el grupo ya existe con su ID en la temporada destino
      if (mapaPorId.has(g.id)) {
        targetGrupoId = g.id
        const { error: errUpdate } = await supabase
          .from('grupos')
          .update({
            nombre: g.nombre,
            segmento_id: g.segmento_id || defaultSegId,
            capacidad_maxima: g.capacidad_maxima || 12,
            dia_reunion: g.dia_reunion || 'Jueves',
            hora_reunion: g.hora_reunion || '19:30',
            estado_ciclo: 'activo',
            activo: true,
            eliminado: false
          })
          .eq('id', targetGrupoId)

        if (errUpdate) {
          console.error(`Error al actualizar grupo ${g.nombre}:`, errUpdate)
          return {
            success: false,
            error: `Error al actualizar grupo "${g.nombre}": ${errUpdate.message}`
          }
        }
      } else {
        // Verificar si existe por nombre en la temporada destino
        const nombreClave = (g.nombre || '').toLowerCase().trim()
        const idExistentePorNombre = mapaPorNombre.get(nombreClave)

        if (idExistentePorNombre) {
          targetGrupoId = idExistentePorNombre
          const { error: errUpdate } = await supabase
            .from('grupos')
            .update({
              nombre: g.nombre,
              segmento_id: g.segmento_id || defaultSegId,
              capacidad_maxima: g.capacidad_maxima || 12,
              dia_reunion: g.dia_reunion || 'Jueves',
              hora_reunion: g.hora_reunion || '19:30',
              estado_ciclo: 'activo',
              activo: true,
              eliminado: false
            })
            .eq('id', targetGrupoId)

          if (errUpdate) {
            console.error(`Error al actualizar grupo por nombre ${g.nombre}:`, errUpdate)
            return {
              success: false,
              error: `Error al actualizar grupo "${g.nombre}": ${errUpdate.message}`
            }
          }
        } else {
          // Crear el grupo en la temporada destino
          const payloadNuevoGrupo: any = {
            nombre: g.nombre,
            temporada_id: temporadaPlanificarId,
            segmento_id: g.segmento_id || defaultSegId,
            capacidad_maxima: g.capacidad_maxima || 12,
            dia_reunion: g.dia_reunion || 'Jueves',
            hora_reunion: g.hora_reunion || '19:30',
            estado_ciclo: 'activo',
            estado_aprobacion: 'pendiente',
            activo: true,
            eliminado: false
          }

          const { data: nuevoG, error: errInsert } = await supabase
            .from('grupos')
            .insert([payloadNuevoGrupo])
            .select('id, nombre')
            .single()

          if (errInsert || !nuevoG) {
            console.error('Error al insertar grupo en temporada destino:', errInsert)
            return {
              success: false,
              error: `Error al crear grupo "${g.nombre}" en la temporada destino: ${errInsert?.message || 'Error desconocido'}`
            }
          }

          targetGrupoId = (nuevoG as any).id
          mapaPorNombre.set(nombreClave, targetGrupoId!)
          mapaPorId.add(targetGrupoId!)
        }
      }

      if (targetGrupoId) {
        gruposActualizados.push({ idViejo: g.id, idNuevo: targetGrupoId })

        // Guardar las asignaciones en grupo_miembros
        const { error: errDelMiembros } = await supabase
          .from('grupo_miembros')
          .delete()
          .eq('grupo_id', targetGrupoId)

        if (errDelMiembros) {
          console.error(`Error al limpiar miembros previos de grupo ${targetGrupoId}:`, errDelMiembros)
          return {
            success: false,
            error: `Error al limpiar miembros del grupo "${g.nombre}": ${errDelMiembros.message}`
          }
        }

        const hoy = new Date().toISOString().split('T')[0]
        const usuariosProcesados = new Set<string>()
        const nuevasAsignaciones: {
          grupo_id: string
          usuario_id: string
          rol: 'Líder' | 'Colíder' | 'Miembro'
          estado: string
          fecha_asignacion: string
        }[] = []

        if (g.lider_principal?.id && !usuariosProcesados.has(g.lider_principal.id)) {
          usuariosProcesados.add(g.lider_principal.id)
          nuevasAsignaciones.push({
            grupo_id: targetGrupoId,
            usuario_id: g.lider_principal.id,
            rol: 'Líder',
            estado: 'activo',
            fecha_asignacion: hoy
          })
        }

        if (g.co_lider?.id && !usuariosProcesados.has(g.co_lider.id)) {
          usuariosProcesados.add(g.co_lider.id)
          nuevasAsignaciones.push({
            grupo_id: targetGrupoId,
            usuario_id: g.co_lider.id,
            rol: 'Líder',
            estado: 'activo',
            fecha_asignacion: hoy
          })
        }

        for (const ap of g.aprendices || []) {
          if (ap?.id && !usuariosProcesados.has(ap.id)) {
            usuariosProcesados.add(ap.id)
            nuevasAsignaciones.push({
              grupo_id: targetGrupoId,
              usuario_id: ap.id,
              rol: 'Colíder',
              estado: 'activo',
              fecha_asignacion: hoy
            })
          }
        }

        for (const m of g.miembros || []) {
          const uid = m?.persona_id || m?.persona?.id
          if (uid && !usuariosProcesados.has(uid)) {
            usuariosProcesados.add(uid)
            nuevasAsignaciones.push({
              grupo_id: targetGrupoId,
              usuario_id: uid,
              rol: 'Miembro',
              estado: 'activo',
              fecha_asignacion: hoy
            })
          }
        }

        if (nuevasAsignaciones.length > 0) {
          const { error: errInsertMiembros } = await supabase
            .from('grupo_miembros')
            .insert(nuevasAsignaciones)

          if (errInsertMiembros) {
            console.error(`Error al insertar asignaciones para grupo ${targetGrupoId}:`, errInsertMiembros)
            return {
              success: false,
              error: `Error al guardar miembros del grupo "${g.nombre}": ${errInsertMiembros.message}`
            }
          }
        }

        gruposGuardados++
      }
    }

    if (grupos.length > 0 && gruposGuardados === 0) {
      return {
        success: false,
        error: 'No se pudo guardar ningún grupo en la base de datos.'
      }
    }

    try {
      revalidatePath('/planner')
      revalidatePath('/grupos-vida')
    } catch {
      // Revalidación opcional si no hay store estático activo
    }
    return {
      success: true,
      gruposGuardados,
      gruposActualizados
    }
  } catch (error: unknown) {
    console.error('Error en guardarPlanificacionCompleta:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al guardar la planificación'
    }
  }
}

/**
 * Aprueba y publica todos los grupos de la temporada planificada,
 * cambiando estado_aprobacion = 'aprobado' y estado_ciclo = 'activo'
 */
export async function aprobarYPublicarTemporadaGDVAction(
  temporadaId: string,
  activarTemporada: boolean = false
) {
  try {
    const supabase = await getPlannerSupabaseClient()

    // 1. Actualizar todos los grupos no eliminados de la temporada a 'aprobado' y 'activo'
    const { data: gruposActualizados, error: errGrupos } = await supabase
      .from('grupos')
      .update({
        estado_aprobacion: 'aprobado',
        estado_ciclo: 'activo',
        activo: true,
        aprobado_en: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('temporada_id', temporadaId)
      .neq('eliminado', true)
      .select('id, nombre')

    if (errGrupos) {
      console.error('Error al aprobar grupos de la temporada:', errGrupos)
      return {
        success: false,
        error: `Error al aprobar grupos: ${errGrupos.message}`
      }
    }

    // 2. Si se solicitó marcar la temporada como activa en la tabla temporadas
    if (activarTemporada) {
      const { error: errTemp } = await supabase
        .from('temporadas')
        .update({
          activa: true,
          estado: 'activa'
        })
        .eq('id', temporadaId)

      if (errTemp) {
        console.warn('Aviso al activar temporada en tabla temporadas:', errTemp)
      }
    }

    revalidatePath('/planner')
    revalidatePath('/grupos-vida')
    revalidatePath('/dashboard')

    return {
      success: true,
      totalAprobados: gruposActualizados?.length || 0
    }
  } catch (error: unknown) {
    console.error('Error en aprobarYPublicarTemporadaGDVAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al aprobar la temporada'
    }
  }
}

/**
 * Obtiene el estado actual de aprobación de los grupos de una temporada
 */
export async function obtenerEstadoAprobacionTemporada(temporadaId: string) {
  try {
    const supabase = await getPlannerSupabaseClient()
    const { data: gruposDB, error } = await supabase
      .from('grupos')
      .select('id, estado_aprobacion, estado_ciclo, activo')
      .eq('temporada_id', temporadaId)
      .neq('eliminado', true)

    if (error) {
      return { success: false, error: error.message }
    }

    const grupos = gruposDB || []
    const total = grupos.length
    const aprobados = grupos.filter((g: any) => g.estado_aprobacion === 'aprobado').length
    const pendientes = grupos.filter((g: any) => g.estado_aprobacion === 'pendiente' || !g.estado_aprobacion).length
    const enPlanificacion = grupos.filter((g: any) => g.estado_ciclo === 'planificacion').length
    const activos = grupos.filter((g: any) => g.estado_ciclo === 'activo').length

    return {
      success: true,
      total,
      aprobados,
      pendientes,
      enPlanificacion,
      activos,
      estaPublicada: total > 0 && aprobados === total && activos === total
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al consultar estado'
    }
  }
}


