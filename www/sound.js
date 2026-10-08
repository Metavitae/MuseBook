/* ============================================================
   SOUND: real recordings, all CC0 (public domain) from Freesound,
   each licence checked on its own page; list with authors and links
   in Drive Art/Source/Sounds/SOURCES.md. Trimmed, levelled and
   packed into the page (www/snd/*.ogg) so they work offline.
   Each look has its own voice for each moment, Noir's typewriter
   keys while typing, and a quiet background loop on the writing page.
   All on by default (founder, Oct 7). Calm = silence in every look.
   One switch in Settings turns sound and vibration off (DB.ui.sound).
   ============================================================ */
var SND = (function(){
const DATA = /*SNDDATA*/{};      // id → base64 Opus, filled in at build
let ctx=null, master=null, amb=null;
const bufs={}, loading={};
const calm=()=> document.documentElement.getAttribute("data-calm")==="1";
const on=()=> !calm() && !(window.DB && DB.ui && DB.ui.sound===false);
const mood=()=> document.documentElement.getAttribute("data-mood")||"shore";
function ac(){
  if(!ctx){ const C=window.AudioContext||window.webkitAudioContext; if(!C) return null; ctx=new C(); master=ctx.createGain(); master.gain.value=.9; master.connect(ctx.destination); }
  if(ctx.state==="suspended") ctx.resume();
  return ctx;
}
function load(id){
  if(bufs[id]) return Promise.resolve(bufs[id]);
  if(loading[id]) return loading[id];
  const a=ac(); if(!a || !DATA[id]) return Promise.resolve(null);
  const bin=atob(DATA[id]), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
  return loading[id]=new Promise(res=>a.decodeAudioData(u8.buffer, b=>{ bufs[id]=b; res(b); }, ()=>res(null)));
}
// Play one recording: at (seconds later), vol (0–1), rate (pitch/speed).
async function hit(id, at, vol, rate, move){
  if(id==="jazz") id=(window.DB&&DB.ui&&DB.ui.jazz)||"jazz";
  const b=await load(id); const a=ac(); if(!b || !a) return;
  const s=a.createBufferSource(), g=a.createGain(), t=a.currentTime+(at||0);
  s.buffer=b; s.playbackRate.value=rate||1; g.gain.value=vol==null?1:vol;
  let last=g;
  if(move && a.createStereoPanner){
    // The sound travels: from one side to the other, and nearer then farther (brighter and louder when close).
    const p=a.createStereoPanner(), f=a.createBiquadFilter(), d=b.duration;
    f.type="lowpass"; f.frequency.setValueAtTime(900,t); f.frequency.exponentialRampToValueAtTime(9000,t+d*.45); f.frequency.exponentialRampToValueAtTime(1200,t+d);
    p.pan.setValueAtTime(-.8,t); p.pan.linearRampToValueAtTime(.8,t+d);
    g.connect(f); f.connect(p); last=p;
  }
  s.connect(g); last.connect(master); s.start(t);
}
const seq=list=>list.forEach(([id,at,vol,rate,move])=>hit(id,at,vol,rate,move));

/* ---------- each look's voice: [recording, start, volume, speed] ---------- */
const S={
 noir:{
  tap:[["380138",0,.55]], key:"typewriter", enter:[["345955",0,.8]],
  open:[["119136",0,.9]],
  chapters:[["360949",0,.9]],
  newChapter:[["345955",0,.8]],
  words:[["318687",0,.6]], goal:[["406243",0,.8],["406243",.45,.6]],
  idea:[["211247",0,.8],["68224",1.05,.7]],
  saved:[["464302",0,.8]],
  muse:[["685111",0,.6]],
  chapterDone:[["470710",0,1],["318687",.7,.8]],
  bookDone:[["470710",0,1],["jazz",.9,.9]]                 // the stamp, then a noir jazz piece (Chancla chooses which)
 },
 shore:{
  tap:[["174718",0,.5]],
  open:[["gulls",0,.7]],
  chapters:[["176569",0,.8]],
  newChapter:[["chime5",0,.6]],
  words:[["73497",0,.4]], goal:[["gulls",0,.6]],
  idea:[["68224",0,.7],["bottleClink",.9,.8]],              // the page rolled into the bottle, glass taps
  saved:[["chimeWood",0,.55]],
  muse:[["chime6",0,.6]],
  chapterDone:[["waveBreak",0,.9,1,"move"]],                // a wave breaks, moving past you
  bookDone:[["waveBig",0,1,1,"move"],["thunder",.8,.55]]    // a big wave, thunder behind it
 },
 city:{
  tap:[["126041",0,.35,1.4]],
  open:[["cityOpen",0,.8]],
  chapters:[["newspaper",0,.8]],
  newChapter:[["metroDoors",0,.7]],
  words:[["passingCar",0,.45,1,"move"]], goal:[["honk",0,.6]],
  idea:[["211247",0,.7],["68224",1.05,.6]],
  saved:[["register",0,.6]],
  muse:[["saxLick",0,.6]],
  chapterDone:[["cheerShort",0,.7]],
  bookDone:[["saxStreet",0,.8],["cheerBig",4.5,.6]]
 },
 celestial:{
  tap:[["262958",0,.35]],
  open:[["271370",0,.8]],
  chapters:[["136778",0,.7]],
  newChapter:[["whoosh",0,.6,1,"move"]],
  words:[["owl",0,.45]], goal:[["shootingStar",0,.6]],
  idea:[["211247",0,.7],["whooshSoft",1.05,.5]],
  saved:[["windup",0,.7]],
  muse:[["harp",0,.6]],
  chapterDone:[["400809",0,.8]],
  bookDone:[["419594",0,.9],["400809",1.2,.6]]
 },
 room:{
  tap:[["66397",0,.4,1.15]],
  open:[["253659",0,.9],["130388",.4,.6]],
  chapters:[["397548",0,.7],["397548",.18,.6,1.1],["397548",.34,.5,.95]],
  newChapter:[["136778",0,.8]],
  words:[["611113",0,.35]], goal:[["611113",0,.55],["571513",.5,.6]],
  idea:[["211247",0,.7],["68224",1.05,.6]],
  saved:[["360949",0,.8]],
  muse:[["571513",0,.7]],
  chapterDone:[["teaPour",0,.8],["teacup",3.0,.8]],           // you've earned a cup of tea
  bookDone:[["cork",0,.9],["champPour",.6,.8],["cheers",3.6,.9]] // the cork, the pour, two glasses
 }
};
// Background loops. Shore's waves move nearer and farther and side to side;
// the city adds a vendor, a horn or a passing car now and then.
const AMB={noir:["243781",.35], city:["cityLoop",.5], shore:["852826",.6], celestial:["129678",.4], room:["414767",.5]};
const CITY_EXTRAS=[["vendor1",.35],["vendor2",.35],["promoter",.3],["horn",.3],["passingCar",.35],["honk",.25]];
let lastKey=0;
function play(name){
  if(!on()) return;
  const v=(S[mood()]||S.shore)[name];
  if(v==="typewriter"){ const now=Date.now(); if(now-lastKey<35) return; lastKey=now; return hit(Math.random()<.5?"380138":"160678",0,.5,.92+Math.random()*.16); }
  if(Array.isArray(v)) seq(v);
}
function vibrate(p){ try{ if(!calm() && !(window.DB&&DB.ui&&DB.ui.sound===false) && navigator.vibrate) navigator.vibrate(p); }catch(e){} }

/* ---------- background sound on the writing page ---------- */
let ambWanted=false;
async function startAmbience(){
  ambWanted=true; stopAmbience(true);
  if(!on() || (window.DB&&DB.ui&&DB.ui.ambience===false)) return;
  const m=mood(), [id,vol]=AMB[m]||AMB.shore; const a=ac(); const b=await load(id);
  if(!a || !b || amb || !ambWanted) return;
  const out=a.createGain(); out.gain.setValueAtTime(0.0001,a.currentTime); out.gain.exponentialRampToValueAtTime(vol,a.currentTime+2.5);
  let dest=out, nodes=[out], timers=[];
  if(m==="shore" && a.createStereoPanner){
    // Waves come nearer and go back, and drift from side to side.
    const p=a.createStereoPanner(), f=a.createBiquadFilter(); f.type="lowpass"; f.frequency.value=2500;
    const l1=a.createOscillator(), g1=a.createGain(); l1.frequency.value=.07; g1.gain.value=.75; l1.connect(g1); g1.connect(p.pan);
    const l2=a.createOscillator(), g2=a.createGain(); l2.frequency.value=.11; g2.gain.value=1800; l2.connect(g2); g2.connect(f.frequency);
    f.connect(p); p.connect(out); l1.start(); l2.start(); dest=f; nodes.push(p,f,l1,l2);
  }
  out.connect(master);
  // Two copies overlap and cross-fade, so the loop never has a gap or a jump.
  const X=1.5, len=b.duration;
  const one=when=>{ const s=a.createBufferSource(), g=a.createGain(); s.buffer=b; s.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001,when); g.gain.exponentialRampToValueAtTime(1,when+X); g.gain.setValueAtTime(1,when+len-X); g.gain.exponentialRampToValueAtTime(0.0001,when+len);
    s.start(when); s.stop(when+len+.05); nodes.push(s); };
  let next=a.currentTime; one(next); next+=len-X;
  timers.push(setInterval(()=>{ while(next < a.currentTime+X+1){ one(next); next+=len-X; } nodes=nodes.filter(n=>!(n instanceof AudioBufferSourceNode) || true); },1000));
  if(m==="city"){
    // Now and then: a vendor calls, a horn, a car goes by.
    const extra=()=>{ if(!amb) return; const [eid,ev]=CITY_EXTRAS[Math.floor(Math.random()*CITY_EXTRAS.length)]; hit(eid,0,ev*vol*2,1,eid==="passingCar"); amb.t=setTimeout(extra, 12000+Math.random()*20000); };
    timers.push(setTimeout(extra, 6000+Math.random()*8000));
  }
  amb={out,nodes,timers,m};
}
function stopAmbience(keepWanted){
  if(!keepWanted) ambWanted=false;
  if(!amb || !ctx) return; const x=amb; amb=null;
  x.timers.forEach(t=>{ clearInterval(t); clearTimeout(t); }); if(x.t) clearTimeout(x.t);
  try{ x.out.gain.cancelScheduledValues(ctx.currentTime); x.out.gain.setValueAtTime(Math.max(.0001,x.out.gain.value),ctx.currentTime); x.out.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+.8); }catch(e){}
  setTimeout(()=>x.nodes.forEach(n=>{ try{ n.stop&&n.stop(); n.disconnect(); }catch(e){} }),900);
}

/* ---------- the background follows the page ---------- */
// It plays only on the writing page (guided page, or the Draft stage), and
// stops in Calm, with sound off, or with the background switch off.
function writing(){ const d=document.documentElement.dataset; return d.mode==="guided" ? d.gscreen==="page" : d.tab==="draft"; }
function sync(){ if(on() && writing() && !(window.DB&&DB.ui&&DB.ui.ambience===false)){ if(!amb || amb.m!==mood()) startAmbience(); } else if(amb||ambWanted) stopAmbience(); }
new MutationObserver(()=>sync()).observe(document.documentElement,{attributes:true, attributeFilter:["data-tab","data-gscreen","data-mode","data-mood","data-calm"]});
// Opening the app: its look's opening sound, then the background if on the writing page.
function boot(){ play("open"); setTimeout(sync, 1200); }

/* ---------- hooks ---------- */
// Keys sound when pressed (not the writing page itself).
document.addEventListener("pointerdown",e=>{
  if(!on()) return;
  const k=e.target.closest("button, .plate, [data-g]");
  if(!k || k.disabled || k.closest(".editor") || k.closest("[data-nosound]")) return;
  play("tap");
},true);
// Noir: the typewriter while you type, the bell on a new line. (Counted from what
// is typed: Android keyboards often send no key codes.)
document.addEventListener("beforeinput",e=>{
  if(!on() || mood()!=="noir" || (window.DB&&DB.ui&&DB.ui.typingSound===false)) return;
  if(!e.target.closest || !e.target.closest(".editor")) return;
  if(e.inputType==="insertParagraph"||e.inputType==="insertLineBreak") play("enter"); else if(/^insert/.test(e.inputType)) play("key");
},true);
// Silence when the app goes to the background.
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden"){ stopAmbience(); if(ctx) ctx.suspend(); } else { if(ctx) ctx.resume(); sync(); } });

return { play, vibrate, on, startAmbience, stopAmbience, sync, boot, ac, load, S };
})();
