import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { tradeService } from "../lib/tradeService";
import { Trade } from "../types/trade";
import { FolderGit2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";

export function StrategiesDashboard() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      tradeService.getTrades(user.uid).then((data) => {
        setTrades(data);
        setLoading(false);
      });
    }
  }, [user]);

  const strategyStats = useMemo(() => {
    const stats: Record<string, {
      total: number;
      wins: number;
      losses: number;
      breakevens: number;
      totalProfit: number;
    }> = {};

    trades.forEach(t => {
      const strat = t.strategy || "Uncategorized";
      if (!stats[strat]) {
        stats[strat] = { total: 0, wins: 0, losses: 0, breakevens: 0, totalProfit: 0 };
      }
      
      stats[strat].total += 1;
      if (t.outcome === "WIN") stats[strat].wins += 1;
      else if (t.outcome === "LOSE") stats[strat].losses += 1;
      else if (t.outcome === "BREAKEVEN") stats[strat].breakevens += 1;

      if (t.pnlAmount) {
        stats[strat].totalProfit += t.pnlAmount;
      }
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0
    })).sort((a, b) => b.total - a.total);
  }, [trades]);

  return (
    <div className="mx-auto max-w-7xl relative pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
          <FolderGit2 className="h-6 w-6 text-primary" />
          Strategies Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Review the performance of your individual trading strategies.
        </p>
      </header>

      {loading ? (
        <div className="flex w-full items-center justify-center p-12">
           <p className="text-muted-foreground animate-pulse">Loading strategies...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategyStats.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No strategy data found.
            </div>
          ) : (
            strategyStats.map((strat, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold font-mono text-white mb-4 truncate" title={strat.name}>
                    {strat.name}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-black/40 p-3 rounded text-center">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Win Rate</p>
                      <p className="text-2xl font-bold font-mono text-white">{strat.winRate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-black/40 p-3 rounded text-center">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Total PnL</p>
                      <p className={`text-xl font-bold font-mono ${strat.totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {strat.totalProfit >= 0 ? "+" : ""}${strat.totalProfit.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm font-mono border-t border-border/50 pt-4">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span>Total: {strat.total}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-green-400"><TrendingUp size={14}/> {strat.wins}</span>
                      <span className="flex items-center gap-1 text-red-400"><TrendingDown size={14}/> {strat.losses}</span>
                      <span className="flex items-center gap-1 text-yellow-400"><Minus size={14}/> {strat.breakevens}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
