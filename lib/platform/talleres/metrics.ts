export async function getTalleresMetrics() {
  return { totalTalleres: 0, totalInscritos: 0, tasaCompletitud: 0 }
}

export async function finalizationRateByTaller(tallerId?: string) {
  return 0
}

export async function inscripcionesActivas(tallerId?: string) {
  return 0
}

export async function asistenciaPromedio(tallerId?: string) {
  return 0
}
