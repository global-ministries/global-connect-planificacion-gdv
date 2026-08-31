import { z } from 'zod'

export async function uploadSupportEvidence(file: any, ticketId: string) {
  return { url: "", id: "evidence-1" }
}

export const diagnosticsConsentSchema = z.object({
  consentGiven: z.boolean().default(true),
  capturedAt: z.string().optional(),
})

export function sanitizeSupportEvidence(evidence: any) {
  return evidence
}
