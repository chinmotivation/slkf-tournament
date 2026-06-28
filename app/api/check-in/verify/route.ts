import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, badRequest, notFound, serverError } from '@/lib/api-response'

export interface CheckInResult {
  type: 'individual' | 'student'
  entry_id: string
  token: string
  full_name: string
  age_category_code: string
  gender: string
  events: string
  association_name: string | null
  student_number: string | null
  tournament_id: string
  tournament_name: string
  application_status: string
  checked_in_at: string | null
  is_eligible: boolean
  ineligible_reason: string | null
}

// GET /api/check-in/verify?token=<uuid>
export async function GET(request: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const token = request.nextUrl.searchParams.get('token')?.trim()
  if (!token) return badRequest('token is required.')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  // ── 1. Try individual_entries ────────────────────────────────────────────────
  const { data: entry } = await db
    .from('individual_entries')
    .select(`
      id, full_name, age_category_code, gender, event, association_id,
      deleted_at, check_in_token, checked_in_at,
      application:applications(status),
      tournament:tournaments(id, name)
    `)
    .eq('check_in_token', token)
    .single()

  if (entry) {
    if (entry.deleted_at) {
      return ok<CheckInResult>({
        type: 'individual',
        entry_id: entry.id,
        token,
        full_name: entry.full_name,
        age_category_code: entry.age_category_code,
        gender: entry.gender,
        events: entry.event,
        association_name: null,
        student_number: null,
        tournament_id: entry.tournament?.id ?? '',
        tournament_name: entry.tournament?.name ?? '',
        application_status: entry.application?.status ?? '',
        checked_in_at: entry.checked_in_at,
        is_eligible: false,
        ineligible_reason: 'This entry has been removed.',
      })
    }

    // Fetch association name
    const { data: assoc } = await db
      .from('associations')
      .select('association_name')
      .eq('id', entry.association_id)
      .single()

    const appStatus: string = entry.application?.status ?? ''
    const isApproved = appStatus === 'APPROVED'
    const alreadyIn = !!entry.checked_in_at

    let ineligible: string | null = null
    if (!isApproved) ineligible = `Application is ${appStatus.toLowerCase()}, not approved.`
    else if (alreadyIn) ineligible = `Already checked in at ${new Date(entry.checked_in_at).toLocaleTimeString()}.`

    return ok<CheckInResult>({
      type: 'individual',
      entry_id: entry.id,
      token,
      full_name: entry.full_name,
      age_category_code: entry.age_category_code,
      gender: entry.gender,
      events: entry.event,
      association_name: assoc?.association_name ?? null,
      student_number: null,
      tournament_id: entry.tournament?.id ?? '',
      tournament_name: entry.tournament?.name ?? '',
      application_status: appStatus,
      checked_in_at: entry.checked_in_at,
      is_eligible: isApproved && !alreadyIn,
      ineligible_reason: ineligible,
    })
  }

  // ── 2. Try student_applications ──────────────────────────────────────────────
  const { data: studentApp } = await db
    .from('student_applications')
    .select(`
      id, full_name, age_category_code, gender, kata_entry, kumite_entry,
      student_number, status, check_in_token, checked_in_at,
      tournament:tournaments(id, name)
    `)
    .eq('check_in_token', token)
    .single()

  if (studentApp) {
    const events = [
      studentApp.kata_entry && 'KATA',
      studentApp.kumite_entry && 'KUMITE',
    ].filter(Boolean).join(' + ')

    const alreadyIn = !!studentApp.checked_in_at
    const isApproved = studentApp.status === 'APPROVED'

    let ineligible: string | null = null
    if (!isApproved) ineligible = `Application is ${studentApp.status.toLowerCase()}, not approved.`
    else if (alreadyIn) ineligible = `Already checked in at ${new Date(studentApp.checked_in_at).toLocaleTimeString()}.`

    return ok<CheckInResult>({
      type: 'student',
      entry_id: studentApp.id,
      token,
      full_name: studentApp.full_name,
      age_category_code: studentApp.age_category_code,
      gender: studentApp.gender,
      events,
      association_name: null,
      student_number: studentApp.student_number,
      tournament_id: studentApp.tournament?.id ?? '',
      tournament_name: studentApp.tournament?.name ?? '',
      application_status: studentApp.status,
      checked_in_at: studentApp.checked_in_at,
      is_eligible: isApproved && !alreadyIn,
      ineligible_reason: ineligible,
    })
  }

  return notFound('Check-in entry')
}
