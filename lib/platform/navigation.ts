import type { PlatformNavigationFlags } from "./flags"
import type { PlatformSession } from "./session/types"

export type PlatformNavigationSession = PlatformSession

export type PlatformNavigationItemId =
  | "grupos_vida_stage"
  | "dps_team_service"
  | "ninos_room_context"
  | "estudiantes_room_context"
  | "talleres_participation"
  | "dps_admin"
  | "nextgen_admin"
  | "uno_a_uno_global"
  | "pastor_dashboard"
  | "pastor_usuarios"
  | "pastor_crisis"
  | "pastor_lecturas"
  | "lider_dashboard"
  | "lider_uno_a_uno"
  | "asistido_roadmap"
  | "lider_triada"

export interface PlatformNavigationItem {
  id: PlatformNavigationItemId
  label: string
  href: string
  scope: {
    type: string
    id?: string
  }
}

export interface PlatformNavigationResolution {
  mode: "platform" | "legacy"
  visibleItems: PlatformNavigationItem[]
}

export interface PlatformNavigationResolverInput {
  flags?: PlatformNavigationFlags
  platformSession?: PlatformNavigationSession | null
}

export function resolvePlatformNavigationGate(input: {
  flags?: PlatformNavigationFlags
  platformSession?: PlatformNavigationSession | null
}): { ok: boolean; platformSession?: PlatformNavigationSession | null } {
  return {
    ok: true,
    platformSession: input.platformSession,
  }
}

export async function resolvePlatformNavigation(
  input: PlatformNavigationResolverInput
): Promise<PlatformNavigationResolution> {
  const session = input.platformSession
  if (!session) {
    return {
      mode: "platform",
      visibleItems: [],
    }
  }

  const items: PlatformNavigationItem[] = []

  for (const cap of session.capabilities || []) {
    if (cap.key?.startsWith("talleres_crecimiento")) {
      items.push({
        id: "talleres_participation",
        label: "Talleres",
        href: "/talleres/explorar",
        scope: { type: cap.scopeType, id: cap.scopeId },
      })
    }
  }

  return {
    mode: "platform",
    visibleItems: items,
  }
}
