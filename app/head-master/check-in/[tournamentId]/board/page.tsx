import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import type { Tournament } from '@/types/database'

export const metadata: Metadata = { title: 'Attendance Board — SLKF' }

interface Props {
  params: Promise<{ tournamentId: string }>
  searchParams: Promise<{ filter?: string }>
}

interface EntryRow {
  entry_id: string
  type: 'individual' | 'student'
  full_name: string
  age_category_code: string
  gender: string
  events: string
  association_name: string | null
  student_number: string | null
  application_status: string
  checked_in_at: string | null
}

export default async function AttendanceBoardPage({ params, searchParams }: Props) {
  const { tournamentId } = await params
  const { filter = 'all' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  const p = profile as { full_name: string; role: string } | null
  if (p?.role !== 'head_master') redirect('/unauthorized')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  const { data: tournament, error } = await db
    .from('tournaments')
    .select('id, name, code, year')
    .eq('id', tournamentId)
    .single()

  if (error || !tournament) notFound()
  const t = tournament as Pick<Tournament, 'id' | 'name' | 'code' | 'year'>

  const [indivResult, studentResult] = await Promise.all([
    db
      .from('individual_entries')
      .select(`
        id, full_name, age_category_code, gender, event,
        association_id, checked_in_at, deleted_at,
        application:applications(status)
      `)
      .eq('tournament_id', tournamentId)
      .is('deleted_at', null)
      .order('full_name'),
    db
      .from('student_applications')
      .select(`
        id, full_name, age_category_code, gender, kata_entry, kumite_entry,
        student_number, status, checked_in_at
      `)
      .eq('tournament_id', tournamentId)
      .order('full_name'),
  ])

  // Batch-fetch association names
  const assocIds: string[] = [...new Set(
    ((indivResult.data ?? []) as { association_id: string }[]).map(e => e.association_id)
  )]
  const assocMap: Record<string, string> = {}
  if (assocIds.length > 0) {
    const { data: assocs } = await db
      .from('associations')
      .select('id, association_name')
      .in('id', assocIds)
    for (const a of assocs ?? []) assocMap[a.id] = a.association_name
  }

  const all: EntryRow[] = []

  for (const e of indivResult.data ?? []) {
    all.push({
      entry_id: e.id,
      type: 'individual',
      full_name: e.full_name,
      age_category_code: e.age_category_code,
      gender: e.gender,
      events: e.event,
      association_name: assocMap[e.association_id] ?? null,
      student_number: null,
      application_status: e.application?.status ?? '',
      checked_in_at: e.checked_in_at,
    })
  }
  for (const s of studentResult.data ?? []) {
    const events = [s.kata_entry && 'KATA', s.kumite_entry && 'KUMITE'].filter(Boolean).join(' + ')
    all.push({
      entry_id: s.id,
      type: 'student',
      full_name: s.full_name,
      age_category_code: s.age_category_code,
      gender: s.gender,
      events,
      association_name: null,
      student_number: s.student_number,
      application_status: s.status,
      checked_in_at: s.checked_in_at,
    })
  }

  const checkedIn = all.filter(e => !!e.checked_in_at).length
  const pending = all.length - checkedIn

  const filtered =
    filter === 'present' ? all.filter(e => !!e.checked_in_at) :
    filter === 'pending' ? all.filter(e => !e.checked_in_at) :
    all

  const FILTERS = [
    { value: 'all', label: `All (${all.length})` },
    { value: 'present', label: `Present (${checkedIn})` },
    { value: 'pending', label: `Pending (${pending})` },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Attendance Board</span>
            <h1 className="text-base font-bold text-gray-900 mt-0.5">{t.name}</h1>
          </div>
          <Link
            href={`/head-master/check-in/${tournamentId}`}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Scanner
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Check-in Progress</span>
            <span className="text-sm font-bold text-gray-900">
              {checkedIn} / {all.length}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all"
              style={{ width: all.length ? `${(checkedIn / all.length) * 100}%` : '0%' }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {all.length > 0 ? Math.round((checkedIn / all.length) * 100) : 0}% checked in
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {FILTERS.map(f => (
            <Link
              key={f.value}
              href={`/head-master/check-in/${tournamentId}/board?filter=${f.value}`}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No entries.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Athlete</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Events</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Association</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(entry => (
                  <tr key={`${entry.type}-${entry.entry_id}`} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{entry.full_name}</p>
                      {entry.student_number && (
                        <p className="text-xs text-gray-400">{entry.student_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {entry.age_category_code} · {entry.gender}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{entry.events}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {entry.association_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {entry.checked_in_at ? (
                        <div>
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Present
                          </span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(entry.checked_in_at).toLocaleTimeString()}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
