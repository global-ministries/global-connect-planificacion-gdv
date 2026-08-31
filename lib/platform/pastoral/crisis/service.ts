export class PastoralCrisisService {
  async scan() { return { scanned: 0, alerts: [] } }
}

export function createPastoralCrisisService(config?: any) {
  return new PastoralCrisisService()
}

export const pastoralCrisisService = new PastoralCrisisService()
