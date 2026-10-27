import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, AppState, StyleSheet } from "react-native";
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
// A page: one open book, or the bookshelf (id null). A new page loads behind the
// one on screen and takes its place once it has drawn itself (it reports its colors),
// so opening a book never flashes an empty page.
interface Page {
  key: string;
  id: string | null;
  injected: string;
}

export default function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const pageSeq = useRef(0);
  const lib = useRef<Library>({ books: [] });
  const openId = useRef<string | null>(null);
  // The opening plays as soon as the writer's sound and Calm settings are read;
  // the page waits for it (introWait) before its own opening sound.
  const [intro, setIntro] = useState<{ sound: boolean; calm: boolean } | null>(null);
  const introOver = useRef(false);
  const introWaiting = useRef<{ id: number; key: string }[]>([]);
  const webs = useRef<Record<string, WebView | null>>({});
  const hasDrive = useRef(false);
  const prefs = useRef<Prefs>({});
  // The page reports its atmosphere so the bars around it match.
  const [theme, setTheme] = useState({ bg: INTRO_WHITE, dark: false });

  useEffect(() => {
    (async () => {
      const p = await loadPrefs();
      prefs.current = p;
      // The opening starts on the small prefs file alone (sound and Calm of the last book),
      // before the shelf or any book is read.
      if (p.introUi) setIntro(p.introUi);
      lib.current = await loadLibrary(p.backup);
      if (!p.introUi) {
        const lastId = lib.current.last ?? lib.current.books[0]?.id;
        const last = lastId ? await loadBook(lastId) : null;
        setIntro(introUi(last));
      }
      await Muse.init();
      hasDrive.current = await IntentLauncher.getApplicationIconAsync(DRIVE_APP).then(() => true, () => false);
      setBoot({ prefs: p, status: Muse.getStatus(), hasDrive: hasDrive.current });
      // Every open starts at the bookshelf; with no books yet, straight into a new one.
      if (lib.current.books.length) showPage(null, null);
      else await openBook(addBook());
    })();
  }, []);

  function introUi(book: unknown) {
    const ui = (book as { ui?: { sound?: boolean; calm?: boolean } } | null)?.ui ?? {};
    return { sound: ui.sound !== false, calm: !!ui.calm };
  }

  /** Loads a page for this book (or the shelf) behind the one on screen. */
  function showPage(id: string | null, book: object | null) {
    const key = (id ?? "shelf") + ":" + ++pageSeq.current;
    const injected = bridgeScript(book, Muse.getStatus(), !!prefs.current.firstRunSeen, Backup.getState(), hasDrive.current,
      id, id ? null : shelfData(), pageSeq.current > 1);
    setPages((ps) => [...ps, { key, id, injected }]);
    // If a page never reports in, show it anyway.
    setTimeout(() => pageReady(key), 6000);
  }
  /** The newest page has drawn itself: it takes over the screen and the older ones close. */
  function pageReady(key: string) {
    setPages((ps) => {
      const i = ps.findIndex((p) => p.key === key);
      if (i <= 0) return ps;
      for (const p of ps.slice(0, i)) delete webs.current[p.key];
      return ps.slice(i);
    });
  }

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
    const ui = introUi(book);
    if (ui.sound !== prefs.current.introUi?.sound || ui.calm !== prefs.current.introUi?.calm) {
      prefs.current = { ...prefs.current, introUi: ui };
      savePrefs(prefs.current);
    }
    openId.current = id;
    showPage(id, book);
  }

  /** Back to the bookshelf: everything written is on disk and backed up first. */
  async function showShelf() {
    await saved();
    await Backup.flush();
    openId.current = null;
    showPage(null, null);
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
    const off = Muse.onStatus((s) => Object.keys(webs.current).forEach((k) => run(`window.__mb.status(${JSON.stringify(s)})`, k)));
    // Warm Muse up shortly after start so the first request answers quickly.
    const warm = setTimeout(() => Muse.load(), 4000);
    const lab = setTimeout(() => Muse.editorLab().catch(() => {}), 6000); // TEST ONLY, see muse.ts
    return () => {
      off();
      clearTimeout(warm);
      clearTimeout(lab);
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

  /** Runs in a page: the one named, else the newest (the open book or the shelf). */
  function run(js: string, key?: string) {
    const k = key ?? Object.keys(webs.current).pop();
    if (k) webs.current[k]?.injectJavaScript(js + "; true;");
  }

  function introEnded() {
    introOver.current = true;
    introWaiting.current.splice(0).forEach((w) => run(`window.__mb.reply(${w.id}, true, null)`, w.key));
  }

  async function onMessage(e: WebViewMessageEvent, key: string) {
    const reply = (id: number, ok: boolean, v: unknown) =>
      run(`window.__mb.reply(${id}, ${ok}, ${JSON.stringify(v ?? null)})`, key);
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
          introWaiting.current.push({ id, key });
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
          pageReady(key); // the page reports its colors once it has drawn itself
          return reply(id, true, null);
        case "museAsk": {
          const text = await Muse.ask(String(a[0]), (t) => run(`window.__mb.stream(${id}, ${JSON.stringify(t)})`, key));
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

  const opening = intro && (
    <Intro sound={intro.sound} calm={intro.calm} onEnd={introEnded} onBars={(bg, dark) => setTheme({ bg, dark })} />
  );
  if (!boot || !pages.length) return <View style={{ flex: 1, backgroundColor: INTRO_WHITE }}>{opening}</View>;

  return (
    <View style={{ flex: 1, backgroundColor: INTRO_WHITE }}>
    <SafeAreaProvider>
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top", "bottom"]}>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <View style={{ flex: 1 }}>
      {pages.map((p, i) => (
      <WebView
        key={p.key} // a new page for each book, so nothing from one book stays in the next
        ref={(w) => { if (w) webs.current[p.key] = w; }}
        originWhitelist={["*"]}
        source={source}
        injectedJavaScriptBeforeContentLoaded={p.injected}
        onMessage={(e) => onMessage(e, p.key)}
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        allowFileAccess={false}
        setSupportMultipleWindows={false}
        textZoom={100}
        overScrollMode="never"
        // The page on screen is drawn last (on top); a loading page waits underneath it.
        style={[{ backgroundColor: "transparent" }, StyleSheet.absoluteFill, { zIndex: i === 0 ? 1 : 0 }]}
      />
      ))}
      </View>
    </SafeAreaView>
    </SafeAreaProvider>
    {opening}
    </View>
  );
}
