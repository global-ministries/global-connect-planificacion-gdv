import React from 'react'
import {
  ContenedorDashboard,
  SkeletonSistema,
  TarjetaSistema
} from '@/components/ui/sistema-diseno'
import { Loader2 } from 'lucide-react'

export default function PlannerLoading() {
  return (
    <ContenedorDashboard
      titulo="GDV Planner"
      descripcion="Cargando entorno de planificación y asignación de Grupos de Vida..."
    >
      <div className="space-y-6 animate-pulse">
        {/* Banner superior skeleton */}
        <TarjetaSistema className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
            <div className="space-y-2 flex-1">
              <SkeletonSistema ancho="240px" alto="20px" />
              <SkeletonSistema ancho="360px" alto="14px" />
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <SkeletonSistema ancho="120px" alto="38px" />
            <SkeletonSistema ancho="140px" alto="38px" />
          </div>
        </TarjetaSistema>

        {/* Métricas / KPIs skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <TarjetaSistema key={i} className="p-4 space-y-3">
              <SkeletonSistema ancho="100px" alto="14px" />
              <SkeletonSistema ancho="60px" alto="28px" />
              <SkeletonSistema ancho="140px" alto="12px" />
            </TarjetaSistema>
          ))}
        </div>

        {/* Tablero skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-3">
            <TarjetaSistema className="p-4 space-y-3 min-h-[400px]">
              <SkeletonSistema ancho="160px" alto="20px" />
              <SkeletonSistema ancho="100%" alto="44px" />
              <div className="space-y-2 pt-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <SkeletonSistema key={i} ancho="100%" alto="56px" />
                ))}
              </div>
            </TarjetaSistema>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <TarjetaSistema key={i} className="p-4 space-y-3 min-h-[300px]">
                <SkeletonSistema ancho="180px" alto="22px" />
                <SkeletonSistema ancho="120px" alto="14px" />
                <div className="space-y-2 pt-4">
                  <SkeletonSistema ancho="100%" alto="40px" />
                  <SkeletonSistema ancho="100%" alto="40px" />
                </div>
              </TarjetaSistema>
            ))}
          </div>
        </div>
      </div>
    </ContenedorDashboard>
  )
}
