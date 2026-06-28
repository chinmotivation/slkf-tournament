import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { DrawBracket, DrawParticipant, BracketMatch } from '@/types/database'
import KataScoreTable from './KataScoreTable'

export const metadata: Metadata = { title: 'Kata Scoring — SLKF Referee' }

interface Props {
  params: Promise<{ bracketId: string }>
}

const STATUS_COLOR: Record<string, string> = {
  LOCKED:      'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETE:    'bg-gray-100 text-gray-600',
}

export default async function RefereeKataPage({ params }: Props) {
  const { bracketId } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  const p = profile as { full_name: string; role: string } | null
  if (p?.role !== 'referee') redirect('/unauthorized')

  const { data: bracketRow } = await db
    .from('draw_brackets').select('*, tournaments(name, code)').eq('id', bracketId).single()
  if (!bracketRow) notFound()

  const bracket = bracketRow as DrawBracket & { tournaments: { name: string; code: string } | null }

  // Referee can only access LOCKED / IN_PROGRESS / COMPLETE brackets
  if (bracket.status === 'PREVIEW') redirect('/referee/dashboard')

  // Kata only
  if (bracket.event !== 'KATA') redirect('/referee/dashboard')

  const { data: matchesData } = await db
    .from('bracket_matches')
    .select('*')
    .eq('bracket_id', bracketId)
    .order('round_number', { ascending: false })
    .order('position', { ascending: true })

  const matches = (matchesData ?? []) as BracketMatch[]

  const { data: participantsData } = await db
    .from('draw_participants')
    .select('id, full_name, association_name, is_bye')
    .eq('bracket_id', bracketId)

  type ParticipantInfo = Pick<DrawParticipant, 'id' | 'full_name' | 'association_name' | 'is_bye'>
  const participants = (participantsData ?? []) as ParticipantInfo[]
  const participantMap: Record<string, ParticipantInfo> = Object.fromEntries(
    participants.map(p => [p.id, p])
  )

  const gender = bracket.gender === 'MALE' ? 'Male' : 'Female'
  const sub = bracket.kata_level ? bracket.kata_level.replace(/_/g, ' ') : 'All Levels'
  const categoryLabel = `${bracket.age_group_code} · ${gender} · Kata · ${sub}`

  const finalMatch = matches.find(m => m.round_number === 1 && m.position === 1)
  const champion = finalMatch?.winner_id ? participantMap[finalMatch.winner_id] : null

  const pending = matches.filter(m => m.status === 'PENDING' && !m.participant1_id === false && !m.participant2_id === false).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
              <Link href="/referee/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="font-mono text-gray-500">{bracket.tournaments?.code ?? '—'}</span>
              <span>/</span>
              <span className="text-gray-600">{categoryLabel}</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">{categoryLabel}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/referee/dashboard" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ← Dashboard
            </Link>
            <span className="text-sm text-gray-600 hidden sm:inline">{p?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
              Referee
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Info strip */}
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[bracket.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {bracket.status}
          </span>
          <span className="text-sm text-gray-500">
            {bracket.participant_count} athletes · {bracket.bracket_size}-person bracket
          </span>
          {bracket.status !== 'COMPLETE' && pending > 0 && (
            <span className="text-xs text-emerald-600 font-medium">
              {pending} matches pending
            </span>
          )}
          {bracket.locked_at && (
            <span className="text-xs text-gray-400">
              Locked {new Date(bracket.locked_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          )}
        </div>

        {/* Champion banner */}
        {champion && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 flex items-center gap-4">
            <div className="text-2xl">🥇</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-0.5">Kata Champion</p>
              <p className="text-lg font-bold text-amber-900">{champion.full_name ?? '—'}</p>
              {champion.association_name && (
                <p className="text-sm text-amber-700">{champion.association_name}</p>
              )}
            </div>
          </div>
        )}

        {/* Score table */}
        <KataScoreTable
          matches={matches}
          participantMap={participantMap}
          bracketStatus={bracket.status}
        />

        {/* Legend */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-6 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-4 bg-red-400 rounded-full" />
            Red corner (P1)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-4 bg-blue-400 rounded-full" />
            Blue corner (P2)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-green-500 font-medium">✓</span>
            Winner (higher score advances)
          </div>
        </div>

      </main>
    </div>
  )
}
