import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@journal/contexts/AuthContext";
import { Cashflow } from "@journal/types/cashflow";
import { cashflowService } from "@journal/lib/cashflowService";
import { Button } from "@journal/components/ui/button";
import { Input } from "@journal/components/ui/input";
import { Label } from "@journal/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@journal/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@journal/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@journal/components/ui/table";
import { Plus, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { format } from "date-fns";

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

export function Cashflows() {
  const { user } = useAuth();
  const [cashflows, setCashflows] = useState<Cashflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cashflow | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Cashflow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const data = await cashflowService.getCashflows(user.uid);
    setCashflows(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [user]);

  const sorted = useMemo(
    () => [...cashflows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [cashflows]
  );

  const totals = useMemo(() => {
    let dep = 0;
    let wd = 0;
    cashflows.forEach(c => {
      if (c.type === "deposit") dep += c.amount;
      else wd += c.amount;
    });
    return { deposits: dep, withdrawals: wd, net: dep - wd };
  }, [cashflows]);

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
      const payload = {
        type: form.type,
        amount: amt,
        date: dateObj.toISOString(),
        note: form.note || undefined,
      };
      if (editing) {
        await cashflowService.updateCashflow(user.uid, editing.id, payload);
      } else {
        await cashflowService.addCashflow(user.uid, payload);
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

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black font-mono tracking-tighter text-white">Cashflows</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Manually log deposits and withdrawals on your trading account.</p>
        </div>
        <Button onClick={openAdd} className="gap-2 shrink-0 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-mono">
          <Plus size={16} /> New Entry
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-white/10 bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-muted-foreground"><ArrowDownToLine size={14} className="text-[#22c55e]" /> Deposits</div>
          <div className="text-2xl font-bold font-mono mt-1 text-[#22c55e]">${totals.deposits.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-muted-foreground"><ArrowUpFromLine size={14} className="text-[#ef4444]" /> Withdrawals</div>
          <div className="text-2xl font-bold font-mono mt-1 text-[#ef4444]">${totals.withdrawals.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-card p-4">
          <div className="text-xs font-mono uppercase text-muted-foreground">Net Cashflow</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${totals.net >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {totals.net >= 0 ? "+" : "−"}${Math.abs(totals.net).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-card">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">Loading cashflows...</div>
        ) : (
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-white/10 hover:bg-transparent">
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
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground font-mono">
                    No cashflows yet. Click "New Entry" to log a deposit or withdrawal.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map(cf => {
                  const d = new Date(cf.date);
                  return (
                    <TableRow key={cf.id} className="border-b border-white/5 hover:bg-muted/20">
                      <TableCell className="text-center font-mono text-muted-foreground whitespace-nowrap">
                        {format(d, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          cf.type === "deposit"
                            ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
                            : "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30"
                        }`}>
                          {cf.type === "deposit" ? <ArrowDownToLine size={10} /> : <ArrowUpFromLine size={10} />}
                          {cf.type}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right pr-6 font-mono font-bold ${cf.type === "deposit" ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                        {cf.type === "deposit" ? "+" : "−"}${cf.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {cf.note || <span className="opacity-50">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={() => openEdit(cf)}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setToDelete(cf)}>
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
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as CashflowType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Amount ($)</Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="500"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right whitespace-nowrap">Date & Time</Label>
              <div className="col-span-3 grid grid-cols-[1.3fr_1fr] gap-2">
                <Input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} className="w-full min-w-0 [color-scheme:dark]" />
                <Input type="time" value={form.time} onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} className="w-full min-w-0 [color-scheme:dark]" />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Note</Label>
              <Input
                type="text"
                value={form.note}
                onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Optional"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
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
                <>This will permanently remove the {toDelete.type} of ${toDelete.amount.toFixed(2)} on {format(new Date(toDelete.date), "MMM d, yyyy")}.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
