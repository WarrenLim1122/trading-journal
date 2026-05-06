import React, { useMemo, useState } from "react";
import { Trade } from "../../types/trade";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays, startOfYear, endOfYear, addYears, subYears, eachMonthOfInterval } from "date-fns";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CalendarDays, CalendarRange, Clock } from "lucide-react";
import { getTradeOutcome, getTradePnl, getTradeSymbol, getTradeDate } from "../../lib/tradeUtils";

interface Props {
  trades: Trade[];
  startBalance?: number;
  onTradeClick?: (trade: Trade) => void;
}

type ViewMode = 'Day' | 'Week' | 'Month' | 'Year';

export function CalendarView({ trades, startBalance = 1000, onTradeClick }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('Month');

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  }, [currentDate]);

  const daysInWeek = useMemo(() => {
    return eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) });
  }, [currentDate]);

  const monthsInYear = useMemo(() => {
    return eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
  }, [currentDate]);

  const startingDayIndex = getDay(startOfMonth(currentDate)); 

  const next = () => {
    if (viewMode === 'Month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'Week') setCurrentDate(addWeeks(currentDate, 1));
    else if (viewMode === 'Day') setCurrentDate(addDays(currentDate, 1));
    else if (viewMode === 'Year') setCurrentDate(addYears(currentDate, 1));
  };
  const prev = () => {
    if (viewMode === 'Month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'Week') setCurrentDate(subWeeks(currentDate, 1));
    else if (viewMode === 'Day') setCurrentDate(subDays(currentDate, 1));
    else if (viewMode === 'Year') setCurrentDate(subYears(currentDate, 1));
  };

  const getDayTrades = (day: Date) => trades.filter(t => {
    try {
      const tradeDateStr = getTradeDate(t);
      if (!tradeDateStr) return false;
      return format(new Date(tradeDateStr), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
    } catch(e) { return false; }
  });

  const renderTradeNode = (trade: Trade) => {
    const pnlResult = getTradePnl(trade);
    const dynPct = trade.pnlAmount !== undefined ? (trade.pnlAmount / startBalance) * 100 : trade.pnlPercentage;
    const isWin = getTradeOutcome(trade) === 'WIN';
    const isLose = getTradeOutcome(trade) === 'LOSE' || getTradeOutcome(trade) === 'LOSS';
    
    return (
      <div key={trade.id} onClick={() => onTradeClick && onTradeClick(trade)} className="flex items-center justify-between text-[10px] px-1.5 py-1 bg-black/20 hover:bg-black/40 transition-colors rounded border border-transparent hover:border-white/5 cursor-pointer">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1 h-3 rounded-full shrink-0 opacity-80 ${
            isWin ? 'bg-[#22c55e]' :
            isLose ? 'bg-[#ef4444]' :
            'bg-[#f59e0b]'
          }`} />
          <span className="font-mono font-semibold text-white/80 truncate uppercase tracking-tight">{getTradeSymbol(trade) || 'TRADE'}</span>
        </div>
        <span className={`font-mono font-bold shrink-0 ml-1 ${pnlResult > 0 ? 'text-[#22c55e]' : pnlResult < 0 ? 'text-[#ef4444]' : 'text-muted-foreground'}`}>
          {dynPct !== undefined ? `${dynPct > 0 ? '+' : ''}${dynPct.toFixed(2)}%` : (pnlResult > 0 ? `+$${pnlResult.toFixed(2)}` : pnlResult < 0 ? `-$${Math.abs(pnlResult).toFixed(2)}` : 'B/E')}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
         <h2 className="text-xl font-bold font-mono">
            {viewMode === 'Year' && format(currentDate, "yyyy")}
            {viewMode === 'Month' && format(currentDate, "MMMM yyyy")}
            {viewMode === 'Week' && `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`}
            {viewMode === 'Day' && format(currentDate, "EEEE, MMMM d, yyyy")}
         </h2>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
              {(['Day', 'Week', 'Month', 'Year'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors cursor-pointer ${viewMode === mode ? 'bg-primary text-black font-bold' : 'text-muted-foreground hover:text-white'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
               <Button variant="outline" size="icon" onClick={prev}><ChevronLeft size={16} /></Button>
               <Button variant="outline" size="icon" onClick={next}><ChevronRight size={16} /></Button>
            </div>
         </div>
      </div>
      
      {viewMode === 'Month' && (
        <div className="grid grid-cols-7 gap-px bg-border/50 border border-border/50 rounded-lg overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
             <div key={day} className="bg-muted/50 p-2 text-center text-xs font-mono text-muted-foreground uppercase">{day}</div>
          ))}
          {Array.from({ length: startingDayIndex }).map((_, i) => <div key={`empty-${i}`} className="bg-card min-h-[120px] p-2 opacity-30"></div>)}
          {daysInMonth.map((day, i) => {
            const dayTrades = getDayTrades(day);
            let pnlPct = 0;
            dayTrades.forEach(t => {
               const pnl = getTradePnl(t);
               if (t.pnlAmount !== undefined || pnl) {
                  pnlPct += ((pnl) / startBalance) * 100;
               } else if (t.pnlPercentage) {
                  pnlPct += t.pnlPercentage;
               }
            });
            return (
              <div key={i} className={`bg-card h-[160px] p-1 border-t border-r hover:bg-muted/10 transition-colors flex flex-col overflow-hidden`}>
                 <div className="flex justify-between items-center mb-1 shrink-0 px-1">
                   <div className="flex items-center gap-1">
                     {dayTrades.length > 0 && <span className={`px-1.5 py-0.5 rounded text-sm font-mono font-bold ${pnlPct > 0 ? 'bg-[#22c55e] text-white' : pnlPct < 0 ? 'bg-[#ef4444] text-white' : 'bg-[#f59e0b] text-white'}`}>{pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(2)}%</span>}
                   </div>
                   <span className="text-xs text-muted-foreground font-mono">{format(day, "d")}</span>
                 </div>
                 <div className="flex flex-col gap-0.5 overflow-y-auto flex-1 custom-scrollbar px-1 pb-1">
                   {dayTrades.map(renderTradeNode)}
                 </div>
              </div>
            )
          })}
          {Array.from({ length: (7 - ((startingDayIndex + daysInMonth.length) % 7)) % 7 }).map((_, i) => (
             <div key={`empty-end-${i}`} className="bg-card min-h-[120px] p-2 opacity-30 border-t border-border"></div>
          ))}
        </div>
      )}

      {viewMode === 'Week' && (
        <div className="grid grid-cols-7 gap-4">
          {daysInWeek.map((day, i) => {
            const dayTrades = getDayTrades(day);
            return (
              <div key={i} className="bg-card border border-border/50 rounded-lg p-2 min-h-[300px] flex flex-col">
                <div className="text-center font-mono font-bold mb-2 pb-2 border-b border-border/50">
                  <div className="text-muted-foreground text-xs">{format(day, 'EEE')}</div>
                  <div className="text-lg">{format(day, 'd')}</div>
                </div>
                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
                  {dayTrades.length > 0 ? dayTrades.map(renderTradeNode) : <div className="text-xs text-center text-muted-foreground mt-4">No trades</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === 'Day' && (
        <div className="bg-card border border-border/50 rounded-lg p-4 min-h-[300px]">
          <div className="max-w-2xl mx-auto space-y-2">
            {getDayTrades(currentDate).length > 0 ? getDayTrades(currentDate).map(t => (
               <div key={t.id} className="flex items-center justify-between p-3 bg-black/20 hover:bg-black/40 rounded-lg border border-white/5">
                 <div className="flex items-center gap-4">
                   <div className="flex flex-col">
                     <span className="font-mono font-bold text-lg">{t.pair}</span>
                     <span className="text-xs text-muted-foreground uppercase">{t.position}</span>
                   </div>
                 </div>
                 <div className="flex items-center gap-6">
                   <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      t.outcome === 'WIN' ? 'bg-[#22c55e] text-white' : t.outcome === 'LOSE' ? 'bg-[#ef4444] text-white' : 'bg-[#f59e0b] text-white'
                   }`}>
                     {t.outcome}
                   </span>
                   <span className={`font-mono font-bold text-lg ${
                      (t.pnlAmount !== undefined ? (t.pnlAmount / startBalance) * 100 : t.pnlPercentage || 0) > 0 ? 'text-[#22c55e]' : 
                      (t.pnlAmount !== undefined ? (t.pnlAmount / startBalance) * 100 : t.pnlPercentage || 0) < 0 ? 'text-[#ef4444]' : 'text-muted-foreground'
                   }`}>
                     {t.pnlAmount !== undefined || t.pnlPercentage !== undefined ? 
                      `${(t.pnlAmount !== undefined ? (t.pnlAmount / startBalance) * 100 : t.pnlPercentage || 0) > 0 ? '+' : ''}${(t.pnlAmount !== undefined ? (t.pnlAmount / startBalance) * 100 : t.pnlPercentage || 0).toFixed(2)}%` : '-'}
                   </span>
                 </div>
               </div>
            )) : <div className="text-center py-12 text-muted-foreground font-mono">No trades on this date.</div>}
          </div>
        </div>
      )}

      {viewMode === 'Year' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {monthsInYear.map((month, idx) => {
             const mDays = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
             const mStartIndex = getDay(startOfMonth(month));
             return (
               <div key={idx} className="bg-black/20 rounded-xl p-3 border border-white/5">
                 <div className="font-mono font-bold text-center mb-2">{format(month, 'MMMM')}</div>
                 <div className="grid grid-cols-7 gap-1">
                   {["S", "M", "T", "W", "T", "F", "S"].map((d, di) => <div key={di} className="text-[10px] text-center text-muted-foreground">{d}</div>)}
                   {Array.from({ length: mStartIndex }).map((_, i) => <div key={`yr-e-${i}`} />)}
                   {mDays.map((d, di) => {
                      const dTrades = getDayTrades(d);
                      let pnl = 0;
                      dTrades.forEach(t => pnl += (t.pnlAmount !== undefined ? (t.pnlAmount / startBalance) * 100 : t.pnlPercentage || 0));
                      const bg = dTrades.length === 0 ? 'bg-white/5' : (pnl > 0 ? 'bg-[#22c55e]' : pnl < 0 ? 'bg-[#ef4444]' : 'bg-[#f59e0b]');
                      return (
                        <div key={di} className={`aspect-square rounded-sm ${bg} flex items-center justify-center`} title={`${format(d, 'MMM d')}: ${dTrades.length} trades`}>
                          <span className="text-[8px] opacity-70">{format(d, 'd')}</span>
                        </div>
                      )
                   })}
                 </div>
               </div>
             )
          })}
        </div>
      )}
    </div>
  );
}
