export class DreamTeamRepositorySupabase {
  async getServicios() { return [] }
  async getServicioById(id: string) { return null }
}
export function createSupabaseDreamTeamRepository(supabase?: any) {
  return new DreamTeamRepositorySupabase()
}
