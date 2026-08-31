export function getFormsRepository() {
  return {
    findById: async (id: string) => null,
    list: async () => [],
    submit: async (id: string, data: any) => ({ ok: true }),
  }
}

export function createOperatingCoreFormsRepository() {
  return getFormsRepository()
}

