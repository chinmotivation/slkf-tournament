import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Assigns sequential match_number values to all matches in a bracket,
// then transitions status PREVIEW → LOCKED.
//
// Match numbering order: first round (highest round_number) position 1, 2, 3…
// then each subsequent round, so officials can call "Match 1", "Match 2" etc.

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'head_master')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Input
  const body = await req.json().catch(() => ({}))
  const { bracket_id } = body as { bracket_id?: string }
  if (!bracket_id) return NextResponse.json({ error: 'bracket_id required' }, { status: 400 })

  // Load bracket
  const { data: bracketRow } = await db
    .from('draw_brackets').select('id, status, generated_at').eq('id', bracket_id).single()
  if (!bracketRow)
    return NextResponse.json({ error: 'Bracket not found' }, { status: 404 })
  if (bracketRow.status !== 'PREVIEW')
    return NextResponse.json({ error: 'Only PREVIEW brackets can be locked' }, { status: 409 })
  if (!bracketRow.generated_at)
    return NextResponse.json({ error: 'Generate the draw before locking' }, { status: 409 })

  // Load all matches ordered for sequential numbering:
  // first round first (desc round_number), then by position within each round
  const { data: matchesData } = await db
    .from('bracket_matches')
    .select('id, round_number, position, status')
    .eq('bracket_id', bracket_id)
    .order('round_number', { ascending: false })
    .order('position', { ascending: true })

  const matches = (matchesData ?? []) as Array<{
    id: string; round_number: number; position: number; status: string
  }>

  if (matches.length === 0)
    return NextResponse.json({ error: 'No matches found — generate the draw first' }, { status: 409 })

  // Assign match numbers (skip BYE_WIN matches — they have no live contest)
  let matchNumber = 1
  for (const m of matches) {
    if (m.status === 'BYE_WIN') continue
    await db.from('bracket_matches')
      .update({ match_number: matchNumber++ })
      .eq('id', m.id)
  }

  // Freeze the bracket
  await db.from('draw_brackets')
    .update({
      status: 'LOCKED',
      locked_at: new Date().toISOString(),
      locked_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bracket_id)

  return NextResponse.json({
    success: true,
    bracket_id,
    matches_numbered: matchNumber - 1,
    locked_at: new Date().toISOString(),
  })
}
