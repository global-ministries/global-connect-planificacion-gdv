export interface PlatformSessionPersona {
  id: string
  authId: string | null
  [key: string]: any
}

export interface PlatformSessionCapability {
  key: string
  experience: string
  scopeType: string
  scopeId?: string
  source: string
  grantedAt: string
  [key: string]: any
}

export interface PlatformSession {
  persona: PlatformSessionPersona | null
  capabilities: PlatformSessionCapability[]
  globalRoles?: string[]
  [key: string]: any
}

export interface PlatformCapabilityLookup {
  findByPersonaId: (personaId: string) => Promise<PlatformSessionCapability[]>
}

export interface PlatformPersonaLookup {
  findByAuthId: (authId: string) => Promise<PlatformSessionPersona | null>
}

export interface BuildPlatformSessionInput {
  subjectAuthId: string | null | undefined
  personaLookup?: PlatformPersonaLookup
  capabilityLookup?: PlatformCapabilityLookup
}

export type BuildPlatformSessionResult =
  | { ok: true; session: PlatformSession }
  | { ok: false; error: string }
