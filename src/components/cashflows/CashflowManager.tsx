import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@journal/contexts/AuthContext";
import { Cashflow } from "@journal/types/cashflow";
import { cashflowService } from "@journal/lib/cashflowService";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@journal/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@journal/components/ui/table";
import { Plus, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@journal/contexts/CurrencyContext";
import { useBulkSelect } from "@journal/lib/useBulkSelect";
import { BulkActionBar } from "@journal/components/ui/BulkActionBar";

type CashflowType = "deposit" | "withdrawal";

interface FormState {
  type: CashflowType;
  amount: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note: string;
}

const blankForm = (): FormState => {
  const now = new Date();
  return {
    type: "deposit",
    amount: "",
    date: now.toLocaleDateString("en-CA"),
    time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
    note: "",
  };
};

interface Props {
  /**
   * Optional phase id. When undefined, this manager owns the ACTIVE phase
   * (untagged cashflows; writes do not set propPhaseId). When a string,
   * it owns that archived phase (filter by propPhaseId, writes set propPhaseId).
   */
  phaseId?: string;
}

export function CashflowManager({ phaseId }: Props) {
  const { user } = useAuth();
  const { symbol } = useCurrency();
  const [cashflows, setCashflows] = useState<Cashflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cashflow | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Cashflow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const data = await cashflowService.getCashflows(user.uid);
    setCashflows(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Scope cashflows to the active phase (untagged) or the given archived phase.
  const scoped = useMemo(
    () =>
      cashflows.filter((c) =>
        phaseId ? c.propPhaseId === phaseId : !c.propPhaseId,
      ),
    [cashflows, phaseId],
  );

  const sorted = useMemo(
    () => [...scoped].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [scoped],
  );

  // Bulk-select is only available when this manager owns the ACTIVE phase
  // (untagged cashflows). Per spec §6, bulk delete on the PropFirm phase
  // detail view is deferred to a follow-up.
  const showBulkSelect = !phaseId;
  const bulk = useBulkSelect(sorted);
  const isSelectMode = showBulkSelect && bulk.isSelectMode;
  const masterCheckboxRef = useRef<HTMLInputElement | null>(null);

  // Clear selection whenever the cashflows list reference changes
  // (add/edit/delete refetches it).
  useEffect(() => {
    bulk.clearOnFilterChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashflows]);

  // Set indeterminate state on the master checkbox via DOM ref.
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate =
        bulk.selectedCount > 0 && !bulk.isAllSelected;
    }
  }, [bulk.selectedCount, bulk.isAllSelected]);

  const totals = useMemo(() => {
    let dep = 0;
    let wd = 0;
    scoped.forEach((c) => {
      if (c.type === "deposit") dep += c.amount;
      else wd += c.amount;
    });
    return { deposits: dep, withdrawals: wd, net: dep - wd };
  }, [scoped]);

  const openAdd = () => {
    setEditing(null);
    setForm(blankForm());
    setDialogOpen(true);
  };

  const openEdit = (cf: Cashflow) => {
    setEditing(cf);
    const d = new Date(cf.date);
    setForm({
      type: cf.type,
      amount: String(cf.amount),
      date: d.toLocaleDateString("en-CA"),
      time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
      note: cf.note || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const amt = parseFloat(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      alert("Enter an amount greater than 0.");
      return;
    }
    let dateObj: Date;
    try {
      dateObj = new Date(`${form.date}T${form.time}:00`);
      if (isNaN(dateObj.getTime())) dateObj = new Date();
    } catch {
      dateObj = new Date();
    }

    setSaving(true);
    try {
      if (editing) {
        // Do NOT pass propPhaseId in the partial — leaves the existing tag intact.
        const updatePayload = {
          type: form.type,
          amount: amt,
          date: dateObj.toISOString(),
          note: form.note || undefined,
        };
        await cashflowService.updateCashflow(user.uid, editing.id, updatePayload);
      } else {
        const addPayload: Omit<Cashflow, "id" | "userId" | "createdAt" | "updatedAt"> = {
          type: form.type,
          amount: amt,
          date: dateObj.toISOString(),
          note: form.note || undefined,
        };
        if (phaseId) addPayload.propPhaseId = phaseId;
        await cashflowService.addCashflow(user.uid, addPayload);
      }
      setDialogOpen(false);
      await fetchAll();
      window.dispatchEvent(new Event("cashflowsUpdated"));
    } catch (e) {
      console.error(e);
      let detail = "";
      try {
        const parsed = JSON.parse(e instanceof Error ? e.message : String(e));
        detail = parsed?.error || String(e);
      } catch {
        detail = e instanceof Error ? e.message : String(e);
      }
      alert(`Failed to save cashflow:\n\n${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !toDelete) return;
    setDeleting(true);
    try {
      await cashflowService.deleteCashflow(user.uid, toDelete.id);
      setToDelete(null);
      await fetchAll();
      window.dispatchEvent(new Event("cashflowsUpdated"));
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const bulkSelectedCount = bulk.selectedCount;
  const handleBulkDelete = async () => {
    if (!user || bulkSelectedCount === 0) return;
    setBulkDeleting(true);
    try {
      await cashflowService.deleteCashflowsBatch(
        user.uid,
        Array.from(bulk.selectedIds),
      );
      window.dispatchEvent(new Event("cashflowsUpdated"));
      await fetchAll();
      bulk.exit();
      setIsBulkConfirmOpen(false);
    } catch (e) {
      console.error(e);
      let detail = "";
      try {
        const parsed = JSON.parse(e instanceof Error ? e.message : String(e));
        detail = parsed?.error || String(e);
      } catch {
        detail = e instanceof Error ? e.message : String(e);
      }
      alert(`Failed to delete cashflows:\n\n${detail}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        {showBulkSelect && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => (isSelectMode ? bulk.exit() : bulk.enter())}
            disabled={!isSelectMode && sorted.length === 0}
            title={sorted.length === 0 ? "Nothing to select" : undefined}
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
        )}
        <Button
          onClick={openAdd}
          className="gap-2 shrink-0 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-mono"
        >
          <Plus size={16} /> New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-white/10 bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-muted-foreground">
            <ArrowDownToLine size={14} className="text-[#22c55e]" /> Deposits
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-[#22c55e]">
            {symbol}
            {totals.deposits.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-muted-foreground">
            <ArrowUpFromLine size={14} className="text-[#ef4444]" /> Withdrawals
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-[#ef4444]">
            {symbol}
            {totals.withdrawals.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-card p-4">
          <div className="text-xs font-mono uppercase text-muted-foreground">Net Cashflow</div>
          <div
            className={`text-2xl font-bold font-mono mt-1 ${
              totals.net >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
            }`}
          >
            {totals.net >= 0 ? "+" : "−"}
            {symbol}
            {Math.abs(totals.net).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-card">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">
            Loading cashflows...
          </div>
        ) : (
          <>
            {isSelectMode && (
              <div className="px-3 pt-3">
                {bulk.selectedCount > 0 ? (
                  <BulkActionBar
                    count={bulk.selectedCount}
                    onDelete={() => setIsBulkConfirmOpen(true)}
                    onCancel={bulk.exit}
                    itemLabel="cashflow"
                  />
                ) : (
                  <div className="text-xs font-mono text-muted-foreground mb-2">
                    Select rows or{" "}
                    <button
                      type="button"
                      onClick={bulk.exit}
                      className="underline underline-offset-2 hover:text-foreground cursor-pointer"
                    >
                      Cancel selection
                    </button>
                  </div>
                )}
              </div>
            )}
            <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                {isSelectMode && (
                  <TableHead className="font-mono text-muted-foreground text-center w-10 px-2">
                    <input
                      ref={masterCheckboxRef}
                      type="checkbox"
                      checked={bulk.isAllSelected}
                      onChange={bulk.toggleAll}
                      className="cursor-pointer accent-primary"
                      aria-label="Select all cashflows"
                    />
                  </TableHead>
                )}
                <TableHead className="font-mono text-muted-foreground text-center w-32">Date</TableHead>
                <TableHead className="font-mono text-muted-foreground text-center w-28">Type</TableHead>
                <TableHead className="font-mono text-muted-foreground text-right pr-6 w-32">Amount</TableHead>
                <TableHead className="font-mono text-muted-foreground">Note</TableHead>
                <TableHead className="font-mono text-muted-foreground text-center w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={isSelectMode ? 6 : 5} className="h-24 text-center text-muted-foreground font-mono">
                    No cashflows yet. Click "New Entry" to log a deposit or withdrawal.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((cf) => {
                  const d = new Date(cf.date);
                  const isRowSelected = bulk.selectedIds.has(cf.id);
                  return (
                    <TableRow
                      key={cf.id}
                      className={`border-b border-white/5 ${
                        isSelectMode && isRowSelected
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      {isSelectMode && (
                        <TableCell className="text-center px-2">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => bulk.toggle(cf.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="cursor-pointer accent-primary"
                            aria-label="Select cashflow"
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-center font-mono text-muted-foreground whitespace-nowrap">
                        {format(d, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            cf.type === "deposit"
                              ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
                              : "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30"
                          }`}
                        >
                          {cf.type === "deposit" ? <ArrowDownToLine size={10} /> : <ArrowUpFromLine size={10} />}
                          {cf.type}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right pr-6 font-mono font-bold ${
                          cf.type === "deposit" ? "text-[#22c55e]" : "text-[#ef4444]"
                        }`}
                      >
                        {cf.type === "deposit" ? "+" : "−"}
                        {symbol}
                        {cf.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {cf.note || <span className="opacity-50">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-white"
                            onClick={() => openEdit(cf)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setToDelete(cf)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Cashflow" : "New Cashflow"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Type</Label>
              <div className="col-span-3">
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as CashflowType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Amount ({symbol})</Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="500"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right whitespace-nowrap">Date & Time</Label>
              <div className="col-span-3 grid grid-cols-[1.3fr_1fr] gap-2">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full min-w-0 [color-scheme:dark]"
                />
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  className="w-full min-w-0 [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Note</Label>
              <Input
                type="text"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Optional"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.amount}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Cashflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] border-white/10 bg-background">
          <DialogHeader>
            <DialogTitle className="font-mono text-xl text-white">Delete Cashflow</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {toDelete && (
                <>
                  This will permanently remove the {toDelete.type} of {symbol}
                  {toDelete.amount.toFixed(2)} on {format(new Date(toDelete.date), "MMM d, yyyy")}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isBulkConfirmOpen}
        onOpenChange={(open) => {
          if (!bulkDeleting) setIsBulkConfirmOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[425px] border-white/10 bg-background">
          <DialogHeader>
            <DialogTitle className="font-mono text-xl text-white">
              Delete {bulkSelectedCount} {bulkSelectedCount === 1 ? "cashflow" : "cashflows"}?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This cannot be undone.
            </DialogDescription>
            {bulkSelectedCount > 50 && (
              <p className="mt-2 text-sm text-[#f59e0b]">
                You're about to delete {bulkSelectedCount} cashflows. This is a large action — double-check before confirming.
              </p>
            )}
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkConfirmOpen(false)}
              disabled={bulkDeleting}
              className="font-mono"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting || bulkSelectedCount === 0}
              className="font-mono"
            >
              {bulkDeleting
                ? "Deleting..."
                : `Delete ${bulkSelectedCount} ${bulkSelectedCount === 1 ? "item" : "items"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
