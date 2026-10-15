// Verb conjugations: présent, imparfait, passé composé, futur simple.
// g: 1 = regular -er, 2 = regular -ir (finir), 3 = regular -re (attendre), 0 = irregular (present given in p).
// p: the six present forms when they can't be derived. pp: past participle. aux: "être" if not avoir. fut: futur stem.
// imp: imparfait stem override. A verb starting "se " / "s'" is reflexive (passé composé with être).
const VERBS = [
  // --- the big irregulars
  {v:"être", en:"to be", g:0, p:["suis","es","est","sommes","êtes","sont"], pp:"été", fut:"ser", imp:"ét"},
  {v:"avoir", en:"to have", g:0, p:["ai","as","a","avons","avez","ont"], pp:"eu", fut:"aur"},
  {v:"aller", en:"to go", g:0, p:["vais","vas","va","allons","allez","vont"], pp:"allé", aux:"être", fut:"ir"},
  {v:"faire", en:"to do / make", g:0, p:["fais","fais","fait","faisons","faites","font"], pp:"fait", fut:"fer"},
  {v:"pouvoir", en:"can / to be able to", g:0, p:["peux","peux","peut","pouvons","pouvez","peuvent"], pp:"pu", fut:"pourr"},
  {v:"vouloir", en:"to want", g:0, p:["veux","veux","veut","voulons","voulez","veulent"], pp:"voulu", fut:"voudr"},
  {v:"devoir", en:"must / to have to", g:0, p:["dois","dois","doit","devons","devez","doivent"], pp:"dû", fut:"devr"},
  {v:"savoir", en:"to know (a fact)", g:0, p:["sais","sais","sait","savons","savez","savent"], pp:"su", fut:"saur"},
  {v:"dire", en:"to say / tell", g:0, p:["dis","dis","dit","disons","dites","disent"], pp:"dit", fut:"dir"},
  {v:"voir", en:"to see", g:0, p:["vois","vois","voit","voyons","voyez","voient"], pp:"vu", fut:"verr"},
  {v:"venir", en:"to come", g:0, p:["viens","viens","vient","venons","venez","viennent"], pp:"venu", aux:"être", fut:"viendr"},
  {v:"revenir", en:"to come back", g:0, p:["reviens","reviens","revient","revenons","revenez","reviennent"], pp:"revenu", aux:"être", fut:"reviendr"},
  {v:"devenir", en:"to become", g:0, p:["deviens","deviens","devient","devenons","devenez","deviennent"], pp:"devenu", aux:"être", fut:"deviendr"},
  {v:"prendre", en:"to take", g:0, p:["prends","prends","prend","prenons","prenez","prennent"], pp:"pris", fut:"prendr"},
  {v:"apprendre", en:"to learn", g:0, p:["apprends","apprends","apprend","apprenons","apprenez","apprennent"], pp:"appris", fut:"apprendr"},
  {v:"comprendre", en:"to understand", g:0, p:["comprends","comprends","comprend","comprenons","comprenez","comprennent"], pp:"compris", fut:"comprendr"},
  {v:"mettre", en:"to put / put on", g:0, p:["mets","mets","met","mettons","mettez","mettent"], pp:"mis", fut:"mettr"},
  {v:"boire", en:"to drink", g:0, p:["bois","bois","boit","buvons","buvez","boivent"], pp:"bu", fut:"boir"},
  {v:"lire", en:"to read", g:0, p:["lis","lis","lit","lisons","lisez","lisent"], pp:"lu", fut:"lir"},
  {v:"écrire", en:"to write", g:0, p:["écris","écris","écrit","écrivons","écrivez","écrivent"], pp:"écrit", fut:"écrir"},
  {v:"vivre", en:"to live", g:0, p:["vis","vis","vit","vivons","vivez","vivent"], pp:"vécu", fut:"vivr"},
  {v:"croire", en:"to believe / think", g:0, p:["crois","crois","croit","croyons","croyez","croient"], pp:"cru", fut:"croir"},
  {v:"connaître", en:"to know (a person / place)", g:0, p:["connais","connais","connaît","connaissons","connaissez","connaissent"], pp:"connu", fut:"connaîtr"},
  {v:"partir", en:"to leave", g:0, p:["pars","pars","part","partons","partez","partent"], pp:"parti", aux:"être", fut:"partir"},
  {v:"sortir", en:"to go out", g:0, p:["sors","sors","sort","sortons","sortez","sortent"], pp:"sorti", aux:"être", fut:"sortir"},
  {v:"dormir", en:"to sleep", g:0, p:["dors","dors","dort","dormons","dormez","dorment"], pp:"dormi", fut:"dormir"},
  {v:"courir", en:"to run", g:0, p:["cours","cours","court","courons","courez","courent"], pp:"couru", fut:"courr"},
  {v:"ouvrir", en:"to open", g:0, p:["ouvre","ouvres","ouvre","ouvrons","ouvrez","ouvrent"], pp:"ouvert", fut:"ouvrir"},
  {v:"offrir", en:"to give (a gift) / offer", g:0, p:["offre","offres","offre","offrons","offrez","offrent"], pp:"offert", fut:"offrir"},
  {v:"recevoir", en:"to receive", g:0, p:["reçois","reçois","reçoit","recevons","recevez","reçoivent"], pp:"reçu", fut:"recevr"},
  {v:"conduire", en:"to drive", g:0, p:["conduis","conduis","conduit","conduisons","conduisez","conduisent"], pp:"conduit", fut:"conduir"},
  {v:"naître", en:"to be born", g:0, p:["nais","nais","naît","naissons","naissez","naissent"], pp:"né", aux:"être", fut:"naîtr"},
  {v:"mourir", en:"to die", g:0, p:["meurs","meurs","meurt","mourons","mourez","meurent"], pp:"mort", aux:"être", fut:"mourr"},
  {v:"envoyer", en:"to send", g:0, p:["envoie","envoies","envoie","envoyons","envoyez","envoient"], pp:"envoyé", fut:"enverr"},
  {v:"plaire", en:"to please", g:0, p:["plais","plais","plaît","plaisons","plaisez","plaisent"], pp:"plu", fut:"plair"},
  {v:"sentir", en:"to feel / smell", g:0, p:["sens","sens","sent","sentons","sentez","sentent"], pp:"senti", fut:"sentir"},

  // --- -er verbs with spelling changes
  {v:"manger", en:"to eat", g:1, note:"Keeps the e before a and o (mangeons, mangeais) so the g stays soft."},
  {v:"voyager", en:"to travel", g:1},
  {v:"nager", en:"to swim", g:1},
  {v:"changer", en:"to change", g:1},
  {v:"déménager", en:"to move house", g:1},
  {v:"commencer", en:"to start", g:1, note:"Takes ç before a and o (commençons, commençais) so the c stays soft."},
  {v:"acheter", en:"to buy", g:1, p:["achète","achètes","achète","achetons","achetez","achètent"], fut:"achèter", note:"Takes è when the ending is silent: j'achète but nous achetons."},
  {v:"se lever", en:"to get up", g:1, p:["lève","lèves","lève","levons","levez","lèvent"], fut:"lèver"},
  {v:"se promener", en:"to go for a walk", g:1, p:["promène","promènes","promène","promenons","promenez","promènent"], fut:"promèner"},
  {v:"préférer", en:"to prefer", g:1, p:["préfère","préfères","préfère","préférons","préférez","préfèrent"], note:"é becomes è when the ending is silent: je préfère but nous préférons."},
  {v:"répéter", en:"to repeat", g:1, p:["répète","répètes","répète","répétons","répétez","répètent"]},
  {v:"espérer", en:"to hope", g:1, p:["espère","espères","espère","espérons","espérez","espèrent"]},
  {v:"appeler", en:"to call", g:1, p:["appelle","appelles","appelle","appelons","appelez","appellent"], fut:"appeller", note:"Doubles the l when the ending is silent: j'appelle but nous appelons."},
  {v:"s'appeler", en:"to be called", g:1, p:["appelle","appelles","appelle","appelons","appelez","appellent"], fut:"appeller"},
  {v:"rappeler", en:"to call back", g:1, p:["rappelle","rappelles","rappelle","rappelons","rappelez","rappellent"], fut:"rappeller"},
  {v:"payer", en:"to pay", g:1, p:["paie","paies","paie","payons","payez","paient"], fut:"paier", note:"y becomes i before a silent e (je paie). « Je paye » is also correct."},
  {v:"essayer", en:"to try / try on", g:1, p:["essaie","essaies","essaie","essayons","essayez","essaient"], fut:"essaier"},
  {v:"s'ennuyer", en:"to be bored", g:1, p:["ennuie","ennuies","ennuie","ennuyons","ennuyez","ennuient"], fut:"ennuier"},

  // --- regular -er
  ...("parler:to speak|aimer:to like / love|adorer:to love|détester:to hate|habiter:to live|travailler:to work|chercher:to look for|trouver:to find|" +
     "donner:to give|demander:to ask|penser:to think|regarder:to watch / look at|écouter:to listen to|jouer:to play|chanter:to sing|danser:to dance|" +
     "visiter:to visit (a place)|réserver:to book|inviter:to invite|téléphoner:to phone|étudier:to study|expliquer:to explain|oublier:to forget|" +
     "aider:to help|fermer:to close|porter:to wear / carry|tourner:to turn|traverser:to cross|continuer:to continue|gagner:to win / earn|" +
     "déjeuner:to have lunch|dîner:to have dinner|cuisiner:to cook|louer:to rent|organiser:to organise|fêter:to celebrate|rencontrer:to meet|" +
     "marcher:to walk|passer:to pass / spend (time)|coûter:to cost|garer:to park|chercher:to look for|laisser:to leave (something)|" +
     "commander:to order|préparer:to prepare|réviser:to revise|recycler:to recycle|télécharger:to download|envoyer:to send"
    ).split("|").map(s => { const [v, en] = s.split(":"); return {v, en, g:1}; }),
  {v:"arriver", en:"to arrive", g:1, aux:"être"},
  {v:"rester", en:"to stay", g:1, aux:"être"},
  {v:"rentrer", en:"to come home", g:1, aux:"être"},
  {v:"entrer", en:"to enter / go in", g:1, aux:"être"},
  {v:"tomber", en:"to fall", g:1, aux:"être"},
  {v:"monter", en:"to go up / get on", g:1, aux:"être"},
  {v:"retourner", en:"to go back", g:1, aux:"être"},
  // reflexive -er (passé composé with être)
  ...("se réveiller:to wake up|se laver:to wash|se doucher:to shower|s'habiller:to get dressed|se coucher:to go to bed|se reposer:to rest|" +
     "se dépêcher:to hurry|s'amuser:to have fun|se marier:to get married|s'intéresser:to be interested|se baigner:to swim / bathe|" +
     "se brosser:to brush|se blesser:to get hurt|se casser:to break (a limb)|s'occuper:to take care of|se trouver:to be located"
    ).split("|").map(s => { const [v, en] = s.split(":"); return {v, en, g:1}; }),

  // --- regular -ir (like finir)
  ...("finir:to finish|choisir:to choose|réussir:to succeed / pass|grossir:to put on weight|maigrir:to lose weight|guérir:to get better / cure|remplir:to fill (in)"
    ).split("|").map(s => { const [v, en] = s.split(":"); return {v, en, g:2}; }),
  // --- regular -re (like attendre)
  ...("attendre:to wait (for)|répondre:to answer|perdre:to lose|vendre:to sell|entendre:to hear|rendre:to give back"
    ).split("|").map(s => { const [v, en] = s.split(":"); return {v, en, g:3}; }),
  {v:"descendre", en:"to go down / get off", g:3, aux:"être"},
  {v:"se perdre", en:"to get lost", g:3},
  {v:"s'endormir", en:"to fall asleep", g:0, p:["endors","endors","endort","endormons","endormez","endorment"], pp:"endormi", fut:"endormir"},
  {v:"se sentir", en:"to feel", g:0, p:["sens","sens","sent","sentons","sentez","sentent"], pp:"senti", fut:"sentir"},
  {v:"s'inscrire", en:"to sign up", g:0, p:["inscris","inscris","inscrit","inscrivons","inscrivez","inscrivent"], pp:"inscrit", fut:"inscrir"},
  {v:"s'asseoir", en:"to sit down", g:0, p:["assieds","assieds","assied","asseyons","asseyez","asseyent"], pp:"assis", fut:"assiér"}
].filter((x, i, a) => a.findIndex(y => y.v === x.v) === i);

const VERB_NOTES = {
  "être": "The only verb with an irregular imparfait stem: ét- (j'étais).",
  "aller": "Futur: j'irai. Passé composé with être: je suis allé(e).",
  "avoir": "Futur: j'aurai. Passé composé: j'ai eu."
};

const SUBJ = ["je","tu","il / elle / on","nous","vous","ils / elles"];
const REFL = ["me","te","se","nous","vous","se"];
const AVOIR = ["ai","as","a","avons","avez","ont"], ETRE = ["suis","es","est","sommes","êtes","sont"];
const vowel = s => /^[aeiouyéèêëàâîïôûœh]/i.test(s);

function verbInfo(v) {
  const refl = /^(se |s')/.test(v.v), base = v.v.replace(/^(se |s')/, "");
  const r = base.slice(0, -2);
  let p = v.p, pp = v.pp, fut = v.fut;
  if (!p) {
    if (v.g === 1) {
      p = [r+"e", r+"es", r+"e", r+"ons", r+"ez", r+"ent"];
      if (r.endsWith("g")) p[3] = r+"eons";
      if (r.endsWith("c")) p[3] = r.slice(0,-1)+"çons";
    } else if (v.g === 2) p = [r+"is", r+"is", r+"it", r+"issons", r+"issez", r+"issent"];
    else p = [r+"s", r+"s", r, r+"ons", r+"ez", r+"ent"];
  }
  if (!pp) pp = v.g === 1 ? r+"é" : v.g === 2 ? r+"i" : r+"u";
  if (!fut) fut = v.g === 3 ? base.slice(0, -1) : base;
  const aux = refl ? "être" : (v.aux || "avoir");
  const impStem = v.imp || p[3].replace(/ons$/, "");
  return { refl, base, p, pp, fut, aux, impStem };
}

// Returns rows of [pronoun text, stem, ending] per tense so the UI can highlight endings.
function conjugateVerb(v) {
  const I = verbInfo(v);
  const subj = (k, next) => k === 0 && vowel(next) ? "j'" : SUBJ[k].split(" /")[0] + " ";
  const withRefl = (k, next) => {
    if (!I.refl) return subj(k, next);
    const rp = k < 3 || k === 5 ? (vowel(next) ? REFL[k][0] + "'" : REFL[k] + " ") : REFL[k] + " ";
    return SUBJ[k].split(" /")[0] + " " + rp;
  };
  const split = (form, endLen) => [form.slice(0, form.length - endLen), form.slice(form.length - endLen)];

  const present = I.p.map((f, k) => {
    const endLen = v.g === 1 ? [1,2,1,3,2,3][k] : v.g === 2 ? [2,2,2,6,5,6][k] : v.g === 3 ? [1,1,0,3,2,3][k] : 0;
    const [a, b] = split(f, endLen);
    return [withRefl(k, f), a, b];
  });
  const IMP = ["ais","ais","ait","ions","iez","aient"];
  const imparfait = IMP.map((e, k) => {
    let s = I.impStem;
    if (e[0] === "i" && s.endsWith("ge")) s = s.slice(0, -1);
    if (e[0] === "i" && s.endsWith("ç")) s = s.slice(0, -1) + "c";
    return [withRefl(k, s), s, e];
  });
  const FUT = ["ai","as","a","ons","ez","ont"];
  const futur = FUT.map((e, k) => [withRefl(k, I.fut), I.fut, e]);
  const passe = [0,1,2,3,4,5].map(k => {
    const auxForm = (I.aux === "être" ? ETRE : AVOIR)[k];
    const agree = I.aux === "être" ? (k < 3 ? "(e)" : "(e)s") : "";
    return [withRefl(k, auxForm) + auxForm + " ", I.pp, agree];
  });
  return { present, imparfait, passe, futur, info: I };
}
