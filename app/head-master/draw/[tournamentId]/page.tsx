import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Tournament, DrawBracket } from '@/types/database'
import DrawCategoryTable from './DrawCategoryTable'

export const metadata: Metadata = { title: 'Draw Brackets — SLKF Head Master' }

interface Props {
  params: Promise<{ tournamentId: string }>
}

export default async function DrawTournamentPage({ params }: Props) {
  const { tournamentId } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  const p = profile as { full_name: string; role: string } | null
  if (p?.role !== 'head_master') redirect('/unauthorized')

  const { data: tourn } = await db
    .from('tournaments')
    .select('id, name, code, year, status')
    .eq('id', tournamentId)
    .single()

  if (!tourn) notFound()
  const tournament = tourn as Pick<Tournament, 'id' | 'name' | 'code' | 'year' | 'status'>

  const { data: bracketsData } = await db
    .from('draw_brackets')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('age_group_code')
    .order('gender')
    .order('event')
    .order('kata_level', { nullsFirst: true })
    .order('weight_class_label', { nullsFirst: true })

  const brackets = (bracketsData ?? []) as DrawBracket[]

  const totalAthletes = brackets.reduce((s, b) => s + b.participant_count, 0)
  const lockedCount   = brackets.filter(b => b.status !== 'PREVIEW').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
              <Link href="/head-master/draw" className="hover:text-gray-600 transition-colors">Draw Engine</Link>
              <span>/</span>
              <span className="font-mono text-gray-500">{tournament.code}</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">{tournament.name}</h1>
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

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Categories</p>
            <p className="text-2xl font-bold text-gray-900">{brackets.length}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Total Athletes</p>
            <p className="text-2xl font-bold text-gray-900">{totalAthletes}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Locked Brackets</p>
            <p className="text-2xl font-bold text-gray-900">
              {lockedCount}
              <span className="text-sm font-normal text-gray-400 ml-1">/ {brackets.length}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Brackets auto-update as applications are approved. Counts refresh instantly.
          </p>
          <div className="flex items-center gap-2">
            {lockedCount > 0 && (
              <Link
                href={`/results/${tournamentId}`}
                className="text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                View Results →
              </Link>
            )}
            <Link
              href={`/head-master/draw/${tournamentId}`}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              Refresh
            </Link>
          </div>
        </div>

        <DrawCategoryTable brackets={brackets} tournamentId={tournamentId} />
      </main>
    </div>
  )
}
