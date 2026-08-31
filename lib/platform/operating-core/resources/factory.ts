export function createOperatingCoreResourcesRepository(supabase?: any) {
  return {
    list: async () => [],
    get: async (id: string) => null,
  }
}
export function getResourcesRepository() {
  return createOperatingCoreResourcesRepository()
}
