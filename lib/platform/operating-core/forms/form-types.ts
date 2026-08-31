export interface FormDefinition { id: string; title: string }

export const OPERATING_CORE_FORM_LIFECYCLES = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
  CLOSED: "closed",
} as const

