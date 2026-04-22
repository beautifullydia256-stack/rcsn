# PwezaCore Electron desktop — setup (v0.1.10)

## Installer name (no guesswork)

- **`package.json`** field **`"version"`** is the single source of truth for the Windows NSIS installer filename.
- With **`"version": "0.1.10"`** and **`productName": "PwezaCore"`**, **`npm run pack:win`** produces:
  - **`release/PwezaCore Setup 0.1.10.exe`**
- That is the correct, expected artifact. If you bump the version in `package.json` and pack again, the `.exe` name will match the new version (e.g. `PwezaCore Setup 0.1.11.exe`).

School **desktop** builds use **Electron** + the same **Vite + React** app as production web, with `VITE_DESKTOP_MODE=true` (HashRouter, `./` asset base, persistent Supabase session). PDFs are rendered in the **renderer** (optimized images embedded as data URLs), then printed via **Chromium `printToPDF`** in the main process — no Sharp in the client; parity with web report previews.

## Prerequisites

- **Node.js 18+**, npm
- **Windows** for packaged installers (`pack:win` / `pack:win:msi`)
- Repository env: same **Supabase** variables as web (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc. — see root `.env` / `README.md`)

## Install

```bash
npm install
```

## Development

| Command | Purpose |
|--------|---------|
| `npm run desktop` | Starts Vite on port 3000 and opens Electron against it (concurrent dev server + app). |
| `npm run dev:desktop` | Vite only, desktop mode (`VITE_DESKTOP_MODE=true`). Run Electron separately: `npm run electron:dev`. |
| `npm run electron:dev` | Electron loads `http://127.0.0.1:3000` (expects dev server). Sets `ELECTRON_DEV=1`. |

Production-like desktop bundle (no dev server): build first, then point Electron at `dist/index.html` (see `electron/main.cjs`).

## Production build (desktop bundle)

```bash
npm run build:desktop
```

Runs `tsc`, then Vite with `VITE_DESKTOP_MODE=true`, output under **`dist/`** (relative `./` paths for `file://` loading).

## Windows installers

Requires icon build once (script uses `public/logo.png`):

```bash
npm run pack:win
# or
npm run pack:win:msi
```

Artifacts land in **`release/`**. For NSIS, the file you distribute is the installer:

**`release/PwezaCore Setup <version>.exe`** — e.g. `PwezaCore Setup 0.1.10.exe` when `package.json` version is `0.1.10`.

Ignore stray `*.nsis.7z` files (NSIS intermediates); `npm run pack:win` removes them after a successful build. If a build stops halfway, delete any `*.nsis.7z` yourself and run `pack:win` again to get the `.exe`.

## Auto-updates

Packaged builds can use **electron-updater** (GitHub Releases) when `publish` in `package.json` points at your org/repo. Dev unpackaged builds skip update checks.

## Related docs

- `docs/DESKTOP_LOCAL_DB.md` — local SQLite / offline direction  
- `docs/DESKTOP_OFFLINE_PIN_AND_SYNC_VISION.md` — product vision  
- `electron/main.cjs` — window, PDF IPC (`pdf:html-content`, `pdf:print-hash-route`), updater  

## Release notes (0.1.10)

- **Version 0.1.10**: Patch release on the **0.1.x** line (semver: after **0.1.9** comes **0.1.10**). Windows installer: **PwezaCore Setup 0.1.10.exe**.

## Previous: 0.1.9 (desktop-relevant)

- **Version 0.1.9**: Primary (P.1–P.7) report PDFs use the same **compressed logo + student photo** embeds as nursery (Vercel and `renderTemplateHTML` paths); **Next.js** “clone preview” PDF re-encodes images before `generate-pdf`.
- Stricter **image compression** on upload (JPEG targets aligned with reports).  
- **PDF / report pipeline**: smaller embedded rasters in HTML before `printToPDF`; nursery skill art optimized; raw base64 photo refs normalized for fetch/canvas.  
- **Sharp** is used on **server** (Vercel API) only; desktop uses **canvas** in the renderer.
