import React from "react";
import { Trade } from "../../types/trade";
import { Card, CardContent } from "../ui/card";
import { format } from "date-fns";
import { ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "../ui/dialog";
import { getTradeOutcome, getTradePnl, getTradeSymbol, getTradeDisplayOutcome, getTradeDate } from "../../lib/tradeUtils";

interface Props {
  trades: Trade[];
  startBalance?: number;
  selectedChartId?: string | null;
  onOpenChart?: (id: string) => void;
  onCloseChart?: () => void;
  highlightedChartId?: string | null;
  onClearHighlight?: () => void;
}

export function ChartOverview({ trades, startBalance = 1000, selectedChartId, onOpenChart, onCloseChart, highlightedChartId, onClearHighlight }: Props) {
  if (trades.length === 0) {
    return <div className="text-center py-12 text-muted-foreground font-mono bg-card rounded-xl border border-border">No trades match your filters.</div>;
  }

  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      onMouseEnter={() => {
         if (onClearHighlight) onClearHighlight();
      }}
    >
      {trades.map((trade, i) => {
        const isHighlighted = highlightedChartId === trade.id;
        const outcomeRaw = getTradeOutcome(trade);
        const outcomeDisplay = getTradeDisplayOutcome(trade);
        const symbol = getTradeSymbol(trade);
        const pnlResult = getTradePnl(trade);
        const dateObjStr = getTradeDate(trade);
        let parsedDate = new Date();
        try { if (dateObjStr) parsedDate = new Date(dateObjStr); } catch(e) {}
        
        const screenshotUrl = trade.outcomeScreenshotUrl || trade.rrChartUrl || trade.imageUrl;

        const baseGlow = outcomeRaw === 'WIN' ? 'border-[#22c55e]/80 shadow-[0_0_20px_rgba(34,197,94,0.4),0_0_60px_rgba(34,197,94,0.15)]' :
            (outcomeRaw === 'LOSE' || outcomeRaw === 'LOSS') ? 'border-[#ef4444]/80 shadow-[0_0_20px_rgba(239,68,68,0.4),0_0_60px_rgba(239,68,68,0.15)]' :
            'border-[#f59e0b]/80 shadow-[0_0_20px_rgba(245,158,11,0.4),0_0_60px_rgba(245,158,11,0.15)]';
        
        const hoverGlow = outcomeRaw === 'WIN' ? 'hover:border-[#22c55e]/80 hover:shadow-[0_0_20px_rgba(34,197,94,0.4),0_0_60px_rgba(34,197,94,0.15)]' :
            (outcomeRaw === 'LOSE' || outcomeRaw === 'LOSS') ? 'hover:border-[#ef4444]/80 hover:shadow-[0_0_20px_rgba(239,68,68,0.4),0_0_60px_rgba(239,68,68,0.15)]' :
            'hover:border-[#f59e0b]/80 hover:shadow-[0_0_20px_rgba(245,158,11,0.4),0_0_60px_rgba(245,158,11,0.15)]';

        return (
        <Card key={trade.id} className={`bg-card overflow-hidden border-2 cursor-pointer group/card transition-all duration-75 ${
            isHighlighted ? baseGlow : `border-white/5 ${hoverGlow}`
          }`}>
          <Dialog 
            open={selectedChartId === trade.id} 
            onOpenChange={(open) => { 
                if (open && onOpenChart) onOpenChart(trade.id);
                else if (!open && onCloseChart) onCloseChart(); 
            }}
          >
             <DialogTrigger render={<button className="aspect-video w-full bg-black/40 flex items-center justify-center border-b border-border relative overflow-hidden cursor-pointer group hover:bg-black/50" />}>
                <div className="w-full h-full text-left" onClick={(e) => { 
                    e.preventDefault(); 
                    if (onOpenChart) onOpenChart(trade.id); 
                }}>
                   <div className="absolute top-2 left-2 flex gap-1 items-center z-10">
                     <span className="bg-black/80 text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/10">{i + 1}</span>
                     {symbol && (
                       <div className="bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-mono font-bold border border-white/10">
                         {symbol}
                       </div>
                     )}
                     {trade.source === 'bot' && (
                       <div className="bg-indigo-500/80 px-1.5 py-0.5 rounded text-[10px] text-white font-mono font-bold border border-indigo-500/30">
                         BOT
                       </div>
                     )}
                   </div>
                   {screenshotUrl ? (
                     <img src={screenshotUrl} alt={symbol} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                   ) : (
                     <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 h-full">
                       <ImageIcon size={32} />
                       <span className="text-xs font-mono">No Image</span>
                     </div>
                   )}
                </div>
             </DialogTrigger>
             <DialogContent className="w-[100vw] max-w-[100vw] sm:max-w-[100vw] h-[100vh] bg-black/95 border-border shadow-2xl border-none flex flex-col justify-center items-center p-0 m-0">
                <DialogTitle className="sr-only">View full image</DialogTitle>
                <div className="relative w-full h-full flex items-center justify-center p-4">
                  {screenshotUrl ? (
                     <img src={screenshotUrl} alt={symbol} className="w-full h-full object-contain" />
                  ) : (
                     <div className="flex w-full h-full mt-4 items-center justify-center text-muted-foreground bg-black rounded-md font-mono">No image available</div>
                  )}
                  <div className="absolute top-4 left-4 bg-black/80 px-3 py-1.5 rounded text-sm text-white font-mono font-bold border border-white/20 shadow-xl pointer-events-none">
                    {symbol}
                  </div>
                </div>
             </DialogContent>
          </Dialog>
          
          <CardContent className="p-4">
             <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      outcomeRaw === 'WIN' ? 'bg-[#22c55e] text-white' :
                      (outcomeRaw === 'LOSE' || outcomeRaw === 'LOSS') ? 'bg-[#ef4444] text-white' :
                      'bg-[#f59e0b] text-white'
                    }`}>
                      {outcomeDisplay === 'BREAKEVEN' ? 'B/E' : outcomeDisplay}
                  </span>
                  {(trade.pnlPercentage !== undefined || trade.pnlAmount !== undefined || trade.netPnl !== undefined || trade.grossPnl !== undefined) && (() => {
                     const dynPct = (trade.pnlAmount !== undefined || trade.netPnl !== undefined || trade.grossPnl !== undefined) ? ((pnlResult) / startBalance) * 100 : trade.pnlPercentage || 0;
                     return (
                       <span className={`text-sm font-mono font-bold leading-none translate-y-px ${dynPct > 0 ? "text-[#22c55e]" : dynPct < 0 ? "text-[#ef4444]" : "text-muted-foreground"}`}>
                         {dynPct > 0 ? '+' : ''}{dynPct.toFixed(2)}%
                       </span>
                     );
                  })()}
                </div>
                <span className="text-xs text-muted-foreground font-mono leading-none translate-y-px">{format(parsedDate, "MMM d, yyyy")}</span>
             </div>
             {(trade.strategyName || trade.strategy) && (
               <div className="inline-flex bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-mono border border-blue-500/30">
                 {trade.strategyName || trade.strategy}
               </div>
             )}
          </CardContent>
        </Card>
      );
      })}
    </div>
  );
}
