import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'

export const metadata: Metadata = { title: 'Dashboard — SLKF Head Master' }

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

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

  const [tournamentsResult, studentAppsResult] = await Promise.all([
    db.from('tournaments').select('id, name, code, status').order('created_at', { ascending: false }),
    db.from('student_applications').select('id, tournament_id, status'),
  ])

  const tournaments = (tournamentsResult.data ?? []) as { id: string; name: string; code: string; status: string }[]
  const studentApps = (studentAppsResult.data ?? []) as { id: string; tournament_id: string; status: string }[]

  const openCount     = tournaments.filter(t => t.status === 'OPEN').length
  const pendingCount  = studentApps.filter(a => a.status === 'PENDING').length
  const approvedCount = studentApps.filter(a => a.status === 'APPROVED').length

  const feeResult = await db
    .from('student_applications')
    .select('total_amount_lkr')
    .eq('status', 'APPROVED')
  const feeRows = (feeResult.data ?? []) as { total_amount_lkr: number }[]
  const totalFeeLkr = feeRows.reduce((sum: number, r: { total_amount_lkr: number }) => sum + (r.total_amount_lkr ?? 0), 0)

  const firstName = p?.full_name?.split(' ')[0] ?? 'Coach'

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="page-header sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-9 h-9 bg-red-600 rounded-xl shrink-0">
              <span className="text-white text-[11px] font-black tracking-tighter">SLKF</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.1em] leading-none mb-0.5">
                Tournament System
              </p>
              <h1 className="text-sm font-bold text-gray-900 leading-none">Head Master Portal</h1>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: 'Tournaments', href: '/head-master/tournaments' },
              { label: 'Applications', href: '/head-master/applications' },
              { label: 'Draw Engine', href: '/head-master/draw' },
              { label: 'Check-in', href: '/head-master/check-in' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            {p?.full_name && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-red-700">{initials(p.full_name)}</span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden lg:block">{p.full_name}</span>
              </div>
            )}
            <span className="badge bg-red-100 text-red-700 hidden sm:inline-flex">Head Master</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Welcome + CTA ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Hello, {firstName}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Here&apos;s an overview of your tournaments.</p>
          </div>
          <Link href="/head-master/tournaments/new" className="btn btn-primary btn-md shrink-0 hidden sm:inline-flex">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Tournament
          </Link>
        </div>

        {/* ── Stats grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="stat-card" style={{ '--stat-color': '#dc2626' } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Tournaments</p>
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900">{tournaments.length}</p>
            <p className="text-xs text-gray-400 mt-1">{openCount} open for registration</p>
          </div>

          <div className="stat-card" style={{ '--stat-color': '#3b82f6' } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Students</p>
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900">{studentApps.length}</p>
            <p className="text-xs text-gray-400 mt-1">{approvedCount} approved</p>
          </div>

          <div className="stat-card" style={{ '--stat-color': pendingCount > 0 ? '#f59e0b' : '#d1d5db' } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Pending</p>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${pendingCount > 0 ? 'bg-amber-50' : 'bg-gray-100'}`}>
                <svg className={`w-3.5 h-3.5 ${pendingCount > 0 ? 'text-amber-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className={`text-3xl font-black ${pendingCount > 0 ? 'text-amber-500' : 'text-gray-400'}`}>{pendingCount}</p>
            <p className="text-xs text-gray-400 mt-1">awaiting verification</p>
          </div>

          <div className="stat-card" style={{ '--stat-color': '#22c55e' } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Fees (LKR)</p>
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900">
              {totalFeeLkr > 0 ? `${(totalFeeLkr / 1000).toFixed(0)}k` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">from approved students</p>
          </div>
        </div>

        {/* ── Tournament list ────────────────────────────────────────────────── */}
        {tournaments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.1em]">My Tournaments</h2>
              <Link href="/head-master/tournaments" className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors">
                View all →
              </Link>
            </div>
            <div className="card overflow-hidden">
              {tournaments.map((t, i) => {
                const apps      = studentApps.filter(a => a.tournament_id === t.id)
                const pending   = apps.filter(a => a.status === 'PENDING').length
                const statusCls: Record<string, string> = {
                  OPEN:     'bg-green-100 text-green-700',
                  DRAFT:    'bg-amber-100 text-amber-700',
                  CLOSED:   'bg-gray-100 text-gray-600',
                  ARCHIVED: 'bg-gray-100 text-gray-400',
                }
                return (
                  <div
                    key={t.id}
                    className={`px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors ${
                      i < tournaments.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm truncate">{t.name}</p>
                        <span className={`badge text-[10px] ${statusCls[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {t.status}
                        </span>
                        {pending > 0 && (
                          <span className="badge bg-amber-100 text-amber-700 text-[10px]">
                            {pending} pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.code} · {apps.length} student{apps.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Link
                      href="/head-master/applications"
                      className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700 shrink-0"
                    >
                      Manage →
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Quick actions ──────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.1em] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <Link href="/head-master/tournaments" className="action-card group">
              <div className="inline-flex items-center justify-center w-11 h-11 bg-red-50 rounded-xl mb-4 group-hover:bg-red-100 transition-colors">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">My Tournaments</h3>
              <p className="text-sm text-gray-500">Create and manage your tournaments independently.</p>
            </Link>

            <Link href="/head-master/applications" className="action-card group">
              <div className="inline-flex items-center justify-center w-11 h-11 bg-amber-50 rounded-xl mb-4 group-hover:bg-amber-100 transition-colors">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Student Applications</h3>
              <p className="text-sm text-gray-500">
                {pendingCount > 0
                  ? <span className="text-amber-600 font-semibold">{pendingCount} pending verification</span>
                  : 'Verify payment receipts and approve students.'}
              </p>
            </Link>

            <Link href="/head-master/draw" className="action-card group">
              <div className="inline-flex items-center justify-center w-11 h-11 bg-purple-50 rounded-xl mb-4 group-hover:bg-purple-100 transition-colors">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 6h18M3 12h12M3 18h6M16 14l3 3 3-3M19 17V7" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Draw Engine</h3>
              <p className="text-sm text-gray-500">Generate and manage official knockout brackets.</p>
            </Link>

            <Link href="/head-master/check-in" className="action-card group">
              <div className="inline-flex items-center justify-center w-11 h-11 bg-blue-50 rounded-xl mb-4 group-hover:bg-blue-100 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Competition Day Check-in</h3>
              <p className="text-sm text-gray-500">Scan QR codes and mark athlete attendance.</p>
            </Link>

            <Link href="/head-master/export" className="action-card group">
              <div className="inline-flex items-center justify-center w-11 h-11 bg-green-50 rounded-xl mb-4 group-hover:bg-green-100 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Export to Excel</h3>
              <p className="text-sm text-gray-500">Download approved participant list for SLKF.</p>
            </Link>

          </div>
        </div>

      </main>
    </div>
  )
}
