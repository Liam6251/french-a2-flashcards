// Picks a short, simple, native-recorded sentence for every card from the Tatoeba data exports, then downloads its audio.
// Needs (from https://downloads.tatoeba.org/exports/): per_language/fra/fra_sentences.tsv, per_language/fra/fra-eng_links.tsv,
// per_language/eng/eng_sentences.tsv and sentences_with_audio.csv, unpacked into one folder.
// Usage: node tools/pick-sentences.cjs <folder with the export files>
const fs = require("fs"), path = require("path"), vm = require("vm");
const { ROOT, sleep, slug, loadThemes, allItems, exprText, get, readJSON, writeJSON } = require("./common.cjs");

const DATA = process.argv[2];
if (!DATA) { console.error("Usage: node tools/pick-sentences.cjs <tatoeba export folder>"); process.exit(1); }
const lines = f => fs.readFileSync(path.join(DATA, f), "utf8").split("\n").filter(Boolean).map(l => l.split("\t"));
const tokens = s => s.toLowerCase().replace(/[’]/g, "'").split(/[^\p{L}-]+/u).flatMap(t => t.split(/(?<=-)|(?=-)/).filter(x => x !== "-")).filter(Boolean);
const tokenStr = s => " " + tokens(s).join(" ") + " ";

// Keep the examples family-friendly.
const BLOCK = new Set(("merde putain bordel con conne connard salope sexe sexy nu nue tuer tue tué tuée tués meurtre meurtrier suicide drogue drogues cocaïne " +
  "baiser cul bite nazi nazis guerre bombe arme armes fusil pistolet sang mort morte morts mourir meurt cadavre viol violer prostituée bourré ivre " +
  "haïr hais hait stupide idiot idiote imbécile crétin flic flics prison police tué battre frapper gifle enterrement funérailles cancer").split(" "));

// 1. Recordings with a Creative Commons licence.
const audio = new Map();
for (const [sid, aid, user, lic] of lines("sentences_with_audio.csv")) if (/^CC/.test(lic || "") && !audio.has(sid)) audio.set(sid, { aid, user, lic });
// 2. French sentences that have such a recording, and their English translations.
const fra = new Map();
for (const [id, , text] of lines("fra_sentences.tsv")) if (audio.has(id)) fra.set(id, text);
const toEng = new Map();
for (const [f, e] of lines("fra-eng_links.tsv")) if (fra.has(f) && !toEng.has(f)) toEng.set(f, e);
const engNeeded = new Set(toEng.values()), eng = new Map();
for (const [id, , text] of lines("eng_sentences.tsv")) if (engNeeded.has(id)) eng.set(id, text);
console.log(`${fra.size} recorded French sentences, ${toEng.size} with an English translation`);

// 3. Vocabulary the learner meets in the deck (+ simple inflections and all verb forms) = what counts as "simple".
const known = new Set("l j d n c s m t qu y en a à au aux de des du et ou le la les un une il elle ils elles on nous vous je tu me te se lui leur ce ça cet cette ces mon ma mes ton ta tes son sa ses notre nos votre vos est sont pas ne plus très bien oui non que qui quoi dans sur sous avec pour par mais si tout tous toute toutes quel quelle ici là".split(" "));
const addWord = w => { if (!w) return; known.add(w); known.add(w + "s"); known.add(w + "e"); known.add(w + "es"); known.add(w + "x"); };
const themes = loadThemes();
for (const t of themes) for (const [fr, , ex] of t.items) [...tokens(fr), ...tokens(ex)].forEach(addWord);
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, "verbs.js"), "utf8") + "\nthis.VERBS = VERBS; this.conjugateVerb = conjugateVerb;", ctx);
const verbForms = {};
for (const v of ctx.VERBS) {
  const C = ctx.conjugateVerb(v), forms = new Set([v.v.replace(/^(se |s')/, "")]);
  for (const t of ["present", "imparfait", "passe", "futur"]) for (const [, stem, end] of C[t]) forms.add((stem + end.replace(/\(e\)s?/, "")).trim());
  forms.add(C.info.pp); forms.add(C.info.pp + "e"); forms.add(C.info.pp + "s"); forms.add(C.info.pp + "es");
  verbForms[v.v.replace(/^(se |s')/, "")] = [...forms];
  forms.forEach(f => known.add(f));
}

// 4. Score every candidate sentence once.
const words = s => s.trim().split(/\s+/).length;
const cands = [];
for (const [id, text] of fra) {
  const e = eng.get(toEng.get(id)); if (!e) continue;
  const tk = tokens(text), n = words(text);
  if (n < 2 || n > 11 || tk.some(w => BLOCK.has(w)) || /\b(kill|dead|die|drunk|gun|war|hate|stupid|sex)\b/i.test(e)) continue;
  if (!/[.!?]$/.test(text.trim())) continue;
  const unknown = tk.filter(w => !known.has(w)).length;
  if (unknown > 1) continue;
  cands.push({ id, text, e, n, unknown, ts: " " + tk.join(" ") + " ", names: /\b(Tom|Mary|Marie|John)\b/.test(text) });
}
console.log(`${cands.length} simple candidates`);

// 5. For each card, find sentences that contain its word/expression.
const ARTICLE = /^(le|la|les|un|une|des|du) |^l['’]/i;
const clean = s => s.replace(/\(.*?\)/g, "").replace(/\+ ?infinitif/g, "").replace(/…/g, " ").replace(/[!?.,:;]/g, " ").replace(/\s+/g, " ").trim();
function patterns(it) {
  if (it.kind === "expr") { const t = tokens(exprText(it.fr)).join(" "); return t ? [" " + t + " "] : []; }
  const out = [];
  for (const part of it.fr.split(/\s*\/\s*/)) {
    const w = clean(part).replace(ARTICLE, "").toLowerCase(), tk = tokens(w);
    if (!tk.length) continue;
    const first = tk[0].replace(/^(se|s)$/, "");
    const verb = verbForms[tk.join(" ")] || verbForms[tk.slice(tk[0] === "se" || tk[0] === "s" ? 1 : 0).join(" ")];
    if (verb && tk.length <= 2) verb.forEach(f => out.push(" " + tokens(f).join(" ") + " "));
    else if (verbForms[tk[0]] && tk.length > 1) verbForms[tk[0]].forEach(f => out.push(" " + [...tokens(f), ...tk.slice(1)].join(" ") + " "));
    else out.push(" " + tk.join(" ") + " ");
  }
  return [...new Set(out)];
}
const MF = path.join(ROOT, "audio", "sentences.json"), old = readJSON(MF, {});
const used = new Set(), picked = {};
const items = allItems();
const examples = new Set(themes.flatMap(t => t.items.map(i => i[2].trim())));
// expressions and rarer words first, so common words don't use up the best sentences
items.sort((a, b) => (a.kind === "expr" ? 0 : 1) - (b.kind === "expr" ? 0 : 1));
// The English translation must contain the card's meaning, so we don't pick idioms or another sense of the word.
const STOP = new Set("the and for with you your are was can not too one someone something somebody very much get got have has had been being off out about into from that this".split(" "));
const meaningRe = en => {
  const keys = en.toLowerCase().replace(/\(.*?\)/g, " ").replace(/…/g, " ").split(/[^a-z]+/).filter(w => w.length >= 3 && !STOP.has(w))
    .map(w => w.slice(0, Math.max(3, w.length - 2)));
  return keys.length ? new RegExp("\\b(" + [...new Set(keys)].join("|") + ")", "i") : null;
};
const SKIP = new Set(["je-viens-de"]);   // matched sentences use a different meaning
for (const it of items) {
  if (SKIP.has(it.id)) continue;
  const pats = patterns(it); if (!pats.length) continue;
  const ideal = it.kind === "expr" ? 5 : 6, mre = meaningRe(it.en);
  // "Puis,…" / "D'abord,…": the connector must open the sentence
  const lead = /,…$|,$/.test(it.fr.trim()) ? tokens(it.fr).join(" ") : null;
  const best = cands.filter(c => !used.has(c.id) && !examples.has(c.text) && pats.some(p => c.ts.includes(p))
      && (!lead || c.text.toLowerCase().replace(/’/g, "'").startsWith(it.fr.toLowerCase().replace(/[,…\s]+$/, "") + ","))
      && (!mre || mre.test(c.e)))
    .sort((a, b) => a.unknown - b.unknown || a.names - b.names || Math.abs(a.n - ideal) - Math.abs(b.n - ideal) || a.id - b.id)[0];
  if (!best) continue;
  used.add(best.id);
  const au = audio.get(best.id);
  picked[it.id] = { file: `s/${best.id}.mp3`, t: best.text, e: best.e, by: au.user, lic: au.lic, src: `https://tatoeba.org/en/sentences/show/${best.id}`, aid: au.aid };
}
console.log(`${Object.keys(picked).length} of ${items.length} cards matched`);
if (process.env.DRY) { // preview without downloading: DRY=1 node tools/pick-sentences.cjs <folder>
  const all = items.filter(i => picked[i.id]);
  for (let k = 0; k < all.length; k += Math.ceil(all.length / 60)) console.log(`${all[k].fr}  →  ${picked[all[k].id].t}  |  ${picked[all[k].id].e}`);
  process.exit(0);
}

// 6. Download the audio (skips files we already have).
(async () => {
  const dir = path.join(ROOT, "audio", "s"); fs.mkdirSync(dir, { recursive: true });
  const keep = new Set(Object.values(picked).map(p => path.basename(p.file)));
  for (const f of fs.readdirSync(dir)) if (!keep.has(f)) fs.unlinkSync(path.join(dir, f));   // drop recordings no longer used
  const out = {}; let n = 0, got = 0;
  for (const [id, p] of Object.entries(picked)) {
    const file = path.join(ROOT, "audio", p.file);
    if (!fs.existsSync(file)) {
      const r = await get(`https://tatoeba.org/en/audio/download/${p.aid}`);
      if (!r.ok) { console.log("failed", id, r.status); continue; }
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); got++;
      await sleep(400);
    }
    const { aid, ...rest } = p; out[id] = rest;
    if (++n % 50 === 0) { writeJSON(MF, out); console.log(`${n}/${Object.keys(picked).length} (${got} downloaded)`); }
  }
  writeJSON(MF, out);
  console.log(`done: ${n} sentences ready, ${got} newly downloaded`);
})();
