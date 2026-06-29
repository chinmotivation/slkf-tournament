import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudent, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, validationError } from '@/lib/api-response'
import { profileUpdateSchema } from '@/lib/validations/student'

export async function PUT(request: NextRequest) {
  const auth = await requireStudent()
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const supabase = await createClient()
  const db = supabase as any

  const { error } = await db.from('student_profiles').update({
    full_name: parsed.data.full_name,
    date_of_birth: parsed.data.date_of_birth,
    belt_grade: parsed.data.belt_grade,
    phone: parsed.data.phone,
  }).eq('id', auth.userId)

  if (error) return serverError('Failed to update profile.')

  return ok(null, 'Profile updated successfully.')
}
