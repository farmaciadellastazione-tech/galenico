// pricing.js — costanti e helper puri per pricing/inventario galenico.
//
// Caricato da:
//   • index.html via <script src="pricing.js"> (precede il main script inline).
//   • vitest tests via import (Node, default environment).
//
// I simboli sono esposti su globalThis per i consumatori browser e via
// module.exports per Node. Il main script di index.html li usa come globals
// dopo che pricing.js è stato caricato.

// ── Costanti regolatorie e dati pinned ───────────────────────────────────

// Allegato A — D.M. 22/09/2017 (mod. D.M. 13/12/2017, in GU 30/01/2018, c.d.
// "aggiornamento 2018"). Sostanze a prezzo legale obbligatorio in €/g (Art. 4 e 10).
// Quando una sostanza è in questa mappa, il prezzo è bloccato e non è modificabile
// in UI. Aggiornare SOLO se cambia il decreto ministeriale.
const ALLEGATO_A = Object.freeze({
  'acido acetilsalicilico': 0.122,
  'acido ascorbico': 0.059,
  'acido borico': 0.110,
  'acido citrico': 0.038,
  'acido cloridrico': 0.012,
  'acido fosforico': 0.050,
  'acido glutammico': 0.062,
  'acido lattico': 0.077,
  'acido salicilico': 0.049,
  'acido tannico': 0.195,
  'tannino': 0.195,
  'acido tartarico': 0.071,
  'acido tricloroacetico': 0.205,
  'acqua depurata': 0.002,
  'acqua purificata': 0.002,
  'perossido di idrogeno': 0.007,
  'acqua ossigenata': 0.007,
  'agar agar': 0.136,
  'allume': 0.038,
  'aloe polvere': 0.101,
  'altea radice polvere': 0.034,
  'altea estratto fluido': 0.049,
  'ammoniaca': 0.012,
  'ammonio carbonato': 0.030,
  'ammonio cloruro': 0.037,
  'ammonio solfoittiolato': 0.157,
  'anice': 0.098,
  'anice stellato': 0.077,
  'argento nitrato': 2.505,
  'argento proteinato': 1.871,
  'argilla sterilizzata': 0.014,
  'atropina solfato': 31.223,
  'benzalconio cloruro': 1.738,
  'bergamotto essenza': 0.624,
  'bismuto carbonato basico': 0.144,
  'bismuto nitrato basico': 0.209,
  'bismuto gallato basico': 0.273,
  'bismuto salicilato basico': 0.105,
  'boldo polvere': 0.093,
  'boldo estratto fluido': 0.043,
  'borace': 0.041,
  'burro di cacao': 0.045,
  'caffeina': 0.141,
  'calcio carbonato': 0.036,
  'calcio cloruro': 0.060,
  'calcio fosfato bibasico': 0.037,
  'calcio glicerofosfato': 0.237,
  'calcio idrossido': 0.083,
  'calcio lattato': 0.060,
  'camomilla comune': 0.106,
  'canfora': 0.074,
  'cannabis infiorescenze': 9.00,
  'carbone attivo': 0.265,
  'carbone vegetale': 0.034,
  'cascara estratto secco': 0.117,
  'cedro essenza': 0.459,
  'cellulosa acetoftalato': 1.052,
  'cera bianca': 0.045,
  'china rossa corteccia': 0.051,
  'china estratto fluido': 0.060,
  'chinidina solfato': 1.339,
  'chinina cloridrato': 2.972,
  'chinina solfato': 1.596,
  'cloroformio': 0.034,
  'codeina fosfato': 19.470,
  'collodio': 0.040,
  'diazepam': 4.867,
  'difenidramina': 1.361,
  'efedrina cloridrato': 0.888,
  'eritromicina': 1.256,
  'etere etilico': 0.022,
  'eucaliptolo': 0.252,
  'eucalipto essenza': 0.162,
  'fenile salicilato': 0.415,
  'fenolo': 0.160,
  'fenolo liquido': 0.060,
  'finocchio essenza': 0.297,
  'frangula estratto secco': 0.095,
  'garofano essenza': 0.317,
  'gelatina': 0.073,
  'genziana estratto fluido': 0.061,
  'genziana tintura': 0.060,
  'ginepro essenza': 0.634,
  'glicerina': 0.020,
  'glicole propilenico': 0.039,
  'glucosio': 0.022,
  'gomma adragante': 0.239,
  'gomma arabica': 0.060,
  'guaiacolo': 0.221,
  'iodio': 0.789,
  'iodoformio': 0.498,
  'ipecacuana estratto fluido': 1.478,
  'lanolina anidra': 0.041,
  'lidocaina': 0.490,
  'lidocaina cloridrato': 0.298,
  'limone essenza': 0.183,
  'lino semi': 0.019,
  'lino farina': 0.021,
  'liquirizia': 0.055,
  'litio carbonato': 0.452,
  'magnesio carbonato': 0.033,
  'magnesio ossido': 0.060,
  'magnesio solfato': 0.024,
  'manna': 0.086,
  'menta foglie': 0.037,
  'menta essenza': 0.313,
  'mentolo naturale': 0.128,
  'metile idrossibenzoato': 0.205,
  'metilparabene': 0.205,
  'metile salicilato': 0.091,
  'metionina': 0.125,
  'morfina cloridrato': 8.714,
  'nadololo': 6.048,
  'naltrexone': 22.320,
  'niaouli essenza': 0.160,
  'gomenolo': 0.160,
  'nicotinammide': 0.075,
  'olio di arachidi': 0.025,
  'olio di mandorle dolci': 0.026,
  'olio di oliva': 0.028,
  'olio di ricino': 0.016,
  'olio di sesamo': 0.028,
  'oxazepam': 11.000,
  'pancreatina': 0.124,
  'papaina': 0.147,
  'papaverina cloridrato': 1.874,
  'paracetamolo': 0.135,
  'paraffina solida': 0.024,
  'paraffina liquida': 0.020,
  'pilocarpina cloridrato': 18.095,
  'pino essenza': 0.317,
  'pino gemme': 0.050,
  'piperazina adipato': 0.165,
  'poligala radice': 0.062,
  'poligala estratto fluido': 0.061,
  'polivinilpirrolidone': 0.119,
  'pvp': 0.119,
  'potassio bromuro': 0.100,
  'potassio cloruro': 0.044,
  'potassio ioduro': 0.424,
  'potassio permanganato': 0.252,
  'potassio sulfoguaiacolato': 0.144,
  'procaina cloridrato': 0.580,
  'rabarbaro polvere': 0.066,
  'rabarbaro estratto fluido': 0.072,
  'ratania': 0.039,
  'resorcina': 0.216,
  'saccarina': 0.095,
  'saccarosio': 0.022,
  'zucchero': 0.022,
  'senna foglia': 0.029,
  'senna frutti': 0.044,
  'sodio benzoato': 0.053,
  'sodio bicarbonato': 0.042,
  'sodio bromuro': 0.169,
  'sodio citrato': 0.052,
  'sodio cloruro': 0.038,
  'sodio fosfato bibasico': 0.022,
  'sodio glicerofosfato': 0.089,
  'sodio ioduro': 0.369,
  'sodio salicilato': 0.055,
  'sodio solfato anidro': 0.025,
  'sodio solfato decaidrato': 0.010,
  'sodio stearato': 0.038,
  'sodio tiosolfato': 0.041,
  'solfadiazina': 0.938,
  'solfanilammide': 0.354,
  'solfo precipitato': 0.034,
  'solfo sublimato': 0.031,
  'fiori di zolfo': 0.031,
  'sorbitolo': 0.026,
  'sorbitolo soluzione 70%': 0.021,
  'spermaceti': 0.046,
  'stearina': 0.033,
  'talco': 0.019,
  'teobromina': 0.310,
  'teofillina': 0.231,
  'terpina idrata': 1.812,
  'timolo': 0.254,
  'valeriana polvere': 0.066,
  'valeriana tintura': 0.065,
  'vaselina bianca': 0.023,
  'vaselina filante': 0.023,
  'zinco ossido': 0.029,
  'zinco solfato': 0.058
});

// Densità (g/ml) per liquidi comuni — usate per conversioni ml↔g e per rilevare
// "questa sostanza è un liquido". Match per substring sul nome.
const DENSITA = Object.freeze({
  'etanolo': 0.807, 'alcol etilico': 0.807, 'etanolo 96': 0.807, 'alcool': 0.807,
  'glicole propilenico': 1.036, 'glicerina': 1.261, 'glicerolo': 1.261,
  'olio di ricino': 0.956, 'olio di oliva': 0.911, 'olio di mandorle': 0.916,
  'acqua': 1.000, 'acqua purificata': 1.000, 'acqua depurata': 1.000,
  'paraffina liquida': 0.875,
});

// Inventario baseline pinned: sempre disponibile in fondo a invLoadMerged() anche
// quando localStorage è vuoto (es. prima apertura su un nuovo dispositivo).
const INV_HARDCODED = [
  { nome:'Acido salicilico',        h:'H302,H318,H335', unit:'g',  prezzo:0.0512,  lotto:'R2217272', lottoInt:'14/26', scad:'2027-12', dataAp:'2026-01-30', sds:'http://www.farmalabor.it/certificati/R2217272.pdf' },
  { nome:'Minoxidil',               h:'H302,H318,H335', unit:'g',  prezzo:0.3904,  lotto:'F2300213', lottoInt:'5/24',    scad:'2028-10', dataAp:'2024-03-01', sds:'http://www.farmalabor.it/certificati/F2300213.pdf' },
  { nome:'Glicole propilenico',     h:'',               unit:'g',  prezzo:0.0159,  lotto:'R2510991', lottoInt:'10/2025', scad:'2027-04', dataAp:'2025-12-10', sds:'http://www.farmalabor.it/certificati/R2510991.pdf' },
  { nome:'Acqua purificata',        h:'',               unit:'ml', prezzo:0.002,   lotto:'R2426776', lottoInt:'10/24',   scad:'2026-10', dataAp:'2026-05-11', sds:'http://www.farmalabor.it/certificati/R2426776.pdf' },
  { nome:'Etanolo 96°',             h:'H225,H319',      unit:'ml', prezzo:0.01474, lotto:'F2509100', lottoInt:'1/26',  scad:'2028-09', dataAp:'2026-02-10', sds:'http://www.farmalabor.it/certificati/F2509100.pdf' },
  { nome:'Vaselina filante bianca', h:'',               unit:'g',  prezzo:0.023,   lotto:'R2508520', lottoInt:'2/26',  scad:'2029-08', dataAp:'2026-01-15', sds:'http://www.farmalabor.it/certificati/R2508520.pdf' },
  { nome:'Lanolina anidra',         h:'',               unit:'g',  prezzo:0.041,   lotto:'F2502130', lottoInt:'3/26',  scad:'2028-02', dataAp:'2026-03-04', sds:'http://www.farmalabor.it/certificati/F2502130.pdf' },
  { nome:'Clobazam',                h:'H302,H361',      unit:'g',  prezzo:0,       lotto:'F2511008', lottoInt:'4/26',  scad:'2028-11', dataAp:'2026-01-22', sds:'http://www.farmalabor.it/certificati/F2511008.pdf' },
  { nome:'Flacone ambrato 125ml',   h:'',               unit:'pz', prezzo:1.55,    lotto:'VTR250012',lottoInt:'5/26',  scad:'2035-12', dataAp:'2026-01-08', sds:'' },
  { nome:'Capsule gelatina dura taglia 0', h:'', unit:'pz', prezzo:0.045, lotto:'CG0250045',lottoInt:'6/26',  scad:'2029-04', dataAp:'2026-02-18', sds:'' },
  { nome:'Capsule gelatina dura taglia 1', h:'', unit:'pz', prezzo:0.038, lotto:'CG1250033',lottoInt:'7/26',  scad:'2029-04', dataAp:'2026-02-18', sds:'' },
  { nome:'Capsule gelatina dura taglia 2', h:'', unit:'pz', prezzo:0.032, lotto:'CG2250028',lottoInt:'8/26',  scad:'2029-04', dataAp:'2026-02-18', sds:'' },
  { nome:'Capsule HPMC taglia 0',          h:'', unit:'pz', prezzo:0.072, lotto:'CH0250075',lottoInt:'9/26',  scad:'2029-04', dataAp:'2026-02-18', sds:'' },
  { nome:'Amido di riso',           h:'',               unit:'g',  prezzo:0.0042,  lotto:'F2503210', lottoInt:'10/26', scad:'2028-03', dataAp:'2026-03-12', sds:'http://www.farmalabor.it/certificati/F2503210.pdf' },
  { nome:'Lattosio monoidrato',     h:'',               unit:'g',  prezzo:0.0055,  lotto:'F2504870', lottoInt:'11/26', scad:'2028-04', dataAp:'2026-02-25', sds:'http://www.farmalabor.it/certificati/F2504870.pdf' },
  { nome:'Finasteride',            h:'H302,H360,H372,H410', unit:'g',  prezzo:0,       lotto:'F2505012', lottoInt:'12/26', scad:'2028-05', dataAp:'2026-03-01', sds:'http://www.farmalabor.it/certificati/F2505012.pdf' },
  { nome:'Mentolo naturale',         h:'H228,H317,H411', unit:'g',  prezzo:0.128,   lotto:'F2506999', lottoInt:'13/26', scad:'2027-06', dataAp:'2026-04-05', sds:'http://www.farmalabor.it/certificati/F2506999.pdf' },
];

// Sostanze pinned in cima ai risultati di ricerca inventario (anche se assenti).
const INV_OBBLIGATORIE = new Set(['carbone attivo','potassio ioduro','acqua depurata','acqua purificata','alcool etilico','etanolo']);

// Radici (≥5 char) per match substring "è uno stupefacente?" su nome sostanza
// normalizzato. DPR 309/90 Tab. I-V, sostanze realisticamente preparate in
// galenica. Radici brevi/ambigue (es. "thc") evitate: rischio falsi positivi.
const STUPEFACENTI = Object.freeze([
  'morfina', 'codeina', 'metadone', 'ossicodone',
  'fentanyl', 'fentanile', 'petidina', 'tapentadolo',
  'buprenorfina', 'idromorfone',
  'ketamina', 'cannabis', 'tetraidrocannabinolo',
  'dronabinol', 'nabilone',
  'metilfenidato', 'amfetamin', 'anfetamin',
  'fenobarbital',
]);

// Radici per match "è doping?" su nome sostanza normalizzato. Lista WADA /
// DM 11/06/2010 limitata a sostanze realisticamente preparate in galenica
// (bodybuilding, PCT, stimolanti, mascheranti).
const DOPING = Object.freeze([
  // anabolizzanti androgeni
  'testosteron', 'nandrolon', 'stanozol', 'oxandrolon',
  'methandrostenolon', 'oxymetolon', 'trenbolon',
  'methenolon', 'metenolon', 'drostanolon', 'mesterolon',
  // SARMs
  'ostarine', 'ostarina', 'ligandrol',
  // SERM / inibitori aromatasi (PCT)
  'clomifene', 'tamoxifen', 'anastrozol', 'letrozol',
  'exemestan', 'raloxifen',
  // beta-2 agonisti
  'clenbuterol',
  // stimolanti
  'modafinil', 'efedrin',
  // pre-ormoni
  'deidroepiandrosteron', 'prasteron',
  // diuretici mascheranti
  'furosemid', 'idroclorotiazid',
]);

// Operazioni tecnologiche aggiuntive (Art. 7) derivate dal tipo di tariffazione.
// Allegato B base copre già pesatura, miscelazione, dissoluzione, capsulazione.
// Aggiunte: omogeneizzazione (sospensione), emulsionamento (semisolida),
// polverizzazione/setacciatura (polvere/cartine). Liquida e capsule = 0.
const OP_TECNOLOGICHE_AUTO = Object.freeze({
  liquida: 0,
  tintura: 0,
  sospensione: 1,
  semisolida: 1,
  polvere: 1,
  cartine: 1,
  capsule: 0,
});

// ── Helper puri ──────────────────────────────────────────────────────────

// Formatta numero con virgola decimale italiana. fmt(1.234) → "1,23".
function fmt(n, dec) { dec = dec === undefined ? 2 : dec; return n.toFixed(dec).replace('.', ','); }

// Normalizza un nome sostanza per match fuzzy: lowercase, accenti rimossi, trim.
function invNominalizza(s) {
  return (s||'').toLowerCase().replace(/[àáâ]/g,'a').replace(/[èéê]/g,'e').replace(/[ìí]/g,'i').replace(/[òó]/g,'o').replace(/[ùú]/g,'u').trim();
}

// True se il nome corrisponde (substring) a una radice in STUPEFACENTI/DOPING.
function isStupefacente(nome) {
  const n = invNominalizza(nome);
  if (!n) return false;
  return STUPEFACENTI.some(needle => n.includes(needle));
}
function isDoping(nome) {
  const n = invNominalizza(nome);
  if (!n) return false;
  return DOPING.some(needle => n.includes(needle));
}

// Ritorna il numero di op. tecnologiche aggiuntive (Art. 7) per tipoTariff.
// 0 se tipo sconosciuto.
function getOpTecnologicheAuto(tipoTariff) {
  return OP_TECNOLOGICHE_AUTO[tipoTariff] || 0;
}

// Token-based fuzzy match: estrae parole significative (≥3 char), conta token comuni.
// Score = matched / min(len_a, len_b). Robusto a ordine, parole extra, varianti.
function invMatchScore(a, b) {
  const STOP = new Set(['eccipiente','per','di','da','e','il','la','tipo','grado']);
  const tok = s => invNominalizza(s).split(/[\s\-_,.]+/).filter(t => t.length >= 3 && !STOP.has(t));
  const ta = tok(a), tb = tok(b);
  if (!ta.length || !tb.length) return 0;
  const set = new Set(tb);
  const matched = ta.filter(t => set.has(t)).length;
  return matched / Math.min(ta.length, tb.length);
}

// Ritorna true se almeno un codice H giustifica supplemento Art. 8a (€2,50).
// Esclude H4xx (puramente ambientali, niente rischio umano diretto).
function hasHazard(hStr) {
  if (!hStr) return false;
  return hStr.split(',').some(h => {
    h = h.trim();
    return h && !h.startsWith('H4'); // H2xx fisici, H3xx salute
  });
}

// True se il nome indica etanolo. Si accettano SOLO forme sicure — "etanolo"
// a parola intera (non "fenossietanolo"), "etil alcool", veicoli
// "idroalcolici", e "alcool/alcol" da solo o seguito da etilico, denaturato,
// assoluto, puro, grado ("96°", "al 96%", "70") — così ogni altro alcol
// (cetilico, cetearilico, benzilico, propilico...) NON è etanolo, anche se non
// è in nessun elenco. Il vecchio includes('alcol') sbagliava densità, % etanolo,
// procedura ("sciogliere il PA nell'etanolo") e grado alcolico.
function isEtanoloNome(nome) {
  const t = invNominalizza(nome).replace(/[^a-z0-9%°\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/(^|\s)etanolo/.test(t) || /^etil alcoo?l/.test(t) || /idroalcolic/.test(t)) return true;
  const m = t.match(/^alcoo?l(?: (.*))?$/);
  if (!m) return false;
  // Ogni parola dopo "alcool" dev'essere ammessa o un grado ("96", "96°", "70%"):
  // "alcool 2 feniletilico" ha "feniletilico" → non è etanolo.
  const AMMESSE = new Set(['etilico', 'denaturato', 'assoluto', 'puro', 'al', 'gradi', 'v', '°', '%']);
  return (m[1] || '').split(' ').filter(Boolean)
    .every(p => AMMESSE.has(p) || /^\d+(°|%)?$/.test(p));
}

// True se il nome indica acqua "semplice", usabile come acqua di riempimento
// (q.b.) e come solvente nella procedura. È acqua tutto ciò che inizia con
// "acqua" (purificata, dep., F.U., q.b., p.p.i., marca...: i modi di scriverla
// sono troppi per un elenco chiuso) TRANNE le acque-ingrediente riconoscibili:
// "acqua di/d' …" (rose, hamamelis, calce, distillata di rose...), ossigenata,
// termale, aromatica. Il vecchio includes('acqua') le sovrascriveva impostando
// il grado alcolico e le toglieva dalla procedura.
function isAcquaNome(nome) {
  const parole = invNominalizza(nome).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (parole[0] !== 'acqua') return false;
  return !parole.slice(1).some(p => ['di', 'd', 'ossigenata', 'termale', 'aromatica'].includes(p));
}

// Chiavi di DENSITA che indicano etanolo (ricavate, non duplicate a mano): per
// queste decide isEtanoloNome, non la sottostringa (altrimenti "alcool
// cetilico" avrebbe d=0,807).
const _DENSITA_ETANOLO = new Set(Object.keys(DENSITA).filter(k => isEtanoloNome(k)));

// Cerca la densità di un liquido per nome (substring match). null per solidi.
function getDensita(nome) {
  if (isEtanoloNome(nome)) return DENSITA['etanolo'];
  const n = nome.toLowerCase();
  for (const [k,v] of Object.entries(DENSITA)) {
    if (_DENSITA_ETANOLO.has(k)) continue;
    if (n.includes(k)) return v;
  }
  return null;
}

// Normalizza un nome PA per match contro Allegato A: oltre a invNominalizza
// rimuove anche punteggiatura/simboli e collassa spazi.
function tarNormalizza(s) {
  return s.toLowerCase()
    .replace(/[àáâã]/g,'a').replace(/[èéêë]/g,'e')
    .replace(/[ìíîï]/g,'i').replace(/[òóôõ]/g,'o')
    .replace(/[ùúûü]/g,'u')
    .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}

// Voci dell'Allegato A da SUGGERIRE per un nome (menu di Preparazione e di
// Tariffazione): OGNI parola scritta è l'inizio di una parola della voce, in
// qualunque ordine ("ossido zinco" → zinco ossido, "tal" → talco). Non più la
// sola prima parola, che proponeva l'acido acetilsalicilico per "acido
// ialuronico". Solo suggerimenti: il prezzo lo decide trovaVoceAllegatoA.
function vociAllegatoAPerRicerca(nome) {
  const qw = _parolePiene(_paroleNome(nome || '', true));
  if (!qw.length) return [];
  return _indiceAllegatoA()
    .filter(x => qw.every(w => x.w.some(xw => xw.startsWith(w))))
    .map(x => x.k)
    .sort((a, b) => a.length - b.length);
}
function tarCercaPA(nome) {
  return vociAllegatoAPerRicerca(tarNormalizza(nome || '')).slice(0, 6).map(k => [k, ALLEGATO_A[k]]);
}

// ── Lookup inventario (puri, inv passato esplicitamente) ────────────────

// Miglior match per `nome` in `inv`. Prima substring (legacy, veloce), poi
// fallback fuzzy token-based con soglia 0.5. Ritorna l'item o null.
function invFindBest(nome, inv) {
  const q = invNominalizza(nome);
  if (!q) return null;
  const strict = inv.find(s => invNominalizza(s.nome).includes(q) || q.includes(invNominalizza(s.nome)));
  if (strict) return strict;
  let best = null, bestScore = 0;
  inv.forEach(s => {
    const sc = invMatchScore(nome, s.nome);
    if (sc > bestScore && sc >= 0.5) { best = s; bestScore = sc; }
  });
  return best;
}

// Codici H della sostanza `nome` dall'inventario passato. '' se non trovata.
// Stessa ricerca a parole intere del prezzo (invLottiSostanza): non più il
// "contiene" nei due sensi, che dava a "Fenossietanolo" l'H225 dell'"Etanolo".
// I codici H sono della sostanza: il primo lotto che li ha vale per tutti.
// Se il nome ha una concentrazione ("Idrochinone 4%") e così non trova niente,
// si riprova senza numeri: per l'Art. 8a meglio applicare il supplemento che
// perderlo (per il PREZZO invece la concentrazione indica un'altra voce).
// Lo stesso se la sostanza trovata non ha codici H ("Acido salicilico 99%" senza
// H → quelli di "Acido salicilico").
function getHDaInventario(nome, inv) {
  if (!nome || !Array.isArray(inv)) return '';
  let conH = invLottiSostanza(nome, inv).find(s => s.h);
  if (!conH) {
    const parole = _paroleNome(nome).split(' ');
    const senzaNumeri = parole.filter(w => !/^\d+(?:p\d+)?$/.test(w) && !_UNITA.has(w)).join(' ');
    if (senzaNumeri && senzaNumeri !== parole.join(' ')) conH = invLottiSostanza(senzaNumeri, inv).find(s => s.h);
  }
  return conH ? conH.h : '';
}

// True se la riga è da supplementare con Art. 8a (€2,50). Override manuale
// hPreventivo ha priorità su tutto (sopravvive al toggle preventivo↔definitiva).
function rigaHazardous(r, inv) {
  if (!r || !r.nome) return false;
  if (r.hPreventivo === true) return true;
  return hasHazard(r.h || getHDaInventario(r.nome, inv));
}

/// ── Ricerca del prezzo (Allegato A, poi inventario) ──────────────────────
// UNICA logica usata da tutte le strade del prezzo (righe di Preparazione,
// principio attivo, Tariffazione, Scheda, importazione AI). Niente più
// confronto sulla sola PRIMA PAROLA (né su un inizio di parola): dava ad
// "acido ialuronico" il prezzo di legge dell'acido acetilsalicilico, a "olio di
// jojoba" quello dell'olio di arachidi, ad "acqua di rose" quello dell'acqua
// depurata, a "timo" quello del timolo (campo bloccato).

// Nome → parole: minuscolo, senza accenti; decimali in una sola parola col
// separatore "p" ("99,5" → "99p5", "2,00" → "2p00": non "200", che sembrava una
// purezza), i punti tolti ("F.U." → "fu", "Lidocaina." → "lidocaina"), il resto
// della punteggiatura diventa spazio; "ac" (abbreviazione) → "acido", ma non
// nei suggerimenti (`perRicerca`), dove "ac" è l'inizio di una parola che si sta
// scrivendo ("cellulosa ac…" → acetoftalato).
function _paroleNome(s, perRicerca) {
  return invNominalizza(s).replace(/(\d)[.,](\d)/g, '$1p$2').replace(/\./g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ').map(w => w === 'ac' && !perRicerca ? 'acido' : w).join(' ');
}
// Parole che non cambiano la sostanza: articoli/preposizioni (ignorate anche
// nell'ordine: "ossido di zinco" = "zinco ossido")...
const _PAROLE_VUOTE = new Set(['di', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'd']);
// ...e aggiunte "innocue": sigle di farmacopea, purezza, forma fisica, colore,
// fornitori. Ogni ALTRA parola in più vuol dire sostanza diversa ("olio di
// ricino idrogenato" ≠ "olio di ricino", "limone essenza" ≠ "limone").
const _PAROLE_INNOCUE = new Set(['fu', 'ph', 'eur', 'usp', 'bp', 'qb', 'puro', 'pura', 'puri', 'purissimo',
  'purissima', 'ventilato', 'ventilata', 'micronizzato', 'micronizzata', 'polvere', 'cristalli',
  'cristallino', 'cristallina', 'farmaceutico', 'farmaceutica', 'grado', 'qualita', 'uso',
  'bianco', 'bianca', 'naturale', 'anidro', 'anidra', 'farmalabor', 'acef', 'fagron']);
// Il colore è innocuo quando lo scrive l'operatore ("Talco bianco" → talco), non
// quando completa il nome: "cera" non è "cera bianca" (cera d'api naturale ≠
// cera FU sbiancata).
const _COLORI = new Set(['bianco', 'bianca']);
const _UNITA = new Set(['g', 'kg', 'mg', 'ml', 'l']);
// Nomi di sale: "atropina" in ricetta è l'atropina solfato. Ammessi solo quando
// la voce è più lunga del nome scritto e il prezzo è univoco ("chinina" no:
// cloridrato e solfato hanno prezzi diversi).
const _SALI = new Set(['solfato', 'cloridrato', 'bromidrato', 'nitrato', 'fosfato', 'acetato', 'citrato',
  'tartrato', 'maleato', 'sodico', 'sodica', 'potassico', 'potassica', 'idrocloruro', 'bromuro', 'cloruro']);
function _parolePiene(p) { return p.split(' ').filter(w => w && !_PAROLE_VUOTE.has(w)); }
function _sottoinsieme(a, b) { const sb = new Set(b); return a.every(w => sb.has(w)); }
// True se le parole in più sono tutte innocue. Un numero lo è solo se è una
// quantità con unità ("500 g") o una purezza ≥ 90 ("99", "99,5%" → "99p5");
// una concentrazione ("0,9%", "2,00%", "5%", "70%") indica un'altra forma.
// `completamento`: le parole sono quelle che la VOCE aggiunge al nome scritto.
function _soloAggiunteInnocue(extra, completamento) {
  for (let i = 0; i < extra.length; i++) {
    const w = extra[i];
    if (_PAROLE_INNOCUE.has(w) && !(completamento && _COLORI.has(w))) continue;
    if (_UNITA.has(w)) continue;
    if (/^\d+(?:p\d+)?$/.test(w)) {
      if (_UNITA.has(extra[i + 1])) { i++; continue; }
      const n = parseFloat(w.replace('p', '.'));
      if (n >= 90 && n <= 100) continue;   // purezza; oltre 100 è un grado (Macrogol 4000)
    }
    return false;
  }
  return true;
}
// `sostanza`: le parole senza le aggiunte innocue (ma col colore) e senza le
// confezioni in peso ("500 g", "1 kg"), per riconoscere i lotti della stessa
// sostanza scritti in modo diverso in inventario ("Etanolo 96°" e "Etanolo 96°
// Farmalabor", "Talco 500 g" e "Talco 1 kg"). Gli altri numeri restano: gradi,
// purezze, dosi e volumi di prodotti diversi (Macrogol 400 ≠ 4000, Etanolo 96° ≠
// 99,9%, Idrochinone 4%, Melatonina 1 mg ≠ 5 mg, Flacone 100 ml ≠ 250 ml).
const _UNITA_CONFEZIONE = new Set(['g', 'kg']);
function _paroleSostanza(w) {
  const out = [];
  for (let i = 0; i < w.length; i++) {
    const x = w[i];
    if (_PAROLE_INNOCUE.has(x) && !_COLORI.has(x)) continue;
    if (/^\d+(?:p\d+)?$/.test(x) && _UNITA_CONFEZIONE.has(w[i + 1])) { i++; continue; }
    out.push(x);
  }
  return out;
}
function _vocePerNome(nome) {
  const p = _paroleNome(nome), w = _parolePiene(p);
  return { p, w, firma: [...w].sort().join(' '), sostanza: _paroleSostanza(w).sort().join(' ') };
}

let _ALL_A_INDICE = null;   // calcolato una volta: [{k, p, w, firma, prezzo}]
function _indiceAllegatoA() {
  if (!_ALL_A_INDICE) _ALL_A_INDICE = Object.keys(ALLEGATO_A).map(k => ({ k, prezzo: ALLEGATO_A[k], ..._vocePerNome(k) }));
  return _ALL_A_INDICE;
}

// Ricerca comune a voci dell'Allegato A e d'inventario. `voci` = [{p, w, firma, ...}].
// In ordine: nome esatto (anche con punteggiatura diversa); stesse parole in
// altro ordine; voce + sole aggiunte innocue nel nome (la più lunga); nome +
// sole aggiunte innocue nella voce, se la voce INIZIA col nome ("mentolo" →
// mentolo naturale). In quest'ultimo caso TUTTE le voci che iniziano col nome
// devono essere compatibili e dare la stessa `chiave` (prezzo per l'Allegato A,
// sostanza per l'inventario): "zinco" non è zinco solfato se c'è anche zinco
// ossido, "olio" non è nessun olio. Con `stessoPrezzoBasta` (solo Allegato A)
// basta che più voci che iniziano col nome abbiano tutte la stessa chiave:
// "vaselina" → vaselina bianca/filante, entrambe €0,023 (il prezzo di legge è
// quello comunque); una voce sola che il colore distingue no ("cera").
function _trovaVoce(nome, voci, chiave, stessoPrezzoBasta) {
  chiave = chiave || (x => x.prezzo);
  const q = _vocePerNome(nome);
  if (!q.w.length) return null;
  const e = voci.find(x => x.p === q.p) || voci.find(x => x.firma === q.firma);
  if (e) return e;
  const conAggiunte = voci.filter(x => _sottoinsieme(x.w, q.w) && _soloAggiunteInnocue(q.w.filter(w => !x.w.includes(w))));
  if (conAggiunte.length) return conAggiunte.sort((a, b) => b.w.length - a.w.length || b.p.length - a.p.length)[0];
  const conPrefisso = voci.filter(x => x.w.length > q.w.length && q.w.every((w, i) => x.w[i] === w));
  const piuLunghe = conPrefisso.filter(x => _soloAggiunteInnocue(x.w.slice(q.w.length).filter(w => !_SALI.has(w)), true));
  const piuCorta = arr => arr.sort((a, b) => a.p.length - b.p.length)[0];
  if (piuLunghe.length && piuLunghe.length === conPrefisso.length && new Set(piuLunghe.map(chiave)).size === 1)
    return piuCorta(piuLunghe);
  if (stessoPrezzoBasta && conPrefisso.length > 1 && new Set(conPrefisso.map(chiave)).size === 1)
    return piuCorta(conPrefisso);
  return null;
}

// Voce dell'Allegato A per un nome, o null: la ricerca comune, più "acqua
// semplice" (isAcquaNome) → acqua depurata.
function trovaVoceAllegatoA(nome) {
  const q = invNominalizza(nome);
  if (!q) return null;
  if (ALLEGATO_A[q] !== undefined) return q;
  const e = _trovaVoce(q, _indiceAllegatoA(), null, true);
  if (e) return e.k;
  if (isAcquaNome(q) && ALLEGATO_A['acqua depurata'] !== undefined) return 'acqua depurata';
  return null;
}

// Voci d'inventario già scomposte in parole, calcolate una volta per array
// (calcPrep cerca ogni riga nello stesso inventario).
const _INV_INDICE = new WeakMap();
function _indiceInventario(inv) {
  let voci = _INV_INDICE.get(inv);
  if (!voci) {
    voci = inv.filter(s => s && s.nome).map(s => ({ s, prezzo: s.prezzo, ..._vocePerNome(s.nome) })).filter(x => x.w.length);
    _INV_INDICE.set(inv, voci);
  }
  return voci;
}

// Tutti i lotti d'inventario della sostanza `nome` (stesse parole del nome
// trovato, in qualunque ordine), o []. Stessa ricerca del prezzo, mai
// somiglianza vaga: "Acqua di rose" ≠ "Acqua"; "Etanolo" → i lotti di
// "Etanolo 96°"; "Olio" → nessuno se gli oli sono diversi.
function invLottiSostanza(nome, inv) {
  if (!nome || !Array.isArray(inv)) return [];
  const voci = _indiceInventario(inv);
  const e = _trovaVoce(nome, voci, x => x.sostanza);
  return e ? voci.filter(x => x.sostanza === e.sostanza).map(x => x.s) : [];
}

// Lotti per una riga (menu lotti della Scheda, codice scritto a mano, prezzo col
// lotto): quelli della sostanza; se non ce ne sono, i nomi che contengono TUTTE
// le parole scritte (parole intere), purché siano una sola sostanza: "Lattosio" →
// Lattosio monoidrato sì; "Olio" (ricino, mandorle), "Vaselina" (bianca,
// filante) e "Macrogol 400" (c'è solo il 4000) no.
function invLottiPerRiga(nome, inv) {
  const lotti = invLottiSostanza(nome, inv);
  if (lotti.length || !Array.isArray(inv)) return lotti;
  const qw = _parolePiene(_paroleNome(nome || ''));
  if (!qw.length) return [];
  const voci = _indiceInventario(inv).filter(x => qw.every(w => x.w.includes(w)));
  return voci.length && new Set(voci.map(x => x.sostanza)).size === 1 ? voci.map(x => x.s) : [];
}

// Lotti ancora aperti (senza data di chiusura); se sono tutti chiusi, tutti.
function _lottiAperti(lotti) {
  const aperti = lotti.filter(s => !s.dataCh);
  return aperti.length ? aperti : lotti;
}

// True se la sostanza ha più lotti aperti con prezzi diversi: il prezzo dipende
// dal lotto usato nella preparazione.
function invLottiPrezziDiversi(nome, inv) {
  return new Set(_lottiAperti(invLottiSostanza(nome, inv)).filter(s => s.prezzo > 0).map(s => s.prezzo)).size > 1;
}

// Voce d'inventario per il PREZZO di un nome, o null. Con `lotto` (il lotto
// usato nella preparazione, lottoInt o lotto del fornitore) vale quel lotto,
// anche se chiuso; senza, va bene solo se i lotti aperti hanno tutti lo stesso prezzo.
// Il lotto scelto vale se è tra quelli della riga (invLottiPerRiga: "Burro di
// karite" col lotto di "Burro di karite raffinato", l'unica sostanza così; mai
// il lotto di un altro olio per "Olio"); senza lotto, un nome scritto uguale a un
// lotto vale quel lotto ("Talco 500 g" tra Talco 500 g e Talco 1 kg).
const _eLotto = lotto => s => s.lottoInt === lotto || s.lotto === lotto;
function invTrovaPerPrezzo(nome, inv, lotto) {
  if (!nome || !Array.isArray(inv)) return null;
  const lotti = invLottiSostanza(nome, inv);
  if (lotto) {
    const l = lotti.find(_eLotto(lotto)) || invLottiPerRiga(nome, inv).find(_eLotto(lotto));
    if (l) return l;
  }
  if (!lotti.length) return null;
  const aperti = _lottiAperti(lotti);
  const unico = arr => {
    const conPrezzo = arr.filter(s => s.prezzo > 0);
    return new Set(conPrezzo.map(s => s.prezzo)).size > 1 ? null : (conPrezzo[conPrezzo.length - 1] || arr[arr.length - 1]);
  };
  const p = _paroleNome(nome);
  const stessoNome = aperti.filter(s => _paroleNome(s.nome) === p);
  return unico(aperti) || (stessoNome.length ? unico(stessoNome) : null);
}

// Voci d'inventario da SUGGERIRE per un nome (menu della Preparazione): come
// vociAllegatoAPerRicerca, ogni parola scritta è l'inizio di una parola del
// nome, in qualunque ordine ("olio mandorle" → Olio di mandorle dolci).
function invVociPerRicerca(nome, inv) {
  const qw = _parolePiene(_paroleNome(nome || '', true));
  if (!qw.length || !Array.isArray(inv)) return [];
  return _indiceInventario(inv)
    .filter(x => qw.every(w => x.w.some(xw => xw.startsWith(w))))
    .sort((a, b) => a.p.length - b.p.length)
    .map(x => x.s);
}

// Prezzo canonico. Precedenza: Allegato A vince sempre (prezzi obbligatori per
// legge — D.M. 22/09/2017 mod. 13/12/2017, Art. 4 e 10), inventario solo come
// fallback (prezzo > 0). Ritorna {prezzo, fonte, lotto?} o null.
function invGetPrezzo(nomeSostanza, inv) {
  const chiaveAll = trovaVoceAllegatoA(nomeSostanza);
  if (chiaveAll) return { prezzo: ALLEGATO_A[chiaveAll], fonte: 'allegatoA' };
  const found = invTrovaPerPrezzo(nomeSostanza, inv);
  if (found && found.prezzo) return { prezzo: found.prezzo, fonte: 'inventario', lotto: found.lottoInt || found.lotto || '—' };
  return null;
}

// ── Allegato B — costi di preparazione D.M. 22/09/2017 (GU 30-1-2018) ───

// Aliquota IVA per farmaci galenici (10%).
const IVA_RATE = 0.10;

// Incremento Art. 7 — +40% sui costi di preparazione (base + comp + op).
const ART_7_INCREMENTO = 0.40;

// Art. 8a/8b/8c — supplemento unitario €2,50.
const ART_8_PER_UNIT = 2.50;

// Art. 5 — i componenti aggiuntivi sono pagati al massimo 4.
const COMP_MAX = 4;

// Componenti "inclusi" nella voce base per forma (D.M. 22/09/2017, Cap. 8):
// capsule e cartine = 1 componente incluso; tutte le altre forme = 2.
// I componenti aggiuntivi (Art. 5) = n° ingredienti − inclusi, clamp [0, COMP_MAX].
// Si contano TUTTI gli ingredienti (principio o diluente che sia); le capsule
// vuote sono un contenitore (escluse a monte dal chiamante).
const COMP_INCLUSI = Object.freeze({
  liquida: 2, tintura: 2, sospensione: 2, semisolida: 2, polvere: 2,
  capsule: 1, cartine: 1,
});

// Soglia di componenti inclusi per la forma; default 2 se forma sconosciuta.
function getCompInclusi(tipoTariff) {
  return COMP_INCLUSI[tipoTariff] != null ? COMP_INCLUSI[tipoTariff] : 2;
}

// Tetto ai componenti aggiuntivi PAGATI. Il D.M. 22/09/2017 fissa "fino a un
// massimo di 4" SOLO per le forme a pezzi (cartine voce 6, capsule voce 7,
// pillole/granulati voce 9, suppositori voce 11). Per liquidi/sospensioni/
// semisolide/polveri (voci 1-5) NON c'è alcun tetto → Infinity.
function getCompMax(tipoTariff) {
  return (tipoTariff === 'capsule' || tipoTariff === 'cartine') ? COMP_MAX : Infinity;
}

// Componenti aggiuntivi (Art. 5) per una forma dato il n° di ingredienti.
function calcCompAggiuntivi(nIngredienti, tipoTariff) {
  return Math.min(getCompMax(tipoTariff), Math.max(0, (nIngredienti || 0) - getCompInclusi(tipoTariff)));
}

// Voci Allegato B per forme liquide/semisolide/polveri (no pezzi):
//   voce 1 — Soluzioni: base €6,65, no scaglioni volume, comp.extra €0,80.
//   voce 3 — Emulsioni/sospensioni: €13,30/250 ml, +€0,70 ogni 100 ml extra, comp.extra €0,70.
//   voce 4 — Semisolide: €13,30/50 g, +€0,75 ogni 50 g extra, comp.extra €0,75.
//   voce 5 — Polveri: base €6,65, no scaglioni, comp.extra €0,75.
const ALLEGATO_B_VOCI = Object.freeze({
  liquida:    { base: 6.65,  rif: null, stepPiu: null, costPiu: 0,    unitLabel: 'ml', compExtra: 0.80, voce: 'Soluzioni (voce 1)' },
  tintura:    { base: 8.00,  rif: null, stepPiu: null, costPiu: 0,    unitLabel: 'ml', compExtra: 0.80, voce: 'Estratti liquidi e tinture (voce 2)' },
  sospensione:{ base: 13.30, rif: 250,  stepPiu: 100,  costPiu: 0.70, unitLabel: 'ml', compExtra: 0.70, voce: 'Emulsioni/sospensioni (voce 3)' },
  semisolida: { base: 13.30, rif: 50,   stepPiu: 50,   costPiu: 0.75, unitLabel: 'g',  compExtra: 0.75, voce: 'Preparazioni semisolide (voce 4)' },
  polvere:    { base: 6.65,  rif: null, stepPiu: null, costPiu: 0,    unitLabel: 'g',  compExtra: 0.75, voce: 'Polveri (voce 5)' },
});

// Costo Art. 5 per operazione tecnologica aggiuntiva (€2,30).
const OP_TECNOLOGICA_COSTO = 2.30;

// Allegato B per forme liquide/semisolide/polveri.
// Calcola: base (con scaglioni volume), componenti aggiuntivi (capped a 4),
// operazioni tecnologiche, costi totali di preparazione (costoB) e l'incremento
// Art. 7 (+40%). Ritorna anche metadati per il rendering (voce, unit, ecc.).
// Ritorna null se `tipo` non è una delle 4 voci supportate (usa invece calcAllegatoBVoce7
// per capsule/cartine).
function calcAllegatoB(tipo, qt, comp, op) {
  const c = ALLEGATO_B_VOCI[tipo];
  if (!c) return null;
  let baseB = c.base;
  if (c.rif && qt > 0 && qt > c.rif) {
    const diffPiu = Math.ceil((qt - c.rif) / c.stepPiu);
    baseB += diffPiu * c.costPiu;
  }
  // Voci 1-5: nessun tetto sui componenti (getCompMax → Infinity).
  const cappedComp = Math.min(Math.max(0, comp || 0), getCompMax(tipo));
  const addComp = cappedComp * c.compExtra;
  const addOp = Math.max(0, op || 0) * OP_TECNOLOGICA_COSTO;
  const costoB = baseB + addComp + addOp;
  const inc40 = costoB * ART_7_INCREMENTO;
  return { baseB, addComp, addOp, costoB, inc40, cappedComp,
           voce: c.voce, unitLabel: c.unitLabel, base: c.base, compExtra: c.compExtra };
}

// Allegato B voce 7 (capsule e cartine, stessa logica):
//   base €22,00 per 120 pezzi
//   −€1,00 ogni 10 pezzi sotto 120
//   +€2,00 ogni 10 pezzi sopra 120 (asimmetria voluta dal decreto)
//   comp.extra €0,60 per componente aggiuntivo (capped a 4)
// Ritorna {baseB, addComp, addOp, costoB, inc40, diff10}.
function calcAllegatoBVoce7(nPezzi, comp, op) {
  const n = Math.max(0, nPezzi || 0);
  const diff10 = Math.ceil(Math.abs(n - 120) / 10);
  let baseB = 22.00;
  if (n < 120) baseB -= diff10 * 1.00;
  else if (n > 120) baseB += diff10 * 2.00;
  baseB = Math.max(0, baseB);
  const cappedComp = Math.min(Math.max(0, comp || 0), COMP_MAX);
  const addComp = cappedComp * 0.60;
  const addOp = Math.max(0, op || 0) * OP_TECNOLOGICA_COSTO;
  const costoB = baseB + addComp + addOp;
  const inc40 = costoB * ART_7_INCREMENTO;
  return { baseB, addComp, addOp, costoB, inc40, cappedComp, diff10 };
}

// Allegato B voce 6 (cartine e cialdini) — base diversa dalle capsule:
//   base €11,00 per 10 cartine
//   +€0,25 per ogni cartina OLTRE le prime 10 (per unità, non per 10)
//   −€0,35 per ogni cartina IN MENO sotto le 10
//   comp.extra €0,60 per componente aggiuntivo (capped a 4)
//   op €2,30
// Ritorna {baseB, addComp, addOp, costoB, inc40, cappedComp}.
function calcAllegatoBVoce6(nCart, comp, op) {
  const n = Math.max(0, nCart || 0);
  let baseB = 11.00;
  if (n > 10) baseB += (n - 10) * 0.25;
  else if (n < 10) baseB -= (10 - n) * 0.35;
  baseB = Math.max(0, baseB);
  const cappedComp = Math.min(Math.max(0, comp || 0), COMP_MAX);
  const addComp = cappedComp * 0.60;
  const addOp = Math.max(0, op || 0) * OP_TECNOLOGICA_COSTO;
  const costoB = baseB + addComp + addOp;
  const inc40 = costoB * ART_7_INCREMENTO;
  return { baseB, addComp, addOp, costoB, inc40, cappedComp };
}

// Art. 8 supplementi: 8a (sostanza H pericolosa), 8b (per ogni stupefacente),
// 8c (doping). Tutti €2,50 per unità di applicazione.
function calcSupplementi({ hazardous = false, stupp = 0, dop = 0 } = {}) {
  return {
    art8a: hazardous ? ART_8_PER_UNIT : 0,
    art8b: Math.max(0, stupp) * ART_8_PER_UNIT,
    art8c: Math.max(0, dop) * ART_8_PER_UNIT,
  };
}

// IVA 10% sul netto, ritorna {iva, totale}.
function calcIvaTotale(netto) {
  const n = Math.max(0, netto || 0);
  const iva = n * IVA_RATE;
  return { iva, totale: n + iva };
}

// Ridosaggio da specialità medicinale (es. Frisium 10mg cpr → capsule 4mg):
// si paga la/le CONFEZIONE/I intera/e effettivamente aperta/e per ottenere le
// unità necessarie, non le singole unità — una farmacia non può dispensare
// solo una parte di una confezione di specialità. Le unità avanzate dalla
// confezione aperta si consegnano al cliente insieme al preparato.
// Ritorna null se i dati sono incompleti (dose/confezione/prezzo non > 0).
function calcCostoSpecialita(mgTotaliServono, doseMg, confUnita, confPrezzo) {
  if (!(mgTotaliServono > 0) || !(doseMg > 0) || !(confUnita > 0) || !(confPrezzo > 0)) return null;
  const unitaNecessarie = Math.ceil(mgTotaliServono / doseMg);
  const confezioni = Math.ceil(unitaNecessarie / confUnita);
  const costoTotale = confezioni * confPrezzo;
  const unitaFornite = confezioni * confUnita;
  const unitaAvanzate = unitaFornite - unitaNecessarie;
  return { unitaNecessarie, confezioni, costoTotale, unitaFornite, unitaAvanzate };
}

// ── Export per browser + Node ────────────────────────────────────────────

const _exports = {
  ALLEGATO_A, DENSITA, INV_HARDCODED, INV_OBBLIGATORIE,
  STUPEFACENTI, DOPING, OP_TECNOLOGICHE_AUTO,
  ALLEGATO_B_VOCI, IVA_RATE, ART_7_INCREMENTO, ART_8_PER_UNIT, COMP_MAX, OP_TECNOLOGICA_COSTO,
  COMP_INCLUSI, getCompInclusi, getCompMax, calcCompAggiuntivi, calcAllegatoBVoce6,
  fmt, invNominalizza, invMatchScore, hasHazard, getDensita, isEtanoloNome, isAcquaNome, tarNormalizza, tarCercaPA,
  isStupefacente, isDoping, getOpTecnologicheAuto,
  invFindBest, getHDaInventario, rigaHazardous, invGetPrezzo, trovaVoceAllegatoA, invTrovaPerPrezzo, vociAllegatoAPerRicerca,
  invLottiSostanza, invLottiPrezziDiversi, invVociPerRicerca, invLottiAperti: _lottiAperti, invLottiPerRiga,
  calcAllegatoB, calcAllegatoBVoce7, calcSupplementi, calcIvaTotale, calcCostoSpecialita,
};
Object.assign(globalThis, _exports);
if (typeof module !== 'undefined' && module.exports) module.exports = _exports;
