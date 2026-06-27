import { differenceInYears, format, isValid, parseISO } from 'date-fns'
import type { AgeCategoryCode } from './constants'
import type { TournamentAgeCategory } from '@/types/database'

export function calculateAgeOnDate(dateOfBirth: string, cutoffDate: string): number {
  const dob = parseISO(dateOfBirth)
  const cutoff = parseISO(cutoffDate)
  return differenceInYears(cutoff, dob)
}

export function deriveAgeCategory(
  dateOfBirth: string,
  cutoffDate: string,
  categories: TournamentAgeCategory[]
): TournamentAgeCategory | null {
  const age = calculateAgeOnDate(dateOfBirth, cutoffDate)
  const sorted = [...categories].sort((a, b) => a.display_order - b.display_order)

  return sorted.find(cat => {
    const aboveMin = cat.min_age_years === null || age >= cat.min_age_years
    const belowMax = cat.max_age_years === null || age < cat.max_age_years
    return aboveMin && belowMax
  }) ?? null
}

export function formatDateForExcel(isoDate: string): string {
  if (!isoDate) return ''
  const d = parseISO(isoDate)
  if (!isValid(d)) return ''
  return format(d, 'dd/MM/yyyy')
}

export function formatDateDisplay(isoDate: string | null): string {
  if (!isoDate) return '—'
  const d = parseISO(isoDate)
  if (!isValid(d)) return '—'
  return format(d, 'dd MMM yyyy')
}

export function formatDateTimeDisplay(isoDateTime: string | null): string {
  if (!isoDateTime) return '—'
  const d = parseISO(isoDateTime)
  if (!isValid(d)) return '—'
  return format(d, 'dd MMM yyyy, HH:mm')
}

export function isRegistrationOpen(deadline: string): boolean {
  return new Date() <= parseISO(deadline)
}
