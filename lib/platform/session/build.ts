import type { BuildPlatformSessionInput, BuildPlatformSessionResult, PlatformSession } from "./types"

export async function buildPlatformSession(input: BuildPlatformSessionInput): Promise<BuildPlatformSessionResult> {
  const { subjectAuthId, personaLookup, capabilityLookup } = input
  if (!subjectAuthId) {
    return {
      ok: true,
      session: { persona: null, capabilities: [], globalRoles: [] },
    }
  }

  let persona = null
  if (personaLookup) {
    persona = await personaLookup.findByAuthId(subjectAuthId)
  }

  let capabilities: PlatformSession["capabilities"] = []
  if (persona?.id && capabilityLookup) {
    capabilities = await capabilityLookup.findByPersonaId(persona.id)
  }

  return {
    ok: true,
    session: {
      persona,
      capabilities,
      globalRoles: [],
    },
  }
}
