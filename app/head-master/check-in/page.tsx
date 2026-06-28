import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import type { Tournament } from '@/types/database'

export const metadata: Metadata = { title: 'Check-in — SLKF Head Master' }

export default async function CheckInLandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  const p = profile as { full_name: string; role: string } | null
  if (p?.role !== 'head_master') redirect('/unauthorized')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const { data } = await db
    .from('tournaments')
    .select('id, name, code, year, status, competition_start_date')
    .in('status', ['OPEN', 'CLOSED'])
    .order('created_at', { ascending: false })

  const tournaments = (data ?? []) as Pick<Tournament, 'id' | 'name' | 'code' | 'year' | 'status' | 'competition_start_date'>[]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">SLKF Tournament System</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">Athlete Check-in</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/head-master/dashboard" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ← Dashboard
            </Link>
            <span className="text-sm text-gray-600">{p?.full_name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-sm text-gray-500 mb-6">
          Select a tournament to begin scanning athlete QR codes or search manually.
        </p>

        {tournaments.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No open or closed tournaments found.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tournaments.map(t => (
              <Link
                key={t.id}
                href={`/head-master/check-in/${t.id}`}
                className="bg-white rounded-xl border border-gray-100 p-6 hover:border-red-200 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">{t.code} · {t.year}</p>
                    <h2 className="text-base font-bold text-gray-900 mt-0.5 group-hover:text-red-700 transition-colors">
                      {t.name}
                    </h2>
                    {t.competition_start_date && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(t.competition_start_date).toLocaleDateString('en-LK', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    t.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 group-hover:text-red-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.243m-4.243 0L9.757 9.757M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Open check-in scanner →
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
