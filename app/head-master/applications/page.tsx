import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import type { StudentApplication } from '@/types/database'
import { ageCategoryLabel, formatWeightClass } from '@/lib/constants/karate'
import Link from 'next/link'
import ApprovalActions from './ApprovalActions'
import ReceiptViewer from './ReceiptViewer'

export const metadata = { title: 'Payment Verification — SLKF Head Master' }

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = supabase as any
  const result = await db
    .from('student_applications')
    .select('*')
    .order('created_at', { ascending: true })

  const applications = (result.data ?? []) as StudentApplication[]

  // Generate 1-hour signed URLs for all receipts using the admin client
  // (bucket is private; student-owned RLS blocks the head master's session)
  const admin = createAdminClient() as any
  const signedUrls = new Map<string, string>()
  await Promise.all(
    applications
      .filter((a: StudentApplication) => a.payment_receipt_url)
      .map(async (a: StudentApplication) => {
        const { data } = await admin.storage
          .from('payment-receipts')
          .createSignedUrl(a.payment_receipt_url!, 60 * 60)
        if (data?.signedUrl) signedUrls.set(a.id, data.signedUrl)
      })
  )

  const pending  = applications.filter((a: StudentApplication) => a.status === 'PENDING')
  const approved = applications.filter((a: StudentApplication) => a.status === 'APPROVED')
  const rejected = applications.filter((a: StudentApplication) => a.status === 'REJECTED')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
          <div>
            <h1 className="text-base font-semibold text-gray-900">Payment Verification</h1>
            <p className="text-xs text-gray-500">
              {pending.length} pending · {approved.length} approved · {rejected.length} rejected
            </p>
          </div>
        </div>
      </header>

      {/* Queue banner */}
      {pending.length > 0 && (
        <div className="bg-amber-500 text-white">
          <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium">
              {pending.length} application{pending.length !== 1 ? 's' : ''} waiting for payment verification
            </p>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-6">

        {/* Pending queue */}
        {pending.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Awaiting Verification ({pending.length})
            </h2>
            <div className="space-y-4">
              {pending.map((app: StudentApplication) => (
                <PaymentCard key={app.id} app={app} signedUrl={signedUrls.get(app.id)} showActions />
              ))}
            </div>
          </section>
        )}

        {/* Approved */}
        {approved.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Approved ({approved.length})
            </h2>
            <div className="space-y-3">
              {approved.map((app: StudentApplication) => (
                <PaymentCard key={app.id} app={app} signedUrl={signedUrls.get(app.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Rejected */}
        {rejected.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              Rejected ({rejected.length})
            </h2>
            <div className="space-y-3">
              {rejected.map((app: StudentApplication) => (
                <PaymentCard key={app.id} app={app} signedUrl={signedUrls.get(app.id)} />
              ))}
            </div>
          </section>
        )}

        {applications.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            No student applications yet.
          </div>
        )}
      </main>
    </div>
  )
}

function PaymentCard({ app, signedUrl, showActions }: { app: StudentApplication; signedUrl?: string; showActions?: boolean }) {
  const events = [
    app.kata_entry && `Kata${app.kata_level ? ` — ${app.kata_level}` : ''}`,
    app.kumite_entry && `Kumite${app.kumite_weight_class ? ` — ${formatWeightClass(app.kumite_weight_class)}` : ''}`,
  ].filter(Boolean).join(' + ')

  const statusColors: Record<string, string> = {
    PENDING:  'bg-amber-50 text-amber-700 border-amber-200',
    APPROVED: 'bg-green-50 text-green-700 border-green-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
  }
  const statusLabels: Record<string, string> = {
    PENDING:  'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  }

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${showActions ? 'border-amber-200 shadow-sm' : 'border-gray-200'}`}>
      <div className="p-4">
        {/* Student info row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{app.full_name}</p>
              <span className="text-xs text-gray-400">{app.gender === 'MALE' ? 'Male' : 'Female'}</span>
              {app.student_number && (
                <span className="text-xs font-mono bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5">
                  {app.student_number}
                </span>
              )}
              {!showActions && (
                <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${statusColors[app.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {statusLabels[app.status] ?? app.status}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{ageCategoryLabel(app.age_category_code as any)} · {events}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-gray-400">Belt: {app.belt_grade}</span>
              <span className="text-xs text-gray-400">DOB: {new Date(app.date_of_birth).toLocaleDateString('en-GB')}</span>
              <span className="text-xs font-semibold text-gray-700">LKR {app.total_amount_lkr.toLocaleString()}</span>
            </div>
            {app.review_notes && (
              <p className="text-xs text-red-500 mt-1.5 bg-red-50 rounded-lg px-2 py-1">
                Reason: {app.review_notes}
              </p>
            )}
          </div>
        </div>

        {/* Payment receipt */}
        <div className="mt-4">
          {signedUrl ? (
            <ReceiptViewer
              url={signedUrl}
              filename={app.payment_receipt_url?.split('/').pop() ?? 'receipt'}
            />
          ) : (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400 italic">No payment receipt uploaded</p>
            </div>
          )}
        </div>

        {/* Approval metadata */}
        {app.reviewed_at && (
          <p className="text-xs text-gray-400 mt-3">
            Reviewed {new Date(app.reviewed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {showActions && <ApprovalActions applicationId={app.id} />}
    </div>
  )
}
