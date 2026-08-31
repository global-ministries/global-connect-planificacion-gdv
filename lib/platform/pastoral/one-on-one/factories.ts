export class PastoralOneOnOneRepository {
  async findById(id: string) { return null }
  async save(data: any) { return data }
  async update(id: string, data: any) { return data }
}

export function createPastoralOneOnOneRepository(config?: any) {
  return new PastoralOneOnOneRepository()
}

export function createOneOnOneService() {
  return {
    get: async () => ({ id: "1" }),
    schedule: async () => ({ ok: true }),
    start: async () => ({ ok: true }),
    complete: async () => ({ ok: true }),
    cancel: async () => ({ ok: true }),
    logNotes: async () => ({ ok: true }),
    validateStep: async () => ({ ok: true }),
  }
}
