import { useMemo, useState } from "react";
import { Trade } from "@journal/types/trade";
import { useCurrency } from "@journal/contexts/CurrencyContext";
import {
  getTradePnl, getTradeSymbol, getTradeDate, formatTradeDate, tradeCurrencySymbol,
} from "@journal/lib/tradeUtils";

interface Props {
  trades: Trade[];
}

const COLLAPSED_COUNT = 5;

// A deliberately minimal journal of realised profit per trade — just date,
// symbol and P&L. The full List Overview lives on the Dashboard; this is the
// "transparency layer": collapsed to the latest few rows with a See more toggle.
export function ProfitJournal({ trades }: Props) {
  const { symbol: currencySymbol } = useCurrency();
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(
    () =>
      [...trades].sort(
        (a, b) => new Date(getTradeDate(b)).getTime() - new Date(getTradeDate(a)).getTime(),
      ),
    [trades],
  );

  const totalProfit = useMemo(
    () => rows.reduce((s, t) => s + getTradePnl(t), 0),
    [rows],
  );

  const visible = expanded ? rows : rows.slice(0, COLLAPSED_COUNT);
  const hiddenCount = rows.length - visible.length;

  return (
    <div className="rounded-xl border border-white/10 bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Profit Journal
        </span>
        <span className="text-sm font-mono font-bold">
          <span className="text-muted-foreground text-xs mr-2">Total</span>
          <span className={totalProfit >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
            {totalProfit < 0 ? "-" : "+"}{currencySymbol}{Math.abs(totalProfit).toFixed(2)}
          </span>
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm font-mono text-muted-foreground">
          No trades yet. Profits show up here as you trade.
        </div>
      ) : (
        <>
          <ul className="divide-y divide-white/5">
            {visible.map((t) => {
              const pnl = getTradePnl(t);
              const sym = tradeCurrencySymbol(t, currencySymbol);
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold font-mono text-foreground text-sm w-20 truncate">
                      {getTradeSymbol(t) || "-"}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {formatTradeDate(getTradeDate(t))}
                    </span>
                  </div>
                  <span className={`font-mono font-bold text-sm whitespace-nowrap ${
                    pnl > 0 ? "text-[#22c55e]" : pnl < 0 ? "text-[#ef4444]" : "text-muted-foreground"
                  }`}>
                    {pnl < 0 ? "-" : "+"}{sym}{Math.abs(pnl).toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>

          {rows.length > COLLAPSED_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full px-4 py-3 text-xs font-mono uppercase tracking-wider text-primary hover:bg-primary/5 transition-colors border-t border-white/10 cursor-pointer"
            >
              {expanded ? "See less" : `See more (${hiddenCount} more)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
