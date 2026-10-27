// Each book lives in its own JSON file in the app's private storage
// (books/<id>.json); library.json lists them for the bookshelf. Writes go to a
// temp file first, then replace the real one, so a crash mid-save can't
// leave a half-written book.
import * as FileSystem from "expo-file-system/legacy";
import type { BackupState } from "./backup";

// Before the bookshelf there was one book, in book.json. It is copied into the
// shelf once and then left exactly as it was, as a spare copy.
const OLD_BOOK = FileSystem.documentDirectory + "book.json";
const BOOKS = FileSystem.documentDirectory + "books/";
const LIBRARY = FileSystem.documentDirectory + "library.json";
const PREFS = FileSystem.documentDirectory + "prefs.json";
const REMOVED = FileSystem.documentDirectory + "safety/";

async function readJSON<T>(uri: string): Promise<T | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    return JSON.parse(await FileSystem.readAsStringAsync(uri)) as T;
  } catch {
    return null;
  }
}
async function writeSafe(uri: string, json: string) {
  await FileSystem.writeAsStringAsync(uri + ".tmp", json);
  await FileSystem.moveAsync({ from: uri + ".tmp", to: uri });
}

/** What the bookshelf shows for a book, kept next to the list so the shelf never opens every book. */
export interface ShelfBook {
  id: string;
  title: string;
  author: string;
  words: number;
  updated: string; // last change, ISO
  mood?: string; // the book's look, for its spine on the shelf
  lang?: string; // the language chosen in this book; the shelf speaks it when it was the last book open
  backup?: BackupState; // each book has its own backup folder and history
}
export interface Library {
  books: ShelfBook[];
  last?: string; // the book opened most recently (its sound/Calm settings start the app)
  datesFixed?: boolean; // shelf dates repaired once from each book's own last-writing day
}

const bookUri = (id: string) => BOOKS + id + ".json";
export const newId = () => "b" + Date.now().toString(36);

export function summary(book: any): Omit<ShelfBook, "id" | "backup"> {
  const ui = book?.ui || {};
  const c = book?.contract || {};
  const words = (book?.scenes || []).reduce((n: number, s: any) =>
    n + (String(s?.text || "").replace(/<[^>]*>/g, " ").match(/\S+/g) || []).length, 0);
  return { title: String(c.title || "").trim(), author: String(c.author || "").trim(), words, updated: new Date().toISOString(), mood: ui.mood, lang: ui.lang || ui.shownLang };
}

/** The day the writer last added words, from the book itself (noon, local time). */
function lastWrite(book: any) {
  const d = String(book?.stats?.lastWrite || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00").toISOString() : undefined;
}

let writing: Promise<void> = Promise.resolve();
const queue = (job: () => Promise<void>) => (writing = writing.then(job, job));

export const saveLibrary = (lib: Library) => queue(() => writeSafe(LIBRARY, JSON.stringify(lib)));

/** The bookshelf. The first time, the one book from before the shelf moves onto it,
 *  with the backup settings it already had. */
export async function loadLibrary(oldBackup?: BackupState): Promise<Library> {
  const lib = await readJSON<Library>(LIBRARY);
  if (lib) {
    // The first shelves took the old file's date, which moves on every open ("written today").
    if (!lib.datesFixed) {
      for (const b of lib.books) {
        const w = lastWrite(await readJSON<object>(bookUri(b.id)));
        if (w && w < b.updated) b.updated = w;
      }
      lib.datesFixed = true;
      await writeSafe(LIBRARY, JSON.stringify(lib));
    }
    return lib;
  }
  await FileSystem.makeDirectoryAsync(BOOKS, { intermediates: true }).catch(() => {});
  const fresh: Library = { books: [], datesFixed: true };
  const old = await readJSON<object>(OLD_BOOK);
  if (old) {
    const id = newId(), json = JSON.stringify(old);
    await writeSafe(bookUri(id), json);
    if ((await FileSystem.readAsStringAsync(bookUri(id))) !== json) throw new Error("book didn't copy");
    const s = summary(old);
    const info = await FileSystem.getInfoAsync(OLD_BOOK);
    const w = lastWrite(old);
    if (w) s.updated = w;
    else if (info.exists && info.modificationTime) s.updated = new Date(info.modificationTime * 1000).toISOString();
    fresh.books.push({ id, ...s, backup: oldBackup });
    fresh.last = id;
  }
  await writeSafe(LIBRARY, JSON.stringify(fresh));
  return fresh;
}

export const loadBook = (id: string) => readJSON<object>(bookUri(id));

export function saveBook(id: string, data: unknown) {
  const json = JSON.stringify(data);
  return queue(async () => {
    await FileSystem.makeDirectoryAsync(BOOKS, { intermediates: true }).catch(() => {});
    await writeSafe(bookUri(id), json);
  });
}
/** Waits until every save so far is on disk. */
export const saved = () => writing;

/** Taking a book off the shelf keeps its file in the app's safety folder; nothing is erased. */
export function removeBook(id: string, title: string) {
  return queue(async () => {
    await FileSystem.makeDirectoryAsync(REMOVED, { intermediates: true }).catch(() => {});
    const info = await FileSystem.getInfoAsync(bookUri(id));
    if (!info.exists) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = (title || "book").replace(/[\\/:*?"<>|\n\r]+/g, "-").slice(0, 40);
    await FileSystem.moveAsync({ from: bookUri(id), to: REMOVED + `removed-${safe}-${stamp}.json` });
  });
}

export interface Prefs {
  firstRunSeen?: boolean;
  backup?: BackupState; // before the bookshelf: the one book's backups (moved onto the shelf)
  introUi?: { sound: boolean; calm: boolean }; // the last book's sound and Calm, so the opening needn't wait for it
}
export const loadPrefs = async () => (await readJSON<Prefs>(PREFS)) ?? {};
export const savePrefs = (p: Prefs) => FileSystem.writeAsStringAsync(PREFS, JSON.stringify(p));

/** Writes an export to a temp file and opens the share sheet (Drive, email, Files…). */
export async function shareFile(filename: string, data: string) {
  const Sharing = await import("expo-sharing");
  const safe = filename.replace(/[\\/:*?"<>|]+/g, "-");
  const uri = FileSystem.cacheDirectory + safe;
  await FileSystem.writeAsStringAsync(uri, data);
  await Sharing.shareAsync(uri, {
    mimeType: safe.endsWith(".json") ? "application/json" : "text/markdown",
    dialogTitle: safe,
  });
}
