import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TournamentForm from '@/components/tournaments/TournamentForm'

export const metadata: Metadata = { title: 'New Tournament — SLKF Head Master' }

export default async function CreateTournamentPage() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">SLKF Tournament System</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">New Tournament</h1>
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
          <TournamentForm />
        </div>
      </main>
    </div>
  )
}
