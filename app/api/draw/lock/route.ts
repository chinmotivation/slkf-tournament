import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { z } from 'zod'
import { zodUuid } from '@/lib/validations/uuid'

// Assigns sequential match_number values to all matches in a bracket,
// then transitions status PREVIEW → LOCKED.

const schema = z.object({
  bracket_id: zodUuid('bracket_id must be a valid UUID'),
})

export async function POST(req: NextRequest) {
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
  }
  const { bracket_id } = parsed.data

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // RLS (migration 030) ensures HM can only access their own brackets.
  const { data: bracketRow } = await db
    .from('draw_brackets').select('id, status, generated_at').eq('id', bracket_id).single()
  if (!bracketRow)
    return NextResponse.json({ error: 'Bracket not found' }, { status: 404 })
  if (bracketRow.status !== 'PREVIEW')
    return NextResponse.json({ error: 'Only PREVIEW brackets can be locked' }, { status: 409 })
  if (!bracketRow.generated_at)
    return NextResponse.json({ error: 'Generate the draw before locking' }, { status: 409 })

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

  // Assign match numbers in parallel (each updates a different row)
  let matchNumber = 1
  const numberingUpdates: Promise<unknown>[] = []
  for (const m of matches) {
    if (m.status === 'BYE_WIN') continue
    const num = matchNumber++
    numberingUpdates.push(
      db.from('bracket_matches').update({ match_number: num }).eq('id', m.id)
    )
  }
  await Promise.all(numberingUpdates)

  const lockedAt = new Date().toISOString()
  await db.from('draw_brackets')
    .update({
      status: 'LOCKED',
      locked_at: lockedAt,
      locked_by: auth.userId,
      updated_at: lockedAt,
    })
    .eq('id', bracket_id)

  return NextResponse.json({
    success: true,
    bracket_id,
    matches_numbered: matchNumber - 1,
    locked_at: lockedAt,
  })
}
