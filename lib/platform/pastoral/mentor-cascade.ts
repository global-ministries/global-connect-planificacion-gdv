export async function resolveMentorCascade(userId: string) {
  return { mentors: [] }
}

export async function resolveMentorOficial(options?: any) {
  return { mentor: null, fuente: 'none' }
}
