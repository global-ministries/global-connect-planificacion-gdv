export class CapacityRepositorySupabase {
  async getCapacity() { return { max: 100, current: 0 } }
  async getCurrent(eventId: string) {
    return {
      base: { value: 100, scope: 'event', effectiveAt: new Date().toISOString() },
      override: null as { value: number; reason: string; setByPersonaId: string; setAt: string } | null,
      effective: 100
    }
  }
  async setOverride(params: { eventInstanceId: string; base: any; override: any }) {
    return {
      base: params.base,
      override: params.override,
      effective: params.override?.value ?? params.base.value
    }
  }
}

export function createSupabaseCapacityRepository(config?: any) {
  return new CapacityRepositorySupabase()
}
