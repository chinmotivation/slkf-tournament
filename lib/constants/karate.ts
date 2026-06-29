// Karate domain constants: age categories, weight classes, belt grades, kata levels.
// Weight classes for U12/U14/Cadet/Junior use WKF-standard estimates — update as needed.

// ─── SLKF / WKF age categories ───────────────────────────────────────────────

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

// ─── ISK Sri Lanka age categories (parallel set) ─────────────────────────────
// Japan Karatedo Inoue Ha Shito Ryu Keishin Kai Sri Lanka Branch

export type ISKAgeCategoryCode =
  | 'ISK_U6' | 'ISK_U8' | 'ISK_U10' | 'ISK_U13'
  | 'ISK_U1415' | 'ISK_U1617' | 'ISK_OVER21' | 'ISK_VETERAN'

export interface ISKAgeCategory {
  code: ISKAgeCategoryCode
  label: string      // display label e.g. "U - 6"
  sheetLabel: string // label used on Application Summary Sheet
  minAge: number     // inclusive
  maxAge: number     // exclusive (< maxAge); 999 = no upper limit
}

export const ISK_AGE_CATEGORIES: ISKAgeCategory[] = [
  { code: 'ISK_U6',     label: 'Under 6',       sheetLabel: 'U - 6',     minAge: 0,  maxAge: 6   },
  { code: 'ISK_U8',     label: 'Under 8',       sheetLabel: 'U - 8',     minAge: 6,  maxAge: 8   },
  { code: 'ISK_U10',    label: 'Under 10',      sheetLabel: 'U - 10',    minAge: 8,  maxAge: 10  },
  { code: 'ISK_U13',    label: 'Under 13',      sheetLabel: 'U - 13',    minAge: 10, maxAge: 13  },
  { code: 'ISK_U1415',  label: 'Under 14/15',   sheetLabel: 'U – 14/15', minAge: 13, maxAge: 16  },
  { code: 'ISK_U1617',  label: 'Under 16/17',   sheetLabel: 'U – 16/17', minAge: 16, maxAge: 18  },
  { code: 'ISK_OVER21', label: 'Over 21',       sheetLabel: 'Over 21',   minAge: 18, maxAge: 999 },
  { code: 'ISK_VETERAN','label': 'Veteran',      sheetLabel: 'Veteran',   minAge: 35, maxAge: 999 },
]

/**
 * Returns ISK age category based on age at cutoff date.
 * Veteran has no required cutoff — returns null if age < 0.
 * Note: OVER21 and VETERAN overlap at 35+; VETERAN is self-declared
 * (the student selects it; the default assignment uses OVER21 for ages 18–34).
 */
export function computeISKAgeCategory(dob: string, cutoffDate?: string): ISKAgeCategoryCode | null {
  const cutoff = cutoffDate ? new Date(cutoffDate) : new Date()
  const birth = new Date(dob)
  let age = cutoff.getFullYear() - birth.getFullYear()
  const m = cutoff.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && cutoff.getDate() < birth.getDate())) age--
  if (age < 0) return null

  // Exclude VETERAN from auto-assignment (it is self-declared by the student)
  const cat = ISK_AGE_CATEGORIES
    .filter(c => c.code !== 'ISK_VETERAN')
    .find(c => age >= c.minAge && age < c.maxAge)
  return cat?.code ?? null
}

export function iskAgeCategoryLabel(code: ISKAgeCategoryCode | string): string {
  return ISK_AGE_CATEGORIES.find(c => c.code === code)?.label ?? code
}

export function iskAgeCategorySheetLabel(code: ISKAgeCategoryCode | string): string {
  return ISK_AGE_CATEGORIES.find(c => c.code === code)?.sheetLabel ?? code
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

const ISK_TO_SLKF_WEIGHT_MAP: Record<string, AgeCategoryCode> = {
  ISK_U6:     'U10',
  ISK_U8:     'U10',
  ISK_U10:    'U10',
  ISK_U13:    'U14',
  ISK_U1415:  'CADET',
  ISK_U1617:  'JUNIOR',
  ISK_OVER21: 'SENIOR',
  ISK_VETERAN:'SENIOR',
}

export function getWeightClasses(ageCode: string, gender: GenderKey): string[] {
  const slkfCode = (ISK_TO_SLKF_WEIGHT_MAP as Record<string, string>)[ageCode] ?? ageCode
  return KUMITE_WEIGHT_CLASSES[`${slkfCode}_${gender}`] ?? []
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

// SLKF / WKF default fees (LKR)
export const FEE_KATA_OR_KUMITE = 2000
export const FEE_BOTH = 3000

// ISK Sri Lanka fee schedule (LKR) — Japan Karatedo Inoue Ha Keishin Kai
// One event (Kata or Kumite): 2,000
// Kata + Kumite:               3,500
// Kata + T.KATA:               3,000
// Kata + Kumite + T.KATA:      4,500
// Team Kata add-on alone:      1,000 on top of individual base
export const ISK_FEE_ONE_EVENT    = 2000
export const ISK_FEE_KATA_KUMITE  = 3500
export const ISK_FEE_TEAM_KATA_ADDON = 1000  // added to individual base when T.KATA is selected

/**
 * Standard SLKF fee calculation (backwards compatible — no team kata).
 */
export function calculateFee(kata: boolean, kumite: boolean): number {
  if (kata && kumite) return FEE_BOTH
  if (kata || kumite) return FEE_KATA_OR_KUMITE
  return 0
}

/**
 * ISK fee calculation including Team Kata.
 * Fee structure:
 *   Kata or Kumite only     → 2,000
 *   Kata + Kumite           → 3,500
 *   Any individual + T.KATA → individual base + 1,000
 *   T.KATA only (no individual event) → 2,000
 */
export function calculateISKFee(kata: boolean, kumite: boolean, teamKata: boolean): number {
  let base = 0
  if (kata && kumite) base = ISK_FEE_KATA_KUMITE
  else if (kata || kumite) base = ISK_FEE_ONE_EVENT
  else if (teamKata) base = ISK_FEE_ONE_EVENT  // T.KATA only

  if (teamKata && (kata || kumite)) base += ISK_FEE_TEAM_KATA_ADDON
  return base
}
