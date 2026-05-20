import React, { useEffect, useRef, useState } from "react";
import { Trade } from "../../types/trade";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Trash2, Pencil, ArrowUp, ArrowDown, ChevronsUpDown, CheckSquare } from "lucide-react";
import { tradeService } from "../../lib/tradeService";
import { useAuth } from "../../contexts/AuthContext";
import { format } from "date-fns";
import { EditTradeDialog } from "./EditTradeDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

import { getTradeDate, getTradeDirection, getTradeOutcome, getTradePnl, getTradeSymbol, getTradeDisplayOutcome, getTradeClosePrice } from "../../lib/tradeUtils";
import { useCurrency } from "@journal/contexts/CurrencyContext";
import { useBulkSelect } from "@journal/lib/useBulkSelect";
import { BulkActionBar } from "@journal/components/ui/BulkActionBar";

interface Props {
  trades: Trade[];
  onTradeDeleted: () => void;
  onRowClick?: (tradeId: string) => void;
  sortKey?: keyof Trade;
  sortDirection?: "asc" | "desc";
  onSort?: (key: keyof Trade) => void;
  /**
   * When true, hide the per-row edit/delete action column.
   * Used by the PropFirm phase detail page — archived trades are
   * not editable from the phase view (delete the whole folder instead).
   */
  readOnly?: boolean;
  /**
   * Called after a bulk delete completes so the caller can refresh
   * its trade list. Distinct from `onTradeDeleted` (single-row delete)
   * only for clarity — in practice both point to the same fetch fn.
   */
  onTradesChanged?: () => void;
}

interface SortableHeaderProps {
  label: string;
  sortKey?: keyof Trade;
  activeKey?: keyof Trade;
  direction?: "asc" | "desc";
  onSort?: (key: keyof Trade) => void;
  className?: string;
}

function SortableHeader({ label, sortKey, activeKey, direction, onSort, className }: SortableHeaderProps) {
  const sortable = !!(sortKey && onSort);
  const isActive = sortable && activeKey === sortKey;
  return (
    <TableHead className={className}>
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort!(sortKey!)}
          className={`inline-flex w-full items-center justify-center gap-1 font-mono uppercase select-none cursor-pointer transition-colors ${
            isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
          {isActive ? (
            direction === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
          ) : (
            <ChevronsUpDown size={11} className="opacity-40" />
          )}
        </button>
      ) : (
        <span className="font-mono text-muted-foreground">{label}</span>
      )}
    </TableHead>
  );
}

export function ListOverview({ trades, onTradeDeleted, onRowClick, sortKey, sortDirection, onSort, readOnly = false, onTradesChanged }: Props) {
  const { user } = useAuth();
  const { symbol: currencySymbol } = useCurrency();

  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const bulk = useBulkSelect(trades);
  const showSelectAffordances = !readOnly;
  const isSelectMode = showSelectAffordances && bulk.isSelectMode;
  const masterCheckboxRef = useRef<HTMLInputElement | null>(null);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Clear selection whenever the trades prop reference changes (filters / sort
  // upstream produce a fresh array). The hook handles its own internal state.
  useEffect(() => {
    bulk.clearOnFilterChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades]);

  // Set indeterminate state on the master checkbox via DOM ref.
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate =
        bulk.selectedCount > 0 && !bulk.isAllSelected;
    }
  }, [bulk.selectedCount, bulk.isAllSelected]);

  const confirmDelete = async () => {
    if (user && tradeToDelete) {
      setIsDeleting(true);
      try {
        await tradeService.deleteTrade(user.uid, tradeToDelete.id);
        onTradeDeleted();
        setTradeToDelete(null);
      } catch (error) {
        console.error("Failed to delete trade", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const bulkSelectedCount = bulk.selectedCount;
  const confirmBulkDelete = async () => {
    if (!user || bulkSelectedCount === 0) return;
    setIsBulkDeleting(true);
    try {
      await tradeService.deleteTradesBatch(user.uid, Array.from(bulk.selectedIds));
      onTradesChanged?.();
      bulk.exit();
      setIsBulkConfirmOpen(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      alert(`Failed to delete trades: ${msg}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-card pb-2">
      <div className="w-full overflow-x-auto custom-scrollbar pb-2">
        {showSelectAffordances && (
          <div className="flex items-center justify-between gap-3 px-3 pt-3 pb-2">
            <div className="text-xs font-mono text-muted-foreground">
              {isSelectMode && bulk.selectedCount === 0 ? (
                <span>
                  Select rows or{" "}
                  <button
                    type="button"
                    onClick={bulk.exit}
                    className="underline underline-offset-2 hover:text-foreground cursor-pointer"
                  >
                    Cancel selection
                  </button>
                </span>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (isSelectMode ? bulk.exit() : bulk.enter())}
              disabled={!isSelectMode && trades.length === 0}
              title={trades.length === 0 ? "Nothing to select" : undefined}
              className="font-mono gap-2"
            >
              {isSelectMode ? (
                "Cancel"
              ) : (
                <>
                  <CheckSquare size={14} /> Select
                </>
              )}
            </Button>
          </div>
        )}
        {isSelectMode && bulk.selectedCount > 0 && (
          <div className="px-3">
            <BulkActionBar
              count={bulk.selectedCount}
              onDelete={() => setIsBulkConfirmOpen(true)}
              onCancel={bulk.exit}
              itemLabel="trade"
            />
          </div>
        )}
        <Table className="text-xs w-full min-w-[1640px]">
        <TableHeader className="bg-muted/50">
          <TableRow className="border-b border-white/10 hover:bg-transparent">
            {isSelectMode && (
              <TableHead className="font-mono text-muted-foreground w-8 text-center border-r border-white/5 border-b-0 h-10 px-1">
                <input
                  ref={masterCheckboxRef}
                  type="checkbox"
                  checked={bulk.isAllSelected}
                  onChange={bulk.toggleAll}
                  className="cursor-pointer accent-primary"
                  aria-label="Select all trades"
                />
              </TableHead>
            )}
            <TableHead className="font-mono text-muted-foreground w-8 text-center border-r border-white/5 border-b-0 h-10 px-1">#</TableHead>
            <SortableHeader label="Symbol" sortKey="pair" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-center border-r border-white/5 border-b-0 px-2 w-20" />
            <SortableHeader label="Ticket" sortKey="ticket" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-center border-r border-white/5 border-b-0 px-2 w-28" />
            <SortableHeader label="Date" sortKey="date" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-center border-r border-white/5 border-b-0 px-2 w-24" />
            <SortableHeader label="Time" sortKey="date" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-center border-r border-white/5 border-b-0 px-2 w-20" />
            <SortableHeader label="Type" sortKey="position" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-center border-r border-white/5 border-b-0 px-2 w-20" />
            <SortableHeader label="Outcome" sortKey="outcome" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-center border-r border-white/5 border-b-0 px-2 w-24" />
            <SortableHeader label="Exit" sortKey="closeReason" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-center border-r border-white/5 border-b-0 px-2 w-24" />
            <SortableHeader label="Volume" sortKey="volume" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-center border-r border-white/5 border-b-0 px-2 w-20" />
            <SortableHeader label="Price" sortKey="entryPrice" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-center border-r border-white/5 border-b-0 px-1 w-20" />
            <SortableHeader label="SL" sortKey="stopLoss" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-center border-r border-white/5 border-b-0 px-1 w-20" />
            <SortableHeader label="TP" sortKey="takeProfit" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-center border-r border-white/5 border-b-0 px-1 w-20" />
            <SortableHeader label="PnL" sortKey="pnlAmount" activeKey={sortKey} direction={sortDirection} onSort={onSort} className="text-center border-r border-white/5 border-b-0 px-2 w-24" />
            {!readOnly && (
              <TableHead className="font-mono text-muted-foreground text-center border-b-0 px-2 w-24">Action</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={readOnly ? 13 : isSelectMode ? 15 : 14} className="h-24 text-center text-muted-foreground font-mono">
                No trades match your filters.
              </TableCell>
            </TableRow>
          ) : (
            trades.map((trade, i) => {
              const symbol = getTradeSymbol(trade);
              const dateObjStr = getTradeDate(trade);
              const pnlValue = getTradePnl(trade);
              const direction = getTradeDirection(trade);
              const outcomeDisplay = getTradeDisplayOutcome(trade);
              const outcomeRaw = getTradeOutcome(trade);
              let parsedDate = new Date();
              try { if (dateObjStr) parsedDate = new Date(dateObjStr); } catch(e) {}
              
              const isRowSelected = bulk.selectedIds.has(trade.id);
              return (
              <TableRow
                key={trade.id}
                className={`border-b border-white/5 group cursor-pointer ${
                  isSelectMode && isRowSelected
                    ? "bg-primary/5 hover:bg-primary/10"
                    : "hover:bg-muted/20"
                }`}
                onClick={() => {
                  if (isSelectMode) {
                    bulk.toggle(trade.id);
                    return;
                  }
                  onRowClick && onRowClick(trade.id);
                }}
              >
                {isSelectMode && (
                  <TableCell className="text-center border-r border-white/5 px-1 py-2.5">
                    <input
                      type="checkbox"
                      checked={isRowSelected}
                      onChange={() => bulk.toggle(trade.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer accent-primary"
                      aria-label="Select trade"
                    />
                  </TableCell>
                )}
                <TableCell className="font-mono text-muted-foreground text-center border-r border-white/5 px-1 py-2.5">
                  {i + 1}
                </TableCell>
                <TableCell className="text-center border-r border-white/5 px-2 py-2">
                  <span className="font-bold text-foreground font-mono leading-tight">{symbol || "-"}</span>
                </TableCell>
                <TableCell className="text-muted-foreground text-center font-mono border-r border-white/5 px-2 py-2.5">
                  {trade.ticket !== undefined ? trade.ticket : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-center border-r border-white/5 px-2 py-2.5 whitespace-nowrap">
                  {format(parsedDate, "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-muted-foreground text-center border-r border-white/5 px-2 py-2.5 whitespace-nowrap">
                  {format(parsedDate, "HH:mm")}
                </TableCell>
                <TableCell className="text-center border-r border-white/5 px-2 py-2.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold ${
                    direction === 'LONG' ? 'border-[#22c55e]/50 text-[#22c55e]' : 'border-[#ef4444]/50 text-[#ef4444]'
                  }`}>
                    {direction}
                  </span>
                </TableCell>
                <TableCell className="text-center border-r border-white/5 px-2 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    outcomeRaw === 'WIN' ? 'bg-[#22c55e] text-white' :
                    (outcomeRaw === 'LOSE' || outcomeRaw === 'LOSS') ? 'bg-[#ef4444] text-white' :
                    'bg-[#f59e0b] text-white'
                  }`}>
                    {outcomeDisplay === 'BREAKEVEN' ? 'B/E' : outcomeDisplay}
                  </span>
                </TableCell>
                <TableCell className="text-center border-r border-white/5 px-2 py-2.5">
                  {(() => {
                    const cr = trade.closeReason;
                    if (cr === "TP")        return <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#22c55e]">🎯 TP</span>;
                    if (cr === "SL")        return <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#ef4444]">🛑 SL</span>;
                    if (cr === "NEWS")      return <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#f59e0b]">📰 News</span>;
                    if (cr === "MANUAL")    return <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-muted-foreground">✋ Manual</span>;
                    if (cr === "BOT_LOGIC") return <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-muted-foreground">✋ Manual</span>;
                    if (cr === "EXPIRED")   return <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-muted-foreground">⏰ Expired</span>;
                    if (cr === "UNKNOWN")   return <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-muted-foreground">❓ Unknown</span>;
                    return <span className="font-mono text-muted-foreground">—</span>;
                  })()}
                </TableCell>
                <TableCell className="text-muted-foreground text-center font-mono border-r border-white/5 px-2 py-2.5">
                  {trade.volume !== undefined ? trade.volume : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-center font-mono border-r border-white/5 px-1 py-2.5">
                  {trade.entryPrice !== undefined ? trade.entryPrice : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-center font-mono border-r border-white/5 px-1 py-2.5">
                  {trade.stopLoss !== undefined ? trade.stopLoss : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-center font-mono border-r border-white/5 px-1 py-2.5">
                  {trade.takeProfit !== undefined ? trade.takeProfit : "-"}
                </TableCell>
                <TableCell className={`text-center font-mono font-bold border-r border-white/5 px-2 py-2.5 ${pnlValue && pnlValue > 0 ? "text-[#22c55e]" : pnlValue && pnlValue < 0 ? "text-[#ef4444]" : "text-muted-foreground"}`}>
                  {pnlValue !== undefined ? `${pnlValue < 0 ? "-" : ""}${currencySymbol}${Math.abs(pnlValue).toFixed(2)}` : "-"}
                </TableCell>
                {!readOnly && (
                  <TableCell className="p-0 border-white/5 px-1 py-1">
                    <div className="flex items-center justify-center gap-1 w-full h-full">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setTradeToEdit(trade); }} className="h-7 w-7 text-muted-foreground hover:text-white z-10 relative cursor-pointer">
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setTradeToDelete(trade); }} className="h-7 w-7 text-muted-foreground hover:text-destructive z-10 relative cursor-pointer">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )})
          )}
        </TableBody>
      </Table>
        {!readOnly && (
          <>
            <EditTradeDialog
              trade={tradeToEdit}
              open={!!tradeToEdit}
              onOpenChange={(open) => !open && setTradeToEdit(null)}
              onTradeEdited={onTradeDeleted}
              trades={trades}
            />

            <Dialog open={!!tradeToDelete} onOpenChange={(open) => !open && setTradeToDelete(null)}>
              <DialogContent className="sm:max-w-[425px] border-white/10 bg-background">
                <DialogHeader>
                  <DialogTitle className="font-mono text-xl text-white">Confirm Deletion</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Are you sure you want to delete this trade? This action cannot be undone and will remove it from all overview sections.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setTradeToDelete(null)} disabled={isDeleting} className="font-mono">
                    Cancel
                  </Button>
                  <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="font-mono">
                    {isDeleting ? "Deleting..." : "Delete Trade"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isBulkConfirmOpen}
              onOpenChange={(open) => {
                if (!isBulkDeleting) setIsBulkConfirmOpen(open);
              }}
            >
              <DialogContent className="sm:max-w-[425px] border-white/10 bg-background">
                <DialogHeader>
                  <DialogTitle className="font-mono text-xl text-white">
                    Delete {bulkSelectedCount} {bulkSelectedCount === 1 ? "trade" : "trades"}?
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    This cannot be undone.
                  </DialogDescription>
                  {bulkSelectedCount > 50 && (
                    <p className="mt-2 text-sm text-[#f59e0b]">
                      You're about to delete {bulkSelectedCount} trades. This is a large action — double-check before confirming.
                    </p>
                  )}
                </DialogHeader>
                <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBulkConfirmOpen(false)}
                    disabled={isBulkDeleting}
                    className="font-mono"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={confirmBulkDelete}
                    disabled={isBulkDeleting || bulkSelectedCount === 0}
                    className="font-mono"
                  >
                    {isBulkDeleting
                      ? "Deleting..."
                      : `Delete ${bulkSelectedCount} ${bulkSelectedCount === 1 ? "item" : "items"}`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
