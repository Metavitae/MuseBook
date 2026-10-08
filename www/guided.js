/* ============================================================
   GUIDED MODE (Phase A): the beginner path.
   Writing first, planning after. One gold step per screen, words a
   writer already knows ("chapter", "book"), and it always says what
   happens to the work. Same book data as full view: a guided chapter
   is one scene (chapter = number, kind = prologue/epilogue/dedication,
   title = the chapter's own title, done = finished or not).
   New books start guided; a book that already has text (El Sheik)
   stays in full view until the writer switches in Settings.
   Spec: Chat Feeds "Guided start" v1 + v2, "Unfinished chapters, ideas,
   coming back", prototype v16/v17, the looks page, CC's inputs Log.
   Texts are EN | ES pairs (L()), so the page's auto-translator skips
   everything marked .g-own.
   ============================================================ */
var G = (function(){
const L=(en,es)=> LANG==="es" ? es : en;
const root=()=>document.getElementById("guided");
let screen="", sheet="", pasteParts=null, pasteMeta=null, readOpen=false, fileReady=null, fileBusy="", maxH=0;

/* ---------- book helpers ---------- */
const isGuided=()=> DB.ui.mode==="guided";
const cur=()=> DB.scenes[DB.ui.scene] ? DB.ui.scene : -1;
function label(s){
  if(s.kind==="prologue") return L("Prologue","Prólogo");
  if(s.kind==="epilogue") return L("Epilogue","Epílogo");
  if(s.kind==="dedication") return L("Dedication","Dedicatoria");
  return s.chapter ? L("Chapter ","Capítulo ")+s.chapter : L("Untitled part","Parte sin nombre");
}
const title=s=> MBX.guidedTitle(s);
const wc=s=> words(s.text||"");
function status(s){ return !wc(s) ? L("Empty","Vacío") : s.done ? L("Done","Terminado") : L("In progress","En progreso"); }
// Reading order: dedication, prologue, chapters by number, epilogue; scenes keep their order inside a part.
function ordered(){
  const keys=partOrder([...new Set(DB.scenes.map(partKey))]);
  const out=[]; keys.forEach(k=>DB.scenes.forEach((s,i)=>{ if(partKey(s)===k) out.push(i); }));
  return out;
}
function nextNum(){ let n=0; DB.scenes.forEach(s=>{ if(!s.kind && /^\d+$/.test(String(s.chapter||"").trim())) n=Math.max(n, +s.chapter); }); return n+1; }
function bookTitle(){ return (DB.contract.title||"").trim(); }
function lastWords(s, n){ const w=(s.text||"").trim().split(/\s+/).filter(Boolean); return w.length ? (w.length>n?"…":"")+w.slice(-n).join(" ") : ""; }
function markDone(i){ const s=DB.scenes[i]; if(s && wc(s)) s.done=true; }
function newScene(o){
  const s=Object.assign({chapter:"",kind:"",title:"",pov:"",goal:"",conflict:"",outcome:"",text:"",html:"",done:false}, o);
  DB.scenes.push(s); return DB.scenes.length-1;
}
function addChapter(text){
  // An empty chapter that is still there gets used instead of piling up empty ones.
  const empty=DB.scenes.findIndex(s=>!s.kind && !wc(s) && !(s.html||"").trim());
  const html= text ? "<p>"+esc(text)+"</p><p><br></p>" : "";
  let i;
  if(empty>=0 && !text){ i=empty; }
  else i=newScene({chapter:String(nextNum()), html, text:text||""});
  DB.ui.scene=i; save(); return i;
}
function addSpecial(kind){
  const has=DB.scenes.findIndex(s=>s.kind===kind);
  const i= has>=0 ? has : newScene({kind});
  DB.ui.scene=i; save(); return i;
}

/* ---------- show ---------- */
function setRootAttrs(){
  const h=document.documentElement;
  h.dataset.mode = DB.ui.mode||"full";
  if(isGuided() && screen && screen!=="settings") h.dataset.guided="1"; else delete h.dataset.guided;
  h.dataset.gscreen = isGuided() ? (screen||"") : "";   // the background sound listens for the writing page
}
function parkEditor(){
  // The writing area is the app's own editor; it moves into the guided page and back.
  const w=document.getElementById("draftWrap"), home=document.getElementById("tab-draft");
  if(w && home && w.parentElement!==home) home.appendChild(w);
}
function show(name){
  try{ commitEditor(); }catch(e){}
  if(screen==="page" && name!=="page") parkEditor();
  screen=name; sheet=""; fileReady=null;
  setRootAttrs();
  if(name==="settings"){ parkEditor(); switchTab("settings"); window.scrollTo({top:0}); return; }
  render();
  window.scrollTo({top:0});
}
// #guided holds the screen (#gMain) and, on top, any sheet or the reading view (#gLayer).
// Opening a sheet only redraws the layer, so the writing page and its editor stay put.
function parts(){
  const r=root(); if(!r) return {};
  if(!document.getElementById("gMain")) r.innerHTML='<div id="gMain"></div><div id="gLayer"></div>';
  return {main:document.getElementById("gMain"), layer:document.getElementById("gLayer")};
}
function render(){
  const {main}=parts(); if(!main) return;
  setRootAttrs();
  parkEditor();
  if(!isGuided() || !screen || screen==="settings"){ main.innerHTML=""; renderLayer(); return; }
  const fn={welcome, question, chapters, done, back, finish, paste}[screen] || chapters;
  if(screen==="page") renderPage(main);
  else { main.innerHTML=`<div class="g-screen g-own g-${screen}">${fn()}</div>`; wireInputs(main); }
  renderLayer();
}
function renderLayer(){
  const {layer}=parts(); if(!layer) return;
  layer.innerHTML=(sheet?`<div class="g-scrim" data-g="closeSheet"></div><div class="g-sheet g-own">${sheetHtml()}</div>`:"") + (readOpen?readView():"");
  wireInputs(layer);
  const f=layer.querySelector(".g-sheet textarea"); if(f) setTimeout(()=>f.focus(),50);
}

/* ---------- screens ---------- */
function welcome(){
  return `<div class="g-center">
    <div class="g-brand">MuseBook</div>
    <h1 class="g-h1">${L("Write your book","Escribe tu libro")}</h1>
    <p class="g-lead">${L("Everything stays on your phone. Write at your pace; I'll ask small questions only when you want them.","Todo se queda en tu teléfono. Escribe a tu ritmo; solo te haré preguntas pequeñas cuando tú quieras.")}</p>
    <div class="g-stack">
      <button class="act g-big" data-g="start">${L("Start a new book","Empezar un libro nuevo")}</button>
      <p class="g-sub">${L("Takes about a minute to set up. Then you write.","Toma como un minuto. Después escribes.")}</p>
      <button class="ghost g-big" data-g="paste">${L("I already have text","Ya tengo texto")}</button>
      <p class="g-sub">${L("Paste it. I'll find the chapters and ask before changing anything.","Pégalo. Buscaré los capítulos y te preguntaré antes de cambiar nada.")}</p>
    </div></div>`;
}
function question(){
  return `<div class="g-center">
    <h1 class="g-h1">${L("What do you want to tell?","¿Qué quieres contar?")}</h1>
    <p class="g-lead">${L("One or two sentences are enough. You can change it later. Next, you get a blank page to write on.","Con una o dos frases basta. Puedes cambiarla después. Luego tendrás una página en blanco para escribir.")}</p>
    <textarea class="g-field" data-gi="logline" rows="4" placeholder="${esc(L("E.g.: The story of my family in Asunción.","Ej.: La historia de mi familia en Asunción."))}">${esc(DB.premise.logline||"")}</textarea>
    <div class="g-stack">
      <button class="act g-big" data-g="toPage">${L("Continue","Seguir")}</button>
      <button class="ghost g-big" data-g="toPage">${L("I'd rather write now","Prefiero escribir ya")}</button>
    </div></div>`;
}
function renderPage(r){
  let i=cur();
  if(i<0){ i=addChapter(); }
  const s=DB.scenes[i], w=wc(s), empty=!w;
  DB.ui.draftMode="write";
  r.innerHTML=`<div class="g-screen g-page">
    <div class="g-own g-top">
      <button class="iconbtn g-key" data-g="chapters">‹ ${L("All chapters","Todos los capítulos")}</button>
      <div class="g-plate">${esc(bookTitle()||L("Your book","Tu libro"))}</div>
      <button class="gearbtn g-key" data-g="settings" aria-label="${L("Settings","Ajustes")}">⚙</button>
    </div>
    <div class="g-own g-head">
      <div class="g-lab">${esc(label(s))}</div>
      <input class="g-ctitle" data-gi="ctitle" value="${esc(title(s))}" placeholder="${esc(L("Chapter title (optional)","Título del capítulo (opcional)"))}">
      <div class="g-status"><span id="gWords">${fmt(w)} ${L(w===1?"word":"words",w===1?"palabra":"palabras")}</span> · ${L("Saved on this phone","Guardado en este teléfono")}
        <button class="g-chip" data-g="idea">+ ${L("Jot an idea","Anotar una idea")}</button></div>
      ${empty?`<p class="g-prompt">${L("Tell me the moment where everything begins.","Cuéntame el momento en que todo empieza.")}</p>`:""}
    </div>
    <div id="gEditor"></div>
    <div class="g-own g-bottom" id="gBottom">${bottomBar(w)}</div>
  </div>`;
  const slot=document.getElementById("gEditor"), wrap=document.getElementById("draftWrap");
  slot.appendChild(wrap);
  renderDraft();
  wireInputs(r);
}
function bottomBar(w){
  return w>=50 || DB.scenes.length>1
    ? `<button class="act g-big g-wide" data-g="done">${L("I'm done with this chapter","Terminé este capítulo")}</button>`
    : `<p class="g-hint">${L("Write a few lines. A button will appear here to show you what comes next.","Escribe unas líneas. Aquí aparecerá un botón que te dirá qué sigue.")}</p>`;
}
function onType(n){
  if(screen!=="page") return;
  const el=document.getElementById("gWords"); if(el) el.textContent=fmt(n)+" "+L(n===1?"word":"words",n===1?"palabra":"palabras");
  const b=document.getElementById("gBottom"); if(b){ const want=bottomBar(n); if(b.dataset.k!==String(n>=50||DB.scenes.length>1)){ b.innerHTML=want; b.dataset.k=String(n>=50||DB.scenes.length>1); } }
  const p=document.querySelector(".g-prompt"); if(p && n>0) p.remove();
}

function chapters(){
  const ids=ordered(), total=totalWords();
  const shown=ids.filter(i=>wc(DB.scenes[i])).length;
  const rows=ids.map(i=>{
    const s=DB.scenes[i], st=status(s), num= s.kind ? "·" : esc(s.chapter||"·");
    return `<button class="item g-row ${s.done?"is-done":""} ${!wc(s)?"is-empty":""} ${i===DB.ui.scene?"is-cur":""}" data-g="open" data-i="${i}">
      <span class="item-head"><strong>${esc(label(s))}</strong></span>
      <span class="g-num">${num}</span>
      <span class="g-rowtxt"><span class="g-rowt">${esc(title(s)||label(s))}</span><span class="g-rows">${fmt(wc(s))} ${L("words","palabras")} · ${st}</span></span>
      ${s.done?`<span class="g-stamp-mini">${L("DONE","LISTO")}</span>`:""}
    </button>`;
  }).join("");
  const specials=[["dedication",L("Dedication","Dedicatoria")],["prologue",L("Prologue","Prólogo")],["epilogue",L("Epilogue","Epílogo")]].filter(([k])=>!DB.scenes.some(s=>s.kind===k));
  const ideas=(DB.ideas||[]).map((it,j)=>`<div class="card g-idea"><p class="g-ideat">${esc(it.text)}</p><p class="g-sub">${esc(it.where==="loose"||!it.where?L("Loose idea","Idea suelta"):L("For ","Para ")+it.where)}</p>
      <div class="btns"><button class="ghost" data-g="ideaStart" data-j="${j}">${L("Start writing from this","Empezar a escribir con esto")}</button><button class="mini" data-g="ideaDel" data-j="${j}">${L("Remove","Quitar")}</button></div></div>`).join("");
  return `<div class="g-own g-top">
      <button class="iconbtn g-key" data-g="toPage">‹ ${L("Back to my page","Volver a mi página")}</button>
      <button class="gearbtn g-key" data-g="settings" aria-label="${L("Settings","Ajustes")}">⚙</button></div>
    <h1 class="g-h1 g-left">${L("Your chapters","Tus capítulos")}</h1>
    <label class="g-lbl">${L("Book title · tap to rename","Título del libro · tócalo para cambiarlo")}</label>
    <input class="g-field g-titlefield" data-gi="booktitle" value="${esc(bookTitle())}" placeholder="${esc(L("Name your book","Ponle nombre a tu libro"))}">
    ${DB.premise.logline?`<p class="g-logline">“${esc(DB.premise.logline.slice(0,160))}”</p>`:""}
    <p class="g-sub">${fmt(shown)} ${L(shown===1?"chapter":"chapters",shown===1?"capítulo":"capítulos")} · ${fmt(total)} ${L("words","palabras")}. ${L("Tap a chapter to keep writing it. Everything is saved on this phone.","Toca un capítulo para seguir escribiéndolo. Todo se guarda en este teléfono.")}</p>
    <div class="g-rowsbox">${rows}</div>
    ${specials.length?`<p class="g-sub g-spec">${L("Add a page that goes before or after your chapters:","Agrega una página que va antes o después de tus capítulos:")}</p><div class="btns">${specials.map(([k,n])=>`<button class="ghost" data-g="special" data-k="${k}">+ ${n}</button>`).join("")}</div>`:""}
    ${ideas?`<h3 class="g-h3">${L("Your ideas","Tus ideas")}</h3>${ideas}`:""}
    <div class="g-stack g-end">
      <button class="act g-big" data-g="newChapter">${L("Write the next chapter","Escribir el siguiente capítulo")}</button>
      <p class="g-sub">${L("Opens a blank page called ","Abre una página en blanco llamada ")}${L("Chapter ","Capítulo ")}${nextNum()}.</p>
      <button class="ghost g-big" data-g="finish">${L("I'm finished with my book","Terminé mi libro")}</button>
    </div>`;
}

function done(){
  const i=cur(), s=DB.scenes[i]||{}, w=wc(s);
  const st=(window.MuseBackup&&MuseBackup.state)||{};
  const safe= st.last ? L("Safe on this phone. Last copy to ","A salvo en este teléfono. Última copia en ")+(st.last.place==="phone"?L("your phone","tu teléfono"):st.last.place)+": "+backupWhen(st.last.at)+"." : L("Safe on this phone.","A salvo en este teléfono.");
  const others=ordered().filter(j=>j!==i && !DB.scenes[j].done);
  const keep=others.map(j=>{ const o=DB.scenes[j], ow=wc(o);
    return `<button class="ghost g-choice" data-g="goChapter" data-i="${j}"><span>${L("Continue ","Seguir con ")}${esc(label(o))}${title(o)?" · "+esc(title(o)):""}</span><small>${ow?L("In progress, ","En progreso, ")+fmt(ow)+" "+L("words.","palabras."):L("Not started yet.","Sin empezar.")}</small></button>`; }).join("");
  const q=nextCard(s);
  return `<div class="g-moment">
      <svg class="g-bell" width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15z"/><path d="M10 21a2 2 0 004 0"/></svg>
      <div class="g-stamp">${L("DONE","LISTO")}</div>
      <div class="g-lab">${esc(label(s))}${title(s)?" · "+esc(title(s)):""}</div>
      <div class="g-well">${L("Well done. That chapter is written.","Bien hecho. Ese capítulo está escrito.")}</div>
      <p class="g-sub">${fmt(w)} ${L("words.","palabras.")} ${esc(safe)}</p>
    </div>
    <div class="g-donesheet card">
      ${keep?`<div class="g-cap">${L("KEEP WRITING SOMETHING IN PROGRESS","SEGUIR CON ALGO EN PROGRESO")}</div><div class="g-stack">${keep}</div>`:""}
      <div class="g-cap">${L("OR START SOMETHING NEW","O EMPEZAR ALGO NUEVO")}</div>
      <button class="act g-choice" data-g="newChapter"><span>${L("Start a new chapter","Empezar un capítulo nuevo")}</span><small>${L("Opens a blank page called ","Abre una página en blanco llamada ")}${L("Chapter ","Capítulo ")}${nextNum()}. ${esc(label(s))} ${L("stays as it is.","se queda como está.")}</small></button>
      ${q?`<button class="ghost g-choice" data-g="card"><span>${L("Answer a quick question","Responder una pregunta rápida")}</span><small>${L("One small question that shows what this chapter does.","Una pregunta pequeña que muestra lo que hace este capítulo.")}</small></button>`:""}
      <button class="ghost g-choice" data-g="finish"><span>${L("I'm finished with my whole book","Terminé todo mi libro")}</span><small>${L("Shows how to read it, make a file and keep a safe copy.","Te muestra cómo leerlo, hacer un archivo y guardar una copia segura.")}</small></button>
      <button class="g-link" data-g="keep">${L("Keep writing ","Seguir escribiendo ")}${esc(label(s))}</button>
    </div>`;
}

function back(){
  const i=cur(), s=DB.scenes[i]||{};
  const lw=lastWords(s,14), ago=agoText(DB.ui.lastSeen);
  return `<div class="g-center">
    <div class="g-brand">${L("WELCOME BACK","BIENVENIDO DE NUEVO")}</div>
    <h1 class="g-h1">${L("Your pages were kept exactly as you left them.","Tus páginas están tal como las dejaste.")}</h1>
    <p class="g-lead">${L("You were in ","Estabas en ")}${esc(label(s))}${ago?", "+ago:""}. ${lw?L("You stopped at:","Te quedaste en:"):""}</p>
    <div class="card g-quote">${lw?esc(lw):L("A blank page. Start whenever you're ready.","Una página en blanco. Empieza cuando quieras.")}</div>
    <div class="g-stack">
      <button class="act g-big" data-g="toPage">${L("Continue ","Seguir con ")}${esc(label(s))}</button>
      <button class="ghost g-big" data-g="chapters">${L("See all chapters","Ver todos los capítulos")}</button>
    </div></div>`;
}
function agoText(iso){
  if(!iso) return ""; const h=(Date.now()-Date.parse(iso))/36e5;
  if(h<20) return L("today","hoy"); const d=Math.round(h/24);
  return d<=1 ? L("yesterday","ayer") : L(d+" days ago","hace "+d+" días");
}

function finish(){
  const inc=DB.ui.includeUnfinished!==false;
  const unfinished=ordered().filter(i=>wc(DB.scenes[i]) && !DB.scenes[i].done);
  const total=totalWords(), n=ordered().filter(i=>wc(DB.scenes[i])).length;
  const st=(window.MuseBackup&&MuseBackup.state)||{};
  const fileNames={word:"Word",pdf:"PDF",ebook:L("eBook","libro electrónico"),text:L("text","texto")};
  return `<div class="g-own g-top">
      <button class="iconbtn g-key" data-g="chapters">‹ ${L("All chapters","Todos los capítulos")}</button>
      <button class="gearbtn g-key" data-g="settings" aria-label="${L("Settings","Ajustes")}">⚙</button></div>
    <h1 class="g-h1 g-left">${L("Finish your book","Termina tu libro")}</h1>
    <p class="g-lead">${L("Your writing is already saved on this phone. Nothing leaves it unless you send it.","Tu texto ya está guardado en este teléfono. Nada sale de aquí a menos que tú lo envíes.")} ${fmt(n)} ${L(n===1?"chapter":"chapters",n===1?"capítulo":"capítulos")} · ${fmt(total)} ${L("words.","palabras.")}</p>
    ${unfinished.length?`<div class="card g-unf"><h3>${L("Still in progress","Todavía en progreso")}</h3>
      <p class="g-sub">${unfinished.map(i=>esc(label(DB.scenes[i]))).join(", ")}. ${L("A half-written chapter goes into your file only if you say so.","Un capítulo a medias entra en tu archivo solo si tú lo dices.")}</p>
      <div class="segmented"><button class="${inc?"active":""}" data-g="incYes">${L("Include them","Incluirlos")}</button><button class="${!inc?"active":""}" data-g="incNo">${L("Leave them out","Dejarlos fuera")}</button></div></div>`:""}
    <div class="card"><h3>${L("Read it as a book","Léelo como libro")}</h3>
      <p class="g-sub">${L("See all your chapters in order, the way a reader will.","Mira todos tus capítulos en orden, como los verá un lector.")}</p>
      <div class="btns"><button class="ghost" data-g="read">${L("Read my book","Leer mi libro")}</button></div></div>
    <div class="card"><h3>${L("Make a file of your book","Haz un archivo de tu libro")}</h3>
      <p class="g-sub">${L("Word is for sending to an editor. PDF is for printing. eBook is for reading on a tablet or e-reader. Text is the plainest copy of your words.","Word es para enviar a un editor. PDF es para imprimir. El libro electrónico es para leer en una tableta o lector. Texto es la copia más sencilla de tus palabras.")}</p>
      <div class="btns">
        <button class="act" data-g="file" data-k="word">Word</button><button class="act" data-g="file" data-k="pdf">PDF</button>
        <button class="act" data-g="file" data-k="ebook">${L("eBook","Libro electrónico")}</button><button class="ghost" data-g="file" data-k="text">${L("Text","Texto")}</button></div>
      ${fileBusy?`<p class="g-note">${L("Making your ","Haciendo tu archivo ")}${fileNames[fileBusy]}${L(" file…","…")}</p>`:""}
      ${fileReady?`<p class="g-note">${L("Your ","Tu archivo ")}${fileNames[fileReady.kind]}${L(" file is ready. Where should it go?"," está listo. ¿A dónde lo mandas?")}</p>
        <div class="btns"><button class="act" data-g="fileShare">${L("Share","Compartir")}</button><button class="ghost" data-g="fileSave">${L("Save to phone or Drive","Guardar en el teléfono o Drive")}</button></div>`:""}
    </div>
    <div class="card"><h3>${L("Keep a safe copy","Guarda una copia segura")}</h3>
      <p class="g-sub">${st.last?esc(L("Last copy: ","Última copia: ")+backupWhen(st.last.at)+" · "+(st.last.place==="phone"?L("this phone","este teléfono"):st.last.place)):L("You choose the place once, such as your Google Drive. After that, a copy is saved every time you stop writing.","Eliges el lugar una vez, por ejemplo tu Google Drive. Después se guarda una copia cada vez que dejas de escribir.")}</p>
      <div class="btns"><button class="ghost" data-g="backup">${st.dir?L("Back up now","Respaldar ahora"):L("Choose where to keep it","Elegir dónde guardarla")}</button></div></div>
    <div class="g-stack g-end"><button class="ghost g-big" data-g="toPage">${L("Not yet, keep writing","Todavía no, seguir escribiendo")}</button></div>`;
}

function readView(){
  const inc=DB.ui.includeUnfinished!==false;
  const parts=MBX.bookParts(s=>inc||s.done);
  return `<div class="g-read g-own"><div class="g-readbar"><span>${esc(bookTitle()||L("Your book","Tu libro"))}</span><button class="ghost" data-g="readClose">${L("Close","Cerrar")}</button></div>
    <div class="g-readbody readview"><h1 class="g-readtitle">${esc(bookTitle()||L("Your book","Tu libro"))}</h1>${DB.contract.subtitle?`<p class="g-readsub">${esc(DB.contract.subtitle)}</p>`:""}
    ${parts.map(p=>`<section class="g-readch"><h2>${esc(p.label)}</h2>${p.title?`<p class="g-readct">${esc(p.title)}</p>`:""}${p.scenes.map(s=>sanitizeHTML(s.html||"")).join('<div class="scenebreak">* * *</div>')}</section>`).join("") || `<p>${L("Nothing written yet.","Todavía no hay nada escrito.")}</p>`}</div></div>`;
}

/* ---------- I already have text ---------- */
function paste(){
  if(!pasteParts) return `<div class="g-own g-top"><button class="iconbtn g-key" data-g="welcomeBack">‹ ${L("Back","Volver")}</button></div>
    <h1 class="g-h1 g-left">${L("Bring your text","Trae tu texto")}</h1>
    <p class="g-lead">${L("Paste it here. I'll look for chapters and show you what I found before changing anything.","Pégalo aquí. Buscaré los capítulos y te mostraré lo que encontré antes de cambiar nada.")}</p>
    <textarea class="g-field g-pastebox" data-gi="pasteText" placeholder="${esc(L("Paste your text here.","Pega tu texto aquí."))}"></textarea>
    <div class="g-stack"><button class="act g-big" data-g="detect">${L("Continue","Seguir")}</button></div>`;
  const n=pasteParts.length;
  return `<div class="g-own g-top"><button class="iconbtn g-key" data-g="pasteAgain">‹ ${L("Back","Volver")}</button></div>
    <div class="g-brand">${L("NOTHING IS CHANGED YET","TODAVÍA NO SE CAMBIA NADA")}</div>
    <h1 class="g-h1 g-left">${L("I found ","Encontré ")}${n} ${L(n===1?"part":"parts",n===1?"parte":"partes")}</h1>
    <label class="g-lbl">${L("Book title","Título del libro")}</label><input class="g-field" data-gi="pasteTitle" value="${esc(pasteMeta.title)}" placeholder="${esc(L("Name your book","Ponle nombre a tu libro"))}">
    ${pasteMeta.warn?`<p class="warnbox">${pasteMeta.warn}</p>`:""}
    <p class="g-sub">${L("Check where each part starts and ends, or tap “Read this part”. Change a name if you want. If a part belongs with the one above it, join them.","Revisa dónde empieza y termina cada parte, o toca “Leer esta parte”. Cambia un nombre si quieres. Si una parte va con la de arriba, únelas.")}</p>
    ${pasteParts.map((p,j)=>`<div class="card g-part">
      <div class="g-partrow"><input class="g-field g-partname" data-gi="partName" data-j="${j}" value="${esc(p.name)}"><span class="g-sub">${fmt(words(p.text))} ${L("words","palabras")}</span></div>
      ${p.title?`<input class="g-field g-parttitle" data-gi="partTitle" data-j="${j}" value="${esc(p.title)}" placeholder="${esc(L("Chapter title (optional)","Título del capítulo (opcional)"))}">`:""}
      <p class="g-sub"><b>${L("Starts","Empieza")}:</b> “${esc(startEnd(p.text,true))}”</p>
      <p class="g-sub"><b>${L("Ends","Termina")}:</b> “${esc(startEnd(p.text,false))}”</p>
      <div class="btns"><button class="mini" data-g="partRead" data-j="${j}">${p.open?L("Close","Cerrar"):L("Read this part","Leer esta parte")}</button>${j?`<button class="mini" data-g="partJoin" data-j="${j}">${L("Join with the part above","Unir con la de arriba")}</button>`:""}</div>
      ${p.open?`<div class="g-partfull">${esc(p.text)}</div>`:""}</div>`).join("")}
    <div class="g-stack g-end">
      <button class="act g-big" data-g="pasteCreate">${L("Yes, make these ","Sí, crear estas ")}${n} ${L(n===1?"part":"parts",n===1?"parte":"partes")}</button>
      <button class="ghost g-big" data-g="pasteOne">${L("Put everything in one chapter","Poner todo en un capítulo")}</button>
    </div>`;
}
function startEnd(t,start){ const w=(t||"").trim().split(/\s+/).filter(Boolean); if(!w.length) return ""; return start ? w.slice(0,7).join(" ")+(w.length>7?" …":"") : (w.length>7?"… ":"")+w.slice(-7).join(" "); }

/* ---------- sheets: idea, question card ---------- */
const CARDS=[
  {f:"pov", h:["Who is at the center of this part?","¿Quién está en el centro de esta parte?"], why:["Every chapter works better when it moves around one person.","Todo capítulo funciona mejor cuando gira alrededor de una persona."], ex:["E.g.: Ana, a girl late for school.","Ej.: Ana, una muchacha que llega tarde a la escuela."]},
  {f:"goal", h:["What does that person want right now?","¿Qué quiere esa persona ahora?"], why:["Wanting something makes the reader turn the page.","Querer algo hace que el lector siga leyendo."], ex:["E.g.: To catch the bus.","Ej.: Alcanzar el camión."]},
  {f:"conflict", h:["What stands in the way?","¿Qué se lo impide?"], why:["Without an obstacle there is no story, only a list of events.","Sin un obstáculo no hay historia, solo una lista de sucesos."], ex:["E.g.: The bus is already leaving.","Ej.: El camión ya se va."]},
  {f:"outcome", h:["What changes by the end?","¿Qué cambia al final?"], why:["A chapter earns its place when something is different after it.","Un capítulo se gana su lugar cuando algo es distinto después."], ex:["E.g.: She gets on, but now she has to lie.","Ej.: Se sube, pero ahora tiene que mentir."]}
];
function nextCard(s){ return CARDS.find(c=>!(s[c.f]||"").trim() && !((s.cardsSkipped||[]).includes(c.f))); }
function sheetHtml(){
  const s=DB.scenes[cur()]||{};
  if(sheet==="idea") return `<h2>${L("Jot an idea","Anotar una idea")}</h2>
    <p class="g-sub">${L("Write it in a few words. Your chapter stays as it is. You choose where the idea goes.","Escríbela en pocas palabras. Tu capítulo se queda como está. Tú eliges a dónde va la idea.")}</p>
    <textarea class="g-field" data-gi="ideaText" rows="3" placeholder="${esc(L("E.g.: The day she meets his mother.","Ej.: El día que conoce a la mamá de él."))}"></textarea>
    <div class="g-stack">
      <button class="act g-choice" data-g="ideaLoose"><span>${L("Keep it as a loose idea","Guardarla como idea suelta")}</span><small>${L("It waits in your ideas list.","Te espera en tu lista de ideas.")}</small></button>
      <button class="ghost g-choice" data-g="ideaAttach"><span>${L("Attach it to ","Ponerla en ")}${esc(label(s))}</span><small>${L("It shows in your ideas list with this chapter's name.","Aparece en tu lista de ideas con el nombre de este capítulo.")}</small></button>
      <button class="ghost g-choice" data-g="ideaNew"><span>${L("Start a new chapter from it","Empezar un capítulo nuevo con ella")}</span><small>${L("Opens a new page with your idea at the top.","Abre una página nueva con tu idea arriba.")}</small></button>
      <button class="g-link" data-g="closeSheet">${L("Cancel","Cancelar")}</button></div>`;
  if(sheet==="card"){ const c=nextCard(s); if(!c) return "";
    return `<h2>${L(c.h[0],c.h[1])}</h2>
    <textarea class="g-field" data-gi="cardText" rows="3" placeholder="${esc(L(c.ex[0],c.ex[1]))}"></textarea>
    <p class="g-sub">${L(c.why[0],c.why[1])}</p>
    <div class="btns"><button class="act" data-g="cardSave">${L("Save","Guardar")}</button><button class="ghost" data-g="cardSkip">${L("Not now","Ahora no")}</button></div>`; }
  if(sheet==="multi") return `<h2>${L("This chapter has several scenes","Este capítulo tiene varias escenas")}</h2>
    <p class="g-sub">${L("Each scene opens on its own page here. To see them side by side, use the full view.","Cada escena se abre aquí en su propia página. Para verlas juntas, usa la vista completa.")}</p>
    <div class="btns"><button class="act" data-g="closeSheet">${L("OK","Entendido")}</button></div>`;
  return "";
}

/* ---------- inputs ---------- */
let pasteText="", ideaText="", cardText="";
function wireInputs(r){
  r.querySelectorAll("[data-gi]").forEach(el=>{
    el.addEventListener("input",()=>{
      const k=el.dataset.gi, v=el.value;
      if(k==="logline"){ DB.premise.logline=v; save(); }
      else if(k==="booktitle"){ DB.contract.title=v; save(); }
      else if(k==="ctitle"){ const s=DB.scenes[cur()]; if(s){ s.title=v; save(); } }
      else if(k==="pasteText") pasteText=v;
      else if(k==="pasteTitle") pasteMeta.title=v;
      else if(k==="partName") pasteParts[+el.dataset.j].name=v;
      else if(k==="partTitle") pasteParts[+el.dataset.j].title=v;
      else if(k==="ideaText") ideaText=v;
      else if(k==="cardText") cardText=v;
    });
  });
}

/* ---------- actions ---------- */
async function act(a, el){
  const i=cur(), s=DB.scenes[i];
  switch(a){
    case "start": DB.ui.gStarted=true; save(); return show("question");
    case "paste": pasteParts=null; pasteText=""; return show("paste");
    case "welcomeBack": return show(DB.scenes.length?"chapters":"welcome");
    case "toPage": DB.ui.gStarted=true; save(); return show("page");
    case "chapters": snd("chapters"); return show("chapters");
    case "settings": return show("settings");
    case "open": { const j=+el.dataset.i; DB.ui.scene=j; save(); const multi=DB.scenes.filter(x=>partKey(x)===partKey(DB.scenes[j])).length>1 && !DB.ui.gMultiSeen; show("page"); if(multi){ DB.ui.gMultiSeen=true; save(); sheet="multi"; renderLayer(); } return; }
    case "done": commitEditor(); show("done"); ring(); museOfferOnce(); return;
    case "keep": return show("page");
    case "goChapter": markDone(i); DB.ui.scene=+el.dataset.i; save(); return show("page");
    case "newChapter": if(screen==="done") markDone(i); addChapter(); snd("newChapter"); return show("page");
    case "special": addSpecial(el.dataset.k); return show("page");
    case "card": if(screen==="done") markDone(i); save(); cardText=""; sheet="card"; return renderLayer();
    case "cardSave": { const c=nextCard(s); if(c && cardText.trim()){ s[c.f]=cardText.trim(); if(c.f==="pov") addPerson(cardText.trim()); save(); toast(L("Saved to your book","Guardado en tu libro")); } sheet=""; return show(screen==="done"?"page":screen); }
    case "cardSkip": { const c=nextCard(s); if(c){ s.cardsSkipped=(s.cardsSkipped||[]).concat(c.f); save(); } sheet=""; return show(screen==="done"?"page":screen); }
    case "finish": if(screen==="done") markDone(i); save(); snd("bookDone"); if(window.SND) SND.vibrate([30,80,30,80,60]); return show("finish");
    case "idea": commitEditor(); ideaText=""; sheet="idea"; return renderLayer();
    case "closeSheet": sheet=""; return renderLayer();
    case "ideaLoose": case "ideaAttach": {
      if(!ideaText.trim()) return toast(L("Write the idea first.","Primero escribe la idea."));
      DB.ideas=(DB.ideas||[]).concat({text:ideaText.trim(), where: a==="ideaAttach"?label(s):"loose", createdAt:new Date().toISOString()});
      save(); sheet=""; renderLayer(); snd("idea"); return toast(a==="ideaAttach"?L("Idea attached to ","Idea puesta en ")+label(s):L("Idea kept in your list","Idea guardada en tu lista"));
    }
    case "ideaNew": if(!ideaText.trim()) return toast(L("Write the idea first.","Primero escribe la idea.")); addChapter(ideaText.trim()); snd("idea"); return show("page");
    case "ideaStart": { const j=+el.dataset.j, it=DB.ideas[j]; DB.ideas.splice(j,1); addChapter(it.text); return show("page"); }
    case "ideaDel": DB.ideas.splice(+el.dataset.j,1); save(); return render();
    case "incYes": DB.ui.includeUnfinished=true; save(); return render();
    case "incNo": DB.ui.includeUnfinished=false; save(); return render();
    case "read": readOpen=true; return renderLayer();
    case "readClose": readOpen=false; return renderLayer();
    case "file": return makeFile(el.dataset.k);
    case "fileShare": try{ await MuseFiles.share(fileReady.f); }catch(e){ toast(L("Couldn't open the share screen. Try again.","No se pudo abrir la pantalla para compartir. Inténtalo de nuevo.")); } return;
    case "fileSave": try{ const p=await MuseFiles.save(fileReady.f); if(p){ snd("saved"); toast(L("Saved to ","Guardado en ")+(p==="phone"?L("your phone","tu teléfono"):p)); } }catch(e){ toast(L("That didn't work. Try another folder.","No funcionó. Prueba otra carpeta.")); } return;
    case "backup": try{ if(!(MuseBackup.state||{}).dir){ const ok=await MuseBackup.choose(); if(!ok) return; } await MuseBackup.now(JSON.parse(JSON.stringify(DB))); snd("saved"); toast(L("Backed up","Respaldo hecho")); }catch(e){ toast(L("The backup didn't work. Try again.","El respaldo no funcionó. Inténtalo de nuevo.")); } return render();
    case "detect": return detect();
    case "pasteAgain": pasteParts=null; return render();
    case "partRead": pasteParts[+el.dataset.j].open=!pasteParts[+el.dataset.j].open; return render();
    case "partJoin": { const j=+el.dataset.j, a1=pasteParts[j-1], b1=pasteParts[j]; a1.text=(a1.text+"\n\n"+b1.text).trim(); pasteParts.splice(j,1); return render(); }
    case "pasteCreate": return createFromPaste(false);
    case "pasteOne": return createFromPaste(true);
  }
}
function addPerson(name){
  const n=name.split(/[,.(]/)[0].trim().slice(0,60); if(!n) return;
  DB.bible.characters=DB.bible.characters||[];
  if(!DB.bible.characters.some(c=>(c.name||"").toLowerCase()===n.toLowerCase())) DB.bible.characters.push({name:n, role:"", want:"", need:"", flaw:"", arc:""});
}
function ring(){ if(window.SND){ SND.play("chapterDone"); SND.vibrate([18,60,18]); } }
// Muse is offered once, after the first finished chapter, never before the first word.
function museOfferOnce(){
  if(!window.MuseNative || MuseNative.firstRunSeen || (MuseNative.status||{}).state!=="none") return;
  const intro=document.getElementById("museIntro"); if(intro) setTimeout(()=>{ intro.hidden=false; },1600);
}
const snd=name=>{ if(window.SND) SND.play(name); };
const holdMuseIntro=()=> isGuided() && !DB.scenes.some(s=>s.done);

async function makeFile(kind){
  const inc=DB.ui.includeUnfinished!==false;
  if(!MBX.bookParts(s=>inc||s.done).length) return toast(L("There's no written text yet.","Todavía no hay texto escrito."));
  fileBusy=kind; fileReady=null; render();
  try{ const f=await MBX.make(kind, s=>inc||s.done); fileReady={kind,f}; snd("saved"); }
  catch(e){ toast(L("The file couldn't be made. Try again.","No se pudo hacer el archivo. Inténtalo de nuevo.")); }
  fileBusy=""; render();
}

/* ---------- finding chapters in pasted text ---------- */
const NUMW={uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,dieciséis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,
  one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,
  primero:1,segundo:2,tercero:3,cuarto:4,quinto:5,sexto:6,septimo:7,séptimo:7,octavo:8,noveno:9,decimo:10,décimo:10,first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10};
function wordNum(s){
  s=s.toLowerCase().replace(/[-\s]+y?\s*/g," ").trim();
  if(NUMW[s]) return NUMW[s];
  const m=s.match(/^(veinti|treinta|cuarenta|twenty|thirty|forty)\s*(.*)$/); if(!m) return 0;
  const base={veinti:20,treinta:30,cuarenta:40,twenty:20,thirty:30,forty:40}[m[1]]; const rest=m[2].trim();
  return rest ? (NUMW[rest] && NUMW[rest]<10 ? base+NUMW[rest] : 0) : (m[1]==="veinti"?0:base);
}
function romanToInt(s){ const v={I:1,V:5,X:10,L:50,C:100,D:500,M:1000}; const u=s.toUpperCase(); let t=0; for(let i=0;i<u.length;i++){ const a=v[u[i]], b=v[u[i+1]]||0; t+= a<b?-a:a; } return t; }
function detectParts(raw){
  const strip=l=>l.replace(/^\s*#{1,6}\s*/,"").replace(/^[\s*_]+|[\s*_]+$/g,"");
  const reChap=/^(?:cap[ií]tulo|capitulo|chapter|cap\.)\s+([ivxlcdm]+|\d+|[a-záéíóúñ]+(?:[\s-]+(?:y\s+)?[a-záéíóúñ]+)?)\s*(?:[.:\-—–]\s*(.*))?$/i;
  const reBareNum=/^(\d{1,3}|[IVXLC]{1,7})\.?$/;
  const rePro=/^(?:pr[óo]logo|prologue)\s*[.:]?$/i, reEpi=/^(?:ep[íi]logo|epilogue)\s*[.:]?$/i, reDed=/^(?:dedicatoria|dedication)\s*[.:]?$/i;
  const reFoot=/^[\s_*]*[\d.,]+\s*(?:palabras|words)\s*·.*$/i;
  const lines=(raw||"").replace(/\r/g,"").split("\n");
  let title="", subtitle="", i0=0;
  while(i0<lines.length && !lines[i0].trim()) i0++;
  if(i0<lines.length && /^#\s+\S/.test(lines[i0])){ title=strip(lines[i0]); i0++; while(i0<lines.length && !lines[i0].trim()) i0++;
    if(i0<lines.length && /^\s*[*_][^*_].*[*_]\s*$/.test(lines[i0])){ subtitle=strip(lines[i0]); i0++; } }
  const body=lines.slice(i0).filter(l=>!reFoot.test(l) && !/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(l));
  const parts=[]; let cur={name:"", kind:"", num:0, title:"", lines:[]}, justOpened=false;
  const push=()=>{ const text=cur.lines.join("\n").replace(/\n{3,}/g,"\n\n").trim(); if(text || cur.name) parts.push({name:cur.name, kind:cur.kind, num:cur.num, title:cur.title, text}); };
  const kindOf=(line, prevBlank)=>{
    const tx=strip(line); if(!tx || tx.length>70) return null;
    const m=tx.match(reChap);
    if(m){ let n=/^\d+$/.test(m[1])?+m[1]: /^[ivxlcdm]+$/i.test(m[1])?romanToInt(m[1]): wordNum(m[1]);
      if(!n && n!==0) return null; if(n===0 && !/^0$/.test(m[1])) return null;
      return n===0 ? {kind:"prologue"} : {num:n, title:(m[2]||"").trim()}; }
    if(rePro.test(tx)) return {kind:"prologue"}; if(reEpi.test(tx)) return {kind:"epilogue"}; if(reDed.test(tx)) return {kind:"dedication"};
    if(prevBlank && reBareNum.test(tx) && /^#/.test(line.trim())) { const v=tx.replace(".",""); return {num:/^\d+$/.test(v)?+v:romanToInt(v), title:""}; }
    return null;
  };
  let prevBlank=true;
  body.forEach(line=>{
    const k=kindOf(line, prevBlank);
    const sameKind= k && ((k.kind && k.kind===cur.kind) || (k.num && k.num===cur.num));
    if(k && justOpened && sameKind){ prevBlank=!line.trim(); return; }           // a label right under its heading
    if(k && k.kind==="prologue" && parts.some(p=>p.num)) { cur.lines.push(line); prevBlank=false; return; } // a lone "Prólogo" after chapters began
    if(k){ push(); cur={name:"", kind:k.kind||"", num:k.num||0, title:k.title||"", lines:[]}; justOpened=true; prevBlank=true; return; }
    if(line.trim()) justOpened=false; cur.lines.push(line); prevBlank=!line.trim();
  });
  push();
  let out=parts.filter(p=>p.text || p.kind || p.num);
  if(!out.length) out=[{kind:"",num:1,title:"",text:(raw||"").trim()}];
  // Text before the first heading becomes its own chapter only if it's real text.
  out.forEach(p=>{ if(!p.kind && !p.num) p.num=0; });
  let warn="";
  const total=out.reduce((a,p)=>a+words(p.text),0);
  if(out.length===1 && out[0].kind==="prologue" && words(out[0].text)>1500){ out[0].kind=""; out[0].num=1; warn=L("I only found the word “Prologue” at the top, so all of it is in Chapter 1. Rename it if you want.","Solo encontré la palabra “Prólogo” arriba, así que todo quedó en el Capítulo 1. Cámbiale el nombre si quieres."); }
  else if(out.length===1) warn=L("I didn't find chapter headings, so everything is in Chapter 1. You can split it later.","No encontré títulos de capítulo, así que todo quedó en el Capítulo 1. Puedes dividirlo después.");
  // Opening text without a heading: numbered before chapter 1 only if there's no prologue; otherwise it joins the next part.
  let nn=0; out.forEach(p=>{ if(!p.kind){ if(p.num) nn=Math.max(nn,p.num); } });
  out.forEach(p=>{ if(!p.kind && !p.num){ p.num= out.some(q=>q.num===1)? 0 : 1; } });
  const nameOf=p=> p.kind==="prologue"?L("Prologue","Prólogo"): p.kind==="epilogue"?L("Epilogue","Epílogo"): p.kind==="dedication"?L("Dedication","Dedicatoria"): p.num? L("Chapter ","Capítulo ")+p.num : L("Opening text","Texto inicial");
  return { parts: out.map(p=>({name:nameOf(p), kind:p.kind, num:p.num, title:p.title, text:p.text, open:false})), title, subtitle, warn, total };
}
function detect(){
  if(!words(pasteText)) return toast(L("Paste your text first.","Primero pega tu texto."));
  const r=detectParts(pasteText);
  pasteParts=r.parts; pasteMeta={title: r.title || bookTitle(), subtitle:r.subtitle, warn:r.warn};
  render();
}
function textToHtml(t){ return t.split(/\n{2,}/).map(p=>p.trim()).filter(Boolean).map(p=>"<p>"+esc(p).replace(/\n/g,"<br>")+"</p>").join(""); }
function partFromName(name){
  const n=name.trim(), lo=n.toLowerCase();
  if(/^(pr[óo]logo|prologue)/.test(lo)) return {kind:"prologue"};
  if(/^(ep[íi]logo|epilogue)/.test(lo)) return {kind:"epilogue"};
  if(/^(dedicatoria|dedication)/.test(lo)) return {kind:"dedication"};
  const m=n.match(/(\d+)/); return {num: m?+m[1]:0, title: m? n.replace(/^(cap[ií]tulo|chapter)\s*\d+\s*[.:\-—·]?\s*/i,"").trim() : n};
}
function createFromPaste(one){
  if(!pasteParts) return;
  if(DB.scenes.some(s=>wc(s))){ return toast(L("Your book already has text. Nothing was changed.","Tu libro ya tiene texto. No se cambió nada.")); }
  const list= one ? [{name:L("Chapter 1","Capítulo 1"), kind:"", num:1, title:"", text:pasteParts.map(p=>p.text).join("\n\n")}] : pasteParts;
  DB.scenes=[]; let n=0;
  list.forEach(p=>{
    const f=partFromName(p.name); const kind=f.kind||"";
    let num= kind ? "" : String(f.num || ++n); if(!kind) n=Math.max(n, +num);
    const ttl=(p.title||"").trim() || (f.title && !/^\d+$/.test(f.title) && !/^(cap|chap)/i.test(f.title)? f.title : "");
    newScene({kind, chapter:num, title:ttl, html:textToHtml(p.text), text:p.text});
  });
  if(pasteMeta.title) DB.contract.title=pasteMeta.title.trim();
  if(pasteMeta.subtitle) DB.contract.subtitle=pasteMeta.subtitle.trim();
  DB.ui.scene=0; DB.ui.gStarted=true; trackWords(); save(); pasteParts=null;
  toast(L("Your text is in. Everything is saved on this phone.","Tu texto ya está aquí. Todo se guarda en este teléfono."));
  show("chapters");
}

/* ---------- start ---------- */
function decideMode(){
  if(!DB.ui.mode){ DB.ui.mode = (totalWords()>0 || DB.scenes.length>1) ? "full" : "guided"; save(); }
}
function init(){
  decideMode();
  if(!isGuided()){ screen=""; parkEditor(); setRootAttrs(); render(); return; }
  const away= DB.ui.lastSeen ? Date.now()-Date.parse(DB.ui.lastSeen) : 0;
  if(!DB.scenes.length && !DB.ui.gStarted) show("welcome");
  else if(totalWords()>0 && away>30*60*1000) show("back");
  else show("page");
}
function setMode(m){
  DB.ui.mode=m; save();
  if(m==="guided"){ show(DB.scenes.length?"chapters":"welcome"); }
  else { screen=""; parkEditor(); setRootAttrs(); render(); switchTab("draft"); }
  renderModeCard();
}
function renderModeCard(){
  document.querySelectorAll("#modeRow [data-setmode]").forEach(b=>b.classList.toggle("active", b.dataset.setmode===(DB.ui.mode||"full")));
  const back=document.getElementById("gBackFromSettings"); if(back) back.hidden=!isGuided();
}
// Leaving the app: remember when, for "Welcome back".
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden"){ DB.ui.lastSeen=new Date().toISOString(); try{ localSave(); }catch(e){} } });
// While the keyboard is open the bottom step hides, so the page has room.
window.addEventListener("resize",()=>{ maxH=Math.max(maxH, innerHeight); document.documentElement.dataset.kb = innerHeight < maxH*0.78 ? "1" : ""; });
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-g]"); if(!b || !b.closest("#guided")) return;
  e.preventDefault(); act(b.dataset.g, b);
});
document.addEventListener("click",e=>{
  const m=e.target.closest("[data-setmode]"); if(m) setMode(m.dataset.setmode);
  if(e.target.closest("#gBackFromSettings")) show(cur()>=0?"page":"chapters");
});

return { init, show, render, onType, setMode, renderModeCard, holdMuseIntro, detectParts, get screen(){ return screen; } };
})();
