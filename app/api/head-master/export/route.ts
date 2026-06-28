import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import path from 'path'

type TournamentRow = {
  id: string; name: string; code: string; year: number; subtitle: string | null
  organizer_district: string | null; organizer_province: string | null
  organizer_association_name: string | null; organizer_reg_no: string | null
  organizer_instructor_name: string | null; organizer_whatsapp: string | null
}
type AssocRow = {
  id: string; association_name: string; district: string; province: string
  slkf_registration_number: string; instructor_name: string; whatsapp_number: string | null
}
type EntryRow = {
  id: string; full_name: string; date_of_birth: string; age_category_code: string
  gender: 'MALE' | 'FEMALE'; event: 'KATA' | 'KUMITE' | 'BOTH'
  weight_kg: number | null; entry_fee_lkr: number; association_id: string; row_order: number
}
type TeamRow = {
  id: string; association_id: string; entry_fee_lkr: number
  team_number: number; age_group_code: string; gender: 'MALE' | 'FEMALE'; event_name: string
}
type MemberRow = { team_entry_id: string; full_name: string; member_order: number }

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'head_master')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const tournamentId = req.nextUrl.searchParams.get('tournament_id')
  if (!tournamentId) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })

  const db = supabase as any

  const { data: tourn, error: tournErr } = await db
    .from('tournaments')
    .select('id, name, code, year, subtitle, organizer_district, organizer_province, organizer_association_name, organizer_reg_no, organizer_instructor_name, organizer_whatsapp')
    .eq('id', tournamentId)
    .single()

  if (tournErr || !tourn) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  const tournament = tourn as TournamentRow

  const { data: apps } = await db
    .from('applications')
    .select('id, association_id, associations(id, association_name, district, province, slkf_registration_number, instructor_name, whatsapp_number)')
    .eq('tournament_id', tournamentId)
    .in('status', ['SUBMITTED', 'PENDING_VERIFICATION', 'APPROVED'])

  const applications = (apps ?? []) as Array<{ id: string; association_id: string; associations: AssocRow }>
  if (applications.length === 0)
    return NextResponse.json({ error: 'No submitted applications found' }, { status: 404 })

  const appIds = applications.map(a => a.id)
  const assocById = new Map(applications.map(a => [a.association_id, a.associations]))

  const [entriesRes, teamsRes, membersRes] = await Promise.all([
    db.from('individual_entries')
      .select('id, full_name, date_of_birth, age_category_code, gender, event, weight_kg, entry_fee_lkr, association_id, row_order')
      .in('application_id', appIds)
      .is('deleted_at', null)
      .order('association_id')
      .order('row_order'),
    db.from('team_kata_entries')
      .select('id, association_id, entry_fee_lkr, team_number, age_group_code, gender, event_name')
      .in('application_id', appIds)
      .is('deleted_at', null)
      .order('association_id')
      .order('block_order'),
    db.from('team_kata_members')
      .select('team_entry_id, full_name, member_order')
      .order('member_order'),
  ])

  const entries = (entriesRes.data ?? []) as EntryRow[]
  const teams   = (teamsRes.data  ?? []) as TeamRow[]
  const members = (membersRes.data ?? []) as MemberRow[]

  const membersByTeam = new Map<string, MemberRow[]>()
  for (const m of members) {
    if (!membersByTeam.has(m.team_entry_id)) membersByTeam.set(m.team_entry_id, [])
    membersByTeam.get(m.team_entry_id)!.push(m)
  }

  // readFile loads the template into memory only — the file on disk is NEVER modified.
  // writeBuffer() below produces a brand-new file sent to the browser as the download.
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'okc-template.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(templatePath)

  const title    = tournament.name.toUpperCase()
  const subtitle = tournament.subtitle ?? 'U 14/Cadet/Junior/U 21 and Senior'

  // ── Sheet 1: Individual ──────────────────────────────────────────────────────

  const wsInd = wb.getWorksheet('Individual')
  if (wsInd) {
    // Update title and subtitle rows
    wsInd.getCell('A1').value = title
    wsInd.getCell('A2').value = subtitle

    // Write athlete rows starting at row 4.
    // Template already has sequential numbers 1-100 in col A (rows 4-103).
    // We write B-H and override the array formula in H with actual fee values.
    let indRow = 4
    for (const entry of entries) {
      if (indRow > 103) break  // template has 100 data slots
      const dob = new Date(entry.date_of_birth)
      const dobStr = [
        dob.getDate().toString().padStart(2, '0'),
        (dob.getMonth() + 1).toString().padStart(2, '0'),
        dob.getFullYear(),
      ].join('/')

      wsInd.getCell(`B${indRow}`).value = entry.full_name
      wsInd.getCell(`C${indRow}`).value = dobStr
      wsInd.getCell(`D${indRow}`).value = entry.age_category_code
      wsInd.getCell(`E${indRow}`).value = entry.gender === 'MALE' ? 'M' : 'F'
      wsInd.getCell(`F${indRow}`).value = entry.event
      wsInd.getCell(`G${indRow}`).value = entry.weight_kg ?? ''
      wsInd.getCell(`H${indRow}`).value = entry.entry_fee_lkr
      indRow++
    }

    // Clear amount formula from remaining unused rows so they show blank
    for (let r = indRow; r <= 103; r++) {
      wsInd.getCell(`H${r}`).value = null
    }

    // Fill right panel — organizer details from tournament record (col K = col 11)
    wsInd.getCell('K4').value = tournament.organizer_district         ?? ''
    wsInd.getCell('K5').value = tournament.organizer_province         ?? ''
    wsInd.getCell('K6').value = tournament.organizer_association_name ?? ''
    wsInd.getCell('K7').value = tournament.organizer_reg_no           ?? ''
    wsInd.getCell('K8').value = tournament.organizer_instructor_name  ?? ''
    wsInd.getCell('K9').value = tournament.organizer_whatsapp         ?? ''
  }

  // ── Sheet 2: T-Kata ──────────────────────────────────────────────────────────

  const wsKata = wb.getWorksheet('T-Kata')
  if (wsKata) {
    wsKata.getCell('A1').value = title
    wsKata.getCell('A2').value = subtitle

    // Each team occupies 3 rows (one per member).
    // # and details only on the first member row; rows 2-3 have just the name.
    let kataRow = 4
    let teamSeq = 1
    for (const team of teams) {
      if (kataRow > 61) break  // need at least 3 rows remaining
      const teamMembers = (membersByTeam.get(team.id) ?? [])
        .sort((a, b) => a.member_order - b.member_order)

      teamMembers.forEach((member, i) => {
        if (kataRow > 63) return
        wsKata.getCell(`B${kataRow}`).value = member.full_name
        if (i === 0) {
          // First member row carries the team details
          wsKata.getCell(`A${kataRow}`).value = teamSeq
          wsKata.getCell(`C${kataRow}`).value = team.age_group_code
          wsKata.getCell(`D${kataRow}`).value = team.gender === 'MALE' ? 'M' : 'F'
          wsKata.getCell(`E${kataRow}`).value = team.event_name
          wsKata.getCell(`F${kataRow}`).value = team.entry_fee_lkr
        }
        kataRow++
      })
      teamSeq++
    }

    // Clear formula from remaining unused rows
    for (let r = kataRow; r <= 63; r++) {
      wsKata.getCell(`F${r}`).value = null
    }
  }

  const buffer   = await wb.xlsx.writeBuffer()
  const safe     = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '-')
  const filename = `SLKF-${safe(tournament.code)}-${tournament.year}-Entries.xlsx`

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
