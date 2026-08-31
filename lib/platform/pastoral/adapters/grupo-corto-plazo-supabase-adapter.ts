export class GrupoCortoPlazoSupabaseAdapter {
  async getMentors(id: string) { return [] }
}

export function createGrupoCortoPlazoMentorAdapter(config?: any) {
  return new GrupoCortoPlazoSupabaseAdapter()
}

export function createGrupoCortoPlazoSupabaseAdapter(config?: any) {
  return new GrupoCortoPlazoSupabaseAdapter()
}
