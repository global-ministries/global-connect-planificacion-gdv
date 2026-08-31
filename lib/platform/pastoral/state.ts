export const ONE_ON_ONE_STATES = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const

export function transition(currentState: string, targetState: string) {
  return targetState
}
