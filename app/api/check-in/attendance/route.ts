import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, badRequest, serverError } from '@/lib/api-response'

export interface AttendanceEntry {
  entry_id: string
  type: 'individual' | 'student'
  full_name: string
  age_category_code: string
  gender: string
  events: string
  association_name: string | null
  student_number: string | null
  application_status: string
  checked_in_at: string | null
}

// GET /api/check-in/attendance?tournament_id=<uuid>
export async function GET(request: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const tournamentId = request.nextUrl.searchParams.get('tournament_id')?.trim()
  if (!tournamentId) return badRequest('tournament_id is required.')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  const [indivResult, studentResult] = await Promise.all([
    db
      .from('individual_entries')
      .select(`
        id, full_name, age_category_code, gender, event,
        association_id, checked_in_at, deleted_at,
        application:applications(status)
      `)
      .eq('tournament_id', tournamentId)
      .is('deleted_at', null)
      .order('full_name'),

    db
      .from('student_applications')
      .select(`
        id, full_name, age_category_code, gender, kata_entry, kumite_entry,
        student_number, status, checked_in_at
      `)
      .eq('tournament_id', tournamentId)
      .order('full_name'),
  ])

  if (indivResult.error || studentResult.error) return serverError()

  // Batch-fetch association names
  const assocIds: string[] = [...new Set(
    ((indivResult.data ?? []) as { association_id: string }[]).map(e => e.association_id)
  )]
  const assocMap: Record<string, string> = {}
  if (assocIds.length > 0) {
    const { data: assocs } = await db
      .from('associations')
      .select('id, association_name')
      .in('id', assocIds)
    for (const a of assocs ?? []) assocMap[a.id] = a.association_name
  }

  const entries: AttendanceEntry[] = []

  for (const e of indivResult.data ?? []) {
    entries.push({
      entry_id: e.id,
      type: 'individual',
      full_name: e.full_name,
      age_category_code: e.age_category_code,
      gender: e.gender,
      events: e.event,
      association_name: assocMap[e.association_id] ?? null,
      student_number: null,
      application_status: e.application?.status ?? '',
      checked_in_at: e.checked_in_at,
    })
  }

  for (const s of studentResult.data ?? []) {
    const events = [s.kata_entry && 'KATA', s.kumite_entry && 'KUMITE'].filter(Boolean).join(' + ')
    entries.push({
      entry_id: s.id,
      type: 'student',
      full_name: s.full_name,
      age_category_code: s.age_category_code,
      gender: s.gender,
      events,
      association_name: null,
      student_number: s.student_number,
      application_status: s.status,
      checked_in_at: s.checked_in_at,
    })
  }

  const total = entries.length
  const checkedIn = entries.filter(e => !!e.checked_in_at).length

  return ok({ entries, total, checked_in: checkedIn, pending: total - checkedIn })
}
