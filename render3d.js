'use strict';
/* ================= 3D showcase (three.js, loaded on demand from jsDelivr) ================= */
window.Render3D = (() => {
  let T, OrbitControls, RoomEnvironment, RoundedBoxGeometry, RGBELoader;
  let renderer, scene, camera, controls, clock, key, rim, hemi, cone, vitrine, bgSpots = [], placard, plinth, wristMesh;
  let assembly, head, strapGrp, pillowMesh, rotor, hands;
  const st = { S:null, g:null, parts:[], lumeMats:[], explode:0, exT:0, lume:0, lumeT:0, running:false, intro:1, camFrom:null, camTo:null, tgtFrom:null, tgtTo:null, target:null,
    mode:'cream', angle:'hero', welcome:false, wrist:170, hz:0, at:null };
  const RP = 27;                       // cushion radius, mm
  const HZ = RP + .3;                  // caseback height above cushion axis
  const q = s => document.querySelector(s);
  const clamp01 = v => Math.min(1, Math.max(0, v));
  // display: one light and one dark cushion, flat on the table (strap opened), or on a wrist
  const MODES = { cream:['Cream cushion','#d8cdb8'], black:['Black cushion','#1a1a1c'], table:['Flat on table'] };
  const ANGLES = [['hero','Hero'], ['front','Front'], ['side','Side'], ['top','Top-down'], ['wrist','Wrist']];
  // every lighting value in the scene, exposed as sliders in the render HUD (defaults match the reference render)
  const LIGHT = { exposure:1.15, key:6.5, rim:3, ambient:.2, env:1, gallery:1.3, beam:0 };
  const WRIST_LIGHT = { exposure:1, key:4.2, rim:4, ambient:.3, env:1, gallery:.5, beam:0 };
  const LIGHT_UI = [
    ['exposure', 'Room light (exposure)', 0, 3, .01],
    ['key',      'Key spotlight',         0, 20, .1],
    ['rim',      'Rim light',             0, 12, .1],
    ['ambient',  'Ambient fill',          0, 2, .01],
    ['env',      'Reflections',           0, 3, .01],
    ['gallery',  'Gallery spots',         0, 8, .1],
    ['beam',     'Light beam haze',       0, .15, .005],
  ];
  function buildLightPanel(){
    const p = q('#rLightPanel'); p.innerHTML = '';
    for (const [k, label, min, max, step] of LIGHT_UI){
      const l = document.createElement('label'); l.innerHTML = `${label}<span>${LIGHT[k]}</span>`;
      const i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = LIGHT[k];
      i.oninput = () => { LIGHT[k] = +i.value; l.querySelector('span').textContent = i.value; };
      l.appendChild(i); p.appendChild(l);
    }
  }

  async function load(){
    if (T) return;
    T = await import('three');
    ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
    ({ RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js'));
    ({ RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js'));
    ({ RGBELoader } = await import('three/addons/loaders/RGBELoader.js'));
  }

  /* ---------- helpers ---------- */
  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const col = h => new T.Color(h);
  // polished metal is near-mirror; the studio HDRI gives it real highlights instead of a plastic sheen
  function metal(key, finish = 'polished', table = MATS){
    const m = table[key];
    if (m.paint) return new T.MeshPhysicalMaterial({ color:col(m.base), metalness:.1, roughness:.35, clearcoat:.7 });
    const r = { polished:.06, brushed:.26, blasted:.5, mirror:.015 }[finish] ?? .1;
    return new T.MeshPhysicalMaterial({ color:col(m.base), metalness:1, roughness:r, anisotropy:finish === 'brushed' ? .7 : 0 });
  }
  // [case walls, flat tops (caps), edge breaks / chamfers (bevels)] per polishing option
  const FINISH3D = { polished:['polished','polished','polished'], brushed:['brushed','brushed','brushed'], mixed:['polished','brushed','polished'], blasted:['blasted','blasted','blasted'], zaratsu:['mirror','mirror','mirror'] };
  function canvasTex(size, extent, draw){
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'), k = size / (2*extent); PXMM = k;
    x.setTransform(k,0,0,-k,size/2,size/2); draw(x);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  const shape = (pts, holes = []) => { const s = new T.Shape(pts.map(p => new T.Vector2(p[0], p[1]))); holes.forEach(h => s.holes.push(new T.Path(h.map(p => new T.Vector2(p[0], p[1]))))); return s; };
  const extrude = (sh, depth, bevel = .1, cs = 24, segs = 2) => new T.ExtrudeGeometry(sh, { depth, bevelEnabled:bevel > 0, bevelThickness:bevel, bevelSize:bevel, bevelSegments:segs, curveSegments:cs });
  function part(mesh, ex = V(), parent = head){
    mesh.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    mesh.userData.base = mesh.position.clone(); mesh.userData.ex = ex; parent.add(mesh); st.parts.push(mesh); return mesh;
  }
  const lumeMat = () => { const m = new T.MeshStandardMaterial({ color:col(LUME[st.S.lumeType].c), emissive:col(LUME[st.S.lumeType].glow), emissiveIntensity:0, roughness:.6 }); st.lumeMats.push(m); return m; };
  const zAxis = geom => geom.rotateX(PI/2); // Y-built geometry -> Z axis
  // wrist cross-section from circumference (mm): ellipse, 1.3 : 1 wide
  const wristAB = () => { const a = st.wrist / 5.58; return { a, b: a / 1.3 }; };

  /* ---------- scene ---------- */
  function init(){
    renderer = new T.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = LIGHT.exposure;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    q('#glwrap').appendChild(renderer.domElement);
    scene = new T.Scene(); scene.background = col('#060607'); scene.fog = new T.Fog('#060607', 1000, 2800);
    const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
    new RGBELoader().load('assets/studio.hdr', tex => { scene.environment = pm.fromEquirectangular(tex).texture; tex.dispose(); });
    scene.environmentRotation = new T.Euler(0, 2.2, 0);
    camera = new T.PerspectiveCamera(28, 1, 5, 9000);
    controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, { enableDamping:true, dampingFactor:.06, minDistance:60, maxDistance:1500, autoRotate:false, autoRotateSpeed:.6, maxPolarAngle:PI*.8 });
    controls.addEventListener('start', () => { st.intro = 1; });
    clock = new T.Clock();

    const floor = new T.Mesh(new T.PlaneGeometry(9000, 9000), new T.MeshStandardMaterial({ color:'#131315', roughness:.85 }));
    floor.rotation.x = -PI/2; floor.position.y = -1000; floor.receiveShadow = true; scene.add(floor);
    const wall = new T.Mesh(new T.PlaneGeometry(9000, 3000), new T.MeshStandardMaterial({ color:'#19191c', roughness:.95 }));
    wall.position.set(0, 0, -1300); scene.add(wall);
    plinth = new T.Mesh(new RoundedBoxGeometry(190, 1000, 190, 4, 4), new T.MeshStandardMaterial({ color:'#e9e6df', roughness:.7 }));
    plinth.position.y = -500; plinth.receiveShadow = plinth.castShadow = true; scene.add(plinth);
    for (const [x, h, z] of [[-560, 760, -520], [600, 680, -760], [-240, 980, -980]]){
      const p = new T.Mesh(new RoundedBoxGeometry(170, h, 170, 3, 4), new T.MeshStandardMaterial({ color:'#2b2b30', roughness:.8 }));
      p.position.set(x, -1000 + h/2, z); p.receiveShadow = true; scene.add(p);
      const s = new T.SpotLight('#ffeedd', 2.2, 0, .16, .7, 0); s.position.set(x, 900, z + 250); s.target.position.set(x, -1000 + h, z); scene.add(s, s.target); bgSpots.push(s);
    }
    hemi = new T.HemisphereLight('#bfc6d4', '#0a0a0a', .25); scene.add(hemi);
    key = new T.SpotLight('#fff4e6', 5, 0, .2, .65, 0); key.position.set(160, 820, 380); key.target.position.set(0, 30, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.00008; key.shadow.normalBias = .15; key.shadow.camera.near = 300; key.shadow.camera.far = 1700;
    scene.add(key, key.target);
    rim = new T.SpotLight('#cfe0ff', 3, 0, .3, .8, 0); rim.position.set(-320, 420, -420); rim.target.position.set(0, 30, 0); scene.add(rim, rim.target);
    // fake volumetric beam
    const kp = key.position, dir = kp.clone().sub(key.target.position), len = dir.length();
    cone = new T.Mesh(new T.ConeGeometry(len*Math.tan(.2)*.9, len, 48, 1, true), new T.MeshBasicMaterial({ color:'#fff3dd', transparent:true, opacity:.03, blending:T.AdditiveBlending, depthWrite:false, side:T.DoubleSide }));
    cone.position.copy(key.target.position).addScaledVector(dir, .5); cone.quaternion.setFromUnitVectors(V(0,1,0), dir.normalize()); scene.add(cone);
    // vitrine
    vitrine = new T.Group();
    const vg = new T.BoxGeometry(180, 180, 180);
    vitrine.add(new T.Mesh(vg, new T.MeshPhysicalMaterial({ color:'#ffffff', roughness:.04, metalness:0, transparent:true, opacity:.09, depthWrite:false, side:T.DoubleSide })));
    vitrine.add(new T.LineSegments(new T.EdgesGeometry(vg), new T.LineBasicMaterial({ color:'#ffffff', transparent:true, opacity:.35 })));
    vitrine.position.y = 90.5; vitrine.visible = false; scene.add(vitrine);

    buildLightPanel();
    addEventListener('resize', resize);
    const btn = (id, fn) => q(id).onclick = fn;
    btn('#rClose', close);
    btn('#rRotate', e => { controls.autoRotate = !controls.autoRotate; e.target.textContent = 'Turntable: ' + (controls.autoRotate ? 'on' : 'off'); });
    btn('#rExplode', e => { st.exT = st.exT ? 0 : 1; e.target.classList.toggle('on', !!st.exT); e.target.textContent = st.exT ? 'Assembled view' : 'Exploded view'; });
    btn('#rLights', e => { st.lumeT = st.lumeT ? 0 : 1; e.target.classList.toggle('on', !!st.lumeT); e.target.textContent = st.lumeT ? 'Lights on' : 'Lights out (lume)'; });
    btn('#rVitrine', e => { vitrine.visible = !vitrine.visible; e.target.textContent = 'Vitrine: ' + (vitrine.visible ? 'on' : 'off'); });
    btn('#rShot', saveImage);
    for (const [k, [label]] of Object.entries(MODES)){ const b = document.createElement('button'); b.className = 'glass'; b.dataset.mode = k; b.textContent = label; b.onclick = () => { setMode(k); goAngle((st.angle === 'top' && k !== 'table') || st.angle === 'wrist' ? 'hero' : st.angle); }; q('#rModes').appendChild(b); }
    for (const [k, label] of ANGLES){ const b = document.createElement('button'); b.className = 'glass'; b.dataset.angle = k; b.textContent = label; b.onclick = () => goAngle(k); q('#rAngles').appendChild(b); }
    const wi = q('#rWristIn'); wi.value = st.wrist;
    wi.oninput = () => { st.wrist = +wi.value; q('#rWristVal').textContent = (st.wrist/10).toFixed(1) + ' cm'; if (st.mode === 'wrist'){ setMode('wrist'); goAngle('wrist', true); } };
    q('#rWristVal').textContent = (st.wrist/10).toFixed(1) + ' cm';
    initHint();
  }
  function resize(){
    if (!renderer) return;
    renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight;
    // welcome: push the watch to the right of the copy (desktop) or above it (phones)
    if (st.welcome){ const w = innerWidth, h = innerHeight; if (w > 900) camera.setViewOffset(w, h, -w*.2, 0, w, h); else camera.setViewOffset(w, h, 0, h*.33, w, h); }
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  /* ---------- controls hint ---------- */
  function initHint(){
    const h = q('#rHint'), aim = h.querySelector('[data-k=aim]'), move = h.querySelector('[data-k=move]'), touch = matchMedia('(pointer: coarse)').matches;
    if (touch){ aim.innerHTML = '<b>Drag</b> to aim'; move.innerHTML = '<b>Two fingers</b> to move'; }
    let seen = {}; try { seen = JSON.parse(localStorage.getItem('gc-hint') || '{}'); } catch (e) {}
    const mark = k => { seen[k] = 1; (k === 'aim' ? aim : move).classList.add('done'); if (seen.aim && seen.move){ h.hidden = true; try { localStorage.setItem('gc-hint', JSON.stringify(seen)); } catch (e) {} } };
    Object.keys(seen).forEach(mark);
    const touches = new Set(), el = renderer.domElement;
    el.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch'){ touches.add(e.pointerId); mark(touches.size > 1 ? 'move' : 'aim'); }
      else mark(e.button === 2 || e.shiftKey || e.ctrlKey || e.metaKey ? 'move' : 'aim');
    });
    const up = e => touches.delete(e.pointerId); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }

  /* ---------- watch head ---------- */
  function buildHead(S, g){
    head = new T.Group(); st.parts = [];
    const F = FINISH3D[S.caseFinish] || FINISH3D.mixed, wallM = metal(S.caseMat, F[0]), topM = metal(S.caseMat, F[1]), edgeM = metal(S.caseMat, F[2]);
    const polM = metal(S.caseMat, S.caseFinish === 'blasted' ? 'blasted' : S.caseFinish === 'zaratsu' ? 'mirror' : 'polished');
    // edge treatment: rounded break (several bevel segments), flat polished chamfer (one segment) or a knife edge
    const prof = S.edgeProfile || 'round', segs = prof === 'round' ? 4 : 1, eb = prof === 'sharp' ? .06 : g.eb;
    const zB = g.cb + g.midH, zD = zB - 1.2, zTop = zB + g.bh;
    // case middle
    const b = Math.min(eb, g.midH/2 - .3, .9), outer = g.C.cushion ? squircle(g.cr - b) : circlePts(g.cr - b, 128);
    const mid = new T.Mesh(extrude(shape(outer, [circlePts(g.bzI + b, 128)]), g.midH - 2*b, b, 64, segs), [topM, wallM]);
    mid.position.z = g.cb + b; part(mid);
    // lugs (tilted toward the wrist): flat tops get the top finish, flanks + chamfers the edge finish
    const lb = prof === 'sharp' ? .05 : Math.min(eb*.8, .6), lugH = g.midH*.72, tilt = .16;
    mirror4(lugPoly(g)).forEach(p => {
      const sy = Math.sign(p[0][1]), piv = new T.Group(); piv.position.set(0, sy*g.y0, g.cb + .2); piv.rotation.x = -sy*tilt;
      const m = new T.Mesh(extrude(shape(p), lugH - 2*lb, lb, 16, segs), [topM, edgeM]); m.position.set(0, -sy*g.y0, lb); piv.add(m); part(piv);
    });
    const dy = g.yE - 1.4 - g.y0, attach = { y: g.y0 + dy*Math.cos(tilt), z: g.cb + .2 + lugH*.45 - dy*Math.sin(tilt) };
    if (S.crownGuards) guardPolys(g).forEach(p => { const m = new T.Mesh(extrude(shape(p), g.midH*.7 - .5, Math.min(lb, .25), 16, segs), [topM, edgeM]); m.position.z = g.cb + g.midH*.15 + .25; part(m); });
    buildCrown(S, g, polM);
    buildBezel(S, g, zB, topM, polM);
    // dial, rehaut
    const dialMat = new T.MeshPhysicalMaterial({ map:canvasTex(2048, g.R, x => drawDial(x, S, g, 'tex')),
      roughness:{ clean:.3, sunburst:.28, paper:.75 }[S.dialTex] ?? .45, metalness:S.dialTex === 'sunburst' ? .35 : .05,
      clearcoat:S.dialTex === 'clean' ? S.shine*.8 : S.shine*.2, clearcoatRoughness:.1 });
    if (S.lume){ dialMat.emissiveMap = canvasTex(1024, g.R, x => drawDial(x, S, g, 'lume')); dialMat.emissive = col(LUME[S.lumeType].glow); dialMat.emissiveIntensity = 0; st.lumeMats.push(dialMat); }
    const dial = new T.Mesh(new T.CircleGeometry(g.R, 128), dialMat); dial.position.z = zD; part(dial, V(0,0,8));
    const disc = new T.Mesh(zAxis(new T.CylinderGeometry(g.R, g.R, .4, 96)), new T.MeshStandardMaterial({ color:col(S.dialColor), roughness:.5 })); disc.position.z = zD - .21; part(disc, V(0,0,8));
    const reh = new T.Mesh(zAxis(new T.CylinderGeometry(g.bzI - .02, g.R, zB - zD, 128, 1, true)), new T.MeshStandardMaterial({ color:col(shade(S.dialColor, -.2)), roughness:.5, side:T.DoubleSide }));
    reh.position.z = (zB + zD)/2; part(reh, V(0,0,8));
    // markers
    const mkM = metal(S.markerMetal, 'polished', HMATS), lm = lumeMat();
    markerSet(S, g).items.forEach(it => {
      if (it.k === 'p' || (it.k === 'l' && !S.lume)) return;
      const pts = rot(it.pts, it.a);
      const m = it.k === 'm' ? new T.Mesh(extrude(shape(pts), .28, .06, 12), mkM) : new T.Mesh(extrude(shape(pts), .08, 0, 12), lm);
      m.position.z = zD + (it.k === 'm' ? .06 : .42); part(m, V(0,0,10));
    });
    // hands
    const hm = metal(S.handMetal, 'polished', HMATS), secM = new T.MeshPhysicalMaterial({ color:col(S.secColor), metalness:.3, roughness:.3, clearcoat:.6 });
    const mkHand = (parts, mat, z, ex) => {
      const grp = new T.Group(); grp.position.z = z;
      parts.forEach(p => { if (p.k === 'l' && !S.lume) return;
        const m = p.k === 'm' ? new T.Mesh(extrude(shape(p.pts, p.holes), .14, .05, 16), mat) : new T.Mesh(extrude(shape(p.pts), .05, 0, 16), lm);
        m.position.z = p.k === 'm' ? .05 : .22; grp.add(m); });
      return part(grp, V(0,0,ex));
    };
    hands = { h:mkHand(handParts(S.hands,'h',g.R), hm, zD + .5, 13), m:mkHand(handParts(S.hands,'m',g.R), hm, zD + .85, 15), s:null };
    if (S.seconds) hands.s = mkHand(secParts(S, g.R), secM, zD + 1.2, 17);
    const cap = new T.Mesh(zAxis(new T.CylinderGeometry(g.R*.028, g.R*.028, .3, 24)), S.seconds ? secM : hm); cap.position.z = zD + (S.seconds ? 1.5 : 1.15); part(cap, V(0,0,17));
    buildCrystal(S, g, zTop);
    buildMovementAndBack(S, g, topM);
    return attach;
  }
  function buildCrown(S, g, mat){
    const grp = new T.Group(); grp.position.set(g.cr - .6, 0, g.cb + g.midH/2); grp.rotation.z = -PI/2;
    const r = g.cd/2, L = g.cl;
    const tube = new T.Mesh(new T.CylinderGeometry(r*.55, r*.55, 1.6, 32).translate(0, .8, 0), mat); grp.add(tube);
    let body;
    if (S.crown === 'onion'){
      const pts = []; for (let i = 0; i <= 40; i++){ const t = i/40; pts.push(new T.Vector2(Math.max(.01, r*(.72 + .28*Math.abs(Math.sin(3*PI*t)))*(t === 0 || t === 1 ? .8 : 1)), t*L)); }
      body = new T.LatheGeometry(pts, 64);
    } else {
      const top = S.crown === 'pilot' ? r*.9 : r;
      body = new T.CylinderGeometry(top, r, L, 128, 1).translate(0, L/2, 0);
      if (['fluted','screw','pilot'].includes(S.crown)){
        const n = S.crown === 'pilot' ? 30 : 24, p = body.attributes.position;
        for (let i = 0; i < p.count; i++){ const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z); if (rr < r*.6) continue; const f = 1 - .07*(.5 + .5*Math.cos(n*Math.atan2(x, z))); p.setX(i, x*f); p.setZ(i, z*f); }
        body.computeVertexNormals();
      }
    }
    const bm = new T.Mesh(body, mat); bm.position.y = 1.1; grp.add(bm);
    if (S.crown === 'cabochon'){
      const gem = new T.Mesh(new T.SphereGeometry(r*.45, 32, 16, 0, TAU, 0, PI/2), new T.MeshPhysicalMaterial({ color:col(S.gemColor), roughness:.05, transmission:.4, ior:1.77, thickness:1 }));
      gem.position.y = 1.1 + L; grp.add(gem);
    }
    part(grp, V(12,0,0));
  }
  function buildBezel(S, g, zB, caseM, polM){
    const { bzI:ri, bzO:ro, bh } = g, t = S.bezelType;
    const P = t === 'smooth' ? [[ri,0],[ro,0],[ro,bh*.45],[ro-.35,bh],[ri+.25,bh],[ri,bh*.75],[ri,0]]
      : t === 'fluted' ? [[ri,0],[ro,0],[ro,bh*.3],[ri+.35,bh],[ri,bh*.85],[ri,0]]
      : [[ri,0],[ro,0],[ro,bh*.85],[ro-.3,bh],[ro-.65,bh],[ro-.65,bh*.78],[ri+.3,bh*.78],[ri,bh*.7],[ri,0]];
    const seg = t === 'smooth' ? 128 : 480;
    const geom = new T.LatheGeometry(P.map(([r, h]) => new T.Vector2(r, h)), seg), p = geom.attributes.position;
    if (t !== 'smooth'){
      const nF = Math.round(ro*4.2);
      for (let i = 0; i < p.count; i++){
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rr = Math.hypot(x, z), th = Math.atan2(x, z); let f = 1;
        if (t === 'fluted' && y > bh*.25 && rr > ri + .3) f = 1 - (.35/rr)*(.5 + .5*Math.cos(nF*th));
        if (g.insert && rr > ro - .05 && y < bh*.9) f = 1 - (.18/rr)*(.5 + .5*Math.cos(120*th));
        p.setX(i, x*f); p.setZ(i, z*f);
      }
      geom.computeVertexNormals();
    }
    const m = new T.Mesh(zAxis(geom), t === 'fluted' ? polM : caseM); m.position.z = zB; part(m, V(0,0,20));
    if (g.insert){
      const rO = ro - .65, mat = S.insertMat === 'ceramic'
        ? new T.MeshPhysicalMaterial({ roughness:.1, clearcoat:1, clearcoatRoughness:.03, metalness:0 })
        : new T.MeshPhysicalMaterial({ roughness:.42, metalness:.5 });
      mat.map = canvasTex(2048, rO, x => drawInsert(x, S, g));
      if (t === 'diver'){ mat.emissiveMap = canvasTex(512, rO, x => drawInsert(x, S, g, 'lume')); mat.emissive = col(LUME[S.lumeType].glow); mat.emissiveIntensity = 0; st.lumeMats.push(mat); }
      const ins = new T.Mesh(new T.RingGeometry(ri + .3, rO, 192, 1), mat); ins.position.z = zB + bh*.78 + .02; part(ins, V(0,0,20.5));
    }
  }
  function buildCrystal(S, g, zTop){
    const rc = g.bzI + .15, glass = new T.MeshPhysicalMaterial({ transmission:1, thickness:.6, roughness:.02, ior:S.crystal === 'hesalite' ? 1.5 : 1.76, metalness:0, iridescence:.25, iridescenceIOR:1.3, specularIntensity:1 });
    const grp = new T.Group(); let topZ;
    if (S.crystal === 'flat'){ const c = new T.Mesh(zAxis(new T.CylinderGeometry(rc, rc, 1, 96)), glass); c.position.z = zTop - .2; grp.add(c); topZ = () => zTop + .3; }
    else {
      const wall = S.crystal === 'box' ? 1.6 : .4, h = g.cry - (S.crystal === 'box' ? 1.5 : 0) + .2, Rs = (rc*rc + h*h)/(2*h), th = Math.asin(Math.min(1, rc/Rs));
      const c = new T.Mesh(zAxis(new T.CylinderGeometry(rc, rc, wall + .5, 96, 1, true)), glass); c.position.z = zTop - .5 + (wall + .5)/2; grp.add(c);
      const cap = new T.Mesh(zAxis(new T.SphereGeometry(Rs, 96, 24, 0, TAU, 0, th)), glass); const base = zTop + wall - .5; cap.position.z = base - Rs*Math.cos(th); grp.add(cap);
      topZ = r => base - Rs*Math.cos(th) + Math.sqrt(Math.max(0, Rs*Rs - r*r));
    }
    const dp = datePos(S, g);
    if (S.cyclops && dp){ const lens = new T.Mesh(zAxis(new T.CylinderGeometry(g.R*.14, g.R*.14, 1.1, 48)), glass); lens.position.set(dp.x, dp.y, topZ(Math.hypot(dp.x, dp.y)) + .45); grp.add(lens); }
    grp.traverse(o => { if (o.isMesh) o.castShadow = false; });
    head.add(grp); grp.userData.base = grp.position.clone(); grp.userData.ex = V(0,0,26); st.parts.push(grp);
  }
  function buildMovementAndBack(S, g, caseM){
    const mv = S.movement, rM = g.R*.95, t = g.mv.t;
    const mvG = new T.Group();
    const plate = new T.Mesh(zAxis(new T.CylinderGeometry(rM, rM, t, 96)), new T.MeshStandardMaterial({ color:'#c4c7cb', metalness:.9, roughness:.3 })); plate.position.z = g.cb + t/2; mvG.add(plate);
    const face = new T.Mesh(new T.CircleGeometry(rM, 96).rotateY(PI), new T.MeshStandardMaterial({ map:canvasTex(1024, rM, x => drawMovement(x, S, rM, 0, false)), metalness:.6, roughness:.35 }));
    face.position.z = g.cb - .02; mvG.add(face); part(mvG, V(0,0,-10));
    rotor = null;
    if (['auto','hibeat','spring'].includes(mv)){
      const P = []; for (let i = 0; i <= 48; i++){ const a = PI*i/48; P.push([Math.cos(a)*rM*.96, Math.sin(a)*rM*.96]); } for (let i = 24; i >= 0; i--){ const a = PI*i/24; P.push([Math.cos(a)*rM*.16, Math.sin(a)*rM*.16]); }
      const gold = ['gold','rose','bronze'].includes(S.caseMat);
      rotor = new T.Mesh(extrude(shape(P), .35, .08, 48), new T.MeshPhysicalMaterial({ color:gold ? '#d8b56a' : '#c3c7cc', metalness:1, roughness:.22 }));
      rotor.position.z = g.cb - .75; part(rotor, V(0,0,-17));
    }
    const cbR = g.cr*.88;
    if (S.caseback === 'solid'){
      const body = new T.Mesh(zAxis(new T.CylinderGeometry(cbR, cbR, g.cb, 96)), caseM); body.position.z = g.cb/2; part(body, V(0,0,-24));
      const et = canvasTex(1024, cbR, x => drawEngraving(x, S, cbR));
      const f = new T.Mesh(new T.CircleGeometry(cbR*.99, 96).rotateY(PI), new T.MeshPhysicalMaterial({ map:et, bumpMap:et, bumpScale:.6, metalness:1, roughness:.3 }));
      f.position.z = -.02; part(f, V(0,0,-24));
    } else {
      const ring = new T.Mesh(extrude(shape(circlePts(cbR - .2, 96), [circlePts(cbR*.8 + .2, 96)]), g.cb - .4, .2, 64), caseM); ring.position.z = .2; part(ring, V(0,0,-24));
      const gl = new T.Mesh(zAxis(new T.CylinderGeometry(cbR*.8 + .05, cbR*.8 + .05, .6, 96)), new T.MeshPhysicalMaterial({ transmission:1, thickness:.5, roughness:.03, ior:1.76 }));
      gl.position.z = .5; gl.castShadow = false; head.add(gl); gl.userData.base = gl.position.clone(); gl.userData.ex = V(0,0,-24); st.parts.push(gl);
    }
  }

  /* ---------- strap / bracelet ---------- */
  function stripTex(S, lenMm){
    const c = document.createElement('canvas'); c.width = 256; c.height = 2048; const x = c.getContext('2d'), pv = 2048/lenMm, t = S.strap;
    x.fillStyle = S.strapColor; x.fillRect(0,0,256,2048);
    if (t === 'nato'){ x.fillStyle = S.strapAccent; x.fillRect(72,0,30,2048); x.fillRect(154,0,30,2048); x.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < 2048; y += 5) x.fillRect(0,y,256,1.5); }
    if (t === 'leather'){ x.fillStyle = noisePattern(x); x.fillRect(0,0,256,2048); x.setLineDash([1.1*pv, .7*pv]); x.lineWidth = 5; x.strokeStyle = S.strapAccent; [26, 230].forEach(u => { x.beginPath(); x.moveTo(u, 0); x.lineTo(u, 2048); x.stroke(); }); }
    if (t === 'rubber'){ x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(84,0,5,2048); x.fillRect(167,0,5,2048); }
    const gr = x.createLinearGradient(0,0,256,0); gr.addColorStop(0,'rgba(0,0,0,.35)'); gr.addColorStop(.12,'rgba(0,0,0,0)'); gr.addColorStop(.88,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,.35)');
    x.fillStyle = gr; x.fillRect(0,0,256,2048);
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8; return tx;
  }
  function meshTex(){
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#9a9a9a'; x.fillRect(0,0,64,64); x.lineWidth = 7;
    for (let i = -64; i < 128; i += 16){ x.strokeStyle = '#ffffff'; x.beginPath(); x.moveTo(i,0); x.lineTo(i+32,64); x.stroke(); x.strokeStyle = '#2a2a2a'; x.lineWidth = 2; x.beginPath(); x.moveTo(i+8,0); x.lineTo(i+40,64); x.stroke(); x.lineWidth = 7; }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  // a strap half = a path from the lug outwards; frames give position, tangent, outward normal and width axis
  function strapHalves(yA, zA, th){
    const X = V(1,0,0), segOf = (curve, from, to, xs) => {
      const Lt = curve.getLength();
      return { len: Math.abs(to - from), fr: d => { const u = clamp01((from + Math.sign(to - from)*d)/Lt), P = curve.getPointAt(u), Tn = curve.getTangentAt(u).multiplyScalar(Math.sign(to - from)), Xs = X.clone().multiplyScalar(xs); return { P, Tn, X:Xs, N: V().crossVectors(Xs, Tn).normalize() }; } };
    };
    if (st.mode === 'table'){
      // laid out flat with the buckle opened: two straight halves on the table
      const z0 = th/2 + .05;
      return [1, -1].map(sy => { const len = sy > 0 ? 118 : 84;
        const c = new T.CatmullRomCurve3([V(0, sy*yA, zA), V(0, sy*(yA + 3), (zA + z0)*.45), V(0, sy*(yA + 9), z0), V(0, sy*(yA + 30), z0), V(0, sy*(yA + len), z0)], false, 'centripetal');
        const s = segOf(c, 0, c.getLength(), sy); s.taper = 70; s.end = sy < 0; return s; });
    }
    // closed loop around the cushion or the wrist (ellipse)
    const ab = st.mode === 'wrist' ? wristAB() : { a:RP, b:RP }, A = ab.a + th/2 + .15, B = ab.b + th/2 + .15;
    const phi0 = Math.atan2(yA/A, zA/B) + .32, pts = [V(0, yA, zA)];
    for (let i = 0; i <= 28; i++){ const f = phi0 + (TAU - 2*phi0)*i/28; pts.push(V(0, A*Math.sin(f), B*Math.cos(f))); }
    pts.push(V(0, -yA, zA));
    const curve = new T.CatmullRomCurve3(pts, false, 'centripetal'), Lt = curve.getLength(), half = Lt/2;
    const a = segOf(curve, 0, half, 1), b = segOf(curve, Lt, half, -1); a.taper = b.taper = half; a.loop = b.loop = true;
    return [a, b];
  }
  function buildStrap(S, g, at){
    strapGrp = new T.Group();
    const th = STRAP_TH[S.strap], yA = at.y, zA = st.hz + at.z, halves = strapHalves(yA, zA, th);
    const cw = S.strap === 'nato' ? g.lugW - .4 : g.lugW*.8, wAt = (h, d) => g.lugW - .4 - (g.lugW - .4 - cw)*Math.min(1, d/h.taper);
    const bracelet = ['oyster','jubilee'].includes(S.strap);
    const caseB = metal(S.caseMat, 'brushed'), caseP = metal(S.caseMat, 'polished'), loop = halves[0].loop;

    const ribbon = (h, d0, d1, mat, lenMm) => {
      const pos = [], nor = [], uv = [], idx = [], rows = [], segs = 90;
      for (let i = 0; i <= segs; i++){ const d = d0 + (d1 - d0)*i/segs; rows.push({ ...h.fr(d), w:wAt(h, d), v:d/lenMm }); }
      const c = (r, sx, sn) => r.P.clone().addScaledVector(r.X, sx*r.w/2).addScaledVector(r.N, sn*th/2);
      const strip = (A, B, nf, uA, uB) => { const base = pos.length/3;
        rows.forEach(r => { const a = A(r), b = B(r), n = nf(r); pos.push(a.x,a.y,a.z,b.x,b.y,b.z); nor.push(n.x,n.y,n.z,n.x,n.y,n.z); uv.push(uA, r.v, uB, r.v); });
        for (let i = 0; i < rows.length - 1; i++){ const a = base + i*2; idx.push(a, a+1, a+2, a+1, a+3, a+2); } };
      strip(r => c(r,-1,1), r => c(r,1,1), r => r.N, 0, 1);
      strip(r => c(r,1,-1), r => c(r,-1,-1), r => r.N.clone().negate(), 1, 0);
      strip(r => c(r,-1,-1), r => c(r,-1,1), r => r.X.clone().negate(), 0, .05);
      strip(r => c(r,1,1), r => c(r,1,-1), r => r.X, .95, 1);
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
      const m = new T.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; strapGrp.add(m);
    };
    if (bracelet){
      const unit = new RoundedBoxGeometry(1, 1, 1, 2, .14), mats = [caseB, S.strap === 'oyster' && S.braceletCenter === 'brushed' ? caseB : caseP], rows = [[], []];
      const push = (list, h, d, xoff, w, len) => { const f = h.fr(d), m = new T.Matrix4().makeBasis(f.X, f.Tn, f.N); m.scale(V(w, len, th)); m.setPosition(f.P.clone().addScaledVector(f.X, xoff)); list.push(m); };
      const p = S.strap === 'oyster' ? 6.2 : 4.4;
      for (const h of halves){
        const stop = h.len - (loop ? 14 : 2);
        push(rows[0], h, 1.7, 0, g.lugW - .6, 3.2);
        for (let d = 3.6 + p/2; d < stop; d += p){
          const w = wAt(h, d);
          if (S.strap === 'oyster'){ push(rows[0], h, d, -w*.35, w*.29, p - .3); push(rows[0], h, d, w*.35, w*.29, p - .3); push(rows[1], h, d, 0, w*.38, p - .3); }
          else { push(rows[0], h, d, -w*.37, w*.25, p - .3); push(rows[0], h, d, w*.37, w*.25, p - .3);
            for (const [xo, off] of [[-w*.16, 0], [0, p/2], [w*.16, 0]]) for (const k of [0, .5]){ const dd = d - p/4 + off/2 + k*p; if (dd < stop) push(rows[1], h, dd, xo, w*.14, p*.46); } }
        }
      }
      rows.forEach((list, i) => { const im = new T.InstancedMesh(unit, mats[i], list.length); list.forEach((m, j) => im.setMatrixAt(j, m)); im.castShadow = im.receiveShadow = true; strapGrp.add(im); });
    } else {
      const lenMm = Math.max(...halves.map(h => h.len));
      let mat;
      if (S.strap === 'mesh'){ const tx = meshTex(); tx.repeat.set(g.lugW/1.4, lenMm/1.4); mat = new T.MeshPhysicalMaterial({ color:col(MATS[S.caseMat].base), metalness:1, roughness:.35, bumpMap:tx, bumpScale:1.2, side:T.DoubleSide }); }
      else { const tx = stripTex(S, lenMm); mat = new T.MeshPhysicalMaterial({ map:tx, side:T.DoubleSide, roughness:S.strap === 'rubber' ? .5 : .78, clearcoat:S.strap === 'rubber' ? .2 : .05, sheen:S.strap === 'nato' ? .8 : S.strap === 'leather' ? .3 : 0, sheenColor:col('#ffffff') }); }
      halves.forEach(h => ribbon(h, 0, h.len - (loop ? .1 : 0), mat, lenMm));
      if (S.strap === 'nato' && loop){ const u = new T.Mesh(new T.BoxGeometry(g.lugW - .4, 2*yA, th), mat); u.position.z = st.hz - th/2 - .05; u.castShadow = true; strapGrp.add(u); }
    }
    // spring bars
    for (const sy of [1, -1]){ const bar = new T.Mesh(new T.CylinderGeometry(.6, .6, g.lugW + 1, 12).rotateZ(PI/2), caseP); bar.position.set(0, sy*yA, zA); strapGrp.add(bar); }
    // clasp: under the wrist / cushion, or at the end of the short half when laid flat
    const ch = loop ? halves[0] : halves.find(h => h.end), f = ch.fr(loop ? ch.len : ch.len - 5), cg = new T.Group();
    cg.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(f.X, f.Tn, f.N)); cg.position.copy(f.P).addScaledVector(f.N, th/2);
    const w = wAt(ch, ch.len), plate = (pw, pl, pt, mat, y = 0, z = 0) => { const m = new T.Mesh(new RoundedBoxGeometry(pw, pl, pt, 3, Math.min(pt, pw)/2.5), mat); m.position.set(0, y, pt/2 + z); m.castShadow = true; cg.add(m); };
    switch (S.clasp){
      case 'pin': {
        const r = .8, bw = w/2 + 1.4, bl = 4.5, path = new T.CatmullRomCurve3([V(-bw,-bl,0), V(bw,-bl,0), V(bw+.6,0,0), V(bw,bl,0), V(-bw,bl,0), V(-bw-.6,0,0)], true);
        const buckle = new T.Mesh(new T.TubeGeometry(path, 64, r, 12, true), caseP); buckle.position.z = r; cg.add(buckle);
        const prong = new T.Mesh(new T.CylinderGeometry(.5, .5, bl*2, 10), caseP); prong.position.z = r*1.4; cg.add(prong);
        const keeper = new T.Mesh(new RoundedBoxGeometry(w + 1.4, 3.5, 1.4, 2, .5), new T.MeshStandardMaterial({ color:col(S.strapColor), roughness:.8 })); keeper.position.set(0, loop ? 9 : -9, .5); cg.add(keeper);
        break; }
      case 'deployant': plate(w*.85, 24, 1.4, caseP); break;
      case 'butterfly': plate(w*.5, 10, 1.1, caseP); break;
      case 'slider': plate(w + .6, 20, 2.2, caseP); break;
      case 'fold': plate(w*.95, 26, 1.6, caseB); plate(w*.5, 6, .5, caseP, 0, 1.6); break;
      case 'oysterlock': plate(w*.98, 32, 2.2, caseB); plate(w*.62, 7, .8, caseP, 11, 2.2); break;
      case 'glidelock': plate(w*.98, 36, 2.6, caseB); plate(w*.62, 7, .8, caseP, 13, 2.6); plate(w*.9, 1.2, .3, caseP, -8, 2.6); break;
    }
    cg.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    strapGrp.add(cg);
    return strapGrp;
  }

  /* ---------- wrist (stylised display mannequin) ---------- */
  function buildWrist(){
    const { a, b } = wristAB(), L = 300, grp = new T.Group();
    const mat = new T.MeshPhysicalMaterial({ color:'#a89888', roughness:.6, clearcoat:.15, clearcoatRoughness:.5, sheen:.4, sheenColor:col('#fff1e2') });
    const arm = new T.CapsuleGeometry(1, L, 16, 72).rotateZ(PI/2).translate(-60, 0, 0), p = arm.attributes.position;
    for (let i = 0; i < p.count; i++){ const x = p.getX(i), k = 1 + Math.max(0, -x - 10)/L*.7; p.setY(i, p.getY(i)*a*k); p.setZ(i, p.getZ(i)*b*k); }
    arm.computeVertexNormals();
    const hand = new T.SphereGeometry(1, 64, 32).scale(62, a*1.32, b*.74).translate(118, 0, -b*.12);
    grp.add(new T.Mesh(arm, mat), new T.Mesh(hand, mat));
    grp.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    return grp;
  }

  /* ---------- placard ---------- */
  function placardTex(S, g){
    const c = document.createElement('canvas'); c.width = 1024; c.height = 400; const x = c.getContext('2d');
    x.fillStyle = '#f1eee7'; x.fillRect(0,0,1024,400);
    x.fillStyle = '#1d1c1a'; x.textAlign = 'left';
    x.font = `${S.brandWeight} ${S.brandItalic ? 'italic ' : ''}78px ${fam(S.brandFont)}`; x.fillText(S.brandUpper ? brandLabel(S).toUpperCase() : brandLabel(S), 60, 125);
    x.font = '600 30px Inter, sans-serif'; x.fillStyle = '#9a7a3a'; x.fillText(`REF. ${refCode()} · ${g.D} MM`, 62, 190);
    x.font = '400 30px Inter, sans-serif'; x.fillStyle = '#3a3833';
    x.fillText(`${MATS[S.caseMat].name} · ${g.C.name}`, 62, 250);
    x.fillText(`${g.mv.name}, Cal. ${g.mv.cal} · ${g.T.toFixed(1)} mm · ${CLASPS[S.clasp]}`, 62, 295);
    x.font = 'italic 400 26px "Cormorant Garamond", serif'; x.fillStyle = '#7a756b'; x.fillText('From the Gigacook Horology collection · GC-TIME', 62, 355);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
  }

  /* ---------- build / modes / camera ---------- */
  function dispose(o){ o.traverse(m => { if (m.geometry) m.geometry.dispose(); const ms = m.material ? [].concat(m.material) : []; ms.forEach(mt => { for (const k in mt) if (mt[k] && mt[k].isTexture) mt[k].dispose(); mt.dispose(); }); }); }
  function build(S){
    if (assembly){ scene.remove(assembly); dispose(assembly); }
    if (placard){ scene.remove(placard); dispose(placard); }
    st.S = S; st.g = geo(S); st.lumeMats = []; st.explode = st.exT = 0; st.lume = st.lumeT = 0;
    ['#rExplode','#rLights'].forEach(id => q(id).classList.remove('on')); q('#rExplode').textContent = 'Exploded view'; q('#rLights').textContent = 'Lights out (lume)';
    const g = st.g;
    assembly = new T.Group(); scene.add(assembly);
    const pts = []; for (let i = 0; i <= 48; i++){ const t = -1 + 2*i/48; pts.push(new T.Vector2(Math.max(.01, RP*Math.pow(1 - Math.pow(Math.abs(t), 5), 1/5)), t*44)); }
    pillowMesh = new T.Mesh(new T.LatheGeometry(pts, 96).rotateZ(PI/2), new T.MeshPhysicalMaterial({ roughness:.92, sheen:1, sheenRoughness:.4, side:T.DoubleSide }));
    pillowMesh.castShadow = pillowMesh.receiveShadow = true; assembly.add(pillowMesh);
    st.at = buildHead(S, g); assembly.add(head);
    placard = new T.Mesh(new T.PlaneGeometry(130, 51), new T.MeshStandardMaterial({ map:placardTex(S, g), roughness:.6 })); placard.position.set(0, -110, 95.6); scene.add(placard);
    q('#hudBrand').textContent = (S.brandUpper ? brandLabel(S).toUpperCase() : brandLabel(S)) || 'GC-TIME';
    q('#hudRef').textContent = `Ref. ${refCode()} · ${MATS[S.caseMat].short.toLowerCase()} · ${g.mv.name.toLowerCase()}`;
    q('#hudSize').innerHTML = `<b>${g.D}<small>mm</small></b><span>${g.l2l} mm lug-to-lug · ${g.T.toFixed(1)} mm thick</span>`;
    setMode(st.mode);
  }
  function setMode(m){
    st.mode = m;
    const wrist = m === 'wrist', flat = m === 'table';
    if (strapGrp){ assembly.remove(strapGrp); dispose(strapGrp); strapGrp = null; }
    if (wristMesh){ assembly.remove(wristMesh); dispose(wristMesh); wristMesh = null; }
    // assembly frame: cushion axis / table surface / forearm axis
    if (flat){ assembly.position.set(0, 0, 0); assembly.rotation.set(-PI/2, 0, 0); st.hz = 0; }
    else if (wrist){ const { b } = wristAB(); assembly.position.set(0, 150, 0); assembly.rotation.set(-1.15, 0, 0); st.hz = b + .4; wristMesh = buildWrist(); assembly.add(wristMesh); }
    else { assembly.position.set(0, RP, 0); assembly.rotation.set(-.5, 0, 0); st.hz = HZ; pillowMesh.material.color = col(MODES[m][1]); pillowMesh.material.sheenColor = col(MODES[m][1]).lerp(col('#ffffff'), .35); }
    pillowMesh.visible = !flat && !wrist;
    plinth.visible = placard.visible = !wrist; if (wrist) vitrine.visible = false;
    head.position.set(0, 0, st.hz);
    assembly.add(buildStrap(st.S, st.g, st.at));
    assembly.updateMatrixWorld(true);
    st.target = head.localToWorld(V(0, 0, st.g.T/2));
    key.target.position.copy(st.target); rim.target.position.copy(st.target);
    controls.enabled = !wrist && !st.welcome;
    q('#render').classList.toggle('static', wrist);
    q('#rWrist').hidden = !wrist;
    document.querySelectorAll('#rModes button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  }
  function camFor(angle){
    const D = st.g.D, t = st.target.clone(), n = V(0,0,1).applyQuaternion(assembly.quaternion);
    const [dir, dist] = {
      hero:  [st.mode === 'table' ? V(.25, .95, .7) : n.clone().add(V(.32, .06, 0)), D*(st.welcome ? 3.4 : 3.1)],
      front: [n, D*3],
      side:  [V(1, .22, .2), D*3.2],
      top:   [V(0, 1, .0008), D*3.8],
      wrist: [V(.12, .95, .62), D*5.2],
    }[angle];
    // portrait screens need more distance to fit the same watch width
    const k = camera.aspect < 1 ? Math.min(2.2, .9/camera.aspect)*(st.welcome ? 1.35 : 1) : 1;
    return { pos: t.clone().add(dir.normalize().multiplyScalar(dist*k)), tgt: t };
  }
  function goAngle(a, instant){
    if (a === 'top' && st.mode !== 'table') setMode('table');
    if (a === 'wrist' && st.mode !== 'wrist') setMode('wrist');
    if (a !== 'wrist' && st.mode === 'wrist') setMode('cream');
    st.angle = a;
    const c = camFor(a);
    if (instant){ camera.position.copy(c.pos); controls.target.copy(c.tgt); st.intro = 1; }
    else { st.camFrom = camera.position.clone(); st.tgtFrom = controls.target.clone(); st.camTo = c.pos; st.tgtTo = c.tgt; st.intro = 0; }
    document.querySelectorAll('#rAngles button').forEach(b => b.classList.toggle('on', b.dataset.angle === a));
  }

  /* ---------- export ---------- */
  function saveImage(){
    renderer.render(scene, camera);
    const src = renderer.domElement, c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d'); x.drawImage(src, 0, 0);
    // bake the on-screen saturation boost into the file
    const im = x.getImageData(0, 0, c.width, c.height), d = im.data, k = 1.22;
    for (let i = 0; i < d.length; i += 4){ const l = .2126*d[i] + .7152*d[i+1] + .0722*d[i+2]; d[i] = l + (d[i]-l)*k; d[i+1] = l + (d[i+1]-l)*k; d[i+2] = l + (d[i+2]-l)*k; }
    x.putImageData(im, 0, 0);
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = exportName('png'); a.click();
  }

  /* ---------- loop ---------- */
  function tick(){
    if (!st.running) return;
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), .05), S = st.S;
    if (st.intro < 1){ st.intro = Math.min(1, st.intro + dt/1.6); const e = 1 - Math.pow(1 - st.intro, 3); camera.position.lerpVectors(st.camFrom, st.camTo, e); controls.target.lerpVectors(st.tgtFrom, st.tgtTo, e); }
    st.explode += (st.exT - st.explode)*Math.min(1, dt*3);
    st.lume += (st.lumeT - st.lume)*Math.min(1, dt*2.5);
    const e = st.explode, Lm = st.lume, LI = st.mode === 'wrist' ? WRIST_LIGHT : LIGHT;
    for (const p of st.parts) p.position.copy(p.userData.base).addScaledVector(p.userData.ex, e);
    head.position.set(0, e*6, st.hz + e*40); head.rotation.y = e*.55;
    strapGrp.visible = e < .03;
    const a = handAngles(S);
    hands.h.rotation.z = -a.h; hands.m.rotation.z = -a.m; if (hands.s) hands.s.rotation.z = -a.s;
    if (rotor) rotor.rotation.z += dt*(.3 + e*1.6);
    renderer.toneMappingExposure = LI.exposure;
    key.intensity = LI.key*(1 - Lm*.97); rim.intensity = LI.rim*(1 - Lm); hemi.intensity = LI.ambient*(1 - Lm*.9);
    scene.environmentIntensity = LI.env*(1 - Lm*.94); cone.material.opacity = LI.beam*(1 - Lm);
    bgSpots.forEach(s => s.intensity = LI.gallery*(1 - Lm));
    st.lumeMats.forEach(m => m.emissiveIntensity = Lm*2.4);
    controls.update(); renderer.render(scene, camera);
  }

  async function open(S0, opts = {}){
    st.welcome = !!opts.welcome;
    const ov = q('#render'); ov.hidden = false; ov.classList.toggle('welcome', st.welcome);
    q('#rLoading').classList.remove('fade'); q('#rLoading p').textContent = st.welcome ? 'Opening the atelier…' : 'Setting up the showcase…';
    try { await load(); } catch (err){ q('#rLoading p').textContent = 'Could not load three.js from the CDN — are you offline?'; return; }
    if (!renderer){ try { init(); } catch (err){ renderer = null; q('#rLoading p').textContent = 'This browser could not start 3D (WebGL is unavailable).'; return; } }
    // the welcome shot is rendered above screen resolution so the hero watch stays crisp
    renderer.setPixelRatio(Math.min(devicePixelRatio*(st.welcome ? 1.35 : 1), st.welcome ? 2.6 : 2));
    if (st.welcome || st.mode === 'wrist') st.mode = 'cream';
    resize();
    build(JSON.parse(JSON.stringify(S0)));
    const c = camFor('hero');
    if (st.welcome) goAngle('hero', true);
    else { camera.position.copy(c.tgt.clone().add(V(-260, 340, 820))); controls.target.copy(c.tgt); goAngle('hero'); }
    if (!st.running){ st.running = true; clock.getDelta(); tick(); }
    setTimeout(() => q('#rLoading').classList.add('fade'), 300);
  }
  function close(){ q('#render').hidden = true; st.running = false; if (st.welcome){ st.welcome = false; q('#render').classList.remove('welcome'); resize(); } }
  return { open, close };
})();
