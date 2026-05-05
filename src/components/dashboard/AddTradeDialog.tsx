import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAuth } from "../../contexts/AuthContext";
import { tradeService } from "../../lib/tradeService";
import { Plus } from "lucide-react";
import { Trade } from "../../types/trade";

interface AddTradeDialogProps {
  onTradeAdded: () => void;
  trades?: Trade[];
}

export function AddTradeDialog({ onTradeAdded, trades = [] }: AddTradeDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pair, setPair] = useState("");
  const [outcome, setOutcome] = useState<"WIN" | "LOSE" | "BREAKEVEN" | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [position, setPosition] = useState<"Long" | "Short" | "">("");
  const [strategy, setStrategy] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [pnlAmount, setPnlAmount] = useState("");
  const [volume, setVolume] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>("");

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

  const handleCreate = async () => {
    if (!user || !pair || !outcome || !date || !time || !position) return;
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
      } else if (outcome === "LOSE" && slPrice !== undefined) {
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

    try {
      await tradeService.addTrade(user.uid, {
        pair: pair.toUpperCase(),
        outcome: outcome as "WIN" | "LOSE" | "BREAKEVEN",
        date: dateObj.toISOString(),
        position: position as "Long" | "Short",
        strategy,
        entryPrice: ePrice,
        takeProfit: tpPrice,
        stopLoss: slPrice,
        volume: vol,
        pnlPercentage: calcPnlPercentage,
        pnlAmount: finalPnlAmount,
        imageUrl: imageBase64 || undefined,
      });
      setOpen(false);
      onTradeAdded();
      
      // Reset form
      setPair("");
      setOutcome("");
      setPosition("");
      setStrategy("");
      setEntryPrice("");
      setTakeProfit("");
      setStopLoss("");
      setPnlAmount("");
      setVolume("");
      setImageBase64("");

    } catch (e) {
      console.error(e);
      alert("Failed to create trade. Sometimes this happens if an image is too large even after compression.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
          <Plus size={16} /> New Trade
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Trade</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-4 items-center gap-4 relative z-50">
            <Label htmlFor="pair" className="text-right">Pair</Label>
            <div className="col-span-3 relative group">
              <Input 
                 id="pair" 
                 value={pair} 
                 onChange={(e) => setPair(e.target.value)} 
                 placeholder="BTC/USDT" 
                 onFocus={() => setTimeout(() => document.getElementById('pair-dropdown')?.classList.remove('hidden'), 100)}
                 onBlur={() => setTimeout(() => document.getElementById('pair-dropdown')?.classList.add('hidden'), 200)}
              />
              <div id="pair-dropdown" className="hidden absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto no-scrollbar z-50">
                {uniquePairs.map((p, i) => (
                  <div 
                    key={i} 
                    className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setPair(p);
                        setTimeout(() => document.getElementById('pair-dropdown')?.classList.add('hidden'), 50);
                    }}
                  >
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4 relative z-40">
             <Label htmlFor="date" className="text-right whitespace-nowrap">Date & Time</Label>
             <div className="col-span-3 grid grid-cols-[1.3fr_1fr] gap-2">
               <Input id="date" type="date" title="Empty date defaults to today" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-w-0 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:scale-[1.5] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer cursor-pointer pr-4" />
               <Input id="time" type="time" title="Empty time defaults to now" value={time} onChange={(e) => setTime(e.target.value)} className="w-full min-w-0 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:scale-[1.5] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer cursor-pointer pr-4" />
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
            <Label htmlFor="strategy-input" className="text-right">Strategy</Label>
            <div className="col-span-3 relative group">
              <Input 
                id="strategy-input" 
                value={strategy} 
                onChange={(e) => setStrategy(e.target.value)} 
                placeholder="Strategy #1" 
                onFocus={() => setTimeout(() => document.getElementById('strategy-dropdown')?.classList.remove('hidden'), 100)}
                onBlur={() => setTimeout(() => document.getElementById('strategy-dropdown')?.classList.add('hidden'), 200)}
              />
              <div id="strategy-dropdown" className="hidden absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto no-scrollbar z-50">
                {uniqueStrategies.map((strat, i) => (
                  <div 
                    key={i} 
                    className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setStrategy(strat);
                        setTimeout(() => document.getElementById('strategy-dropdown')?.classList.add('hidden'), 50);
                    }}
                  >
                    {strat}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="volume" className="text-right">Volume</Label>
             <Input id="volume" type="number" step="any" value={volume} onChange={(e) => setVolume(e.target.value)} className="col-span-3" placeholder="Lot size (e.g. 1.0)" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="entryPrice" className="text-right">Entry Price</Label>
             <Input id="entryPrice" type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className="col-span-3" placeholder="59000" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="stopLoss" className="text-right">SL Price</Label>
             <Input id="stopLoss" type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="col-span-3" placeholder="58000" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="takeProfit" className="text-right">TP Price</Label>
             <Input id="takeProfit" type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className="col-span-3" placeholder="60000" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="pnlAmount" className="text-right">PnL ($)</Label>
             <Input id="pnlAmount" type="number" step="any" value={pnlAmount} onChange={(e) => setPnlAmount(e.target.value)} className="col-span-3" placeholder="129" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="image" className="text-right">Screenshot</Label>
             <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="col-span-3" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button disabled={loading || !pair || !outcome || !position} onClick={handleCreate}>
            {loading ? "Saving..." : "Save Trade"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
