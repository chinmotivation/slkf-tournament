import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DrawBracket, Tournament } from '@/types/database'

interface Props {
  params: Promise<{ tournamentId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tournamentId } = await params
  const db = createAdminClient() as any
  const { data } = await db.from('tournaments').select('name, year').eq('id', tournamentId).single()
  if (!data) return { title: 'Results — SLKF' }
  return { title: `${data.name} ${data.year} Results — SLKF` }
}

type ParticipantRow = { id: string; full_name: string | null; association_name: string | null }

type FinalMatch = {
  bracket_id: string
  participant1_id: string | null
  participant2_id: string | null
  winner_id: string | null
  status: string
}

type BracketResult = {
  bracket: DrawBracket
  champion: ParticipantRow | null
  runnerUp: ParticipantRow | null
}

function categoryLabel(b: DrawBracket): string {
  const gender = b.gender === 'MALE' ? 'Male' : 'Female'
  const sub = b.event === 'KATA'
    ? (b.kata_level ? b.kata_level.replace(/_/g, ' ') : 'All Levels')
    : (b.weight_class_label ?? 'Open Weight')
  return `${b.age_group_code} · ${gender} · ${sub}`
}

const STATUS_COLOR: Record<string, string> = {
  LOCKED:      'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETE:    'bg-gray-100 text-gray-600',
}

export default async function TournamentResultsPage({ params }: Props) {
  const { tournamentId } = await params
  const db = createAdminClient() as any

  const { data: tournRow } = await db
    .from('tournaments')
    .select('id, name, code, year, status')
    .eq('id', tournamentId)
    .single()

  if (!tournRow) notFound()
  const tournament = tournRow as Pick<Tournament, 'id' | 'name' | 'code' | 'year' | 'status'>

  // All brackets that have been released (non-PREVIEW)
  const { data: bracketsData } = await db
    .from('draw_brackets')
    .select('*')
    .eq('tournament_id', tournamentId)
    .in('status', ['LOCKED', 'IN_PROGRESS', 'COMPLETE'])
    .order('age_group_code')
    .order('gender')
    .order('event')
    .order('kata_level', { nullsFirst: true })
    .order('weight_class_label', { nullsFirst: true })

  const brackets = (bracketsData ?? []) as DrawBracket[]

  if (brackets.length === 0) {
    return (
      <NoResultsPage tournament={tournament} />
    )
  }

  const bracketIds = brackets.map(b => b.id)

  // Final match for each bracket (round_number=1, position=1 is always the grand final)
  const { data: finalsData } = await db
    .from('bracket_matches')
    .select('bracket_id, participant1_id, participant2_id, winner_id, status')
    .in('bracket_id', bracketIds)
    .eq('round_number', 1)
    .eq('position', 1)

  const finals = (finalsData ?? []) as FinalMatch[]
  const finalByBracket = Object.fromEntries(finals.map(f => [f.bracket_id, f]))

  // Collect all participant IDs referenced in finals
  const participantIds = new Set<string>()
  for (const f of finals) {
    if (f.participant1_id) participantIds.add(f.participant1_id)
    if (f.participant2_id) participantIds.add(f.participant2_id)
    if (f.winner_id) participantIds.add(f.winner_id)
  }

  let participantMap: Record<string, ParticipantRow> = {}
  if (participantIds.size > 0) {
    const { data: partsData } = await db
      .from('draw_participants')
      .select('id, full_name, association_name')
      .in('id', [...participantIds])
    const parts = (partsData ?? []) as ParticipantRow[]
    participantMap = Object.fromEntries(parts.map(p => [p.id, p]))
  }

  // Build result per bracket
  const results: BracketResult[] = brackets.map(bracket => {
    const final = finalByBracket[bracket.id]
    if (!final || bracket.status !== 'COMPLETE' || !final.winner_id) {
      return { bracket, champion: null, runnerUp: null }
    }
    const champion = participantMap[final.winner_id] ?? null
    const runnerUpId = final.winner_id === final.participant1_id
      ? final.participant2_id
      : final.participant1_id
    const runnerUp = runnerUpId ? (participantMap[runnerUpId] ?? null) : null
    return { bracket, champion, runnerUp }
  })

  const kata   = results.filter(r => r.bracket.event === 'KATA')
  const kumite = results.filter(r => r.bracket.event === 'KUMITE')

  const completeCount = brackets.filter(b => b.status === 'COMPLETE').length

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase">SLKF</span>
              <span className="text-gray-200">|</span>
              <span className="text-xs font-mono text-gray-400">{tournament.code}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{tournament.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {tournament.year} · Official Results
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-gray-900">{completeCount}</p>
            <p className="text-xs text-gray-400">of {brackets.length} complete</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {[
          { label: 'Kata', rows: kata },
          { label: 'Kumite', rows: kumite },
        ].map(({ label, rows }) =>
          rows.length === 0 ? null : (
            <section key={label}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">{label}</h2>
              <div className="space-y-3">
                {rows.map(({ bracket, champion, runnerUp }) => (
                  <ResultCard
                    key={bracket.id}
                    bracket={bracket}
                    champion={champion}
                    runnerUp={runnerUp}
                    categoryLabel={categoryLabel(bracket)}
                  />
                ))}
              </div>
            </section>
          )
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>Sri Lanka Karate Federation — Official Results</span>
          <span>Public view · Read only</span>
        </div>
      </footer>

    </div>
  )
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({
  bracket,
  champion,
  runnerUp,
  categoryLabel: label,
}: {
  bracket: DrawBracket
  champion: ParticipantRow | null
  runnerUp: ParticipantRow | null
  categoryLabel: string
}) {
  const isComplete = bracket.status === 'COMPLETE'
  const isActive   = bracket.status === 'IN_PROGRESS'

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${
      isComplete ? 'border-gray-200' : 'border-gray-100'
    }`}>
      {/* Category row */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${
            bracket.event === 'KATA' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'
          }`}>
            {bracket.event}
          </span>
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          <span className="text-xs text-gray-400">{bracket.participant_count} athletes</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[bracket.status] ?? ''}`}>
            {isComplete ? 'Final' : isActive ? 'In Progress' : 'Not started'}
          </span>
          <Link
            href={`/bracket/${bracket.id}`}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            View bracket →
          </Link>
        </div>
      </div>

      {/* Medals */}
      {isComplete && champion ? (
        <div className="grid grid-cols-2 divide-x divide-gray-50">
          <MedalSlot medal="🥇" label="Champion" participant={champion} highlight />
          <MedalSlot medal="🥈" label="Runner-up" participant={runnerUp} />
        </div>
      ) : isActive ? (
        <div className="px-5 py-4 flex items-center gap-2 text-xs text-amber-600">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Competition in progress — results will appear here as matches are completed
        </div>
      ) : (
        <div className="px-5 py-4 text-xs text-gray-400">
          Competition not yet started
        </div>
      )}
    </div>
  )
}

function MedalSlot({
  medal,
  label,
  participant,
  highlight = false,
}: {
  medal: string
  label: string
  participant: ParticipantRow | null
  highlight?: boolean
}) {
  return (
    <div className={`px-5 py-4 flex items-center gap-3 ${highlight ? 'bg-amber-50/40' : ''}`}>
      <span className="text-xl flex-shrink-0">{medal}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
        {participant ? (
          <>
            <p className={`text-sm font-bold truncate ${highlight ? 'text-amber-900' : 'text-gray-800'}`}>
              {participant.full_name ?? '—'}
            </p>
            {participant.association_name && (
              <p className="text-xs text-gray-400 truncate">{participant.association_name}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-300">—</p>
        )}
      </div>
    </div>
  )
}

// ─── No results placeholder ───────────────────────────────────────────────────

function NoResultsPage({
  tournament,
}: {
  tournament: Pick<Tournament, 'id' | 'name' | 'code' | 'year' | 'status'>
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase">SLKF</span>
            <span className="text-gray-200">|</span>
            <span className="text-xs font-mono text-gray-400">{tournament.code}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{tournament.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tournament.year} · Official Results</p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="text-sm font-medium text-gray-500">Results not yet available</p>
        <p className="text-xs text-gray-400 mt-1">
          Results will appear here once competition brackets are locked and matches begin.
        </p>
      </main>
      <footer className="border-t border-gray-100 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-gray-400">
          Sri Lanka Karate Federation — Official Results
        </div>
      </footer>
    </div>
  )
}
