export function normalizarNombre(nombre: string): string {
  if (!nombre) return ''
  return nombre
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
