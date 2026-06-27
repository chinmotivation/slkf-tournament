import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TournamentTable from '@/components/tournaments/TournamentTable'
import type { Tournament } from '@/types/database'

export const metadata: Metadata = { title: 'Tournaments — SLKF Head Master' }

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Published', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
]

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function HeadMasterTournamentsPage({ searchParams }: Props) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profileResult = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  const p = profileResult.data as { full_name: string; role: string } | null
  if (p?.role !== 'head_master') redirect('/unauthorized')

  const { status } = await searchParams
  const activeStatus = STATUS_FILTERS.find(f => f.value === status)?.value ?? 'all'

  let query = db.from('tournaments').select('*').order('created_at', { ascending: false })
  if (activeStatus !== 'all') {
    query = query.eq('status', activeStatus)
  }
  const result = await query
  const tournaments = (result.data ?? []) as Tournament[]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">SLKF Tournament System</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">Tournaments</h1>
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

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {STATUS_FILTERS.map(f => (
              <Link
                key={f.value}
                href={f.value === 'all' ? '/head-master/tournaments' : `/head-master/tournaments?status=${f.value}`}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeStatus === f.value
                    ? 'bg-red-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
          <Link
            href="/head-master/tournaments/create"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Tournament
          </Link>
        </div>

        <TournamentTable tournaments={tournaments} />
      </main>
    </div>
  )
}
