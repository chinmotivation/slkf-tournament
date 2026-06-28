import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Tournament } from '@/types/database'

export const metadata: Metadata = { title: 'Draw Engine — SLKF Head Master' }

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-amber-100 text-amber-700',
  ARCHIVED: 'bg-gray-100 text-gray-400',
}

export default async function DrawIndexPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  const p = profile as { full_name: string; role: string } | null
  if (p?.role !== 'head_master') redirect('/unauthorized')

  const { data } = await db
    .from('tournaments')
    .select('id, name, code, year, status')
    .not('status', 'eq', 'ARCHIVED')
    .order('created_at', { ascending: false })

  const tournaments = (data ?? []) as Pick<Tournament, 'id' | 'name' | 'code' | 'year' | 'status'>[]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">SLKF Tournament System</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">Draw Engine</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/head-master/dashboard" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Dashboard
            </Link>
            <span className="text-sm text-gray-600">{p?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              Head Master
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <p className="text-sm text-gray-500 mb-6">
          Select a tournament to view its live knockout brackets.
        </p>

        {tournaments.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <p className="text-sm text-gray-500">No tournaments found.</p>
            <Link
              href="/head-master/tournaments/create"
              className="mt-4 inline-flex text-sm font-medium text-red-600 hover:text-red-700"
            >
              Create a tournament
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map(t => (
              <Link
                key={t.id}
                href={`/head-master/draw/${t.id}`}
                className="group bg-white rounded-xl border border-gray-100 p-5 hover:border-red-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-xs font-mono font-semibold text-gray-400">{t.code}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-gray-900 leading-snug mb-1">{t.name}</h2>
                <p className="text-xs text-gray-400">{t.year}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-red-600 group-hover:text-red-700">
                  View brackets
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
