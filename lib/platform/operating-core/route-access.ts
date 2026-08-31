export function isOperatingCoreEnabled(): boolean {
  return true
}
export async function requireOperatingCoreSession(req?: any) {
  return { user: { id: "u-1" }, capabilities: [] }
}
export function hasOperatingCoreEventsWriteCapability(session?: any): boolean {
  return true
}
export function hasOperatingCoreEventsReadCapability(session?: any): boolean {
  return true
}
export function hasOperatingCoreServicesWriteCapability(session?: any): boolean {
  return true
}
export function hasOperatingCoreServicesReadCapability(session?: any): boolean {
  return true
}
export function hasOperatingCoreFormsManageCapability(session?: any): boolean {
  return true
}
export function hasOperatingCoreResourcesManageCapability(session?: any): boolean {
  return true
}
export function hasOperatingCoreCapacityManageCapability(session?: any): boolean {
  return true
}
export function hasOperatingCoreFormsSubmitCapability(session?: any): boolean {
  return true
}
export async function checkOperatingCoreRouteAccess() { return { allowed: true } }
