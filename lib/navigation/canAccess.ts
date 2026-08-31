export interface AccessItem {
  roles?: string[]
  capabilities?: string[]
}

export interface AccessCredentials {
  roles?: string[]
  supportCapabilities?: string[]
}

export function canAccess(item: AccessItem, credentials?: AccessCredentials): boolean {
  if (!credentials) return true
  const { roles = [], supportCapabilities = [] } = credentials

  if (item.roles && item.roles.length > 0) {
    const hasRole = item.roles.some((r) => roles.includes(r))
    if (!hasRole) return false
  }

  if (item.capabilities && item.capabilities.length > 0) {
    const hasCap = item.capabilities.some((c) => supportCapabilities.includes(c))
    if (!hasCap) return false
  }

  return true
}
