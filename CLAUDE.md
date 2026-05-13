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
    │   ├── layout/AppLayout.tsx
    │   ├── dashboard/        (AddTradeDialog, CalendarView, ChartOverview,
    │   │                      EditTradeDialog, EquityCurve, ListOverview,
    │   │                      TradeDetailDialog, WinsVsLosses)
    │   └── ui/               (shadcn/Base UI primitives)
    ├── contexts/AuthContext.tsx
    ├── lib/                  ← firebase.ts, tradeService.ts, cashflowService.ts,
    │                           tradeUtils.ts, mt5Calculation.ts, utils.ts
    ├── pages/                ← Login, Dashboard, NewTrade, Cashflows,
    │                           StrategiesDashboard, RiskCalculator, Settings
    └── types/                ← trade.ts, cashflow.ts
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

## Firestore collections

| Path | Written by | Read by this app |
|---|---|---|
| `users/{uid}/trades` | the bot ([`arbitrage-trading`](https://github.com/WarrenLim1122/arbitrage-trading)) + this app's AddTrade/EditTrade dialogs | Yes |
| `users/{uid}/cashflows` | this app only (manual deposit/withdrawal entries) | Yes |

If you add new collections, you must also update the Firestore security rules in the Firebase Console (this repo's `firestore.rules` file is for reference / local emulator only).

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
