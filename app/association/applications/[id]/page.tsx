import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AthleteMultiSelect from '@/components/applications/AthleteMultiSelect'
import SubmitButton from '@/components/applications/SubmitButton'
import ApplicationStatusBadge from '@/components/applications/ApplicationStatusBadge'
import type { Application, Athlete, IndividualEntry, Tournament } from '@/types/database'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = { title: 'Application — SLKF Association' }

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profileResult = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  const p = profileResult.data as { full_name: string; role: string } | null
  if (p?.role !== 'association_rep') redirect('/unauthorized')

  const assocResult = await supabase
    .from('associations')
    .select('id')
    .eq('user_id', user.id)
    .single()
  const assoc = assocResult.data as { id: string } | null
  if (!assoc) redirect('/unauthorized')

  const appResult = await db.from('applications').select('*').eq('id', id).single()
  if (appResult.error || !appResult.data) notFound()
  const application = appResult.data as Application
  if (application.association_id !== assoc.id) notFound()

  const tournResult = await db.from('tournaments').select('*').eq('id', application.tournament_id).single()
  if (tournResult.error || !tournResult.data) notFound()
  const tournament = tournResult.data as Tournament

  const [athletesResult, entriesResult] = await Promise.all([
    db
      .from('athletes')
      .select('*')
      .eq('association_id', assoc.id)
      .eq('is_active', true)
      .order('full_name'),
    db
      .from('individual_entries')
      .select('athlete_id')
      .eq('application_id', id)
      .is('deleted_at', null),
  ])

  const athletes = (athletesResult.data ?? []) as Athlete[]
  const selectedAthleteIds = ((entriesResult.data ?? []) as { athlete_id: string | null }[])
    .filter(e => e.athlete_id !== null)
    .map(e => e.athlete_id as string)

  const isDraft = application.status === 'DRAFT'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">SLKF Tournament System</span>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-lg font-bold text-gray-900">{tournament.name}</h1>
              <ApplicationStatusBadge status={application.status} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/association/applications"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← My Applications
            </Link>
            <span className="text-sm text-gray-600">{p?.full_name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Tournament summary */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Tournament Details</h2>
          <dl>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <dt className="text-sm text-gray-500">Code</dt>
              <dd className="text-sm font-medium text-gray-900">{tournament.code} · {tournament.year}</dd>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <dt className="text-sm text-gray-500">Registration Deadline</dt>
              <dd className="text-sm font-medium text-gray-900">{formatDate(tournament.registration_deadline)}</dd>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <dt className="text-sm text-gray-500">Age Eligibility Cutoff</dt>
              <dd className="text-sm font-medium text-gray-900">{formatDate(tournament.age_eligibility_cutoff_date)}</dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-sm text-gray-500">Entry Fees</dt>
              <dd className="text-sm font-medium text-gray-900">
                LKR {tournament.fee_individual_one_event_lkr.toLocaleString()} (1 event)
                {' / '}
                {tournament.fee_individual_both_events_lkr.toLocaleString()} (both)
              </dd>
            </div>
          </dl>
        </div>

        {/* Athlete selection */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Select Athletes</h2>
            <span className="text-xs text-gray-400">
              {selectedAthleteIds.length} of {athletes.length} selected
            </span>
          </div>

          {!isDraft && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 font-medium">
                This application is locked. Athletes cannot be changed after submission.
              </p>
            </div>
          )}

          <AthleteMultiSelect
            applicationId={id}
            athletes={athletes}
            selectedIds={selectedAthleteIds}
            disabled={!isDraft}
          />
        </div>

        {/* Actions */}
        {isDraft ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Submit Application</h2>
            <p className="text-sm text-gray-500 mb-4">
              Save your athlete selection first, then submit. Once submitted the application is locked and cannot be edited.
            </p>
            <SubmitButton applicationId={id} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Submission Status</h2>
            <p className="text-sm text-gray-500">
              Submitted on {formatDate(application.submitted_at)}.
              {' '}Your application is under review by the SLKF Head Master.
            </p>
            {application.rejection_reason && (
              <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-600">{application.rejection_reason}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
