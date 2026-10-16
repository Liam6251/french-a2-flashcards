// Merges audio/words.json and audio/sentences.json into audio/index.json (what the web app loads).
// Per card: w = list of parts to play in order (a file name, or {t: text} for the device voice when a form has no recording),
// by = speakers, s = native sentence. Usage: node tools/build-index.cjs
const fs = require("fs"), path = require("path");
const { ROOT, allItems, wordKeys, exprText, readJSON } = require("./common.cjs");

const words = readJSON(path.join(ROOT, "audio", "words.json"), {});
const sents = readJSON(path.join(ROOT, "audio", "sentences.json"), {});
const has = f => fs.existsSync(path.join(ROOT, "audio", f));
const flat = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const index = {};
let full = 0, part = 0, fromSentence = 0, s = 0;
const items = allItems();
for (const it of items) {
  const keys = wordKeys(it), e = {};
  const recs = keys.map(k => words[k] && has(words[k].file) ? words[k] : null);
  const sen = sents[it.id] && has(sents[it.id].file) ? sents[it.id] : null;
  if (recs.some(Boolean)) {
    e.w = recs.map((r, i) => r ? r.file : { t: keys[i] });
    e.by = [...new Set(recs.filter(Boolean).map(r => r.speaker))];
    recs.every(Boolean) ? full++ : part++;
  } else if (sen && it.kind === "expr" && flat(sen.t) === flat(exprText(it.fr))) {
    // the native sentence is exactly the expression: use it as the main recording too
    e.w = [sen.file]; e.by = [sen.by]; fromSentence++;
  }
  if (sen) { e.s = { f: sen.file, t: sen.t, e: sen.e, by: sen.by, lic: sen.lic, src: sen.src }; s++; }
  if (e.w || e.s) index[it.id] = e;
}
fs.writeFileSync(path.join(ROOT, "audio", "index.json"), JSON.stringify(index));
console.log(`${items.length} cards: ${full} fully recorded, ${part} partly recorded, ${fromSentence} recorded via an exact native sentence, ${s} with a native sentence`);
