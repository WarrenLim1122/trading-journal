import React, { useState, useEffect } from "react";
import { Input } from "@journal/components/ui/input";
import { Label } from "@journal/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@journal/components/ui/select";
import { Card, CardContent } from "@journal/components/ui/card";
import { Info, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@journal/components/ui/button";

interface Preset {
  name: string;
  contractSize: number;
  minLot: number;
  lotStep: number;
}

const PRESETS: Record<string, Preset> = {
  forex: { name: "Forex Major (100k)", contractSize: 100000, minLot: 0.01, lotStep: 0.01 },
  gold: { name: "XAUUSD Gold", contractSize: 100, minLot: 0.01, lotStep: 0.01 },
  silver: { name: "XAGUSD Silver", contractSize: 5000, minLot: 0.01, lotStep: 0.01 },
  crypto: { name: "Crypto CFD", contractSize: 1, minLot: 0.01, lotStep: 0.01 },
  custom: { name: "Custom", contractSize: 1, minLot: 0.01, lotStep: 0.01 },
};

export function RiskCalculator() {
  const [activeTab, setActiveTab] = useState<"calculator" | "guide">("calculator");

  // Account
  const [accountEquity, setAccountEquity] = useState<string>("10000");
  const [riskMode, setRiskMode] = useState<"percent" | "fixed">("percent");
  const [riskValue, setRiskValue] = useState<string>("1");

  // Trade Setup
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");

  // Instrument
  const [presetKey, setPresetKey] = useState<string>("forex");
  const [contractSize, setContractSize] = useState<string>("100000");
  const [minLot, setMinLot] = useState<string>("0.01");
  const [lotStep, setLotStep] = useState<string>("0.01");

  const [warnings, setWarnings] = useState<string[]>([]);
  const [results, setResults] = useState<{
    riskAmount: number;
    slDistance: number;
    rawLot: number;
    roundedLot: number;
    actualRisk: number;
    actualRiskPercent: number;
    tpDistance: number | null;
    reward: number | null;
    rr: number | null;
  } | null>(null);

  useEffect(() => {
    if (presetKey !== "custom") {
      const preset = PRESETS[presetKey];
      setContractSize(preset.contractSize.toString());
      setMinLot(preset.minLot.toString());
      setLotStep(preset.lotStep.toString());
    }
  }, [presetKey]);

  useEffect(() => {
    calculate();
  }, [accountEquity, riskMode, riskValue, direction, entryPrice, stopLoss, takeProfit, contractSize, minLot, lotStep]);

  const calculate = () => {
    const newWarnings: string[] = [];
    setWarnings([]);
    setResults(null);

    const equity = parseFloat(accountEquity);
    const rv = parseFloat(riskValue);
    const ep = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = takeProfit ? parseFloat(takeProfit) : null;
    const cSize = parseFloat(contractSize);
    const ml = parseFloat(minLot);
    const ls = parseFloat(lotStep);

    if (isNaN(equity) || equity <= 0) newWarnings.push("Account equity must be > 0.");
    if (isNaN(rv) || rv <= 0) newWarnings.push("Risk value must be > 0.");
    if (isNaN(cSize) || cSize <= 0) newWarnings.push("Contract size must be > 0.");
    if (isNaN(ml) || ml <= 0) newWarnings.push("Minimum lot must be > 0.");
    if (isNaN(ls) || ls <= 0) newWarnings.push("Lot step must be > 0.");

    if (isNaN(ep) || isNaN(sl)) {
      setWarnings(newWarnings);
      return;
    }

    if (ep === sl) {
      newWarnings.push("Stop Loss cannot equal Entry Price.");
    }

    if (direction === "long") {
      if (sl > ep) newWarnings.push("For Long trades, Stop Loss should ideally be below Entry Price.");
      if (tp !== null && tp < ep) newWarnings.push("For Long trades, Take Profit should be above Entry Price.");
    } else {
      if (sl < ep) newWarnings.push("For Short trades, Stop Loss should ideally be above Entry Price.");
      if (tp !== null && tp > ep) newWarnings.push("For Short trades, Take Profit should be below Entry Price.");
    }

    if (newWarnings.length > 0 && (ep === sl)) {
       setWarnings(newWarnings);
       return;
    }

    let intendedRiskAmount = 0;
    if (riskMode === "percent") {
      intendedRiskAmount = equity * (rv / 100);
    } else {
      intendedRiskAmount = rv;
      if (intendedRiskAmount > equity) {
        newWarnings.push("Risk amount is greater than account equity!");
      }
    }

    const slDistance = Math.abs(ep - sl);
    if (slDistance === 0) return;

    const rawLot = intendedRiskAmount / (slDistance * cSize);

    const invLs = 1 / ls;
    let roundedLot = Math.floor(rawLot * invLs) / invLs;

    if (roundedLot < ml) {
      newWarnings.push(`Calculated lot size (${rawLot.toFixed(4)}) is below minimum lot size (${ml}). Using min lot.`);
      roundedLot = ml;
    }

    const actualRisk = roundedLot * slDistance * cSize;
    const actualRiskPercent = (actualRisk / equity) * 100;

    let tpDistance: number | null = null;
    let reward: number | null = null;
    let rr: number | null = null;

    if (tp !== null && !isNaN(tp)) {
      tpDistance = Math.abs(tp - ep);
      reward = roundedLot * tpDistance * cSize;
      if (actualRisk > 0) {
        rr = reward / actualRisk;
      }
    }

    setWarnings(newWarnings);
    setResults({
      riskAmount: intendedRiskAmount,
      slDistance,
      rawLot,
      roundedLot,
      actualRisk,
      actualRiskPercent,
      tpDistance,
      reward,
      rr,
    });
  };

  const handleCustomInstrumentChange = () => {
    setPresetKey("custom");
  };

  return (
    <div className="mx-auto max-w-7xl relative pb-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
          <RefreshCw className="h-6 w-6 text-primary" />
          Risk Calculator
        </h1>
        <p className="text-muted-foreground mt-2">
          Calculate position size, true risk, and reward before entering a trade.
        </p>
      </header>

      <div className="flex gap-4 mb-6">
        <Button
          variant={activeTab === "calculator" ? "default" : "outline"}
          onClick={() => setActiveTab("calculator")}
          className="font-mono"
        >
          Calculator
        </Button>
        <Button
          variant={activeTab === "guide" ? "default" : "outline"}
          onClick={() => setActiveTab("guide")}
          className="font-mono"
        >
          Formula Guide
        </Button>
      </div>

      {activeTab === "calculator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold font-mono text-white mb-4 flex items-center gap-2">
                  <span className="bg-primary/20 text-primary p-1 rounded">1</span>
                  Account Settings
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Equity ($)</Label>
                    <Input type="number" value={accountEquity} onChange={(e) => setAccountEquity(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Risk Mode</Label>
                      <Select value={riskMode} onValueChange={(val: any) => setRiskMode(val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Risk (%)</SelectItem>
                          <SelectItem value="fixed">Fixed ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input type="number" value={riskValue} onChange={(e) => setRiskValue(e.target.value)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
               <CardContent className="p-6">
                  <h2 className="text-lg font-bold font-mono text-white mb-4 flex items-center gap-2">
                    <span className="bg-primary/20 text-primary p-1 rounded">2</span>
                    Instrument Configuration
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label>Preset</Label>
                      <Select value={presetKey} onValueChange={setPresetKey}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRESETS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Contract Size</Label>
                      <Input type="number" value={contractSize} onChange={(e) => { setContractSize(e.target.value); handleCustomInstrumentChange(); }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Lot</Label>
                      <Input type="number" value={minLot} onChange={(e) => { setMinLot(e.target.value); handleCustomInstrumentChange(); }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Lot Step</Label>
                      <Input type="number" value={lotStep} onChange={(e) => { setLotStep(e.target.value); handleCustomInstrumentChange(); }} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 italic flex items-center gap-1">
                    <Info size={14} /> Contract size and tick value vary by broker. Check your specification.
                  </p>
               </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
               <CardContent className="p-6">
                  <h2 className="text-lg font-bold font-mono text-white mb-4 flex items-center gap-2">
                    <span className="bg-primary/20 text-primary p-1 rounded">3</span>
                    Trade Setup
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label>Direction</Label>
                      <Select value={direction} onValueChange={(val: any) => setDirection(val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="long">Long (Buy)</SelectItem>
                          <SelectItem value="short">Short (Sell)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Entry Price</Label>
                      <Input type="number" placeholder="e.g. 1950.50" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-red-400">Stop Loss (Required)</Label>
                      <Input type="number" placeholder="e.g. 1945.00" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-400">Take Profit (Optional)</Label>
                      <Input type="number" placeholder="e.g. 1970.00" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
                    </div>
                  </div>
               </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 sticky top-6">
             <Card className="bg-card border-primary/30 shadow-lg shadow-black/40">
                <CardContent className="p-6">
                   <h2 className="text-xl font-bold font-mono text-white mb-6 border-b border-border/50 pb-4">
                     Calculation Result
                   </h2>

                   {warnings.length > 0 && (
                     <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md space-y-2">
                       {warnings.map((w, i) => (
                         <div key={i} className="flex items-start gap-2 text-red-400 text-sm">
                           <AlertCircle size={16} className="mt-0.5 shrink-0" />
                           <p>{w}</p>
                         </div>
                       ))}
                     </div>
                   )}

                   {results ? (
                     <div className="space-y-6">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-mono">Recommended Lot Size</p>
                          <p className="text-5xl font-black text-primary font-mono">{results.roundedLot.toFixed(Math.max(1, -Math.floor(Math.log10(parseFloat(lotStep)))))}</p>
                          {results.rawLot !== results.roundedLot && (
                            <p className="text-xs text-muted-foreground mt-1">Raw calculation: {results.rawLot.toFixed(4)}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                           <div>
                             <p className="text-xs text-muted-foreground mb-1">Actual Risk ($)</p>
                             <p className="text-lg font-bold text-red-400 font-mono">${results.actualRisk.toFixed(2)}</p>
                           </div>
                           <div>
                             <p className="text-xs text-muted-foreground mb-1">Actual Risk (%)</p>
                             <p className="text-lg font-bold text-red-400 font-mono">{results.actualRiskPercent.toFixed(2)}%</p>
                           </div>
                           {(results.reward !== null && results.rr !== null) && (
                             <>
                               <div>
                                 <p className="text-xs text-muted-foreground mb-1">Potential Profit</p>
                                 <p className="text-lg font-bold text-green-400 font-mono">${results.reward.toFixed(2)}</p>
                               </div>
                               <div>
                                 <p className="text-xs text-muted-foreground mb-1">Reward / Risk</p>
                                 <p className="text-lg font-bold text-white font-mono">1 : {results.rr.toFixed(2)}</p>
                               </div>
                             </>
                           )}
                        </div>
                     </div>
                   ) : (
                     <div className="py-12 text-center text-muted-foreground">
                       <p>Enter Entry Price and Stop Loss <br/>to see results.</p>
                     </div>
                   )}
                </CardContent>
             </Card>
          </div>
        </div>
      )}

      {activeTab === "guide" && (
        <Card className="bg-card/50 border-border/50 max-w-3xl">
          <CardContent className="p-8 prose prose-invert max-w-none">
            <h2 className="text-2xl font-mono text-white mb-6">How this is calculated</h2>

            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-bold text-primary">1. Risk Amount</h3>
                <p className="text-muted-foreground bg-black/40 p-3 rounded font-mono text-sm">
                  Risk Amount = Account Equity × (Risk Percentage / 100)
                </p>
                <p className="text-sm text-foreground mt-2">
                  Determine how much monetary value you are willing to lose.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-primary">2. Stop Loss Distance</h3>
                <p className="text-muted-foreground bg-black/40 p-3 rounded font-mono text-sm">
                  Distance = | Entry Price - Stop Loss Price |
                </p>
                <p className="text-sm text-foreground mt-2">
                  The absolute price movement from your entry to your stop loss.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-primary">3. Lot Size</h3>
                <p className="text-muted-foreground bg-black/40 p-3 rounded font-mono text-sm break-words">
                  Raw Lot Size = Risk Amount / (Distance × Contract Size)
                </p>
                <p className="text-sm text-foreground mt-2">
                  Contract size is how much of the underlying asset constitutes 1 standard lot.
                  For forex, it's typically 100,000. For Gold (XAUUSD), it is usually 100 ounces.
                  The raw lot size is then rounded DOWN to the nearest 'Lot Step' (e.g., 0.01) to stay within risk limits.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-primary">4. Actual Risk</h3>
                <p className="text-muted-foreground bg-black/40 p-3 rounded font-mono text-sm break-words">
                  Actual Risk = Rounded Lot Size × Distance × Contract Size
                </p>
                <p className="text-sm text-foreground mt-2">
                  Because we round the lot size, the actual risk is often slightly less than the intended risk amount.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
