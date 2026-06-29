'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface HMClass {
  id: string
  name: string
  created_at: string
}

export default function HMSettingsPage() {
  const router = useRouter()

  // Dojo code state
  const [dojoCode, setDojoCode]   = useState('')
  const [current, setCurrent]     = useState<string | null>(null)
  const [assocName, setAssocName] = useState('')
  const [saving, setSaving]       = useState(false)
  const [dojoError, setDojoError] = useState<string | null>(null)
  const [dojoSuccess, setDojoSuccess] = useState(false)

  // Classes state
  const [classes, setClasses]       = useState<HMClass[]>([])
  const [newClassName, setNewClassName] = useState('')
  const [addingClass, setAddingClass]   = useState(false)
  const [classError, setClassError]     = useState<string | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/head-master/settings')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setCurrent(json.data.dojo_code ?? null)
          setDojoCode(json.data.dojo_code ?? '')
          setAssocName(json.data.association_name ?? '')
        }
      })

    fetch('/api/head-master/classes')
      .then(r => r.json())
      .then(json => { if (json.data) setClasses(json.data) })
  }, [])

  async function saveDojoCode(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setDojoError(null)
    setDojoSuccess(false)
    try {
      const res  = await fetch('/api/head-master/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dojo_code: dojoCode }),
      })
      const json = await res.json()
      if (!res.ok) { setDojoError(json.error?.message ?? 'Failed to save.'); return }
      setCurrent(json.data.dojo_code)
      setDojoSuccess(true)
      router.refresh()
    } catch { setDojoError('Network error.') }
    finally { setSaving(false) }
  }

  async function addClass(e: React.FormEvent) {
    e.preventDefault()
    const name = newClassName.trim()
    if (!name) return
    setAddingClass(true)
    setClassError(null)
    try {
      const res  = await fetch('/api/head-master/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!res.ok) { setClassError(json.error?.message ?? 'Failed to add class.'); return }
      setClasses(prev => [...prev, json.data])
      setNewClassName('')
    } catch { setClassError('Network error.') }
    finally { setAddingClass(false) }
  }

  async function deleteClass(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/head-master/classes/${id}`, { method: 'DELETE' })
      setClasses(prev => prev.filter(c => c.id !== id))
    } finally { setDeletingId(null) }
  }

  const preview = dojoCode.trim().toUpperCase()
  const example = preview ? `ISK-${preview}-0001` : 'ISK-???-0001'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/head-master/dashboard"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Dojo Settings</h1>
            <p className="text-xs text-gray-500">{assocName || 'Head Master Settings'}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ── Dojo Code ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {current && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-green-700 font-medium">Dojo code active</p>
                <p className="text-sm font-bold text-green-900 font-mono">{current}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">About Dojo Code</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your dojo code is a short unique identifier (2–6 letters/numbers) used to
                generate student numbers. Example: <strong>WAT</strong> for Waththala Dojo
                produces student numbers like <span className="font-mono text-red-600">ISK-WAT-0001</span>.
              </p>
            </div>

            <form onSubmit={saveDojoCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Dojo Code</label>
                <input
                  type="text"
                  value={dojoCode}
                  onChange={e => { setDojoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setDojoSuccess(false) }}
                  maxLength={6}
                  placeholder="e.g. WAT, COL, GAL"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={saving}
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Student numbers will look like:{' '}
                  <span className="font-mono font-semibold text-gray-700">{example}</span>
                </p>
              </div>

              {dojoError   && <p className="text-sm text-red-600 font-medium">{dojoError}</p>}
              {dojoSuccess  && <p className="text-sm text-green-600 font-medium">Dojo code saved successfully.</p>}

              {current && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-700">
                    Changing the code does not renumber existing students. New approvals will use the new code.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !dojoCode.trim() || dojoCode.trim() === current}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {saving ? 'Saving…' : 'Save Dojo Code'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Training Classes / Locations ──────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Training Locations / Classes</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Define your training locations or classes. Students will select their class when applying for a tournament.
            </p>
          </div>

          {/* Existing classes */}
          {classes.length > 0 && (
            <div className="space-y-2">
              {classes.map(cls => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                >
                  <span className="text-sm font-medium text-gray-800">{cls.name}</span>
                  <button
                    type="button"
                    onClick={() => deleteClass(cls.id)}
                    disabled={deletingId === cls.id}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 shrink-0"
                    aria-label={`Remove ${cls.name}`}
                  >
                    {deletingId === cls.id ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {classes.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-4">
              No classes defined yet. Add your first training location below.
            </p>
          )}

          {/* Add new class */}
          <form onSubmit={addClass} className="flex gap-2">
            <input
              type="text"
              value={newClassName}
              onChange={e => { setNewClassName(e.target.value); setClassError(null) }}
              placeholder="e.g. Main Dojo, Branch 2, Colombo Dojo"
              maxLength={100}
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={addingClass}
            />
            <button
              type="submit"
              disabled={addingClass || !newClassName.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors shrink-0"
            >
              {addingClass ? '…' : 'Add'}
            </button>
          </form>
          {classError && <p className="text-sm text-red-600 font-medium">{classError}</p>}
        </div>

      </main>
    </div>
  )
}
