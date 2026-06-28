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
  { href: '/admin/associations',  label: 'Associations' },
  { href: '/admin/registrations', label: 'Registrations' },
  { href: '/admin/students',      label: 'Students' },
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
  reviewed_at: string | null
  student_number: string | null
  tournaments: { name: string; code: string } | null
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

  const result = await db
    .from('student_applications')
    .select('id, full_name, gender, age_category_code, status, total_amount_lkr, created_at, reviewed_at, student_number, tournaments(name, code)')
    .order('created_at', { ascending: false })

  const apps = (result.data ?? []) as StudentAppRow[]

  const pending = apps.filter(a => a.status === 'PENDING').length
  const approved = apps.filter(a => a.status === 'APPROVED').length
  const rejected = apps.filter(a => a.status === 'REJECTED').length
  const totalRevenue = apps.filter(a => a.status === 'APPROVED').reduce((s, a) => s + a.total_amount_lkr, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">SLKF Admin</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">Student Applications</h1>
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

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: apps.length, color: 'text-gray-800' },
            { label: 'Pending', value: pending, color: 'text-yellow-700' },
            { label: 'Approved', value: approved, color: 'text-green-700' },
            { label: 'Revenue (LKR)', value: `${totalRevenue.toLocaleString()}`, color: 'text-indigo-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

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
          <p className="text-xs text-gray-400 text-right">{rejected} rejected application{rejected !== 1 ? 's' : ''} not included in revenue.</p>
        )}
      </main>
    </div>
  )
}
