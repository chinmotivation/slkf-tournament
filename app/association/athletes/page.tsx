import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AthletesClient from './AthletesClient'
import type { Athlete } from '@/types/database'

export const metadata: Metadata = { title: 'Athletes — SLKF Association' }

export default async function AthletesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profileResult = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  const profile = profileResult.data as { full_name: string; role: string } | null
  if (profile?.role !== 'association_rep') redirect('/unauthorized')

  const db = supabase as any

  const assocResult = await supabase
    .from('associations')
    .select('id')
    .eq('user_id', user.id)
    .single()
  const assoc = assocResult.data as { id: string } | null

  let athletes: Athlete[] = []
  if (assoc) {
    const result = await db
      .from('athletes')
      .select('*')
      .eq('association_id', assoc.id)
      .order('full_name')
    athletes = (result.data ?? []) as Athlete[]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/association/dashboard"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Athletes</h1>
            <p className="text-xs text-gray-500">Manage your association&apos;s athlete roster</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:inline">{profile?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
              Association Rep
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5">
        {!assoc ? (
          <div className="bg-white rounded-xl border border-yellow-200 bg-yellow-50 p-8 text-center">
            <p className="text-sm font-medium text-yellow-800 mb-1">Association profile not set up</p>
            <p className="text-xs text-yellow-600">Complete your association profile before managing athletes.</p>
          </div>
        ) : (
          <AthletesClient athletes={athletes} />
        )}
      </main>
    </div>
  )
}
