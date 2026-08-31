export async function register() {
  // Sentry instrumentation initialization placeholder
}

export async function onRequestError(err: any) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Request error:', err)
  }
}
