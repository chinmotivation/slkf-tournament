import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

type StudentRow = {
  full_name: string
  date_of_birth: string
  gender: 'MALE' | 'FEMALE'
  belt_grade: string
  age_category_code: string
  kata_entry: boolean
  kata_level: string | null
  kumite_entry: boolean
  kumite_weight_class: string | null
  total_amount_lkr: number
  status: string
  student_number: string | null
  review_notes: string | null
}

type TournRow = {
  id: string; name: string; code: string; year: number
  organizer_instructor_name: string | null
  organizer_association_name: string | null
  organizer_district: string | null
}

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // RLS ensures HM only sees their own tournament
  const { data: tourn, error: tournErr } = await db
    .from('tournaments')
    .select('id, name, code, year, organizer_instructor_name, organizer_association_name, organizer_district')
    .eq('id', tournamentId)
    .single()

  if (tournErr || !tourn) return NextResponse.json({ error: 'Tournament not found or access denied' }, { status: 404 })
  const tournament = tourn as TournRow

  const { data: students } = await db
    .from('student_applications')
    .select(`
      full_name, date_of_birth, gender, belt_grade, age_category_code,
      kata_entry, kata_level, kumite_entry, kumite_weight_class,
      total_amount_lkr, status, student_number, review_notes
    `)
    .eq('tournament_id', tournamentId)
    .order('status')
    .order('full_name')

  const rows = (students ?? []) as StudentRow[]
  const approved = rows.filter(r => r.status === 'APPROVED')

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Student Roster')

  // ── Header block ──────────────────────────────────────────────────────────────
  ws.mergeCells('A1:K1')
  ws.getCell('A1').value = tournament.name.toUpperCase()
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center' }

  ws.mergeCells('A2:K2')
  ws.getCell('A2').value = 'Student Participant List — For Submission to Sri Lanka Karate Federation'
  ws.getCell('A2').font = { italic: true, size: 10 }
  ws.getCell('A2').alignment = { horizontal: 'center' }

  ws.getCell('A3').value = `Instructor / Head Master: ${tournament.organizer_instructor_name ?? ''}`
  ws.getCell('E3').value = `Association: ${tournament.organizer_association_name ?? ''}`
  ws.getCell('I3').value = `District: ${tournament.organizer_district ?? ''}`

  ws.getCell('A4').value = `Total Approved: ${approved.length}`
  ws.getCell('E4').value = `Total Fee Collected (LKR): ${approved.reduce((s, r) => s + r.total_amount_lkr, 0).toLocaleString()}`
  ws.getCell('I4').value = `Generated: ${new Date().toLocaleDateString('en-GB')}`

  // ── Column headers ────────────────────────────────────────────────────────────
  const headerRow = ws.addRow([
    '#', 'Student No.', 'Full Name', 'DOB', 'Gender', 'Category',
    'Belt Grade', 'Events', 'Kata Level / Kumite Weight', 'Fee (LKR)', 'Status',
  ])
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE74C3C' } }
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFB03A2C' } },
    }
  })

  // ── Data rows — approved first, then others ────────────────────────────────
  const sorted = [...approved, ...rows.filter(r => r.status !== 'APPROVED')]
  let seq = 1
  for (const s of sorted) {
    const dob = new Date(s.date_of_birth)
    const dobStr = [
      dob.getDate().toString().padStart(2, '0'),
      (dob.getMonth() + 1).toString().padStart(2, '0'),
      dob.getFullYear(),
    ].join('/')

    const events = [
      s.kata_entry && 'Kata',
      s.kumite_entry && 'Kumite',
    ].filter(Boolean).join(' + ')

    const details = [
      s.kata_entry && s.kata_level ? `Level ${s.kata_level.replace('LEVEL_', '')}` : null,
      s.kumite_entry && s.kumite_weight_class ? s.kumite_weight_class + ' kg' : null,
    ].filter(Boolean).join(' / ')

    const row = ws.addRow([
      seq++,
      s.student_number ?? '—',
      s.full_name,
      dobStr,
      s.gender === 'MALE' ? 'M' : 'F',
      s.age_category_code,
      s.belt_grade,
      events,
      details,
      s.total_amount_lkr,
      s.status,
    ])

    // Color coding by status
    const bg = s.status === 'APPROVED' ? 'FFE9F7EF'
             : s.status === 'REJECTED' ? 'FFFDEDED'
             : 'FFFFF9E6'

    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    })

    if (s.status === 'REJECTED' && s.review_notes) {
      // Add rejection reason in next row, merged
      const noteRow = ws.addRow(['', '', `  ↳ Rejected: ${s.review_notes}`, '', '', '', '', '', '', '', ''])
      ws.mergeCells(`C${noteRow.number}:K${noteRow.number}`)
      noteRow.getCell(3).font = { italic: true, color: { argb: 'FFC0392B' }, size: 9 }
    }
  }

  // ── Column widths ──────────────────────────────────────────────────────────
  ws.columns = [
    { width: 5 },   // #
    { width: 20 },  // student no
    { width: 28 },  // name
    { width: 12 },  // dob
    { width: 8 },   // gender
    { width: 10 },  // category
    { width: 20 },  // belt
    { width: 15 },  // events
    { width: 22 },  // details
    { width: 12 },  // fee
    { width: 12 },  // status
  ]

  ws.getRow(1).height = 22
  ws.getRow(5).height = 18

  const buffer = await wb.xlsx.writeBuffer()
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '-')
  const filename = `SLKF-${safe(tournament.code)}-${tournament.year}-Students.xlsx`

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
