'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SubmitButton({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/submit`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to submit application.')
        setShowConfirm(false)
        return
      }
      router.push('/association/applications')
      router.refresh()
    } catch {
      setError('A network error occurred. Please try again.')
      setShowConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex flex-col gap-3">
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-sm font-semibold text-amber-800">Are you sure?</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Once submitted, your application will be locked and athletes cannot be changed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Submitting…' : 'Confirm & Submit'}
          </button>
          <button
            onClick={() => { setShowConfirm(false); setError(null) }}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={() => setShowConfirm(true)}
        className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
      >
        Submit Application
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
