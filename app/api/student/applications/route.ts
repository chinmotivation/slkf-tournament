import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudent, isNextResponse } from '@/lib/auth-guard'
import { created, serverError, validationError, conflict, notFound } from '@/lib/api-response'
import { applySchema } from '@/lib/validations/student'
import { computeAgeCategory, computeISKAgeCategory } from '@/lib/constants/karate'
import type { StudentProfile, Tournament } from '@/types/database'

export async function POST(request: NextRequest) {
  const auth = await requireStudent()
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const parsed = applySchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const supabase = await createClient()
  const db = supabase as any

  // Load student profile
  const profileResult = await db.from('student_profiles').select('*').eq('id', auth.userId).single()
  const profile = profileResult.data as StudentProfile | null
  if (!profile) return serverError('Student profile not found.')

  // Load tournament
  const tournResult = await db.from('tournaments').select('*').eq('id', parsed.data.tournament_id).single()
  if (tournResult.error || !tournResult.data) return notFound('Tournament')
  const tournament = tournResult.data as Tournament
  if (tournament.status !== 'OPEN') return conflict('This tournament is no longer accepting applications.', 'TOURNAMENT_CLOSED')

  // Check duplicate
  const dupResult = await db
    .from('student_applications')
    .select('id, status')
    .eq('user_id', auth.userId)
    .eq('tournament_id', parsed.data.tournament_id)
    .maybeSingle()

  if (dupResult.data) {
    const existing = dupResult.data as { id: string; status: string }
    if (existing.status === 'APPROVED') {
      return conflict('You are already registered for this tournament.', 'ALREADY_REGISTERED')
    }
    if (existing.status === 'PENDING') {
      return conflict('You already have a pending application. Edit it from your dashboard.', 'ALREADY_PENDING')
    }
    // REJECTED — allow re-apply by updating the existing row
    const updateResult = await db.from('student_applications').update({
      ...buildPayload(profile, tournament, parsed.data),
      status: 'PENDING',
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      student_number: null,
    }).eq('id', existing.id).select().single()

    if (updateResult.error) return serverError()
    return created(updateResult.data, 'Application re-submitted.')
  }

  // Compute age category (ISK and SLKF have different category sets)
  const isISKTournament = (tournament as any).tournament_type === 'ISK'
  const ageCode = isISKTournament
    ? computeISKAgeCategory(profile.date_of_birth, tournament.age_eligibility_cutoff_date)
    : computeAgeCategory(profile.date_of_birth, tournament.age_eligibility_cutoff_date)
  if (!ageCode) return conflict('You are not eligible for this tournament (age below minimum).', 'AGE_INELIGIBLE')

  const insertResult = await db.from('student_applications').insert({
    user_id: auth.userId,
    tournament_id: parsed.data.tournament_id,
    full_name: profile.full_name,
    date_of_birth: profile.date_of_birth,
    gender: profile.gender,
    belt_grade: profile.belt_grade,
    age_category_code: ageCode,
    kata_entry: parsed.data.kata_entry,
    kata_level: parsed.data.kata_level ?? null,
    kumite_entry: parsed.data.kumite_entry,
    kumite_weight_class: parsed.data.kumite_weight_class ?? null,
    team_kata_entry: parsed.data.team_kata_entry ?? false,
    team_kata_team_name: parsed.data.team_kata_team_name ?? null,
    team_kata_member2_name: parsed.data.team_kata_member2_name ?? null,
    team_kata_member3_name: parsed.data.team_kata_member3_name ?? null,
    class_id: (parsed.data as any).class_id ?? null,
    payment_receipt_url: parsed.data.payment_receipt_url,
    total_amount_lkr: parsed.data.total_amount_lkr,
  }).select().single()

  if (insertResult.error) return serverError()
  return created(insertResult.data, 'Application submitted successfully.')
}

function buildPayload(
  profile: StudentProfile,
  tournament: Tournament,
  data: ReturnType<typeof applySchema.parse>
) {
  const isISK = (tournament as any).tournament_type === 'ISK'
  const ageCode = isISK
    ? (computeISKAgeCategory(profile.date_of_birth, tournament.age_eligibility_cutoff_date) ?? 'ISK_OVER21')
    : (computeAgeCategory(profile.date_of_birth, tournament.age_eligibility_cutoff_date) ?? 'SENIOR')
  return {
    full_name: profile.full_name,
    date_of_birth: profile.date_of_birth,
    gender: profile.gender,
    belt_grade: profile.belt_grade,
    age_category_code: ageCode,
    kata_entry: data.kata_entry,
    kata_level: data.kata_level ?? null,
    kumite_entry: data.kumite_entry,
    kumite_weight_class: data.kumite_weight_class ?? null,
    team_kata_entry: data.team_kata_entry ?? false,
    team_kata_team_name: data.team_kata_team_name ?? null,
    team_kata_member2_name: data.team_kata_member2_name ?? null,
    team_kata_member3_name: data.team_kata_member3_name ?? null,
    class_id: (data as any).class_id ?? null,
    payment_receipt_url: data.payment_receipt_url,
    total_amount_lkr: data.total_amount_lkr,
  }
}
