import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { StudentApplication, Tournament } from '@/types/database'
import { ageCategoryLabel, formatWeightClass } from '@/lib/constants/karate'
import Link from 'next/link'

export const metadata = { title: 'Application Status — SLKF Tournament' }

export default async function ApplicationStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = supabase as any

  const appResult = await db.from('student_applications').select('*').eq('id', id).single()
  if (appResult.error || !appResult.data) redirect('/student/dashboard')

  const app = appResult.data as StudentApplication
  if (app.user_id !== user.id) redirect('/student/dashboard')

  const tournResult = await db.from('tournaments').select('name, bank_account_number, bank_account_name, bank_branch').eq('id', app.tournament_id).single()
  const tournament = tournResult.data as Pick<Tournament, 'name' | 'bank_account_number' | 'bank_account_name' | 'bank_branch'> | null

  const events = [
    app.kata_entry && `KATA${app.kata_level ? ` (${app.kata_level})` : ''}`,
    app.kumite_entry && `KUMITE${app.kumite_weight_class ? ` (${formatWeightClass(app.kumite_weight_class)})` : ''}`,
  ].filter(Boolean).join(' + ')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/student/dashboard" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Application Status</h1>
            <p className="text-xs text-gray-500">{tournament?.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* APPROVED */}
        {app.status === 'APPROVED' && (
          <div className="bg-white rounded-2xl border border-green-200 overflow-hidden">
            <div className="bg-green-50 px-6 py-5 text-center border-b border-green-100">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-green-800">Successfully Registered!</h2>
              <p className="text-sm text-green-600 mt-1">Your application has been approved.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Row label="Student ID"    value={app.student_number ?? '—'} highlight />
              <Row label="Tournament"    value={tournament?.name ?? '—'} />
              <Row label="Age Category"  value={ageCategoryLabel(app.age_category_code as any)} />
              <Row label="Event(s)"      value={events} />
              <Row label="Total Amount"  value={`LKR ${app.total_amount_lkr.toLocaleString()}`} highlight />
              {app.reviewed_at && (
                <Row label="Approved on" value={new Date(app.reviewed_at).toLocaleDateString('en-GB')} />
              )}
            </div>
          </div>
        )}

        {/* PENDING */}
        {app.status === 'PENDING' && (
          <div className="bg-white rounded-2xl border border-gray-200">
            <div className="bg-yellow-50 px-6 py-5 text-center border-b border-yellow-100">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 mb-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-yellow-800">Waiting for Approval</h2>
              <p className="text-sm text-yellow-600 mt-1">Your application is under review by SLKF.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Row label="Tournament"   value={tournament?.name ?? '—'} />
              <Row label="Age Category" value={ageCategoryLabel(app.age_category_code as any)} />
              <Row label="Event(s)"     value={events} />
              <Row label="Total Paid"   value={`LKR ${app.total_amount_lkr.toLocaleString()}`} highlight />
              <Row label="Submitted"    value={new Date(app.created_at).toLocaleDateString('en-GB')} />
            </div>
            <div className="px-6 pb-5">
              <Link
                href={`/student/apply/${app.tournament_id}`}
                className="block text-center border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Edit Application
              </Link>
            </div>
          </div>
        )}

        {/* REJECTED */}
        {app.status === 'REJECTED' && (
          <div className="bg-white rounded-2xl border border-red-200">
            <div className="bg-red-50 px-6 py-5 text-center border-b border-red-100">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-red-800">Application Rejected</h2>
              {app.review_notes && (
                <p className="text-sm text-red-600 mt-2 bg-red-100 rounded-lg px-3 py-2">{app.review_notes}</p>
              )}
            </div>
            <div className="px-6 py-5 space-y-4">
              <Row label="Tournament"   value={tournament?.name ?? '—'} />
              <Row label="Age Category" value={ageCategoryLabel(app.age_category_code as any)} />
              <Row label="Event(s)"     value={events} />
              {app.reviewed_at && (
                <Row label="Rejected on" value={new Date(app.reviewed_at).toLocaleDateString('en-GB')} />
              )}
            </div>
            <div className="px-6 pb-5">
              <Link
                href={`/student/apply/${app.tournament_id}`}
                className="block text-center bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Re-apply
              </Link>
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link href="/student/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</span>
    </div>
  )
}
