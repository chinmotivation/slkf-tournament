import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ageCategoryLabel, iskAgeCategoryLabel, type AgeCategoryCode } from '@/lib/constants/karate'
import Link from 'next/link'

export const metadata = { title: 'My Students — SLKF Head Master' }

export default async function HMStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = supabase as any

  // Load HM's own tournament IDs first (RLS may require this filter)
  const { data: ownTourneys } = await db
    .from('tournaments')
    .select('id')
    .eq('owner_id', user.id)

  const ownTourneyIds = (ownTourneys ?? []).map((t: any) => t.id) as string[]

  const [profileResult, appsResult, classesResult] = await Promise.all([
    db.from('associations').select('dojo_code, association_name').eq('user_id', user.id).single(),
    ownTourneyIds.length > 0
      ? db.from('student_applications')
          .select('*')
          .eq('status', 'APPROVED')
          .in('tournament_id', ownTourneyIds)
          .order('student_number', { ascending: true })
      : Promise.resolve({ data: [] }),
    db.from('hm_classes').select('id, name').eq('hm_user_id', user.id),
  ])

  const assoc = profileResult.data as { dojo_code: string | null; association_name: string } | null
  const apps  = (appsResult.data ?? []) as any[]
  const classMap = new Map<string, string>(
    ((classesResult.data ?? []) as any[]).map((c: any) => [c.id, c.name])
  )

  // Group by tournament
  const byTournament = new Map<string, { name: string; students: any[] }>()
  for (const app of apps) {
    if (!byTournament.has(app.tournament_id)) {
      byTournament.set(app.tournament_id, { name: app.tournament_id, students: [] })
    }
    byTournament.get(app.tournament_id)!.students.push(app)
  }

  // Fetch tournament names
  if (byTournament.size > 0) {
    const { data: tourneys } = await db
      .from('tournaments')
      .select('id, name')
      .in('id', [...byTournament.keys()])
    for (const t of tourneys ?? []) {
      const entry = byTournament.get(t.id)
      if (entry) entry.name = t.name
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/head-master/dashboard"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-900">Student Class List</h1>
            <p className="text-xs text-gray-500">
              {assoc?.association_name ?? 'My Dojo'} · {apps.length} approved student{apps.length !== 1 ? 's' : ''}
            </p>
          </div>
          {!assoc?.dojo_code && (
            <Link
              href="/head-master/settings"
              className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 font-medium shrink-0"
            >
              Set Dojo Code
            </Link>
          )}
        </div>
      </header>

      {/* Dojo code missing warning */}
      {!assoc?.dojo_code && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-800">
              No dojo code set yet — student numbers show as <span className="font-mono">ISK-HM-XXXX</span>.{' '}
              <Link href="/head-master/settings" className="font-semibold underline">Set your dojo code</Link> to use the correct format.
            </p>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-6">

        {apps.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            No approved students yet. Approve student applications from the{' '}
            <Link href="/head-master/applications" className="text-red-600 font-medium underline">
              Applications
            </Link>{' '}
            page.
          </div>
        )}

        {[...byTournament.values()].map(({ name, students }) => (
          <section key={name}>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{name}</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                <span>ID</span>
                <span>Name</span>
                <span>Belt</span>
                <span>Events</span>
              </div>
              {students.map((app: any, i: number) => {
                const events = [
                  app.kata_entry      && 'Kata',
                  app.kumite_entry    && 'Kumite',
                  app.team_kata_entry && 'T.Kata',
                ].filter(Boolean).join(' + ')

                const ageLabel = app.age_category_code?.startsWith('ISK_')
                  ? iskAgeCategoryLabel(app.age_category_code)
                  : ageCategoryLabel(app.age_category_code as AgeCategoryCode)

                const className = app.class_id ? (classMap.get(app.class_id) ?? null) : null

                return (
                  <div
                    key={app.id}
                    className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 px-4 py-3 items-center ${
                      i < students.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded px-1.5 py-0.5 shrink-0">
                      {app.student_number ?? '—'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{app.full_name}</p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {ageLabel}{className ? ` · ${className}` : ''} · {app.gender === 'MALE' ? 'M' : 'F'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-600 shrink-0 truncate max-w-[80px]">{app.belt_grade}</span>
                    <span className="text-xs text-gray-600 shrink-0 text-right">{events || '—'}</span>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

      </main>
    </div>
  )
}
