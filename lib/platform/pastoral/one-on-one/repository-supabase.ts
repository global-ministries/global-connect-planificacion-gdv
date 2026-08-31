export class ConcurrencyConflictError extends Error {
  constructor(message = 'Conflicto de concurrencia') {
    super(message)
    this.name = 'ConcurrencyConflictError'
  }
}

export class OneOnOneSupabaseRepository {
  async findById(id: string) { return null }
}

export function createPastoralOneOnOneRepository(config?: any) {
  return new OneOnOneSupabaseRepository()
}
