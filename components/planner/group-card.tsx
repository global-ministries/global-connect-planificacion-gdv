'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { dropTargetForElements, draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { GrupoGDVPlanner, PersonaPlanner, RolEnGrupo, AdvertenciaPlanificacion } from '@/lib/planner/types'
import { TarjetaSistema, BadgeSistema } from '@/components/ui/sistema-diseno'
import { MemberCard } from './member-card'
import {
  Shield,
  GraduationCap,
  Users,
  MapPin,
  AlertTriangle,
  RotateCcw,
  Heart,
  Pencil,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react'

interface GroupCardProps {
  grupo: GrupoGDVPlanner
  advertencias?: AdvertenciaPlanificacion[]
  layoutHorizontal?: boolean
  onAsignar: (
    persona: PersonaPlanner,
    grupoId: string,
    rol?: RolEnGrupo,
    arrastrarConyuge?: boolean
  ) => void
  onDesasignar: (personaId: string) => void
  onAbrirMover: (persona: PersonaPlanner) => void
  onEditarGrupo?: (grupo: GrupoGDVPlanner) => void
  onReordenarGrupo?: (sourceGrupoId: string, targetGrupoId: string) => void
  onMoverGrupoIzquierda?: () => void
  onMoverGrupoDerecha?: () => void
  puedeMoverIzquierda?: boolean
  puedeMoverDerecha?: boolean
}

export function GroupCard({
  grupo,
  advertencias = [],
  layoutHorizontal = true,
  onAsignar,
  onDesasignar,
  onAbrirMover,
  onEditarGrupo,
  onReordenarGrupo,
  onMoverGrupoIzquierda,
  onMoverGrupoDerecha,
  puedeMoverIzquierda = false,
  puedeMoverDerecha = false
}: GroupCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)
  const leaderDropRef = useRef<HTMLDivElement>(null)
  const apprenticeDropRef = useRef<HTMLDivElement>(null)
  const membersDropRef = useRef<HTMLDivElement>(null)

  const [isOverCard, setIsOverCard] = useState(false)
  const [isOverLeader, setIsOverLeader] = useState(false)
  const [isOverApprentice, setIsOverApprentice] = useState(false)
  const [isOverMembers, setIsOverMembers] = useState(false)
  const [isDraggingColumn, setIsDraggingColumn] = useState(false)

  const esGrupoMatrimonios =
    (grupo.segmento_nombre || '').toLowerCase().includes('matrimonio') ||
    (grupo.nombre || '').toLowerCase().includes('matrimonio') ||
    grupo.segmento === 'matrimonios'

  // Dragging de la columna completa (para reordenar estilo Trello)
  useEffect(() => {
    const handleEl = dragHandleRef.current
    const cardEl = cardRef.current
    if (!handleEl || !cardEl || !onReordenarGrupo) return

    return draggable({
      element: handleEl,
      getInitialData: () => ({ type: 'grupo-columna', grupoId: grupo.id }),
      onDragStart: () => setIsDraggingColumn(true),
      onDrop: () => setIsDraggingColumn(false)
    })
  }, [grupo.id, onReordenarGrupo])

  // Drop target general de la tarjeta (acepta personas sueltas O columnas reordenables)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) =>
        source.data.type === 'persona' || (source.data.type === 'grupo-columna' && source.data.grupoId !== grupo.id),
      onDragEnter: ({ location, source }) => {
        if (location.current.dropTargets[0]?.element === el) {
          setIsOverCard(true)
        }
      },
      onDragLeave: () => setIsOverCard(false),
      onDrop: ({ source, location }) => {
        setIsOverCard(false)
        if (source.data.type === 'grupo-columna' && onReordenarGrupo) {
          const sourceId = source.data.grupoId as string
          if (sourceId !== grupo.id) {
            onReordenarGrupo(sourceId, grupo.id)
          }
          return
        }

        // Solo actuar si el drop target más específico es la propia tarjeta general
        if (location.current.dropTargets[0]?.element === el && source.data.type === 'persona') {
          const persona = source.data.persona as PersonaPlanner
          onAsignar(persona, grupo.id, 'miembro', true)
        }
      }
    })
  }, [grupo.id, onAsignar, onReordenarGrupo])

  // Drop target para Líderes (Líder Principal / Pareja de Líderes)
  useEffect(() => {
    const el = leaderDropRef.current
    if (!el) return

    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data.type === 'persona',
      onDragEnter: () => setIsOverLeader(true),
      onDragLeave: () => setIsOverLeader(false),
      onDrop: ({ source }) => {
        setIsOverLeader(false)
        if (source.data.type === 'persona') {
          const persona = source.data.persona as PersonaPlanner
          onAsignar(persona, grupo.id, 'lider', true)
        }
      }
    })
  }, [grupo.id, onAsignar, esGrupoMatrimonios])

  // Drop target para Aprendiz / Pareja de Aprendices
  useEffect(() => {
    const el = apprenticeDropRef.current
    if (!el) return

    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data.type === 'persona',
      onDragEnter: () => setIsOverApprentice(true),
      onDragLeave: () => setIsOverApprentice(false),
      onDrop: ({ source }) => {
        setIsOverApprentice(false)
        if (source.data.type === 'persona') {
          const persona = source.data.persona as PersonaPlanner
          onAsignar(persona, grupo.id, 'aprendiz', true)
        }
      }
    })
  }, [grupo.id, onAsignar, esGrupoMatrimonios])

  // Drop target para Miembros
  useEffect(() => {
    const el = membersDropRef.current
    if (!el) return

    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data.type === 'persona',
      onDragEnter: () => setIsOverMembers(true),
      onDragLeave: () => setIsOverMembers(false),
      onDrop: ({ source }) => {
        setIsOverMembers(false)
        if (source.data.type === 'persona') {
          const persona = source.data.persona as PersonaPlanner
          onAsignar(persona, grupo.id, 'miembro', true)
        }
      }
    })
  }, [grupo.id, onAsignar])

  const totalIntegrantes =
    (grupo.miembros?.length || 0) +
    (grupo.lider_principal ? 1 : 0) +
    (grupo.co_lider ? 1 : 0) +
    (grupo.aprendices?.length || 0)

  const cuposLibres = Math.max(0, grupo.capacidad_maxima - totalIntegrantes)
  const sobrecupo = totalIntegrantes > grupo.capacidad_maxima
  const advertenciasGrupo = advertencias.filter(a => a.grupo_id === grupo.id)

  const repeticionesLider = advertenciasGrupo.filter(a => a.tipo === 'repite_lider')
  const ciudadIncompatible = advertenciasGrupo.find(a => a.tipo === 'ciudad_incompatible')

  // Ordenar miembros por parejas consecutivas
  const miembrosOrdenados = useMemo(() => {
    const raw = [...(grupo.miembros || [])]
    const visitados = new Set<string>()
    const resultado: typeof grupo.miembros = []

    for (const m of raw) {
      if (visitados.has(m.persona_id)) continue
      resultado.push(m)
      visitados.add(m.persona_id)

      // Si tiene cónyuge en este grupo, colocarlo inmediatamente después
      const conyugeId = m.persona?.conyuge_id
      if (conyugeId) {
        const pareja = raw.find(otro => otro.persona_id === conyugeId)
        if (pareja && !visitados.has(pareja.persona_id)) {
          resultado.push(pareja)
          visitados.add(pareja.persona_id)
        }
      }
    }

    return resultado
  }, [grupo.miembros])

  // Conjunto de IDs de miembros que tienen a su cónyuge dentro de los miembros de este grupo
  const conyugesEnGrupo = useMemo(() => {
    const set = new Set<string>()
    const allIds = new Set((grupo.miembros || []).map(m => m.persona_id))
    for (const m of grupo.miembros || []) {
      if (m.persona?.conyuge_id && allIds.has(m.persona.conyuge_id)) {
        set.add(m.persona_id)
        set.add(m.persona.conyuge_id)
      }
    }
    return set
  }, [grupo.miembros])

  return (
    <TarjetaSistema
      ref={cardRef}
      variante="default"
      className={`p-3 sm:p-4 space-y-3 sm:space-y-3.5 transition-all relative flex flex-col min-w-[280px] ${
        layoutHorizontal ? 'w-[300px] sm:w-[350px] md:w-[370px] shrink-0' : 'w-full'
      } ${
        isDraggingColumn ? 'opacity-40 scale-95 border-dashed border-primary' : ''
      } ${
        isOverCard
          ? 'ring-2 ring-primary bg-primary/5 shadow-xl border-primary/60'
          : 'hover:border-border/90 shadow-sm'
      }`}
    >
      {/* BARRA SUPERIOR: Reordenar + Título + Editar + Mover */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          
          {/* Lado Izquierdo: Handle + Título */}
          <div className="flex items-start gap-1 min-w-0 flex-1">
            {onReordenarGrupo && (
              <div
                ref={dragHandleRef}
                className="p-1 -ml-1 mt-0.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 cursor-grab active:cursor-grabbing transition-colors shrink-0"
                title="Arrastrar columna para reordenar posición"
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="font-bold text-foreground text-xs sm:text-sm truncate flex items-center gap-1.5" title={grupo.nombre}>
                <span className="truncate">{grupo.nombre}</span>
                {esGrupoMatrimonios && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-500/20 shrink-0 whitespace-nowrap">
                    <Heart className="w-2.5 h-2.5 fill-rose-600 dark:fill-rose-400 shrink-0" />
                    Matrimonios
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1 font-medium text-foreground/80 shrink-0">
                  <MapPin className="w-3 h-3 text-primary shrink-0" />
                  {grupo.ciudad} {grupo.zona ? `• ${grupo.zona}` : ''}
                </span>
                {grupo.segmento_nombre && (
                  <span className="text-muted-foreground/80 truncate">• {grupo.segmento_nombre}</span>
                )}
              </div>
            </div>
          </div>

          {/* Lado Derecho: Acciones Rápidas (Editar, Flechas, Capacidad) */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            
            {/* Flechas de mover izquierda/derecha en 1-clic */}
            {onMoverGrupoIzquierda && puedeMoverIzquierda && (
              <button
                type="button"
                onClick={onMoverGrupoIzquierda}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Mover columna a la izquierda"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {onMoverGrupoDerecha && puedeMoverDerecha && (
              <button
                type="button"
                onClick={onMoverGrupoDerecha}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Mover columna a la derecha"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Botón Editar Grupo */}
            {onEditarGrupo && (
              <button
                type="button"
                onClick={() => onEditarGrupo(grupo)}
                className="p-1 sm:p-1.5 rounded-lg bg-muted/40 hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border/40 transition-colors"
                title="Editar datos, capacidad y asignaciones de este grupo"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Contador de Capacidad */}
            <BadgeSistema
              variante={sobrecupo ? 'error' : totalIntegrantes === 0 ? 'warning' : 'default'}
              tamaño="sm"
            >
              {totalIntegrantes}/{grupo.capacidad_maxima}
            </BadgeSistema>
          </div>
        </div>

        {/* Badges de Repetición / Advertencias */}
        {repeticionesLider.length > 0 && (
          <div className="flex items-center gap-1">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap"
              title={`${repeticionesLider.length} integrante(s) repiten con el líder de la temporada anterior`}
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              {repeticionesLider.length} repite líder
            </span>
          </div>
        )}
      </div>

      {/* Alerta de Incompatibilidad Territorial */}
      {ciudadIncompatible && (
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate text-[11px] font-medium">{ciudadIncompatible.mensaje}</span>
        </div>
      )}

      {/* SECCIÓN 1: LIDERAZGO (LÍDER + APRENDICES) */}
      <div className="space-y-2">
        
        {/* Zona Drop Líder Principal & Co-Líder */}
        <div
          ref={leaderDropRef}
          className={`p-2.5 rounded-2xl border transition-all space-y-1.5 ${
            isOverLeader
              ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500 shadow-md'
              : 'border-border/60 bg-muted/15'
          }`}
        >
          <div className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-500" />
              {esGrupoMatrimonios ? 'Liderazgo (Pareja de Líderes)' : 'Líder Principal'}
            </span>
            <span className="text-[10px] text-muted-foreground/70 font-normal">
              Arrastra aquí para asignar
            </span>
          </div>

          {grupo.lider_principal ? (
            <div className="space-y-1.5">
              <MemberCard
                persona={grupo.lider_principal}
                rol="lider"
                grupoId={grupo.id}
                grupoLiderId={grupo.lider_principal.id}
                compact
                esParejaConyugal={Boolean(grupo.co_lider)}
                onDesasignar={onDesasignar}
                onAbrirMover={onAbrirMover}
              />

              {grupo.co_lider ? (
                <MemberCard
                  persona={grupo.co_lider}
                  rol="lider"
                  grupoId={grupo.id}
                  grupoLiderId={grupo.lider_principal.id}
                  compact
                  esParejaConyugal={true}
                  onDesasignar={onDesasignar}
                  onAbrirMover={onAbrirMover}
                />
              ) : esGrupoMatrimonios && grupo.lider_principal.conyuge_id && (
                <div className="p-1.5 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 text-[10px] text-amber-400/90 text-center flex items-center justify-center gap-1">
                  <Heart className="w-3 h-3 text-rose-400" />
                  <span>Arrastra al cónyuge para completar la pareja</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-2.5 text-xs text-amber-400/90 italic font-medium flex items-center justify-center gap-1.5 border border-dashed border-amber-500/30 rounded-xl bg-amber-500/5">
              <Shield className="w-3.5 h-3.5 opacity-70" />
              <span>
                {esGrupoMatrimonios
                  ? 'Soltar aquí Pareja de Líderes'
                  : 'Soltar aquí Líder Principal'}
              </span>
            </div>
          )}
        </div>

        {/* Zona Drop Aprendiz */}
        <div
          ref={apprenticeDropRef}
          className={`p-2 rounded-xl border transition-all space-y-1.5 ${
            isOverApprentice
              ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500 shadow-md'
              : 'border-border/40 bg-card/40'
          }`}
        >
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-emerald-400" />
              {esGrupoMatrimonios ? 'Aprendices (Pareja)' : 'Aprendiz'}
            </span>
          </div>

          {grupo.aprendices.length === 0 ? (
            <div className="text-center py-1.5 text-xs text-muted-foreground/70 italic border border-dashed border-border/40 rounded-lg">
              {esGrupoMatrimonios
                ? 'Soltar aquí para asignar Aprendices'
                : 'Soltar aquí para asignar Aprendiz'}
            </div>
          ) : (
            grupo.aprendices.map(ap => {
              const tieneParejaEnAprendices = Boolean(
                ap.conyuge_id && grupo.aprendices.some(otro => otro.id === ap.conyuge_id)
              )
              return (
                <MemberCard
                  key={ap.id}
                  persona={ap}
                  rol="aprendiz"
                  grupoId={grupo.id}
                  grupoLiderId={grupo.lider_principal?.id}
                  compact
                  esParejaConyugal={tieneParejaEnAprendices}
                  onDesasignar={onDesasignar}
                  onAbrirMover={onAbrirMover}
                />
              )
            })
          )}
        </div>
      </div>

      {/* SECCIÓN 2: INTEGRANTES / MIEMBROS (COMPLETO Y VISIBLE) */}
      <div className="space-y-2 flex-1 flex flex-col">
        <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between gap-1.5">
          <span className="flex items-center gap-1.5 min-w-0">
            <Users className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">Integrantes ({grupo.miembros.length})</span>
            {esGrupoMatrimonios && (
              <span className="text-[10px] font-normal text-rose-500 dark:text-rose-400 shrink-0 whitespace-nowrap">
                (Parejas)
              </span>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground/80 font-mono shrink-0 whitespace-nowrap">
            {cuposLibres} cupos libres
          </span>
        </div>

        {/* Zona Drop Miembros: Sin alturas restrictivas que corten a la gente */}
        <div
          ref={membersDropRef}
          className={`min-h-[140px] p-2 rounded-2xl border space-y-1.5 transition-all flex-1 ${
            isOverMembers
              ? 'border-primary bg-primary/10 ring-2 ring-primary shadow-inner'
              : 'border-border/60 bg-muted/10'
          }`}
        >
          {miembrosOrdenados.length === 0 ? (
            <div className="h-28 flex flex-col items-center justify-center text-center p-3 text-muted-foreground/70 text-xs italic">
              <Users className="w-5 h-5 mb-1.5 opacity-40" />
              <span>Arrastra personas aquí para sumarlas al GDV</span>
            </div>
          ) : (
            miembrosOrdenados.map(m => {
              const tieneParejaEnGrupo = conyugesEnGrupo.has(m.persona_id)
              return (
                <MemberCard
                  key={m.persona_id}
                  persona={m.persona || { id: m.persona_id, nombre: 'Miembro', apellido: '' }}
                  rol="miembro"
                  grupoId={grupo.id}
                  grupoLiderId={grupo.lider_principal?.id}
                  compact
                  esParejaConyugal={tieneParejaEnGrupo}
                  onDesasignar={onDesasignar}
                  onAbrirMover={onAbrirMover}
                />
              )
            })
          )}
        </div>

        {/* Botón inferior para edición rápida directa */}
        {onEditarGrupo && (
          <button
            type="button"
            onClick={() => onEditarGrupo(grupo)}
            className="w-full py-1.5 rounded-xl border border-dashed border-border/80 hover:border-primary/50 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 flex items-center justify-center gap-1 transition-colors mt-1"
          >
            <Plus className="w-3 h-3" />
            <span>Gestionar / Añadir personas</span>
          </button>
        )}
      </div>
    </TarjetaSistema>
  )
}
