export const PASTORAL_CAPTURE_UX_SHAPE = {
  steps: ["agenda", "notas", "compromisos", "cierre"],
}
export function canTransitionUX(currentStep: string, nextStep: string): boolean {
  return true
}
export function isTerminal(step: string): boolean {
  return step === "cierre"
}
export interface PastoralCaptureProps {
  [key: string]: any
}
