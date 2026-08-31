'use client'

import React, { useState } from 'react'
import { PersonaPlanner, GrupoGDVPlanner, RolEnGrupo, CiudadGDV } from '@/lib/planner/types'
import {
  TarjetaSistema,
  BotonSistema,
  TituloSistema,
  TextoSistema,
  BadgeSistema
} from '@/components/ui/sistema-diseno'
import {
  X,
  Search,
  Users,
  MapPin,
  Shield,
  GraduationCap,
  Heart,
  RotateCcw,
  Check
} from 'lucide-react'

interface ReassignmentModalProps {
  isOpen: boolean
  persona: PersonaPlanner | null
  grupos: GrupoGDVPlanner[]
  onClose: () => void
  onAsignar: (
    persona: PersonaPlanner,
    grupoId: string,
    rol: RolEnGrupo,
    arrastrarConyuge: boolean
  ) => void
}

export function ReassignmentModal({
  isOpen,
  persona,
  grupos,
  onClose,
  onAsignar
}: ReassignmentModalProps) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroCiudad, setFiltroCiudad] = useState<string>('todas')
  const [rolSeleccionado, setRolSeleccionado] = useState<RolEnGrupo>('miembro')
  const [incluirConyuge, setIncluirConyuge] = useState(true)

  if (!isOpen || !persona) return null

  const gruposFiltrados = grupos.filter(g => {
    if (filtroCiudad !== 'todas' && g.ciudad !== filtroCiudad) return false
    if (busqueda && !g.nombre.toLowerCase().includes(busqueda.toLowerCase()) && !g.zona.toLowerCase().includes(busqueda.toLowerCase())) {
      return false
    }
    return true
  })

  const handleConfirmar = (grupoId: string) => {
    onAsignar(persona, grupoId, rolSeleccionado, incluirConyuge)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <TarjetaSistema
        variante="elevated"
        className="max-w-lg w-full p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between">
          <div>
            <TituloSistema nivel={3} className="text-lg font-bold">
              Asignar / Reubicar Miembro
            </TituloSistema>
            <TextoSistema variante="sutil" tamaño="sm">
              Mover a <strong className="text-foreground">{persona.nombre} {persona.apellido}</strong> a un Grupo de Vida.
            </TextoSistema>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Persona & Cónyuge */}
        <div className="p-3 rounded-xl bg-card border border-border space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Ciudad de Residencia: {persona.ciudad || 'Barquisimeto'} ({persona.zona || 'Centro'})
            </span>
          </div>

          {persona.lider_anterior_nombre && (
            <div className="text-muted-foreground flex items-center gap-1">
              <span>Líder en temporada anterior:</span>
              <strong className="text-foreground">{persona.lider_anterior_nombre}</strong>
            </div>
          )}

          {persona.conyuge_nombre && (
            <div className="pt-2 border-t border-border/40 flex items-center justify-between">
              <span className="text-rose-400 flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Cónyuge: {persona.conyuge_nombre}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-foreground font-medium">
                <input
                  type="checkbox"
                  checked={incluirConyuge}
                  onChange={e => setIncluirConyuge(e.target.checked)}
                  className="rounded border-border"
                />
                  <span>Mover a ambos juntos</span>
              </label>
            </div>
          )}
        </div>

        {/* Selección de Rol */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">
            Rol en el grupo destino:
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setRolSeleccionado('miembro')}
              className={`p-2 rounded-xl border font-medium flex items-center justify-center gap-1.5 transition-all ${
                rolSeleccionado === 'miembro'
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Miembro
            </button>

            <button
              type="button"
              onClick={() => setRolSeleccionado('aprendiz')}
              className={`p-2 rounded-xl border font-medium flex items-center justify-center gap-1.5 transition-all ${
                rolSeleccionado === 'aprendiz'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Aprendiz
            </button>

            <button
              type="button"
              onClick={() => setRolSeleccionado('lider')}
              className={`p-2 rounded-xl border font-medium flex items-center justify-center gap-1.5 transition-all ${
                rolSeleccionado === 'lider'
                  ? 'border-primary bg-primary/20 text-primary font-bold shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Líder Principal
            </button>
          </div>
        </div>

        {/* Buscador y Filtro de Ciudad */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar grupo o zona..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full bg-card text-foreground border border-border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={filtroCiudad}
            onChange={e => setFiltroCiudad(e.target.value)}
            className="bg-card text-foreground border border-border rounded-xl text-xs p-2 focus:outline-none"
          >
            <option value="todas">Todas las ciudades</option>
            <option value="Barquisimeto">Barquisimeto</option>
            <option value="Cabudare">Cabudare</option>
          </select>
        </div>

        {/* Lista de Grupos Destino */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {gruposFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No se encontraron grupos para reasignar con estos filtros.
            </div>
          ) : (
            gruposFiltrados.map(g => {
              const repiteConLider = Boolean(
                persona.lider_anterior_id &&
                g.lider_principal &&
                g.lider_principal.id === persona.lider_anterior_id
              )

              const ciudadDifiere = Boolean(
                persona.ciudad &&
                g.ciudad &&
                persona.ciudad !== 'Otro' &&
                g.ciudad !== 'Otro' &&
                persona.ciudad.toLowerCase() !== g.ciudad.toLowerCase()
              )

              const totalInt = (g.miembros?.length || 0) + (g.lider_principal ? 1 : 0) + (g.co_lider ? 1 : 0) + (g.aprendices?.length || 0)

              return (
                <div
                  key={g.id}
                  onClick={() => handleConfirmar(g.id)}
                  className="p-3 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/60 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground text-xs flex items-center gap-1.5 truncate">
                      {g.nombre}
                      {repiteConLider && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 font-semibold">
                          <RotateCcw className="w-2.5 h-2.5" />
                          Repite Líder
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary/70" />
                        {g.ciudad} ({g.zona})
                      </span>
                      {g.lider_principal && (
                        <span>• Líder: {g.lider_principal.nombre} {g.lider_principal.apellido}</span>
                      )}
                    </div>

                    {ciudadDifiere && (
                      <div className="text-[10px] text-amber-500 mt-1">
                        ⚠️ Atención: {persona.nombre} vive en {persona.ciudad} y este grupo es de {g.ciudad}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <BadgeSistema variante="default" tamaño="sm">
                      {totalInt}/{g.capacidad_maxima}
                    </BadgeSistema>
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
          <BotonSistema variante="ghost" onClick={onClose}>
            Cancelar
          </BotonSistema>
        </div>
      </TarjetaSistema>
    </div>
  )
}
