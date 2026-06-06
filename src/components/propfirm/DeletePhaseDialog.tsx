import { useState } from "react";
import { useAuth } from "@journal/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@journal/components/ui/dialog";
import { Button } from "@journal/components/ui/button";
import { propPhaseService } from "@journal/lib/propPhaseService";
import { PropPhase } from "@journal/types/propPhase";

interface Props {
  phase: PropPhase | null;
  tradeCount: number;
  cashflowCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeletePhaseDialog({
  phase,
  tradeCount,
  cashflowCount,
  open,
  onOpenChange,
  onDeleted,
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!user || !phase) return;
    setLoading(true);
    try {
      await propPhaseService.deletePhase(user.uid, phase.id);
      onOpenChange(false);
      onDeleted();
    } catch (e: any) {
      console.error("Delete phase failed", e);
      let msg = "Failed to delete phase.";
      try {
        const parsed = JSON.parse(e?.message || "");
        if (parsed?.error) msg = `Failed to delete phase: ${parsed.error}`;
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
      <DialogContent className="sm:max-w-[480px] border-white/10 bg-background">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl text-white">
            Delete this folder?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            This will move all {tradeCount} trade{tradeCount === 1 ? "" : "s"} and {cashflowCount} cashflow{cashflowCount === 1 ? "" : "s"} from this phase into the Archive (they will NOT return to the active Dashboard). The phase folder itself will be removed. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="font-mono"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="font-mono"
          >
            {loading ? "Deleting..." : "Delete folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
