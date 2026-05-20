import { Trash2 } from "lucide-react";
import { Button } from "@journal/components/ui/button";

interface BulkActionBarProps {
  count: number;
  onDelete: () => void;
  onCancel: () => void;
  /** Singular noun for the count display ("trade", "cashflow"). Defaults to "item". */
  itemLabel?: string;
}

export function BulkActionBar({
  count,
  onDelete,
  onCancel,
  itemLabel = "item",
}: BulkActionBarProps) {
  const label = `${count} ${itemLabel}${count === 1 ? "" : "s"} selected`;

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-primary/40 bg-primary/5 mb-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={count === 0}
        >
          <Trash2 />
          Delete
        </Button>
      </div>
    </div>
  );
}
