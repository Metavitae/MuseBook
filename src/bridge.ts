// Runs inside the WebView before the page loads. It gives the prototype the
// same `window.claude.use(...)` API it had as an artifact, backed by the phone:
// db → a file on this phone, downloads → the share sheet, sample → Muse.
import type { MuseStatus } from "./muse";
import type { BackupState } from "./backup";

export function bridgeScript(book: unknown, status: MuseStatus, firstRunSeen: boolean, backup: BackupState) {
  return `(function(){
  var pending = {}, streams = {}, seq = 0, listeners = [];
  var status = ${JSON.stringify(status)};
  var book = ${JSON.stringify(book ?? null)};
  var backup = ${JSON.stringify(backup)}, backupListeners = [];
  function call(m, a, onStream){
    return new Promise(function(res, rej){
      var id = ++seq; pending[id] = {res: res, rej: rej};
      if (onStream) streams[id] = onStream;
      window.ReactNativeWebView.postMessage(JSON.stringify({id: id, m: m, a: a || []}));
    });
  }
  window.__mb = {
    reply: function(id, ok, v){ var p = pending[id]; delete pending[id]; delete streams[id]; if (p) ok ? p.res(v) : p.rej(new Error(v)); },
    stream: function(id, text){ var s = streams[id]; if (s) s(text); },
    status: function(s){ status = s; listeners.forEach(function(f){ try { f(s); } catch (e) {} }); },
    backup: function(b){ backup = b; backupListeners.forEach(function(f){ try { f(b); } catch (e) {} }); }
  };
  // Backups to a folder the writer picks (phone or their own Drive). See src/backup.ts.
  window.MuseBackup = {
    get state(){ return backup; },
    onState: function(f){ backupListeners.push(f); f(backup); },
    choose: function(){ return call("backupChoose"); },
    now: function(d){ return call("backupNow", [d]); },
    setAuto: function(on){ return call("backupAuto", [!!on]); },
    safetyCopy: function(d){ return call("backupSafety", [d]); },
    pick: function(){ return call("backupPick"); }
  };
  window.MuseNative = {
    firstRunSeen: ${firstRunSeen ? "true" : "false"},
    get status(){ return status; },
    onStatus: function(f){ listeners.push(f); f(status); },
    download: function(){ return call("museDownload"); },
    pause: function(){ return call("musePause"); },
    remove: function(){ return call("museDelete"); },
    markFirstRunSeen: function(){ this.firstRunSeen = true; return call("firstRunSeen"); },
    theme: function(bg, dark){ return call("theme", [bg, !!dark]); },
    lab: function(prompt, ctx){ return call("museLab", [prompt, ctx]); }
  };
  var doc = {
    get: function(){ return Promise.resolve({data: book}); },
    set: function(d){ book = d; return call("save", [d]); },
    onSnapshot: function(){ return function(){}; }
  };
  window.claude = { use: function(name){
    if (name === "user") return Promise.resolve({ id: function(){ return Promise.resolve("this-phone"); } });
    if (name === "db") return Promise.resolve({ collection: function(){ return { doc: function(){ return doc; } }; } });
    if (name === "downloads") return Promise.resolve({ save: function(o){ return call("share", [o]); } });
    if (name === "sample") return Promise.resolve(function(prompt, opts){
      opts = opts || {};
      var s = status.state;
      if (s !== "ready" && s !== "loading" && s !== "loaded") return Promise.resolve({text: "", lite: true});
      return call("museAsk", [prompt], function(t){ if (opts.onText) opts.onText({text: t}); })
        .then(function(t){ return t ? {text: t} : {text: "", lite: true}; });
    });
    return Promise.resolve(null);
  }};
})(); true;`;
}
