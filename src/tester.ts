// Moonbook Test only (the Kithe VIP Circle, founder's decisions Oct 29): the invite
// code, the reports choice, the daily report and "Tell us what you think".
// Everything goes to the Circle's Supabase project through two small functions
// (claim_code, send_report), the same ones Handloft Test uses; the app can never
// read anything back except "ok / off / latest version". The key is the public kind.
//
// The report is numbers only: words, minutes, how the Moon did, crashes, the phone.
// Never sent: the writing, titles, names, characters, anything typed into the book.
import * as FileSystem from "expo-file-system/legacy";
import * as Network from "expo-network";
import { Platform } from "react-native";
import { TESTER, VERSION } from "./flavor.generated";
import type { Library } from "./storage";
import type { MuseStatus } from "./muse";

const API = "https://divgldlowyrootqthwnb.supabase.co/rest/v1/rpc/";
const KEY = "sb_publishable_dYayObHWmIMX4uN_OPsT7g_SaMwn6xi";
const FILE = FileSystem.documentDirectory + "tester.json";
const DAY_MS = 20 * 60 * 60 * 1000; // "about daily": once 20 hours have passed, at the next chance

interface Counts {
  opens: number;
  minutes: number;
  moonAsks: number;
  moonSeconds: number; // all answers together, for the average
  moonEmpty: number; // asked, but no answer came (Moonlight helped instead)
  editorReads: number;
  backups: number;
  backupFails: number;
  errors: number;
  errorKinds: Record<string, number>; // the error's first words, never the book
}
interface State {
  code: string;
  phone: string;
  reports: boolean | null; // null: not asked yet
  off: boolean;
  lastAt: number;
  latest: string;
  wordsAtLast: number | null;
  counts: Counts;
}

const fresh = (): Counts => ({ opens: 0, minutes: 0, moonAsks: 0, moonSeconds: 0, moonEmpty: 0, editorReads: 0, backups: 0, backupFails: 0, errors: 0, errorKinds: {} });
let st: State = { code: "", phone: "", reports: null, off: false, lastAt: 0, latest: "", wordsAtLast: null, counts: fresh() };
let sending = false;
let shownAt = Date.now();

const save = () => (TESTER ? FileSystem.writeAsStringAsync(FILE, JSON.stringify(st)).catch(() => {}) : Promise.resolve());

export async function init() {
  if (!TESTER) return;
  try {
    const info = await FileSystem.getInfoAsync(FILE);
    if (info.exists) st = { ...st, ...JSON.parse(await FileSystem.readAsStringAsync(FILE)) };
  } catch {}
  st.counts = { ...fresh(), ...st.counts };
  if (!st.phone) st.phone = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  st.counts.opens++;
  shownAt = Date.now();
  await save();
  // Crashes of the app itself count too (the page's own errors come through testerError).
  const eu = (globalThis as { ErrorUtils?: { getGlobalHandler(): (e: unknown, fatal?: boolean) => void; setGlobalHandler(f: (e: unknown, fatal?: boolean) => void): void } }).ErrorUtils;
  if (eu) {
    const prev = eu.getGlobalHandler();
    eu.setGlobalHandler((e, fatal) => {
      error(fatal ? "crash" : "app", String((e as Error)?.message ?? e));
      prev(e, fatal);
    });
  }
}

/** What the page needs: null in the founder's Moonbook. */
export function pageInfo() {
  if (!TESTER) return null;
  return { code: st.code, reports: st.reports, off: st.off, lastAt: st.lastAt, latest: st.latest, version: VERSION, newer: newer(st.latest, VERSION) };
}

export function newer(a: string, b: string) {
  const x = a.split(".").map((n) => parseInt(n) || 0), y = b.split(".").map((n) => parseInt(n) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
}

function phoneModel() {
  const c = Platform.constants as { Manufacturer?: string; Model?: string; Release?: string };
  return { model: `${c.Manufacturer ?? ""} ${c.Model ?? ""}`.trim(), android: String(c.Release ?? Platform.Version) };
}

async function call(fn: string, body: object) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(API + fn, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/** Checks the code once: "ok", "unknown", "off", "full" (already on 2 phones) or "net" (no internet). */
export async function claim(typed: string) {
  // "MB-" shows only as a hint in the box, so a typed "K7Q2P" (no MB) counts too
  const code = "MB-" + typed.trim().toUpperCase().replace(/\s+/g, "").replace(/^MB-?/, "");
  let r = "net";
  try {
    r = String(await call("claim_code", { p_code: code, p_phone: st.phone, p_model: phoneModel().model }));
  } catch {}
  if (r === "ok") {
    st.code = code;
    st.off = false;
    await save();
  }
  return r;
}

export async function setReports(on: boolean) {
  st.reports = on;
  await save();
}

// What happened while Moonbook was open. Called from App.tsx.
export function moonAnswered(seconds: number, gotText: boolean, editor: boolean) {
  if (!TESTER) return;
  const c = st.counts;
  editor ? c.editorReads++ : c.moonAsks++;
  if (gotText) c.moonSeconds += seconds;
  else c.moonEmpty++;
  save();
}
export function backedUp(ok: boolean) {
  if (!TESTER) return;
  ok ? st.counts.backups++ : st.counts.backupFails++;
  save();
}
export function error(where: string, message: string) {
  if (!TESTER) return;
  // Only the start of an error's own message (like "TypeError: undefined is not…"), never more.
  const kind = (where + ": " + String(message)).replace(/["'“”«»].*$/, "").slice(0, 90);
  st.counts.errors++;
  if (Object.keys(st.counts.errorKinds).length < 12 || st.counts.errorKinds[kind]) st.counts.errorKinds[kind] = (st.counts.errorKinds[kind] ?? 0) + 1;
  save();
}
/** Moonbook left the screen / came back: counts minutes on screen. */
export function shown(on: boolean) {
  if (!TESTER) return;
  if (on) shownAt = Date.now();
  else if (shownAt) {
    st.counts.minutes += Math.round((Date.now() - shownAt) / 60000);
    shownAt = 0;
    save();
  }
}

function body(lib: Library, moon: MuseStatus, free: number) {
  const words = lib.books.reduce((n, b) => n + (b.words || 0), 0);
  const c = st.counts;
  const answered = c.moonAsks + c.editorReads - c.moonEmpty;
  const looks: Record<string, number> = {};
  lib.books.forEach((b) => { const m = b.mood || "none"; looks[m] = (looks[m] ?? 0) + 1; });
  const p = phoneModel();
  return {
    phone: p.model, android: p.android,
    free_gb: Math.round((free / 1e9) * 10) / 10,
    books: lib.books.length,
    words_total: words,
    words_since_last: st.wordsAtLast == null ? null : words - st.wordsAtLast,
    looks,
    opens: c.opens, minutes_open: c.minutes,
    moon: moon.state, moon_runs_on: moon.backend ?? null, moon_problem: moon.message ? String(moon.message).slice(0, 120) : null,
    moon_asks: c.moonAsks, editor_reads: c.editorReads, moon_no_answer: c.moonEmpty,
    moon_avg_seconds: answered > 0 ? Math.round(c.moonSeconds / answered) : null,
    backups: c.backups, backup_fails: c.backupFails,
    errors: c.errors, error_kinds: c.errorKinds,
    since: st.lastAt ? new Date(st.lastAt).toISOString() : "install",
  };
}

/** Sends a report now ("daily" or "feedback" with the tester's own note). True when it arrived. */
export async function send(kind: "daily" | "feedback", note: string, lib: Library, moon: MuseStatus) {
  if (!TESTER || !st.code || sending) return false;
  // Only the daily report needs the yes; a note the tester writes and sends is their own choice.
  if (kind === "daily" && st.reports !== true) return false;
  sending = true;
  try {
    const free = await FileSystem.getFreeDiskStorageAsync().catch(() => 0);
    const b = kind === "daily" ? body(lib, moon, free) : { phone: phoneModel().model, books: lib.books.length, moon: moon.state };
    const r = await call("send_report", { p_code: st.code, p_phone: st.phone, p_app: "moonbook", p_version: VERSION, p_kind: kind, p_body: b, p_note: note.slice(0, 3900) });
    st.latest = String(r?.latest ?? st.latest ?? "");
    if (r?.active === false) st.off = true;
    if (r?.ok && kind === "daily") {
      st.lastAt = Date.now();
      st.wordsAtLast = (b as { words_total: number }).words_total;
      st.counts = fresh();
    }
    await save();
    return !!r?.ok;
  } catch {
    return false;
  } finally {
    sending = false;
  }
}

/** At the next chance after about a day: on Wi-Fi, or on mobile data after 3 days without Wi-Fi (a report is 1-2 KB). */
export async function maybeDaily(lib: Library, moon: MuseStatus) {
  if (!TESTER || !st.code || st.reports !== true || st.off) return;
  const since = Date.now() - st.lastAt;
  if (since < DAY_MS) return;
  const net = await Network.getNetworkStateAsync().catch(() => null);
  if (!net?.isInternetReachable && !net?.isConnected) return;
  if (net.type !== Network.NetworkStateType.WIFI && since < 3 * 24 * 60 * 60 * 1000 && st.lastAt) return;
  await send("daily", "", lib, moon);
}
