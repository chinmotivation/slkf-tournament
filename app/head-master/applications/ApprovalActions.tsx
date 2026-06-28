'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ApprovalActions({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setLoading('approve')
    setError(null)
    try {
      const res = await fetch(`/api/student/applications/${applicationId}/approve`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? 'Failed to approve.'); return }
      router.refresh()
    } catch { setError('Network error.') }
    finally { setLoading(null) }
  }

  async function reject() {
    if (!notes.trim() || notes.trim().length < 5) {
      setError('Please enter a reason (minimum 5 characters).')
      return
    }
    setLoading('reject')
    setError(null)
    try {
      const res = await fetch(`/api/student/applications/${applicationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? 'Failed to reject.'); return }
      setShowReject(false)
      router.refresh()
    } catch { setError('Network error.') }
    finally { setLoading(null) }
  }

  if (showReject) {
    return (
      <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Enter rejection reason (required, min 5 characters)"
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          rows={3}
        />
        <div className="flex gap-2">
          <button
            onClick={() => { setShowReject(false); setNotes(''); setError(null) }}
            className="flex-1 text-sm text-gray-600 border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={reject}
            disabled={loading === 'reject'}
            className="flex-1 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl py-2.5 font-semibold transition-colors"
          >
            {loading === 'reject' ? 'Rejecting…' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      {error && <p className="text-xs text-red-600 mb-3 font-medium">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => setShowReject(true)}
          disabled={!!loading}
          className="flex-1 text-sm border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-xl py-2.5 font-medium transition-colors"
        >
          Reject
        </button>
        <button
          onClick={approve}
          disabled={!!loading}
          className="flex-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl py-2.5 font-semibold transition-colors"
        >
          {loading === 'approve' ? 'Approving…' : 'Approve Payment'}
        </button>
      </div>
    </div>
  )
}
