import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { useCurrency } from "@journal/contexts/CurrencyContext";
import { Button } from "@journal/components/ui/button";
import { Card, CardContent } from "@journal/components/ui/card";
import { PropPhase, PropPhaseOutcome } from "@journal/types/propPhase";

interface Props {
  phase: PropPhase;
  onEdit: () => void;
  onDelete: () => void;
}

const outcomeBadgeClass: Record<PropPhaseOutcome, string> = {
  "Passed": "bg-green-500/15 text-green-400 border-green-500/30",
  "Failed": "bg-red-500/15 text-red-400 border-red-500/30",
  "Funded": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Paid out": "bg-primary/15 text-primary border-primary/30",
  "Other": "bg-muted text-muted-foreground border-border",
};

const formatAccountSize = (n: number): string =>
  n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;

function formatMoney(symbol: string, value: number, withExplicitPlus: boolean): string {
  const sign = value < 0 ? "-" : withExplicitPlus ? "+" : "";
  return `${sign}${symbol}${Math.abs(value).toFixed(2)}`;
}

function safeFormatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function PhaseMetadataBar({ phase, onEdit, onDelete }: Props) {
  const { symbol } = useCurrency();
  const totalPnl = phase.endingBalance - phase.startingBalance;

  return (
    <Card className="bg-card/50 border-border/50 mb-8">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: identity + metadata */}
          <div className="flex flex-col gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-3xl font-bold font-mono tracking-tight text-white truncate"
                title={phase.name}
              >
                {phase.name}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono uppercase border whitespace-nowrap ${outcomeBadgeClass[phase.outcome]}`}
              >
                {phase.outcome}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-black/40 text-muted-foreground border border-border/50">
                {formatAccountSize(phase.accountSize)}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {phase.stage}
              </span>
            </div>

            <p className="text-sm font-mono text-muted-foreground">
              Started {safeFormatDate(phase.startedAt)} <span className="mx-1">→</span> Closed {safeFormatDate(phase.closedAt)}
            </p>

            {phase.notes && phase.notes.trim() !== "" && (
              <p className="text-sm text-muted-foreground bg-muted/30 border border-border/40 rounded px-3 py-2 whitespace-pre-wrap">
                {phase.notes}
              </p>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="font-mono gap-2"
              onClick={onEdit}
            >
              <Pencil size={14} /> Edit details
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-mono gap-2 text-red-400 border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
              onClick={onDelete}
            >
              <Trash2 size={14} /> Delete folder
            </Button>
          </div>
        </div>

        {/* Balance + P&L row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="bg-black/40 p-3 rounded">
            <p className="text-xs text-muted-foreground uppercase mb-1">Start → End</p>
            <p className="text-base font-bold font-mono text-white">
              {formatMoney(symbol, phase.startingBalance, false)}
              <span className="text-muted-foreground mx-2">→</span>
              {formatMoney(symbol, phase.endingBalance, false)}
            </p>
          </div>
          <div className="bg-black/40 p-3 rounded text-center sm:text-left">
            <p className="text-xs text-muted-foreground uppercase mb-1">Total P&amp;L</p>
            <p
              className={`text-xl font-bold font-mono ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {formatMoney(symbol, totalPnl, true)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
