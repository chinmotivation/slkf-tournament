import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import StatusBadge from '@/components/tournaments/StatusBadge'
import PublishButton from '@/components/tournaments/PublishButton'
import type { Tournament } from '@/types/database'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const result = await db.from('tournaments').select('name').eq('id', id).single()
  const row = result.data as { name: string } | null
  return { title: row ? `${row.name} — SLKF Tournament` : 'Tournament — SLKF' }
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' })
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
      <dt className="text-sm text-gray-500 w-1/2">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 text-right">{value}</dd>
    </div>
  )
}

export default async function TournamentDetailPage({ params }: Props) {
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
  if (!p) redirect('/login')

  const tournamentResult = await db.from('tournaments').select('*').eq('id', id).single()
  if (tournamentResult.error || !tournamentResult.data) notFound()
  const t = tournamentResult.data as Tournament

  if (p.role === 'association_rep' && t.status !== 'OPEN') notFound()

  const isHeadMaster = p.role === 'head_master'
  const canEdit = isHeadMaster && t.status === 'DRAFT'
  const canPublish = isHeadMaster && t.status === 'DRAFT'
  const backHref = isHeadMaster ? '/head-master/tournaments' : '/association/tournaments'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">SLKF Tournament System</span>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-lg font-bold text-gray-900">{t.name}</h1>
              <StatusBadge status={t.status} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ← Back
            </Link>
            <span className="text-sm text-gray-600">{p.full_name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {isHeadMaster && (
          <div className="flex items-center gap-3">
            {canEdit && (
              <Link
                href={`/head-master/tournaments/${t.id}/edit`}
                className="text-sm font-medium text-gray-700 border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-lg transition-colors"
              >
                Edit Tournament
              </Link>
            )}
            {canPublish && <PublishButton tournamentId={t.id} tournamentName={t.name} />}
            {!canEdit && !canPublish && (
              <Link
                href={`/head-master/tournaments/${t.id}/edit`}
                className="text-sm font-medium text-gray-700 border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-lg transition-colors"
              >
                Edit Details
              </Link>
            )}
          </div>
        )}

        {!isHeadMaster && t.status === 'OPEN' && (
          <div id="apply" className="bg-red-50 border border-red-100 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-800">Ready to apply?</p>
              <p className="text-xs text-red-600 mt-0.5">
                Registration closes {formatDate(t.registration_deadline)}
              </p>
            </div>
            <span className="text-sm text-gray-400 italic">Application system coming in Step 08</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Overview</h2>
          <dl>
            <DetailRow label="Code" value={t.code} />
            <DetailRow label="Year" value={t.year} />
            {t.subtitle && <DetailRow label="Subtitle" value={t.subtitle} />}
            <DetailRow label="Registration Deadline" value={formatDate(t.registration_deadline)} />
            <DetailRow label="Age Eligibility Cutoff" value={formatDate(t.age_eligibility_cutoff_date)} />
          </dl>
        </div>

        {(t.venue_u14 || t.venue_cadet_junior || t.venue_u21_senior) && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Venues</h2>
            <dl>
              <DetailRow label="U14" value={t.venue_u14} />
              <DetailRow label="Cadet / Junior" value={t.venue_cadet_junior} />
              <DetailRow label="U21 / Senior" value={t.venue_u21_senior} />
            </dl>
          </div>
        )}

        {(t.date_u14_start || t.date_cadet_junior || t.date_u21_senior_start) && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Event Dates</h2>
            <dl>
              {t.date_u14_start && (
                <DetailRow
                  label="U14"
                  value={
                    t.date_u14_end && t.date_u14_end !== t.date_u14_start
                      ? `${formatDate(t.date_u14_start)} — ${formatDate(t.date_u14_end)}`
                      : formatDate(t.date_u14_start)
                  }
                />
              )}
              <DetailRow label="Cadet / Junior" value={formatDate(t.date_cadet_junior)} />
              {t.date_u21_senior_start && (
                <DetailRow
                  label="U21 / Senior"
                  value={
                    t.date_u21_senior_end && t.date_u21_senior_end !== t.date_u21_senior_start
                      ? `${formatDate(t.date_u21_senior_start)} — ${formatDate(t.date_u21_senior_end)}`
                      : formatDate(t.date_u21_senior_start)
                  }
                />
              )}
            </dl>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Entry Fees</h2>
          <dl>
            <DetailRow label="Individual — 1 Event" value={`LKR ${t.fee_individual_one_event_lkr.toLocaleString()}`} />
            <DetailRow label="Individual — Both Events" value={`LKR ${t.fee_individual_both_events_lkr.toLocaleString()}`} />
            <DetailRow label="Team Kata" value={`LKR ${t.fee_team_kata_lkr.toLocaleString()}`} />
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Payment Details</h2>
          <dl>
            <DetailRow label="Account Name" value={t.bank_account_name} />
            <DetailRow label="Account Number" value={t.bank_account_number} />
            <DetailRow label="Bank" value={t.bank_name} />
            <DetailRow label="Branch" value={t.bank_branch} />
          </dl>
        </div>

        {t.notes && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Notes</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{t.notes}</p>
          </div>
        )}
      </main>
    </div>
  )
}
