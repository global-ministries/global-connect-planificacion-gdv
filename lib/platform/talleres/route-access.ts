export async function checkTalleresRouteAccess(req?: any) {
  return { allowed: true }
}
export function getTalleresNavItems(roles?: string[]) {
  return [
    { label: "Explorar", href: "/talleres/explorar", icon: "Compass", roles: [] },
    { label: "Mis Talleres", href: "/talleres/mis-talleres", icon: "BookOpen", roles: [] },
  ]
}
