import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'

export const metadata: Metadata = { title: 'Admin Dashboard — SLKF' }

const NAV = [
  { href: '/admin/dashboard',     label: 'Overview' },
  { href: '/admin/tournaments',   label: 'Tournaments' },
  { href: '/admin/associations',  label: 'Associations' },
  { href: '/admin/registrations', label: 'Registrations' },
  { href: '/admin/students',      label: 'Students' },
  { href: '/admin/system',        label: 'System' },
]

function StatCard({ label, value, sub, color }: {
  label: string; value: number | string; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profileResult = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  const profile = profileResult.data as { full_name: string; role: string } | null
  if (profile?.role !== 'super_admin') redirect('/unauthorized')

  const db = createAdminClient() as any

  const [
    tournamentsResult,
    associationsResult,
    applicationsResult,
    studentAppsResult,
    athletesResult,
  ] = await Promise.all([
    db.from('tournaments').select('status'),
    db.from('associations').select('id'),
    db.from('applications').select('status'),
    db.from('student_applications').select('status'),
    db.from('athletes').select('id'),
  ])

  const tournaments = (tournamentsResult.data ?? []) as { status: string }[]
  const associations = (associationsResult.data ?? []) as { id: string }[]
  const applications = (applicationsResult.data ?? []) as { status: string }[]
  const studentApps = (studentAppsResult.data ?? []) as { status: string }[]
  const athletes = (athletesResult.data ?? []) as { id: string }[]

  const openTournaments = tournaments.filter(t => t.status === 'OPEN').length
  const pendingApps = applications.filter(a => a.status === 'SUBMITTED' || a.status === 'PENDING_VERIFICATION').length
  const approvedApps = applications.filter(a => a.status === 'APPROVED').length
  const pendingStudents = studentApps.filter(a => a.status === 'PENDING').length
  const approvedStudents = studentApps.filter(a => a.status === 'APPROVED').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">SLKF Admin</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">System Overview</h1>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map(n => (
                <Link key={n.href} href={n.href}
                  className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  {n.label}
                </Link>
              ))}
            </nav>
            <span className="text-sm text-gray-600 hidden sm:inline">{profile?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
              Super Admin
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Tournaments" value={tournaments.length}
            sub={`${openTournaments} open`} color="text-indigo-600" />
          <StatCard label="Associations" value={associations.length}
            sub="registered" color="text-blue-600" />
          <StatCard label="Applications" value={applications.length}
            sub={`${pendingApps} pending · ${approvedApps} approved`} color="text-amber-600" />
          <StatCard label="Student Applications" value={studentApps.length}
            sub={`${pendingStudents} pending · ${approvedStudents} approved`} color="text-green-600" />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/tournaments"
            className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-indigo-200 hover:shadow-sm transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-50 rounded-lg mb-4 group-hover:bg-indigo-100 transition-colors">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Tournaments & Draws</h2>
            <p className="text-sm text-gray-500">{tournaments.length} tournaments · view brackets and live results.</p>
          </Link>

          <Link href="/admin/associations"
            className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-indigo-200 hover:shadow-sm transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-50 rounded-lg mb-4 group-hover:bg-indigo-100 transition-colors">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Associations</h2>
            <p className="text-sm text-gray-500">{associations.length} registered associations.</p>
          </Link>

          <Link href="/admin/registrations"
            className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-indigo-200 hover:shadow-sm transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-50 rounded-lg mb-4 group-hover:bg-indigo-100 transition-colors">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Registrations</h2>
            <p className="text-sm text-gray-500">{applications.length} total applications across all tournaments.</p>
          </Link>

          <Link href="/admin/students"
            className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-indigo-200 hover:shadow-sm transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-50 rounded-lg mb-4 group-hover:bg-indigo-100 transition-colors">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Students</h2>
            <p className="text-sm text-gray-500">{studentApps.length} student applications · {athletes.length} roster athletes.</p>
          </Link>

          <Link href="/admin/system"
            className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-indigo-200 hover:shadow-sm transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-50 rounded-lg mb-4 group-hover:bg-indigo-100 transition-colors">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">System Flow</h2>
            <p className="text-sm text-gray-500">Visual overview of how the full tournament workflow operates end-to-end.</p>
          </Link>
        </div>
      </main>
    </div>
  )
}
