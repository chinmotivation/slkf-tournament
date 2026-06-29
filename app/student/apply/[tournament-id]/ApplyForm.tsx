'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  KATA_LEVELS, calculateFee, calculateISKFee, getWeightClasses, formatWeightClass,
  ageCategoryLabel, iskAgeCategoryLabel, type AgeCategoryCode,
} from '@/lib/constants/karate'
import type { StudentProfile, Tournament } from '@/types/database'
import { Toast } from '@/components/ui/Toast'

interface Props {
  profile: StudentProfile
  tournament: Tournament
  ageCategory: string
  hmClasses: { id: string; name: string }[]
  existingApplication?: {
    id: string
    kata_entry: boolean
    kata_level: string | null
    kumite_entry: boolean
    kumite_weight_class: string | null
    team_kata_entry: boolean
    team_kata_team_name: string | null
    class_id: string | null
    payment_receipt_url: string | null
    total_amount_lkr: number
  } | null
}

// ─── File type constants ───────────────────────────────────────────────────────

const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png']
const PDF_MAX_MB   = 2
const IMAGE_MAX_MB = 10
const COMPRESS_THRESHOLD_KB = 500
const TARGET_KB    = 600
const MAX_DIM      = 1600

// ─── Image compression (Canvas API only) ──────────────────────────────────────

async function compressImage(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let w = img.width
      let h = img.height
      if (w > MAX_DIM || h > MAX_DIM) {
        if (w >= h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM }
        else        { w = Math.round(w * MAX_DIM / h); h = MAX_DIM }
      }

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return }
      ctx.drawImage(img, 0, 0, w, h)

      const outName = file.name.replace(/\.[^.]+$/, '.jpg')
      let quality = 0.85

      const attempt = () => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(null); return }
          if (blob.size <= TARGET_KB * 1024 || quality <= 0.60) {
            resolve(new File([blob], outName, { type: 'image/jpeg' }))
          } else {
            quality = Math.round((quality - 0.05) * 100) / 100
            attempt()
          }
        }, 'image/jpeg', quality)
      }
      attempt()
    }

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null) }
    img.src = objectUrl
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApplyForm({ profile, tournament, ageCategory, hmClasses, existingApplication }: Props) {
  const router = useRouter()

  const [kata,          setKata]          = useState(existingApplication?.kata_entry ?? false)
  const [kataLevel,     setKataLevel]     = useState(existingApplication?.kata_level ?? '')
  const [kumite,        setKumite]        = useState(existingApplication?.kumite_entry ?? false)
  const [weightClass,   setWeightClass]   = useState(existingApplication?.kumite_weight_class ?? '')
  const [teamKata,        setTeamKata]        = useState(existingApplication?.team_kata_entry ?? false)
  const [teamKataName,    setTeamKataName]    = useState(existingApplication?.team_kata_team_name ?? '')
  const [teamMember2,     setTeamMember2]     = useState((existingApplication as any)?.team_kata_member2_name ?? '')
  const [teamMember3,     setTeamMember3]     = useState((existingApplication as any)?.team_kata_member3_name ?? '')
  const [classId,         setClassId]         = useState(existingApplication?.class_id ?? '')

  // Receipt state
  const [receiptFile,    setReceiptFile]    = useState<File | null>(null)   // processed file ready to upload
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null) // object URL for image preview
  const [receiptIsPdf,   setReceiptIsPdf]   = useState(false)
  const [existingReceiptUrl, setExistingReceiptUrl] = useState(existingApplication?.payment_receipt_url ?? '')
  const previewUrlRef = useRef<string | null>(null)

  // Loading states
  const [compressing, setCompressing] = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)

  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'warning' | 'success' } | null>(null)

  const isISK = (tournament as any).tournament_type === 'ISK'
  const fee = isISK
    ? calculateISKFee(kata, kumite, teamKata)
    : kata && kumite
      ? tournament.fee_individual_both_events_lkr
      : kata || kumite
        ? tournament.fee_individual_one_event_lkr
        : 0
  const weightClasses = getWeightClasses(ageCategory, profile.gender)
  const isEdit       = !!existingApplication
  const busy         = compressing || uploading || submitting

  useEffect(() => { if (!kumite)   setWeightClass('') },  [kumite])
  useEffect(() => { if (!kata)     setKataLevel('')  },   [kata])
  useEffect(() => { if (!teamKata) { setTeamKataName(''); setTeamMember2(''); setTeamMember3('') } }, [teamKata])

  // Revoke object URL on unmount
  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current) }, [])

  function showError(message: string) {
    setToast({ message, variant: 'error' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function revokePreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setReceiptPreview(null)
  }

  async function handleFileChange(file: File) {
    setToast(null)
    setReceiptFile(null)
    setReceiptIsPdf(false)
    revokePreview()

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

    if (!ALLOWED_EXTS.includes(ext)) {
      showError('Unsupported file type. Please upload PDF, JPG or PNG.')
      return
    }

    if (ext === 'pdf') {
      if (file.size > PDF_MAX_MB * 1024 * 1024) {
        const mb = (file.size / 1024 / 1024).toFixed(1)
        showError(`PDF is too large (${mb} MB). Please reduce the file size below 2 MB or upload a clear photo of the receipt.`)
        return
      }
      setReceiptFile(file)
      setReceiptIsPdf(true)
      return
    }

    // Image path
    if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
      showError('Image exceeds the 10 MB limit.')
      return
    }

    if (file.size <= COMPRESS_THRESHOLD_KB * 1024) {
      // Small enough — no compression needed
      const url = URL.createObjectURL(file)
      previewUrlRef.current = url
      setReceiptPreview(url)
      setReceiptFile(file)
      return
    }

    // Compress
    setCompressing(true)
    try {
      const compressed = await compressImage(file)
      if (!compressed) {
        showError('Unable to optimise the selected image. Please choose another image.')
        return
      }
      const url = URL.createObjectURL(compressed)
      previewUrlRef.current = url
      setReceiptPreview(url)
      setReceiptFile(compressed)
    } finally {
      setCompressing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setToast(null)

    if (!kata && !kumite && !(isISK && teamKata)) {
      showError('Please select at least one event — KATA or KUMITE' + (isISK ? ', or TEAM KATA.' : '.'))
      return
    }
    if (kata && !kataLevel) {
      showError('Please select a Kata level.')
      return
    }
    if (kumite && !weightClass) {
      showError('Please select a Kumite weight class.')
      return
    }
    if (teamKata && !teamKataName.trim()) {
      showError('Please enter a Team Name for Team Kata — agree on this with your 2 teammates.')
      return
    }
    if (hmClasses.length > 0 && !classId) {
      showError('Please select your training class / location.')
      return
    }

    let receiptUrl = existingReceiptUrl

    if (receiptFile) {
      setUploading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const ext  = receiptFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('payment-receipts')
          .upload(path, receiptFile, { contentType: receiptFile.type, upsert: true })

        if (uploadError) throw uploadError
        receiptUrl = path
      } catch (err: any) {
        showError('Upload failed. Please try again.')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    if (!receiptUrl) {
      showError('Please upload your payment receipt before submitting.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        tournament_id:        tournament.id,
        kata_entry:           kata,
        kata_level:           kata ? kataLevel : undefined,
        kumite_entry:         kumite,
        kumite_weight_class:  kumite ? weightClass : undefined,
        team_kata_entry:        teamKata,
        team_kata_team_name:    teamKata && teamKataName.trim() ? teamKataName.trim() : undefined,
        team_kata_member2_name: teamKata && teamMember2.trim() ? teamMember2.trim() : undefined,
        team_kata_member3_name: teamKata && teamMember3.trim() ? teamMember3.trim() : undefined,
        class_id:             classId || null,
        payment_receipt_url:  receiptUrl,
        total_amount_lkr:     fee,
      }

      const url = isEdit
        ? `/api/student/applications/${existingApplication!.id}`
        : '/api/student/applications'

      const res  = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (!res.ok) {
        showError(json.error?.message ?? 'Submission failed. Please try again.')
        return
      }

      router.push(`/student/applications/${isEdit ? existingApplication!.id : json.data.id}`)
      router.refresh()
    } catch {
      showError('A network error occurred. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onClear={() => setToast(null)}
      />

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Athlete Info */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Athlete Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-400">Name</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Gender</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.gender === 'MALE' ? 'Male' : 'Female'}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Belt Grade</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.belt_grade}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Age Category</p>
              <p className="text-sm font-semibold text-red-600 mt-0.5">
                {ageCategory.startsWith('ISK_') ? iskAgeCategoryLabel(ageCategory) : ageCategoryLabel(ageCategory as AgeCategoryCode)}
              </p>
            </div>
          </div>
        </div>

        {/* Training Class selection — only shown if HM has defined classes */}
        {hmClasses.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Training Location / Class</p>
            <select
              value={classId}
              onChange={e => setClassId(e.target.value)}
              className={`w-full px-3.5 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white ${
                !classId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">— Select your training class —</option>
              {hmClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!classId && (
              <p className="mt-1.5 text-xs text-red-500">Required — please select your training location</p>
            )}
          </div>
        )}

        {/* Event Selection */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Select Event(s)</p>
          <div className="space-y-3">

            {/* KATA card */}
            <div className={`rounded-xl border-2 transition-colors ${kata ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <label className="flex items-center gap-4 p-4 cursor-pointer min-h-[64px]">
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  kata ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white'
                }`}>
                  {kata && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input type="checkbox" checked={kata} onChange={e => setKata(e.target.checked)} className="sr-only" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">KATA</p>
                  <p className="text-xs text-gray-500 mt-0.5">LKR {tournament.fee_individual_one_event_lkr.toLocaleString()}</p>
                </div>
                {kata && <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Selected</span>}
              </label>

              {kata && (
                <div className="px-4 pb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Kata Level *</label>
                  <select
                    value={kataLevel}
                    onChange={e => setKataLevel(e.target.value)}
                    className={`w-full px-3 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white ${
                      !kataLevel ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">— Select Kata Level —</option>
                    {KATA_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  {!kataLevel && <p className="mt-1.5 text-xs text-red-500">Required — please select a level</p>}
                </div>
              )}
            </div>

            {/* KUMITE card */}
            <div className={`rounded-xl border-2 transition-colors ${kumite ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <label className="flex items-center gap-4 p-4 cursor-pointer min-h-[64px]">
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  kumite ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white'
                }`}>
                  {kumite && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input type="checkbox" checked={kumite} onChange={e => setKumite(e.target.checked)} className="sr-only" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">KUMITE</p>
                  <p className="text-xs text-gray-500 mt-0.5">LKR {tournament.fee_individual_one_event_lkr.toLocaleString()}</p>
                </div>
                {kumite && <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Selected</span>}
              </label>

              {kumite && (
                <div className="px-4 pb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Weight Class *</label>
                  <select
                    value={weightClass}
                    onChange={e => setWeightClass(e.target.value)}
                    className={`w-full px-3 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white ${
                      !weightClass ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">— Select Weight Class —</option>
                    {weightClasses.map(wc => <option key={wc} value={wc}>{formatWeightClass(wc)}</option>)}
                  </select>
                  {!weightClass && <p className="mt-1.5 text-xs text-red-500">Required — please select your weight class</p>}
                </div>
              )}
            </div>

            {/* TEAM KATA card — ISK tournaments only */}
            {isISK && (
              <div className={`rounded-xl border-2 transition-colors ${teamKata ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <label className="flex items-center gap-4 p-4 cursor-pointer min-h-[64px]">
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    teamKata ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                  }`}>
                    {teamKata && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input type="checkbox" checked={teamKata} onChange={e => setTeamKata(e.target.checked)} className="sr-only" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">TEAM KATA <span className="text-xs font-normal text-gray-400">(T.KATA)</span></p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {kata || kumite ? 'LKR 1,000 add-on · team of 3 from same dojo' : 'LKR 2,000 · team of 3 from same dojo'}
                    </p>
                  </div>
                  {teamKata && <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Selected</span>}
                </label>

                {teamKata && (
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Team Members</p>

                    {/* Member 1 — auto */}
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-blue-900">{profile.full_name}</p>
                        <p className="text-xs text-blue-500">You (team leader · auto-added)</p>
                      </div>
                    </div>

                    {/* Member 2 */}
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-gray-400 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                      <input
                        type="text"
                        value={teamMember2}
                        onChange={e => setTeamMember2(e.target.value)}
                        placeholder="Teammate 2 full name"
                        maxLength={150}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Member 3 */}
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-gray-400 text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                      <input
                        type="text"
                        value={teamMember3}
                        onChange={e => setTeamMember3(e.target.value)}
                        placeholder="Teammate 3 full name"
                        maxLength={150}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Team name */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Team Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={teamKataName}
                        onChange={e => setTeamKataName(e.target.value)}
                        placeholder="e.g. Waththala Team A"
                        maxLength={80}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-400 mt-1.5">
                        Teammate names are shown to your Head Master when reviewing applications.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fee summary */}
        <div className={`rounded-xl border-2 p-4 flex items-center justify-between transition-colors ${
          fee > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
        }`}>
          <div>
            <p className="text-xs text-gray-500">Total Entry Fee</p>
            {kata && kumite && !teamKata && <p className="text-[11px] text-gray-400 mt-0.5">Kata + Kumite — combined rate</p>}
            {teamKata && (kata || kumite) && <p className="text-[11px] text-gray-400 mt-0.5">Includes Team Kata add-on</p>}
            {teamKata && !kata && !kumite && <p className="text-[11px] text-gray-400 mt-0.5">Team Kata only</p>}
          </div>
          <p className={`text-2xl font-bold ${fee > 0 ? 'text-green-700' : 'text-gray-300'}`}>
            {fee > 0 ? `LKR ${fee.toLocaleString()}` : '—'}
          </p>
        </div>

        {/* Payment Receipt */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Payment Receipt</p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
            <p className="text-xs text-blue-800 leading-relaxed">
              Deposit <strong>LKR {fee > 0 ? fee.toLocaleString() : '—'}</strong> to{' '}
              <strong>People&apos;s Bank</strong> — A/C {tournament.bank_account_number} ({tournament.bank_account_name}),{' '}
              {tournament.bank_branch} branch. Upload your deposit slip below.
            </p>
          </div>

          {/* Hidden file input — disabled during any processing */}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={busy}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f); e.target.value = '' }}
            className="hidden"
            id="receipt-upload"
          />

          {/* Drop zone / preview area */}
          <label
            htmlFor={busy ? undefined : 'receipt-upload'}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
              busy
                ? 'border-gray-200 bg-gray-50 cursor-default'
                : receiptFile
                ? 'border-green-400 bg-green-50 cursor-pointer'
                : existingReceiptUrl
                ? 'border-green-300 bg-green-50 cursor-pointer'
                : 'border-gray-300 bg-white cursor-pointer active:bg-gray-50'
            }`}
          >
            {compressing ? (
              /* Compression in progress */
              <>
                <Spinner className="text-gray-400" />
                <p className="text-sm font-medium text-gray-500">Optimising image…</p>
                <p className="text-xs text-gray-400">This only takes a moment</p>
              </>
            ) : receiptFile && receiptIsPdf ? (
              /* PDF selected */
              <>
                <PdfIcon />
                <p className="text-sm font-semibold text-green-700 text-center break-all px-2">{receiptFile.name}</p>
                <p className="text-xs text-gray-400">{(receiptFile.size / 1024).toFixed(0)} KB · PDF · Tap to change</p>
              </>
            ) : receiptFile && receiptPreview ? (
              /* Image selected — show preview */
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="max-h-44 rounded-lg object-contain"
                />
                <p className="text-xs text-gray-500 mt-1 text-center break-all px-2">{receiptFile.name}</p>
                <p className="text-xs text-gray-400">{(receiptFile.size / 1024).toFixed(0)} KB · Tap to change</p>
              </>
            ) : existingReceiptUrl ? (
              /* Already uploaded, no new file */
              <>
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold text-green-700">Receipt already uploaded</p>
                <p className="text-xs text-gray-400">Tap to replace</p>
              </>
            ) : (
              /* Empty state */
              <>
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm font-semibold text-gray-600">Tap to upload deposit slip</p>
                <p className="text-xs text-gray-400">PDF max 2 MB · JPG or PNG max 10 MB</p>
              </>
            )}
          </label>
        </div>

        {/* Submit — sticky on mobile */}
        <div className="sticky bottom-0 bg-gray-50 -mx-6 px-6 py-4 border-t border-gray-100 mt-2">
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 text-white font-semibold py-4 px-4 rounded-xl text-base transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <><Spinner className="text-white" />Uploading payment slip…</>
            ) : submitting ? (
              <><Spinner className="text-white" />{isEdit ? 'Saving changes…' : 'Submitting…'}</>
            ) : (
              isEdit ? 'Save Changes' : 'Submit Application'
            )}
          </button>
        </div>

      </form>
    </>
  )
}

// ─── Small reusable pieces ─────────────────────────────────────────────────────

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin h-5 w-5 shrink-0 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function PdfIcon() {
  return (
    <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center">
      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  )
}
