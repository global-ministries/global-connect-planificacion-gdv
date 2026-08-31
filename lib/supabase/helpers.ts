export function extraerRelacion<T>(rel: unknown): T | null {
  if (!rel) return null
  if (Array.isArray(rel)) return (rel[0] as T) ?? null
  return rel as T
}

export function extraerArray<T>(rel: unknown): T[] {
  if (!rel) return []
  if (Array.isArray(rel)) return rel as T[]
  return [rel as T]
}
