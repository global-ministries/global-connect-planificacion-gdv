'use client'

import React, { useEffect, useRef, useState } from 'react'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { PersonaPlanner, RolEnGrupo } from '@/lib/planner/types'
import { BadgeSistema } from '@/components/ui/sistema-diseno'
import {
  GripVertical,
  Heart,
  MapPin,
  RotateCcw,
  ArrowRightLeft,
  X,
  Shield,
  GraduationCap
} from 'lucide-react'

interface MemberCardProps {
  persona: PersonaPlanner
  rol?: RolEnGrupo
  grupoId?: string
  grupoLiderId?: string
  grupoNombre?: string
  compact?: boolean
  isSelected?: boolean
  esParejaConyugal?: boolean
  onSelect?: () => void
  onDesasignar?: (personaId: string) => void
  onAbrirMover?: (persona: PersonaPlanner) => void
}

export function MemberCard({
  persona,
  rol,
  grupoId,
  grupoLiderId,
  grupoNombre,
  compact = false,
  isSelected = false,
  esParejaConyugal = false,
  onSelect,
  onDesasignar,
  onAbrirMover
}: MemberCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const element = cardRef.current
    if (!element) return

    return draggable({
      element,
      getInitialData: () => ({
        type: 'persona',
        persona,
        sourceGrupoId: grupoId || null,
        sourceRol: rol || 'miembro',
        tieneConyuge: Boolean(persona.conyuge_id)
      }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false)
    })
  }, [persona, grupoId, rol])

  // Validar si repite con el mismo líder anterior
  const repiteLider = Boolean(
    persona.lider_anterior_id &&
    grupoLiderId &&
    persona.lider_anterior_id === grupoLiderId
  )

  const esLider = rol === 'lider'
  const esAprendiz = rol === 'aprendiz'
  const esCoLider = rol === 'co_lider'

  if (compact) {
    return (
      <div
        ref={cardRef}
        className={`group relative flex items-center justify-between gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none min-h-[40px] ${
          isDragging
            ? 'opacity-40 scale-95 border-primary bg-primary/20 shadow-lg'
            : esParejaConyugal
              ? 'bg-rose-500/[0.06] border-rose-500/35 hover:border-rose-500/60 hover:bg-rose-500/[0.10]'
              : 'bg-card/80 hover:bg-card border-border/60 hover:border-border hover:shadow-sm'
        } ${repiteLider ? 'bg-amber-500/10 border-amber-500/40' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 group-hover:text-foreground transition-colors" />
          
          {esLider && <Shield className="w-3.5 h-3.5 text-primary shrink-0" title="Líder Principal" />}
          {esCoLider && <Shield className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" title="Co-Líder / Pareja Líder" />}
          {esAprendiz && <GraduationCap className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" title="Aprendiz" />}
          
          <div className="flex-1 min-w-[50px] font-medium text-foreground text-xs leading-tight truncate" title={`${persona.nombre} ${persona.apellido}`}>
            {persona.nombre} {persona.apellido}
          </div>

          {/* Badges contenedores */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Edad en vista compacta */}
            {persona.edad !== undefined && persona.edad !== null && (
              <span
                className="text-[9px] sm:text-[10px] px-1 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium shrink-0 whitespace-nowrap"
                title={`${persona.edad} años`}
              >
                {persona.edad}a
              </span>
            )}

            {/* Identificador de Cónyuge / Pareja */}
            {persona.conyuge_nombre && (
              <span
                className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-medium shrink-0 whitespace-nowrap ${
                  esParejaConyugal
                    ? 'bg-rose-500/15 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/35 dark:border-rose-500/40'
                    : 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-700/90 dark:text-rose-300/90 border border-rose-500/25 dark:border-rose-500/30'
                }`}
                title={`Pareja conyugal de: ${persona.conyuge_nombre}`}
              >
                <Heart className="w-2.5 h-2.5 fill-rose-600 dark:fill-rose-400 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="max-w-[45px] sm:max-w-[70px] truncate font-medium">{persona.conyuge_nombre.split(' ')[0]}</span>
              </span>
            )}

            {/* Insignia Repite Líder */}
            {repiteLider && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold bg-amber-500/15 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 dark:border-amber-500/35 shrink-0 whitespace-nowrap"
                title={`Excepción Pastoral: Repite con su líder anterior (${persona.lider_anterior_nombre || ''})`}
              >
                <RotateCcw className="w-2.5 h-2.5 text-amber-700 dark:text-amber-300 shrink-0" />
                <span>Repite</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {onAbrirMover && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAbrirMover(persona)
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              title="Mover a otro grupo..."
            >
              <ArrowRightLeft className="w-3 h-3" />
            </button>
          )}

          {onDesasignar && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDesasignar(persona.id)
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              title="Quitar del grupo (libera a la pareja si están asignados juntos)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={`group relative p-3 rounded-2xl border transition-all cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? 'opacity-40 scale-95 border-primary bg-primary/20 shadow-xl ring-2 ring-primary'
          : isSelected
            ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
            : esParejaConyugal || persona.conyuge_id
              ? 'bg-rose-500/[0.03] hover:bg-rose-500/[0.07] border-rose-500/30 hover:border-rose-500/50 hover:shadow-md'
              : 'bg-card/70 hover:bg-card border-border/60 hover:border-border hover:shadow-md'
      } ${repiteLider ? 'border-amber-500/40 bg-amber-500/5' : ''}`}
    >
      {/* Cabecera de la tarjeta */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <GripVertical className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
          
          <div className="min-w-0">
            <div className="font-semibold text-foreground text-sm flex items-center gap-1.5 truncate">
              {persona.nombre} {persona.apellido}
              {persona.conyuge_nombre && (
                <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0 fill-rose-400" title={`Cónyuge: ${persona.conyuge_nombre}`} />
              )}
            </div>

            {/* Ubicación y Territorio / Edad */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 font-medium text-foreground/80">
                <MapPin className="w-3 h-3 text-primary/70" />
                {persona.ciudad || 'Barquisimeto'}
                {persona.zona ? ` • ${persona.zona}` : ''}
              </span>
              {persona.edad !== undefined && persona.edad !== null && (
                <span className="text-[11px] font-normal text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-md border border-border/50">
                  {persona.edad} años
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Badge de Rol o Estado */}
        <div className="shrink-0">
          {rol ? (
            <BadgeSistema
              variante={esLider ? 'default' : esCoLider ? 'error' : esAprendiz ? 'info' : 'secondary'}
              tamaño="sm"
            >
              {esLider ? 'Líder' : esCoLider ? 'Co-Líder' : esAprendiz ? 'Aprendiz' : 'Miembro'}
            </BadgeSistema>
          ) : grupoNombre ? (
            <BadgeSistema variante="success" tamaño="sm">
              Asignado
            </BadgeSistema>
          ) : (
            <BadgeSistema variante="warning" tamaño="sm">
              Disponible
            </BadgeSistema>
          )}
        </div>
      </div>

      {/* Cónyuge vinculado */}
      {persona.conyuge_nombre && (
        <div className="mt-2 text-[11px] text-rose-700 dark:text-rose-300 flex items-center justify-between bg-rose-500/10 dark:bg-rose-500/15 px-2 py-1 rounded-lg border border-rose-500/25 dark:border-rose-500/30">
          <span className="flex items-center gap-1.5 truncate">
            <Heart className="w-3 h-3 shrink-0 fill-rose-600 dark:fill-rose-400 text-rose-600 dark:text-rose-400" />
            <span>Pareja: <strong>{persona.conyuge_nombre}</strong></span>
          </span>
          <span className="text-[10px] text-rose-700/80 dark:text-rose-300/80 font-medium">Se mueve en pareja</span>
        </div>
      )}

      {/* Historial de líder anterior */}
      {persona.lider_anterior_nombre && (
        <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center justify-between bg-muted/30 px-2 py-1 rounded-lg">
          <span className="truncate">Líder anterior: {persona.lider_anterior_nombre}</span>
          {repiteLider && (
            <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-0.5 shrink-0">
              <RotateCcw className="w-2.5 h-2.5" />
              Repite
            </span>
          )}
        </div>
      )}

      {/* Botones de acción inferior */}
      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <span className="opacity-70">Arrastra para asignar</span>
        </div>

        <div className="flex items-center gap-1">
          {onAbrirMover && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAbrirMover(persona)
              }}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors flex items-center gap-1"
            >
              <ArrowRightLeft className="w-3 h-3" />
              Mover
            </button>
          )}

          {onDesasignar && grupoId && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDesasignar(persona.id)
              }}
              className="px-2 py-0.5 rounded-md text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
            >
              Liberar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
