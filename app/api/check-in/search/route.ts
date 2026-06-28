import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, badRequest, serverError } from '@/lib/api-response'
import type { CheckInResult } from '@/app/api/check-in/verify/route'

// GET /api/check-in/search?tournament_id=<uuid>&q=<name>
export async function GET(request: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const { searchParams } = request.nextUrl
  const tournamentId = searchParams.get('tournament_id')?.trim()
  const q = searchParams.get('q')?.trim()

  if (!tournamentId) return badRequest('tournament_id is required.')
  if (!q || q.length < 2) return badRequest('Search query must be at least 2 characters.')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  const [indivResult, studentResult] = await Promise.all([
    db
      .from('individual_entries')
      .select(`
        id, full_name, age_category_code, gender, event,
        association_id, check_in_token, checked_in_at, deleted_at,
        application:applications(status)
      `)
      .eq('tournament_id', tournamentId)
      .is('deleted_at', null)
      .ilike('full_name', `%${q}%`)
      .limit(20),

    db
      .from('student_applications')
      .select(`
        id, full_name, age_category_code, gender, kata_entry, kumite_entry,
        student_number, status, check_in_token, checked_in_at
      `)
      .eq('tournament_id', tournamentId)
      .ilike('full_name', `%${q}%`)
      .limit(10),
  ])

  if (indivResult.error || studentResult.error) return serverError()

  // Fetch association names for individual entries
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

  const results: CheckInResult[] = []

  for (const e of indivResult.data ?? []) {
    const appStatus: string = e.application?.status ?? ''
    const alreadyIn = !!e.checked_in_at
    const isApproved = appStatus === 'APPROVED'
    results.push({
      type: 'individual',
      entry_id: e.id,
      token: e.check_in_token,
      full_name: e.full_name,
      age_category_code: e.age_category_code,
      gender: e.gender,
      events: e.event,
      association_name: assocMap[e.association_id] ?? null,
      student_number: null,
      tournament_id: tournamentId,
      tournament_name: '',
      application_status: appStatus,
      checked_in_at: e.checked_in_at,
      is_eligible: isApproved && !alreadyIn,
      ineligible_reason: !isApproved
        ? `Application ${appStatus.toLowerCase()}`
        : alreadyIn ? 'Already checked in' : null,
    })
  }

  for (const s of studentResult.data ?? []) {
    const events = [s.kata_entry && 'KATA', s.kumite_entry && 'KUMITE'].filter(Boolean).join(' + ')
    const alreadyIn = !!s.checked_in_at
    const isApproved = s.status === 'APPROVED'
    results.push({
      type: 'student',
      entry_id: s.id,
      token: s.check_in_token,
      full_name: s.full_name,
      age_category_code: s.age_category_code,
      gender: s.gender,
      events,
      association_name: null,
      student_number: s.student_number,
      tournament_id: tournamentId,
      tournament_name: '',
      application_status: s.status,
      checked_in_at: s.checked_in_at,
      is_eligible: isApproved && !alreadyIn,
      ineligible_reason: !isApproved
        ? `Application ${s.status.toLowerCase()}`
        : alreadyIn ? 'Already checked in' : null,
    })
  }

  return ok(results)
}
