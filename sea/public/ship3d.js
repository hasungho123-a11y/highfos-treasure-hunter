/* 하이포스 트레저헌터 — 3D pirate ship on a moving sea (one shared viewer, moved between the "내 배" card and the full-screen view).
   Ship3D.get() loads three.js on first use and resolves the viewer, or rejects when 3D is not available.
   viewer.mount(el) puts the 3D stage into el; viewer.setLook(look, sailHex) dresses the ship (look ids come from DECO in worker.js). */
(() => {
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js";
let loading = null, viewer = null, thumbViewer = null;

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

// real naval weapons, built facing the bow (+x) with the deck at y = 0; ids match WEAPONS in worker.js
function weaponModel(T, M, id) {
  const g = new T.Group();
  const put = (mesh, x, y, z = 0) => { mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh; };
  const box = (x, y, z, w, h, d, m) => put(new T.Mesh(new T.BoxGeometry(w, h, d), m), x, y, z);
  const cyl = (x, y, z, r1, r2, h, m) => put(new T.Mesh(new T.CylinderGeometry(r1, r2, h, 14), m), x, y, z);
  const barrel = (x, y, z, r1, r2, len, m = M.iron, up = 0) => { const b = cyl(x, y, z, r1, r2, len, m); b.rotation.z = -Math.PI / 2 + up; return b; };
  const wheel = (x, z, r) => { const w = cyl(x, r, z, r, r, .1, M.iron); w.rotation.x = Math.PI / 2; };
  const missile = (x, y, z, len, r, up) => { const f = new T.Group(); f.position.set(x, y, z); f.rotation.z = up; g.add(f);
    const add = (m, px, py = 0, pz = 0) => { m.position.set(px, py, pz); m.castShadow = true; f.add(m); return m; };
    add(new T.Mesh(new T.CylinderGeometry(r, r, len, 12), M.paint), 0).rotation.z = -Math.PI / 2;
    add(new T.Mesh(new T.ConeGeometry(r, len * .22, 12), M.warhead), len * .61).rotation.z = -Math.PI / 2;
    add(new T.Mesh(new T.BoxGeometry(len * .16, .03, r * 5), M.steel), -len * .42); add(new T.Mesh(new T.BoxGeometry(len * .16, r * 5, .03), M.steel), -len * .42); return add; };
  const cannon = s => { box(-.1 * s, .3 * s, 0, 1.3 * s, .28 * s, .72 * s, M.wood); for (const x of [-.5, .3]) for (const z of [-.42, .42]) wheel(x * s, z * s, .2 * s);
    barrel(.25 * s, .6 * s, 0, .13 * s, .21 * s, 1.9 * s, M.iron, .04); cyl(.25 * s, .6 * s, 0, .24 * s, .24 * s, .1 * s, M.gold).rotation.z = -Math.PI / 2; };
  ({
    ballista() { box(0, .42, 0, 1.7, .12, .36, M.wood); for (const z of [-.25, .25]) box(.1, .2, z, .1, .4, .1, M.wood); box(.45, .5, 0, .12, .12, 1.9, M.wood); barrel(.2, .56, 0, .03, .03, 2, M.wood); const tip = put(new T.Mesh(new T.ConeGeometry(.07, .22, 8), M.iron), 1.3, .56, 0); tip.rotation.z = -Math.PI / 2; },
    catapult() { box(0, .26, 0, 1.7, .14, .9, M.wood); for (const x of [-.55, .55]) for (const z of [-.5, .5]) wheel(x, z, .2); for (const z of [-.36, .36]) box(.2, .7, z, .1, .8, .1, M.wood); box(.2, 1.05, 0, .1, .1, .82, M.wood); box(-.25, .78, 0, 1.7, .09, .09, M.wood).rotation.z = -.42; put(new T.Mesh(new T.SphereGeometry(.2, 12, 8), M.steel), -.98, 1.2, 0); },
    gatling() { for (const z of [-.42, .42]) wheel(-.2, z, .36); box(-.3, .62, 0, .7, .34, .4, M.steel); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; barrel(.7, .68 + Math.cos(a) * .09, Math.sin(a) * .09, .03, .03, 1.4); } cyl(.9, .68, 0, .15, .15, .07, M.gold).rotation.z = -Math.PI / 2; },
    triple203() { cyl(0, .13, 0, 1.05, 1.1, .26, M.steel); box(-.1, .78, 0, 2.1, 1, 1.7, M.steel); box(.9, .72, 0, .2, .72, 1.45, M.steel); for (const z of [-.46, 0, .46]) barrel(2.1, .84, z, .08, .12, 2.5, M.iron, .08); },
    ciws() { cyl(0, .22, 0, .5, .58, .44, M.steel); box(0, .58, 0, .62, .32, .62, M.steel); cyl(-.05, 1.02, 0, .4, .4, .56, M.paint); put(new T.Mesh(new T.SphereGeometry(.4, 14, 10), M.paint), -.05, 1.3, 0); for (const z of [-.09, 0, .09]) barrel(.85, .82, z, .028, .028, 1.15, M.iron, .1); },
    swivel() { cyl(0, .3, 0, .07, .1, .6, M.wood); barrel(.2, .68, 0, .08, .13, 1.15); box(-.5, .68, 0, .4, .05, .05, M.wood); },
    pdr32() { cannon(1.3); barrel(.4, .78, 0, .24, .24, .12, M.gold, .04); },
    ac40() { cyl(0, .22, 0, .6, .68, .44, M.steel); box(-.1, .72, 0, 1, .55, .95, M.steel); for (const z of [-.2, .2]) { barrel(1.05, .82, z, .05, .08, 1.5, M.iron, .08); cyl(1.78, .88, z, .08, .08, .16, M.iron).rotation.z = -Math.PI / 2; } },
    torpedo() { cyl(0, .12, 0, .55, .6, .24, M.steel); for (const z of [-.3, 0, .3]) { barrel(0, .5, z, .13, .13, 2.2, M.deck2); cyl(1.12, .5, z, .15, .15, .08, M.steel).rotation.z = -Math.PI / 2; }
      const nose = put(new T.Mesh(new T.ConeGeometry(.11, .28, 12), M.warhead), 1.3, .5, 0); nose.rotation.z = -Math.PI / 2; },
    gun127() { cyl(0, .12, 0, .85, .9, .24, M.steel); box(-.05, .6, 0, 1.45, .72, 1.15, M.steel); box(.75, .55, 0, .2, .45, .8, M.steel); barrel(1.65, .68, 0, .07, .11, 1.9, M.iron, .1); box(-.2, 1.02, 0, .3, .12, .3, M.iron); },
    asm() { box(0, .2, 0, 1.3, .4, 1, M.steel); const rail = box(0, .55, 0, 1.9, .08, .95, M.iron); rail.rotation.z = .35; for (const z of [-.25, .25]) missile(.05, .78, z, 1.9, .12, .35); },
    cruise() { box(-.1, .25, 0, 1.6, .5, 1.1, M.steel); const rail = box(.1, .8, 0, 2.5, .1, .5, M.iron); rail.rotation.z = .5; const add = missile(.0, 1.07, 0, 2.5, .16, .5); add(new T.Mesh(new T.BoxGeometry(.32, .04, 1.5), M.steel), .1); }
  })[id]?.();
  return g;
}
// ids match DECO in worker.js; anything missing falls back to the plain wooden ship
// the 8 ship classes, smallest to largest. masts: [{u along the hull, h, sails:[[w,h,y0]...]}]
function shipSpecs(T) {
  if (shipSpecs.c) return shipSpecs.c;
  const box = (add, M, x, y, z, w, h, d, m) => { const b = add(new T.Mesh(new T.BoxGeometry(w, h, d), m)); b.position.set(x, y, z); return b; };
  const cyl = (add, x, y, z, r1, r2, h, m) => { const c = add(new T.Mesh(new T.CylinderGeometry(r1, r2, h, 14), m)); c.position.set(x, y, z); return c; };
  const gun = (add, M, x, y, s = 1, dir = 1) => { cyl(add, x, y + .14 * s, 0, .42 * s, .5 * s, .28 * s, M.steel);
    for (const z of [-.11 * s, .11 * s]) { const b = cyl(add, x + dir * .62 * s, y + .2 * s, z, .05 * s, .06 * s, .95 * s, M.iron); b.rotation.z = dir * -Math.PI / 2; } };
  const funnel = (add, M, x, y, r, h) => { add.stacks.push(new T.Vector3(x, y + h + .1, 0)); cyl(add, x, y + h / 2, 0, r, r * 1.08, h, M.iron); cyl(add, x, y + h + .03, 0, r * 1.06, r * 1.06, .1, M.trim); };
  const plane = (add, M, x, y, z, s) => { box(add, M, x, y + .1 * s, z, 1.3 * s, .14 * s, .18 * s, M.steel); box(add, M, x + .05 * s, y + .1 * s, z, .34 * s, .05 * s, 1.15 * s, M.steel); box(add, M, x - .55 * s, y + .24 * s, z, .22 * s, .26 * s, .05 * s, M.steel); };
  return shipSpecs.c = {
    dinghy: { wm: { u: .76, s: .42 }, L: 5.2, W: .95, D: .6, H0: .6, stern: .12, bow: .25, sailed: true, lookY: 2.1, masts: [{ u: .52, h: 4.6, sails: [[2, 2.6, 1]] }] },
    sloop: { wm: { u: .76, s: .55 }, L: 7.4, W: 1.25, D: .85, H0: .8, stern: .4, bow: .4, sailed: true, lookY: 2.6, masts: [{ u: .55, h: 6.6, sails: [[2.6, 2.4, 1.1], [2, 1.7, 3.8]] }] },
    brig: { wm: { u: .82, s: .65 }, L: 9, W: 1.55, D: 1.1, H0: .95, stern: .7, cabin: true, sailed: true, lookY: 2.9, masts: [{ u: .66, h: 7, sails: [[3, 2.3, 1.3], [2.4, 1.8, 3.9]] }, { u: .32, h: 7.6, sails: [[3.2, 2.4, 1.3], [2.5, 1.9, 4.1]] }] },
    galleon: { wm: { u: .84, s: .8 }, L: 11, W: 1.85, D: 1.35, H0: 1.1, cabin: true, sailed: true, masts: [{ u: .7, h: 7.6, sails: [[3.4, 2.4, 1.4], [2.7, 1.9, 4.3]] }, { u: .45, h: 9.2, sails: [[3.9, 2.8, 1.5], [3.1, 2.2, 4.8], [2.3, 1.5, 7.3]] }, { u: .2, h: 6.6, sails: [[2.8, 2, 1.4], [2.1, 1.5, 3.9]] }] },
    ironclad: { wm: { u: .69, s: .9 }, L: 13, W: 2, D: 1.3, H0: .85, stern: .1, bow: .3, hull: "#3C3F44", lookY: 2.8, masts: [{ u: .68, h: 6.4, sails: [] }],
      build({ add, M, xAt, deckY }) { const y = deckY(.45); box(add, M, xAt(.45), y + .6, 0, 5, 1.2, 2.7, M.steel); funnel(add, M, xAt(.5), y + 1.2, .36, 2.3); funnel(add, M, xAt(.38), y + 1.2, .36, 2.3); gun(add, M, xAt(.8), deckY(.8), 1.1, 1); gun(add, M, xAt(.14), deckY(.14), 1.1, -1); } },
    destroyer: { wm: { u: .9, s: .95 }, L: 15, W: 1.75, D: 1.2, H0: 1, stern: 0, bow: .9, hull: "#6A737C", lookY: 2.8, masts: [{ u: .58, h: 7, sails: [] }],
      build({ add, M, xAt, deckY }) { const y = deckY(.55); box(add, M, xAt(.56), y + .55, 0, 3, 1.1, 2, M.steel); box(add, M, xAt(.6), y + 1.5, 0, 1.5, .8, 1.5, M.steel); funnel(add, M, xAt(.42), deckY(.42), .4, 1.9); gun(add, M, xAt(.8), deckY(.8), 1, 1); gun(add, M, xAt(.7), deckY(.7) + .4, .85, 1); gun(add, M, xAt(.13), deckY(.13), 1, -1); box(add, M, xAt(.27), deckY(.27) + .3, 0, 1.6, .55, .8, M.iron); } },
    cruiser: { air: { heli: [.08, 3, 0, 1.2], drone: [.9, 5, 0, 1.1] }, wm: { u: .93, s: 1.1 }, L: 19, W: 2.3, D: 1.5, H0: 1.25, stern: 0, bow: 1, hull: "#5F6973", lookY: 3.8, masts: [{ u: .62, h: 9.5, sails: [] }, { u: .36, h: 7.5, sails: [] }],
      build({ add, M, xAt, deckY }) { const y = deckY(.55); box(add, M, xAt(.54), y + .7, 0, 5.4, 1.4, 2.8, M.steel); box(add, M, xAt(.62), y + 2, 0, 2.4, 1.2, 2.1, M.steel); box(add, M, xAt(.64), y + 3, 0, 1.3, .8, 1.6, M.iron); funnel(add, M, xAt(.47), y + 1.4, .5, 2.2); funnel(add, M, xAt(.4), y + 1.4, .5, 2); gun(add, M, xAt(.84), deckY(.84), 1.4, 1); gun(add, M, xAt(.75), deckY(.75) + .5, 1.3, 1); gun(add, M, xAt(.2), deckY(.2) + .5, 1.3, -1); gun(add, M, xAt(.1), deckY(.1), 1.4, -1); } },
    carrier: { air: { heli: [.22, 4, 1.6, 1.7], drone: [.8, 7.5, 0, 1.6], vtol: [.9, 3.6, -1.6, 1.5], fighter: [.32, 8, 0, 1.7], awacs: [.55, 6.2, -2.2, 2] }, wm: { u: .9, s: 2, y: .85, z: 1.5 }, L: 26, W: 3.3, D: 1.9, H0: 1.7, stern: 0, bow: .7, hull: "#555E67", lookY: 4.6, masts: [{ u: .6, h: 11, sails: [] }],
      build({ add, M, xAt, deckY, L }) { const y = deckY(.5) + .7; add.stacks.push(new T.Vector3(xAt(.62), y + 3.3, 2.5)); box(add, M, xAt(.5), y, 0, L * .98, .3, 6.9, M.deck2);
        box(add, M, xAt(.6), y + 1.2, 2.5, 3.4, 2.2, 1.2, M.steel); box(add, M, xAt(.62), y + 2.75, 2.5, 2, .9, 1, M.iron);
        for (const u of [.2, .42, .78]) box(add, M, xAt(u), y + .16, 0, L * .2, .012, .1, M.paint);
        box(add, M, xAt(.5), y + .16, -1.2, L * .85, .012, .12, M.paint);
        [[.85, -1.5], [.75, -1.8], [.65, -1.4], [.4, -2], [.3, -1.2], [.2, -2], [.12, -.6], [.3, 1], [.42, 1.6]].forEach(([u, z]) => plane(add, M, xAt(u), y + .15, z, 1.35)); } }
  };
}
const HULL = { wood: "#7A4A28", ebony: "#2A221D", red: "#8E2A22", navy: "#1F3A63", mint: "#2F8C78", pink: "#D97A9A", lavender: "#9A84C9", sky: "#6FA8D6", lemon: "#E8C85A", white: "#E8DFC9", gold: "#C99A2E" };
const TRIM = { gold: "#E3B34A", silver: "#C9D3DC", rosegold: "#E2A48C", pearl: "#F4EFE6" };
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
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0); // the sky covers this in the live view; snapshots keep it see-through
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
  const skyMesh = new T.Mesh(new T.SphereGeometry(500, 32, 16), skyMat); scene.add(skyMesh);
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
  // emblems are the same 100×100 paths the flat map ship uses (voyage.js), drawn here onto canvas
  const V = window.Voyage, paths = {};
  function drawEmblem(g, id, cx, cy, size, ink, bg) {
    const e = V.EMBLEMS[id]; if (!e) return;
    const p = paths[id] || (paths[id] = { d: new Path2D(e.d), cut: e.cut ? new Path2D(e.cut) : null });
    g.save(); g.translate(cx - size / 2, cy - size / 2); g.scale(size / 100, size / 100);
    g.fillStyle = ink; g.fill(p.d, e.rule || "nonzero"); if (p.cut) { g.fillStyle = bg; g.fill(p.cut); } g.restore();
  }
  function tile(g, w, h, step, fn) { for (let y = step / 2, r = 0; y < h + step; y += step, r++) for (let x = (r % 2) * step / 2 + step / 4; x < w + step; x += step) fn(x, y); }
  function sailTexture(color, pattern, emblem) {
    return canvasTex(256, 256, (g, w, h) => {
      let bg = color;
      if (pattern === "rainbow") { ["#F0564A", "#F59B3A", "#F4D03F", "#5DBB63", "#3D8BD9", "#8E5CC7"].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * h / 6, w, h / 6 + 1); }); bg = "#F4D03F"; }
      else if (pattern === "gold") { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#FFF0A8"); gr.addColorStop(.45, "#E9B53A"); gr.addColorStop(1, "#A9771A"); g.fillStyle = gr; g.fillRect(0, 0, w, h); bg = "#E9B53A"; }
      else { g.fillStyle = color; g.fillRect(0, 0, w, h); }
      g.fillStyle = "rgba(0,0,0,.07)"; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h);
      const light = V.inkFor(color) !== "#FFFFFF", soft = light ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.55)";
      if (pattern === "stripe") { g.fillStyle = light ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.45)"; for (let y = 18; y < h; y += 52) g.fillRect(0, y, w, 22); }
      else if (pattern === "dots") { g.fillStyle = soft; tile(g, w, h, 40, (x, y) => { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); }); }
      else if (pattern === "check") { g.fillStyle = light ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.3)"; for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * 32; x < w; x += 64) g.fillRect(x, y, 32, 32); }
      else if (pattern === "hearts") tile(g, w, h, 48, (x, y) => drawEmblem(g, "heart", x, y, 26, soft, color));
      else if (pattern === "flowers") tile(g, w, h, 52, (x, y) => drawEmblem(g, "flower", x, y, 30, soft, "#F4D03F"));
      else if (pattern === "starry") { tile(g, w, h, 46, (x, y) => drawEmblem(g, "star", x, y, 18, "#FFF3B8", color)); tile(g, w, h, 46, (x, y) => { g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.arc(x + 20, y + 14, 2.4, 0, Math.PI * 2); g.fill(); }); }
      const gr2 = g.createLinearGradient(0, 0, 0, h); gr2.addColorStop(0, "rgba(255,255,255,.08)"); gr2.addColorStop(1, "rgba(0,0,0,.16)"); g.fillStyle = gr2; g.fillRect(0, 0, w, h);
      if (emblem) drawEmblem(g, emblem, w / 2, h / 2, 170, V.inkFor(bg), bg);
      g.strokeStyle = "rgba(0,0,0,.22)"; g.lineWidth = 6; g.strokeRect(0, 0, w, h); });
  }
  function flagTexture(cloth, emblem) {
    return canvasTex(256, 160, (g, w, h) => { g.fillStyle = cloth; g.fillRect(0, 0, w, h);
      if (emblem) drawEmblem(g, emblem, w / 2, h / 2, 140, V.inkFor(cloth), cloth); else { g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(0, h * .42, w, h * .16); } });
  }

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
    hullPhoto: new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: .8 }),
    warhead: new T.MeshStandardMaterial({ color: 0xB3362B, roughness: .5 }),
    steel: new T.MeshStandardMaterial({ color: 0x8A949E, roughness: .5, metalness: .45 }),
    deck2: new T.MeshStandardMaterial({ color: 0x3A4046, roughness: .85 }),
    paint: new T.MeshStandardMaterial({ color: 0xF2F2E8, roughness: .8 }),
    rope: new T.LineBasicMaterial({ color: 0x2B2118, transparent: true, opacity: .75 })
  };
  /* ----- ships: one spec per class in SHIPS below; each is built once on first use ----- */
  let ship, A, H, bird, balloons, lamps, flagGeo, flagBase, xAt, mount, photoPanel, rotors, stacks, shipSpec, shipK = 1;
  const AIRCRAFT = ["heli", "drone", "vtol", "fighter", "awacs"];
  // real ship camouflage painted over the hull, as a repeating tile (see CAMO in voyage.js)
  const camoTex = {};
  function camoTexture(id) {
    if (camoTex[id]) return camoTex[id];
    const c = V.CAMO[id], t = canvasTex(256, 256, (g, w) => { g.fillStyle = c.bg; g.fillRect(0, 0, w, w); g.scale(w / 100, w / 100); for (const [f, d] of c.p) { g.fillStyle = f; g.fill(new Path2D(d)); } });
    t.wrapS = t.wrapT = T.RepeatWrapping; return camoTex[id] = t;
  }
  function makeShip(spec) {
  const ship = new T.Group(); ship.visible = false; scene.add(ship);
  const { L, W, D, H0 } = spec;
  const halfW = u => u < .12 ? W * (.8 + .2 * u / .12) : u < .62 ? W : W * Math.max(.04, Math.pow(Math.cos((u - .62) / .38 * Math.PI / 2), .9));
  const depth = u => u > .75 ? D * (1 - .45 * (u - .75) / .25) : D;
  const sheer = u => H0 + (spec.stern ?? 1) * Math.max(0, (.22 - u) / .22) + (spec.bow ?? .55) * Math.pow(Math.max(0, (u - .78) / .22), 1.5);
  const xAt = u => -L / 2 + u * L, deckY = u => sheer(u) - .34;
  function sideP(u, drop, side = 1) { const top = sheer(u), d = depth(u), s = Math.min(1, drop / (top + d)), a = Math.asin(s); return new T.Vector3(xAt(u), top - drop, side * halfW(u) * Math.cos(a) * (.82 + .18 * (1 - s))); }
  const add = (mesh, parent = ship) => { mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; };
  add.stacks = []; // funnel tops, where coloured smoke comes out
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
  if (spec.cabin) for (let r = 0; r < 2; r++) for (let k = -2; k <= 2; k++) add(new T.Mesh(new T.BoxGeometry(.06, .32, .26), M.window)).position.set(xAt(0) - .02, sheer(0) - .45 - r * .45, k * .38);
  if (spec.cabin) add(new T.Mesh(new T.BoxGeometry(.08, .08, 2.3), M.trim), trimGroup).position.set(xAt(0) - .03, sheer(0) - .2, 0);
  if (spec.cabin) add(new T.Mesh(new T.BoxGeometry(1.6, .9, 2.6), M.hull)).position.set(xAt(.08), deckY(.08) + .45, 0);
  if (spec.cabin) add(new T.Mesh(new T.BoxGeometry(1.8, .1, 2.8), M.wood)).position.set(xAt(.08), deckY(.08) + .95, 0);
  if (spec.cabin) for (const z of [-.6, 0, .6]) add(new T.Mesh(new T.BoxGeometry(.05, .3, .24), M.window)).position.set(xAt(.08) + .81, deckY(.08) + .5, z);
  const mastSpec = spec.masts, mainI = mastSpec.length > 1 ? 1 : 0, mainM = mastSpec[mainI];
  const mastTops = [];
  function sailGeo(w, h, bulge) { const g = new T.PlaneGeometry(w, h, 10, 8), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2); p.setZ(i, bulge * (1 - x * x) * (.75 + .25 * (1 - y)) * (1 - .35 * y * y)); }
    g.rotateY(Math.PI / 2); g.computeVertexNormals(); return g; }
  for (const [mi, m] of mastSpec.entries()) { const x = xAt(m.u), base = deckY(m.u);
    add(new T.Mesh(new T.CylinderGeometry(.09, .14, m.h, 10), M.wood)).position.set(x, base + m.h / 2, 0); mastTops.push(new T.Vector3(x, base + m.h, 0));
    // yards are braced round a little, as when sailing with the wind on the quarter, so the sails still show from the side
    const rig = new T.Group(); rig.position.set(x, base, 0); rig.rotation.y = .42; ship.add(rig);
    for (const [si, [w, h, y0]] of m.sails.entries()) { const yard = add(new T.Mesh(new T.CylinderGeometry(.05, .05, w * 1.12, 8), M.wood), rig); yard.rotation.x = Math.PI / 2; yard.position.set(.08, y0 + h, 0);
      add(new T.Mesh(sailGeo(w, h, .55), si === 0 && mi <= mainI ? M.sailMain : M.sailPlain), rig).position.set(.1, y0 + h / 2, 0); } }
  const bowTip = new T.Vector3(xAt(1) + 2.6, sheer(1) + 1.0, 0);
  if (spec.sailed) { const from = new T.Vector3(xAt(.93), sheer(.93), 0), dir = bowTip.clone().sub(from), len = dir.length();
    const bs = add(new T.Mesh(new T.CylinderGeometry(.05, .09, len, 8), M.wood)); bs.position.copy(from).add(bowTip).multiplyScalar(.5); bs.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    const fx = xAt(mastSpec[0].u), fb = deckY(mastSpec[0].u), jh = mastSpec[0].h, g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute([bowTip.x - .4, bowTip.y - .05, 0, fx + .3, fb + jh * .68, 0, fx + 1.4, fb + jh * .22, 0], 3)); g.setAttribute("uv", new T.Float32BufferAttribute([1, .5, 0, 1, 0, 0], 2)); g.computeVertexNormals();
    add(new T.Mesh(g, M.sailPlain)); }
  if (spec.sailed) { const v = [];
    for (const m of mastSpec) { const x = xAt(m.u), top = deckY(m.u) + m.h * .82; for (const side of [1, -1]) for (const dx of [-.5, 0, .5]) { const r = sideP(m.u + dx / L, 0, side); v.push(x, top, 0, r.x, r.y, r.z); } }
    v.push(mastTops[0].x, mastTops[0].y, 0, bowTip.x, bowTip.y, 0); for (let i = 1; i < mastTops.length; i++) v.push(mastTops[i].x, mastTops[i].y - .4, 0, mastTops[i - 1].x, mastTops[i - 1].y - .6, 0); const lastT = mastTops[mastTops.length - 1]; v.push(lastT.x, lastT.y - .5, 0, xAt(0), sheer(0) + .1, 0);
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(v, 3)); ship.add(new T.LineSegments(g, M.rope)); }
  const flagGeo = new T.PlaneGeometry(1.6, 1, 14, 6); flagGeo.translate(.8, 0, 0);
  const flagBase = Float32Array.from(flagGeo.attributes.position.array);
  const flag = add(new T.Mesh(flagGeo, M.flag)); flag.rotation.y = Math.PI; flag.position.copy(mastTops[mainI]).add(new T.Vector3(0, -.45, 0));

  /* ----- attachments (ids match "att" items in DECO) ----- */
  const A = {}; const grp = k => (A[k] = new T.Group(), ship.add(A[k]), A[k]);
  grp("cannon"); for (const side of [1, -1]) for (const u of [.28, .38, .48, .58]) { const p = sideP(u, .72, side);
    const port = add(new T.Mesh(new T.BoxGeometry(.34, .3, .06), M.iron), A.cannon); port.position.copy(p); port.lookAt(p.clone().add(new T.Vector3(0, 0, side)));
    const c = add(new T.Mesh(new T.CylinderGeometry(.08, .11, .62, 10), M.iron), A.cannon); c.rotation.x = Math.PI / 2; c.position.copy(p).add(new T.Vector3(0, 0, side * .2)); }
  /* ----- figureheads on the bow (ids match "head" items in DECO): one at a time ----- */
  const H = {}; const hgrp = k => (H[k] = new T.Group(), ship.add(H[k]), H[k]);
  const bowBase = new T.Vector3(xAt(1) + .05, sheer(1) - .35, 0), at = (x, y, z = 0) => bowBase.clone().add(new T.Vector3(x, y, z));
  hgrp("dragon"); {
    const neck = add(new T.Mesh(new T.CylinderGeometry(.16, .24, 1.3, 10), M.gold), H.dragon); neck.position.copy(at(.45, .4)); neck.rotation.z = -.95;
    const head = add(new T.Mesh(new T.ConeGeometry(.24, .85, 10), M.gold), H.dragon); head.position.copy(at(1.2, .9)); head.rotation.z = -1.75;
    add(new T.Mesh(new T.SphereGeometry(.27, 12, 10), M.gold), H.dragon).position.copy(at(.95, .92));
    const eyeM = new T.MeshStandardMaterial({ color: 0xD9402F, emissive: 0xD9402F, emissiveIntensity: .8 });
    for (const z of [-.14, .14]) { const horn = add(new T.Mesh(new T.ConeGeometry(.06, .45, 8), M.gold), H.dragon); horn.position.copy(at(.82, 1.25, z)); horn.rotation.z = .6;
      add(new T.Mesh(new T.SphereGeometry(.05, 8, 6), eyeM), H.dragon).position.copy(at(1.08, 1.0, z * 1.15)); } }
  hgrp("swan"); { const white = new T.MeshStandardMaterial({ color: 0xFFFFFF, roughness: .35, metalness: .1 });
    const neck = new T.CatmullRomCurve3([at(0, 0), at(.55, .25), at(.95, .85), at(.85, 1.45), at(1.05, 1.75)]);
    add(new T.Mesh(new T.TubeGeometry(neck, 24, .13, 10, false), white), H.swan);
    add(new T.Mesh(new T.SphereGeometry(.2, 14, 12), white), H.swan).position.copy(at(1.1, 1.78));
    const beak = add(new T.Mesh(new T.ConeGeometry(.07, .32, 10), new T.MeshStandardMaterial({ color: 0xF28A2E, roughness: .5 })), H.swan); beak.position.copy(at(1.38, 1.72)); beak.rotation.z = -Math.PI / 2 - .2;
    for (const z of [-.11, .11]) add(new T.Mesh(new T.SphereGeometry(.035, 8, 6), M.iron), H.swan).position.copy(at(1.2, 1.84, z));
    const wingM = new T.MeshStandardMaterial({ color: 0xF4EFE6, roughness: .4 });
    for (const z of [-.42, .42]) { const wg = add(new T.Mesh(new T.SphereGeometry(.45, 14, 10), wingM), H.swan); wg.scale.set(1.1, .45, .25); wg.position.copy(at(.25, .1, z)); wg.rotation.z = .35; } }
  grp("nest"); { const y = deckY(mainM.u) + mainM.h * .68, x = xAt(mainM.u);
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
  const PASTEL = [0xF7A8C4, 0xFFD3A8, 0xFFF1A8, 0xA8E6CF, 0xA8D8F7, 0xC9B6F2];
  const mat = c => new T.MeshStandardMaterial({ color: c, roughness: .55 });
  grp("flowers"); { const leaf = mat(0x6FAE5A), cols = [0xF7A8C4, 0xFFFFFF, 0xFFE27A, 0xC9B6F2].map(mat);
    for (const side of [1, -1]) for (const [i, u] of [.22, .32, .42, .52, .62, .72].entries()) { const p = sideP(u, 0, side).add(new T.Vector3(0, .1, -side * .06));
      for (let k = 0; k < 3; k++) add(new T.Mesh(new T.SphereGeometry(.11, 10, 8), cols[(i + k) % 4]), A.flowers).position.copy(p).add(new T.Vector3((k - 1) * .16, (k % 2) * .06, 0));
      const lf = add(new T.Mesh(new T.SphereGeometry(.12, 8, 6), leaf), A.flowers); lf.scale.set(1.6, .35, .7); lf.position.copy(p).add(new T.Vector3(0, -.05, side * .05)); } }
  grp("bunting"); { const pts = [bowTip.clone(), ...mastTops.map(m => m.clone().add(new T.Vector3(0, -.4, 0))), new T.Vector3(xAt(.01), sheer(0) + .35, 0)];
    for (let s = 0; s < pts.length - 1; s++) { const a = pts[s], b = pts[s + 1], mid = a.clone().lerp(b, .5).add(new T.Vector3(0, -.9, 0)), curve = new T.QuadraticBezierCurve3(a, mid, b);
      A.bunting.add(new T.Mesh(new T.TubeGeometry(curve, 16, .015, 4, false), M.rope));
      const n = Math.max(3, Math.round(a.distanceTo(b) / .55));
      for (let k = 1; k < n; k++) { const p = curve.getPoint(k / n), g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute([-.17, 0, 0, .17, 0, 0, 0, -.34, 0], 3)); g.computeVertexNormals();
        const m = add(new T.Mesh(g, new T.MeshStandardMaterial({ color: PASTEL[(s * 7 + k) % 6], side: T.DoubleSide, roughness: .8 })), A.bunting); m.position.copy(p); m.rotation.y = Math.PI / 2; } } }
  grp("balloons"); const balloons = [];
  { const heart = (c) => { const g = new T.Group(), m = new T.MeshStandardMaterial({ color: c, roughness: .25, metalness: .05 });
      for (const z of [-.17, .17]) add(new T.Mesh(new T.SphereGeometry(.26, 16, 12), m), g).position.set(0, .08, z);
      const tip = add(new T.Mesh(new T.ConeGeometry(.33, .5, 16), m), g); tip.rotation.x = Math.PI; tip.position.y = -.26; tip.scale.set(1, 1, .9); return g; };
    [[0xF28AB0, -.6, 2.6], [0xC9B6F2, 0, 3.1], [0xFFB6A3, .6, 2.4]].forEach(([c, z, h], i) => { const b = heart(c), anchorP = new T.Vector3(xAt(.03), sheer(0) + .1, z * .5);
      b.position.set(xAt(.03) - .4 + i * .3, sheer(0) + h, z); b.rotation.y = Math.PI / 2; A.balloons.add(b); balloons.push({ g: b, y: b.position.y, ph: i * 1.7 });
      const sg = new T.BufferGeometry().setFromPoints([anchorP, b.position.clone().add(new T.Vector3(0, -.5, 0))]); A.balloons.add(new T.Line(sg, M.rope)); }); }
  grp("bowribbon"); { const pink = mat(0xF28AB0), x = xAt(0) - .12, y = sheer(0) - .25;
    for (const z of [-.42, .42]) { const loop = add(new T.Mesh(new T.SphereGeometry(.3, 14, 10), pink), A.bowribbon); loop.scale.set(.35, .7, 1.1); loop.position.set(x, y + .05, z); loop.rotation.x = z > 0 ? .5 : -.5;
      const tail = add(new T.Mesh(new T.BoxGeometry(.08, .6, .16), pink), A.bowribbon); tail.position.set(x, y - .38, z * .45); tail.rotation.x = z > 0 ? -.35 : .35; }
    add(new T.Mesh(new T.SphereGeometry(.16, 12, 10), mat(0xE0608F)), A.bowribbon).position.set(x - .02, y + .05, 0); }
  grp("cat"); { const fur = mat(0xF2A65A), belly = mat(0xFFF3E6), u = .8, x = xAt(u), y = deckY(u), c = new T.Group(); A.cat.add(c); c.position.set(x, y, .3); c.rotation.y = -.6;
    add(new T.Mesh(new T.SphereGeometry(.3, 14, 12), fur), c).scale.set(1, 1.05, .85); c.children[0].position.y = .3;
    add(new T.Mesh(new T.SphereGeometry(.18, 12, 10), belly), c).position.set(.16, .26, 0);
    const head = add(new T.Mesh(new T.SphereGeometry(.24, 14, 12), fur), c); head.position.set(.12, .72, 0);
    for (const z of [-.12, .12]) { const ear = add(new T.Mesh(new T.ConeGeometry(.08, .17, 8), fur), c); ear.position.set(.1, .94, z); ear.rotation.x = z > 0 ? -.25 : .25;
      add(new T.Mesh(new T.SphereGeometry(.035, 8, 6), M.iron), c).position.set(.32, .76, z * .7); }
    add(new T.Mesh(new T.SphereGeometry(.03, 6, 6), mat(0xE0608F)), c).position.set(.35, .69, 0);
    const tail = add(new T.Mesh(new T.TorusGeometry(.26, .05, 8, 16, Math.PI * 1.1), fur), c); tail.position.set(-.3, .3, 0); tail.rotation.y = Math.PI / 2; }
  grp("fairylights"); { const bulbs = [0xFFE27A, 0xF7A8C4, 0xA8D8F7, 0xA8E6CF].map(c => new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.4 }));
    for (const [a, b] of [[mastTops[mainI], bowTip], [mastTops[mainI], new T.Vector3(xAt(.01), sheer(0) + .3, 0)]]) {
      const mid = a.clone().lerp(b, .5).add(new T.Vector3(0, -.6, 0)), curve = new T.QuadraticBezierCurve3(a.clone().add(new T.Vector3(0, -.3, 0)), mid, b);
      A.fairylights.add(new T.Mesh(new T.TubeGeometry(curve, 20, .012, 4, false), M.rope));
      const n = Math.round(a.distanceTo(b) / .45); for (let k = 1; k < n; k++) add(new T.Mesh(new T.SphereGeometry(.075, 8, 6), bulbs[k % 4]), A.fairylights).position.copy(curve.getPoint(k / n)); } }

  /* ----- aircraft over the larger warships (ids match "att" items with group "air"); spec.air gives [u along the ship, height above the deck, z, size] ----- */
  const rotors = [];
  { const navy = mat(0x2F4A5F), steel = mat(0x7F90A0), dark = mat(0x3E4A55), light = mat(0xAEB8C2);
    const part = (g, geo, m, x = 0, y = 0, z = 0) => { const p = add(new T.Mesh(geo, m), g); p.position.set(x, y, z); return p; }, bx = (w, h, d) => new T.BoxGeometry(w, h, d);
    const jet = (g, x, y, z) => { const j = new T.Group(); j.position.set(x, y, z); g.add(j); part(j, bx(1.5, .16, .2), steel); part(j, new T.ConeGeometry(.1, .4, 8), steel, .92).rotation.z = -Math.PI / 2; part(j, bx(.5, .05, 1.3), steel, -.05); part(j, bx(.22, .32, .04), dark, -.65, .2); part(j, bx(.25, .05, .5), steel, -.65); };
    const models = {
      heli(g) { part(g, new T.SphereGeometry(.45, 12, 10), navy).scale.set(1.5, .85, .85); part(g, bx(1.3, .12, .12), navy, -1.1, .08); part(g, bx(.12, .4, .05), navy, -1.7, .24); part(g, bx(.22, .12, .22), dark, 0, .48);
        for (const sx of [-.32, .32]) part(g, bx(.9, .05, .05), dark, 0, -.5, sx); rotors.push(part(g, bx(3, .03, .12), dark, 0, .58), part(g, bx(.12, .03, 3), dark, 0, .58)); },
      drone(g) { part(g, bx(1.2, .14, .18), steel); part(g, bx(.3, .03, 2.2), light, .05, .06); part(g, bx(.2, .22, .03), dark, -.6, .12); },
      vtol(g) { jet(g, 0, 0, 0); for (const z of [-.5, .5]) part(g, new T.CylinderGeometry(.14, .14, .3, 10), dark, .05, -.2, z); },
      fighter(g) { jet(g, 0, 0, 0); jet(g, -1.8, -.1, 1.5); jet(g, -1.8, -.1, -1.5); },
      awacs(g) { part(g, bx(2.2, .28, .32), light); part(g, bx(.5, .06, 3), light, 0, .02); part(g, bx(.28, .42, .05), light, -1.05, .28); part(g, new T.CylinderGeometry(.62, .62, .1, 18), dark, -.2, .46); part(g, bx(.08, .22, .08), dark, -.2, .3); }
    };
    for (const [id, [u, up, z, size]] of Object.entries(spec.air || {})) { grp(id); const g = new T.Group(); g.position.set(xAt(u), deckY(u) + up, z); g.scale.setScalar(size); A[id].add(g); models[id](g); } }
  if (spec.build) spec.build({ T, M, add, xAt, deckY, sheer, halfW, L });
  const mount = new T.Group(), wm = spec.wm; mount.position.set(xAt(wm.u), deckY(wm.u) + (wm.y || 0), wm.z || 0); mount.scale.setScalar(wm.s); ship.add(mount); mount.userData.models = {};
  // ships without sails carry the kid's photo as a painting that follows the curve of each hull side
  const photoPanel = new T.Group(); photoPanel.visible = false; ship.add(photoPanel);
  // long hulls are low for their length, so one picture would look tiny: they repeat it along the side
  if (!spec.sailed) { const top = H0 * .1, bot = H0 * .92, uHalf = (bot - top) * 1.2 / 2 / L, copies = L < 14 ? 1 : L < 22 ? 2 : 3, NX = 12, NY = 4;
    for (let n = 0; n < copies; n++) for (const side of [1, -1]) { const uMid = .15 + (n + .5) * .6 / copies, pos = [], uv = [], idx = [];
      for (let i = 0; i <= NX; i++) for (let j = 0; j <= NY; j++) { const a = i / NX, b = j / NY, p = sideP(uMid - uHalf + a * 2 * uHalf, top + b * (bot - top), side);
        pos.push(p.x, p.y, p.z + side * .06); uv.push(side > 0 ? a : 1 - a, 1 - b);
        if (i < NX && j < NY) { const c = i * (NY + 1) + j, d = c + NY + 1; idx.push(c, c + 1, d, d, c + 1, d + 1); } }
      const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      photoPanel.add(new T.Mesh(g, M.hullPhoto)); } }
  return { ship, A, H, bird, balloons, lamps, flagGeo, flagBase, xAt, mount, photoPanel, rotors, stacks: add.stacks };
  }
  const built = {};
  function useShip(id) { const spec = shipSpecs(window.THREE)[id] || shipSpecs(window.THREE).dinghy, b = built[id] || (built[id] = makeShip(spec));
    if (ship) ship.visible = false; ({ ship, A, H, bird, balloons, lamps, flagGeo, flagBase, xAt, mount, photoPanel, rotors, stacks } = b); ship.visible = true; shipSpec = spec; shipK = Math.max(.72, spec.L / 11);
    Object.assign(sun.shadow.camera, { left: -12 * shipK, right: 12 * shipK, top: 14 * shipK, bottom: -6 * shipK, far: 80 + 40 * shipK }); sun.shadow.camera.updateProjectionMatrix(); }
  useShip("dinghy");
  /* ----- wake behind the stern (the "wake" decoration changes its look) ----- */
  const foamN = 160, foamGeo = new T.BufferGeometry(), foamPos = new Float32Array(foamN * 3), foamCol = new Float32Array(foamN * 3), foamAge = new Float32Array(foamN);
  foamGeo.setAttribute("position", new T.BufferAttribute(foamPos, 3)); foamGeo.setAttribute("color", new T.BufferAttribute(foamCol, 3));
  const foamMat = new T.PointsMaterial({ map: glowTex, size: .55, transparent: true, opacity: .85, depthWrite: false, vertexColors: true });
  const foamPts = new T.Points(foamGeo, foamMat); scene.add(foamPts);
  const heartTex = canvasTex(64, 64, g => drawEmblem(g, "heart", 32, 32, 60, "#FFFFFF", "#FFFFFF"), false);
  const petalTex = canvasTex(64, 64, g => { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(32, 32, 14, 26, .6, 0, Math.PI * 2); g.fill(); }, false);
  let wakeKind = "", spread = 2.4;
  const tmpC = new T.Color();
  function resetFoam(i) { const bow = Math.random() < .3; foamAge[i] = 0;
    foamPos[i * 3] = bow ? xAt(.97) : xAt(0) - .2; foamPos[i * 3 + 1] = .1; foamPos[i * 3 + 2] = (Math.random() - .5) * (bow ? .6 : spread);
    if (wakeKind === "rainbow") tmpC.setHSL(Math.random(), .85, .62); else if (wakeKind === "sparkle") tmpC.set(Math.random() < .7 ? "#FFE27A" : "#FFFFFF"); else if (wakeKind === "bubble") tmpC.set("#CFEFFF");
    else if (wakeKind === "hearts") tmpC.set(["#F28AB0", "#F7A8C4", "#FF6F91"][i % 3]); else if (wakeKind === "petals") tmpC.set(["#F7C6D9", "#FFFFFF", "#F28AB0"][i % 3]); else tmpC.set("#FFFFFF");
    foamCol[i * 3] = tmpC.r; foamCol[i * 3 + 1] = tmpC.g; foamCol[i * 3 + 2] = tmpC.b; }
  for (let i = 0; i < foamN; i++) { resetFoam(i); foamAge[i] = Math.random() * 3; }
  /* ----- coloured funnel smoke; the points live inside the ship so they ride the waves with it ----- */
  const smokeN = 90, smokeGeo = new T.BufferGeometry(), smokePos = new Float32Array(smokeN * 3), smokeCol = new Float32Array(smokeN * 3), smokeAge = new Float32Array(smokeN);
  smokeGeo.setAttribute("position", new T.BufferAttribute(smokePos, 3)); smokeGeo.setAttribute("color", new T.BufferAttribute(smokeCol, 3));
  const smokeMat = new T.PointsMaterial({ map: glowTex, size: 1.1, transparent: true, opacity: .75, depthWrite: false, vertexColors: true }), smokeObj = new T.Points(smokeGeo, smokeMat); smokeObj.visible = false; smokeObj.frustumCulled = false;
  let smokeColors = [];
  function resetSmoke(i) { const p = stacks[i % stacks.length]; smokeAge[i] = 0; smokePos[i * 3] = p.x; smokePos[i * 3 + 1] = p.y; smokePos[i * 3 + 2] = p.z; tmpC.set(smokeColors[i % smokeColors.length]); smokeCol[i * 3] = tmpC.r; smokeCol[i * 3 + 1] = tmpC.g; smokeCol[i * 3 + 2] = tmpC.b; }

  /* ----- camera: drag to orbit, pinch or wheel to zoom, buttons for fixed views ----- */
  const target = new T.Vector3(0, 3.2, 0), cam = { th: .85, ph: 1.22, r: 21 };
  let focusOn = false, focusK = 0, look3D = {};
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
  let lookKey = "", lookReady = Promise.resolve();
  // look: see parseLook in worker.js; sailHex/flagHex are the free colours already turned into hex
  function setLook(look = {}, sailHex = "#EFE4C8", flagHex = sailHex, shipId = "dinghy") {
    const key = JSON.stringify([look, sailHex, flagHex, shipId]); if (key === lookKey) return; lookKey = key;
    useShip(shipId); look3D = look;
    const camo = !shipSpec.sailed && V.CAMO[look.camo] ? look.camo : "", goldHull = look.hull === "gold" && !camo;
    M.hull.color.set(camo ? "#FFFFFF" : HULL[look.hull] || shipSpec.hull || HULL.wood); M.hull.map = camo ? camoTexture(camo) : look.hull || !shipSpec.sailed ? null : plankTex;
    M.hull.metalness = goldHull ? .75 : .05; M.hull.roughness = goldHull ? .3 : .7; M.hull.needsUpdate = true;
    smokeColors = (!shipSpec.sailed && V.SMOKE[look.smoke]) || []; smokeObj.visible = !!smokeColors.length && !!stacks.length;
    if (smokeObj.visible) { ship.add(smokeObj); smokeMat.size = 1.5 * shipK; for (let i = 0; i < smokeN; i++) { resetSmoke(i); smokeAge[i] = -Math.random() * 3; smokePos[i * 3 + 1] = -100; } }
    M.trim.color.set(TRIM[look.trim] || TRIM.gold);
    for (const m of [M.sailMain, M.sailPlain, M.flag]) m.map?.dispose();
    const p = look.pattern || "none";
    M.sailMain.map = sailTexture(sailHex, p, look.se); M.sailPlain.map = sailTexture(sailHex, p, null);
    M.flag.map = flagTexture(flagHex, look.fe);
    M.sailMain.needsUpdate = M.sailPlain.needsUpdate = M.flag.needsUpdate = true;
    photoPanel.visible = false;
    const photo = V.photoSrc(look);
    lookReady = !photo ? Promise.resolve() : new Promise(done => { const im = new Image(); im.onerror = done; im.onload = () => { if (lookKey !== key) return done();
      const tex = canvasTex(512, 426, (g, w, h) => { g.drawImage(im, 0, 0, w, h); g.strokeStyle = "rgba(0,0,0,.22)"; g.lineWidth = 6; g.strokeRect(0, 0, w, h); });
      const mat = shipSpec.sailed ? M.sailMain : M.hullPhoto; mat.map?.dispose(); mat.map = tex; mat.needsUpdate = true; if (!shipSpec.sailed) photoPanel.visible = true; done(); }; im.src = photo; });
    // hand-placed sailing-ship attachments sit under the raised decks of steel ships, so those ships show only aircraft
    const on = new Set((look.att || []).filter(k => shipSpec.sailed || AIRCRAFT.includes(k))); for (const k in A) A[k].visible = on.has(k);
    for (const k in H) H[k].visible = look.head === k && shipSpec.sailed;
    const wm = mount.userData.models; for (const k in wm) wm[k].visible = false;
    if (look.weapon) { if (!wm[look.weapon]) mount.add(wm[look.weapon] = weaponModel(T, M, look.weapon)); wm[look.weapon].visible = true; }
    wakeKind = look.wake || ""; spread = wakeKind === "splash" ? 3.6 : 2.4;
    foamMat.map = wakeKind === "hearts" ? heartTex : wakeKind === "petals" ? petalTex : glowTex;
    foamMat.size = { splash: .8, bubble: .9, sparkle: .5, rainbow: .7, hearts: .7, petals: .55 }[wakeKind] || .55; foamMat.blending = wakeKind === "sparkle" ? T.AdditiveBlending : T.NormalBlending; foamMat.needsUpdate = true;
    for (let i = 0; i < foamN; i++) { const a = foamAge[i]; resetFoam(i); foamAge[i] = a; }
  }

  /* ----- loop: runs only while the stage is on the page and visible ----- */
  const clock = new T.Clock(); let running = false, fightOn = null;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ro = new ResizeObserver(() => { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); });
  ro.observe(stage);
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(stage);
  function frame() {
    if (!stage.isConnected || !visible || document.hidden) { running = false; return; }
    const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime, sail = t * (fightOn ? .35 : 2.2);
    const p = oceanGeo.attributes.position.array; for (let i = 0; i < p.length; i += 3) p[i + 1] = wave(oBase[i] + sail, oBase[i + 2], t);
    oceanGeo.attributes.position.needsUpdate = true;
    if (fightOn) { fightOn(dt, t, sail); renderer.render(scene, camera); requestAnimationFrame(frame); return; }
    const h0 = wave(sail, 0, t), hb = wave(3.5 + sail, 0, t), hs = wave(-3.5 + sail, 0, t), hl = wave(sail, 1.6, t), hr = wave(sail, -1.6, t);
    ship.position.y = h0 * .85 + .05; ship.rotation.z = (hb - hs) * .09; ship.rotation.x = (hr - hl) * .12;
    const f = flagGeo.attributes.position.array; for (let i = 0; i < f.length; i += 3) { const x = flagBase[i]; f[i + 2] = flagBase[i + 2] + Math.sin(x * 3.4 - t * 7) * .14 * (x / 1.6); }
    flagGeo.attributes.position.needsUpdate = true;
    bird.rotation.z = Math.sin(t * 3) * .08;
    for (const b of balloons) { b.g.position.y = b.y + Math.sin(t * 1.4 + b.ph) * .14; b.g.rotation.z = Math.sin(t * 1.1 + b.ph) * .12; }
    for (let i = 0; i < foamN; i++) { foamAge[i] += dt; const k = i * 3; foamPos[k] -= dt * 2.4; foamPos[k + 2] *= 1 + dt * .35;
      foamPos[k + 1] = wave(foamPos[k] + sail, foamPos[k + 2], t) + (wakeKind === "bubble" ? .08 + foamAge[i] * .25 : .08); if (foamAge[i] > 3) resetFoam(i); }
    foamGeo.attributes.position.needsUpdate = true;
    for (const r of rotors) r.rotation.y = t * 22;
    if (smokeObj.visible) { for (let i = 0; i < smokeN; i++) { smokeAge[i] += dt; if (smokeAge[i] < 0) continue; if (smokeAge[i] > 3 || smokePos[i * 3 + 1] < -50) { const a = Math.max(0, smokeAge[i] - 3); resetSmoke(i); smokeAge[i] = a; }
        // every puff keeps its own speed and drift, so the smoke spreads out into a cloud instead of a straight line
        const k = i * 3; smokePos[k] -= dt * (.9 + (i % 5) * .22) * shipK; smokePos[k + 1] += dt * (.7 + (i % 7) * .14) * shipK; smokePos[k + 2] += Math.sin(i * 1.7) * dt * .75 * shipK; } smokeGeo.attributes.position.needsUpdate = true; }
    if (tween) { const k = Math.min(1, (performance.now() - tween.t0) / 800), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      for (const key of ["th", "ph", "r"]) cam[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * e; if (k >= 1) tween = null; }
    else if (auto && !reduced) cam.th += dt * .18;
    // step back on tall, narrow screens so the whole ship still fits across
    focusK += ((focusOn && look3D.weapon ? 1 : 0) - focusK) * Math.min(1, dt * 4); // ease in on the mounted weapon while the weapon list is open
    const r = cam.r * shipK * Math.max(1, .95 / camera.aspect) * (1 - .62 * focusK), s = Math.sin(cam.ph), wx = mount.position.x, wy = mount.position.y + .6 * mount.scale.x + ship.position.y, wz = mount.position.z;
    target.set(wx * focusK, (shipSpec.lookY ?? 3.2) * (1 - focusK) + wy * focusK, wz * focusK);
    camera.position.set(target.x + r * s * Math.cos(cam.th), target.y + r * Math.cos(cam.ph), target.z + r * s * Math.sin(cam.th)); camera.lookAt(target);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  function start() { if (running || !stage.isConnected) return; running = true; clock.getDelta(); requestAnimationFrame(frame); }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) start(); });

  /* ----- one still picture of the dressed ship for the painted maps: same high angle as the map, see-through background, shadow and foam on the water ----- */
  const snapShadow = new T.Mesh(new T.PlaneGeometry(400, 400), new T.ShadowMaterial({ opacity: .38, depthWrite: false })); snapShadow.rotation.x = -Math.PI / 2; snapShadow.position.y = .01; snapShadow.receiveShadow = true; snapShadow.visible = false; scene.add(snapShadow);
  const snapFoam = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: .55, depthWrite: false, toneMapped: false })); snapFoam.rotation.x = -Math.PI / 2; snapFoam.position.y = .005; snapFoam.visible = false; scene.add(snapFoam);
  const waterline = [new T.Plane(new T.Vector3(0, 1, 0), 0)];
  function snapshot(look, sailHex, flagHex, shipId, size = 512, angle = {}) {
    setLook(look, sailHex, flagHex, shipId);
    return lookReady.then(() => {
      const hide = [skyMesh, orb, stars, ocean, foamPts, smokeObj], shown = hide.map(o => o.visible), oldTime = time, oldSize = renderer.getSize(new T.Vector2()), oldRatio = renderer.getPixelRatio(), oldFov = camera.fov, oldAspect = camera.aspect, oldFog = [scene.fog.near, scene.fog.far];
      hide.forEach(o => o.visible = false); time = "day"; applyTime();
      sun.position.set(-4, 26, 15); sun.color.set("#FFEBCF"); sun.intensity = 1.2; hemi.intensity = .55;
      scene.fog.near = 1e4; scene.fog.far = 1e5;
      ship.position.set(0, 0, 0); ship.rotation.set(0, 0, 0); ship.updateMatrixWorld(true);
      const box = new T.Box3(), part = new T.Box3();
      const visit = o => { if (!o.visible || o.isPoints) return; if (o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(part); } o.children.forEach(visit); };
      visit(ship); box.min.y = Math.max(0, box.min.y);
      // coloured funnel smoke, as a few still puffs
      const puffCols = !shipSpec.sailed && V.SMOKE[look.smoke], puffs = [];
      if (puffCols) { box.max.y += 2 * shipK; box.min.x -= 1.4 * shipK; for (const p of stacks) for (let i = 0; i < 12; i++) { const n = i % 6, sp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: puffCols[n % puffCols.length], transparent: true, opacity: 1 - n * .1, depthWrite: false, fog: false, toneMapped: false })); sp.position.set(p.x - n * .34 * shipK, p.y + n * .36 * shipK, p.z); sp.scale.setScalar((.7 + n * .22) * shipK); scene.add(sp); puffs.push(sp); } }
      // three-quarter view from ahead, so the sails face the viewer; then zoom until the ship just fills the picture
      const c = box.getCenter(new T.Vector3()), r0 = box.getSize(new T.Vector3()).length() / 2 * 1.08, fov = 14, th = angle.th ?? .68, ph = angle.ph ?? 1.0, dist = r0 / Math.tan(fov / 2 * Math.PI / 180);
      camera.fov = fov; camera.aspect = 1; camera.zoom = 1; camera.updateProjectionMatrix();
      camera.position.set(c.x + dist * Math.sin(ph) * Math.cos(th), c.y + dist * Math.cos(ph), c.z + dist * Math.sin(ph) * Math.sin(th)); camera.lookAt(c); camera.updateMatrixWorld(true);
      let far = 0; const pt = new T.Vector3();
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { pt.set(x, y, z).project(camera); far = Math.max(far, Math.abs(pt.x), Math.abs(pt.y)); }
      camera.zoom = .84 / far; camera.updateProjectionMatrix(); const r = r0 / camera.zoom;
      snapFoam.position.x = c.x; snapFoam.position.z = c.z; snapFoam.scale.set((box.max.x - box.min.x) * 1.16, Math.max(1.4, (box.max.z - box.min.z) * 2), 1);
      snapShadow.visible = snapFoam.visible = true; renderer.clippingPlanes = waterline;
      renderer.setPixelRatio(1); renderer.setSize(size, size, false);
      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL("image/webp", .9);
      puffs.forEach(sp => { scene.remove(sp); sp.material.dispose(); });
      snapShadow.visible = snapFoam.visible = false; renderer.clippingPlanes = [];
      hide.forEach((o, i) => o.visible = shown[i]); time = oldTime; applyTime();
      [scene.fog.near, scene.fog.far] = oldFog; camera.zoom = 1; camera.fov = oldFov; camera.aspect = oldAspect; camera.updateProjectionMatrix();
      renderer.setPixelRatio(oldRatio); renderer.setSize(oldSize.x, oldSize.y, false);
      return { url, r };
    });
  }

  /* ----- the battle: the child stands on their own deck behind their own gun and faces the other ship. The server has already decided every shot; this only plays them. ----- */
  const fxVert = "attribute float aSize; attribute vec4 aCol; varying vec4 vC; uniform float uScale; void main(){ vC = aCol; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }";
  const fxFrag = "uniform sampler2D uMap; varying vec4 vC; void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a * c.a); }";
  function fxPool(max, blending) {
    const g = new T.BufferGeometry(), pos = new Float32Array(max * 3), col = new Float32Array(max * 4), size = new Float32Array(max), items = [];
    g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("aCol", new T.BufferAttribute(col, 4)); g.setAttribute("aSize", new T.BufferAttribute(size, 1));
    const mat = new T.ShaderMaterial({ vertexShader: fxVert, fragmentShader: fxFrag, transparent: true, depthWrite: false, blending, uniforms: { uMap: { value: glowTex }, uScale: { value: 400 } } });
    const pts = new T.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
    return { pts, mat, add(x, y, z, vx, vy, vz, life, c, a, s0, s1, grav = 0, drag = 0) { if (items.length >= max) items.shift(); items.push({ x, y, z, vx, vy, vz, life, age: 0, c, a, s0, s1, grav, drag }); },
      step(dt) { let n = 0; for (let i = items.length - 1; i >= 0; i--) { const p = items[i]; p.age += dt; if (p.age >= p.life) items.splice(i, 1); }
        for (const p of items) { const k = p.age / p.life, d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy = p.vy * d - p.grav * dt; p.vz *= d; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          pos[n * 3] = p.x; pos[n * 3 + 1] = p.y; pos[n * 3 + 2] = p.z; col[n * 4] = p.c[0]; col[n * 4 + 1] = p.c[1]; col[n * 4 + 2] = p.c[2]; col[n * 4 + 3] = p.a * (1 - k) * Math.min(1, k * 12); size[n] = p.s0 + (p.s1 - p.s0) * k; n++; }
        g.setDrawRange(0, n); g.attributes.position.needsUpdate = g.attributes.aCol.needsUpdate = g.attributes.aSize.needsUpdate = true; },
      clear() { items.length = 0; g.setDrawRange(0, 0); }, remove() { scene.remove(pts); g.dispose(); mat.dispose(); } };
  }
  const R = (a = 1) => (Math.random() * 2 - 1) * a;
  const ORANGE = [1, .62, .18], YELLOW = [1, .88, .45], SMOKE_C = [.2, .19, .19], WATER = [.9, .97, 1], DEBRIS = [.13, .1, .08];
  // what each kind of weapon sends across: [seconds in the air, arc as a share of the distance, shots, size, colour, trail]
  const SHOT = { cannon: [.72, .1, 1, .3, 0x26282C, "smoke"], stone: [.95, .2, 1, .5, 0x8A8478, ""], bolt: [.55, .05, 1, .14, 0x7A4A28, ""], gun: [.34, .01, 5, .1, 0xFFD45C, "glow"], turret: [.6, .08, 1, .24, 0xE8C25A, "glow"], torpedo: [1.15, 0, 1, .3, 0x2B2F36, "wake"], missile: [.95, .26, 1, .26, 0xEDEDE6, "flame"] };

  function fight(host, meP, oppP) {
    const take = (p, gunSailed, gunSteel) => { setLook(p.look, p.sailHex, p.flagHex, p.ship); return lookReady.then(() => {
      // a clone keeps this ship's own paint, so the next setLook can dress the other ship
      const models = mount.userData.models; mount.userData = {}; mount.name = "wm"; rotors.forEach(r => r.name = "rotor");
      const wasOn = ship.visible; ship.visible = true; const c = ship.clone(true); ship.visible = wasOn; mount.userData.models = models;
      const mats = new Map(), lights = [], cRotors = [];
      c.traverse(o => { if (o.isLight) lights.push(o); if (o.name === "rotor") cRotors.push(o); if (o.material && !o.isPoints) { if (!mats.has(o.material)) mats.set(o.material, o.material.clone()); o.material = mats.get(o.material); } });
      lights.forEach(l => l.parent.remove(l));
      c.traverse(o => { if (o.isPoints) o.visible = false; });
      const wm = c.getObjectByName("wm");
      if (!wm.children.some(o => o.visible)) wm.add(weaponModel(T, M, shipSpec.sailed ? gunSailed : gunSteel));
      c.userData = { spec: shipSpec, wm, mats: [...mats.values()], rotors: cRotors, sink: 0, tilt: Math.random() < .5 ? 1 : -1, fires: [], yaw: 0, x: 0, kick: 0 };
      return c; }); };
    return take(meP, "pdr32", "gun127").then(a => take(oppP, "pdr32", "gun127").then(b => {
      const homeShip = ship, homeId = Object.keys(built).find(k => built[k].ship === ship) || "dinghy", hidden = [skyBtn, viewsEl], oldFov = camera.fov;
      homeShip.visible = false; foamPts.visible = false; smokeObj.visible = false; hidden.forEach(e => e.style.display = "none"); cv.style.cursor = "default";
      const oldTime = time; time = "sunset"; applyTime();
      // a finer, bluer sea just for the battle; the fog hides its nearer edge
      const oldSea = [oceanMat.color.getHex(), oceanMat.roughness, scene.fog.near, scene.fog.far]; oceanMat.color.set("#16689A"); oceanMat.roughness = .42; ocean.scale.set(.5, 1, .5); scene.fog.near = 34; scene.fog.far = 104;
      const La = a.userData.spec.L, Lb = b.userData.spec.L, gap = 9 + Lb * .72 + La * .3;
      // the other ship comes at us bow first and a little turned, so its side and its gun both show
      b.userData.x = La / 2 + gap; b.userData.yaw = Math.PI - .62; b.position.set(b.userData.x, 0, 0); b.rotation.y = b.userData.yaw; b.userData.wm.rotation.y = .62;
      const root = new T.Group(); root.add(a, b); scene.add(root);
      a.updateMatrixWorld(true); b.updateMatrixWorld(true);
      Object.assign(sun.shadow.camera, { left: -(gap + La), right: gap + La, top: gap + La, bottom: -(gap + La), far: 240 }); sun.shadow.camera.updateProjectionMatrix();
      sun.target.position.set(b.userData.x / 2, 0, 0); sun.position.add(sun.target.position); sun.target.updateMatrixWorld();
      camera.fov = 52; camera.updateProjectionMatrix();
      const glow = fxPool(420, T.AdditiveBlending), soft = fxPool(520, T.NormalBlending);
      const flash = new T.PointLight(0xFFB070, 0, 60, 1.6); scene.add(flash); let flashV = 0;
      const shots = [], shotGeo = new T.SphereGeometry(1, 10, 8); let shake = 0, redrawn = 0;

      // the deck spot behind the gun; anything tall in front of it (masts, sails, rigging) is hidden from this view only
      const wm0 = a.userData.wm, s = wm0.scale.x, spec = a.userData.spec;
      const eyeX = wm0.position.x - (1.9 * s + 1.8), eyeY = wm0.position.y + 1.4 * s + 1.05, eyeZ = wm0.position.z * .55, shoulder = 1.05 * s + .35; // over the gun's shoulder, so even a big missile never hides the other ship
      const fpHide = []; { const bb = new T.Box3(); a.traverse(o => { if (!o.isMesh || !o.visible) return; let w = o; while (w && w !== wm0) w = w.parent; if (w === wm0) return; o.geometry.boundingBox || o.geometry.computeBoundingBox(); bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); if (bb.max.y > eyeY - .1 && bb.max.x > eyeX - .2 && bb.min.y > .3 && bb.max.x - bb.min.x < spec.L * .6) fpHide.push(o); }); }

      const v1 = new T.Vector3(), v2 = new T.Vector3(), v3 = new T.Vector3(), poseA = { p: new T.Vector3(), l: new T.Vector3() }, poseB = { p: new T.Vector3(), l: new T.Vector3() };
      let view = "intro", blend = 1, blendFrom = "intro", clock0 = 0, won = null;
      const pose = (name, o, t) => { const bx = b.position.x, far = Math.max(1, .82 / camera.aspect); // phones stand tall: step back so the whole ship fits across
        if (name === "fp") { a.localToWorld(o.p.set(eyeX, eyeY, eyeZ + shoulder * Math.min(1, Math.max(.3, camera.aspect - .15)))); o.l.set(bx, 1.3 + Lb * .1, Math.sin(t * .4) * .25); }
        else if (name === "intro") { const d = t * .5; o.p.set((-La * .55 + d) * far, (La * .34 + 4) * far, (La * .92 + 7) * far); o.l.set(0, 2 + La * .07, 0); }
        else if (won) { o.p.set((-La * .75 - 4) * far, (La * .4 + 5) * far, (La * 1.15 + 11) * far); o.l.set(La * .28, 1.6 + La * .05, 0); }
        else { o.p.set(bx * .5, (5 + La * .28) * far, (La * .95 + 12) * far); o.l.set(0, .6 + La * .05, 0); } };
      const goView = name => { blendFrom = view; view = name; blend = 0; };

      const muzzle = c => { const u = c.userData; u.wm.updateWorldMatrix(true, false); return u.wm.localToWorld(new T.Vector3(1.9, .75, 0)); };
      // shots at me land on the bow right in front of the camera; shots at them land on the side facing me
      const hullSpot = c => { const sp = c.userData.spec; return c === a ? c.localToWorld(new T.Vector3(eyeX + Math.max(1.6, s * 2.4) + Math.random() * sp.L * .06, sp.H0 + .15, R(sp.W * .55))) : c.localToWorld(new T.Vector3(R(sp.L * .3), sp.H0 * .75 + Math.random() * .7, -sp.W * .8)); };
      const missSpot = c => { const sp = c.userData.spec, side = Math.random() < .5 ? 1 : -1; if (c === a) return new T.Vector3(eyeX + 7 + Math.random() * 8, .1, side * (sp.W + 2 + Math.random() * 4)); return new T.Vector3(c.position.x + R(sp.L * .5), .1, side * (sp.L * .36 + 3 + Math.random() * 4)); };
      function burst(p, k = 1) { for (let i = 0; i < 30; i++) glow.add(p.x, p.y, p.z, R(5 * k), Math.random() * 6 * k, R(5 * k), .25 + Math.random() * .35, Math.random() < .5 ? ORANGE : YELLOW, 1, 1.7 * k, .4 * k);
        const close = view === "fp" && p.x < gap * .5, sm = close ? .4 : 1; // a blast on my own bow must not swallow the screen
        for (let i = 0; i < 16; i++) soft.add(p.x, p.y, p.z, R(1.8 * k) + (close ? 1.5 : 0), 1 + Math.random() * 2.4 * k, R(1.8 * k), (close ? .6 : 1) + Math.random() * 1.2 * sm, SMOKE_C, close ? .55 : .78, 1.5 * k * sm, 4.5 * k * sm, -.3, .6);
        for (let i = 0; i < 12; i++) soft.add(p.x, p.y, p.z, R(6 * k), 3 + Math.random() * 7 * k, R(6 * k), .8 + Math.random() * .5, DEBRIS, 1, .3 * k, .22 * k, 13);
        flash.position.copy(p).setY(p.y + 2.5); flashV = Math.max(flashV, 4 * k); }
      function splash(p, k = 1) { for (let i = 0; i < 34; i++) soft.add(p.x + R(.5 * k), .1, p.z + R(.5 * k), R(1.7 * k), 3 + Math.random() * 7.5 * k, R(1.7 * k), .85 + Math.random() * .55, WATER, .92, .9 * k, .5 * k, 12);
        for (let i = 0; i < 12; i++) { const n = i / 12 * 6.28; soft.add(p.x, .12, p.z, Math.cos(n) * 3 * k, .1, Math.sin(n) * 3 * k, .8, WATER, .55, .8 * k, 2.1 * k, 0, 1.5); } }
      function muzzleFx(c, p, big) { const out = c === a ? 1 : -1, k = big ? 1.1 : .6; c.userData.kick = 1;
        for (let i = 0; i < 12; i++) glow.add(p.x, p.y, p.z, out * Math.random() * 11 * k + R(1.5), R(1.5), R(1.8), .12 + Math.random() * .12, Math.random() < .5 ? ORANGE : YELLOW, 1, 1.25 * k, .3);
        for (let i = 0; i < 7; i++) soft.add(p.x, p.y, p.z, out * Math.random() * 3 + R(.5), .5 + Math.random(), R(.7), .9 + Math.random() * .5, [.72, .72, .72], .55, .7 * k, 2.8 * k, -.2, .9);
        flash.position.copy(p).setY(p.y + 1.5); flashV = Math.max(flashV, 2.2 * k); }
      function launch(c, kind, hit, big, onDone) { const sh = SHOT[kind] || SHOT.cannon, from = muzzle(c), target = c === a ? b : a, to = hit ? hullSpot(target) : missSpot(target), size = sh[3] * Math.max(.8, c.userData.wm.scale.x);
        muzzleFx(c, from, big);
        if (kind === "torpedo") { from.y = .15; if (hit) to.y = .4; }
        const mesh = new T.Mesh(shotGeo, new T.MeshBasicMaterial({ color: sh[4] })); mesh.scale.setScalar(size); if (kind === "bolt" || kind === "missile" || kind === "torpedo" || kind === "gun") mesh.scale.x = size * (kind === "gun" ? 7 : 4);
        mesh.position.copy(from); root.add(mesh);
        shots.push({ mesh, from, to, age: 0, dur: sh[0], arc: from.distanceTo(to) * sh[1], trail: sh[5], hit, big, target, onDone, size }); }
      function land(o) { const p = o.to;
        if (o.hit) { if (o.big) { burst(p, 1 + Math.min(.6, o.target.userData.spec.L / 40)); shake = Math.max(shake, o.target === a ? 1.1 : .3); if (o.target.userData.fires.length < 3) o.target.userData.fires.push(o.target.worldToLocal(p.clone())); if (o.target === a) ctrl.onHurt?.(); } else burst(p, .4); }
        else splash(p, o.big ? 1.15 : .5); o.onDone?.(); }

      let doneRes = null, ending = 0;
      const step = (dt, t, sail) => { clock0 += dt;
        const wantFov = camera.aspect < .75 ? 68 : 52; if (camera.fov !== wantFov) { camera.fov = wantFov; camera.updateProjectionMatrix(); } // phones: a wider view so the gun stays in the picture
        for (const c of [a, b]) { const u = c.userData, x = c.position.x, h0 = wave(x + sail, 0, t), hb = wave(x + 3.5 + sail, 0, t), hs = wave(x - 3.5 + sail, 0, t), hl = wave(x + sail, 1.6, t), hr = wave(x + sail, -1.6, t);
          if (u.sink > 0) u.sink = Math.min(c === a ? .6 : 1, u.sink + dt / 4.2); // my own ship settles and lists but stays in the picture
          const dip = u.sink * u.sink * (u.spec.L * .5 + u.spec.H0 * 3 + 6), k = c === a ? .55 : 1;
          c.position.y = h0 * .7 * k + .05 - dip; c.rotation.z = (hb - hs) * .06 * k + u.tilt * u.sink * .34; c.rotation.x = (hr - hl) * .09 * k + u.tilt * u.sink * .24; c.rotation.y = u.yaw;
          u.kick = Math.max(0, u.kick - dt * 5); u.wm.children.forEach(o => o.position.x = -u.kick * .32);
          for (const r of u.rotors) r.rotation.y = t * 22;
          for (const f of u.fires) { if (Math.random() < dt * 22 && u.sink < 1) { v1.copy(f); c.localToWorld(v1); if (v1.y > .1) { const near = c === a && view === "fp", z = near ? .3 : 1; // my own fires blow away from the camera and stay small, so they never block the view
              soft.add(v1.x, v1.y + .3, v1.z, near ? 1.5 : -.6 + R(.4), (near ? .9 : 1.7) + Math.random(), R(.4), (near ? .8 : 1.5) + Math.random() * z, SMOKE_C, near ? .36 : .52, 1.05 * z, 4.3 * z, -.15, .2); if (Math.random() < .55) glow.add(v1.x, v1.y + .1, v1.z, R(.4), 1 + Math.random() * 1.3, R(.4), .35 + Math.random() * .3, Math.random() < .5 ? ORANGE : YELLOW, .9, near ? .5 : 1, .25); } } }
          if (u.sink > 0 && u.sink < 1 && Math.random() < dt * 30) soft.add(x + R(u.spec.L * .45), .15, R(u.spec.W + 1), R(.6), 1 + Math.random() * 2, R(.6), .8, WATER, .75, .6, 1.5, 3); }
        for (let i = shots.length - 1; i >= 0; i--) { const o = shots[i]; o.age += dt; const k = Math.min(1, o.age / o.dur);
          v1.lerpVectors(o.from, o.to, k); v1.y += Math.sin(k * Math.PI) * o.arc; v2.copy(v1).sub(o.mesh.position); o.mesh.position.copy(v1); if (v2.lengthSq() > 1e-5) o.mesh.rotation.set(0, Math.atan2(-v2.z, v2.x), Math.atan2(v2.y, Math.hypot(v2.x, v2.z)));
          if (o.trail === "smoke" && Math.random() < dt * 40) soft.add(v1.x, v1.y, v1.z, 0, .2, 0, .55, [.8, .8, .8], .4, .4, 1.1);
          else if (o.trail === "glow") glow.add(v1.x, v1.y, v1.z, 0, 0, 0, .14, YELLOW, .9, o.size * 5, .1);
          else if (o.trail === "flame") { glow.add(v1.x, v1.y, v1.z, 0, 0, 0, .2, ORANGE, 1, 1, .2); if (Math.random() < dt * 60) soft.add(v1.x, v1.y, v1.z, R(.2), .2, R(.2), 1.1, [.85, .85, .85], .55, .5, 1.9); }
          else if (o.trail === "wake" && Math.random() < dt * 70) soft.add(v1.x + R(.15), .2, v1.z + R(.15), R(.3), .5, R(.3), .85, WATER, .85, .45, 1.1);
          if (k >= 1) { root.remove(o.mesh); o.mesh.material.dispose(); shots.splice(i, 1); land(o); } }
        // a little white water at both bows
        if (Math.random() < dt * 9) { v1.set(a.userData.spec.L * .47, .15, R(.3)); a.localToWorld(v1); soft.add(v1.x, .2, v1.z + R(.5), R(.5), .9, R(.8), .8, WATER, .55, .4, 1.3, 2.4); }
        if (Math.random() < dt * 9 && b.userData.sink === 0) { v1.set(Lb * .47, .15, R(.3)); b.localToWorld(v1); soft.add(v1.x, .2, v1.z + R(.5), R(.5), .9, R(.8), .8, WATER, .55, .5, 1.5, 2.4); }
        glow.step(dt); soft.step(dt); flashV = Math.max(0, flashV - dt * 16); flash.intensity = flashV;
        blend = Math.min(1, blend + dt / (view === "fp" ? 1.25 : 1.5)); const e = blend < .5 ? 2 * blend * blend : 1 - Math.pow(-2 * blend + 2, 2) / 2;
        pose(blendFrom, poseA, clock0); pose(view, poseB, clock0); v1.lerpVectors(poseA.p, poseB.p, e); v2.lerpVectors(poseA.l, poseB.l, e);
        const inside = view === "fp" && blend > .86; fpHide.forEach(o => o.visible = !inside);
        shake = Math.max(0, shake - dt * 2.2); const amp = reduced ? 0 : shake * shake * .4; camera.position.set(v1.x + R(amp), v1.y + R(amp), v1.z + R(amp)); camera.up.set(R(amp * .08), 1, R(amp * .08)); camera.lookAt(v2);
        scene.fog.near = Math.max(34, camera.position.length() * 1.25); scene.fog.far = scene.fog.near + 70; // the far views are further out: keep the ship clear and only hide the sea's edge
        glow.mat.uniforms.uScale.value = soft.mat.uniforms.uScale.value = renderer.domElement.height / 2 / Math.tan(camera.fov * Math.PI / 360) * .55; };

      const wait = ms => new Promise(r => setTimeout(r, ms));
      const ctrl = { onHurt: null,
        // walk out onto the deck
        intro: () => wait(1500).then(() => { goView("fp"); return wait(1250); }),
        fire(by, dmg, kind) { const c = by === "a" ? a : b, sh = SHOT[kind] ? kind : "cannon", n = SHOT[sh][2];
          return new Promise(res => { launch(c, sh, dmg > 0, n === 1, n === 1 ? res : null);
            for (let i = 1; i < n; i++) { const last = i === n - 1; setTimeout(() => { if (fightOn) launch(c, sh, dmg > 0, last, last ? res : null); else res(); }, i * 75); } }); },
        finish(didWin, fast) { won = didWin; const loser = didWin ? b : a; loser.userData.sink = .001; for (let i = 0; i < 3; i++) setTimeout(() => { if (!fightOn) return; const sp = loser.userData.spec; v3.set(R(sp.L * .35), sp.H0, R(sp.W * .5)); loser.localToWorld(v3); burst(v3.clone(), 1.2); }, fast ? 0 : i * 420); shake = didWin ? .4 : 1.2; goView("end"); return wait(fast ? 300 : 1500); },
        close() { fightOn = null; shots.forEach(o => { root.remove(o.mesh); o.mesh.material.dispose(); }); scene.remove(root, flash); a.userData.mats.concat(b.userData.mats).forEach(m => m.dispose()); shotGeo.dispose(); glow.remove(); soft.remove();
          homeShip.visible = true; foamPts.visible = true; hidden.forEach(e => e.style.display = ""); cv.style.cursor = ""; camera.fov = oldFov; camera.up.set(0, 1, 0); camera.updateProjectionMatrix(); sun.target.position.set(0, 0, 0); sun.target.updateMatrixWorld(); ocean.scale.set(1, 1, 1); oceanMat.roughness = oldSea[1]; [scene.fog.near, scene.fog.far] = [oldSea[2], oldSea[3]]; time = oldTime; applyTime(); useShip(homeId); lookKey = ""; if (stage.parentNode) stage.parentNode.removeChild(stage); } };
      fightOn = step;
      if (stage.parentNode !== host) host.appendChild(stage); start();
      return ctrl;
    }));
  }
  return {
    el: stage, setLook, snapshot, fight, focusWeapon(on) { focusOn = !!on; },
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
  },
  // a second, never-shown viewer for the small pictures in the shop lists, so taking them can't disturb the big live 3D ship
  thumbs() {
    if (thumbViewer) return Promise.resolve(thumbViewer);
    if (!webglOK()) return Promise.reject(new Error("이 기기에서는 3D를 볼 수 없어요"));
    return loadThree().then(() => thumbViewer || (thumbViewer = build()));
  }
};
})();
