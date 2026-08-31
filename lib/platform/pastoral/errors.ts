export class PastoralError extends Error {}

export function isConcurrencyConflict(err: any): boolean {
  return err?.name === 'ConcurrencyConflictError' || err?.code === 'concurrency_conflict'
}

export function isMissingMotivo(err: any): boolean {
  return err?.code === 'missing_motivo'
}

export function isInvalidStateTransition(err: any): boolean {
  return err?.code === 'invalid_transition'
}
