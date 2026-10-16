// Generates neural-voice MP3s (Microsoft Edge read-aloud voices, via the msedge-tts package) for everything that has
// no native recording: cards, missing feminine forms, every example sentence, every conjugation line and the DELF models.
// Resumable: audio/tts.json maps "voice|text" -> file. Usage: npm install && node tools/make-tts.cjs
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const { ROOT, sleep, loadThemes, allItems, wordKeys, speakText, readJSON, writeJSON } = require("./common.cjs");

const DIR = path.join(ROOT, "audio", "tts"), MF = path.join(ROOT, "audio", "tts.json");
fs.mkdirSync(DIR, { recursive: true });
const manifest = readJSON(MF, {});
const words = readJSON(path.join(ROOT, "audio", "words.json"), {});
const F = "fr-FR-DeniseNeural", M = "fr-FR-HenriNeural";


const jobs = new Map();   // key -> {voice, text}
const want = (text, voice = F) => { text = text.trim(); if (text) jobs.set(voice + "|" + text, { voice, text }); return voice + "|" + text; };

// 1. cards and forms without a native recording
for (const it of allItems()) {
  const keys = wordKeys(it), have = keys.map(k => !!words[k]);
  if (!have.some(Boolean)) want(speakText(it.fr));
  else keys.forEach((k, i) => { if (!have[i]) want(k.replace(/’/g, "'")); });
}
// 2. every example sentence
for (const t of loadThemes()) for (const it of t.items) want(it[2]);
// 3. conjugations (same strings the verbs page plays)
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "verbs.js"), "utf8") + "\nthis.VERBS = VERBS; this.conjugateVerb = conjugateVerb;", ctx);
for (const v of ctx.VERBS) {
  want(v.v);
  const C = ctx.conjugateVerb(v);
  for (const t of ["present", "imparfait", "passe", "futur"]) for (const [pr, stem, end] of C[t]) want(pr + stem + end.replace(/\(e\)s?/, ""));
}
// 4. DELF model answers (from app.js), line by line; dialogue lines alternate voices
const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const MODELS = vm.runInNewContext("(" + app.slice(app.indexOf("const MODELS = [") + 15, app.indexOf("];", app.indexOf("const MODELS = [")) + 1) + ")");
const modelLines = MODELS.map((m, k) => m.fr.split("\n").map(s => s.replace(/^—\s*/, "").trim()).filter(Boolean)
  .map((line, j) => ({ line, voice: k === 3 ? (j % 2 ? F : M) : k === 2 ? M : F })));
modelLines.flat().forEach(l => want(l.line, l.voice));

const todo = [...jobs.entries()].filter(([key]) => !manifest[key] || !fs.existsSync(path.join(ROOT, "audio", manifest[key])));
console.log(`${jobs.size} clips needed, ${todo.length} to generate`);

async function synth(tts, text) {
  const { audioStream } = tts.toStream(text);
  return await new Promise((resolve, reject) => {
    const chunks = [], timer = setTimeout(() => reject(new Error("timeout")), 30000);
    audioStream.on("data", d => chunks.push(d));
    audioStream.on("end", () => { clearTimeout(timer); resolve(Buffer.concat(chunks)); });
    audioStream.on("error", e => { clearTimeout(timer); reject(e); });
  });
}

let done = 0, failed = [];
async function worker(queue) {
  let tts = null, voice = null;
  for (let job; (job = queue.shift());) {
    const [key, { voice: v, text }] = job;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        if (!tts || voice !== v) { tts?.close(); tts = new MsEdgeTTS(); await tts.setMetadata(v, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3); voice = v; }
        const buf = await synth(tts, text);
        if (buf.length < 1500) throw new Error("empty audio");
        const file = "tts/" + crypto.createHash("sha1").update(key).digest("hex").slice(0, 14) + ".mp3";
        fs.writeFileSync(path.join(ROOT, "audio", file), buf);
        manifest[key] = file;
        break;
      } catch (e) {
        tts?.close(); tts = null;
        if (attempt === 3) failed.push(text); else await sleep(2000 * (attempt + 1));
      }
    }
    if (++done % 100 === 0) { writeJSON(MF, manifest); console.log(`${done}/${todo.length}`); }
  }
  tts?.close();
}

(async () => {
  const queue = todo.slice();
  await Promise.all([1, 2, 3, 4].map(() => worker(queue)));
  // keep only clips that are still needed
  for (const k of Object.keys(manifest)) if (!jobs.has(k)) { try { fs.unlinkSync(path.join(ROOT, "audio", manifest[k])); } catch (e) {} delete manifest[k]; }
  manifest.__models = modelLines.map(lines => lines.map(l => l.voice + "|" + l.line));
  writeJSON(MF, manifest);
  console.log(`done: ${done - failed.length} generated, ${failed.length} failed${failed.length ? ": " + failed.slice(0, 20).join(" | ") : ""}`);
})();
