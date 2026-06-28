import { z } from 'zod'

export const rosterAthleteSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(150, 'Name must be at most 150 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name must contain letters only'),
  date_of_birth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine(val => !isNaN(Date.parse(val)), 'Invalid date of birth')
    .refine(val => new Date(val) < new Date(), 'Date of birth must be in the past'),
  gender: z.enum(['MALE', 'FEMALE']),
})

export const updateRosterAthleteSchema = rosterAthleteSchema.partial().extend({
  is_active: z.boolean().optional(),
})

export type RosterAthleteInput = z.infer<typeof rosterAthleteSchema>
export type UpdateRosterAthleteInput = z.infer<typeof updateRosterAthleteSchema>

export const individualEntrySchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(150, 'Name must be at most 150 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name must contain letters only'),
  date_of_birth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine(val => !isNaN(Date.parse(val)), 'Invalid date of birth')
    .refine(val => new Date(val) < new Date(), 'Date of birth must be in the past'),
  gender: z.enum(['MALE', 'FEMALE']),
  event: z.enum(['KATA', 'KUMITE', 'BOTH']),
  weight_kg: z
    .number()
    .positive('Weight must be greater than 0')
    .max(199, 'Weight must be less than 200 kg'),
  age_category_code: z.string().optional(),
  athlete_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
})

export type IndividualEntryInput = z.infer<typeof individualEntrySchema>
