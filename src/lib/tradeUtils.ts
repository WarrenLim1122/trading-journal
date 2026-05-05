import { Trade } from "../types/trade";

export function getTradePnl(trade: Trade): number {
  if (trade.netPnl !== undefined && trade.netPnl !== null) return trade.netPnl;
  if (trade.grossPnl !== undefined && trade.grossPnl !== null) return trade.grossPnl;
  return trade.pnlAmount || 0;
}

export function getTradeSymbol(trade: Trade): string {
  return trade.symbol || trade.pair || "Unknown";
}

export function getTradeDirection(trade: Trade): string {
  return (trade.direction || trade.position || "Unknown").toUpperCase();
}

export function getTradeDate(trade: Trade): string {
  return trade.closeTime || trade.openTime || trade.date || new Date().toISOString();
}

export function getTradeOutcome(trade: Trade): string {
  let outcome = trade.outcome?.toUpperCase();
  if (outcome === "LOSS" || outcome === "LOST") outcome = "LOSE";
  return outcome || "BREAKEVEN";
}

export function getTradeDisplayOutcome(trade: Trade): string {
  const o = getTradeOutcome(trade);
  if (o === "LOSE") return "LOSS";
  return o;
}

export function getTradeClosePrice(trade: Trade): number | undefined {
  return trade.closePrice !== undefined ? trade.closePrice : trade.exitPrice;
}
