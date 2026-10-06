# MuseBook

Phone-first book-writing app (Contract → Premise → Story Bible → Outline → Scenes → Draft → Dashboard) with Muse, an on-device writing helper.

- `www/musebook.html` — the app's screens (ported from the v5 Claude artifact; `www/musebook.src.html` is the untouched v5 original). Edit this, then `npm run build:www`.
- `src/bridge.ts` — gives the page its `window.claude.use(...)` API, backed by the phone (book file, share sheet, Muse).
- `src/muse.ts` — Gemma 4 E2B via react-native-litert-lm. Tiers: GPU → CPU → Muse-lite (no AI, in the page).
- `src/storage.ts` — the book is one JSON file in app storage, written atomically.
- Builds: GitHub Actions (`.github/workflows/android-build.yml`) → release APK artifact. No local native builds (machine too small).
