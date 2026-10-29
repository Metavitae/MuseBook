/* ============================================================
   MOONBOOK TEST — only in the testers' app (MuseNative.tester is null
   in Moonbook). First open: invite code > the daily report (a tester
   agrees to it; that's what testing is) > the backup folder > before you
   start. Settings gets a "Moonbook Test" card: the code, the last
   report, and "Tell us what you think". The phone side is
   src/tester.ts; nothing about the writing ever leaves the phone.
   ============================================================ */
(function(){
  const N = window.MuseNative, T = N && N.tester;
  if (!T) return;
  const L = (en, es) => (typeof LANG !== "undefined" && LANG === "es") ? es : en;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  // Errors on the page are counted (their first words only) for the daily report.
  let sent = 0;
  const err = m => { if (sent++ < 20) N.testerError(String(m || "error").slice(0, 120)).catch(()=>{}); };
  window.addEventListener("error", e => err(e.message));
  window.addEventListener("unhandledrejection", e => err(e.reason && e.reason.message || e.reason));

  const css = document.createElement("style");
  css.textContent = `
  #mbGate{position:fixed;inset:0;z-index:9999;background:var(--bg);color:var(--text);display:flex;align-items:center;justify-content:center;padding:24px 16px;overflow:auto;font-family:var(--font-body)}
  #mbGate .gcard{max-width:440px;width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px 20px}
  #mbGate h2{font-family:var(--font-display);margin:0 0 12px;font-size:1.7rem;line-height:1.15}
  #mbGate p{margin:0 0 12px;line-height:1.5}
  #mbGate ul{margin:0 0 12px;padding-left:20px;line-height:1.5}
  #mbGate .gstep{color:var(--muted);font-size:.85rem;margin-bottom:8px;letter-spacing:.04em}
  #mbGate input{width:100%;box-sizing:border-box;font:inherit;font-size:1.3rem;letter-spacing:.12em;text-transform:uppercase;padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:var(--bg);color:var(--text);margin:4px 0 12px}
  #mbGate .gmsg{color:var(--bad);min-height:1.4em}
  #mbGate .gbtns{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
  #mbGate button{font:inherit;padding:12px 18px;border-radius:12px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);min-height:48px}
  #mbGate button.go{background:var(--accent);border-color:var(--accent);color:var(--bg);font-weight:600}
  #mbGate button:disabled{opacity:.5}
  #mbTestCard textarea{width:100%;box-sizing:border-box;min-height:110px;font:inherit;padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:var(--bg);color:var(--text);margin:6px 0 8px}`;
  document.head.appendChild(css);

  // ---- first open --------------------------------------------------------
  let gate = null;
  function show(html){
    if (!gate){ gate = document.createElement("div"); gate.id = "mbGate"; document.body.appendChild(gate); }
    gate.innerHTML = `<div class="gcard">${html}</div>`;
    return gate;
  }
  function done(){ if (gate){ gate.remove(); gate = null; } settingsCard(); }

  function stepCode(){
    const g = show(`
      <div class="gstep">MOONBOOK TEST · 1/4</div>
      <h2>${L("Welcome to Moonbook Test","Te damos la bienvenida a Moonbook Test")}</h2>
      <p>${L("You're one of the first people to try Moonbook. Thank you.","Eres de las primeras personas en probar Moonbook. Gracias.")}</p>
      <p>${L("Type the invite code you got.","Escribe el código de invitación que te dieron.")}</p>
      <input id="mbCode" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="MB-XXXXX">
      <div class="gmsg" id="mbMsg"></div>
      <div class="gbtns"><button class="go" id="mbGo">${L("Continue","Continuar")}</button></div>`);
    const box = g.querySelector("#mbCode"), go = g.querySelector("#mbGo"), msg = g.querySelector("#mbMsg");
    const tryIt = async () => {
      if (!box.value.trim()) return box.focus();
      go.disabled = true; msg.textContent = L("Checking…","Revisando…");
      const r = await N.testerClaim(box.value).catch(() => "net");
      go.disabled = false;
      if (r === "ok"){ T.code = "MB-" + box.value.trim().toUpperCase().replace(/\s+/g,"").replace(/^MB-?/,""); T.off = false; return stepReports(); }
      msg.textContent = {
        unknown: L("That code doesn't exist. Check it and try again.","Ese código no existe. Revísalo e intenta otra vez."),
        off: L("This code was switched off. Ask the person who invited you.","Este código fue desactivado. Pregúntale a quien te invitó."),
        full: L("This code is already on another phone. Ask for a new one.","Este código ya está en otro celular. Pide uno nuevo.")
      }[r] || L("No internet. Connect to wifi and try again.","No hay internet. Conéctate al wifi e intenta otra vez.");
    };
    go.addEventListener("click", tryIt);
    box.addEventListener("keydown", e => { if (e.key === "Enter") tryIt(); });
  }

  function stepReports(){
    const g = show(`
      <div class="gstep">MOONBOOK TEST · 2/4</div>
      <h2>${L("Help make Moonbook better","Ayúdanos a mejorar Moonbook")}</h2>
      <p>${L("Being a tester means Moonbook Test sends a short report once a day, with numbers only:","Ser tester significa que Moonbook Test manda un reporte corto una vez al día, solo con números:")}</p>
      <ul>
        <li>${L("how many words you wrote and how long Moonbook was open","cuántas palabras escribiste y cuánto tiempo estuvo abierto Moonbook")}</li>
        <li>${L("how the Moon worked: did it wake up, how fast it answered","cómo funcionó la Luna: si despertó y qué tan rápido respondió")}</li>
        <li>${L("errors, backups, and your phone's model","errores, respaldos y el modelo de tu celular")}</li>
      </ul>
      <p><b>${L("It never sends your writing: no text, no titles, no names. Your book stays on your phone.","Nunca manda lo que escribes: ni texto, ni títulos, ni nombres. Tu libro se queda en tu celular.")}</b></p>
      <div class="gbtns"><button class="go" id="mbYes">${L("I agree","Acepto")}</button></div>`);
    g.querySelector("#mbYes").addEventListener("click", async () => { T.reports = true; await N.testerReports(true).catch(()=>{}); T.folder ? stepStart() : stepFolder(); });
  }

  function stepFolder(){
    const g = show(`
      <div class="gstep">MOONBOOK TEST · 3/4</div>
      <h2>${L("Where your backups go","Dónde van tus respaldos")}</h2>
      <p>${L("Moonbook backs up your book by itself when you close it or stop writing for 5 minutes. Choose the folder for those copies.","Moonbook respalda tu libro solo cuando lo cierras o dejas de escribir por 5 minutos. Elige la carpeta para esas copias.")}</p>
      <p>${L("Best: a folder in your Google Drive, so your book is safe even if you lose your phone. Open Drive, make a folder called Moonbook, and pick it.","Lo mejor: una carpeta en tu Google Drive, así tu libro está a salvo aunque pierdas el celular. Abre Drive, crea una carpeta llamada Moonbook y elígela.")}</p>
      <div class="gmsg" id="mbMsg"></div>
      <div class="gbtns"><button class="go" id="mbPick">${L("Choose a folder","Elegir una carpeta")}</button></div>`);
    const go = g.querySelector("#mbPick"), msg = g.querySelector("#mbMsg");
    go.addEventListener("click", async () => {
      go.disabled = true;
      const place = await N.backupFolder().catch(() => null);
      go.disabled = false;
      if (place){ T.folder = true; return stepStart(); }
      msg.textContent = L("No folder chosen yet. Your book needs one.","Todavía no eliges una carpeta. Tu libro necesita una.");
    });
  }

  function stepStart(){
    const g = show(`
      <div class="gstep">MOONBOOK TEST · 4/4</div>
      <h2>${L("Before you start","Antes de empezar")}</h2>
      <p>${L("This is a test version, so something may break. Your book backs up by itself; for an extra copy anytime: Settings ⚙ › Back up now.","Esta es una versión de prueba, así que algo puede fallar. Tu libro se respalda solo; para una copia extra cuando quieras: Ajustes ⚙ › Respaldar ahora.")}</p>
      <p>${L("Anything you like, don't like, or that went wrong: write it in Settings ⚙ › Tell us what you think. We read everything.","Lo que te guste, lo que no, o lo que falle: escríbelo en Ajustes ⚙ › Cuéntanos qué piensas. Leemos todo.")}</p>
      <div class="gbtns"><button class="go" id="mbStart">${L("Start writing","Empezar a escribir")}</button></div>`);
    g.querySelector("#mbStart").addEventListener("click", done);
  }

  // ---- Settings: the Moonbook Test card ----------------------------------
  function settingsCard(){
    const tab = document.getElementById("tab-settings"), before = document.getElementById("backupCard");
    if (!tab || !before || !T.code) return;
    let c = document.getElementById("mbTestCard");
    if (!c){ c = document.createElement("div"); c.className = "card"; c.id = "mbTestCard"; before.parentNode.insertBefore(c, before); }
    const last = T.lastAt ? new Date(T.lastAt).toLocaleString(LANG === "es" ? "es-MX" : "en-US", {day:"numeric", month:"short", hour:"numeric", minute:"2-digit"}) : null;
    c.innerHTML = `
      <h3>Moonbook Test</h3>
      <p class="hint" style="margin:0 0 10px">${L("Invite code","Código de invitación")} <b>${esc(T.code)}</b> · ${L("version","versión")} ${esc(T.version)}</p>
      ${T.newer ? `<p class="warnbox" style="margin:0 0 10px">${L("A new Moonbook Test is ready. Back up your book, then get it from the same place you got this one.","Hay un Moonbook Test nuevo. Respalda tu libro y luego descárgalo del mismo lugar donde conseguiste este.")}</p>` : ""}
      ${T.off ? `<p class="warnbox" style="margin:0 0 10px">${L("This invite code was switched off, so nothing is sent anymore. Your book is safe on this phone.","Este código de invitación fue desactivado, así que ya no se manda nada. Tu libro está a salvo en este celular.")}</p>` : ""}
      <p class="hint" style="margin:0 0 14px">${L("Daily report (numbers only, never your writing). ","Reporte diario (solo números, nunca lo que escribes). ")}${last ? L("Last one: ","El último: ") + esc(last) : L("None sent yet.","Todavía no se manda ninguno.")}</p>
      <h3 style="margin-top:6px">${L("Tell us what you think","Cuéntanos qué piensas")}</h3>
      <p class="hint" style="margin:0">${L("What you like, what you don't, what went wrong. Only what you type here is sent.","Lo que te gusta, lo que no, lo que falló. Solo se manda lo que escribas aquí.")}</p>
      <textarea id="mbNote" maxlength="3900"></textarea>
      <div class="btns"><button class="act" id="mbSend">${L("Send","Enviar")}</button></div>`;
    c.querySelector("#mbSend").addEventListener("click", async e => {
      const box = c.querySelector("#mbNote"), note = box.value.trim();
      if (!note) return box.focus();
      e.target.disabled = true;
      const ok = await N.testerFeedback(note).catch(() => false);
      e.target.disabled = false;
      if (ok){ box.value = ""; toast(L("Thank you! It arrived.","¡Gracias! Ya llegó.")); }
      else toast(L("Couldn't send it. Check the internet and try again.","No se pudo mandar. Revisa el internet e intenta otra vez."));
    });
  }

  // Switching the language in Settings redraws the card in the new one.
  if (typeof window.setLang === "function"){ const o = window.setLang; window.setLang = function(l){ const r = o.apply(this, arguments); settingsCard(); return r; }; }

  const start = () => {
    if (!T.code) stepCode();
    else if (T.reports !== true) stepReports();
    else if (!T.folder) stepFolder();
    else settingsCard();
    if (T.code && T.newer) setTimeout(() => toast(L("A new Moonbook Test is ready. See Settings ⚙.","Hay un Moonbook Test nuevo. Mira Ajustes ⚙.")), 4000);
  };
  // The page's own language is set once it has loaded; ask after that.
  if (document.readyState === "complete") start(); else window.addEventListener("load", start);
})();
