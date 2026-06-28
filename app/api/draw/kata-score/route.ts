import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Records scores for a Kata bracket match.
//
// Rules:
//  - Referee role only
//  - Bracket must be LOCKED or IN_PROGRESS
//  - Match must be PENDING (not BYE_WIN, not COMPLETE)
//  - Both participant slots must be filled with real athletes
//  - score_p1 and score_p2 must be non-negative numbers
//  - Scores must not be equal (tie not allowed)
//  - Winner = participant with higher score
//  - Winner is advanced to next_match_id (same as kumite result recording)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Auth — referee only
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'referee')
    return NextResponse.json({ error: 'Forbidden — referee role required' }, { status: 403 })

  // Input
  const body = await req.json().catch(() => ({}))
  const { match_id, score_p1, score_p2 } = body as {
    match_id?: string
    score_p1?: number
    score_p2?: number
  }

  if (!match_id)
    return NextResponse.json({ error: 'match_id is required' }, { status: 400 })
  if (typeof score_p1 !== 'number' || typeof score_p2 !== 'number' || isNaN(score_p1) || isNaN(score_p2))
    return NextResponse.json({ error: 'score_p1 and score_p2 must be numbers' }, { status: 400 })
  if (score_p1 < 0 || score_p2 < 0)
    return NextResponse.json({ error: 'Scores must be non-negative' }, { status: 400 })
  if (score_p1 === score_p2)
    return NextResponse.json({ error: 'Scores are equal — a winner cannot be determined from a tie' }, { status: 400 })

  // Load match
  const { data: matchRow } = await db
    .from('bracket_matches')
    .select('id, bracket_id, round_number, position, status, participant1_id, participant2_id, next_match_id, next_match_slot')
    .eq('id', match_id)
    .single()

  if (!matchRow)
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (matchRow.status === 'BYE_WIN')
    return NextResponse.json({ error: 'BYE matches cannot have scores recorded' }, { status: 409 })
  if (matchRow.status === 'COMPLETE')
    return NextResponse.json({ error: 'Match is already complete' }, { status: 409 })
  if (matchRow.status !== 'PENDING')
    return NextResponse.json({ error: `Match status "${matchRow.status}" is not valid for score recording` }, { status: 409 })
  if (!matchRow.participant1_id || !matchRow.participant2_id)
    return NextResponse.json({ error: 'Both participant slots must be filled before recording scores' }, { status: 409 })

  // Confirm both participants are real athletes (not byes)
  const { data: parts } = await db
    .from('draw_participants')
    .select('id, is_bye')
    .in('id', [matchRow.participant1_id, matchRow.participant2_id])

  const p1Row = (parts ?? []).find((p: { id: string; is_bye: boolean }) => p.id === matchRow.participant1_id)
  const p2Row = (parts ?? []).find((p: { id: string; is_bye: boolean }) => p.id === matchRow.participant2_id)

  if (p1Row?.is_bye || p2Row?.is_bye)
    return NextResponse.json({ error: 'Cannot record scores for a BYE participant' }, { status: 409 })

  // Load bracket — must be LOCKED or IN_PROGRESS
  const { data: bracketRow } = await db
    .from('draw_brackets')
    .select('id, status, event')
    .eq('id', matchRow.bracket_id)
    .single()

  if (!bracketRow)
    return NextResponse.json({ error: 'Bracket not found' }, { status: 404 })
  if (bracketRow.event !== 'KATA')
    return NextResponse.json({ error: 'This endpoint is for KATA brackets only' }, { status: 409 })
  if (bracketRow.status !== 'LOCKED' && bracketRow.status !== 'IN_PROGRESS')
    return NextResponse.json({ error: 'Bracket must be LOCKED or IN_PROGRESS to record scores' }, { status: 409 })

  // Determine winner — higher score wins
  const winner_id: string = score_p1 > score_p2 ? matchRow.participant1_id : matchRow.participant2_id

  // ── 1. Mark this match COMPLETE with scores ───────────────────────────────
  await db.from('bracket_matches')
    .update({
      status: 'COMPLETE',
      winner_id,
      score_p1,
      score_p2,
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
  const isFinal = matchRow.round_number === 1
  const newBracketStatus = isFinal ? 'COMPLETE' : 'IN_PROGRESS'

  if (bracketRow.status !== newBracketStatus) {
    await db.from('draw_brackets')
      .update({
        status: newBracketStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchRow.bracket_id)
  }

  return NextResponse.json({
    success: true,
    match_id,
    winner_id,
    score_p1,
    score_p2,
    bracket_status: newBracketStatus,
    next_match_id: nextMatchId ?? null,
    is_final: isFinal,
  })
}
