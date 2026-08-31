export class PublicTokenRepositorySupabase {
  async findByToken(token: string) { return null }
  async getByTokenHash(tokenHash: string) { return null }
  async consumeToken(tokenHash: string) { return true }
}

export function createSupabasePublicTokensRepository(config?: any) {
  return new PublicTokenRepositorySupabase()
}
