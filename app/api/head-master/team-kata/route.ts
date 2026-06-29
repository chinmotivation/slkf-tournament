import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { ok, created, serverError, badRequest, conflict, notFound } from '@/lib/api-response'
import { z } from 'zod'

const createSchema = z.object({
  tournament_id:   z.string().uuid(),
  team_name:       z.string().min(1, 'Team name is required').max(80),
  member1_app_id:  z.string().uuid(),
  member2_app_id:  z.string().uuid(),
  member3_app_id:  z.string().uuid(),
  status:          z.enum(['CONFIRMED', 'REJECTED']).optional().default('CONFIRMED'),
})

const patchSchema = z.object({
  id:     z.string().uuid(),
  status: z.enum(['CONFIRMED', 'REJECTED']),
})

export async function GET(request: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const { searchParams } = new URL(request.url)
  const tournamentId = searchParams.get('tournament_id')
  if (!tournamentId) return badRequest('tournament_id is required')

  const supabase = await createClient()
  const db = supabase as any

  const { data, error } = await db
    .from('student_team_kata_groups')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true })

  if (error) return serverError()
  return ok(data ?? [])
}

export async function POST(request: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  let body: unknown
  try { body = await request.json() } catch { return badRequest('Invalid JSON') }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const { tournament_id, team_name, member1_app_id, member2_app_id, member3_app_id, status: reqStatus } = parsed.data

  const ids = [member1_app_id, member2_app_id, member3_app_id]
  if (new Set(ids).size !== 3) return badRequest('All 3 members must be different students.')

  const supabase = await createClient()
  const db = supabase as any

  const { data: apps, error: appsError } = await db
    .from('student_applications')
    .select('id, status, tournament_id, full_name')
    .in('id', ids)

  if (appsError) return serverError()
  if (!apps || apps.length !== 3) return notFound('One or more student applications')

  for (const app of apps) {
    if (app.tournament_id !== tournament_id) return badRequest(`${app.full_name} is not in this tournament.`)
    if (app.status !== 'APPROVED') return badRequest(`${app.full_name} must be approved before forming a team.`)
  }

  // When confirming, check none of the 3 are already in a confirmed team
  if (reqStatus === 'CONFIRMED') {
    const { data: existing } = await db
      .from('student_team_kata_groups')
      .select('id, team_name, status, member1_app_id, member2_app_id, member3_app_id')
      .eq('tournament_id', tournament_id)
      .eq('status', 'CONFIRMED')

    if (existing && existing.length > 0) {
      for (const group of existing) {
        const taken = [group.member1_app_id, group.member2_app_id, group.member3_app_id]
        const overlap = ids.find(id => taken.includes(id))
        if (overlap) {
          const conflictApp = apps.find((a: any) => a.id === overlap)
          return conflict(`${conflictApp?.full_name ?? 'A student'} is already in confirmed team "${group.team_name}".`)
        }
      }
    }
  }

  const { data: newGroup, error: insertError } = await db
    .from('student_team_kata_groups')
    .insert({
      tournament_id,
      team_name: team_name.trim(),
      proposed_by: auth.userId,
      member1_app_id,
      member2_app_id,
      member3_app_id,
      status: reqStatus,
    })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') return conflict('A team with this name already exists for this tournament.')
    return serverError()
  }

  return created(newGroup)
}

export async function PATCH(request: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  let body: unknown
  try { body = await request.json() } catch { return badRequest('Invalid JSON') }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid input')

  const { id, status } = parsed.data

  const supabase = await createClient()
  const db = supabase as any

  // Verify this group belongs to one of HM's tournaments
  const { data: group, error: fetchError } = await db
    .from('student_team_kata_groups')
    .select('id, tournament_id, team_name, member1_app_id, member2_app_id, member3_app_id')
    .eq('id', id)
    .single()

  if (fetchError || !group) return notFound('Team group')

  const { data: tourney } = await db
    .from('tournaments')
    .select('id')
    .eq('id', group.tournament_id)
    .eq('owner_id', auth.userId)
    .single()

  if (!tourney) return badRequest('You do not own this tournament.')

  // If approving: check none of the 3 are already in another confirmed team
  if (status === 'CONFIRMED') {
    const ids = [group.member1_app_id, group.member2_app_id, group.member3_app_id]
    const { data: existing } = await db
      .from('student_team_kata_groups')
      .select('id, team_name, member1_app_id, member2_app_id, member3_app_id')
      .eq('tournament_id', group.tournament_id)
      .eq('status', 'CONFIRMED')
      .neq('id', id)

    if (existing && existing.length > 0) {
      for (const g of existing) {
        const taken = [g.member1_app_id, g.member2_app_id, g.member3_app_id]
        const overlap = ids.find(aid => taken.includes(aid))
        if (overlap) {
          return conflict(`A member is already in confirmed team "${g.team_name}". Reject that team first.`)
        }
      }
    }
  }

  const { error: updateError } = await db
    .from('student_team_kata_groups')
    .update({ status })
    .eq('id', id)

  if (updateError) return serverError()
  return ok({ id, status })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('id')
  if (!groupId) return badRequest('id is required')

  const supabase = await createClient()
  const db = supabase as any

  const { error } = await db
    .from('student_team_kata_groups')
    .delete()
    .eq('id', groupId)

  if (error) return serverError()
  return ok({ deleted: true })
}
