export class RegistrationRepositorySupabase {
  async register(data: any) { return { ok: true } }
}
export function createSupabaseRegistrationsRepository(supabase?: any) {
  return new RegistrationRepositorySupabase()
}
