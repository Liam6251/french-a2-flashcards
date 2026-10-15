// Merges audio/words.json and audio/sentences.json into audio/index.json (what the web app loads).
// Usage: node tools/build-index.cjs
const fs = require("fs"), path = require("path");
const { ROOT, allItems, wordKeys, readJSON, writeJSON } = require("./common.cjs");

const words = readJSON(path.join(ROOT, "audio", "words.json"), {});
const sents = readJSON(path.join(ROOT, "audio", "sentences.json"), {});
const index = {};
let w = 0, s = 0, items = allItems();
for (const it of items) {
  const rec = wordKeys(it).map(k => words[k]).filter(x => x && fs.existsSync(path.join(ROOT, "audio", x.file)));
  const sen = sents[it.id];
  const e = {};
  // only use word recordings when every spoken form has one (otherwise the device voice reads the full text)
  if (rec.length && rec.length === wordKeys(it).length) { e.w = rec.map(x => x.file); e.by = [...new Set(rec.map(x => x.speaker))]; w++; }
  if (sen && fs.existsSync(path.join(ROOT, "audio", sen.file))) { e.s = { f: sen.file, t: sen.t, e: sen.e, by: sen.by, lic: sen.lic, src: sen.src }; s++; }
  if (e.w || e.s) index[it.id] = e;
}
fs.writeFileSync(path.join(ROOT, "audio", "index.json"), JSON.stringify(index));
console.log(`${items.length} cards: ${w} with a native word recording, ${s} with a native sentence`);
