export const SESSION_TYPES = [
  "cashgame",
  "tournament",
  "payout",
  "costs",
  "casinogame",
  "jackpot",
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export interface StackEntry {
  timestamp: number;
  change: number;
  stack: number;
}

export interface Session {
  // All session types
  id: number;
  type: SessionType;
  start: string;
  end?: string;
  location: string;
  location_type: string;
  currency: string;
  exchange_rate?: number;
  staking?: boolean;
  private: boolean;
  // Simple sessions (payout, costs, casinogame, jackpot)
  amount?: number;
  // Cashgame/tournament
  buyin?: number;
  cashout?: number;
  rebuys?: number;
  rebuy_cost?: number;
  expenses?: number;
  limit?: string;
  game?: string;
  table_size?: string;
  small_blind?: number;
  big_blind?: number;
  ante?: number;
  hands_per_hour?: number;
  stack_history?: StackEntry[];
  // Cashgame only
  third_blind?: number;
  expenses_in_chips?: number;
  // Tournament only
  addon_cost?: number;
  bounty_won?: number;
  place?: number;
  itm?: number;
  players?: number;
  start_stack?: number;
  // Shared (cashgame + tournament)
  shares_income?: number;
  shares_outgoing?: number;
  staking_player?: string;
}

export interface SessionsResponse {
  data: Session[];
}

export interface SessionFilters {
  start?: string;
  end?: string;
  type?: string;
  currency?: string;
  staking?: boolean;
}
