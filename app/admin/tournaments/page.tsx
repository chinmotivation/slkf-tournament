import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import type { Tournament } from '@/types/database'

export const metadata: Metadata = { title: 'Tournaments — SLKF Admin' }

const NAV = [
  { href: '/admin/dashboard',     label: 'Overview' },
  { href: '/admin/tournaments',   label: 'Tournaments' },
  { href: '/admin/associations',  label: 'Associations' },
  { href: '/admin/registrations', label: 'Registrations' },
  { href: '/admin/students',      label: 'Students' },
]

const STATUS_LABEL: Record<string, string> = {
  DRAFT:    'Draft',
  OPEN:     'Open',
  CLOSED:   'Closed',
  ARCHIVED: 'Archived',
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT:    'bg-gray-100 text-gray-600',
  OPEN:     'bg-green-100 text-green-700',
  CLOSED:   'bg-amber-100 text-amber-700',
  ARCHIVED: 'bg-gray-100 text-gray-400',
}

export default async function AdminTournamentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  const p = profile as { full_name: string; role: string } | null
  if (p?.role !== 'super_admin') redirect('/unauthorized')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const { data } = await db
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  const tournaments = (data ?? []) as Tournament[]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">SLKF Admin</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">Tournaments</h1>
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
            <span className="text-sm text-gray-600 hidden sm:inline">{p?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
              Super Admin
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">All tournaments — read-only view.</p>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {tournaments.length} total
          </span>
        </div>

        {tournaments.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <p className="text-sm text-gray-400">No tournaments yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/60">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Tournament</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Code</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Year</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Draw</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tournaments.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-gray-900">{t.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-gray-500">{t.code}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-gray-600">{t.year}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/admin/tournaments/${t.id}/draw`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        View Draw →
                      </Link>
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
