export function getEventsRepository() {
  return {
    findById: async (id: string) => null,
    findAll: async () => [],
    create: async (data: any) => data,
  }
}

export function createOperatingCoreEventsRepository(config?: any) {
  return {
    findById: async (id: string) => null,
    findAll: async () => [],
    create: async (data: any) => data,
    update: async (id: string, data: any) => data,
    delete: async (id: string) => true,
  }
}

export function createOperatingCoreServicesRepository() {
  return {
    findById: async (id: string) => null,
    findAll: async () => [],
    create: async (data: any) => data,
    update: async (id: string, data: any) => data,
    delete: async (id: string) => true,
  }
}
