import React, { useState } from "react";
import { Trade } from "../../types/trade";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Trash2, Pencil } from "lucide-react";
import { tradeService } from "../../lib/tradeService";
import { useAuth } from "../../contexts/AuthContext";
import { format } from "date-fns";
import { EditTradeDialog } from "./EditTradeDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

interface Props {
  trades: Trade[];
  onTradeDeleted: () => void;
  onRowClick?: (tradeId: string) => void;
}

export function ListOverview({ trades, onTradeDeleted, onRowClick }: Props) {
  const { user } = useAuth();
  
  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <div className="rounded-xl border border-white/10 bg-card pb-2">
      <div className="w-full overflow-x-auto custom-scrollbar pb-2">
        <Table className="text-xs w-full min-w-[1400px]">
        <TableHeader className="bg-muted/50">
          <TableRow className="border-b border-white/10 hover:bg-transparent">
            <TableHead className="font-mono text-muted-foreground w-8 text-center border-r border-white/5 border-b-0 h-10 px-1">#</TableHead>
            <TableHead className="font-mono text-muted-foreground text-center border-r border-white/5 border-b-0 px-2 w-20">Symbol</TableHead>
            <TableHead className="font-mono text-muted-foreground text-center border-r border-white/5 border-b-0 px-2 w-24">Date</TableHead>
            <TableHead className="font-mono text-muted-foreground text-center border-r border-white/5 border-b-0 px-2 w-20">Time</TableHead>
            <TableHead className="font-mono text-muted-foreground text-center border-r border-white/5 border-b-0 px-2 w-20">Type</TableHead>
            <TableHead className="font-mono text-muted-foreground text-center border-r border-white/5 border-b-0 px-2 w-24">Outcome</TableHead>
            <TableHead className="font-mono text-muted-foreground text-center border-r border-white/5 border-b-0 px-2 w-20">Volume</TableHead>
            <TableHead className="font-mono text-muted-foreground text-center border-r border-white/5 border-b-0 px-1 w-20">Price</TableHead>
            <TableHead className="font-mono text-muted-foreground text-center border-r border-white/5 border-b-0 px-1 w-20">SL</TableHead>
            <TableHead className="font-mono text-muted-foreground text-center border-r border-white/5 border-b-0 px-1 w-20">TP</TableHead>
            <TableHead className="font-mono text-muted-foreground text-center border-r border-white/5 border-b-0 px-2 w-24">PnL</TableHead>
            <TableHead className="font-mono text-muted-foreground text-center border-b-0 px-2 w-24">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={12} className="h-24 text-center text-muted-foreground font-mono">
                No trades match your filters.
              </TableCell>
            </TableRow>
          ) : (
            trades.map((trade, i) => (
              <TableRow key={trade.id} className="border-b border-white/5 hover:bg-muted/20 group cursor-pointer" onClick={() => onRowClick && onRowClick(trade.id)}>
                <TableCell className="font-mono text-muted-foreground text-center border-r border-white/5 px-1 py-2.5">{i + 1}</TableCell>
                <TableCell className="font-bold text-foreground text-center border-r border-white/5 px-2 py-2.5 line-clamp-1">
                  {trade.pair || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-center border-r border-white/5 px-2 py-2.5 whitespace-nowrap">
                  {format(new Date(trade.date), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-muted-foreground text-center border-r border-white/5 px-2 py-2.5 whitespace-nowrap">
                  {format(new Date(trade.date), "HH:mm")}
                </TableCell>
                <TableCell className="text-center border-r border-white/5 px-2 py-2.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold ${
                    trade.position === 'Long' ? 'border-[#22c55e]/50 text-[#22c55e]' : 'border-[#ef4444]/50 text-[#ef4444]'
                  }`}>
                    {trade.position}
                  </span>
                </TableCell>
                <TableCell className="text-center border-r border-white/5 px-2 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    trade.outcome === 'WIN' ? 'bg-[#22c55e] text-white' :
                    trade.outcome === 'LOSE' ? 'bg-[#ef4444] text-white' :
                    'bg-[#f59e0b] text-white'
                  }`}>
                    {trade.outcome === 'BREAKEVEN' ? 'B/E' : trade.outcome}
                  </span>
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
                <TableCell className={`text-center font-mono font-bold border-r border-white/5 px-2 py-2.5 ${trade.pnlAmount && trade.pnlAmount > 0 ? "text-[#22c55e]" : trade.pnlAmount && trade.pnlAmount < 0 ? "text-[#ef4444]" : "text-muted-foreground"}`}>
                  {trade.pnlAmount !== undefined ? `$${trade.pnlAmount.toFixed(2)}` : "-"}
                </TableCell>
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
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
      </div>
    </div>
  );
}
