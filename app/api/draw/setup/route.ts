import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Next power of 2 >= n (minimum 2)
function bracketSize(n: number): number {
  if (n <= 2) return 2
  let s = 2
  while (s < n) s *= 2
  return s
}

type StudentApp = {
  id: string
  full_name: string
  gender: 'MALE' | 'FEMALE'
  age_category_code: string
  kata_entry: boolean
  kata_level: string | null
  kumite_entry: boolean
  kumite_weight_class: string | null
}

type IndividualEntry = {
  id: string
  full_name: string | null
  gender: 'MALE' | 'FEMALE' | null
  age_category_code: string | null
  kata_entry: boolean
  kata_level: string | null
  kumite_entry: boolean
  kumite_weight_class: string | null
  application_id: string
  applications: { association_id: string; association_name: string | null } | null
}

type BracketKey = string  // `${age}|${gender}|${event}|${sub}`

interface BracketSpec {
  age_group_code: string
  gender: 'MALE' | 'FEMALE'
  event: 'KATA' | 'KUMITE'
  kata_level: string | null
  weight_class_label: string | null
  participants: Array<{
    full_name: string | null
    association_id: string | null
    association_name: string | null
    student_application_id: string | null
    individual_entry_id: string | null
  }>
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'head_master')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { tournament_id } = body as { tournament_id?: string }
  if (!tournament_id) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })

  // Verify HM owns this tournament (RLS does this automatically via createClient)
  const { data: tourn } = await db
    .from('tournaments')
    .select('id, seeding_method')
    .eq('id', tournament_id)
    .single()
  if (!tourn) return NextResponse.json({ error: 'Tournament not found or access denied' }, { status: 404 })

  const seedingMode: string = tourn.seeding_method ?? 'RANDOM'

  // ── 1. Collect approved students ─────────────────────────────────────────────
  const { data: studentsData } = await db
    .from('student_applications')
    .select('id, full_name, gender, age_category_code, kata_entry, kata_level, kumite_entry, kumite_weight_class')
    .eq('tournament_id', tournament_id)
    .eq('status', 'APPROVED')

  const students = (studentsData ?? []) as StudentApp[]

  // ── 2. Collect approved association entries ───────────────────────────────────
  const { data: appsData } = await db
    .from('applications')
    .select('id, association_id, association_name')
    .eq('tournament_id', tournament_id)
    .in('status', ['SUBMITTED', 'PENDING_VERIFICATION', 'APPROVED'])

  const apps = (appsData ?? []) as { id: string; association_id: string; association_name: string | null }[]
  const appIds = apps.map(a => a.id)
  const appMap = new Map(apps.map(a => [a.id, a]))

  let entries: IndividualEntry[] = []
  if (appIds.length > 0) {
    const { data: entriesData } = await db
      .from('individual_entries')
      .select('id, full_name, gender, age_category_code, kata_entry, kata_level, kumite_entry, kumite_weight_class, application_id')
      .in('application_id', appIds)
      .is('deleted_at', null)
    entries = ((entriesData ?? []) as Omit<IndividualEntry, 'applications'>[]).map(e => ({
      ...e,
      applications: appMap.get(e.application_id) ?? null,
    }))
  }

  if (students.length === 0 && entries.length === 0) {
    return NextResponse.json({ error: 'No approved participants found for this tournament' }, { status: 400 })
  }

  // ── 3. Build bracket specs ────────────────────────────────────────────────────
  const bracketMap = new Map<BracketKey, BracketSpec>()

  function getOrCreate(
    age: string,
    gender: 'MALE' | 'FEMALE',
    event: 'KATA' | 'KUMITE',
    kata_level: string | null,
    weight_class_label: string | null,
  ): BracketSpec {
    const sub = event === 'KATA' ? (kata_level ?? 'ALL') : (weight_class_label ?? 'OPEN')
    const key: BracketKey = `${age}|${gender}|${event}|${sub}`
    if (!bracketMap.has(key)) {
      bracketMap.set(key, { age_group_code: age, gender, event, kata_level, weight_class_label, participants: [] })
    }
    return bracketMap.get(key)!
  }

  for (const s of students) {
    if (s.kata_entry) {
      getOrCreate(s.age_category_code, s.gender, 'KATA', s.kata_level, null).participants.push({
        full_name: s.full_name, association_id: null, association_name: null,
        student_application_id: s.id, individual_entry_id: null,
      })
    }
    if (s.kumite_entry) {
      getOrCreate(s.age_category_code, s.gender, 'KUMITE', null, s.kumite_weight_class).participants.push({
        full_name: s.full_name, association_id: null, association_name: null,
        student_application_id: s.id, individual_entry_id: null,
      })
    }
  }

  for (const e of entries) {
    const gender = e.gender as 'MALE' | 'FEMALE' | null
    if (!gender || !e.age_category_code) continue
    if (e.kata_entry) {
      getOrCreate(e.age_category_code, gender, 'KATA', e.kata_level, null).participants.push({
        full_name: e.full_name, association_id: e.applications?.association_id ?? null,
        association_name: e.applications?.association_name ?? null,
        student_application_id: null, individual_entry_id: e.id,
      })
    }
    if (e.kumite_entry) {
      getOrCreate(e.age_category_code, gender, 'KUMITE', null, e.kumite_weight_class).participants.push({
        full_name: e.full_name, association_id: e.applications?.association_id ?? null,
        association_name: e.applications?.association_name ?? null,
        student_application_id: null, individual_entry_id: e.id,
      })
    }
  }

  // ── 4. Upsert draw_brackets + draw_participants ───────────────────────────────
  let bracketsCreated = 0
  let bracketsUpdated = 0
  let totalParticipants = 0

  for (const spec of bracketMap.values()) {
    const count = spec.participants.length
    const bSize = bracketSize(count)
    const byes  = bSize - count

    // Check if bracket already exists
    const { data: existing } = await db
      .from('draw_brackets')
      .select('id, status')
      .eq('tournament_id', tournament_id)
      .eq('age_group_code', spec.age_group_code)
      .eq('gender', spec.gender)
      .eq('event', spec.event)
      .is(spec.kata_level   ? 'kata_level'          : 'weight_class_label',
          spec.kata_level ?? spec.weight_class_label)
      .maybeSingle()

    let bracketId: string

    if (existing) {
      // Only update if still in PREVIEW (don't touch locked/in-progress brackets)
      if (existing.status !== 'PREVIEW') {
        bracketsUpdated++
        continue
      }
      await db.from('draw_brackets').update({
        participant_count: count,
        bracket_size: bSize,
        bye_count: byes,
        seeding_mode: seedingMode,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }).eq('id', existing.id)
      bracketId = existing.id as string

      // Wipe old participants so we can re-sync
      await db.from('draw_participants').delete().eq('bracket_id', bracketId)
      bracketsUpdated++
    } else {
      const { data: inserted } = await db.from('draw_brackets').insert({
        tournament_id,
        age_group_code: spec.age_group_code,
        gender: spec.gender,
        event: spec.event,
        kata_level: spec.kata_level,
        weight_class_label: spec.weight_class_label,
        seeding_mode: seedingMode,
        participant_count: count,
        bracket_size: bSize,
        bye_count: byes,
        status: 'PREVIEW',
        created_by: user.id,
        updated_by: user.id,
      }).select('id').single()
      if (!inserted) continue
      bracketId = inserted.id as string
      bracketsCreated++
    }

    // Insert participants
    if (spec.participants.length > 0) {
      await db.from('draw_participants').insert(
        spec.participants.map(p => ({
          bracket_id: bracketId,
          full_name: p.full_name,
          association_id: p.association_id,
          association_name: p.association_name,
          student_application_id: p.student_application_id,
          individual_entry_id: p.individual_entry_id,
          is_bye: false,
          is_eligible: true,
          seed_position: null,
        }))
      )
      totalParticipants += spec.participants.length
    }
  }

  return NextResponse.json({
    success: true,
    brackets_created: bracketsCreated,
    brackets_updated: bracketsUpdated,
    total_participants: totalParticipants,
    total_brackets: bracketMap.size,
  })
}
