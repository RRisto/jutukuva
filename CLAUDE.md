# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Jutukuva** is a desktop app for real-time Estonian speech transcription and editing. Electron shell + SvelteKit renderer, with offline ASR via sherpa-onnx (Estonian streaming-zipformer model from TalTechNLP). There is also a Tauri overlay-captions app under `packages/overlay-captions/` (separate lifecycle; mostly independent).

## Commands

```bash
npm run electron:dev      # Dev: Vite (:5173) + Electron, concurrent. This is the correct dev entry point.
npm run dev               # Vite only (browser at :5173). Most features won't work — window.asr/db/fileTranscribe are injected by preload and only exist inside the Electron window.
npm run check             # svelte-check (type + a11y). There are ~10 pre-existing errors in +page.svelte / +layout.svelte; don't count those against your changes.
npm run build             # Vite build of the Svelte renderer only (outputs build/)
npm run electron:build    # Full packaged build: download model → build renderer → electron-builder → dist/
npm run download-model    # Fetch ASR model (~300 MB) to models/<model-name>/. Idempotent. Auto-run by electron:build and CI.
npm run rebuild           # @electron/rebuild for better-sqlite3. Run this after any `npm install` if Electron errors with NODE_MODULE_VERSION mismatch.
```

There is no test suite. "Verification" means running `electron:dev` and exercising the UI.

## Architecture essentials

### Three processes

- **Main** (`electron/main.js`, ESM) — IPC handlers, window lifecycle, native APIs. Imports the ASR manager + file transcriber.
- **Preload** (`electron/preload.cjs`, **the only CJS file**) — exposes `window.asr`, `window.db`, `window.electronAPI`, `window.broadcast`, `window.fileTranscribe` via `contextBridge`. `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false`.
- **Renderer** (`src/`, SvelteKit + Svelte 5 runes) — UI. Talks to main exclusively through the `window.*` bridges.

Plus a **utility process** spawned per file-transcription job via `utilityProcess.fork` (see `electron/asr/file-transcriber-worker.js`). Runs in its own V8 context so long transcriptions don't block main and don't share sherpa state with the live-mic recognizer.

### sherpa-onnx native addon loading

sherpa-onnx-node is a native addon with platform-specific dylib/DLL dependencies. It is loaded with a non-obvious pattern documented in `electron/asr/asr-manager.js`:

1. `setupLibraryPath()` in `sherpa-config.js` adds the platform-specific lib dir to `PATH` / `LD_LIBRARY_PATH` / `DYLD_LIBRARY_PATH` **before** any require.
2. The `.node` file is loaded via `createRequire(import.meta.url)` (ESM → CJS bridge).
3. The loaded addon is **injected into `require.cache`** at the path sherpa-onnx-node's own `addon.js` resolves to, so when `streaming-asr.js` does `require('./addon.js')` it gets our pre-loaded addon instead of re-searching.

Any new code that needs sherpa recognizers must repeat this dance. The file-transcriber worker does it too.

### ASR model resolution

`resolveModelPath(modelName, requiredFiles)` in `electron/asr/sherpa-config.js` returns the first available of:

1. **Bundled** — `process.resourcesPath/bundled-models/<name>` (packaged app) or `<repo>/models/<name>` (dev). Populated by electron-builder `extraResources` from `models/` (dev) → `bundled-models/` (runtime). `scripts/download-model.cjs` populates the dev `models/` dir.
2. **Downloaded** — `app.getPath('userData')/models/<name>`. Legacy path; `model-downloader.js` writes here when no bundled copy exists. Provides backwards compatibility for users who have old downloads.

`isModelDownloaded()` reports true if either exists. `asr-manager.js` and `file-transcriber.js` both go through `resolveModelPath()` — **do not hardcode paths**.

### File transcription pipeline (long-file + multi-channel)

Modeled on `app_enhanced.py` (the user's Python reference). Key invariants:

- Audio is **streamed through ffmpeg stdout** (`ffmpeg-static` binary via `electron/asr/ffmpeg-path.js`), never loaded to memory. Multi-hour files must stay memory-flat.
- For N-channel files, the worker **loops sequentially over channels**, spawning one ffmpeg per channel with `-af pan=mono|c0=c<N>` to isolate that channel, and one fresh sherpa `OnlineRecognizer` per channel. Segments are tagged with a `channel` field.
- **Timestamps are computed from a sample counter** (`totalSamples / 16000`), not from sherpa (the streaming model doesn't emit word timings). Segments get `start = max(0, end - 5s)` — see app_enhanced.py lines 640, 686.
- Endpoint rules match the Python prototype: `rule1MinTrailingSilence=2.0, rule2MinTrailingSilence=0.8, rule3MinUtteranceLength=20.0`.
- **Messaging**: `process.parentPort.postMessage` from worker → `child.on('message')` in `file-transcriber.js`. After posting `done`/`error`/`cancelled`, the worker removes its message listener and calls `setTimeout(() => process.exit(0), 150)` — exiting immediately drops the final message before IPC flush.

### Renderer: SpeechEditor + session persistence

- `src/lib/components/prosemirror-speech/SpeechEditor.svelte` is a ProseMirror editor with a custom schema (`schema.ts`) and plugins (`plugins/streamingText.ts`, `textSnippets.ts`, `keyboardShortcuts.ts`).
- The editor reads and writes `editor_state` on the `transcription_sessions` table — a **ProseMirror doc JSON blob**. The `transcripts` rows are a secondary per-segment store used for SRT export, **not** the source of truth for rendering. To put content into the editor programmatically, write to `editor_state`.
- `autoSaveInterval` in `SpeechEditor.svelte` starts at mount time **only if `sessionId` is truthy**. If the session is created after mount, auto-save doesn't kick in — callers must invoke `saveState()` themselves. The `FileTranscribeModal` runs its own 15 s periodic save as a safety net.
- The editor component is wrapped in `{#key sessionInfo?.code || 'solo'}` in `+page.svelte`, so changing `currentDbSession` alone does **not** remount it. Good: prop updates flow through reactively (`sessionId` closure is always fresh).
- Live ASR and file ASR both enter the editor through the same `insertStreamingText({text, isFinal, start, end})` + `signalVadSpeechEnd()` API, matching the Python prototype's behavior.

### IPC channel naming

Channels are prefixed by domain: `db:*` (SQLite), `asr:*` (live ASR), `file:*` (file transcription), `broadcast:*` (session sharing), `audio:*` (device/permission). When adding new channels, follow the prefix convention and expose them through the matching `window.*` namespace in `preload.cjs`.

### i18n

`svelte-i18n` with locales in `src/lib/i18n/{et,en,fi}.json`. Estonian is the primary UI language. **Add strings to all three files** when introducing new UI copy; the app uses `$_('key')` / `$_('key', { values: { ... } })`.

## Platform / build gotchas

- `npm install` frequently leaves `better-sqlite3` compiled against the wrong Node ABI. If the app fails at startup with `NODE_MODULE_VERSION` mismatch, run `npm run rebuild`.
- `electron:dev` uses `concurrently`: Vite HMR updates the renderer but **changes to `electron/**/*` or `preload.cjs` require fully stopping and restarting the command**.
- macOS dev-mode: `electron/main.js` symlinks sherpa dylibs into `node_modules/electron/dist/Electron.app/Contents/Frameworks/` as a fallback for rpath. The `postinstall` hook runs `scripts/fix-sherpa-rpath.sh` which is the preferred mechanism.
- Cross-platform building: Windows + Linux (via WSL2) can be built locally. **macOS builds require a Mac or GitHub Actions** (`.github/workflows/build.yml` covers all three on tagged pushes).

## Things the user has explicitly validated

- **Bundled model over first-run download** — releases ship with the ~300 MB model inside the installer; users have zero network dependency after install.
- **GitHub Releases** for distribution (2 GB per-file limit, no aggregate cap; installer-with-model sits comfortably ~400–500 MB). Do not use git-lfs for binaries.
- **Streaming file transcript into the main editor** (same UX as live mic) — not a separate results window.
- **Auto-creating a session** when the user starts a file transcription without one, using the file name as the session name (see `FileTranscribeModal.svelte` `ensureSession` prop wired in `+page.svelte`).
