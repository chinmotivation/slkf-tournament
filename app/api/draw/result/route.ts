import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Records the winner of a bracket match and advances them to the next round.
//
// Rules:
//  - Bracket must be LOCKED or IN_PROGRESS
//  - Match must be PENDING (not BYE_WIN, not COMPLETE)
//  - winner_id must be participant1_id or participant2_id of the match
//  - If this is the Final (round_number=1): bracket → COMPLETE
//  - Otherwise: bracket → IN_PROGRESS (if still LOCKED)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Auth — head_master only
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'head_master')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Input
  const body = await req.json().catch(() => ({}))
  const { match_id, winner_id } = body as { match_id?: string; winner_id?: string }
  if (!match_id || !winner_id)
    return NextResponse.json({ error: 'match_id and winner_id are required' }, { status: 400 })

  // Load match
  const { data: matchRow } = await db
    .from('bracket_matches')
    .select('id, bracket_id, round_number, position, status, participant1_id, participant2_id, next_match_id, next_match_slot')
    .eq('id', match_id)
    .single()

  if (!matchRow)
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  if (matchRow.status === 'BYE_WIN')
    return NextResponse.json({ error: 'BYE matches cannot have a result recorded' }, { status: 409 })
  if (matchRow.status === 'COMPLETE')
    return NextResponse.json({ error: 'Match is already complete' }, { status: 409 })
  if (matchRow.status !== 'PENDING' && matchRow.status !== 'IN_PROGRESS')
    return NextResponse.json({ error: `Match status "${matchRow.status}" is not valid for result recording` }, { status: 409 })

  // Validate winner is one of the two participants
  if (winner_id !== matchRow.participant1_id && winner_id !== matchRow.participant2_id)
    return NextResponse.json({ error: 'winner_id is not a participant in this match' }, { status: 400 })

  if (!matchRow.participant1_id || !matchRow.participant2_id)
    return NextResponse.json({ error: 'Both participant slots must be filled before recording a result' }, { status: 409 })

  // Load bracket to check status
  const { data: bracketRow } = await db
    .from('draw_brackets')
    .select('id, status')
    .eq('id', matchRow.bracket_id)
    .single()

  if (!bracketRow)
    return NextResponse.json({ error: 'Bracket not found' }, { status: 404 })
  if (bracketRow.status !== 'LOCKED' && bracketRow.status !== 'IN_PROGRESS')
    return NextResponse.json({ error: 'Bracket must be LOCKED or IN_PROGRESS to record results' }, { status: 409 })

  // ── 1. Mark this match COMPLETE ───────────────────────────────────────────
  await db.from('bracket_matches')
    .update({
      status: 'COMPLETE',
      winner_id,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', match_id)

  // ── 2. Advance winner to next match ──────────────────────────────────────
  const nextMatchId: string | null = matchRow.next_match_id
  const nextSlot: 1 | 2 | null = matchRow.next_match_slot

  if (nextMatchId && nextSlot) {
    const field = nextSlot === 1 ? 'participant1_id' : 'participant2_id'
    await db.from('bracket_matches')
      .update({ [field]: winner_id, updated_at: new Date().toISOString() })
      .eq('id', nextMatchId)
  }

  // ── 3. Update bracket status ──────────────────────────────────────────────
  // Final = round_number 1. If it's complete, the bracket is done.
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
    match_id,
    winner_id,
    bracket_status: newBracketStatus,
    next_match_id: nextMatchId ?? null,
    is_final: isFinal,
  })
}
