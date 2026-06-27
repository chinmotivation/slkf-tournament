import type { EventType, Tournament } from '@/types/database'
import { FEE_INDIVIDUAL_ONE_EVENT_LKR, FEE_INDIVIDUAL_BOTH_EVENTS_LKR, FEE_TEAM_KATA_LKR } from './constants'

export function calculateIndividualFee(event: EventType, tournament?: Tournament): number {
  const oneEventFee = tournament?.fee_individual_one_event_lkr ?? FEE_INDIVIDUAL_ONE_EVENT_LKR
  const bothEventsFee = tournament?.fee_individual_both_events_lkr ?? FEE_INDIVIDUAL_BOTH_EVENTS_LKR
  return event === 'BOTH' ? bothEventsFee : oneEventFee
}

export function calculateTeamKataFee(tournament?: Tournament): number {
  return tournament?.fee_team_kata_lkr ?? FEE_TEAM_KATA_LKR
}

export function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`
}
