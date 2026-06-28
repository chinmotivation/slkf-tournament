import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAssociationRep, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, validationError, notFound, forbidden, conflict, badRequest } from '@/lib/api-response'
import { athleteSelectionSchema } from '@/lib/validations/application'
import type { Application, Athlete, Tournament } from '@/types/database'

type RouteContext = { params: Promise<{ id: string }> }

function computeAgeCategory(dob: string, cutoffDate: string): string {
  const cutoff = new Date(cutoffDate)
  const birth = new Date(dob)
  let age = cutoff.getFullYear() - birth.getFullYear()
  const m = cutoff.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && cutoff.getDate() < birth.getDate())) age--
  if (age < 14) return 'U14'
  if (age <= 15) return 'CADET'
  if (age <= 17) return 'JUNIOR'
  if (age <= 20) return 'U21'
  return 'SENIOR'
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const auth = await requireAssociationRep()
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const parsed = athleteSelectionSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const assocResult = await supabase
    .from('associations')
    .select('id')
    .eq('user_id', auth.userId)
    .single()
  const assoc = assocResult.data as { id: string } | null
  if (!assoc) return serverError('Association profile not found.')

  const appResult = await db.from('applications').select('*').eq('id', id).single()
  if (appResult.error || !appResult.data) return notFound('Application')
  const application = appResult.data as Application
  if (application.association_id !== assoc.id) return forbidden()
  if (application.status !== 'DRAFT') {
    return conflict('Application has already been submitted and cannot be edited.', 'ALREADY_SUBMITTED')
  }

  const tournResult = await db
    .from('tournaments')
    .select('*')
    .eq('id', application.tournament_id)
    .single()
  if (tournResult.error || !tournResult.data) return serverError()
  const tournament = tournResult.data as Tournament

  const { athlete_ids } = parsed.data

  if (athlete_ids.length > 0) {
    const athletesResult = await db
      .from('athletes')
      .select('*')
      .in('id', athlete_ids)
      .eq('association_id', assoc.id)
      .eq('is_active', true)
    const validAthletes = (athletesResult.data ?? []) as Athlete[]

    if (validAthletes.length !== athlete_ids.length) {
      return badRequest(
        'One or more selected athletes are invalid or do not belong to your association.',
        { athlete_ids: 'INVALID_ATHLETE' }
      )
    }

    // Hard delete existing entries — valid in DRAFT mode since we replace the full list
    await db.from('individual_entries').delete().eq('application_id', id)

    // Build entries in the order the caller supplied (preserve selection order)
    const idOrder = new Map(athlete_ids.map((aid, i) => [aid, i]))
    const sorted = [...validAthletes].sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))

    const entries = sorted.map((athlete, index) => ({
      application_id: id,
      tournament_id: application.tournament_id,
      association_id: assoc.id,
      athlete_id: athlete.id,
      full_name: athlete.full_name,
      date_of_birth: athlete.date_of_birth,
      gender: athlete.gender,
      age_category_code: computeAgeCategory(athlete.date_of_birth, tournament.age_eligibility_cutoff_date),
      event: 'KATA' as const,
      weight_kg: 1,
      entry_fee_lkr: tournament.fee_individual_one_event_lkr,
      row_order: index + 1,
      created_by: auth.userId,
      updated_by: auth.userId,
    }))

    const insertResult = await db.from('individual_entries').insert(entries)
    if (insertResult.error) return serverError()
  } else {
    await db.from('individual_entries').delete().eq('application_id', id)
  }

  await db
    .from('applications')
    .update({ updated_by: auth.userId })
    .eq('id', id)

  return ok({ athlete_count: athlete_ids.length })
}
