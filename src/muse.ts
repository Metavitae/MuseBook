// Muse engine: downloads Gemma 4 E2B once (resumable), then runs it on the
// phone. Tiers: Gemma on the graphics chip → Gemma on the processor →
// Muse-lite (no AI, handled in the page) when the phone can't run Gemma.
import * as FileSystem from "expo-file-system/legacy";
import { Directory, File } from "expo-file-system";
import { ToastAndroid } from "react-native";
import { createLLM, isMemoryError, type LiteRTLMInstance } from "react-native-litert-lm";

// Pinned to one model revision so a resumed download never mixes two files.
const MODEL_URL =
  "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/b3ca0d2f076785a8f4b2219ddbd2bdb99954eae1/gemma-4-E2B-it.litertlm";
export const MODEL_BYTES = 2588147712;
const DIR = FileSystem.documentDirectory + "models/";
const FINAL = DIR + "gemma-4-E2B-it.litertlm";
const PART = FINAL + ".part";
// Model plus room to breathe while it's written.
const FREE_SPACE_NEEDED = MODEL_BYTES + 400 * 1024 * 1024;

const SYSTEM_PROMPT =
  "You are the Moon, a warm writing helper inside a book-writing app for beginner and amateur writers. " +
  "You only suggest; the writer decides and writes their own book. Keep answers short and follow the requested format exactly, with no preamble. " +
  "Answer in the language the writer's own text is written in. If that is Spanish, write natural Mexican Spanish: " +
  "never use Spain-only words (say 'agarra' or 'toma', never 'coge'; 'ustedes', never 'vosotros'), and double-check that every word you use is a real word.";

export type MuseState =
  | "none" // model not downloaded
  | "downloading"
  | "paused" // partial download on disk, can resume
  | "ready" // downloaded, not loaded yet
  | "loading"
  | "loaded" // in memory, answering
  | "unsupported"; // downloaded but this phone can't run it → Muse-lite

export interface MuseStatus {
  state: MuseState;
  progress: number; // 0..1 while downloading/paused
  backend?: "gpu" | "cpu";
  message?: string;
}

type Listener = (s: MuseStatus) => void;

let status: MuseStatus = { state: "none", progress: 0 };
let listeners: Listener[] = [];
let llm: LiteRTLMInstance | null = null;
let task: FileSystem.DownloadResumable | null = null;
let pausing = false;
let loadPromise: Promise<boolean> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function set(next: Partial<MuseStatus>) {
  status = { ...status, ...next };
  listeners.forEach((l) => l(status));
}

export function onStatus(l: Listener) {
  listeners.push(l);
  l(status);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}

export function getStatus() {
  return status;
}

async function size(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists && !info.isDirectory ? info.size : 0;
}

export async function init() {
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
  if ((await size(FINAL)) === MODEL_BYTES) set({ state: "ready", progress: 1 });
  else {
    const part = await size(PART);
    set(part > 0 ? { state: "paused", progress: part / MODEL_BYTES } : { state: "none", progress: 0 });
  }
}

export async function download() {
  if (status.state !== "none" && status.state !== "paused") return;
  const have = await size(PART);
  const free = await FileSystem.getFreeDiskStorageAsync();
  if (free < FREE_SPACE_NEEDED - have) {
    const gb = ((FREE_SPACE_NEEDED - have) / 1e9).toFixed(1);
    set({ message: `The Moon needs about ${gb} GB of free space on this phone. Free some up and try again.` });
    return;
  }
  pausing = false;
  set({ state: "downloading", message: undefined, progress: have / MODEL_BYTES });
  // Resuming = asking for the bytes after what's already on disk.
  task = FileSystem.createDownloadResumable(
    MODEL_URL,
    PART,
    {},
    // On Android totalBytesWritten already counts the resumed bytes.
    (p) => set({ progress: p.totalBytesWritten / MODEL_BYTES }),
    have > 0 ? String(have) : undefined,
  );
  try {
    const res = await task.downloadAsync();
    task = null;
    if (!res) return; // paused
    if ((await size(PART)) !== MODEL_BYTES) throw new Error("incomplete");
    await FileSystem.moveAsync({ from: PART, to: FINAL });
    set({ state: "ready", progress: 1 });
    load();
  } catch {
    task = null;
    const part = await size(PART);
    if (part > MODEL_BYTES) await FileSystem.deleteAsync(PART, { idempotent: true });
    set({
      state: part > 0 && part <= MODEL_BYTES ? "paused" : "none",
      progress: part <= MODEL_BYTES ? part / MODEL_BYTES : 0,
      message: pausing ? undefined : "The download stopped (no connection?). Tap Resume to continue where it left off.",
    });
  }
}

export async function pause() {
  if (!task) return;
  pausing = true;
  await task.pauseAsync().catch(() => {});
  task = null;
  const part = await size(PART);
  set({ state: part > 0 ? "paused" : "none", progress: part / MODEL_BYTES });
}

export async function remove() {
  await pause();
  if (llm) await llm.unload().catch(() => {});
  llm = null;
  loadPromise = null;
  await FileSystem.deleteAsync(PART, { idempotent: true });
  await FileSystem.deleteAsync(FINAL, { idempotent: true });
  set({ state: "none", progress: 0, backend: undefined, message: undefined });
}

function path(uri: string) {
  return uri.replace(/^file:\/\//, "");
}

async function tryLoad(backend: "gpu" | "cpu", systemPrompt = SYSTEM_PROMPT, ctx = 2048, out = 320) {
  const engine = createLLM();
  await engine.loadModel(path(FINAL), {
    backend,
    systemPrompt,
    maxContextTokens: ctx,
    maxOutputTokens: out,
    temperature: 0.8,
    topK: 64,
    topP: 0.95,
  });
  return engine;
}

/** Loads Gemma, GPU first then CPU. Resolves false when this phone can't run it. */
export function load(): Promise<boolean> {
  if (status.state === "loaded") return Promise.resolve(true);
  if (status.state !== "ready" && status.state !== "loading") return Promise.resolve(false);
  if (loadPromise) return loadPromise;
  set({ state: "loading" });
  loadPromise = (async () => {
    for (const backend of ["gpu", "cpu"] as const) {
      try {
        llm = await tryLoad(backend);
        llm.setMemoryWarningCallback((level) => {
          // The library frees the engine on critical pressure; reload on next ask.
          if (level === "critical") {
            loadPromise = null;
            set({ state: "ready" });
          }
        });
        set({ state: "loaded", backend });
        return true;
      } catch (e) {
        if (isMemoryError(e) && backend === "cpu") break;
      }
    }
    llm = null;
    loadPromise = null;
    set({ state: "unsupported", message: "This phone can't run the full Moon right now, so Moonlight is helping instead." });
    return false;
  })();
  return loadPromise;
}

/**
 * Answers one Muse request with streaming. Resolves null when full Muse isn't
 * available, so the page falls back to Muse-lite.
 */
export function ask(prompt: string, onText: (soFar: string) => void): Promise<string | null> {
  const run = async () => {
    if (!(await load()) || !llm) return null;
    const engine = llm;
    engine.resetConversation(); // every request stands alone
    let text = "";
    try {
      await engine.sendMessageAsync(prompt, (token) => {
        if (token) {
          text += token;
          onText(text);
        }
      });
    } catch {
      return text.trim() || null;
    }
    return text.trim();
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

/**
 * TEST ONLY (editor test, 2026-10-26/27): CC leaves a list of editor requests on the
 * phone; on start the app answers them with Gemma as an editor and writes the answers
 * back after every one. The writer's book is not read or changed. Remove after the test.
 * Two places, tried in order (the first build only had A, and its file reads failed silently):
 *  A. the app's own phone folder: Android/data/<package>/files/editor-test/in.json → out.json
 *  B. a book's backup folder (Drive): "editor-test in.json" → "editor-test out.json"
 * Every step is noted in the answer file's "trace", in logcat ([editor-test]) and in a short toast.
 */
const LAB = "file:///storage/emulated/0/Android/data/com.metavitae.musebook/files/editor-test/";
const LAB_IN = "editor-test in.json", LAB_OUT = "editor-test out.json";
interface LabJob { system: string; ctx?: number; out?: number; items: { id: string; prompt: string }[] }
interface LabPlace { name: string; read: () => Promise<string | null>; answers: () => Promise<string | null>; write: (text: string) => Promise<void> }

const labErr = (e: unknown) => String((e as Error)?.message ?? e);

function labPlaces(): LabPlace[] {
  const places: LabPlace[] = [{
    name: "phone folder",
    read: async () => {
      // Expo only writes files that exist outside its own folders, so CC leaves out.json there too.
      const info = await FileSystem.getInfoAsync(LAB + "in.json");
      return info.exists ? FileSystem.readAsStringAsync(LAB + "in.json") : null;
    },
    answers: () => FileSystem.readAsStringAsync(LAB + "out.json"),
    write: (text) => FileSystem.writeAsStringAsync(LAB + "out.json", text),
  }];
  return places;
}

/** Backup folders the writer picked for their books (content:// trees, usually Drive). */
async function backupPlaces(trace: string[]): Promise<LabPlace[]> {
  const lib = JSON.parse(await FileSystem.readAsStringAsync(FileSystem.documentDirectory + "library.json"));
  const dirs = [...new Set<string>((lib?.books ?? []).map((b: any) => b?.backup?.dir).filter(Boolean))];
  trace.push(`backup folders: ${dirs.length}`);
  return dirs.map((uri, n) => {
    const dir = new Directory(uri);
    // In Drive a file's uri is an id: names come from the listing, in the same order as list().
    const find = (name: string) => {
      const names = dir.info().files ?? [], items = dir.list();
      const i = names.length === items.length ? names.indexOf(name) : -1;
      return i >= 0 && items[i] instanceof File ? (items[i] as File) : null;
    };
    let out: File | null = null;
    return {
      name: `backup folder ${n + 1}`,
      read: async () => { const f = find(LAB_IN); return f ? f.text() : null; },
      answers: async () => { const f = find(LAB_OUT); return f ? f.text() : null; },
      write: async (text) => {
        out ??= find(LAB_OUT) ?? dir.createFile(LAB_OUT, "application/json");
        out.write(text);
      },
    };
  });
}

export async function editorLab() {
  const trace: string[] = [];
  const note = (s: string) => { trace.push(s); console.warn("[editor-test] " + s); };
  const toast = (s: string) => { try { ToastAndroid.show("Editor test: " + s, ToastAndroid.LONG); } catch {} };
  let job: LabJob | null = null, place: LabPlace | null = null, raw = "";
  const places = labPlaces();
  try { places.push(...(await backupPlaces(trace))); } catch (e) { note("backup folders: " + labErr(e)); }
  for (const p of places) {
    try {
      const text = await p.read();
      if (text == null) { note(`${p.name}: no requests`); continue; }
      job = JSON.parse(text);
      place = p;
      raw = text;
      note(`${p.name}: ${job!.items.length} requests`);
      break;
    } catch (e) {
      note(`${p.name}: ${labErr(e)}`);
    }
  }
  if (!job || !place) {
    // Leave the trail in the phone folder only: nothing new goes into a writer's backup folder.
    await places[0].write(JSON.stringify({ done: true, trace }, null, 1)).catch(() => {});
    toast("no requests found · " + trace.join(" · ").slice(0, 160));
    return;
  }
  // The same requests are answered once: the answers carry a fingerprint of them.
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) h = Math.imul(h ^ raw.charCodeAt(i), 0x01000193);
  const sig = raw.length + ":" + (h >>> 0).toString(36);
  try {
    const prior = JSON.parse((await place.answers()) || "{}");
    if (prior.sig === sig && prior.done) { note("already answered"); return; }
  } catch {}
  const sink = place;
  const results: unknown[] = [];
  const write = async (done: boolean) => {
    try { await sink.write(JSON.stringify({ sig, done, trace, results }, null, 1)); }
    catch (e) { note("couldn't write answers: " + labErr(e)); }
  };
  if (!(await load())) {
    note("Gemma not available: " + status.state);
    await write(true);
    toast("Gemma not available");
    return;
  }
  toast(`answering ${job.items.length} requests (${sink.name})`);
  await write(false);
  const run = async () => {
    if (llm) await llm.unload().catch(() => {});
    llm = null;
    let engine: LiteRTLMInstance | null = null, backend: "gpu" | "cpu" = "gpu", err = "";
    const t0 = Date.now();
    for (const b of ["gpu", "cpu"] as const) {
      try {
        engine = await tryLoad(b, job!.system, job!.ctx ?? 8192, job!.out ?? 1024);
        backend = b;
        break;
      } catch (e) {
        err = labErr(e);
      }
    }
    if (!engine) results.push({ error: "couldn't load: " + err });
    else {
      results.push({ loaded: backend, loadMs: Date.now() - t0, ctx: job!.ctx ?? 8192, out: job!.out ?? 1024 });
      for (const it of job!.items) {
        const t1 = Date.now();
        let text = "";
        try {
          engine.resetConversation();
          await engine.sendMessageAsync(it.prompt, (tok) => { if (tok) text += tok; });
          results.push({ id: it.id, ms: Date.now() - t1, text: text.trim() });
        } catch (e) {
          results.push({ id: it.id, ms: Date.now() - t1, text: text.trim(), error: labErr(e) });
        }
        await write(false);
      }
      await engine.unload().catch(() => {});
    }
    note("finished");
    await write(true);
    toast("finished");
    // Back to the everyday Moon on the next request.
    loadPromise = null;
    set({ state: "ready" });
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}
