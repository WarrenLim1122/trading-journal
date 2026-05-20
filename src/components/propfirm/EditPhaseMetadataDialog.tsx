import { useEffect, useState } from "react";
import { useAuth } from "@journal/contexts/AuthContext";
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
import { propPhaseService } from "@journal/lib/propPhaseService";
import { PropPhase, PropPhaseStage, PropPhaseOutcome } from "@journal/types/propPhase";

interface Props {
  phase: PropPhase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
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

export function EditPhaseMetadataDialog({
  phase,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [accountSize, setAccountSize] = useState("");
  const [stage, setStage] = useState<PropPhaseStage>("Challenge Phase 1");
  const [outcome, setOutcome] = useState<PropPhaseOutcome>("Passed");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-fill from the phase whenever the dialog opens or the phase changes.
  useEffect(() => {
    if (!phase || !open) return;
    setName(phase.name ?? "");
    setAccountSize(phase.accountSize !== undefined ? String(phase.accountSize) : "");
    setStage(phase.stage ?? "Challenge Phase 1");
    setOutcome(phase.outcome ?? "Passed");
    setNotes(phase.notes ?? "");
  }, [phase, open]);

  const handleSave = async () => {
    if (!user || !phase || !name.trim()) return;
    setLoading(true);
    try {
      await propPhaseService.updatePhase(user.uid, phase.id, {
        name: name.trim(),
        accountSize: parseFloat(accountSize) || 0,
        stage,
        outcome,
        notes: notes.trim() === "" ? undefined : notes.trim(),
      });
      onOpenChange(false);
      onUpdated();
    } catch (e: any) {
      console.error("Update phase failed", e);
      let msg = "Failed to update phase.";
      try {
        const parsed = JSON.parse(e?.message || "");
        if (parsed?.error) msg = `Failed to update phase: ${parsed.error}`;
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
          <DialogTitle>Edit phase details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-phase-name" className="text-right">Name</Label>
            <Input
              id="edit-phase-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="FTMO Challenge Phase 1"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-phase-account-size" className="text-right">Account size</Label>
            <Input
              id="edit-phase-account-size"
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
            <Label htmlFor="edit-phase-notes" className="text-right pt-2">Notes</Label>
            <textarea
              id="edit-phase-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Optional notes about this phase"
            />
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
            onClick={handleSave}
            disabled={loading || !name.trim()}
          >
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
