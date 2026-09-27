'use strict';
/* ================= 3D showcase (three.js, loaded on demand from jsDelivr) ================= */
window.Render3D = (() => {
  let T, OrbitControls, RoomEnvironment, RoundedBoxGeometry;
  let renderer, scene, camera, controls, clock, key, rim, hemi, cone, vitrine, bgSpots = [], placard, plinth;
  let assembly, head, strapGrp, pillowMesh, rotor, hands;
  const st = { S:null, g:null, parts:[], lumeMats:[], explode:0, exT:0, lume:0, lumeT:0, running:false, pillow:0, intro:1, camFrom:null, camTo:null, target:null };
  const PILLOWS = [['cream','#d8cdb8'],['black velvet','#1a1a1c'],['burgundy','#5a1a24'],['navy','#1c2640'],['grey flannel','#6d6f73']];
  const RP = 27;                       // cushion radius, mm (≈ wrist)
  const HZ = RP + .3;                  // caseback height above cushion axis
  const q = s => document.querySelector(s);
  // every lighting value in the scene, exposed as sliders in the render HUD
  const LIGHT = { exposure:1.05, key:5, rim:3, ambient:.25, env:.55, gallery:2.2, beam:.03 };
  const LIGHT_UI = [
    ['exposure', 'Room light (exposure)', 0, 3, .01],
    ['key',      'Key spotlight',         0, 20, .1],
    ['rim',      'Rim light',             0, 12, .1],
    ['ambient',  'Ambient fill',          0, 2, .01],
    ['env',      'Reflections',           0, 2, .01],
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
  }

  /* ---------- helpers ---------- */
  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const col = h => new T.Color(h);
  function metal(key, finish = 'polished', table = MATS){
    const m = table[key];
    if (m.paint) return new T.MeshPhysicalMaterial({ color:col(m.base), metalness:.1, roughness:.35, clearcoat:.7 });
    const br = finish === 'brushed';
    return new T.MeshPhysicalMaterial({ color:col(m.base), metalness:1, roughness:br ? .3 : .1, anisotropy:br ? .6 : 0 });
  }
  function canvasTex(size, extent, draw){
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'), k = size / (2*extent); PXMM = k;
    x.setTransform(k,0,0,-k,size/2,size/2); draw(x);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  const shape = (pts, holes = []) => { const s = new T.Shape(pts.map(p => new T.Vector2(p[0], p[1]))); holes.forEach(h => s.holes.push(new T.Path(h.map(p => new T.Vector2(p[0], p[1]))))); return s; };
  const extrude = (sh, depth, bevel = .1, cs = 24) => new T.ExtrudeGeometry(sh, { depth, bevelEnabled:bevel > 0, bevelThickness:bevel, bevelSize:bevel, bevelSegments:2, curveSegments:cs });
  function part(mesh, ex = V(), parent = head){
    mesh.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    mesh.userData.base = mesh.position.clone(); mesh.userData.ex = ex; parent.add(mesh); st.parts.push(mesh); return mesh;
  }
  const lumeMat = () => { const m = new T.MeshStandardMaterial({ color:col(LUME[st.S.lumeType].c), emissive:col(LUME[st.S.lumeType].glow), emissiveIntensity:0, roughness:.6 }); st.lumeMats.push(m); return m; };
  const zAxis = geom => geom.rotateX(PI/2); // Y-built geometry -> Z axis

  /* ---------- scene ---------- */
  function init(){
    renderer = new T.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    q('#glwrap').appendChild(renderer.domElement);
    scene = new T.Scene(); scene.background = col('#060607'); scene.fog = new T.Fog('#060607', 1000, 2800);
    const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55;
    camera = new T.PerspectiveCamera(28, 1, 5, 9000);
    controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, { enableDamping:true, dampingFactor:.06, minDistance:70, maxDistance:1500, autoRotate:true, autoRotateSpeed:.6, maxPolarAngle:PI*.8 });
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
    btn('#rPillow', e => { st.pillow = (st.pillow + 1) % PILLOWS.length; setPillow(); e.target.textContent = 'Cushion: ' + PILLOWS[st.pillow][0]; });
    btn('#rShot', () => { renderer.render(scene, camera); const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/png'); a.download = (st.S.brand || 'watch') + '-showcase.png'; a.click(); });
  }
  function setPillow(){ if (!pillowMesh) return; const c = col(PILLOWS[st.pillow][1]); pillowMesh.material.color = c; pillowMesh.material.sheenColor = c.clone().lerp(col('#ffffff'), .35); }
  function resize(){ if (!renderer) return; renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }

  /* ---------- watch head ---------- */
  function buildHead(S, g){
    head = new T.Group(); st.parts = [];
    const fin = S.caseFinish, caseM = metal(S.caseMat, fin === 'polished' ? 'polished' : 'brushed'), polM = metal(S.caseMat, 'polished');
    const zB = g.cb + g.midH, zD = zB - 1.2, zTop = zB + g.bh;
    // case middle
    const b = .5, outer = g.C.cushion ? squircle(g.cr - b) : circlePts(g.cr - b, 128);
    const mid = new T.Mesh(extrude(shape(outer, [circlePts(g.bzI + b, 128)]), g.midH - 2*b, b, 64), fin === 'mixed' ? polM : caseM);
    mid.position.z = g.cb + b; part(mid);
    // lugs (tilted toward the wrist)
    const lb = .35, lugH = g.midH*.72, tilt = .16;
    mirror4(lugPoly(g)).forEach(p => {
      const sy = Math.sign(p[0][1]), piv = new T.Group(); piv.position.set(0, sy*g.y0, g.cb + .2); piv.rotation.x = -sy*tilt;
      const m = new T.Mesh(extrude(shape(p), lugH - 2*lb, lb, 16), caseM); m.position.set(0, -sy*g.y0, lb); piv.add(m); part(piv);
    });
    const dy = g.yE - 1.4 - g.y0, attach = { y: g.y0 + dy*Math.cos(tilt), z: g.cb + .2 + lugH*.45 - dy*Math.sin(tilt) };
    if (S.crownGuards) guardPolys(g).forEach(p => { const m = new T.Mesh(extrude(shape(p), g.midH*.7 - .5, .25), caseM); m.position.z = g.cb + g.midH*.15 + .25; part(m); });
    buildCrown(S, g, polM);
    buildBezel(S, g, zB, caseM, polM);
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
    buildMovementAndBack(S, g, caseM);
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
        ? new T.MeshPhysicalMaterial({ roughness:.12, clearcoat:1, clearcoatRoughness:.05, metalness:0 })
        : new T.MeshPhysicalMaterial({ roughness:.42, metalness:.5 });
      mat.map = canvasTex(2048, rO, x => drawInsert(x, S, g));
      if (t === 'diver'){ mat.emissiveMap = canvasTex(512, rO, x => drawInsert(x, S, g, 'lume')); mat.emissive = col(LUME[S.lumeType].glow); mat.emissiveIntensity = 0; st.lumeMats.push(mat); }
      const ins = new T.Mesh(new T.RingGeometry(ri + .3, rO, 192, 1), mat); ins.position.z = zB + bh*.78 + .02; part(ins, V(0,0,20.5));
    }
  }
  function buildCrystal(S, g, zTop){
    const rc = g.bzI + .15, glass = new T.MeshPhysicalMaterial({ transmission:1, thickness:.6, roughness:.03, ior:S.crystal === 'hesalite' ? 1.5 : 1.76, metalness:0, iridescence:.25, iridescenceIOR:1.3 });
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
  function buildStrap(S, g, at){
    strapGrp = new T.Group();
    const th = STRAP_TH[S.strap], Rs = RP + th/2 + .15, yA = at.y, zA = HZ + at.z;
    const phi0 = Math.atan2(yA, zA) + .32, pts = [V(0, yA, zA)];
    for (let i = 0; i <= 28; i++){ const f = phi0 + (TAU - 2*phi0)*i/28; pts.push(V(0, Rs*Math.sin(f), Rs*Math.cos(f))); }
    pts.push(V(0, -yA, zA));
    const curve = new T.CatmullRomCurve3(pts, false, 'centripetal'), Lt = curve.getLength(), half = Lt/2, X = V(1,0,0);
    const frame = s => { const u = Math.min(1, Math.max(0, s/Lt)), P = curve.getPointAt(u), Tn = curve.getTangentAt(u); return { P, Tn, N: V().crossVectors(X, Tn).normalize() }; };
    const cw = S.strap === 'nato' ? g.lugW - .4 : g.lugW*.8, wAt = s => { const d = Math.min(s, Lt - s); return g.lugW - .4 - (g.lugW - .4 - cw)*Math.min(1, d/half); };
    const bracelet = ['oyster','jubilee'].includes(S.strap);
    const caseB = metal(S.caseMat, 'brushed'), caseP = metal(S.caseMat, 'polished');

    const ribbon = (s0, s1, mat) => {
      const pos = [], nor = [], uv = [], idx = [], rows = [], segs = 90;
      for (let i = 0; i <= segs; i++){ const s = s0 + (s1 - s0)*i/segs; rows.push({ ...frame(s), w:wAt(s), v:i/segs }); }
      const c = (r, sx, sn) => r.P.clone().addScaledVector(X, sx*r.w/2).addScaledVector(r.N, sn*th/2);
      const strip = (A, B, nf, uA, uB) => { const base = pos.length/3;
        rows.forEach(r => { const a = A(r), b = B(r), n = nf(r); pos.push(a.x,a.y,a.z,b.x,b.y,b.z); nor.push(n.x,n.y,n.z,n.x,n.y,n.z); uv.push(uA, r.v, uB, r.v); });
        for (let i = 0; i < rows.length - 1; i++){ const a = base + i*2; idx.push(a, a+1, a+2, a+1, a+3, a+2); } };
      strip(r => c(r,-1,1), r => c(r,1,1), r => r.N, 0, 1);
      strip(r => c(r,1,-1), r => c(r,-1,-1), r => r.N.clone().negate(), 1, 0);
      strip(r => c(r,-1,-1), r => c(r,-1,1), () => X.clone().negate(), 0, .05);
      strip(r => c(r,1,1), r => c(r,1,-1), () => X, .95, 1);
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
      const m = new T.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; strapGrp.add(m);
    };
    if (bracelet){
      const unit = new RoundedBoxGeometry(1, 1, 1, 2, .14), mats = [caseB, S.strap === 'oyster' && S.braceletCenter === 'brushed' ? caseB : caseP], rows = [[], []];
      const push = (list, s, xoff, w, len) => { const f = frame(s), m = new T.Matrix4().makeBasis(X, f.Tn, f.N); m.scale(V(w, len, th)); m.setPosition(f.P.clone().addScaledVector(X, xoff)); list.push(m); };
      const p = S.strap === 'oyster' ? 6.2 : 4.4;
      for (const side of [1, -1]){
        const S0 = d => side > 0 ? d : Lt - d;
        push(rows[0], S0(1.7), 0, g.lugW - .6, 3.2);
        for (let d = 3.6 + p/2; d < half - 14; d += p){
          const w = wAt(S0(d));
          if (S.strap === 'oyster'){ push(rows[0], S0(d), -w*.35, w*.29, p - .3); push(rows[0], S0(d), w*.35, w*.29, p - .3); push(rows[1], S0(d), 0, w*.38, p - .3); }
          else { push(rows[0], S0(d), -w*.37, w*.25, p - .3); push(rows[0], S0(d), w*.37, w*.25, p - .3);
            for (const [xo, off] of [[-w*.16, 0], [0, p/2], [w*.16, 0]]) for (const k of [0, .5]){ const dd = d - p/4 + off/2 + k*p; if (dd < half - 14) push(rows[1], S0(dd), xo, w*.14, p*.46); } }
        }
      }
      rows.forEach((list, i) => { const im = new T.InstancedMesh(unit, mats[i], list.length); list.forEach((m, j) => im.setMatrixAt(j, m)); im.castShadow = im.receiveShadow = true; strapGrp.add(im); });
    } else {
      let mat;
      if (S.strap === 'mesh'){ const tx = meshTex(); tx.repeat.set(g.lugW/1.4, half/1.4); mat = new T.MeshPhysicalMaterial({ color:col(MATS[S.caseMat].base), metalness:1, roughness:.35, bumpMap:tx, bumpScale:1.2, side:T.DoubleSide }); }
      else { const tx = stripTex(S, half); mat = new T.MeshPhysicalMaterial({ map:tx, side:T.DoubleSide, roughness:S.strap === 'rubber' ? .55 : .8, clearcoat:S.strap === 'rubber' ? .15 : 0, sheen:S.strap === 'nato' ? .8 : 0, sheenColor:col('#ffffff') }); }
      ribbon(0, half - .1, mat); ribbon(half + .1, Lt, mat);
      if (S.strap === 'nato'){ const u = new T.Mesh(new T.BoxGeometry(g.lugW - .4, 2*yA, th), mat); u.position.z = HZ - th/2 - .05; u.castShadow = true; strapGrp.add(u); }
    }
    // spring bars
    for (const sy of [1, -1]){ const bar = new T.Mesh(new T.CylinderGeometry(.6, .6, g.lugW + 1, 12).rotateZ(PI/2), caseP); bar.position.set(0, sy*yA, zA); strapGrp.add(bar); }
    // clasp at the back of the cushion
    const f = frame(half), cg = new T.Group(); cg.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(X, f.Tn, f.N)); cg.position.copy(f.P).addScaledVector(f.N, th/2);
    const w = wAt(half), plate = (pw, pl, pt, mat, y = 0, z = 0) => { const m = new T.Mesh(new RoundedBoxGeometry(pw, pl, pt, 3, Math.min(pt, pw)/2.5), mat); m.position.set(0, y, pt/2 + z); m.castShadow = true; cg.add(m); };
    switch (S.clasp){
      case 'pin': {
        const r = .8, bw = w/2 + 1.4, bl = 4.5, path = new T.CatmullRomCurve3([V(-bw,-bl,0), V(bw,-bl,0), V(bw+.6,0,0), V(bw,bl,0), V(-bw,bl,0), V(-bw-.6,0,0)], true);
        const buckle = new T.Mesh(new T.TubeGeometry(path, 64, r, 12, true), caseP); buckle.position.z = r; cg.add(buckle);
        const prong = new T.Mesh(new T.CylinderGeometry(.5, .5, bl*2, 10), caseP); prong.position.z = r*1.4; cg.add(prong);
        const keeper = new T.Mesh(new RoundedBoxGeometry(w + 1.4, 3.5, 1.4, 2, .5), new T.MeshStandardMaterial({ color:col(S.strapColor), roughness:.8 })); keeper.position.set(0, 9, .5); cg.add(keeper);
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

  /* ---------- placard ---------- */
  function placardTex(S, g){
    const c = document.createElement('canvas'); c.width = 1024; c.height = 400; const x = c.getContext('2d');
    x.fillStyle = '#f1eee7'; x.fillRect(0,0,1024,400);
    x.fillStyle = '#1d1c1a'; x.textAlign = 'left';
    x.font = `${S.brandWeight} ${S.brandItalic ? 'italic ' : ''}88px ${fam(S.brandFont)}`; x.fillText(S.brandUpper ? S.brand.toUpperCase() : S.brand, 60, 130);
    x.font = '600 30px Inter, sans-serif'; x.fillStyle = '#9a7a3a'; x.fillText(`REF. ${refCode()}`, 62, 190);
    x.font = '400 30px Inter, sans-serif'; x.fillStyle = '#3a3833';
    x.fillText(`${g.D} mm · ${MATS[S.caseMat].name} · ${g.C.name}`, 62, 250);
    x.fillText(`${g.mv.name}, Cal. ${g.mv.cal} · ${g.T.toFixed(1)} mm · ${CLASPS[S.clasp]}`, 62, 295);
    x.font = 'italic 400 26px "Cormorant Garamond", serif'; x.fillStyle = '#7a756b'; x.fillText('From the Boskovic Watch Co. collection', 62, 355);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
  }

  /* ---------- build / dispose ---------- */
  function dispose(o){ o.traverse(m => { if (m.geometry) m.geometry.dispose(); const ms = m.material ? [].concat(m.material) : []; ms.forEach(mt => { for (const k in mt) if (mt[k] && mt[k].isTexture) mt[k].dispose(); mt.dispose(); }); }); }
  function build(S){
    if (assembly){ scene.remove(assembly); dispose(assembly); }
    if (placard){ scene.remove(placard); dispose(placard); }
    st.S = S; st.g = geo(S); st.lumeMats = []; st.explode = st.exT = 0; st.lume = st.lumeT = 0;
    ['#rExplode','#rLights'].forEach(id => q(id).classList.remove('on')); q('#rExplode').textContent = 'Exploded view'; q('#rLights').textContent = 'Lights out (lume)';
    const g = st.g;
    assembly = new T.Group(); assembly.position.y = RP; assembly.rotation.x = -.5; scene.add(assembly);
    const pts = []; for (let i = 0; i <= 48; i++){ const t = -1 + 2*i/48; pts.push(new T.Vector2(Math.max(.01, RP*Math.pow(1 - Math.pow(Math.abs(t), 5), 1/5)), t*44)); }
    pillowMesh = new T.Mesh(new T.LatheGeometry(pts, 96).rotateZ(PI/2), new T.MeshPhysicalMaterial({ roughness:.92, sheen:1, sheenRoughness:.4, side:T.DoubleSide }));
    pillowMesh.castShadow = pillowMesh.receiveShadow = true; assembly.add(pillowMesh); setPillow();
    const at = buildHead(S, g); head.position.z = HZ; assembly.add(head);
    assembly.add(buildStrap(S, g, at));
    placard = new T.Mesh(new T.PlaneGeometry(130, 51), new T.MeshStandardMaterial({ map:placardTex(S, g), roughness:.6 })); placard.position.set(0, -110, 95.6); scene.add(placard);
    assembly.updateMatrixWorld(true);
    st.target = head.localToWorld(V(0, 0, g.T/2));
    st.camTo = st.target.clone().add(V(62, 92, 178)); st.camFrom = st.target.clone().add(V(-260, 340, 820));
    camera.position.copy(st.camFrom); controls.target.copy(st.target); st.intro = 0;
    key.target.position.copy(st.target); rim.target.position.copy(st.target);
    q('#hudBrand').textContent = (S.brandUpper ? S.brand.toUpperCase() : S.brand) || 'BOSKOVIC';
    q('#hudRef').textContent = `Ref. ${refCode()} · ${g.D} mm ${MATS[S.caseMat].short.toLowerCase()} · ${g.mv.name.toLowerCase()}`;
  }

  /* ---------- loop ---------- */
  function tick(){
    if (!st.running) return;
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), .05), S = st.S;
    if (st.intro < 1){ st.intro = Math.min(1, st.intro + dt/2.6); const e = 1 - Math.pow(1 - st.intro, 3); camera.position.lerpVectors(st.camFrom, st.camTo, e); }
    st.explode += (st.exT - st.explode)*Math.min(1, dt*3);
    st.lume += (st.lumeT - st.lume)*Math.min(1, dt*2.5);
    const e = st.explode, L = st.lume;
    for (const p of st.parts) p.position.copy(p.userData.base).addScaledVector(p.userData.ex, e);
    head.position.set(0, e*6, HZ + e*40); head.rotation.y = e*.55;
    strapGrp.visible = e < .03;
    const a = handAngles(S);
    hands.h.rotation.z = -a.h; hands.m.rotation.z = -a.m; if (hands.s) hands.s.rotation.z = -a.s;
    if (rotor) rotor.rotation.z += dt*(.3 + e*1.6);
    renderer.toneMappingExposure = LIGHT.exposure;
    key.intensity = LIGHT.key*(1 - L*.97); rim.intensity = LIGHT.rim*(1 - L); hemi.intensity = LIGHT.ambient*(1 - L*.9);
    scene.environmentIntensity = LIGHT.env*(1 - L*.94); cone.material.opacity = LIGHT.beam*(1 - L);
    bgSpots.forEach(s => s.intensity = LIGHT.gallery*(1 - L));
    st.lumeMats.forEach(m => m.emissiveIntensity = L*2.4);
    controls.update(); renderer.render(scene, camera);
  }

  async function open(S0){
    q('#render').hidden = false; q('#rLoading').classList.remove('fade'); q('#rLoading p').textContent = 'Setting up the showcase…';
    try { await load(); } catch (err){ q('#rLoading p').textContent = 'Could not load three.js from the CDN — are you offline?'; return; }
    if (!renderer) init();
    resize();
    build(JSON.parse(JSON.stringify(S0)));
    if (!st.running){ st.running = true; clock.getDelta(); tick(); }
    setTimeout(() => q('#rLoading').classList.add('fade'), 300);
  }
  function close(){ q('#render').hidden = true; st.running = false; }
  return { open, close };
})();
