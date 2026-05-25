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

// ── Helper puri ──────────────────────────────────────────────────────────

// Formatta numero con virgola decimale italiana. fmt(1.234) → "1,23".
function fmt(n, dec) { dec = dec === undefined ? 2 : dec; return n.toFixed(dec).replace('.', ','); }

// Normalizza un nome sostanza per match fuzzy: lowercase, accenti rimossi, trim.
function invNominalizza(s) {
  return (s||'').toLowerCase().replace(/[àáâ]/g,'a').replace(/[èéê]/g,'e').replace(/[ìí]/g,'i').replace(/[òó]/g,'o').replace(/[ùú]/g,'u').trim();
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

// Cerca la densità di un liquido per nome (substring match). null per solidi.
function getDensita(nome) {
  const n = nome.toLowerCase();
  for (const [k,v] of Object.entries(DENSITA)) {
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

// Cerca in Allegato A le sostanze che matchano `nome` (max 6 risultati,
// ordinati per lunghezza crescente — il match più stretto vince).
function tarCercaPA(nome) {
  const q = tarNormalizza(nome);
  if (!q) return [];
  return Object.entries(ALLEGATO_A)
    .filter(([k]) => k.includes(q) || q.includes(k.split(' ')[0]))
    .sort((a,b) => a[0].length - b[0].length)
    .slice(0, 6);
}

// ── Export per browser + Node ────────────────────────────────────────────

const _exports = {
  ALLEGATO_A, DENSITA, INV_HARDCODED, INV_OBBLIGATORIE,
  fmt, invNominalizza, invMatchScore, hasHazard, getDensita, tarNormalizza, tarCercaPA,
};
Object.assign(globalThis, _exports);
if (typeof module !== 'undefined' && module.exports) module.exports = _exports;
