# Currency Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a currency picker beside the Dashboard "+ New Trade" button that swaps the displayed currency symbol (`$`/`S$`/`€`/`£`) app-wide, with no number conversion and no logic change.

**Architecture:** A `CurrencyContext` (React context + `localStorage` persistence) holds the selected currency. A `CurrencyToggle` dropdown component sets it. Every hardcoded `$` display site reads the active `symbol` via `useCurrency()`; exports follow the selection too. Numbers, calculations, routing, and structure are untouched.

**Tech Stack:** React 19 + TypeScript, Vite, Tailwind 4, `@base-ui/react` dropdown-menu primitive (already in repo). No test framework exists; verification gate is `npm run lint` (`tsc --noEmit`) plus manual checks.

**Spec:** `docs/superpowers/specs/2026-05-19-currency-toggle-design.md`

**Conventions observed in this repo:**
- No automated tests. The verification gate is `npm run lint` (runs `tsc --noEmit`). "Run the test" below always means run lint.
- Import paths are **relative** and match each file's existing style: files in `src/` use `./contexts/...`; files in `src/pages/` use `../contexts/...`; files in `src/components/dashboard/` use `../../contexts/...`.
- Commit after every task. Do **not** push until Task 8 (final). Auto-push policy from CLAUDE.md applies only after the full feature lints clean.

---

### Task 1: CurrencyContext

**Files:**
- Create: `src/contexts/CurrencyContext.tsx`

- [ ] **Step 1: Create the context file**

Create `src/contexts/CurrencyContext.tsx` with exactly this content (modeled on the existing `AuthContext.tsx` pattern — `createContext` with a default, named `Provider` export, `useCurrency` hook via `useContext`):

```tsx
import React, { createContext, useContext, useEffect, useState } from "react";

export type CurrencyCode = "USD" | "SGD" | "EUR" | "GBP";

export const CURRENCIES: { code: CurrencyCode; symbol: string }[] = [
  { code: "USD", symbol: "$" },
  { code: "SGD", symbol: "S$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
];

const STORAGE_KEY = "tj:currency";

function symbolFor(code: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "$";
}

function readStored(): CurrencyCode {
  const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (raw === "USD" || raw === "SGD" || raw === "EUR" || raw === "GBP") return raw;
  return "USD";
}

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  setCurrency: () => {},
  symbol: "$",
});

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => readStored());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const setCurrency = (c: CurrencyCode) => setCurrencyState(c);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, symbol: symbolFor(currency) }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
```

- [ ] **Step 2: Run the test (lint)**

Run: `npm run lint`
Expected: PASS (no output, exit 0). The file is self-contained; no other file imports it yet.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/CurrencyContext.tsx
git commit -m "Add CurrencyContext (symbol-only, localStorage-persisted)"
```

---

### Task 2: Wire CurrencyProvider into both entry points

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/JournalApp.tsx`

- [ ] **Step 1: App.tsx — add import**

In `src/App.tsx`, directly below the line:

```tsx
import { AuthProvider, useAuth } from "./contexts/AuthContext";
```

add:

```tsx
import { CurrencyProvider } from "./contexts/CurrencyContext";
```

- [ ] **Step 2: App.tsx — wrap provider**

In `src/App.tsx`, the `return` currently is:

```tsx
  return (
    <AuthProvider>
      <div className="dark">
```

…and ends with:

```tsx
      </div>
    </AuthProvider>
  );
```

Change the open to:

```tsx
  return (
    <AuthProvider>
      <CurrencyProvider>
      <div className="dark">
```

…and the close to:

```tsx
      </div>
      </CurrencyProvider>
    </AuthProvider>
  );
```

- [ ] **Step 3: JournalApp.tsx — add import**

In `src/JournalApp.tsx`, directly below:

```tsx
import { AuthProvider, useAuth } from "./contexts/AuthContext";
```

add:

```tsx
import { CurrencyProvider } from "./contexts/CurrencyContext";
```

- [ ] **Step 4: JournalApp.tsx — wrap provider**

In `src/JournalApp.tsx`, the `return` currently is:

```tsx
  return (
    <AuthProvider>
      <div className="dark">
```

…ending with:

```tsx
      </div>
    </AuthProvider>
  );
```

Change the open to:

```tsx
  return (
    <AuthProvider>
      <CurrencyProvider>
      <div className="dark">
```

…and the close to:

```tsx
      </div>
      </CurrencyProvider>
    </AuthProvider>
  );
```

- [ ] **Step 5: Run the test (lint)**

Run: `npm run lint`
Expected: PASS (exit 0).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/JournalApp.tsx
git commit -m "Wrap both entry points in CurrencyProvider"
```

---

### Task 3: CurrencyToggle component

**Files:**
- Create: `src/components/layout/CurrencyToggle.tsx`

This mirrors the existing Export dropdown pattern in `Dashboard.tsx` (`DropdownMenu` + `DropdownMenuTrigger render={<Button .../>}` + `DropdownMenuContent` + `DropdownMenuItem`). `CurrencyToggle.tsx` lives in `src/components/layout/`, so it imports siblings via `../ui/...` and the context via `../../contexts/...`.

- [ ] **Step 1: Create the component**

Create `src/components/layout/CurrencyToggle.tsx` with exactly:

```tsx
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useCurrency, CURRENCIES } from "../../contexts/CurrencyContext";

export function CurrencyToggle() {
  const { currency, setCurrency, symbol } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="font-mono h-9 gap-1.5 shrink-0"
          />
        }
      >
        <span className="tabular-nums">{symbol}</span>
        <span className="text-muted-foreground">{currency}</span>
        <ChevronDown size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-background border-border min-w-[140px]"
      >
        {CURRENCIES.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setCurrency(c.code)}
            className={`font-mono cursor-pointer ${
              c.code === currency ? "text-primary" : ""
            }`}
          >
            <span className="w-8 tabular-nums">{c.symbol}</span>
            {c.code}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Run the test (lint)**

Run: `npm run lint`
Expected: PASS (exit 0). Component is not yet mounted anywhere; it only needs to type-check against the existing `Button`/`DropdownMenu` primitives.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/CurrencyToggle.tsx
git commit -m "Add CurrencyToggle dropdown component"
```

---

### Task 4: Mount toggle in Dashboard + Dashboard display & export call sites

**Files:**
- Modify: `src/pages/Dashboard.tsx` (header mount; lines ~150, ~185, ~218, ~236, ~350, ~365)

Line numbers are pre-edit references; match on the exact strings shown.

- [ ] **Step 1: Add imports**

In `src/pages/Dashboard.tsx`, below the existing line:

```tsx
import { useAuth } from "../contexts/AuthContext";
```

add:

```tsx
import { useCurrency } from "../contexts/CurrencyContext";
import { CurrencyToggle } from "../components/layout/CurrencyToggle";
```

- [ ] **Step 2: Read currency in the component**

In `src/pages/Dashboard.tsx`, the component body has:

```tsx
  const { user, logout } = useAuth();
```

Immediately after that line add:

```tsx
  const { currency, symbol } = useCurrency();
```

- [ ] **Step 3: Mount the toggle before the New Trade button**

Find:

```tsx
          <div className="flex items-center gap-4 relative z-50">
             <Button className="gap-2 shrink-0 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-mono transition-all hover:scale-105" onClick={() => navigate("/journal/new-trade")}>
               <Plus size={16} /> New Trade
             </Button>
          </div>
```

Replace with (CurrencyToggle added as the first child, left of the button):

```tsx
          <div className="flex items-center gap-4 relative z-50">
             <CurrencyToggle />
             <Button className="gap-2 shrink-0 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-mono transition-all hover:scale-105" onClick={() => navigate("/journal/new-trade")}>
               <Plus size={16} /> New Trade
             </Button>
          </div>
```

- [ ] **Step 4: Swap current-equity symbol**

Find:

```tsx
                ${currentEquity.toFixed(2)}
```

Replace with:

```tsx
                {symbol}{currentEquity.toFixed(2)}
```

- [ ] **Step 5: Swap net-cashflow symbol**

Find:

```tsx
                  Net cashflow {netCashflow >= 0 ? "+" : "−"}${Math.abs(netCashflow).toFixed(2)}
```

Replace with:

```tsx
                  Net cashflow {netCashflow >= 0 ? "+" : "−"}{symbol}{Math.abs(netCashflow).toFixed(2)}
```

- [ ] **Step 6: CSV export — currency in PnL header**

In `downloadCSV`, find:

```tsx
    const headers = ["Symbol", "Date", "Time", "Type", "Outcome", "Lot Size", "Price", "SL", "TP", "PnL", "Notes"];
```

Replace with:

```tsx
    const headers = ["Symbol", "Date", "Time", "Type", "Outcome", "Lot Size", "Price", "SL", "TP", `PnL (${currency})`, "Notes"];
```

- [ ] **Step 7: XLSX export — currency in PnL header**

In `downloadXLSX`, find the identical line:

```tsx
    const headers = ["Symbol", "Date", "Time", "Type", "Outcome", "Lot Size", "Price", "SL", "TP", "PnL", "Notes"];
```

Replace with:

```tsx
    const headers = ["Symbol", "Date", "Time", "Type", "Outcome", "Lot Size", "Price", "SL", "TP", `PnL (${currency})`, "Notes"];
```

> Note: Steps 6 and 7 edit the same string in two different functions. After Step 6, the only remaining exact match is the one in `downloadXLSX` — apply Step 7 to that occurrence.

- [ ] **Step 8: PDF export — currency in PnL header**

In `downloadPDF`, find:

```tsx
    const headers = [["Symbol", "Date", "Time", "Type", "Outcome", "Lot Size", "Price", "SL", "TP", "PnL"]];
```

Replace with:

```tsx
    const headers = [["Symbol", "Date", "Time", "Type", "Outcome", "Lot Size", "Price", "SL", "TP", `PnL (${currency})`]];
```

- [ ] **Step 9: PDF export — inline PnL symbol**

In `downloadPDF`, find:

```tsx
        pnlValue !== undefined ? `$${pnlValue.toFixed(2)}` : ""
```

Replace with:

```tsx
        pnlValue !== undefined ? `${symbol}${pnlValue.toFixed(2)}` : ""
```

- [ ] **Step 10: Run the test (lint)**

Run: `npm run lint`
Expected: PASS (exit 0). No unused-variable error: both `currency` and `symbol` are now referenced.

- [ ] **Step 11: Manual check**

Run: `npm run dev`, open the Dashboard. Confirm: a `$ USD ▾` control sits immediately left of "+ New Trade"; opening it lists USD/SGD/EUR/GBP; selecting SGD changes the equity heading and net-cashflow pill to `S$`. Reload — selection persists. Export a CSV and confirm the PnL header reads `PnL (SGD)` while values stay numeric.

- [ ] **Step 12: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "Mount CurrencyToggle and apply currency to Dashboard + exports"
```

---

### Task 5: Page call sites (Cashflows, Strategies, Risk Calculator, New Trade)

**Files:**
- Modify: `src/pages/Cashflows.tsx` (lines ~175, ~179, ~184, ~229, ~316)
- Modify: `src/pages/StrategiesDashboard.tsx` (line ~92)
- Modify: `src/pages/RiskCalculator.tsx` (lines ~208, ~218, ~337, ~347)
- Modify: `src/pages/NewTrade.tsx` (line ~371)

All four are pages in `src/pages/`, so the context import path is `../contexts/CurrencyContext`.

- [ ] **Step 1: Cashflows — import + hook**

In `src/pages/Cashflows.tsx`, add this import alongside the other imports at the top of the file:

```tsx
import { useCurrency } from "../contexts/CurrencyContext";
```

Then, at the top of the `Cashflows` component body (with the other hooks), add:

```tsx
  const { symbol } = useCurrency();
```

- [ ] **Step 2: Cashflows — deposits total**

Find:

```tsx
          <div className="text-2xl font-bold font-mono mt-1 text-[#22c55e]">${totals.deposits.toFixed(2)}</div>
```

Replace with:

```tsx
          <div className="text-2xl font-bold font-mono mt-1 text-[#22c55e]">{symbol}{totals.deposits.toFixed(2)}</div>
```

- [ ] **Step 3: Cashflows — withdrawals total**

Find:

```tsx
          <div className="text-2xl font-bold font-mono mt-1 text-[#ef4444]">${totals.withdrawals.toFixed(2)}</div>
```

Replace with:

```tsx
          <div className="text-2xl font-bold font-mono mt-1 text-[#ef4444]">{symbol}{totals.withdrawals.toFixed(2)}</div>
```

- [ ] **Step 4: Cashflows — net total**

Find:

```tsx
            {totals.net >= 0 ? "+" : "−"}${Math.abs(totals.net).toFixed(2)}
```

Replace with:

```tsx
            {totals.net >= 0 ? "+" : "−"}{symbol}{Math.abs(totals.net).toFixed(2)}
```

- [ ] **Step 5: Cashflows — per-row amount**

Find:

```tsx
                        {cf.type === "deposit" ? "+" : "−"}${cf.amount.toFixed(2)}
```

Replace with:

```tsx
                        {cf.type === "deposit" ? "+" : "−"}{symbol}{cf.amount.toFixed(2)}
```

- [ ] **Step 6: Cashflows — delete-confirm text**

Find:

```tsx
                <>This will permanently remove the {toDelete.type} of ${toDelete.amount.toFixed(2)} on {format(new Date(toDelete.date), "MMM d, yyyy")}.</>
```

Replace with:

```tsx
                <>This will permanently remove the {toDelete.type} of {symbol}{toDelete.amount.toFixed(2)} on {format(new Date(toDelete.date), "MMM d, yyyy")}.</>
```

- [ ] **Step 7: StrategiesDashboard — import + hook**

In `src/pages/StrategiesDashboard.tsx`, add at the top with the other imports:

```tsx
import { useCurrency } from "../contexts/CurrencyContext";
```

At the top of the `StrategiesDashboard` component body add:

```tsx
  const { symbol } = useCurrency();
```

> If the strategy rows are rendered by a separate child component within this file rather than inline in `StrategiesDashboard`, put the `useCurrency()` call in whichever component directly contains the line edited in Step 8 (a hook must be called inside the component that renders it). Verify by checking which function's JSX contains `strat.totalProfit`.

- [ ] **Step 8: StrategiesDashboard — total profit**

Find:

```tsx
                        {strat.totalProfit >= 0 ? "+" : ""}${strat.totalProfit.toFixed(2)}
```

Replace with:

```tsx
                        {strat.totalProfit >= 0 ? "+" : ""}{symbol}{strat.totalProfit.toFixed(2)}
```

- [ ] **Step 9: RiskCalculator — import + hook**

In `src/pages/RiskCalculator.tsx`, add at the top with the other imports:

```tsx
import { useCurrency } from "../contexts/CurrencyContext";
```

At the top of the `RiskCalculator` component body add:

```tsx
  const { symbol } = useCurrency();
```

- [ ] **Step 10: RiskCalculator — "Account Equity" label**

Find:

```tsx
                    <Label>Account Equity ($)</Label>
```

Replace with:

```tsx
                    <Label>Account Equity ({symbol})</Label>
```

- [ ] **Step 11: RiskCalculator — "Fixed" select item**

Find:

```tsx
                          <SelectItem value="fixed">Fixed ($)</SelectItem>
```

Replace with:

```tsx
                          <SelectItem value="fixed">Fixed ({symbol})</SelectItem>
```

- [ ] **Step 12: RiskCalculator — actual risk**

Find:

```tsx
                             <p className="text-lg font-bold text-red-400 font-mono">${results.actualRisk.toFixed(2)}</p>
```

Replace with:

```tsx
                             <p className="text-lg font-bold text-red-400 font-mono">{symbol}{results.actualRisk.toFixed(2)}</p>
```

- [ ] **Step 13: RiskCalculator — reward**

Find:

```tsx
                                 <p className="text-lg font-bold text-green-400 font-mono">${results.reward.toFixed(2)}</p>
```

Replace with:

```tsx
                                 <p className="text-lg font-bold text-green-400 font-mono">{symbol}{results.reward.toFixed(2)}</p>
```

- [ ] **Step 14: NewTrade — import + hook**

In `src/pages/NewTrade.tsx`, add at the top with the other imports:

```tsx
import { useCurrency } from "../contexts/CurrencyContext";
```

At the top of the `NewTrade` component body add:

```tsx
  const { symbol } = useCurrency();
```

- [ ] **Step 15: NewTrade — "Final PnL" label**

Find:

```tsx
               <Label htmlFor="pnlAmount">Final PnL ($) (Optional)</Label>
```

Replace with:

```tsx
               <Label htmlFor="pnlAmount">Final PnL ({symbol}) (Optional)</Label>
```

- [ ] **Step 16: Run the test (lint)**

Run: `npm run lint`
Expected: PASS (exit 0).

- [ ] **Step 17: Manual check**

With `npm run dev` running and SGD selected on the Dashboard: open Cashflows (totals, rows, delete dialog show `S$`), Strategies (profit shows `S$`), Risk Calculator (labels + results show `S$`), New Trade (PnL label shows `(S$)`).

- [ ] **Step 18: Commit**

```bash
git add src/pages/Cashflows.tsx src/pages/StrategiesDashboard.tsx src/pages/RiskCalculator.tsx src/pages/NewTrade.tsx
git commit -m "Apply currency symbol to Cashflows/Strategies/RiskCalculator/NewTrade"
```

---

### Task 6: Dashboard child component call sites

**Files:**
- Modify: `src/components/dashboard/ListOverview.tsx` (line ~180)
- Modify: `src/components/dashboard/EquityCurve.tsx` (lines ~91, ~158, ~169)
- Modify: `src/components/dashboard/WinsVsLosses.tsx` (line ~169)
- Modify: `src/components/dashboard/CalendarView.tsx` (line ~72)
- Modify: `src/components/dashboard/TradeDetailDialog.tsx` (line ~82)

> **Import-path amendment (2026-05-19):** Per `CLAUDE.md` and the precedent set
> in Task 3's code review, **all NEW imports added in this task use the
> `@journal/` alias** — i.e. `import { useCurrency } from "@journal/contexts/CurrencyContext";`
> — NOT the relative `../../contexts/...` form shown in the code blocks below.
> Do not rewrite pre-existing relative imports in these files (out of scope).
>
> **Scope amendment (post Task-4 code review):** `EquityCurve.tsx:158`
> (Y-axis `tickFormatter`) and `WinsVsLosses.tsx:169` (total profit, formatted
> with `.toLocaleString`) were missed by the original `toFixed`-only sweep and
> are added below as Step 5b and Steps 9a–9b.

- [ ] **Step 1: ListOverview — import + hook**

In `src/components/dashboard/ListOverview.tsx`, add below:

```tsx
import { useAuth } from "../../contexts/AuthContext";
```

the line:

```tsx
import { useCurrency } from "../../contexts/CurrencyContext";
```

In the `ListOverview` component body, where it already calls `useAuth()`, add directly after it:

```tsx
  const { symbol } = useCurrency();
```

- [ ] **Step 2: ListOverview — row PnL**

Find:

```tsx
                  {pnlValue !== undefined ? `$${pnlValue.toFixed(2)}` : "-"}
```

Replace with:

```tsx
                  {pnlValue !== undefined ? `${symbol}${pnlValue.toFixed(2)}` : "-"}
```

- [ ] **Step 3: EquityCurve — import + hook**

In `src/components/dashboard/EquityCurve.tsx`, add below:

```tsx
import { format } from 'date-fns';
```

the line:

```tsx
import { useCurrency } from '../../contexts/CurrencyContext';
```

In the `EquityCurve` function body (first lines, before the `return`), add:

```tsx
  const { symbol } = useCurrency();
```

- [ ] **Step 4: EquityCurve — end balance**

Find:

```tsx
               {endBalance < 0 ? `-$${Math.abs(endBalance).toFixed(2)}` : `$${endBalance.toFixed(2)}`}
```

Replace with:

```tsx
               {endBalance < 0 ? `-${symbol}${Math.abs(endBalance).toFixed(2)}` : `${symbol}${endBalance.toFixed(2)}`}
```

- [ ] **Step 5: EquityCurve — chart tooltip formatter**

Find:

```tsx
               formatter={(value) => {
                 return [`$${Number(value).toFixed(2)}`, 'Balance']
               }}
```

Replace with:

```tsx
               formatter={(value) => {
                 return [`${symbol}${Number(value).toFixed(2)}`, 'Balance']
               }}
```

- [ ] **Step 5b: EquityCurve — Y-axis tick formatter**

Find:

```tsx
               tickFormatter={(val) => `$${val}`} 
```

Replace with:

```tsx
               tickFormatter={(val) => `${symbol}${val}`} 
```

> Note: the original line has a trailing space after `}` — preserve it; match
> the exact string. Only the `$` before `${val}` changes.

- [ ] **Step 6: CalendarView — import + hook**

In `src/components/dashboard/CalendarView.tsx`, add below:

```tsx
import { getTradeOutcome, getTradePnl, getTradeSymbol, getTradeDate } from "../../lib/tradeUtils";
```

the line:

```tsx
import { useCurrency } from "../../contexts/CurrencyContext";
```

In the `CalendarView` component body (top, before the render helper that contains `pnlResult`), add:

```tsx
  const { symbol } = useCurrency();
```

- [ ] **Step 7: CalendarView — per-day PnL**

Find:

```tsx
          {dynPct !== undefined ? `${dynPct > 0 ? '+' : ''}${dynPct.toFixed(2)}%` : (pnlResult > 0 ? `+$${pnlResult.toFixed(2)}` : pnlResult < 0 ? `-$${Math.abs(pnlResult).toFixed(2)}` : 'B/E')}
```

Replace with:

```tsx
          {dynPct !== undefined ? `${dynPct > 0 ? '+' : ''}${dynPct.toFixed(2)}%` : (pnlResult > 0 ? `+${symbol}${pnlResult.toFixed(2)}` : pnlResult < 0 ? `-${symbol}${Math.abs(pnlResult).toFixed(2)}` : 'B/E')}
```

> Only the two `$` in the `pnlResult` branches change. The `${dynPct...}%` percentage segment is left exactly as-is.

- [ ] **Step 8: TradeDetailDialog — import + hook**

In `src/components/dashboard/TradeDetailDialog.tsx`, add below:

```tsx
import { format } from "date-fns";
```

the line:

```tsx
import { useCurrency } from "../../contexts/CurrencyContext";
```

In the `TradeDetailDialog` component body (top, before the `return`), add:

```tsx
  const { symbol } = useCurrency();
```

- [ ] **Step 9: TradeDetailDialog — Net PNL (deliberate per spec: global symbol replaces the per-trade `accountCurrency` branch)**

Find:

```tsx
                    {pnlResult > 0 ? "+" : ""}{trade.accountCurrency === "USD" ? "$" : ""}{pnlResult?.toFixed(2)}{trade.accountCurrency && trade.accountCurrency !== "USD" ? ` ${trade.accountCurrency}` : ""}
```

Replace with:

```tsx
                    {pnlResult > 0 ? "+" : ""}{symbol}{pnlResult?.toFixed(2)}
```

- [ ] **Step 9a: WinsVsLosses — import + hook**

`src/components/dashboard/WinsVsLosses.tsx` is `export function WinsVsLosses({ trades }: Props)`. Add this import alongside the existing imports at the top of the file (use the `@journal/` alias):

```tsx
import { useCurrency } from "@journal/contexts/CurrencyContext";
```

At the top of the `WinsVsLosses` component body (before the `useMemo`/`return`), add:

```tsx
  const { symbol } = useCurrency();
```

- [ ] **Step 9b: WinsVsLosses — total profit summary**

Find (one line; uses `.toLocaleString`, two `$` occurrences — the `-$` loss branch and the `$` profit branch):

```tsx
                    {stats.totalProfit < 0 ? `-$${Math.abs(stats.totalProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${stats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
```

Replace with (swap BOTH `$` for `${symbol}`; `.toLocaleString` args and the sign branch unchanged):

```tsx
                    {stats.totalProfit < 0 ? `-${symbol}${Math.abs(stats.totalProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${symbol}${stats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
```

- [ ] **Step 10: Run the test (lint)**

Run: `npm run lint`
Expected: PASS (exit 0). If `tsc` flags `trade` as now-unused on the edited line, it will not — `trade` is used elsewhere in the component.

- [ ] **Step 11: Manual check**

With `npm run dev` and SGD selected: on the Dashboard, the List overview rows, Equity Curve heading + Y-axis ticks + hovered chart tooltip, the Win Vs Lose total-profit summary, and Calendar per-day badges all show `S$`. Click a trade card → the Trade Detail dialog Net PNL shows `S$` (no trailing currency code).

- [ ] **Step 12: Commit**

```bash
git add src/components/dashboard/ListOverview.tsx src/components/dashboard/EquityCurve.tsx src/components/dashboard/WinsVsLosses.tsx src/components/dashboard/CalendarView.tsx src/components/dashboard/TradeDetailDialog.tsx
git commit -m "Apply currency symbol to Dashboard child components"
```

---

### Task 7: Full-sweep verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm no remaining hardcoded currency in display/export**

Run:

```bash
grep -rnF '$' --include="*.tsx" src/pages src/components | grep -F 'toFixed' | grep -vF '${'
```

Expected: no lines that are a literal currency-symbol display (each remaining `$` should be a `${...}` template interpolation, not a currency prefix). Investigate any line that still shows a hardcoded `$<number>` display.

- [ ] **Step 2: Run the test (lint)**

Run: `npm run lint`
Expected: PASS (exit 0).

- [ ] **Step 3: Build sanity check**

Run: `npm run build`
Expected: Vite build completes with no TypeScript or bundling errors.

- [ ] **Step 4: Full manual pass**

`npm run dev`. For each of USD → SGD → EUR → GBP selected on the Dashboard, spot-check Dashboard (equity, net cashflow), Cashflows, Strategies, Risk Calculator, New Trade, Calendar, Equity Curve (incl. chart tooltip), List Overview, Trade Detail dialog — every amount shows the chosen symbol, every number is unchanged. Reload the page → selection persists. Export CSV/XLSX/PDF → PnL header/symbol reflects the selection, numeric values unchanged.

---

### Task 8: Push

**Files:** none

- [ ] **Step 1: Push to main**

Per CLAUDE.md auto-push policy (lint already green from Task 7):

```bash
git push origin main
```

- [ ] **Step 2: Remind about the submodule bump**

Output this reminder to the user verbatim — it is the step that actually ships the change to `warrenlimzf.com/journal`:

> Pushed to `trading-journal` `main`. To deploy: in `personal-website` run
> `git submodule update --remote src/journal && git add src/journal && git commit -m "Sync trading-journal submodule" && git push`.

---

## Self-Review

**Spec coverage:**
- Symbol-swap-only, no conversion → all call-site steps are pure symbol substitution; numbers untouched. ✔
- 4-currency picker (USD/SGD/EUR/GBP), default USD → Task 1 `CURRENCIES` + `readStored` default. ✔
- Placement left of "+ New Trade" → Task 4 Step 3. ✔
- Global context + `localStorage` key `tj:currency` → Task 1. ✔
- Wired into both `App.tsx` and `JournalApp.tsx` → Task 2. ✔
- All display call sites in the spec table → Tasks 4 (Dashboard), 5 (pages), 6 (child components); every row of the spec table maps to a step. ✔
- Exports follow toggle: PDF inline symbol + CSV/XLSX/PDF `PnL (<code>)` header → Task 4 Steps 6–9. ✔
- TradeDetailDialog deliberate decision (global symbol, drop per-trade code) → Task 6 Step 9. ✔
- Testing = lint + manual → every task ends with `npm run lint` + a manual check; Task 7 full sweep + `npm run build`. ✔
- Post-merge submodule reminder → Task 8 Step 2. ✔

**Placeholder scan:** No TBD/TODO; every code step shows exact before/after content. ✔

**Type consistency:** `useCurrency()` returns `{ currency, setCurrency, symbol }` (Task 1) and is destructured consistently as `symbol` (and `currency` where the export header needs the code) everywhere. `CurrencyCode` and `CURRENCIES` names match between Task 1 and Task 3. ✔
