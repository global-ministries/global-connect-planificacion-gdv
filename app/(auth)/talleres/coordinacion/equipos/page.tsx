/**
 * PR19 — DT-078 — /talleres/coordinacion/equipos (C).
 * Lists grupos (resumen) — para coordinadores.
 */
import { DashboardPage, EmptyState } from '@/components/talleres/dashboard-page'
import { TarjetaSistema, TextoSistema, BadgeSistema } from '@/components/ui/sistema-diseno'
import { createClient } from '@/lib/supabase/server'
import { requireOperacionalRole } from '@/lib/platform/talleres/operacional'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Equipos' }

interface GrupoRow {
  id: string
  nombre: string
  estado: string
  capacidad: number
}

export default async function EquiposPage() {
  await requireOperacionalRole()
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('taller_grupos')
    .select('id, nombre, estado, capacidad')
    .order('nombre', { ascending: true })
    .limit(100)

  const grupos = (error ? [] : (data ?? [])) as GrupoRow[]

  return (
    <DashboardPage
      titulo="Equipos"
      botonRegreso={{ href: '/talleres/coordinacion', texto: 'Coordinación' }}
    >
      {grupos.length === 0 ? (
        <EmptyState message="No hay grupos registrados." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {grupos.map((g) => (
            <li key={g.id}>
              <TarjetaSistema variante="outlined" className="p-4">
                <TextoSistema className="font-medium">{g.nombre}</TextoSistema>
                <TextoSistema variante="sutil" className="mt-1 block text-sm">
                  Capacidad {g.capacidad}
                </TextoSistema>
                <div className="mt-2">
                  <BadgeSistema>{g.estado}</BadgeSistema>
                </div>
              </TarjetaSistema>
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  )
}
