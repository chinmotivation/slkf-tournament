'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { CheckInResult } from '@/app/api/check-in/verify/route'

interface Props {
  tournamentId: string
}

type Mode = 'qr' | 'manual'
type Status = 'idle' | 'scanning' | 'loading' | 'result' | 'success' | 'error'

export default function CheckInClient({ tournamentId }: Props) {
  const [mode, setMode] = useState<Mode>('qr')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CheckInResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [marking, setMarking] = useState(false)

  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null)
  const scannerDivId = 'qr-reader-div'
  const lastScannedRef = useRef<string | null>(null)

  const handleVerify = useCallback(async (token: string) => {
    if (lastScannedRef.current === token) return
    lastScannedRef.current = token
    setStatus('loading')
    setResult(null)
    setErrorMsg(null)

    const res = await fetch(`/api/check-in/verify?token=${encodeURIComponent(token)}`)
    const json = await res.json()
    if (!res.ok) {
      setStatus('error')
      setErrorMsg(json.error?.message ?? 'Entry not found.')
      lastScannedRef.current = null
      return
    }
    setResult(json.data as CheckInResult)
    setStatus('result')
  }, [])

  // Start QR scanner
  useEffect(() => {
    if (mode !== 'qr') return
    setStatus('scanning')
    lastScannedRef.current = null

    let mounted = true
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      if (!mounted) return
      const scanner = new Html5QrcodeScanner(
        scannerDivId,
        { fps: 10, qrbox: { width: 240, height: 240 }, rememberLastUsedCamera: true },
        false
      )
      scanner.render(
        (decodedText: string) => {
          if (!mounted) return
          handleVerify(decodedText.trim())
        },
        () => { /* ignore scan errors */ }
      )
      scannerRef.current = scanner
    })

    return () => {
      mounted = false
      scannerRef.current?.clear().catch(() => {})
      scannerRef.current = null
    }
  }, [mode, handleVerify])

  async function handleMark() {
    if (!result) return
    setMarking(true)
    const res = await fetch('/api/check-in/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: result.token, type: result.type }),
    })
    const json = await res.json()
    setMarking(false)
    if (!res.ok) {
      setErrorMsg(json.error?.message ?? 'Failed to check in.')
      return
    }
    setSuccessMsg(`${result.full_name} checked in successfully.`)
    setStatus('success')
    setResult(null)
    lastScannedRef.current = null
  }

  function reset() {
    setStatus(mode === 'qr' ? 'scanning' : 'idle')
    setResult(null)
    setErrorMsg(null)
    setSuccessMsg(null)
    lastScannedRef.current = null
  }

  async function handleSearch() {
    if (searchQuery.trim().length < 2) return
    setSearchLoading(true)
    setSearchResults([])
    const res = await fetch(
      `/api/check-in/search?tournament_id=${tournamentId}&q=${encodeURIComponent(searchQuery.trim())}`
    )
    const json = await res.json()
    setSearchLoading(false)
    if (res.ok) setSearchResults(json.data ?? [])
  }

  function selectManualEntry(entry: CheckInResult) {
    setResult(entry)
    setStatus('result')
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['qr', 'manual'] as Mode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); reset() }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {m === 'qr' ? 'QR Scanner' : 'Manual Search'}
          </button>
        ))}
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-green-800">{successMsg}</span>
          </div>
          <button onClick={reset} className="text-xs text-green-600 hover:text-green-800 font-medium">
            Next scan
          </button>
        </div>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="text-sm text-red-700">{errorMsg}</span>
          <button onClick={reset} className="text-xs text-red-600 hover:text-red-800 font-medium ml-3">
            Retry
          </button>
        </div>
      )}

      {/* QR mode */}
      {mode === 'qr' && status !== 'result' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          {status === 'loading' ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Looking up athlete…</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-4 text-center">
                Point the camera at the athlete's QR code
              </p>
              <div id={scannerDivId} className="w-full" />
            </>
          )}
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && status !== 'result' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              placeholder="Search by athlete name…"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-300"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searchLoading || searchQuery.trim().length < 2}
              className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
            >
              Search
            </button>
          </div>

          {searchLoading && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map(entry => (
                <button
                  key={`${entry.type}-${entry.entry_id}`}
                  type="button"
                  onClick={() => selectManualEntry(entry)}
                  className="w-full text-left flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.full_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {entry.age_category_code} · {entry.gender} · {entry.events}
                      {entry.association_name ? ` · ${entry.association_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {entry.checked_in_at ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Checked in
                      </span>
                    ) : entry.is_eligible ? (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        Ineligible
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searchLoading && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
            <p className="text-sm text-gray-400 text-center py-3">No athletes found matching "{searchQuery}"</p>
          )}
        </div>
      )}

      {/* Result panel */}
      {status === 'result' && result && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Eligibility header */}
          <div className={`px-6 py-4 border-b ${result.is_eligible ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
            <div className="flex items-center gap-2">
              {result.is_eligible ? (
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <span className={`text-sm font-semibold ${result.is_eligible ? 'text-emerald-800' : 'text-amber-800'}`}>
                {result.is_eligible ? 'Eligible for check-in' : result.ineligible_reason ?? 'Not eligible'}
              </span>
            </div>
          </div>

          {/* Athlete details */}
          <div className="px-6 py-5 space-y-3">
            <div>
              <p className="text-xl font-bold text-gray-900">{result.full_name}</p>
              {result.student_number && (
                <p className="text-xs text-gray-400 mt-0.5">ID: {result.student_number}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Info label="Category" value={result.age_category_code} />
              <Info label="Gender" value={result.gender} />
              <Info label="Events" value={result.events} />
              <Info label="Type" value={result.type === 'student' ? 'Student' : 'Association'} />
              {result.association_name && (
                <Info label="Association" value={result.association_name} />
              )}
              <Info label="Status" value={result.application_status} />
            </div>
            {result.checked_in_at && (
              <div className="bg-green-50 rounded-lg px-3 py-2 text-sm text-green-700">
                Checked in at {new Date(result.checked_in_at).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 pb-5 flex gap-3">
            {result.is_eligible && (
              <button
                type="button"
                onClick={handleMark}
                disabled={marking}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
              >
                {marking ? 'Marking…' : 'Mark as Present ✓'}
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {mode === 'qr' ? 'Scan next' : 'Back'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}
