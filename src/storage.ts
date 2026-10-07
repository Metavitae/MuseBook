// The book lives in one JSON file in the app's private storage. Writes go to a
// temp file first, then replace the real one, so a crash mid-save can't
// leave a half-written book.
import * as FileSystem from "expo-file-system/legacy";
import type { BackupState } from "./backup";

const BOOK = FileSystem.documentDirectory + "book.json";
const BOOK_TMP = BOOK + ".tmp";
const PREFS = FileSystem.documentDirectory + "prefs.json";

async function readJSON<T>(uri: string): Promise<T | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    return JSON.parse(await FileSystem.readAsStringAsync(uri)) as T;
  } catch {
    return null;
  }
}

export const loadBook = () => readJSON<object>(BOOK);

let writing: Promise<void> = Promise.resolve();
export function saveBook(data: unknown) {
  const json = JSON.stringify(data);
  const write = async () => {
    await FileSystem.writeAsStringAsync(BOOK_TMP, json);
    await FileSystem.moveAsync({ from: BOOK_TMP, to: BOOK });
  };
  writing = writing.then(write, write);
  return writing;
}

export interface Prefs {
  firstRunSeen?: boolean;
  backup?: BackupState;
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
