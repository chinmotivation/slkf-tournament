import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAssociationRep, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, notFound, forbidden, conflict } from '@/lib/api-response'
import type { Application, Tournament } from '@/types/database'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const auth = await requireAssociationRep()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const assocResult = await supabase
    .from('associations')
    .select('id, is_profile_complete')
    .eq('user_id', auth.userId)
    .single()
  const assoc = assocResult.data as { id: string; is_profile_complete: boolean } | null
  if (!assoc) return serverError('Association profile not found.')
  if (!assoc.is_profile_complete) {
    return conflict(
      'Your association profile is incomplete. Please complete it before submitting.',
      'PROFILE_INCOMPLETE'
    )
  }

  const appResult = await db.from('applications').select('*').eq('id', id).single()
  if (appResult.error || !appResult.data) return notFound('Application')
  const application = appResult.data as Application
  if (application.association_id !== assoc.id) return forbidden()
  if (application.status === 'SUBMITTED') {
    return conflict('Application has already been submitted.', 'ALREADY_SUBMITTED')
  }
  if (application.status !== 'DRAFT') {
    return conflict('Only draft applications can be submitted.', 'INVALID_STATUS')
  }

  const tournResult = await db
    .from('tournaments')
    .select('id, status')
    .eq('id', application.tournament_id)
    .single()
  if (tournResult.error || !tournResult.data) return serverError()
  const tournament = tournResult.data as Pick<Tournament, 'id' | 'status'>
  if (tournament.status !== 'OPEN') {
    return conflict('This tournament is no longer accepting applications.', 'TOURNAMENT_CLOSED')
  }

  // Require at least one athlete
  const countResult = await db
    .from('individual_entries')
    .select('id', { count: 'exact', head: true })
    .eq('application_id', id)
    .is('deleted_at', null)
  if ((countResult.count ?? 0) === 0) {
    return conflict('You must select at least one athlete before submitting.', 'NO_ATHLETES_SELECTED')
  }

  const now = new Date().toISOString()
  const updateResult = await db
    .from('applications')
    .update({ status: 'SUBMITTED', submitted_at: now, locked_at: now, updated_by: auth.userId })
    .eq('id', id)
    .select()
    .single()

  if (updateResult.error) return serverError()
  return ok(updateResult.data as Application)
}
