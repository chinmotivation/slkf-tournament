import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'

export const metadata: Metadata = { title: 'Dashboard — SLKF Head Master' }

export default async function HeadMasterDashboard() {
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
  const db = supabase as any

  // All data is scoped to this HM's tournaments via RLS (owner_id = auth.uid())
  const [tournamentsResult, studentAppsResult] = await Promise.all([
    db.from('tournaments').select('id, name, code, status').order('created_at', { ascending: false }),
    db.from('student_applications').select('id, tournament_id, status'),
  ])

  const tournaments = (tournamentsResult.data ?? []) as { id: string; name: string; code: string; status: string }[]
  const studentApps = (studentAppsResult.data ?? []) as { id: string; tournament_id: string; status: string }[]

  const openCount    = tournaments.filter(t => t.status === 'OPEN').length
  const pendingCount = studentApps.filter(a => a.status === 'PENDING').length
  const approvedCount = studentApps.filter(a => a.status === 'APPROVED').length

  // Fee collection: count approved students × 2000 LKR (approximate, real amount comes from total_amount_lkr)
  // For accuracy, re-fetch with amount
  const feeResult = await db
    .from('student_applications')
    .select('total_amount_lkr')
    .eq('status', 'APPROVED')
  const feeRows = (feeResult.data ?? []) as { total_amount_lkr: number }[]
  const totalFeeLkr = feeRows.reduce((sum, r) => sum + (r.total_amount_lkr ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
              SLKF Tournament System
            </span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">Head Master Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{p?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              Head Master
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">My Tournaments</p>
            <p className="text-3xl font-bold mt-1 text-red-600">{tournaments.length}</p>
            <p className="text-xs text-gray-400 mt-1">{openCount} open for registration</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total Students</p>
            <p className="text-3xl font-bold mt-1 text-blue-600">{studentApps.length}</p>
            <p className="text-xs text-gray-400 mt-1">{approvedCount} approved</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pending Review</p>
            <p className={`text-3xl font-bold mt-1 ${pendingCount > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
              {pendingCount}
            </p>
            <p className="text-xs text-gray-400 mt-1">awaiting verification</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Fees Collected</p>
            <p className="text-3xl font-bold mt-1 text-green-600">
              {totalFeeLkr > 0 ? `${(totalFeeLkr / 1000).toFixed(0)}k` : '0'}
            </p>
            <p className="text-xs text-gray-400 mt-1">LKR from approved students</p>
          </div>
        </div>

        {/* My tournaments list */}
        {tournaments.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">My Tournaments</h2>
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
              {tournaments.map(t => {
                const apps = studentApps.filter(a => a.tournament_id === t.id)
                const pending = apps.filter(a => a.status === 'PENDING').length
                const statusColors: Record<string, string> = {
                  OPEN:     'bg-green-50 text-green-700',
                  DRAFT:    'bg-yellow-50 text-yellow-700',
                  CLOSED:   'bg-gray-50 text-gray-600',
                  ARCHIVED: 'bg-gray-50 text-gray-400',
                }
                return (
                  <div key={t.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[t.status] ?? 'bg-gray-50 text-gray-500'}`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.code} · {apps.length} student{apps.length !== 1 ? 's' : ''}{pending > 0 ? ` · ${pending} pending` : ''}
                      </p>
                    </div>
                    <Link
                      href="/head-master/applications"
                      className="text-xs font-medium text-red-600 hover:text-red-700 shrink-0"
                    >
                      Manage →
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/head-master/tournaments"
            className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-red-200 hover:shadow-sm transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-red-50 rounded-lg mb-4 group-hover:bg-red-100 transition-colors">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">My Tournaments</h2>
            <p className="text-sm text-gray-500">Create and manage your tournaments independently.</p>
          </Link>

          <Link href="/head-master/applications"
            className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-red-200 hover:shadow-sm transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-50 rounded-lg mb-4 group-hover:bg-amber-100 transition-colors">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Student Applications</h2>
            <p className="text-sm text-gray-500">
              {pendingCount > 0
                ? <span className="text-amber-600 font-medium">{pendingCount} pending verification</span>
                : 'Verify payment receipts and approve students.'}
            </p>
          </Link>

          <Link href="/head-master/export"
            className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-red-200 hover:shadow-sm transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg mb-4 group-hover:bg-green-100 transition-colors">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Export to Excel</h2>
            <p className="text-sm text-gray-500">Download approved participant list to send to SLKF.</p>
          </Link>

          <Link href="/head-master/draw"
            className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-red-200 hover:shadow-sm transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-50 rounded-lg mb-4 group-hover:bg-purple-100 transition-colors">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 6h18M3 12h12M3 18h6M16 14l3 3 3-3M19 17V7" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Draw Engine</h2>
            <p className="text-sm text-gray-500">Generate and manage knockout brackets.</p>
          </Link>

          <Link href="/head-master/check-in"
            className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-red-200 hover:shadow-sm transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg mb-4 group-hover:bg-blue-100 transition-colors">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Competition Day Check-in</h2>
            <p className="text-sm text-gray-500">Scan QR codes and mark athlete attendance.</p>
          </Link>
        </div>
      </main>
    </div>
  )
}
