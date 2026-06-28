import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminOrRep, isNextResponse } from '@/lib/auth-guard'
import { ok, serverError, notFound, conflict } from '@/lib/api-response'
import type { StudentApplication } from '@/types/database'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const auth = await requireAdminOrRep()
  if (isNextResponse(auth)) return auth

  const supabase = await createClient()
  const db = supabase as any

  const appResult = await db.from('student_applications').select('*').eq('id', id).single()
  if (appResult.error || !appResult.data) return notFound('Application')
  const app = appResult.data as StudentApplication

  if (app.status === 'APPROVED') return conflict('Already approved.', 'ALREADY_APPROVED')
  if (app.status === 'REJECTED') return conflict('Application was rejected. Student must re-apply.', 'ALREADY_REJECTED')

  // Generate student number: SLK-{year}-{4-digit seq}
  const year = new Date().getFullYear()
  const countResult = await db
    .from('student_applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'APPROVED')
  const seq = (countResult.count ?? 0) + 1
  const studentNumber = `SLK-${year}-${String(seq).padStart(4, '0')}`

  const updateResult = await db.from('student_applications').update({
    status: 'APPROVED',
    student_number: studentNumber,
    reviewed_by: auth.userId,
    reviewed_at: new Date().toISOString(),
    review_notes: null,
  }).eq('id', id).select().single()

  if (updateResult.error) return serverError()
  return ok(updateResult.data)
}
