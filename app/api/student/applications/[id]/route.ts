import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudent, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, validationError, notFound, forbidden, conflict } from '@/lib/api-response'
import { applySchema } from '@/lib/validations/student'
import { computeAgeCategory } from '@/lib/constants/karate'
import type { StudentApplication, StudentProfile, Tournament } from '@/types/database'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const auth = await requireStudent()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  const db = supabase as any

  const result = await db.from('student_applications').select('*').eq('id', id).single()
  if (result.error || !result.data) return notFound('Application')
  const app = result.data as StudentApplication
  if (app.user_id !== auth.userId) return forbidden()

  return ok(app)
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const auth = await requireStudent()
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const parsed = applySchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const supabase = await createClient()
  const db = supabase as any

  const appResult = await db.from('student_applications').select('*').eq('id', id).single()
  if (appResult.error || !appResult.data) return notFound('Application')
  const app = appResult.data as StudentApplication
  if (app.user_id !== auth.userId) return forbidden()
  if (app.status !== 'PENDING') return conflict('Only pending applications can be edited.', 'NOT_EDITABLE')

  const profileResult = await db.from('student_profiles').select('*').eq('id', auth.userId).single()
  const profile = profileResult.data as StudentProfile | null
  if (!profile) return serverError()

  const tournResult = await db.from('tournaments').select('*').eq('id', app.tournament_id).single()
  if (tournResult.error || !tournResult.data) return serverError()
  const tournament = tournResult.data as Tournament

  const ageCode = computeAgeCategory(profile.date_of_birth, tournament.age_eligibility_cutoff_date) ?? app.age_category_code

  const updateResult = await db.from('student_applications').update({
    kata_entry: parsed.data.kata_entry,
    kata_level: parsed.data.kata_level ?? null,
    kumite_entry: parsed.data.kumite_entry,
    kumite_weight_class: parsed.data.kumite_weight_class ?? null,
    payment_receipt_url: parsed.data.payment_receipt_url,
    total_amount_lkr: parsed.data.total_amount_lkr,
    age_category_code: ageCode,
  }).eq('id', id).select().single()

  if (updateResult.error) return serverError()
  return ok(updateResult.data)
}
