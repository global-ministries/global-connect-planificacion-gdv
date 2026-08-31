import { 
  GrupoGDVPlanner, 
  PersonaPlanner, 
  AdvertenciaPlanificacion, 
  CiudadGDV, 
  SegmentoGDV 
} from './types'

/**
 * Valida todas las reglas pastorales sobre un conjunto de grupos y personas asignadas
 */
export function validarReglasPlanificacion(
  grupos: GrupoGDVPlanner[],
  todasLasPersonas: PersonaPlanner[]
): AdvertenciaPlanificacion[] {
  const advertencias: AdvertenciaPlanificacion[] = []

  // Mapa de persona_id -> grupo_id en el que está actualmente
  const asignacionPorPersona = new Map<string, { grupoId: string; rol: string }>()
  
  for (const grupo of grupos) {
    if (grupo.lider_principal) {
      asignacionPorPersona.set(grupo.lider_principal.id, { grupoId: grupo.id, rol: 'lider' })
    }
    if (grupo.co_lider) {
      asignacionPorPersona.set(grupo.co_lider.id, { grupoId: grupo.id, rol: 'co_lider' })
    }
    for (const ap of grupo.aprendices) {
      asignacionPorPersona.set(ap.id, { grupoId: grupo.id, rol: 'aprendiz' })
    }
    for (const m of grupo.miembros) {
      asignacionPorPersona.set(m.persona_id, { grupoId: grupo.id, rol: m.rol })
    }
  }

  // 1. REGLA: Validación individual por grupo
  for (const grupo of grupos) {
    const totalMiembros = (grupo.miembros?.length || 0) + 
      (grupo.lider_principal ? 1 : 0) + 
      (grupo.co_lider ? 1 : 0) + 
      (grupo.aprendices?.length || 0)

    // A) Falta de líder
    if (!grupo.lider_principal) {
      advertencias.push({
        id: `sin-lider-${grupo.id}`,
        tipo: 'sin_lider',
        nivel: 'error',
        mensaje: `El grupo "${grupo.nombre}" no tiene Líder Principal asignado.`,
        grupo_id: grupo.id
      })
    }

    // B) Sobrecupo
    if (totalMiembros > grupo.capacidad_maxima) {
      advertencias.push({
        id: `sobrecupo-${grupo.id}`,
        tipo: 'sobrecupo',
        nivel: 'warning',
        mensaje: `El grupo "${grupo.nombre}" excede la capacidad máxima recomendada (${totalMiembros}/${grupo.capacidad_maxima}).`,
        grupo_id: grupo.id
      })
    }

    // C) Bajo cupo (menos de 5 personas)
    if (totalMiembros > 0 && totalMiembros < 5) {
      advertencias.push({
        id: `bajo-cupo-${grupo.id}`,
        tipo: 'bajo_cupo',
        nivel: 'info',
        mensaje: `El grupo "${grupo.nombre}" cuenta con solo ${totalMiembros} miembros. Se recomienda un mínimo de 6.`,
        grupo_id: grupo.id
      })
    }

    // D) Incompatibilidad de Ciudad (Cabudare vs Barquisimeto)
    const todosLosIntegrantes = [
      grupo.lider_principal,
      grupo.co_lider,
      ...grupo.aprendices,
      ...grupo.miembros.map(m => m.persona)
    ].filter(Boolean) as PersonaPlanner[]

    for (const persona of todosLosIntegrantes) {
      if (persona.ciudad && grupo.ciudad && persona.ciudad !== 'Otro' && grupo.ciudad !== 'Otro') {
        if (persona.ciudad.toLowerCase() !== grupo.ciudad.toLowerCase()) {
          advertencias.push({
            id: `ciudad-incompatible-${grupo.id}-${persona.id}`,
            tipo: 'ciudad_incompatible',
            nivel: 'warning',
            mensaje: `${persona.nombre} ${persona.apellido} vive en ${persona.ciudad} pero está asignado a un grupo de ${grupo.ciudad}.`,
            grupo_id: grupo.id,
            persona_id: persona.id
          })
        }
      }
    }

    // E) Rotación de Líder: Verificar si algún miembro o aprendiz repite con su líder anterior
    if (grupo.lider_principal) {
      const liderActualId = grupo.lider_principal.id
      for (const m of grupo.miembros) {
        if (m.persona?.lider_anterior_id && m.persona.lider_anterior_id === liderActualId) {
          advertencias.push({
            id: `repite-lider-${grupo.id}-${m.persona_id}`,
            tipo: 'repite_lider',
            nivel: 'info',
            mensaje: `${m.persona.nombre} ${m.persona.apellido} repite con su líder anterior (${grupo.lider_principal.nombre} ${grupo.lider_principal.apellido}). Se recomienda rotación pastoral salvo excepción justificada.`,
            grupo_id: grupo.id,
            persona_id: m.persona_id
          })
        }
      }
    }
  }

  // 2. REGLA: Validación de Cónyuges en el mismo grupo
  const checkedCouples = new Set<string>()

  for (const persona of todasLasPersonas) {
    if (!persona.conyuge_id) continue

    const coupleKey = [persona.id, persona.conyuge_id].sort().join('-')
    if (checkedCouples.has(coupleKey)) continue
    checkedCouples.add(coupleKey)

    const conyuge = todasLasPersonas.find(p => p.id === persona.conyuge_id)
    const asigPersona = asignacionPorPersona.get(persona.id)
    const asigConyuge = asignacionPorPersona.get(persona.conyuge_id)

    // Ambos están asignados pero en grupos diferentes
    if (asigPersona && asigConyuge && asigPersona.grupoId !== asigConyuge.grupoId) {
      const grupo1 = grupos.find(g => g.id === asigPersona.grupoId)
      const grupo2 = grupos.find(g => g.id === asigConyuge.grupoId)

      advertencias.push({
        id: `conyuge-separado-${persona.id}-${persona.conyuge_id}`,
        tipo: 'conyuge_separado',
        nivel: 'error',
        mensaje: `Los cónyuges ${persona.nombre} (${grupo1?.nombre || 'Grupo A'}) y ${conyuge?.nombre || 'Cónyuge'} (${grupo2?.nombre || 'Grupo B'}) están asignados a GDVs distintos.`,
        persona_id: persona.id,
        persona_relacionada_id: persona.conyuge_id
      })
    }
  }

  return advertencias
}

/**
 * Genera el nombre oficial estándar para un GDV: [Ciudad] [Segmento] [Nº]
 */
export function generarNomenclaturaGDV(
  ciudad: CiudadGDV,
  segmento: SegmentoGDV,
  secuencia: number
): string {
  const formatearSegmento: Record<SegmentoGDV, string> = {
    matrimonios: 'Matrimonios',
    jovenes: 'Jóvenes',
    adultos: 'Adultos',
    profesionales: 'Profesionales',
    mixto: 'Mixto',
    mujeres: 'Mujeres',
    hombres: 'Hombres'
  }

  const segLabel = formatearSegmento[segmento] || 'General'
  const numStr = secuencia < 10 ? `0${secuencia}` : `${secuencia}`
  return `${ciudad} - ${segLabel} ${numStr}`
}
