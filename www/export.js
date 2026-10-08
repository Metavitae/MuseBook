/* ============================================================
   FILES FROM THE BOOK: Word (.docx), eBook (.epub), PDF, text (.md).
   Everything is made here on the phone, offline. Word and eBook are
   zip files; a tiny "stored" zip writer is enough (no compression
   needed for a book). PDF is a print-ready page that Android's own
   printing turns into a file (window.MuseFiles.pdf).
   Uses the page's helpers: DB, partKey, partLabel, partOrder, KIND_LABEL,
   t(), esc(), words(), fmt(), todayStr(), sanitizeHTML().
   ============================================================ */
var MBX = (function(){

/* ---------- the book, in reading order ---------- */
// One entry per scene that has words, grouped in parts (dedication, prologue,
// chapters by number, epilogue). include(s) decides on unfinished chapters.
function bookParts(include){
  const groups = {};
  DB.scenes.forEach(s=>{
    if(!words(s.text||"")) return;
    if(include && !include(s)) return;
    const k=partKey(s); (groups[k]=groups[k]||[]).push(s);
  });
  return partOrder(Object.keys(groups)).map(k=>{
    const sc=groups[k];
    const titles=sc.map(s=>guidedTitle(s)).filter(Boolean);
    return { key:k, label:t(partLabel(k)), title: sc.length===1 ? (titles[0]||"") : "", scenes:sc };
  });
}
// A chapter's own title, but not the placeholder "Scene 1" names full view makes.
function guidedTitle(s){ const v=(s.title||"").trim(); return /^(scene|escena)\s*\d+$/i.test(v) ? "" : v; }

function bookMeta(){
  const c=DB.contract||{};
  return { title:(c.title||"").trim() || t("Untitled Book"), subtitle:(c.subtitle||"").trim(), author:(c.author||"").trim() };
}
function fileBase(){ return bookMeta().title.replace(/[\\/:*?"<>|\n\r]+/g,"-").slice(0,60); }

/* ---------- html → blocks (shared by Word and eBook) ---------- */
// A block: {tag:"p"|"h2"|"h3"|"blockquote", align, runs:[{text,b,i,u}]}
function htmlBlocks(html){
  const box=document.createElement("div"); box.innerHTML=sanitizeHTML(html||"");
  const out=[];
  function runsOf(node, st, runs){
    node.childNodes.forEach(n=>{
      if(n.nodeType===3){ if(n.nodeValue) runs.push({text:n.nodeValue, b:st.b, i:st.i, u:st.u}); return; }
      if(n.nodeType!==1) return;
      const tg=n.tagName.toLowerCase();
      if(tg==="br"){ runs.push({text:"\n", b:st.b, i:st.i, u:st.u}); return; }
      const fw=(n.style&&n.style.fontWeight)||"", fs=(n.style&&n.style.fontStyle)||"", td=(n.style&&n.style.textDecoration)||"";
      runsOf(n, { b: st.b||tg==="b"||tg==="strong"||fw==="bold"||Number(fw)>=600, i: st.i||tg==="i"||tg==="em"||fs==="italic", u: st.u||tg==="u"||/underline/.test(td) }, runs);
    });
    return runs;
  }
  function walk(node){
    node.childNodes.forEach(n=>{
      if(n.nodeType===3){ if(n.nodeValue.trim()) out.push({tag:"p", runs:[{text:n.nodeValue}]}); return; }
      if(n.nodeType!==1) return;
      const tg=n.tagName.toLowerCase();
      if(["p","h1","h2","h3","h4","blockquote","li"].includes(tg) || (tg==="div" && !n.querySelector("p,div,h2,h3,blockquote"))){
        const runs=runsOf(n,{},[]);
        if(runs.map(r=>r.text).join("").trim()) out.push({tag: tg==="h1"?"h2":tg==="h4"?"h3":tg==="li"||tg==="div"?"p":tg, align:(n.style&&n.style.textAlign)||"", runs});
      } else walk(n);
    });
  }
  walk(box);
  return out;
}

/* ---------- zip (stored, no compression) ---------- */
const CRC=(()=>{ const tb=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; tb[n]=c>>>0; } return tb; })();
function crc32(u8){ let c=0xFFFFFFFF; for(let i=0;i<u8.length;i++) c=CRC[(c^u8[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function zip(files){ // [{name, data:string|Uint8Array}] in order
  const enc=new TextEncoder(), parts=[], central=[]; let off=0;
  const u16=v=>[v&255,(v>>>8)&255], u32=v=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
  files.forEach(f=>{
    const name=enc.encode(f.name), data= typeof f.data==="string" ? enc.encode(f.data) : f.data, crc=crc32(data);
    const head=[...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)];
    parts.push(new Uint8Array(head), name, data);
    central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]), name);
    off += head.length+name.length+data.length;
  });
  const csize=central.reduce((a,p)=>a+p.length,0);
  const end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(csize),...u32(off),...u16(0)]);
  const all=[...parts,...central,end], total=all.reduce((a,p)=>a+p.length,0), out=new Uint8Array(total); let p=0;
  all.forEach(a=>{ out.set(a,p); p+=a.length; });
  return out;
}
function b64(u8){ let s=""; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s); }
const xml=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- Word ---------- */
function docx(parts){
  const m=bookMeta();
  const run=r=>{
    const pr=(r.b?"<w:b/>":"")+(r.i?"<w:i/>":"")+(r.u?'<w:u w:val="single"/>':"");
    return r.text.split("\n").map((tx,j)=>(j?"<w:r><w:br/></w:r>":"")+`<w:r>${pr?"<w:rPr>"+pr+"</w:rPr>":""}<w:t xml:space="preserve">${xml(tx)}</w:t></w:r>`).join("");
  };
  const para=(style,runs,extra)=>`<w:p><w:pPr><w:pStyle w:val="${style}"/>${extra||""}</w:pPr>${runs.map(run).join("")}</w:p>`;
  const jc=a=>a==="center"?'<w:jc w:val="center"/>':a==="right"?'<w:jc w:val="right"/>':"";
  let body=para("Title",[{text:m.title}]);
  if(m.subtitle) body+=para("Subtitle",[{text:m.subtitle}]);
  if(m.author) body+=para("Subtitle",[{text:m.author}]);
  parts.forEach(pt=>{
    body+=para("Heading1",[{text:pt.label}],'<w:pageBreakBefore/>');
    if(pt.title) body+=para("Heading2",[{text:pt.title}]);
    pt.scenes.forEach((s,si)=>{
      if(si) body+=para("SceneBreak",[{text:"* * *"}]);
      let first=true;
      htmlBlocks(s.html).forEach(bk=>{
        const st= bk.tag==="h2"?"Heading2": bk.tag==="h3"?"Heading3": bk.tag==="blockquote"?"Quote": first?"FirstPara":"BodyText";
        body+=para(st,bk.runs,jc(bk.align)); if(bk.tag==="p") first=false;
      });
    });
  });
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const sty=(id,name,ppr,rpr,based)=>`<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/>${based?`<w:basedOn w:val="${based}"/>`:""}<w:qFormat/><w:pPr>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/><w:sz w:val="24"/><w:lang w:val="${LANG==="es"?"es-MX":"en-US"}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`+
    sty("Normal","Normal","","")+
    sty("BodyText","Body Text",'<w:ind w:firstLine="425"/><w:jc w:val="both"/>',"","Normal")+
    sty("FirstPara","First Paragraph",'<w:jc w:val="both"/>',"","Normal")+
    sty("Title","Title",'<w:jc w:val="center"/><w:spacing w:before="2400" w:after="240"/>','<w:sz w:val="56"/>',"Normal")+
    sty("Subtitle","Subtitle",'<w:jc w:val="center"/><w:spacing w:after="120"/>','<w:i/><w:sz w:val="30"/>',"Normal")+
    sty("Heading1","heading 1",'<w:keepNext/><w:jc w:val="center"/><w:spacing w:before="1800" w:after="240"/><w:outlineLvl w:val="0"/>','<w:sz w:val="36"/>',"Normal")+
    sty("Heading2","heading 2",'<w:keepNext/><w:jc w:val="center"/><w:spacing w:after="480"/><w:outlineLvl w:val="1"/>','<w:i/><w:sz w:val="28"/>',"Normal")+
    sty("Heading3","heading 3",'<w:keepNext/><w:spacing w:before="240" w:after="120"/>','<w:b/>',"Normal")+
    sty("Quote","Quote",'<w:ind w:left="720" w:right="720"/>','<w:i/>',"Normal")+
    sty("SceneBreak","Scene Break",'<w:jc w:val="center"/><w:spacing w:before="240" w:after="240"/>',"","Normal")+`</w:styles>`;
  return zip([
    {name:"[Content_Types].xml", data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`},
    {name:"_rels/.rels", data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`},
    {name:"docProps/core.xml", data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(m.title)}</dc:title>${m.author?`<dc:creator>${xml(m.author)}</dc:creator>`:""}</cp:coreProperties>`},
    {name:"word/_rels/document.xml.rels", data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name:"word/document.xml", data:doc},
    {name:"word/styles.xml", data:styles}
  ]);
}

/* ---------- eBook (EPUB 3) ---------- */
function xhtmlOf(html){
  // Re-serialize the sanitized html as well-formed XHTML.
  const box=document.createElement("div"); box.innerHTML=sanitizeHTML(html||"");
  return Array.from(box.childNodes).map(n=>new XMLSerializer().serializeToString(n)).join("").replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g,"");
}
function epub(parts){
  const m=bookMeta(), lang= LANG==="es"?"es":"en", id="urn:musebook:"+Date.now();
  const page=(title,body)=>`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}" xml:lang="${lang}"><head><title>${xml(title)}</title><link rel="stylesheet" type="text/css" href="book.css"/></head><body>${body}</body></html>`;
  const files=[], items=[], spine=[], nav=[];
  files.push({name:"OEBPS/title.xhtml", data:page(m.title,`<section class="titlepage" epub:type="titlepage"><h1>${xml(m.title)}</h1>${m.subtitle?`<p class="sub">${xml(m.subtitle)}</p>`:""}${m.author?`<p class="author">${xml(m.author)}</p>`:""}</section>`)});
  items.push(`<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`); spine.push(`<itemref idref="title"/>`);
  parts.forEach((pt,i)=>{
    const body=pt.scenes.map(s=>xhtmlOf(s.html)).join('<p class="break">* * *</p>');
    const head=`<h2>${xml(pt.label)}</h2>${pt.title?`<p class="ctitle">${xml(pt.title)}</p>`:""}`;
    files.push({name:`OEBPS/c${i+1}.xhtml`, data:page(pt.label,`<section epub:type="chapter">${head}${body}</section>`)});
    items.push(`<item id="c${i+1}" href="c${i+1}.xhtml" media-type="application/xhtml+xml"/>`); spine.push(`<itemref idref="c${i+1}"/>`);
    nav.push(`<li><a href="c${i+1}.xhtml">${xml(pt.label+(pt.title?" · "+pt.title:""))}</a></li>`);
  });
  const css=`body{font-family:Georgia,serif;line-height:1.55;margin:0 5%} h1,h2{text-align:center;font-weight:normal} h2{margin:3em 0 .4em} .ctitle{text-align:center;font-style:italic;margin:0 0 2em} p{margin:0;text-indent:1.3em;text-align:justify} h2+p,.ctitle+p,.break+p{text-indent:0} .break{text-align:center;text-indent:0;margin:1em 0} .titlepage{text-align:center;margin-top:30%} .titlepage p{text-indent:0;text-align:center} .sub{font-style:italic} blockquote{margin:1em 2em;font-style:italic}`;
  const opf=`<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${lang}"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">${id}</dc:identifier><dc:title>${xml(m.title)}</dc:title><dc:language>${lang}</dc:language>${m.author?`<dc:creator>${xml(m.author)}</dc:creator>`:""}<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/,"Z")}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="book.css" media-type="text/css"/>${items.join("")}</manifest><spine>${spine.join("")}</spine></package>`;
  const navx=page(t("Contents"),`<nav epub:type="toc" id="toc"><h2>${xml(t("Contents"))}</h2><ol>${nav.join("")}</ol></nav>`);
  return zip([
    {name:"mimetype", data:"application/epub+zip"},
    {name:"META-INF/container.xml", data:`<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`},
    {name:"OEBPS/content.opf", data:opf},
    {name:"OEBPS/nav.xhtml", data:navx},
    {name:"OEBPS/book.css", data:css},
    ...files
  ]);
}

/* ---------- PDF (a print-ready page) ---------- */
function pdfHtml(parts){
  const m=bookMeta();
  const body=parts.map(pt=>`<section class="ch"><h2>${esc(pt.label)}</h2>${pt.title?`<p class="ctitle">${esc(pt.title)}</p>`:""}${pt.scenes.map(s=>sanitizeHTML(s.html||"")).join('<p class="break">* * *</p>')}</section>`).join("");
  return `<!doctype html><html lang="${LANG}"><head><meta charset="utf-8"><style>
@page{size:148mm 210mm; margin:18mm 16mm 20mm}
body{font-family:Georgia,'Times New Roman',serif; font-size:11pt; line-height:1.5; color:#111; font-variant-numeric:lining-nums}
.title{page-break-after:always; text-align:center; padding-top:38%}
.title h1{font-size:26pt; font-weight:normal; margin:0 0 10pt} .title p{font-style:italic; font-size:13pt; margin:0}
.ch{page-break-before:always} h2{text-align:center; font-weight:normal; font-size:17pt; margin:28mm 0 4pt}
.ctitle{text-align:center; font-style:italic; text-indent:0 !important; margin:0 0 14mm}
p{margin:0; text-indent:1.3em; text-align:justify} h2+p,.ctitle+p,.break+p{text-indent:0}
.break{text-align:center; text-indent:0; margin:8pt 0} blockquote{margin:8pt 18pt; font-style:italic}
h3{font-size:12pt; margin:12pt 0 4pt}
</style></head><body><div class="title"><h1>${esc(m.title)}</h1>${m.subtitle?`<p>${esc(m.subtitle)}</p>`:""}${m.author?`<p>${esc(m.author)}</p>`:""}</div>${body}</body></html>`;
}

/* ---------- plain text (markdown) ---------- */
function md(parts){
  const m=bookMeta();
  let out=`# ${m.title}\n\n`; if(m.subtitle) out+=`*${m.subtitle}*\n\n`;
  out+="---\n\n";
  parts.forEach(pt=>{
    out+=`## ${pt.label}${pt.title?": "+pt.title:""}\n\n`;
    pt.scenes.forEach((s,i)=>{ if(i) out+="* * *\n\n"; const t2=htmlToMarkdown(s.html||"").trim(); if(t2) out+=t2+"\n\n"; });
  });
  const n=parts.reduce((a,p)=>a+p.scenes.reduce((b,s)=>b+words(s.text||""),0),0);
  out += LANG==="es" ? `---\n\n_${fmt(n)} palabras · exportado el ${todayStr()} desde MuseBook_\n` : `---\n\n_${fmt(n)} words · exported ${todayStr()} from MuseBook_\n`;
  return out;
}

/* ---------- make one ---------- */
// kind: "word" | "pdf" | "ebook" | "text". Returns the native file handle.
async function make(kind, include){
  const parts=bookParts(include);
  if(!parts.length) throw new Error("empty");
  const base=fileBase()+"-"+todayStr();
  if(!window.MuseFiles) throw new Error("no files");
  if(kind==="word") return MuseFiles.make({filename:base+".docx", mime:"application/vnd.openxmlformats-officedocument.wordprocessingml.document", base64:b64(docx(parts))});
  if(kind==="ebook") return MuseFiles.make({filename:base+".epub", mime:"application/epub+zip", base64:b64(epub(parts))});
  if(kind==="pdf") return MuseFiles.pdf({filename:base+".pdf", html:pdfHtml(parts)});
  return MuseFiles.make({filename:base+".md", mime:"text/markdown", text:md(parts)});
}

return { bookParts, guidedTitle, make, docx, epub, pdfHtml, md, zip, crc32 };
})();
