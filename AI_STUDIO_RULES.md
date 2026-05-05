# AI Studio Project Rules

This trading journal repo is the source project. It will later be synced into a personal website repo under:
`src/journal/`

The live route in the personal website is:
`warrenlimzf.com/journal`

## Permanent Rules for AI Agent (MUST FOLLOW):

1. **Before making any code change**, treat this `AI_STUDIO_RULES.md` as the project instruction file.
2. **Whenever you change any project file**, automatically update `CHANGELOG.md`.
3. Do not wait to be explicitly asked to update `CHANGELOG.md`.
4. Every meaningful update should be recorded in `CHANGELOG.md`.
5. If the update is small but changes files, still add a concise changelog note.
6. **At the end of every response after editing**, output the following summary to the user:
   - **Files changed**: [list of files]
   - **CHANGELOG updated**: Yes / No
   - **Sync needed**: Yes / No (Does this update need to be synced into the personal website?)
   - **Impact areas**: Firebase, Firestore, routing, dependencies, or styling.

## Project Context & Syncing

The personal website owns the final router and domain. Therefore, when this project is synced into the personal website, do not assume project-level files can be copied blindly.

### Files that should usually be synced:
- `src/pages/`
- `src/components/`
- `src/contexts/`
- `src/lib/`
- `src/types/`
- Firebase client config (if needed / updated)

### Files that should NOT be blindly copied into the personal website:
- `index.html`
- `main.tsx`
- `App.tsx`
- `vite.config.ts`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `index.css`
- `node_modules`
- `dist`
- `.git`

If any of these project-level files change, record the change clearly in `CHANGELOG.md` and explain whether the manual sync process needs to merge the change into the personal website (e.g. adding a new npm package).
