import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, badRequest, notFound, conflict, forbidden, serverError } from '@/lib/api-response'
import { z } from 'zod'
import { zodUuid } from '@/lib/validations/uuid'

const schema = z.object({
  token: zodUuid('Invalid token format.'),
  type: z.enum(['individual', 'student']),
})

// POST /api/check-in/mark — mark an athlete as checked in
export async function POST(request: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Request body is required.')

  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request.')

  const { token, type } = parsed.data
  const now = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  if (type === 'individual') {
    const { data: entry } = await db
      .from('individual_entries')
      .select('id, checked_in_at, deleted_at, application:applications(status, tournament:tournaments(id, owner_id))')
      .eq('check_in_token', token)
      .single()

    if (!entry) return notFound('Entry')
    if (entry.deleted_at) return badRequest('This entry has been removed.')

    // SEC-5: verify the tournament belongs to this Head Master
    const tournamentOwnerId = entry.application?.tournament?.owner_id
    if (tournamentOwnerId !== auth.userId) return forbidden('This entry belongs to a different tournament.')

    if (entry.application?.status !== 'APPROVED') {
      return badRequest('Application is not approved. Cannot check in.')
    }
    if (entry.checked_in_at) {
      return conflict(`Already checked in at ${new Date(entry.checked_in_at).toLocaleTimeString()}.`, 'ALREADY_CHECKED_IN')
    }

    const { error } = await db
      .from('individual_entries')
      .update({ checked_in_at: now, checked_in_by: auth.userId })
      .eq('id', entry.id)

    if (error) return serverError()
    return ok({ checked_in_at: now })
  }

  // type === 'student'
  const { data: studentApp } = await db
    .from('student_applications')
    .select('id, checked_in_at, status, tournament:tournaments(id, owner_id)')
    .eq('check_in_token', token)
    .single()

  if (!studentApp) return notFound('Student application')

  // SEC-5: verify the tournament belongs to this Head Master
  const tournamentOwnerId = studentApp.tournament?.owner_id
  if (tournamentOwnerId !== auth.userId) return forbidden('This entry belongs to a different tournament.')

  if (studentApp.status !== 'APPROVED') {
    return badRequest('Application is not approved. Cannot check in.')
  }
  if (studentApp.checked_in_at) {
    return conflict(`Already checked in at ${new Date(studentApp.checked_in_at).toLocaleTimeString()}.`, 'ALREADY_CHECKED_IN')
  }

  const { error } = await db
    .from('student_applications')
    .update({ checked_in_at: now, checked_in_by: auth.userId })
    .eq('id', studentApp.id)

  if (error) return serverError()
  return ok({ checked_in_at: now })
}
