// Backups: an extra copy of the book in a folder the writer picks once (on the
// phone or in their own Drive). The book itself stays in book.json; this never
// replaces it. MuseBook keeps nothing anywhere else and runs no server.
//
// One pair of files per day (the writer's reading copy + the app's restore file).
// Every save that day writes over that day's pair; a new day starts a new pair
// and earlier days are never touched. Deleting and re-creating made Drive add
// "(1)" copies (the old name was still taken), so we write over the file in place.
// Automatic backups only run when the book itself changed since the last one.
import { Directory, File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";

export interface BackupState {
  dir?: string; // folder the writer picked (content:// tree uri)
  place?: string; // what to call it on screen
  auto?: boolean; // back up when the writer stops writing (default on)
  last?: { at: string; place: string }; // last good backup
  failed?: string; // when the last try failed (cleared by a good one)
  files?: Record<string, string>; // "YYYY-MM-DD" → restore file written that day; "YYYY-MM-DD-read" → reading copy
  sig?: string; // fingerprint of the book in the last good backup
}

const SAFETY_DIR = FileSystem.documentDirectory + "safety/";
const AUTO_DELAY = 20_000; // after the last change
const MIN_GAP = 120_000; // at most once every 2 minutes

let state: BackupState = {};
let persist: (s: BackupState) => Promise<void> = async () => {};
let notify: (s: BackupState) => void = () => {};
let latest: unknown = null; // the book as last saved
let dirty = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<void> | null = null;

export function init(saved: BackupState | undefined, book: unknown,
  onPersist: (s: BackupState) => Promise<void>, onChange: (s: BackupState) => void) {
  state = { auto: true, ...(saved ?? {}) };
  latest = book;
  persist = onPersist;
  notify = onChange;
}
export const getState = () => state;

/** A fingerprint of what's in the book: the writing, cards and plan. Which screen
 *  is open or today's word count (ui, stats) don't make it a different book. */
function sig(book: any) {
  if (!book) return "";
  const { ui, stats, ...rest } = book;
  const text = JSON.stringify(rest);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return text.length + ":" + (h >>> 0).toString(36);
}
/** True when this book is exactly what the last backup holds. */
export const unchanged = (book: unknown) => !!state.sig && sig(book) === state.sig;

async function update(patch: Partial<BackupState>) {
  state = { ...state, ...patch };
  notify(state);
  await persist(state);
}

const today = () => new Date().toISOString().slice(0, 10);
function safeTitle(book: any) {
  const t = String(book?.contract?.title || "").trim() || "libro";
  return t.replace(/[\\/:*?"<>|\n\r]+/g, "-").slice(0, 60);
}
/** The backup file: the book plus a small header so restore can recognise it. */
function wrap(book: unknown) {
  return JSON.stringify({ _musebook: { app: "MuseBook", format: 1, saved: new Date().toISOString() }, ...(book as object) }, null, 1);
}

/** The writer's language: their choice in the app, else the phone's. */
function spanish(book: any) {
  const l = book?.ui?.lang || book?.ui?.shownLang; // chosen in the app, else what the app shows
  if (l) return l === "es";
  try { return /^es/i.test(Intl.DateTimeFormat().resolvedOptions().locale); } catch { return false; }
}
/** The reading copy: just the book, in reading order, as plain text anyone can open.
 *  Dedication, prologue, chapters by number, epilogue; scenes in their order. */
function readable(book: any) {
  const es = spanish(book), c = book?.contract || {};
  const KIND: Record<string, [string, string]> = { dedication: ["Dedication", "Dedicatoria"], prologue: ["Prologue", "Prólogo"], epilogue: ["Epilogue", "Epílogo"] };
  const key = (s: any) => (KIND[s.kind] ? "#" + s.kind : String(s.chapter || "").trim() || "—");
  const rank = (k: string) => (k === "#dedication" ? 0 : k === "#prologue" ? 1 : k === "#epilogue" ? 3 : 2);
  const scenes: any[] = (book?.scenes || []).filter((s: any) => String(s.text || "").trim());
  const keys = [...new Set(scenes.map(key))].sort((a, b) => {
    const r = rank(a) - rank(b); if (r) return r;
    const na = parseFloat(a), nb = parseFloat(b);
    return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
  });
  const clean = (t: string) => String(t || "").trim().replace(/[.\s]+$/, "");
  const same = (a: string, b: string) => a.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") === b.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const out: string[] = [];
  const title = String(c.title || "").trim() || (es ? "Mi libro" : "My book");
  out.push(title.toUpperCase());
  if (String(c.subtitle || "").trim()) out.push(String(c.subtitle).trim());
  if (String(c.author || "").trim()) out.push((es ? "por " : "by ") + String(c.author).trim());
  const words = scenes.reduce((n, s) => n + (String(s.text).trim().match(/\S+/g) || []).length, 0);
  out.push("", (es ? "Copia para leer · " : "Reading copy · ") + new Date().toLocaleDateString(es ? "es-MX" : "en-US", { day: "numeric", month: "long", year: "numeric" }) + " · " + words.toLocaleString("en-US") + (es ? " palabras" : " words"), "");
  keys.forEach((k) => {
    const group = scenes.filter((s) => key(s) === k);
    const head = k[0] === "#" ? KIND[k.slice(1)][es ? 1 : 0] : (es ? "Capítulo " : "Chapter ") + k;
    out.push("", "", head.toUpperCase(), "");
    group.forEach((s, i) => {
      const t = clean(s.title);
      let text = String(s.text).trim();
      // The writer often starts the text with the same heading ("Prólogo", "Nora."): print it once.
      const first = text.split("\n")[0];
      const repeats = first.length < 60 && (same(first, head) || (t && same(first, t)));
      if (repeats) text = text.slice(first.length).trim();
      if (t && !/^(scene|escena)\s*\d+$/i.test(t) && !same(t, head)) out.push(t, "");
      else if (group.length > 1) out.push((es ? "Escena " : "Scene ") + (i + 1), "");
      out.push(text.replace(/\n{3,}/g, "\n\n"), "");
      if (i < group.length - 1) out.push("* * *", "");
    });
  });
  return out.join("\n").replace(/\n{4,}/g, "\n\n\n") + "\n";
}

/** A readable name for the folder the writer picked. */
function placeName(uri: string) {
  if (uri.includes("com.google.android.apps.docs")) return "Google Drive";
  const m = decodeURIComponent(uri).match(/\/tree\/[^:]*:(.*?)\/?$/);
  return m && m[1] ? m[1] : "phone";
}

/** Opens Android's folder picker. Returns false if the writer backed out. */
export async function chooseFolder() {
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch {
    return false;
  }
  await update({ dir: dir.uri, place: placeName(dir.uri), files: {}, sig: undefined, failed: undefined }); // a new place gets a first backup
  return true;
}

async function writeVerified(dir: Directory, name: string, text: string, mime = "application/json") {
  const f = dir.createFile(name, mime);
  f.write(text);
  if ((await f.text()) !== text) {
    try { f.delete(); } catch {}
    throw new Error("backup didn't read back the same");
  }
  return f;
}

/** Today's file by this name: the one we wrote earlier today, else one already in the folder. */
function findToday(dir: Directory, name: string, known?: string) {
  if (known) {
    try { const f = new File(known); if (f.exists && f.name === name) return f; } catch {}
  }
  try {
    for (const x of dir.list()) if (x instanceof File && x.name === name) return x;
  } catch {}
  return null;
}
/** Write over today's file if it's there (read back to check), otherwise make it. */
async function writeOver(dir: Directory, name: string, text: string, mime: string, known?: string) {
  const old = findToday(dir, name, known);
  if (old) {
    try {
      old.write(text);
      if ((await old.text()) === text) return old;
    } catch {}
    // Some folders don't shorten a file on write: replace it instead.
    try { old.delete(); } catch {}
  }
  return writeVerified(dir, name, text, mime);
}

async function runBackup(book: unknown) {
  if (!state.dir) throw new Error("no folder");
  const dir = new Directory(state.dir);
  const day = today();
  // Two files: the one the app restores from (everything: cards, settings, looks),
  // and a clean reading copy of the book for the writer.
  // Names say who each file is for: the writer's copy to read, the app's file to restore.
  const es = spanish(book);
  const f = await writeOver(dir, `${safeTitle(book)} - ${es ? "respaldo de la app, no abrir" : "app backup, don't open"} - ${day}.json`, wrap(book), "application/json", state.files?.[day]);
  const files: Record<string, string> = { [day]: f.uri };
  try {
    const r = await writeOver(dir, `${safeTitle(book)} - ${es ? "TU LIBRO" : "YOUR BOOK"} - ${day}.txt`, readable(book), "text/plain", state.files?.[day + "-read"]);
    files[day + "-read"] = r.uri;
  } catch {} // the restore file is what matters; the reading copy is a bonus
  // Renamed book or switched language today: the morning's pair had other names. Still one pair per day.
  for (const [k, uri] of Object.entries(state.files ?? {})) {
    if (k.startsWith(day) && files[k] && uri !== files[k]) { try { new File(uri).delete(); } catch {} }
  }
  // Only today's entries are needed; older days' files stay in the folder untouched.
  await update({ files, sig: sig(book), last: { at: new Date().toISOString(), place: state.place || "" }, failed: undefined });
}

/** Back up now. Resolves with the new state; throws if it didn't work. */
export async function backupNow(book?: unknown) {
  if (book !== undefined) latest = book;
  if (timer) { clearTimeout(timer); timer = null; }
  const run = async () => {
    try {
      dirty = false;
      await runBackup(latest);
    } catch (e) {
      dirty = true;
      await update({ failed: new Date().toISOString() });
      throw e;
    }
  };
  running = (running ?? Promise.resolve()).then(run, run);
  await running;
  return state;
}

function sinceLast() {
  return state.last ? Date.now() - Date.parse(state.last.at) : Infinity;
}
function schedule(delay: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    if (!dirty || !state.dir || state.auto === false) return;
    const wait = MIN_GAP - sinceLast();
    if (wait > 0) return schedule(wait);
    backupNow().catch(() => schedule(MIN_GAP)); // retry later, never bother the writer
  }, delay);
}

/** Every save of the book comes through here. */
export function bookChanged(book: unknown) {
  latest = book;
  dirty = !unchanged(book);
  if (!dirty) { if (timer) { clearTimeout(timer); timer = null; } return; }
  if (state.dir && state.auto !== false) schedule(AUTO_DELAY);
}

/** The app is going to the background or closing: back up now if anything changed. */
export function leaving() {
  if (!dirty || !state.dir || state.auto === false) return;
  if (sinceLast() < MIN_GAP) return schedule(MIN_GAP - sinceLast());
  backupNow().catch(() => schedule(MIN_GAP));
}

export async function setAuto(on: boolean) {
  await update({ auto: on });
  if (on && dirty) schedule(AUTO_DELAY);
}

/** Before a restore: keep the current book in the app's private storage, and in the folder if there is one. */
export async function safetyCopy(book: unknown) {
  const text = wrap(book);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await FileSystem.makeDirectoryAsync(SAFETY_DIR, { intermediates: true }).catch(() => {});
  await FileSystem.writeAsStringAsync(SAFETY_DIR + `antes-de-restaurar-${stamp}.json`, text);
  if (state.dir) {
    try {
      await writeVerified(new Directory(state.dir), `${safeTitle(book)} - ${spanish(book) ? "respaldo de la app antes de restaurar, no abrir" : "app backup before restoring, don't open"} - ${stamp.slice(0, 16)}.json`, text);
      return state.place || "";
    } catch {}
  }
  return "phone";
}

/** Opens Android's file picker. Returns the file's text, or null if the writer backed out. */
export async function pickBackupFile(): Promise<string | null> {
  // No type filter: Drive often labels .json files as plain binary.
  const r = (await File.pickFileAsync({})) as { canceled: boolean; result: File | null };
  if (r.canceled || !r.result) return null;
  const f = r.result;
  if ((f.size ?? 0) > 50 * 1024 * 1024) throw new Error("too big");
  return await f.text();
}
