// Muse engine: downloads Gemma 4 E2B once (resumable), then runs it on the
// phone. Tiers: Gemma on the graphics chip → Gemma on the processor →
// Muse-lite (no AI, handled in the page) when the phone can't run Gemma.
import * as FileSystem from "expo-file-system/legacy";
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
 * TEST ONLY (editor test, 2026-10-26): CC puts in.json in the app's own folder
 * on the phone (Android/data/<package>/files/editor-test/). On start the app
 * answers each request there with Gemma as an editor and writes out.json after
 * every answer. The writer's book is not read or changed. Remove after the test.
 */
const LAB = "file:///storage/emulated/0/Android/data/com.metavitae.musebook/files/editor-test/";
interface LabJob { system: string; ctx?: number; out?: number; items: { id: string; prompt: string }[] }

export async function editorLab() {
  await FileSystem.makeDirectoryAsync(LAB, { intermediates: true }).catch(() => {});
  const inFile = LAB + "in.json";
  const info = await FileSystem.getInfoAsync(inFile).catch(() => null);
  if (!info?.exists) return;
  const job: LabJob = JSON.parse(await FileSystem.readAsStringAsync(inFile));
  await FileSystem.moveAsync({ from: inFile, to: LAB + "running.json" });
  if (!(await load())) {
    await FileSystem.writeAsStringAsync(LAB + "out.json", JSON.stringify({ error: "Gemma not available", status }));
    return;
  }
  const run = async () => {
    const results: unknown[] = [];
    const write = (done: boolean) => FileSystem.writeAsStringAsync(LAB + "out.json", JSON.stringify({ done, results }, null, 1));
    if (llm) await llm.unload().catch(() => {});
    llm = null;
    let engine: LiteRTLMInstance | null = null, backend: "gpu" | "cpu" = "gpu", err = "";
    const t0 = Date.now();
    for (const b of ["gpu", "cpu"] as const) {
      try {
        engine = await tryLoad(b, job.system, job.ctx ?? 8192, job.out ?? 1024);
        backend = b;
        break;
      } catch (e) {
        err = String((e as Error)?.message ?? e);
      }
    }
    if (!engine) results.push({ error: "couldn't load: " + err });
    else {
      results.push({ loaded: backend, loadMs: Date.now() - t0, ctx: job.ctx ?? 8192, out: job.out ?? 1024 });
      for (const it of job.items) {
        const t1 = Date.now();
        let text = "";
        try {
          engine.resetConversation();
          await engine.sendMessageAsync(it.prompt, (tok) => { if (tok) text += tok; });
          results.push({ id: it.id, ms: Date.now() - t1, text: text.trim() });
        } catch (e) {
          results.push({ id: it.id, ms: Date.now() - t1, text: text.trim(), error: String((e as Error)?.message ?? e) });
        }
        await write(false);
      }
      await engine.unload().catch(() => {});
    }
    await write(true);
    // Back to the everyday Moon on the next request.
    loadPromise = null;
    set({ state: "ready" });
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}
