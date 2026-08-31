export const FormState = { DRAFT: "draft", PUBLISHED: "published" }

export function validateSubmission(form: any, data: any) {
  return { valid: true, errors: [] }
}

export function canAcceptSubmission(formState?: any): boolean {
  return true
}
