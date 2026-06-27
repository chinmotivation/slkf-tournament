import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, notFound, forbidden } from '@/lib/api-response'
import type { Application, IndividualEntry, Tournament } from '@/types/database'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const auth = await requireAuth()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const appResult = await db.from('applications').select('*').eq('id', id).single()
  if (appResult.error || !appResult.data) return notFound('Application')
  const application = appResult.data as Application

  if (auth.role === 'association_rep') {
    const assocResult = await supabase
      .from('associations')
      .select('id')
      .eq('user_id', auth.userId)
      .single()
    const assoc = assocResult.data as { id: string } | null
    if (!assoc || assoc.id !== application.association_id) return forbidden()
  } else if (auth.role !== 'head_master') {
    return forbidden()
  }

  const [tournResult, entriesResult] = await Promise.all([
    db.from('tournaments').select('*').eq('id', application.tournament_id).single(),
    db.from('individual_entries')
      .select('*')
      .eq('application_id', id)
      .is('deleted_at', null)
      .order('row_order'),
  ])

  if (tournResult.error) return serverError()

  return ok({
    application,
    tournament: tournResult.data as Tournament | null,
    entries: (entriesResult.data ?? []) as IndividualEntry[],
  })
}
