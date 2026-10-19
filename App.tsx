import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, AppState } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { WWW_HTML } from "./src/www.generated";
import { bridgeScript } from "./src/bridge";
import * as Muse from "./src/muse";
import * as Backup from "./src/backup";
import * as Files from "./src/files";
import * as IntentLauncher from "expo-intent-launcher";
import { Intro } from "./src/Intro";
import {
  loadBook, saveBook, saved, loadLibrary, saveLibrary, removeBook, newId, summary,
  loadPrefs, savePrefs, shareFile, type Prefs, type Library,
} from "./src/storage";

const DRIVE_APP = "com.google.android.apps.docs";
// The opening video starts on this near-white, so the moment before the page is up matches it.
const INTRO_WHITE = "#f2f4f4";

interface Boot {
  hasDrive: boolean;
  prefs: Prefs;
  status: Muse.MuseStatus;
}
// What the page shows: one open book, or the bookshelf (id null).
interface Showing {
  id: string | null;
  book: object | null;
}

export default function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [view, setView] = useState<Showing | null>(null);
  const lib = useRef<Library>({ books: [] });
  const openId = useRef<string | null>(null);
  // The opening plays as soon as the writer's sound and Calm settings are read;
  // the page waits for it (introWait) before its own opening sound.
  const [intro, setIntro] = useState<{ sound: boolean; calm: boolean } | null>(null);
  const introOver = useRef(false);
  const introWaiting = useRef<number[]>([]);
  const web = useRef<WebView>(null);
  const prefs = useRef<Prefs>({});
  // The page reports its atmosphere so the bars around it match.
  const [theme, setTheme] = useState({ bg: INTRO_WHITE, dark: false });

  useEffect(() => {
    (async () => {
      const p = await loadPrefs();
      prefs.current = p;
      lib.current = await loadLibrary(p.backup);
      const lastId = lib.current.last ?? lib.current.books[0]?.id;
      const last = lastId ? await loadBook(lastId) : null;
      const ui = (last as { ui?: { sound?: boolean; calm?: boolean } } | null)?.ui ?? {};
      setIntro({ sound: ui.sound !== false, calm: !!ui.calm });
      await Muse.init();
      const hasDrive = await IntentLauncher.getApplicationIconAsync(DRIVE_APP).then(() => true, () => false);
      setBoot({ prefs: p, status: Muse.getStatus(), hasDrive });
      // Every open starts at the bookshelf; with no books yet, straight into a new one.
      if (lib.current.books.length) setView({ id: null, book: null });
      else await openBook(addBook());
    })();
  }, []);

  /** A new, empty book on the shelf. Its file is written on its first save. */
  function addBook() {
    const id = newId();
    lib.current.books.push({ id, title: "", author: "", words: 0, updated: new Date().toISOString() });
    return id;
  }

  async function openBook(id: string) {
    const book = await loadBook(id);
    Backup.init(lib.current.books.find((b) => b.id === id)?.backup, book, async (b) => {
      const entry = lib.current.books.find((x) => x.id === id);
      if (entry) entry.backup = b;
      await saveLibrary(lib.current);
    }, (b) => run(`window.__mb.backup(${JSON.stringify(b)})`));
    lib.current.last = id;
    await saveLibrary(lib.current);
    openId.current = id;
    setView({ id, book });
  }

  /** Back to the bookshelf: everything written is on disk and backed up first. */
  async function showShelf() {
    await saved();
    await Backup.flush();
    openId.current = null;
    setView({ id: null, book: null });
  }

  /** What the page needs to draw the shelf (no backup details). */
  function shelfData() {
    const last = lib.current.books.find((b) => b.id === lib.current.last);
    return {
      books: [...lib.current.books]
        .sort((a, b) => b.updated.localeCompare(a.updated))
        .map(({ backup, ...b }) => b),
      mood: last?.mood,
      lang: last?.lang,
    };
  }

  useEffect(() => {
    if (!boot) return;
    const off = Muse.onStatus((s) => run(`window.__mb.status(${JSON.stringify(s)})`));
    // Warm Muse up shortly after start so the first request answers quickly.
    const warm = setTimeout(() => Muse.load(), 4000);
    return () => {
      off();
      clearTimeout(warm);
    };
  }, [boot]);

  // A download can't continue in the background; pause cleanly so it resumes.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background" && Muse.getStatus().state === "downloading") Muse.pause();
      if (s === "background" && openId.current) Backup.leaving();
    });
    return () => sub.remove();
  }, []);

  function run(js: string) {
    web.current?.injectJavaScript(js + "; true;");
  }
  const reply = (id: number, ok: boolean, v: unknown) =>
    run(`window.__mb.reply(${id}, ${ok}, ${JSON.stringify(v ?? null)})`);

  function introEnded() {
    introOver.current = true;
    introWaiting.current.splice(0).forEach((id) => reply(id, true, null));
  }

  async function onMessage(e: WebViewMessageEvent) {
    let msg: { id: number; m: string; a: unknown[] };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    const { id, m, a } = msg;
    try {
      switch (m) {
        case "save": {
          const bookId = openId.current;
          if (!bookId) return reply(id, true, null); // the shelf has no book to save
          await saveBook(bookId, a[0]);
          Backup.bookChanged(a[0]);
          const entry = lib.current.books.find((b) => b.id === bookId);
          if (entry) {
            const s = summary(a[0]);
            // "Last written" moves only when the writing or the name changed, not on opening a screen.
            const same = s.words === entry.words && s.title === entry.title && s.author === entry.author;
            Object.assign(entry, same ? { ...s, updated: entry.updated } : s);
            saveLibrary(lib.current);
          }
          return reply(id, true, null);
        }
        case "shelfOpen":
          reply(id, true, null);
          return openBook(String(a[0]));
        case "shelfNew":
          reply(id, true, null);
          return openBook(addBook());
        case "shelfShow":
          reply(id, true, null);
          return showShelf();
        case "shelfRemove": {
          const gone = lib.current.books.find((b) => b.id === String(a[0]));
          if (gone) {
            await removeBook(gone.id, gone.title);
            lib.current.books = lib.current.books.filter((b) => b !== gone);
            if (lib.current.last === gone.id) lib.current.last = lib.current.books[0]?.id;
            await saveLibrary(lib.current);
          }
          return reply(id, true, shelfData().books);
        }
        case "backupChoose":
          return reply(id, true, await Backup.chooseFolder());
        case "backupNow":
          return reply(id, true, await Backup.backupNow(a[0]));
        case "backupSame":
          return reply(id, true, Backup.unchanged(a[0]));
        case "backupAuto":
          await Backup.setAuto(!!a[0]);
          return reply(id, true, null);
        case "backupSafety":
          return reply(id, true, await Backup.safetyCopy(a[0]));
        case "introWait":
          if (introOver.current) return reply(id, true, null);
          introWaiting.current.push(id);
          return;
        case "openDrive":
          // Opening the Drive app refreshes the list Android's file picker shows.
          IntentLauncher.openApplication(DRIVE_APP);
          return reply(id, true, null);
        case "backupPick":
          return reply(id, true, await Backup.pickBackupFile());
        case "share": {
          const o = a[0] as { filename: string; data: string };
          await shareFile(o.filename, o.data);
          return reply(id, true, null);
        }
        case "fileMake":
          return reply(id, true, await Files.make(a[0] as Parameters<typeof Files.make>[0]));
        case "filePdf":
          return reply(id, true, await Files.pdf(a[0] as { filename: string; html: string }));
        case "fileShare":
          await Files.share(a[0] as Files.FileOut);
          return reply(id, true, null);
        case "fileSave":
          return reply(id, true, await Files.saveToFolder(a[0] as Files.FileOut));
        case "museDownload":
          reply(id, true, null);
          return Muse.download();
        case "musePause":
          await Muse.pause();
          return reply(id, true, null);
        case "museDelete":
          await Muse.remove();
          return reply(id, true, null);
        case "firstRunSeen":
          prefs.current = { ...prefs.current, firstRunSeen: true };
          await savePrefs(prefs.current);
          return reply(id, true, null);
        case "theme":
          setTheme({ bg: String(a[0]) || "#f6f2e9", dark: !!a[1] });
          return reply(id, true, null);
        case "museAsk": {
          const text = await Muse.ask(String(a[0]), (t) => run(`window.__mb.stream(${id}, ${JSON.stringify(t)})`));
          return reply(id, true, text);
        }
        default:
          return reply(id, false, "unknown call " + m);
      }
    } catch (err) {
      reply(id, false, String((err as Error)?.message ?? err));
    }
  }

  // Stable props: a new source object would make the WebView reload the page.
  const source = useMemo(() => ({ html: WWW_HTML, baseUrl: "https://musebook.local/" }), []);
  const injected = useMemo(
    () => (boot && view
      ? bridgeScript(view.book, Muse.getStatus(), !!prefs.current.firstRunSeen, Backup.getState(), boot.hasDrive,
        view.id, view.id ? null : shelfData())
      : ""),
    [boot, view],
  );

  const opening = intro && (
    <Intro sound={intro.sound} calm={intro.calm} onEnd={introEnded} onBars={(bg, dark) => setTheme({ bg, dark })} />
  );
  if (!boot || !view) return <View style={{ flex: 1, backgroundColor: INTRO_WHITE }}>{opening}</View>;

  return (
    <View style={{ flex: 1, backgroundColor: INTRO_WHITE }}>
    <SafeAreaProvider>
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top", "bottom"]}>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <WebView
        key={view.id ?? "shelf"} // a new page for each book, so nothing from one book stays in the next
        ref={web}
        originWhitelist={["*"]}
        source={source}
        injectedJavaScriptBeforeContentLoaded={injected}
        onMessage={onMessage}
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        allowFileAccess={false}
        setSupportMultipleWindows={false}
        textZoom={100}
        overScrollMode="never"
        style={{ flex: 1, backgroundColor: "transparent" }}
      />
    </SafeAreaView>
    </SafeAreaProvider>
    {opening}
    </View>
  );
}
