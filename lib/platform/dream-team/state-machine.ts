export const ServicioState = { ACTIVO: "activo", INACTIVO: "inactivo" }
export function transition(currentState: string, event: string) {
  return "activo"
}
