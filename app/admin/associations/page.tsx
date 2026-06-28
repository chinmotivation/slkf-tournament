import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'
import type { Association } from '@/types/database'

export const metadata: Metadata = { title: 'Associations — SLKF Admin' }

const NAV = [
  { href: '/admin/dashboard',     label: 'Overview' },
  { href: '/admin/associations',  label: 'Associations' },
  { href: '/admin/registrations', label: 'Registrations' },
  { href: '/admin/students',      label: 'Students' },
]

type AssocRow = Association & { profiles: { full_name: string; is_active: boolean } | null }

export default async function AdminAssociationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profileResult = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  const profile = profileResult.data as { full_name: string; role: string } | null
  if (profile?.role !== 'super_admin') redirect('/unauthorized')

  const db = createAdminClient() as any

  const result = await db
    .from('associations')
    .select('*, profiles(full_name, is_active)')
    .order('association_name')

  const associations = (result.data ?? []) as AssocRow[]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">SLKF Admin</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">Associations</h1>
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
        <p className="text-sm text-gray-500 mb-4">{associations.length} registered association{associations.length !== 1 ? 's' : ''}</p>

        {associations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
            No associations registered yet.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Association</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">District / Province</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Reg. Number</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Instructor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {associations.map((assoc, i) => {
                  const userActive = assoc.profiles?.is_active ?? true
                  return (
                    <tr key={assoc.id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{assoc.association_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{assoc.profiles?.full_name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                        {assoc.district}, {assoc.province}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500 font-mono text-xs">
                        {assoc.slkf_registration_number}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                        {assoc.instructor_name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {assoc.is_profile_complete ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                              Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700">
                              Incomplete
                            </span>
                          )}
                          {!userActive && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                              Deactivated
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
