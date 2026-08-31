export const SUPPORT_CAPABILITIES = [
  "impersonate_user",
  "manage_system_settings",
  "view_audit_logs",
  "manage_tickets",
] as const

export type SupportCapability = typeof SUPPORT_CAPABILITIES[number]

export const SUPPORT_CAPABILITY_LABELS: Record<string, string> = {
  impersonate_user: "Suplantar usuario",
  manage_system_settings: "Gestionar configuración",
  view_audit_logs: "Ver logs de auditoría",
  manage_tickets: "Gestionar tickets de soporte",
}

export function hasSupportCapability(caps: string[], required: string): boolean {
  return caps.includes(required)
}

export function isSupportCapability(val: any): val is SupportCapability {
  return typeof val === 'string' && (SUPPORT_CAPABILITIES as readonly string[]).includes(val)
}
