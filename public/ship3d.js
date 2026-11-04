/* 하이포스 트레저헌터 — 3D pirate ship on a moving sea (one shared viewer, moved between the "내 배" card and the full-screen view).
   Ship3D.get() loads three.js on first use and resolves the viewer, or rejects when 3D is not available.
   viewer.mount(el) puts the 3D stage into el; viewer.setLook(look, sailHex) dresses the ship (look ids come from DECO in worker.js). */
(() => {
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js";
let loading = null, viewer = null;

function loadThree() {
  if (window.THREE) return Promise.resolve();
  return loading || (loading = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = THREE_URL; s.async = true;
    s.onload = () => window.THREE ? res() : rej(new Error("3D를 불러오지 못했어요"));
    s.onerror = () => { loading = null; rej(new Error("3D를 불러오지 못했어요. 인터넷 연결을 확인해 주세요")); };
    document.head.appendChild(s);
  }));
}
function webglOK() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }

// ids match DECO in worker.js; anything missing falls back to the plain wooden ship
const HULL = { wood: "#7A4A28", ebony: "#2A221D", red: "#8E2A22", navy: "#1F3A63", mint: "#2F8C78", white: "#E8DFC9", gold: "#C99A2E" };
const TRIM = { gold: "#E3B34A", silver: "#C9D3DC" };
const FLAG_BG = { jolly: "#141414", heart: "#C9406A", star: "#1F3A63", crown: "#6B2A8E", flame: "#B5302A" };
const FLAG_FG = { star: "#F4D03F", crown: "#F1C04B", flame: "#F7C548" };
const FLAG_EMBLEM = { jolly: "skull", heart: "heart", star: "star", crown: "crown", flame: "flame" };
const PRESET = {
  day: { top: "#3E8FD6", hor: "#D4ECF8", sea: "#1D6E98", sun: "#FFF1D6", si: 1.5, sd: [12, 22, 8], hs: "#CFE8FF", hg: "#1C4D6E", hi: .75, fog: "#CDE6F4", orb: "#FFF8E0", exp: 1.0, lamp: .4, stars: false },
  sunset: { top: "#2A2C63", hor: "#F39A5B", sea: "#28506F", sun: "#FFB070", si: 1.8, sd: [-30, 9, 18], hs: "#F7B28A", hg: "#2A2F55", hi: .55, fog: "#E9906A", orb: "#FFD08A", exp: 1.05, lamp: 1.2, stars: false },
  night: { top: "#040A1C", hor: "#1B2D57", sea: "#0E2A46", sun: "#9EB8FF", si: .7, sd: [-14, 26, -10], hs: "#5068A8", hg: "#050B1E", hi: .38, fog: "#16264A", orb: "#E8EEFF", exp: 1.15, lamp: 3.2, stars: true }
};
const TIMES = [["sunset", "노을"], ["day", "낮"], ["night", "달밤"]];

function build() {
  const T = window.THREE;
  const stage = document.createElement("div"); stage.className = "s3d";
  stage.innerHTML = `<div class="s3d-views"></div><button type="button" class="s3d-sky" aria-label="하늘 바꾸기"></button>`;
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(42, 1, .1, 1200);
  const hemi = new T.HemisphereLight(0xffffff, 0x223344, .6); scene.add(hemi);
  const sun = new T.DirectionalLight(0xffffff, 1.4); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 14, bottom: -6, near: 1, far: 80 }); scene.add(sun, sun.target);
  const skyMat = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new T.Color() }, hor: { value: new T.Color() } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 hor; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6, 0.0, 1.0); gl_FragColor = vec4(mix(hor, top, pow(h, .7)), 1.0); }" });
  scene.add(new T.Mesh(new T.SphereGeometry(500, 32, 16), skyMat));
  const glowTex = canvasTex(128, 128, g => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,255,255,.85)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }, false);
  const orb = new T.Sprite(new T.SpriteMaterial({ map: glowTex, fog: false, depthWrite: false })); scene.add(orb);
  const stars = (() => { const g = new T.BufferGeometry(), p = [];
    for (let i = 0; i < 700; i++) { const a = Math.random() * Math.PI * 2, e = .15 + Math.random() * 1.2; p.push(Math.cos(a) * Math.cos(e) * 420, Math.sin(e) * 420, Math.sin(a) * Math.cos(e) * 420); }
    g.setAttribute("position", new T.Float32BufferAttribute(p, 3)); return new T.Points(g, new T.PointsMaterial({ size: 1.6, color: 0xffffff, fog: false, transparent: true, opacity: .9, sizeAttenuation: false })); })();
  scene.add(stars); scene.fog = new T.Fog(0xffffff, 70, 260);

  // sea: a faceted plane whose waves slide back past the ship
  const oceanGeo = new T.PlaneGeometry(420, 420, 110, 110); oceanGeo.rotateX(-Math.PI / 2);
  const oBase = Float32Array.from(oceanGeo.attributes.position.array);
  const oceanMat = new T.MeshStandardMaterial({ color: 0x1F6E9A, roughness: .32, metalness: .15, flatShading: true });
  const ocean = new T.Mesh(oceanGeo, oceanMat); ocean.receiveShadow = true; scene.add(ocean);
  const wave = (x, z, t) => .32 * Math.sin(x * .32 + t * 1.3) + .22 * Math.sin(z * .41 - t * 1.1) + .14 * Math.sin((x + z) * .7 + t * 2.1) + .06 * Math.sin(x * 1.7 - z * 1.3 + t * 3);

  function canvasTex(w, h, draw, srgb = true) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }
  const plankTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { g.fillStyle = `rgba(0,0,0,${.06 + Math.random() * .08})`; g.fillRect(0, y, w, 16); g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, y, w, 1.5); for (let x = (y / 16 % 2) * 64; x < w; x += 128) g.fillRect(x, y, 1.5, 16); } });
  plankTex.wrapS = plankTex.wrapT = T.RepeatWrapping;
  const EMBLEM = {
    skull(g, cx, cy, s, col, bg) { g.strokeStyle = col; g.fillStyle = col; g.lineCap = "round"; g.lineWidth = s * .09;
      for (const d of [1, -1]) { g.beginPath(); g.moveTo(cx - s * .5 * d, cy + s * .02); g.lineTo(cx + s * .5 * d, cy + s * .5); g.stroke();
        for (const [x, y] of [[cx - s * .5 * d, cy + s * .02], [cx + s * .5 * d, cy + s * .5]]) { g.beginPath(); g.arc(x - s * .03, y - s * .04, s * .055, 0, Math.PI * 2); g.arc(x + s * .03, y + s * .04, s * .055, 0, Math.PI * 2); g.fill(); } }
      g.beginPath(); g.ellipse(cx, cy - s * .16, s * .3, s * .27, 0, 0, Math.PI * 2); g.fill(); g.fillRect(cx - s * .17, cy - s * .02, s * .34, s * .2);
      g.fillStyle = bg; g.beginPath(); g.ellipse(cx - s * .11, cy - s * .15, s * .08, s * .09, 0, 0, Math.PI * 2); g.ellipse(cx + s * .11, cy - s * .15, s * .08, s * .09, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(cx, cy - s * .06); g.lineTo(cx - s * .035, cy + s * .01); g.lineTo(cx + s * .035, cy + s * .01); g.fill();
      for (const x of [-.08, 0, .08]) g.fillRect(cx + x * s - s * .012, cy + s * .08, s * .024, s * .1); },
    star(g, cx, cy, s, col) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * .22 : s * .55; g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); } g.closePath(); g.fill(); },
    heart(g, cx, cy, s, col) { g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy + s * .45); g.bezierCurveTo(cx - s * .75, cy - s * .05, cx - s * .4, cy - s * .55, cx, cy - s * .2); g.bezierCurveTo(cx + s * .4, cy - s * .55, cx + s * .75, cy - s * .05, cx, cy + s * .45); g.fill(); },
    crown(g, cx, cy, s, col) { g.fillStyle = col; g.beginPath(); g.moveTo(cx - s * .5, cy + s * .3); g.lineTo(cx - s * .55, cy - s * .3); g.lineTo(cx - s * .25, cy); g.lineTo(cx, cy - s * .4); g.lineTo(cx + s * .25, cy); g.lineTo(cx + s * .55, cy - s * .3); g.lineTo(cx + s * .5, cy + s * .3); g.closePath(); g.fill(); },
    flame(g, cx, cy, s, col) { g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy + s * .45); g.bezierCurveTo(cx - s * .45, cy + s * .4, cx - s * .4, cy - s * .05, cx - s * .1, cy - s * .2); g.bezierCurveTo(cx - s * .12, cy - s * .02, cx, cy, cx + s * .02, cy - s * .5);
      g.bezierCurveTo(cx + s * .3, cy - s * .2, cx + s * .48, cy + s * .2, cx, cy + s * .45); g.fill(); },
    compass(g, cx, cy, s, col) { g.strokeStyle = col; g.fillStyle = col; g.lineWidth = s * .06; g.beginPath(); g.arc(cx, cy, s * .45, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * s * .55, cy + Math.sin(a) * s * .55); g.lineTo(cx + Math.cos(a + Math.PI / 2) * s * .1, cy + Math.sin(a + Math.PI / 2) * s * .1); g.lineTo(cx + Math.cos(a - Math.PI / 2) * s * .1, cy + Math.sin(a - Math.PI / 2) * s * .1); g.fill(); } }
  };
  const contrast = hex => { const c = new T.Color(hex); return (c.r * .3 + c.g * .59 + c.b * .11) > .5 ? "#2A2420" : "#F3EAD6"; };
  function sailTexture(color, pattern, emblem) {
    return canvasTex(256, 256, (g, w, h) => {
      if (pattern === "rainbow") { ["#F0564A", "#F59B3A", "#F4D03F", "#5DBB63", "#3D8BD9", "#8E5CC7"].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * h / 6, w, h / 6 + 1); }); }
      else if (pattern === "gold") { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#FFF0A8"); gr.addColorStop(.45, "#E9B53A"); gr.addColorStop(1, "#A9771A"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
      else { g.fillStyle = color; g.fillRect(0, 0, w, h); }
      g.fillStyle = "rgba(0,0,0,.07)"; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h);
      const gr2 = g.createLinearGradient(0, 0, 0, h); gr2.addColorStop(0, "rgba(255,255,255,.08)"); gr2.addColorStop(1, "rgba(0,0,0,.18)"); g.fillStyle = gr2; g.fillRect(0, 0, w, h);
      const ink = contrast(color);
      if (pattern === "stripe") { g.fillStyle = ink === "#2A2420" ? "rgba(168,50,42,.85)" : "rgba(243,234,214,.8)"; for (let y = 18; y < h; y += 52) g.fillRect(0, y, w, 22); }
      else if (pattern === "dots") { g.fillStyle = ink === "#2A2420" ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.75)"; for (let y = 20; y < h; y += 40) for (let x = (y / 40 % 2) * 20 + 20; x < w; x += 40) { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); } }
      else if (emblem && EMBLEM[pattern]) EMBLEM[pattern](g, w / 2, h / 2, 170, ink, color);
      g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 6; g.strokeRect(0, 0, w, h); });
  }
  function flagTexture(kind, sailHex) {
    if (!FLAG_BG[kind]) return canvasTex(256, 160, (g, w, h) => { g.fillStyle = sailHex; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(0, h * .45, w, h * .1); });
    return canvasTex(256, 160, (g, w, h) => { g.fillStyle = FLAG_BG[kind]; g.fillRect(0, 0, w, h); EMBLEM[FLAG_EMBLEM[kind]](g, w / 2, h / 2 + (kind === "jolly" ? 0 : -4), 150, FLAG_FG[kind] || "#F7F1E3", FLAG_BG[kind]); });
  }

  /* ----- ship ----- */
  const ship = new T.Group(); scene.add(ship);
  const L = 11, W = 1.85, D = 1.35, H0 = 1.1;
  const halfW = u => u < .12 ? W * (.8 + .2 * u / .12) : u < .62 ? W : W * Math.max(.04, Math.pow(Math.cos((u - .62) / .38 * Math.PI / 2), .9));
  const depth = u => u > .75 ? D * (1 - .45 * (u - .75) / .25) : D;
  const sheer = u => H0 + 1.0 * Math.max(0, (.22 - u) / .22) + .55 * Math.pow(Math.max(0, (u - .78) / .22), 1.5);
  const xAt = u => -L / 2 + u * L, deckY = u => sheer(u) - .34;
  function sideP(u, drop, side = 1) { const top = sheer(u), d = depth(u), s = Math.min(1, drop / (top + d)), a = Math.asin(s); return new T.Vector3(xAt(u), top - drop, side * halfW(u) * Math.cos(a) * (.82 + .18 * (1 - s))); }
  const M = {
    hull: new T.MeshStandardMaterial({ color: 0x7A4A28, roughness: .7, metalness: .05, side: T.DoubleSide }),
    deck: new T.MeshStandardMaterial({ color: 0xB4845A, roughness: .85, map: plankTex }),
    wood: new T.MeshStandardMaterial({ color: 0x4E321E, roughness: .8 }),
    trim: new T.MeshStandardMaterial({ color: 0xE3B34A, roughness: .3, metalness: .8 }),
    iron: new T.MeshStandardMaterial({ color: 0x23262B, roughness: .45, metalness: .7 }),
    gold: new T.MeshStandardMaterial({ color: 0xE9B43C, roughness: .28, metalness: .9 }),
    window: new T.MeshStandardMaterial({ color: 0xFFD27A, emissive: 0xFFB347, emissiveIntensity: 1.2 }),
    sailMain: new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: .9 }),
    sailPlain: new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: .9 }),
    flag: new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: .9 }),
    rope: new T.LineBasicMaterial({ color: 0x2B2118, transparent: true, opacity: .75 })
  };
  const add = (mesh, parent = ship) => { mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; };
  (function hull() {
    const NS = 48, NC = 18, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NS; i++) { const u = i / NS, top = sheer(u), d = depth(u), w = halfW(u);
      for (let k = 0; k <= NC; k++) { const a = k / NC * Math.PI, s = Math.sin(a), c = Math.cos(a); pos.push(xAt(u), top - (top + d) * s, w * c * (.82 + .18 * (1 - s))); uv.push(u * 5, k / NC * 2); } }
    for (let i = 0; i < NS; i++) for (let k = 0; k < NC; k++) { const a = i * (NC + 1) + k, b = a + NC + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const c0 = pos.length / 3; pos.push(xAt(0), sheer(0) - .9, 0); uv.push(0, 0); for (let k = 0; k < NC; k++) idx.push(c0, k, k + 1);
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    add(new T.Mesh(g, M.hull));
    const dp = [], du = [], di = [];
    for (let i = 0; i <= NS; i++) { const u = i / NS, w = halfW(u) * .93, y = deckY(u); dp.push(xAt(u), y, w, xAt(u), y, -w); du.push(u * 6, 0, u * 6, 1.2); if (i < NS) { const a = i * 2; di.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const dg = new T.BufferGeometry(); dg.setAttribute("position", new T.Float32BufferAttribute(dp, 3)); dg.setAttribute("uv", new T.Float32BufferAttribute(du, 2)); dg.setIndex(di); dg.computeVertexNormals();
    add(new T.Mesh(dg, M.deck));
  })();
  const trimGroup = new T.Group(); ship.add(trimGroup);
  for (const side of [1, -1]) for (const drop of [0, .48, .78]) { const pts = []; for (let i = 0; i <= 40; i++) { const p = sideP(i / 40 * .985, drop, side); p.z *= 1.012; pts.push(p); }
    add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 80, drop ? .045 : .07, 6, false), M.trim), trimGroup); }
  for (let r = 0; r < 2; r++) for (let k = -2; k <= 2; k++) add(new T.Mesh(new T.BoxGeometry(.06, .32, .26), M.window)).position.set(xAt(0) - .02, sheer(0) - .45 - r * .45, k * .38);
  add(new T.Mesh(new T.BoxGeometry(.08, .08, 2.3), M.trim), trimGroup).position.set(xAt(0) - .03, sheer(0) - .2, 0);
  add(new T.Mesh(new T.BoxGeometry(1.6, .9, 2.6), M.hull)).position.set(xAt(.08), deckY(.08) + .45, 0);
  add(new T.Mesh(new T.BoxGeometry(1.8, .1, 2.8), M.wood)).position.set(xAt(.08), deckY(.08) + .95, 0);
  for (const z of [-.6, 0, .6]) add(new T.Mesh(new T.BoxGeometry(.05, .3, .24), M.window)).position.set(xAt(.08) + .81, deckY(.08) + .5, z);
  const mastSpec = [{ u: .7, h: 7.6, sails: [[3.4, 2.4, 1.4], [2.7, 1.9, 4.3]] }, { u: .45, h: 9.2, sails: [[3.9, 2.8, 1.5], [3.1, 2.2, 4.8], [2.3, 1.5, 7.3]] }, { u: .2, h: 6.6, sails: [[2.8, 2.0, 1.4], [2.1, 1.5, 3.9]] }];
  const mastTops = [];
  function sailGeo(w, h, bulge) { const g = new T.PlaneGeometry(w, h, 10, 8), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2); p.setZ(i, bulge * (1 - x * x) * (.75 + .25 * (1 - y)) * (1 - .35 * y * y)); }
    g.rotateY(Math.PI / 2); g.computeVertexNormals(); return g; }
  for (const [mi, m] of mastSpec.entries()) { const x = xAt(m.u), base = deckY(m.u);
    add(new T.Mesh(new T.CylinderGeometry(.09, .14, m.h, 10), M.wood)).position.set(x, base + m.h / 2, 0); mastTops.push(new T.Vector3(x, base + m.h, 0));
    // yards are braced round a little, as when sailing with the wind on the quarter, so the sails still show from the side
    const rig = new T.Group(); rig.position.set(x, base, 0); rig.rotation.y = .42; ship.add(rig);
    for (const [si, [w, h, y0]] of m.sails.entries()) { const yard = add(new T.Mesh(new T.CylinderGeometry(.05, .05, w * 1.12, 8), M.wood), rig); yard.rotation.x = Math.PI / 2; yard.position.set(.08, y0 + h, 0);
      add(new T.Mesh(sailGeo(w, h, .55), si === 0 && mi < 2 ? M.sailMain : M.sailPlain), rig).position.set(.1, y0 + h / 2, 0); } }
  const bowTip = new T.Vector3(xAt(1) + 2.6, sheer(1) + 1.0, 0);
  { const from = new T.Vector3(xAt(.93), sheer(.93), 0), dir = bowTip.clone().sub(from), len = dir.length();
    const bs = add(new T.Mesh(new T.CylinderGeometry(.05, .09, len, 8), M.wood)); bs.position.copy(from).add(bowTip).multiplyScalar(.5); bs.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    const fx = xAt(.7), fb = deckY(.7), g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute([bowTip.x - .4, bowTip.y - .05, 0, fx + .3, fb + 5.2, 0, fx + 1.4, fb + 1.7, 0], 3)); g.setAttribute("uv", new T.Float32BufferAttribute([1, .5, 0, 1, 0, 0], 2)); g.computeVertexNormals();
    add(new T.Mesh(g, M.sailPlain)); }
  { const v = [];
    for (const m of mastSpec) { const x = xAt(m.u), top = deckY(m.u) + m.h * .82; for (const side of [1, -1]) for (const dx of [-.5, 0, .5]) { const r = sideP(m.u + dx / L, 0, side); v.push(x, top, 0, r.x, r.y, r.z); } }
    const [f, mn, mz] = mastTops; v.push(f.x, f.y, 0, bowTip.x, bowTip.y, 0, mn.x, mn.y - .4, 0, f.x, f.y - .6, 0, mz.x, mz.y - .3, 0, mn.x, mn.y - 1.6, 0, mz.x, mz.y - .5, 0, xAt(0), sheer(0) + .1, 0);
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(v, 3)); ship.add(new T.LineSegments(g, M.rope)); }
  const flagGeo = new T.PlaneGeometry(1.6, 1, 14, 6); flagGeo.translate(.8, 0, 0);
  const flagBase = Float32Array.from(flagGeo.attributes.position.array);
  const flag = add(new T.Mesh(flagGeo, M.flag)); flag.rotation.y = Math.PI; flag.position.copy(mastTops[1]).add(new T.Vector3(0, -.45, 0));

  /* ----- attachments (ids match "att" items in DECO) ----- */
  const A = {}; const grp = k => (A[k] = new T.Group(), ship.add(A[k]), A[k]);
  grp("cannon"); for (const side of [1, -1]) for (const u of [.28, .38, .48, .58]) { const p = sideP(u, .72, side);
    const port = add(new T.Mesh(new T.BoxGeometry(.34, .3, .06), M.iron), A.cannon); port.position.copy(p); port.lookAt(p.clone().add(new T.Vector3(0, 0, side)));
    const c = add(new T.Mesh(new T.CylinderGeometry(.08, .11, .62, 10), M.iron), A.cannon); c.rotation.x = Math.PI / 2; c.position.copy(p).add(new T.Vector3(0, 0, side * .2)); }
  grp("dragon"); { const base = new T.Vector3(xAt(1) + .05, sheer(1) - .35, 0), at = (x, y, z = 0) => base.clone().add(new T.Vector3(x, y, z));
    const neck = add(new T.Mesh(new T.CylinderGeometry(.16, .24, 1.3, 10), M.gold), A.dragon); neck.position.copy(at(.45, .4)); neck.rotation.z = -.95;
    const head = add(new T.Mesh(new T.ConeGeometry(.24, .85, 10), M.gold), A.dragon); head.position.copy(at(1.2, .9)); head.rotation.z = -1.75;
    add(new T.Mesh(new T.SphereGeometry(.27, 12, 10), M.gold), A.dragon).position.copy(at(.95, .92));
    const eyeM = new T.MeshStandardMaterial({ color: 0xD9402F, emissive: 0xD9402F, emissiveIntensity: .8 });
    for (const z of [-.14, .14]) { const horn = add(new T.Mesh(new T.ConeGeometry(.06, .45, 8), M.gold), A.dragon); horn.position.copy(at(.82, 1.25, z)); horn.rotation.z = .6;
      add(new T.Mesh(new T.SphereGeometry(.05, 8, 6), eyeM), A.dragon).position.copy(at(1.08, 1.0, z * 1.15)); } }
  grp("nest"); { const y = deckY(.45) + 6.3, x = xAt(.45);
    add(new T.Mesh(new T.CylinderGeometry(.55, .45, .42, 16, 1, true), M.wood), A.nest).position.set(x, y, 0);
    add(new T.Mesh(new T.CylinderGeometry(.45, .45, .06, 16), M.wood), A.nest).position.set(x, y - .2, 0);
    const band = add(new T.Mesh(new T.TorusGeometry(.55, .03, 6, 24), M.trim), A.nest); band.rotation.x = Math.PI / 2; band.position.set(x, y + .2, 0); }
  grp("lantern"); const lamps = [];
  for (const z of [-1.05, 1.05]) { const x = xAt(.015), y = sheer(0) + .25;
    add(new T.Mesh(new T.CylinderGeometry(.03, .03, .5, 6), M.iron), A.lantern).position.set(x, y, z);
    add(new T.Mesh(new T.SphereGeometry(.17, 12, 10), new T.MeshStandardMaterial({ color: 0xFFE2A0, emissive: 0xFFB347, emissiveIntensity: 2 })), A.lantern).position.set(x, y + .35, z);
    add(new T.Mesh(new T.ConeGeometry(.17, .2, 8), M.iron), A.lantern).position.set(x, y + .58, z);
    const pl = new T.PointLight(0xFFB347, 1.2, 6, 2); pl.position.set(x, y + .35, z); A.lantern.add(pl); lamps.push(pl); }
  // the parrot perches on the rail beside the main mast
  grp("parrot"); const bird = new T.Group(); A.parrot.add(bird); bird.position.copy(sideP(.5, 0, 1)).add(new T.Vector3(0, .26, -.08)); bird.scale.setScalar(1.5);
  { const red = new T.MeshStandardMaterial({ color: 0xD9402F, roughness: .6 }), blue = new T.MeshStandardMaterial({ color: 0x2E6FD0, roughness: .6 }), yel = new T.MeshStandardMaterial({ color: 0xF4C430, roughness: .5 });
    add(new T.Mesh(new T.SphereGeometry(.18, 12, 10), red), bird).scale.set(1, 1.35, 1);
    add(new T.Mesh(new T.SphereGeometry(.13, 12, 10), red), bird).position.set(.05, .27, 0);
    const beak = add(new T.Mesh(new T.ConeGeometry(.05, .14, 8), yel), bird); beak.position.set(.19, .25, 0); beak.rotation.z = -Math.PI / 2;
    for (const z of [.14, -.14]) { const wg = add(new T.Mesh(new T.SphereGeometry(.13, 10, 8), blue), bird); wg.scale.set(.6, 1.2, .35); wg.position.set(-.02, .02, z); }
    const tail = add(new T.Mesh(new T.ConeGeometry(.06, .45, 8), blue), bird); tail.position.set(-.1, -.32, 0); tail.rotation.z = .35;
    for (const z of [-.09, .09]) add(new T.Mesh(new T.SphereGeometry(.025, 6, 6), M.iron), bird).position.set(.13, .31, z); }
  grp("treasure"); { const x = xAt(.56), y = deckY(.56);
    add(new T.Mesh(new T.BoxGeometry(.7, .42, .5), new T.MeshStandardMaterial({ color: 0x8A5328, roughness: .7 })), A.treasure).position.set(x, y + .21, .7);
    const lid = add(new T.Mesh(new T.CylinderGeometry(.25, .25, .7, 12, 1, false, 0, Math.PI), new T.MeshStandardMaterial({ color: 0xA9652F, roughness: .7 })), A.treasure); lid.rotation.z = Math.PI / 2; lid.position.set(x, y + .42, .7);
    add(new T.Mesh(new T.BoxGeometry(.72, .06, .52), M.gold), A.treasure).position.set(x, y + .32, .7);
    for (let i = 0; i < 26; i++) { const c = add(new T.Mesh(new T.CylinderGeometry(.09, .09, .03, 12), M.gold), A.treasure); const a = i * 2.4, r = (i % 7) / 7 * .55;
      c.position.set(x - .55 + Math.cos(a) * r * .6, y + .03 + (i % 5) * .035, .7 + Math.sin(a) * r); c.rotation.set(i, i * .7, i * 1.3); } }
  grp("anchor"); { const a = new T.Group(); A.anchor.add(a); a.position.copy(sideP(.88, .2, 1)).add(new T.Vector3(0, -.35, .12));
    add(new T.Mesh(new T.CylinderGeometry(.05, .05, 1.1, 8), M.iron), a);
    const arm = add(new T.Mesh(new T.TorusGeometry(.38, .05, 8, 20, Math.PI), M.iron), a); arm.rotation.z = Math.PI; arm.position.y = -.38;
    add(new T.Mesh(new T.TorusGeometry(.12, .03, 6, 16), M.iron), a).position.y = .62;
    const stock = add(new T.Mesh(new T.CylinderGeometry(.04, .04, .6, 8), M.iron), a); stock.rotation.z = Math.PI / 2; stock.position.y = .4; }

  /* ----- wake behind the stern (the "wake" decoration changes its look) ----- */
  const foamN = 160, foamGeo = new T.BufferGeometry(), foamPos = new Float32Array(foamN * 3), foamCol = new Float32Array(foamN * 3), foamAge = new Float32Array(foamN);
  foamGeo.setAttribute("position", new T.BufferAttribute(foamPos, 3)); foamGeo.setAttribute("color", new T.BufferAttribute(foamCol, 3));
  const foamMat = new T.PointsMaterial({ map: glowTex, size: .55, transparent: true, opacity: .85, depthWrite: false, vertexColors: true });
  scene.add(new T.Points(foamGeo, foamMat));
  let wakeKind = "", spread = 2.4;
  const tmpC = new T.Color();
  function resetFoam(i) { const bow = Math.random() < .3; foamAge[i] = 0;
    foamPos[i * 3] = bow ? xAt(.97) : xAt(0) - .2; foamPos[i * 3 + 1] = .1; foamPos[i * 3 + 2] = (Math.random() - .5) * (bow ? .6 : spread);
    if (wakeKind === "rainbow") tmpC.setHSL(Math.random(), .85, .62); else if (wakeKind === "sparkle") tmpC.set(Math.random() < .7 ? "#FFE27A" : "#FFFFFF"); else if (wakeKind === "bubble") tmpC.set("#CFEFFF"); else tmpC.set("#FFFFFF");
    foamCol[i * 3] = tmpC.r; foamCol[i * 3 + 1] = tmpC.g; foamCol[i * 3 + 2] = tmpC.b; }
  for (let i = 0; i < foamN; i++) { resetFoam(i); foamAge[i] = Math.random() * 3; }

  /* ----- camera: drag to orbit, pinch or wheel to zoom, buttons for fixed views ----- */
  const target = new T.Vector3(0, 3.2, 0), cam = { th: .85, ph: 1.22, r: 21 };
  let auto = true, tween = null;
  const cv = renderer.domElement, pts = new Map(); let pinch0 = 0, r0 = 0;
  const viewsEl = stage.querySelector(".s3d-views");
  const VIEWS = [["side", "측면", { th: Math.PI / 2, ph: 1.38, r: 22 }], ["front", "정면", { th: 0, ph: 1.32, r: 20 }], ["back", "뒤", { th: Math.PI, ph: 1.3, r: 20 }], ["top", "위", { th: Math.PI / 2, ph: .35, r: 24 }], ["auto", "돌리기", null]];
  const drawViews = a => viewsEl.innerHTML = VIEWS.map(([k, l]) => `<button type="button" data-view="${k}" aria-pressed="${k === a}">${l}</button>`).join("");
  const stopAuto = () => { if (auto) { auto = false; drawViews(null); } };
  cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); stopAuto(); tween = null; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); r0 = cam.r; } });
  cv.addEventListener("pointermove", e => { if (!pts.has(e.pointerId)) return; const pv = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) { cam.th += (e.clientX - pv[0]) * .008; cam.ph = Math.min(1.5, Math.max(.2, cam.ph - (e.clientY - pv[1]) * .006)); }
    else if (pts.size === 2) { const [a, b] = [...pts.values()]; cam.r = Math.min(34, Math.max(8, r0 * pinch0 / Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])))); } });
  const up = e => pts.delete(e.pointerId); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("wheel", e => { e.preventDefault(); stopAuto(); cam.r = Math.min(34, Math.max(8, cam.r * (1 + Math.sign(e.deltaY) * .08))); }, { passive: false });
  viewsEl.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const v = VIEWS.find(x => x[0] === b.dataset.view);
    if (!v[2]) { auto = true; tween = null; drawViews("auto"); return; }
    auto = false; drawViews(v[0]); let th = v[2].th; while (th - cam.th > Math.PI) th -= Math.PI * 2; while (cam.th - th > Math.PI) th += Math.PI * 2;
    tween = { from: { ...cam }, to: { ...v[2], th }, t0: performance.now() }; });
  drawViews("auto");

  /* ----- sky ----- */
  let time = "sunset";
  const skyBtn = stage.querySelector(".s3d-sky");
  function applyTime() { const p = PRESET[time];
    skyMat.uniforms.top.value.set(p.top); skyMat.uniforms.hor.value.set(p.hor); oceanMat.color.set(p.sea); scene.fog.color.set(p.fog);
    sun.color.set(p.sun); sun.intensity = p.si; sun.position.set(...p.sd); hemi.color.set(p.hs); hemi.groundColor.set(p.hg); hemi.intensity = p.hi;
    orb.material.color.set(p.orb); orb.position.copy(new T.Vector3(...p.sd).normalize().multiplyScalar(400)); orb.scale.setScalar(time === "night" ? 45 : 80);
    renderer.toneMappingExposure = p.exp; lamps.forEach(l => l.intensity = p.lamp); stars.visible = p.stars; M.window.emissiveIntensity = time === "day" ? .6 : 1.6;
    const i = TIMES.findIndex(t => t[0] === time); skyBtn.textContent = TIMES[(i + 1) % TIMES.length][1] + "으로"; }
  skyBtn.addEventListener("click", () => { const i = TIMES.findIndex(t => t[0] === time); time = TIMES[(i + 1) % TIMES.length][0]; applyTime(); });
  applyTime();

  /* ----- dressing the ship ----- */
  let lookKey = "";
  function setLook(look = {}, sailHex = "#EFE4C8") {
    const key = JSON.stringify([look, sailHex]); if (key === lookKey) return; lookKey = key;
    M.hull.color.set(HULL[look.hull] || HULL.wood); M.hull.map = look.hull ? null : plankTex;
    M.hull.metalness = look.hull === "gold" ? .75 : .05; M.hull.roughness = look.hull === "gold" ? .3 : .7; M.hull.needsUpdate = true;
    M.trim.color.set(TRIM[look.trim] || TRIM.gold);
    for (const m of [M.sailMain, M.sailPlain, M.flag]) m.map?.dispose();
    const p = look.pattern || "none";
    M.sailMain.map = sailTexture(sailHex, p, true);
    M.sailPlain.map = sailTexture(sailHex, ["stripe", "dots", "rainbow", "gold"].includes(p) ? p : "none", false);
    M.flag.map = flagTexture(look.flag, sailHex);
    M.sailMain.needsUpdate = M.sailPlain.needsUpdate = M.flag.needsUpdate = true;
    const on = new Set(look.att || []); for (const k in A) A[k].visible = on.has(k);
    wakeKind = look.wake || ""; spread = wakeKind === "splash" ? 3.6 : 2.4;
    foamMat.size = { splash: .8, bubble: .9, sparkle: .5, rainbow: .7 }[wakeKind] || .55; foamMat.blending = wakeKind === "sparkle" ? T.AdditiveBlending : T.NormalBlending; foamMat.needsUpdate = true;
    for (let i = 0; i < foamN; i++) { const a = foamAge[i]; resetFoam(i); foamAge[i] = a; }
  }

  /* ----- loop: runs only while the stage is on the page and visible ----- */
  const clock = new T.Clock(); let running = false;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ro = new ResizeObserver(() => { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); });
  ro.observe(stage);
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(stage);
  function frame() {
    if (!stage.isConnected || !visible || document.hidden) { running = false; return; }
    const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime, sail = t * 2.2;
    const p = oceanGeo.attributes.position.array; for (let i = 0; i < p.length; i += 3) p[i + 1] = wave(oBase[i] + sail, oBase[i + 2], t);
    oceanGeo.attributes.position.needsUpdate = true;
    const h0 = wave(sail, 0, t), hb = wave(3.5 + sail, 0, t), hs = wave(-3.5 + sail, 0, t), hl = wave(sail, 1.6, t), hr = wave(sail, -1.6, t);
    ship.position.y = h0 * .85 + .05; ship.rotation.z = (hb - hs) * .09; ship.rotation.x = (hr - hl) * .12;
    const f = flagGeo.attributes.position.array; for (let i = 0; i < f.length; i += 3) { const x = flagBase[i]; f[i + 2] = flagBase[i + 2] + Math.sin(x * 3.4 - t * 7) * .14 * (x / 1.6); }
    flagGeo.attributes.position.needsUpdate = true;
    bird.rotation.z = Math.sin(t * 3) * .08;
    for (let i = 0; i < foamN; i++) { foamAge[i] += dt; const k = i * 3; foamPos[k] -= dt * 2.4; foamPos[k + 2] *= 1 + dt * .35;
      foamPos[k + 1] = wave(foamPos[k] + sail, foamPos[k + 2], t) + (wakeKind === "bubble" ? .08 + foamAge[i] * .25 : .08); if (foamAge[i] > 3) resetFoam(i); }
    foamGeo.attributes.position.needsUpdate = true;
    if (tween) { const k = Math.min(1, (performance.now() - tween.t0) / 800), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      for (const key of ["th", "ph", "r"]) cam[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * e; if (k >= 1) tween = null; }
    else if (auto && !reduced) cam.th += dt * .18;
    // step back on tall, narrow screens so the whole ship still fits across
    const r = cam.r * Math.max(1, .95 / camera.aspect), s = Math.sin(cam.ph);
    camera.position.set(target.x + r * s * Math.cos(cam.th), target.y + r * Math.cos(cam.ph), target.z + r * s * Math.sin(cam.th)); camera.lookAt(target);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  function start() { if (running || !stage.isConnected) return; running = true; clock.getDelta(); requestAnimationFrame(frame); }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) start(); });
  return {
    el: stage, setLook,
    mount(host) { if (stage.parentNode !== host) host.appendChild(stage); start(); },
    view(k) { viewsEl.querySelector(`[data-view="${k}"]`)?.click(); }
  };
}

window.Ship3D = {
  available: webglOK,
  get() {
    if (viewer) return Promise.resolve(viewer);
    if (!webglOK()) return Promise.reject(new Error("이 기기에서는 3D를 볼 수 없어요"));
    return loadThree().then(() => viewer || (viewer = build()));
  }
};
})();
