import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { cn } from "../../lib/utils";
import { Trade } from "../../types/trade";
import { getTradeSymbol, getTradeDirection, getTradeOutcome, getTradeDisplayOutcome, getTradePnl, getTradeClosePrice, getTradeDate } from "../../lib/tradeUtils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Box, Activity, DollarSign, Image as ImageIcon, Expand } from "lucide-react";
import { Tag as TagIcon } from "lucide-react";

interface TradeDetailDialogProps {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TradeDetailDialog({ trade, open, onOpenChange }: TradeDetailDialogProps) {
  const [imageExpanded, setImageExpanded] = useState(false);

  if (!trade) return null;

  const symbol = getTradeSymbol(trade);
  const direction = getTradeDirection(trade);
  const outcomeRaw = getTradeOutcome(trade);
  const outcomeDisplay = getTradeDisplayOutcome(trade);
  const pnlResult = getTradePnl(trade);
  const closePrice = getTradeClosePrice(trade);
  const dateStr = getTradeDate(trade);
  let parsedDate = new Date();
  try {
    if (dateStr) parsedDate = new Date(dateStr);
  } catch(e) {}

  const isWin = outcomeRaw === "WIN";
  const isLoss = outcomeRaw === "LOSE" || outcomeRaw === "LOSS";

  const outcomeColor = isWin ? "text-green-500 bg-green-500/10 border-green-500/20" :
                       isLoss ? "text-red-500 bg-red-500/10 border-red-500/20" :
                       "text-amber-500 bg-amber-500/10 border-amber-500/20";

  const dirColor = direction === "LONG" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" :
                   direction === "SHORT" ? "text-purple-400 bg-purple-400/10 border-purple-400/20" :
                   "bg-muted/20 text-muted-foreground border-white/5";

  const screenshotUrl = trade.outcomeScreenshotUrl || trade.rrChartUrl || trade.imageUrl;

  return (
    <>
      {/* Fullscreen image overlay */}
      {imageExpanded && screenshotUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center cursor-zoom-out"
          onClick={() => setImageExpanded(false)}
        >
          <img
            src={screenshotUrl}
            alt="Trade Chart Fullscreen"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
          />
          <div className="absolute top-4 right-4 text-white/60 text-xs font-mono bg-black/60 px-3 py-1.5 rounded-full">
            Click anywhere to close
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* sm:max-w-[90vw] explicitly overrides the base DialogContent sm:max-w-sm constraint */}
        <DialogContent className="sm:max-w-[90vw] w-[90vw] max-w-[90vw] bg-background border-border/50 text-foreground p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <DialogHeader className="px-6 py-4 shrink-0 border-b border-border/50 bg-muted/20">
            <div className="flex flex-col gap-2 pr-10">
              {/* Row 1: Symbol | Net PNL   badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <DialogTitle className="text-2xl font-mono tracking-tight font-bold">
                  {symbol}
                </DialogTitle>
                {/* Pipe divider */}
                <div className="w-px h-7 bg-white/25 shrink-0" />
                {/* Net PNL inline */}
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground leading-none mb-0.5">Net PNL</span>
                  <span className={cn("text-xl font-mono font-bold tracking-tight leading-none", pnlResult > 0 ? "text-green-500" : pnlResult < 0 ? "text-red-500" : "text-amber-500")}>
                    {pnlResult > 0 ? "+" : ""}{trade.accountCurrency === "USD" ? "$" : ""}{pnlResult?.toFixed(2)}{trade.accountCurrency && trade.accountCurrency !== "USD" ? ` ${trade.accountCurrency}` : ""}
                  </span>
                </div>
                {/* Pipe divider before badges */}
                <div className="w-px h-7 bg-white/25 shrink-0" />
                <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold uppercase", dirColor)}>
                  {direction}
                </div>
                <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold uppercase", outcomeColor)}>
                  {outcomeDisplay}
                </div>
              </div>
              {/* Row 2: date, bot, account */}
              <div className="flex items-center gap-2 flex-wrap text-xs font-mono text-muted-foreground">
                <div className="flex items-center gap-1.5 border border-white/10 px-2 py-0.5 rounded-md bg-black/20">
                  <CalendarIcon className="w-3 h-3" />
                  {format(parsedDate, "MMM d, yyyy • h:mm a")}
                </div>
                {trade.source === "bot" && (
                  <div className="flex items-center gap-1.5 border border-white/10 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400">
                    <Activity className="w-3 h-3" />
                    BOT: {trade.botName || "Unknown"}
                  </div>
                )}
                {trade.accountType && (
                  <div className="flex items-center gap-1.5 border border-white/10 px-2 py-0.5 rounded-md bg-zinc-800">
                    <Box className="w-3 h-3" />
                    {trade.accountType.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Body: stats LEFT (35%), chart RIGHT (65%) */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

            {/* Left: Stats panel — scrollable */}
            <div className="md:w-[35%] overflow-y-auto custom-scrollbar p-5 space-y-5 border-b md:border-b-0 md:border-r border-border/50 shrink-0">

              {/* Execution Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-mono uppercase text-muted-foreground border-b border-border/50 pb-2 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" /> Execution Details
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground tracking-wide">Entry</span>
                    <span className="font-mono text-base font-semibold">{trade.entryPrice || "-"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground tracking-wide">Exit</span>
                    <span className="font-mono text-base font-semibold">{closePrice || "-"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground tracking-wide">Volume</span>
                    <span className="font-mono text-base font-semibold">{trade.volume || "-"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground tracking-wide">Close Reason</span>
                    <span className="font-mono text-base font-semibold">{trade.closeReason || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-border/50" />

              {/* Risk & Reward */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-mono uppercase text-muted-foreground border-b border-border/50 pb-2 flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5" /> Risk / Reward
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-red-400 tracking-wide">Stop Loss</span>
                    <span className="font-mono text-base font-semibold">{trade.stopLoss || "-"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-green-400 tracking-wide">Take Profit</span>
                    <span className="font-mono text-base font-semibold">{trade.takeProfit || "-"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground tracking-wide">Gross PnL</span>
                    <span className="font-mono text-base font-semibold">{trade.grossPnl !== undefined ? trade.grossPnl : "-"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground tracking-wide">Est. RR</span>
                    <span className="font-mono text-base font-semibold">{trade.rrRatio ? `1:${trade.rrRatio}` : "-"}</span>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-border/50" />

              {/* Classification */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-mono uppercase text-muted-foreground border-b border-border/50 pb-2 flex items-center gap-2">
                  <TagIcon className="w-3.5 h-3.5" /> Classification
                </h4>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase text-muted-foreground tracking-wide">Strategy</span>
                    <span className="font-mono text-base text-foreground">{trade.strategyName || trade.strategy || "None"}</span>
                  </div>
                  {trade.tags && trade.tags.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs uppercase text-muted-foreground tracking-wide">Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {trade.tags.map(t => (
                          <span key={t} className="text-xs bg-muted/40 px-2 py-0.5 rounded text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {trade.notes && (
                <>
                  <div className="h-px w-full bg-border/50" />
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold font-mono uppercase text-muted-foreground">Notes</h4>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{trade.notes}</p>
                  </div>
                </>
              )}
            </div>

            {/* Right: Chart — takes remaining 65% */}
            <div className="flex-1 flex flex-col bg-zinc-950 min-h-[300px] md:min-h-0">
              {screenshotUrl ? (
                <div
                  className="relative flex-1 flex items-center justify-center p-4 group cursor-zoom-in"
                  onClick={() => setImageExpanded(true)}
                  title="Click to expand"
                >
                  <img
                    src={screenshotUrl}
                    alt="Trade Chart"
                    className="max-w-full max-h-full object-contain rounded-md transition-opacity group-hover:opacity-90"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-md">
                    <div className="bg-black/70 text-white text-xs font-mono px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Expand size={12} /> Expand
                    </div>
                  </div>
                  {trade.outcomeScreenshotSource && (
                    <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono px-2 py-1 rounded text-white/70">
                      Source: {trade.outcomeScreenshotSource}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <ImageIcon className="w-16 h-16 opacity-20" />
                  <p className="font-mono text-sm opacity-50">No screenshot attached.</p>
                </div>
              )}
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
