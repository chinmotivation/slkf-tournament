import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { DrawBracket, DrawParticipant, BracketMatch } from '@/types/database'
import BracketTree from './BracketTree'
import CopyLinkButton from './CopyLinkButton'

export const metadata: Metadata = { title: 'Bracket View — SLKF Head Master' }

interface Props {
  params: Promise<{ tournamentId: string; bracketId: string }>
}

const STATUS_COLOR: Record<string, string> = {
  PREVIEW: 'bg-blue-100 text-blue-700',
  LOCKED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETE: 'bg-gray-100 text-gray-600',
}

export default async function BracketViewPage({ params }: Props) {
  const { tournamentId, bracketId } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  const p = profile as { full_name: string; role: string } | null
  if (p?.role !== 'head_master') redirect('/unauthorized')

  const { data: tournRow } = await db
    .from('tournaments').select('id, name, code, year')
    .eq('id', tournamentId).single()
  if (!tournRow) notFound()

  const { data: bracketRow } = await db
    .from('draw_brackets').select('*').eq('id', bracketId).single()
  if (!bracketRow) notFound()
  const bracket = bracketRow as DrawBracket

  if (!bracket.generated_at) redirect(`/head-master/draw/${tournamentId}`)

  // All matches for this bracket, ordered first-round-first for correct rendering
  const { data: matchesData } = await db
    .from('bracket_matches')
    .select('*')
    .eq('bracket_id', bracketId)
    .order('round_number', { ascending: false })
    .order('position', { ascending: true })

  const matches = (matchesData ?? []) as BracketMatch[]

  // All participants — passed as plain object (Map not serializable to client)
  const { data: participantsData } = await db
    .from('draw_participants')
    .select('id, full_name, association_name, seed_position, is_bye')
    .eq('bracket_id', bracketId)

  type ParticipantInfo = Pick<DrawParticipant, 'id' | 'full_name' | 'association_name' | 'seed_position' | 'is_bye'>
  const participants = (participantsData ?? []) as ParticipantInfo[]
  const participantMap: Record<string, ParticipantInfo> = Object.fromEntries(
    participants.map(p => [p.id, p])
  )

  // Category label
  const gender = bracket.gender === 'MALE' ? 'Male' : 'Female'
  const sub = bracket.event === 'KATA'
    ? (bracket.kata_level ? bracket.kata_level.replace(/_/g, ' ') : 'All Levels')
    : (bracket.weight_class_label ?? 'Open Weight')
  const categoryLabel = `${bracket.age_group_code} · ${gender} · ${bracket.event} · ${sub}`

  // Champion = winner of the Final (round_number=1, position=1)
  const finalMatch = matches.find(m => m.round_number === 1 && m.position === 1)
  const champion = finalMatch?.winner_id ? participantMap[finalMatch.winner_id] : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
              <Link href="/head-master/draw" className="hover:text-gray-600 transition-colors">Draw Engine</Link>
              <span>/</span>
              <Link href={`/head-master/draw/${tournamentId}`} className="hover:text-gray-600 transition-colors font-mono">
                {tournRow.code}
              </Link>
              <span>/</span>
              <span className="text-gray-600">{categoryLabel}</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">{categoryLabel}</h1>
          </div>
          <div className="flex items-center gap-4">
            {bracket.status !== 'PREVIEW' && (
              <CopyLinkButton bracketId={bracketId} />
            )}
            <Link
              href={`/head-master/draw/${tournamentId}`}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← All brackets
            </Link>
            <span className="text-sm text-gray-600">{p?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              Head Master
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">

        {/* Info strip */}
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[bracket.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {bracket.status}
          </span>
          <span className="text-sm text-gray-500">
            {bracket.participant_count} athletes · {bracket.bracket_size}-person bracket · {bracket.bye_count} byes
          </span>
          {bracket.locked_at && (
            <span className="text-xs text-gray-400">
              Locked {new Date(bracket.locked_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          )}
        </div>

        {/* Champion banner (only when bracket is COMPLETE) */}
        {champion && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 flex items-center gap-4">
            <div className="text-2xl">🥇</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-0.5">Champion</p>
              <p className="text-lg font-bold text-amber-900">{champion.full_name ?? '—'}</p>
              {champion.association_name && (
                <p className="text-sm text-amber-700">{champion.association_name}</p>
              )}
            </div>
          </div>
        )}

        {/* Bracket tree */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          {matches.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">No matches found. Generate the draw first.</p>
            </div>
          ) : (
            <BracketTree
              matches={matches}
              participantMap={participantMap}
              bracketSize={bracket.bracket_size}
              bracketStatus={bracket.status}
            />
          )}
        </div>

      </main>
    </div>
  )
}
