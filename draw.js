'use strict';
/* ================= catalog + geometry + 2D drawing (shared with the 3D renderer) ================= */
const TAU = Math.PI * 2, PI = Math.PI, D2R = PI / 180;

const MATS = {
  steel:  { short:'Steel',       name:'316L stainless steel', c:['#ffffff','#9ea4ab','#e4e7ea','#6b7178','#cfd3d7'], base:'#c8ccd1', dens:8.0 },
  ti:     { short:'Titanium',    name:'Grade 5 titanium',     c:['#e3e4e5','#85898d','#bfc2c4','#62666a','#aeb1b4'], base:'#a1a5a9', dens:4.43 },
  gold:   { short:'Yellow gold', name:'18k yellow gold',      c:['#fff6d2','#c39a42','#f2d991','#8f6a22','#e5c67a'], base:'#e3c070', dens:15.5 },
  rose:   { short:'Rose gold',   name:'18k rose gold',        c:['#ffe6da','#c2836a','#f2c2ab','#8f5540','#e2ad96'], base:'#dea38a', dens:15.1 },
  dlc:    { short:'Black DLC',   name:'DLC-coated steel',     c:['#6a6b6f','#161719','#3a3b3e','#0b0b0c','#2b2c2f'], base:'#29292c', dens:8.0 },
  bronze: { short:'Bronze',      name:'CuSn8 bronze',         c:['#f4d6a6','#93683a','#d7ae74','#65431f','#c09560'], base:'#b58a57', dens:8.8 },
};
const HMATS = {
  steel: MATS.steel, gold: MATS.gold, rose: MATS.rose,
  black: { short:'Black',  name:'black lacquered',   c:['#4a4a4a','#0d0d0d','#2a2a2a','#050505','#1c1c1c'], base:'#161616', paint:1 },
  blued: { short:'Blued',  name:'flame-blued steel', c:['#7d9cf0','#1b2c78','#4868cc','#111d52','#2f4fae'], base:'#2c4aa6' },
  white: { short:'White',  name:'white lacquered',   c:['#ffffff','#dcdcdc','#f5f5f5','#c8c8c8','#ebebeb'], base:'#f0f0f0', paint:1 },
};
const CASES = {
  dress:   { name:'Classic dress',            l2l:1.2,  lugT:1.9, lug:'straight', wr:30,  note:'slim, open proportions' },
  gs:      { name:'44GS-inspired',            l2l:1.17, lugT:2.8, lug:'facet',    wr:100, note:'flat zaratsu-style facets, sharp lugs' },
  omega:   { name:'Vintage Omega-inspired',   l2l:1.22, lugT:2.2, lug:'lyre',     wr:30,  note:'twisted lyre lugs' },
  oyster:  { name:'Old Oyster-inspired',      l2l:1.2,  lugT:2.6, lug:'oyster',   wr:100, note:'robust, softly curved lugs' },
  diver:   { name:'Tool diver',               l2l:1.2,  lugT:3.0, lug:'oyster',   wr:300, note:'thick mid-case, crown guards', extraH:1.5 },
  cushion: { name:'Cushion 70s',              l2l:1.1,  lugT:3.2, lug:'cushion',  wr:200, note:'squircle case, short lugs', cushion:true },
};
const MOVEMENTS = {
  quartz: { name:'Quartz',            cal:'Q-2',   t:2.5, freq:'32,768 Hz',             jewels:6,  pr:'4-year battery', acc:'±10 s / year',   sub:'QUARTZ',        motion:'tick' },
  manual: { name:'Hand-wound',        cal:'M-3',   t:3.2, freq:'21,600 vph (3 Hz)',     jewels:17, pr:'46 h',           acc:'+6 / −4 s / day', sub:'MANUAL',        motion:6 },
  auto:   { name:'Automatic',         cal:'A-5',   t:4.8, freq:'28,800 vph (4 Hz)',     jewels:25, pr:'70 h',           acc:'+5 / −3 s / day', sub:'AUTOMATIC',     motion:8 },
  hibeat: { name:'Hi-Beat automatic', cal:'HB-36', t:5.9, freq:'36,000 vph (5 Hz)',     jewels:37, pr:'55 h',           acc:'+5 / −3 s / day', sub:'HI-BEAT 36000', motion:10 },
  spring: { name:'Spring Drive',      cal:'SD-9',  t:5.1, freq:'32,768 Hz glide wheel', jewels:30, pr:'72 h',           acc:'±1 s / day',      sub:'SPRING DRIVE',  motion:'glide' },
};
const LUME = {
  c3:      { name:'Super-LumiNova C3',   c:'#e6efcf', glow:'#6dff7a' },
  bgw9:    { name:'Super-LumiNova BGW9', c:'#eef3f3', glow:'#6fd0ff' },
  vintage: { name:'Vintage (faux patina)', c:'#e3c98f', glow:'#b0ff6a' },
};
const FONTS = [
  ['Cinzel','Cinzel, serif'], ['Playfair Display','"Playfair Display", serif'], ['Cormorant Garamond','"Cormorant Garamond", serif'],
  ['Bodoni Moda','"Bodoni Moda", serif'], ['Montserrat','Montserrat, sans-serif'], ['Inter','Inter, sans-serif'],
  ['Josefin Sans','"Josefin Sans", sans-serif'], ['Oswald','Oswald, sans-serif'], ['Michroma','Michroma, sans-serif'],
  ['Orbitron','Orbitron, sans-serif'], ['Great Vibes','"Great Vibes", cursive'], ['Pinyon Script','"Pinyon Script", cursive'],
];
const fam = id => (FONTS.find(f => f[0] === id) || FONTS[0])[1];
const ROMAN = ['XII','I','II','III','IIII','V','VI','VII','VIII','IX','X','XI'];

/* ---------------- small utils ---------------- */
function rng(seed){ return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hexRgb(h){ h = h.replace('#',''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function lum(h){ const [r,g,b] = hexRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126*r + .7152*g + .0722*b; }
function shade(h, f){ const [r,g,b] = hexRgb(h), t = f < 0 ? 0 : 255, p = Math.abs(f); return `rgb(${Math.round((t-r)*p+r)},${Math.round((t-g)*p+g)},${Math.round((t-b)*p+b)})`; }
const printC = S => S.printColor === 'auto' ? (lum(S.dialColor) > .3 ? '#161616' : '#f1f1f1') : S.printColor;

function poly(ctx, p){ ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); }
function circ(ctx, x, y, r){ ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
function line(ctx, a, b){ ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
function circlePts(r, n = 40, cx = 0, cy = 0){ const P = []; for (let i = 0; i < n; i++){ const t = i / n * TAU; P.push([cx + r*Math.cos(t), cy + r*Math.sin(t)]); } return P; }
function rot(pts, a){ const c = Math.cos(a), s = Math.sin(a); return pts.map(([x,y]) => [x*c + y*s, -x*s + y*c]); } // clockwise by clock-angle a (y-up)
function polar(r, a){ return [r*Math.sin(a), r*Math.cos(a)]; } // clock angle: 0 = 12 o'clock, clockwise
function bbox(p){ let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for (const [x,y] of p){ x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); } return {x0,x1,y0,y1}; }
function rrect(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); }
function squircle(a, n = 5, N = 160){ const P = []; for (let i = 0; i < N; i++){ const t = i / N * TAU, c = Math.cos(t), s = Math.sin(t); P.push([a*Math.sign(c)*Math.abs(c)**(2/n), a*Math.sign(s)*Math.abs(s)**(2/n)]); } return P; }

let PXMM = 10; // device px per mm of the drawing currently in progress (for shadow sizes)
function shadow(ctx, blur, dy, a = .4){ ctx.shadowColor = `rgba(0,0,0,${a})`; ctx.shadowBlur = blur*PXMM; ctx.shadowOffsetX = dy*.4*PXMM; ctx.shadowOffsetY = dy*PXMM; }
function noShadow(ctx){ ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }

function metalGrad(ctx, m, x0, y0, x1, y1, mode = 'poly'){
  const g = ctx.createLinearGradient(x0, y0, x1, y1), c = m.c;
  if (mode === 'facet'){ g.addColorStop(0,c[2]); g.addColorStop(.5,c[0]); g.addColorStop(.5,c[3]); g.addColorStop(1,c[1]); }
  else if (mode === 'brushed'){ g.addColorStop(0,c[4]); g.addColorStop(.4,c[2]); g.addColorStop(.7,c[4]); g.addColorStop(1,c[1]); }
  else { g.addColorStop(0,c[0]); g.addColorStop(.28,c[1]); g.addColorStop(.5,c[2]); g.addColorStop(.72,c[3]); g.addColorStop(1,c[4]); }
  return g;
}
// text in a y-up mm coordinate system; size in mm
function txt(ctx, str, x, y, size, font, o = {}){
  ctx.save(); ctx.translate(x, y); ctx.scale(1, -1); if (o.rot) ctx.rotate(o.rot);
  const k = size / 100; ctx.scale(k, k);
  ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 400} 100px ${font}`;
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
  const ls = (o.ls || 0) * 100; try { ctx.letterSpacing = ls + 'px'; } catch (e) {}
  const dx = o.align ? 0 : ls / 2;
  if (o.emboss){ ctx.fillStyle = o.emboss; ctx.fillText(str, dx + 4, 4); }
  if (o.stroke){ ctx.lineWidth = o.strokeW / k; ctx.strokeStyle = o.stroke; ctx.strokeText(str, dx, 0); }
  ctx.fillStyle = o.color || '#000'; ctx.fillText(str, dx, 0);
  ctx.restore();
}
function textOnCircle(ctx, str, r, size, font, ca, o = {}){
  ctx.save(); ctx.font = `${o.weight || 400} 100px ${font}`; const k = size / 100, chars = [...str];
  const ws = chars.map(ch => ctx.measureText(ch).width * k + (o.ls || 0) * size);
  const tot = ws.reduce((a, b) => a + b, 0), span = tot / r, dir = o.bottom ? -1 : 1;
  let acc = 0;
  chars.forEach((ch, i) => { const a = ca + dir * (-span/2 + (acc + ws[i]/2) / r); acc += ws[i];
    const [x, y] = polar(r, a); txt(ctx, ch, x, y, size, font, { ...o, ls:0, rot: o.bottom ? a + PI : a }); });
  ctx.restore();
}

/* ---------------- geometry (all in mm, y-up, origin = dial centre) ---------------- */
const INSERT_BEZELS = ['diver','gmt','tachy'];
function geo(S){
  const C = CASES[S.caseStyle], D = +S.diameter, cr = D / 2, cs = D / 40;
  const lugW = Math.max(16, Math.round(D * .5 / 2) * 2);
  const l2l = +(D * C.l2l).toFixed(1), yE = l2l / 2;
  const insert = INSERT_BEZELS.includes(S.bezelType);
  const bzO = C.cushion ? cr * .84 : insert ? cr + .15 : cr - .3;
  const bzW = Math.min(+S.bezelW, bzO * .25), bzI = bzO - bzW, R = bzI - .6;
  const mv = MOVEMENTS[S.movement];
  const cb = S.caseback === 'display' ? 2.0 : 1.2;
  const midH = mv.t + 2.2 + (C.extraH || 0);
  const bh = { smooth:1.1, fluted:1.6, diver:2.3, gmt:2.3, tachy:1.9 }[S.bezelType];
  const cry = { flat:.3, domed:1.1, box:2.4, hesalite:1.7 }[S.crystal];
  const T = cb + midH + bh + cry;
  const cw = { smooth:[5.4,2.8], fluted:[6,3], onion:[5.2,3.4], screw:[7,3.4], cabochon:[5.6,3.2], pilot:[8,4.2] }[S.crown];
  return { C, D, cr, cs, lugW, l2l, yE, insert, bzO, bzW, bzI, R, cb, midH, bh, cry, T, mv,
    cd: cw[0]*cs, cl: cw[1]*cs, lugT: C.lugT*cs, y0: cr*.45 };
}
function lugPoly(g){
  const xi = g.lugW/2, xo = xi + g.lugT, y0 = g.y0, yE = g.yE, N = 14, P = [];
  switch (g.C.lug){
    case 'facet':   return [[xi,y0],[xo+3.2,y0],[xo+.9,yE-3.2],[xo,yE],[xi,yE]];
    case 'cushion': return [[xi,y0],[xo+2.5,y0],[xo+1.2,yE-.8],[xo+.6,yE],[xi,yE]];
    case 'lyre':
      for (let i = 0; i <= N; i++){ const u = i/N; P.push([xo + 2.8*(1-u)**2 + .9*Math.sin(PI*u) - .2*u, y0 + (yE-y0)*u]); }
      for (let i = N; i >= 0; i--){ const u = i/N; P.push([xi + .7*Math.sin(PI*u), y0 + (yE-y0)*u]); }
      return P;
    case 'oyster':
      for (let i = 0; i <= N; i++){ const u = i/N; P.push([xo + 2.2*(1-u)**1.7, y0 + (yE-y0-.8)*u]); }
      P.push([xo-.5, yE], [xi, yE], [xi, y0]); return P;
    default: return [[xi,y0],[xo+1.2,y0],[xo+.25,yE-1.4],[xo-.2,yE],[xi,yE]];
  }
}
const mirror4 = p => [p, p.map(([x,y]) => [-x,y]), p.map(([x,y]) => [x,-y]), p.map(([x,y]) => [-x,-y])];
const caseOutline = g => g.C.cushion ? squircle(g.cr) : circlePts(g.cr, 128);
function guardPolys(g){
  const y1 = g.cd/2 + .3, c = g.cr;
  const top = [[c-2.2, y1+4],[c-1.2, y1],[c+g.cl*.72, y1],[c+g.cl*.55, y1+1.4],[c+.2, y1+3.6]];
  return [top, top.map(([x,y]) => [x,-y])];
}
function datePos(S, g){
  const R = g.R;
  if (S.date === '3') return { x:R*.68, y:0, rot:0 };
  if (S.date === '6') return { x:0, y:-R*.64, rot:0 };
  if (S.date === '430'){ const [x,y] = polar(R*.64, 135*D2R); return { x, y, rot:-PI/4 }; }
  return null;
}

/* ---------------- hands ---------------- */
function handParts(style, which, R){
  const hr = which === 'h', L = R*(hr ? .6 : .88), W = R*(hr ? .085 : .062), tl = R*.12, P = [];
  const M = (pts, holes = [], facet) => P.push({ k:'m', pts, holes, facet }), Lu = pts => P.push({ k:'l', pts, holes:[] });
  const pencil = () => { M([[-W*.28,-tl],[W*.28,-tl],[W*.28,L*.9],[0,L],[-W*.28,L*.9]]); Lu([[-W*.14,L*.22],[W*.14,L*.22],[W*.14,L*.88],[-W*.14,L*.88]]); };
  switch (style){
    case 'dauphine': M([[0,-tl],[W*.55,L*.1],[0,L],[-W*.55,L*.1]], [], true); break;
    case 'sword':
      M([[-W*.2,-tl],[W*.2,-tl],[W*.2,L*.06],[W*.55,L*.3],[W*.42,L*.8],[0,L],[-W*.42,L*.8],[-W*.55,L*.3],[-W*.2,L*.06]], [], true);
      Lu([[0,L*.14],[W*.3,L*.32],[W*.22,L*.78],[0,L*.9],[-W*.22,L*.78],[-W*.3,L*.32]]); break;
    case 'baton':
      M([[-W*.3,-tl],[W*.3,-tl],[W*.3,L],[-W*.3,L]]); Lu([[-W*.15,L*.25],[W*.15,L*.25],[W*.15,L*.95],[-W*.15,L*.95]]); break;
    case 'leaf': {
      const pts = [], N = 24;
      for (let i = 0; i <= N; i++){ const u = i/N; pts.push([W*.55*Math.sin(PI*u**.8), L*u]); }
      for (let i = N-1; i > 0; i--){ const u = i/N; pts.push([-W*.55*Math.sin(PI*u**.8), L*u]); }
      M(pts, [], true); M([[-W*.12,-tl],[W*.12,-tl],[W*.12,L*.05],[-W*.12,L*.05]]); break; }
    case 'mercedes': {
      if (!hr){ pencil(); break; }
      const c = L*.72, rc = W*1.05, holes = [];
      M([[-W*.2,-tl],[W*.2,-tl],[W*.2,c-rc*.8],[-W*.2,c-rc*.8]]);
      for (let k = 0; k < 3; k++){
        const a0 = PI + k*TAU/3, sa = a0 + .33, ea = a0 + TAU/3 - .33, pc = polar(rc*.2, a0 + TAU/6), h = [[pc[0], pc[1]+c]];
        for (let j = 0; j <= 10; j++){ const q = polar(rc*.74, sa + (ea-sa)*j/10); h.push([q[0], q[1]+c]); }
        holes.push(h);
      }
      M(circlePts(rc, 40, 0, c), holes); holes.forEach(h => Lu(h));
      M([[-W*.42,c+rc*.85],[W*.42,c+rc*.85],[W*.1,L*.97],[0,L],[-W*.1,L*.97]]);
      Lu([[-W*.2,c+rc*1.1],[W*.2,c+rc*1.1],[0,L*.93]]); break; }
    case 'arrow':
      if (hr){ M([[-W*.2,-tl],[W*.2,-tl],[W*.2,L*.62],[-W*.2,L*.62]]); M([[-W,L*.58],[0,L*.64],[W,L*.58],[0,L]]); Lu([[-W*.5,L*.68],[W*.5,L*.68],[0,L*.9]]); }
      else { M([[-W*.22,-tl],[W*.22,-tl],[W*.22,L*.8],[-W*.22,L*.8]]); M([[-W*.7,L*.78],[0,L*.82],[W*.7,L*.78],[0,L]]); Lu([[-W*.1,L*.2],[W*.1,L*.2],[W*.1,L*.76],[-W*.1,L*.76]]); }
      break;
    case 'snowflake':
      if (!hr){ pencil(); break; }
      M([[-W*.2,-tl],[W*.2,-tl],[W*.2,L*.56],[-W*.2,L*.56]]); M([[-W*.8,L*.54],[W*.8,L*.54],[W*.8,L*.8],[-W*.8,L*.8]]); M([[-W*.35,L*.79],[W*.35,L*.79],[0,L]]);
      Lu([[-W*.58,L*.57],[W*.58,L*.57],[W*.58,L*.77],[-W*.58,L*.77]]); break;
  }
  return P;
}
function secParts(S, R){
  const w = R*.02, L = R*.93, tl = R*.24, P = [{ k:'m', pts:[[-w/2,-tl],[w/2,-tl],[w*.3,L],[-w*.3,L]], holes:[] }, { k:'m', pts:circlePts(R*.04,24,0,-tl*.7), holes:[] }];
  if (S.secStyle === 'lollipop'){ P.push({ k:'m', pts:circlePts(R*.05,28,0,L*.76), holes:[] }, { k:'l', pts:circlePts(R*.036,28,0,L*.76), holes:[] }); }
  if (S.secStyle === 'arrow'){ P.push({ k:'m', pts:[[-R*.045,L*.74],[R*.045,L*.74],[0,L*.9]], holes:[] }, { k:'l', pts:[[-R*.025,L*.76],[R*.025,L*.76],[0,L*.85]], holes:[] }); }
  P.push({ k:'m', pts:circlePts(R*.03,24), holes:[] });
  return P;
}
function handAngles(S, now = new Date()){
  const mv = MOVEMENTS[S.movement].motion;
  let sec = now.getSeconds() + now.getMilliseconds()/1000;
  if (mv === 'tick') sec = Math.floor(sec); else if (typeof mv === 'number') sec = Math.floor(sec*mv)/mv;
  const min = now.getMinutes() + sec/60, hr = now.getHours()%12 + min/60;
  return { h: hr/12*TAU, m: min/60*TAU, s: sec/60*TAU };
}

/* ---------------- markers ---------------- */
function markerSet(S, g){
  const R = g.R, items = [], texts = [], st = S.markers;
  if (st === 'none') return { items, texts };
  const lume = S.lume, rO = S.track === 'none' ? R*.93 : R*.88;
  const skip = i => (S.date === '3' && i === 3) || (S.date === '6' && i === 6);
  const rect = (w, len, r0, dx = 0) => [[dx-w/2,r0-len],[dx+w/2,r0-len],[dx+w/2,r0],[dx-w/2,r0]];
  const bar = (a, w, len, dx = 0) => { items.push({ a, k:'m', facet:true, pts:rect(w,len,rO,dx) }); if (lume) items.push({ a, k:'l', pts:rect(w*.5,len*.72,rO-len*.12,dx) }); };
  const tri = (a, w, len) => { items.push({ a, k:'m', pts:[[-w/2,rO],[w/2,rO],[0,rO-len]] }); if (lume) items.push({ a, k:'l', pts:[[-w*.32,rO-len*.12],[w*.32,rO-len*.12],[0,rO-len*.78]] }); };
  const dot = (a, r, rc) => { items.push({ a, k:'m', pts:circlePts(r,32,0,rc) }); if (lume) items.push({ a, k:'l', pts:circlePts(r*.72,32,0,rc) }); };
  const num = (i, s, r, size, radial) => { const a = i/12*TAU, [x,y] = polar(r, a); texts.push({ s, x, y, size, rot: radial ? a : 0 }); };
  for (let i = 0; i < 12; i++){
    if (skip(i)) continue; const a = i/12*TAU;
    switch (st){
      case 'baton': if (i === 0){ bar(a,R*.045,R*.17,-R*.035); bar(a,R*.045,R*.17,R*.035); } else bar(a,R*.05,R*.16); break;
      case 'wedge': { const w = R*.07, len = R*.18, n = i === 0 ? 2 : 1;
        for (let j = 0; j < n; j++){ const dx = n === 2 ? (j ? 1 : -1)*w*.62 : 0;
          items.push({ a, k:'m', facet:true, pts:[[-w/2+dx,rO],[w/2+dx,rO],[w*.08+dx,rO-len],[-w*.08+dx,rO-len]] });
          if (lume) items.push({ a, k:'l', pts:[[-w*.2+dx,rO-len*.1],[w*.2+dx,rO-len*.1],[dx,rO-len*.7]] }); }
        break; }
      case 'diver': if (i === 0) tri(a,R*.2,R*.2); else if (i%3 === 0) bar(a,R*.085,R*.2); else dot(a,R*.058,rO-R*.07); break;
      case 'explorer': if (i === 0) tri(a,R*.18,R*.18); else if (i%3 === 0) num(i,String(i),rO-R*.1,R*.2,false); else bar(a,R*.05,R*.15); break;
      case 'arabic': num(i, String(i || 12), R*.74, R*.16, false); break;
      case 'roman': num(i, ROMAN[i], R*.75, R*.13, true); break;
      case 'dots': if (i === 0) bar(a,R*.05,R*.12); else dot(a,R*.035,rO-R*.04); break;
      case 'minimal': if (i%3 === 0) bar(a,R*.055,R*.14); else items.push({ a, k:'p', pts:circlePts(R*.014,16,0,rO-R*.03) }); break;
    }
  }
  return { items, texts };
}

/* ---------------- dial ---------------- */
let NOISE = null;
function noisePattern(ctx){
  if (!NOISE){ const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), id = x.createImageData(256,256), r = rng(3);
    for (let i = 0; i < id.data.length; i += 4){ const v = r(), w = v > .5 ? 255 : 0; id.data[i] = id.data[i+1] = id.data[i+2] = w; id.data[i+3] = Math.abs(v-.5)*70; }
    x.putImageData(id,0,0); NOISE = c; }
  return ctx.createPattern(NOISE, 'repeat');
}
function tri3(p, ax, ay, bx, by, cx, cy){ p.moveTo(ax,ay); p.lineTo(bx,by); p.lineTo(cx,cy); p.closePath(); }
function dialBase(ctx, S, R, for3d){
  const sh = +S.shine * (for3d ? .65 : 1), r = rng(11), W = a => `rgba(255,255,255,${a})`, B = a => `rgba(0,0,0,${a})`;
  ctx.save(); ctx.beginPath(); ctx.arc(0,0,R,0,TAU); ctx.clip();
  ctx.fillStyle = S.dialColor; ctx.fillRect(-R,-R,2*R,2*R);
  switch (S.dialTex){
    case 'sunburst': {
      const g = ctx.createConicGradient(0,0,0), n = 72;
      for (let i = 0; i <= n; i++){ const th = i/n*TAU, v = Math.cos(2*(th+.5)); g.addColorStop(i/n, v > 0 ? W(.5*sh*v**2.5) : B(.42*sh*(-v)**2.5)); }
      ctx.fillStyle = g; ctx.fillRect(-R,-R,2*R,2*R);
      ctx.lineWidth = .035;
      for (let i = 0; i < 1100; i++){ const a = r()*TAU; ctx.strokeStyle = r() < .5 ? W(.04+.08*sh*r()) : B(.03+.05*r()); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*R, Math.sin(a)*R); ctx.stroke(); }
      break; }
    case 'paper': {
      ctx.save(); const s = .05; ctx.scale(s,s); ctx.fillStyle = noisePattern(ctx); ctx.fillRect(-R/s,-R/s,2*R/s,2*R/s); ctx.restore();
      for (let i = 0; i < 1800; i++){
        const x = (r()*2-1)*R, y = (r()*2-1)*R, a = r()*PI, l = .4 + r()*1.8, cx = Math.cos(a)*l, cy = Math.sin(a)*l, b = (r()-.5)*l*.6;
        ctx.lineWidth = .06 + r()*.12;
        ctx.strokeStyle = B(.05+.05*r()); ctx.beginPath(); ctx.moveTo(x-cx,y-cy-.05); ctx.quadraticCurveTo(x+b,y-b-.05,x+cx,y+cy-.05); ctx.stroke();
        ctx.strokeStyle = W(.1+.15*sh*r()); ctx.beginPath(); ctx.moveTo(x-cx,y-cy); ctx.quadraticCurveTo(x+b,y-b,x+cx,y+cy); ctx.stroke();
      }
      break; }
    case 'clous': {
      const p = 1.15, L = R*1.45, f = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      ctx.save(); ctx.rotate(PI/4);
      for (let x = -L; x < L; x += p) for (let y = -L; y < L; y += p){ const cx = x+p/2, cy = y+p/2; if (cx*cx+cy*cy > R*R*1.2) continue;
        tri3(f[0],x,y+p,x+p,y+p,cx,cy); tri3(f[1],x,y,x,y+p,cx,cy); tri3(f[2],x+p,y,x+p,y+p,cx,cy); tri3(f[3],x,y,x+p,y,cx,cy); }
      ctx.fillStyle = W(.12+.25*sh); ctx.fill(f[0]); ctx.fillStyle = W(.04+.08*sh); ctx.fill(f[1]); ctx.fillStyle = B(.12); ctx.fill(f[2]); ctx.fillStyle = B(.25); ctx.fill(f[3]);
      ctx.restore(); break; }
    case 'tapisserie': {
      const p = .95, gr = new Path2D(), hi = new Path2D();
      for (let x = -R; x <= R; x += p){ gr.moveTo(x,-R); gr.lineTo(x,R); gr.moveTo(-R,x); gr.lineTo(R,x); hi.moveTo(x+.14,-R); hi.lineTo(x+.14,R); hi.moveTo(-R,x-.14); hi.lineTo(R,x-.14); }
      ctx.lineWidth = .16; ctx.strokeStyle = B(.3); ctx.stroke(gr); ctx.lineWidth = .08; ctx.strokeStyle = W(.1+.2*sh); ctx.stroke(hi); break; }
    case 'cotes': {
      const w = 2.8;
      for (let x = -R-w; x < R; x += w){ const g = ctx.createLinearGradient(x,0,x+w,0); g.addColorStop(0,B(.18)); g.addColorStop(.45,W(.1+.25*sh)); g.addColorStop(.55,W(.1+.25*sh)); g.addColorStop(1,B(.18)); ctx.fillStyle = g; ctx.fillRect(x,-R,w,2*R); }
      break; }
    case 'linen': {
      ctx.lineWidth = .07;
      for (let x = -R; x < R; x += .2){
        ctx.strokeStyle = r() < .5 ? B(.04+.07*r()) : W(.03+.08*sh*r()); line(ctx,[x,-R],[x,R]);
        ctx.strokeStyle = r() < .5 ? B(.04+.07*r()) : W(.03+.08*sh*r()); line(ctx,[-R,x],[R,x]); }
      break; }
  }
  if (+S.fume > 0){ const g = ctx.createRadialGradient(0,0,R*.25,0,0,R); g.addColorStop(0,B(0)); g.addColorStop(1,B(.85*S.fume)); ctx.fillStyle = g; ctx.fillRect(-R,-R,2*R,2*R); }
  if (!for3d){ const g = ctx.createRadialGradient(-R*.4,R*.5,0,-R*.4,R*.5,R*1.3); g.addColorStop(0,W(.16*sh)); g.addColorStop(1,W(0)); ctx.fillStyle = g; ctx.fillRect(-R,-R,2*R,2*R); }
  ctx.restore();
}
function drawTrack(ctx, S, R, col){
  if (S.track === 'none') return;
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col;
  if (S.track === 'railway'){
    const r1 = R*.955, r2 = R*.99; ctx.lineWidth = .12;
    ctx.beginPath(); ctx.arc(0,0,r1,0,TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0,0,r2,0,TAU); ctx.stroke();
    for (let i = 0; i < 60; i++){ ctx.lineWidth = i%5 ? .1 : .28; line(ctx, polar(r1,i/60*TAU), polar(r2,i/60*TAU)); }
  } else if (S.track === 'hash'){
    for (let i = 0; i < 60; i++){ ctx.lineWidth = i%5 ? .14 : .38; line(ctx, polar(i%5 ? R*.95 : R*.915, i/60*TAU), polar(R*.99, i/60*TAU)); }
  } else {
    for (let i = 0; i < 60; i++){ const [x,y] = polar(R*.965, i/60*TAU); ctx.beginPath(); circ(ctx,x,y,i%5 ? .16 : .3); ctx.fill(); }
  }
  ctx.restore();
}
function drawMarkers(ctx, S, g, mode){
  const { items, texts } = markerSet(S, g), mm = HMATS[S.markerMetal], lc = LUME[S.lumeType].c;
  if (mode !== 'lume') for (const it of items){
    if (mode === 'tex' && it.k !== 'p') continue;
    if (it.k === 'l' && !S.lume) continue;
    ctx.save(); ctx.rotate(-it.a); ctx.beginPath(); poly(ctx, it.pts);
    if (it.k === 'm'){ const b = bbox(it.pts); shadow(ctx,.5,.35,.45); ctx.fillStyle = metalGrad(ctx,mm,b.x0,0,b.x1,0,it.facet ? 'facet' : 'poly'); ctx.fill(); noShadow(ctx); ctx.lineWidth = .05; ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.stroke(); }
    else if (it.k === 'l'){ ctx.fillStyle = lc; ctx.fill(); }
    else { ctx.fillStyle = printC(S); ctx.fill(); }
    ctx.restore();
  }
  const f = fam(S.numeralFont), w = S.markers === 'roman' ? 500 : 600;
  for (const t of texts){
    if (mode === 'lume'){ if (S.lume) txt(ctx, t.s, t.x, t.y, t.size, f, { rot:t.rot, weight:w, color:'#fff' }); continue; }
    if (mode === 'full') shadow(ctx,.4,.25,.4);
    txt(ctx, t.s, t.x, t.y, t.size, f, S.lume ? { rot:t.rot, weight:w, color:lc, stroke:mm.base, strokeW:.18 } : { rot:t.rot, weight:w, color:mm.base, stroke:mm.c[3], strokeW:.06 });
    noShadow(ctx);
  }
}
function drawBrand(ctx, S, g){
  const R = g.R, col = S.brandColor === 'auto' ? printC(S) : S.brandColor;
  const s = S.brandUpper ? S.brand.toUpperCase() : S.brand;
  txt(ctx, s, 0, R*S.brandY, +S.brandSize, fam(S.brandFont), { weight:S.brandWeight, italic:S.brandItalic, ls:+S.brandSpacing, color:col });
  if (S.subShow && S.subtitle) txt(ctx, S.subtitle.toUpperCase(), 0, -R*.36, R*.05, 'Montserrat, sans-serif', { weight:500, ls:.18, color:col });
}
function drawDate(ctx, S, g, mag = 1){
  const p = datePos(S, g); if (!p) return;
  const R = g.R, w = R*.2*mag, h = R*.15*mag;
  const wh = S.dateWheel === 'white' ? ['#f5f4ef','#141414'] : S.dateWheel === 'black' ? ['#151515','#f2f2f2'] : [S.dialColor, printC(S)];
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
  if (S.dateFrame && mag === 1){ const m = HMATS[S.markerMetal]; shadow(ctx,.4,.25,.4); ctx.fillStyle = metalGrad(ctx,m,0,h/2+.5,0,-h/2-.5); ctx.fillRect(-w/2-.45,-h/2-.45,w+.9,h+.9); noShadow(ctx); }
  ctx.fillStyle = wh[0]; ctx.fillRect(-w/2,-h/2,w,h);
  const gr = ctx.createLinearGradient(0,h/2,0,h*.1); gr.addColorStop(0,'rgba(0,0,0,.35)'); gr.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(-w/2,-h/2,w,h);
  txt(ctx, String(new Date().getDate()), 0, -h*.02, h*.82, 'Oswald, sans-serif', { weight:500, color:wh[1] });
  ctx.restore();
}
// mode: 'full' (2D preview), 'tex' (3D dial texture: applied parts become meshes), 'lume' (emissive map)
function drawDial(ctx, S, g, mode = 'full'){
  const R = g.R;
  if (mode === 'lume'){ ctx.fillStyle = '#000'; ctx.fillRect(-R,-R,2*R,2*R); }
  else { dialBase(ctx, S, R, mode === 'tex'); drawTrack(ctx, S, R, printC(S)); }
  drawMarkers(ctx, S, g, mode);
  if (mode !== 'lume'){ drawBrand(ctx, S, g); drawDate(ctx, S, g); }
}

/* ---------------- hands 2D ---------------- */
function drawHand(ctx, S, parts, a, fill, lift){
  const lc = LUME[S.lumeType].c;
  ctx.save(); ctx.rotate(-a);
  for (const p of parts){
    if (p.k === 'l' && !S.lume) continue;
    ctx.beginPath(); poly(ctx, p.pts); p.holes.forEach(h => poly(ctx, h));
    if (p.k === 'l'){ noShadow(ctx); ctx.fillStyle = lc; }
    else { shadow(ctx, .35*lift+.3, .45*lift, .45); const b = bbox(p.pts); ctx.fillStyle = typeof fill === 'string' ? fill : metalGrad(ctx, fill, b.x0, 0, b.x1, 0, p.facet ? 'facet' : 'poly'); }
    ctx.fill('evenodd');
  }
  ctx.restore(); noShadow(ctx);
}
function drawHands(ctx, S, g, ang){
  const R = g.R, hm = HMATS[S.handMetal];
  drawHand(ctx, S, handParts(S.hands,'h',R), ang.h, hm, 1);
  drawHand(ctx, S, handParts(S.hands,'m',R), ang.m, hm, 1.6);
  if (S.seconds) drawHand(ctx, S, secParts(S,R), ang.s, S.secColor, 2.2);
  ctx.beginPath(); circ(ctx,0,0,R*.012); ctx.fillStyle = '#222'; ctx.fill();
}

/* ---------------- bezel ---------------- */
function drawInsert(ctx, S, g, mode = 'full'){
  const rI = g.bzI + .35, rO = g.bzO - .6, mid = (rI+rO)/2, bw = rO - rI, nc = S.bezelNum, t = S.bezelType;
  const ring = () => { ctx.beginPath(); ctx.arc(0,0,rO,0,TAU); ctx.arc(0,0,rI,0,TAU,true); };
  if (mode === 'lume'){ ctx.fillStyle = '#000'; ctx.fillRect(-g.bzO,-g.bzO,2*g.bzO,2*g.bzO); if (t === 'diver'){ ctx.beginPath(); circ(ctx,0,rO-bw*.28,bw*.13); ctx.fillStyle = '#fff'; ctx.fill(); } return; }
  ctx.save(); ring();
  if (t === 'gmt'){ ctx.save(); ctx.clip(); ctx.fillStyle = S.bezelC1; ctx.fillRect(-rO,0,2*rO,rO); ctx.fillStyle = S.bezelC2; ctx.fillRect(-rO,-rO,2*rO,rO); ctx.restore(); }
  else { ctx.fillStyle = S.bezelC1; ctx.fill('evenodd'); }
  ring(); ctx.clip('evenodd');
  const gl = ctx.createLinearGradient(-rO,rO,rO,-rO), a = S.insertMat === 'ceramic' ? .28 : .1;
  gl.addColorStop(0,`rgba(255,255,255,${a})`); gl.addColorStop(.45,'rgba(255,255,255,0)'); gl.addColorStop(.55,'rgba(0,0,0,.1)'); gl.addColorStop(1,`rgba(255,255,255,${a*.6})`);
  ctx.fillStyle = gl; ctx.fillRect(-rO,-rO,2*rO,2*rO);
  ctx.fillStyle = nc; ctx.strokeStyle = nc;
  const numF = 'Oswald, sans-serif';
  if (t === 'diver'){
    ctx.beginPath(); poly(ctx, [[-bw*.34,rO-bw*.08],[bw*.34,rO-bw*.08],[0,rI+bw*.12]]); ctx.fill();
    ctx.beginPath(); circ(ctx,0,rO-bw*.28,bw*.13); ctx.fillStyle = LUME[S.lumeType].c; ctx.fill(); ctx.fillStyle = nc;
    for (let m = 1; m < 60; m++){ const a = m/60*TAU;
      if (m%10 === 0) txt(ctx, String(m), ...polar(mid,a), bw*.5, numF, { rot:a, weight:500, color:nc });
      else if (m%5 === 0){ ctx.lineWidth = bw*.13; line(ctx, polar(rO-bw*.12,a), polar(rI+bw*.3,a)); }
      else if (m < 15){ ctx.lineWidth = bw*.05; line(ctx, polar(rO-bw*.12,a), polar(rO-bw*.42,a)); } }
  } else if (t === 'gmt'){
    ctx.beginPath(); poly(ctx, [[-bw*.3,rO-bw*.12],[bw*.3,rO-bw*.12],[0,rI+bw*.16]]); ctx.fill();
    for (let h = 1; h < 24; h++){ const a = h/24*TAU;
      if (h%2 === 0) txt(ctx, String(h), ...polar(mid,a), bw*.46, numF, { rot:a, weight:500, color:nc });
      else { ctx.beginPath(); circ(ctx, ...polar(mid,a), bw*.07); ctx.fill(); } }
  } else if (t === 'tachy'){
    [500,400,300,250,200,180,160,140,120,110,100,90,80,70,60].forEach(v => { const a = 3600/v/60*TAU;
      ctx.lineWidth = .12; line(ctx, polar(rO-bw*.05,a), polar(rO-bw*.28,a));
      txt(ctx, String(v), ...polar(mid-bw*.08,a), bw*.34, numF, { rot:a, weight:500, color:nc }); });
    textOnCircle(ctx, 'TACHYMETRE', mid-bw*.05, bw*.26, 'Montserrat, sans-serif', 3.2/60*TAU, { weight:600, ls:.1, color:nc });
  }
  ctx.restore();
}
function drawBezel(ctx, S, g){
  const m = MATS[S.caseMat], { bzI, bzO } = g, ring = (a,b) => { ctx.beginPath(); ctx.arc(0,0,a,0,TAU); ctx.arc(0,0,b,0,TAU,true); };
  ring(bzO, bzI); shadow(ctx,1,.4,.45); ctx.fillStyle = metalGrad(ctx,m,-bzO,bzO,bzO,-bzO,S.caseFinish === 'brushed' ? 'brushed' : 'poly'); ctx.fill('evenodd'); noShadow(ctx);
  if (S.bezelType === 'fluted'){
    const N = Math.round(bzO*4.2);
    for (let i = 0; i < N; i++){ const a0 = i/N*TAU, a1 = (i+.5)/N*TAU, a2 = (i+1)/N*TAU, k = .5 + .5*Math.cos(a0 - 2.4);
      ctx.beginPath(); ctx.moveTo(...polar(bzI+.2,a0)); ctx.lineTo(...polar(bzO,a0)); ctx.lineTo(...polar(bzO,a1)); ctx.lineTo(...polar(bzI+.2,a1)); ctx.closePath(); ctx.fillStyle = `rgba(255,255,255,${.15+.4*k})`; ctx.fill();
      ctx.beginPath(); ctx.moveTo(...polar(bzI+.2,a1)); ctx.lineTo(...polar(bzO,a1)); ctx.lineTo(...polar(bzO,a2)); ctx.lineTo(...polar(bzI+.2,a2)); ctx.closePath(); ctx.fillStyle = `rgba(0,0,0,${.2+.3*(1-k)})`; ctx.fill(); }
  }
  if (g.insert){
    ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .12;
    for (let i = 0; i < 120; i++){ const a = i/120*TAU; line(ctx, polar(bzO-.05,a), polar(bzO-.4,a)); }
    ctx.restore(); drawInsert(ctx, S, g);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = .12; ctx.beginPath(); ctx.arc(0,0,bzI+.06,0,TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(0,0,bzO-.05,0,TAU); ctx.stroke();
}

/* ---------------- case / crown / strap ---------------- */
function drawCrown(ctx, S, g){
  const m = MATS[S.caseMat], x0 = g.cr - .8, x1 = g.cr + g.cl, h = g.cd;
  ctx.save(); shadow(ctx,1.4,.8,.45);
  ctx.fillStyle = metalGrad(ctx,m,0,h*.3,0,-h*.3); ctx.fillRect(x0,-h*.28,1.6,h*.56);
  const bx = x0 + 1.1, bw = x1 - bx;
  if (S.crown === 'onion'){
    for (let i = 0; i < 3; i++){ const cx = bx + bw*(i+.5)/3, ry = h/2*(1-i*.08); ctx.beginPath(); ctx.ellipse(cx,0,bw/3*.62,ry,0,0,TAU); ctx.fillStyle = metalGrad(ctx,m,0,ry,0,-ry); ctx.fill(); }
  } else {
    rrect(ctx,bx,-h/2,bw,h,Math.min(.8,bw/3)); ctx.fillStyle = metalGrad(ctx,m,0,h/2,0,-h/2); ctx.fill(); noShadow(ctx);
    if (['fluted','screw','pilot'].includes(S.crown)){ const n = S.crown === 'pilot' ? 12 : 9; ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 1; i < n; i++) ctx.fillRect(bx+.2,-h/2+h*i/n-.09,bw-.4,.18); }
    if (S.crown === 'cabochon'){ ctx.beginPath(); ctx.ellipse(x1-.15,0,.75,h*.3,0,0,TAU); ctx.fillStyle = S.gemColor; ctx.fill(); ctx.beginPath(); ctx.ellipse(x1-.25,h*.1,.25,h*.08,0,0,TAU); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(); }
  }
  ctx.restore();
}
function drawCase(ctx, S, g){
  const m = MATS[S.caseMat], fin = S.caseFinish, lugs = mirror4(lugPoly(g)), out = caseOutline(g);
  drawCrown(ctx, S, g);
  ctx.save(); shadow(ctx,2.6,1.3,.35); ctx.fillStyle = m.c[1];
  lugs.forEach(l => { ctx.beginPath(); poly(ctx,l); ctx.fill(); }); ctx.beginPath(); poly(ctx,out); ctx.fill(); ctx.restore();
  lugs.forEach(l => { const b = bbox(l); ctx.beginPath(); poly(ctx,l); ctx.fillStyle = metalGrad(ctx,m,b.x0,b.y1,b.x1,b.y0,fin === 'polished' ? 'poly' : 'brushed'); ctx.fill();
    if (fin !== 'brushed' || g.C.lug === 'facet'){ ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = .22; ctx.stroke(); } });
  if (S.crownGuards) guardPolys(g).forEach(p => { const b = bbox(p); ctx.beginPath(); poly(ctx,p); ctx.fillStyle = metalGrad(ctx,m,b.x0,b.y1,b.x1,b.y0); ctx.fill(); });
  ctx.beginPath(); poly(ctx,out); ctx.fillStyle = metalGrad(ctx,m,-g.cr,g.cr,g.cr,-g.cr,fin === 'brushed' ? 'brushed' : 'poly'); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .15; ctx.stroke();
}
const STRAP_TH = { oyster:3.2, jubilee:3.0, mesh:2.4, rubber:3.5, leather:3.2, nato:1.2 };
function drawStrap(ctx, S, g, sgn){
  const y0 = g.yE - 1.2, y1 = 60, w0 = g.lugW - .3, w1 = g.lugW*.84, m = MATS[S.caseMat];
  const wAt = y => w0 + (w1-w0)*(y-y0)/(y1-y0);
  const shape = () => { ctx.beginPath(); poly(ctx, [[-w0/2,y0],[w0/2,y0],[w1/2,y1],[-w1/2,y1]]); };
  ctx.save(); ctx.scale(1, sgn);
  const t = S.strap;
  if (t === 'oyster' || t === 'jubilee'){
    const endL = 3.2; ctx.fillStyle = metalGrad(ctx,m,-w0/2,0,w0/2,0,'brushed'); rrect(ctx,-w0/2,y0,w0,endL,.4); ctx.fill();
    const p = t === 'oyster' ? 6.2 : 4.4, gap = .25;
    for (let y = y0 + endL + gap, k = 0; y < y1; y += p, k++){
      const w = wAt(y), L = p - gap;
      if (t === 'oyster'){
        const ow = w*.3, cw = w*.4 - 2*gap;
        [[-w/2, ow],[w/2-ow, ow]].forEach(([x,ww]) => { ctx.fillStyle = metalGrad(ctx,m,x,0,x+ww,0,'brushed'); rrect(ctx,x,y,ww,L,.35); ctx.fill(); });
        ctx.fillStyle = metalGrad(ctx,m,-cw/2,0,cw/2,0,S.braceletCenter === 'polished' ? 'poly' : 'brushed'); rrect(ctx,-cw/2,y,cw,L,.35); ctx.fill();
      } else {
        const ow = w*.26, iw = (w - 2*ow - 4*gap)/3;
        [[-w/2, ow],[w/2-ow, ow]].forEach(([x,ww]) => { ctx.fillStyle = metalGrad(ctx,m,x,0,x+ww,0,'brushed'); rrect(ctx,x,y,ww,L,.35); ctx.fill(); });
        for (let j = 0; j < 3; j++){ const x = -w/2 + ow + gap + j*(iw+gap), off = j === 1 ? p/2 : 0;
          ctx.fillStyle = metalGrad(ctx,m,x,0,x+iw,0,'poly'); rrect(ctx,x,y+off,iw,p*.5-gap,Math.min(iw,p*.5)/2.2); ctx.fill();
          ctx.fillStyle = metalGrad(ctx,m,x,0,x+iw,0,'poly'); rrect(ctx,x,y+off+p*.5,iw,p*.5-gap,Math.min(iw,p*.5)/2.2); ctx.fill(); }
      }
    }
  } else if (t === 'mesh'){
    shape(); ctx.fillStyle = metalGrad(ctx,m,-w0/2,0,w0/2,0,'brushed'); ctx.fill();
    shape(); ctx.save(); ctx.clip(); ctx.lineWidth = .14;
    for (let d = -40; d < 90; d += .45){ ctx.strokeStyle = 'rgba(0,0,0,.28)'; line(ctx,[-15,y0+d],[15,y0+d+12]); ctx.strokeStyle = 'rgba(255,255,255,.18)'; line(ctx,[15,y0+d],[-15,y0+d+12]); }
    ctx.restore(); ctx.fillStyle = metalGrad(ctx,m,0,y0,0,y0+3); ctx.fillRect(-w0/2,y0,w0,3);
  } else {
    const col = S.strapColor;
    shape(); ctx.fillStyle = col; ctx.fill();
    shape(); ctx.save(); ctx.clip();
    const gr = ctx.createLinearGradient(-w0/2,0,w0/2,0); gr.addColorStop(0,'rgba(0,0,0,.35)'); gr.addColorStop(.2,'rgba(255,255,255,.06)'); gr.addColorStop(.8,'rgba(0,0,0,.05)'); gr.addColorStop(1,'rgba(0,0,0,.4)');
    if (t === 'nato'){
      ctx.fillStyle = S.strapAccent; ctx.fillRect(-w0*.22,y0,w0*.12,y1); ctx.fillRect(w0*.1,y0,w0*.12,y1);
      ctx.lineWidth = .06; ctx.strokeStyle = 'rgba(0,0,0,.18)'; for (let y = y0; y < y1; y += .3) line(ctx,[-w0,y],[w0,y]);
    }
    if (t === 'leather'){ ctx.save(); ctx.scale(.04,.04); ctx.fillStyle = noisePattern(ctx); ctx.fillRect(-400,y0*25,800,y1*25); ctx.restore(); }
    ctx.fillStyle = gr; ctx.fillRect(-w0,y0,2*w0,y1);
    if (t === 'rubber'){ ctx.lineWidth = .2; ctx.strokeStyle = 'rgba(0,0,0,.3)'; for (const x of [-.18,.18]) line(ctx,[w0*x,y0+2],[w1*x,y1]); }
    ctx.restore();
    if (t === 'leather'){ ctx.save(); ctx.setLineDash([1.1,.7]); ctx.lineWidth = .22; ctx.strokeStyle = S.strapAccent;
      line(ctx,[-w0/2+1.3,y0+1.3],[-w1/2+1.3,y1]); line(ctx,[w0/2-1.3,y0+1.3],[w1/2-1.3,y1]); line(ctx,[-w0/2+1.3,y0+1.3],[w0/2-1.3,y0+1.3]); ctx.restore(); }
    if (t === 'nato'){ const ky = y0 + 24, kw = wAt(ky) + 1.2; ctx.fillStyle = metalGrad(ctx,m,0,ky+1.2,0,ky); rrect(ctx,-kw/2,ky,kw,1.8,.6); ctx.fill(); }
  }
  ctx.restore();
}
function drawGlare(ctx, S, g){
  const r = g.bzI;
  ctx.save(); ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.clip();
  const gr = ctx.createLinearGradient(-r,r,r*.2,-r*.2); gr.addColorStop(0,'rgba(255,255,255,.14)'); gr.addColorStop(.35,'rgba(255,255,255,.04)'); gr.addColorStop(.36,'rgba(255,255,255,0)');
  ctx.fillStyle = gr; ctx.fillRect(-r,-r,2*r,2*r);
  if (S.crystal !== 'flat'){ ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = .5; ctx.beginPath(); ctx.arc(0,0,r*.86,2.0,2.8); ctx.stroke(); }
  ctx.restore();
}
function drawCyclops(ctx, S, g){
  const p = datePos(S, g); if (!p || !S.cyclops) return;
  const R = g.R, lw = R*.2*1.5, lh = R*.15*1.75;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
  rrect(ctx,-lw/2,-lh/2,lw,lh,lh*.35); ctx.save(); ctx.clip();
  ctx.fillStyle = S.dialColor; ctx.fillRect(-lw,-lh,2*lw,2*lh);
  ctx.rotate(-p.rot); ctx.translate(-p.x*1.9, -p.y*1.9); ctx.scale(1.9,1.9); drawDate(ctx, S, g); ctx.restore();
  rrect(ctx,-lw/2,-lh/2,lw,lh,lh*.35); ctx.lineWidth = .25; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke();
  const gr = ctx.createLinearGradient(0,lh/2,0,-lh/2); gr.addColorStop(0,'rgba(255,255,255,.3)'); gr.addColorStop(.4,'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fill();
  ctx.restore();
}

/* ---------------- movement + caseback art ---------------- */
function drawMovement(ctx, S, r, rotorA = .6, withRotor = true){
  const mv = S.movement, M = MOVEMENTS[mv], rn = rng(5), brand = (S.brand || 'BOSKOVIC').toUpperCase();
  ctx.save(); ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.clip();
  ctx.fillStyle = '#c4c7cb'; ctx.fillRect(-r,-r,2*r,2*r);
  ctx.lineWidth = r*.012;
  for (let x = -r; x < r; x += r*.07) for (let y = -r; y < r; y += r*.07){ ctx.strokeStyle = rn() < .5 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(x+rn()*.2,y,r*.045,0,TAU); ctx.stroke(); }
  const jewel = (x,y,s=1) => { ctx.beginPath(); circ(ctx,x,y,r*.04*s); ctx.fillStyle = '#d9d2c0'; ctx.fill(); ctx.beginPath(); circ(ctx,x,y,r*.022*s); ctx.fillStyle = '#b0172b'; ctx.fill(); };
  const screw = (x,y) => { ctx.beginPath(); circ(ctx,x,y,r*.035); ctx.fillStyle = '#2b4aa6'; ctx.fill(); ctx.strokeStyle = '#0c1640'; ctx.lineWidth = r*.01; line(ctx,[x-r*.03,y],[x+r*.03,y]); };
  const bridge = pts => { ctx.save(); ctx.beginPath(); poly(ctx,pts); ctx.fillStyle = '#b9bdc2'; shadow(ctx,.5,.2,.4); ctx.fill(); noShadow(ctx); ctx.clip();
    for (let x = -r; x < r; x += r*.14){ const g = ctx.createLinearGradient(x,0,x+r*.14,0); g.addColorStop(0,'rgba(0,0,0,.12)'); g.addColorStop(.5,'rgba(255,255,255,.35)'); g.addColorStop(1,'rgba(0,0,0,.12)'); ctx.fillStyle = g; ctx.fillRect(x,-r,r*.14,2*r); }
    ctx.restore(); ctx.beginPath(); poly(ctx,pts); ctx.lineWidth = r*.015; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.stroke(); };
  if (mv === 'quartz'){
    ctx.beginPath(); circ(ctx,r*.3,r*.22,r*.36); ctx.fillStyle = metalGrad(ctx,MATS.steel,0,r*.6,0,-r*.1); ctx.fill();
    txt(ctx,'SR920SW',r*.3,r*.26,r*.08,'Montserrat, sans-serif',{weight:700,color:'#555'}); txt(ctx,'+',r*.3,r*.1,r*.12,'Montserrat',{color:'#555'});
    ctx.fillStyle = '#b8733a'; ctx.fillRect(-r*.7,-r*.3,r*.55,r*.2); ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let x = -r*.7; x < -r*.15; x += r*.02) ctx.fillRect(x,-r*.3,r*.008,r*.2);
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(-r*.1,-r*.62,r*.22,r*.22);
    bridge([[-r*.8,r*.1],[-r*.1,r*.55],[-r*.05,r*.25],[-r*.6,-r*.05]]);
    [[-r*.4,r*.2],[-r*.2,r*.35],[r*.2,-r*.4]].forEach(p => jewel(...p)); [[-r*.65,r*.05],[-r*.1,r*.45]].forEach(p => screw(...p));
  } else {
    const bx = -r*.48, by = -r*.38, br = r*.24;
    ctx.beginPath(); ctx.arc(bx,by,br,0,TAU); ctx.lineWidth = r*.03; ctx.strokeStyle = '#c9a24c'; ctx.stroke();
    for (let k = 0; k < 3; k++){ const a = k*TAU/3 + .3; ctx.lineWidth = r*.02; line(ctx,[bx,by],[bx+Math.sin(a)*br,by+Math.cos(a)*br]); }
    ctx.strokeStyle = 'rgba(20,30,90,.7)'; ctx.lineWidth = r*.004; ctx.beginPath(); for (let t = 0; t < 40; t += .1){ const rr = br*.15 + t*br*.017; ctx.lineTo(bx+Math.cos(t)*rr, by+Math.sin(t)*rr); } ctx.stroke();
    bridge([[-r*.05,r*.98],[r*.98,r*.15],[r*.62,-r*.18],[-r*.02,r*.12],[-r*.3,r*.5]]);
    const cx = r*.36, cy = r*.42; ctx.beginPath(); circ(ctx,cx,cy,r*.27); const cg = ctx.createConicGradient(0,cx,cy); for (let i = 0; i <= 24; i++) cg.addColorStop(i/24, i%2 ? '#e8eaed' : '#9da2a8'); ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = r*.012; for (let i = 0; i < 60; i++){ const a = i/60*TAU; line(ctx,[cx+Math.sin(a)*r*.25,cy+Math.cos(a)*r*.25],[cx+Math.sin(a)*r*.28,cy+Math.cos(a)*r*.28]); }
    screw(cx,cy);
    bridge([[-r*.2,-r*.02],[r*.58,-r*.26],[r*.32,-r*.82],[-r*.25,-r*.62]]);
    bridge([[bx-br*.2,by+br*.2],[bx+br*.2,by+br*.2],[-r*.02,-r*.02],[-r*.2,r*.15],[-r*.95,-r*.1]]);
    [[-r*.1,-r*.2],[r*.2,-r*.35],[r*.1,-r*.6],[bx,by],[r*.6,r*.25],[r*.1,r*.7]].forEach(p => jewel(...p));
    [[r*.5,-r*.2],[-r*.15,-r*.55],[r*.3,-r*.72],[-r*.8,-r*.05],[r*.85,r*.2],[-r*.2,r*.45]].forEach(p => screw(...p));
    if (withRotor && ['auto','hibeat','spring'].includes(mv)){
      ctx.save(); ctx.rotate(-rotorA);
      ctx.beginPath(); ctx.moveTo(-r*.98,0); ctx.arc(0,0,r*.98,PI,0,true); ctx.lineTo(r*.16,0); ctx.arc(0,0,r*.16,0,PI); ctx.closePath();
      const gold = ['gold','rose','bronze'].includes(S.caseMat); shadow(ctx,1.2,.5,.5); ctx.fillStyle = gold ? '#d8b56a' : '#b7bbc1'; ctx.fill(); noShadow(ctx); ctx.save(); ctx.clip();
      for (let x = -r; x < r; x += r*.12){ const g = ctx.createLinearGradient(x,0,x+r*.12,0); g.addColorStop(0,'rgba(0,0,0,.15)'); g.addColorStop(.5,'rgba(255,255,255,.4)'); g.addColorStop(1,'rgba(0,0,0,.15)'); ctx.fillStyle = g; ctx.fillRect(x,0,r*.12,r); }
      ctx.beginPath(); ctx.arc(0,0,r*.98,0,PI); ctx.arc(0,0,r*.78,PI,0,true); ctx.fillStyle = gold ? 'rgba(120,80,20,.35)' : 'rgba(40,40,50,.35)'; ctx.fill();
      ctx.restore();
      textOnCircle(ctx, M.name.toUpperCase(), r*.88, r*.075, 'Montserrat, sans-serif', 0, { weight:700, ls:.2, color:'rgba(255,255,255,.85)' });
      ctx.beginPath(); circ(ctx,0,0,r*.1); ctx.fillStyle = '#8f949b'; ctx.fill(); jewel(0,0,1.2);
      ctx.restore();
    }
  }
  textOnCircle(ctx, `${brand} · CAL. ${M.cal} · ${M.jewels} JEWELS`, r*.9, r*.055, 'Montserrat, sans-serif', PI, { weight:600, ls:.12, color:'rgba(40,40,40,.75)', bottom:true });
  ctx.restore();
}
// Serbian coat of arms, engraved line art: crowned double-headed eagle with the cross-and-four-ocila shield
function serbianCrest(ctx, s, color){
  const P = (pts) => pts.map(([x,y]) => [x*s, y*s]);
  const half = [[0,.34],[.1,.4],[.15,.52],[.22,.58],[.33,.55],[.25,.5],[.2,.43],[.17,.36],[.3,.44],[.44,.58],[.58,.66],[.6,.56],[.7,.5],[.66,.4],[.76,.34],[.68,.26],[.74,.16],[.62,.12],[.64,.02],[.5,.0],[.46,-.12],[.36,-.16],[.38,-.3],[.3,-.34],[.24,-.28],[.2,-.42],[.26,-.56],[.12,-.5],[.06,-.64],[0,-.58]];
  const body = P([...half, ...half.slice(1, -1).reverse().map(([x,y]) => [-x,y])]);
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineJoin = 'round'; ctx.lineWidth = s*.03;
  ctx.beginPath(); poly(ctx, body); ctx.stroke();
  // wing feathers
  ctx.lineWidth = s*.015;
  for (const sx of [1,-1]) for (let i = 0; i < 5; i++){ const t = i/4; line(ctx, [sx*s*(.24+.08*t), s*(.3-.05*t)], [sx*s*(.46+.2*t), s*(.5-.4*t)]); }
  // eyes
  for (const sx of [1,-1]){ ctx.beginPath(); circ(ctx, sx*s*.22, s*.53, s*.018); ctx.fill(); }
  // crown
  const cy = s*.72; ctx.lineWidth = s*.025;
  ctx.beginPath(); poly(ctx, P([[-.16,.64],[.16,.64],[.2,.76],[.1,.7],[0,.8],[-.1,.7],[-.2,.76]])); ctx.stroke();
  line(ctx, [0, s*.8], [0, s*.9]); line(ctx, [-s*.04, s*.86], [s*.04, s*.86]);
  // shield
  const w = s*.2, top = s*.28, bot = -s*.2;
  ctx.beginPath(); ctx.moveTo(-w, top); ctx.lineTo(w, top); ctx.lineTo(w, 0); ctx.quadraticCurveTo(w, bot, 0, bot - s*.08); ctx.quadraticCurveTo(-w, bot, -w, 0); ctx.closePath();
  ctx.globalAlpha = .25; ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = s*.028; ctx.stroke();
  // cross
  const cxm = 0, cym = s*.06; ctx.lineWidth = s*.05; line(ctx, [cxm, top - s*.03], [cxm, bot - s*.03]); line(ctx, [-w + s*.03, cym], [w - s*.03, cym]);
  // four ocila (firesteels), opening away from the cross
  ctx.lineWidth = s*.022;
  for (const [qx, qy] of [[-1,1],[1,1],[-1,-1],[1,-1]]){
    const ox = qx*w*.5, oy = cym + qy*s*.12, rr = s*.055, a0 = qx < 0 ? -PI/2 : PI/2;
    ctx.beginPath(); ctx.arc(ox + qx*rr*.3, oy, rr, a0, a0 + PI, qx > 0); ctx.stroke();
  }
  // fleurs under the talons
  for (const sx of [1,-1]){ ctx.beginPath(); circ(ctx, sx*s*.34, -s*.4, s*.035); ctx.fill(); }
  ctx.restore();
}
function drawEngraving(ctx, S, r){
  const m = MATS[S.caseMat], dark = 'rgba(0,0,0,.55)', lite = 'rgba(255,255,255,.55)';
  ctx.save(); ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.clip();
  ctx.fillStyle = metalGrad(ctx,m,-r,r,r,-r,'brushed'); ctx.fillRect(-r,-r,2*r,2*r);
  ctx.lineWidth = .05; for (let rr = .5; rr < r; rr += .17){ ctx.strokeStyle = (rr*7)%2 < 1 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.arc(0,0,rr,0,TAU); ctx.stroke(); }
  ctx.lineWidth = r*.012; ctx.strokeStyle = dark; ctx.beginPath(); ctx.arc(0,0,r*.66,0,TAU); ctx.stroke(); ctx.strokeStyle = lite; ctx.beginPath(); ctx.arc(.05,-.05,r*.66,0,TAU); ctx.stroke();
  const t = (S.engraveText || '').toUpperCase().slice(0, 60);
  textOnCircle(ctx, t, r*.8, r*.075, 'Montserrat, sans-serif', 0, { weight:600, ls:.1, color:dark, emboss:lite });
  ctx.strokeStyle = dark; ctx.fillStyle = dark; ctx.lineWidth = r*.02;
  const e = S.emblem;
  if (e === 'serbia'){ ctx.save(); ctx.translate(.07,-.07); serbianCrest(ctx, r*.58, lite); ctx.restore(); serbianCrest(ctx, r*.58, dark); }
  else if (e === 'wave'){ for (let k = -1; k <= 1; k++){ ctx.beginPath(); for (let x = -r*.42; x <= r*.42; x += .1) ctx.lineTo(x, k*r*.14 + Math.sin(x/r*9)*r*.06); ctx.stroke(); } }
  else if (e === 'star'){ const P = []; for (let i = 0; i < 16; i++) P.push(polar(i%2 ? r*.14 : r*.4, i/16*TAU)); ctx.beginPath(); poly(ctx,P); ctx.stroke();
    for (let i = 0; i < 8; i++){ ctx.lineWidth = r*.008; line(ctx,[0,0],polar(r*.4,i/8*TAU)); } }
  else if (e === 'crest'){ const s = r*.42; ctx.beginPath(); ctx.moveTo(-s*.7,s*.7); ctx.lineTo(s*.7,s*.7); ctx.lineTo(s*.7,0); ctx.quadraticCurveTo(s*.6,-s*.6,0,-s*.9); ctx.quadraticCurveTo(-s*.6,-s*.6,-s*.7,0); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s*.55,-s*.05); ctx.lineTo(0,s*.4); ctx.lineTo(s*.55,-s*.05); ctx.stroke(); }
  else { txt(ctx, (S.brand || '').toUpperCase(), 0, r*.12, r*.13, fam(S.brandFont), { weight:700, color:dark, emboss:lite }); txt(ctx, 'N° 0427', 0, -r*.12, r*.09, 'Montserrat, sans-serif', { weight:600, color:dark, emboss:lite }); }
  ctx.restore();
}
