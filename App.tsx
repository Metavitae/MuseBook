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
import { loadBook, saveBook, loadPrefs, savePrefs, shareFile, type Prefs } from "./src/storage";

interface Boot {
  book: object | null;
  prefs: Prefs;
  status: Muse.MuseStatus;
}

export default function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const web = useRef<WebView>(null);
  const prefs = useRef<Prefs>({});
  // The page reports its atmosphere so the bars around it match.
  const [theme, setTheme] = useState({ bg: "#f6f2e9", dark: false });

  useEffect(() => {
    (async () => {
      await Muse.init();
      const [book, p] = await Promise.all([loadBook(), loadPrefs()]);
      prefs.current = p;
      Backup.init(p.backup, book, async (b) => {
        prefs.current = { ...prefs.current, backup: b };
        await savePrefs(prefs.current);
      }, (b) => run(`window.__mb.backup(${JSON.stringify(b)})`));
      setBoot({ book, prefs: p, status: Muse.getStatus() });
    })();
  }, []);

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
      if (s === "background") Backup.leaving();
    });
    return () => sub.remove();
  }, []);

  function run(js: string) {
    web.current?.injectJavaScript(js + "; true;");
  }
  const reply = (id: number, ok: boolean, v: unknown) =>
    run(`window.__mb.reply(${id}, ${ok}, ${JSON.stringify(v ?? null)})`);

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
        case "save":
          await saveBook(a[0]);
          Backup.bookChanged(a[0]);
          return reply(id, true, null);
        case "backupChoose":
          return reply(id, true, await Backup.chooseFolder());
        case "backupNow":
          return reply(id, true, await Backup.backupNow(a[0]));
        case "backupAuto":
          await Backup.setAuto(!!a[0]);
          return reply(id, true, null);
        case "backupSafety":
          return reply(id, true, await Backup.safetyCopy(a[0]));
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
    () => (boot ? bridgeScript(boot.book, boot.status, !!boot.prefs.firstRunSeen, Backup.getState()) : ""),
    [boot],
  );

  if (!boot) return <View style={{ flex: 1, backgroundColor: "#f6f2e9" }} />;

  return (
    <SafeAreaProvider>
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top", "bottom"]}>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <WebView
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
  );
}
