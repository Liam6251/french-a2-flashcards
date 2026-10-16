// Merges the audio manifests into audio/index.json (what the web app loads).
// Per card key: w = parts to play in order (file names; {t} only if no clip exists at all), by = speakers,
// n = 1 when the main audio is a neural voice, s = native sentence.
// Shared maps: __x = example sentence -> clip, __v = conjugation line -> clip, __m = DELF model answers (list of clips each).
// Usage: node tools/build-index.cjs
const fs = require("fs"), path = require("path");
const { ROOT, allItems, wordKeys, exprText, speakText, loadThemes, readJSON } = require("./common.cjs");

const words = readJSON(path.join(ROOT, "audio", "words.json"), {});
const sents = readJSON(path.join(ROOT, "audio", "sentences.json"), {});
const tts = readJSON(path.join(ROOT, "audio", "tts.json"), {});
const has = f => f && fs.existsSync(path.join(ROOT, "audio", f));
const F = "fr-FR-DeniseNeural";
const neural = text => { const f = tts[F + "|" + text.trim()]; return has(f) ? f : null; };
const flat = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const index = {};
const n = { native: 0, mixed: 0, sentence: 0, neural: 0, none: 0, s: 0 };
const items = allItems();
for (const it of items) {
  const keys = wordKeys(it), e = {};
  const recs = keys.map(k => words[k] && has(words[k].file) ? words[k] : null);
  const sen = sents[it.id] && has(sents[it.id].file) ? sents[it.id] : null;
  if (recs.some(Boolean)) {
    // a form nobody recorded is filled in with the neural voice
    e.w = recs.map((r, i) => r ? r.file : (neural(keys[i].replace(/’/g, "'")) || { t: keys[i] }));
    e.by = [...new Set(recs.filter(Boolean).map(r => r.speaker))];
    recs.every(Boolean) ? n.native++ : n.mixed++;
  } else if (sen && it.kind === "expr" && flat(sen.t) === flat(exprText(it.fr))) {
    e.w = [sen.file]; e.by = [sen.by]; n.sentence++;   // the native sentence is exactly the expression
  } else if (neural(speakText(it.fr))) {
    e.w = [neural(speakText(it.fr))]; e.n = 1; n.neural++;
  } else n.none++;
  if (sen) { e.s = { f: sen.file, t: sen.t, e: sen.e, by: sen.by, lic: sen.lic, src: sen.src }; n.s++; }
  if (e.w || e.s) index[it.id] = e;
}
index.__x = {}; index.__v = {};
for (const t of loadThemes()) for (const it of t.items) { const f = neural(it[2]); if (f) index.__x[it[2].trim()] = f; }
for (const [k, f] of Object.entries(tts)) if (k !== "__models" && has(f) && !index.__x[k.split("|")[1]]) index.__v[k.split("|")[1]] = f;
index.__m = (tts.__models || []).map(lines => lines.map(k => tts[k]).filter(has));
fs.writeFileSync(path.join(ROOT, "audio", "index.json"), JSON.stringify(index));
console.log(`${items.length} cards: ${n.native} native, ${n.mixed} native + neural for a missing form, ${n.sentence} via an exact native sentence, ` +
  `${n.neural} neural voice, ${n.none} device voice only | ${n.s} native sentences | ${Object.keys(index.__x).length} example clips, ${Object.keys(index.__v).length} other clips`);
