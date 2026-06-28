'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { tournamentSchema, type TournamentInput } from '@/lib/validations/tournament'
import type { Tournament } from '@/types/database'

interface Props {
  initialData?: Tournament
  tournamentId?: string
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

const inputCls =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-300'

const sectionHeading = 'text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100'

export default function TournamentForm({ initialData, tournamentId }: Props) {
  const router = useRouter()
  const [apiError, setApiError] = useState<string | null>(null)
  const isEdit = !!tournamentId

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TournamentInput>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          code: initialData.code,
          year: initialData.year,
          subtitle: initialData.subtitle ?? '',
          registration_deadline: initialData.registration_deadline,
          age_eligibility_cutoff_date: initialData.age_eligibility_cutoff_date,
          venue_u14: initialData.venue_u14 ?? '',
          venue_cadet_junior: initialData.venue_cadet_junior ?? '',
          venue_u21_senior: initialData.venue_u21_senior ?? '',
          date_u14_start: initialData.date_u14_start ?? '',
          date_u14_end: initialData.date_u14_end ?? '',
          date_cadet_junior: initialData.date_cadet_junior ?? '',
          date_u21_senior_start: initialData.date_u21_senior_start ?? '',
          date_u21_senior_end: initialData.date_u21_senior_end ?? '',
          bank_account_name: initialData.bank_account_name,
          bank_account_number: initialData.bank_account_number,
          bank_name: initialData.bank_name,
          bank_branch: initialData.bank_branch,
          fee_individual_one_event_lkr: initialData.fee_individual_one_event_lkr,
          fee_individual_both_events_lkr: initialData.fee_individual_both_events_lkr,
          fee_team_kata_lkr: initialData.fee_team_kata_lkr,
          max_team_members: initialData.max_team_members,
          max_u14_teams_per_gender: initialData.max_u14_teams_per_gender,
          max_individual_athletes_per_application: initialData.max_individual_athletes_per_application,
          notes: initialData.notes ?? '',
          organizer_district:         initialData.organizer_district         ?? '',
          organizer_province:         initialData.organizer_province         ?? '',
          organizer_association_name: initialData.organizer_association_name ?? '',
          organizer_reg_no:           initialData.organizer_reg_no           ?? '',
          organizer_instructor_name:  initialData.organizer_instructor_name  ?? '',
          organizer_whatsapp:         initialData.organizer_whatsapp         ?? '',
        }
      : {
          name: 'Open Karate Competition – Under 14, Cadet, Junior, Under 21 & Senior – 2026',
          code: 'OKC-2026',
          year: new Date().getFullYear(),
          venue_u14:          'Sugathadasa Indoor Stadium in Colombo (Western Province.)',
          venue_cadet_junior: 'Town Hall Indoor Stadium, Ratnapura. (Sabaragamuwa Province.)',
          venue_u21_senior:   'Kotawila Sports Complex in Kotawila (Southern Province.)',
          bank_account_name:   'Sri Lanka Karatedo Federation',
          bank_account_number: '046-1-001-6-0387279',
          bank_name:           "People's Bank",
          bank_branch:         'First City',
          fee_individual_one_event_lkr:   2000,
          fee_individual_both_events_lkr: 3000,
          fee_team_kata_lkr:              3000,
          max_team_members: 4,
          max_u14_teams_per_gender: 2,
          max_individual_athletes_per_application: 100,
        },
  })

  async function onSubmit(values: TournamentInput) {
    setApiError(null)
    try {
      const url = isEdit ? `/api/tournaments/${tournamentId}` : '/api/tournaments'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) {
        setApiError(json.error?.message ?? 'Failed to save tournament. Please try again.')
        return
      }
      router.push('/head-master/tournaments')
      router.refresh()
    } catch {
      setApiError('A network error occurred. Please check your connection.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      {/* Basic Info */}
      <section>
        <h2 className={sectionHeading}>Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Field label="Tournament Name" error={errors.name?.message} required>
              <input
                type="text"
                placeholder="e.g. National Karate Championship 2026"
                className={inputCls}
                {...register('name')}
              />
            </Field>
          </div>
          <Field label="Code" error={errors.code?.message} required>
            <input
              type="text"
              placeholder="e.g. NKC-2026"
              className={inputCls}
              {...register('code')}
              onChange={e => setValue('code', e.target.value.toUpperCase())}
            />
            <p className="text-xs text-gray-400 mt-1">Uppercase letters, numbers, hyphens only</p>
          </Field>
          <Field label="Year" error={errors.year?.message} required>
            <input
              type="number"
              className={inputCls}
              {...register('year', { valueAsNumber: true })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Subtitle" error={errors.subtitle?.message}>
              <input
                type="text"
                placeholder="Optional subtitle"
                className={inputCls}
                {...register('subtitle')}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Key Dates */}
      <section>
        <h2 className={sectionHeading}>Key Dates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Registration Deadline" error={errors.registration_deadline?.message} required>
            <input type="date" className={inputCls} {...register('registration_deadline')} />
          </Field>
          <Field label="Age Eligibility Cutoff Date" error={errors.age_eligibility_cutoff_date?.message} required>
            <input type="date" className={inputCls} {...register('age_eligibility_cutoff_date')} />
          </Field>
        </div>
      </section>

      {/* Venues */}
      <section>
        <h2 className={sectionHeading}>Venues <span className="text-gray-400 font-normal normal-case">(optional)</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Venue — U14" error={errors.venue_u14?.message}>
            <input type="text" placeholder="Location" className={inputCls} {...register('venue_u14')} />
          </Field>
          <Field label="Venue — Cadet / Junior" error={errors.venue_cadet_junior?.message}>
            <input type="text" placeholder="Location" className={inputCls} {...register('venue_cadet_junior')} />
          </Field>
          <Field label="Venue — U21 / Senior" error={errors.venue_u21_senior?.message}>
            <input type="text" placeholder="Location" className={inputCls} {...register('venue_u21_senior')} />
          </Field>
        </div>
      </section>

      {/* Event Dates */}
      <section>
        <h2 className={sectionHeading}>Event Dates <span className="text-gray-400 font-normal normal-case">(optional)</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="U14 — Start Date" error={errors.date_u14_start?.message}>
            <input type="date" className={inputCls} {...register('date_u14_start')} />
          </Field>
          <Field label="U14 — End Date" error={errors.date_u14_end?.message}>
            <input type="date" className={inputCls} {...register('date_u14_end')} />
          </Field>
          <Field label="Cadet / Junior Date" error={errors.date_cadet_junior?.message}>
            <input type="date" className={inputCls} {...register('date_cadet_junior')} />
          </Field>
          <div>{/* spacer */}</div>
          <Field label="U21 / Senior — Start Date" error={errors.date_u21_senior_start?.message}>
            <input type="date" className={inputCls} {...register('date_u21_senior_start')} />
          </Field>
          <Field label="U21 / Senior — End Date" error={errors.date_u21_senior_end?.message}>
            <input type="date" className={inputCls} {...register('date_u21_senior_end')} />
          </Field>
        </div>
      </section>

      {/* Bank Details */}
      <section>
        <h2 className={sectionHeading}>Bank Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Account Name" error={errors.bank_account_name?.message} required>
            <input type="text" className={inputCls} {...register('bank_account_name')} />
          </Field>
          <Field label="Account Number" error={errors.bank_account_number?.message} required>
            <input type="text" className={inputCls} {...register('bank_account_number')} />
          </Field>
          <Field label="Bank Name" error={errors.bank_name?.message} required>
            <input type="text" className={inputCls} {...register('bank_name')} />
          </Field>
          <Field label="Branch" error={errors.bank_branch?.message} required>
            <input type="text" className={inputCls} {...register('bank_branch')} />
          </Field>
        </div>
      </section>

      {/* Fees */}
      <section>
        <h2 className={sectionHeading}>Entry Fees (LKR)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Individual — 1 Event" error={errors.fee_individual_one_event_lkr?.message} required>
            <input
              type="number"
              min={0}
              className={inputCls}
              {...register('fee_individual_one_event_lkr', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Individual — Both Events" error={errors.fee_individual_both_events_lkr?.message} required>
            <input
              type="number"
              min={0}
              className={inputCls}
              {...register('fee_individual_both_events_lkr', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Team Kata" error={errors.fee_team_kata_lkr?.message} required>
            <input
              type="number"
              min={0}
              className={inputCls}
              {...register('fee_team_kata_lkr', { valueAsNumber: true })}
            />
          </Field>
        </div>
      </section>

      {/* Limits */}
      <section>
        <h2 className={sectionHeading}>Limits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Max Team Members" error={errors.max_team_members?.message}>
            <input
              type="number"
              min={2}
              max={6}
              className={inputCls}
              {...register('max_team_members', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Max U14 Teams Per Gender" error={errors.max_u14_teams_per_gender?.message}>
            <input
              type="number"
              min={1}
              max={10}
              className={inputCls}
              {...register('max_u14_teams_per_gender', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Max Athletes Per Application" error={errors.max_individual_athletes_per_application?.message}>
            <input
              type="number"
              min={1}
              max={200}
              className={inputCls}
              {...register('max_individual_athletes_per_application', { valueAsNumber: true })}
            />
          </Field>
        </div>
      </section>

      {/* Notes */}
      <section>
        <h2 className={sectionHeading}>Notes <span className="text-gray-400 font-normal normal-case">(optional)</span></h2>
        <Field label="Additional Notes" error={errors.notes?.message}>
          <textarea
            rows={4}
            placeholder="Any additional information for associations…"
            className={inputCls}
            {...register('notes')}
          />
        </Field>
      </section>

      {/* Organizer Details */}
      <section>
        <h2 className={sectionHeading}>Organizer Details <span className="text-gray-400 font-normal normal-case">(printed in Excel export)</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="District" error={errors.organizer_district?.message}>
            <input type="text" placeholder="e.g. Colombo" className={inputCls} {...register('organizer_district')} />
          </Field>
          <Field label="Province" error={errors.organizer_province?.message}>
            <input type="text" placeholder="e.g. Western" className={inputCls} {...register('organizer_province')} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Association Name" error={errors.organizer_association_name?.message}>
              <input type="text" placeholder="e.g. Western Province Karate Association" className={inputCls} {...register('organizer_association_name')} />
            </Field>
          </div>
          <Field label="Association Reg. No" error={errors.organizer_reg_no?.message}>
            <input type="text" placeholder="e.g. SLKF/AFF/WP/001" className={inputCls} {...register('organizer_reg_no')} />
          </Field>
          <Field label="Instructor Name" error={errors.organizer_instructor_name?.message}>
            <input type="text" placeholder="e.g. Test Sensei" className={inputCls} {...register('organizer_instructor_name')} />
          </Field>
          <Field label="WhatsApp No" error={errors.organizer_whatsapp?.message}>
            <input type="text" placeholder="e.g. 0771234567" className={inputCls} {...register('organizer_whatsapp')} />
          </Field>
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.push('/head-master/tournaments')}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-5 py-2.5 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
        >
          {isSubmitting && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Tournament'}
        </button>
      </div>
    </form>
  )
}
