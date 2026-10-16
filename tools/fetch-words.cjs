// Downloads native-speaker word recordings (Lingua Libre / Wikimedia Commons) for every card.
// 1. looks the word up on fr.wiktionary (50 titles per request), 2. searches Commons directly for recordings
// Wiktionary doesn't link to. A recording is only accepted if its file name says exactly the card's text.
// Resumable: progress is kept in audio/words.json. Usage: node tools/fetch-words.cjs [--recheck]
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { ROOT, sleep, slug, allItems, wordKeys, get, readJSON, writeJSON } = require("./common.cjs");

const OUT = path.join(ROOT, "audio"), MF = path.join(OUT, "words.json");
fs.mkdirSync(OUT, { recursive: true });
const manifest = readJSON(MF, {});
const PREF = ["Lepticed7", "LoquaxFR", "Pamputt", "WikiLucas00", "Poslovitch", "Roptat", "Lyokoï", "GrandCelinien", "Guilhelma", "Eihel"];
const lcFirst = s => s[0].toLowerCase() + s.slice(1);
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "'")
  .replace(/\(.*?\)/g, "").replace(/[_\s]+/g, " ").replace(/[^a-z' -]/g, "").replace(/\s+/g, " ").trim();

// What the recording says, from its file name: "LL-Q150 (fra)-Speaker Name-mot.wav" or "Fr-mot.ogg".
const DASHED_SPEAKERS = ["Jérémy-Günther-Heinz Jähnick"];   // speaker names that contain a dash
// [speaker, word] from the file name: "LL-Q150 (fra)-Speaker-mot.wav" or "Fr-mot.ogg".
function spoken(file) {
  const f = file.replace(/_/g, " ").replace(/\.\w+$/, "");
  if (f.startsWith("LL-Q150 (fra)-")) {
    const rest = f.slice("LL-Q150 (fra)-".length), sp = DASHED_SPEAKERS.find(s => rest.startsWith(s + "-"));
    return sp ? [sp, rest.slice(sp.length + 1)] : [rest.slice(0, rest.indexOf("-")), rest.slice(rest.indexOf("-") + 1)];
  }
  if (/^Fr-/.test(f)) return ["Wiktionary", f.slice(3)];
  return null;
}
const says = (file, key) => { const s = spoken(file); return !!s && norm(s[1]) === norm(key); };
const regional = f => /^Fr-(?!.*LL).*-(ouest|sud|nord|qc|be|ch|paris-)/i.test(f) || /^(Qc|Be|Ch)-/i.test(f);

function ranked(files, key) {
  const ok = files.filter(f => /\.(wav|ogg|mp3|flac|oga)$/i.test(f) && says(f, key) && !regional(f));
  const rank = f => { const i = PREF.findIndex(s => f.startsWith(`LL-Q150 (fra)-${s}-`)); return f.startsWith("LL-") ? (i < 0 ? PREF.length : i) : PREF.length + 1; };
  return ok.sort((a, b) => rank(a) - rank(b));
}
const safeName = k => { const b = slug(k); return (/^(con|prn|aux|nul|com\d|lpt\d)$/.test(b) ? b + "-w" : b) + ".mp3"; };

async function download(key, options) {
  for (const file of options.slice(0, 4)) {   // some files have no mp3 version: try the next speaker
    const name = file.replace(/ /g, "_"), h = crypto.createHash("md5").update(name).digest("hex");
    const base = `https://upload.wikimedia.org/wikipedia/commons`;
    const src = /\.mp3$/i.test(name) ? `${base}/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(name)}`
      : `${base}/transcoded/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(name)}/${encodeURIComponent(name)}.mp3`;
    const r = await get(src);
    if (!r.ok) continue;
    const out = safeName(key);
    fs.writeFileSync(path.join(OUT, out), Buffer.from(await r.arrayBuffer()));
    manifest[key] = { file: out, source: `https://commons.wikimedia.org/wiki/File:${name}`, speaker: spoken(file)[0] || "Lingua Libre" };
    writeJSON(MF, manifest); await sleep(1000);
    return true;
  }
  return false;
}

(async () => {
  const keys = [...new Set(allItems().flatMap(wordKeys))];
  // drop recordings that don't say exactly the card's text (e.g. a redirect from "en colère" to "colère")
  for (const k of keys) {
    const m = manifest[k];
    if (m && !says(decodeURIComponent(m.source.split("File:")[1]).replace(/_/g, " "), k)) { console.log("dropping", k, "<-", m.source.split("File:")[1]); delete manifest[k]; }
    if (process.argv.includes("--recheck") && m === null) delete manifest[k];
  }
  const todo = keys.filter(k => !(k in manifest) || (manifest[k] && !fs.existsSync(path.join(OUT, manifest[k].file))));
  console.log(`${keys.length} spoken forms, ${todo.length} to look up`);

  // 1. Wiktionary pages (batched)
  const found = {};
  const titles = [...new Set(todo.flatMap(k => [k, lcFirst(k)]))];
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50), images = {};
    const url = `https://fr.wiktionary.org/w/api.php?action=query&format=json&redirects=1&prop=images&imlimit=max&titles=${encodeURIComponent(batch.join("|"))}`;
    let cont = {}, norm2 = {};
    do {
      const d = await (await get(url + Object.entries(cont).map(([a, b]) => `&${a}=${encodeURIComponent(b)}`).join(""))).json();
      for (const p of Object.values(d.query?.pages || {})) (images[p.title] ||= []).push(...(p.images || []).map(x => x.title.replace(/^Fichier:/, "")));
      for (const x of [...(d.query?.normalized || []), ...(d.query?.redirects || [])]) norm2[x.from] = x.to;
      cont = d.continue || null; await sleep(400);
    } while (cont);
    for (const t of batch) { let tt = t; for (let n = 0; n < 3 && norm2[tt]; n++) tt = norm2[tt]; if (images[tt]) found[t] = images[tt]; }
  }

  let ok = 0, miss = 0;
  for (const k of todo) {
    let options = ranked([...(found[k] || []), ...(found[lcFirst(k)] || [])], k);
    // 2. Commons search: Lingua Libre has many recordings that no Wiktionary page links to
    if (!options.length) {
      const q = `intitle:"LL-Q150 (fra)" intitle:"${k.replace(/"/g, "")}"`;
      const r = await get(`https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=50&format=json&srsearch=${encodeURIComponent(q)}`);
      try { options = ranked(((await r.json()).query?.search || []).map(x => x.title.replace(/^File:/, "")), k); } catch (e) {}
      await sleep(700);
    }
    if (options.length && await download(k, options)) { ok++; console.log(`ok ${k} <- ${options[0]}`); }
    else { manifest[k] = null; miss++; writeJSON(MF, manifest); }
  }
  // forget forms no card uses any more (e.g. a feminine form that now reuses the masculine recording)
  const keySet = new Set(keys);
  for (const k of Object.keys(manifest)) if (!keySet.has(k)) delete manifest[k];
  writeJSON(MF, manifest);
  // remove files no longer used
  const used = new Set(Object.values(manifest).filter(Boolean).map(m => m.file));
  for (const f of fs.readdirSync(OUT).filter(f => f.endsWith(".mp3"))) if (!used.has(f)) fs.unlinkSync(path.join(OUT, f));
  console.log(`done: ${ok} downloaded, ${miss} without a recording`);
})();
