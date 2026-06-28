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
  hint,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
      {children}
    </h2>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <div className={`w-10 h-5 rounded-full transition-colors ${checked ? 'bg-red-600' : 'bg-gray-200'}`} />
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
    </label>
  )
}

const inputCls =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-300'

const selectCls =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white'

function RadioGroup({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string
  options: { value: string; label: string; hint?: string }[]
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="space-y-2">
        {options.map(opt => (
          <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="radio"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 accent-red-600"
            />
            <div>
              <span className="text-sm text-gray-800">{opt.label}</span>
              {opt.hint && <p className="text-xs text-gray-400">{opt.hint}</p>}
            </div>
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export default function TournamentForm({ initialData, tournamentId }: Props) {
  const router = useRouter()
  const [apiError, setApiError] = useState<string | null>(null)
  const isEdit = !!tournamentId

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TournamentInput>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: initialData
      ? {
          // Basic
          name:     initialData.name,
          code:     initialData.code,
          year:     initialData.year,
          subtitle: initialData.subtitle ?? '',
          // Registration dates
          registration_deadline:       initialData.registration_deadline,
          age_eligibility_cutoff_date: initialData.age_eligibility_cutoff_date,
          registration_open_date:      initialData.registration_open_date ?? '',
          allow_late_registration:     initialData.allow_late_registration ?? false,
          // Venue & dates
          venue:                  initialData.venue ?? '',
          competition_start_date: initialData.competition_start_date ?? '',
          competition_end_date:   initialData.competition_end_date ?? '',
          // Competition rules
          competition_rules: initialData.competition_rules ?? 'WKF',
          custom_rules_text: initialData.custom_rules_text ?? '',
          // Event toggles
          enable_individual_kata:   initialData.enable_individual_kata ?? true,
          enable_team_kata:         initialData.enable_team_kata ?? true,
          enable_individual_kumite: initialData.enable_individual_kumite ?? true,
          enable_team_kumite:       initialData.enable_team_kumite ?? false,
          // Draw
          draw_type:      initialData.draw_type ?? 'SINGLE_ELIMINATION',
          seeding_method: initialData.seeding_method ?? 'RANDOM',
          // Match rules
          medal_rule:              initialData.medal_rule ?? 'TWO_BRONZE',
          match_duration_seconds:  initialData.match_duration_seconds ?? 180,
          kata_scoring_method:     initialData.kata_scoring_method ?? 'TOTAL_SCORE',
          kumite_scoring_method:   initialData.kumite_scoring_method ?? 'POINT_BASED',
          tie_break_rule:          initialData.tie_break_rule ?? 'SENSHU',
          // Payment
          bank_account_name:   initialData.bank_account_name,
          bank_account_number: initialData.bank_account_number,
          bank_name:           initialData.bank_name,
          bank_branch:         initialData.bank_branch,
          fee_individual_one_event_lkr:   initialData.fee_individual_one_event_lkr,
          fee_individual_both_events_lkr: initialData.fee_individual_both_events_lkr,
          fee_team_kata_lkr:              initialData.fee_team_kata_lkr,
          payment_deadline:     initialData.payment_deadline ?? '',
          payment_instructions: initialData.payment_instructions ?? '',
          // Limits
          max_team_members:                        initialData.max_team_members,
          max_u14_teams_per_gender:               initialData.max_u14_teams_per_gender,
          max_individual_athletes_per_application: initialData.max_individual_athletes_per_application,
          max_entries_per_category:               initialData.max_entries_per_category ?? 3,
          max_team_kata_teams:                    initialData.max_team_kata_teams ?? 4,
          // Public info
          tournament_description: initialData.tournament_description ?? '',
          organizer_contact:      initialData.organizer_contact ?? '',
          rules_pdf_url:          initialData.rules_pdf_url ?? '',
          // Organizer
          organizer_district:         initialData.organizer_district         ?? '',
          organizer_province:         initialData.organizer_province         ?? '',
          organizer_association_name: initialData.organizer_association_name ?? '',
          organizer_reg_no:           initialData.organizer_reg_no           ?? '',
          organizer_instructor_name:  initialData.organizer_instructor_name  ?? '',
          organizer_whatsapp:         initialData.organizer_whatsapp         ?? '',
          notes: initialData.notes ?? '',
        }
      : {
          name:    'Open Karate Competition – Under 14, Cadet, Junior, Under 21 & Senior – 2026',
          code:    'OKC-2026',
          year:    new Date().getFullYear(),
          // Competition rules
          competition_rules:        'WKF',
          enable_individual_kata:   true,
          enable_team_kata:         true,
          enable_individual_kumite: true,
          enable_team_kumite:       false,
          allow_late_registration:  false,
          // Draw
          draw_type:      'SINGLE_ELIMINATION',
          seeding_method: 'RANDOM',
          // Match rules
          medal_rule:             'TWO_BRONZE',
          match_duration_seconds: 180,
          kata_scoring_method:    'TOTAL_SCORE',
          kumite_scoring_method:  'POINT_BASED',
          tie_break_rule:         'SENSHU',
          // Payment defaults
          bank_account_name:   'Sri Lanka Karatedo Federation',
          bank_account_number: '046-1-001-6-0387279',
          bank_name:           "People's Bank",
          bank_branch:         'First City',
          fee_individual_one_event_lkr:   2000,
          fee_individual_both_events_lkr: 3000,
          fee_team_kata_lkr:              3000,
          // Limits
          max_team_members:                        4,
          max_u14_teams_per_gender:               2,
          max_individual_athletes_per_application: 100,
          max_entries_per_category:               3,
          max_team_kata_teams:                    4,
        },
  })

  const competitionRules  = watch('competition_rules')
  const enableTeamKata    = watch('enable_team_kata')
  const allowLateReg      = watch('allow_late_registration')

  async function onSubmit(values: TournamentInput) {
    setApiError(null)
    try {
      const url    = isEdit ? `/api/tournaments/${tournamentId}` : '/api/tournaments'
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

      {/* ── 1. Basic Information ─────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Basic Information</SectionHeading>
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
          <Field label="Code" error={errors.code?.message} required hint="Uppercase letters, numbers, hyphens only">
            <input
              type="text"
              placeholder="e.g. NKC-2026"
              className={inputCls}
              {...register('code')}
              onChange={e => setValue('code', e.target.value.toUpperCase())}
            />
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
                placeholder="Optional subtitle shown on public pages"
                className={inputCls}
                {...register('subtitle')}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Public Description" error={errors.tournament_description?.message}>
              <textarea
                rows={3}
                placeholder="Brief description shown on the public results page..."
                className={inputCls}
                {...register('tournament_description')}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* ── 2. Competition Rules ─────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Competition Rules</SectionHeading>
        <div className="space-y-5">
          <RadioGroup
            label="Governing Rules"
            value={competitionRules ?? 'WKF'}
            onChange={v => setValue('competition_rules', v as 'WKF' | 'SLKF' | 'CUSTOM')}
            options={[
              { value: 'WKF',    label: 'WKF Rules',   hint: 'World Karate Federation standard rules' },
              { value: 'SLKF',   label: 'SLKF Rules',  hint: 'Sri Lanka Karate Federation local rules' },
              { value: 'CUSTOM', label: 'Custom Rules', hint: 'Describe custom rules below' },
            ]}
            error={errors.competition_rules?.message}
          />
          {competitionRules === 'CUSTOM' && (
            <Field label="Custom Rules Description" error={errors.custom_rules_text?.message}>
              <textarea
                rows={4}
                placeholder="Describe the custom rules that will apply to this tournament..."
                className={inputCls}
                {...register('custom_rules_text')}
              />
            </Field>
          )}
        </div>
      </section>

      {/* ── 3. Competition Types ─────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Competition Types</SectionHeading>
        <p className="text-xs text-gray-400 mb-4">Enable the event types that will take place at this tournament.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Toggle
            label="Individual Kata"
            description="Solo kata performance events"
            checked={watch('enable_individual_kata') ?? true}
            onChange={v => setValue('enable_individual_kata', v)}
          />
          <Toggle
            label="Team Kata"
            description="3–4 member synchronised kata"
            checked={watch('enable_team_kata') ?? true}
            onChange={v => setValue('enable_team_kata', v)}
          />
          <Toggle
            label="Individual Kumite"
            description="One-on-one fighting events"
            checked={watch('enable_individual_kumite') ?? true}
            onChange={v => setValue('enable_individual_kumite', v)}
          />
          <Toggle
            label="Team Kumite"
            description="Team fighting (future phase)"
            checked={watch('enable_team_kumite') ?? false}
            onChange={v => setValue('enable_team_kumite', v)}
          />
        </div>
      </section>

      {/* ── 4. Venue & Competition Dates ─────────────────────────────────────── */}
      <section>
        <SectionHeading>Venue & Competition Dates</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Field label="Venue" error={errors.venue?.message}>
              <input
                type="text"
                placeholder="e.g. Sugathadasa Indoor Stadium, Colombo"
                className={inputCls}
                {...register('venue')}
              />
            </Field>
          </div>
          <Field label="Competition Start Date" error={errors.competition_start_date?.message}>
            <input type="date" className={inputCls} {...register('competition_start_date')} />
          </Field>
          <Field label="Competition End Date" error={errors.competition_end_date?.message}>
            <input type="date" className={inputCls} {...register('competition_end_date')} />
          </Field>
        </div>
      </section>

      {/* ── 5. Registration Window ───────────────────────────────────────────── */}
      <section>
        <SectionHeading>Registration</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Registration Opens" error={errors.registration_open_date?.message}>
            <input type="date" className={inputCls} {...register('registration_open_date')} />
          </Field>
          <Field label="Registration Deadline" error={errors.registration_deadline?.message} required>
            <input type="date" className={inputCls} {...register('registration_deadline')} />
          </Field>
          <Field label="Age Eligibility Cutoff Date" error={errors.age_eligibility_cutoff_date?.message} required hint="Athlete ages are calculated as of this date">
            <input type="date" className={inputCls} {...register('age_eligibility_cutoff_date')} />
          </Field>
          <div className="flex items-end pb-0.5">
            <Toggle
              label="Allow Late Registration"
              description="Association reps can submit after the deadline"
              checked={allowLateReg ?? false}
              onChange={v => setValue('allow_late_registration', v)}
            />
          </div>
        </div>
      </section>

      {/* ── 6. Draw & Match Rules ────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Draw & Match Rules</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Draw Type" error={errors.draw_type?.message}>
            <select className={selectCls} {...register('draw_type')}>
              <option value="SINGLE_ELIMINATION">Single Elimination</option>
              <option value="ROUND_ROBIN">Round Robin</option>
              <option value="POOL_KNOCKOUT">Pool + Knockout</option>
            </select>
          </Field>
          <Field label="Seeding Method" error={errors.seeding_method?.message}>
            <select className={selectCls} {...register('seeding_method')}>
              <option value="RANDOM">Random Draw</option>
              <option value="ASSOCIATION_SEPARATION">Association Separation</option>
              <option value="MANUAL">Manual Seeding</option>
            </select>
          </Field>
          <Field label="Medal Rule" error={errors.medal_rule?.message} hint="ONE_BRONZE = one 3rd place; TWO_BRONZE = both semifinal losers get bronze">
            <select className={selectCls} {...register('medal_rule')}>
              <option value="TWO_BRONZE">Two Bronze Medals (WKF standard)</option>
              <option value="ONE_BRONZE">One Bronze Medal</option>
            </select>
          </Field>
          <Field label="Match Duration (seconds)" error={errors.match_duration_seconds?.message}>
            <input
              type="number"
              min={60}
              max={600}
              className={inputCls}
              {...register('match_duration_seconds', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Kata Scoring Method" error={errors.kata_scoring_method?.message}>
            <select className={selectCls} {...register('kata_scoring_method')}>
              <option value="TOTAL_SCORE">Total Score</option>
              <option value="DEDUCTION">Deduction System</option>
              <option value="FLAG">Flag System</option>
            </select>
          </Field>
          <Field label="Kumite Scoring Method" error={errors.kumite_scoring_method?.message}>
            <select className={selectCls} {...register('kumite_scoring_method')}>
              <option value="POINT_BASED">Point Based</option>
              <option value="FLAG">Flag System</option>
            </select>
          </Field>
          <Field label="Tie-Break Rule" error={errors.tie_break_rule?.message}>
            <select className={selectCls} {...register('tie_break_rule')}>
              <option value="SENSHU">Senshu (First Unopposed Point)</option>
              <option value="HANTEI">Hantei (Judges Decision)</option>
              <option value="OVERTIME">Overtime Period</option>
            </select>
          </Field>
        </div>
      </section>

      {/* ── 7. Entry Limits ──────────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Entry Limits</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Max Entries Per Category" error={errors.max_entries_per_category?.message} hint="Per association per category">
            <input
              type="number"
              min={1}
              max={20}
              className={inputCls}
              {...register('max_entries_per_category', { valueAsNumber: true })}
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
          <Field label="Max Team Kata Teams" error={errors.max_team_kata_teams?.message} hint="Total across all categories">
            <input
              type="number"
              min={1}
              max={20}
              className={inputCls}
              {...register('max_team_kata_teams', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Team Kata Members" error={errors.max_team_members?.message} hint="Athletes per team (+ reserves)">
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
        </div>
      </section>

      {/* ── 8. Payment Details ───────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Payment Details</SectionHeading>
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
          <Field label="Payment Deadline" error={errors.payment_deadline?.message} hint="Last date to submit payment receipts">
            <input type="date" className={inputCls} {...register('payment_deadline')} />
          </Field>
        </div>

        <div className="mt-5">
          <Field label="Payment Instructions" error={errors.payment_instructions?.message}>
            <textarea
              rows={3}
              placeholder="E.g. Transfer to People's Bank account and upload receipt..."
              className={inputCls}
              {...register('payment_instructions')}
            />
          </Field>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Entry Fees (LKR)</p>
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
            {(enableTeamKata ?? true) && (
              <Field label="Team Kata" error={errors.fee_team_kata_lkr?.message} required>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  {...register('fee_team_kata_lkr', { valueAsNumber: true })}
                />
              </Field>
            )}
          </div>
        </div>
      </section>

      {/* ── 9. Public Information ────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Public Information</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Public Contact" error={errors.organizer_contact?.message} hint="Shown on results page">
            <input
              type="text"
              placeholder="e.g. info@slkf.lk or +94 77 123 4567"
              className={inputCls}
              {...register('organizer_contact')}
            />
          </Field>
          <Field label="Rules PDF URL" error={errors.rules_pdf_url?.message} hint="Full URL to downloadable rules document">
            <input
              type="url"
              placeholder="https://..."
              className={inputCls}
              {...register('rules_pdf_url')}
            />
          </Field>
        </div>
      </section>

      {/* ── 10. Organizer Details ────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Organizer Details <span className="text-gray-400 font-normal normal-case">(printed in Excel export)</span></SectionHeading>
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
            <input type="text" placeholder="e.g. Chief Instructor Name" className={inputCls} {...register('organizer_instructor_name')} />
          </Field>
          <Field label="WhatsApp No" error={errors.organizer_whatsapp?.message}>
            <input type="text" placeholder="e.g. 0771234567" className={inputCls} {...register('organizer_whatsapp')} />
          </Field>
        </div>
      </section>

      {/* ── 11. Internal Notes ───────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Internal Notes <span className="text-gray-400 font-normal normal-case">(not shown publicly)</span></SectionHeading>
        <Field label="Notes" error={errors.notes?.message}>
          <textarea
            rows={3}
            placeholder="Internal notes for the head master only..."
            className={inputCls}
            {...register('notes')}
          />
        </Field>
      </section>

      {/* ── Submit ───────────────────────────────────────────────────────────── */}
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
