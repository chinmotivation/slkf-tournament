import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { z } from 'zod'
import { zodUuid } from '@/lib/validations/uuid'

// Records the winner of a bracket match and advances them to the next round.

const schema = z.object({
  match_id:  zodUuid('match_id must be a valid UUID'),
  winner_id: zodUuid('winner_id must be a valid UUID'),
})

export async function POST(req: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
  }
  const { match_id, winner_id } = parsed.data

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // RLS (migration 030) scopes to HM's own tournament's matches.
  const { data: matchRow } = await db
    .from('bracket_matches')
    .select('id, bracket_id, round_number, position, status, participant1_id, participant2_id, next_match_id, next_match_slot, winner_id')
    .eq('id', match_id)
    .single()

  if (!matchRow)
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  if (matchRow.status === 'BYE_WIN')
    return NextResponse.json({ error: 'BYE matches cannot have a result recorded' }, { status: 409 })
  if (matchRow.status !== 'PENDING' && matchRow.status !== 'IN_PROGRESS' && matchRow.status !== 'COMPLETE')
    return NextResponse.json({ error: `Match status "${matchRow.status}" is not valid for result recording` }, { status: 409 })

  if (winner_id !== matchRow.participant1_id && winner_id !== matchRow.participant2_id)
    return NextResponse.json({ error: 'winner_id is not a participant in this match' }, { status: 400 })

  if (!matchRow.participant1_id || !matchRow.participant2_id)
    return NextResponse.json({ error: 'Both participant slots must be filled before recording a result' }, { status: 409 })

  const { data: bracketRow } = await db
    .from('draw_brackets')
    .select('id, status')
    .eq('id', matchRow.bracket_id)
    .single()

  if (!bracketRow)
    return NextResponse.json({ error: 'Bracket not found' }, { status: 404 })
  if (bracketRow.status !== 'LOCKED' && bracketRow.status !== 'IN_PROGRESS')
    return NextResponse.json({ error: 'Bracket must be LOCKED or IN_PROGRESS to record results' }, { status: 409 })

  const isCorrection = matchRow.status === 'COMPLETE'

  if (isCorrection) {
    const oldWinnerId: string = matchRow.winner_id

    if (oldWinnerId === winner_id)
      return NextResponse.json({ error: 'That player is already recorded as the winner' }, { status: 400 })

    if (matchRow.next_match_id) {
      const { data: nextMatch } = await db
        .from('bracket_matches').select('id, status')
        .eq('id', matchRow.next_match_id).single()
      if (nextMatch?.status === 'COMPLETE')
        return NextResponse.json({ error: 'Cannot correct — the next match has already been completed' }, { status: 409 })
    }

    await db.from('bracket_matches')
      .update({ winner_id, updated_at: new Date().toISOString() })
      .eq('id', match_id)

    if (matchRow.next_match_id && matchRow.next_match_slot) {
      const field = matchRow.next_match_slot === 1 ? 'participant1_id' : 'participant2_id'
      await db.from('bracket_matches')
        .update({ [field]: winner_id, updated_at: new Date().toISOString() })
        .eq('id', matchRow.next_match_id)
        .eq(field, oldWinnerId)
    }

    return NextResponse.json({
      success: true,
      corrected: true,
      match_id,
      winner_id,
      bracket_status: bracketRow.status,
      next_match_id: matchRow.next_match_id ?? null,
      is_final: matchRow.round_number === 1,
    })
  }

  await db.from('bracket_matches')
    .update({
      status: 'COMPLETE',
      winner_id,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', match_id)

  const nextMatchId: string | null = matchRow.next_match_id
  const nextSlot: 1 | 2 | null = matchRow.next_match_slot

  if (nextMatchId && nextSlot) {
    const field = nextSlot === 1 ? 'participant1_id' : 'participant2_id'
    await db.from('bracket_matches')
      .update({ [field]: winner_id, updated_at: new Date().toISOString() })
      .eq('id', nextMatchId)
  }

  const isFinal = matchRow.round_number === 1
  const newBracketStatus = isFinal ? 'COMPLETE' : 'IN_PROGRESS'

  if (bracketRow.status !== newBracketStatus) {
    await db.from('draw_brackets')
      .update({
        status: newBracketStatus,
        updated_at: new Date().toISOString(),
        ...(isFinal ? { locked_at: new Date().toISOString() } : {}),
      })
      .eq('id', matchRow.bracket_id)
  }

  return NextResponse.json({
    success: true,
    corrected: false,
    match_id,
    winner_id,
    bracket_status: newBracketStatus,
    next_match_id: nextMatchId ?? null,
    is_final: isFinal,
  })
}
