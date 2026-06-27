import { z } from 'zod'

export const draftSchema = z.object({
  tournament_id: z.string().uuid('Invalid tournament ID'),
})

export const athleteSelectionSchema = z.object({
  athlete_ids: z.array(z.string().uuid('Invalid athlete ID')).max(200),
})

export type DraftInput = z.infer<typeof draftSchema>
export type AthleteSelectionInput = z.infer<typeof athleteSelectionSchema>
