# Changelog

All notable changes to this project will be documented in this file.

## 2026-05-05 — Bot Journaling Infrastructure & UI Fixes

Summary:
- Upgraded `Trade` schema (`src/types/trade.ts`) to heavily support automated inputs (bot trades, execution details, gross/net PnL parsing, screenshots).
- Added `BOT_JOURNALING_API.md` and `FIRESTORE_TRADE_SCHEMA.md` to establish architectural documentation for connecting external servers to the web app.
- Created `tradeUtils.ts` and rolled out generic accessors (e.g. `getTradePnl`) to process fallback data properties recursively so legacy and bot trades interact cleanly.
- Implemented `TradeDetailDialog` to replace raw data exploration, replacing simple clicks with an extensive execution inspector highlighting net PNL, risks, missing fallback charts, and bot tags. 
- Cleaned up pointer events inside `Login.tsx` to fix missing cursor accessibility for password eye-toggles.
- Unified CSV, XLSX, and PDF exports to extract the new data models properly.

Files changed:
- `src/types/trade.ts`
- `src/lib/tradeUtils.ts` (New)
- `src/components/dashboard/TradeDetailDialog.tsx` (New)
- `src/components/dashboard/ListOverview.tsx`
- `src/components/dashboard/CalendarView.tsx`
- `src/components/dashboard/ChartOverview.tsx`
- `src/components/dashboard/WinsVsLosses.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Login.tsx`
- `FIRESTORE_TRADE_SCHEMA.md` (New)
- `BOT_JOURNALING_API.md` (New)
- `CHANGELOG.md`

Impact:
- UI impact: Bot-sourced items display purple `BOT` badges. All lists spawn deep-inspector dialogue modals clicking items. Fixed login pointer states.
- Firebase/Auth/Firestore impact: Built implicit logic allowing safe insertion of new field shapes gracefully falling backwards toward legacy arrays.
- Data schema impact: Expanding `Trade` logic schema.
- Routing impact: None.
- Dependency impact: None.
- Styling/Tailwind/shadcn impact: Advanced modal design on Detail Dialog using flex layouts, deep glow, Custom Scrollbars.

Sync notes for Claude:
- You must sync down ALL file changes. The core math parsing engine has shifted toward `tradeUtils.ts` inside `/lib`. 
- Ensure your native router incorporates `TradeDetailDialog.tsx` properly overlaid throughout `Dashboard`.

---


Summary:
- Replaced `AI_SYNC_NOTES.md` with a comprehensive `AI_STUDIO_RULES.md` to persist project-specific AI behaviors.
- Formatted `CHANGELOG.md` to follow the permanent project rules.
- Deleted duplicate root `/components` folder which conflicted with the correct `/src/components` UI folder.

Files changed:
- `/AI_STUDIO_RULES.md`
- `/AI_SYNC_NOTES.md`
- `/CHANGELOG.md`
- `/components/` (directory deleted)

Impact:
- UI impact: None
- Firebase/Auth/Firestore impact: None
- Data schema impact: None
- Routing impact: None
- Dependency impact: None
- Styling/Tailwind/shadcn impact: Cleaned up a duplicate shadcn root initialized folder.

Sync notes for Claude:
- No visual or source code changes affect the application logic. 
- You do NOT need to sync anything over to `src/journal/` yet, as this was purely an operational cleanup and rule definition for the AI environment.

## 2026-05-04 — Add Risk Calculator and App Layout

Summary:
- Introduced a new `AppLayout` component to provide an overarching sidebar navigation.
- Extracted navigation/logout from `Dashboard` into `AppLayout`.
- Created a new `RiskCalculator` page to help calculate position size, actual risk, and reward.
- Updated `App.tsx` routing to use `AppLayout` as a wrapper and support the `/risk-calculator` route.
- Fixed a type mismatch in `WinsVsLosses.tsx` ("LOSS" vs "LOSE") and updated `EquityCurve` prop types to accommodate local fallbacks.

Files changed:
- `src/App.tsx`
- `src/components/layout/AppLayout.tsx` (new)
- `src/pages/Dashboard.tsx`
- `src/pages/RiskCalculator.tsx` (new)
- `src/components/dashboard/EquityCurve.tsx`
- `src/components/dashboard/WinsVsLosses.tsx`
- `CHANGELOG.md`

Impact:
- UI impact: Added a left sidebar for desktop and top-navbar for mobile. Created the Risk Calculator UI.
- Firebase/Auth/Firestore impact: None.
- Data schema impact: None.
- Routing impact: Added `/risk-calculator` route and updated global layout wrapping.
- Dependency impact: None.
- Styling/Tailwind/shadcn impact: Sidebar layout introduces standard flex/sidebar Tailwind usage.

Sync notes for Claude:
- You need to sync `src/components/layout/AppLayout.tsx` and `src/pages/RiskCalculator.tsx`.
- Because routing has changed: The personal website's main router will need to accommodate the `/journal` overarching layout (the `AppLayout`) and the new `/journal/risk-calculator` child route.

---

## 2026-05-04 — Fix Dashboard Scroll Spy, Convert "Add Trade" to dedicated page, and Dynamic App Name

Summary:
- Upgraded the `AppLayout` so standard document scrolling is preserved (`min-h-screen`, rather than nested `overflow-auto`). This fixes issues with the dashboard "spy" active-tab logic not updating the highlighted top-nav tabs.
- The sidebar logo string can now dynamically read from the user's `journalName` in `localStorage` rather than being a static "Trading DB".
- Upgraded "New Trade" from an arbitrary dialog overlay component to a fully featured `/new-trade` page accessible from the sidebar. Removed old `AddTradeDialog`.
- Bootstrapped a `/strategies` page available from the Sidebar which acts as a navigator parsing raw data about strategy-centric performances.

Files changed:
- `src/components/layout/AppLayout.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/dashboard/AddTradeDialog.tsx` (Deleted)
- `src/pages/NewTrade.tsx` (New)
- `src/pages/StrategiesDashboard.tsx` (New)
- `src/App.tsx`
- `CHANGELOG.md`

Impact:
- UI impact: "New Trade" & "Strategies" now occupy dedicated top-level pages. Scrolling and layout behavior stabilized heavily. Dynamic branding across sidebar.
- Firebase/Auth/Firestore impact: New `/new-trade` performs same `addTrade` network logic as the legacy dialog.
- Routing impact: Added `/strategies` and `/new-trade` routes.
- Dependency impact: None.
- Styling/Tailwind/shadcn impact: None.

Sync notes for Claude:
- You must delete the integrated `AddTradeDialog` from `src/journal` and adapt your central router to point to the new `NewTrade` and `StrategiesDashboard` pages inside the Journal context.
- Keep in mind to remove `overflow-hidden` constraints over the integrated wrapper layout in your site to allow `window.scrollY` calculations to track the current active section correctly.

---

## 2026-05-04 — Fix DOM Nesting Hydration Errors for Triggers

Summary:
- Replaced the Radix `asChild={true}` mapping on `DropdownMenuTrigger` with Base UI's native `render={<Button />}` mapping to fix deeply nested `<button>` tags which cause hydration errors.
- Switched the non-semantic `<div>` argument inside `DialogTrigger`'s render proxy within `ChartOverview.tsx` to a native semantic `<button>` tag to resolve `nativeButton` console warnings from Base UI's component validation layer.

Files changed:
- `src/pages/Dashboard.tsx`
- `src/components/dashboard/ChartOverview.tsx`

Impact:
- UI impact: Improved DOM semantics; interactive `<Button>` trigger acts directly as an accessible button, eliminating Hydration nested `button` bugs.
- Firebase/Auth/Firestore impact: None.
- Data schema impact: None.
- Routing impact: None.
- Dependency impact: None.
- Styling/Tailwind/shadcn impact: None.

Sync notes for Claude:
- Make sure to pull over the updated `<DropdownMenuTrigger>` structure within `Dashboard.tsx` and the `<button>` DOM update in `ChartOverview.tsx`.

---
