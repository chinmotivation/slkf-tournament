import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'

export const metadata: Metadata = {
  title: 'Dashboard — SLKF Association',
}

export default async function AssociationDashboard() {
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
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">Association Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{profile?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
              Association Rep
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-700 mb-1">Dashboard coming in Step 07</h2>
          <p className="text-sm text-gray-400">
            Athlete registration, team kata entry, and payment submission will be built here.
          </p>
        </div>
      </main>
    </div>
  )
}
