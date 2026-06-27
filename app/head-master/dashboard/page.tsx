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

  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const profile = data as { full_name: string } | null

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
            <span className="text-sm text-gray-600">{profile?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              Head Master
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/head-master/tournaments"
            className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-red-200 hover:shadow-sm transition-all"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 bg-red-50 rounded-lg mb-4 group-hover:bg-red-100 transition-colors">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Tournaments</h2>
            <p className="text-sm text-gray-500">Create, edit, and publish tournaments.</p>
          </Link>

          <div className="bg-white rounded-xl border border-gray-100 p-6 opacity-60 cursor-not-allowed">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-50 rounded-lg mb-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-700 mb-1">Applications</h2>
            <p className="text-sm text-gray-400">Payment verification queue. Coming in Step 08.</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 opacity-60 cursor-not-allowed">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-50 rounded-lg mb-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-700 mb-1">Excel Export</h2>
            <p className="text-sm text-gray-400">Export tournament data. Coming in Step 10.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
