/* Mots A2: DELF French flashcards. Data comes from data/*.js (THEMES) and verbs.js (VERBS). */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const store = {
  get(k, d){ try { const v = localStorage.getItem("motsA2_"+k); return v === null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem("motsA2_"+k, JSON.stringify(v)); } catch(e){} }
};
// Same slug as tools/common.cjs, used to find audio files.
const slug = s => s.replace(/œ/g,"oe").replace(/Œ/g,"Oe").replace(/æ/g,"ae").normalize("NFD").replace(/[̀-ͯ]/g,"")
  .replace(/[’']/g,"").replace(/[^a-zA-Z0-9 -]/g," ").trim().replace(/\s+/g,"-").replace(/-+/g,"-").toLowerCase();
const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset()*60000) / 864e5);
const INTERVALS = [0, 1, 3, 7, 14, 30, 60];   // days until next review, by box
const toast = msg => { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200); };

/* ---------- cards ---------- */
const CARDS = [];
THEMES.forEach(t => t.items.forEach(it => CARDS.push({ id: t.id + "/" + slug(it[0]), t, fr: it[0], en: it[1], exF: it[2], exE: it[3], key: slug(it[0]) })));
const BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));
const THEME = Object.fromEntries(THEMES.map(t => [t.id, t]));

/* ---------- progress (spaced repetition) ---------- */
let prog = store.get("prog", null), stars = store.get("stars2", null);
if (!prog) {   // migrate progress from the first version (keyed by index in the Top 100 list)
  prog = {}; stars = {};
  const top = CARDS.filter(c => c.t.id === "top100"), oldS = store.get("status", {}), oldF = store.get("stars", {});
  for (const n in oldS) if (top[n]) prog[top[n].id] = oldS[n] === "k" ? { b: 1, d: today() + 1, s: "k" } : { b: 0, d: today(), s: "l" };
  for (const n in oldF) if (top[n] && oldF[n]) stars[top[n].id] = 1;
  store.set("prog", prog); store.set("stars2", stars);
}
stars = stars || {};
const saveProg = () => { store.set("prog", prog); store.set("stars2", stars); };
const known = c => prog[c.id]?.s === "k", learning = c => prog[c.id]?.s === "l";
const due = c => prog[c.id] && prog[c.id].d <= today();
function rate(c, ok){
  const p = prog[c.id] || { b: 0 };
  if (ok) { p.b = Math.min((p.b || 0) + 1, INTERVALS.length - 1); p.d = today() + INTERVALS[p.b]; p.s = "k"; }
  else { p.b = 0; p.d = today(); p.s = "l"; }
  prog[c.id] = p; saveProg();
  const log = store.get("log", {}); log[today()] = (log[today()] || 0) + 1; store.set("log", log);
}
function streak(){ const log = store.get("log", {}); let d = today(), n = 0; if (!log[d]) d--; while (log[d]) { n++; d--; } return n; }

/* ---------- settings ---------- */
let S = Object.assign({ dir: "fr", auto: false, rate: 1, voice: "", theme: "auto", quiz: false, newPer: 20, mode: "smart" }, store.get("settings", {}));
const save = () => store.set("settings", S);

/* ---------- audio ---------- */
let AUDIO = {};   // key -> {w:[files], by:[speakers], s:{f,t,e,by,lic,src}}
fetch("audio/index.json").then(r => r.json()).then(j => { AUDIO = j; if (!$("view-study").hidden) renderCard(); }).catch(() => {});
const player = new Audio();
let playingBtn = null;
function setPlaying(btn){ if (playingBtn) playingBtn.classList.remove("playing"); playingBtn = btn; if (btn) btn.classList.add("playing"); }
let playId = 0;   // bumped on every stop, so callbacks from cancelled audio/speech don't continue
function stopAll(){ playId++; player.pause(); player.onended = player.onerror = null; if ("speechSynthesis" in window) speechSynthesis.cancel(); setPlaying(null); }
const frVoices = () => ("speechSynthesis" in window) ? speechSynthesis.getVoices().filter(v => /^fr/i.test(v.lang)) : [];
function bestVoice(){
  const vs = frVoices(); if (S.voice) { const v = vs.find(v => v.name === S.voice); if (v) return v; }
  const rank = v => (/natural|neural/i.test(v.name)?4:0) + (/online|google/i.test(v.name)?2:0) + (/fr-FR/i.test(v.lang)?1:0);
  return vs.sort((a, b) => rank(b) - rank(a))[0];
}
const speakable = s => s.replace(/\(e\)s?/g, "").replace(/\(.*?\)/g, "").replace(/\+ ?infinitif/g, "").replace(/…/g, " ").replace(/\s\/\s/g, ", ");
// Long texts are read sentence by sentence: Chrome stops a single utterance after ~15 seconds.
function tts(text, btn){
  stopAll(); if (!("speechSynthesis" in window)) return toast("No voice available on this device");
  const chunks = text.split(/(?<=[.!?…])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  setPlaying(btn); let k = 0; const id = playId;
  const next = () => { if (id !== playId) return; if (k >= chunks.length) return setPlaying(null); speechSynthesis.speak(utterance(chunks[k++], next)); };
  next();
}
function utterance(text, onend){
  const u = new SpeechSynthesisUtterance(speakable(text));
  u.lang = "fr-FR"; u.rate = S.rate < 1 ? .7 : .92; const v = bestVoice(); if (v) u.voice = v;
  u.onend = u.onerror = onend; return u;
}
// Plays parts in order: a file name (native recording) or {t: "text"} (device voice, for a form nobody has recorded).
function playFiles(parts, btn, fallbackText){
  stopAll(); let k = 0; setPlaying(btn); const id = playId;
  const next = () => {
    if (id !== playId) return;
    if (k >= parts.length) { setPlaying(null); return; }
    const p = parts[k++];
    if (typeof p === "object") {
      if (!("speechSynthesis" in window)) return next();
      speechSynthesis.speak(utterance(p.t, () => setTimeout(next, 150)));
      return;
    }
    player.onended = () => setTimeout(next, 250); player.onerror = fail;
    player.src = "audio/" + p; player.playbackRate = S.rate; player.play().catch(fail);
  };
  const fail = () => { if (id !== playId) return; player.onended = player.onerror = null; fallbackText ? tts(fallbackText, btn) : setPlaying(null); };
  next();
}
function playCard(c, btn){ const a = AUDIO[c.key]; a?.w?.length ? playFiles(a.w, btn, c.fr) : tts(c.fr, btn); }
function playNative(c, btn){ const s = AUDIO[c.key]?.s; if (s) playFiles([s.f], btn, s.t); }
function preload(c){ const a = c && AUDIO[c.key]; if (!a) return; [...(a.w || []), ...(a.s ? [a.s.f] : [])].filter(f => typeof f === "string").forEach(f => { const x = new Audio(); x.preload = "auto"; x.src = "audio/" + f; }); }
function populateVoices(){
  const vs = frVoices(), best = bestVoice();
  $("voice").innerHTML = vs.length ? vs.map(v => `<option ${v.name === (S.voice || best?.name) ? "selected" : ""}>${esc(v.name)}</option>`).join("") : `<option>No French voice on this device</option>`;
}
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = populateVoices;
$("voice").onchange = e => { S.voice = e.target.value; save(); tts("Bonjour, comment ça va ?"); };

/* ---------- home ---------- */
function deckStats(cards){
  return { n: cards.length, k: cards.filter(known).length, d: cards.filter(due).length };
}
function tile(t){
  const cs = CARDS.filter(c => c.t === t), s = deckStats(cs);
  return `<button class="tile" data-deck="${t.id}"><span class="ic">${t.icon}</span><b>${esc(t.name)}</b><span class="fr">${esc(t.fr)}</span>
    <span class="meta"><span>${s.k}/${s.n}</span>${s.d ? `<span class="due">${s.d} due</span>` : ""}</span><span class="bar"><i style="width:${s.n ? s.k / s.n * 100 : 0}%"></i></span></button>`;
}
function renderHome(){
  const all = deckStats(CARDS);
  $("totalCards").textContent = CARDS.length.toLocaleString("en");
  $("sKnown").textContent = all.k; $("sDue").textContent = all.d;
  $("sAgain").textContent = CARDS.filter(learning).length; $("sStar").textContent = Object.keys(stars).filter(k => stars[k] && BY_ID[k]).length;
  $("meter").style.width = (all.k / CARDS.length * 100) + "%";
  const fresh = CARDS.filter(c => !prog[c.id]).length;
  $("ctaDailyN").textContent = `${all.d} due + ${Math.min(S.newPer, fresh)} new` + (streak() ? ` · 🔥 ${streak()} day${streak() > 1 ? "s" : ""}` : "");
  $("ctaDueN").textContent = all.d;
  const allTile = (kind, name, fr, icon) => { const cs = CARDS.filter(c => c.t.kind === kind), s = deckStats(cs);
    return `<button class="tile big" data-deck="all-${kind}"><span class="ic">${icon}</span><b>${name}</b><span class="fr">${fr}</span><span class="meta"><span>${s.k}/${s.n}</span>${s.d ? `<span class="due">${s.d} due</span>` : ""}</span><span class="bar"><i style="width:${s.k / s.n * 100}%"></i></span></button>`; };
  $("tilesVocab").innerHTML = allTile("vocab", "All vocabulary", "Tout le vocabulaire", "📚") + THEMES.filter(t => t.kind === "vocab").map(tile).join("");
  $("tilesExpr").innerHTML = allTile("expr", "All expressions", "Toutes les expressions", "💬") + THEMES.filter(t => t.kind === "expr").map(tile).join("");
}
document.addEventListener("click", e => {
  const d = e.target.closest("[data-deck]"); if (d) { openDeck(d.dataset.deck, d.dataset.mode); return; }
  const g = e.target.closest("[data-go]"); if (g) showView(g.dataset.go);
});
$("ctaDaily").onclick = () => openDeck("all", "smart");
$("ctaDue").onclick = () => openDeck("all", "due");
$("ctaStar").onclick = () => openDeck("all", "starred");

/* ---------- study ---------- */
let deckId = store.get("deck", "top100"), deck = [], i = 0, flipped = false, reviewed = 0;
function scopeCards(id){
  if (id === "all") return CARDS;
  if (id === "all-vocab") return CARDS.filter(c => c.t.kind === "vocab");
  if (id === "all-expr") return CARDS.filter(c => c.t.kind === "expr");
  if (id.startsWith("card:")) return [BY_ID[id.slice(5)]].filter(Boolean);
  return CARDS.filter(c => c.t.id === id);
}
function deckMeta(id){
  if (id === "all") return { icon: "🇫🇷", name: "Daily session", fr: "Everything: cards due for review first, then new ones" };
  if (id === "all-vocab") return { icon: "📚", name: "All vocabulary", fr: "Tout le vocabulaire" };
  if (id === "all-expr") return { icon: "💬", name: "All expressions", fr: "Toutes les expressions" };
  if (id.startsWith("card:")) { const c = BY_ID[id.slice(5)]; return { icon: c.t.icon, name: c.t.name, fr: c.t.fr }; }
  return THEME[id] || THEME.top100;
}
function openDeck(id, mode){
  deckId = id; store.set("deck", id);
  if (mode) { S.mode = mode === "due" ? "smart" : mode; save(); }
  $("mode").value = S.mode;
  build(false, mode === "due");
  showView("study");
}
let dueOnly = false;   // "Review due" session: no new cards, even after shuffling
function build(shuffle, dueOnlyArg){
  if (dueOnlyArg !== undefined) dueOnly = dueOnlyArg;
  const cs = scopeCards(deckId), m = S.mode;
  if (deckId.startsWith("card:")) deck = cs;
  else if (m === "smart") {
    const dueC = cs.filter(due).sort((a, b) => prog[a.id].d - prog[b.id].d || prog[a.id].b - prog[b.id].b);
    const fresh = dueOnly ? [] : cs.filter(c => !prog[c.id]).slice(0, S.newPer);
    deck = shuffle ? [...mix(dueC), ...mix(fresh)] : [...dueC, ...fresh];
  } else {
    deck = cs.filter(c => m === "all" || (m === "new" && !prog[c.id]) || (m === "learning" && learning(c)) || (m === "starred" && stars[c.id]));
    if (shuffle) deck = mix(deck);
  }
  const meta = deckMeta(deckId);
  $("dIcon").textContent = meta.icon; $("dName").textContent = meta.name; $("dSub").textContent = meta.fr;
  i = 0; reviewed = 0; renderCard(true);
}
const mix = a => { a = a.slice(); for (let k = a.length - 1; k > 0; k--) { const j = Math.random() * (k + 1) | 0; [a[k], a[j]] = [a[j], a[k]]; } return a; };
const gender1 = fr => /^le |\(m\)|\(m pl\)/.test(fr) ? "m" : /^la |\(f\)|\(f pl\)/.test(fr) ? "f" : "";
// "le cousin / la cousine" or "l'ami / l'amie" have both genders: no single label
const gender = fr => { const g = [...new Set(fr.split(/\s+\/\s+/).map(gender1))]; return g.length === 1 ? g[0] : ""; };
// colour each article by its own gender
const fmtFr = fr => fr.split(/\s+\/\s+/).map(p => esc(p).replace(/^(les|le|la|l')(\s?)(?=\S)/, (m, a, s) => {
  const g = gender1(p) || (a === "le" ? "m" : a === "la" ? "f" : ""); return g ? `<span class="art-${g}">${a}</span>${s}` : m; })).join(" / ");
const sizeClass = s => s.length > 26 ? "word long" : "word";

function renderCard(anim){
  stopAll(); flipped = false; $("card").classList.remove("flipped"); $("fb").textContent = ""; $("answer").value = "";
  const has = deck.length > 0; $("cardArea").hidden = !has; $("empty").hidden = has;
  if (!has) {
    $("pos").textContent = ""; $("sessionInfo").textContent = "";
    const fresh = scopeCards(deckId).filter(c => !prog[c.id]).length;
    $("empty").innerHTML = `<b>${reviewed ? "Session complete 🎉" : "Nothing to review here"}</b>${reviewed ? `You reviewed ${reviewed} card${reviewed > 1 ? "s" : ""}. ` : ""}${fresh ? `${fresh} new card${fresh > 1 ? "s" : ""} left in this deck.` : "You've seen every card in this deck."}
      <div class="cta">${fresh ? `<button class="btn primary" id="moreNew">✨ Learn ${Math.min(S.newPer, fresh)} more</button>` : ""}<button class="btn" id="browseAll">Browse all cards</button><button class="btn" data-go="home">← Decks</button></div>`;
    $("moreNew") && ($("moreNew").onclick = () => { S.mode = "new"; save(); $("mode").value = "new"; build(); deck = deck.slice(0, S.newPer); renderCard(true); });
    $("browseAll").onclick = () => { S.mode = "all"; save(); $("mode").value = "all"; build(); };
    return;
  }
  const c = deck[i], frFront = S.dir === "fr", g = c.t.kind === "vocab" ? gender(c.fr) : "", p = prog[c.id];
  $("pos").textContent = `${String(i + 1).padStart(2, "0")} / ${String(deck.length).padStart(2, "0")}`;
  $("sessionInfo").textContent = reviewed ? `${reviewed} reviewed` : (S.mode === "smart" ? "due first, then new" : "");
  $("fCat").textContent = $("bCat").textContent = c.t.icon + " " + c.t.name;
  $("fGen").hidden = !g || !frFront; $("fGen").className = "pill " + g; $("fGen").textContent = g === "m" ? "masc." : "fém.";
  $("fStat").hidden = false;
  $("fStat").className = "pill " + (!p ? "n" : due(c) ? (p.s === "l" ? "l" : "k") : "k");
  $("fStat").textContent = !p ? "new" : p.s === "l" ? "✗ learning" : due(c) ? "↻ review" : "✓ known";
  $("fWord").className = sizeClass(frFront ? c.fr : c.en); $("fWord").innerHTML = frFront ? fmtFr(c.fr) : esc(c.en);
  $("fHint").textContent = frFront ? "Tap to flip" : "How do you say it in French?";
  $("bWord").className = sizeClass(frFront ? c.en : c.fr); $("bWord").innerHTML = frFront ? esc(c.en) : fmtFr(c.fr);
  $("bSub").innerHTML = frFront ? fmtFr(c.fr) : esc(c.en);
  $("exFr").textContent = c.exF; $("exEn").textContent = c.exE;
  const a = AUDIO[c.key], s = a?.s;
  $("nat").hidden = !s || s.t === c.exF;
  if (s) { $("natFr").textContent = s.t; $("natEn").textContent = s.e; $("natBy").innerHTML = `${esc(s.by)} · <a href="${esc(s.src)}" target="_blank" rel="noopener">${esc(s.lic)}</a>`; }
  $("star").classList.toggle("on", !!stars[c.id]);
  $("playF").hidden = !frFront;
  $("fSrc").textContent = frFront ? (a?.w?.length ? "🎙 " + a.by.join(" · ") : "🔈 device voice") : "";
  $("conjLink").hidden = !findVerb(c.fr);
  if (anim) { const sc = $("scene"); sc.classList.remove("in"); void sc.offsetWidth; sc.classList.add("in"); }
  if (S.auto && frFront) playCard(c, $("playF"));
  preload(c); preload(deck[i + 1]);
  if (S.quiz) setTimeout(() => $("answer").focus({ preventScroll: true }), 60);
}
function flip(){
  if (!deck.length) return; flipped = !flipped; $("card").classList.toggle("flipped", flipped);
  if (flipped && S.auto && S.dir === "en") playCard(deck[i], $("playB"));
}
function go(d){ if (!deck.length) return; i = (i + d + deck.length) % deck.length; renderCard(true); }
function mark(ok){
  if (!deck.length) return;
  const c = deck[i]; rate(c, ok); reviewed++;
  const sc = $("scene"); sc.classList.add(ok ? "out-r" : "out-l");
  setTimeout(() => {
    sc.classList.remove("out-r", "out-l");
    if (S.mode === "all" || deckId.startsWith("card:")) { if (deckId.startsWith("card:")) deck = []; else i = (i + 1) % deck.length; }
    else {
      deck.splice(i, 1);
      if (!ok) deck.splice(Math.min(i + 4, deck.length), 0, c);   // see it again a few cards later
      if (i >= deck.length) i = 0;
    }
    renderCard(true);
  }, 280);
}
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)/g, "").replace(/[’]/g, "'")
  .replace(/[!?.,…;:]/g, "").replace(/^(to |the |a |an |l'|le |la |les |un |une )/, "").replace(/\s+/g, " ").trim();
function check(){
  if (!deck.length) return;
  const c = deck[i], target = S.dir === "fr" ? c.en : c.fr, a = norm($("answer").value);
  if (!a) return;
  const ok = target.split(/\s+\/\s+/).some(t => { t = norm(t); return t === a || (a.length > 2 && (t.includes(a) || a.includes(t))); });
  $("fb").textContent = ok ? "✓ Correct!" : "✗ Answer: " + target;
  $("fb").style.color = ok ? "var(--good)" : "var(--bad)";
  if (!flipped) flip();
  if (S.dir === "en" || ok) playCard(c, $("playB"));
  check.result = ok;
}

$("scene").addEventListener("click", e => { if (e.target.closest("button,a")) return; flip(); });
$("prev").onclick = () => go(-1); $("next").onclick = () => go(1);
$("again").onclick = () => mark(false); $("know").onclick = () => mark(true);
$("playF").onclick = $("playB").onclick = e => playCard(deck[i], e.currentTarget);
$("playEx").onclick = e => tts(deck[i].exF, e.currentTarget);
$("playNat").onclick = e => playNative(deck[i], e.currentTarget);
$("star").onclick = () => { const c = deck[i]; stars[c.id] = stars[c.id] ? 0 : 1; if (!stars[c.id]) delete stars[c.id]; saveProg(); $("star").classList.toggle("on", !!stars[c.id]); };
$("conjLink").onclick = () => { showView("verbs"); selectVerb(findVerb(deck[i].fr).v); };
$("shuffle").onclick = () => build(true);
$("mode").onchange = e => { S.mode = e.target.value; save(); build(false, false); };
$("quizBtn").onclick = () => { S.quiz = !S.quiz; save(); syncUI(); renderCard(); };
$("dirBtn").onclick = () => { S.dir = S.dir === "fr" ? "en" : "fr"; save(); syncUI(); renderCard(true); };
$("check").onclick = check;
$("answer").addEventListener("keydown", e => {
  e.stopPropagation();
  if (e.key === "Enter") { e.preventDefault(); if (flipped && $("fb").textContent) mark(!!check.result); else check(); }
});
let sx = null, sy = null;
$("scene").addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
$("scene").addEventListener("touchend", e => {
  if (sx === null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) mark(dx > 0);
});

/* ---------- verbs ---------- */
const findVerb = fr => { const f = fr.replace(/\s*\(.*?\)/g, "").trim(); return VERBS.find(v => v.v === f); };
let curVerb = store.get("verb2", "être"); if (!VERBS.find(v => v.v === curVerb)) curVerb = "être";
const GROUPS = [["Irregular", v => v.g === 0 && !/^(se |s')/.test(v.v)], ["-er verbs", v => v.g === 1 && !/^(se |s')/.test(v.v)], ["-ir verbs (like finir)", v => v.g === 2],
  ["-re verbs (like attendre)", v => v.g === 3 && !/^(se |s')/.test(v.v)], ["Reflexive (se …)", v => /^(se |s')/.test(v.v)]];
function renderVerbChips(){
  const q = norm($("vSearch").value || "");
  $("verbGroups").innerHTML = GROUPS.map(([name, fn]) => {
    const vs = VERBS.filter(fn).filter(v => !q || norm(v.v).includes(q) || norm(v.en).includes(q));
    return vs.length ? `<div><h4>${name} · ${vs.length}</h4><div class="verbs">${vs.map(v => `<button class="chip ${v.v === curVerb ? "on" : ""}" data-verb="${esc(v.v)}">${esc(v.v)}</button>`).join("")}</div></div>` : "";
  }).join("") || `<p style="color:var(--muted)">No verb found.</p>`;
}
function selectVerb(v){ curVerb = v; store.set("verb2", v); renderVerbChips(); renderConj(); }
const TENSES = [["present", "Présent", "now / usually"], ["imparfait", "Imparfait", "used to / was …ing"], ["passe", "Passé composé", "did / have done"], ["futur", "Futur simple", "will do"]];
function renderConj(){
  const v = VERBS.find(x => x.v === curVerb), C = conjugateVerb(v);
  const rows = arr => arr.map(([pr, stem, end]) => `<button class="row" data-say="${esc(pr + stem + end.replace(/\(e\)s?/, ""))}"><span class="fm"><span class="pr">${esc(pr)}</span>${esc(stem)}<em>${esc(end)}</em></span><span class="spk">🔊</span></button>`).join("");
  const card = CARDS.find(c => c.fr === v.v || c.fr.startsWith(v.v + " "));
  const gname = ["irregular", "regular -er", "regular -ir", "regular -re"][v.g];
  $("conjCard").innerHTML = `
    <div class="conj-top"><button class="play" id="cPlay" aria-label="Listen"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10v4a1 1 0 0 0 1 1h3l4 4V5L7 9H4a1 1 0 0 0-1 1zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg><span class="eq"><i></i><i></i><i></i></span></button>
      <div><h3>${esc(v.v)}</h3><div class="en">${esc(v.en)}</div></div>
      <div class="pills"><span class="pill ${v.g ? "k" : "l"}">${gname}</span><span class="pill">aux. ${C.info.aux}</span></div></div>
    <div class="tables">${TENSES.map(([k, name, hint]) => `<div class="tense"><h4>${name} <span>${hint}</span></h4>${rows(C[k])}</div>`).join("")}</div>
    ${v.note || VERB_NOTES[v.v] ? `<div class="note"><b>Note:</b> ${esc(v.note || VERB_NOTES[v.v])}</div>` : ""}
    ${card ? `<div class="ex" style="max-width:none;margin-top:14px"><button class="play sm" id="cEx" aria-label="Listen to example"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span class="eq"><i></i><i></i><i></i></span></button><div><span class="lbl">Example</span><p>${esc(card.exF)}</p><small>${esc(card.exE)}</small></div></div>` : ""}`;
  $("cPlay").onclick = e => { const k = slug(v.v), a = AUDIO[k] || AUDIO[slug(v.v.replace(/^(se |s')/, ""))]; a?.w?.length && !/^(se |s')/.test(v.v) ? playFiles(a.w, e.currentTarget, v.v) : tts(v.v, e.currentTarget); };
  if (card) $("cEx").onclick = e => tts(card.exF, e.currentTarget);
}
$("verbGroups").onclick = e => { const b = e.target.closest("[data-verb]"); if (b) selectVerb(b.dataset.verb); };
$("vSearch").oninput = renderVerbChips;
$("conjCard").addEventListener("click", e => { const r = e.target.closest("[data-say]"); if (r) tts(r.dataset.say, null); });

// conjugation practice
let vq = null, vqStreak = 0, vqTenses = store.get("vqTenses", ["present", "imparfait", "passe", "futur"]);
function renderVqTenses(){ $("vqTenses").innerHTML = TENSES.map(([k, n]) => `<button class="chip ${vqTenses.includes(k) ? "on" : ""}" data-vqt="${k}">${n}</button>`).join(""); }
$("vqTenses").onclick = e => { const b = e.target.closest("[data-vqt]"); if (!b) return; const k = b.dataset.vqt;
  vqTenses = vqTenses.includes(k) ? vqTenses.filter(x => x !== k) : [...vqTenses, k]; if (!vqTenses.length) vqTenses = [k]; store.set("vqTenses", vqTenses); renderVqTenses(); newVq(); };
function newVq(){
  const v = VERBS[Math.random() * VERBS.length | 0], t = vqTenses[Math.random() * vqTenses.length | 0], p = Math.random() * 6 | 0;
  const [pr, stem, end] = conjugateVerb(v)[t][p], tn = TENSES.find(x => x[0] === t)[1];
  // answer = what to compare against; shown = with the agreement marks, e.g. "nous sommes parti(e)s"
  vq = { v, t, p, answer: (pr + stem + end).replace(/\(e\)s?/, "").trim(), shown: (pr + stem + end).trim() };
  $("vqPrompt").innerHTML = `<span>${esc(v.v)}</span> · ${tn} · ${esc(SUBJ[p])} <small style="color:var(--muted);font-weight:600">(${esc(v.en)})</small>`;
  $("vqInput").value = ""; $("vqFb").textContent = ""; $("vqStreak").textContent = vqStreak ? `🔥 ${vqStreak} in a row` : "";
}
const vnorm = s => s.toLowerCase().replace(/[’]/g, "'").replace(/\(e\)s?/g, "").replace(/\s+/g, " ").replace(/^(il|elle|on|ils|elles) /, "X ").trim();
function checkVq(){
  if (!vq) return; const a = vnorm($("vqInput").value); if (!a) return;
  const strict = vnorm(vq.answer), loose = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const bare = s => s.replace(/^(je|j'|tu|x|nous|vous) ?/, "");
  // with être the participle agrees: accept allé, allée, allés, allées
  const agreed = vq.t === "passe" && conjugateVerb(vq.v).info.aux === "être" ? ["", "e", "s", "es"] : [""];
  const ok = agreed.some(x => a === strict + x || bare(a) === bare(strict) + x);
  const nearly = !ok && loose(a).replace(/^(je|j'|tu|x|nous|vous) ?/, "") === loose(strict).replace(/^(je|j'|tu|x|nous|vous) ?/, "");
  vqStreak = ok ? vqStreak + 1 : 0;
  $("vqFb").innerHTML = ok ? `✓ Correct! <b>${esc(vq.shown)}</b>` : nearly ? `≈ Almost, check the accents: <b>${esc(vq.shown)}</b>` : `✗ Answer: <b>${esc(vq.shown)}</b>`;
  $("vqFb").style.color = ok ? "var(--good)" : nearly ? "var(--warn)" : "var(--bad)";
  tts(vq.answer, null); vq.done = true;
  $("vqStreak").textContent = vqStreak ? `🔥 ${vqStreak} in a row` : "";
}
$("vqCheck").onclick = () => vq?.done ? newVq() : checkVq();
$("vqSkip").onclick = newVq;
$("vqInput").addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); vq?.done ? newVq() : checkVq(); } });

/* ---------- DELF guide ---------- */
const DELF = [
  { icon: "🎧", name: "Listening", fr: "Compréhension de l'oral", time: "≈ 25 min", text: "Short recordings from daily life: announcements in a station or shop, phone messages, radio, conversations. Each recording is played twice and you answer multiple-choice or short questions.",
    tips: ["Read the questions before the recording starts.", "Listen for numbers, times, dates, prices and places. They come up all the time.", "On the first listen, get the general idea. On the second, check the details."], decks: ["temps", "nombres", "transports", "telephone"] },
  { icon: "📄", name: "Reading", fr: "Compréhension des écrits", time: "30 min", text: "Short everyday documents: emails, adverts, signs, instructions, timetables, short articles. You tick answers, match documents and copy out information.",
    tips: ["Learn the exam instructions (cochez, justifiez, recopiez…) so you never lose time on them.", "You don't need every word: look for the information the question asks for.", "« Vrai ou faux » answers need a quoted sentence as proof."], decks: ["consignes", "ecrire", "courses", "ville"] },
  { icon: "✍️", name: "Writing", fr: "Production écrite", time: "45 min", text: "Two tasks of at least 60 words each: (1) describe an event or a personal experience (holiday, weekend, party), and (2) write a message to invite, accept or decline, thank, apologise, ask for or give information.",
    tips: ["Use the passé composé for actions and the imparfait for descriptions (il faisait beau, c'était génial).", "Link your ideas: d'abord, ensuite, puis, enfin, parce que, mais.", "Do everything the task asks for (place, date, reason…) and use the right greeting and sign-off.", "Count your words and keep 5 minutes to check agreements and accents."], decks: ["ecrire", "passe", "inviter", "accepter", "liaison"] },
  { icon: "🗣️", name: "Speaking", fr: "Production orale", time: "6–8 min + 10 min prep", text: "Three parts: (1) entretien dirigé: answer questions about yourself (≈1 min 30); (2) monologue suivi: talk about a topic from daily life (≈2 min); (3) exercice en interaction: act out a situation such as buying something, booking or asking for information (≈3–4 min). Prep time is for parts 2 and 3.",
    tips: ["Have a ready-made introduction: name, age, nationality, family, job, hobbies, why you're learning French.", "In the role play, greet, ask questions, react and be polite (Je voudrais…, Est-ce que vous avez… ?).", "If you don't understand, say so in French: Pouvez-vous répéter, s'il vous plaît ?"], decks: ["presenter", "gouts", "opinion", "magasin", "commander", "comprendre"] }
];
const MODELS = [
  { t: "✍️ Writing task 2: decline an invitation", fr: "Salut Julie,\nMerci beaucoup pour ton invitation à ton anniversaire samedi ! Malheureusement, je ne peux pas venir parce que je pars à Lyon pour le mariage de mon cousin. C'est vraiment dommage, j'aurais adoré faire la fête avec vous. Est-ce qu'on peut se voir la semaine prochaine ? Je t'invite au restaurant mercredi soir, si tu es libre. Dis-moi si ça te va !\nGrosses bises,\nPaul",
    en: "Hi Julie, thanks so much for inviting me to your birthday on Saturday! Unfortunately I can't come because I'm going to Lyon for my cousin's wedding. It's a real shame, I'd have loved to party with you. Can we meet up next week? I'll take you to a restaurant on Wednesday evening if you're free. Let me know if that works! Lots of love, Paul" },
  { t: "✍️ Writing task 1: tell the story of a weekend", fr: "Le week-end dernier, je suis allé à la mer avec ma famille. Samedi matin, nous avons pris le train à huit heures. Il faisait beau et chaud ! L'après-midi, nous nous sommes baignés et les enfants ont joué sur la plage. Le soir, nous avons mangé du poisson dans un petit restaurant. Dimanche, nous avons visité un vieux village. C'était un week-end génial, j'ai hâte d'y retourner !",
    en: "Last weekend I went to the seaside with my family. On Saturday morning we caught the train at eight. It was sunny and hot! In the afternoon we went swimming and the children played on the beach. In the evening we ate fish in a little restaurant. On Sunday we visited an old village. It was a brilliant weekend, I can't wait to go back!" },
  { t: "🗣️ Speaking part 1: introduce yourself", fr: "Bonjour, je m'appelle David, j'ai cinquante ans et je suis anglais. J'habite à Bristol avec ma femme et mes deux enfants. Je suis ingénieur dans une entreprise d'informatique. Pendant mon temps libre, j'aime faire du vélo et cuisiner. J'apprends le français parce que nous allons souvent en vacances en France et je voudrais parler avec les gens.",
    en: "Hello, my name is David, I'm fifty and I'm English. I live in Bristol with my wife and my two children. I'm an engineer at an IT company. In my free time I like cycling and cooking. I'm learning French because we often go on holiday in France and I'd like to talk to people." },
  { t: "🗣️ Speaking part 3: buy a train ticket", fr: "— Bonjour, je voudrais un billet pour Paris, s'il vous plaît.\n— Aller simple ou aller-retour ?\n— Aller-retour. Je pars samedi matin et je reviens dimanche soir.\n— Il y a un train à 8 h 15 ou à 10 h 30.\n— 8 h 15, c'est parfait. Ça coûte combien ?\n— 85 euros.\n— Je peux payer par carte ?\n— Bien sûr. Voilà votre billet. Le train part du quai numéro 3.\n— Merci beaucoup, bonne journée !",
    en: "Hello, I'd like a ticket to Paris, please. — Single or return? — Return. I'm leaving Saturday morning and coming back Sunday evening. — There's a train at 8:15 or 10:30. — 8:15 is perfect. How much is it? — 85 euros. — Can I pay by card? — Of course. Here's your ticket. The train leaves from platform 3. — Thanks a lot, have a nice day!" }
];
function renderDelf(){
  $("delfParts").innerHTML = DELF.map(p => `<div class="part"><h3>${p.icon} ${p.name} <span class="time">${p.time}</span></h3><p style="margin:2px 0 8px;color:var(--faint);font-weight:700">${p.fr} · /25</p><p>${p.text}</p><ul>${p.tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
    <div class="seg">${p.decks.filter(d => THEME[d]).map(d => `<button class="chip" data-deck="${d}">${THEME[d].icon} ${esc(THEME[d].name)}</button>`).join("")}</div></div>`).join("");
  $("models").innerHTML = MODELS.map((m, k) => `<div class="model"><h4><button class="play sm" data-model="${k}" aria-label="Listen"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span class="eq"><i></i><i></i><i></i></span></button>${m.t}</h4><p>${esc(m.fr)}</p><p class="tr">${esc(m.en)}</p></div>`).join("");
}
$("models").onclick = e => { const b = e.target.closest("[data-model]"); if (b) tts(MODELS[+b.dataset.model].fr.replace(/—/g, ""), b); };

/* ---------- search ---------- */
let listLimit = 150;
$("lTheme").innerHTML = `<option value="">All decks</option>` + THEMES.map(t => `<option value="${t.id}">${t.icon} ${esc(t.name)}</option>`).join("");
function renderList(){
  const q = norm($("lSearch").value || ""), th = $("lTheme").value;
  const res = CARDS.filter(c => (!th || c.t.id === th) && (!q || norm(c.fr).includes(q) || norm(c.en).includes(q)));
  $("list").innerHTML = res.slice(0, listLimit).map(c => `<div class="li" data-card="${esc(c.id)}"><span class="dot ${prog[c.id]?.s || ""}"></span><span class="fr">${fmtFr(c.fr)}</span><span class="en">${esc(c.en)}</span><span class="cat">${c.t.icon} ${esc(c.t.name)}</span>
    <button class="play xs" data-play="${esc(c.id)}" aria-label="Listen"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span class="eq"><i></i><i></i><i></i></span></button></div>`).join("")
    || `<div class="li" style="cursor:default"><span></span><span class="en">No card found.</span></div>`;
  $("more").hidden = res.length <= listLimit; $("more").textContent = `Show more (${res.length - listLimit} left)`;
}
$("lSearch").oninput = () => { listLimit = 150; renderList(); };
$("lTheme").onchange = () => { listLimit = 150; renderList(); };
$("more").onclick = () => { listLimit += 300; renderList(); };
$("list").onclick = e => {
  const p = e.target.closest("[data-play]"); if (p) { playCard(BY_ID[p.dataset.play], p); return; }
  const r = e.target.closest("[data-card]"); if (!r) return;
  const c = BY_ID[r.dataset.card]; deckId = c.t.id; S.mode = "all"; save(); $("mode").value = "all"; build(); i = Math.max(0, deck.indexOf(c)); renderCard(true); showView("study");
};

/* ---------- views, settings ---------- */
const VIEWS = ["home", "study", "verbs", "delf", "search"];
function showView(v){
  if (!VIEWS.includes(v)) v = "home";
  VIEWS.forEach(x => $("view-" + x).hidden = x !== v);
  document.querySelectorAll(".nav-btn").forEach(b => b.dataset.view === v ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  movePill(); if (location.hash !== "#" + v) history.replaceState(null, "", "#" + v);
  if (v === "home") renderHome();
  if (v === "study" && !deck.length && !$("empty").innerHTML) build();
  if (v === "search") renderList();
  stopAll(); window.scrollTo({ top: 0 });
}
function movePill(){ const b = document.querySelector('.nav-btn[aria-current="page"]'); if (!b) return; $("navPill").style.left = b.offsetLeft + "px"; $("navPill").style.width = b.offsetWidth + "px"; }
$("nav").onclick = e => { const b = e.target.closest("[data-view]"); if (b) showView(b.dataset.view); };
window.addEventListener("resize", movePill);
window.addEventListener("hashchange", () => { const v = location.hash.slice(1); if (VIEWS.includes(v)) showView(v); });

function syncUI(){
  document.querySelectorAll("[data-dir]").forEach(b => b.classList.toggle("on", b.dataset.dir === S.dir));
  document.querySelectorAll("[data-auto]").forEach(b => b.classList.toggle("on", (b.dataset.auto === "1") === S.auto));
  document.querySelectorAll("[data-rate]").forEach(b => b.classList.toggle("on", +b.dataset.rate === S.rate));
  document.querySelectorAll("[data-theme]").forEach(b => b.classList.toggle("on", b.dataset.theme === S.theme));
  document.querySelectorAll("[data-new]").forEach(b => b.classList.toggle("on", +b.dataset.new === S.newPer));
  $("dirBtn").textContent = S.dir === "fr" ? "FR → EN" : "EN → FR";
  $("quizBtn").classList.toggle("on", S.quiz); $("quiz").hidden = !S.quiz;
  if (S.theme === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = S.theme;
}
$("sheet").onclick = e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (d.dir) { S.dir = d.dir; renderCard(true); }
  if (d.auto) S.auto = d.auto === "1";
  if (d.rate) S.rate = +d.rate;
  if (d.theme) S.theme = d.theme;
  if (d.new) { S.newPer = +d.new; renderHome(); }
  save(); syncUI();
};
const openSheet = o => { $("sheet").classList.toggle("open", o); $("scrim").classList.toggle("open", o); if (o) populateVoices(); };
$("openSettings").onclick = () => openSheet(true);
$("closeSettings").onclick = $("scrim").onclick = () => openSheet(false);
$("reset").onclick = () => { if (confirm("Reset all progress and stars? This can't be undone.")) { prog = {}; stars = {}; saveProg(); store.set("log", {}); renderHome(); build(); openSheet(false); toast("Progress reset"); } };
$("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify({ app: "motsA2", v: 2, prog, stars, log: store.get("log", {}), settings: S })], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `mots-a2-progress-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
};
$("importBtn").onclick = () => $("importFile").click();
$("importFile").onchange = async e => {
  try { const j = JSON.parse(await e.target.files[0].text()); if (j.app !== "motsA2") throw 0;
    prog = j.prog || {}; stars = j.stars || {}; saveProg(); store.set("log", j.log || {}); if (j.settings) { S = Object.assign(S, j.settings); save(); syncUI(); }
    renderHome(); build(); openSheet(false); toast("Progress loaded ✓");
  } catch (err) { toast("That file isn't a Mots A2 backup"); }
  e.target.value = "";
};

document.addEventListener("keydown", e => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "Escape") return openSheet(false);
  if ($("view-study").hidden || !deck.length) return;
  const k = e.key.toLowerCase();
  if (k === " ") { e.preventDefault(); flip(); }
  else if (k === "arrowright") go(1); else if (k === "arrowleft") go(-1);
  else if (k === "1") mark(false); else if (k === "2") mark(true);
  else if (k === "p") playCard(deck[i], flipped ? $("playB") : $("playF"));
  else if (k === "n") { if (!flipped) flip(); playNative(deck[i], $("playNat")); }
  else if (k === "f") $("star").click(); else if (k === "s") build(true);
  else if (k === "d") $("dirBtn").click(); else if (k === "t") $("quizBtn").click();
});

$("verbCount").textContent = VERBS.length;
$("mode").value = S.mode;
syncUI(); renderVerbChips(); renderConj(); renderVqTenses(); newVq(); renderDelf();
build();
showView(VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home");
document.fonts && document.fonts.ready.then(movePill);
