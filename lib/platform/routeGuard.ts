export async function checkPlatformRouteAccess(options?: any) {
  return { authorized: true, user: null, session: null }
}
export async function routeGuard(options?: any) {
  return { authorized: true, user: null, session: null }
}
export const assertRouteAccess = checkPlatformRouteAccess
export const checkRouteAccess = checkPlatformRouteAccess
