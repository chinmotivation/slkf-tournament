import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, created, serverError, badRequest, conflict, notFound, unauthorized } from '@/lib/api-response'
import { z } from 'zod'

const proposeSchema = z.object({
  tournament_id:     z.string().min(1),
  team_name:         z.string().min(1, 'Team name is required').max(80),
  teammate1_number:  z.string().min(1, 'Teammate 1 student ID is required'),
  teammate2_number:  z.string().min(1, 'Teammate 2 student ID is required'),
})

// GET - load existing team proposals for the current student in a tournament
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const db = supabase as any
  const { searchParams } = new URL(request.url)
  const tournamentId = searchParams.get('tournament_id')
  if (!tournamentId) return badRequest('tournament_id is required')

  // Get student's application IDs for this tournament
  const { data: apps } = await db
    .from('student_applications')
    .select('id')
    .eq('user_id', user.id)
    .eq('tournament_id', tournamentId)

  if (!apps || apps.length === 0) return ok([])

  const appIds = apps.map((a: any) => a.id)
  const orClause = appIds.map((id: string) =>
    `member1_app_id.eq.${id},member2_app_id.eq.${id},member3_app_id.eq.${id}`
  ).join(',')

  const { data, error } = await db
    .from('student_team_kata_groups')
    .select('*')
    .or(orClause)

  if (error) return serverError()
  return ok(data ?? [])
}

// POST - student proposes a team
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  let body: unknown
  try { body = await request.json() } catch { return badRequest('Invalid JSON') }

  const parsed = proposeSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { tournament_id, team_name, teammate1_number, teammate2_number } = parsed.data

  const db    = supabase as any
  const admin = createAdminClient() as any

  // Find the proposer's own application for this tournament
  const { data: myApps } = await db
    .from('student_applications')
    .select('id, status, team_kata_entry, full_name')
    .eq('user_id', user.id)
    .eq('tournament_id', tournament_id)

  if (!myApps || myApps.length === 0) return badRequest('You do not have an application for this tournament.')
  const myApp = myApps[0]
  if (myApp.status !== 'APPROVED') return badRequest('Your application must be approved before proposing a team.')
  if (!myApp.team_kata_entry) return badRequest('You did not register for Team Kata.')

  // Look up the two teammates by student number in this tournament
  const t1Upper = teammate1_number.trim().toUpperCase()
  const t2Upper = teammate2_number.trim().toUpperCase()

  if (t1Upper === t2Upper) return badRequest('Teammate 1 and Teammate 2 cannot be the same student.')

  const { data: teammates, error: tmError } = await admin
    .from('student_applications')
    .select('id, status, student_number, full_name, team_kata_entry, tournament_id')
    .eq('tournament_id', tournament_id)
    .in('student_number', [t1Upper, t2Upper])

  if (tmError) return serverError()
  if (!teammates || teammates.length < 2) {
    const missing = [t1Upper, t2Upper].filter(
      (n: string) => !(teammates ?? []).some((t: any) => t.student_number === n)
    )
    // Secondary check: are they in a different tournament entirely?
    const { data: elsewhere } = await admin
      .from('student_applications')
      .select('student_number, tournament_id')
      .in('student_number', missing)
    const elsewherNums = (elsewhere ?? []).map((r: any) => r.student_number)
    const wrongTournament = missing.filter((n: string) => elsewherNums.includes(n))
    const notExist       = missing.filter((n: string) => !elsewherNums.includes(n))
    const parts: string[] = []
    if (wrongTournament.length) parts.push(`${wrongTournament.join(', ')} registered for a different tournament`)
    if (notExist.length)        parts.push(`${notExist.join(', ')} not found in the system`)
    return notFound(parts.join('; '))
  }

  const tm1 = teammates.find((t: any) => t.student_number === t1Upper)
  const tm2 = teammates.find((t: any) => t.student_number === t2Upper)

  for (const tm of [tm1, tm2]) {
    if (!tm) continue
    if (tm.status !== 'APPROVED') return badRequest(`${tm.full_name} is not yet approved.`)
    if (!tm.team_kata_entry) return badRequest(`${tm.full_name} did not register for Team Kata.`)
  }

  const myAppId = myApp.id
  const tm1AppId = tm1!.id
  const tm2AppId = tm2!.id

  if (myAppId === tm1AppId || myAppId === tm2AppId || tm1AppId === tm2AppId) {
    return badRequest('All 3 team members must be different students.')
  }

  const allIds = [myAppId, tm1AppId, tm2AppId]

  // Check none are already in a confirmed or pending team
  const orClause = allIds.map((id: string) =>
    `member1_app_id.eq.${id},member2_app_id.eq.${id},member3_app_id.eq.${id}`
  ).join(',')

  const { data: existing } = await db
    .from('student_team_kata_groups')
    .select('id, team_name, status, member1_app_id, member2_app_id, member3_app_id')
    .eq('tournament_id', tournament_id)
    .or(orClause)
    .in('status', ['PENDING', 'CONFIRMED'])

  if (existing && existing.length > 0) {
    for (const g of existing) {
      const taken = [g.member1_app_id, g.member2_app_id, g.member3_app_id]
      const overlapId = allIds.find((id: string) => taken.includes(id))
      if (overlapId) {
        const who = overlapId === myAppId ? 'You' : overlapId === tm1AppId ? tm1!.full_name : tm2!.full_name
        const statusLabel = g.status === 'CONFIRMED' ? 'confirmed' : 'pending'
        return conflict(`${who} already ${g.status === 'CONFIRMED' ? 'is in' : 'has a pending proposal for'} team "${g.team_name}" (${statusLabel}).`)
      }
    }
  }

  const { data: newGroup, error: insertError } = await db
    .from('student_team_kata_groups')
    .insert({
      tournament_id,
      team_name: team_name.trim(),
      proposed_by: user.id,
      member1_app_id: myAppId,
      member2_app_id: tm1AppId,
      member3_app_id: tm2AppId,
      status: 'PENDING',
    })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') return conflict('A team with this name already exists for this tournament.')
    return serverError()
  }

  return created(newGroup)
}

// DELETE - student cancels their own pending proposal
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('id')
  if (!groupId) return badRequest('id is required')

  const db = supabase as any

  // Only allow deleting PENDING proposals proposed by this student
  const { data: group } = await db
    .from('student_team_kata_groups')
    .select('id, status, proposed_by')
    .eq('id', groupId)
    .single()

  if (!group) return notFound('Team proposal')
  if (group.proposed_by !== user.id) return badRequest('You can only cancel your own proposals.')
  if (group.status === 'CONFIRMED') return badRequest('Cannot cancel a confirmed team. Ask your Head Master.')

  const { error } = await db
    .from('student_team_kata_groups')
    .delete()
    .eq('id', groupId)
    .eq('proposed_by', user.id)
    .in('status', ['PENDING', 'REJECTED'])

  if (error) return serverError()
  return ok({ deleted: true })
}
