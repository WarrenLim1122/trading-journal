# Currency Toggle — Design Spec

**Date:** 2026-05-19
**Status:** Approved (pending user spec review)
**Scope:** Currency toggle only. The separate "PropFirm journal" feature is parked for its own future planning session.

## Goal

A small currency picker beside (to the left of) the "+ New Trade" button on the
Dashboard. Selecting a currency swaps the currency **symbol** everywhere in the
app. **Numbers are never converted** — only the symbol character changes. No
data, calculations, routing, or page structure change.

## Decisions (locked with user)

1. **Symbol swap only.** No exchange rates, no number conversion. `15426.77`
   stays `15426.77`; only the leading symbol changes.
2. **Currencies:** a small picker, not a binary toggle:
   | Code | Symbol |
   |------|--------|
   | USD  | `$`    |
   | SGD  | `S$`   |
   | EUR  | `€`    |
   | GBP  | `£`    |
   Default: **USD**.
3. **Placement:** in `Dashboard.tsx`'s top-right header flex row, immediately
   **before** the `<Button>New Trade</Button>`.
4. **Global + persisted:** state lives in a React context, persisted to
   `localStorage` (key `tj:currency`), so the choice survives reloads and
   applies on every page even though the picker control only renders on the
   Dashboard.
5. **Exports follow the toggle** (see "Exports" below for the exact mechanism).

## Architecture

### New: `src/contexts/CurrencyContext.tsx`

Exposes a hook `useCurrency()` returning:

- `currency: "USD" | "SGD" | "EUR" | "GBP"` — current selection.
- `setCurrency(c)` — updates state and writes `localStorage["tj:currency"]`.
- `symbol: string` — derived display symbol (`$`, `S$`, `€`, `£`).

Initial state reads `localStorage["tj:currency"]`, falling back to `"USD"` if
absent or invalid. A `CURRENCIES` constant (code → symbol map) is the single
source of truth, exported for the picker.

### Provider wiring (both entry points, kept in sync per CLAUDE.md)

Wrap `<CurrencyProvider>` just inside `<AuthProvider>` (around the existing
`<div className="dark">`) in **both**:

- `src/App.tsx` (standalone)
- `src/JournalApp.tsx` (embedded in personal-website)

Order vs. AuthProvider does not matter (no dependency between them); placing it
inside AuthProvider keeps the diff minimal and consistent across both files.

### New: `src/components/layout/CurrencyToggle.tsx`

A compact dropdown control reusing the existing shadcn `dropdown-menu`
primitive, styled to match the existing dark / `font-mono` / bordered button
aesthetic next to it. Trigger shows the current `symbol` + `code` (e.g.
`$ USD`) with a chevron. Menu lists the four currencies; selecting one calls
`setCurrency`. Rendered in `Dashboard.tsx` inside the header's
`<div className="flex items-center gap-4 relative z-50">`, **before** the New
Trade `<Button>`.

## Call-site changes (mechanical)

Each site below currently hardcodes `$`. Replace the literal `$` with the
`symbol` from `useCurrency()`. **All surrounding sign/decimal/formatting logic
is left exactly as-is** — only the symbol character changes.

| File | Line(s) | What |
|------|---------|------|
| `src/pages/Dashboard.tsx` | 350 | Current equity |
| `src/pages/Dashboard.tsx` | 365 | Net cashflow pill |
| `src/pages/Cashflows.tsx` | 175, 179, 184, 229, 316 | Deposits / withdrawals / net / row amount / delete-confirm text |
| `src/pages/StrategiesDashboard.tsx` | 92 | Strategy total profit |
| `src/pages/RiskCalculator.tsx` | 208, 218, 337, 338, 347 | "Account Equity ($)", "Fixed ($)", actual risk value, **"Actual Risk ($)" label**, reward |
| `src/pages/Cashflows.tsx` (form) | 274 | **"Amount ($)" input label** |
| `src/pages/NewTrade.tsx` | 371 | "Final PnL ($)" field label |
| `src/components/dashboard/AddTradeDialog.tsx` | 276 | **"PnL ($)" input label** |
| `src/components/dashboard/EditTradeDialog.tsx` | 335 | **"PnL ($)" input label** |
| `src/components/dashboard/ListOverview.tsx` | 180 | Row PnL |
| `src/components/dashboard/EquityCurve.tsx` | 91, 158, 169 | End balance + recharts Y-axis tick formatter + tooltip formatter |
| `src/components/dashboard/WinsVsLosses.tsx` | 169 | Total profit summary (uses `.toLocaleString`) |
| `src/components/dashboard/CalendarView.tsx` | 72 | Per-day PnL badge |
| `src/components/dashboard/TradeDetailDialog.tsx` | 82 | PnL (see note) |

> **Spec amendment (2026-05-19, post code-review of Task 4):** `EquityCurve.tsx:158`
> and `WinsVsLosses.tsx:169` were missed by the original discovery sweep, which
> grepped only `toFixed`. `WinsVsLosses` formats with `.toLocaleString`, and the
> EquityCurve Y-axis tick is a separate `tickFormatter`. Both are genuine
> currency-display sites and are now in scope (implemented in Task 6).
>
> **Spec amendment (2026-05-19, post spec-review of Task 5):** the original
> discovery grep filtered out lines containing `className`, which hid every
> `($)` *label* that shares its line with a class attribute. Unfiltered sweep
> added: `RiskCalculator.tsx:338` ("Actual Risk ($)"),
> `Cashflows.tsx:274` ("Amount ($)" form label),
> `AddTradeDialog.tsx:276` and `EditTradeDialog.tsx:335` ("PnL ($)" labels).
> The first two are in Task-5 files (`symbol` already in scope → label swap
> only); the two dialogs are added to Task 6 (need import + hook + swap).

**TradeDetailDialog note (deliberate decision):** line 82 currently shows `$`
only when `trade.accountCurrency === "USD"` and otherwise appends the trade's
real account currency code (e.g. `123.45 SGD`). Because the toggle is an
explicit *global cosmetic display preference* and the user wants **all** `$` to
follow it uniformly, this branch is replaced with the global `symbol` prefix
and the per-trade `accountCurrency` suffix is dropped. Flagged here so it can
be vetoed at spec review if the factual per-trade currency should be preserved
instead.

## Exports (CSV / Excel / PDF in `Dashboard.tsx`)

Exports must follow the toggle, but the mechanism differs by format because
CSV/XLSX PnL cells are **raw numbers**, not symbol-prefixed strings:

- **PDF** (`downloadPDF`, line 236): inline `` `$${pnlValue.toFixed(2)}` `` —
  swap the `$` for the active `symbol` directly.
- **CSV** (`downloadCSV`, line 150) and **XLSX** (`downloadXLSX`, line 185):
  the PnL cell stays a raw number (so spreadsheet columns remain numeric). The
  `"PnL"` header in the `headers` array becomes `` `PnL (${currency})` ``
  (e.g. `PnL (SGD)`), so the exported file still reflects the chosen currency
  without breaking numeric cells.
- **PDF header** (line 218): same treatment — `"PnL"` → `PnL (<code>)` for
  consistency with CSV/XLSX, in addition to the inline symbol swap.

These export functions live inside the `Dashboard` component, so they can read
`currency`/`symbol` from the same `useCurrency()` hook used for display.

## Out of scope

- No currency **conversion** / exchange rates.
- No Settings-page entry; the single Dashboard picker drives global state.
- No per-page pickers.
- The PropFirm journal feature (separate spec, planned later).

## Testing

- `npm run lint` (tsc `--noEmit`) must pass — no type errors from the new
  context/hook or call-site edits.
- Manual verification: select each of USD/SGD/EUR/GBP on the Dashboard and
  confirm the symbol changes on: Dashboard equity + net cashflow, Cashflows
  page, Strategies page, Risk Calculator, Calendar, Equity Curve (incl. chart
  tooltip), List Overview, and the Trade Detail dialog; reload the page and
  confirm the selection persists; run a CSV/XLSX/PDF export and confirm the
  PnL header/symbol reflects the selection while numeric values are unchanged.

## Post-merge reminder

Per CLAUDE.md: after pushing to `main`, the change only reaches
`warrenlimzf.com/journal` once the `personal-website` submodule pointer is
bumped (`git submodule update --remote src/journal` → commit → push there).
