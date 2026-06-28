import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, created, serverError, validationError } from '@/lib/api-response'
import { tournamentSchema } from '@/lib/validations/tournament'
import type { Tournament } from '@/types/database'

// supabase-js v2 generic typing cannot validate the hand-written Tournament Row/Insert/Update
// types (which contain `number` and `string | null` fields). Casting to `any` once per
// handler is the standard workaround until types are CLI-generated.

const nullStr = (v: string | undefined | null) => (v && v.trim() !== '' ? v : null)
const nullDate = (v: string | undefined | null) =>
  v && v.trim() !== '' && !isNaN(Date.parse(v)) ? v : null

// GET /api/tournaments — head master: list all tournaments
export async function GET() {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const result = await db
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  if (result.error) return serverError()
  return ok((result.data ?? []) as Tournament[])
}

// POST /api/tournaments — head master: create a new tournament
export async function POST(request: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const parsed = tournamentSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const d = parsed.data
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const result = await db
    .from('tournaments')
    .insert({
      name: d.name,
      code: d.code,
      year: d.year,
      subtitle: nullStr(d.subtitle),
      registration_deadline: d.registration_deadline,
      age_eligibility_cutoff_date: d.age_eligibility_cutoff_date,
      status: 'DRAFT',
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
      organizer_district:         nullStr(d.organizer_district),
      organizer_province:         nullStr(d.organizer_province),
      organizer_association_name: nullStr(d.organizer_association_name),
      organizer_reg_no:           nullStr(d.organizer_reg_no),
      organizer_instructor_name:  nullStr(d.organizer_instructor_name),
      organizer_whatsapp:         nullStr(d.organizer_whatsapp),
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .single()

  if (result.error) {
    if (result.error.code === '23505') {
      return serverError('A tournament with this code already exists.')
    }
    return serverError()
  }

  return created(result.data as Tournament)
}
