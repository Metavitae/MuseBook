/* "Kithe presents MuseBook": the approved 10 s opening (Chat, v4), played
   every time the app is opened fresh. The page loads once per open, so coming
   back from the background never replays it. Tap anywhere to skip.
   It starts the moment the page opens (this script sits right after #intro),
   and the book loads behind it; the page calls INTRO.after() for what follows.
   In the phone app the app plays it instead (src/Intro.tsx); this page waits.
   Sound off: the video plays silent. Calm or reduce-motion: the final emblem
   as a still for 2 s instead. The video and still are packed in by build-www. */
window.INTRO=(function(){
const MP4="/*INTROMP4*/", STILL="/*INTROSTILL*/";
const BLUE="#0f1d5d", WHITE="#f2f4f4";
function bars(bg, dark){ try{ if(window.MuseNative && MuseNative.theme) MuseNative.theme(bg, dark); }catch(e){} }
let ended=false, waiting=[];
function after(f){ if(ended) f(); else waiting.push(f); }
function start(o){
  const el=document.getElementById("intro");
  let over=false, timers=[];
  function finish(){
    if(over) return; over=true;
    timers.forEach(clearTimeout);
    const v=el && el.querySelector("video"); if(v){ try{ v.pause(); }catch(e){} }
    if(el){ el.classList.add("out"); setTimeout(()=>{ el.hidden=true; el.innerHTML=""; }, 400); }
    ended=true; waiting.splice(0).forEach(f=>{ try{ f(); }catch(e){} });
  }
  if(!el){ finish(); return; }
  // In the phone app the opening is played by the app itself, before this page has
  // even loaded; just wait for it to end.
  if(window.MuseNative && MuseNative.nativeIntro){
    el.hidden=true;
    MuseNative.introWait().then(finish, finish);
    return;
  }
  el.addEventListener("click", finish);
  const still = o.calm || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  if(still || !MP4){
    el.style.background=BLUE; bars(BLUE, true);
    el.innerHTML='<img alt="MuseBook" src="data:image/webp;base64,'+STILL+'">';
    timers.push(setTimeout(finish, 2000));
    return;
  }
  bars(WHITE, false);
  const v=document.createElement("video");
  // Straight from the packed data: the browser decodes it, no copying in script first.
  v.playsInline=true; v.muted=!o.sound; v.preload="auto"; v.src="data:video/mp4;base64,"+MP4;
  v.addEventListener("ended", finish);
  v.addEventListener("error", finish);
  el.appendChild(v);
  // The backdrop turns deep blue at about 3.3-4.3 s; the bars follow.
  timers.push(setTimeout(()=>{ if(!over) bars(BLUE, true); }, 3800));
  // Never let a stuck video block writing.
  timers.push(setTimeout(finish, 12000));
  const p=v.play();
  if(p && p.catch) p.catch(()=>{
    // Some phones refuse sound without a tap first: play silent rather than not at all.
    if(over) return; v.muted=true; v.play().catch(finish);
  });
}
return {start, after};
})();
// The writer's sound and Calm settings come with the book the app hands the page.
(function(){
  let ui={}; try{ ui=(window.MuseNative && MuseNative.bootUi) || JSON.parse(localStorage.getItem("musebook_v1")||"{}").ui || {}; }catch(e){}
  INTRO.start({ sound: ui.sound!==false, calm: !!ui.calm });
})();
