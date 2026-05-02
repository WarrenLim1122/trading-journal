import React, { useMemo } from "react";
import { Trade } from "../../types/trade";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

interface Props {
  trades: Trade[];
}

export function WinsVsLosses({ trades }: Props) {
  const stats = useMemo(() => {
    if (trades.length === 0) return { winRate: 0, lossesRate: 0, totalProfit: 0, strategyData: [], dayData: [] };
    
    const wins = trades.filter(t => t.outcome === "WIN").length;
    const losses = trades.filter(t => t.outcome === "LOSS").length;
    const breakevens = trades.filter(t => t.outcome === "BREAKEVEN").length;
    const total = trades.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const lossesRate = total > 0 ? Math.round((losses / total) * 100) : 0;
    const breakevenRate = total > 0 ? Math.round((breakevens / total) * 100) : 0;
    
    let totalProfit = 0;
    
    // Group by strategy
    const stratMap: Record<string, { win: number, loss: number, be: number }> = {};
    const dayMap: Record<string, number> = {};

    trades.forEach(t => {
      if (t.pnlAmount) totalProfit += t.pnlAmount;

      const strat = t.strategy || "Unknown";
      if (!stratMap[strat]) stratMap[strat] = { win: 0, loss: 0, be: 0 };
      if (t.outcome === "WIN") stratMap[strat].win += 1;
      if (t.outcome === "LOSS") stratMap[strat].loss += 1;
      if (t.outcome === "BREAKEVEN") stratMap[strat].be += 1;

      const dayStr = new Date(t.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
      if (!dayMap[dayStr]) dayMap[dayStr] = 0;
      if (t.pnlAmount) dayMap[dayStr] += t.pnlAmount;
    });

      const strategyData = Object.keys(stratMap).map(k => ({
      name: k,
      "Win": stratMap[k].win,
      "Lose": stratMap[k].loss,
      "Break Even": stratMap[k].be,
    }));

    const tradeData = trades.map((t, i) => ({
       name: t.pair || `Trade ${i + 1}`,
       pnl: t.pnlAmount || 0,
       outcome: t.outcome
    }));

    return { winRate, lossesRate, breakevens, totalProfit, totalTrades: total, wins, losses, strategyData, tradeData };
  }, [trades]);

  if (trades.length === 0) {
    return <div className="text-center py-12 text-muted-foreground font-mono bg-card rounded-xl border border-border">No trades match your filters.</div>;
  }

  const pieData = [
    { name: "Win", value: stats.winRate },
    { name: "Lose", value: stats.lossesRate },
    { name: "Break Even", value: stats.breakevenRate },
  ].filter(d => d.value > 0);
  if(pieData.length === 0) {
      pieData.push({ name: "Empty", value: 1 }); // placeholder to draw empty
  }

  const COLORS = { "Win": "#22c55e", "Lose": "#ef4444", "Break Even": "#f59e0b", "Empty": "#333" };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <Card className="bg-card border-border flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-mono uppercase text-center w-full">Total Trades</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center p-6 pb-8">
             <div className="w-[200px] h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={[{ value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      dataKey="value"
                      stroke="none"
                      fill="#8b5cf6"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-bold text-purple-500 leading-none">{stats.totalTrades}</span>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-mono uppercase text-center w-full">Win Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-6 pb-8">
             <div className="w-[200px] h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.length > 0 ? pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || "#333"} />
                      )) : null}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-bold text-white leading-none">{stats.winRate}%</span>
                </div>
             </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-mono uppercase text-center w-full">Total PnL</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center p-6 pb-8">
             <div className="w-[200px] h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={[{ value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      dataKey="value"
                      stroke="none"
                      fill={stats.totalProfit < 0 ? "#ef4444" : "#22c55e"}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
                  <span className={`text-xl sm:text-xl md:text-xl font-bold text-center break-words max-w-[140px] leading-tight ${stats.totalProfit < 0 ? "text-[#ef4444]" : "text-[#22c55e]"}`}>
                    {stats.totalProfit < 0 ? `-$${Math.abs(stats.totalProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${stats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
             </div>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-mono uppercase">Win by Strategy</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={stats.strategyData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                 <XAxis dataKey="name" stroke="#888" tick={{fontSize: 12}} />
                 <YAxis stroke="#888" tick={{fontSize: 12}} />
                 <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                    content={({ active, payload, label }) => {
                       if (active && payload && payload.length) {
                         // The hovered payload has a dataKey that matches the bar hovered when shared={false} or we just grab the one with the non-zero value or just use payload[0].
                         // To be safe, let's see if Recharts passes only the hovered item when shared=false.
                         // Actually, shared={false} passes only one payload item.
                         const data = payload[0];
                         return (
                           <div className="bg-[#111] border border-[#333] p-2 rounded text-xs font-mono">
                             <div className="mb-1 text-muted-foreground">{label}</div>
                             <div style={{ color: data.color }}>
                               {data.name}: {data.value}
                             </div>
                           </div>
                         );
                       }
                       return null;
                    }}
                    shared={false} 
                 />
                 <Bar dataKey="Win" fill="#22c55e" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="Lose" fill="#ef4444" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="Break Even" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
         </Card>

         <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-mono uppercase">PnL per Trade</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={stats.tradeData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                 <XAxis dataKey="name" stroke="#888" tick={{fontSize: 12}} axisLine={false} tickMargin={10} />
                 <YAxis stroke="#888" tick={{fontSize: 12}} />
                 <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#111', borderColor: '#333'}} />
                 <ReferenceLine y={0} stroke="#666" />
                 <Bar dataKey="pnl" radius={0}>
                   {stats.tradeData.length > 0 ? stats.tradeData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.pnl > 0 ? "#22c55e" : entry.pnl < 0 ? "#ef4444" : "#f59e0b"} />
                   )) : null}
                 </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
         </Card>
      </div>
    </div>
  );
}
