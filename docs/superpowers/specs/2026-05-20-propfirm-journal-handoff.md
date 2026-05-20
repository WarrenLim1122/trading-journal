# PropFirm Journal — Design Spec + Implementation Handoff

**Date:** 2026-05-20
**Status:** Design approved by Warren. NOT YET IMPLEMENTED.
**For:** the next Claude Code session in this repo.
**This document is the source of truth** — combined design spec + step-by-step plan + context dump. Treat every decision below as locked unless Warren explicitly re-opens it.

---

## 0. How to use this document

1. Read **everything** before touching code. The "Locked decisions" and "Critical clarifications" sections encode design conclusions that took an entire session to converge — do not re-litigate.
2. Re-read this repo's `CLAUDE.md` for the standing workflow (auto-push to `main`, submodule bump in `personal-website` to deploy, two entry-point sync rule).
3. Workflow for implementation:
   - Skim the **Implementation Plan** (§9). It's broken into bite-sized tasks (A → F).
   - Use the **superpowers:subagent-driven-development** skill if available — one implementer subagent per task + spec-compliance review + code-quality review. (That is the flow Warren chose for the previous feature and it worked well.)
   - Fall back to inline execution via **superpowers:executing-plans** if subagents aren't available.
4. After each task: `npm run lint` must pass; commit; do not push until §10 verification step.
5. After the full implementation: push to `main`, then remind Warren to bump the submodule in `personal-website` (the deploy gate).
6. If you find genuine spec gaps mid-implementation (the previous feature had two — the original sweep had blind spots), amend this document inline + commit the amendment as its own change, just like was done for the currency-toggle spec.

---

## 1. Background — what we're building and why

A new **PropFirm** tab in the left sidebar (between **Strategies** and **Risk Calculator**) that archives the trading-journal Dashboard in distinct phases, one per prop-firm session. Warren's own framing:

> *"Basically this project is for us to track our trading history in each stage of propfirm. And we will be changing propfirm quite often, once we either burst it or enter funded phase. So in the dashboard, we want to have a button of 'Publish', then basically that 'Publish' button will need us to fill in the propfirm details etc... then it will store whatever that's in the Dashboard 1:1 to the PropFirm tab. With that, once everything is saved into a folder in PropFirm tab, the dashboard will be cleaned, and start from scratch again, then we'll trade again (but the equity remains as it is from what has earned before publishing the dashboard to an open-able folder in PropFirm tab (the design of the folder should be something similar to that of Strategies tab."*

> *"Basically a journal to track our equity change from time to time we buy prop (beginning and change and ending etc data)"*

> *"whenever i click onto the specific propfirm, it should show me the Dashboard of what has been archived and cleaned from the main dashboard, so your understanding should be: while the main dashboard is cleaned, everything is actually archived into a new folder of propfirm."*

And critically, on cashflows behavior:

> *"if we lose personal account (what we're tracking now), what we earn from prop firm profit sharing might be used to deposit into the personal account for recovery, so it's actually a feature like once we closed this session of propfirm and archive it, we later move on to add the cashflow into that particular folder to show what's our net in that folder, and this get reflected on equity as well. and it's not we add only we archive, because most likely the profit sharing money is going to come after we end the propfirm account and create a new one (archive the old one)"*

---

## 2. Locked design decisions (DO NOT re-litigate)

These were each surfaced as explicit AskUserQuestion choices Warren picked, or follow directly from his free-text answers. Don't re-ask them.

1. **One active phase at a time.** Sequential, not parallel.
2. **Late cashflows propagate forward.** Active equity is one continuous personal-account number: `seed + Σ(every trade P&L across every phase) + Σ(every cashflow across every phase)`. Adding a cashflow to an archived folder weeks later auto-updates today's equity.
3. **Phase membership is explicit (tag-based), NOT time-based.** A trade/cashflow has an optional `propPhaseId`. Missing = active. Set = belongs to that specific archived phase. This is what allows a profit-share *dated* after FTMO closed to *belong* to the FTMO folder.
4. **Trades in archived phases are frozen (read-only).** No edit/delete affordances on archived rows. The bot writes only into the active phase (it writes untagged docs; untagged = active).
5. **Cashflows in archived phases are full CRUD.** A cashflow added inside an archived folder is tagged with that folder's phase id, regardless of date.
6. **Publish form fields (minimal set):** Prop firm name (required), Account size ($, paper money — display only), Stage (select), Outcome (select), Notes (textarea). Nothing else. Warren explicitly rejected profit target / max drawdown / profit share % / MT5 account id as form fields.
7. **Folder card visual style** mirrors `StrategiesDashboard` cards. Clicking a folder opens a Dashboard-shaped detail view scoped to that phase.
8. **PropFirm tab sits between Strategies and Risk Calculator** in the sidebar, both entry points (`App.tsx` and `JournalApp.tsx`) updated.
9. **Publish button placement:** Dashboard top-right header row, between the existing `CurrencyToggle` and `+ New Trade` button. Lower-emphasis (outline) styling — used infrequently.
10. **Empty PropFirm tab state:** `No prop firms archived yet. Click 'Publish phase' on the Dashboard when you finish a session.`
11. **No migration step.** Existing untagged trades/cashflows are the "active first phase" until Warren publishes.
12. **Strategies tab unchanged.** It continues aggregating across all trades regardless of phase. Per-phase strategy stats live inside the phase detail page.
13. **Currency toggle** (shipped in the previous session) applies throughout the new pages too. Use `useCurrency()` from `@journal/contexts/CurrencyContext`.
14. **Imports use the `@journal/` alias** for all NEW imports (per `CLAUDE.md`).
15. **No automated tests in this repo.** Verification gate is `npm run lint` (`tsc --noEmit`) + manual checks.
16. **Both entry points must stay in sync** (`App.tsx`, `JournalApp.tsx`) — any new route added to one must be added to the other.

### Decisions that were considered and explicitly rejected
- ❌ Cashflows carry forward across phases (Warren chose archive-with-phase + late-add).
- ❌ Burst-vs-funded different starting-balance treatment (resolved by "late cashflows propagate always" → simpler unified model).
- ❌ "Override starting balance at Publish time" form field — Warren's confirmed equity model makes it unnecessary.
- ❌ Time-window cursor archiving model (it can't represent profit-share dated after a phase closed).
- ❌ Frozen-snapshot subcollection approach (massive writes, destructive, redundant given tagging).

---

## 3. Critical clarifications the next Claude must internalize

These are the easy-to-miss conceptual points. Read them twice.

### 3.1 The equity formula must change

**Today (in `src/pages/Dashboard.tsx`, around line 126):**
```ts
const { currentEquity, equityPercentChange } = useMemo(() => {
  const startNum = parseFloat(startBalance) || 0;
  let tradingPnl = 0;
  filteredTrades.forEach(trade => {
    const pnl = getTradePnl(trade);
    tradingPnl += pnl;
  });
  const balance = startNum + netCashflow + tradingPnl;
  // ...
}, [filteredTrades, startBalance, netCashflow]);
```
Note `filteredTrades` (post-user-filter active-phase trades) and `netCashflow` (sum of active cashflows). After this feature:

**New:**
```ts
const { currentEquity, equityPercentChange } = useMemo(() => {
  const startNum = parseFloat(startBalance) || 0;
  // tradingPnl must aggregate ALL trades regardless of propPhaseId
  let tradingPnl = 0;
  allTrades.forEach(t => { tradingPnl += getTradePnl(t); });
  // netCashflow must aggregate ALL cashflows regardless of propPhaseId
  let totalCashflow = 0;
  allCashflows.forEach(c => { totalCashflow += c.type === "deposit" ? c.amount : -c.amount; });
  const balance = startNum + totalCashflow + tradingPnl;
  // ...
}, [allTrades, startBalance, allCashflows]);
```

`allTrades` / `allCashflows` are the **unfiltered** lists fetched from Firestore. The Dashboard already fetches all of `users/{uid}/trades` and `users/{uid}/cashflows`; we just need to compute equity from the unfiltered totals, while the display tables/charts continue to filter to untagged (active-phase) docs only.

### 3.2 Untagged = active. Tagged = archived to that phase.

Throughout the codebase, the conceptual rule is:
- `trade.propPhaseId == null/undefined` → trade belongs to the active phase. Editable. Shown on Dashboard.
- `trade.propPhaseId == "<some-id>"` → trade belongs to that archived phase. Read-only. Shown only inside that folder.
- Same for `cashflow.propPhaseId`.

### 3.3 No new field on `Trade`/`Cashflow` types means no new field on the bot

The bot ([`arbitrage-trading`](https://github.com/WarrenLim1122/arbitrage-trading)) keeps writing trades exactly as it does today — **untagged**. That's by design. The journal app does all the tagging client-side.

### 3.4 The Firestore update rule whitelist will reject unwhitelisted writes

Per recent commits in this repo (`Add closePrice to update whitelist so Close Price edits don't 403`), the Firestore rules for `users/{uid}/trades` and `users/{uid}/cashflows` only allow updating a fixed set of fields. **We must add `propPhaseId` to that whitelist** in both `firestore.rules` (this repo's copy) AND in the live Firebase console (the source of truth). If you forget the console update, publishes will 403 even though local lint+build pass.

### 3.5 Batched writes have a 500-op limit

The publish operation tags every currently-untagged trade + cashflow with the new phase id. Firestore `writeBatch` is capped at 500 ops. If Warren has more than ~500 untagged docs at publish time (he might, given the bot has been writing for a while), the service must paginate into multiple sequential batches. **Don't assume one batch suffices.**

### 3.6 Bot race during publish

While the publish operation runs, the bot may write a new trade. Behavior:
- The publish reads untagged docs at time T.
- The bot inserts a new untagged trade at time T+δ.
- The publish tags only the docs it read at T. The bot's T+δ insert remains untagged → joins the new active phase.

This is the **desired** behavior. Don't try to "fix" it — the natural Firestore semantics give the right answer.

### 3.7 The CurrencyContext + symbol applies everywhere

All currency rendering in new code uses `useCurrency()` from `@journal/contexts/CurrencyContext`. The sign-placement convention is sign-BEFORE-symbol (`-S$12.34`, not `S$-12.34`):
```tsx
{value < 0 ? "-" : ""}{symbol}{Math.abs(value).toFixed(2)}
```
or for template literals:
```tsx
`${value < 0 ? "-" : ""}${symbol}${Math.abs(value).toFixed(2)}`
```

### 3.8 Two-entry-point rule

Anything added to `src/App.tsx` (routes, providers) MUST also be added to `src/JournalApp.tsx`. Failure to do so means the feature works in standalone Vite (`npm run dev`) but breaks at `warrenlimzf.com/journal` (the embedded route).

---

## 4. Data model

### 4.1 New Firestore collection: `users/{uid}/propPhases/{phaseId}`

```ts
// src/types/propPhase.ts (new file)
export type PropPhaseStage =
  | "Challenge Phase 1"
  | "Challenge Phase 2"
  | "Verification"
  | "Funded"
  | "Other";

export type PropPhaseOutcome =
  | "Passed"
  | "Failed"
  | "Funded"
  | "Paid out"
  | "Other";

export interface PropPhase {
  id: string;
  userId: string;
  name: string;              // e.g. "FTMO"
  accountSize: number;       // paper $ — display only
  stage: PropPhaseStage;
  outcome: PropPhaseOutcome;
  notes?: string;
  startedAt: string;         // ISO — set at publish time = previous phase's closedAt, or null/seed
  closedAt: string;          // ISO — set at publish time = now
  startingBalance: number;   // snapshot of equity at startedAt (display only)
  endingBalance: number;     // snapshot of equity at closedAt (display only)
  createdAt: any;            // Firestore Timestamp
  updatedAt: any;
}
```

### 4.2 Field additions to existing types

```ts
// src/types/trade.ts — append to the Trade interface
propPhaseId?: string;  // undefined/null → active phase; set → archived phase id

// src/types/cashflow.ts — append to the Cashflow interface
propPhaseId?: string;
```

### 4.3 Firestore rules changes

In `firestore.rules` (this repo's reference copy) and in the Firebase console (source of truth):

```
match /users/{uid}/propPhases/{phaseId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

For the existing `users/{uid}/trades/{tradeId}` and `users/{uid}/cashflows/{id}` `update` rules: add `propPhaseId` to the whitelist of allowed fields. Match the same pattern used for `closePrice` in commit `98f33be`.

---

## 5. New routes

| Path (standalone, in App.tsx) | Path (embedded, in JournalApp.tsx) | Page |
|---|---|---|
| `/prop-firm` | `prop-firm` | `PropFirmDashboard` (list of folders) |
| `/prop-firm/:phaseId` | `prop-firm/:phaseId` | `PropFirmPhaseDetail` (Dashboard-shaped detail) |

Both must use `<ProtectedRoute>` (mirrors existing pages).

---

## 6. Files & components

### 6.1 New files
- `src/types/propPhase.ts` — interface above.
- `src/lib/propPhaseService.ts` — CRUD + publish batch operation. Mirrors style of `src/lib/cashflowService.ts`.
- `src/components/dashboard/PublishPhaseDialog.tsx` — modal form.
- `src/pages/PropFirmDashboard.tsx` — folder list page.
- `src/pages/PropFirmPhaseDetail.tsx` — Dashboard-shaped detail page (extracts shared logic with `Dashboard.tsx`; see §7).
- `src/components/propfirm/PhaseMetadataBar.tsx` — header strip on phase detail page showing prop firm info.
- `src/components/propfirm/EditPhaseMetadataDialog.tsx` — edit name/stage/outcome/notes after archive.
- `src/components/propfirm/DeletePhaseDialog.tsx` — confirmation + untag-and-delete operation.

### 6.2 Files to modify
- `src/types/trade.ts` — add `propPhaseId?: string`.
- `src/types/cashflow.ts` — add `propPhaseId?: string`.
- `src/lib/tradeService.ts` — accept `propPhaseId` on writes if any; ensure existing read returns the field.
- `src/lib/cashflowService.ts` — same.
- `src/pages/Dashboard.tsx`:
  - Equity computation aggregates ALL trades + ALL cashflows (§3.1).
  - Display tables/charts continue to filter to `propPhaseId == null` (active phase only).
  - Mount `<Publish phase>` button in header (between CurrencyToggle and New Trade).
- `src/components/layout/AppLayout.tsx` — add `{ name: "PropFirm", path: "/journal/prop-firm", icon: Archive }` between Strategies and Risk Calculator. Import the `Archive` icon from `lucide-react`.
- `src/App.tsx` and `src/JournalApp.tsx` — add the two new routes.
- `firestore.rules` — add the new collection rule + whitelist updates.

### 6.3 Reused infrastructure
- `useCurrency()` from `@journal/contexts/CurrencyContext` (already exists).
- All existing dashboard child components (`ChartOverview`, `ListOverview`, `CalendarView`, `EquityCurve`, `WinsVsLosses`, `TradeDetailDialog`) are reused on the phase detail page. They already take `trades` as props.
  - **Important:** `ListOverview` has inline edit/delete buttons today; on the phase detail page these must be hidden (read-only). Approach: add a `readOnly?: boolean` prop to `ListOverview` that hides the actions column, OR wrap usage in a context that signals read-only. **Recommendation:** add a `readOnly?: boolean` prop — minimal API change.
  - `AddTradeDialog` is NOT rendered on the phase detail page.
- Cashflow CRUD: extract the cashflow-list + add/edit/delete logic from `src/pages/Cashflows.tsx` into a reusable `<CashflowManager phaseId={phaseId} />` component (in `src/components/propfirm/CashflowManager.tsx` OR `src/components/cashflows/`). When `phaseId` is undefined → active phase (today's behavior). When set → that archived phase. Writes include `propPhaseId: phaseId` when set.

---

## 7. Shared logic between Dashboard and PhaseDetail

`Dashboard.tsx` is 537 lines and tangled — it owns: data fetching, filtering, tab state, exports, equity computation, and JSX. Don't blindly duplicate it for the phase detail page. Instead:

**Recommended refactor (do it as Task E1):**
1. Extract a `<TradeJournalView>` component that takes props: `trades`, `cashflows`, `startBalance`, `readOnly`, `headerSlot` (a ReactNode for the equity/header area). It renders the existing 5 tabs (Chart overview / List / Calendar / Win Vs Lose / Equity curve) and the existing filter bar.
2. `Dashboard.tsx` becomes a thin wrapper that fetches all trades+cashflows, filters to untagged, renders `<TradeJournalView readOnly={false} headerSlot={<DashboardEquityHeader/>} />` plus its own Publish button.
3. `PropFirmPhaseDetail.tsx` is a thin wrapper that fetches all trades+cashflows + the phase doc, filters trades+cashflows to `propPhaseId == phaseId`, renders `<TradeJournalView readOnly={true} headerSlot={<PhaseMetadataBar/>} />`.

**If you find the refactor too risky** mid-task (Dashboard.tsx is complex), fall back to:
- Keep `Dashboard.tsx` mostly as-is.
- Copy the tab structure into `PropFirmPhaseDetail.tsx` (deliberate duplication).
- Make sure the equity computation in BOTH pages aggregates across phases (§3.1).
- Document the duplication and file a follow-up to refactor later.

Either path is acceptable. The refactor is cleaner long-term but optional if it bloats the implementation session.

---

## 8. UX details

### 8.1 Publish button
- Label: `Publish phase`
- Icon: `Archive` (lucide-react) or `Upload`
- Variant: `outline`, smaller than New Trade (it's a rare action)
- Position: Dashboard header right-side, between `<CurrencyToggle />` and `<Button>New Trade</Button>`. The flex container is at `src/pages/Dashboard.tsx` around line 370.

### 8.2 PublishPhaseDialog
- Title: `Publish current phase`
- Body: form with Name (text), Account size (number), Stage (select), Outcome (select), Notes (textarea).
- Below the form, a non-editable summary block: `Trades archived: N   Cashflows archived: M   Starting balance: S$X   Ending balance: S$Y` (computed from current untagged data).
- Footer: `Cancel` / `Publish` (primary). Disable Publish while operation in flight; on success close dialog and refresh Dashboard.

### 8.3 PropFirm tab — folder card grid
Mirror `StrategiesDashboard` card grid style. Each card:
- Top row: prop firm name (bold) + outcome badge (color-coded: Passed = green, Failed = red, Funded = blue, Paid out = primary, Other = neutral)
- Account size chip (e.g., `$100k`)
- Stage label
- Start → End balance: `S$14,000 → S$8,500` (use the sign-before-symbol convention)
- Total P&L: `+S$2,300` or `-S$5,500` (color-coded by sign)
- Trade count, date range (e.g., `42 trades · May 1 – May 18, 2026`)
- Whole card is a `<Link to={`/journal/prop-firm/${phase.id}`}>` (route style follows existing repo convention with the `/journal/` prefix even though `JournalApp.tsx` uses relative routes — for `Link`/`Navigate` the absolute `/journal/...` path is used; see how Cashflows is linked from Dashboard).

### 8.4 Phase detail page
- Header strip (above the equity heading): `<PhaseMetadataBar phase={phase} />` showing name + stage + outcome badge + account size + start/end dates + notes, with a small `Edit details` button (opens `EditPhaseMetadataDialog`) and a `Delete folder` button (opens `DeletePhaseDialog`).
- Body: the standard 5-tab Dashboard view, scoped to this phase's trades. `readOnly` mode for trade rows.
- Above the tabs or in a side affordance: a `Manage cashflows` button → opens a focused cashflow CRUD scoped to this phase. (Or render the cashflow list inline in a sixth tab — at your discretion. Recommended: button + modal for less clutter.)

### 8.5 EditPhaseMetadataDialog
- Same fields as PublishPhaseDialog except no "Trades archived" summary block.
- Submitting calls `propPhaseService.updatePhase`.

### 8.6 DeletePhaseDialog
- Heavy red-button confirmation.
- Operation: batch update all trades + cashflows where `propPhaseId == phaseId` to remove the field (set to null / `FieldValue.delete()`), then delete the phase doc.
- Navigate back to `/journal/prop-firm` afterwards.
- Document this as an "escape hatch for accidental publishes."

---

## 9. Implementation plan (step-by-step)

> **Conventions**
> - Each task ends with `npm run lint` exit 0 + a `git commit`. Do not push until the final verification step.
> - Use the `@journal/` alias for ALL new imports.
> - When a code snippet shows the *new* state, you may need to read the file first to confirm the surrounding context — do not blind-edit if the find-string isn't present verbatim.
> - If you find a gap that isn't covered here mid-task, follow the precedent set in the currency-toggle work: amend this spec inline (with a dated "Spec amendment" note), commit the amendment as its own change, then proceed.

### Task A — Types, service, Firestore rules

- [ ] **A1: Create `src/types/propPhase.ts`** with the interface from §4.1.
- [ ] **A2: Add `propPhaseId?: string` to `Trade`** (`src/types/trade.ts`) and to `Cashflow` (`src/types/cashflow.ts`).
- [ ] **A3: Create `src/lib/propPhaseService.ts`** with these exported functions (mirror `cashflowService` style):
  - `getPhases(userId)` — read all `users/{uid}/propPhases`, sorted by `closedAt` desc.
  - `getPhase(userId, phaseId)` — single doc.
  - `updatePhase(userId, phaseId, partial)` — for the EditPhaseMetadataDialog.
  - `deletePhase(userId, phaseId)` — see §8.6. Batched: untag trades + cashflows where `propPhaseId == phaseId`, then delete the phase doc.
  - `publishPhase(userId, metadata, allTrades, allCashflows, startBalance)`:
    - Compute the new phase's `startingBalance` (use the *first archived phase's* startingBalance + cumulative ending of all prior phases — i.e., `startBalance + sum(archived phases' net) + sum(any tagged trades P&L) + sum(any tagged cashflows)`). For the *very first* publish, `startingBalance = startBalance` (the localStorage seed).
    - Compute `endingBalance` = `startingBalance + Σ(untagged trades P&L) + Σ(untagged cashflow net)`.
    - Compute `startedAt`: previous phase's `closedAt` if any phases exist; else the earliest untagged-trade date (fall back to seed creation, or just `null` if no trades exist).
    - Compute `closedAt = new Date().toISOString()`.
    - Create the phase doc.
    - Paginate untagged trades into batches of up to 500, each batch updates `propPhaseId = newPhaseId`.
    - Paginate untagged cashflows the same way.
    - Return the new phase id.
- [ ] **A4: Update `firestore.rules`** — add the `propPhases` collection block and add `propPhaseId` to the trades + cashflows update whitelist. Match the pattern used in commit `98f33be`. Document at the top of this file: *"Mirror these rules in the Firebase Console — that is the live source of truth; the local file is for reference only."*
- [ ] **A5: Commit** `feat: propPhase types + service + Firestore rules`.

> **Manual step (Warren):** after A5 is committed, Warren must update the live Firestore rules in the Firebase console. The next Claude must remind him explicitly. Without this step, publish will 403.

### Task B — Equity computation change

- [ ] **B1: In `src/pages/Dashboard.tsx`**, change the `currentEquity` `useMemo` so `tradingPnl` sums over the **unfiltered** `trades` list (not `filteredTrades`), and `netCashflow` sums over the **full** `cashflows` list. Update the dep array accordingly. Update any code that previously assumed `currentEquity` was active-only (skim and confirm nothing else depends on the active-only sum).
- [ ] **B2: Manually verify** by running `npm run dev`: with zero phases archived (current state), the displayed equity must be IDENTICAL to what it was before this change (because all trades/cashflows are untagged = active). If any drift, debug before proceeding.
- [ ] **B3: Commit** `refactor(Dashboard): aggregate equity across all phases (active + archived)`.

### Task C — Publish button + dialog

- [ ] **C1: Create `src/components/dashboard/PublishPhaseDialog.tsx`** using the existing `Dialog` primitive from `src/components/ui/dialog.tsx`. Fields per §8.2. Submit calls `propPhaseService.publishPhase`.
- [ ] **C2: In `src/pages/Dashboard.tsx`**, import the dialog component and an open-state hook. Mount `<Button variant="outline" onClick={openPublishDialog}><Archive size={16}/> Publish phase</Button>` between the `<CurrencyToggle />` and `<Button>New Trade</Button>` in the header flex.
- [ ] **C3: On successful publish**, refresh the Dashboard's data (re-fetch trades + cashflows) so the active lists go empty; show a brief success toast or simply rely on the state refresh.
- [ ] **C4: Lint, commit** `feat: Publish phase dialog + Dashboard button`.

### Task D — PropFirm tab (folder list)

- [ ] **D1: Create `src/pages/PropFirmDashboard.tsx`** modeled on `src/pages/StrategiesDashboard.tsx`. Fetch phases via `propPhaseService.getPhases`, fetch all trades+cashflows once (for per-phase stat computation), render a grid of cards. Empty state per §2.10.
- [ ] **D2: In `src/components/layout/AppLayout.tsx`**, add the new nav item (import `Archive` icon, place between Strategies and Risk Calculator).
- [ ] **D3: In `src/App.tsx`** and **`src/JournalApp.tsx`**, add the route:
  - `App.tsx`: `<Route path="/prop-firm" element={<ProtectedRoute><PropFirmDashboard /></ProtectedRoute>} />`
  - `JournalApp.tsx`: `<Route path="prop-firm" element={<ProtectedRoute><PropFirmDashboard /></ProtectedRoute>} />`
- [ ] **D4: Lint, commit** `feat: PropFirm tab + folder list page`.

### Task E — Phase detail page

- [ ] **E1: Decide:** refactor to extract `<TradeJournalView>` (cleaner) OR duplicate the tab structure (faster, with a follow-up). See §7. If refactoring, do that as its own commit first before E2.
- [ ] **E2: Create `src/pages/PropFirmPhaseDetail.tsx`** that:
  - Reads `:phaseId` from `useParams`.
  - Fetches the phase doc, all trades, all cashflows.
  - Filters trades + cashflows to `propPhaseId == phaseId`.
  - Renders `<PhaseMetadataBar phase={phase} />` + the tabbed journal view (`readOnly` for trades).
  - Provides a `Manage cashflows` button → opens a cashflow CRUD scoped to the phase.
- [ ] **E3: Create `src/components/propfirm/PhaseMetadataBar.tsx`**, `EditPhaseMetadataDialog.tsx`, `DeletePhaseDialog.tsx`.
- [ ] **E4: Add the route** to both entry points: `/prop-firm/:phaseId` and `prop-firm/:phaseId`.
- [ ] **E5: Make `ListOverview` accept a `readOnly?: boolean` prop** (default false). When true, hide the edit/delete action column. Pass `readOnly` from `PropFirmPhaseDetail`.
- [ ] **E6: Make folder cards clickable** in `PropFirmDashboard` — wrap each card in `<Link to={`/journal/prop-firm/${phase.id}`}>`.
- [ ] **E7: Lint, commit** `feat: PropFirm phase detail page (Dashboard-shaped, read-only trades, CRUD cashflows)`.

### Task F — Cashflow management scoped to a phase

- [ ] **F1: Either inline within `PropFirmPhaseDetail`** add the cashflow list/add/edit/delete (modeled on `src/pages/Cashflows.tsx`) with `propPhaseId == phaseId` filter and writes that include `propPhaseId: phaseId`.
- [ ] **F2: OR extract a `<CashflowManager phaseId?>` component** and reuse it. Recommended if it doesn't bloat the session.
- [ ] **F3: Confirm** the equity-propagation works: add a cashflow inside an archived folder, then navigate to Dashboard and observe equity changes. This is the headline behaviour Warren cares about (§3.1).
- [ ] **F4: Lint, commit** `feat: cashflow CRUD scoped to archived phase`.

### Task G — Full verification + push

- [ ] **G1: Comprehensive grep** for any `$` still leaking through new code: `grep -rnE "[\`>+-]\\\$|\\(\\\$\\)" src/components/propfirm src/pages/PropFirm* src/pages/Dashboard.tsx`. Anything remaining that's a currency display should use `useCurrency()`'s `symbol`.
- [ ] **G2: `npm run lint`** — exit 0.
- [ ] **G3: `npm run build`** — exit 0, no new TS or bundling errors.
- [ ] **G4: Manual smoke test** in `npm run dev`:
  - With zero phases: Dashboard renders as before; equity unchanged; PropFirm tab shows empty state.
  - Add a test trade (or use bot data) + a test cashflow. Click Publish, fill the form, submit. Dashboard goes empty (or shows zero trades). Equity unchanged. PropFirm tab now shows one card. Click it — see the archived trades + cashflows; trades are read-only; cashflow list works.
  - Add a NEW cashflow inside the archived folder (date = today). Navigate back to Dashboard — equity reflects the new cashflow. ✅ This is the key acceptance test.
  - Edit phase metadata via Edit dialog — confirm changes persist.
  - Delete the phase via Delete dialog — confirm trades + cashflows reappear on the Dashboard (untagged again) and the folder is gone.
- [ ] **G5: Push** `git push origin main` (per CLAUDE.md auto-push policy).
- [ ] **G6: Remind Warren** about the two manual deploy gates:
  1. Mirror the new Firestore rules in the Firebase console.
  2. Bump the submodule in `personal-website` to deploy to `warrenlimzf.com/journal`:
     ```bash
     cd <personal-website-dir>
     git submodule update --remote src/journal
     git add src/journal
     git commit -m "Sync trading-journal submodule (PropFirm feature)"
     git push
     ```

---

## 10. Out of scope for v1

Document these so they don't accidentally creep in:

- Multiple concurrent active phases.
- Editing trades inside an archived folder (escape hatch is Delete phase → re-publish).
- Strategies tab change (still aggregates across all phases).
- Auto-detection of "phase ended" (no triggers — always user-initiated Publish).
- Phase merging/splitting.
- Per-phase CSV/Excel/PDF export. The phase detail page can ship without export buttons in v1; if the user asks, add them following the Dashboard export pattern.
- Re-opening an archived phase as the active phase (delete-and-redo is acceptable v1 substitute).
- Profit target / max drawdown / profit share / MT5 ID fields (Warren explicitly rejected for v1).
- Filtering the PropFirm tab cards by name/stage/outcome.

---

## 11. Risks & edge cases — must handle

1. **Firestore rule miss.** If `propPhaseId` isn't in the update whitelist, the publish batch update will 403 silently in the catch. Verify rules are updated in BOTH the local file and the Firebase Console.
2. **Batch >500 docs.** Paginate. Each batch must complete (`batch.commit()`) before starting the next.
3. **Bot race during publish.** Already handled by Firestore semantics (§3.6). Don't add transactional locking — it overcomplicates and isn't needed.
4. **Active equity drift after Task B.** If the new aggregation accidentally double-counts (e.g., counts `filteredTrades` AND `allTrades`), equity will leap. Test before/after as B2 requires.
5. **Empty cashflows / empty trades at publish.** Publish should still succeed and create the folder; it's a valid state to record "started a phase but never traded".
6. **First-ever phase.** `startingBalance` falls back to the localStorage seed (`startBalance`, default `1000`). Test this path on a fresh user.
7. **Stale Dashboard after publish.** `propPhaseService.publishPhase` should resolve only AFTER all batches commit, then the caller refetches state. Don't optimistically clear the UI before the batches commit.
8. **Delete phase race.** The untag-then-delete operation must do untag first (so trades stop pointing to a soon-to-be-deleted doc), then delete the phase doc.
9. **Route mismatch between entry points.** Always update both `App.tsx` and `JournalApp.tsx`.
10. **`Link` paths.** In `JournalApp.tsx` routes are relative (`prop-firm`), but `Link`/`Navigate` use absolute `/journal/prop-firm/<id>` paths. See `Dashboard.tsx`'s existing `Link to="/journal/cashflows"` for the pattern.

---

## 12. Definition of done

The feature is "done" when ALL of the following are true:

- All Implementation Plan checkboxes (Tasks A–G) are checked.
- `npm run lint` and `npm run build` both exit 0.
- Manual smoke test passes (§9 G4 — especially the late-cashflow propagation test).
- Code is pushed to `main`.
- Warren has been reminded about the Firestore Console rule update + the submodule bump in `personal-website`.
- This spec doc has been updated (status changed from "design approved, NOT YET IMPLEMENTED" to "implemented YYYY-MM-DD"), and `CLAUDE.md`'s "Next session todo" entry has been removed.

---

## 13. Process for the next session

If superpowers skills are available in the next session:
1. **superpowers:using-superpowers** loads at session start (system reminder).
2. Read **this file** + `CLAUDE.md` first. Do not start coding without doing both.
3. Use **superpowers:writing-plans** if you want to re-emit a fresh plan from §9 (it's already detailed enough — you may skip and go straight to implementation).
4. Use **superpowers:subagent-driven-development** for execution: dispatch one implementer per task in §9, then spec-compliance review, then code-quality review, looping until each passes. Use the model-selection guidance (haiku for mechanical, sonnet for integration, opus for architecture).
5. After Task G is complete, use **superpowers:finishing-a-development-branch** to wrap up.

If skills are unavailable, just follow §9 sequentially.

---

## 14. Glossary

- **Phase** — one prop-firm session (e.g., one FTMO challenge attempt, or one funded account). Has a start, an end, a set of trades, a set of cashflows, and metadata.
- **Active phase** — the currently-running phase. Represented by untagged trades+cashflows. There is always exactly one active phase (even if no trades have been logged yet).
- **Archived phase** — a phase that has been published. Has a `propPhase` doc and tagged trades+cashflows pointing to it via `propPhaseId`.
- **Publish** — the action that converts the current untagged data into an archived phase + starts a fresh active phase.
- **Folder** — UI synonym for an archived phase's card / detail page.
- **Carryover** — the property that active equity is computed across all phases continuously, so closing one phase doesn't reset the equity number.

---

## 15. Cross-references

- Previous feature spec: `docs/superpowers/specs/2026-05-19-currency-toggle-design.md` (currency toggle, shipped 2026-05-19).
- Previous feature plan: `docs/superpowers/plans/2026-05-19-currency-toggle.md` (shows the implementation style + subagent-driven execution patterns to mirror).
- Repo workflow conventions: `CLAUDE.md` at repo root.
- Outdated docs to ignore: `AI_STUDIO_RULES.md` (pre-submodule workflow, no longer accurate).

---

**End of handoff document.** When implementation begins next session, mark this status field as `In progress`, and at completion change to `Implemented YYYY-MM-DD` and remove the corresponding entry from `CLAUDE.md`.
