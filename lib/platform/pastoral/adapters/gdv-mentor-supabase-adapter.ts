export class GdvMentorSupabaseAdapter {
  async getMentors(id: string) { return [] }
}

export function createGdvMentorSupabaseAdapter(config?: any) {
  return new GdvMentorSupabaseAdapter()
}
