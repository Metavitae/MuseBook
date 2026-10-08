// Files the writer makes from the book (Word, eBook, PDF, text): written to the
// app's cache first, then handed to the share sheet or saved into a folder the
// writer picks (phone or Drive). Nothing is uploaded anywhere by MuseBook.
import * as FileSystem from "expo-file-system/legacy";
import { Directory, File } from "expo-file-system";
import * as Print from "expo-print";

const safe = (name: string) => name.replace(/[\\/:*?"<>|\n\r]+/g, "-").slice(0, 120);

export interface FileOut {
  uri: string;
  filename: string;
  mime: string;
}

/** Text or base64 bytes → a file in the cache. */
export async function make(o: { filename: string; mime: string; text?: string; base64?: string }): Promise<FileOut> {
  const filename = safe(o.filename);
  const uri = FileSystem.cacheDirectory + filename;
  if (o.base64 != null) await FileSystem.writeAsStringAsync(uri, o.base64, { encoding: FileSystem.EncodingType.Base64 });
  else await FileSystem.writeAsStringAsync(uri, o.text ?? "");
  return { uri, filename, mime: o.mime };
}

/** A print-ready page → a PDF, made by Android's own printing. */
export async function pdf(o: { filename: string; html: string }): Promise<FileOut> {
  const filename = safe(o.filename);
  // A5-ish book page in points; the page's CSS sets margins and type.
  const r = await Print.printToFileAsync({ html: o.html, width: 420, height: 595 });
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.deleteAsync(uri, { idempotent: true });
  await FileSystem.moveAsync({ from: r.uri, to: uri });
  return { uri, filename, mime: "application/pdf" };
}

export async function share(f: FileOut) {
  const Sharing = await import("expo-sharing");
  await Sharing.shareAsync(f.uri, { mimeType: f.mime, dialogTitle: f.filename });
}

/** Opens the folder picker and saves a copy there. Returns false if the writer backed out. */
export async function saveToFolder(f: FileOut): Promise<string | false> {
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch {
    return false;
  }
  const out = dir.createFile(f.filename, f.mime);
  out.write(await new File(f.uri).bytes());
  return dir.uri.includes("com.google.android.apps.docs") ? "Google Drive" : "phone";
}
