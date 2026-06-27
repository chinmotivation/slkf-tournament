import { z } from 'zod'

const optionalDate = z
  .string()
  .refine(v => !v || !isNaN(Date.parse(v)), 'Invalid date')
  .optional()

export const tournamentSchema = z.object({
  name: z.string().min(3, 'Tournament name is required').max(200),
  code: z
    .string()
    .min(3, 'Tournament code is required')
    .max(30)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase letters, numbers, and hyphens only'),
  year: z.number().int().min(2020).max(2100),
  subtitle: z.string().max(200).optional().or(z.literal('')),
  registration_deadline: z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid deadline date'),
  age_eligibility_cutoff_date: z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid cutoff date'),
  venue_u14: z.string().max(200).optional().or(z.literal('')),
  venue_cadet_junior: z.string().max(200).optional().or(z.literal('')),
  venue_u21_senior: z.string().max(200).optional().or(z.literal('')),
  date_u14_start: optionalDate,
  date_u14_end: optionalDate,
  date_cadet_junior: optionalDate,
  date_u21_senior_start: optionalDate,
  date_u21_senior_end: optionalDate,
  bank_account_name: z.string().min(2, 'Required').max(200),
  bank_account_number: z.string().min(5, 'Required').max(50),
  bank_name: z.string().min(2, 'Required').max(100),
  bank_branch: z.string().min(2, 'Required').max(100),
  fee_individual_one_event_lkr: z.number().int().positive('Must be a positive amount'),
  fee_individual_both_events_lkr: z.number().int().positive('Must be a positive amount'),
  fee_team_kata_lkr: z.number().int().positive('Must be a positive amount'),
  max_team_members: z.number().int().min(2).max(6),
  max_u14_teams_per_gender: z.number().int().min(1).max(10),
  max_individual_athletes_per_application: z.number().int().min(1).max(200),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export type TournamentInput = z.infer<typeof tournamentSchema>
