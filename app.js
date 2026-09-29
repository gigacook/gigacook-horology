'use strict';
/* ================= UI, presets, live preview, spec sheet ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

// neutral base every preset and shared link is merged onto
const BASE = {
  caseStyle:'gs', diameter:40, caseMat:'steel', caseFinish:'mixed', crystal:'box',
  edgeBreak:.5, edgeProfile:'round', l2l:0, lugW:0,
  bezelType:'smooth', bezelW:1.2, insertMat:'ceramic', bezelC1:'#111114', bezelC2:'#1f3f8f', bezelNum:'#f2f2f2',
  dialColor:'#eef0ee', dialTex:'paper', shine:.55, fume:0,
  markers:'baton', markerMetal:'steel', numeralFont:'Oswald', lume:false, lumeType:'bgw9', track:'hash', printColor:'auto',
  hands:'dauphine', handMetal:'steel', seconds:true, secStyle:'stick', secColor:'#2c4aa6',
  date:'3', dateWheel:'white', dateFrame:true, cyclops:false,
  brand:'Gigacook\nHorology', brandFont:'Montserrat', brandSize:3.4, brandLine2:.5, brandWeight:700, brandItalic:true, brandUpper:false, brandSpacing:.03, brandColor:'auto', brandY:.46,
  subtitle:'SPRING DRIVE', subShow:true,
  crown:'fluted', crownGuards:false, gemColor:'#1f4fbf',
  movement:'spring', caseback:'solid', engraveText:'GIGACOOK HOROLOGY · STAINLESS STEEL · WATER RESISTANT 10 BAR', emblem:'serbia',
  strap:'oyster', strapColor:'#3b2416', strapAccent:'#e8dcc0', braceletCenter:'polished', clasp:'fold',
};
// the house watch: shown on the welcome screen and loaded when the site opens without a design link
const STANDARD = { ...BASE,
  caseStyle:'gs', diameter:38, caseMat:'ti', caseFinish:'mixed', crystal:'flat',
  bezelType:'diver', bezelW:3.7, insertMat:'ceramic', bezelC1:'#070712', bezelC2:'#6b1d2a', bezelNum:'#fffef0',
  dialColor:'#001238', dialTex:'linen', shine:.8, fume:1,
  markers:'explorer', markerMetal:'steel', numeralFont:'Michroma', lume:true, lumeType:'bgw9', track:'hash', printColor:'#260803',
  hands:'leaf', handMetal:'steel', seconds:true, secStyle:'stick', secColor:'#ff000d',
  date:'none', dateWheel:'dial', dateFrame:true, cyclops:false,
  brand:'Gigacook\nHorology', brandFont:'Orbitron', brandSize:1.45, brandLine2:.6, brandWeight:400, brandItalic:true, brandUpper:false, brandSpacing:0, brandColor:'#fffef0', brandY:.32,
  subtitle:'Bog pomaze', subShow:true,
  crown:'screw', crownGuards:true, gemColor:'#1f4fbf',
  movement:'hibeat', caseback:'solid', engraveText:'', emblem:'serbia',
  strap:'rubber', strapColor:'#060300', strapAccent:'#e7dcc2', braceletCenter:'polished', clasp:'pin',
};
const PRESETS = [
  ['Standard', STANDARD],
  ['Explorer', { caseStyle:'oyster', diameter:36, crystal:'flat', dialColor:'#0e0e10', dialTex:'clean', shine:.7, markers:'explorer', markerMetal:'white', lume:true, lumeType:'c3', hands:'mercedes', handMetal:'steel', secStyle:'lollipop', secColor:'#e8e8e8', date:'none', brandFont:'Playfair Display', brandSize:2.6, brandItalic:false, brandSpacing:.08, subtitle:'OYSTER PERPETUAL', movement:'auto', caseback:'solid', emblem:'serbia', crown:'screw', strap:'oyster', braceletCenter:'brushed', clasp:'oysterlock', caseFinish:'brushed', track:'hash' }],
  ['Diver', { caseStyle:'diver', diameter:41, crystal:'flat', bezelType:'diver', bezelW:4.3, insertMat:'ceramic', bezelC1:'#0b0b0c', bezelNum:'#f0f0f0', dialColor:'#0b0b0c', dialTex:'clean', shine:.6, markers:'diver', markerMetal:'steel', lume:true, lumeType:'bgw9', hands:'mercedes', secStyle:'lollipop', secColor:'#f0f0f0', date:'3', dateFrame:true, cyclops:true, brandFont:'Montserrat', brandSize:2.4, subtitle:'300M · AUTOMATIC', movement:'auto', caseback:'solid', crown:'screw', crownGuards:true, strap:'oyster', braceletCenter:'brushed', clasp:'glidelock', caseFinish:'mixed', track:'hash' }],
  ['Pepsi GMT', { caseStyle:'diver', diameter:40, crystal:'flat', bezelType:'gmt', bezelW:3.5, insertMat:'alu', bezelC1:'#b3262d', bezelC2:'#1f3f8f', bezelNum:'#f1f1f1', dialColor:'#101012', dialTex:'clean', shine:.5, markers:'diver', lume:true, lumeType:'vintage', hands:'mercedes', secStyle:'lollipop', secColor:'#e8e8e8', date:'3', cyclops:true, brandFont:'Playfair Display', brandSize:2.5, subtitle:'GMT', movement:'auto', crown:'screw', crownGuards:true, strap:'jubilee', clasp:'oysterlock', caseback:'solid', emblem:'serbia' }],
  ['Dress', { caseStyle:'omega', diameter:35, caseMat:'gold', caseFinish:'polished', crystal:'hesalite', dialColor:'#efe4c9', dialTex:'paper', shine:.35, markers:'wedge', markerMetal:'gold', hands:'dauphine', handMetal:'gold', secColor:'#9a7a3a', track:'railway', date:'none', brandFont:'Great Vibes', brandSize:4.2, brandUpper:false, brandWeight:400, brandSpacing:0, brandLine2:.36, subtitle:'GENÈVE', movement:'manual', caseback:'solid', emblem:'wave', crown:'onion', strap:'leather', strapColor:'#4a2a17', strapAccent:'#e7dcc2', clasp:'pin' }],
  // WW2 Beobachtungsuhr: big matte case, Type-A dial (triangle + two dots), blued swords, oversized onion crown
  ['Pilot', { caseStyle:'dress', diameter:44, caseMat:'bronze', caseFinish:'blasted', edgeProfile:'round', edgeBreak:.8, crystal:'domed', dialColor:'#161616', dialTex:'clean', shine:.08, fume:0, markers:'flieger', numeralFont:'Oswald', markerMetal:'white', lume:true, lumeType:'vintage', hands:'sword', handMetal:'blued', seconds:true, secStyle:'stick', secColor:'#2c4aa6', track:'hash', printColor:'#e9e4d6', date:'none', brandFont:'Josefin Sans', brandSize:1.9, brandWeight:700, brandItalic:false, brandUpper:true, brandSpacing:.12, brandColor:'#e9e4d6', brandY:.44, subtitle:'', subShow:false, movement:'manual', crown:'onion', strap:'leather', strapColor:'#5a3a22', strapAccent:'#d9c9a8', clasp:'pin', caseback:'solid', emblem:'star', engraveText:'GIGACOOK HOROLOGY · FLIEGER · CUSN8 BRONZE' }],
];

const DIAL_SW = ['#eef0ee','#f4efe4','#efe4c9','#c9ccd1','#e9b39c','#173a86','#1d5b54','#2f4431','#6b1d2a','#4a2c6b','#121214','#3a3d42'];
const BEZ_SW = ['#0b0b0c','#1f3f8f','#b3262d','#135c3a','#6b1d2a','#c9ccd1','#8c6b2a'];
const STRAP_SW = ['#3b2416','#6e3f1f','#a4683a','#141414','#1e2a44','#4b5134','#6b1d2a','#e9e4d8','#c8622a'];
const ACC_SW = ['#e8dcc0','#141414','#c9a45c','#b3262d','#1f3f8f','#f2f2f2'];
const TXT_SW = ['auto','#f2f2f2','#161616','#c9a45c','#b8bcc4','#b3262d','#1b2c78'];

const CLASPS = { pin:'Pin buckle', deployant:'Folding deployant', butterfly:'Butterfly', fold:'Fold-over clasp', oysterlock:'Safety lock clasp', glidelock:'Diver extension clasp', slider:'Mesh slider clasp' };
const claspOpts = S => (['oyster','jubilee'].includes(S.strap) ? ['fold','oysterlock','glidelock','butterfly'] : S.strap === 'mesh' ? ['slider','fold'] : ['pin','deployant','butterfly']).map(k => [k, CLASPS[k]]);
const METAL_OPTS = Object.entries(HMATS).map(([k,v]) => [k, v.short]);

const SECTIONS = [
  { title:'Case', open:true, fields:[
    { k:'caseStyle', label:'Style', t:'chips', opts:Object.entries(CASES).map(([k,v]) => [k, v.name]) },
    { k:'diameter', label:'Diameter', t:'range', min:33, max:44, step:.5, unit:' mm' },
    { k:'caseMat', label:'Material', t:'chips', opts:Object.entries(MATS).map(([k,v]) => [k, v.short]) },
    { k:'crystal', label:'Crystal', t:'chips', opts:[['flat','Flat sapphire'],['domed','Domed sapphire'],['box','Box sapphire'],['hesalite','Hesalite dome']] },
  ]},
  { title:'Case detailing', fields:[
    { k:'caseFinish', label:'Polishing', t:'chips', opts:[['polished','High polish'],['brushed','Brushed'],['mixed','Brushed + polished bevels'],['blasted','Bead-blasted'],['zaratsu','Zaratsu mirror']] },
    { k:'edgeProfile', label:'Edge treatment', t:'chips', opts:[['round','Rounded edge break'],['chamfer','Polished chamfer'],['sharp','Sharp (knife edge)']] },
    { k:'edgeBreak', label:S => S.edgeProfile === 'chamfer' ? 'Chamfer width' : 'Edge break radius', t:'range', min:.1, max:1.2, step:.05, unit:' mm', show:S => S.edgeProfile !== 'sharp' },
    { k:'l2l', label:'Lug-to-lug', t:'range', min:34, max:56, step:.5, unit:' mm', get:S => geo(S).l2l },
    { k:'lugW', label:'Lug width', t:'range', min:14, max:26, step:1, unit:' mm', get:S => geo(S).lugW },
  ]},
  { title:'Bezel', open:true, fields:[
    { k:'bezelType', label:'Type', t:'chips', opts:[['smooth','Smooth polished'],['fluted','Fluted'],['diver','Diver 60-min'],['gmt','GMT 24 h'],['tachy','Tachymeter']] },
    { k:'bezelW', label:'Bezel width', t:'range', min:.6, max:4.5, step:.1, unit:' mm' },
    { k:'insertMat', label:'Insert', t:'chips', opts:[['ceramic','Ceramic (gloss)'],['alu','Aluminium (matte)']], show:S => INSERT_BEZELS.includes(S.bezelType) },
    { k:'bezelC1', label:'Insert colour', t:'color', sw:BEZ_SW, show:S => INSERT_BEZELS.includes(S.bezelType) },
    { k:'bezelC2', label:'Night half colour', t:'color', sw:BEZ_SW, show:S => S.bezelType === 'gmt' },
    { k:'bezelNum', label:'Numerals', t:'color', sw:['#f2f2f2','#c9a45c','#161616','#c9ccd1'], show:S => INSERT_BEZELS.includes(S.bezelType) },
  ]},
  { title:'Dial', open:true, fields:[
    { k:'dialColor', label:'Colour', t:'color', sw:DIAL_SW },
    { k:'dialTex', label:'Finish', t:'chips', opts:[['clean','Clean / lacquer'],['sunburst','Sunburst'],['paper','Paper / washi'],['clous','Clous de Paris'],['tapisserie','Tapisserie'],['cotes','Côtes de Genève'],['linen','Linen']] },
    { k:'shine', label:'Shine', t:'range', min:0, max:1, step:.05 },
    { k:'fume', label:'Fumé edge', t:'range', min:0, max:1, step:.05 },
  ]},
  { title:'Markers & track', fields:[
    { k:'markers', label:'Hour markers', t:'chips', opts:[['baton','Applied batons'],['wedge','Faceted wedges'],['arabic','Arabic'],['roman','Roman'],['diver','Diver dots'],['explorer','3-6-9'],['flieger','Flieger (Type A)'],['dots','Vintage dots'],['minimal','Minimal'],['none','None']] },
    { k:'markerMetal', label:'Marker colour', t:'chips', opts:METAL_OPTS, show:S => S.markers !== 'none' },
    { k:'numeralFont', label:'Numeral font', t:'select', opts:FONTS.map(f => [f[0], f[0]]), show:S => ['arabic','roman','explorer','flieger'].includes(S.markers) },
    { k:'lume', label:'Lume', t:'toggle', text:'Luminous fill on markers & hands' },
    { k:'lumeType', label:'Lume type', t:'chips', opts:Object.entries(LUME).map(([k,v]) => [k, v.name]), show:S => S.lume },
    { k:'track', label:'Minute / seconds track', t:'chips', opts:[['none','None'],['hash','Hash marks'],['railway','Railway'],['dots','Dots']] },
    { k:'printColor', label:'Print colour', t:'color', sw:TXT_SW },
  ]},
  { title:'Hands', fields:[
    { k:'hands', label:'Hand set', t:'chips', opts:[['dauphine','Dauphine'],['sword','Sword'],['mercedes','Mercedes'],['arrow','Broad arrow'],['baton','Baton'],['leaf','Leaf'],['snowflake','Snowflake']] },
    { k:'handMetal', label:'Hand colour', t:'chips', opts:METAL_OPTS },
    { k:'seconds', label:'Seconds hand', t:'toggle', text:'Central seconds' },
    { k:'secStyle', label:'Seconds tip', t:'chips', opts:[['stick','Stick'],['lollipop','Lollipop'],['arrow','Arrow']], show:S => S.seconds },
    { k:'secColor', label:'Seconds colour', t:'color', sw:['#2c4aa6','#c0262d','#e8e8e8','#c9a45c','#161616','#ff7a1a'], show:S => S.seconds },
  ]},
  { title:'Date', fields:[
    { k:'date', label:'Date window', t:'chips', opts:[['none','None'],['3','3 o\'clock'],['430','4:30'],['6','6 o\'clock']] },
    { k:'dateWheel', label:'Date wheel', t:'chips', opts:[['white','White'],['black','Black'],['dial','Dial-matched']], show:S => S.date !== 'none' },
    { k:'dateFrame', label:'Frame', t:'toggle', text:'Applied metal frame', show:S => S.date !== 'none' },
    { k:'cyclops', label:'Cyclops', t:'toggle', text:'Magnifier lens on crystal', show:S => S.date !== 'none' },
  ]},
  { title:'Branding', fields:[
    { k:'brand', label:'Dial name (up to 2 lines)', t:'textarea' },
    { k:'brandFont', label:'Font', t:'select', opts:FONTS.map(f => [f[0], f[0]]) },
    { k:'brandSize', label:'Size', t:'range', min:1.2, max:6.5, step:.1, unit:' mm' },
    { k:'brandLine2', label:'Second line size', t:'range', min:.3, max:1, step:.02, show:S => brandLines(S).length > 1 },
    { k:'brandWeight', label:'Weight', t:'chips', opts:[[400,'Regular'],[700,'Bold']] },
    { k:'brandItalic', label:'Italic', t:'toggle', text:'Italic' },
    { k:'brandUpper', label:'Case', t:'toggle', text:'ALL CAPS' },
    { k:'brandSpacing', label:'Letter spacing', t:'range', min:0, max:.5, step:.01 },
    { k:'brandY', label:'Vertical position', t:'range', min:.2, max:.7, step:.01 },
    { k:'brandColor', label:'Colour', t:'color', sw:TXT_SW },
    { k:'subShow', label:'Line above 6', t:'toggle', text:'Show line above 6' },
    { k:'subtitle', label:'Line above 6 text', t:'text', show:S => S.subShow },
  ]},
  { title:'Crown', fields:[
    { k:'crown', label:'Crown', t:'chips', opts:[['smooth','Smooth'],['fluted','Fluted'],['onion','Onion'],['screw','Screw-down'],['cabochon','Cabochon'],['pilot','Pilot (oversized)']] },
    { k:'crownGuards', label:'Crown guards', t:'toggle', text:'Shoulders around the crown' },
    { k:'gemColor', label:'Cabochon stone', t:'color', sw:['#1f4fbf','#b3262d','#135c3a','#111111'], show:S => S.crown === 'cabochon' },
  ]},
  { title:'Movement', fields:[
    { k:'movement', label:'Calibre (sets case thickness)', t:'chips', opts:Object.entries(MOVEMENTS).map(([k,v]) => [k, `${v.name} · ${v.t} mm`]) },
  ]},
  { title:'Caseback', fields:[
    { k:'caseback', label:'Type', t:'chips', opts:[['display','Sapphire display back'],['solid','Solid, engraved']] },
    { k:'engraveText', label:'Engraving', t:'text', show:S => S.caseback === 'solid' },
    { k:'emblem', label:'Centre motif', t:'chips', opts:[['serbia','Serbian crest'],['wave','Waves'],['star','Star'],['crest','Crest'],['none','Brand + serial']], show:S => S.caseback === 'solid' },
  ]},
  { title:'Strap & clasp', fields:[
    { k:'strap', label:'Strap', t:'chips', opts:[['oyster','Oyster 3-link'],['jubilee','Jubilee 5-link'],['mesh','Milanese mesh'],['rubber','Rubber'],['leather','Leather'],['nato','NATO']] },
    { k:'braceletCenter', label:'Centre links', t:'chips', opts:[['polished','Polished'],['brushed','Brushed']], show:S => S.strap === 'oyster' },
    { k:'strapColor', label:'Strap colour', t:'color', sw:STRAP_SW, show:S => ['rubber','leather','nato'].includes(S.strap) },
    { k:'strapAccent', label:S => S.strap === 'nato' ? 'Stripe colour' : 'Stitching', t:'color', sw:ACC_SW, show:S => ['leather','nato'].includes(S.strap) },
    { k:'clasp', label:'Clasp', t:'chips', opts:claspOpts },
  ]},
];

/* ---------------- state ---------------- */
let S = { ...STANDARD }, fromLink = false;
try { const h = location.hash.slice(1); if (h){ S = { ...BASE, ...JSON.parse(decodeURIComponent(escape(atob(h)))) }; fromLink = true; } } catch (e) {}
const FIELDS = SECTIONS.flatMap(s => s.fields);
const fieldOf = k => FIELDS.find(f => f.k === k);
const labelOf = f => typeof f.label === 'function' ? f.label(S) : f.label;

function set(k, v){
  const prev = S[k]; S[k] = v;
  if (k === 'bezelType') S.bezelW = { smooth:1.2, fluted:2.2, diver:3.6, gmt:3.6, tachy:3.2 }[v];
  if (k === 'caseStyle'){ S.l2l = 0; if (v === 'diver'){ S.crownGuards = true; if (!INSERT_BEZELS.includes(S.bezelType)){ S.bezelType = 'diver'; S.bezelW = 3.6; } S.crown = 'screw'; } else if (prev === 'diver') S.crownGuards = false; }
  if (k === 'movement' && S.subtitle === MOVEMENTS[prev].sub) S.subtitle = MOVEMENTS[v].sub;
  fixClasp(); refreshPanel(); invalidate();
}
function fixClasp(){ const o = claspOpts(S); if (!o.some(x => x[0] === S.clasp)) S.clasp = o[0][0]; }

/* ---------------- panel ---------------- */
let colorTarget = 'dialColor';
function buildPanel(){
  const panel = $('#panel'); panel.innerHTML = '';
  // one full-spectrum picker for the whole site; it paints whichever colour field was touched last
  const sp = document.createElement('div'); sp.className = 'spectrum';
  sp.innerHTML = `<label><input type="color" id="spectrum"><span><small>Full-spectrum colour</small><b id="spectrumFor"></b></span></label>`;
  panel.appendChild(sp);
  $('#spectrum').oninput = e => set(colorTarget, e.target.value);
  for (const sec of SECTIONS){
    const d = document.createElement('details'); d.className = 'sec'; d.open = !!sec.open;
    d.innerHTML = `<summary>${sec.title}</summary>`;
    const body = document.createElement('div'); body.className = 'fields';
    for (const f of sec.fields){
      const el = document.createElement('div'); el.className = 'field'; f.sec = sec.title;
      el.innerHTML = `<div class="lab"><span></span><em></em></div><div class="ctl"></div>`;
      f.el = el; f.ctl = el.querySelector('.ctl'); f.optKey = ''; body.appendChild(el); renderCtl(f);
      if (f.t === 'color') el.querySelector('.lab').onclick = () => targetColor(f.k);
    }
    d.appendChild(body); panel.appendChild(d);
  }
  refreshPanel();
}
function targetColor(k){ colorTarget = k; refreshPanel(); }
function renderCtl(f){
  const ctl = f.ctl; ctl.innerHTML = '';
  if (f.t === 'chips'){
    ctl.className = 'ctl chips';
    for (const [val, label] of (typeof f.opts === 'function' ? f.opts(S) : f.opts)){
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.v = val;
      b.onclick = () => set(f.k, typeof BASE[f.k] === 'number' ? +val : val); ctl.appendChild(b);
    }
  } else if (f.t === 'range'){
    const i = document.createElement('input'); i.type = 'range'; i.min = f.min; i.max = f.max; i.step = f.step;
    i.oninput = () => set(f.k, +i.value); ctl.appendChild(i);
  } else if (f.t === 'color'){
    ctl.className = 'ctl swatches';
    for (const c of f.sw){
      const b = document.createElement('button'); b.type = 'button'; b.dataset.v = c; b.title = c;
      if (c === 'auto'){ b.textContent = 'A'; b.style.background = 'linear-gradient(135deg,#eee 50%,#222 50%)'; b.style.color = '#c9a45c'; } else b.style.background = c;
      b.onclick = () => { colorTarget = f.k; set(f.k, c); }; ctl.appendChild(b);
    }
    const cu = document.createElement('button'); cu.type = 'button'; cu.className = 'custom'; cu.title = 'Custom colour (full-spectrum picker above)';
    cu.onclick = () => { targetColor(f.k); const sp = $('#spectrum'); sp.scrollIntoView({ block:'nearest' }); sp.click(); }; ctl.appendChild(cu);
  } else if (f.t === 'toggle'){
    ctl.innerHTML = `<label class="switch"><input type="checkbox"><span>${f.text}</span></label>`;
    const i = ctl.querySelector('input'); i.onchange = () => set(f.k, i.checked);
  } else if (f.t === 'text'){
    const i = document.createElement('input'); i.type = 'text'; i.maxLength = 60; i.oninput = () => set(f.k, i.value); ctl.appendChild(i);
  } else if (f.t === 'textarea'){
    const i = document.createElement('textarea'); i.rows = 2; i.maxLength = 60; i.oninput = () => set(f.k, i.value.split('\n').slice(0, 2).join('\n')); ctl.appendChild(i);
  } else if (f.t === 'select'){
    const s = document.createElement('select');
    for (const [v, l] of f.opts){ const o = document.createElement('option'); o.value = v; o.textContent = l; if (FONTS.some(x => x[0] === v)) o.style.fontFamily = fam(v); s.appendChild(o); }
    s.onchange = () => set(f.k, s.value); ctl.appendChild(s);
  }
}
function refreshPanel(){
  const tf = fieldOf(colorTarget); if (tf.show && !tf.show(S)) colorTarget = 'dialColor';
  for (const f of FIELDS){
    if (!f.el) continue;
    f.el.hidden = !!(f.show && !f.show(S));
    f.el.classList.toggle('target', f.k === colorTarget);
    f.el.querySelector('.lab span').textContent = labelOf(f);
    const v = f.get ? f.get(S) : S[f.k], em = f.el.querySelector('.lab em');
    em.textContent = f.t === 'range' ? (+v).toFixed(f.step < .1 ? 2 : 1).replace(/\.0$/, '') + (f.unit || '') : '';
    if (typeof f.opts === 'function'){ const key = JSON.stringify(f.opts(S)); if (key !== f.optKey){ f.optKey = key; renderCtl(f); } }
    if (f.t === 'chips' || f.t === 'color') f.ctl.querySelectorAll('button[data-v]').forEach(b => b.classList.toggle('on', String(b.dataset.v) === String(v)));
    const inp = f.ctl.querySelector('input,select,textarea');
    if (!inp || document.activeElement === inp) continue;
    if (f.t === 'toggle') inp.checked = !!v; else inp.value = v;
  }
  const tf2 = fieldOf(colorTarget), cur = S[colorTarget];
  $('#spectrumFor').textContent = `${tf2.sec} · ${labelOf(tf2)}`;
  if (/^#[0-9a-f]{6}$/i.test(cur) && document.activeElement !== $('#spectrum')) $('#spectrum').value = cur;
}

/* ---------------- preview rendering ---------------- */
const cv = $('#preview'), ctx = cv.getContext('2d');
const layer = () => document.createElement('canvas');
const baseL = layer(), topL = layer();
let dirty = true, VIEW = { k:1, cx:0, cy:0 };

function sizeCanvas(c, w, h){ const d = Math.min(devicePixelRatio || 1, 2); c.width = Math.round(w*d); c.height = Math.round(h*d); return d; }
function invalidate(){ dirty = true; }

function rebuildStatic(){
  const r = cv.getBoundingClientRect(), d = sizeCanvas(cv, r.width, r.height);
  [baseL, topL].forEach(l => { l.width = cv.width; l.height = cv.height; });
  const g = geo(S), k = Math.min(cv.height / 98, cv.width / (g.D + 34));
  VIEW = { k, cx:cv.width/2, cy:cv.height/2 }; PXMM = k;
  const b = baseL.getContext('2d'); b.setTransform(k,0,0,-k,VIEW.cx,VIEW.cy);
  drawStrap(b,S,g,1); drawStrap(b,S,g,-1); drawCase(b,S,g); drawBezel(b,S,g);
  b.save(); b.beginPath(); b.arc(0,0,g.bzI+.05,0,TAU); b.clip();
  b.fillStyle = shade(S.dialColor,-.3); b.fill(); drawDial(b,S,g,'full');
  const gr = b.createRadialGradient(0,0,g.R*.9,0,0,g.bzI); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,.45)'); b.fillStyle = gr; b.fillRect(-g.bzI,-g.bzI,2*g.bzI,2*g.bzI);
  b.restore();
  const t = topL.getContext('2d'); t.setTransform(k,0,0,-k,VIEW.cx,VIEW.cy); drawCyclops(t,S,g); drawGlare(t,S,g);
  drawProfile(); drawBack(); updateDims(g);
  dirty = false;
}
function frame(){
  if (dirty) rebuildStatic();
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height); ctx.drawImage(baseL,0,0);
  ctx.setTransform(VIEW.k,0,0,-VIEW.k,VIEW.cx,VIEW.cy); PXMM = VIEW.k;
  drawHands(ctx,S,geo(S),handAngles(S));
  ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(topL,0,0);
  requestAnimationFrame(frame);
}
new ResizeObserver(invalidate).observe($('#previewWrap'));

function updateDims(g){
  const wr = waterRes(g);
  $('#sizeBadge').innerHTML = `<b>${g.D}<small>mm</small></b><span>Ø case · ${g.l2l} mm lug-to-lug · ${g.T.toFixed(1)} mm thick</span>`;
  $('#dims').innerHTML = [['Lug width', g.lugW + ' mm'], ['WR', wr + ' m'], ['≈', weight(g) + ' g']].map(([a,b]) => `<span>${a} <b>${b}</b></span>`).join('');
}
function waterRes(g){ let w = g.C.wr; if (S.crown !== 'screw' && w > 100) w = 100; if (S.crown === 'screw') w = Math.max(w, 100); if (S.crystal === 'hesalite') w = Math.min(w, 50); return w; }
function weight(g){
  const m = MATS[S.caseMat], caseG = PI*g.cr*g.cr*g.T*.42/1000*m.dens + 4*g.lugT*(g.yE-g.y0)*g.midH*.7/1000*m.dens;
  const strapG = { oyster:58, jubilee:52, mesh:42, rubber:18, leather:12, nato:9 }[S.strap] * (['oyster','jubilee','mesh'].includes(S.strap) ? m.dens/8 : 1);
  return Math.round(caseG + g.mv.t*2.2 + strapG);
}

function drawProfile(target){
  const c = target || $('#profile'), r = c.getBoundingClientRect(); sizeCanvas(c, r.width || 340, r.height || 220);
  const x = c.getContext('2d'), g = geo(S), m = MATS[S.caseMat], F = finOf(S);
  const k = Math.min(c.width / (g.D + 18), c.height / (g.T + 9)); PXMM = k;
  x.setTransform(k,0,0,-k,c.width/2 - 2*k, c.height - 3.2*k);
  x.clearRect(-500,-500,1000,1000);
  const band = (y0, h, w0, w1, fill) => { x.beginPath(); x.moveTo(-w0,y0); x.lineTo(w0,y0); x.lineTo(w1,y0+h); x.lineTo(-w1,y0+h); x.closePath(); x.fillStyle = fill; x.fill(); };
  // lugs (closest pair)
  x.fillStyle = metalGrad(x,m,0,g.cb+g.midH,0,-2,F.lug);
  [-1,1].forEach(s => { x.beginPath(); x.rect(s>0 ? g.lugW/2 : -g.lugW/2-g.lugT, -1.4, g.lugT, g.midH*.8+1.4); x.fill(); });
  band(0, g.cb, g.cr*.8, g.cr*.86, metalGrad(x,m,0,0,0,g.cb));
  let y = g.cb; band(y, g.midH, g.cr, g.cr, metalGrad(x,m,0,y,0,y+g.midH,F.mid === 'poly' ? 'brushed' : F.mid));
  x.fillStyle = metalGrad(x,m,0,y+g.midH/2+g.cd/2,0,y+g.midH/2-g.cd/2); x.fillRect(g.cr, y+g.midH/2-g.cd/2, g.cl, g.cd);
  if (S.crownGuards){ x.fillStyle = metalGrad(x,m,0,y+g.midH,0,y); x.fillRect(g.cr-.5, y+g.midH/2-g.cd/2-2, 2.2, 1.6); x.fillRect(g.cr-.5, y+g.midH/2+g.cd/2+.4, 2.2, 1.6); }
  x.setLineDash([.6,.5]); x.lineWidth = .12; x.strokeStyle = 'rgba(201,164,92,.9)'; x.strokeRect(-g.R*.92, g.cb, g.R*1.84, g.mv.t); x.setLineDash([]);
  txt(x, `${g.mv.name} · ${g.mv.t} mm`, 0, g.cb + g.mv.t/2, Math.min(1.6, g.mv.t*.45), 'Inter, sans-serif', { weight:600, color:'#1b1b1b' });
  y += g.midH; band(y, g.bh, g.bzO, g.bzO - .5, g.insert ? S.bezelC1 : metalGrad(x,m,0,y,0,y+g.bh));
  y += g.bh;
  x.fillStyle = 'rgba(190,215,235,.55)';
  if (S.crystal === 'flat') x.fillRect(-g.bzI, y-.3, 2*g.bzI, g.cry+.3);
  else { const base = S.crystal === 'box' ? 1.5 : 0, dome = g.cry - base; x.beginPath(); x.moveTo(-g.bzI, y-.3); x.lineTo(-g.bzI, y+base); x.quadraticCurveTo(0, y+base+dome*2, g.bzI, y+base); x.lineTo(g.bzI, y-.3); x.closePath(); x.fill(); }
  // dimension
  const dx = -g.cr - 4; x.strokeStyle = '#c9a45c'; x.lineWidth = .15; line(x,[dx,0],[dx,g.T]); line(x,[dx-1,0],[dx+1,0]); line(x,[dx-1,g.T],[dx+1,g.T]);
  txt(x, g.T.toFixed(1), dx-1.6, g.T/2, 2.2, 'Inter, sans-serif', { weight:700, color:'#e8cf97', rot:-PI/2 });
}
function drawBack(target){
  const c = target || $('#back'), r = c.getBoundingClientRect(); sizeCanvas(c, r.width || 220, r.height || 220);
  const x = c.getContext('2d'), g = geo(S), m = MATS[S.caseMat];
  const k = Math.min(c.width, c.height) / (g.D + 3); PXMM = k;
  x.setTransform(k,0,0,-k,c.width/2,c.height/2); x.clearRect(-500,-500,1000,1000);
  x.beginPath(); poly(x, caseOutline(g)); x.fillStyle = metalGrad(x,m,-g.cr,g.cr,g.cr,-g.cr); x.fill();
  const rb = g.cr*.86;
  if (S.caseback === 'display'){
    x.beginPath(); x.arc(0,0,rb,0,TAU); x.fillStyle = metalGrad(x,m,rb,rb,-rb,-rb,'brushed'); x.fill();
    const rg = rb*.8; x.save(); x.scale(-1,1); drawMovement(x, S, rg, .9); x.restore();
    x.save(); x.beginPath(); x.arc(0,0,rg,0,TAU); x.clip(); const gl = x.createLinearGradient(-rg,rg,rg,-rg); gl.addColorStop(0,'rgba(255,255,255,.25)'); gl.addColorStop(.4,'rgba(255,255,255,0)'); x.fillStyle = gl; x.fillRect(-rg,-rg,2*rg,2*rg); x.restore();
    for (let i = 0; i < 6; i++){ const [px,py] = polar(rb*.9, i/6*TAU + .26); x.beginPath(); circ(x,px,py,.5); x.fillStyle = m.c[3]; x.fill(); }
  } else drawEngraving(x, S, rb);
}

/* ---------------- enlarged profile / caseback ---------------- */
function openZoom(kind){
  $('#zoom').hidden = false; $('#zoomCap').textContent = kind === 'profile' ? 'Profile · stack height' : S.caseback === 'display' ? 'Display back' : 'Engraved back';
  const c = $('#zoomCanvas'); c.className = kind; kind === 'profile' ? drawProfile(c) : drawBack(c); invalidate();
}
$('#zoom').addEventListener('click', e => { if (!e.target.closest('.zoom-box')) $('#zoom').hidden = true; });
document.querySelectorAll('.thumbs figure').forEach(f => f.onclick = () => openZoom(f.dataset.view));

/* ---------------- export names ---------------- */
// <dial>-<subdial>-GC-TIME-render-MM-DD-HH-MM-SS.<ext>
function exportName(ext){
  const slug = t => t.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const d = new Date(), p = n => String(n).padStart(2, '0');
  const parts = [slug(brandLabel(S)), S.subShow ? slug(S.subtitle || '') : ''].filter(Boolean);
  return `${parts.join('-')}${parts.length ? '-' : ''}GC-TIME-render-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.${ext}`;
}

/* ---------------- spec sheet (one A4 portrait page) ---------------- */
function refCode(){ let h = 0; const s = JSON.stringify(S); for (let i = 0; i < s.length; i++) h = (h*31 + s.charCodeAt(i)) >>> 0; return 'GC-' + (h % 9000 + 1000) + '.' + (h >> 20 & 0xff).toString(16).toUpperCase().padStart(2,'0'); }
const sw = c => `<span class="sw" style="background:${c}"></span>`;
const L = (arr, key) => (arr.find(o => String(o[0]) === String(key)) || [0, key])[1];
const optsOf = k => fieldOf(k).opts;
function specHTML(){
  const g = geo(S), M = MATS[S.caseMat], mv = g.mv, hm = HMATS[S.handMetal], mk = HMATS[S.markerMetal], strapName = L(optsOf('strap'), S.strap);
  // front image
  const f = document.createElement('canvas'); f.width = 900; f.height = 1100; const fx = f.getContext('2d'), kk = f.height/98; PXMM = kk;
  fx.setTransform(kk,0,0,-kk,f.width/2,f.height/2); drawStrap(fx,S,g,1); drawStrap(fx,S,g,-1); drawCase(fx,S,g); drawBezel(fx,S,g);
  fx.save(); fx.beginPath(); fx.arc(0,0,g.bzI,0,TAU); fx.clip(); fx.fillStyle = shade(S.dialColor,-.3); fx.fill(); drawDial(fx,S,g,'full'); fx.restore();
  drawHands(fx,S,g,{ h:(10+10/60)/12*TAU, m:10/60*TAU, s:32/60*TAU }); drawCyclops(fx,S,g); drawGlare(fx,S,g);
  const b = document.createElement('canvas'); Object.defineProperty(b,'getBoundingClientRect',{ value:() => ({ width:560, height:560 }) }); drawBack(b);
  const stack = [['Caseback', g.cb, '#6d6a63'], ['Mid-case / movement', g.midH, '#9a7a3a'], ['Bezel', g.bh, '#3c3a36'], ['Crystal', g.cry, '#6f93b3']];
  const edge = S.edgeProfile === 'sharp' ? 'sharp knife edges' : S.edgeProfile === 'chamfer' ? `${(+S.edgeBreak).toFixed(2)} mm polished chamfers` : `${(+S.edgeBreak).toFixed(2)} mm edge breaks`;
  const parts = [
    ['Case middle', `${g.C.name}. ${M.name}, ${L(optsOf('caseFinish'), S.caseFinish).toLowerCase()}, ${edge}.`, `Ø${g.D} × ${g.midH.toFixed(1)} mm`],
    ['Lugs', `${{ straight:'Straight tapered', facet:'Faceted, flat-topped', lyre:'Twisted lyre', oyster:'Softly curved', cushion:'Short integrated' }[g.C.lug]}, drilled for spring bars.`, `${g.lugW} mm · ${g.l2l} mm L2L`],
    ['Bezel', `${L(optsOf('bezelType'), S.bezelType)}${g.insert ? ', unidirectional 120-click' : ''}, ${M.name}.`, `Ø${(2*g.bzO).toFixed(1)} · ${g.bzW.toFixed(1)} mm wide`],
    ...(g.insert ? [['Bezel insert', `${S.insertMat === 'ceramic' ? 'Ceramic (ZrO₂), polished' : 'Anodised aluminium'} ${sw(S.bezelC1)}${S.bezelType === 'gmt' ? sw(S.bezelC2) : ''} with ${sw(S.bezelNum)} graduations${S.bezelType === 'diver' ? ', lume pip' : ''}.`, `${g.bh.toFixed(1)} mm tall`]] : []),
    ['Crystal', `${L(optsOf('crystal'), S.crystal)}${S.crystal === 'hesalite' ? '' : ', inner AR coating'}${S.cyclops && S.date !== 'none' ? ', 2.5× cyclops' : ''}.`, `${g.cry.toFixed(1)} mm rise`],
    ['Dial', `${sw(S.dialColor)}${S.dialColor.toUpperCase()} · ${L(optsOf('dialTex'), S.dialTex)}${+S.fume > 0 ? `, fumé ${Math.round(S.fume*100)}%` : ''}, shine ${Math.round(S.shine*100)}%.`, `Ø${(2*g.R).toFixed(1)} × 0.4 mm`],
    ['Hour markers', `${L(optsOf('markers'), S.markers)}${S.markers !== 'none' ? `, ${mk.name}` : ''}${['arabic','roman','explorer','flieger'].includes(S.markers) ? `, numerals in ${S.numeralFont}` : ''}.`, S.markers === 'none' ? '—' : '12 positions'],
    ['Minute track', `${L(optsOf('track'), S.track)}, printed ${sw(printC(S))}${printC(S)}.`, S.track === 'none' ? '—' : '60 divisions'],
    ['Hands', `${L(optsOf('hands'), S.hands)} hour & minute, ${hm.name}${S.lume ? ', lumed' : ''}.`, `${(g.R*.6).toFixed(1)} / ${(g.R*.88).toFixed(1)} mm`],
    ['Seconds hand', S.seconds ? `${L(optsOf('secStyle'), S.secStyle)} tip ${sw(S.secColor)}, ${mv.motion === 'glide' ? 'gliding motion' : mv.motion === 'tick' ? 'one-second steps' : mv.motion + ' beats per second'}.` : 'None.', S.seconds ? `${(g.R*.93).toFixed(1)} mm` : '—'],
    ['Date', S.date === 'none' ? 'No date.' : `Window at ${L(optsOf('date'), S.date)}, ${S.dateWheel === 'dial' ? 'dial-matched' : S.dateWheel} disc${S.dateFrame ? ', applied frame' : ''}.`, S.date === 'none' ? '—' : 'Quickset'],
    ['Dial print', `“${esc(brandLines(S).join(' / '))}” in ${S.brandFont}${S.subShow && S.subtitle ? `; “${esc(S.subtitle.toUpperCase())}” above 6` : ''}.`, `${(+S.brandSize).toFixed(1)} mm`],
    ['Luminous material', S.lume ? `${LUME[S.lumeType].name} on hands and markers.` : 'None.', S.lume ? 'Grade A' : '—'],
    ['Crown', `${L(optsOf('crown'), S.crown)}${S.crown === 'screw' ? ', triple-gasket tube' : ''}${S.crown === 'cabochon' ? ` with ${sw(S.gemColor)} cabochon` : ''}${S.crownGuards ? ', crown guards' : ''}.`, `Ø${g.cd.toFixed(1)} × ${g.cl.toFixed(1)} mm`],
    ['Movement', `Cal. ${mv.cal} — ${mv.name}, ${mv.freq}, ${mv.jewels} jewels.`, `${mv.t} mm thick`],
    ['Caseback', S.caseback === 'display' ? 'Screw-down, sapphire display window.' : `Screw-down, solid, ${S.engraveText ? `engraved “${esc(S.engraveText)}”, ` : ''}${L(optsOf('emblem'), S.emblem).toLowerCase()} motif.`, `${g.cb.toFixed(1)} mm`],
    ['Gaskets', 'Nitrile O-rings at caseback, crystal, crown tube.', '×3'],
    ['Spring bars', 'Double-shoulder, 316L.', `2 × ${g.lugW} mm, Ø1.8`],
    ['Strap / bracelet', `${strapName}${['oyster','jubilee','mesh'].includes(S.strap) ? `, ${M.name}${S.strap === 'oyster' ? `, ${S.braceletCenter} centre links` : ''}` : `, ${sw(S.strapColor)}${S.strapColor}${['leather','nato'].includes(S.strap) ? ` with ${sw(S.strapAccent)}${S.strap === 'nato' ? 'stripes' : 'stitching'}` : ''}`}.`, `${g.lugW} → ${Math.round(g.lugW*.8)} mm`],
    ['Clasp', `${CLASPS[S.clasp]}, ${['pin','deployant','butterfly'].includes(S.clasp) || ['oyster','jubilee','mesh'].includes(S.strap) ? M.name : 'stainless steel'}.`, S.clasp === 'glidelock' ? '+20 mm ext.' : '—'],
  ];
  const lines = brandLines(S), model = S.subShow && S.subtitle ? S.subtitle : g.C.name;
  return `<div class="a4" id="a4">
  <header class="a4-head">
    <div class="a4-names">
      <div class="a4-brand">${esc(lines[0] || 'GC-TIME')}${lines[1] ? ` <span>${esc(lines[1])}</span>` : ''}</div>
      <div class="a4-model">${esc(model)}</div>
      <div class="a4-sub">Technical specification · Ref. ${refCode()} · ${new Date().toLocaleDateString()}</div>
    </div>
    <div class="a4-dia"><b>${g.D}<small>mm</small></b><span>case diameter</span></div>
  </header>
  <section class="a4-hero">
    <figure class="a4-front"><img src="${f.toDataURL()}"><figcaption>Front · 10:10</figcaption></figure>
    <div class="a4-right">
      <figure class="a4-back"><img src="${b.toDataURL()}"><figcaption>${S.caseback === 'display' ? 'Display back' : 'Engraved back'}</figcaption></figure>
      <div class="a4-big">${[['Lug-to-lug', g.l2l], ['Thickness', g.T.toFixed(1)], ['Lug width', g.lugW]].map(([a,v]) => `<div><b>${v}<small>mm</small></b><span>${a}</span></div>`).join('')}</div>
    </div>
  </section>
  <h2>Key figures</h2>
  <div class="kv">${[['Material', M.name], ['Water resistance', waterRes(g) + ' m / ' + waterRes(g)/10 + ' bar'], ['Est. weight', weight(g) + ' g'], ['Movement', `${mv.name} · Cal. ${mv.cal}`], ['Power reserve', mv.pr], ['Accuracy', mv.acc]].map(([a,v]) => `<div><small>${a}</small><b>${v}</b></div>`).join('')}</div>
  <h2>Thickness stack</h2>
  <div class="stack">${stack.map(([n,v,c]) => `<div style="flex:${v};background:${c}">${n} ${v.toFixed(1)}</div>`).join('')}</div>
  <h2>Bill of parts</h2>
  <table class="parts"><thead><tr><th>#</th><th>Part</th><th>Specification</th><th>Dimensions</th></tr></thead><tbody>
  ${parts.map(([n,d,dim], i) => `<tr><td>${String(i+1).padStart(2,'0')}</td><td>${n}</td><td>${d}</td><td>${dim}</td></tr>`).join('')}
  </tbody></table>
  <div class="foot"><span>GC-TIME · Gigacook Horology · concept specification</span><span>${refCode()}</span></div>
  </div>`;
}
function fitSheet(){ const w = $('#sheetWrap'), k = Math.min(1, (innerWidth - 24) / 794); w.style.setProperty('--k', k); w.style.height = 1123*k + 'px'; }
function openSpec(){ $('#sheet').innerHTML = specHTML(); $('#spec').hidden = false; fitSheet(); invalidate(); }
function closeSpec(){ $('#spec').hidden = true; }
let pdfLib = null;
async function downloadPDF(){
  const btn = $('#specPdf'); btn.disabled = true; btn.textContent = 'Preparing PDF…';
  try {
    pdfLib = pdfLib || await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js'; s.onload = () => ok(window.html2pdf); s.onerror = no; document.head.appendChild(s); });
    await document.fonts.ready;
    await pdfLib().set({ margin:0, filename:exportName('pdf'), image:{ type:'jpeg', quality:.95 }, html2canvas:{ scale:2.5, backgroundColor:'#f5f2ea' }, jsPDF:{ unit:'mm', format:'a4', orientation:'portrait' }, pagebreak:{ mode:[] } }).from($('#a4')).save();
  } catch (e){ toast('Could not load the PDF library — are you offline?'); }
  btn.disabled = false; btn.textContent = 'Download PDF';
}
$('#specPdf').onclick = downloadPDF;
$('#specClose').onclick = closeSpec;
addEventListener('resize', () => { if (!$('#spec').hidden) fitSheet(); });
$('#spec').addEventListener('click', e => { if (e.target.id === 'spec') closeSpec(); });
addEventListener('keydown', e => { if (e.key === 'Escape'){ if (!$('#zoom').hidden) $('#zoom').hidden = true; else if (!$('#spec').hidden) closeSpec(); else if (window.Render3D && $('#welcome').hidden) Render3D.close(); } });

/* ---------------- top bar ---------------- */
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800); }
function applyState(n){ S = { ...BASE, ...n }; fixClasp(); FIELDS.forEach(f => f.optKey = ''); refreshPanel(); invalidate(); }
const menu = (btn, pop) => {
  btn.onclick = e => { e.stopPropagation(); const open = pop.hidden; document.querySelectorAll('.pop').forEach(p => p.hidden = true); pop.hidden = !open; };
  document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target)) pop.hidden = true; });
};
PRESETS.forEach(([name, p]) => {
  const n = { ...BASE, ...p }, b = document.createElement('button');
  b.innerHTML = `${name}<small>${n.diameter} mm · ${MATS[n.caseMat].short}</small>`;
  b.onclick = () => { applyState(p); $('#presets').hidden = true; toast(name); }; $('#presets').appendChild(b);
});
menu($('#btnPresets'), $('#presets'));
menu($('#btnInfo'), $('#infoPop'));
$('#infoPop').innerHTML = `<ol>${$('#welcomeInfo').innerHTML}</ol>`;
$('#btnRandom').onclick = () => {
  const n = { ...S }, pick = a => a[Math.floor(Math.random()*a.length)];
  for (const f of FIELDS){
    if (f.t === 'chips'){ const o = typeof f.opts === 'function' ? f.opts(n) : f.opts; n[f.k] = pick(o)[0]; }
    else if (f.t === 'color') n[f.k] = pick(f.sw);
    else if (f.t === 'toggle' && !['brandItalic'].includes(f.k)) n[f.k] = Math.random() < .5;
    else if (f.t === 'range' && !['bezelW','brandY','brandSize','brandSpacing','brandLine2','l2l','lugW'].includes(f.k)) n[f.k] = +(f.min + Math.round(Math.random()*(f.max-f.min)/f.step)*f.step).toFixed(2);
  }
  n.fume = Math.random() < .7 ? 0 : n.fume; n.bezelW = { smooth:1.2, fluted:2.2, diver:3.6, gmt:3.6, tachy:3.2 }[n.bezelType];
  n.brandWeight = +n.brandWeight; n.subtitle = MOVEMENTS[n.movement].sub; n.brandFont = pick(FONTS)[0]; n.l2l = n.lugW = 0;
  applyState(n); toast('Randomized');
};
$('#btnShare').onclick = async () => {
  const url = location.href.split('#')[0] + '#' + btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  history.replaceState(null, '', url);
  try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch (e) { toast('Link is in the address bar'); }
};
$('#btnSpec').onclick = openSpec;
$('#rSpec').onclick = openSpec;
$('#btnRender').onclick = () => { if (window.Render3D) Render3D.open(S); };

/* ---------------- welcome ---------------- */
function showWelcome(){
  const g = geo(STANDARD);
  $('#wSize').innerHTML = `<b>${g.D}<small>mm</small></b><span>${MATS[STANDARD.caseMat].name} · ${g.l2l} mm lug-to-lug · ${g.T.toFixed(1)} mm thick</span>`;
  $('#welcome').hidden = false;
  if (window.Render3D) Render3D.open(STANDARD, { welcome:true });
}
$('#btnEnter').onclick = () => { $('#welcome').hidden = true; if (window.Render3D) Render3D.close(); applyState(STANDARD); };

/* ---------------- boot ---------------- */
buildPanel();
FONTS.forEach(([n]) => [400,700].forEach(w => document.fonts.load(`${w} 40px ${fam(n)}`).then(invalidate, () => {})));
['Oswald','Montserrat','Inter'].forEach(n => document.fonts.load(`500 40px ${fam(n)}`).then(invalidate, () => {}));
document.fonts.ready.then(invalidate);
requestAnimationFrame(frame);
if (!fromLink) addEventListener('DOMContentLoaded', showWelcome);
