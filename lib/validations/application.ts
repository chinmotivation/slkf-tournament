import { z } from 'zod'

const uuidLike = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid ID format'
)

export const draftSchema = z.object({
  tournament_id: uuidLike,
})

export const athleteSelectionSchema = z.object({
  athlete_ids: z.array(uuidLike).max(200),
})

export type DraftInput = z.infer<typeof draftSchema>
export type AthleteSelectionInput = z.infer<typeof athleteSelectionSchema>
