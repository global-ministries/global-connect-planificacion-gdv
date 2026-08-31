'use client'

import React, { useState } from 'react'
import {
  TarjetaSistema,
  BotonSistema,
  BadgeSistema,
  TituloSistema,
  TextoSistema,
  SeparadorSistema
} from '@/components/ui/sistema-diseno'
import {
  X,
  History,
  Save,
  Undo2,
  Redo2,
  ArrowRightLeft,
  UserPlus,
  UserMinus,
  GraduationCap,
  Shield,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Filter
} from 'lucide-react'

export interface CambioPlanificacion {
  id: string
  descripcion: string
  detalle?: string
  tipo: 'asignar' | 'mover' | 'desasignar' | 'crear_grupo' | 'cambiar_rol' | 'otro'
  timestamp: string
  personaNombre?: string
  grupoOrigenNombre?: string
  grupoDestinoNombre?: string
  rol?: string
  guardadoEnBD: boolean
}

interface ChangelogDrawerProps {
  isOpen: boolean
  onClose: () => void
  cambios: CambioPlanificacion[]
  puedeDeshacer: boolean
  puedeRehacer: boolean
  onDeshacer: () => void
  onRehacer: () => void
  onGuardar: () => void
  guardando: boolean
  onLimpiarHistorial: () => void
}

export function ChangelogDrawer({
  isOpen,
  onClose,
  cambios,
  puedeDeshacer,
  puedeRehacer,
  onDeshacer,
  onRehacer,
  onGuardar,
  guardando,
  onLimpiarHistorial
}: ChangelogDrawerProps) {
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  if (!isOpen) return null

  const cambiosPendientes = cambios.filter(c => !c.guardadoEnBD).length

  const cambiosFiltrados = cambios.filter(c => {
    if (filtroTipo === 'todos') return true
    if (filtroTipo === 'pendientes') return !c.guardadoEnBD
    if (filtroTipo === 'mover') return c.tipo === 'mover'
    if (filtroTipo === 'asignar') return c.tipo === 'asignar'
    if (filtroTipo === 'desasignar') return c.tipo === 'desasignar'
    if (filtroTipo === 'crear_grupo') return c.tipo === 'crear_grupo'
    return true
  })

  const getIconoTipo = (tipo: CambioPlanificacion['tipo'], rol?: string) => {
    if (tipo === 'mover') return ArrowRightLeft
    if (tipo === 'desasignar') return UserMinus
    if (tipo === 'crear_grupo') return Plus
    if (rol?.toLowerCase().includes('líder') || rol?.toLowerCase().includes('lider')) return Shield
    if (rol?.toLowerCase().includes('aprendiz') || rol?.toLowerCase().includes('colíder')) return GraduationCap
    return UserPlus
  }

  const getBadgeColorTipo = (tipo: CambioPlanificacion['tipo'], rol?: string) => {
    if (tipo === 'mover') return 'info'
    if (tipo === 'desasignar') return 'warning'
    if (tipo === 'crear_grupo') return 'success'
    if (rol?.toLowerCase().includes('líder') || rol?.toLowerCase().includes('lider')) return 'default'
    if (rol?.toLowerCase().includes('aprendiz') || rol?.toLowerCase().includes('colíder')) return 'info'
    return 'default'
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-card border-l border-border h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
        
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between gap-3 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <TituloSistema nivel={3} className="text-base font-semibold">
                  Historial de Cambios
                </TituloSistema>
                {cambiosPendientes > 0 ? (
                  <BadgeSistema variante="warning" tamaño="sm">
                    {cambiosPendientes} sin guardar
                  </BadgeSistema>
                ) : (
                  <BadgeSistema variante="success" tamaño="sm">
                    Al día
                  </BadgeSistema>
                )}
              </div>
              <TextoSistema variante="sutil" tamaño="sm">
                Registro interactivo con soporte de Deshacer / Rehacer
              </TextoSistema>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Cerrar panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar de Deshacer, Rehacer y Guardar */}
        <div className="p-3 border-b border-border bg-muted/15 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <BotonSistema
              variante="outline"
              tamaño="sm"
              icono={Undo2}
              onClick={onDeshacer}
              disabled={!puedeDeshacer}
              title="Deshacer último cambio (Ctrl+Z)"
            >
              Deshacer
            </BotonSistema>

            <BotonSistema
              variante="outline"
              tamaño="sm"
              icono={Redo2}
              onClick={onRehacer}
              disabled={!puedeRehacer}
              title="Rehacer cambio (Ctrl+Y)"
            >
              Rehacer
            </BotonSistema>
          </div>

          <BotonSistema
            variante={cambiosPendientes > 0 ? "primario" : "outline"}
            tamaño="sm"
            icono={Save}
            cargando={guardando}
            onClick={onGuardar}
          >
            {cambiosPendientes > 0 ? `Guardar (${cambiosPendientes})` : 'Guardar Todo'}
          </BotonSistema>
        </div>

        {/* Filtros de la lista */}
        <div className="px-5 py-2.5 border-b border-border flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'pendientes', label: 'Sin Guardar' },
              { id: 'mover', label: 'Movimientos' },
              { id: 'asignar', label: 'Asignaciones' },
              { id: 'desasignar', label: 'Desasignaciones' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltroTipo(f.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  filtroTipo === f.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {cambios.length > 0 && (
            <button
              onClick={onLimpiarHistorial}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors shrink-0"
              title="Limpiar lista visual de cambios"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>

        {/* Lista Scrollable de Cambios */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cambiosFiltrados.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-2xl">
              <History className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <TituloSistema nivel={4} className="text-sm font-semibold">
                No hay movimientos registrados
              </TituloSistema>
              <TextoSistema variante="sutil" tamaño="sm" className="mt-1 max-w-xs">
                Arrastra personas a los grupos, reasigna líderes o aprendices y aquí verás la bitácora paso a paso.
              </TextoSistema>
            </div>
          ) : (
            cambiosFiltrados.map((cambio, index) => {
              const Icono = getIconoTipo(cambio.tipo, cambio.rol)
              const badgeColor = getBadgeColorTipo(cambio.tipo, cambio.rol)

              return (
                <div
                  key={cambio.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    !cambio.guardadoEnBD
                      ? 'bg-card border-amber-500/30 hover:border-amber-500/50 shadow-sm'
                      : 'bg-card/60 border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        cambio.tipo === 'mover'
                          ? 'bg-blue-500/10 text-blue-500'
                          : cambio.tipo === 'desasignar'
                            ? 'bg-amber-500/10 text-amber-500'
                            : cambio.tipo === 'crear_grupo'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <Icono className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {cambio.personaNombre || 'Acción de Grupo'}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {cambio.timestamp}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {cambio.descripcion}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {cambio.rol && (
                            <BadgeSistema variante={badgeColor as any} tamaño="sm">
                              {cambio.rol}
                            </BadgeSistema>
                          )}
                          {cambio.grupoDestinoNombre && (
                            <span className="text-foreground font-medium truncate max-w-[140px]">
                              → {cambio.grupoDestinoNombre}
                            </span>
                          )}
                        </div>

                        {!cambio.guardadoEnBD ? (
                          <span className="text-amber-500 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Sin guardar
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Guardado en BD
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer del Drawer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {cambios.length} {cambios.length === 1 ? 'movimiento' : 'movimientos'} en esta sesión
          </div>

          <div className="flex items-center gap-2">
            <BotonSistema
              variante="ghost"
              tamaño="sm"
              onClick={onClose}
            >
              Cerrar
            </BotonSistema>
            <BotonSistema
              variante="primario"
              tamaño="sm"
              icono={Save}
              cargando={guardando}
              onClick={onGuardar}
            >
              Guardar Cambios
            </BotonSistema>
          </div>
        </div>

      </div>
    </div>
  )
}
