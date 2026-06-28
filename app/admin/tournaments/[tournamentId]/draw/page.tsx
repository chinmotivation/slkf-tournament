import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import type { Tournament, DrawBracket } from '@/types/database'

export const metadata: Metadata = { title: 'Draw Brackets — SLKF Admin' }

interface Props {
  params: Promise<{ tournamentId: string }>
}

const STATUS_LABEL: Record<string, string> = {
  PREVIEW:     'Preview',
  LOCKED:      'Locked',
  IN_PROGRESS: 'In Progress',
  COMPLETE:    'Complete',
}

const STATUS_COLOR: Record<string, string> = {
  PREVIEW:     'bg-blue-100 text-blue-700',
  LOCKED:      'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETE:    'bg-gray-100 text-gray-500',
}

const EVENT_COLOR: Record<string, string> = {
  KATA:   'bg-purple-100 text-purple-700',
  KUMITE: 'bg-red-100 text-red-700',
}

function categoryLabel(b: DrawBracket): string {
  const gender = b.gender === 'MALE' ? 'Male' : 'Female'
  const sub = b.event === 'KATA'
    ? (b.kata_level ? b.kata_level.replace(/_/g, ' ') : 'All Levels')
    : (b.weight_class_label ?? 'Open Weight')
  return `${b.age_group_code} · ${gender} · ${b.event} · ${sub}`
}

export default async function AdminDrawTournamentPage({ params }: Props) {
  const { tournamentId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  const p = profile as { full_name: string; role: string } | null
  if (p?.role !== 'super_admin') redirect('/unauthorized')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  const { data: tournRow } = await db
    .from('tournaments').select('id, name, code, year, status')
    .eq('id', tournamentId).single()
  if (!tournRow) notFound()
  const tournament = tournRow as Pick<Tournament, 'id' | 'name' | 'code' | 'year' | 'status'>

  const { data: bracketsData } = await db
    .from('draw_brackets').select('*')
    .eq('tournament_id', tournamentId)
    .order('age_group_code')
    .order('gender')
    .order('event')
    .order('kata_level', { nullsFirst: true })
    .order('weight_class_label', { nullsFirst: true })

  const brackets = (bracketsData ?? []) as DrawBracket[]
  const kata   = brackets.filter(b => b.event === 'KATA')
  const kumite = brackets.filter(b => b.event === 'KUMITE')

  const totalAthletes = brackets.reduce((s, b) => s + b.participant_count, 0)
  const lockedCount   = brackets.filter(b => b.status !== 'PREVIEW').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
              <Link href="/admin/tournaments" className="hover:text-gray-600 transition-colors">Tournaments</Link>
              <span>/</span>
              <span className="font-mono text-gray-500">{tournament.code}</span>
              <span>/</span>
              <span className="text-gray-600">Draw</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">{tournament.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/tournaments" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ← Tournaments
            </Link>
            <span className="text-sm text-gray-600 hidden sm:inline">{p?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
              Super Admin
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Read-only notice */}
        <div className="flex items-center justify-between gap-3 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <span>👁</span>
            <span>Observer view — results and bracket management are head master only.</span>
          </div>
          {lockedCount > 0 && (
            <Link
              href={`/results/${tournamentId}`}
              className="font-medium text-emerald-700 hover:text-emerald-800 transition-colors flex-shrink-0"
            >
              View Results →
            </Link>
          )}
        </div>

        {/* Summary */}
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

        {/* Bracket tables */}
        {brackets.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <p className="text-sm text-gray-400">No brackets found for this tournament.</p>
            <p className="text-xs text-gray-400 mt-1">Brackets appear when applications are approved by the head master.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {[{ label: 'Kata', rows: kata }, { label: 'Kumite', rows: kumite }].map(({ label, rows }) =>
              rows.length === 0 ? null : (
                <section key={label}>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{label}</h2>
                  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-50 bg-gray-50/60">
                          <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Category</th>
                          <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Athletes</th>
                          <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Bracket</th>
                          <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Byes</th>
                          <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                          <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">View</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows.map(b => (
                          <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${EVENT_COLOR[b.event] ?? ''}`}>
                                  {b.event}
                                </span>
                                <span className="text-gray-800 font-medium">{categoryLabel(b)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="text-gray-900 font-semibold">{b.participant_count}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center text-gray-600">
                              {b.bracket_size > 0 ? b.bracket_size : '—'}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={b.bye_count > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                                {b.bracket_size > 0 ? b.bye_count : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[b.status] ?? ''}`}>
                                {STATUS_LABEL[b.status] ?? b.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              {b.generated_at ? (
                                <Link
                                  href={`/admin/tournaments/${tournamentId}/draw/${b.id}`}
                                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                                >
                                  View Bracket
                                </Link>
                              ) : (
                                <span className="text-xs text-gray-300">Not generated</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )
            )}
          </div>
        )}
      </main>
    </div>
  )
}
