import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, created, serverError, notFound, validationError, badRequest } from '@/lib/api-response'
import { z } from 'zod'
import type { RouteHandler } from '@/types/next'
import type { TournamentTatami } from '@/types/database'

const createSchema = z.object({
  name: z.string().min(1, 'Tatami name is required').max(50),
})

// GET /api/tournaments/:id/tatamis — list tatamis for a tournament
export const GET: RouteHandler<{ id: string }> = async (_req, ctx) => {
  const { id } = await ctx.params

  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('tournament_tatamis')
    .select('*')
    .eq('tournament_id', id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return serverError()
  return ok((data ?? []) as TournamentTatami[])
}

// POST /api/tournaments/:id/tatamis — add a tatami
export const POST: RouteHandler<{ id: string }> = async (request: NextRequest, ctx) => {
  const { id } = await ctx.params

  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Verify tournament exists
  const { data: tourn } = await db.from('tournaments').select('id').eq('id', id).single()
  if (!tourn) return notFound('Tournament')

  // Get current count to set display_order
  const { count } = await db
    .from('tournament_tatamis')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', id)

  const { data, error } = await db
    .from('tournament_tatamis')
    .insert({
      tournament_id:  id,
      name:           parsed.data.name.trim(),
      display_order:  (count ?? 0),
      is_active:      true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return badRequest(`A tatami named "${parsed.data.name}" already exists for this tournament.`)
    }
    return serverError()
  }

  return created(data as TournamentTatami)
}
