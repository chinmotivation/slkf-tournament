import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'
import type { ApplicationStatus } from '@/types/database'

export const metadata: Metadata = { title: 'Registrations — SLKF Admin' }

const NAV = [
  { href: '/admin/dashboard',     label: 'Overview' },
  { href: '/admin/associations',  label: 'Associations' },
  { href: '/admin/registrations', label: 'Registrations' },
  { href: '/admin/students',      label: 'Students' },
]

const STATUS_STYLE: Record<string, string> = {
  DRAFT:                'bg-gray-100 text-gray-600',
  SUBMITTED:            'bg-blue-50 text-blue-700',
  PENDING_VERIFICATION: 'bg-yellow-50 text-yellow-700',
  APPROVED:             'bg-green-50 text-green-700',
  REJECTED:             'bg-red-50 text-red-700',
}

type AppRow = {
  id: string
  status: ApplicationStatus
  submitted_at: string | null
  updated_at: string
  tournaments: { name: string; code: string; year: number } | null
  associations: { association_name: string; district: string } | null
}

export default async function AdminRegistrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profileResult = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  const profile = profileResult.data as { full_name: string; role: string } | null
  if (profile?.role !== 'super_admin') redirect('/unauthorized')

  const db = createAdminClient() as any

  const appsResult = await db
    .from('applications')
    .select('id, status, submitted_at, updated_at, tournaments(name, code, year), associations(association_name, district)')
    .order('updated_at', { ascending: false })

  const applications = (appsResult.data ?? []) as AppRow[]

  // Count individual entries per application
  const appIds = applications.map(a => a.id)
  let entryCounts: Record<string, number> = {}
  if (appIds.length > 0) {
    const entriesResult = await db
      .from('individual_entries')
      .select('application_id')
      .in('application_id', appIds)
      .is('deleted_at', null)
    for (const e of (entriesResult.data ?? []) as { application_id: string }[]) {
      entryCounts[e.application_id] = (entryCounts[e.application_id] ?? 0) + 1
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">SLKF Admin</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">Registrations</h1>
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
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
              Super Admin
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <p className="text-sm text-gray-500 mb-4">{applications.length} total application{applications.length !== 1 ? 's' : ''}</p>

        {applications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
            No applications yet.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tournament</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Association</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Athletes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, i) => (
                  <tr key={app.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{app.tournaments?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{app.tournaments?.code} · {app.tournaments?.year}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{app.associations?.association_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{app.associations?.district}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 hidden md:table-cell">
                      {entryCounts[app.id] ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[app.status] ?? STATUS_STYLE.DRAFT}`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {app.submitted_at
                        ? new Date(app.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
