'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ReceiptViewer from './ReceiptViewer'
import { ageCategoryLabel, iskAgeCategoryLabel, formatWeightClass, type AgeCategoryCode } from '@/lib/constants/karate'

export interface EnrichedApp {
  id: string
  full_name: string
  gender: string
  student_number: string | null
  status: string
  age_category_code: string
  belt_grade: string
  date_of_birth: string
  kata_entry: boolean
  kata_level: string | null
  kata_approved: boolean | null
  kumite_entry: boolean
  kumite_weight_class: string | null
  kumite_approved: boolean | null
  team_kata_entry: boolean
  team_kata_team_name: string | null
  team_kata_approved: boolean | null
  total_amount_lkr: number
  payment_receipt_url: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
}

interface Props {
  applications: EnrichedApp[]
  signedUrls: Record<string, string>
  teamMembersMap: Record<string, string[]>
  tournamentName: string
}

type ApprovalField = 'kata_approved' | 'kumite_approved' | 'team_kata_approved'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildWhatsAppMsg(
  fullName: string,
  studentNumber: string,
  tournamentName: string,
  eventLabels: string[],
  totalAmount: number,
  regUrl: string,
): string {
  return [
    `🎉 *Registration Confirmed!*`,
    ``,
    `You are registered for *${tournamentName}*`,
    ``,
    `*Athlete:* ${fullName}`,
    `*Student No:* ${studentNumber}`,
    `*Events:* ${eventLabels.join(' · ')}`,
    `*Fee Paid:* LKR ${totalAmount.toLocaleString()}`,
    ``,
    `📋 *Registration Card:*`,
    regUrl,
    ``,
    `🥋 See you on the mat!`,
    `— SLKF Karate`,
  ].join('\n')
}

function openWhatsApp(
  fullName: string,
  studentNumber: string,
  tournamentName: string,
  eventLabels: string[],
  totalAmount: number,
  appId: string,
) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const regUrl = `${origin}/reg/${appId}`
  const msg = buildWhatsAppMsg(fullName, studentNumber, tournamentName, eventLabels, totalAmount, regUrl)
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
}

// ─── WhatsApp icon ────────────────────────────────────────────────────────────

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  )
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  app: EnrichedApp
  approvals: Record<ApprovalField, boolean | null>
  events: { label: string; detail: string; field: ApprovalField }[]
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({ app, approvals, events, loading, onConfirm, onCancel }: ConfirmModalProps) {
  const approved  = events.filter(ev => approvals[ev.field])
  const skipped   = events.filter(ev => !approvals[ev.field])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Confirm Payment Approval</p>
          <p className="text-base font-bold text-gray-900">{app.full_name}</p>
          <p className="text-sm text-gray-500">LKR {app.total_amount_lkr.toLocaleString()}</p>

          <div className="mt-4 space-y-1.5">
            {approved.map(ev => (
              <div key={ev.field} className="flex items-center gap-2 text-sm">
                <span className="w-4 h-4 flex items-center justify-center rounded-full bg-green-100 shrink-0">
                  <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-green-800 font-medium">{ev.label}{ev.detail}</span>
              </div>
            ))}
            {skipped.map(ev => (
              <div key={ev.field} className="flex items-center gap-2 text-sm">
                <span className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-100 shrink-0">
                  <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                <span className="text-gray-400">{ev.label}{ev.detail} — not approved</span>
              </div>
            ))}
          </div>

          {skipped.length > 0 && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {skipped.length} event{skipped.length > 1 ? 's' : ''} will NOT be approved for this student.
            </p>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 text-sm text-gray-600 border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl py-2.5 font-semibold transition-colors"
          >
            {loading ? 'Approving…' : 'Confirm Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── WhatsAppModal ────────────────────────────────────────────────────────────

interface WhatsAppModalProps {
  fullName: string
  studentNumber: string
  tournamentName: string
  approvedEventLabels: string[]
  totalAmount: number
  appId: string
  onSend: () => void
  onLater: () => void
}

function WhatsAppModal({
  fullName, studentNumber, tournamentName, approvedEventLabels, totalAmount, appId, onSend, onLater,
}: WhatsAppModalProps) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const regUrl = `${origin}/reg/${appId}`
  const message = buildWhatsAppMsg(fullName, studentNumber, tournamentName, approvedEventLabels, totalAmount, regUrl)
  const waUrl   = `https://wa.me/?text=${encodeURIComponent(message)}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
              <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Registration Confirmed</p>
              <p className="text-sm font-bold text-gray-900">{fullName}</p>
              <p className="text-xs text-gray-500 font-mono">{studentNumber}</p>
            </div>
          </div>

          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Message Preview</p>
          <div className="bg-[#ECE5DD] rounded-xl px-3 py-2.5 text-[11px] text-gray-800 whitespace-pre-line leading-relaxed max-h-44 overflow-y-auto">
            {message}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onLater}
            className="flex-1 text-sm text-gray-600 border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
          >
            Not Now
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onSend}
            className="flex-1 text-sm bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl py-2.5 font-semibold transition-colors text-center flex items-center justify-center gap-1.5"
          >
            <WhatsAppIcon className="w-4 h-4 text-white shrink-0" />
            Send via WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── AppCard ──────────────────────────────────────────────────────────────────

interface AppCardProps {
  app: EnrichedApp
  signedUrl?: string
  teamMembers: string[]
  tournamentName: string
}

function AppCard({ app, signedUrl, teamMembers, tournamentName }: AppCardProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)

  const [approvals, setApprovals] = useState({
    kata_approved:      app.kata_approved,
    kumite_approved:    app.kumite_approved,
    team_kata_approved: app.team_kata_approved,
  })

  const [paymentLoading, setPaymentLoading] = useState<'approve' | 'reject' | null>(null)
  const [showConfirm, setShowConfirm]       = useState(false)
  const [showReject, setShowReject]         = useState(false)
  const [rejectNotes, setRejectNotes]       = useState('')
  const [actionError, setActionError]       = useState<string | null>(null)
  // studentNumber stored here after approval so WhatsApp modal can show it before router.refresh()
  const [whatsAppPending, setWhatsAppPending] = useState<string | null>(null)

  const isPending  = app.status === 'PENDING'
  const isApproved = app.status === 'APPROVED'
  const isRejected = app.status === 'REJECTED'

  const categoryLabel = app.age_category_code.startsWith('ISK_')
    ? iskAgeCategoryLabel(app.age_category_code)
    : ageCategoryLabel(app.age_category_code as AgeCategoryCode)

  const events: { label: string; detail: string; field: ApprovalField }[] = []
  if (app.kata_entry) events.push({
    label: 'KATA',
    detail: app.kata_level ? ` — ${app.kata_level}` : '',
    field: 'kata_approved',
  })
  if (app.kumite_entry) events.push({
    label: 'KUMITE',
    detail: app.kumite_weight_class ? ` — ${formatWeightClass(app.kumite_weight_class)}` : '',
    field: 'kumite_approved',
  })
  if (app.team_kata_entry) events.push({
    label: 'T.KATA',
    detail: app.team_kata_team_name ? ` — "${app.team_kata_team_name}"` : '',
    field: 'team_kata_approved',
  })

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  function toggleApproval(field: ApprovalField) {
    setApprovals(prev => ({ ...prev, [field]: !prev[field] }))
  }

  function approveAllEventsLocal() {
    const updates: Partial<Record<ApprovalField, boolean>> = {}
    if (app.kata_entry)      updates.kata_approved = true
    if (app.kumite_entry)    updates.kumite_approved = true
    if (app.team_kata_entry) updates.team_kata_approved = true
    setApprovals(prev => ({ ...prev, ...updates }))
  }

  function handleApproveClick() {
    setActionError(null)
    const anyApproved = events.some(ev => approvals[ev.field])
    if (!anyApproved) {
      setActionError('Please approve at least one event (KATA, KUMITE or T.KATA) before approving payment.')
      return
    }
    setShowConfirm(true)
  }

  async function confirmApprove() {
    setPaymentLoading('approve')
    setActionError(null)
    try {
      // 1. Save event approvals
      const updates: Record<string, boolean | null> = {}
      events.forEach(ev => { updates[ev.field] = approvals[ev.field] ?? null })
      const patchRes = await fetch(`/api/head-master/applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!patchRes.ok) {
        setActionError('Failed to save event approvals. Please try again.')
        return
      }

      // 2. Approve payment
      const res  = await fetch(`/api/student/applications/${app.id}/approve`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setActionError(json.error?.message ?? 'Failed to approve payment.'); return }

      setShowConfirm(false)
      // Show WhatsApp share modal before refreshing
      setWhatsAppPending(json.data?.student_number ?? app.student_number ?? '')
    } catch { setActionError('Network error. Please try again.') }
    finally { setPaymentLoading(null) }
  }

  function dismissWhatsApp() {
    setWhatsAppPending(null)
    router.refresh()
  }

  async function rejectPayment() {
    if (!rejectNotes.trim() || rejectNotes.trim().length < 5) {
      setActionError('Please enter a reason (min 5 characters).')
      return
    }
    setPaymentLoading('reject')
    setActionError(null)
    try {
      const res  = await fetch(`/api/student/applications/${app.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rejectNotes }),
      })
      const json = await res.json()
      if (!res.ok) { setActionError(json.error?.message ?? 'Failed to reject.'); return }
      setShowReject(false)
      router.refresh()
    } catch { setActionError('Network error.') }
    finally { setPaymentLoading(null) }
  }

  async function saveApprovalToggle(field: ApprovalField, newValue: boolean) {
    setApprovals(prev => ({ ...prev, [field]: newValue }))
    try {
      await fetch(`/api/head-master/applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue }),
      })
    } catch {
      setApprovals(prev => ({ ...prev, [field]: !newValue }))
    }
  }

  // Build approved event labels for WhatsApp message (for already-approved cards)
  const approvedEventLabels = events
    .filter(ev => !!approvals[ev.field])
    .map(ev => ev.label)

  const borderColor = isPending ? 'border-amber-200' : isApproved ? 'border-green-200' : 'border-red-200'
  const statusBadge = isPending
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : isApproved
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-red-50 text-red-700 border-red-200'
  const statusLabel = isPending ? 'Pending' : isApproved ? 'Approved' : 'Rejected'

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          app={app}
          approvals={approvals}
          events={events}
          loading={paymentLoading === 'approve'}
          onConfirm={confirmApprove}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {whatsAppPending !== null && (
        <WhatsAppModal
          fullName={app.full_name}
          studentNumber={whatsAppPending}
          tournamentName={tournamentName}
          approvedEventLabels={approvedEventLabels.length > 0 ? approvedEventLabels : events.map(e => e.label)}
          totalAmount={app.total_amount_lkr}
          appId={app.id}
          onSend={dismissWhatsApp}
          onLater={dismissWhatsApp}
        />
      )}

      <div className={`bg-white rounded-xl border overflow-hidden shadow-sm ${borderColor}`}>

        {/* ── Summary row (always visible, click to expand) ── */}
        <button
          type="button"
          onClick={() => setIsExpanded(v => !v)}
          className="w-full text-left p-4 hover:bg-gray-50/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <span className="font-semibold text-gray-900 text-[15px]">{app.full_name}</span>
              <span className="text-xs text-gray-400">{app.gender === 'MALE' ? 'Male' : 'Female'}</span>
              {app.student_number && (
                <span className="text-[11px] font-mono bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5">
                  {app.student_number}
                </span>
              )}
              <span className={`text-[11px] font-semibold border rounded-full px-2.5 py-0.5 ${statusBadge}`}>
                {statusLabel}
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 shrink-0 mt-0.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {events.map(ev => {
                const isOk = !!approvals[ev.field]
                return (
                  <span key={ev.field} className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    isOk
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    {isOk && (
                      <svg className="w-2.5 h-2.5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {ev.label}
                  </span>
                )
              })}
              {events.length === 0 && <span className="text-xs text-gray-400 italic">No events</span>}
            </div>
            <span className="text-sm font-bold text-gray-700">LKR {app.total_amount_lkr.toLocaleString()}</span>
          </div>

          <p className="text-[11px] text-gray-400 mt-1.5">Submitted {fmtDate(app.created_at)}</p>
        </button>

        {/* ── Expanded section ── */}
        {isExpanded && (
          <div className="border-t border-gray-100 divide-y divide-gray-100">

            {/* Receipt */}
            <div className="p-4">
              {signedUrl ? (
                <ReceiptViewer
                  url={signedUrl}
                  filename={app.payment_receipt_url?.split('/').pop() ?? 'receipt'}
                />
              ) : (
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-gray-400 italic">No payment receipt uploaded</p>
                </div>
              )}
            </div>

            {/* Event approvals */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Event Approvals</p>
                  {isPending && (
                    <p className="text-[10px] text-gray-400 mt-0.5">Tick events to approve · saved when you approve payment</p>
                  )}
                </div>
                {events.length > 0 && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); approveAllEventsLocal() }}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve All
                  </button>
                )}
              </div>

              {events.length === 0 && (
                <p className="text-sm text-gray-400 italic">No events entered.</p>
              )}

              <div className="space-y-2">
                {events.map(ev => {
                  const isChecked = !!approvals[ev.field]
                  return (
                    <button
                      key={ev.field}
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        if (!isPending) {
                          saveApprovalToggle(ev.field, !isChecked)
                        } else {
                          toggleApproval(ev.field)
                        }
                      }}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors text-left ${
                        isChecked
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isChecked
                            ? 'bg-green-600 border-green-600'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isChecked ? 'text-green-800' : 'text-gray-800'}`}>
                          {ev.label}{ev.detail}
                        </p>
                        {ev.field === 'team_kata_approved' && teamMembers.length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Members: {teamMembers.join(' · ')}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Student meta */}
            <div className="px-4 py-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 bg-gray-50/80">
              <span>Belt: <span className="font-medium text-gray-700">{app.belt_grade}</span></span>
              <span>DOB: <span className="font-medium text-gray-700">{new Date(app.date_of_birth).toLocaleDateString('en-GB')}</span></span>
              <span>Category: <span className="font-medium text-gray-700">{categoryLabel}</span></span>
            </div>

            {/* Payment actions / review status */}
            <div className="p-4">
              {actionError && (
                <p className="text-xs text-red-600 font-medium mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{actionError}</p>
              )}

              {isPending && !showReject && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowReject(true); setActionError(null) }}
                    disabled={!!paymentLoading}
                    className="flex-1 text-sm border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-xl py-2.5 font-medium transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApproveClick}
                    disabled={!!paymentLoading}
                    className="flex-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl py-2.5 font-semibold transition-colors"
                  >
                    Approve Payment
                  </button>
                </div>
              )}

              {isPending && showReject && (
                <div className="space-y-3">
                  <textarea
                    value={rejectNotes}
                    onChange={e => setRejectNotes(e.target.value)}
                    placeholder="Rejection reason (required, min 5 characters)"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowReject(false); setRejectNotes(''); setActionError(null) }}
                      className="flex-1 text-sm text-gray-600 border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={rejectPayment}
                      disabled={paymentLoading === 'reject'}
                      className="flex-1 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl py-2.5 font-semibold transition-colors"
                    >
                      {paymentLoading === 'reject' ? 'Rejecting…' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              )}

              {isApproved && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Payment approved{app.reviewed_at ? ` · ${fmtDate(app.reviewed_at)}` : ''}
                      {app.student_number ? ` · ${app.student_number}` : ''}
                    </span>
                  </div>

                  {/* Share via WhatsApp button */}
                  {app.student_number && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        openWhatsApp(
                          app.full_name,
                          app.student_number!,
                          tournamentName,
                          approvedEventLabels,
                          app.total_amount_lkr,
                          app.id,
                        )
                      }}
                      className="w-full flex items-center justify-center gap-2 text-sm text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/5 rounded-xl py-2.5 font-semibold transition-colors"
                    >
                      <WhatsAppIcon className="w-4 h-4 shrink-0" />
                      Share Registration via WhatsApp
                    </button>
                  )}
                </div>
              )}

              {isRejected && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Rejected{app.reviewed_at ? ` · ${fmtDate(app.reviewed_at)}` : ''}</span>
                  </div>
                  {app.review_notes && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                      Reason: {app.review_notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── ApplicationsManager ──────────────────────────────────────────────────────

export default function ApplicationsManager({ applications, signedUrls, teamMembersMap, tournamentName }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return applications
    return applications.filter(a =>
      a.full_name.toLowerCase().includes(q) ||
      (a.student_number?.toLowerCase().includes(q) ?? false)
    )
  }, [applications, search])

  const pending  = filtered.filter(a => a.status === 'PENDING')
  const approved = filtered.filter(a => a.status === 'APPROVED')
  const rejected = filtered.filter(a => a.status === 'REJECTED')

  return (
    <div className="space-y-5">

      {/* Search bar */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          placeholder="Search by name or student ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {search && (
        <p className="text-xs text-gray-500">
          {filtered.length === 0
            ? `No results for "${search}"`
            : `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${search}"`}
        </p>
      )}

      {/* Pending queue */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Awaiting Verification ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(app => (
              <AppCard
                key={app.id}
                app={app}
                signedUrl={signedUrls[app.id]}
                teamMembers={app.team_kata_team_name ? (teamMembersMap[app.team_kata_team_name] ?? []) : []}
                tournamentName={tournamentName}
              />
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
            {approved.map(app => (
              <AppCard
                key={app.id}
                app={app}
                signedUrl={signedUrls[app.id]}
                teamMembers={app.team_kata_team_name ? (teamMembersMap[app.team_kata_team_name] ?? []) : []}
                tournamentName={tournamentName}
              />
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
            {rejected.map(app => (
              <AppCard
                key={app.id}
                app={app}
                signedUrl={signedUrls[app.id]}
                teamMembers={app.team_kata_team_name ? (teamMembersMap[app.team_kata_team_name] ?? []) : []}
                tournamentName={tournamentName}
              />
            ))}
          </div>
        </section>
      )}

      {applications.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          No student applications yet.
        </div>
      )}

      {applications.length > 0 && filtered.length === 0 && search && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          No results for &ldquo;{search}&rdquo;
        </div>
      )}
    </div>
  )
}
