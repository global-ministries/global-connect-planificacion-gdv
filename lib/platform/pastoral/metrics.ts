export const SYSTEM_CLOCK = {
  now: () => new Date(),
}

export function createFakePastoralMetricsRepository() {
  return {
    getMetrics: async () => [],
  }
}

export async function uno_auno_por_periodo(inicio: string, fin: string, repo: any, liveOnly?: boolean) {
  return [] as any[]
}

export async function lideres_activos_por_ventana(inicio: string, fin: string, repo: any) {
  return [] as any[]
}

export async function alarma_gdv_sin_uno_auno_en_90_dias(repo: any) {
  return [] as any[]
}

export async function getPastoralMetrics(cardName: string) {
  return { title: cardName, value: 0 }
}
