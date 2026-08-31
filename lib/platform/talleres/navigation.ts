export function groupTalleresNavItems(items: any[]) {
  return { main: items, admin: [] }
}
export function getTalleresNavigation(role?: string) {
  return [
    { label: "Explorar", href: "/talleres/explorar" },
    { label: "Mis Talleres", href: "/talleres/mis-talleres" },
  ]
}
