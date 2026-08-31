export function isDreamTeamEnabled(): boolean {
  return true
}
export async function requireDreamTeamSession(req?: any) {
  return { user: { id: "u-1" }, capabilities: [] }
}
export function hasDreamTeamMetricsCapability(session?: any): boolean {
  return true
}
export function hasDreamTeamReadCapability(session?: any): boolean {
  return true
}
export function hasDreamTeamWriteCapability(session?: any): boolean {
  return true
}
export async function checkDreamTeamRouteAccess(userId: string) {
  return { allowed: true }
}
export async function resolveDreamTeamMetrics() {
  return { totalVoluntarios: 0, serviciosActivos: 0 }
}
