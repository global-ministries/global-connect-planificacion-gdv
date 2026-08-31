export class ServicioMentorSupabaseAdapter {
  async getMentors(id: string) { return [] }
}

export function createServicioMentorAdapter(config?: any) {
  return new ServicioMentorSupabaseAdapter()
}

export function createServicioMentorSupabaseAdapter(config?: any) {
  return new ServicioMentorSupabaseAdapter()
}
