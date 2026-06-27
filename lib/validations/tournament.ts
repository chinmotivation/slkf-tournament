import { z } from 'zod'

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
  bank_account_name: z.string().min(2).max(200),
  bank_account_number: z.string().min(5).max(50),
  bank_name: z.string().min(2).max(100),
  bank_branch: z.string().min(2).max(100),
  fee_individual_one_event_lkr: z.number().int().positive(),
  fee_individual_both_events_lkr: z.number().int().positive(),
  fee_team_kata_lkr: z.number().int().positive(),
  max_team_members: z.number().int().min(2).max(6).default(4),
  max_u14_teams_per_gender: z.number().int().min(1).max(10).default(2),
  max_individual_athletes_per_application: z.number().int().min(1).max(200).default(100),
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export type TournamentInput = z.infer<typeof tournamentSchema>
