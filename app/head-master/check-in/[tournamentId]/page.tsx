import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import CheckInClient from '@/components/check-in/CheckInClient'
import type { Tournament } from '@/types/database'

export const metadata: Metadata = { title: 'Check-in Scanner — SLKF' }

interface Props {
  params: Promise<{ tournamentId: string }>
}

export default async function CheckInScannerPage({ params }: Props) {
  const { tournamentId } = await params

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
    .select('id, name, code, year, status')
    .eq('id', tournamentId)
    .single()

  if (error || !tournament) notFound()
  const t = tournament as Pick<Tournament, 'id' | 'name' | 'code' | 'year' | 'status'>

  // Quick stats
  const [indivResult, studentResult] = await Promise.all([
    db
      .from('individual_entries')
      .select('checked_in_at', { count: 'exact' })
      .eq('tournament_id', tournamentId)
      .is('deleted_at', null),
    db
      .from('student_applications')
      .select('checked_in_at', { count: 'exact' })
      .eq('tournament_id', tournamentId)
      .eq('status', 'APPROVED'),
  ])

  const totalEntries = (indivResult.count ?? 0) + (studentResult.count ?? 0)
  const checkedIn =
    ((indivResult.data ?? []) as { checked_in_at: string | null }[]).filter(e => !!e.checked_in_at).length +
    ((studentResult.data ?? []) as { checked_in_at: string | null }[]).filter(e => !!e.checked_in_at).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Check-in</span>
            <h1 className="text-base font-bold text-gray-900 mt-0.5">{t.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/head-master/check-in/${tournamentId}/board`}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Attendance Board
            </Link>
            <Link href="/head-master/check-in" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6 space-y-5">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total Entries" value={totalEntries} />
          <StatCard label="Checked In" value={checkedIn} accent />
          <StatCard label="Pending" value={totalEntries - checkedIn} />
        </div>

        {/* Scanner / manual search */}
        <CheckInClient tournamentId={tournamentId} />
      </main>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
      <p className={`text-2xl font-bold ${accent ? 'text-emerald-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
