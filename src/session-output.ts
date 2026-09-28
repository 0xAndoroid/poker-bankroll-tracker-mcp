import type { Session } from "./types.js";
import { computeProfit, formatStakes } from "./stats.js";

export type FormattedSession = Record<string, unknown>;

export function formatSession(session: Session): FormattedSession {
  const result: FormattedSession = {
    id: session.id,
    type: session.type,
    startedAt: session.start,
    location: session.location,
    locationType: session.location_type,
    currency: session.currency,
    profit: computeProfit(session),
    private: session.private,
  };

  if (session.end != null) result.endedAt = session.end;
  if (session.exchange_rate != null) result.exchangeRate = session.exchange_rate;
  if (session.staking != null) result.staking = session.staking;
  if (session.amount != null) result.amount = session.amount;

  if (session.type === "cashgame" || session.type === "tournament") {
    if (session.buyin != null) result.buyin = session.buyin;
    if (session.cashout != null) result.cashout = session.cashout;
    if (session.rebuys != null) result.rebuys = session.rebuys;
    if (session.rebuy_cost != null) result.rebuyCost = session.rebuy_cost;
    if (session.expenses != null) result.expenses = session.expenses;
    if (session.game != null) result.game = session.game;
    if (session.limit != null) result.limit = session.limit;
    if (session.table_size != null) result.tableSize = session.table_size;
    if (session.hands_per_hour != null) result.handsPerHour = session.hands_per_hour;
    if (session.small_blind != null) result.smallBlind = session.small_blind;
    if (session.big_blind != null) result.bigBlind = session.big_blind;
    if (session.ante != null) result.ante = session.ante;
    if (session.stack_history != null) result.stackHistory = session.stack_history;
    if (session.staking_player != null) result.stakingPlayer = session.staking_player;
    if (session.shares_income != null) result.sharesIncome = session.shares_income;
    if (session.shares_outgoing != null) result.sharesOutgoing = session.shares_outgoing;
  }

  if (session.type === "cashgame") {
    result.stakes = formatStakes(session);
    if (session.third_blind != null) result.thirdBlind = session.third_blind;
    if (session.expenses_in_chips != null) result.expensesInChips = session.expenses_in_chips;
  }

  if (session.type === "tournament") {
    if (session.addon_cost != null) result.addonCost = session.addon_cost;
    if (session.bounty_won != null) result.bountyWon = session.bounty_won;
    if (session.place != null) result.place = session.place;
    if (session.itm != null) result.itm = session.itm;
    if (session.players != null) result.players = session.players;
    if (session.start_stack != null) result.startStack = session.start_stack;
  }

  return result;
}
