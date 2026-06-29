'use client'

import { useState, useEffect } from 'react'
import type { Athlete, GenderType } from '@/types/database'

type Tab = 'all' | 'active' | 'inactive'

interface FormState {
  full_name: string
  date_of_birth: string
  gender: GenderType
}

interface EditFormState extends FormState {
  is_active: boolean
}

function calcAge(dob: string): number {
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function formatDob(dob: string, mounted: boolean): string {
  if (!mounted) return dob  // server / pre-hydration: return ISO string, no locale call
  return new Date(dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EMPTY_ADD: FormState = { full_name: '', date_of_birth: '', gender: 'MALE' }

export default function AthletesClient({ athletes: initial }: { athletes: Athlete[] }) {
  const [athletes, setAthletes] = useState<Athlete[]>(initial)
  const [tab, setTab] = useState<Tab>('all')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const [addForm, setAddForm] = useState<FormState>(EMPTY_ADD)
  const [editForm, setEditForm] = useState<EditFormState>({
    full_name: '', date_of_birth: '', gender: 'MALE', is_active: true,
  })

  useEffect(() => { setMounted(true) }, [])

  const counts = {
    all: athletes.length,
    active: athletes.filter(a => a.is_active).length,
    inactive: athletes.filter(a => !a.is_active).length,
  }

  const filtered = athletes.filter(a => {
    if (tab === 'active') return a.is_active
    if (tab === 'inactive') return !a.is_active
    return true
  })

  function clearErrors() {
    setFieldErrors({})
    setGlobalError(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    clearErrors()
    try {
      const res = await fetch('/api/association/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error?.fields) setFieldErrors(json.error.fields)
        else setGlobalError(json.error?.message ?? 'Failed to add athlete.')
        return
      }
      setAthletes(prev => [json.data, ...prev].sort((a, b) => a.full_name.localeCompare(b.full_name)))
      setAdding(false)
      setAddForm(EMPTY_ADD)
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setSaving(true)
    clearErrors()
    try {
      const res = await fetch(`/api/association/athletes/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error?.fields) setFieldErrors(json.error.fields)
        else setGlobalError(json.error?.message ?? 'Failed to update athlete.')
        return
      }
      setAthletes(prev =>
        prev.map(a => a.id === editingId ? json.data : a)
          .sort((a, b) => a.full_name.localeCompare(b.full_name))
      )
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(a: Athlete) {
    setEditingId(a.id)
    setEditForm({
      full_name: a.full_name,
      date_of_birth: a.date_of_birth.split('T')[0],
      gender: a.gender,
      is_active: a.is_active,
    })
    setAdding(false)
    clearErrors()
  }

  function cancelAdd() {
    setAdding(false)
    setAddForm(EMPTY_ADD)
    clearErrors()
  }

  function cancelEdit() {
    setEditingId(null)
    clearErrors()
  }

  const today = mounted ? new Date().toISOString().split('T')[0] : ''

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {(['all', 'active', 'inactive'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                tab === t
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t} <span className="ml-0.5 opacity-70">({counts[t]})</span>
            </button>
          ))}
        </div>

        {/* Add button */}
        {!adding && !editingId && (
          <button
            onClick={() => { setAdding(true); clearErrors() }}
            className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Athlete
          </button>
        )}
      </div>

      {/* Global error */}
      {globalError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {globalError}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <AthleteForm
          title="Add Athlete"
          form={addForm}
          fieldErrors={fieldErrors}
          saving={saving}
          today={today}
          onSubmit={handleAdd}
          onCancel={cancelAdd}
          onChange={patch => setAddForm(prev => ({ ...prev, ...patch }))}
          showActive={false}
          isActive={true}
          onActiveChange={() => {}}
          submitLabel="Add Athlete"
        />
      )}

      {/* Athlete list */}
      {filtered.length === 0 && !adding ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          {tab === 'all' ? 'No athletes in your roster yet.' : `No ${tab} athletes.`}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(athlete =>
            editingId === athlete.id ? (
              <AthleteForm
                key={athlete.id}
                title="Edit Athlete"
                form={editForm}
                fieldErrors={fieldErrors}
                saving={saving}
                today={today}
                onSubmit={handleEdit}
                onCancel={cancelEdit}
                onChange={patch => setEditForm(prev => ({ ...prev, ...patch }))}
                showActive
                isActive={editForm.is_active}
                onActiveChange={v => setEditForm(prev => ({ ...prev, is_active: v }))}
                submitLabel="Save Changes"
              />
            ) : (
              <AthleteCard
                key={athlete.id}
                athlete={athlete}
                age={mounted ? calcAge(athlete.date_of_birth) : 0}
                dob={formatDob(athlete.date_of_birth, mounted)}
                onEdit={() => startEdit(athlete)}
                disabled={!!editingId || adding}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

// ─── Athlete card ─────────────────────────────────────────────────────────────

function AthleteCard({
  athlete, age, dob, onEdit, disabled,
}: {
  athlete: Athlete
  age: number
  dob: string
  onEdit: () => void
  disabled: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-4 ${!athlete.is_active ? 'opacity-60' : ''}`}>
      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-blue-700">
          {athlete.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 text-sm">{athlete.full_name}</p>
          {!athlete.is_active && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Inactive</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {athlete.gender === 'MALE' ? 'Male' : 'Female'} · {dob} · Age {age}
        </p>
      </div>

      <button
        onClick={onEdit}
        disabled={disabled}
        className="text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Edit
      </button>
    </div>
  )
}

// ─── Shared form ──────────────────────────────────────────────────────────────

function AthleteForm({
  title, form, fieldErrors, saving, today,
  onSubmit, onCancel, onChange,
  showActive, isActive, onActiveChange, submitLabel,
}: {
  title: string
  form: FormState
  fieldErrors: Record<string, string>
  saving: boolean
  today: string
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  onChange: (patch: Partial<FormState>) => void
  showActive: boolean
  isActive: boolean
  onActiveChange: (v: boolean) => void
  submitLabel: string
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3"
    >
      <p className="text-sm font-semibold text-blue-900">{title}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Full Name */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => onChange({ full_name: e.target.value })}
            placeholder="e.g. Kamal Perera"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldErrors.full_name ? 'border-red-400' : 'border-gray-300'
            }`}
            required
          />
          {fieldErrors.full_name && (
            <p className="text-xs text-red-600 mt-0.5">{fieldErrors.full_name}</p>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
          <input
            type="date"
            value={form.date_of_birth}
            max={today}
            onChange={e => onChange({ date_of_birth: e.target.value })}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldErrors.date_of_birth ? 'border-red-400' : 'border-gray-300'
            }`}
            required
          />
          {fieldErrors.date_of_birth && (
            <p className="text-xs text-red-600 mt-0.5">{fieldErrors.date_of_birth}</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
          <select
            value={form.gender}
            onChange={e => onChange({ gender: e.target.value as GenderType })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>

        {/* Active toggle — edit only */}
        {showActive && (
          <div className="sm:col-span-2 flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => onActiveChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors peer" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </label>
            <span className="text-sm text-gray-700">
              {isActive ? 'Active' : 'Inactive'} — {isActive ? 'athlete appears in entry forms' : 'athlete hidden from entry forms'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-sm font-medium text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
