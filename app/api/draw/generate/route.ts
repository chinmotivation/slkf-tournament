import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireHeadMaster, isNextResponse } from '@/lib/auth-guard'
import { z } from 'zod'
import { zodUuid } from '@/lib/validations/uuid'
import type { DrawParticipant } from '@/types/database'

// ─── Crypto-secure shuffle ────────────────────────────────────────────────────
// Math.random() is not appropriate for official competition draws.
// Fisher-Yates with crypto.getRandomValues() ensures unpredictability.

function cryptoShuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ─── Round label ──────────────────────────────────────────────────────────────

function roundLabel(roundNumber: number, totalRounds: number): string {
  if (roundNumber === 1) return 'Final'
  if (roundNumber === 2) return 'Semifinal'
  if (roundNumber === 3) return 'Quarterfinal'
  // For early rounds, label relative to actual bracket depth
  const participantsInRound = Math.pow(2, roundNumber)
  if (roundNumber === totalRounds) return `Round of ${participantsInRound}`
  return `Round of ${participantsInRound}`
}

// ─── Seeding: Association Separation ─────────────────────────────────────────
// Distributes athletes so same-association athletes land in opposite bracket
// halves and can only meet in the Final.

function spreadByes(players: DrawParticipant[], size: number): Array<DrawParticipant | null> {
  const result: Array<DrawParticipant | null> = new Array(size).fill(null)
  let pIdx = 0
  for (let i = 0; i < size && pIdx < players.length; i += 2) result[i] = players[pIdx++]
  for (let i = 1; i < size && pIdx < players.length; i += 2) result[i] = players[pIdx++]
  return result
}

function seedWithAssociationSeparation(
  participants: DrawParticipant[],
  bracketSize: number
): Array<DrawParticipant | null> {
  const groupMap = new Map<string, DrawParticipant[]>()
  for (const p of participants) {
    const key = p.association_id ?? `__s_${p.id}`
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(p)
  }

  const groups = [...groupMap.values()]
    .map(g => cryptoShuffle(g))
    .sort((a, b) => b.length - a.length)

  const halfSize = bracketSize / 2
  const topHalf: DrawParticipant[] = []
  const bottomHalf: DrawParticipant[] = []
  const topCount = new Map<string, number>()
  const botCount = new Map<string, number>()

  const interleaved: DrawParticipant[] = []
  const maxLen = Math.max(...groups.map(g => g.length))
  for (let i = 0; i < maxLen; i++) {
    for (const g of groups) {
      if (i < g.length) interleaved.push(g[i])
    }
  }

  for (const p of interleaved) {
    const key = p.association_id ?? `__s_${p.id}`
    const tc = topCount.get(key) ?? 0
    const bc = botCount.get(key) ?? 0

    let goTop: boolean
    if (topHalf.length >= halfSize)         goTop = false
    else if (bottomHalf.length >= halfSize)  goTop = true
    else if (tc < bc)                        goTop = true
    else if (bc < tc)                        goTop = false
    else                                     goTop = topHalf.length <= bottomHalf.length

    if (goTop) { topHalf.push(p); topCount.set(key, tc + 1) }
    else        { bottomHalf.push(p); botCount.set(key, bc + 1) }
  }

  return [
    ...spreadByes(cryptoShuffle(topHalf), halfSize),
    ...spreadByes(cryptoShuffle(bottomHalf), halfSize),
  ]
}

function seedRandom(
  participants: DrawParticipant[],
  bracketSize: number
): Array<DrawParticipant | null> {
  return spreadByes(cryptoShuffle(participants), bracketSize)
}

// ─── Input schema ─────────────────────────────────────────────────────────────

const schema = z.object({
  bracket_id: zodUuid('bracket_id must be a valid UUID'),
})

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // SEC-2: use requireHeadMaster so deactivated accounts are blocked
  const auth = await requireHeadMaster()
  if (isNextResponse(auth)) return auth

  // BUG-4: validate bracket_id format before hitting the DB
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
  }
  const { bracket_id } = parsed.data

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Load bracket and verify HM owns the parent tournament (SEC-2)
  const { data: bracketRow } = await db
    .from('draw_brackets')
    .select('id, status, bracket_size, seeding_mode, tournament_id')
    .eq('id', bracket_id)
    .single()

  if (!bracketRow)
    return NextResponse.json({ error: 'Bracket not found' }, { status: 404 })

  // RLS on draw_brackets (migration 030) already enforces ownership.
  // Belt-and-suspenders: explicit application-layer ownership check.
  const { data: tournament } = await db
    .from('tournaments')
    .select('id')
    .eq('id', bracketRow.tournament_id)
    .eq('owner_id', auth.userId)
    .single()

  if (!tournament)
    return NextResponse.json({ error: 'Tournament not found or access denied' }, { status: 403 })

  if (bracketRow.status !== 'PREVIEW')
    return NextResponse.json({ error: 'Only PREVIEW brackets can be (re)generated' }, { status: 409 })

  const bracketSize: number = bracketRow.bracket_size
  const totalRounds = Math.log2(bracketSize)
  const seedingMode: string = bracketRow.seeding_mode

  // Load real participants
  const { data: participantsData } = await db
    .from('draw_participants')
    .select('*')
    .eq('bracket_id', bracket_id)
    .eq('is_bye', false)
    .eq('is_eligible', true)

  const participants = (participantsData ?? []) as DrawParticipant[]
  if (participants.length < 2)
    return NextResponse.json({ error: 'Need at least 2 athletes to generate a draw' }, { status: 400 })

  // Compute seeded slots
  const slots =
    seedingMode === 'RANDOM'
      ? seedRandom(participants, bracketSize)
      : seedWithAssociationSeparation(participants, bracketSize)

  const byeSeedPositions: number[] = []
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === null) byeSeedPositions.push(i + 1)
  }

  // Wipe previous generation
  await db.from('bracket_matches').delete().eq('bracket_id', bracket_id)
  await db.from('draw_participants').delete()
    .eq('bracket_id', bracket_id).eq('is_bye', true)

  // Insert bye participants
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

  // BUG-6: batch all seed_position updates in parallel instead of N serial calls
  const seedToParticipantId = new Map<number, string>()
  const seedUpdatePromises: Promise<unknown>[] = []
  for (let i = 0; i < slots.length; i++) {
    const p = slots[i]
    if (p !== null) {
      const seedPos = i + 1
      seedToParticipantId.set(seedPos, p.id)
      seedUpdatePromises.push(
        db.from('draw_participants')
          .update({ seed_position: seedPos })
          .eq('id', p.id)
      )
    }
  }
  await Promise.all(seedUpdatePromises)

  const seedToId = new Map<number, string>([
    ...seedToParticipantId,
    ...byeSeedToId,
  ])

  // Build bracket_matches for all rounds
  type MatchInsert = {
    bracket_id: string
    round_number: number
    round_label: string
    position: number
    participant1_id: string | null
    participant2_id: string | null
    winner_id: string | null
    status: string
    next_match_id: null
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

  const matchKey = (r: number, p: number) => `${r}.${p}`
  const matchMap = new Map<string, string>()
  for (const m of (insertedMatches ?? [])) {
    matchMap.set(matchKey(m.round_number, m.position), m.id as string)
  }

  // BUG-6: second pass — wire next_match_id in parallel
  const wiringUpdates: Promise<unknown>[] = []
  for (let r = 2; r <= totalRounds; r++) {
    const matchesInRound = Math.pow(2, r - 1)
    for (let pos = 1; pos <= matchesInRound; pos++) {
      const thisId  = matchMap.get(matchKey(r, pos))
      const nextPos = Math.ceil(pos / 2)
      const nextId  = matchMap.get(matchKey(r - 1, nextPos))
      const nextSlot = pos % 2 === 1 ? 1 : 2

      if (thisId && nextId) {
        wiringUpdates.push(
          db.from('bracket_matches')
            .update({ next_match_id: nextId, next_match_slot: nextSlot })
            .eq('id', thisId)
        )
      }
    }
  }
  await Promise.all(wiringUpdates)

  // BUG-6: third pass — advance BYE_WIN winners in parallel
  const byeAdvanceUpdates: Promise<unknown>[] = []
  for (const m of (insertedMatches ?? [])) {
    const inserted = matchInserts.find(
      mi => mi.round_number === m.round_number && mi.position === m.position
    )
    if (inserted?.status !== 'BYE_WIN' || !inserted.winner_id) continue
    if (m.round_number <= 1) continue

    const nextPos  = Math.ceil(m.position / 2)
    const nextSlot = m.position % 2 === 1 ? 1 : 2
    const nextId   = matchMap.get(matchKey(m.round_number - 1, nextPos))
    if (!nextId) continue

    const field = nextSlot === 1 ? 'participant1_id' : 'participant2_id'
    byeAdvanceUpdates.push(
      db.from('bracket_matches')
        .update({ [field]: inserted.winner_id })
        .eq('id', nextId)
    )
  }
  await Promise.all(byeAdvanceUpdates)

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
