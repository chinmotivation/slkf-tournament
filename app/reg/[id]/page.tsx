import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ageCategoryLabel, iskAgeCategoryLabel, type AgeCategoryCode } from '@/lib/constants/karate'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function RegCardPage({ params }: Props) {
  const { id } = await params
  const admin = createAdminClient() as any

  const [appResult, ] = await Promise.all([
    admin
      .from('student_applications')
      .select('id, full_name, student_number, status, age_category_code, belt_grade, gender, kata_entry, kata_level, kata_approved, kumite_entry, kumite_weight_class, kumite_approved, team_kata_entry, team_kata_team_name, team_kata_approved, total_amount_lkr, tournament_id')
      .eq('id', id)
      .single(),
  ])

  const app = appResult.data
  if (!app || app.status !== 'APPROVED') notFound()

  const { data: tournament } = await admin
    .from('tournaments')
    .select('name')
    .eq('id', app.tournament_id)
    .single()

  const tournamentName = tournament?.name ?? 'Karate Tournament'

  const categoryLabel = app.age_category_code?.startsWith('ISK_')
    ? iskAgeCategoryLabel(app.age_category_code)
    : ageCategoryLabel(app.age_category_code as AgeCategoryCode)

  const events: string[] = [
    app.kata_approved  && app.kata_entry  && `KATA${app.kata_level ? ` (${app.kata_level})` : ''}`,
    app.kumite_approved && app.kumite_entry && `KUMITE${app.kumite_weight_class ? ` (${app.kumite_weight_class})` : ''}`,
    app.team_kata_approved && app.team_kata_entry && `T.KATA${app.team_kata_team_name ? ` — ${app.team_kata_team_name}` : ''}`,
  ].filter(Boolean) as string[]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-green-600 px-5 py-5 text-white text-center">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-0.5">
            Registration Confirmed
          </p>
          <h1 className="text-base font-bold leading-tight">{tournamentName}</h1>
        </div>

        {/* Student number badge */}
        <div className="bg-green-50 border-b border-green-100 px-5 py-4 text-center">
          <p className="text-[10px] font-semibold text-green-600 uppercase tracking-widest mb-1">Student Number</p>
          <p className="text-3xl font-bold text-green-700 font-mono tracking-wider">{app.student_number}</p>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-4">

          {/* Athlete */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">Athlete</p>
            <p className="text-base font-bold text-gray-900">{app.full_name}</p>
            <p className="text-sm text-gray-500">
              {categoryLabel} · {app.gender === 'MALE' ? 'Male' : 'Female'} · {app.belt_grade}
            </p>
          </div>

          {/* Events */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Approved Events</p>
            {events.length > 0 ? (
              <div className="space-y-1.5">
                {events.map((e, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-sm font-medium text-green-800">{e}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No events listed</p>
            )}
          </div>

          {/* Fee */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Registration Fee Paid</p>
            <p className="text-base font-bold text-gray-900">LKR {app.total_amount_lkr?.toLocaleString()}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-5 py-3 text-center space-y-0.5">
          <p className="text-xs font-semibold text-gray-600">Sri Lanka Karate Federation</p>
          <p className="text-[10px] text-gray-400">slkf.lk · Official Registration Record</p>
        </div>
      </div>
    </div>
  )
}
