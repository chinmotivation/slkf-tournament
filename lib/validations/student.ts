import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  date_of_birth: z.string().min(1, 'Date of birth is required')
    .refine(v => !isNaN(Date.parse(v)), 'Invalid date')
    .refine(v => new Date(v) < new Date(), 'Date of birth must be in the past'),
  gender: z.enum(['MALE', 'FEMALE']),
  belt_grade: z.string().min(1, 'Belt grade is required'),
  phone: z.string().min(9, 'Phone number is required').max(20),
})

export const applySchema = z.object({
  tournament_id: z.string().min(1),
  kata_entry: z.boolean(),
  kata_level: z.string().optional(),
  kumite_entry: z.boolean(),
  kumite_weight_class: z.string().optional(),
  payment_receipt_url: z.string().min(1, 'Payment receipt is required'),
  total_amount_lkr: z.number().int().min(0),
}).refine(d => d.kata_entry || d.kumite_entry, {
  message: 'Select at least one event (Kata or Kumite)',
  path: ['kata_entry'],
}).refine(d => !d.kata_entry || !!d.kata_level, {
  message: 'Select a Kata level',
  path: ['kata_level'],
}).refine(d => !d.kumite_entry || !!d.kumite_weight_class, {
  message: 'Select a Kumite weight class',
  path: ['kumite_weight_class'],
})

export const rejectSchema = z.object({
  notes: z.string().min(5, 'Please provide a rejection reason (min 5 characters)'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type ApplyInput = z.infer<typeof applySchema>
export type RejectInput = z.infer<typeof rejectSchema>
