'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { GrupoGDVPlanner, PersonaPlanner, RolEnGrupo } from '@/lib/planner/types'
import {
  BotonSistema,
  InputSistema,
  SelectSistema,
  BadgeSistema,
  SeparadorSistema
} from '@/components/ui/sistema-diseno'
import {
  X,
  Pencil,
  Copy,
  Trash2,
  Users,
  Shield,
  GraduationCap,
  MapPin,
  Search,
  Plus,
  AlertCircle
} from 'lucide-react'

interface GroupEditModalProps {
  isOpen: boolean
  grupo: GrupoGDVPlanner | null
  segmentos: Array<{ id: string; nombre: string; color?: string }>
  personasDisponibles: PersonaPlanner[]
  onClose: () => void
  onGuardarGrupo: (grupoActualizado: GrupoGDVPlanner) => void
  onDuplicarGrupo: (grupo: GrupoGDVPlanner) => void
  onEliminarGrupo: (grupoId: string) => void
  onAsignarPersonaAGrupo: (persona: PersonaPlanner, grupoId: string, rol: RolEnGrupo) => void
  onDesasignarPersona: (personaId: string) => void
}

export function GroupEditModal({
  isOpen,
  grupo,
  segmentos,
  personasDisponibles,
  onClose,
  onGuardarGrupo,
  onDuplicarGrupo,
  onEliminarGrupo,
  onAsignarPersonaAGrupo,
  onDesasignarPersona
}: GroupEditModalProps) {
  // Form state
  const [nombre, setNombre] = useState('')
  const [ciudad, setCiudad] = useState<'Barquisimeto' | 'Cabudare'>('Barquisimeto')
  const [segmentoId, setSegmentoId] = useState('')
  const [zona, setZona] = useState('')
  const [sector, setSector] = useState('')
  const [capacidadMaxima, setCapacidadMaxima] = useState(12)

  // Quick add member state
  const [busquedaPersona, setBusquedaPersona] = useState('')
  const [rolParaAsignar, setRolParaAsignar] = useState<RolEnGrupo>('miembro')
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  // Sync state when grupo changes
  useEffect(() => {
    if (grupo) {
      setNombre(grupo.nombre || '')
      setCiudad(grupo.ciudad === 'Cabudare' ? 'Cabudare' : 'Barquisimeto')
      setSegmentoId(grupo.segmento_id || '')
      setZona(grupo.zona || '')
      setSector(grupo.sector || '')
      setCapacidadMaxima(grupo.capacidad_maxima || 12)
      setBusquedaPersona('')
      setRolParaAsignar('miembro')
      setConfirmarEliminar(false)
    }
  }, [grupo, isOpen])

  // Filter available people for fast inclusion
  const personasParaAgregar = useMemo(() => {
    if (!busquedaPersona.trim()) return []
    const q = busquedaPersona.toLowerCase()
    return personasDisponibles
      .filter(p => `${p.nombre} ${p.apellido}`.toLowerCase().includes(q))
      .slice(0, 5)
  }, [busquedaPersona, personasDisponibles])

  if (!isOpen || !grupo) return null

  const totalIntegrantesActuales =
    (grupo.miembros?.length || 0) +
    (grupo.lider_principal ? 1 : 0) +
    (grupo.co_lider ? 1 : 0) +
    (grupo.aprendices?.length || 0)

  const handleGuardar = () => {
    const segmentoObj = segmentos.find(s => s.id === segmentoId)
    const grupoActualizado: GrupoGDVPlanner = {
      ...grupo,
      nombre: nombre.trim() || grupo.nombre,
      ciudad,
      segmento_id: segmentoId || grupo.segmento_id,
      segmento_nombre: segmentoObj?.nombre || grupo.segmento_nombre,
      zona: zona.trim(),
      sector: sector.trim(),
      capacidad_maxima: Number(capacidadMaxima) || 12
    }
    onGuardarGrupo(grupoActualizado)
    onClose()
  }

  const handleDuplicar = () => {
    onDuplicarGrupo(grupo)
    onClose()
  }

  const handleEliminar = () => {
    onEliminarGrupo(grupo.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Editar Grupo: {grupo.nombre}
              </h2>
              <p className="text-xs text-muted-foreground">
                Ajusta configuración, capacidad territorial y miembros del GDV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
          
          {/* SECCIÓN 1: DATOS BÁSICOS DEL GRUPO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Nombre del Grupo GDV
              </label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Cabudare Matrimonios 1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Ciudad / Territorio
              </label>
              <select
                value={ciudad}
                onChange={e => setCiudad(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              >
                <option value="Barquisimeto">Barquisimeto</option>
                <option value="Cabudare">Cabudare</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Segmento Ministerial
              </label>
              <select
                value={segmentoId}
                onChange={e => setSegmentoId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              >
                {segmentos.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Zona
              </label>
              <input
                type="text"
                value={zona}
                onChange={e => setZona(e.target.value)}
                placeholder="Ej: Este, Centro, Oeste..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Capacidad Máxima (Integrantes)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="4"
                  max="30"
                  value={capacidadMaxima}
                  onChange={e => setCapacidadMaxima(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Actual: <strong className="text-foreground">{totalIntegrantesActuales}</strong>/{capacidadMaxima}
                </span>
              </div>
            </div>
          </div>

          <SeparadorSistema />

          {/* SECCIÓN 2: GESTIÓN RÁPIDA DE ASIGNACIONES */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                Asignación Rápida de Personas
              </h3>
              <span className="text-xs text-muted-foreground">
                {grupo.miembros?.length || 0} Miembros · {grupo.aprendices?.length || 0} Aprendices
              </span>
            </div>

            {/* Buscador para agregar personas directamente */}
            <div className="p-3 rounded-2xl bg-muted/20 border border-border space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={busquedaPersona}
                    onChange={e => setBusquedaPersona(e.target.value)}
                    placeholder="Buscar persona disponible para añadir..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <select
                  value={rolParaAsignar}
                  onChange={e => setRolParaAsignar(e.target.value as RolEnGrupo)}
                  className="px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-none"
                >
                  <option value="miembro">Rol: Miembro</option>
                  <option value="lider">Rol: Líder</option>
                  <option value="aprendiz">Rol: Aprendiz</option>
                </select>
              </div>

              {/* Resultados de búsqueda rápida */}
              {personasParaAgregar.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Coincidencias encontradas:</span>
                  <div className="space-y-1">
                    {personasParaAgregar.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{p.nombre} {p.apellido}</span>
                          <span className="text-[10px] text-muted-foreground">({p.ciudad || 'Sin ciudad'})</span>
                          {p.conyuge_nombre && (
                            <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full">
                              + {p.conyuge_nombre}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            onAsignarPersonaAGrupo(p, grupo.id, rolParaAsignar)
                            setBusquedaPersona('')
                          }}
                          className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-semibold text-[11px] flex items-center gap-1 hover:opacity-90"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Asignar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Lista actual de Integrantes para desasignar rápidamente */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Integrantes actuales en este grupo:</span>
              
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {/* Líder Principal */}
                {grupo.lider_principal && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-bold text-foreground">
                        {grupo.lider_principal.nombre} {grupo.lider_principal.apellido}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                        Líder Principal
                      </span>
                    </div>
                    <button
                      onClick={() => onDesasignarPersona(grupo.lider_principal!.id)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Quitar de líder y regresar al banco"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Co-Líder */}
                {grupo.co_lider && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-bold text-foreground">
                        {grupo.co_lider.nombre} {grupo.co_lider.apellido}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                        Co-Líder (Cónyuge)
                      </span>
                    </div>
                    <button
                      onClick={() => onDesasignarPersona(grupo.co_lider!.id)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Quitar de co-líder y regresar al banco"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Aprendices */}
                {grupo.aprendices?.map(ap => (
                  <div
                    key={ap.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-medium text-foreground">{ap.nombre} {ap.apellido}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                        Aprendiz
                      </span>
                    </div>
                    <button
                      onClick={() => onDesasignarPersona(ap.id)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Regresar al banco de personas"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Miembros */}
                {grupo.miembros?.map(m => (
                  <div
                    key={m.persona_id}
                    className="flex items-center justify-between p-2 rounded-xl bg-card border border-border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-foreground">
                        {m.persona?.nombre || 'Miembro'} {m.persona?.apellido || ''}
                      </span>
                    </div>
                    <button
                      onClick={() => onDesasignarPersona(m.persona_id)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Regresar al banco de personas"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SeparadorSistema />

          {/* SECCIÓN 3: ACCIONES RÁPIDAS (DUPLICAR Y ELIMINAR) */}
          <div className="p-3.5 rounded-2xl bg-muted/10 border border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDuplicar}
                className="px-3 py-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-primary" />
                <span>Duplicar / Clonar GDV</span>
              </button>
            </div>

            <div>
              {confirmarEliminar ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-400 font-semibold">¿Seguro? Se liberan miembros:</span>
                  <button
                    type="button"
                    onClick={handleEliminar}
                    className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors"
                  >
                    Sí, Eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarEliminar(false)}
                    className="px-2.5 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmarEliminar(true)}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Grupo</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-border flex items-center justify-end gap-3 bg-muted/20">
          <BotonSistema variante="outline" onClick={onClose}>
            Cancelar
          </BotonSistema>
          <BotonSistema variante="primario" onClick={handleGuardar}>
            Guardar Cambios
          </BotonSistema>
        </div>

      </div>
    </div>
  )
}
