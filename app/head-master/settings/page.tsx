'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface HMClass {
  id: string
  name: string
  created_at: string
}

type Tab = 'locations' | 'dojocode' | 'logo'

function suggestCode(className: string): string {
  const stop = new Set([
    'isk','class','classes','dojo','the','a','an','of','and','or','in',
    'at','for','branch','main','center','centre','training','karate','sport',
    'sports','sri','lanka','association','institute','school',
  ])
  const words = className
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(w => w.length > 0 && !stop.has(w.toLowerCase()))

  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, Math.min(3, words[0].length)).toUpperCase()
  if (words.length === 2) return (words[0].slice(0, 2) + words[1].slice(0, 1)).toUpperCase()
  return words.map(w => w[0]).join('').slice(0, 6).toUpperCase()
}

export default function HMSettingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<Tab>('locations')

  // Dojo code state
  const [dojoCode, setDojoCode]           = useState('')
  const [current, setCurrent]             = useState<string | null>(null)
  const [assocName, setAssocName]         = useState('')
  const [saving, setSaving]               = useState(false)
  const [dojoError, setDojoError]         = useState<string | null>(null)
  const [dojoSuccess, setDojoSuccess]     = useState(false)
  const [confirmChange, setConfirmChange] = useState(false)

  // Classes state
  const [classes, setClasses]           = useState<HMClass[]>([])
  const [newClassName, setNewClassName] = useState('')
  const [addingClass, setAddingClass]   = useState(false)
  const [classError, setClassError]     = useState<string | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  // Logo state
  const [logoUrl, setLogoUrl]         = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile]       = useState<File | null>(null)
  const [logoError, setLogoError]     = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoSuccess, setLogoSuccess] = useState(false)
  const [dragOver, setDragOver]       = useState(false)

  useEffect(() => {
    fetch('/api/head-master/settings')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setCurrent(json.data.dojo_code ?? null)
          setDojoCode(json.data.dojo_code ?? '')
          setAssocName(json.data.association_name ?? '')
          setLogoUrl(json.data.logo_url ?? null)
        }
      })

    fetch('/api/head-master/classes')
      .then(r => r.json())
      .then(json => { if (json.data) setClasses(json.data) })
  }, [])

  // When tab switches to dojocode, auto-suggest from first class if no code set
  useEffect(() => {
    if (activeTab === 'dojocode' && !current && classes.length > 0 && !dojoCode) {
      setDojoCode(suggestCode(classes[0].name))
    }
  }, [activeTab, current, classes, dojoCode])

  async function saveDojoCode(e: React.FormEvent) {
    e.preventDefault()
    if (current && !confirmChange) {
      setConfirmChange(true)
      return
    }
    setSaving(true)
    setDojoError(null)
    setDojoSuccess(false)
    setConfirmChange(false)
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
      const newClass = json.data
      setClasses(prev => [...prev, newClass])
      setNewClassName('')
      // Auto-suggest code from newly added class if no code set yet
      if (!current && !dojoCode) {
        setDojoCode(suggestCode(name))
      }
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

  function handleFileSelect(file: File | null) {
    setLogoError(null)
    setLogoSuccess(false)
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setLogoError('Only JPEG or PNG images are allowed.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setLogoError('File must be smaller than 3 MB.')
      return
    }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = e => setLogoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function uploadLogo() {
    if (!logoFile) return
    setUploadingLogo(true)
    setLogoError(null)
    setLogoSuccess(false)
    try {
      const form = new FormData()
      form.append('logo', logoFile)
      const res  = await fetch('/api/head-master/logo', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { setLogoError(json.error?.message ?? 'Upload failed.'); return }
      setLogoUrl(json.data.logo_url)
      setLogoPreview(null)
      setLogoFile(null)
      setLogoSuccess(true)
    } catch { setLogoError('Network error.') }
    finally { setUploadingLogo(false) }
  }

  function removeLogo() {
    setLogoPreview(null)
    setLogoFile(null)
    setLogoError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const preview = dojoCode.trim().toUpperCase()
  const example = preview ? `ISK-${preview}-0001` : 'ISK-???-0001'

  const tabs: { id: Tab; label: string }[] = [
    { id: 'locations', label: 'Training Locations' },
    { id: 'dojocode',  label: 'Dojo Code' },
    { id: 'logo',      label: 'Dojo Logo' },
  ]

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

        {/* Tab bar */}
        <div className="max-w-lg mx-auto px-4 flex gap-0 border-t border-gray-100">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                activeTab === t.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">

        {/* ── Tab 1: Training Locations / Classes ──────────────────── */}
        {activeTab === 'locations' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Training Locations / Classes</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Define your training locations or classes. Students will select their class when applying for a tournament.
              </p>
            </div>

            {classes.length > 0 ? (
              <div className="space-y-2">
                {classes.map(cls => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-800">{cls.name}</span>
                      {suggestCode(cls.name) && (
                        <span className={`ml-2 text-[10px] font-mono ${current === suggestCode(cls.name) ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                          {current === suggestCode(cls.name) ? `→ ${suggestCode(cls.name)} ✓` : `→ ${suggestCode(cls.name)}`}
                        </span>
                      )}
                    </div>
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
            ) : (
              <p className="text-sm text-gray-400 italic text-center py-4">
                No classes defined yet. Add your first training location below.
              </p>
            )}

            <form onSubmit={addClass} className="flex gap-2">
              <input
                type="text"
                value={newClassName}
                onChange={e => { setNewClassName(e.target.value); setClassError(null) }}
                placeholder="e.g. Main Dojo, Colombo Branch, Waththala Dojo"
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
        )}

        {/* ── Tab 2: Dojo Code ─────────────────────────────────────── */}
        {activeTab === 'dojocode' && (
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

              {/* Class chips */}
              {classes.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Current classes:</p>
                  <div className="flex flex-wrap gap-2">
                    {classes.map(cls => {
                      const code = suggestCode(cls.name)
                      if (!code) return null
                      const isActive  = current === code
                      const isSelected = dojoCode === code
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => { setDojoCode(code); setDojoSuccess(false); setConfirmChange(false) }}
                          className={`px-3 py-1.5 rounded-lg border text-xs transition-colors text-left ${
                            isActive
                              ? 'bg-green-50 border-green-400 text-green-800'
                              : isSelected
                              ? 'bg-red-50 border-red-400 text-red-700'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600'
                          }`}
                        >
                          <span className="font-medium font-sans">{cls.name}</span>
                          <span className={`ml-1.5 font-mono font-bold text-[11px] ${isActive ? 'text-green-600' : isSelected ? 'text-red-600' : 'text-gray-400'}`}>
                            → {code}
                          </span>
                          {isActive && (
                            <span className="ml-1 text-[9px] font-sans font-semibold text-green-600 uppercase tracking-wide">active</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <form onSubmit={saveDojoCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Dojo Code
                    {classes.length > 0 && (
                      <span className="ml-2 text-[10px] font-normal text-gray-400">
                        (auto-suggested — you can edit freely)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={dojoCode}
                    onChange={e => {
                      setDojoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                      setDojoSuccess(false)
                      setConfirmChange(false)
                    }}
                    maxLength={6}
                    placeholder="e.g. WAT, COL, HQM"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={saving}
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    Student numbers will look like:{' '}
                    <span className="font-mono font-semibold text-gray-700">{example}</span>
                  </p>
                </div>

                {dojoError   && <p className="text-sm text-red-600 font-medium">{dojoError}</p>}
                {dojoSuccess && <p className="text-sm text-green-600 font-medium">Dojo code saved successfully.</p>}

                {/* Confirmation warning when changing existing code */}
                {confirmChange && current && dojoCode !== current && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
                    <div className="flex gap-2">
                      <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Permanent code change</p>
                        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                          Changing from <span className="font-mono font-bold">{current}</span> to{' '}
                          <span className="font-mono font-bold">{dojoCode}</span> will affect all{' '}
                          <strong>new</strong> student numbers going forward. Existing approved student
                          numbers will not change. This cannot be undone easily.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
                      >
                        {saving ? 'Saving…' : 'Yes, change it permanently'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setConfirmChange(false); setDojoCode(current) }}
                        className="flex-1 bg-white border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {current && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-amber-700">
                      Changing the code does not renumber existing students. New approvals will use the new code.
                    </p>
                  </div>
                )}

                {!confirmChange && (
                  <button
                    type="submit"
                    disabled={saving || !dojoCode.trim() || dojoCode.trim() === current}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                  >
                    {saving ? 'Saving…' : current ? 'Change Dojo Code' : 'Save Dojo Code'}
                  </button>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ── Tab 3: Dojo Logo ─────────────────────────────────────── */}
        {activeTab === 'logo' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Dojo Logo</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Upload your dojo logo. It will appear on student cards and exports.
                Accepted formats: <strong>JPEG / PNG</strong> — max <strong>3 MB</strong>.
              </p>
            </div>

            {/* Current logo */}
            {logoUrl && !logoPreview && (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-28 h-28 rounded-2xl border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl!} alt="Dojo logo" className="object-contain w-full h-full" />
                </div>
                <p className="text-xs text-gray-500">Current logo</p>
              </div>
            )}

            {/* Preview of selected file */}
            {logoPreview && (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-28 h-28 rounded-2xl border-2 border-red-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview!} alt="Logo preview" className="object-contain w-full h-full" />
                </div>
                <p className="text-xs text-gray-500">
                  Preview — <button type="button" onClick={removeLogo} className="text-red-500 underline">Remove</button>
                </p>
              </div>
            )}

            {/* Drop zone */}
            {!logoPreview && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOver(false)
                  handleFileSelect(e.dataTransfer.files[0] ?? null)
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 transition-colors ${
                  dragOver ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-300 bg-gray-50'
                }`}
              >
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Tap to select or drag & drop</p>
                  <p className="text-xs text-gray-400 mt-0.5">JPEG or PNG · max 3 MB</p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
            />

            {logoError   && <p className="text-sm text-red-600 font-medium">{logoError}</p>}
            {logoSuccess && <p className="text-sm text-green-600 font-medium">Logo uploaded successfully.</p>}

            {logoFile && (
              <button
                type="button"
                onClick={uploadLogo}
                disabled={uploadingLogo}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
              </button>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
