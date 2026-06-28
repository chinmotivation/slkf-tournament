import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, created, serverError, validationError } from '@/lib/api-response'
import { tournamentSchema } from '@/lib/validations/tournament'
import type { Tournament } from '@/types/database'

const nullStr  = (v: string | undefined | null) => (v && v.trim() !== '' ? v : null)
const nullDate = (v: string | undefined | null) =>
  v && v.trim() !== '' && !isNaN(Date.parse(v)) ? v : null
const nullNum  = (v: number | undefined | null) => (v !== undefined && v !== null ? v : null)

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
      // Basic
      name:     d.name,
      code:     d.code,
      year:     d.year,
      subtitle: nullStr(d.subtitle),
      // Registration dates
      registration_deadline:       d.registration_deadline,
      age_eligibility_cutoff_date: d.age_eligibility_cutoff_date,
      registration_open_date:      nullDate(d.registration_open_date),
      allow_late_registration:     d.allow_late_registration ?? false,
      // Venue & competition dates
      venue:                  nullStr(d.venue),
      competition_start_date: nullDate(d.competition_start_date),
      competition_end_date:   nullDate(d.competition_end_date),
      // Competition rules
      competition_rules: d.competition_rules ?? 'WKF',
      custom_rules_text: nullStr(d.custom_rules_text),
      // Event toggles
      enable_individual_kata:   d.enable_individual_kata ?? true,
      enable_team_kata:         d.enable_team_kata ?? true,
      enable_individual_kumite: d.enable_individual_kumite ?? true,
      enable_team_kumite:       d.enable_team_kumite ?? false,
      // Draw config
      draw_type:      d.draw_type ?? 'SINGLE_ELIMINATION',
      seeding_method: d.seeding_method ?? 'RANDOM',
      // Match rules
      medal_rule:             d.medal_rule ?? 'TWO_BRONZE',
      match_duration_seconds: d.match_duration_seconds ?? 180,
      kata_scoring_method:    d.kata_scoring_method ?? 'TOTAL_SCORE',
      kumite_scoring_method:  d.kumite_scoring_method ?? 'POINT_BASED',
      tie_break_rule:         d.tie_break_rule ?? 'SENSHU',
      // Bank & payment
      bank_account_name:   d.bank_account_name,
      bank_account_number: d.bank_account_number,
      bank_name:           d.bank_name,
      bank_branch:         d.bank_branch,
      payment_deadline:     nullDate(d.payment_deadline),
      payment_instructions: nullStr(d.payment_instructions),
      // Fees
      fee_individual_one_event_lkr:   d.fee_individual_one_event_lkr,
      fee_individual_both_events_lkr: d.fee_individual_both_events_lkr,
      fee_team_kata_lkr:              d.fee_team_kata_lkr,
      // Limits
      max_team_members:                        d.max_team_members,
      max_u14_teams_per_gender:               d.max_u14_teams_per_gender,
      max_individual_athletes_per_application: d.max_individual_athletes_per_application,
      max_entries_per_category:               nullNum(d.max_entries_per_category) ?? 3,
      max_team_kata_teams:                    nullNum(d.max_team_kata_teams) ?? 4,
      // Public info
      tournament_description: nullStr(d.tournament_description),
      organizer_contact:      nullStr(d.organizer_contact),
      rules_pdf_url:          nullStr(d.rules_pdf_url),
      // Organizer
      notes:                      nullStr(d.notes),
      organizer_district:         nullStr(d.organizer_district),
      organizer_province:         nullStr(d.organizer_province),
      organizer_association_name: nullStr(d.organizer_association_name),
      organizer_reg_no:           nullStr(d.organizer_reg_no),
      organizer_instructor_name:  nullStr(d.organizer_instructor_name),
      organizer_whatsapp:         nullStr(d.organizer_whatsapp),
      status: 'DRAFT',
      owner_id:   auth.userId,
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
