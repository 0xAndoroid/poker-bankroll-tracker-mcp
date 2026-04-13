export const SESSION_TYPES = [
  "cashgame",
  "tournament",
  "payout",
  "costs",
  "casinogame",
  "jackpot",
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export interface Session {
  id: number;
  type: SessionType;
  start: string;
  location: string;
  location_type: string;
  currency: string;
  private: boolean;
  // Full sessions (cashgame, tournament)
  end?: string;
  buyin?: number;
  cashout?: number;
  number_of_rebuys?: number;
  rebuy_costs?: number;
  expenses?: number;
  expenses_in_chips?: number;
  currency_exchange_rate?: string;
  staking?: boolean;
  staking_player?: string;
  shares_income?: number;
  shares_outgoing?: number;
  // Simple sessions (payout, costs, casinogame, jackpot)
  amount?: number;
  // Cash game and tournament shared
  limit?: string;
  game?: string;
  table_size?: string;
  hands_per_hour?: number;
  // Cash game only
  small_blind?: number;
  big_blind?: number;
  third_blind?: number;
  ante?: number;
  // Tournament only
  addon_costs?: number;
  bounty_winnings?: number;
  place?: number;
  itm?: number;
  players?: number;
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
