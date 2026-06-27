import { z } from 'zod'
import { PAYMENT_SLIP_MAX_BYTES, ALLOWED_PAYMENT_SLIP_TYPES } from '@/utils/constants'

export const paymentUploadConfirmSchema = z.object({
  storage_path: z.string().min(1, 'Storage path is required'),
  original_filename: z.string().min(1).max(255),
  mime_type: z.enum(ALLOWED_PAYMENT_SLIP_TYPES),
  file_size_bytes: z
    .number()
    .positive()
    .max(PAYMENT_SLIP_MAX_BYTES, 'File size must not exceed 5 MB'),
  bank_reference_number: z.string().max(100).optional().or(z.literal('')),
})

export type PaymentUploadConfirmInput = z.infer<typeof paymentUploadConfirmSchema>

export const verifyPaymentSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().max(500).optional(),
}).refine(
  data => data.action !== 'REJECTED' || (data.reason && data.reason.trim().length >= 10),
  {
    message: 'A rejection reason of at least 10 characters is required.',
    path: ['reason'],
  }
)

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>

// Client-side file validation (before upload begins)
export function validatePaymentSlipFile(file: File): string | null {
  if (!ALLOWED_PAYMENT_SLIP_TYPES.includes(file.type as typeof ALLOWED_PAYMENT_SLIP_TYPES[number])) {
    return 'Only JPEG, PNG, and PDF files are accepted.'
  }
  if (file.size > PAYMENT_SLIP_MAX_BYTES) {
    return `File size must not exceed 5 MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`
  }
  return null
}
