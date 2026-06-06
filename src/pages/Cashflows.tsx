import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@journal/contexts/AuthContext";
import { useCurrency } from "@journal/contexts/CurrencyContext";
import { CashflowManager } from "@journal/components/cashflows/CashflowManager";
import { ProfitJournal } from "@journal/components/cashflows/ProfitJournal";
import { propPhaseService } from "@journal/lib/propPhaseService";
import { tradeService } from "@journal/lib/tradeService";
import { PropPhase, PropPhaseOutcome } from "@journal/types/propPhase";
import { Trade } from "@journal/types/trade";
import { getTradePnl, getTradeDate } from "@journal/lib/tradeUtils";

const outcomeBadgeClass: Record<PropPhaseOutcome, string> = {
  Passed: "bg-green-500/15 text-green-400 border-green-500/30",
  Failed: "bg-red-500/15 text-red-400 border-red-500/30",
  Funded: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Paid out": "bg-primary/15 text-primary border-primary/30",
  Other: "bg-muted text-muted-foreground border-border",
};

export function Cashflows() {
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
    return () => { cancelled = true; };
  }, [user]);

  // Right column: realised profit comes from active-phase trades (untagged) —
  // archived / prop-tagged trades live in their own folders.
  const activeTrades = useMemo(
    () => trades.filter((t) => !t.propPhaseId),
    [trades],
  );

  // Left column: each published prop phase, with what it earned (end − start).
  const phaseRows = useMemo(
    () =>
      phases.map((phase) => {
        const phaseTrades = trades.filter((t) => t.propPhaseId === phase.id);
        const earned = phase.endingBalance - phase.startingBalance;
        const dates = phaseTrades.map((t) => new Date(getTradeDate(t)).getTime());
        const start = dates.length ? new Date(Math.min(...dates)) : new Date(phase.startedAt);
        const end = dates.length ? new Date(Math.max(...dates)) : new Date(phase.closedAt);
        return { phase, earned, tradeCount: phaseTrades.length, start, end };
      }),
    [phases, trades],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8">
        <h1 className="text-4xl font-black font-mono tracking-tighter text-white">
          <span className="uppercase">CASH</span>flows
        </h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          Prop-firm payouts on the left; your deposits, withdrawals and realised profit on the right.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* ── Left: Prop Firm Archive ─────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
              Prop Firm Archive
            </h2>
          </div>
          <p className="text-xs font-mono text-muted-foreground -mt-2">
            Each phase you publish from the Dashboard, and what it earned.
          </p>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-card p-10 text-center text-sm font-mono text-muted-foreground animate-pulse">
              Loading prop firms...
            </div>
          ) : phaseRows.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-card p-10 text-center text-sm font-mono text-muted-foreground">
              No prop firms archived yet. Click "Publish phase" on the Dashboard when you finish a phase.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {phaseRows.map(({ phase, earned, tradeCount, start, end }) => (
                <Link
                  key={phase.id}
                  to={`/journal/prop-firm/${phase.id}`}
                  className="block rounded-xl border border-white/10 bg-card p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-bold font-mono text-white truncate" title={phase.name}>
                      {phase.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border whitespace-nowrap ${outcomeBadgeClass[phase.outcome]}`}>
                      {phase.outcome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/40 text-muted-foreground border border-border/50">
                      {phase.stage}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                      {earned >= 0 ? (
                        <TrendingUp size={13} className="text-green-400" />
                      ) : (
                        <TrendingDown size={13} className="text-red-400" />
                      )}
                      {tradeCount} {tradeCount === 1 ? "trade" : "trades"}
                    </span>
                    <span className="text-right">
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60">Earned</span>
                      <span className={`font-mono font-bold ${earned >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {earned < 0 ? "-" : "+"}{symbol}{Math.abs(earned).toFixed(2)}
                      </span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Right: Profit and Deposits ──────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
              Profit &amp; Deposits
            </h2>
          </div>
          <p className="text-xs font-mono text-muted-foreground -mt-4">
            Log deposits and withdrawals, and see realised profit per trade.
          </p>

          <CashflowManager />

          <ProfitJournal trades={activeTrades} />
        </section>
      </div>
    </div>
  );
}
