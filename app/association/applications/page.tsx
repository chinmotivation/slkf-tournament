import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ApplicationCard, { type ApplicationListItem } from '@/components/applications/ApplicationCard'
import type { Application } from '@/types/database'

export const metadata: Metadata = { title: 'My Applications — SLKF Association' }

export default async function AssociationApplicationsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profileResult = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  const p = profileResult.data as { full_name: string; role: string } | null
  if (p?.role !== 'association_rep') redirect('/unauthorized')

  const assocResult = await supabase
    .from('associations')
    .select('id')
    .eq('user_id', user.id)
    .single()
  const assoc = assocResult.data as { id: string } | null

  let applications: ApplicationListItem[] = []

  if (assoc) {
    type AppRow = Application & { tournaments: { name: string; code: string; year: number } }
    const appsResult = await db
      .from('applications')
      .select('*, tournaments(name, code, year)')
      .eq('association_id', assoc.id)
      .order('updated_at', { ascending: false })

    const apps = (appsResult.data ?? []) as AppRow[]

    if (apps.length > 0) {
      const appIds = apps.map(a => a.id)
      const entriesResult = await db
        .from('individual_entries')
        .select('application_id')
        .in('application_id', appIds)
        .is('deleted_at', null)

      const counts: Record<string, number> = {}
      for (const entry of (entriesResult.data ?? []) as { application_id: string }[]) {
        counts[entry.application_id] = (counts[entry.application_id] ?? 0) + 1
      }

      applications = apps.map(app => ({
        id: app.id,
        tournament_id: app.tournament_id,
        tournament_name: app.tournaments?.name ?? '',
        tournament_code: app.tournaments?.code ?? '',
        tournament_year: app.tournaments?.year ?? 0,
        status: app.status,
        submitted_at: app.submitted_at,
        athlete_count: counts[app.id] ?? 0,
        updated_at: app.updated_at,
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">SLKF Tournament System</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">My Applications</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/association/tournaments" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Tournaments
            </Link>
            <Link href="/association/dashboard" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Dashboard
            </Link>
            <span className="text-sm text-gray-600">{p?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
              Association Rep
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {applications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-700 mb-1">No applications yet</h2>
            <p className="text-sm text-gray-400 mb-4">
              Browse open tournaments and apply to get started.
            </p>
            <Link
              href="/association/tournaments"
              className="inline-flex items-center gap-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              View Open Tournaments
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map(app => (
              <ApplicationCard key={app.id} application={app} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
