import { STORAGE_BUCKET_PAYMENT_SLIPS } from './constants'

export function buildPaymentSlipStoragePath(
  tournamentId: string,
  associationId: string,
  fileExt: string
): string {
  const uuid = crypto.randomUUID()
  return `${tournamentId}/${associationId}/${uuid}.${fileExt}`
}

export function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'application/pdf': 'pdf',
  }
  return map[mimeType] ?? 'bin'
}

export function getPaymentSlipBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET_PAYMENT_SLIPS ?? STORAGE_BUCKET_PAYMENT_SLIPS
}
