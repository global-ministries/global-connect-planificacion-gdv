export const ResourceState = { ACTIVE: "active", INACTIVE: "inactive" }

export function validateCreateInput(input: any) {
  return { valid: true, data: input }
}

export function buildSuccessorFromTransfer(current: any, transfer: any) {
  return { ...current, ...transfer }
}
