import type { UserRole, TournamentStatus, ApplicationStatus, PaymentStatus, GenderType, EventType } from '@/types/database'

// ─── Domain constants ─────────────────────────────────────────────────────────

export const USER_ROLES: UserRole[] = ['head_master', 'association_rep', 'super_admin']
export const TOURNAMENT_STATUSES: TournamentStatus[] = ['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED']
export const APPLICATION_STATUSES: ApplicationStatus[] = ['DRAFT', 'SUBMITTED', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED']
export const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'APPROVED', 'REJECTED']
export const GENDERS: GenderType[] = ['MALE', 'FEMALE']
export const EVENTS: EventType[] = ['KATA', 'KUMITE', 'BOTH']

// ─── OKC-2026 tournament constants ───────────────────────────────────────────

export const AGE_ELIGIBILITY_CUTOFF_DATE = '2026-07-17'

export const AGE_CATEGORY_CODES = [
  'U14_8_10',
  'U14_10_12',
  'U14_12_14',
  'CADET',
  'JUNIOR',
  'U21',
  'SENIOR',
] as const

export type AgeCategoryCode = typeof AGE_CATEGORY_CODES[number]

// ─── Fee structure (in LKR) ──────────────────────────────────────────────────

export const FEE_INDIVIDUAL_ONE_EVENT_LKR = 2000
export const FEE_INDIVIDUAL_BOTH_EVENTS_LKR = 3000
export const FEE_TEAM_KATA_LKR = 3000

// ─── Application limits ───────────────────────────────────────────────────────

export const MAX_INDIVIDUAL_ATHLETES_PER_APPLICATION = 100
export const MAX_TEAM_MEMBERS = 4
export const MAX_U14_TEAMS_PER_GENDER = 2

// ─── File upload constraints ──────────────────────────────────────────────────

export const PAYMENT_SLIP_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const PAYMENT_SLIP_MAX_MB = 5
export const ALLOWED_PAYMENT_SLIP_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const

// ─── Excel worksheet constants ────────────────────────────────────────────────

export const EXCEL_INDIVIDUAL_SHEET_NAME = 'Individual'
export const EXCEL_TKATA_SHEET_NAME = 'T-Kata'
export const EXCEL_INDIVIDUAL_DATA_START_ROW = 4 // row_order=1 maps here
export const EXCEL_TKATA_DATA_START_ROW = 4      // block_order=1 starts here
export const EXCEL_TKATA_ROWS_PER_BLOCK = 4

// ─── Supabase storage buckets ─────────────────────────────────────────────────

export const STORAGE_BUCKET_PAYMENT_SLIPS = 'payment-slips'

// ─── Display labels ───────────────────────────────────────────────────────────

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PENDING_VERIFICATION: 'Pending Verification',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open for Registration',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export const EVENT_LABELS: Record<EventType, string> = {
  KATA: 'Kata',
  KUMITE: 'Kumite',
  BOTH: 'Kata & Kumite',
}

export const GENDER_LABELS: Record<GenderType, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
}

// ─── Audit action constants ───────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PAYMENT_APPROVED: 'PAYMENT_APPROVED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  APPLICATION_SUBMITTED: 'APPLICATION_SUBMITTED',
  EXCEL_EXPORTED: 'EXCEL_EXPORTED',
  TOURNAMENT_CREATED: 'TOURNAMENT_CREATED',
  TOURNAMENT_STATUS_CHANGED: 'TOURNAMENT_STATUS_CHANGED',
} as const
