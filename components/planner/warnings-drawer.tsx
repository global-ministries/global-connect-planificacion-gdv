'use client'

import React, { useState, useMemo } from 'react'
import {
  TarjetaSistema,
  BotonSistema,
  BadgeSistema,
  TituloSistema,
  TextoSistema,
  SeparadorSistema,
  InputSistema
} from '@/components/ui/sistema-diseno'
import {
  X,
  AlertTriangle,
  RotateCcw,
  MapPin,
  Users,
  ShieldAlert,
  Heart,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Info
} from 'lucide-react'
import { AdvertenciaPlanificacion, GrupoGDVPlanner, TipoAdvertencia } from '@/lib/planner/types'
import { useNotificaciones } from '@/hooks/use-notificaciones'

interface WarningsDrawerProps {
  isOpen: boolean
  onClose: () => void
  advertencias: AdvertenciaPlanificacion[]
  grupos: GrupoGDVPlanner[]
  onEditarGrupo?: (grupo: GrupoGDVPlanner) => void
}

export function WarningsDrawer({
  isOpen,
  onClose,
  advertencias,
  grupos,
  onEditarGrupo
}: WarningsDrawerProps) {
  const toast = useNotificaciones()
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroNivel, setFiltroNivel] = useState<string>('todos')
  const [copiado, setCopiado] = useState(false)

  // Desglose de métricas por categoría
  const stats = useMemo(() => {
    let erroresCriticos = 0
    let crucesTerritorio = 0
    let sobrecupo = 0
    let repeticiones = 0
    let matrimonios = 0
    let otros = 0

    for (const adv of advertencias) {
      if (adv.nivel === 'error' || adv.tipo === 'sin_lider' || adv.tipo === 'conyuge_separado') {
        erroresCriticos++
      }
      if (adv.tipo === 'ciudad_incompatible') {
        crucesTerritorio++
      } else if (adv.tipo === 'sobrecupo') {
        sobrecupo++
      } else if (adv.tipo === 'repite_lider') {
        repeticiones++
      } else if (adv.tipo === 'conyuge_separado') {
        matrimonios++
      } else {
        otros++
      }
    }

    return {
      total: advertencias.length,
      erroresCriticos,
      crucesTerritorio,
      sobrecupo,
      repeticiones,
      matrimonios,
      otros
    }
  }, [advertencias])

  // Filtrado reactivo de advertencias
  const advertenciasFiltradas = useMemo(() => {
    return advertencias.filter(adv => {
      // Filtro por nivel
      if (filtroNivel === 'errores' && adv.nivel !== 'error') return false
      if (filtroNivel === 'warnings' && adv.nivel !== 'warning') return false

      // Filtro por tipo
      if (filtroTipo === 'territorio' && adv.tipo !== 'ciudad_incompatible') return false
      if (filtroTipo === 'sobrecupo' && adv.tipo !== 'sobrecupo') return false
      if (filtroTipo === 'repite_lider' && adv.tipo !== 'repite_lider') return false
      if (filtroTipo === 'conyuge_separado' && adv.tipo !== 'conyuge_separado') return false
      if (filtroTipo === 'criticas' && adv.nivel !== 'error' && adv.tipo !== 'sin_lider' && adv.tipo !== 'conyuge_separado') return false

      // Filtro por texto de búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim()
        const mensajeMatch = adv.mensaje.toLowerCase().includes(q)
        return mensajeMatch
      }

      return true
    })
  }, [advertencias, filtroTipo, filtroNivel, busqueda])

  const getIconoPorTipo = (tipo: TipoAdvertencia, nivel: AdvertenciaPlanificacion['nivel']) => {
    if (nivel === 'error' || tipo === 'sin_lider') return ShieldAlert
    if (tipo === 'ciudad_incompatible') return MapPin
    if (tipo === 'sobrecupo') return Users
    if (tipo === 'repite_lider') return RotateCcw
    if (tipo === 'conyuge_separado') return Heart
    return AlertTriangle
  }

  const getColoresPorTipo = (tipo: TipoAdvertencia, nivel: AdvertenciaPlanificacion['nivel']) => {
    if (nivel === 'error' || tipo === 'sin_lider') {
      return {
        badge: 'error' as const,
        border: 'border-destructive/40 bg-destructive/10 text-destructive',
        iconColor: 'text-destructive',
        tagText: 'Crítica / Error'
      }
    }
    if (tipo === 'repite_lider') {
      return {
        badge: 'warning' as const,
        border: 'border-amber-500/35 bg-amber-500/10 text-amber-400',
        iconColor: 'text-amber-400',
        tagText: 'Rotación Pastoral'
      }
    }
    if (tipo === 'ciudad_incompatible') {
      return {
        badge: 'info' as const,
        border: 'border-blue-500/35 bg-blue-500/10 text-blue-400',
        iconColor: 'text-blue-400',
        tagText: 'Cruce Territorial'
      }
    }
    if (tipo === 'sobrecupo') {
      return {
        badge: 'warning' as const,
        border: 'border-orange-500/35 bg-orange-500/10 text-orange-400',
        iconColor: 'text-orange-400',
        tagText: 'Capacidad'
      }
    }
    return {
      badge: 'default' as const,
      border: 'border-border/60 bg-card/60 text-foreground',
      iconColor: 'text-muted-foreground',
      tagText: 'Observación'
    }
  }

  // Copiar resumen de auditoría al portapapeles
  const handleCopiarReporte = () => {
    const lineas = [
      `=== REPORTE DE AUDITORÍA PASTORAL - GDV ===`,
      `Fecha: ${new Date().toLocaleString('es-VE')}`,
      `Total Observaciones: ${advertencias.length}`,
      `- Críticas / Sin Líder: ${stats.erroresCriticos}`,
      `- Cruces Territoriales: ${stats.crucesTerritorio}`,
      `- Grupos con Sobrecupo: ${stats.sobrecupo}`,
      `- Rotaciones que Repiten Líder: ${stats.repeticiones}`,
      ``,
      `--- DETALLE DE OBSERVACIONES ---`,
      ...advertencias.slice(0, 100).map((a, i) => `${i + 1}. [${a.tipo.toUpperCase()}] ${a.mensaje}`)
    ]

    navigator.clipboard.writeText(lineas.join('\n'))
    setCopiado(true)
    toast.success('Reporte de auditoría copiado al portapapeles')
    setTimeout(() => setCopiado(false), 2500)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* HEADER DEL DRAWER */}
        <div className="p-5 border-b border-border/80 flex items-center justify-between bg-card/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <TituloSistema nivel={3} className="text-base font-bold text-foreground">
                  Centro de Auditoría & Diagnóstico
                </TituloSistema>
                <BadgeSistema
                  variante={stats.erroresCriticos > 0 ? 'error' : stats.total > 0 ? 'warning' : 'success'}
                  tamaño="sm"
                >
                  {stats.total} {stats.total === 1 ? 'observación' : 'observaciones'}
                </BadgeSistema>
              </div>
              <TextoSistema variante="sutil" tamaño="sm">
                Validación de reglas pastorales, territoriales y de capacidad en tiempo real.
              </TextoSistema>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopiarReporte}
              className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Copiar reporte completo al portapapeles"
            >
              {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MÉTRICAS RÁPIDAS EN PILLS */}
        <div className="p-4 border-b border-border/60 bg-muted/20 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div
              onClick={() => { setFiltroTipo('criticas'); setFiltroNivel('todos') }}
              className={`p-2 rounded-xl border cursor-pointer transition-all ${
                filtroTipo === 'criticas'
                  ? 'border-destructive bg-destructive/15 text-destructive font-bold shadow-sm'
                  : 'border-border/60 bg-card/60 hover:bg-card text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Críticas</span>
                <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
              </div>
              <div className="text-lg font-bold text-foreground mt-0.5">{stats.erroresCriticos}</div>
            </div>

            <div
              onClick={() => { setFiltroTipo('territorio'); setFiltroNivel('todos') }}
              className={`p-2 rounded-xl border cursor-pointer transition-all ${
                filtroTipo === 'territorio'
                  ? 'border-blue-500 bg-blue-500/15 text-blue-400 font-bold shadow-sm'
                  : 'border-border/60 bg-card/60 hover:bg-card text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Territorio</span>
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-lg font-bold text-foreground mt-0.5">{stats.crucesTerritorio}</div>
            </div>

            <div
              onClick={() => { setFiltroTipo('sobrecupo'); setFiltroNivel('todos') }}
              className={`p-2 rounded-xl border cursor-pointer transition-all ${
                filtroTipo === 'sobrecupo'
                  ? 'border-orange-500 bg-orange-500/15 text-orange-400 font-bold shadow-sm'
                  : 'border-border/60 bg-card/60 hover:bg-card text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Capacidad</span>
                <Users className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="text-lg font-bold text-foreground mt-0.5">{stats.sobrecupo}</div>
            </div>

            <div
              onClick={() => { setFiltroTipo('repite_lider'); setFiltroNivel('todos') }}
              className={`p-2 rounded-xl border cursor-pointer transition-all ${
                filtroTipo === 'repite_lider'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-400 font-bold shadow-sm'
                  : 'border-border/60 bg-card/60 hover:bg-card text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Rotación</span>
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-bold text-foreground mt-0.5">{stats.repeticiones}</div>
            </div>
          </div>

          {/* BUSCADOR Y PESTAÑAS DE FILTRO */}
          <div className="space-y-2">
            <InputSistema
              label=""
              placeholder="Buscar persona, grupo o tipo de alerta..."
              icono={Search}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs select-none">
              <button
                onClick={() => { setFiltroTipo('todos'); setFiltroNivel('todos') }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                  filtroTipo === 'todos'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border/50'
                }`}
              >
                Todas ({advertencias.length})
              </button>

              <button
                onClick={() => setFiltroTipo('criticas')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                  filtroTipo === 'criticas'
                    ? 'bg-destructive text-destructive-foreground shadow-sm'
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border/50'
                }`}
              >
                Críticas ({stats.erroresCriticos})
              </button>

              <button
                onClick={() => setFiltroTipo('territorio')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                  filtroTipo === 'territorio'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border/50'
                }`}
              >
                Cruces Ciudad ({stats.crucesTerritorio})
              </button>

              <button
                onClick={() => setFiltroTipo('sobrecupo')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                  filtroTipo === 'sobrecupo'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border/50'
                }`}
              >
                Capacidad ({stats.sobrecupo})
              </button>

              <button
                onClick={() => setFiltroTipo('repite_lider')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                  filtroTipo === 'repite_lider'
                    ? 'bg-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border/50'
                }`}
              >
                Rotación ({stats.repeticiones})
              </button>
            </div>
          </div>
        </div>

        {/* LISTADO DE ADVERTENCIAS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {advertenciasFiltradas.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="p-3.5 rounded-full bg-emerald-500/10 text-emerald-400 w-fit mx-auto border border-emerald-500/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <TituloSistema nivel={4} className="text-sm font-bold text-foreground">
                {advertencias.length === 0
                  ? '¡Planificación 100% Impecable!'
                  : 'No hay alertas con estos filtros'}
              </TituloSistema>
              <TextoSistema variante="sutil" tamaño="sm" className="max-w-xs mx-auto">
                {advertencias.length === 0
                  ? 'Todas las reglas pastorales, capacidades y asignaciones territoriales se cumplen a la perfección.'
                  : 'Prueba cambiando los filtros o el término de búsqueda para ver otras observaciones.'}
              </TextoSistema>
            </div>
          ) : (
            advertenciasFiltradas.map(adv => {
              const Icono = getIconoPorTipo(adv.tipo, adv.nivel)
              const estilo = getColoresPorTipo(adv.tipo, adv.nivel)
              const grupoAsociado = adv.grupo_id ? grupos.find(g => g.id === adv.grupo_id) : null

              return (
                <div
                  key={adv.id}
                  className={`p-3.5 rounded-2xl border transition-all ${estilo.border} flex flex-col gap-2`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-xl bg-card shrink-0 mt-0.5 border border-border/40 ${estilo.iconColor}`}>
                        <Icono className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-card/90 border border-border/50">
                            {estilo.tagText}
                          </span>
                          {grupoAsociado && (
                            <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                              <span>GDV: {grupoAsociado.nombre}</span>
                              <span className="text-[10px] text-muted-foreground">({grupoAsociado.ciudad})</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-[13px] text-foreground leading-relaxed">
                          {adv.mensaje}
                        </p>
                      </div>
                    </div>

                    {/* Botón de acción rápida hacia el grupo */}
                    {grupoAsociado && onEditarGrupo && (
                      <button
                        onClick={() => {
                          onEditarGrupo(grupoAsociado)
                          onClose()
                        }}
                        className="p-1.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors shrink-0 flex items-center gap-1 text-[11px] font-medium"
                        title="Ver y editar este grupo GDV"
                      >
                        <span>Ver GDV</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* FOOTER DEL DRAWER */}
        <div className="p-4 border-t border-border bg-card/90 flex items-center justify-between text-xs text-muted-foreground">
          <span>Mostrando {advertenciasFiltradas.length} de {advertencias.length} observaciones</span>
          <BotonSistema
            variante="secundario"
            tamaño="sm"
            onClick={onClose}
          >
            Cerrar Panel
          </BotonSistema>
        </div>
      </div>
    </div>
  )
}
