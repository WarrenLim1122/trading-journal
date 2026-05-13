# trading-journal

Standalone web frontend for the trade journal — a Vite + React 19 (TypeScript) app that reads Firestore and renders MT5 trade outcomes, charts, calendar view, P&L stats, deposit/withdrawal cashflows, and strategy notes.

Currently embedded into [`personal-website`](https://github.com/WarrenLim1122/personal-website) at `/journal/*` via git submodule (mounted at `personal-website/src/journal/`). The standalone scaffolding here lets the journal move to its own domain when ready, without changing app code.

## Layout

```
trading-journal/
├── README.md
├── index.html                 ← standalone Vite entry HTML
├── vite.config.ts             ← standalone build config (@journal alias → ./src)
├── tsconfig.json
├── package.json               ← standalone deps
├── firestore.rules            ← Firestore security rules
└── src/
    ├── main.tsx               ← Vite entry → loads App.tsx
    ├── App.tsx                ← standalone root (BrowserRouter, root-level paths)
    ├── JournalApp.tsx         ← integration entry for personal-website (Routes only, no BrowserRouter)
    ├── firebase-applet-config.json ← public Firebase client config (safe to commit)
    ├── index.css              ← Tailwind theme + shadcn tokens
    ├── components/            ← layout, dashboard widgets, shadcn UI primitives
    ├── contexts/              ← AuthContext
    ├── lib/                   ← Firebase + trade/cashflow service + helpers
    ├── pages/                 ← Login, Dashboard, NewTrade, Cashflows, Strategies, RiskCalculator, Settings
    └── types/                 ← Trade, Cashflow type definitions
```

## Two entry points

- **`App.tsx`** — standalone mode. Owns `BrowserRouter`. Routes at root paths (`/`, `/login`, `/dashboard`, `/cashflows`, etc.). Used when this repo is deployed on its own domain.
- **`JournalApp.tsx`** — integration mode. Uses `Routes` only (no `BrowserRouter` — the host owns it). Routes are relative to whatever path the host mounts the journal at (e.g. `/journal/dashboard`). Used when `personal-website` imports this repo as a submodule.

Both share the same components, pages, and services under `src/`.

## Data

| Firestore path | Written by | Read by |
|---|---|---|
| `users/{uid}/trades` | the bot ([`arbitrage-trading`](https://github.com/WarrenLim1122/arbitrage-trading)) via `layer3/journal/firebase_journal.py` + the website's own AddTrade dialog | this app |
| `users/{uid}/cashflows` | this app (manual deposit/withdrawal entries) | this app |

## Standalone deployment (future)

When ready to move to its own domain:

```bash
npm install
npm run build       # → dist/
npm run preview     # local check
```

Deploy `dist/` to Vercel / Netlify / Firebase Hosting / etc.

## Related repos

- [`personal-website`](https://github.com/WarrenLim1122/personal-website) — embeds this repo as a git submodule at `src/journal/`. Currently serves the journal at `warrenlimzf.com/journal/*`.
- [`arbitrage-trading`](https://github.com/WarrenLim1122/arbitrage-trading) — the bot that writes trades into Firestore for this app to render.
