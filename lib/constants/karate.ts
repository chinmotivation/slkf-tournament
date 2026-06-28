// Karate domain constants: age categories, weight classes, belt grades, kata levels.
// Weight classes for U12/U14/Cadet/Junior use WKF-standard estimates — update as needed.

export type AgeCategoryCode = 'U10' | 'U12' | 'U14' | 'CADET' | 'JUNIOR' | 'U21' | 'SENIOR'
export type GenderKey = 'MALE' | 'FEMALE'

export interface AgeCategory {
  code: AgeCategoryCode
  label: string
  minAge: number   // inclusive
  maxAge: number   // exclusive (< maxAge)
}

export const AGE_CATEGORIES: AgeCategory[] = [
  { code: 'U10',    label: 'Under 10',  minAge: 8,  maxAge: 10 },
  { code: 'U12',    label: 'Under 12',  minAge: 10, maxAge: 12 },
  { code: 'U14',    label: 'Under 14',  minAge: 12, maxAge: 14 },
  { code: 'CADET',  label: 'Cadet',     minAge: 14, maxAge: 16 },
  { code: 'JUNIOR', label: 'Junior',    minAge: 16, maxAge: 18 },
  { code: 'U21',    label: 'Under 21',  minAge: 18, maxAge: 21 },
  { code: 'SENIOR', label: 'Senior',    minAge: 21, maxAge: 999 },
]

/** Returns age category code based on age on the given cutoff date, or null if too young (<8). */
export function computeAgeCategory(dob: string, cutoffDate?: string): AgeCategoryCode | null {
  const cutoff = cutoffDate ? new Date(cutoffDate) : new Date()
  const birth = new Date(dob)
  let age = cutoff.getFullYear() - birth.getFullYear()
  const m = cutoff.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && cutoff.getDate() < birth.getDate())) age--

  const cat = AGE_CATEGORIES.find(c => age >= c.minAge && age < c.maxAge)
  return cat?.code ?? null
}

export function ageCategoryLabel(code: AgeCategoryCode): string {
  return AGE_CATEGORIES.find(c => c.code === code)?.label ?? code
}

// ─── Weight classes (Kumite) ─────────────────────────────────────────────────
// Key: `${ageCode}_${gender}` → array of weight class strings

export const KUMITE_WEIGHT_CLASSES: Record<string, string[]> = {
  U10_MALE:    ['-25', '-30', '-40', '-50', '+50'],
  U10_FEMALE:  ['-25', '-30', '-40', '-50', '+50'],
  U12_MALE:    ['-30', '-35', '-40', '-45', '-50', '+50'],
  U12_FEMALE:  ['-30', '-35', '-40', '-45', '-50', '+50'],
  U14_MALE:    ['-40', '-45', '-50', '-55', '-61', '+61'],
  U14_FEMALE:  ['-40', '-45', '-50', '-55', '-61', '+61'],
  CADET_MALE:  ['-52', '-57', '-63', '-70', '+70'],
  CADET_FEMALE:['-47', '-52', '-59', '+59'],
  JUNIOR_MALE: ['-55', '-61', '-68', '-76', '+76'],
  JUNIOR_FEMALE:['-48', '-53', '-59', '-66', '+66'],
  U21_MALE:    ['-50', '-55', '-60', '-67', '-75', '-84', '+84'],
  U21_FEMALE:  ['-45', '-50', '-55', '-61', '-68', '+68'],
  SENIOR_MALE: ['-50', '-55', '-60', '-67', '-75', '-84', '+84'],
  SENIOR_FEMALE:['-45', '-50', '-55', '-61', '-68', '+68'],
}

export function getWeightClasses(ageCode: AgeCategoryCode, gender: GenderKey): string[] {
  return KUMITE_WEIGHT_CLASSES[`${ageCode}_${gender}`] ?? []
}

export function formatWeightClass(wc: string): string {
  if (wc.startsWith('+')) return `+${wc.slice(1)} kg`
  return `${wc} kg`
}

// ─── Kata levels ─────────────────────────────────────────────────────────────

export const KATA_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const
export type KataLevel = typeof KATA_LEVELS[number]

// ─── Belt grades ─────────────────────────────────────────────────────────────

export const BELT_GRADES = [
  'White Belt',
  'Yellow Belt',
  'Orange Belt',
  'Green Belt',
  'Blue Belt',
  'Purple Belt',
  'Brown Belt (3rd Kyu)',
  'Brown Belt (2nd Kyu)',
  'Brown Belt (1st Kyu)',
  'Black Belt (1st Dan)',
  'Black Belt (2nd Dan)',
  'Black Belt (3rd Dan+)',
] as const

export type BeltGrade = typeof BELT_GRADES[number]

// ─── Fee calculation ──────────────────────────────────────────────────────────

export const FEE_KATA_OR_KUMITE = 2000
export const FEE_BOTH = 3000

export function calculateFee(kata: boolean, kumite: boolean): number {
  if (kata && kumite) return FEE_BOTH
  if (kata || kumite) return FEE_KATA_OR_KUMITE
  return 0
}
