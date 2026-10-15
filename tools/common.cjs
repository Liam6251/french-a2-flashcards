// Shared helpers for the audio download tools (run with Node 18+).
const fs = require("fs"), path = require("path"), vm = require("vm");

const ROOT = path.join(__dirname, "..");
const UA = { "User-Agent": "french-a2-flashcards/1.0 (https://github.com/Liam6251/french-a2-flashcards)" };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Same slug as the web app (app.js): strip accents and apostrophes, spaces to dashes.
const slug = s => s.replace(/œ/g, "oe").replace(/Œ/g, "Oe").replace(/æ/g, "ae")
  .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "")
  .replace(/[^a-zA-Z0-9 -]/g, " ").trim().replace(/\s+/g, "-").replace(/-+/g, "-").toLowerCase();

function loadThemes() {
  const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
  const dir = path.join(ROOT, "data");
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".js")).sort()) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx);
  return ctx.THEMES;
}

// Every distinct card, keyed by slug of its French text.
function allItems() {
  const map = new Map();
  for (const t of loadThemes()) for (const it of t.items) {
    const id = slug(it[0]);
    if (!map.has(id)) map.set(id, { id, fr: it[0], en: it[1], kind: t.kind });
  }
  return [...map.values()];
}

const clean = s => s.replace(/\(.*?\)/g, "").replace(/\+ ?infinitif/g, "").replace(/…/g, " ")
  .replace(/\s+([!?.,:;])/g, "$1").replace(/[!?.,:;\s]+$/g, "").replace(/\s+/g, " ").trim();
const ARTICLE = /^(le|la|les|un|une|des|du) |^l['’]/i;

// Expressions: "A / B" means two full alternatives only if both have 2+ words; otherwise "Il / Elle n'est pas là" -> "Il n'est pas là".
function exprText(fr) {
  const parts = fr.split(/\s*\/\s*/);
  if (parts.length > 1 && parts.every(p => /^[A-ZÀ-Ý]/.test(p) && clean(p).split(" ").length >= 2)) return clean(parts[0]);
  return clean(fr.replace(/\s*\/\s*[^\s/]+/g, ""));
}

// Wiktionary titles to look up for a card's word recording(s). One entry per spoken form.
function wordKeys(item) {
  const forms = item.kind === "vocab" ? item.fr.split(/\s*\/\s*/).map(p => clean(p).replace(ARTICLE, "")) : [exprText(item.fr)];
  return forms.filter(k => k && k.split(" ").length <= 6).map(k => k.replace(/'/g, "’"));
}

// Text to search Tatoeba for a native sentence.
function sentenceQuery(item) {
  if (item.kind === "vocab") {
    const first = clean(item.fr.split(/\s*\/\s*/)[0]), w = first.replace(ARTICLE, "");
    return { q: w.includes(" ") ? `"${w}"` : `=${w}`, prefer: first.toLowerCase(), min: 3, max: 10 };
  }
  const t = exprText(item.fr).replace(/"/g, "");
  return { q: `"${t}"`, prefer: t.toLowerCase(), min: 1, max: 12 };
}

async function get(url, tries = 8) {
  for (let a = 0; a < tries; a++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status !== 429 && r.status < 500) return r;
    } catch (e) {}
    await sleep(Math.min(60000, 4000 * 2 ** a));
  }
  return { ok: false, status: 429 };
}

const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return d; } };
const writeJSON = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 1));

module.exports = { ROOT, UA, sleep, slug, loadThemes, allItems, wordKeys, sentenceQuery, exprText, get, readJSON, writeJSON };
