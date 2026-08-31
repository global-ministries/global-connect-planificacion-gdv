export class PastoralLedgerWriter {
  async write(entry: any) { return { ok: true } }
}

export async function writePastoralLedgerEntry(entry: any) {
  return { ok: true }
}

export function createPastoralLedgerWriter(config?: any) {
  return new PastoralLedgerWriter()
}

export function createSupabasePastoralLedgerWriter(config?: any) {
  return new PastoralLedgerWriter()
}
