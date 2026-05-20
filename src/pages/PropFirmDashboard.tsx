import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Archive, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@journal/contexts/AuthContext";
import { useCurrency } from "@journal/contexts/CurrencyContext";
import { Card, CardContent } from "@journal/components/ui/card";
import { propPhaseService } from "@journal/lib/propPhaseService";
import { tradeService } from "@journal/lib/tradeService";
import { PropPhase, PropPhaseOutcome } from "@journal/types/propPhase";
import { Trade } from "@journal/types/trade";
import { getTradePnl, getTradeDate } from "@journal/lib/tradeUtils";

const outcomeBadgeClass: Record<PropPhaseOutcome, string> = {
  "Passed": "bg-green-500/15 text-green-400 border-green-500/30",
  "Failed": "bg-red-500/15 text-red-400 border-red-500/30",
  "Funded": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Paid out": "bg-primary/15 text-primary border-primary/30",
  "Other": "bg-muted text-muted-foreground border-border",
};

const formatAccountSize = (n: number): string =>
  n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;

const formatMoney = (symbol: string, value: number, withExplicitPlus: boolean): string => {
  const sign = value < 0 ? "-" : withExplicitPlus ? "+" : "";
  return `${sign}${symbol}${Math.abs(value).toFixed(2)}`;
};

export function PropFirmDashboard() {
  const { user } = useAuth();
  const { symbol } = useCurrency();
  const [phases, setPhases] = useState<PropPhase[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      propPhaseService.getPhases(user.uid),
      tradeService.getTrades(user.uid),
    ]).then(([p, t]) => {
      if (cancelled) return;
      setPhases(p);
      setTrades(t);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const phaseCards = useMemo(() => {
    return phases.map(phase => {
      const phaseTrades = trades.filter(t => t.propPhaseId === phase.id);
      const tradeCount = phaseTrades.length;
      const totalPnl = phaseTrades.reduce((s, t) => s + getTradePnl(t), 0);

      const tradeDates = phaseTrades.map(t => new Date(getTradeDate(t)));
      const startDate =
        tradeDates.length > 0
          ? new Date(Math.min(...tradeDates.map(d => d.getTime())))
          : new Date(phase.startedAt);
      const endDate =
        tradeDates.length > 0
          ? new Date(Math.max(...tradeDates.map(d => d.getTime())))
          : new Date(phase.closedAt);

      return {
        phase,
        tradeCount,
        totalPnl,
        startDate,
        endDate,
      };
    });
  }, [phases, trades]);

  return (
    <div className="mx-auto max-w-7xl relative pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
          <Archive className="h-6 w-6 text-primary" />
          PropFirm Journal
        </h1>
        <p className="text-muted-foreground mt-2">
          Browse archived prop-firm phases and review their performance.
        </p>
      </header>

      {loading ? (
        <div className="flex w-full items-center justify-center p-12">
          <p className="text-muted-foreground animate-pulse">Loading prop firms...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {phaseCards.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No prop firms archived yet. Click 'Publish phase' on the Dashboard when you finish a session.
            </div>
          ) : (
            phaseCards.map(({ phase, tradeCount, totalPnl, startDate, endDate }) => (
              <Link
                key={phase.id}
                to={`/journal/prop-firm/${phase.id}`}
                className="block"
              >
                <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors h-full">
                  <CardContent className="p-6">
                    {/* Top row: name + outcome badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3
                        className="text-xl font-bold font-mono text-white truncate"
                        title={phase.name}
                      >
                        {phase.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-mono uppercase border whitespace-nowrap ${outcomeBadgeClass[phase.outcome]}`}
                      >
                        {phase.outcome}
                      </span>
                    </div>

                    {/* Account size chip + stage */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-black/40 text-muted-foreground border border-border/50">
                        {formatAccountSize(phase.accountSize)}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {phase.stage}
                      </span>
                    </div>

                    {/* Start → End balance */}
                    <div className="bg-black/40 p-3 rounded mb-4">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Start → End</p>
                      <p className="text-base font-bold font-mono text-white">
                        {formatMoney(symbol, phase.startingBalance, false)}
                        <span className="text-muted-foreground mx-2">→</span>
                        {formatMoney(symbol, phase.endingBalance, false)}
                      </p>
                    </div>

                    {/* Total P&L */}
                    <div className="bg-black/40 p-3 rounded mb-4 text-center">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Total P&amp;L</p>
                      <p
                        className={`text-xl font-bold font-mono ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {formatMoney(symbol, totalPnl, true)}
                      </p>
                    </div>

                    {/* Footer: trade count + date range */}
                    <div className="flex items-center justify-between text-sm font-mono border-t border-border/50 pt-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {totalPnl >= 0 ? (
                          <TrendingUp size={14} className="text-green-400" />
                        ) : (
                          <TrendingDown size={14} className="text-red-400" />
                        )}
                        {tradeCount} {tradeCount === 1 ? "trade" : "trades"}
                      </span>
                      <span className="truncate ml-2" title={`${format(startDate, "MMM d, yyyy")} – ${format(endDate, "MMM d, yyyy")}`}>
                        {format(startDate, "MMM d")} – {format(endDate, "MMM d, yyyy")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
