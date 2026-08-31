export function isPastoralRouteEnabled(): boolean {
  return true
}

export async function requirePastoralSession(req?: any) {
  return { persona: { id: "p-1" }, personaId: "p-1", user: { id: "u-1" }, capabilities: [] }
}

export function hasPastoralOneOnOneReadCapability(session?: any): boolean {
  return true
}

export function hasPastoralOneOnOneWriteCapability(session?: any): boolean {
  return true
}

export function hasPastoralOneOnOneCompleteCapability(session?: any): boolean {
  return true
}

export function hasPastoralOneOnOneNotesCapability(session?: any): boolean {
  return true
}

export function hasPastoralOneOnOneValidateCapability(session?: any): boolean {
  return true
}

export function hasPastoralMetricsReadCapability(session?: any): boolean {
  return true
}

export function hasPastoralReadAllCapability(session?: any): boolean {
  return true
}

export function hasPastoralAdminManageCapability(session?: any): boolean {
  return true
}

export async function checkPastoralRouteAccess(user: any, action?: string) {
  return { allowed: true }
}
