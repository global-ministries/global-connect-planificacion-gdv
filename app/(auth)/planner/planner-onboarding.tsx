'use client'

import React, { useState, useEffect } from 'react'
import {
  TarjetaSistema,
  BotonSistema,
  BadgeSistema,
  TituloSistema,
  TextoSistema,
  SeparadorSistema
} from '@/components/ui/sistema-diseno'
import {
  TemporadaPlanner,
  SegmentoInfo,
  AnalisisTemporadaCierre,
  ConfiguracionPlanificacion
} from '@/lib/planner/types'
import { generarDiagnosticoCierre } from '@/lib/planner/actions'
import {
  Sparkles,
  Layers,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Users,
  ShieldCheck,
  TrendingUp,
  Heart,
  Loader2,
  GraduationCap,
  MapPin,
  HelpCircle,
  RotateCcw,
  Sparkle,
  Briefcase,
  Shield,
  Activity,
  AlertTriangle,
  Flame,
  PieChart,
  Home,
  Check
} from 'lucide-react'

// Helper para obtener el icono representativo del segmento
function obtenerIconoSegmento(nombre: string) {
  const n = nombre.toLowerCase()
  if (n.includes('matrimonio') || n.includes('pareja')) return Heart
  if (n.includes('joven') || n.includes('juvenil')) return Sparkles
  if (n.includes('profesional')) return Briefcase
  if (n.includes('universitari') || n.includes('campus')) return GraduationCap
  if (n.includes('mujer')) return Sparkle
  if (n.includes('hombre')) return Shield
  if (n.includes('adulto')) return Users
  return Layers
}

interface PlannerOnboardingProps {
  temporadas: TemporadaPlanner[]
  segmentos: SegmentoInfo[]
  temporadaCierreDefecto: TemporadaPlanner | null
  temporadaPlanificarDefecto: TemporadaPlanner | null
  configuracionActual?: ConfiguracionPlanificacion | null
  isOpen: boolean
  onCompletar: (config: ConfiguracionPlanificacion, modo: 'importar_cierre' | 'existente' | 'en_blanco') => void
  onCerrar?: () => void
}

export function PlannerOnboarding({
  temporadas,
  segmentos,
  temporadaCierreDefecto,
  temporadaPlanificarDefecto,
  configuracionActual,
  isOpen,
  onCompletar,
  onCerrar
}: PlannerOnboardingProps) {
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1)

  // Selección de Segmento
  const [segmentoSeleccionadoId, setSegmentoSeleccionadoId] = useState<string>(
    configuracionActual?.segmentoId || 'todos'
  )

  // Selección de Temporadas con valores por defecto seguros
  const [temporadaCierreId, setTemporadaCierreId] = useState<string>(
    configuracionActual?.temporadaCierreId || temporadaCierreDefecto?.id || temporadas[0]?.id || ''
  )
  const [temporadaPlanificarId, setTemporadaPlanificarId] = useState<string>(
    configuracionActual?.temporadaPlanificarId || temporadaPlanificarDefecto?.id || temporadas[1]?.id || temporadas[0]?.id || ''
  )

  // Temporadas activas en paralelo a excluir
  const [temporadasExcluidasIds, setTemporadasExcluidasIds] = useState<string[]>(() => {
    if (configuracionActual?.temporadasExcluidasIds) return configuracionActual.temporadasExcluidasIds
    const inicialesCierre = configuracionActual?.temporadaCierreId || temporadaCierreDefecto?.id || temporadas[0]?.id || ''
    const inicialesPlan = configuracionActual?.temporadaPlanificarId || temporadaPlanificarDefecto?.id || temporadas[1]?.id || temporadas[0]?.id || ''
    return temporadas
      .filter(t => t.es_activa && t.id !== inicialesCierre && t.id !== inicialesPlan)
      .map(t => t.id)
  })

  // Sincronizar si cambian las props
  useEffect(() => {
    if (!temporadaCierreId && temporadas.length > 0) {
      setTemporadaCierreId(temporadaCierreDefecto?.id || temporadas[0].id)
    }
    if (!temporadaPlanificarId && temporadas.length > 0) {
      setTemporadaPlanificarId(temporadaPlanificarDefecto?.id || temporadas[1]?.id || temporadas[0].id)
    }
  }, [temporadas, temporadaCierreDefecto, temporadaPlanificarDefecto, temporadaCierreId, temporadaPlanificarId])

  // Actualizar temporadas excluidas por defecto cuando cambia la temporada de cierre o destino
  useEffect(() => {
    const otrasActivas = temporadas
      .filter(t => t.es_activa && t.id !== temporadaCierreId && t.id !== temporadaPlanificarId)
      .map(t => t.id)
    
    setTemporadasExcluidasIds(prev => {
      // Mantener las que ya estaban marcadas válidas o agregar las nuevas activas
      const validas = prev.filter(id => id !== temporadaCierreId && id !== temporadaPlanificarId)
      const unicas = Array.from(new Set([...validas, ...otrasActivas]))
      return unicas
    })
  }, [temporadaCierreId, temporadaPlanificarId, temporadas])

  // Diagnóstico y Modo de Inicio
  const [cargandoDiagnostico, setCargandoDiagnostico] = useState(false)
  const [analisis, setAnalisis] = useState<AnalisisTemporadaCierre | null>(null)
  const [tabDiagnostico, setTabDiagnostico] = useState<'resumen' | 'grupos' | 'aprendices' | 'parejas' | 'recomendaciones'>('resumen')
  const [modoInicio, setModoInicio] = useState<'importar_cierre' | 'existente' | 'en_blanco'>('importar_cierre')

  // Obtener nombre del segmento seleccionado
  const segmentoNombre = segmentoSeleccionadoId === 'todos'
    ? 'Todos los Segmentos'
    : (segmentos.find(s => s.id === segmentoSeleccionadoId)?.nombre || 'Segmento')

  const temporadaCierreNombre = temporadas.find(t => t.id === temporadaCierreId)?.nombre || 'Temporada Cierre'
  const temporadaPlanificarNombre = temporadas.find(t => t.id === temporadaPlanificarId)?.nombre || 'Temporada a Planificar'

  // Cargar diagnóstico cuando se entra al paso 3
  const ejecutarAnalisis = async (overrideTempId?: string, overrideSegId?: string) => {
    const tId = typeof overrideTempId === 'string' ? overrideTempId : temporadaCierreId
    const sId = typeof overrideSegId === 'string' ? overrideSegId : segmentoSeleccionadoId
    setCargandoDiagnostico(true)
    try {
      const res = await generarDiagnosticoCierre({
        temporadaCierreId: tId,
        temporadaPlanificarId,
        segmentoId: sId
      })
      if (res?.success && res.analisis) {
        setAnalisis(res.analisis)
      } else if (res && !res.success) {
        console.warn('Error en diagnóstico:', res.error)
      }
    } catch (err) {
      console.error('Error al generar diagnóstico:', err)
    } finally {
      setCargandoDiagnostico(false)
    }
  }

  const handleSiguientePaso = async () => {
    if (paso === 1) {
      setPaso(2)
    } else if (paso === 2) {
      setPaso(3)
      await ejecutarAnalisis()
    } else if (paso === 3) {
      setPaso(4)
    } else if (paso === 4) {
      onCompletar(
        {
          segmentoId: segmentoSeleccionadoId,
          segmentoNombre,
          temporadaCierreId,
          temporadaPlanificarId,
          temporadasExcluidasIds,
          modoInicio
        },
        modoInicio
      )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-card border border-border shadow-2xl overflow-hidden">
        
        {/* ENCABEZADO DEL ONBOARDING */}
        <div className="p-6 md:p-8 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <TituloSistema nivel={2}>Asistente de Planificación de Temporada</TituloSistema>
                <TextoSistema variante="sutil" tamaño="sm">
                  Configura el segmento y analiza la temporada que finaliza para proyectar la nueva temporada.
                </TextoSistema>
              </div>
            </div>

            {onCerrar && (
              <BotonSistema variante="ghost" tamaño="sm" onClick={onCerrar}>
                Cerrar
              </BotonSistema>
            )}
          </div>

          {/* INDICADOR DE PASOS */}
          <div className="grid grid-cols-4 gap-2 mt-6">
            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${paso >= 1 ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-muted/40 text-muted-foreground'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${paso >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                1
              </div>
              <span className="text-xs font-medium truncate">1. Segmento</span>
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${paso >= 2 ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-muted/40 text-muted-foreground'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${paso >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                2
              </div>
              <span className="text-xs font-medium truncate">2. Temporadas</span>
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${paso >= 3 ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-muted/40 text-muted-foreground'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${paso >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                3
              </div>
              <span className="text-xs font-medium truncate">3. Diagnóstico</span>
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${paso >= 4 ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-muted/40 text-muted-foreground'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${paso >= 4 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                4
              </div>
              <span className="text-xs font-medium truncate">4. Modo Inicio</span>
            </div>
          </div>
        </div>

        {/* CUERPO DEL CONTENIDO SCROLLEABLE */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">

          {/* PASO 1: SELECCIÓN DE SEGMENTO */}
          {paso === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-1">
                <TituloSistema nivel={3}>¿Qué segmento de Grupos de Vida deseas planificar?</TituloSistema>
                <TextoSistema variante="sutil" tamaño="sm">
                  Puedes planificar un segmento específico primero (ej. Matrimonios) y luego continuar con los demás, o planificar todos de forma global.
                </TextoSistema>
              </div>

              {/* Banner Informativo de Planificación Modular */}
              <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-foreground/90 space-y-1">
                  <p className="font-semibold text-foreground">💡 Planificación Modular y Progresiva:</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Si decides empezar planificando solo <strong>Matrimonios</strong>, tus avances y asignaciones se guardarán de forma segura. Posteriormente podrás pasar a <strong>Jóvenes</strong>, <strong>Profesionales</strong> u otros segmentos dentro de la misma temporada sin perder tu trabajo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Opción Todos */}
                <div
                  onClick={() => setSegmentoSeleccionadoId('todos')}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    segmentoSeleccionadoId === 'todos'
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                      : 'border-border bg-card hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Layers className="w-5 h-5" />
                    </div>
                    {segmentoSeleccionadoId === 'todos' && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground block">Todos los Segmentos</span>
                      <BadgeSistema variante="info" tamaño="sm">
                        {segmentos.reduce((acc, s) => acc + (s.total_grupos || 0), 0)} GDVs
                      </BadgeSistema>
                    </div>
                    <TextoSistema variante="sutil" tamaño="sm" className="mt-1">
                      Planificación global de todos los GDVs de la iglesia ({segmentos.reduce((acc, s) => acc + (s.total_miembros || 0), 0)} miembros registrados)
                    </TextoSistema>
                  </div>
                </div>

                {/* Segmentos reales desde Supabase */}
                {segmentos.map(seg => {
                  const seleccionado = segmentoSeleccionadoId === seg.id
                  const IconoComponente = obtenerIconoSegmento(seg.nombre)
                  return (
                    <div
                      key={seg.id}
                      onClick={() => setSegmentoSeleccionadoId(seg.id)}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                        seleccionado
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                          <IconoComponente className="w-5 h-5" />
                        </div>
                        {seleccionado ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <BadgeSistema variante="default" tamaño="sm">
                            {seg.total_grupos !== undefined ? `${seg.total_grupos} GDVs` : 'Conectado'}
                          </BadgeSistema>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground block">{seg.nombre}</span>
                          {seleccionado && (
                            <BadgeSistema variante="info" tamaño="sm">
                              {seg.total_grupos !== undefined ? `${seg.total_grupos} GDVs` : 'Seleccionado'}
                            </BadgeSistema>
                          )}
                        </div>
                        <TextoSistema variante="sutil" tamaño="sm" className="mt-1">
                          {seg.descripcion || `Grupos de Vida de ${seg.nombre}`}
                        </TextoSistema>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* PASO 2: SELECCIÓN DE TEMPORADAS (CIERRE VS PLANIFICACIÓN) */}
          {paso === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-1">
                <TituloSistema nivel={3}>Definición de Temporadas en Transición</TituloSistema>
                <TextoSistema variante="sutil" tamaño="sm">
                  Indica cuál es la temporada que está finalizando (para extraer el historial y miembros) y cuál es la nueva temporada a proyectar.
                </TextoSistema>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Temporada que Finaliza */}
                <TarjetaSistema variante="default" className="p-5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-foreground block text-sm">1. Temporada que Finaliza (Cierre)</span>
                      <TextoSistema variante="sutil" tamaño="sm">Temporada actual activa de donde provienen los grupos</TextoSistema>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Seleccionar Temporada Origen:</label>
                    <select
                      value={temporadaCierreId}
                      onChange={e => setTemporadaCierreId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {temporadas.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} {t.es_activa ? '(Activa)' : ''} {t.total_grupos !== undefined ? `• ${t.total_grupos} grupos` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground">
                    💡 El sistema analizará los líderes, aprendices que se gradúan y parejas de esta temporada para asegurar que nadie quede sin cobertura.
                  </div>
                </TarjetaSistema>

                {/* Temporada a Planificar */}
                <TarjetaSistema variante="default" className="p-5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-foreground block text-sm">2. Temporada a Planificar (Nueva)</span>
                      <TextoSistema variante="sutil" tamaño="sm">El nuevo ciclo que abrirá sus inscripciones</TextoSistema>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Seleccionar Temporada Destino:</label>
                    <select
                      value={temporadaPlanificarId}
                      onChange={e => setTemporadaPlanificarId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {temporadas.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} {t.total_grupos === 0 ? '(Nueva • 0 grupos)' : `• ${t.total_grupos} grupos`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground">
                    🎯 Todos los grupos creados o multiplicados se asignarán a esta nueva temporada ({temporadaPlanificarNombre}).
                  </div>
                </TarjetaSistema>
              </div>

              {/* SECCIÓN DE TEMPORADAS ACTIVAS EN PARALELO (EXCLUIR MIEMBROS) */}
              {temporadas.filter(t => t.es_activa && t.id !== temporadaCierreId && t.id !== temporadaPlanificarId).length > 0 && (
                <TarjetaSistema variante="outlined" className="p-5 space-y-4 border-primary/30 bg-primary/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-semibold text-foreground block text-sm">
                          Temporadas Activas en Paralelo (Protección de Asignaciones)
                        </span>
                        <TextoSistema variante="sutil" tamaño="sm">
                          Marca las temporadas simultáneas cuyos miembros NO deben ser tocados ni mostrados en el banco disponible.
                        </TextoSistema>
                      </div>
                    </div>
                    <BadgeSistema variante="info" tamaño="sm" className="self-start sm:self-auto">
                      {temporadasExcluidasIds.length} Protegida{temporadasExcluidasIds.length !== 1 ? 's' : ''}
                    </BadgeSistema>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {temporadas
                      .filter(t => t.es_activa && t.id !== temporadaCierreId && t.id !== temporadaPlanificarId)
                      .map(t => {
                        const estaExcluida = temporadasExcluidasIds.includes(t.id)
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              if (estaExcluida) {
                                setTemporadasExcluidasIds(prev => prev.filter(id => id !== t.id))
                              } else {
                                setTemporadasExcluidasIds(prev => [...prev, t.id])
                              }
                            }}
                            className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              estaExcluida
                                ? 'border-primary/50 bg-primary/10 shadow-sm'
                                : 'border-border bg-card hover:bg-muted/40'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                                  estaExcluida
                                    ? 'bg-primary border-primary text-primary-foreground'
                                    : 'border-muted-foreground bg-transparent'
                                }`}
                              >
                                {estaExcluida && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <span className="font-medium text-foreground text-sm block">
                                  {t.nombre} (Activa)
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {t.total_grupos !== undefined ? `${t.total_grupos} grupos activos` : 'Temporada activa'}
                                  {t.total_miembros !== undefined && t.total_miembros > 0 ? ` • ${t.total_miembros} personas` : ''}
                                </span>
                              </div>
                            </div>
                            <BadgeSistema variante={estaExcluida ? 'success' : 'default'} tamaño="sm">
                              {estaExcluida ? 'Excluir Miembros' : 'Permitir en Pool'}
                            </BadgeSistema>
                          </div>
                        )
                      })}
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>
                      Al marcar una temporada activa como excluida, sus miembros sirviendo en esos grupos no inflarán el total ni aparecerán como disponibles en el Banco de Personas.
                    </span>
                  </div>
                </TarjetaSistema>
              )}
            </div>
          )}

          {/* PASO 3: DIAGNÓSTICO Y ANÁLISIS DE CIERRE */}
          {paso === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <TituloSistema nivel={3}>Diagnóstico Pastoral y Operativo de Cierre</TituloSistema>
                  <TextoSistema variante="sutil" tamaño="sm">
                    Análisis en tiempo real de los datos en base de datos para <strong>{temporadaCierreNombre}</strong> ({segmentoNombre}).
                  </TextoSistema>
                </div>

                {analisis && (
                  <div className="flex items-center gap-2">
                    <BadgeSistema variante="info" tamaño="sm">
                      Base de Datos Conectada
                    </BadgeSistema>
                    <BotonSistema
                      variante="outline"
                      tamaño="sm"
                      icono={RotateCcw}
                      onClick={() => ejecutarAnalisis()}
                      cargando={cargandoDiagnostico}
                    >
                      Actualizar
                    </BotonSistema>
                  </div>
                )}
              </div>

              {cargandoDiagnostico ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-sm font-medium text-foreground">
                    Consultando grupos, miembros, líderes, aprendices y matrimonios de la base de datos...
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Calculando salud de grupos, capacidad y proyecciones de multiplicación...
                  </span>
                </div>
              ) : analisis ? (
                <div className="space-y-6">
                  {/* Tarjetas Métricas Clave */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <TarjetaSistema variante="default" className="p-3.5">
                      <span className="text-xs text-muted-foreground font-medium block">Total Grupos</span>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        {analisis.totalGruposCerrando}
                      </div>
                      <span className="text-[11px] text-muted-foreground">en {analisis.temporadaCierreNombre}</span>
                    </TarjetaSistema>

                    <TarjetaSistema variante="default" className="p-3.5">
                      <span className="text-xs text-muted-foreground font-medium block">Miembros Activos</span>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        {analisis.totalMiembrosActivos}
                      </div>
                      <span className="text-[11px] text-muted-foreground">~{analisis.promedioMiembrosPorGrupo} por grupo</span>
                    </TarjetaSistema>

                    <TarjetaSistema variante="default" className="p-3.5">
                      <span className="text-xs text-muted-foreground font-medium block">Líderes Principales</span>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        {analisis.totalLideresPrincipales ?? analisis.totalLideresCerrando}
                      </div>
                      <span className="text-[11px] text-muted-foreground">titulares asignados</span>
                    </TarjetaSistema>

                    <TarjetaSistema variante="default" className="p-3.5">
                      <span className="text-xs text-muted-foreground font-medium block">Aprendices / Co-líderes</span>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        {analisis.totalAprendicesGraduables}
                      </div>
                      <span className="text-[11px] text-muted-foreground">en formación / relevo</span>
                    </TarjetaSistema>

                    <TarjetaSistema variante="default" className="p-3.5">
                      <span className="text-xs text-muted-foreground font-medium block">Matrimonios</span>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        {analisis.totalParejasConyuges}
                      </div>
                      <span className="text-[11px] text-muted-foreground">parejas conyugales</span>
                    </TarjetaSistema>
                  </div>

                  {/* ALERTA AMIGABLE CUANDO LA COMBINACIÓN TIENE 0 GRUPOS */}
                  {analisis.totalGruposCerrando === 0 && (
                    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span>No hay grupos registrados para {segmentoNombre} en la temporada {temporadaCierreNombre}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        La base de datos de Supabase contiene grupos reales en las siguientes temporadas y segmentos. Haz clic en cualquiera de las opciones para cargar su diagnóstico pastoral inmediatamente:
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSegmentoSeleccionadoId('todos')
                            ejecutarAnalisis(temporadaCierreId, 'todos')
                          }}
                          className="px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold border border-primary/30 transition-colors"
                        >
                          🌟 Ver Todos los Segmentos ({segmentos.reduce((acc, s) => acc + (s.total_grupos || 0), 0)} GDVs en BD)
                        </button>
                        {temporadas.filter(t => (t.total_grupos || 0) > 0).map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setTemporadaCierreId(t.id)
                              ejecutarAnalisis(t.id, segmentoSeleccionadoId)
                            }}
                            className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground text-xs font-medium border border-border transition-colors"
                          >
                            📅 Cambiar a {t.nombre} ({t.total_grupos} grupos)
                          </button>
                        ))}
                        {segmentos.filter(s => (s.total_grupos || 0) > 0).slice(0, 3).map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSegmentoSeleccionadoId(s.id)
                              ejecutarAnalisis(temporadaCierreId, s.id)
                            }}
                            className="px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted text-foreground text-xs font-medium border border-border transition-colors"
                          >
                            👥 Ver {s.nombre} ({s.total_grupos} grupos)
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PESTAÑAS DE ANÁLISIS EN PROFUNDIDAD */}
                  <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-2xl border border-border overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setTabDiagnostico('resumen')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                        tabDiagnostico === 'resumen'
                          ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <PieChart className="w-4 h-4" />
                      Resumen y Proyección
                    </button>

                    <button
                      type="button"
                      onClick={() => setTabDiagnostico('grupos')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                        tabDiagnostico === 'grupos'
                          ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      Grupos Registrados ({analisis.gruposDetalle?.length || 0})
                    </button>

                    <button
                      type="button"
                      onClick={() => setTabDiagnostico('aprendices')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                        tabDiagnostico === 'aprendices'
                          ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      Semillero de Aprendices ({analisis.aprendicesListos?.length || 0})
                    </button>

                    <button
                      type="button"
                      onClick={() => setTabDiagnostico('parejas')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                        tabDiagnostico === 'parejas'
                          ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                      Liderazgo Matrimonial ({analisis.parejasLiderazgo?.length || 0})
                    </button>

                    <button
                      type="button"
                      onClick={() => setTabDiagnostico('recomendaciones')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                        tabDiagnostico === 'recomendaciones'
                          ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Recomendaciones ({analisis.recomendaciones?.length || 0})
                    </button>
                  </div>

                  {/* CONTENIDO DE PESTAÑA: RESUMEN Y PROYECCIÓN */}
                  {tabDiagnostico === 'resumen' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-100">
                      {/* Proyección y Metas */}
                      <TarjetaSistema variante="default" className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <span className="font-semibold text-foreground text-sm">Proyección de Multiplicación</span>
                          </div>
                          <BadgeSistema variante="info" tamaño="sm">Temporada Nueva</BadgeSistema>
                        </div>
                        
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                            <span className="text-muted-foreground">Meta Sugerida de GDVs:</span>
                            <span className="font-bold text-foreground">{analisis.proyeccion.metaGruposNuevos} grupos</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                            <span className="text-muted-foreground">Capacidad Total Proyectada:</span>
                            <span className="font-bold text-foreground">{analisis.proyeccion.capacidadTotalRequerida} personas</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                            <span className="text-muted-foreground">Distribución Territorial:</span>
                            <span className="font-bold text-foreground">
                              {analisis.proyeccion.gruposBarquisimeto} Barquisimeto / {analisis.proyeccion.gruposCabudare} Cabudare
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground/90 flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>
                            Con <strong>{analisis.totalAprendicesGraduables} aprendices listos</strong> y <strong>{analisis.totalLideresPrincipales ?? analisis.totalLideresCerrando} líderes principales</strong>, la iglesia cuenta con una base sólida para impulsar la nueva temporada.
                          </span>
                        </div>
                      </TarjetaSistema>

                      {/* Distribución Geográfica y Territorial */}
                      <TarjetaSistema variante="default" className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-amber-500" />
                            <span className="font-semibold text-foreground text-sm">Distribución Territorial Registrada</span>
                          </div>
                          <BadgeSistema variante="default" tamaño="sm">Lara</BadgeSistema>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                          {analisis.distribucionZonas && analisis.distribucionZonas.length > 0 ? (
                            analisis.distribucionZonas.map((z, idx) => (
                              <div key={idx} className="p-2.5 rounded-xl bg-muted/30 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-semibold text-foreground block">{z.zona}</span>
                                  <span className="text-muted-foreground">Municipio {z.municipio}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-foreground block">{z.gruposCount} GDV(s)</span>
                                  <span className="text-muted-foreground">{z.miembrosCount} miembros</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              Distribución principal concentrada en Barquisimeto (Iribarren) y Cabudare (Palavecino).
                            </div>
                          )}
                        </div>
                      </TarjetaSistema>
                    </div>
                  )}

                  {/* CONTENIDO DE PESTAÑA: GRUPOS REGISTRADOS */}
                  {tabDiagnostico === 'grupos' && (
                    <div className="space-y-4 animate-in fade-in duration-100">
                      {/* Métricas de Grupos */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-foreground block">Total Grupos</span>
                            <span className="text-xs text-muted-foreground">En temporada de cierre</span>
                          </div>
                          <span className="text-xl font-bold text-primary">
                            {analisis.totalGruposCerrando}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-foreground block">Miembros Activos</span>
                            <span className="text-xs text-muted-foreground">~{analisis.promedioMiembrosPorGrupo} por grupo</span>
                          </div>
                          <span className="text-xl font-bold text-foreground">
                            {analisis.totalMiembrosActivos}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-foreground block">Con Aprendiz Asignado</span>
                            <span className="text-xs text-muted-foreground">{analisis.saludGrupos?.porcentajeCoberturaSucesion || 0}% cobertura</span>
                          </div>
                          <span className="text-xl font-bold text-emerald-500">
                            {analisis.saludGrupos?.gruposConAprendiz || 0}
                          </span>
                        </div>
                      </div>

                      {/* Lista de Grupos Detallada */}
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {analisis.gruposDetalle && analisis.gruposDetalle.length > 0 ? (
                          analisis.gruposDetalle.map(g => (
                            <div key={g.id} className="p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-foreground text-sm">{g.nombre}</span>
                                  <BadgeSistema variante="default" tamaño="sm">{g.segmentoNombre}</BadgeSistema>
                                  <BadgeSistema variante="outline" tamaño="sm">{g.ciudad} ({g.zona})</BadgeSistema>
                                </div>
                                <div className="text-muted-foreground space-y-0.5">
                                  <div>
                                    <strong className="text-foreground">Liderazgo:</strong> {g.lideresNombres.length > 0 ? g.lideresNombres.join(', ') : 'Sin líder asignado'}
                                  </div>
                                  <div>
                                    <strong className="text-foreground">Aprendiz:</strong> {g.aprendicesNombres.length > 0 ? g.aprendicesNombres.join(', ') : 'Ninguno asignado'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <span className="font-bold text-sm text-foreground block">{g.miembrosCount} miembros</span>
                                  {g.tieneAprendiz ? (
                                    <span className="text-[11px] text-emerald-500 font-medium">Con Aprendiz</span>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground">Sin Aprendiz</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-6 text-center text-xs text-muted-foreground">
                            No se encontraron grupos activos para este criterio en la base de datos.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CONTENIDO DE PESTAÑA: SEMILLERO DE APRENDICES */}
                  {tabDiagnostico === 'aprendices' && (
                    <div className="space-y-4 animate-in fade-in duration-100">
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground/90 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-emerald-500" />
                          <span>
                            <strong>{analisis.aprendicesListos?.length || 0} Aprendices identificados</strong> en los grupos que cierran, listos para asumir como Líderes Principales en la nueva temporada.
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                        {analisis.aprendicesListos && analisis.aprendicesListos.length > 0 ? (
                          analisis.aprendicesListos.map(ap => (
                            <div key={ap.id} className="p-3.5 rounded-2xl border border-border bg-card flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-foreground text-sm block">{ap.nombre} {ap.apellido}</span>
                                <span className="text-muted-foreground block mt-0.5">Grupo actual: {ap.grupoActualNombre}</span>
                                {ap.segmentoNombre && (
                                  <BadgeSistema variante="outline" tamaño="sm" className="mt-1">
                                    {ap.segmentoNombre}
                                  </BadgeSistema>
                                )}
                              </div>
                              <BadgeSistema variante="success">Listo para Apertura</BadgeSistema>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 p-6 text-center text-xs text-muted-foreground">
                            No se encontraron aprendices con rol asignado en los grupos seleccionados.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CONTENIDO DE PESTAÑA: LIDERAZGO MATRIMONIAL */}
                  {tabDiagnostico === 'parejas' && (
                    <div className="space-y-4 animate-in fade-in duration-100">
                      <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-foreground/90 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-rose-500 shrink-0" />
                        <span>
                          <strong>{analisis.totalParejasConyuges} matrimonios detectados</strong> en los registros de la iglesia. Para los grupos del segmento Matrimonios, el planificador asegurará que los cónyuges permanezcan siempre juntos.
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                        {analisis.parejasLiderazgo && analisis.parejasLiderazgo.length > 0 ? (
                          analisis.parejasLiderazgo.map(p => (
                            <div key={p.id} className="p-3.5 rounded-2xl border border-border bg-card flex items-center justify-between text-xs">
                              <div className="space-y-1">
                                <span className="font-bold text-foreground block">
                                  {p.esposoNombre} & {p.esposaNombre}
                                </span>
                                <span className="text-muted-foreground block">Grupo: {p.grupoNombre}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  Roles: {p.rolEsposo} / {p.rolEsposa}
                                </span>
                              </div>
                              {p.ambosLideran ? (
                                <BadgeSistema variante="success">Pastorean Juntos</BadgeSistema>
                              ) : (
                                <BadgeSistema variante="info">Pareja en Grupo</BadgeSistema>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 p-6 text-center text-xs text-muted-foreground">
                            No hay parejas en liderazgo registradas para este segmento en particular.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CONTENIDO DE PESTAÑA: RECOMENDACIONES PASTORALES */}
                  {tabDiagnostico === 'recomendaciones' && (
                    <div className="space-y-3 animate-in fade-in duration-100 max-h-72 overflow-y-auto pr-1">
                      {analisis.recomendaciones && analisis.recomendaciones.length > 0 ? (
                        analisis.recomendaciones.map(rec => (
                          <div
                            key={rec.id}
                            className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
                              rec.prioridad === 'alta'
                                ? 'bg-amber-500/10 border-amber-500/30 text-foreground'
                                : 'bg-muted/40 border-border text-foreground'
                            }`}
                          >
                            <div className="p-2 rounded-xl bg-card shrink-0 mt-0.5">
                              {rec.categoria === 'multiplicacion' && <TrendingUp className="w-4 h-4 text-amber-500" />}
                              {rec.categoria === 'sucesion' && <GraduationCap className="w-4 h-4 text-emerald-500" />}
                              {rec.categoria === 'territorio' && <MapPin className="w-4 h-4 text-blue-500" />}
                              {rec.categoria === 'matrimonios' && <Heart className="w-4 h-4 text-rose-500" />}
                              {rec.categoria === 'salud' && <Activity className="w-4 h-4 text-purple-500" />}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm">{rec.titulo}</span>
                                {rec.prioridad === 'alta' && (
                                  <BadgeSistema variante="warning" tamaño="sm">Prioridad Alta</BadgeSistema>
                                )}
                              </div>
                              <p className="text-muted-foreground leading-relaxed">
                                {rec.descripcion}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                          Todos los indicadores de los grupos de vida se encuentran equilibrados.
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : (
                <div className="p-8 text-center space-y-4 rounded-2xl border border-border bg-card">
                  <div className="p-3 w-12 h-12 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <span className="font-bold text-foreground text-sm block">No se pudo cargar el análisis de cierre</span>
                    <TextoSistema variante="sutil" tamaño="sm">
                      Hubo una dificultad al consultar los datos de <strong>{temporadaCierreNombre}</strong> ({segmentoNombre}). Puedes reintentar la consulta o continuar directamente al siguiente paso.
                    </TextoSistema>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <BotonSistema
                      variante="primario"
                      tamaño="sm"
                      icono={RotateCcw}
                      onClick={() => ejecutarAnalisis()}
                      cargando={cargandoDiagnostico}
                    >
                      Reintentar Análisis
                    </BotonSistema>
                    <BotonSistema
                      variante="outline"
                      tamaño="sm"
                      onClick={() => {
                        setSegmentoSeleccionadoId('todos')
                        ejecutarAnalisis(temporadaCierreId, 'todos')
                      }}
                    >
                      Ver Todos los Segmentos
                    </BotonSistema>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 4: MODO DE INICIO DEL WORKSPACE */}
          {paso === 4 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-1">
                <TituloSistema nivel={3}>¿Cómo deseas inicializar el tablero de planificación?</TituloSistema>
                <TextoSistema variante="sutil" tamaño="sm">
                  Selecciona la base sobre la que comenzarás a trabajar en {temporadaPlanificarNombre}.
                </TextoSistema>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Opción 1: Importar Cierre */}
                <div
                  onClick={() => setModoInicio('importar_cierre')}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    modoInicio === 'importar_cierre'
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-card hover:bg-muted/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <RotateCcw className="w-5 h-5" />
                      </div>
                      {modoInicio === 'importar_cierre' && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <span className="font-semibold text-foreground block mb-1">
                      Importar Estructura de Cierre
                    </span>
                    <BadgeSistema variante="success" tamaño="sm" className="mb-2">Recomendado</BadgeSistema>
                    <TextoSistema variante="sutil" tamaño="sm">
                      Trae los líderes, co-líderes y miembros de {temporadaCierreNombre} como base editable para multiplicarlos y reasignarlos.
                    </TextoSistema>
                  </div>
                </div>

                {/* Opción 2: Existente en la temporada */}
                <div
                  onClick={() => setModoInicio('existente')}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    modoInicio === 'existente'
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-card hover:bg-muted/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Layers className="w-5 h-5" />
                      </div>
                      {modoInicio === 'existente' && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <span className="font-semibold text-foreground block mb-1">
                      Grupos Existentes
                    </span>
                    <TextoSistema variante="sutil" tamaño="sm">
                      Carga únicamente los grupos que ya hayan sido guardados previamente en {temporadaPlanificarNombre}.
                    </TextoSistema>
                  </div>
                </div>

                {/* Opción 3: Canvas en Blanco */}
                <div
                  onClick={() => setModoInicio('en_blanco')}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    modoInicio === 'en_blanco'
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-card hover:bg-muted/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                        <Sparkle className="w-5 h-5" />
                      </div>
                      {modoInicio === 'en_blanco' && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <span className="font-semibold text-foreground block mb-1">
                      Tablero en Blanco
                    </span>
                    <TextoSistema variante="sutil" tamaño="sm">
                      Comienza desde cero creando nuevos GDVs y asignando libremente desde el banco de personas.
                    </TextoSistema>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* PIE DE ACCIONES */}
        <div className="p-6 border-t border-border bg-muted/20 flex items-center justify-between">
          <div>
            {paso > 1 ? (
              <BotonSistema
                variante="outline"
                onClick={() => setPaso((p) => (p - 1) as any)}
              >
                Atrás
              </BotonSistema>
            ) : (
              <div className="text-xs text-muted-foreground">
                Paso 1 de 4: Selecciona el segmento
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <BotonSistema
              variante="primario"
              icono={ArrowRight}
              iconoPosicion="derecha"
              onClick={handleSiguientePaso}
            >
              {paso === 4 ? 'Entrar al Planificador' : 'Continuar'}
            </BotonSistema>
          </div>
        </div>

      </div>
    </div>
  )
}
