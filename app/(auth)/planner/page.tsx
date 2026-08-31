import { Metadata } from 'next'
import { cookies } from 'next/headers'
import {
  obtenerDatosBasePlanificador,
  cargarWorkspacePlanificador
} from '@/lib/planner/actions'
import { PlannerWorkspace } from './planner-workspace'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'GDV Planner | GlobalConnect',
  description: 'Planificador inteligente de Grupos de Vida'
}

export default async function PlannerPage() {
  let baseData: Awaited<ReturnType<typeof obtenerDatosBasePlanificador>>
  let workspaceData: Awaited<ReturnType<typeof cargarWorkspacePlanificador>> | null = null
  let savedConfig: any = null

  try {
    const cookieStore = await cookies()
    const lastConfigRaw = cookieStore.get('gdv_planner_last_config')?.value
    if (lastConfigRaw) {
      try {
        savedConfig = JSON.parse(decodeURIComponent(lastConfigRaw))
      } catch {
        savedConfig = null
      }
    }
  } catch {
    savedConfig = null
  }

  try {
    baseData = await obtenerDatosBasePlanificador()
    
    // Si hay configuración guardada previa, honrarla; si no, usar los valores calculados
    const tempCierreId = savedConfig?.temporadaCierreId
    const tempPlanId = savedConfig?.temporadaPlanificarId

    const tempCierre =
      (tempCierreId ? baseData.temporadas.find(t => t.id === tempCierreId) : null) ||
      baseData.temporadaCierreDefecto ||
      baseData.temporadas[0] ||
      null

    const tempPlan =
      (tempPlanId ? baseData.temporadas.find(t => t.id === tempPlanId) : null) ||
      baseData.temporadaPlanificarDefecto ||
      baseData.temporadas[1] ||
      baseData.temporadas[0] ||
      null

    const segId = savedConfig?.segmentoId || 'todos'
    const segNombre = savedConfig?.segmentoNombre || 'Todos los Segmentos'
    const tempExcluidas = savedConfig?.temporadasExcluidasIds || []

    if (tempCierre && tempPlan) {
      workspaceData = await cargarWorkspacePlanificador({
        segmentoId: segId,
        segmentoNombre: segNombre,
        temporadaCierreId: tempCierre.id,
        temporadaPlanificarId: tempPlan.id,
        temporadasExcluidasIds: tempExcluidas
      })
    }
  } catch (err) {
    console.error('Error al cargar datos base del planificador:', err)
    baseData = {
      success: true,
      temporadas: [],
      segmentos: [],
      temporadaCierreDefecto: null,
      temporadaPlanificarDefecto: null
    }
  }

  return (
    <PlannerWorkspace
      temporadas={baseData.temporadas || []}
      segmentos={baseData.segmentos || []}
      temporadaCierreDefecto={baseData.temporadaCierreDefecto}
      temporadaPlanificarDefecto={baseData.temporadaPlanificarDefecto}
      configuracionInicial={savedConfig}
      gruposIniciales={workspaceData?.grupos || []}
      personasIniciales={workspaceData?.personas || []}
      advertenciasIniciales={workspaceData?.advertencias || []}
    />
  )
}

