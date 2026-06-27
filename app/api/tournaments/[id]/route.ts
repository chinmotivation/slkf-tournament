import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, notFound, validationError } from '@/lib/api-response'
import { tournamentSchema } from '@/lib/validations/tournament'
import type { RouteHandler } from '@/types/next'
import type { Tournament } from '@/types/database'

const nullStr = (v: string | undefined | null) => (v && v.trim() !== '' ? v : null)
const nullDate = (v: string | undefined | null) =>
  v && v.trim() !== '' && !isNaN(Date.parse(v)) ? v : null

// GET /api/tournaments/:id — role-aware: head master gets full record, rep gets published-only
export const GET: RouteHandler<{ id: string }> = async (_req, ctx) => {
  const { id } = await ctx.params

  const auth = await requireAuth()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const result = await db.from('tournaments').select('*').eq('id', id).single()

  const tournament = result.data as Tournament | null
  if (result.error || !tournament) return notFound('Tournament')

  if (auth.role === 'association_rep' && tournament.status !== 'OPEN') {
    return notFound('Tournament')
  }

  return ok(tournament)
}

// PUT /api/tournaments/:id — head master: update tournament
export const PUT: RouteHandler<{ id: string }> = async (request: NextRequest, ctx) => {
  const { id } = await ctx.params

  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const parsed = tournamentSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const fetchResult = await db.from('tournaments').select('id').eq('id', id).single()
  if (fetchResult.error || !fetchResult.data) return notFound('Tournament')

  const d = parsed.data
  const updateResult = await db
    .from('tournaments')
    .update({
      name: d.name,
      code: d.code,
      year: d.year,
      subtitle: nullStr(d.subtitle),
      registration_deadline: d.registration_deadline,
      age_eligibility_cutoff_date: d.age_eligibility_cutoff_date,
      venue_u14: nullStr(d.venue_u14),
      venue_cadet_junior: nullStr(d.venue_cadet_junior),
      venue_u21_senior: nullStr(d.venue_u21_senior),
      date_u14_start: nullDate(d.date_u14_start),
      date_u14_end: nullDate(d.date_u14_end),
      date_cadet_junior: nullDate(d.date_cadet_junior),
      date_u21_senior_start: nullDate(d.date_u21_senior_start),
      date_u21_senior_end: nullDate(d.date_u21_senior_end),
      bank_account_name: d.bank_account_name,
      bank_account_number: d.bank_account_number,
      bank_name: d.bank_name,
      bank_branch: d.bank_branch,
      fee_individual_one_event_lkr: d.fee_individual_one_event_lkr,
      fee_individual_both_events_lkr: d.fee_individual_both_events_lkr,
      fee_team_kata_lkr: d.fee_team_kata_lkr,
      max_team_members: d.max_team_members,
      max_u14_teams_per_gender: d.max_u14_teams_per_gender,
      max_individual_athletes_per_application: d.max_individual_athletes_per_application,
      notes: nullStr(d.notes),
      updated_by: auth.userId,
    })
    .eq('id', id)
    .select()
    .single()

  if (updateResult.error) return serverError()
  return ok(updateResult.data as Tournament)
}
