import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import TournamentForm from '@/components/tournaments/TournamentForm'
import StatusBadge from '@/components/tournaments/StatusBadge'
import type { Tournament } from '@/types/database'

export const metadata: Metadata = { title: 'Edit Tournament — SLKF Head Master' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditTournamentPage({ params }: Props) {
  const { id } = await params

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

  const result = await db.from('tournaments').select('*').eq('id', id).single()
  if (result.error || !result.data) notFound()
  const tournament = result.data as Tournament

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">SLKF Tournament System</span>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-lg font-bold text-gray-900">{tournament.name}</h1>
              <StatusBadge status={tournament.status} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/head-master/tournaments" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ← Back to Tournaments
            </Link>
            <span className="text-sm text-gray-600">{p?.full_name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-100 p-8">
          <TournamentForm initialData={tournament} tournamentId={id} />
        </div>
      </main>
    </div>
  )
}
