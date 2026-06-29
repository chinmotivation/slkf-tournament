import { z } from 'zod'

const optionalDate = z
  .string()
  .refine(v => !v || !isNaN(Date.parse(v)), 'Invalid date')
  .optional()

export const tournamentSchema = z.object({
  // ── Tournament type ─────────────────────────────────────────────────────────
  tournament_type: z.enum(['SLKF', 'ISK']).default('SLKF'),

  // ── Basic info ──────────────────────────────────────────────────────────────
  name: z.string().min(3, 'Tournament name is required').max(200),
  code: z
    .string()
    .min(3, 'Tournament code is required')
    .max(30)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase letters, numbers, and hyphens only'),
  year: z.number().int().min(2020).max(2100),
  subtitle: z.string().max(200).optional().or(z.literal('')),

  // ── Registration dates ──────────────────────────────────────────────────────
  registration_deadline: z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid deadline date'),
  age_eligibility_cutoff_date: z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid cutoff date'),
  registration_open_date: optionalDate,
  allow_late_registration: z.boolean().default(false),

  // ── Venue & competition dates (Phase 0 unified) ─────────────────────────────
  venue: z.string().max(300).optional().or(z.literal('')),
  competition_start_date: optionalDate,
  competition_end_date: optionalDate,

  // ── Legacy split venue/date columns (kept; not shown in form) ───────────────
  venue_u14: z.string().max(300).optional().or(z.literal('')),
  venue_cadet_junior: z.string().max(300).optional().or(z.literal('')),
  venue_u21_senior: z.string().max(300).optional().or(z.literal('')),
  date_u14_start: optionalDate,
  date_u14_end: optionalDate,
  date_cadet_junior: optionalDate,
  date_u21_senior_start: optionalDate,
  date_u21_senior_end: optionalDate,

  // ── Competition rules ───────────────────────────────────────────────────────
  competition_rules: z.enum(['WKF', 'SLKF', 'CUSTOM']).default('WKF'),
  custom_rules_text: z.string().max(2000).optional().or(z.literal('')),

  // ── Competition type toggles ────────────────────────────────────────────────
  enable_individual_kata:   z.boolean().default(true),
  enable_team_kata:         z.boolean().default(true),
  enable_individual_kumite: z.boolean().default(true),
  enable_team_kumite:       z.boolean().default(false),

  // ── Draw configuration ──────────────────────────────────────────────────────
  draw_type:      z.enum(['SINGLE_ELIMINATION', 'ROUND_ROBIN', 'POOL_KNOCKOUT']).default('SINGLE_ELIMINATION'),
  seeding_method: z.enum(['RANDOM', 'ASSOCIATION_SEPARATION', 'MANUAL']).default('RANDOM'),

  // ── Medal & match rules ─────────────────────────────────────────────────────
  medal_rule:              z.enum(['ONE_BRONZE', 'TWO_BRONZE']).default('TWO_BRONZE'),
  match_duration_seconds:  z.number().int().min(60).max(600).default(180),
  kata_scoring_method:     z.enum(['TOTAL_SCORE', 'DEDUCTION', 'FLAG']).default('TOTAL_SCORE'),
  kumite_scoring_method:   z.enum(['POINT_BASED', 'FLAG']).default('POINT_BASED'),
  tie_break_rule:          z.enum(['SENSHU', 'HANTEI', 'OVERTIME']).default('SENSHU'),

  // ── Bank payment details ────────────────────────────────────────────────────
  bank_account_name:   z.string().min(2, 'Required').max(200),
  bank_account_number: z.string().min(5, 'Required').max(50),
  bank_name:           z.string().min(2, 'Required').max(100),
  bank_branch:         z.string().min(2, 'Required').max(100),
  payment_deadline:    optionalDate,
  payment_instructions: z.string().max(2000).optional().or(z.literal('')),

  // ── Entry fees ──────────────────────────────────────────────────────────────
  fee_individual_one_event_lkr:   z.number().int().positive('Must be a positive amount'),
  fee_individual_both_events_lkr: z.number().int().positive('Must be a positive amount'),
  fee_team_kata_lkr:              z.number().int().positive('Must be a positive amount'),

  // ── Limits ──────────────────────────────────────────────────────────────────
  max_team_members:                        z.number().int().min(2).max(6),
  max_u14_teams_per_gender:               z.number().int().min(1).max(10),
  max_individual_athletes_per_application: z.number().int().min(1).max(200),
  max_entries_per_category:               z.number().int().min(1).max(20).default(3),
  max_team_kata_teams:                    z.number().int().min(1).max(20).default(4),

  // ── Public information ──────────────────────────────────────────────────────
  tournament_description: z.string().max(3000).optional().or(z.literal('')),
  organizer_contact:      z.string().max(200).optional().or(z.literal('')),
  rules_pdf_url:          z.string().url('Must be a valid URL').optional().or(z.literal('')),

  // ── Organizer details (printed in Excel export) ─────────────────────────────
  organizer_district:         z.string().max(100).optional().or(z.literal('')),
  organizer_province:         z.string().max(100).optional().or(z.literal('')),
  organizer_association_name: z.string().max(200).optional().or(z.literal('')),
  organizer_reg_no:           z.string().max(100).optional().or(z.literal('')),
  organizer_instructor_name:  z.string().max(200).optional().or(z.literal('')),
  organizer_whatsapp:         z.string().max(30).optional().or(z.literal('')),

  // ── Internal notes ──────────────────────────────────────────────────────────
  notes: z.string().max(2000).optional().or(z.literal('')),
})

export type TournamentInput = z.infer<typeof tournamentSchema>
