// [french, english, category, example FR, example EN, audio keys (optional, defaults to the French word)]
const WORDS = [
["être","to be","Verbs","Je suis content aujourd'hui.","I am happy today."],
["avoir","to have","Verbs","J'ai deux frères.","I have two brothers."],
["faire","to do / to make","Verbs","Qu'est-ce que tu fais ce soir ?","What are you doing tonight?"],
["aller","to go","Verbs","Nous allons au cinéma.","We are going to the cinema."],
["pouvoir","to be able to / can","Verbs","Tu peux m'aider ?","Can you help me?"],
["vouloir","to want","Verbs","Je veux un café, s'il vous plaît.","I want a coffee, please."],
["devoir","to have to / must","Verbs","Je dois partir maintenant.","I must leave now."],
["dire","to say / to tell","Verbs","Il dit la vérité.","He is telling the truth."],
["voir","to see","Verbs","On se voit demain ?","See each other tomorrow?"],
["savoir","to know (a fact)","Verbs","Je ne sais pas.","I don't know."],
["prendre","to take","Verbs","Je prends le bus tous les jours.","I take the bus every day."],
["venir","to come","Verbs","Tu viens avec nous ?","Are you coming with us?"],
["mettre","to put / to put on","Verbs","Mets ton manteau, il fait froid.","Put on your coat, it's cold."],
["parler","to speak","Verbs","Elle parle trois langues.","She speaks three languages."],
["aimer","to like / to love","Verbs","J'aime beaucoup la musique.","I really like music."],
["manger","to eat","Verbs","On mange à midi.","We eat at noon."],
["boire","to drink","Verbs","Il boit de l'eau.","He drinks water."],
["acheter","to buy","Verbs","J'ai acheté du pain.","I bought some bread."],
["habiter","to live (somewhere)","Verbs","J'habite à Paris.","I live in Paris."],
["travailler","to work","Verbs","Mon père travaille dans un bureau.","My dad works in an office."],
["partir","to leave","Verbs","Le train part à huit heures.","The train leaves at eight."],
["sortir","to go out","Verbs","On sort ce week-end ?","Shall we go out this weekend?"],
["attendre","to wait (for)","Verbs","J'attends mon ami.","I'm waiting for my friend."],
["comprendre","to understand","Verbs","Je ne comprends pas la question.","I don't understand the question."],
["connaître","to know (person/place)","Verbs","Tu connais Marie ?","Do you know Marie?"],
["penser","to think","Verbs","Je pense que c'est vrai.","I think it's true."],
["trouver","to find","Verbs","Je ne trouve pas mes clés.","I can't find my keys."],
["donner","to give","Verbs","Donne-moi le livre.","Give me the book."],
["demander","to ask","Verbs","Je vais demander au professeur.","I'm going to ask the teacher."],
["arriver","to arrive / to happen","Verbs","Qu'est-ce qui est arrivé ?","What happened?"],
["le temps","time / weather","Nouns","Il fait beau temps.","The weather is nice.",["temps"]],
["le jour","day","Nouns","Il y a sept jours dans une semaine.","There are seven days in a week.",["jour"]],
["l'an / l'année","year","Nouns","Bonne année !","Happy New Year!",["an","année"]],
["la semaine","week","Nouns","La semaine prochaine, je suis en vacances.","Next week I'm on holiday.",["semaine"]],
["l'heure (f)","hour / time (o'clock)","Nouns","Quelle heure est-il ?","What time is it?",["heure"]],
["la maison","house / home","Nouns","Je rentre à la maison.","I'm going home.",["maison"]],
["la famille","family","Nouns","Ma famille est grande.","My family is big.",["famille"]],
["l'ami / l'amie","friend","Nouns","C'est mon meilleur ami.","He's my best friend.",["ami","amie"]],
["l'enfant","child","Nouns","Ils ont trois enfants.","They have three children.",["enfant"]],
["la ville","town / city","Nouns","Lyon est une belle ville.","Lyon is a beautiful city.",["ville"]],
["le travail","work / job","Nouns","Je vais au travail à pied.","I walk to work.",["travail"]],
["l'école (f)","school","Nouns","L'école commence à huit heures.","School starts at eight.",["école"]],
["l'argent (m)","money","Nouns","Je n'ai pas d'argent.","I don't have any money.",["argent"]],
["la voiture","car","Nouns","Sa voiture est rouge.","His car is red.",["voiture"]],
["le pays","country","Nouns","La France est un grand pays.","France is a big country.",["pays"]],
["la chose","thing","Nouns","J'ai beaucoup de choses à faire.","I have lots of things to do.",["chose"]],
["la vie","life","Nouns","C'est la vie !","That's life!",["vie"]],
["le monde","world / people","Nouns","Il y a du monde ici.","There are lots of people here.",["monde"]],
["la rue","street","Nouns","J'habite dans cette rue.","I live on this street.",["rue"]],
["le repas","meal","Nouns","Le repas est prêt.","The meal is ready.",["repas"]],
["l'eau (f)","water","Nouns","Une bouteille d'eau, s'il vous plaît.","A bottle of water, please.",["eau"]],
["le pain","bread","Nouns","J'achète du pain à la boulangerie.","I buy bread at the bakery.",["pain"]],
["la chambre","bedroom / room","Nouns","Ma chambre est petite.","My bedroom is small.",["chambre"]],
["le magasin","shop","Nouns","Le magasin ferme à 19 heures.","The shop closes at 7 pm.",["magasin"]],
["les vacances (f pl)","holidays","Nouns","On part en vacances en août.","We go on holiday in August.",["vacances"]],
["grand / grande","big / tall","Adjectives","Mon frère est très grand.","My brother is very tall.",["grand","grande"]],
["petit / petite","small / little","Adjectives","C'est un petit village.","It's a small village.",["petit","petite"]],
["bon / bonne","good","Adjectives","Ce gâteau est très bon.","This cake is very good.",["bon","bonne"]],
["mauvais / mauvaise","bad","Adjectives","Il fait mauvais aujourd'hui.","The weather is bad today.",["mauvais","mauvaise"]],
["nouveau / nouvelle","new","Adjectives","J'ai un nouveau téléphone.","I have a new phone.",["nouveau","nouvelle"]],
["vieux / vieille","old","Adjectives","C'est une vieille maison.","It's an old house.",["vieux","vieille"]],
["beau / belle","beautiful / handsome","Adjectives","Quelle belle journée !","What a beautiful day!",["beau","belle"]],
["jeune","young","Adjectives","Elle est jeune.","She is young."],
["facile","easy","Adjectives","Cet exercice est facile.","This exercise is easy."],
["difficile","difficult","Adjectives","Le français, c'est difficile !","French is difficult!"],
["content / contente","happy / pleased","Adjectives","Je suis content de te voir.","I'm happy to see you.",["content","contente"]],
["fatigué / fatiguée","tired","Adjectives","Je suis très fatigué ce soir.","I'm very tired tonight.",["fatigué"]],
["cher / chère","expensive / dear","Adjectives","Ce restaurant est trop cher.","This restaurant is too expensive.",["cher"]],
["prochain / prochaine","next","Adjectives","À la semaine prochaine !","See you next week!",["prochain","prochaine"]],
["dernier / dernière","last","Adjectives","Le week-end dernier, j'ai joué au foot.","Last weekend I played football.",["dernier","dernière"]],
["aujourd'hui","today","Time & place","Aujourd'hui, il fait chaud.","Today it's hot.",["aujourd’hui"]],
["demain","tomorrow","Time & place","À demain !","See you tomorrow!"],
["hier","yesterday","Time & place","Hier, je suis allé au parc.","Yesterday I went to the park."],
["maintenant","now","Time & place","Je suis occupé maintenant.","I'm busy now."],
["toujours","always / still","Time & place","Il est toujours en retard.","He is always late."],
["souvent","often","Time & place","Je vais souvent à la piscine.","I often go to the pool."],
["jamais","never","Time & place","Je ne mange jamais de viande.","I never eat meat."],
["déjà","already","Time & place","J'ai déjà fini.","I've already finished."],
["encore","again / still / more","Time & place","Tu es encore là ?","Are you still here?"],
["après","after","Time & place","On se voit après le cours.","See you after class."],
["avant","before","Time & place","Lave-toi les mains avant de manger.","Wash your hands before eating."],
["ici","here","Time & place","Viens ici !","Come here!"],
["là-bas","over there","Time & place","La gare est là-bas.","The station is over there."],
["très","very","Little words","C'est très intéressant.","It's very interesting."],
["beaucoup","a lot / much","Little words","Merci beaucoup !","Thanks a lot!"],
["trop","too / too much","Little words","C'est trop loin.","It's too far."],
["peu","little / not much","Little words","Je parle un peu français.","I speak a little French."],
["assez","enough / quite","Little words","Tu as assez mangé ?","Have you eaten enough?"],
["aussi","also / too","Little words","Moi aussi !","Me too!"],
["bien","well / good","Little words","Ça va bien, merci.","I'm doing well, thanks."],
["mais","but","Little words","Je voudrais venir, mais je suis malade.","I'd like to come, but I'm ill."],
["parce que","because","Little words","Je reste ici parce qu'il pleut.","I'm staying here because it's raining."],
["donc","so / therefore","Little words","Il est tard, donc je pars.","It's late, so I'm leaving."],
["quand","when","Little words","Quand est-ce que tu arrives ?","When are you arriving?"],
["où","where","Little words","Où sont les toilettes ?","Where are the toilets?"],
["pourquoi","why","Little words","Pourquoi tu ris ?","Why are you laughing?"],
["comment","how","Little words","Comment tu t'appelles ?","What's your name? (How are you called?)"],
["combien","how much / how many","Little words","Ça coûte combien ?","How much does it cost?"],
["avec","with","Little words","Je vais au cinéma avec Paul.","I'm going to the cinema with Paul."],
["chez","at (someone's place)","Little words","On dîne chez mes parents.","We're having dinner at my parents'."]
];

// Présent: six forms (je, tu, il/elle/on, nous, vous, ils/elles). Imparfait is built from the "nous" stem.
// group: 1 = regular -er, 3 = irregular / other.
const CONJ = {
  "être":      {g:3, p:["suis","es","est","sommes","êtes","sont"], stem:"ét"},
  "avoir":     {g:3, p:["ai","as","a","avons","avez","ont"]},
  "faire":     {g:3, p:["fais","fais","fait","faisons","faites","font"]},
  "aller":     {g:3, p:["vais","vas","va","allons","allez","vont"]},
  "pouvoir":   {g:3, p:["peux","peux","peut","pouvons","pouvez","peuvent"]},
  "vouloir":   {g:3, p:["veux","veux","veut","voulons","voulez","veulent"]},
  "devoir":    {g:3, p:["dois","dois","doit","devons","devez","doivent"]},
  "dire":      {g:3, p:["dis","dis","dit","disons","dites","disent"]},
  "voir":      {g:3, p:["vois","vois","voit","voyons","voyez","voient"]},
  "savoir":    {g:3, p:["sais","sais","sait","savons","savez","savent"]},
  "prendre":   {g:3, p:["prends","prends","prend","prenons","prenez","prennent"]},
  "venir":     {g:3, p:["viens","viens","vient","venons","venez","viennent"]},
  "mettre":    {g:3, p:["mets","mets","met","mettons","mettez","mettent"]},
  "parler":    {g:1},
  "aimer":     {g:1},
  "manger":    {g:1, p:["mange","manges","mange","mangeons","mangez","mangent"], note:"Keeps the -e- before a and o (mangeons, mangeais) so the g stays soft."},
  "boire":     {g:3, p:["bois","bois","boit","buvons","buvez","boivent"]},
  "acheter":   {g:1, p:["achète","achètes","achète","achetons","achetez","achètent"], note:"Gets an accent (è) when the ending is silent: j'achète, but nous achetons."},
  "habiter":   {g:1, note:"The h is silent, so je becomes j' (j'habite)."},
  "travailler":{g:1},
  "partir":    {g:3, p:["pars","pars","part","partons","partez","partent"]},
  "sortir":    {g:3, p:["sors","sors","sort","sortons","sortez","sortent"]},
  "attendre":  {g:3, p:["attends","attends","attend","attendons","attendez","attendent"]},
  "comprendre":{g:3, p:["comprends","comprends","comprend","comprenons","comprenez","comprennent"]},
  "connaître": {g:3, p:["connais","connais","connaît","connaissons","connaissez","connaissent"]},
  "penser":    {g:1},
  "trouver":   {g:1},
  "donner":    {g:1},
  "demander":  {g:1},
  "arriver":   {g:1}
};
CONJ["être"].note = "The only verb with an irregular imparfait stem: ét-.";

const PRONOUNS = ["je","tu","il / elle / on","nous","vous","ils / elles"];
const IMP_END = ["ais","ais","ait","ions","iez","aient"];

function conjugate(verb){
  const c = CONJ[verb];
  let present = c.p;
  if (!present) { const r = verb.slice(0,-2); present = ["e","es","e","ons","ez","ent"].map(e => r+e); }
  // Imparfait: nous-form minus -ons, + endings. manger keeps the e only before a.
  let stem = c.stem || present[3].replace(/ons$/,"");
  const imp = IMP_END.map(e => {
    let s = stem;
    if (stem.endsWith("ge") && e[0] === "i") s = stem.slice(0,-1);
    return {stem:s, end:e};
  });
  return {present, imp};
}
function withPronoun(i, form){
  return i === 0 && /^[aeiouéèêh]/i.test(form) ? "j'" : (PRONOUNS[i].split(" /")[0] + " ");
}
