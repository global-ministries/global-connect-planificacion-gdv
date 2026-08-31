'use client'

import React, { useEffect, useRef, useState } from 'react'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { PersonaPlanner } from '@/lib/planner/types'
import { TarjetaSistema, TituloSistema } from '@/components/ui/sistema-diseno'
import { Users, UserMinus } from 'lucide-react'

interface UnassignedDropZoneProps {
  children: React.ReactNode
  totalDisponibles: number
  onDesasignar: (personaId: string) => void
}

export function UnassignedDropZone({
  children,
  totalDisponibles,
  onDesasignar
}: UnassignedDropZoneProps) {
  const dropRef = useRef<HTMLDivElement>(null)
  const [isOver, setIsOver] = useState(false)

  useEffect(() => {
    const el = dropRef.current
    if (!el) return

    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data.type === 'persona' && Boolean(source.data.sourceGrupoId),
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: ({ source }) => {
        setIsOver(false)
        if (source.data.type === 'persona') {
          const persona = source.data.persona as PersonaPlanner
          onDesasignar(persona.id)
        }
      }
    })
  }, [onDesasignar])

  return (
    <TarjetaSistema
      ref={dropRef}
      variante="default"
      className={`p-4 space-y-4 transition-all relative ${
        isOver
          ? 'ring-2 ring-destructive/80 bg-destructive/5 border-destructive/60 shadow-xl'
          : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <TituloSistema nivel={3} className="text-base font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Banco de Personas ({totalDisponibles})
        </TituloSistema>

        {isOver && (
          <span className="text-xs font-semibold text-destructive flex items-center gap-1 animate-pulse">
            <UserMinus className="w-3.5 h-3.5" />
            Soltar para liberar
          </span>
        )}
      </div>

      {children}
    </TarjetaSistema>
  )
}
