import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Tournament } from '@/types/database'

export const metadata = { title: 'Excel Export — SLKF Head Master' }

export default async function ExportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = supabase as any

  const tournamentsResult = await db
    .from('tournaments')
    .select('id, name, code, year, status')
    .order('created_at', { ascending: false })

  type TournRow = Pick<Tournament, 'id' | 'name' | 'code' | 'year' | 'status'>
  const tournaments = (tournamentsResult.data ?? []) as TournRow[]

  // Count individual entries per tournament from submitted/approved applications
  const entryCounts = new Map<string, number>()
  if (tournaments.length > 0) {
    const ids = tournaments.map(t => t.id)

    const appsResult = await db
      .from('applications')
      .select('id, tournament_id')
      .in('tournament_id', ids)
      .in('status', ['SUBMITTED', 'PENDING_VERIFICATION', 'APPROVED'])

    const appRows = (appsResult.data ?? []) as { id: string; tournament_id: string }[]
    const appToTourn = new Map(appRows.map(a => [a.id, a.tournament_id]))
    const appIds = appRows.map(a => a.id)

    if (appIds.length > 0) {
      const entriesResult = await db
        .from('individual_entries')
        .select('application_id')
        .in('application_id', appIds)
        .is('deleted_at', null)

      for (const e of (entriesResult.data ?? []) as { application_id: string }[]) {
        const tid = appToTourn.get(e.application_id)
        if (tid) entryCounts.set(tid, (entryCounts.get(tid) ?? 0) + 1)
      }
    }
  }

  const statusStyle: Record<string, string> = {
    OPEN:     'bg-green-50 text-green-700 border-green-200',
    CLOSED:   'bg-gray-50 text-gray-600 border-gray-200',
    DRAFT:    'bg-yellow-50 text-yellow-700 border-yellow-200',
    ARCHIVED: 'bg-gray-50 text-gray-500 border-gray-200',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/head-master/dashboard"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Excel Export</h1>
            <p className="text-xs text-gray-500">Download association entry lists per tournament</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-3">
        {tournaments.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            No tournaments found.
          </div>
        )}

        {tournaments.map(t => {
          const count = entryCounts.get(t.id) ?? 0
          return (
            <div
              key={t.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusStyle[t.status] ?? statusStyle.ARCHIVED}`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {count > 0
                    ? `${count} athlete entr${count !== 1 ? 'ies' : 'y'} across submitted applications`
                    : 'No submitted entries yet'}
                </p>
              </div>

              {count > 0 ? (
                <a
                  href={`/api/head-master/export?tournament_id=${t.id}`}
                  className="flex items-center gap-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 px-4 py-2.5 rounded-xl transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Download .xlsx
                </a>
              ) : (
                <span className="text-xs text-gray-300 shrink-0">No data</span>
              )}
            </div>
          )
        })}
      </main>
    </div>
  )
}
