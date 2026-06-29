import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeAgeCategory, computeISKAgeCategory, type AgeCategoryCode } from '@/lib/constants/karate'
import type { StudentProfile, Tournament, StudentApplication } from '@/types/database'
import ApplyForm from './ApplyForm'
import Link from 'next/link'

export const metadata = { title: 'Apply — SLKF Tournament' }

export default async function ApplyPage({ params }: { params: Promise<{ 'tournament-id': string }> }) {
  const { 'tournament-id': tournamentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = supabase as any

  const [profileResult, tournResult, existingResult] = await Promise.all([
    db.from('student_profiles').select('*').eq('id', user.id).single(),
    db.from('tournaments').select('*').eq('id', tournamentId).single(),
    db.from('student_applications').select('*').eq('user_id', user.id).eq('tournament_id', tournamentId).maybeSingle(),
  ])

  const profile = profileResult.data as StudentProfile | null
  if (!profile) redirect('/register')

  if (tournResult.error || !tournResult.data) redirect('/student/dashboard')
  const tournament = tournResult.data as Tournament

  // Load HM's classes for this tournament (if any)
  const hmClasses: { id: string; name: string }[] = []
  if ((tournament as any).owner_id) {
    const { data: classRows } = await db
      .from('hm_classes')
      .select('id, name')
      .eq('hm_user_id', (tournament as any).owner_id)
      .order('created_at', { ascending: true })
    if (classRows) hmClasses.push(...classRows)
  }
  if (tournament.status !== 'OPEN') redirect('/student/dashboard')

  const existing = existingResult.data as StudentApplication | null

  // If already approved, redirect to status page
  if (existing?.status === 'APPROVED') redirect(`/student/applications/${existing.id}`)

  const isISK = (tournament as any).tournament_type === 'ISK'
  const ageCode = isISK
    ? computeISKAgeCategory(profile.date_of_birth, tournament.age_eligibility_cutoff_date)
    : computeAgeCategory(profile.date_of_birth, tournament.age_eligibility_cutoff_date)
  if (!ageCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md text-center">
          <p className="text-gray-700 font-medium">You are not eligible for this tournament.</p>
          <p className="text-sm text-gray-500 mt-1">Minimum age is 8 years.</p>
          <Link href="/student/profile" className="mt-4 inline-block text-sm text-red-600 hover:underline">
            Edit Profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/student/dashboard"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900 truncate">
              {existing?.status === 'PENDING' ? 'Edit Application' : 'Apply for Tournament'}
            </h1>
            <p className="text-xs text-gray-500 truncate">{tournament.name}</p>
          </div>
        </div>
      </header>

      {/* Tournament banner */}
      <div className="bg-red-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-red-200">Tournament</p>
            <p className="text-sm font-semibold">{tournament.name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-red-200">Deadline</p>
            <p className="text-sm font-semibold">
              {new Date(tournament.registration_deadline).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-2">
        {existing?.status === 'PENDING' && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Pending approval — you can still update your selections below.
          </div>
        )}

        <ApplyForm
          profile={profile}
          tournament={tournament}
          ageCategory={ageCode}
          hmClasses={hmClasses}
          existingApplication={existing ? {
            id: existing.id,
            kata_entry: existing.kata_entry,
            kata_level: existing.kata_level,
            kumite_entry: existing.kumite_entry,
            kumite_weight_class: existing.kumite_weight_class,
            team_kata_entry: (existing as any).team_kata_entry ?? false,
            team_kata_team_name: (existing as any).team_kata_team_name ?? null,
            class_id: (existing as any).class_id ?? null,
            payment_receipt_url: existing.payment_receipt_url,
            total_amount_lkr: existing.total_amount_lkr,
          } : null}
        />
      </main>
    </div>
  )
}
