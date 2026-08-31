export function getNotificationOutbox() {
  return {
    drain: async () => ({ drained: 0 }),
  }
}

export function createOperatingCoreOutboxRepository(config?: any) {
  return {
    drain: async () => ({ drained: 0 }),
    queue: async (event: any) => ({ ok: true }),
  }
}
