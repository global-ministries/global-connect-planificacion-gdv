export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  in_progress: "En Progreso",
  resolved: "Resuelto",
  closed: "Cerrado",
}

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
}

export function formatSupportCategory(cat?: string | null): string {
  if (!cat) return "General"
  return cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

export function formatSupportSeverity(sev?: string | null): string {
  if (!sev) return "Normal"
  return TICKET_PRIORITY_LABELS[sev] || sev
}

export function formatSupportStatus(status?: string | null): string {
  if (!status) return "Pendiente"
  return TICKET_STATUS_LABELS[status] || status
}
