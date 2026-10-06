// One-time: keep only the latin subset of the prototype's Google Fonts (covers
// English and Spanish), download the woff2 files, and write fonts.css that
// points at them by local name. build-www.mjs inlines them for offline use.
import fs from "node:fs";
const dir = new URL("../www/fonts/", import.meta.url);
const css = fs.readFileSync(new URL("google.css", dir), "utf8");
const blocks = css.split(/(?=\/\* [a-z-]+ \*\/)/).filter(b => b.startsWith("/* latin */"));
const files = new Map();
let out = "";
for (const b of blocks) {
  const url = b.match(/url\((https:[^)]+\.woff2)\)/)[1];
  if (!files.has(url)) files.set(url, `f${files.size}.woff2`);
  out += b.replace(url, files.get(url)).replace("/* latin */\n", "");
}
for (const [url, name] of files) {
  const res = await fetch(url);
  fs.writeFileSync(new URL(name, dir), Buffer.from(await res.arrayBuffer()));
}
fs.writeFileSync(new URL("fonts.css", dir), out);
console.log(blocks.length, "faces,", files.size, "files");
