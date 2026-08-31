export function isOperatingCoreEnabled(): boolean {
  return true
}
export async function requireOperatingCoreSession(req?: any) {
  return { user: { id: "u-1" }, capabilities: [] }
}
export function hasOperatingCoreResourcesManageCapability(session?: any): boolean {
  return true
}
export function hasOperatingCoreFormsManageCapability(session?: any): boolean {
  return true
}
export function hasOperatingCoreFormsSubmitCapability(session?: any): boolean {
  return true
}
export const OperatingCore = {}
