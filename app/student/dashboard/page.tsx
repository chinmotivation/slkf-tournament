import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tournament, StudentApplication, StudentProfile } from '@/types/database'
import { ageCategoryLabel } from '@/lib/constants/karate'
import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'

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

  const appliedTournamentIds = new Set(applications.map((a: StudentApplication) => a.tournament_id))

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
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Phone</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.phone}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Date of Birth</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{new Date(profile.date_of_birth).toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* Open Tournaments */}
        {tournaments.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Open Tournaments</h2>
            <div className="space-y-3">
              {tournaments.map((t: Tournament) => {
                const alreadyApplied = appliedTournamentIds.has(t.id)
                return (
                  <div key={t.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4">
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Deadline: <strong>{new Date(t.registration_deadline).toLocaleDateString('en-GB')}</strong>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Single event — LKR {t.fee_individual_one_event_lkr.toLocaleString()}
                        &nbsp;·&nbsp;
                        Both events — LKR {t.fee_individual_both_events_lkr.toLocaleString()}
                      </p>
                    </div>
                    <div className="border-t border-gray-100 px-4 py-3">
                      {alreadyApplied ? (
                        <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 font-medium">
                          Application submitted
                        </span>
                      ) : (
                        <Link
                          href={`/student/apply/${t.id}`}
                          className="flex items-center justify-center gap-2 w-full bg-red-600 active:bg-red-700 text-white text-sm font-semibold py-3 rounded-lg transition-colors"
                        >
                          Apply Now
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
              {applications.map((app: StudentApplication) => (
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
                      <span className="text-xs text-gray-500">
                        {[app.kata_entry && 'KATA', app.kumite_entry && 'KUMITE'].filter(Boolean).join(' + ')}
                      </span>
                    </div>
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
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
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
