import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { tradeService } from "../lib/tradeService";
import { Trade } from "../types/trade";
import { PlusCircle, Calendar, Clock } from "lucide-react";
import { autoCalculatePnL } from "../lib/mt5Calculation";

export function NewTrade() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [pair, setPair] = useState("");
  const [marketType, setMarketType] = useState<"Forex" | "Stock" | "Crypto">("Forex");
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
  const [closePrice, setClosePrice] = useState("");
  const [pnlAmount, setPnlAmount] = useState("");
  const [volume, setVolume] = useState("");
  const [ticket, setTicket] = useState("");
  const [closeReason, setCloseReason] = useState<"TP" | "SL" | "NEWS" | "MANUAL" | "">("");
  const [imageBase64, setImageBase64] = useState<string>("");

  useEffect(() => {
    if (user) {
      tradeService.getTrades(user.uid).then(setTrades);
    }
  }, [user]);

  const uniqueStrategies = useMemo(() => {
    const strats = trades.map(t => t.strategy).filter(Boolean) as string[];
    return Array.from(new Set(strats));
  }, [trades]);

  const uniquePairs = useMemo(() => {
    const p = trades.map(t => t.pair).filter(Boolean) as string[];
    return Array.from(new Set(p));
  }, [trades]);

  const autoCalcPnl = useMemo(() => {
    const ePrice = entryPrice !== "" ? parseFloat(entryPrice) : undefined;
    const tpPrice = takeProfit !== "" ? parseFloat(takeProfit) : undefined;
    const slPrice = stopLoss !== "" ? parseFloat(stopLoss) : undefined;
    const vol = volume !== "" ? parseFloat(volume) : undefined;
    
    if (ePrice !== undefined && vol !== undefined) {
      if (outcome === "WIN" && tpPrice !== undefined) {
        return autoCalculatePnL(pair, ePrice, tpPrice, vol, position as "Long"|"Short", marketType);
      } else if (outcome === "LOSE" && slPrice !== undefined) {
        return autoCalculatePnL(pair, ePrice, slPrice, vol, position as "Long"|"Short", marketType);
      } else if (outcome === "BREAKEVEN") {
        return 0;
      }
    }
    return undefined;
  }, [entryPrice, takeProfit, stopLoss, volume, outcome, position, pair, marketType]);

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
          const maxDim = 1000;

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
        calcPnlAmount = autoCalculatePnL(pair, ePrice, tpPrice, vol, position as "Long"|"Short", marketType);
      } else if (outcome === "LOSE" && slPrice !== undefined) {
        calcPnlAmount = autoCalculatePnL(pair, ePrice, slPrice, vol, position as "Long"|"Short", marketType);
      } else if (outcome === "BREAKEVEN") {
        calcPnlAmount = 0;
      }

      if (calcPnlAmount !== undefined) {
        calcPnlPercentage = parseFloat(((calcPnlAmount / 1000) * 100).toFixed(2));
        calcPnlAmount = parseFloat(calcPnlAmount.toFixed(2));
      }
    }

    const finalPnlAmount = pnlAmount !== "" ? parseFloat(pnlAmount) : calcPnlAmount;

    let dateObj;
    try {
      dateObj = new Date(`${date}T${time}:00`);
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date(date);
      }
    } catch {
      dateObj = new Date();
    }

    const cpPrice = closePrice !== "" ? parseFloat(closePrice) : undefined;

    try {
      await tradeService.addTrade(user.uid, {
        pair: pair.toUpperCase(),
        marketType,
        outcome: outcome as "WIN" | "LOSE" | "BREAKEVEN",
        date: dateObj.toISOString(),
        position: position as "Long" | "Short",
        strategy,
        entryPrice: ePrice,
        takeProfit: tpPrice,
        stopLoss: slPrice,
        closePrice: cpPrice,
        volume: vol,
        isAutoCalculated: pnlAmount === "",
        pnlPercentage: calcPnlPercentage,
        pnlAmount: finalPnlAmount,
        imageUrl: imageBase64 || undefined,
        ticket: ticket || undefined,
        closeReason: closeReason || undefined,
      });
      // Redirect to Dashboard after saving
      navigate("/journal/dashboard");
    } catch (e) {
      console.error(e);
      alert("Failed to create trade. Sometimes this happens if an image is too large even after compression.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <header className="mb-8">
        <button
          onClick={() => navigate("/journal/dashboard")}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-white transition-colors border border-border hover:border-white/30 rounded-lg px-3 py-1.5"
        >
          ← Dashboard
        </button>
        <h1 className="text-3xl font-bold font-mono tracking-tight text-white flex items-center gap-3">
          <PlusCircle className="h-8 w-8 text-primary shrink-0" />
          <span>Log a New Trade</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Enter all relevant details for your new trade record.
        </p>
      </header>

      <Card className="bg-card/50 border-border/50 shadow-xl overflow-visible">
        <CardContent className="p-6 sm:p-8 grid gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_2fr] gap-6 relative z-50">
            <div className="space-y-2 flex flex-col relative z-50">
              <Label>Market Type</Label>
              <Select value={marketType} onValueChange={(v) => setMarketType(v as any)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Asset Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Forex">Forex (MT5)</SelectItem>
                  <SelectItem value="Stock">Equity / Stock</SelectItem>
                  <SelectItem value="Crypto">Crypto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 relative group">
              <Label htmlFor="pair">Trading Pair / Symbol</Label>
              <Input 
                 id="pair" 
                 autoComplete="off"
                 value={pair} 
                 onChange={(e) => setPair(e.target.value)} 
                 placeholder="e.g. BTC/USDT" 
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
            
            <div className="space-y-2 relative z-40">
              <Label htmlFor="strategy-input">Strategy Used</Label>
              <div className="relative group">
                <Input 
                  id="strategy-input" 
                  autoComplete="off"
                  value={strategy} 
                  onChange={(e) => setStrategy(e.target.value)} 
                  placeholder="e.g. Breakout Strategy" 
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-30">
             <div className="space-y-2">
               <Label>Date</Label>
               <div className="relative flex items-center">
                 <Calendar className="absolute left-3 text-muted-foreground w-4 h-4 pointer-events-none z-10" />
                 <Input 
                   id="date" 
                   type="date" 
                   value={date} 
                   onChange={(e) => setDate(e.target.value)} 
                   className="w-full pl-10 cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0" 
                 />
               </div>
             </div>
             <div className="space-y-2">
               <Label>Time</Label>
               <div className="relative flex items-center">
                 <Clock className="absolute left-3 text-muted-foreground w-4 h-4 pointer-events-none z-10" />
                 <Input 
                   id="time" 
                   type="time" 
                   value={time} 
                   onChange={(e) => setTime(e.target.value)} 
                   className="w-full pl-10 cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0" 
                 />
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-20">
            <div className="space-y-2 flex flex-col">
              <Label>Position Direction</Label>
              <Select value={position} onValueChange={(v) => setPosition(v as any)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Long">Long (Buy)</SelectItem>
                  <SelectItem value="Short">Short (Sell)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex flex-col">
              <Label>Trade Outcome</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as any)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WIN">Win</SelectItem>
                  <SelectItem value="LOSE">Lose</SelectItem>
                  <SelectItem value="BREAKEVEN">Break Even</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-border/50">
             <div className="space-y-2">
               <Label htmlFor="entryPrice">Entry Price</Label>
               <Input id="entryPrice" type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
             </div>
             <div className="space-y-2">
               <Label htmlFor="stopLoss">Stop Loss Price</Label>
               <Input id="stopLoss" type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
             </div>
             <div className="space-y-2">
               <Label htmlFor="takeProfit">Take Profit Price</Label>
               <Input id="takeProfit" type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-border/50">
             <div className="space-y-2 flex flex-col">
               <Label htmlFor="closeReason">Exit Reason (Optional)</Label>
               <Select value={closeReason} onValueChange={(v) => setCloseReason(v as any)}>
                 <SelectTrigger className="w-full"><SelectValue placeholder="How was this trade closed?" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="TP">🎯 TP — Take Profit hit</SelectItem>
                   <SelectItem value="SL">🛑 SL — Stop Loss hit</SelectItem>
                   <SelectItem value="NEWS">📰 News — Closed before news event</SelectItem>
                   <SelectItem value="MANUAL">✋ Manual — Closed manually</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label htmlFor="closePrice">Close Price (Optional)</Label>
               <Input id="closePrice" type="number" step="any" value={closePrice} onChange={(e) => setClosePrice(e.target.value)} placeholder="Actual exit price" />
             </div>
             <div className="space-y-2">
               <Label htmlFor="ticket">Ticket / Order ID (Optional)</Label>
               <Input id="ticket" type="text" value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="MT5 ticket number" />
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/50">
             <div className="space-y-2">
               <Label htmlFor="volume">{marketType === "Stock" ? "Volume (Shares)" : "Lot Size"}</Label>
               <Input id="volume" type="number" step="any" value={volume} onChange={(e) => setVolume(e.target.value)} />
             </div>
             <div className="space-y-2">
               <Label htmlFor="pnlAmount">Final PnL ($) (Optional)</Label>
               <Input id="pnlAmount" type="number" step="any" value={pnlAmount} onChange={(e) => setPnlAmount(e.target.value)} placeholder={autoCalcPnl !== undefined ? `Calculated: ${autoCalcPnl.toFixed(2)}` : "Auto-calculated if empty"} />
             </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-border/50">
             <Label htmlFor="image">Screenshot / Chart Image</Label>
             <Input id="image" type="file" accept="image/*" onChange={handleImageChange} />
             {imageBase64 && (
               <div className="mt-4 rounded-md overflow-hidden border border-border">
                 <img src={imageBase64} alt="Trade Preview" className="w-full object-cover" />
               </div>
             )}
          </div>

          <div className="pt-6 flex justify-end">
            <Button size="lg" className="w-full sm:w-auto font-mono text-lg" disabled={loading || !pair || !outcome || !position} onClick={handleCreate}>
              {loading ? "Saving..." : "Save Trade Record"}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
