import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { z } from 'zod'
import { zodUuid } from '@/lib/validations/uuid'

// Resets a bracket back to PREVIEW so it can be regenerated.
// Deletes all bracket_matches and bye draw_participants for this bracket.

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

  // RLS (migration 030) scopes to HM's own brackets.
  const { data: bracketRow } = await db
    .from('draw_brackets').select('id, status').eq('id', bracket_id).single()
  if (!bracketRow) return NextResponse.json({ error: 'Bracket not found' }, { status: 404 })

  if (bracketRow.status === 'PREVIEW')
    return NextResponse.json({ error: 'Bracket is already in PREVIEW — use Generate Draw' }, { status: 409 })

  await db.from('bracket_matches').delete().eq('bracket_id', bracket_id)
  await db.from('draw_participants').delete()
    .eq('bracket_id', bracket_id).eq('is_bye', true)

  await db.from('draw_brackets').update({
    status: 'PREVIEW',
    generated_at: null,
    updated_at: new Date().toISOString(),
    updated_by: auth.userId,
  }).eq('id', bracket_id)

  return NextResponse.json({ success: true, bracket_id })
}
