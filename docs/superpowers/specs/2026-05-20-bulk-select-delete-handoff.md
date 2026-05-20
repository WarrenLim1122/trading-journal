# Bulk Select & Delete — Design Spec + Implementation Handoff

**Date:** 2026-05-20
**Status:** Design approved by Warren. NOT YET IMPLEMENTED.
**For:** the next Claude Code session.
**Sibling handoff:** the PropFirm feature lives at `docs/superpowers/specs/2026-05-20-propfirm-journal-handoff.md` (larger; design-only too). The two features are independent — implement in whichever order Warren prefers. If implementing both, recommend PropFirm first (more invasive; equity formula change touches the same `Dashboard.tsx` flow) and bulk-select after, to avoid merge-style conflicts.

---

## 0. How to use this document

1. Read it end-to-end before touching code.
2. Re-read `CLAUDE.md` (auto-push to `main`, both-entry-point sync, submodule bump to deploy).
3. Execute Tasks A–E (§7) sequentially. Each ends with `npm run lint` exit 0 + a commit.
4. Use **superpowers:subagent-driven-development** if available — small feature, but the two-stage review (spec then code-quality) is what caught two real bugs in the currency-toggle session; worth it.
5. If a spec gap surfaces mid-implementation (see precedent in `docs/superpowers/specs/2026-05-19-currency-toggle-design.md`), amend this file inline with a dated note and commit that amendment as its own change before continuing.

---

## 1. Background — what we're building and why

Warren's own words:

> *"I find that my trading journal website is quite redundant to delete the trades one by one, could you have a feature say 'Select' between 'List Overview' and the table itself, so that when user click on the 'Select' the left hand side would have checkboxes for us to choose the trades we want to select, or a select all button on top of the table after we click select, then with each trade we select, there is a 'Delete' or 'Edit' button shown on top of the table as well for us to do the deleting process only once instead of multiple times should we always scroll back to the end of the table in action columns to click delete (when we have multiple entries want to delete and not only one — where we'll use action column directly)."*

The pain: when Warren wants to delete many trades, he currently clicks the trash icon in the action column on each row one at a time — and that column is at the far right, requiring horizontal scrolling or screen-edge clicks on every row. Bulk select fixes this. The same pattern applies to the Cashflows page.

---

## 2. Locked design decisions (DO NOT re-litigate)

These came from explicit AskUserQuestion choices Warren made in the brainstorming session.

1. **Delete-only in the bulk action bar.** No bulk edit of any kind. Single-row editing stays via the existing pencil icon in the action column (untouched).
2. **Both pages get the feature:** Dashboard's List Overview tab AND the Cashflows page.
3. **Select all = all currently-visible/filtered rows.** If Warren has the trade table filtered to Strategy=X, the master checkbox selects only those filtered rows — never the unfiltered/hidden DB rows.
4. **Existing single-row Edit & Delete icons stay visible**, even in select mode. They don't conflict; users can still single-row edit/delete from the action column at any time.
5. **Confirmation dialog before bulk delete** — "Delete N trades? This cannot be undone." with explicit Confirm.
6. **Select mode exits automatically** on: successful delete, tab change away from List Overview, page navigation away from the table.
7. **No undo / no soft-delete.** Hard delete with the confirmation gate as the only safety net.
8. **The PropFirm phase detail page is read-only for trades**, so bulk-select must NOT appear on it. If implementing AFTER PropFirm, this means: when `<ListOverview readOnly>` is true (the prop the PropFirm handoff introduces), hide the Select button and the BulkActionBar entirely. If implementing BEFORE PropFirm, add a `readOnly?: boolean` prop to `ListOverview` now with this guard, and the PropFirm handoff's E5 step becomes a no-op.
9. **Imports use the `@journal/` alias** for new imports (per `CLAUDE.md`).
10. **No automated tests in this repo.** Verification gate is `npm run lint` + manual checks.

---

## 3. Critical clarifications

### 3.1 Firestore batch delete: 500-op limit per batch

`writeBatch` from `firebase/firestore` is capped at 500 operations per batch. If Warren selects 600 trades, the service must split into two batches and commit them sequentially. **Don't assume one batch suffices.** Same gotcha applies on the PropFirm publish operation — pattern is consistent.

### 3.2 Select-all is a *visible/filtered* operation

The trade table at `src/components/dashboard/ListOverview.tsx` receives a pre-filtered `trades` prop from `Dashboard.tsx` (`filteredTrades`). The Select-all master checkbox toggles all rows in that filtered prop, NOT a separate Firestore query for all-user-trades. Same on Cashflows.

### 3.3 Selection state is per-page, not global

`useBulkSelect` is a local hook. Two pages = two independent selection states. Navigating between them clears (since the hook unmounts with the component). Don't try to lift selection to a Context — it's per-page by design.

### 3.4 Sort and filter interactions

- Sorting the table while in select mode must NOT lose the selection (selectedIds is keyed by document id, not row index). Verify by clicking a column header to re-sort while items are selected.
- Changing a filter (e.g., Strategy=X) while in select mode: items in the selection set that are no longer visible stay selected but invisible — that's surprising. **Decision:** on any filter change, automatically clear the selection. Document this in the spec dialog or just behave that way (recommended: auto-clear silently, no toast).

### 3.5 Bot writes during bulk delete

While the user holds the confirmation dialog open, the bot may write new trades. They appear after the delete completes and are unaffected. No race issue.

### 3.6 Currency / sign-placement conventions still apply

Any rendered amount in the new bulk-action UI uses `useCurrency()` from `@journal/contexts/CurrencyContext`, and follows the sign-before-symbol convention (e.g., `-S$12.34`). The confirmation dialog can simply show the count of selected rows without per-row totals — keep it simple.

---

## 4. Files & components

### 4.1 New files

- `src/lib/useBulkSelect.ts` — generic hook. Signature:
  ```ts
  export function useBulkSelect<T extends { id: string }>(items: T[]): {
    isSelectMode: boolean;
    selectedIds: Set<string>;
    selectedCount: number;
    isAllSelected: boolean;        // true iff selectedIds covers every visible item
    enter(): void;
    exit(): void;                  // also clears selectedIds
    toggle(id: string): void;
    toggleAll(): void;             // if all visible selected → clear; else select all visible
    clearOnFilterChange(): void;   // explicit reset hook for callers to invoke on filter changes
  }
  ```
  Internally uses `useState<boolean>` for `isSelectMode` and `useState<Set<string>>` for `selectedIds`. The `items` arg is the *current visible* list (filtered/sorted) — that's what `isAllSelected` and `toggleAll` use.

- `src/components/ui/BulkActionBar.tsx` — sticky toolbar.
  ```tsx
  interface Props {
    count: number;
    onDelete: () => void;
    onCancel: () => void;
    itemLabel?: string;  // "trade" / "cashflow" — for the count display ("3 trades selected")
  }
  ```
  Rendered conditionally by each table's parent when `isSelectMode` is true and `selectedCount > 0` (when count is 0 in select mode, show a quieter version: "Select rows or Cancel" with no Delete button). Use the existing `Button` primitive; destructive variant for Delete (red).

### 4.2 Files to modify

- **`src/lib/tradeService.ts`** — add:
  ```ts
  async deleteTradesBatch(userId: string, tradeIds: string[]): Promise<void>
  ```
  Implementation: paginate `tradeIds` into chunks of 500. For each chunk, build a `writeBatch`, call `batch.delete(doc(db, "users", userId, "trades", id))` for each, commit. `await` each batch sequentially. The existing single `deleteTrade` method stays untouched.

- **`src/lib/cashflowService.ts`** — add:
  ```ts
  async deleteCashflowsBatch(userId: string, cashflowIds: string[]): Promise<void>
  ```
  Same pattern as above on the `users/{uid}/cashflows` collection.

- **`src/components/dashboard/ListOverview.tsx`**:
  - Accept new optional props: `readOnly?: boolean` (default false; hides Select + BulkActionBar + the action column's edit/delete icons), and `onTradesChanged?: () => void` (callback to refresh parent state after a bulk delete).
  - Adopt the `useBulkSelect` hook keyed off the `trades` prop.
  - Render a `Select` toggle button at the top-right of the table area (above the column headers, NOT in the table itself). Style: `outline` variant, small. When `isSelectMode`, the button shows "Cancel" instead.
  - When `isSelectMode`, render a checkbox column as the leftmost column, with the master checkbox in the table header. Use an `<input type="checkbox">` or a small shadcn-style checkbox.
  - When `isSelectMode && selectedCount > 0`, render `<BulkActionBar />` above the table (sticky if practical).
  - Selected row visual: subtle background highlight (e.g., `bg-primary/5`).
  - Bulk delete handler: confirm dialog (reuse the existing Dialog primitive from `src/components/ui/dialog.tsx`), on confirm call `tradeService.deleteTradesBatch`, then call `onTradesChanged()`, then `exit()` the select mode.

- **`src/pages/Dashboard.tsx`** (the parent that uses `ListOverview`):
  - Pass `onTradesChanged={fetchTrades}` (the existing refresh fn) to `<ListOverview>`.
  - If a `readOnly` flag exists for any other reason, leave it; default behavior unchanged.

- **`src/pages/Cashflows.tsx`**:
  - Adopt the `useBulkSelect` hook keyed off the visible cashflows list (after any local filtering — currently the Cashflows page doesn't filter, but if you add one later the same hook will work).
  - Add a `Select` toggle button near the table top, same UX as ListOverview's.
  - Render the checkbox column when `isSelectMode`. Master checkbox in header.
  - Render `<BulkActionBar itemLabel="cashflow" />` above the table when `selectedCount > 0`.
  - Bulk delete: confirm dialog, `cashflowService.deleteCashflowsBatch`, refresh, exit select mode.
  - The existing single-row delete (trash icon + AlertDialog confirm) stays unchanged.

### 4.3 Reused infrastructure

- `Button` (`src/components/ui/button.tsx`).
- `Dialog` (`src/components/ui/dialog.tsx`) for the bulk-delete confirmation.
- `useAuth` for `user.uid`.
- No new icons strictly required, but `CheckSquare`/`Square`/`Trash2` from `lucide-react` are convenient.

---

## 5. UX details

### 5.1 Select button placement

Above the column headers, right side of the table area. Layout:

```
[ LIST OVERVIEW heading ]               [ Select ▢ ]
[ table headers row .................. ]
[ row 1 .............................. ]
...
```

When `isSelectMode`:

```
[ LIST OVERVIEW heading ]               [ Cancel ✕ ]
[ 3 trades selected   [Delete] [Cancel]                ]   ← BulkActionBar
[☑] [ ✓ ] [ table headers ... ]                            ← master checkbox in row
[☐] [   ] [ row 1 .................. ]
[☑] [   ] [ row 2 .................. ]
...
```

The BulkActionBar appears only when at least one row is selected (when 0 selected but still in select mode, show just `Select rows or [Cancel selection]` — a quieter prompt with no Delete affordance).

### 5.2 Confirmation dialog

Title: `Delete N trades?` (or `Delete N cashflows?`).
Body: `This cannot be undone.`
Footer: `[Cancel]` and `[Delete N items]` (destructive red).

If `N > 50`, add a stronger line: `You're about to delete 137 trades. This is a large action — double-check before confirming.`

### 5.3 Visual selected-row highlight

Tailwind class on selected rows: `bg-primary/5 hover:bg-primary/10`. Stays subtle so the columns remain readable.

### 5.4 Empty state

If the table has 0 rows, the Select button is disabled (greyed out) with a tooltip "Nothing to select".

### 5.5 Loading state during delete

While the batch delete is in flight, disable the BulkActionBar's Delete button and show a small spinner. Don't allow Cancel to dismiss mid-flight (or do — but a partial delete is OK since the batches commit atomically per chunk and the user can re-run).

---

## 6. Out of scope for v1

- Bulk edit (any kind).
- Undo / restore / trash bin.
- Bulk delete on the PropFirm phase detail page (trades there are read-only by design; cashflows-in-phase bulk delete is deferred to a follow-up).
- Cross-page selection persistence.
- Drag-to-select.
- Shift-click range select. (Could be added as a nice-to-have later — explicitly NOT in v1 to keep the scope tight.)
- Bulk delete via keyboard shortcut.
- Export of selected rows (current export buttons export all filtered rows — unchanged).

---

## 7. Implementation plan (step-by-step)

### Task A — Generic infrastructure

- [ ] **A1: Create `src/lib/useBulkSelect.ts`** with the hook signature from §4.1. Implementation outline:
  ```ts
  import { useCallback, useState, useMemo } from "react";

  export function useBulkSelect<T extends { id: string }>(items: T[]) {
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const selectedCount = selectedIds.size;
    const isAllSelected = useMemo(
      () => items.length > 0 && items.every((it) => selectedIds.has(it.id)),
      [items, selectedIds]
    );

    const enter = useCallback(() => setIsSelectMode(true), []);
    const exit = useCallback(() => {
      setIsSelectMode(false);
      setSelectedIds(new Set());
    }, []);
    const toggle = useCallback((id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    }, []);
    const toggleAll = useCallback(() => {
      setSelectedIds((prev) => {
        if (items.every((it) => prev.has(it.id))) return new Set();
        return new Set(items.map((it) => it.id));
      });
    }, [items]);
    const clearOnFilterChange = useCallback(() => setSelectedIds(new Set()), []);

    return { isSelectMode, selectedIds, selectedCount, isAllSelected, enter, exit, toggle, toggleAll, clearOnFilterChange };
  }
  ```
- [ ] **A2: Create `src/components/ui/BulkActionBar.tsx`** with the props from §4.1. Plain Tailwind / shadcn-style rendering; reuse `Button`.
- [ ] **A3: Add `deleteTradesBatch` to `src/lib/tradeService.ts`.** Outline:
  ```ts
  async deleteTradesBatch(userId: string, tradeIds: string[]): Promise<void> {
    const { writeBatch, doc } = await import("firebase/firestore");
    const CHUNK = 500;
    for (let i = 0; i < tradeIds.length; i += CHUNK) {
      const chunk = tradeIds.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      chunk.forEach((id) =>
        batch.delete(doc(db, "users", userId, "trades", id))
      );
      await batch.commit();
    }
  }
  ```
  (Use whatever import style matches the rest of `tradeService.ts` — top-level imports, not dynamic. Adjust accordingly.)
- [ ] **A4: Add `deleteCashflowsBatch` to `src/lib/cashflowService.ts`.** Identical pattern targeting `users/{uid}/cashflows`.
- [ ] **A5: Lint, commit** `feat: bulk-select hook + action bar + batch-delete service methods`.

### Task B — Wire bulk select into ListOverview (trades)

- [ ] **B1: Add `readOnly?: boolean` and `onTradesChanged?: () => void` props** to `ListOverview.tsx`.
- [ ] **B2: Inside the component**, call `const bulk = useBulkSelect(trades);` (where `trades` is the existing prop).
- [ ] **B3: Render the Select / Cancel toggle button** above the table on the right. Hide entirely when `readOnly` is true. Disable when `trades.length === 0`.
- [ ] **B4: Render the checkbox column** when `bulk.isSelectMode`. Use a leftmost `<th>` and `<td>` per row. Master checkbox in `<th>` calls `bulk.toggleAll`; row checkbox calls `bulk.toggle(trade.id)`. Indeterminate state on master checkbox is nice-to-have — set the DOM `indeterminate` property via a ref if `selectedCount > 0 && !isAllSelected`. Optional but polished.
- [ ] **B5: Render `<BulkActionBar count={...} onDelete={openConfirmDialog} onCancel={bulk.exit} itemLabel="trade" />`** above the table when `bulk.isSelectMode && bulk.selectedCount > 0`. Show the quieter prompt `Select rows or [Cancel selection]` when `isSelectMode && selectedCount === 0`.
- [ ] **B6: Selected row background**: add `${bulk.selectedIds.has(trade.id) ? "bg-primary/5" : ""}` to the row className.
- [ ] **B7: Confirmation dialog + delete handler**: open via `useState` for `isConfirmOpen`. On Confirm:
  ```ts
  await tradeService.deleteTradesBatch(user.uid, Array.from(bulk.selectedIds));
  onTradesChanged?.();
  bulk.exit();
  setIsConfirmOpen(false);
  ```
  Wrap in try/catch; on error `alert(...)` the message (matches the existing single-row delete pattern in the codebase).
- [ ] **B8: Clear selection on filter changes.** `ListOverview` doesn't filter directly — `Dashboard.tsx` does. Add a `useEffect` that watches `trades` length/identity and calls `bulk.clearOnFilterChange()` when it changes meaningfully. Simplest: any change to the trades prop reference clears selection.
- [ ] **B9: In `Dashboard.tsx`**, pass `onTradesChanged={fetchTrades}` to the `<ListOverview>` element (`fetchTrades` already exists in Dashboard).
- [ ] **B10: Lint, commit** `feat: bulk select + delete on trade List Overview`.

### Task C — Wire bulk select into Cashflows page

- [ ] **C1: Inside `Cashflows.tsx`**, call `const bulk = useBulkSelect(cashflows);` (where `cashflows` is the local state).
- [ ] **C2: Render the Select / Cancel toggle button** above the cashflow table. Disable when `cashflows.length === 0`.
- [ ] **C3: Render the checkbox column + master checkbox** when `bulk.isSelectMode`.
- [ ] **C4: Render `<BulkActionBar itemLabel="cashflow" ... />`** when `isSelectMode && selectedCount > 0`.
- [ ] **C5: Confirmation dialog + bulk delete handler**: on confirm call `cashflowService.deleteCashflowsBatch`, refetch cashflows (the page already has a refetch flow tied to `cashflowsUpdated` event listener — fire that event), then `bulk.exit()`.
- [ ] **C6: Lint, commit** `feat: bulk select + delete on Cashflows page`.

### Task D — Read-only guard (interaction with PropFirm feature)

- [ ] **D1: If the PropFirm feature has already shipped:** verify that `<ListOverview readOnly={true} />` (the way PropFirmPhaseDetail mounts it) correctly hides the Select button + BulkActionBar + the row action column. The `readOnly` prop introduced in Task B5 of the PropFirm handoff should already do this; just confirm visually.
- [ ] **D2: If the PropFirm feature has NOT shipped yet:** the `readOnly` prop you added in this feature's Task B1 is now a no-op (Dashboard always passes false). That's fine — when PropFirm ships later, its phase-detail page will pass `readOnly={true}` and reap the benefit automatically. **Update the PropFirm handoff** (`docs/superpowers/specs/2026-05-20-propfirm-journal-handoff.md` §6.2 / Task E5): note that `readOnly` is already implemented and Task E5 collapses to just *using* the prop.
- [ ] **D3: Lint, commit** (if any change was made) `chore: confirm bulk-select hidden in ListOverview read-only mode`.

### Task E — Full verification + push

- [ ] **E1: `npm run lint`** — exit 0.
- [ ] **E2: `npm run build`** — exit 0, no new TS or bundle errors.
- [ ] **E3: Manual smoke test** in `npm run dev`:
  - Dashboard → List Overview tab → Click `Select` → checkbox column appears → select 3 rows → BulkActionBar shows "3 trades selected" → click `Delete` → confirm → 3 rows gone, select mode exited. ✅
  - Repeat with master checkbox to select-all-visible → confirm a filtered subset is selected (apply Strategy filter first).
  - Sort the table while items are selected → selection survives. ✅
  - Change a filter while items are selected → selection clears. ✅
  - Cashflows page: same flow with 2 cashflows. ✅
  - PropFirm phase detail page (if shipped): Select button is HIDDEN. ✅
  - Bot-written trade arriving during the confirm-dialog dwell: shows up unchanged. ✅
- [ ] **E4: Push** to `main` (auto-push policy).
- [ ] **E5: Remind Warren** to bump the submodule in `personal-website`:
  ```bash
  cd <personal-website-dir>
  git submodule update --remote src/journal
  git add src/journal
  git commit -m "Sync trading-journal submodule (bulk select & delete)"
  git push
  ```

---

## 8. Risks & edge cases

1. **Batch >500.** Paginate. Each chunk commits independently. If a later chunk fails, earlier chunks have already deleted — surface the partial state to the user via the catch (`alert(\`Deleted X of Y trades; remaining failed: \${err.message}\`)`).
2. **Stale UI after delete.** The bulk delete handler must `await` the service call before exiting select mode and refreshing — don't optimistically clear rows.
3. **Indeterminate master checkbox.** If you skip B4's indeterminate styling, the master checkbox just toggles between unchecked and fully-checked, which is fine UX. The indeterminate state is polish, not required.
4. **Permission errors.** If Firestore rules reject the delete (shouldn't happen for own-user docs, but defensive), the alert in B7 surfaces the message. Match the existing single-row delete error surface.
5. **`trades.length === 0`.** Select button disabled. The hook itself handles empty arrays gracefully (`isAllSelected` requires length > 0).
6. **`onTradesChanged` not passed.** `ListOverview` should treat the prop as optional. If Dashboard doesn't pass it (shouldn't happen, but defensive), the bulk delete still works but the parent won't refetch. Acceptable.
7. **Race with `Cashflows.tsx`'s `cashflowsUpdated` event listener.** That event triggers a refetch on the Dashboard equity pill. The bulk delete on the Cashflows page should fire the same event so Dashboard equity updates immediately if the user navigates back. Match existing pattern in `Cashflows.tsx`.

---

## 9. Definition of done

- Tasks A–E all checked.
- `npm run lint` and `npm run build` both exit 0.
- Manual smoke tests pass (§7 E3).
- Pushed to `main`.
- Warren reminded about the submodule bump.
- This handoff doc's status updated to `Implemented YYYY-MM-DD`.
- The corresponding entry in `CLAUDE.md`'s next-session-todo banner is removed.

---

## 10. Process for the next session

1. Read `CLAUDE.md` (it points here).
2. Read this doc end-to-end.
3. If PropFirm hasn't shipped yet, decide ordering. Recommend PropFirm first (touches Dashboard.tsx more invasively; bulk-select is a lighter overlay).
4. If superpowers skills are available, use `superpowers:subagent-driven-development` for execution.
5. Follow Tasks A–E sequentially.
6. After Task E, use `superpowers:finishing-a-development-branch` to wrap.

---

## 11. Cross-references

- Sibling handoff (independent feature): `docs/superpowers/specs/2026-05-20-propfirm-journal-handoff.md`.
- Style precedents for execution: `docs/superpowers/specs/2026-05-19-currency-toggle-design.md` and `docs/superpowers/plans/2026-05-19-currency-toggle.md`.
- Repo workflow conventions: `CLAUDE.md` at repo root.

---

**End of handoff document.** Update the status field on completion.
