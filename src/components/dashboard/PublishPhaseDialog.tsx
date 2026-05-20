import { useState, useMemo } from "react";
import { useAuth } from "@journal/contexts/AuthContext";
import { useCurrency } from "@journal/contexts/CurrencyContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@journal/components/ui/dialog";
import { Button } from "@journal/components/ui/button";
import { Input } from "@journal/components/ui/input";
import { Label } from "@journal/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@journal/components/ui/select";
import { Trade } from "@journal/types/trade";
import { Cashflow } from "@journal/types/cashflow";
import { propPhaseService } from "@journal/lib/propPhaseService";
import { getTradePnl } from "@journal/lib/tradeUtils";
import { PropPhaseStage, PropPhaseOutcome } from "@journal/types/propPhase";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trades: Trade[];
  cashflows: Cashflow[];
  startBalance: string;
  onPublished: () => void;
}

const STAGES: PropPhaseStage[] = [
  "Challenge Phase 1",
  "Challenge Phase 2",
  "Verification",
  "Funded",
  "Other",
];

const OUTCOMES: PropPhaseOutcome[] = [
  "Passed",
  "Failed",
  "Funded",
  "Paid out",
  "Other",
];

function formatSigned(value: number, symbol: string): string {
  return `${value < 0 ? "-" : ""}${symbol}${Math.abs(value).toFixed(2)}`;
}

export function PublishPhaseDialog({
  open,
  onOpenChange,
  trades,
  cashflows,
  startBalance,
  onPublished,
}: Props) {
  const { user } = useAuth();
  const { symbol } = useCurrency();

  const [name, setName] = useState("");
  const [accountSize, setAccountSize] = useState("");
  const [stage, setStage] = useState<PropPhaseStage>("Challenge Phase 1");
  const [outcome, setOutcome] = useState<PropPhaseOutcome>("Passed");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const startNum = parseFloat(startBalance) || 0;

  const summary = useMemo(() => {
    const untaggedTrades = trades.filter((t) => !t.propPhaseId);
    const untaggedCashflows = cashflows.filter((c) => !c.propPhaseId);
    const taggedTrades = trades.filter((t) => t.propPhaseId);
    const taggedCashflows = cashflows.filter((c) => c.propPhaseId);

    const taggedPnl = taggedTrades.reduce((s, t) => s + (getTradePnl(t) ?? 0), 0);
    const taggedCash = taggedCashflows.reduce(
      (s, c) => s + (c.type === "deposit" ? c.amount : -c.amount),
      0,
    );
    const previewStarting = startNum + taggedPnl + taggedCash;

    const untaggedPnl = untaggedTrades.reduce((s, t) => s + (getTradePnl(t) ?? 0), 0);
    const untaggedCash = untaggedCashflows.reduce(
      (s, c) => s + (c.type === "deposit" ? c.amount : -c.amount),
      0,
    );
    const previewEnding = previewStarting + untaggedPnl + untaggedCash;

    return {
      tradesCount: untaggedTrades.length,
      cashflowsCount: untaggedCashflows.length,
      previewStarting,
      previewEnding,
    };
  }, [trades, cashflows, startNum]);

  const resetForm = () => {
    setName("");
    setAccountSize("");
    setStage("Challenge Phase 1");
    setOutcome("Passed");
    setNotes("");
  };

  const handlePublish = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    try {
      await propPhaseService.publishPhase(
        user.uid,
        {
          name: name.trim(),
          accountSize: parseFloat(accountSize) || 0,
          stage,
          outcome,
          notes: notes.trim() || undefined,
        },
        trades,
        cashflows,
        startNum,
      );
      resetForm();
      onOpenChange(false);
      onPublished();
    } catch (e: any) {
      console.error("Publish failed", e);
      let msg = "Failed to publish phase.";
      try {
        const parsed = JSON.parse(e?.message || "");
        if (parsed?.error) msg = `Failed to publish phase: ${parsed.error}`;
      } catch {
        /* unparseable — use default */
      }
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Publish current phase</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phase-name" className="text-right">Name</Label>
            <Input
              id="phase-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="FTMO Challenge Phase 1"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phase-account-size" className="text-right">Account size</Label>
            <Input
              id="phase-account-size"
              type="number"
              step="any"
              value={accountSize}
              onChange={(e) => setAccountSize(e.target.value)}
              placeholder="100000"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Stage</Label>
            <div className="col-span-3">
              <Select value={stage} onValueChange={(v) => setStage(v as PropPhaseStage)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Outcome</Label>
            <div className="col-span-3">
              <Select value={outcome} onValueChange={(v) => setOutcome(v as PropPhaseOutcome)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="phase-notes" className="text-right pt-2">Notes</Label>
            <textarea
              id="phase-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Optional notes about this phase"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground grid gap-1">
            <div>Trades archived: <span className="text-foreground">{summary.tradesCount}</span></div>
            <div>Cashflows archived: <span className="text-foreground">{summary.cashflowsCount}</span></div>
            <div>Starting balance: <span className="text-foreground">{formatSigned(summary.previewStarting, symbol)}</span></div>
            <div>Ending balance: <span className="text-foreground">{formatSigned(summary.previewEnding, symbol)}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={loading || !name.trim()}
          >
            {loading ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
