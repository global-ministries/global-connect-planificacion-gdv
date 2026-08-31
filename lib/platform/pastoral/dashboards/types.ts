export const PASTORAL_METRIC_CARDS = [
  'uno_auno_por_periodo',
  'lideres_activos_por_ventana',
  'alarma_gdv_sin_uno_auno_en_90_dias',
] as const

export type PastoralMetricCardType = typeof PASTORAL_METRIC_CARDS[number]

export interface PastoralMetricCard {
  title: string
  value: number | string
  change?: string
}
