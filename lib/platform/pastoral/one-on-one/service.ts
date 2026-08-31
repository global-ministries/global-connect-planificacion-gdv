export class OneOnOneService {
  async complete(id: string) { return { ok: true } }
  async schedule(data: any) { return { ok: true } }
  async start(id: string) { return { ok: true } }
  async cancel(id: string) { return { ok: true } }
  async logNotes(id: string, notes: any) { return { ok: true } }
}

export function createPastoralOneOnOneService(config?: any) {
  return new OneOnOneService()
}
