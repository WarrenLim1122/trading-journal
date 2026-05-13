import React, { useState, useMemo } from 'react';
import { Trade } from '../../types/trade';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { format } from 'date-fns';

interface Props {
  trades: Trade[];
  startingBalance?: string;
  setStartingBalance?: (val: string) => void;
}

export function EquityCurve({ trades, startingBalance: externalSb, setStartingBalance: setExternalSb }: Props) {
  const [isCompounding, setIsCompounding] = useState(false);
  const [internalSb, setInternalSb] = useState("1000");
  const [trackingMode, setTrackingMode] = useState<"Trade" | "Date">("Trade");

  const startingBalance = externalSb !== undefined ? externalSb : internalSb;
  const setStartingBalance = setExternalSb !== undefined ? setExternalSb : setInternalSb;

  const data = useMemo(() => {
    if (trades.length === 0) return [];
    
    // Sort trades chronologically ascending
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const balanceNum = parseFloat(startingBalance) || 0;
    let currentBalance = balanceNum;
    
    const allChartData = [{
      name: "Start",
      balance: currentBalance,
      dateStr: "Start",
      tooltipLabel: "Initial Balance"
    }];

    sortedTrades.forEach((trade, i) => {
      const pnlPct = trade.pnlPercentage || (balanceNum > 0 && trade.pnlAmount ? (trade.pnlAmount / balanceNum)*100 : 0);
      
      if (isCompounding) {
        currentBalance = currentBalance * (1 + pnlPct / 100);
      } else {
        const pnlAmt = trade.pnlAmount !== undefined ? trade.pnlAmount : (balanceNum > 0 ? balanceNum * (pnlPct / 100) : 0);
        currentBalance += pnlAmt;
      }
      
      allChartData.push({
        name: `Trade ${i+1}`,
        balance: currentBalance,
        dateStr: format(new Date(trade.date), 'yyyy-MM-dd'),
        tooltipLabel: `${format(new Date(trade.date), 'MMM d')} - ${trade.pair || 'Trade'}`
      });
    });

    if (trackingMode === "Date") {
      const grouped = [allChartData[0]];
      const dateMap = new Map();
      for (let i = 1; i < allChartData.length; i++) {
         dateMap.set(allChartData[i].dateStr, allChartData[i]); // Overwrites to keep the last trade of the day
      }
      Array.from(dateMap.entries()).forEach(([dateStr, d]) => {
         grouped.push({
           ...d,
           name: format(new Date(dateStr), 'MMM d'),
           tooltipLabel: format(new Date(dateStr), 'MMM d, yyyy')
         });
      });
      return grouped;
    }

    return allChartData;
  }, [trades, isCompounding, startingBalance, trackingMode]);

  if (trades.length === 0) {
    return <div className="text-center py-12 text-muted-foreground font-mono bg-card rounded-xl border border-border">No trades match your filters.</div>;
  }

  const endBalance = data.length > 0 ? data[data.length - 1].balance : 0;
  const startNum = parseFloat(startingBalance) || 0;
  const totalReturn = startNum > 0 ? ((endBalance - startNum) / startNum) * 100 : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
           <CardTitle className="text-sm text-muted-foreground font-mono uppercase">Equity Curve</CardTitle>
           <div className="flex items-baseline gap-2">
             <span className="text-3xl font-bold font-mono tracking-tight cursor-default">
               {endBalance < 0 ? `-$${Math.abs(endBalance).toFixed(2)}` : `$${endBalance.toFixed(2)}`}
             </span>
             <span className={`text-sm font-mono font-bold ${totalReturn >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
             </span>
           </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-black/20 p-3 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-lg border border-white/10">
            <button 
              onClick={() => setTrackingMode('Trade')}
              className={`cursor-pointer px-3 py-1 text-xs font-mono rounded-md transition-colors ${trackingMode === 'Trade' ? 'bg-primary text-black font-bold' : 'text-muted-foreground hover:text-white'}`}
            >
              Trade
            </button>
            <button 
              onClick={() => setTrackingMode('Date')}
              className={`cursor-pointer px-3 py-1 text-xs font-mono rounded-md transition-colors ${trackingMode === 'Date' ? 'bg-primary text-black font-bold' : 'text-muted-foreground hover:text-white'}`}
            >
              Date
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="starting-balance" className="text-xs text-muted-foreground font-mono cursor-pointer">Start Balance</Label>
            <Input 
              id="starting-balance"
              type="number"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              className="cursor-pointer w-24 h-8 text-xs font-mono bg-black/40 border-border"
            />
          </div>
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsCompounding(!isCompounding)}>
            <button
              className={`cursor-pointer w-9 h-5 rounded-full transition-colors relative ${isCompounding ? 'bg-[#22c55e]' : 'bg-muted-foreground'}`}
            >
              <span className={`block w-4 h-4 bg-white rounded-full transition-transform absolute top-0.5 ${isCompounding ? 'left-4' : 'left-0.5'}`} />
            </button>
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 cursor-pointer">
              <span>Arithmetic</span>
              <span className={`transition-colors ${isCompounding ? 'text-primary' : 'text-muted-foreground'}`}>/ Geometric</span>
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorBalanceNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
            <XAxis dataKey="name" stroke="#888" tick={{fontSize: 12}} minTickGap={30} axisLine={false} />
            <YAxis 
               stroke="#888" 
               tick={{fontSize: 12}} 
               width={80} 
               tickFormatter={(val) => `$${val}`} 
               axisLine={false}
               domain={[(dataMin: number) => Math.min(startNum, dataMin), 'auto']}
            />
            <Tooltip 
               contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
               itemStyle={{ fontWeight: 'bold' }}
               labelFormatter={(label, payload) => {
                 return payload && payload.length > 0 ? payload[0].payload.tooltipLabel : label;
               }}
               formatter={(value) => {
                 return [`$${Number(value).toFixed(2)}`, 'Balance']
               }}
            />
            <Area 
               type="monotone" 
               dataKey="balance" 
               stroke={totalReturn >= 0 ? "#22c55e" : "#ef4444"} 
               strokeWidth={2}
               fillOpacity={1} 
               fill={totalReturn >= 0 ? "url(#colorBalance)" : "url(#colorBalanceNeg)"} 
               animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
