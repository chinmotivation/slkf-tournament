import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'
import type { StudentApplicationStatus } from '@/types/database'

export const metadata: Metadata = { title: 'Students — SLKF Admin' }

const NAV = [
  { href: '/admin/dashboard',     label: 'Overview' },
  { href: '/admin/tournaments',   label: 'Tournaments' },
  { href: '/admin/associations',  label: 'Associations' },
  { href: '/admin/registrations', label: 'Registrations' },
  { href: '/admin/students',      label: 'Students' },
  { href: '/admin/system',        label: 'System' },
]

const STATUS_STYLE: Record<StudentApplicationStatus, string> = {
  PENDING:  'bg-yellow-50 text-yellow-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
}

type StudentAppRow = {
  id: string
  full_name: string
  gender: 'MALE' | 'FEMALE'
  age_category_code: string
  status: StudentApplicationStatus
  total_amount_lkr: number
  created_at: string
  student_number: string | null
  tournament_id: string
  tournaments: { id: string; name: string; code: string; owner_id: string | null } | null
}

type TournamentHMRow = {
  id: string
  name: string
  code: string
  status: string
  owner_id: string | null
  profiles: { full_name: string } | null
}

export default async function AdminStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profileResult = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  const profile = profileResult.data as { full_name: string; role: string } | null
  if (profile?.role !== 'super_admin') redirect('/unauthorized')

  const db = createAdminClient() as any

  const [appsResult, tournamentsResult] = await Promise.all([
    db
      .from('student_applications')
      .select('id, full_name, gender, age_category_code, status, total_amount_lkr, created_at, student_number, tournament_id, tournaments(id, name, code, owner_id)')
      .order('created_at', { ascending: false }),
    db
      .from('tournaments')
      .select('id, name, code, status, owner_id, profiles!tournaments_owner_id_fkey(full_name)')
      .order('created_at', { ascending: false }),
  ])

  const apps = (appsResult.data ?? []) as StudentAppRow[]
  const tournaments = (tournamentsResult.data ?? []) as TournamentHMRow[]

  const pending = apps.filter(a => a.status === 'PENDING').length
  const approved = apps.filter(a => a.status === 'APPROVED').length
  const rejected = apps.filter(a => a.status === 'REJECTED').length
  const totalRevenue = apps.filter(a => a.status === 'APPROVED').reduce((s, a) => s + a.total_amount_lkr, 0)

  // Group tournaments by HM
  const hmGroups = new Map<string, { hmName: string; tournaments: TournamentHMRow[] }>()
  for (const t of tournaments) {
    const key = t.owner_id ?? '__unassigned__'
    const hmName = t.profiles?.full_name ?? 'Unassigned'
    if (!hmGroups.has(key)) hmGroups.set(key, { hmName, tournaments: [] })
    hmGroups.get(key)!.tournaments.push(t)
  }

  // Per-tournament student counts
  const appsByTournament = new Map<string, StudentAppRow[]>()
  for (const a of apps) {
    if (!appsByTournament.has(a.tournament_id)) appsByTournament.set(a.tournament_id, [])
    appsByTournament.get(a.tournament_id)!.push(a)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">SLKF Admin</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">Student Applications — Consolidated</h1>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map(n => (
                <Link key={n.href} href={n.href}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    n.href === '/admin/students'
                      ? 'text-indigo-700 bg-indigo-50 font-medium'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
              Super Admin
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Students', value: apps.length, color: 'text-gray-800' },
            { label: 'Pending', value: pending, color: 'text-yellow-700' },
            { label: 'Approved', value: approved, color: 'text-green-700' },
            { label: 'Revenue (LKR)', value: totalRevenue.toLocaleString(), color: 'text-indigo-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Consolidated view — grouped by Head Master */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            By Head Master — {hmGroups.size} organiser{hmGroups.size !== 1 ? 's' : ''}
          </h2>
          <div className="space-y-4">
            {hmGroups.size === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                No tournaments created yet.
              </div>
            )}
            {Array.from(hmGroups.entries()).map(([ownerId, group]) => {
              const groupApps = group.tournaments.flatMap(t => appsByTournament.get(t.id) ?? [])
              const groupApproved = groupApps.filter(a => a.status === 'APPROVED').length
              const groupPending  = groupApps.filter(a => a.status === 'PENDING').length
              const groupRevenue  = groupApps.filter(a => a.status === 'APPROVED').reduce((s, a) => s + a.total_amount_lkr, 0)

              return (
                <div key={ownerId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {/* HM header */}
                  <div className="px-5 py-4 bg-red-50 border-b border-red-100 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          Head Master
                        </span>
                        <p className="font-semibold text-gray-900">{group.hmName}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {group.tournaments.length} tournament{group.tournaments.length !== 1 ? 's' : ''} ·{' '}
                        {groupApps.length} student{groupApps.length !== 1 ? 's' : ''} ·{' '}
                        {groupApproved} approved
                        {groupPending > 0 ? ` · ${groupPending} pending` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-700">LKR {groupRevenue.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">collected</p>
                    </div>
                  </div>

                  {/* Tournament rows */}
                  {group.tournaments.map(t => {
                    const tApps = appsByTournament.get(t.id) ?? []
                    const tApproved = tApps.filter(a => a.status === 'APPROVED').length
                    const tPending  = tApps.filter(a => a.status === 'PENDING').length
                    const tRevenue  = tApps.filter(a => a.status === 'APPROVED').reduce((s, a) => s + a.total_amount_lkr, 0)
                    const statusColor: Record<string, string> = {
                      OPEN: 'text-green-600', DRAFT: 'text-yellow-600',
                      CLOSED: 'text-gray-500', ARCHIVED: 'text-gray-400',
                    }
                    return (
                      <div key={t.id} className="px-5 py-3 border-b border-gray-50 last:border-b-0 flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{t.name}</p>
                            <span className={`text-xs font-medium ${statusColor[t.status] ?? 'text-gray-500'}`}>
                              {t.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {t.code} · {tApps.length} students · {tApproved} approved{tPending > 0 ? ` · ${tPending} pending` : ''}
                          </p>
                        </div>
                        {tRevenue > 0 && (
                          <p className="text-sm font-semibold text-gray-700 shrink-0">
                            LKR {tRevenue.toLocaleString()}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Full applications table */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">All Students</h2>
          {apps.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
              No student applications yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Tournament</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Category</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app, i) => (
                    <tr key={app.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{app.full_name}</p>
                        <p className="text-xs text-gray-400">
                          {app.gender === 'MALE' ? 'Male' : 'Female'}
                          {app.student_number ? ` · ${app.student_number}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                        <p>{app.tournaments?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{app.tournaments?.code}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                        {app.age_category_code}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-right text-gray-700 font-medium">
                        {app.total_amount_lkr.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[app.status]}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                        {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rejected > 0 && (
            <p className="text-xs text-gray-400 text-right mt-2">{rejected} rejected application{rejected !== 1 ? 's' : ''} not included in revenue.</p>
          )}
        </div>

      </main>
    </div>
  )
}
