import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import TeamKataManager from './TeamKataManager'

export const metadata = { title: 'Team Kata — SLKF Head Master' }

export interface NamedGroupMember {
  id: string
  full_name: string
  student_number: string | null
  status: string
  belt_grade: string
  gender: string
  // Intended teammate names entered at registration (only on the leader's record)
  intended_member2?: string | null
  intended_member3?: string | null
}

export interface NamedGroup {
  team_name: string
  members: NamedGroupMember[]
}

export default async function TeamKataPage({ searchParams }: { searchParams: Promise<{ tournament?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = supabase as any
  const { tournament: selectedId } = await searchParams

  // Load all ISK tournaments owned by this HM
  const { data: tournaments } = await db
    .from('tournaments')
    .select('id, name, status')
    .eq('owner_id', user.id)
    .eq('tournament_type', 'ISK')
    .order('created_at', { ascending: false })

  const tourneyList = (tournaments ?? []) as { id: string; name: string; status: string }[]
  const activeTournament = selectedId
    ? tourneyList.find(t => t.id === selectedId)
    : (tourneyList.find(t => t.status === 'OPEN') ?? tourneyList[0])

  let eligible:     any[] = []
  let allStudents:  any[] = []
  let teams:        any[] = []
  let namedGroups:  NamedGroup[] = []

  if (activeTournament) {
    const [eligibleResult, allResult, teamsResult, namedResult] = await Promise.all([
      // Approved T.KATA students (for HM direct-create picker)
      db.from('student_applications')
        .select('id, full_name, student_number, age_category_code, gender, belt_grade')
        .eq('tournament_id', activeTournament.id)
        .eq('status', 'APPROVED')
        .eq('team_kata_entry', true)
        .order('full_name', { ascending: true }),
      // All approved students (for member name lookup)
      db.from('student_applications')
        .select('id, full_name, student_number, age_category_code, gender, belt_grade')
        .eq('tournament_id', activeTournament.id)
        .eq('status', 'APPROVED')
        .order('full_name', { ascending: true }),
      // Existing confirmed/pending/rejected groups
      db.from('student_team_kata_groups')
        .select('*')
        .eq('tournament_id', activeTournament.id)
        .in('status', ['PENDING', 'CONFIRMED', 'REJECTED'])
        .order('created_at', { ascending: true }),
      // Students who specified a team name during registration
      db.from('student_applications')
        .select('id, full_name, student_number, status, belt_grade, gender, team_kata_team_name, team_kata_member2_name, team_kata_member3_name')
        .eq('tournament_id', activeTournament.id)
        .eq('team_kata_entry', true)
        .not('team_kata_team_name', 'is', null)
        .order('full_name', { ascending: true }),
    ])

    eligible    = eligibleResult.data ?? []
    allStudents = allResult.data ?? []
    teams       = teamsResult.data ?? []

    // Group students by their team_kata_team_name
    const handled = new Set((teamsResult.data ?? []).map((t: any) => t.team_name.toLowerCase()))
    const groupMap = new Map<string, NamedGroupMember[]>()
    for (const s of (namedResult.data ?? [])) {
      const key = (s.team_kata_team_name as string).trim()
      if (handled.has(key.toLowerCase())) continue // already confirmed/rejected
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push({
        id: s.id,
        full_name: s.full_name,
        student_number: s.student_number,
        status: s.status,
        belt_grade: s.belt_grade,
        gender: s.gender,
        intended_member2: s.team_kata_member2_name ?? null,
        intended_member3: s.team_kata_member3_name ?? null,
      })
    }
    namedGroups = Array.from(groupMap.entries()).map(([team_name, members]) => ({ team_name, members }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/head-master/dashboard"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-900">Team Kata Management</h1>
            <p className="text-xs text-gray-500">ISK tournaments only</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">

        {tourneyList.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500 text-sm">No ISK tournaments found.</p>
            <p className="text-xs text-gray-400 mt-1">Create a tournament with type ISK to manage Team Kata.</p>
          </div>
        )}

        {tourneyList.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tourneyList.map(t => (
              <Link
                key={t.id}
                href={`/head-master/team-kata?tournament=${t.id}`}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
                  activeTournament?.id === t.id
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}

        {activeTournament && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-blue-900">{activeTournament.name}</p>
              <p className="text-xs text-blue-600 mt-0.5">
                {eligible.length} student{eligible.length !== 1 ? 's' : ''} want Team Kata ·{' '}
                {namedGroups.length} proposal{namedGroups.length !== 1 ? 's' : ''} awaiting review ·{' '}
                {teams.filter(t => t.status === 'CONFIRMED').length} confirmed
              </p>
            </div>

            <TeamKataManager
              tournamentId={activeTournament.id}
              tournamentName={activeTournament.name}
              eligible={eligible}
              teams={teams}
              allStudents={allStudents}
              namedGroups={namedGroups}
            />
          </>
        )}
      </main>
    </div>
  )
}
