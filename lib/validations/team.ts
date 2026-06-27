import { z } from 'zod'

export const teamMemberSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Member name must be at least 2 characters')
    .max(150)
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name must contain letters only'),
  member_order: z.number().int().min(1).max(4),
})

export const teamKataEntrySchema = z.object({
  age_group_code: z.string().min(1, 'Please select an age group'),
  gender: z.enum(['MALE', 'FEMALE']),
  members: z
    .array(teamMemberSchema)
    .min(2, 'Each team must have at least 2 members')
    .max(4, 'A team can have at most 4 members'),
})

export type TeamKataEntryInput = z.infer<typeof teamKataEntrySchema>
export type TeamMemberInput = z.infer<typeof teamMemberSchema>
