# CLAUDE.md — trading-journal

Standing rules for Claude Code when working in this repo.

## What this repo is

A Vite + React 19 (TypeScript) trade-journal frontend that reads Firestore. **Source of truth** for the journal code. Currently embedded into [`personal-website`](https://github.com/WarrenLim1122/personal-website) at `src/journal/` via git submodule and served at `warrenlimzf.com/journal`. Will move to its own domain in the future — `src/App.tsx` is the standalone Vite entry that already supports that.

## Two entry points (both ship in this repo)

| File | Used when | Notes |
|---|---|---|
| `src/JournalApp.tsx` | personal-website embeds this repo | `Routes` only, **no `BrowserRouter`** — the host owns it. Paths like `dashboard`, `new-trade` are relative to `/journal`. |
| `src/App.tsx` | standalone deployment (future) | Owns `BrowserRouter`. Routes at root paths (`/`, `/dashboard`, `/cashflows`, etc.). |

Keep both in sync when you add/remove a route. Adding a route means updating BOTH `JournalApp.tsx` and `App.tsx`.

## Workflow

1. Edit code in this repo.
2. `npm run lint` must pass (`tsc --noEmit`).
3. Commit + push to `main` (auto-push policy applies — see "Auto-push" below).
4. In `personal-website`, bump the submodule pointer: `git submodule update --remote src/journal && git add src/journal && git commit -m "Sync trading-journal submodule" && git push`. **This is the step that triggers the Vercel redeploy of warrenlimzf.com/journal.**

If you forget step 4, the deployed site keeps showing the previous pinned commit. Pushing to this repo alone is NOT enough.

## File layout

```
trading-journal/
├── README.md
├── CLAUDE.md                 ← this file
├── package.json              ← standalone deps
├── vite.config.ts            ← @journal alias → ./src
├── tsconfig.json             ← matching paths
├── index.html                ← standalone entry HTML
├── firestore.rules           ← Firestore security rules (Firebase console source-of-truth still wins)
└── src/
    ├── main.tsx              ← Vite entry → loads App.tsx
    ├── App.tsx               ← standalone root (BrowserRouter)
    ├── JournalApp.tsx        ← integration entry for personal-website
    ├── firebase-applet-config.json  ← public Firebase client config (safe to commit)
    ├── index.css             ← Tailwind theme + shadcn tokens
    ├── components/
    │   ├── layout/           (AppLayout, CurrencyToggle)
    │   ├── dashboard/        (AddTradeDialog, CalendarView, ChartOverview,
    │   │                      EditTradeDialog, EquityCurve, ListOverview,
    │   │                      PublishPhaseDialog, TradeDetailDialog,
    │   │                      WinsVsLosses)
    │   ├── propfirm/         (PhaseMetadataBar, EditPhaseMetadataDialog,
    │   │                      DeletePhaseDialog)
    │   ├── cashflows/        (CashflowManager — used by both Cashflows page
    │   │                      and PropFirmPhaseDetail; takes optional phaseId)
    │   └── ui/               (shadcn/Base UI primitives + BulkActionBar)
    ├── contexts/             ← AuthContext, CurrencyContext
    ├── lib/                  ← firebase.ts, tradeService.ts, cashflowService.ts,
    │                           propPhaseService.ts, useBulkSelect.ts,
    │                           tradeUtils.ts, mt5Calculation.ts, utils.ts
    ├── pages/                ← Login, Dashboard, NewTrade, Cashflows,
    │                           StrategiesDashboard, PropFirmDashboard,
    │                           PropFirmPhaseDetail, RiskCalculator, Settings
    └── types/                ← trade.ts, cashflow.ts, propPhase.ts
```

## Hard rules

- **Never** add a nested `BrowserRouter` to `JournalApp.tsx` — it must use `Routes` only.
- **Never** hard-code `/journal/*` paths inside `JournalApp.tsx`'s `<Route path>` props; those should be relative (e.g. `path="dashboard"`). Absolute `/journal/...` only appears in `Navigate` redirects.
- Imports inside `src/` should use the `@journal/` alias (defined in `vite.config.ts` and `tsconfig.json` as `./src`).
- `src/firebase-applet-config.json` is the **public client config** — safe to commit. Never commit Firebase **admin** SDK keys (service account JSON).
- Don't commit `dist/` or `node_modules/`.
- Firestore reads in the dashboard must fail soft (return `[]` on error) so the UI never hangs on "Loading journal..." when rules are restrictive or a collection is missing. Writes can throw — those surface errors to the user via an `alert()` with the actual Firestore message.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) + shadcn/Base UI primitives |
| Routing | `react-router-dom ^7` |
| Icons | `lucide-react` |
| Data | Firebase Auth + Firestore (`gen-lang-client-0206326169` · DB `ai-studio-88ba4d0a-...`) |
| Charts | `recharts` |

## Active phase baseline (localStorage)

The dashboard's "Current Equity" reads from three localStorage keys, all
written by the user (never by the bot, never by Firestore reads):

| Key | Default | Role |
|---|---|---|
| `startBalance` | `"1000"` | Per-phase baseline equity. Editable via the Dashboard header pencil, the Settings page, and the EquityCurve "Start Balance" input. Treat as the **start of the current (unpublished) active phase**, NOT a seed-of-all-time. |
| `baselineAnchorPnl` | `"0"` | Snapshot of Σ(untagged trade P&L) at the moment the user last reset the equity. Subtracted from live untagged sums so pre-reset trades are excluded from active-phase metrics. |
| `baselineAnchorCashflow` | `"0"` | Same idea for cashflows. |

Current Equity math (`Dashboard.tsx`):
```
currentEquity = startBalance
              + (Σ(untagged trade P&L) − baselineAnchorPnl)
              + (Σ(untagged cashflow net) − baselineAnchorCashflow)
% change      = effectivePnl / (startBalance + effectiveCashflow) × 100
```

On `Publish phase` success: `startBalance` carries over to the just-closed
phase's endingBalance, and BOTH anchors reset to `"0"` (since untagged is now
empty after tagging). Forgetting to reset anchors = phantom delta next session.

On equity reset (header pencil): a `window.confirm` warns the user before
snapshotting anchors, but only when there's actually untagged activity to lose
(otherwise it's a no-op preference change). The trades themselves stay in the
journal — anchors just exclude them from headline metrics.

`publishPhase` and `PublishPhaseDialog` both accept the anchors and subtract
them from untagged sums when computing the new phase's `endingBalance` — so
the published phase records what the Dashboard headline showed, not what the
raw trade sums say. Default anchors are `{0, 0}` so older callers / first-time
users behave correctly.

The PhaseMetadataBar on PropFirmPhaseDetail makes `startingBalance` and
`endingBalance` directly editable via `propPhaseService.updatePhase` — those
stored numbers are the source of truth for Total P&L and the % chip, not the
raw trade sums. The phase's EquityCurve passes `readOnlyStartBalance` (new
EquityCurve prop) to hide the meaningless Start Balance input there.

## Firestore collections

| Path | Written by | Read by this app |
|---|---|---|
| `users/{uid}/trades` | the bot ([`arbitrage-trading`](https://github.com/WarrenLim1122/arbitrage-trading)) + this app's AddTrade/EditTrade dialogs + `publishPhase`/`deletePhase` (which tag/untag with `propPhaseId`) | Yes |
| `users/{uid}/cashflows` | this app only (manual deposit/withdrawal entries; CashflowManager writes `propPhaseId` when mounted inside an archived phase) | Yes |
| `users/{uid}/propPhases` | this app only (created by Publish phase; updated/deleted via the PropFirm phase detail page) | Yes |

If you add new collections, you must also update the Firestore security rules in the Firebase Console (this repo's `firestore.rules` file is for reference / local emulator only).

### Bot payload gotcha (read before touching `firestore.rules`)

The bot writes trades via the Firebase Admin SDK, which **bypasses** security rules. So bot-written trades may contain values that the rules' `isValidTrade` validator doesn't accept on update:

- `outcome` may be `'LOSS'` / `'LOST'` (bot all-caps) in addition to `'WIN'` / `'LOSE'` / `'BREAKEVEN'`. App code at `src/lib/tradeUtils.ts:getTradeOutcome` normalizes these on read.
- `position` may be `'LONG'` / `'SHORT'` (bot all-caps) in addition to `'Long'` / `'Short'`.

The rules now whitelist BOTH forms. If you tighten `isValidTrade`, any rule that re-runs `isValidTrade(incoming(), userId)` on update (e.g. tagging a trade with a new field) will silently 403 on bot-written rows. Symptom: a feature that batch-updates trades fails with "Missing or insufficient permissions" even though the field you're adding IS whitelisted in `affectedKeys().hasOnly([...])`.

## Auto-push (after every successful edit, unless Warren says "do not push")

```bash
npm run lint              # must pass
git add -A
git commit -m "<clear message>"
git push origin main
```

Hard stops: lint fails, secrets detected, merge conflict, destructive change. Don't force-push.

Remind Warren to **also bump the submodule in personal-website** so the change ships to `warrenlimzf.com/journal`.

## Related repos

- [`personal-website`](https://github.com/WarrenLim1122/personal-website) — host shell. Mounts this repo as a submodule at `src/journal/`.
- [`arbitrage-trading`](https://github.com/WarrenLim1122/arbitrage-trading) — the bot that writes deals into `users/{uid}/trades`.

## Outdated docs

`AI_STUDIO_RULES.md` describes the **pre-submodule** manual-sync workflow and is no longer accurate. Treat this `CLAUDE.md` as the source of truth.
