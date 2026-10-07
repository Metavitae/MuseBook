// Backups: an extra copy of the book in a folder the writer picks once (on the
// phone or in their own Drive). The book itself stays in book.json; this never
// replaces it. MuseBook keeps nothing anywhere else and runs no server.
//
// Android's folder access hands back opaque file ids, not names, so we remember
// the file we wrote for each day and replace it ourselves: delete the old one,
// write the new one, read it back to check.
import { Directory, File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";

export interface BackupState {
  dir?: string; // folder the writer picked (content:// tree uri)
  place?: string; // what to call it on screen
  auto?: boolean; // back up when the writer stops writing (default on)
  last?: { at: string; place: string }; // last good backup
  failed?: string; // when the last try failed (cleared by a good one)
  files?: Record<string, string>; // "YYYY-MM-DD" → file uri written that day
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
  await update({ dir: dir.uri, place: placeName(dir.uri), files: {}, failed: undefined });
  return true;
}

async function writeVerified(dir: Directory, name: string, text: string) {
  const f = dir.createFile(name, "application/json");
  f.write(text);
  if ((await f.text()) !== text) {
    try { f.delete(); } catch {}
    throw new Error("backup didn't read back the same");
  }
  return f;
}

async function runBackup(book: unknown) {
  if (!state.dir) throw new Error("no folder");
  const dir = new Directory(state.dir);
  const day = today();
  const old = state.files?.[day];
  if (old) {
    try { new File(old).delete(); } catch {} // gone already is fine
  }
  const f = await writeVerified(dir, `${safeTitle(book)}-respaldo-${day}.json`, wrap(book));
  // Only today's entry is needed; older days' files stay in the folder untouched.
  await update({ files: { [day]: f.uri }, last: { at: new Date().toISOString(), place: state.place || "" }, failed: undefined });
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
  dirty = true;
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
      await writeVerified(new Directory(state.dir), `${safeTitle(book)}-antes-de-restaurar-${stamp.slice(0, 16)}.json`, text);
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
