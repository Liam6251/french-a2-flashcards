// Downloads native-speaker word recordings (Lingua Libre / Wikimedia Commons) for every card.
// Resumable: progress is kept in audio/words.json. Usage: node tools/fetch-words.cjs
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { ROOT, sleep, slug, allItems, wordKeys, get, readJSON, writeJSON } = require("./common.cjs");

const OUT = path.join(ROOT, "audio"), MF = path.join(OUT, "words.json");
fs.mkdirSync(OUT, { recursive: true });
const manifest = readJSON(MF, readJSON(path.join(OUT, "credits.json"), {}));
const PREF = ["Lepticed7", "LoquaxFR", "Pamputt", "WikiLucas00", "Poslovitch", "Roptat", "Lyokoï", "GrandCelinien", "Guilhelma", "Eihel"];
const lcFirst = s => s[0].toLowerCase() + s.slice(1);

// All usable recordings, best first (preferred speakers, then other Lingua Libre speakers, then older Wiktionary files).
function ranked(files) {
  const ll = files.filter(f => f.startsWith("LL-Q150 (fra)-"));
  const rank = f => { const i = PREF.findIndex(s => f.startsWith(`LL-Q150 (fra)-${s}-`)); return i < 0 ? PREF.length : i; };
  return [...ll.sort((a, b) => rank(a) - rank(b)), ...files.filter(f => /^Fr-.*\.(ogg|wav|mp3|flac)$/i.test(f) && !/-(ouest|sud|nord|qc|be|ch)/i.test(f))];
}

(async () => {
  const keys = [...new Set(allItems().flatMap(wordKeys))];
  const todo = keys.filter(k => !(k in manifest) || (manifest[k] && !fs.existsSync(path.join(OUT, manifest[k].file))));
  console.log(`${keys.length} spoken forms, ${todo.length} to look up`);

  // 1. Batched Wiktionary lookups (50 titles per request).
  const found = {};
  const titles = [...new Set(todo.flatMap(k => [k, lcFirst(k)]))];
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = `https://fr.wiktionary.org/w/api.php?action=query&format=json&redirects=1&prop=images&imlimit=max&titles=${encodeURIComponent(batch.join("|"))}`;
    let d = {}, cont = {};
    // imlimit=max is shared across the batch, so follow "continue" until done
    const images = {};
    do {
      const r = await get(url + Object.entries(cont).map(([a, b]) => `&${a}=${encodeURIComponent(b)}`).join(""));
      d = await r.json();
      for (const p of Object.values(d.query?.pages || {})) (images[p.title] ||= []).push(...(p.images || []).map(x => x.title.replace(/^Fichier:/, "")));
      var norm = Object.fromEntries([...(d.query?.normalized || []), ...(d.query?.redirects || [])].map(x => [x.from, x.to]));
      for (const t of batch) { let tt = t; for (let n = 0; n < 3 && norm[tt]; n++) tt = norm[tt]; if (images[tt]) found[t] = images[tt]; }
      cont = d.continue || null;
      await sleep(400);
    } while (cont);
    process.stdout.write(`lookup ${Math.min(i + 50, titles.length)}/${titles.length}\r`);
  }
  console.log();

  // 2. Download the chosen recordings as mp3 (Commons serves a transcoded mp3 of every audio file).
  let ok = 0, miss = 0;
  for (const k of todo) {
    const options = [...ranked(found[k] || []), ...ranked(found[lcFirst(k)] || [])];
    if (!options.length) { manifest[k] = null; miss++; continue; }
    let r = null, file, name;
    for (file of options.slice(0, 4)) {   // some files have no mp3 version: try the next speaker
      name = file.replace(/ /g, "_"); const h = crypto.createHash("md5").update(name).digest("hex");
      const base = `https://upload.wikimedia.org/wikipedia/commons`;
      const src = /\.mp3$/i.test(name) ? `${base}/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(name)}`
        : `${base}/transcoded/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(name)}/${encodeURIComponent(name)}.mp3`;
      r = await get(src);
      if (r.ok) break;
    }
    if (!r.ok) { console.log("failed", k, r.status); continue; }
    // "nul", "con", "aux"… are reserved file names on Windows
    const base = slug(k), out = (/^(con|prn|aux|nul|com\d|lpt\d)$/.test(base) ? base + "-w" : base) + ".mp3";
    fs.writeFileSync(path.join(OUT, out), Buffer.from(await r.arrayBuffer()));
    const speaker = name.match(/^LL-Q150_\(fra\)-(.+?)-[^-]+\.\w+$/)?.[1]?.replace(/_/g, " ") || "Wiktionary";
    manifest[k] = { file: out, source: `https://commons.wikimedia.org/wiki/File:${name}`, speaker };
    ok++; writeJSON(MF, manifest);
    console.log(`ok ${k} <- ${file}`);
    await sleep(1200);
  }
  writeJSON(MF, manifest);
  console.log(`done: ${ok} downloaded, ${miss} without a recording`);
})();
