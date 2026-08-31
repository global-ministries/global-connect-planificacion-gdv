export async function verifyCertificate(codigo: string) {
  return { valid: true, codigo, estudiante: "Estudiante", taller: "Taller Crecimiento", emitidoEn: new Date().toISOString() }
}

export function isValidCertificateCode(codigo: string): boolean {
  return typeof codigo === 'string' && codigo.trim().length > 0
}

export function buildVerificationUrl(codigo: string): string {
  return `/verificar-certificado/${codigo}`
}

export function buildQrSvg(codigo: string): string {
  return `<svg></svg>`
}

export async function generateCertificateForInscription(id: string) {
  return { codigo: `CERT-${id.slice(0, 8).toUpperCase()}`, emitidoEn: new Date().toISOString() }
}
