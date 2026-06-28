import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DrawParticipant } from '@/types/database'

// ─── Round label ──────────────────────────────────────────────────────────────

function roundLabel(roundNumber: number, totalRounds: number): string {
  if (roundNumber === 1) return 'Final'
  if (roundNumber === 2) return 'Semifinal'
  if (roundNumber === 3) return 'Quarterfinal'
  return `Round of ${Math.pow(2, roundNumber)}`
}

// ─── Seeding: Association Separation ─────────────────────────────────────────
// Distributes athletes so same-association athletes land in opposite bracket
// halves and can only meet in the Final.
//
// Returns an ordered array of length bracketSize where null = bye slot.

function seedWithAssociationSeparation(
  participants: DrawParticipant[],
  bracketSize: number
): Array<DrawParticipant | null> {
  // Group by association (students without an association_id get their own solo group)
  const groupMap = new Map<string, DrawParticipant[]>()
  for (const p of participants) {
    const key = p.association_id ?? `__s_${p.id}`
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(p)
  }

  // Shuffle within each group, then sort groups largest-first so big clubs get
  // separated before small ones.
  const groups = [...groupMap.values()]
    .map(g => g.sort(() => Math.random() - 0.5))
    .sort((a, b) => b.length - a.length)

  const halfSize = bracketSize / 2
  const topHalf: DrawParticipant[] = []
  const bottomHalf: DrawParticipant[] = []
  const topCount = new Map<string, number>()
  const botCount = new Map<string, number>()

  // Round-robin across groups so we interleave before distributing to halves
  const interleaved: DrawParticipant[] = []
  const maxLen = Math.max(...groups.map(g => g.length))
  for (let i = 0; i < maxLen; i++) {
    for (const g of groups) {
      if (i < g.length) interleaved.push(g[i])
    }
  }

  // Assign each athlete to the half that currently has fewer of their association
  for (const p of interleaved) {
    const key = p.association_id ?? `__s_${p.id}`
    const tc = topCount.get(key) ?? 0
    const bc = botCount.get(key) ?? 0

    let goTop: boolean
    if (topHalf.length >= halfSize)      goTop = false
    else if (bottomHalf.length >= halfSize) goTop = true
    else if (tc < bc)                    goTop = true
    else if (bc < tc)                    goTop = false
    else                                 goTop = topHalf.length <= bottomHalf.length

    if (goTop) { topHalf.push(p); topCount.set(key, tc + 1) }
    else       { bottomHalf.push(p); botCount.set(key, bc + 1) }
  }

  // Shuffle within each half for randomness within the constraint
  topHalf.sort(() => Math.random() - 0.5)
  bottomHalf.sort(() => Math.random() - 0.5)

  // Pad with nulls (byes) at the end of each half to reach bracketSize
  const result: Array<DrawParticipant | null> = [
    ...topHalf,
    ...Array<null>(halfSize - topHalf.length).fill(null),
    ...bottomHalf,
    ...Array<null>(halfSize - bottomHalf.length).fill(null),
  ]

  return result
}

function seedRandom(
  participants: DrawParticipant[],
  bracketSize: number
): Array<DrawParticipant | null> {
  const shuffled = [...participants].sort(() => Math.random() - 0.5)
  return [
    ...shuffled,
    ...Array<null>(bracketSize - shuffled.length).fill(null),
  ]
}

// ─── Route handler ────────────────────────────────────────────────────────────

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
    .from('draw_brackets').select('*').eq('id', bracket_id).single()
  if (!bracketRow)
    return NextResponse.json({ error: 'Bracket not found' }, { status: 404 })
  if (bracketRow.status !== 'PREVIEW')
    return NextResponse.json({ error: 'Only PREVIEW brackets can be (re)generated' }, { status: 409 })

  const bracketSize: number = bracketRow.bracket_size
  const totalRounds = Math.log2(bracketSize)
  const seedingMode: string = bracketRow.seeding_mode

  // Load real participants (no byes)
  const { data: participantsData } = await db
    .from('draw_participants')
    .select('*')
    .eq('bracket_id', bracket_id)
    .eq('is_bye', false)
    .eq('is_eligible', true)

  const participants = (participantsData ?? []) as DrawParticipant[]
  if (participants.length < 2)
    return NextResponse.json({ error: 'Need at least 2 athletes to generate a draw' }, { status: 400 })

  // ── Compute seeded slots (length = bracketSize) ───────────────────────────
  const slots =
    seedingMode === 'RANDOM'
      ? seedRandom(participants, bracketSize)
      : seedWithAssociationSeparation(participants, bracketSize)

  // Which seed positions are byes?
  const byeSeedPositions: number[] = []
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === null) byeSeedPositions.push(i + 1)
  }

  // ── Wipe previous generation ──────────────────────────────────────────────
  await db.from('bracket_matches').delete().eq('bracket_id', bracket_id)
  await db.from('draw_participants').delete()
    .eq('bracket_id', bracket_id).eq('is_bye', true)

  // ── Insert bye participants ───────────────────────────────────────────────
  const byeInserts = byeSeedPositions.map(seedPos => ({
    bracket_id,
    full_name: null,
    individual_entry_id: null,
    student_application_id: null,
    association_id: null,
    association_name: null,
    seed_position: seedPos,
    is_bye: true,
    is_eligible: true,
  }))

  const byeSeedToId = new Map<number, string>()
  if (byeInserts.length > 0) {
    const { data: insertedByes } = await db
      .from('draw_participants').insert(byeInserts).select('id, seed_position')
    for (const b of (insertedByes ?? [])) {
      byeSeedToId.set(b.seed_position as number, b.id as string)
    }
  }

  // ── Update seed_position on real participants ─────────────────────────────
  const seedToParticipantId = new Map<number, string>()
  for (let i = 0; i < slots.length; i++) {
    const p = slots[i]
    if (p !== null) {
      const seedPos = i + 1
      seedToParticipantId.set(seedPos, p.id)
      await db.from('draw_participants')
        .update({ seed_position: seedPos }).eq('id', p.id)
    }
  }

  // Combined map: seedPos → any participant id (real or bye)
  const seedToId = new Map<number, string>([
    ...seedToParticipantId,
    ...byeSeedToId,
  ])

  // ── Build bracket_matches (all rounds) ───────────────────────────────────
  // round_number: 1 = Final, totalRounds = first round of play
  // matches per round: 2^(r-1)   →  round 1: 1 match, round 2: 2, …

  type MatchInsert = {
    bracket_id: string
    round_number: number
    round_label: string
    position: number
    participant1_id: string | null
    participant2_id: string | null
    winner_id: string | null
    status: string
    next_match_id: null        // filled in second pass
    next_match_slot: null
  }

  const matchInserts: MatchInsert[] = []

  for (let r = 1; r <= totalRounds; r++) {
    const matchesInRound = Math.pow(2, r - 1)
    const label = roundLabel(r, totalRounds)
    const isFirstRound = r === totalRounds

    for (let pos = 1; pos <= matchesInRound; pos++) {
      let p1Id: string | null = null
      let p2Id: string | null = null
      let winnerId: string | null = null
      let status = 'PENDING'

      if (isFirstRound) {
        const seed1 = 2 * pos - 1
        const seed2 = 2 * pos
        p1Id = seedToId.get(seed1) ?? null
        p2Id = seedToId.get(seed2) ?? null

        const s1Bye = byeSeedToId.has(seed1)
        const s2Bye = byeSeedToId.has(seed2)

        if (s1Bye && !s2Bye && p2Id) {
          status = 'BYE_WIN'; winnerId = p2Id
        } else if (!s1Bye && s2Bye && p1Id) {
          status = 'BYE_WIN'; winnerId = p1Id
        }
      }

      matchInserts.push({
        bracket_id, round_number: r, round_label: label, position: pos,
        participant1_id: p1Id, participant2_id: p2Id,
        winner_id: winnerId, status,
        next_match_id: null, next_match_slot: null,
      })
    }
  }

  const { data: insertedMatches } = await db
    .from('bracket_matches').insert(matchInserts).select('id, round_number, position')

  // ── Build lookup: "round.position" → match id ────────────────────────────
  const matchKey = (r: number, p: number) => `${r}.${p}`
  const matchMap = new Map<string, string>()
  for (const m of (insertedMatches ?? [])) {
    matchMap.set(matchKey(m.round_number, m.position), m.id as string)
  }

  // ── Second pass: wire next_match_id ──────────────────────────────────────
  for (let r = 2; r <= totalRounds; r++) {
    const matchesInRound = Math.pow(2, r - 1)
    for (let pos = 1; pos <= matchesInRound; pos++) {
      const thisId   = matchMap.get(matchKey(r, pos))
      const nextPos  = Math.ceil(pos / 2)
      const nextId   = matchMap.get(matchKey(r - 1, nextPos))
      const nextSlot = pos % 2 === 1 ? 1 : 2

      if (thisId && nextId) {
        await db.from('bracket_matches')
          .update({ next_match_id: nextId, next_match_slot: nextSlot })
          .eq('id', thisId)
      }
    }
  }

  // ── Third pass: advance BYE_WIN winners into next round ──────────────────
  for (const m of (insertedMatches ?? [])) {
    const inserted = matchInserts.find(
      mi => mi.round_number === m.round_number && mi.position === m.position
    )
    if (inserted?.status !== 'BYE_WIN' || !inserted.winner_id) continue
    if (m.round_number <= 1) continue  // Final has no next match

    const nextPos  = Math.ceil(m.position / 2)
    const nextSlot = m.position % 2 === 1 ? 1 : 2
    const nextId   = matchMap.get(matchKey(m.round_number - 1, nextPos))
    if (!nextId) continue

    const field = nextSlot === 1 ? 'participant1_id' : 'participant2_id'
    await db.from('bracket_matches')
      .update({ [field]: inserted.winner_id })
      .eq('id', nextId)
  }

  // ── Mark bracket as generated ─────────────────────────────────────────────
  await db.from('draw_brackets')
    .update({ generated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', bracket_id)

  return NextResponse.json({
    success: true,
    bracket_id,
    participant_count: participants.length,
    bracket_size: bracketSize,
    bye_count: byeSeedPositions.length,
    total_rounds: totalRounds,
    total_matches: matchInserts.length,
  })
}
