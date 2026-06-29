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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const appResult = await db.from('student_applications').select('*').eq('id', id).single()
  if (appResult.error || !appResult.data) return notFound('Application')
  const app = appResult.data as StudentApplication

  if (app.status === 'APPROVED') return conflict('Already approved.', 'ALREADY_APPROVED')
  if (app.status === 'REJECTED') return conflict('Application was rejected. Student must re-apply.', 'ALREADY_REJECTED')

  // BUG-1: use the atomic DB function to avoid race conditions.
  // assign_student_number() does UPDATE...RETURNING in a single transaction,
  // guaranteeing uniqueness even under concurrent approvals.
  const { data: studentNumber, error: seqError } = await db
    .rpc('assign_student_number', { p_tournament_id: app.tournament_id })

  if (seqError || !studentNumber) {
    console.error('[approve] assign_student_number error:', seqError)
    return serverError('Failed to generate student number.')
  }

  const updateResult = await db.from('student_applications').update({
    status: 'APPROVED',
    student_number: studentNumber as string,
    reviewed_by: auth.userId,
    reviewed_at: new Date().toISOString(),
    review_notes: null,
  }).eq('id', id).select().single()

  if (updateResult.error) return serverError()
  return ok(updateResult.data)
}
