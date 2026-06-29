import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tournament, StudentApplication, StudentProfile } from '@/types/database'
import { ageCategoryLabel } from '@/lib/constants/karate'
import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'
import ProposeTeamForm from './ProposeTeamForm'

export const metadata = { title: 'My Dashboard — SLKF Tournament' }

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = supabase as any

  const [profileResult, tournamentsResult, applicationsResult] = await Promise.all([
    db.from('student_profiles').select('*').eq('id', user.id).single(),
    db.from('tournaments').select('*').eq('status', 'OPEN').order('created_at', { ascending: false }),
    db.from('student_applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  const profile = profileResult.data as StudentProfile | null
  const tournaments = (tournamentsResult.data ?? []) as Tournament[]
  const applications = (applicationsResult.data ?? []) as StudentApplication[]

  if (!profile) redirect('/register')

  // Load team assignments for this student
  const appIds = applications.map((a: any) => a.id)
  let teamAssignments: Map<string, { team_name: string; status: string; id: string }> = new Map()
  if (appIds.length > 0) {
    const { data: teamGroups } = await db
      .from('student_team_kata_groups')
      .select('id, team_name, status, member1_app_id, member2_app_id, member3_app_id')
      .or(appIds.map((id: string) => `member1_app_id.eq.${id},member2_app_id.eq.${id},member3_app_id.eq.${id}`).join(','))
    for (const g of teamGroups ?? []) {
      for (const appId of appIds) {
        if ([g.member1_app_id, g.member2_app_id, g.member3_app_id].includes(appId)) {
          teamAssignments.set(appId, { team_name: g.team_name, status: g.status, id: g.id })
        }
      }
    }
  }

  const appliedTournamentIds = new Set(applications.map((a: StudentApplication) => a.tournament_id))

  // Show the team submission form for approved T.KATA applicants who haven't been confirmed yet
  // (no group = can submit fresh; REJECTED = can re-submit)
  const teamFormApps = applications.filter((a: any) => {
    if (a.status !== 'APPROVED' || !a.team_kata_entry) return false
    const group = teamAssignments.get(a.id)
    return !group || group.status === 'REJECTED'
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-600 text-white">
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-red-200 font-medium uppercase tracking-wide">SLKF Open Karate 2026</p>
              <h1 className="text-xl font-bold mt-1">{profile.full_name}</h1>
              <p className="text-sm text-red-200 mt-0.5">{profile.gender === 'MALE' ? 'Male' : 'Female'} · {profile.belt_grade}</p>
            </div>
            <div className="shrink-0 bg-white/20 rounded-xl px-3 py-1.5">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-6">

        {/* Profile summary card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Student number — prominent if assigned */}
          {applications.some((a: StudentApplication) => a.student_number) && (
            <div className="bg-red-600 px-4 py-3 flex items-center gap-3">
              <div>
                <p className="text-[10px] text-red-200 font-semibold uppercase tracking-widest">Student ID</p>
                <p className="text-lg font-black text-white font-mono tracking-wider">
                  {applications.find((a: StudentApplication) => a.student_number)?.student_number}
                </p>
              </div>
              <p className="text-xs text-red-200 ml-auto">Share this ID with teammates</p>
            </div>
          )}
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Phone</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.phone}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Date of Birth</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{new Date(profile.date_of_birth).toLocaleDateString('en-GB')}</p>
            </div>
          </div>
          <div className="border-t border-gray-100 px-4 py-2.5">
            <Link href="/student/profile" className="text-xs text-red-600 hover:underline font-medium">
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Team Kata — submission form for team leaders */}
        {teamFormApps.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Team Kata</h2>
            <div className="space-y-3">
              {teamFormApps.map((app: any) => {
                const rejectedGroup = teamAssignments.get(app.id)
                return (
                  <ProposeTeamForm
                    key={app.id}
                    applicationId={app.id}
                    tournamentId={app.tournament_id}
                    myStudentNumber={app.student_number ?? ''}
                    myFullName={profile.full_name}
                    defaultTeamName={app.team_kata_team_name ?? ''}
                    rejectedGroupId={rejectedGroup?.status === 'REJECTED' ? rejectedGroup.id : null}
                    rejectedTeamName={rejectedGroup?.status === 'REJECTED' ? rejectedGroup.team_name : null}
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* Open Tournaments */}
        {tournaments.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Open Tournaments</h2>
            <div className="space-y-3">
              {tournaments.map((t: Tournament) => {
                const alreadyApplied = appliedTournamentIds.has(t.id)
                return (
                  <div key={t.id} className="rounded-xl overflow-hidden shadow-sm">
                    {/* Bold competition header */}
                    <div className="relative overflow-hidden px-4 pt-4 pb-5"
                      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)' }}>
                      {/* Decorative circle */}
                      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                      <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.25em] mb-1.5">
                        ◆ Open Competition
                      </p>
                      <p className="font-black text-white text-base leading-snug">{t.name}</p>
                    </div>

                    {/* Details */}
                    <div className="bg-white border-x border-b border-gray-200 p-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Deadline</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          {new Date(t.registration_deadline).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Entry Fee</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          LKR {t.fee_individual_one_event_lkr.toLocaleString()}
                          <span className="text-xs font-normal text-gray-400"> / event</span>
                        </p>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="bg-white border-x border-b border-gray-200 rounded-b-xl px-4 pb-4">
                      {alreadyApplied ? (
                        <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1.5 font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Application submitted
                        </span>
                      ) : (
                        <Link
                          href={`/student/apply/${t.id}`}
                          className="flex items-center justify-center gap-2 w-full text-white text-sm font-bold py-3 rounded-lg transition-all active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                        >
                          Apply Now
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* My Applications */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">My Applications</h2>
          {applications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              No applications yet. Apply for an open tournament above.
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app: StudentApplication) => {
                const teamInfo = teamAssignments.get(app.id)
                const events = [
                  (app as any).kata_entry   && 'KATA',
                  (app as any).kumite_entry && 'KUMITE',
                  (app as any).team_kata_entry && 'T.KATA',
                ].filter(Boolean).join(' + ')
                return (
                  <Link
                    key={app.id}
                    href={`/student/applications/${app.id}`}
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {ageCategoryLabel(app.age_category_code as any)}
                        </span>
                        <span className="text-xs text-gray-500">{events}</span>
                      </div>
                      {teamInfo && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <TeamStatusBadge status={teamInfo.status} teamName={teamInfo.team_name} />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <StatusBadge status={app.status} />
                        <span className="text-xs text-gray-400">
                          LKR {app.total_amount_lkr.toLocaleString()} · {new Date(app.created_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function TeamStatusBadge({ status, teamName }: { status: string; teamName: string }) {
  if (status === 'CONFIRMED') {
    return (
      <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
        Team: {teamName}
      </span>
    )
  }
  if (status === 'PENDING') {
    return (
      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        Pending HM Approval: {teamName}
      </span>
    )
  }
  if (status === 'REJECTED') {
    return (
      <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
        Rejected: {teamName}
      </span>
    )
  }
  return null
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING:  { label: 'Waiting Approval', className: 'bg-yellow-100 text-yellow-700' },
    APPROVED: { label: 'Approved',          className: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rejected',          className: 'bg-red-100 text-red-700' },
  }
  const s = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${s.className}`}>{s.label}</span>
  )
}
