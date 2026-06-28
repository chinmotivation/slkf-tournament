import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminOrRep, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, notFound, conflict, validationError } from '@/lib/api-response'
import { rejectSchema } from '@/lib/validations/student'
import type { StudentApplication } from '@/types/database'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const auth = await requireAdminOrRep()
  if (isNextResponse(auth)) return auth

  const body = await request.json()
  const parsed = rejectSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const supabase = await createClient()
  const db = supabase as any

  const appResult = await db.from('student_applications').select('status').eq('id', id).single()
  if (appResult.error || !appResult.data) return notFound('Application')
  const app = appResult.data as Pick<StudentApplication, 'status'>

  if (app.status === 'APPROVED') return conflict('Cannot reject an already approved application.', 'ALREADY_APPROVED')
  if (app.status === 'REJECTED') return conflict('Already rejected.', 'ALREADY_REJECTED')

  const updateResult = await db.from('student_applications').update({
    status: 'REJECTED',
    reviewed_by: auth.userId,
    reviewed_at: new Date().toISOString(),
    review_notes: parsed.data.notes,
  }).eq('id', id).select().single()

  if (updateResult.error) return serverError()
  return ok(updateResult.data)
}
