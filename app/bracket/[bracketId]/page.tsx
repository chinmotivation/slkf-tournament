import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DrawBracket, DrawParticipant, BracketMatch } from '@/types/database'
import BracketTree from '@/app/head-master/draw/[tournamentId]/[bracketId]/BracketTree'

interface Props {
  params: Promise<{ bracketId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bracketId } = await params
  const db = createAdminClient() as any
  const { data } = await db
    .from('draw_brackets')
    .select('age_group_code, gender, event, tournaments(name, code)')
    .eq('id', bracketId)
    .single()
  if (!data) return { title: 'Bracket — SLKF' }
  const gender = data.gender === 'MALE' ? 'Male' : 'Female'
  return {
    title: `${data.age_group_code} ${gender} ${data.event} — ${data.tournaments?.name ?? 'SLKF'}`,
  }
}

const STATUS_COLOR: Record<string, string> = {
  LOCKED:      'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETE:    'bg-gray-100 text-gray-600',
}

const STATUS_LABEL: Record<string, string> = {
  LOCKED:      'Draw Locked',
  IN_PROGRESS: 'In Progress',
  COMPLETE:    'Final Results',
}

export default async function PublicBracketPage({ params }: Props) {
  const { bracketId } = await params
  const db = createAdminClient() as any

  const { data: bracketRow } = await db
    .from('draw_brackets')
    .select('*, tournaments(name, code, year)')
    .eq('id', bracketId)
    .single()

  if (!bracketRow) notFound()

  const bracket = bracketRow as DrawBracket & {
    tournaments: { name: string; code: string; year: number } | null
  }

  // Only expose brackets that have been locked/started/completed — never PREVIEW
  if (bracket.status === 'PREVIEW') notFound()

  const { data: matchesData } = await db
    .from('bracket_matches')
    .select('*')
    .eq('bracket_id', bracketId)
    .order('round_number', { ascending: false })
    .order('position', { ascending: true })

  const matches = (matchesData ?? []) as BracketMatch[]

  const { data: participantsData } = await db
    .from('draw_participants')
    .select('id, full_name, association_name, seed_position, is_bye')
    .eq('bracket_id', bracketId)

  type ParticipantInfo = Pick<DrawParticipant, 'id' | 'full_name' | 'association_name' | 'seed_position' | 'is_bye'>
  const participants = (participantsData ?? []) as ParticipantInfo[]
  const participantMap: Record<string, ParticipantInfo> = Object.fromEntries(
    participants.map(p => [p.id, p])
  )

  const gender = bracket.gender === 'MALE' ? 'Male' : 'Female'
  const sub = bracket.event === 'KATA'
    ? (bracket.kata_level ? bracket.kata_level.replace(/_/g, ' ') : 'All Levels')
    : (bracket.weight_class_label ?? 'Open Weight')
  const categoryLabel = `${bracket.age_group_code} · ${gender} · ${bracket.event} · ${sub}`

  const finalMatch = matches.find(m => m.round_number === 1 && m.position === 1)
  const champion = finalMatch?.winner_id ? participantMap[finalMatch.winner_id] : null

  const completed = matches.filter(m => m.status === 'COMPLETE').length
  const total     = matches.filter(m => m.status !== 'BYE_WIN').length

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase">SLKF</span>
              <p className="text-[10px] text-gray-400 leading-none">Sri Lanka Karate Federation</p>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              {bracket.tournaments && (
                <span className="text-xs font-mono text-gray-400 mr-2">{bracket.tournaments.code}</span>
              )}
              <span className="text-sm font-medium text-gray-700">
                {bracket.tournaments?.name ?? 'Tournament'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {bracket.tournament_id && (
              <Link
                href={`/results/${bracket.tournament_id}`}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                All results →
              </Link>
            )}
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[bracket.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {STATUS_LABEL[bracket.status] ?? bracket.status}
            </span>
          </div>
        </div>
      </header>

      {/* Live results notice */}
      {bracket.status === 'IN_PROGRESS' && (
        <div className="bg-amber-50 border-b border-amber-100">
          <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-2 text-xs text-amber-700">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Live results — this page updates as matches are recorded
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Category heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{categoryLabel}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-500">
            <span>{bracket.participant_count} athletes</span>
            <span className="text-gray-300">·</span>
            <span>{bracket.bracket_size}-person bracket</span>
            <>
              <span className="text-gray-300">·</span>
              <span>{completed}/{total} matches complete</span>
            </>
            {bracket.locked_at && (
              <>
                <span className="text-gray-300">·</span>
                <span>
                  Locked {new Date(bracket.locked_at).toLocaleDateString('en-LK', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Champion banner */}
        {champion && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-5 flex items-center gap-4">
            <div className="text-3xl">🥇</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-0.5">Champion</p>
              <p className="text-xl font-bold text-amber-900">{champion.full_name ?? '—'}</p>
              {champion.association_name && (
                <p className="text-sm text-amber-700 mt-0.5">{champion.association_name}</p>
              )}
            </div>
          </div>
        )}

        {/* Bracket tree */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 overflow-x-auto">
          <BracketTree
            matches={matches}
            participantMap={participantMap}
            bracketSize={bracket.bracket_size}
            bracketStatus={bracket.status as any}
            readOnly={true}
          />
        </div>

        {/* Participants list */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Participants ({bracket.participant_count})
          </h2>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/60">
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5 w-10">#</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Athlete</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Association</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {participants
                  .filter(p => !p.is_bye)
                  .sort((a, b) => (a.seed_position ?? 99) - (b.seed_position ?? 99))
                  .map((p, i) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        {p.full_name ?? '—'}
                        {finalMatch?.winner_id === p.id && (
                          <span className="ml-2 text-xs text-amber-600 font-medium">🥇 Champion</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{p.association_name ?? '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>Sri Lanka Karate Federation — Official Results</span>
          <span>Public view · Read only</span>
        </div>
      </footer>

    </div>
  )
}
