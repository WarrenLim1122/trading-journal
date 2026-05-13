import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAuth } from "../../contexts/AuthContext";
import { tradeService } from "../../lib/tradeService";
import { Trade } from "../../types/trade";

interface EditTradeDialogProps {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTradeEdited: () => void;
  trades?: Trade[];
}

export function EditTradeDialog({ trade, open, onOpenChange, onTradeEdited, trades = [] }: EditTradeDialogProps) {
  const { user } = useAuth();
  const [pair, setPair] = useState("");
  const [outcome, setOutcome] = useState<"WIN" | "LOSE" | "LOSS" | "BREAKEVEN" | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [position, setPosition] = useState<"Long" | "Short" | "LONG" | "SHORT" | "">("");
  const [strategy, setStrategy] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [closePrice, setClosePrice] = useState("");
  const [pnlAmount, setPnlAmount] = useState("");
  const [volume, setVolume] = useState("");
  const [ticket, setTicket] = useState("");
  const [closeReason, setCloseReason] = useState<"TP" | "SL" | "NEWS" | "MANUAL" | "">("");
  const [loading, setLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>("");

  useEffect(() => {
    if (trade) {
      setPair(trade.pair || "");
      // Bot writes "LOSS"; UI canonical form is "LOSE" — normalize so the Select matches.
      const normalizedOutcome = trade.outcome === "LOSS" ? "LOSE" : (trade.outcome || "");
      setOutcome(normalizedOutcome as any);
      if (trade.date) {
        const d = new Date(trade.date);
        setDate(d.toLocaleDateString('en-CA')); // YYYY-MM-DD
        setTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
      } else {
        const now = new Date();
        setDate(now.toLocaleDateString('en-CA'));
        setTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      }
      setPosition(trade.position || "");
      setStrategy(trade.strategy || "");
      setEntryPrice(trade.entryPrice !== undefined ? String(trade.entryPrice) : "");
      setTakeProfit(trade.takeProfit !== undefined ? String(trade.takeProfit) : "");
      setStopLoss(trade.stopLoss !== undefined ? String(trade.stopLoss) : "");
      setClosePrice(
        trade.closePrice !== undefined ? String(trade.closePrice) :
        trade.exitPrice !== undefined ? String(trade.exitPrice) : ""
      );
      setPnlAmount(trade.pnlAmount !== undefined ? String(trade.pnlAmount) : "");
      setVolume(trade.volume !== undefined ? String(trade.volume) : "");
      setTicket(trade.ticket || "");
      setCloseReason(
        (trade.closeReason === "TP" || trade.closeReason === "SL" ||
         trade.closeReason === "NEWS" || trade.closeReason === "MANUAL")
          ? trade.closeReason : ""
      );
      setImageBase64(trade.imageUrl || "");
    }
  }, [trade]);

  const uniqueStrategies = useMemo(() => {
    const strats = trades.map(t => t.strategy).filter(Boolean) as string[];
    return Array.from(new Set(strats));
  }, [trades]);

  const uniquePairs = useMemo(() => {
    const p = trades.map(t => t.pair).filter(Boolean) as string[];
    return Array.from(new Set(p));
  }, [trades]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 2048;

          if (width > height && width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          } else if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/webp", 0.9);
            setImageBase64(dataUrl);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async () => {
    if (!user || !trade || !pair || !outcome || !date || !time || !position) return;
    setLoading(true);

    let calcPnlAmount = undefined;
    let calcPnlPercentage = undefined;

    const ePrice = entryPrice !== "" ? parseFloat(entryPrice) : undefined;
    const tpPrice = takeProfit !== "" ? parseFloat(takeProfit) : undefined;
    const slPrice = stopLoss !== "" ? parseFloat(stopLoss) : undefined;
    const vol = volume !== "" ? parseFloat(volume) : undefined;

    if (ePrice !== undefined && vol !== undefined) {
      if (outcome === "WIN" && tpPrice !== undefined) {
        calcPnlAmount = position === "Long" ? (tpPrice - ePrice) * vol : (ePrice - tpPrice) * vol;
      } else if ((outcome === "LOSE" || outcome === "LOSS") && slPrice !== undefined) {
        calcPnlAmount = position === "Long" ? (slPrice - ePrice) * vol : (ePrice - slPrice) * vol;
      } else if (outcome === "BREAKEVEN") {
        calcPnlAmount = 0;
      }

      if (calcPnlAmount !== undefined) {
        calcPnlPercentage = parseFloat(((calcPnlAmount / 1000) * 100).toFixed(2));
        calcPnlAmount = parseFloat(calcPnlAmount.toFixed(2));
      }
    }

    const finalPnlAmount = pnlAmount !== "" ? parseFloat(pnlAmount) : calcPnlAmount;

    // Attempt to parse exactly using local timezone
    let dateObj;
    try {
      dateObj = new Date(`${date}T${time}:00`);
      // Fallback if Invalid Date
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date(date);
      }
    } catch {
      dateObj = new Date();
    }

    const cpPrice = closePrice !== "" ? parseFloat(closePrice) : undefined;

    try {
      await tradeService.updateTrade(user.uid, trade.id, {
        pair: pair.toUpperCase(),
        outcome: outcome as "WIN" | "LOSE" | "BREAKEVEN",
        date: dateObj.toISOString(),
        position: position as "Long" | "Short",
        strategy,
        entryPrice: ePrice,
        takeProfit: tpPrice,
        stopLoss: slPrice,
        closePrice: cpPrice,
        volume: vol,
        pnlPercentage: calcPnlPercentage,
        pnlAmount: finalPnlAmount,
        imageUrl: imageBase64 || undefined,
        ticket: ticket || undefined,
        closeReason: closeReason || undefined,
      });
      onOpenChange(false);
      onTradeEdited();
    } catch (e) {
      console.error(e);
      // Surface the real Firestore error so we can debug permission/validation issues.
      let detail = "";
      try {
        const parsed = JSON.parse(e instanceof Error ? e.message : String(e));
        detail = parsed?.error || String(e);
      } catch {
        detail = e instanceof Error ? e.message : String(e);
      }
      alert(`Failed to update trade:\n\n${detail}\n\nOpen browser DevTools → Console for full details.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Trade</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-4 items-center gap-4 relative z-50">
            <Label htmlFor="pair-edit" className="text-right">Pair</Label>
            <div className="col-span-3 relative group">
              <Input 
                 id="pair-edit" 
                 value={pair} 
                 onChange={(e) => setPair(e.target.value)} 
                 placeholder="BTC/USDT" 
                 onFocus={() => setTimeout(() => document.getElementById('pair-dropdown-edit')?.classList.remove('hidden'), 100)}
                 onBlur={() => setTimeout(() => document.getElementById('pair-dropdown-edit')?.classList.add('hidden'), 200)}
              />
              <div id="pair-dropdown-edit" className="hidden absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto no-scrollbar z-50">
                {uniquePairs.map((p, i) => (
                  <div 
                    key={i} 
                    className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setPair(p);
                        setTimeout(() => document.getElementById('pair-dropdown-edit')?.classList.add('hidden'), 50);
                    }}
                  >
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4 relative z-40">
             <Label htmlFor="date-edit" className="text-right whitespace-nowrap">Date & Time</Label>
             <div className="col-span-3 grid grid-cols-[1.3fr_1fr] gap-2">
               <Input id="date-edit" type="date" title="Empty date defaults to today" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-w-0 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:scale-[1.5] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer cursor-pointer pr-4" />
               <Input id="time-edit" type="time" title="Empty time defaults to now" value={time} onChange={(e) => setTime(e.target.value)} className="w-full min-w-0 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:scale-[1.5] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer cursor-pointer pr-4" />
             </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Outcome</Label>
            <div className="col-span-3">
              <Select value={outcome} onValueChange={(v) => setOutcome(v as any)}>
                <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WIN">Win</SelectItem>
                  <SelectItem value="LOSE">Lose</SelectItem>
                  <SelectItem value="BREAKEVEN">Break Even</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Position</Label>
            <div className="col-span-3">
              <Select value={position} onValueChange={(v) => setPosition(v as any)}>
                <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Long">Long</SelectItem>
                  <SelectItem value="Short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4 relative z-30">
            <Label htmlFor="strategy-input-edit" className="text-right">Strategy</Label>
            <div className="col-span-3 relative group">
              <Input 
                id="strategy-input-edit" 
                value={strategy} 
                onChange={(e) => setStrategy(e.target.value)} 
                placeholder="Strategy #1" 
                onFocus={() => setTimeout(() => document.getElementById('strategy-dropdown-edit')?.classList.remove('hidden'), 100)}
                onBlur={() => setTimeout(() => document.getElementById('strategy-dropdown-edit')?.classList.add('hidden'), 200)}
              />
              <div id="strategy-dropdown-edit" className="hidden absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto no-scrollbar z-50">
                {uniqueStrategies.map((strat, i) => (
                  <div 
                    key={i} 
                    className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setStrategy(strat);
                        setTimeout(() => document.getElementById('strategy-dropdown-edit')?.classList.add('hidden'), 50);
                    }}
                  >
                    {strat}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="volume-edit" className="text-right">Volume</Label>
             <Input id="volume-edit" type="number" step="any" value={volume} onChange={(e) => setVolume(e.target.value)} className="col-span-3" placeholder="Lot size (e.g. 1.0)" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="entryPrice-edit" className="text-right">Entry Price</Label>
             <Input id="entryPrice-edit" type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className="col-span-3" placeholder="59000" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="stopLoss-edit" className="text-right">SL Price</Label>
             <Input id="stopLoss-edit" type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="col-span-3" placeholder="58000" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="takeProfit-edit" className="text-right">TP Price</Label>
             <Input id="takeProfit-edit" type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className="col-span-3" placeholder="60000" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="closePrice-edit" className="text-right">Close Price</Label>
             <Input id="closePrice-edit" type="number" step="any" value={closePrice} onChange={(e) => setClosePrice(e.target.value)} className="col-span-3" placeholder="Actual exit price" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Exit Reason</Label>
            <div className="col-span-3">
              <Select value={closeReason} onValueChange={(v) => setCloseReason(v as any)}>
                <SelectTrigger><SelectValue placeholder="How was this trade closed?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TP">🎯 TP — Take Profit hit</SelectItem>
                  <SelectItem value="SL">🛑 SL — Stop Loss hit</SelectItem>
                  <SelectItem value="NEWS">📰 News — Closed before news event</SelectItem>
                  <SelectItem value="MANUAL">✋ Manual — Closed manually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="ticket-edit" className="text-right">Ticket</Label>
             <Input id="ticket-edit" type="text" value={ticket} onChange={(e) => setTicket(e.target.value)} className="col-span-3" placeholder="MT5 ticket number" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="pnlAmount-edit" className="text-right">PnL ($)</Label>
             <Input id="pnlAmount-edit" type="number" step="any" value={pnlAmount} onChange={(e) => setPnlAmount(e.target.value)} className="col-span-3" placeholder="129" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="image-edit" className="text-right">Screenshot</Label>
             <Input id="image-edit" type="file" accept="image/*" onChange={handleImageChange} className="col-span-3" />
             {imageBase64 && <div className="col-span-4 mt-2"><img src={imageBase64} className="w-full rounded-md border border-border" /></div>}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={loading || !pair || !outcome || !position} onClick={handleUpdate}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
