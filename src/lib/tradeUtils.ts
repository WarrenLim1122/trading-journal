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

// ── Price formatting (Issue 1) ────────────────────────────────────────────────
// Natural decimal digits for a symbol's price. Mirrors the bot's layer2 _fmt_price
// so Entry/SL/TP in a single row always share the same dp (e.g. 0.584 -> 0.58400,
// 4543 -> 4543.00) and float artefacts like 1.3465500000000001 never render.
export function priceDigits(symbol: string): number {
  const s = (symbol || "").toUpperCase();
  if (s.includes("JPY")) return 3;
  if (s.startsWith("XAU")) return 2;
  if (s.startsWith("XAG")) return 4;
  return 5;
}

export function formatPrice(symbol: string, value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(priceDigits(symbol));
}

// ── Time formatting (Issue 4) ─────────────────────────────────────────────────
// Trade timestamps are stored as true UTC (the bot normalises MT5 server time to
// UTC before journaling). Render them in Malaysia/Singapore time (UTC+8) regardless
// of the viewer's machine timezone, so the displayed time is the real exit time.
const MALAYSIA_TZ = "Asia/Singapore"; // UTC+8, identical offset to Kuala Lumpur

export function formatTradeDate(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MALAYSIA_TZ, month: "short", day: "numeric", year: "numeric",
  }).format(d);
}

// ── Per-account currency symbol (Issue 7) ─────────────────────────────────────
// Each bot trade stores its MT5 account currency (personal = SGD, prop = USD).
// Use it so a trade's P&L is labelled in its own currency rather than one global
// toggle. Falls back to the provided symbol (the global toggle) for manual trades
// that have no accountCurrency.
// "SGD " (ISO code prefix) matches the label Warren chose for the alerts/journal.
const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", SGD: "SGD ", EUR: "€", GBP: "£" };

export function tradeCurrencySymbol(trade: Trade, fallback = "$"): string {
  const code = (trade.accountCurrency || "").toUpperCase();
  return CURRENCY_SYMBOLS[code] || fallback;
}

// ── Per-account separation (Issue 7 follow-up) ────────────────────────────────
// The personal (SGD) and prop (USD) accounts are distinct; their P&L must never be
// summed together. Bot trades carry the worker name in `tags` (["bot","arbitrage",
// "personal"|"prop"]); fall back to accountType, else treat as a manual entry.
export type TradeAccount = "personal" | "prop" | "manual";

export function getTradeAccount(trade: Trade): TradeAccount {
  const tags = (trade.tags || []).map((t) => String(t).toLowerCase());
  if (tags.includes("prop")) return "prop";
  if (tags.includes("personal")) return "personal";
  if ((trade.accountType || "").toLowerCase() === "prop") return "prop";
  if ((trade.accountType || "").toLowerCase() === "personal") return "personal";
  return "manual";
}

export function formatTradeTime(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: MALAYSIA_TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
}
