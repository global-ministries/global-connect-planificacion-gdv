'use client'

import React, { useState, useEffect, useMemo, useTransition, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useNotificaciones } from '@/hooks/use-notificaciones'
import {
  ContenedorDashboard,
  TarjetaSistema,
  BotonSistema,
  InputSistema,
  BadgeSistema,
  TituloSistema,
  TextoSistema,
  SeparadorSistema
} from '@/components/ui/sistema-diseno'
import {
  PersonaPlanner,
  GrupoGDVPlanner,
  TemporadaPlanner,
  SegmentoInfo,
  AdvertenciaPlanificacion,
  SegmentoGDV,
  CiudadGDV,
  RolEnGrupo,
  ConfiguracionPlanificacion
} from '@/lib/planner/types'
import { validarReglasPlanificacion, generarNomenclaturaGDV } from '@/lib/planner/rules'
import {
  cargarWorkspacePlanificador,
  guardarAsignacionesGrupo,
  guardarPlanificacionCompleta,
  crearGrupoGDV,
  aprobarYPublicarTemporadaGDVAction
} from '@/lib/planner/actions'
import { PlannerOnboarding } from './planner-onboarding'
import { MemberCard } from '@/components/planner/member-card'
import { GroupCard } from '@/components/planner/group-card'
import { UnassignedDropZone } from '@/components/planner/unassigned-drop-zone'
import { ReassignmentModal } from '@/components/planner/reassignment-modal'
import { GroupEditModal } from '@/components/planner/group-edit-modal'
import { ChangelogDrawer, CambioPlanificacion } from '@/components/planner/changelog-drawer'
import { WarningsDrawer } from '@/components/planner/warnings-drawer'
import {
  Users,
  Search,
  AlertTriangle,
  Heart,
  MapPin,
  Shield,
  Plus,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  X,
  Layers,
  RotateCcw,
  Save,
  Check,
  Loader2,
  Columns2,
  Grid3X3,
  Rocket,
  ShieldCheck,
  Clock,
  Undo2,
  Redo2,
  History,
  Kanban,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil
} from 'lucide-react'

interface PlannerWorkspaceProps {
  temporadas: TemporadaPlanner[]
  segmentos: SegmentoInfo[]
  temporadaCierreDefecto: TemporadaPlanner | null
  temporadaPlanificarDefecto: TemporadaPlanner | null
  configuracionInicial?: ConfiguracionPlanificacion | null
  gruposIniciales: GrupoGDVPlanner[]
  personasIniciales: PersonaPlanner[]
  advertenciasIniciales: AdvertenciaPlanificacion[]
}

export function PlannerWorkspace({
  temporadas,
  segmentos,
  temporadaCierreDefecto,
  temporadaPlanificarDefecto,
  configuracionInicial,
  gruposIniciales,
  personasIniciales,
  advertenciasIniciales
}: PlannerWorkspaceProps) {
  const toast = useNotificaciones()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Función para persistir la configuración en cookie y localStorage
  const persistirConfiguracion = (cfg: ConfiguracionPlanificacion) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('gdv_planner_last_config', JSON.stringify(cfg))
        document.cookie = `gdv_planner_last_config=${encodeURIComponent(JSON.stringify(cfg))}; path=/; max-age=31536000; SameSite=Lax`
      }
    } catch (e) {
      console.error('Error al persistir configuracion:', e)
    }
  }

  // Configuración de Planificación (Segmento + Temporadas)
  const [configuracion, setConfiguracion] = useState<ConfiguracionPlanificacion>(() => {
    if (configuracionInicial) {
      return configuracionInicial
    }
    const tempCierre = temporadaCierreDefecto?.id || temporadas[0]?.id || ''
    const tempPlan = temporadaPlanificarDefecto?.id || temporadas[1]?.id || temporadas[0]?.id || ''
    const excluidas = temporadas
      .filter(t => t.es_activa && t.id !== tempCierre && t.id !== tempPlan)
      .map(t => t.id)
    return {
      segmentoId: 'todos',
      segmentoNombre: 'Todos los Segmentos',
      temporadaCierreId: tempCierre,
      temporadaPlanificarId: tempPlan,
      temporadasExcluidasIds: excluidas
    }
  })

  // Segmento enfocado en la vista actual ('todos' o el id de un segmento)
  const [segmentoActivoId, setSegmentoActivoId] = useState<string>('todos')

  // Control del Asistente Onboarding
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false)

  // Estado del Workspace
  const [grupos, setGrupos] = useState<GrupoGDVPlanner[]>(gruposIniciales)
  const [personas, setPersonas] = useState<PersonaPlanner[]>(personasIniciales)
  const [guardando, setGuardando] = useState(false)
  const [ultimoGuardado, setUltimoGuardado] = useState<string | null>(null)

  // Historial de Cambios y Motor de Deshacer / Rehacer (Undo / Redo)
  interface HistorySnapshot {
    grupos: GrupoGDVPlanner[]
    cambio: CambioPlanificacion
  }

  const [historyPast, setHistoryPast] = useState<HistorySnapshot[]>([])
  const [historyFuture, setHistoryFuture] = useState<HistorySnapshot[]>([])
  const [registroCambios, setRegistroCambios] = useState<CambioPlanificacion[]>([])
  const [drawerHistorialAbierto, setDrawerHistorialAbierto] = useState(false)
  const [drawerAdvertenciasAbierto, setDrawerAdvertenciasAbierto] = useState(false)
  const [savedHistoryIndex, setSavedHistoryIndex] = useState<number>(0)

  const cambiosSinGuardar = useMemo(() => {
    return Math.max(0, historyPast.length - savedHistoryIndex)
  }, [historyPast.length, savedHistoryIndex])

  const formatRolNombre = (r: RolEnGrupo | string) => {
    if (r === 'lider') return 'Líder'
    if (r === 'co_lider') return 'Co-líder'
    if (r === 'aprendiz') return 'Aprendiz'
    return 'Miembro'
  }

  // Registrar un cambio y actualizar el stack de Undo / Redo
  const registrarAccion = (
    gruposPrevios: GrupoGDVPlanner[],
    nuevosGrupos: GrupoGDVPlanner[],
    cambio: CambioPlanificacion
  ) => {
    setHistoryPast(prev => [...prev.slice(-40), { grupos: gruposPrevios, cambio }])
    setHistoryFuture([])
    setRegistroCambios(prev => [cambio, ...prev])
    setGrupos(nuevosGrupos)
  }

  const handleDeshacer = () => {
    if (historyPast.length === 0) return
    const ultimo = historyPast[historyPast.length - 1]
    const nuevoPast = historyPast.slice(0, -1)

    setHistoryFuture(prev => [{ grupos, cambio: ultimo.cambio }, ...prev])
    setHistoryPast(nuevoPast)
    // Al deshacer, se revierte la acción de la bitácora activa de cambios pendientes
    setRegistroCambios(prev => prev.filter(c => c.id !== ultimo.cambio.id))
    setGrupos(ultimo.grupos)
    toast.info(`Deshecho: ${ultimo.cambio.descripcion}`)
  }

  const handleRehacer = () => {
    if (historyFuture.length === 0) return
    const siguiente = historyFuture[0]
    const nuevoFuture = historyFuture.slice(1)

    setHistoryPast(prev => [...prev, { grupos, cambio: siguiente.cambio }])
    setHistoryFuture(nuevoFuture)
    setRegistroCambios(prev => [siguiente.cambio, ...prev.filter(c => c.id !== siguiente.cambio.id)])
    setGrupos(siguiente.grupos)
    toast.info(`Rehecho: ${siguiente.cambio.descripcion}`)
  }

  // Atajos de Teclado Globales (Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault()
          handleRehacer()
        } else {
          e.preventDefault()
          handleDeshacer()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        handleRehacer()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleGuardarCambios()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [historyPast, historyFuture, grupos, configuracion])

  // Modal para reasignación rápida asistida (por clic)
  const [personaParaMover, setPersonaParaMover] = useState<PersonaPlanner | null>(null)
  
  // Modo de visualización: 'trello' (tablero horizontal deslizable), 'grid' (grilla compacta), 'lado_a_lado' (comparativa territorial)
  const [modoVisualizacion, setModoVisualizacion] = useState<'trello' | 'grid' | 'lado_a_lado'>('trello')
  const [panelPersonasColapsado, setPanelPersonasColapsado] = useState(false)
  const [grupoParaEditar, setGrupoParaEditar] = useState<GrupoGDVPlanner | null>(null)
  const trelloScrollRef = useRef<HTMLDivElement>(null)

  // Filtros del Pool de Personas
  const [busqueda, setBusqueda] = useState('')
  const [filtroCiudad, setFiltroCiudad] = useState<string>('todas')
  const [filtroSegmento, setFiltroSegmento] = useState<string>('todos')
  const [filtroEdad, setFiltroEdad] = useState<string>('todas')
  const [edadMinCustom, setEdadMinCustom] = useState<string>('')
  const [edadMaxCustom, setEdadMaxCustom] = useState<string>('')
  const [soloSinAsignar, setSoloSinAsignar] = useState(true)
  const [soloConConyuge, setSoloConConyuge] = useState(false)

  // Filtros del Tablero Territorial (Barquisimeto vs Cabudare)
  const [ciudadTableroActiva, setCiudadTableroActiva] = useState<'todas' | 'Barquisimeto' | 'Cabudare'>('todas')
  const [filtroTableroSegmento, setFiltroTableroSegmento] = useState<string>('todos')

  // Modal para nuevo grupo
  const [modalNuevoGrupo, setModalNuevoGrupo] = useState(false)
  const [nuevoGrupoCiudad, setNuevoGrupoCiudad] = useState<CiudadGDV>('Barquisimeto')
  const [nuevoGrupoSegmento, setNuevoGrupoSegmento] = useState<string>(
    segmentos[0]?.id || 'seg-matrimonios'
  )
  const [nuevoGrupoZona, setNuevoGrupoZona] = useState('Este')

  // Modal para Aprobar y Publicar Temporada
  const [modalPublicar, setModalPublicar] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [estaPublicada, setEstaPublicada] = useState(false)
  const [activarTemporadaCheck, setActivarTemporadaCheck] = useState(false)

  // Nombres de temporadas actuales
  const temporadaPlanificarObj =
    temporadas.find(t => t.id === configuracion.temporadaPlanificarId) ||
    temporadaPlanificarDefecto ||
    temporadas[0]
  const temporadaCierreObj =
    temporadas.find(t => t.id === configuracion.temporadaCierreId) ||
    temporadaCierreDefecto ||
    temporadas[0]

  // Sincronizar / Hidratar configuración desde localStorage si difiere de la inicial
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('gdv_planner_last_config')
        if (stored) {
          const parsed = JSON.parse(stored) as ConfiguracionPlanificacion
          if (
            parsed.temporadaPlanificarId &&
            parsed.temporadaCierreId &&
            (parsed.temporadaPlanificarId !== configuracion.temporadaPlanificarId ||
              parsed.temporadaCierreId !== configuracion.temporadaCierreId ||
              parsed.segmentoId !== configuracion.segmentoId)
          ) {
            const existeCierre = temporadas.some(t => t.id === parsed.temporadaCierreId)
            const existePlan = temporadas.some(t => t.id === parsed.temporadaPlanificarId)
            if (existeCierre && existePlan) {
              setConfiguracion(parsed)
              setSegmentoActivoId(parsed.segmentoId || 'todos')
              setFiltroTableroSegmento(parsed.segmentoId || 'todos')
              document.cookie = `gdv_planner_last_config=${encodeURIComponent(JSON.stringify(parsed))}; path=/; max-age=31536000; SameSite=Lax`

              startTransition(async () => {
                const res = await cargarWorkspacePlanificador(parsed)
                if (res.success) {
                  setGrupos(res.grupos || [])
                  setPersonas(res.personas || [])
                }
              })
            }
          }
        }
      }
    } catch (err) {
      console.error('Error al restaurar configuración del planner:', err)
    }
  }, [])

  // Calcular asignaciones actuales
  const mapaAsignaciones = useMemo(() => {
    const map = new Map<string, { grupoId: string; grupoNombre: string; rol: string }>()
    for (const g of grupos) {
      if (g.lider_principal) {
        map.set(g.lider_principal.id, { grupoId: g.id, grupoNombre: g.nombre, rol: 'Líder' })
      }
      if (g.co_lider) {
        map.set(g.co_lider.id, { grupoId: g.id, grupoNombre: g.nombre, rol: 'Co-líder' })
      }
      for (const ap of g.aprendices) {
        map.set(ap.id, { grupoId: g.id, grupoNombre: g.nombre, rol: 'Aprendiz' })
      }
      for (const m of g.miembros) {
        map.set(m.persona_id, { grupoId: g.id, grupoNombre: g.nombre, rol: m.rol })
      }
    }
    return map
  }, [grupos])

  // Validaciones en tiempo real
  const advertencias = useMemo(() => {
    return validarReglasPlanificacion(grupos, personas)
  }, [grupos, personas])

  // Conteo de métricas territoriales (Barquisimeto vs Cabudare)
  const statsTerritoriales = useMemo(() => {
    let gruposBqto = 0
    let gruposCab = 0
    let miembrosBqto = 0
    let miembrosCab = 0

    for (const g of grupos) {
      const isCab = (g.ciudad || '').toLowerCase().includes('cabudare')
      const total =
        (g.miembros?.length || 0) +
        (g.lider_principal ? 1 : 0) +
        (g.co_lider ? 1 : 0) +
        (g.aprendices?.length || 0)

      if (isCab) {
        gruposCab++
        miembrosCab += total
      } else {
        gruposBqto++
        miembrosBqto += total
      }
    }

    const excepcionesRepeticion = advertencias.filter(a => a.tipo === 'repite_lider').length

    return {
      gruposBqto,
      gruposCab,
      miembrosBqto,
      miembrosCab,
      excepcionesRepeticion
    }
  }, [grupos, advertencias])

  // Helper de correspondencia de segmento para grupos
  const coincideSegmentoGrupo = (g: GrupoGDVPlanner, filtroSeg: string) => {
    if (!filtroSeg || filtroSeg === 'todos') return true
    
    // 1. Coincidencia directa por ID
    if (g.segmento_id && g.segmento_id === filtroSeg) return true

    const segObj = segmentos.find(s => s.id === filtroSeg || s.nombre.toLowerCase().trim() === filtroSeg.toLowerCase().trim())
    const segNombre = (segObj?.nombre || filtroSeg).toLowerCase().trim()
    const segId = (segObj?.id || filtroSeg).trim()

    const gSegId = (g.segmento_id || '').trim()
    const gSegNombre = (g.segmento_nombre || '').toLowerCase().trim()
    const gSegSlug = (g.segmento || '').toLowerCase().trim()
    const gNombre = (g.nombre || '').toLowerCase().trim()

    if (gSegId && gSegId === segId) return true
    if (gSegNombre && gSegNombre === segNombre) return true
    if (gSegSlug && gSegSlug === segNombre) return true

    // Analizar dimensiones del filtro
    const tiene36 = segNombre.includes('36') || segNombre.includes('+36')
    const tiene26_35 = segNombre.includes('26') || segNombre.includes('35')
    const tiene18_25 = segNombre.includes('18') || segNombre.includes('25')
    const esMatrimonio = segNombre.includes('matrimonio')
    const esJoven = segNombre.includes('joven')
    const esMujer = segNombre.includes('mujer')
    const esHombre = segNombre.includes('hombre') && !segNombre.includes('mujer')

    const textoCompletoGrupo = `${gNombre} ${gSegNombre} ${gSegSlug}`.toLowerCase()

    // Si el filtro es +36
    if (tiene36) {
      const grupoEs36 = textoCompletoGrupo.includes('36') || textoCompletoGrupo.includes('+36')
      if (!grupoEs36) return false
      if (esMujer) return textoCompletoGrupo.includes('mujer')
      if (esHombre) return textoCompletoGrupo.includes('hombre')
      return true
    }

    // Si el filtro es 26 a 35
    if (tiene26_35) {
      const grupoEs26_35 = (textoCompletoGrupo.includes('26') || textoCompletoGrupo.includes('35')) && !textoCompletoGrupo.includes('+36')
      if (!grupoEs26_35) return false
      if (esMujer) return textoCompletoGrupo.includes('mujer')
      if (esHombre) return textoCompletoGrupo.includes('hombre')
      return true
    }

    // Si el filtro es 18 a 25 / Jóvenes
    if (tiene18_25 || esJoven) {
      return (
        textoCompletoGrupo.includes('18') ||
        textoCompletoGrupo.includes('25') ||
        textoCompletoGrupo.includes('joven') ||
        textoCompletoGrupo.includes('universitario')
      )
    }

    // Matrimonios
    if (esMatrimonio) {
      return textoCompletoGrupo.includes('matrimonio')
    }

    // Profesionales
    if (segNombre.includes('profesional')) {
      return textoCompletoGrupo.includes('profesional')
    }

    // Mixto
    if (segNombre.includes('mixto')) {
      return textoCompletoGrupo.includes('mixto')
    }

    // Mujeres general (sin rango específico)
    if (esMujer) {
      return textoCompletoGrupo.includes('mujer')
    }

    // Hombres general (sin rango específico)
    if (esHombre) {
      return textoCompletoGrupo.includes('hombre')
    }

    if (gSegNombre && gSegNombre.includes(segNombre)) return true
    if (gNombre && gNombre.includes(segNombre)) return true

    return false
  }

  // Helper de correspondencia de segmento para personas
  const coincideSegmentoPersona = (p: PersonaPlanner, filtroSeg: string) => {
    if (!filtroSeg || filtroSeg === 'todos') return true

    if (p.segmento_id && p.segmento_id === filtroSeg) return true

    const segObj = segmentos.find(s => s.id === filtroSeg || s.nombre.toLowerCase().trim() === filtroSeg.toLowerCase().trim())
    const segNombre = (segObj?.nombre || filtroSeg).toLowerCase().trim()
    const segId = (segObj?.id || filtroSeg).trim()

    const pSegId = (p.segmento_id || '').trim()
    const pSegNombre = (p.segmento_nombre || '').toLowerCase().trim()
    const pSegSugerido = (p.segmento_sugerido || '').toLowerCase().trim()
    const textoPersona = `${pSegNombre} ${pSegSugerido}`.toLowerCase()

    if (pSegId && pSegId === segId) return true
    if (pSegNombre && pSegNombre === segNombre) return true

    const tiene36 = segNombre.includes('36') || segNombre.includes('+36')
    const tiene26_35 = segNombre.includes('26') || segNombre.includes('35')
    const tiene18_25 = segNombre.includes('18') || segNombre.includes('25')
    const esMatrimonio = segNombre.includes('matrimonio')
    const esJoven = segNombre.includes('joven')
    const esMujer = segNombre.includes('mujer')
    const esHombre = segNombre.includes('hombre') && !segNombre.includes('mujer')

    // Si el filtro es matrimonios
    if (esMatrimonio && p.conyuge_id) return true

    // Si el filtro es +36
    if (tiene36) {
      if (p.edad !== undefined && p.edad !== null) {
        if (p.edad < 36) return false
        if (esMujer && p.genero && p.genero.toLowerCase() !== 'femenino' && p.genero.toLowerCase() !== 'f') return false
        if (esHombre && p.genero && p.genero.toLowerCase() !== 'masculino' && p.genero.toLowerCase() !== 'm') return false
        return true
      }
      return textoPersona.includes('36') || textoPersona.includes('+36')
    }

    // Si el filtro es 26 a 35
    if (tiene26_35) {
      if (p.edad !== undefined && p.edad !== null) {
        if (p.edad < 26 || p.edad > 35) return false
        if (esMujer && p.genero && p.genero.toLowerCase() !== 'femenino' && p.genero.toLowerCase() !== 'f') return false
        if (esHombre && p.genero && p.genero.toLowerCase() !== 'masculino' && p.genero.toLowerCase() !== 'm') return false
        return true
      }
      return (textoPersona.includes('26') || textoPersona.includes('35')) && !textoPersona.includes('+36')
    }

    // Si el filtro es 18 a 25 / Jóvenes
    if (tiene18_25 || esJoven) {
      if (p.edad !== undefined && p.edad !== null) {
        return p.edad >= 18 && p.edad <= 25
      }
      return textoPersona.includes('18') || textoPersona.includes('25') || textoPersona.includes('joven')
    }

    if (esMujer && textoPersona.includes('mujer')) return true
    if (esHombre && textoPersona.includes('hombre')) return true

    if (pSegNombre && (pSegNombre === segNombre || pSegNombre.includes(segNombre) || segNombre.includes(pSegNombre))) return true
    if (pSegSugerido && (pSegSugerido === segNombre || pSegSugerido.includes(segNombre) || segNombre.includes(pSegSugerido))) return true

    return false
  }

  // Helper para obtener y validar edad de persona
  const obtenerEdadPersona = (p: PersonaPlanner): number | null => {
    if (p.edad !== undefined && p.edad !== null) return p.edad
    if (p.fecha_nacimiento) {
      const fn = new Date(p.fecha_nacimiento)
      if (!isNaN(fn.getTime())) {
        const hoy = new Date()
        let diff = hoy.getFullYear() - fn.getFullYear()
        const m = hoy.getMonth() - fn.getMonth()
        if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) {
          diff--
        }
        if (diff >= 0 && diff <= 120) return diff
      }
    }
    return null
  }

  // Helper de filtrado por rango de edad
  const coincideEdadPersona = (p: PersonaPlanner) => {
    if (filtroEdad === 'todas') return true
    const edad = obtenerEdadPersona(p)

    if (filtroEdad === 'sin-edad') {
      return edad === null
    }

    if (edad === null) {
      // Si la persona no tiene edad registrada, intentamos inferir por segmento de pertenencia o sugerido
      const texto = `${p.segmento_nombre || ''} ${p.segmento_sugerido || ''}`.toLowerCase()
      if (filtroEdad === '18-25' && (texto.includes('18') || texto.includes('25') || texto.includes('joven'))) return true
      if (filtroEdad === '26-35' && (texto.includes('26') || texto.includes('35'))) return true
      if (filtroEdad === '36-50' && (texto.includes('36') || texto.includes('+36') || texto.includes('adulto'))) return true
      if (filtroEdad === '51+' && (texto.includes('50') || texto.includes('51') || texto.includes('mayor') || texto.includes('senior') || texto.includes('dorado'))) return true
      return false
    }

    if (filtroEdad === '<18') return edad < 18
    if (filtroEdad === '18-25') return edad >= 18 && edad <= 25
    if (filtroEdad === '26-35') return edad >= 26 && edad <= 35
    if (filtroEdad === '36-50') return edad >= 36 && edad <= 50
    if (filtroEdad === '51+') return edad >= 51
    if (filtroEdad === 'custom') {
      const min = edadMinCustom ? parseInt(edadMinCustom, 10) : 0
      const max = edadMaxCustom ? parseInt(edadMaxCustom, 10) : 120
      if (!isNaN(min) && edad < min) return false
      if (!isNaN(max) && edad > max) return false
      return true
    }

    return true
  }

  // Filtrado de personas en el pool lateral
  const personasFiltradas = useMemo(() => {
    return personas.filter(p => {
      const nombreCompleto = `${p.nombre} ${p.apellido}`.toLowerCase()
      if (busqueda && !nombreCompleto.includes(busqueda.toLowerCase())) return false
      if (filtroCiudad !== 'todas' && p.ciudad !== filtroCiudad) return false
      if (filtroSegmento !== 'todos' && !coincideSegmentoPersona(p, filtroSegmento)) return false
      if (!coincideEdadPersona(p)) return false
      if (soloSinAsignar && mapaAsignaciones.has(p.id)) return false
      if (soloConConyuge && !p.conyuge_id) return false
      return true
    })
  }, [
    personas,
    busqueda,
    filtroCiudad,
    filtroSegmento,
    filtroEdad,
    edadMinCustom,
    edadMaxCustom,
    soloSinAsignar,
    soloConConyuge,
    mapaAsignaciones,
    segmentos
  ])

  // Grupos divididos por territorio
  const gruposBarquisimeto = useMemo(() => {
    return grupos.filter(g => {
      if ((g.ciudad || '').toLowerCase().includes('cabudare')) return false
      if (!coincideSegmentoGrupo(g, filtroTableroSegmento)) return false
      return true
    })
  }, [grupos, filtroTableroSegmento, segmentos])

  const gruposCabudare = useMemo(() => {
    return grupos.filter(g => {
      if (!(g.ciudad || '').toLowerCase().includes('cabudare')) return false
      if (!coincideSegmentoGrupo(g, filtroTableroSegmento)) return false
      return true
    })
  }, [grupos, filtroTableroSegmento, segmentos])

  // Grupos según la pestaña activa
  const gruposTablero = useMemo(() => {
    if (ciudadTableroActiva === 'Barquisimeto') return gruposBarquisimeto
    if (ciudadTableroActiva === 'Cabudare') return gruposCabudare
    return grupos.filter(g => coincideSegmentoGrupo(g, filtroTableroSegmento))
  }, [ciudadTableroActiva, grupos, gruposBarquisimeto, gruposCabudare, filtroTableroSegmento, segmentos])

  // Callback al completar el Onboarding
  const handleCompletarOnboarding = (
    nuevaConfig: ConfiguracionPlanificacion,
    modo: 'importar_cierre' | 'existente' | 'en_blanco'
  ) => {
    setConfiguracion(nuevaConfig)
    persistirConfiguracion(nuevaConfig)
    setSegmentoActivoId(nuevaConfig.segmentoId)
    setFiltroTableroSegmento(nuevaConfig.segmentoId)
    setMostrarOnboarding(false)

    startTransition(async () => {
      toast.info('Cargando contexto de planificación...')
      const res = await cargarWorkspacePlanificador({
        ...nuevaConfig,
        modoInicio: modo
      })

      if (res.success) {
        setGrupos(res.grupos || [])
        setPersonas(res.personas || [])
        toast.success(`Planificador listo para ${nuevaConfig.segmentoNombre}`)
      } else {
        toast.error(res.error || 'Error al cargar los datos')
      }
    })
  }

  // Asignar persona a un grupo con soporte pastoral de cónyuge y drag-and-drop
  const handleAsignar = (
    persona: PersonaPlanner,
    grupoId: string,
    rol: RolEnGrupo = 'miembro',
    arrastrarConyuge: boolean = true
  ) => {
    const grupoDestino = grupos.find(g => g.id === grupoId)
    const grupoOrigen = grupos.find(
      g =>
        g.lider_principal?.id === persona.id ||
        g.co_lider?.id === persona.id ||
        g.aprendices.some(ap => ap.id === persona.id) ||
        g.miembros.some(m => m.persona_id === persona.id)
    )

    const esGrupoMatrimonios =
      (grupoDestino?.segmento_nombre || '').toLowerCase().includes('matrimonio') ||
      (grupoDestino?.nombre || '').toLowerCase().includes('matrimonio') ||
      grupoDestino?.segmento === 'matrimonios'

    const conyuge = persona.conyuge_id ? personas.find(p => p.id === persona.conyuge_id) : null
    const debeIncluirConyuge = (arrastrarConyuge || esGrupoMatrimonios) && Boolean(conyuge)

    const personasAAsignar = [persona]
    if (debeIncluirConyuge && conyuge) {
      personasAAsignar.push(conyuge)
    }

    const idsToRemove = new Set(personasAAsignar.map(p => p.id))

    // Limpiar a las personas de cualquier asignación previa en todos los grupos
    const gruposLimpios = grupos.map(g => ({
      ...g,
      lider_principal: g.lider_principal && idsToRemove.has(g.lider_principal.id) ? null : g.lider_principal,
      co_lider: g.co_lider && idsToRemove.has(g.co_lider.id) ? null : g.co_lider,
      aprendices: g.aprendices.filter(ap => !idsToRemove.has(ap.id)),
      miembros: g.miembros.filter(m => !idsToRemove.has(m.persona_id))
    }))

    const nuevosGrupos = gruposLimpios.map(g => {
      if (g.id !== grupoId) return g

      if (rol === 'lider') {
        // Si es grupo de matrimonios o la persona tiene cónyuge, asignar como pareja de líderes
        if (debeIncluirConyuge && conyuge) {
          return {
            ...g,
            lider_principal: persona,
            co_lider: conyuge
          }
        }
        return { ...g, lider_principal: persona }
      }

      if (rol === 'co_lider') {
        return { ...g, co_lider: persona }
      }

      if (rol === 'aprendiz') {
        const aprendicesRestantes = g.aprendices.filter(ap => !idsToRemove.has(ap.id))
        if (debeIncluirConyuge && conyuge) {
          return {
            ...g,
            aprendices: [...aprendicesRestantes, persona, conyuge]
          }
        }
        return { ...g, aprendices: [...aprendicesRestantes, persona] }
      }

      // Rol miembro
      const miembrosRestantes = g.miembros.filter(m => !idsToRemove.has(m.persona_id))
      const nuevosMiembros = [...miembrosRestantes]
      for (const p of personasAAsignar) {
        nuevosMiembros.push({
          persona_id: p.id,
          persona: p,
          rol: 'miembro'
        })
      }
      return { ...g, miembros: nuevosMiembros }
    })

    const nombresPersonas = debeIncluirConyuge && conyuge
      ? `${persona.nombre} ${persona.apellido} y ${conyuge.nombre} ${conyuge.apellido}`
      : `${persona.nombre} ${persona.apellido}`

    const esMover = Boolean(grupoOrigen && grupoOrigen.id !== grupoId)
    const descripcion = esMover
      ? `Movió a ${nombresPersonas} de "${grupoOrigen?.nombre}" a "${grupoDestino?.nombre || 'grupo'}" (${formatRolNombre(rol)})`
      : `Asignó a ${nombresPersonas} en "${grupoDestino?.nombre || 'grupo'}" como ${formatRolNombre(rol)}`

    const nuevoCambio: CambioPlanificacion = {
      id: `chg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tipo: esMover ? 'mover' : 'asignar',
      descripcion,
      timestamp: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      personaNombre: nombresPersonas,
      grupoOrigenNombre: grupoOrigen?.nombre,
      grupoDestinoNombre: grupoDestino?.nombre,
      rol: formatRolNombre(rol),
      guardadoEnBD: false
    }

    registrarAccion(grupos, nuevosGrupos, nuevoCambio)

    if (persona.conyuge_id && (arrastrarConyuge || rol === 'lider' || rol === 'aprendiz')) {
      toast.info(`Asignado junto a su cónyuge para preservar la unidad del matrimonio`)
    }
  }

  // Quitar persona de un grupo (soltar en el banco de personas)
  const handleDesasignar = (personaId: string) => {
    const persona = personas.find(p => p.id === personaId)
    const conyuge = persona?.conyuge_id ? personas.find(p => p.id === persona.conyuge_id) : null
    const grupoOrigen = grupos.find(
      g =>
        g.lider_principal?.id === personaId ||
        g.co_lider?.id === personaId ||
        g.aprendices.some(ap => ap.id === personaId) ||
        g.miembros.some(m => m.persona_id === personaId)
    )

    const idsToRemove = new Set([personaId])
    if (persona?.conyuge_id) {
      idsToRemove.add(persona.conyuge_id)
    }

    const nuevosGrupos = grupos.map(g => ({
      ...g,
      lider_principal: g.lider_principal && idsToRemove.has(g.lider_principal.id) ? null : g.lider_principal,
      co_lider: g.co_lider && idsToRemove.has(g.co_lider.id) ? null : g.co_lider,
      aprendices: g.aprendices.filter(ap => !idsToRemove.has(ap.id)),
      miembros: g.miembros.filter(m => !idsToRemove.has(m.persona_id))
    }))

    const nombresPersonas = conyuge
      ? `${persona?.nombre} ${persona?.apellido} y ${conyuge.nombre} ${conyuge.apellido}`
      : `${persona?.nombre} ${persona?.apellido}`

    const nuevoCambio: CambioPlanificacion = {
      id: `chg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tipo: 'desasignar',
      descripcion: `Desasignó a ${nombresPersonas} de "${grupoOrigen?.nombre || 'grupo'}" al banco de personas`,
      timestamp: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      personaNombre: nombresPersonas,
      grupoOrigenNombre: grupoOrigen?.nombre,
      guardadoEnBD: false
    }

    registrarAccion(grupos, nuevosGrupos, nuevoCambio)
  }

  // Crear nuevo GDV con persistencia en DB
  const handleCrearGrupo = async () => {
    const segNombre = segmentos.find(s => s.id === nuevoGrupoSegmento)?.nombre || 'General'
    const secuencia = grupos.filter(g => g.ciudad === nuevoGrupoCiudad).length + 1
    const nombreOficial = generarNomenclaturaGDV(nuevoGrupoCiudad, segNombre as SegmentoGDV, secuencia)

    const res = await crearGrupoGDV(
      configuracion.temporadaPlanificarId,
      nuevoGrupoSegmento,
      nuevoGrupoCiudad,
      segNombre,
      nuevoGrupoZona,
      secuencia
    )

    const nuevo: GrupoGDVPlanner = {
      id: res.success && res.data ? res.data.id : `g-${Date.now()}`,
      temporada_id: configuracion.temporadaPlanificarId,
      segmento_id: nuevoGrupoSegmento,
      segmento_nombre: segNombre,
      nombre: res.success && res.data ? res.data.nombre : nombreOficial,
      ciudad: nuevoGrupoCiudad,
      segmento: segNombre.toLowerCase() as SegmentoGDV,
      zona: nuevoGrupoZona,
      capacidad_maxima: 12,
      estado: 'planificacion',
      aprendices: [],
      miembros: []
    }

    const nuevoCambio: CambioPlanificacion = {
      id: `chg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tipo: 'crear_grupo',
      descripcion: `Creó el nuevo grupo "${nuevo.nombre}" (${nuevo.ciudad} - ${nuevo.zona})`,
      timestamp: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      grupoDestinoNombre: nuevo.nombre,
      guardadoEnBD: false
    }

    registrarAccion(grupos, [...grupos, nuevo], nuevoCambio)
    setModalNuevoGrupo(false)
    toast.success(`Grupo "${nuevo.nombre}" creado exitosamente`)
  }

  // Desplazamiento horizontal suave del tablero Trello
  const scrollTrello = (direccion: 'left' | 'right') => {
    if (!trelloScrollRef.current) return
    const offset = direccion === 'left' ? -380 : 380
    trelloScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  // Reordenar columnas de grupos como en Trello
  const handleReordenarGrupos = (sourceId: string, targetId: string) => {
    const sourceIdx = grupos.findIndex(g => g.id === sourceId)
    const targetIdx = grupos.findIndex(g => g.id === targetId)
    if (sourceIdx < 0 || targetIdx < 0 || sourceIdx === targetIdx) return

    const nuevosGrupos = [...grupos]
    const [grupoMovido] = nuevosGrupos.splice(sourceIdx, 1)
    nuevosGrupos.splice(targetIdx, 0, grupoMovido)

    const nuevoCambio: CambioPlanificacion = {
      id: `chg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tipo: 'mover',
      descripcion: `Reordenó la tarjeta de "${grupoMovido.nombre}" a la columna #${targetIdx + 1}`,
      timestamp: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      grupoDestinoNombre: grupoMovido.nombre,
      guardadoEnBD: false
    }

    registrarAccion(grupos, nuevosGrupos, nuevoCambio)
  }

  // Mover tarjeta a la izquierda (1 clic)
  const handleMoverGrupoIzquierda = (grupoId: string) => {
    const idx = grupos.findIndex(g => g.id === grupoId)
    if (idx <= 0) return
    const targetId = grupos[idx - 1].id
    handleReordenarGrupos(grupoId, targetId)
  }

  // Mover tarjeta a la derecha (1 clic)
  const handleMoverGrupoDerecha = (grupoId: string) => {
    const idx = grupos.findIndex(g => g.id === grupoId)
    if (idx < 0 || idx >= grupos.length - 1) return
    const targetId = grupos[idx + 1].id
    handleReordenarGrupos(grupoId, targetId)
  }

  // Guardar grupo editado desde el modal rápido
  const handleGuardarGrupoEditado = (grupoActualizado: GrupoGDVPlanner) => {
    const nuevosGrupos = grupos.map(g => (g.id === grupoActualizado.id ? grupoActualizado : g))
    const nuevoCambio: CambioPlanificacion = {
      id: `chg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tipo: 'otro',
      descripcion: `Actualizó datos y capacidad del grupo "${grupoActualizado.nombre}"`,
      timestamp: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      grupoDestinoNombre: grupoActualizado.nombre,
      guardadoEnBD: false
    }
    registrarAccion(grupos, nuevosGrupos, nuevoCambio)
    toast.success(`Grupo "${grupoActualizado.nombre}" actualizado`)
  }

  // Duplicar grupo (Clonar configuración y estructura para nueva GDV)
  const handleDuplicarGrupo = (grupoOriginal: GrupoGDVPlanner) => {
    const baseNombre = grupoOriginal.nombre.replace(/\s+\d+$/, '')
    const conteo = grupos.filter(g => g.nombre.startsWith(baseNombre)).length
    const nuevoNombre = `${baseNombre} ${conteo + 1}`

    const nuevo: GrupoGDVPlanner = {
      id: `gdv-clon-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      temporada_id: configuracion.temporadaPlanificarId,
      segmento_id: grupoOriginal.segmento_id,
      segmento: grupoOriginal.segmento,
      segmento_nombre: grupoOriginal.segmento_nombre,
      nombre: nuevoNombre,
      ciudad: grupoOriginal.ciudad,
      zona: grupoOriginal.zona,
      sector: grupoOriginal.sector,
      capacidad_maxima: grupoOriginal.capacidad_maxima,
      estado: 'planificacion',
      lider_principal: null,
      co_lider: null,
      aprendices: [],
      miembros: []
    }

    const nuevoCambio: CambioPlanificacion = {
      id: `chg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tipo: 'crear_grupo',
      descripcion: `Duplicó configuración de grupo creando "${nuevo.nombre}" (${nuevo.ciudad})`,
      timestamp: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      grupoDestinoNombre: nuevo.nombre,
      guardadoEnBD: false
    }

    registrarAccion(grupos, [...grupos, nuevo], nuevoCambio)
    toast.success(`Grupo clonado: "${nuevo.nombre}"`)
  }

  // Eliminar grupo y liberar a sus integrantes al banco
  const handleEliminarGrupo = (grupoId: string) => {
    const grupoAEliminar = grupos.find(g => g.id === grupoId)
    if (!grupoAEliminar) return

    const nuevosGrupos = grupos.filter(g => g.id !== grupoId)
    const totalLiberados =
      (grupoAEliminar.miembros?.length || 0) +
      (grupoAEliminar.lider_principal ? 1 : 0) +
      (grupoAEliminar.co_lider ? 1 : 0) +
      (grupoAEliminar.aprendices?.length || 0)

    const nuevoCambio: CambioPlanificacion = {
      id: `chg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tipo: 'desasignar',
      descripcion: `Eliminó el grupo "${grupoAEliminar.nombre}" (${totalLiberados} personas liberadas al banco)`,
      timestamp: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      grupoOrigenNombre: grupoAEliminar.nombre,
      guardadoEnBD: false
    }

    registrarAccion(grupos, nuevosGrupos, nuevoCambio)
    toast.success(`Grupo "${grupoAEliminar.nombre}" eliminado del tablero`)
  }

  // Asignar persona directamente desde modal o selectores
  const handleAsignarPersonaDirecto = (persona: PersonaPlanner, grupoId: string, rol: RolEnGrupo = 'miembro') => {
    handleAsignar(persona, grupoId, rol, true)
  }

  // Guardar todas las asignaciones para persistencia y colaboración multi-director
  const handleGuardarCambios = async () => {
    setGuardando(true)
    try {
      // 1. Guardar la planificación completa en la temporada destino (como pendiente / borrador de temporada)
      const res = await guardarPlanificacionCompleta(
        configuracion.temporadaPlanificarId,
        grupos
      )

      if (res.success) {
        // 2. Si se crearon o asignaron nuevos IDs de grupo en la temporada destino, actualizar el estado
        if (res.gruposActualizados && res.gruposActualizados.length > 0) {
          const mapIds = new Map<string, string>()
          for (const u of res.gruposActualizados) {
            mapIds.set(u.idViejo, u.idNuevo)
          }
          setGrupos(prev =>
            prev.map(g => {
              const idNuevo = mapIds.get(g.id)
              return idNuevo
                ? { ...g, id: idNuevo, temporada_id: configuracion.temporadaPlanificarId }
                : g
            })
          )
        }

        // 3. Persistir la configuración activa en cookie y localStorage
        persistirConfiguracion(configuracion)

        // 4. Marcar todos los cambios registrados como guardados en BD y actualizar punto de control
        setSavedHistoryIndex(historyPast.length)
        setRegistroCambios(prev => prev.map(c => ({ ...c, guardadoEnBD: true })))

        const horaActual = new Date().toLocaleTimeString('es-VE', {
          hour: '2-digit',
          minute: '2-digit'
        })
        setUltimoGuardado(horaActual)
        toast.success(
          `Planificación guardada en borrador (${res.gruposGuardados || grupos.length} grupos en estado pendiente). Usa 'Publicar Temporada' cuando esté lista.`
        )
      } else {
        toast.error(res.error || 'Error al guardar la planificación')
      }
    } catch (err) {
      console.error('Error al guardar asignaciones:', err)
      toast.error('Ocurrió un error al guardar la planificación')
    } finally {
      setGuardando(false)
    }
  }

  // Publicar y Aprobar oficialmente todos los grupos de la temporada planificada
  const handlePublicarTemporada = async () => {
    setPublicando(true)
    try {
      // 1. Primero asegurar que los últimos cambios en memoria estén guardados en la BD
      const resGuardar = await guardarPlanificacionCompleta(
        configuracion.temporadaPlanificarId,
        grupos
      )

      if (!resGuardar.success) {
        toast.error(resGuardar.error || 'Error al sincronizar cambios antes de publicar')
        setPublicando(false)
        return
      }

      // 2. Ejecutar la aprobación y publicación de todos los grupos
      const resPublicar = await aprobarYPublicarTemporadaGDVAction(
        configuracion.temporadaPlanificarId,
        activarTemporadaCheck
      )

      if (resPublicar.success) {
        setEstaPublicada(true)
        setModalPublicar(false)
        setSavedHistoryIndex(historyPast.length)
        setRegistroCambios(prev => prev.map(c => ({ ...c, guardadoEnBD: true })))
        setGrupos(prev => prev.map(g => ({ ...g, estado: 'activo' })))
        toast.success(
          `¡Temporada ${temporadaPlanificarObj?.nombre || ''} publicada con éxito! ${resPublicar.totalAprobados} grupos aprobados y activados ministerialmente.`
        )
      } else {
        toast.error(resPublicar.error || 'Error al publicar y aprobar la temporada')
      }
    } catch (err) {
      console.error('Error al publicar temporada:', err)
      toast.error('Ocurrió un error al publicar la temporada')
    } finally {
      setPublicando(false)
    }
  }

  return (
    <ContenedorDashboard
      titulo="GDV Planner"
      breadcrumbs={
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/grupos-vida" className="hover:text-foreground transition-colors">
            Grupos de Vida
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">Planificación de GDV</span>
        </div>
      }
      accionPrincipal={
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
          {/* Controles de Deshacer / Rehacer */}
          <div className="flex items-center bg-card border border-border rounded-xl p-0.5 gap-0.5 shadow-sm shrink-0">
            <button
              onClick={handleDeshacer}
              disabled={historyPast.length === 0}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${
                historyPast.length > 0
                  ? 'text-foreground hover:bg-muted active:scale-95'
                  : 'text-muted-foreground/40 cursor-not-allowed'
              }`}
              title="Deshacer último cambio (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline">Deshacer</span>
            </button>

            <button
              onClick={handleRehacer}
              disabled={historyFuture.length === 0}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${
                historyFuture.length > 0
                  ? 'text-foreground hover:bg-muted active:scale-95'
                  : 'text-muted-foreground/40 cursor-not-allowed'
              }`}
              title="Rehacer cambio (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline">Rehacer</span>
            </button>
          </div>

          {/* Botón de Historial de Cambios */}
          <BotonSistema
            variante={cambiosSinGuardar > 0 ? "outline" : "ghost"}
            tamaño="sm"
            icono={History}
            onClick={() => setDrawerHistorialAbierto(true)}
            className="min-h-0 h-8 text-xs px-2 sm:px-2.5 whitespace-nowrap shrink-0"
            title="Historial de cambios y movimientos"
          >
            <span className="hidden xl:inline">Historial</span>
            {cambiosSinGuardar > 0 ? (
              <BadgeSistema variante="warning" tamaño="sm" className="ml-1 px-1.5 py-0 text-[10px]">
                {cambiosSinGuardar}
              </BadgeSistema>
            ) : registroCambios.length > 0 ? (
              <span className="hidden xl:inline ml-1 text-[11px] text-muted-foreground">({registroCambios.length})</span>
            ) : null}
          </BotonSistema>

          <BotonSistema
            variante="outline"
            tamaño="sm"
            icono={Sparkles}
            onClick={() => setMostrarOnboarding(true)}
            className="min-h-0 h-8 text-xs px-2 sm:px-2.5 whitespace-nowrap shrink-0"
            title="Asistente de planificación pastoral"
          >
            <span className="hidden xl:inline">Asistente</span>
          </BotonSistema>

          <BotonSistema
            variante={cambiosSinGuardar > 0 ? "primario" : "outline"}
            tamaño="sm"
            icono={guardando ? Loader2 : Save}
            cargando={guardando}
            onClick={handleGuardarCambios}
            className={`min-h-0 h-8 text-xs px-2 sm:px-2.5 xl:px-3 whitespace-nowrap shrink-0 ${cambiosSinGuardar > 0 ? 'animate-pulse' : ''}`}
            title="Guardar cambios de la planificación"
          >
            <span className="xl:hidden">
              {cambiosSinGuardar > 0 ? `Guardar (${cambiosSinGuardar})` : 'Guardar'}
            </span>
            <span className="hidden xl:inline">
              {cambiosSinGuardar > 0 ? `Guardar (${cambiosSinGuardar})` : 'Guardar Planificación'}
            </span>
          </BotonSistema>

          <BotonSistema
            variante={estaPublicada ? "secundario" : "primario"}
            tamaño="sm"
            icono={publicando ? Loader2 : Rocket}
            cargando={publicando}
            onClick={() => setModalPublicar(true)}
            className="min-h-0 h-8 text-xs px-2 sm:px-2.5 xl:px-3 whitespace-nowrap shrink-0"
            title="Publicar temporada planificada"
          >
            <span className="xl:hidden">
              {estaPublicada ? 'Republicar' : 'Publicar'}
            </span>
            <span className="hidden xl:inline">
              {estaPublicada ? 'Republicar' : 'Publicar Temporada'}
            </span>
          </BotonSistema>
        </div>
      }
    >
      {/* BANNER CONTEXTUAL Y ESTADO DE COLABORACIÓN */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Origen:
              </span>
              <BadgeSistema variante="default" tamaño="sm">
                {temporadaCierreObj?.nombre || '2025-II'}
              </BadgeSistema>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Planificando:
              </span>
              <BadgeSistema variante="info" tamaño="sm">
                {temporadaPlanificarObj?.nombre || '2026-II'}
              </BadgeSistema>
              <span className="text-xs text-muted-foreground">• Segmento:</span>
              <BadgeSistema variante="warning" tamaño="sm">
                {configuracion.segmentoNombre}
              </BadgeSistema>
              
              {/* Badge de estado de la temporada */}
              {estaPublicada ? (
                <BadgeSistema variante="success" tamaño="sm" className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Aprobada & Activa
                </BadgeSistema>
              ) : (
                <BadgeSistema variante="warning" tamaño="sm" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Borrador (Pendiente de Aprobación)
                </BadgeSistema>
              )}

              {ultimoGuardado && (
                <span className="text-xs text-emerald-500 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Check className="w-3 h-3" />
                  Sincronizado {ultimoGuardado}
                </span>
              )}
            </div>
            <TextoSistema variante="sutil" tamaño="sm" className="mt-0.5">
              Los grupos se guardan como <strong className="text-amber-500">Pendientes</strong> para no interferir con la operación activa. Al finalizar, pulsa <strong className="text-primary">"Publicar Temporada"</strong> para aprobarlos y activarlos en masa.
            </TextoSistema>
          </div>
        </div>

        <BotonSistema
          variante="ghost"
          tamaño="sm"
          icono={RotateCcw}
          onClick={() => setMostrarOnboarding(true)}
        >
          Reconfigurar / Diagnóstico
        </BotonSistema>
      </div>

      {/* BARRA DE ESTADO Y MÉTRICAS TERRITORIALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <TarjetaSistema variante="default" className="p-4 flex items-center justify-between">
          <div>
            <TextoSistema variante="sutil" tamaño="sm">Barquisimeto</TextoSistema>
            <div className="text-xl font-bold text-foreground mt-1">
              {statsTerritoriales.gruposBqto} GDVs <span className="text-sm font-normal text-muted-foreground">({statsTerritoriales.miembrosBqto} miemb.)</span>
            </div>
          </div>
          <MapPin className="w-6 h-6 text-primary" />
        </TarjetaSistema>

        <TarjetaSistema variante="default" className="p-4 flex items-center justify-between">
          <div>
            <TextoSistema variante="sutil" tamaño="sm">Cabudare</TextoSistema>
            <div className="text-xl font-bold text-foreground mt-1">
              {statsTerritoriales.gruposCab} GDVs <span className="text-sm font-normal text-muted-foreground">({statsTerritoriales.miembrosCab} miemb.)</span>
            </div>
          </div>
          <MapPin className="w-6 h-6 text-emerald-400" />
        </TarjetaSistema>

        <TarjetaSistema variante="default" className="p-4 flex items-center justify-between">
          <div>
            <TextoSistema variante="sutil" tamaño="sm">Total Asignados</TextoSistema>
            <div className="text-xl font-bold text-foreground mt-1">
              {mapaAsignaciones.size} / {personas.length}
            </div>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </TarjetaSistema>

        <TarjetaSistema
          variante="default"
          onClick={() => setDrawerAdvertenciasAbierto(true)}
          className={`p-4 flex items-center justify-between cursor-pointer hover:border-amber-500/50 transition-all group ${
            statsTerritoriales.excepcionesRepeticion > 0 || advertencias.length > 0
              ? 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10'
              : 'hover:bg-muted/30'
          }`}
          title="Clic para abrir el centro de auditoría y diagnósticos pastorales"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <TextoSistema variante="sutil" tamaño="sm">Auditoría & Reglas</TextoSistema>
              <span className="text-[10px] text-primary group-hover:underline">Ver panel →</span>
            </div>
            <div className="text-xl font-bold text-foreground mt-1 flex items-center gap-1.5">
              {advertencias.length > 0 ? (
                <>
                  <span
                    className={
                      advertencias.some(a => a.nivel === 'error') ? 'text-destructive' : 'text-amber-500'
                    }
                  >
                    {advertencias.length}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {advertencias.some(a => a.nivel === 'error') ? 'alertas (críticas)' : 'observaciones'}
                  </span>
                </>
              ) : (
                <span className="text-emerald-500 text-base font-medium">100% Sin Alertas</span>
              )}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-card border border-border/60 group-hover:bg-amber-500/15 group-hover:border-amber-500/30 transition-colors">
            <AlertTriangle
              className={`w-5 h-5 ${
                advertencias.some(a => a.nivel === 'error')
                  ? 'text-destructive'
                  : advertencias.length > 0
                    ? 'text-amber-500'
                    : 'text-emerald-500'
              }`}
            />
          </div>
        </TarjetaSistema>
      </div>

      {/* WORKSPACE PRINCIPAL (TABLERO HORIZONTAL TRELLO + BANCO DE PERSONAS) */}
      <div className="space-y-4">
        
        {/* BARRA DE HERRAMIENTAS DEL TABLERO (VISTAS, TERRITORIOS Y CONTROLES DE DESPLAZAMIENTO) */}
        <div className="p-3 rounded-2xl bg-card/80 border border-border flex flex-wrap items-center justify-between gap-3 shadow-sm">
          
          {/* Lado Izquierdo: Pestañas Territoriales & Toggle del Banco de Personas */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Toggle de Banco de Personas */}
            <button
              onClick={() => setPanelPersonasColapsado(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                panelPersonasColapsado
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              }`}
              title={panelPersonasColapsado ? 'Mostrar Banco de Personas' : 'Ocultar Banco para maximizar espacio'}
            >
              {panelPersonasColapsado ? (
                <PanelLeftOpen className="w-4 h-4 text-primary" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
              )}
              <span>{panelPersonasColapsado ? 'Abrir Banco' : 'Ocultar Banco'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-mono">
                {personasFiltradas.length}
              </span>
            </button>

            <div className="h-4 w-[1px] bg-border/60 mx-1 hidden sm:block" />

            {/* Pestañas Territoriales */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
              <button
                onClick={() => setCiudadTableroActiva('todas')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  ciudadTableroActiva === 'todas'
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>🌐 Todos</span>
                <span className="text-[10px] opacity-70">({grupos.length})</span>
              </button>

              <button
                onClick={() => setCiudadTableroActiva('Barquisimeto')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  ciudadTableroActiva === 'Barquisimeto'
                    ? 'bg-primary/10 text-primary shadow-sm border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Barquisimeto</span>
                <span className="text-[10px] opacity-70">({statsTerritoriales.gruposBqto})</span>
              </button>

              <button
                onClick={() => setCiudadTableroActiva('Cabudare')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  ciudadTableroActiva === 'Cabudare'
                    ? 'bg-emerald-500/10 text-emerald-400 shadow-sm border border-emerald-500/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cabudare</span>
                <span className="text-[10px] opacity-70">({statsTerritoriales.gruposCab})</span>
              </button>
            </div>

            {/* Acceso Rápido al Centro de Auditoría */}
            <button
              onClick={() => setDrawerAdvertenciasAbierto(true)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                advertencias.some(a => a.nivel === 'error')
                  ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20'
                  : advertencias.length > 0
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'
              }`}
              title="Abrir Centro de Auditoría y Diagnóstico de Reglas"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Auditoría</span>
              {advertencias.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-card/80 text-[10px] font-bold border border-border/40">
                  {advertencias.length}
                </span>
              )}
            </button>
          </div>

          {/* Lado Derecho: Modos de Vista & Navegación Horizontal */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Controles de deslizamiento horizontal (solo en vista Trello) */}
            {modoVisualizacion === 'trello' && (
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 mr-1">
                <button
                  onClick={() => scrollTrello('left')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card flex items-center gap-1 transition-colors"
                  title="Deslizar a la izquierda"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Anterior</span>
                </button>
                <button
                  onClick={() => scrollTrello('right')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card flex items-center gap-1 transition-colors"
                  title="Deslizar a la derecha"
                >
                  <span className="hidden md:inline">Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Selector de Modo de Vista */}
            <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/40 gap-0.5">
              <button
                onClick={() => setModoVisualizacion('trello')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  modoVisualizacion === 'trello'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Vista Tablero Horizontal estilo Trello (Deslizable)"
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Tablero Trello</span>
              </button>

              <button
                onClick={() => setModoVisualizacion('grid')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  modoVisualizacion === 'grid'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Vista Cuadrícula Compacta"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>Cuadrícula</span>
              </button>

              <button
                onClick={() => setModoVisualizacion('lado_a_lado')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  modoVisualizacion === 'lado_a_lado'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Vista Comparativa Lado a Lado"
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Lado a Lado</span>
              </button>
            </div>

            {/* Filtro de Segmento */}
            <select
              value={filtroTableroSegmento}
              onChange={e => setFiltroTableroSegmento(e.target.value)}
              className="bg-card text-foreground border border-border rounded-xl text-xs p-1.5 focus:outline-none"
            >
              <option value="todos">Todos los segmentos</option>
              {segmentos.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>

            {/* Botón rápido "+ GDV" */}
            <button
              onClick={() => {
                if (ciudadTableroActiva !== 'todas') setNuevoGrupoCiudad(ciudadTableroActiva)
                setModalNuevoGrupo(true)
              }}
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo GDV</span>
            </button>
          </div>
        </div>

        {/* CONTENEDOR FLEX PRINCIPAL (BANCO + TABLERO) */}
        <div className="flex gap-5 items-start">
          
          {/* PANEL LATERAL: BANCO DE PERSONAS DISPONIBLES */}
          {!panelPersonasColapsado && (
            <div className="w-80 sm:w-88 shrink-0 space-y-4 animate-in fade-in duration-200">
              <UnassignedDropZone
                totalDisponibles={personasFiltradas.length}
                onDesasignar={handleDesasignar}
              >
                {/* Búsqueda y Filtros Rápidos */}
                <div className="space-y-3">
                  <InputSistema
                    label=""
                    placeholder="Buscar por nombre..."
                    icono={Search}
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <select
                      value={filtroCiudad}
                      onChange={e => setFiltroCiudad(e.target.value)}
                      className="bg-card text-foreground border border-border rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="todas">Todas las ciudades</option>
                      <option value="Barquisimeto">Barquisimeto</option>
                      <option value="Cabudare">Cabudare</option>
                    </select>

                    <select
                      value={filtroSegmento}
                      onChange={e => setFiltroSegmento(e.target.value)}
                      className="bg-card text-foreground border border-border rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="todos">Todos los segmentos</option>
                      {segmentos.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Rango de Edades */}
                  <div className="space-y-1.5">
                    <select
                      value={filtroEdad}
                      onChange={e => setFiltroEdad(e.target.value)}
                      className="w-full bg-card text-foreground border border-border rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="todas">Todas las edades</option>
                      <option value="18-25">18 a 25 años (Jóvenes)</option>
                      <option value="26-35">26 a 35 años (Jóvenes Adultos)</option>
                      <option value="36-50">36 a 50 años (Adultos)</option>
                      <option value="51+">51+ años (Adultos Mayores)</option>
                      <option value="<18">Menores (&lt; 18 años)</option>
                      <option value="sin-edad">Sin edad registrada</option>
                      <option value="custom">Rango personalizado...</option>
                    </select>

                    {filtroEdad === 'custom' && (
                      <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
                        <input
                          type="number"
                          min="0"
                          max="120"
                          placeholder="Mín (ej. 18)"
                          value={edadMinCustom}
                          onChange={e => setEdadMinCustom(e.target.value)}
                          className="w-1/2 bg-card text-foreground border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-muted-foreground text-xs font-medium">-</span>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          placeholder="Máx (ej. 45)"
                          value={edadMaxCustom}
                          onChange={e => setEdadMaxCustom(e.target.value)}
                          className="w-1/2 bg-card text-foreground border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={soloSinAsignar}
                          onChange={e => setSoloSinAsignar(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span>Sin asignar</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={soloConConyuge}
                          onChange={e => setSoloConConyuge(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span>Con cónyuge</span>
                      </label>
                    </div>

                    {(busqueda || filtroCiudad !== 'todas' || filtroSegmento !== 'todos' || filtroEdad !== 'todas' || !soloSinAsignar || soloConConyuge) && (
                      <button
                        onClick={() => {
                          setBusqueda('')
                          setFiltroCiudad('todas')
                          setFiltroSegmento('todos')
                          setFiltroEdad('todas')
                          setEdadMinCustom('')
                          setEdadMaxCustom('')
                          setSoloSinAsignar(true)
                          setSoloConConyuge(false)
                        }}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                <SeparadorSistema />

                {/* Lista Arrastrable de Personas */}
                <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                  {personasFiltradas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No se encontraron miembros con estos filtros.
                    </div>
                  ) : (
                    personasFiltradas.map(p => {
                      const asignacion = mapaAsignaciones.get(p.id)
                      return (
                        <MemberCard
                          key={p.id}
                          persona={p}
                          grupoId={asignacion?.grupoId}
                          grupoNombre={asignacion?.grupoNombre}
                          onDesasignar={asignacion ? () => handleDesasignar(p.id) : undefined}
                          onAbrirMover={setPersonaParaMover}
                        />
                      )
                    })
                  )}
                </div>
              </UnassignedDropZone>
            </div>
          )}

          {/* ÁREA PRINCIPAL DEL TABLERO */}
          <div className="flex-1 min-w-0">
            
            {/* MODO 1: TABLERO HORIZONTAL ESTILO TRELLO (DEFAULT) */}
            {modoVisualizacion === 'trello' && (
              <div
                ref={trelloScrollRef}
                className="flex flex-row gap-4 overflow-x-auto pb-6 pt-1 items-start select-none scroll-smooth min-h-[580px]"
                style={{ scrollbarWidth: 'thin' }}
              >
                {gruposTablero.length === 0 ? (
                  <div className="w-full p-12 text-center border border-dashed border-border rounded-3xl space-y-3 bg-card/40">
                    <Layers className="w-8 h-8 text-muted-foreground mx-auto" />
                    <TextoSistema variante="sutil" tamaño="base">
                      No hay grupos registrados para {ciudadTableroActiva}.
                    </TextoSistema>
                    <BotonSistema
                      variante="primario"
                      icono={Plus}
                      onClick={() => {
                        if (ciudadTableroActiva !== 'todas') setNuevoGrupoCiudad(ciudadTableroActiva)
                        setModalNuevoGrupo(true)
                      }}
                    >
                      Crear Primer GDV
                    </BotonSistema>
                  </div>
                ) : (
                  <>
                    {gruposTablero.map((grupo, idx) => (
                      <GroupCard
                        key={grupo.id}
                        grupo={grupo}
                        advertencias={advertencias}
                        layoutHorizontal={true}
                        onAsignar={handleAsignar}
                        onDesasignar={handleDesasignar}
                        onAbrirMover={setPersonaParaMover}
                        onEditarGrupo={setGrupoParaEditar}
                        onReordenarGrupo={handleReordenarGrupos}
                        onMoverGrupoIzquierda={() => handleMoverGrupoIzquierda(grupo.id)}
                        onMoverGrupoDerecha={() => handleMoverGrupoDerecha(grupo.id)}
                        puedeMoverIzquierda={idx > 0}
                        puedeMoverDerecha={idx < gruposTablero.length - 1}
                      />
                    ))}

                    {/* Tarjeta final para añadir nuevo GDV (estilo Trello "+ Añadir otra lista") */}
                    <div
                      onClick={() => {
                        if (ciudadTableroActiva !== 'todas') setNuevoGrupoCiudad(ciudadTableroActiva)
                        setModalNuevoGrupo(true)
                      }}
                      className="w-[300px] sm:w-[320px] shrink-0 p-6 rounded-3xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-card/30 hover:bg-primary/5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group min-h-[220px] self-stretch"
                    >
                      <div className="p-3.5 rounded-2xl bg-muted/60 group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors mb-3">
                        <Plus className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-foreground group-hover:text-primary text-sm transition-colors">
                        + Añadir Nuevo Grupo GDV
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Crea una nueva columna en {ciudadTableroActiva === 'todas' ? 'el tablero' : ciudadTableroActiva}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* MODO 2: VISTA CUADRÍCULA COMPACTA */}
            {modoVisualizacion === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {gruposTablero.length === 0 ? (
                  <div className="col-span-full p-12 text-center border border-dashed border-border rounded-2xl space-y-3">
                    <Layers className="w-8 h-8 text-muted-foreground mx-auto" />
                    <TextoSistema variante="sutil" tamaño="base">
                      No hay grupos registrados para {ciudadTableroActiva}.
                    </TextoSistema>
                    <BotonSistema
                      variante="primario"
                      icono={Plus}
                      onClick={() => {
                        if (ciudadTableroActiva !== 'todas') setNuevoGrupoCiudad(ciudadTableroActiva)
                        setModalNuevoGrupo(true)
                      }}
                    >
                      Crear Primer GDV en {ciudadTableroActiva === 'todas' ? 'la Ciudad' : ciudadTableroActiva}
                    </BotonSistema>
                  </div>
                ) : (
                  gruposTablero.map((grupo, idx) => (
                    <GroupCard
                      key={grupo.id}
                      grupo={grupo}
                      advertencias={advertencias}
                      layoutHorizontal={false}
                      onAsignar={handleAsignar}
                      onDesasignar={handleDesasignar}
                      onAbrirMover={setPersonaParaMover}
                      onEditarGrupo={setGrupoParaEditar}
                      onReordenarGrupo={handleReordenarGrupos}
                      onMoverGrupoIzquierda={() => handleMoverGrupoIzquierda(grupo.id)}
                      onMoverGrupoDerecha={() => handleMoverGrupoDerecha(grupo.id)}
                      puedeMoverIzquierda={idx > 0}
                      puedeMoverDerecha={idx < gruposTablero.length - 1}
                    />
                  ))
                )}
              </div>
            )}

            {/* MODO 3: VISTA COMPARATIVA LADO A LADO (BARQUISIMETO | CABUDARE) */}
            {modoVisualizacion === 'lado_a_lado' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                
                {/* Columna Barquisimeto */}
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-bold text-foreground text-sm">Barquisimeto</span>
                    </div>
                    <BadgeSistema variante="info" tamaño="sm">
                      {gruposBarquisimeto.length} Grupos
                    </BadgeSistema>
                  </div>

                  <div className="space-y-4">
                    {gruposBarquisimeto.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                        No hay grupos registrados en Barquisimeto.
                      </div>
                    ) : (
                      gruposBarquisimeto.map((g, idx) => (
                        <GroupCard
                          key={g.id}
                          grupo={g}
                          advertencias={advertencias}
                          layoutHorizontal={false}
                          onAsignar={handleAsignar}
                          onDesasignar={handleDesasignar}
                          onAbrirMover={setPersonaParaMover}
                          onEditarGrupo={setGrupoParaEditar}
                          onReordenarGrupo={handleReordenarGrupos}
                          onMoverGrupoIzquierda={() => handleMoverGrupoIzquierda(g.id)}
                          onMoverGrupoDerecha={() => handleMoverGrupoDerecha(g.id)}
                          puedeMoverIzquierda={idx > 0}
                          puedeMoverDerecha={idx < gruposBarquisimeto.length - 1}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Columna Cabudare */}
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-foreground text-sm">Cabudare</span>
                    </div>
                    <BadgeSistema variante="success" tamaño="sm">
                      {gruposCabudare.length} Grupos
                    </BadgeSistema>
                  </div>

                  <div className="space-y-4">
                    {gruposCabudare.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                        No hay grupos registrados en Cabudare.
                      </div>
                    ) : (
                      gruposCabudare.map((g, idx) => (
                        <GroupCard
                          key={g.id}
                          grupo={g}
                          advertencias={advertencias}
                          layoutHorizontal={false}
                          onAsignar={handleAsignar}
                          onDesasignar={handleDesasignar}
                          onAbrirMover={setPersonaParaMover}
                          onEditarGrupo={setGrupoParaEditar}
                          onReordenarGrupo={handleReordenarGrupos}
                          onMoverGrupoIzquierda={() => handleMoverGrupoIzquierda(g.id)}
                          onMoverGrupoDerecha={() => handleMoverGrupoDerecha(g.id)}
                          puedeMoverIzquierda={idx > 0}
                          puedeMoverDerecha={idx < gruposCabudare.length - 1}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* PANEL / MODAL DE EDICIÓN RÁPIDA Y PRÁCTICA DEL GRUPO */}
      <GroupEditModal
        isOpen={Boolean(grupoParaEditar)}
        grupo={grupoParaEditar}
        segmentos={segmentos}
        personasDisponibles={personasFiltradas}
        onClose={() => setGrupoParaEditar(null)}
        onGuardarGrupo={handleGuardarGrupoEditado}
        onDuplicarGrupo={handleDuplicarGrupo}
        onEliminarGrupo={handleEliminarGrupo}
        onAsignarPersonaAGrupo={handleAsignarPersonaDirecto}
        onDesasignarPersona={handleDesasignar}
      />

      {/* MODAL PARA REUBICACIÓN RÁPIDA / ASISTIDA POR CLIC */}
      <ReassignmentModal
        isOpen={Boolean(personaParaMover)}
        persona={personaParaMover}
        grupos={grupos}
        onClose={() => setPersonaParaMover(null)}
        onAsignar={handleAsignar}
      />

      {/* ASISTENTE DE ONBOARDING */}
      <PlannerOnboarding
        isOpen={mostrarOnboarding}
        temporadas={temporadas}
        segmentos={segmentos}
        temporadaCierreDefecto={temporadaCierreObj}
        temporadaPlanificarDefecto={temporadaPlanificarObj}
        configuracionActual={configuracion}
        onCompletar={handleCompletarOnboarding}
        onCerrar={() => setMostrarOnboarding(false)}
      />

      {/* MODAL CREAR NUEVO GDV */}
      {modalNuevoGrupo && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <TarjetaSistema variante="elevated" className="max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <TituloSistema nivel={3} className="text-lg font-bold">
                Nuevo Grupo de Vida (GDV)
              </TituloSistema>
              <button
                onClick={() => setModalNuevoGrupo(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <TextoSistema variante="sutil" tamaño="sm">
              La nomenclatura se generará automáticamente según los estándares pastorales.
            </TextoSistema>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Ciudad</label>
                <select
                  value={nuevoGrupoCiudad}
                  onChange={e => setNuevoGrupoCiudad(e.target.value as CiudadGDV)}
                  className="w-full bg-card text-foreground border border-border rounded-xl p-2 text-sm focus:outline-none"
                >
                  <option value="Barquisimeto">Barquisimeto</option>
                  <option value="Cabudare">Cabudare</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Segmento</label>
                <select
                  value={nuevoGrupoSegmento}
                  onChange={e => setNuevoGrupoSegmento(e.target.value)}
                  className="w-full bg-card text-foreground border border-border rounded-xl p-2 text-sm focus:outline-none"
                >
                  {segmentos.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Zona / Sector</label>
                <input
                  type="text"
                  value={nuevoGrupoZona}
                  onChange={e => setNuevoGrupoZona(e.target.value)}
                  placeholder="Ej: Este, Valle Hondo, Cabudare..."
                  className="w-full bg-card text-foreground border border-border rounded-xl p-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <BotonSistema
                variante="ghost"
                onClick={() => setModalNuevoGrupo(false)}
              >
                Cancelar
              </BotonSistema>
              <BotonSistema
                variante="primario"
                onClick={handleCrearGrupo}
              >
                Crear GDV
              </BotonSistema>
            </div>
          </TarjetaSistema>
        </div>
      )}

      {/* MODAL PUBLICAR Y APROBAR TEMPORADA */}
      {modalPublicar && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <TarjetaSistema variante="elevated" className="max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 border-primary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Rocket className="w-6 h-6" />
                </div>
                <div>
                  <TituloSistema nivel={3} className="text-lg font-bold">
                    Publicar Temporada {temporadaPlanificarObj?.nombre || ''}
                  </TituloSistema>
                  <TextoSistema variante="sutil" tamaño="xs">
                    Aprobación y activación masiva de Grupos de Vida
                  </TextoSistema>
                </div>
              </div>
              <button
                onClick={() => setModalPublicar(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Temporada destino:</span>
                <span className="font-semibold text-foreground">{temporadaPlanificarObj?.nombre || 'Destino'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Grupos planificados:</span>
                <BadgeSistema variante="info" tamaño="sm">{grupos.length} GDVs</BadgeSistema>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Líderes y Colíderes asignados:</span>
                <span className="font-medium text-foreground">
                  {grupos.reduce((acc, g) => acc + (g.lider_principal ? 1 : 0) + (g.co_lider ? 1 : 0), 0)} líderes
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Miembros asignados:</span>
                <span className="font-medium text-foreground">
                  {grupos.reduce((acc, g) => acc + (g.miembros?.length || 0), 0)} personas
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <TextoSistema variante="default" tamaño="sm" className="leading-relaxed">
                Al publicar esta planificación:
              </TextoSistema>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-5">
                <li>Todos los grupos pasarán de <strong className="text-amber-500">Pendiente</strong> a <strong className="text-emerald-500">Aprobado</strong> en la base de datos.</li>
                <li>El estado del ciclo pasará a <strong className="text-emerald-500">Activo</strong> para su funcionamiento regular.</li>
                <li>Las asignaciones pastorales quedarán oficializadas en toda la plataforma.</li>
              </ul>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border cursor-pointer hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  checked={activarTemporadaCheck}
                  onChange={e => setActivarTemporadaCheck(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-medium text-foreground block">Marcar la temporada {temporadaPlanificarObj?.nombre} como VIGENTE/ACTIVA</span>
                  <span className="text-muted-foreground">Establece esta temporada como la activa global en el sistema.</span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <BotonSistema
                variante="ghost"
                onClick={() => setModalPublicar(false)}
                disabled={publicando}
              >
                Cancelar
              </BotonSistema>
              <BotonSistema
                variante="primario"
                icono={publicando ? Loader2 : CheckCircle2}
                cargando={publicando}
                onClick={handlePublicarTemporada}
              >
                Confirmar y Publicar Temporada
              </BotonSistema>
            </div>
          </TarjetaSistema>
        </div>
      )}

      {/* DRAWER LATERAL DE HISTORIAL DE CAMBIOS Y MOVIMIENTOS */}
      <ChangelogDrawer
        isOpen={drawerHistorialAbierto}
        onClose={() => setDrawerHistorialAbierto(false)}
        cambios={registroCambios}
        puedeDeshacer={historyPast.length > 0}
        puedeRehacer={historyFuture.length > 0}
        onDeshacer={handleDeshacer}
        onRehacer={handleRehacer}
        onGuardar={handleGuardarCambios}
        guardando={guardando}
        onLimpiarHistorial={() => setRegistroCambios([])}
      />

      {/* DRAWER LATERAL DE AUDITORÍA Y OBSERVACIONES PASTORALES */}
      <WarningsDrawer
        isOpen={drawerAdvertenciasAbierto}
        onClose={() => setDrawerAdvertenciasAbierto(false)}
        advertencias={advertencias}
        grupos={grupos}
        onEditarGrupo={setGrupoParaEditar}
      />

      {/* BARRA FLOTANTE DE ACCESO RÁPIDO SI HAY CAMBIOS SIN GUARDAR */}
      {cambiosSinGuardar > 0 && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 p-2 bg-card/90 backdrop-blur-md border border-amber-500/40 rounded-2xl shadow-xl">
            <button
              onClick={() => setDrawerHistorialAbierto(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>{cambiosSinGuardar} {cambiosSinGuardar === 1 ? 'cambio pendiente' : 'cambios pendientes'}</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={handleDeshacer}
                disabled={historyPast.length === 0}
                className="p-1.5 rounded-lg hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Deshacer (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleRehacer}
                disabled={historyFuture.length === 0}
                className="p-1.5 rounded-lg hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Rehacer (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <BotonSistema
                variante="primario"
                tamaño="sm"
                icono={guardando ? Loader2 : Save}
                cargando={guardando}
                onClick={handleGuardarCambios}
              >
                Guardar
              </BotonSistema>
            </div>
          </div>
        </div>
      )}
    </ContenedorDashboard>
  )
}
