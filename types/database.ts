// Database types for the SLKF Tournament system.
// Manually maintained — update when the SQL schema changes.
// For full Supabase CLI generation: npx supabase gen types typescript --linked

export type UserRole = 'head_master' | 'association_rep' | 'super_admin'
export type TournamentStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED'
export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED'
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type VerificationAction = 'APPROVED' | 'REJECTED'
export type GenderType = 'MALE' | 'FEMALE'
export type EventType = 'KATA' | 'KUMITE' | 'BOTH'
export type AllowedMimeType = 'image/jpeg' | 'image/png' | 'application/pdf'

// postgrest-js GenericTable requires a Relationships field on every table.
// Use an empty array for tables with no foreign-key join helpers needed.
type NoRelationships = { Relationships: [] }

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      } & NoRelationships
      associations: {
        Row: Association
        Insert: Omit<Association, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Association, 'id' | 'created_at'>>
      } & NoRelationships
      tournaments: {
        Row: Tournament
        Insert: Omit<Tournament, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Tournament, 'id' | 'created_at'>>
      } & NoRelationships
      tournament_age_categories: {
        Row: TournamentAgeCategory
        Insert: Omit<TournamentAgeCategory, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TournamentAgeCategory, 'id' | 'created_at'>>
      } & NoRelationships
      tournament_weight_categories: {
        Row: TournamentWeightCategory
        Insert: Omit<TournamentWeightCategory, 'id' | 'created_at'>
        Update: Partial<Omit<TournamentWeightCategory, 'id' | 'created_at'>>
      } & NoRelationships
      athletes: {
        Row: Athlete
        Insert: Omit<Athlete, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Athlete, 'id' | 'created_at'>>
      } & NoRelationships
      applications: {
        Row: Application
        Insert: Omit<Application, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Application, 'id' | 'created_at'>>
      } & NoRelationships
      individual_entries: {
        Row: IndividualEntry
        Insert: Omit<IndividualEntry, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<IndividualEntry, 'id' | 'created_at'>>
      } & NoRelationships
      team_kata_entries: {
        Row: TeamKataEntry
        Insert: Omit<TeamKataEntry, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TeamKataEntry, 'id' | 'created_at'>>
      } & NoRelationships
      team_kata_members: {
        Row: TeamKataMember
        Insert: Omit<TeamKataMember, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TeamKataMember, 'id' | 'created_at'>>
      } & NoRelationships
      payment_submissions: {
        Row: PaymentSubmission
        Insert: Omit<PaymentSubmission, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PaymentSubmission, 'id' | 'created_at'>>
      } & NoRelationships
      payment_verification_log: {
        Row: PaymentVerificationLog
        Insert: Omit<PaymentVerificationLog, 'id' | 'created_at'>
        Update: never
      } & NoRelationships
      excel_export_history: {
        Row: ExcelExportHistory
        Insert: Omit<ExcelExportHistory, 'id' | 'created_at'>
        Update: never
      } & NoRelationships
      system_audit_log: {
        Row: SystemAuditLog
        Insert: Omit<SystemAuditLog, 'id' | 'created_at'>
        Update: never
      } & NoRelationships
    }
    Views: Record<string, never>
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: UserRole }
      current_association_id: { Args: Record<string, never>; Returns: string }
    }
    Enums: {
      user_role: UserRole
      tournament_status: TournamentStatus
      application_status: ApplicationStatus
      payment_status: PaymentStatus
      verification_action: VerificationAction
      gender_type: GenderType
      event_type: EventType
      allowed_mime_type: AllowedMimeType
    }
    CompositeTypes: Record<string, never>
  }
}

// ─── Row types ───────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Association {
  id: string
  user_id: string
  district: string
  province: string
  association_name: string
  slkf_registration_number: string
  instructor_name: string
  whatsapp_number: string
  email: string | null
  is_profile_complete: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface Tournament {
  id: string
  name: string
  code: string
  year: number
  subtitle: string | null
  registration_deadline: string
  age_eligibility_cutoff_date: string
  status: TournamentStatus
  venue_u14: string | null
  venue_cadet_junior: string | null
  venue_u21_senior: string | null
  date_u14_start: string | null
  date_u14_end: string | null
  date_cadet_junior: string | null
  date_u21_senior_start: string | null
  date_u21_senior_end: string | null
  bank_account_name: string
  bank_account_number: string
  bank_name: string
  bank_branch: string
  fee_individual_one_event_lkr: number
  fee_individual_both_events_lkr: number
  fee_team_kata_lkr: number
  max_team_members: number
  max_u14_teams_per_gender: number
  max_individual_athletes_per_application: number
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface TournamentAgeCategory {
  id: string
  tournament_id: string
  category_code: string
  category_label: string
  min_age_years: number | null
  max_age_years: number | null
  is_individual_eligible: boolean
  is_team_kata_eligible: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface TournamentWeightCategory {
  id: string
  tournament_id: string
  age_category_id: string
  gender: GenderType
  weight_class_label: string
  min_weight_kg: number | null
  max_weight_kg: number | null
  display_order: number
  created_at: string
}

export interface Athlete {
  id: string
  association_id: string
  full_name: string
  date_of_birth: string
  gender: GenderType
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface Application {
  id: string
  tournament_id: string
  association_id: string
  status: ApplicationStatus
  submitted_at: string | null
  locked_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface IndividualEntry {
  id: string
  application_id: string
  tournament_id: string
  association_id: string
  athlete_id: string | null
  full_name: string
  date_of_birth: string
  age_category_code: string
  gender: GenderType
  event: EventType
  weight_kg: number
  entry_fee_lkr: number
  row_order: number
  deleted_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface TeamKataEntry {
  id: string
  application_id: string
  tournament_id: string
  association_id: string
  team_number: number
  age_group_code: string
  gender: GenderType
  event_name: string
  entry_fee_lkr: number
  block_order: number
  deleted_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface TeamKataMember {
  id: string
  team_entry_id: string
  full_name: string
  member_order: number
  created_at: string
  updated_at: string
}

export interface PaymentSubmission {
  id: string
  application_id: string
  tournament_id: string
  association_id: string
  storage_path: string
  original_filename: string
  mime_type: AllowedMimeType
  file_size_bytes: number
  bank_reference_number: string | null
  status: PaymentStatus
  submitted_at: string
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface PaymentVerificationLog {
  id: string
  payment_submission_id: string
  application_id: string
  tournament_id: string
  association_id: string
  verified_by: string
  action: VerificationAction
  reason: string | null
  verified_at: string
  created_at: string
}

export interface ExcelExportHistory {
  id: string
  tournament_id: string
  exported_by: string
  snapshot_individual_count: number
  snapshot_team_count: number
  snapshot_total_payment_lkr: number
  exported_at: string
  created_at: string
}

export interface SystemAuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// ─── Composite query result types ─────────────────────────────────────────────

export interface TeamKataEntryWithMembers extends TeamKataEntry {
  team_kata_members: TeamKataMember[]
}

export interface ApplicationWithDetails extends Application {
  associations: Association
  individual_entries: IndividualEntry[]
  team_kata_entries: TeamKataEntryWithMembers[]
  payment_submissions: PaymentSubmission | null
}

export interface ApplicationSummary {
  id: string
  tournament_id: string
  association_id: string
  status: ApplicationStatus
  submitted_at: string | null
  association_name: string
  district: string
  individual_count: number
  team_count: number
  total_payment_lkr: number
}
