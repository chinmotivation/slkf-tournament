import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAssociationRep, isNextResponse } from '@/lib/auth-guard'
import { ok, created, serverError, validationError, notFound, conflict } from '@/lib/api-response'
import { draftSchema } from '@/lib/validations/application'
import type { Application, Tournament } from '@/types/database'

export async function POST(request: NextRequest) {
  const auth = await requireAssociationRep()
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const parsed = draftSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const assocResult = await supabase
    .from('associations')
    .select('id, is_profile_complete')
    .eq('user_id', auth.userId)
    .single()
  const assoc = assocResult.data as { id: string; is_profile_complete: boolean } | null
  if (!assoc) return serverError('Association profile not found. Please complete your profile first.')

  const tournResult = await db
    .from('tournaments')
    .select('id, status')
    .eq('id', parsed.data.tournament_id)
    .single()
  if (tournResult.error || !tournResult.data) return notFound('Tournament')
  const tournament = tournResult.data as Pick<Tournament, 'id' | 'status'>
  if (tournament.status !== 'OPEN') {
    return conflict('This tournament is not accepting applications.', 'TOURNAMENT_CLOSED')
  }

  // Return existing application if already created (any status)
  const existingResult = await db
    .from('applications')
    .select('*')
    .eq('tournament_id', parsed.data.tournament_id)
    .eq('association_id', assoc.id)
    .maybeSingle()

  if (existingResult.data) {
    return ok(existingResult.data as Application)
  }

  const insertResult = await db.from('applications').insert({
    tournament_id: parsed.data.tournament_id,
    association_id: assoc.id,
    status: 'DRAFT',
    created_by: auth.userId,
    updated_by: auth.userId,
  }).select().single()

  if (insertResult.error) return serverError()
  return created(insertResult.data as Application)
}
