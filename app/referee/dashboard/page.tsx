import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { DrawBracket } from '@/types/database'
import LogoutButton from '@/components/auth/LogoutButton'

export const metadata: Metadata = { title: 'Referee Dashboard — SLKF' }

const STATUS_LABEL: Record<string, string> = {
  LOCKED:      'Locked',
  IN_PROGRESS: 'In Progress',
  COMPLETE:    'Complete',
}

const STATUS_COLOR: Record<string, string> = {
  LOCKED:      'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETE:    'bg-gray-100 text-gray-500',
}

type BracketWithTournament = DrawBracket & {
  tournaments: { name: string; code: string } | null
}

function categoryLabel(b: DrawBracket): string {
  const gender = b.gender === 'MALE' ? 'Male' : 'Female'
  const sub = b.kata_level ? b.kata_level.replace(/_/g, ' ') : 'All Levels'
  return `${b.age_group_code} · ${gender} · ${sub}`
}

export default async function RefereeDashboard() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  const p = profile as { full_name: string; role: string } | null
  if (p?.role !== 'referee') redirect('/unauthorized')

  // Fetch KATA brackets that are active (LOCKED / IN_PROGRESS / COMPLETE)
  const { data } = await db
    .from('draw_brackets')
    .select('*, tournaments(name, code)')
    .eq('event', 'KATA')
    .in('status', ['LOCKED', 'IN_PROGRESS', 'COMPLETE'])
    .order('status')
    .order('age_group_code')

  const brackets = (data ?? []) as BracketWithTournament[]

  const active    = brackets.filter(b => b.status === 'IN_PROGRESS')
  const locked    = brackets.filter(b => b.status === 'LOCKED')
  const completed = brackets.filter(b => b.status === 'COMPLETE')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">SLKF</span>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">Referee — Kata Scoring</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{p?.full_name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
              Referee
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {brackets.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <p className="text-sm font-medium text-gray-500">No active Kata brackets</p>
            <p className="text-xs text-gray-400 mt-1">
              Brackets will appear here once the head master locks them for competition.
            </p>
          </div>
        )}

        {active.length > 0 && (
          <BracketSection title="In Progress" brackets={active} />
        )}
        {locked.length > 0 && (
          <BracketSection title="Ready to Score" brackets={locked} />
        )}
        {completed.length > 0 && (
          <BracketSection title="Completed" brackets={completed} dim />
        )}
      </main>
    </div>
  )
}

function BracketSection({
  title, brackets, dim = false,
}: {
  title: string
  brackets: BracketWithTournament[]
  dim?: boolean
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {brackets.map(b => (
          <Link
            key={b.id}
            href={`/referee/kata/${b.id}`}
            className={`group bg-white rounded-xl border p-5 transition-all ${
              dim
                ? 'border-gray-100 opacity-60 hover:opacity-100'
                : 'border-gray-200 hover:border-emerald-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-xs font-mono text-gray-400">
                  {b.tournaments?.code ?? '—'}
                </span>
                <p className="text-sm font-medium text-gray-500 leading-tight">
                  {b.tournaments?.name ?? '—'}
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                STATUS_COLOR[b.status] ?? 'bg-gray-100 text-gray-500'
              }`}>
                {STATUS_LABEL[b.status] ?? b.status}
              </span>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{categoryLabel(b)}</h3>
            <p className="text-xs text-gray-400">
              {b.participant_count} athletes · {b.bracket_size}-person bracket
            </p>
            <div className={`mt-4 text-xs font-medium ${dim ? 'text-gray-400' : 'text-emerald-600 group-hover:text-emerald-700'}`}>
              {dim ? 'View results →' : 'Enter scores →'}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
