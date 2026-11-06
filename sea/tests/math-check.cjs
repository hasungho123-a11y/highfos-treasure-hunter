// checks the question generator by working every answer out independently of how it was generated
const fs = require("fs"), vm = require("vm");
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(require("path").join(__dirname, "../public/math.js"), "utf8"), ctx); const Q = ctx.window.MathQ;
const val = s => { const e = String(s).replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/(\d+(\.\d+)?)%/g, "($1/100)"); return Function(`return (${e})`)(); };
const eq = (a, b) => Math.abs(a - b) < 1e-9; let bad = 0; const fail = (m, x) => { if (bad++ < 12) console.log("실패:", m, JSON.stringify(x)); };
const N = 20000;
for (let i = 0; i < N; i++) { const p = Q.pairs(); if (p.length !== 6) fail("짝 수", p);
  const vals = p.map(c => val(c.a));
  p.forEach(c => { if (!eq(val(c.a), val(c.b))) fail("짝 값 다름", c); if (c.a === c.b) fail("두 면 같음", c); });
  vals.forEach((v, a) => vals.forEach((w, b) => { if (a < b && eq(v, w)) fail("다른 짝이 같은 값", p); }));
  const texts = p.flatMap(c => [c.a, c.b]); if (new Set(texts).size !== 12) fail("같은 글자 카드", texts); }
const asks = {};
for (let i = 0; i < N; i++) { const wave = 1 + i % 10, n = 2 + Math.min(2, Math.floor(wave / 4)), q = Q.order(wave, n); asks[q.ask.replace(/[\d/]+/g, "#")] = (asks[q.ask.replace(/[\d/]+/g, "#")] || 0) + 1;
  if (!q.tag) fail("유형 이름 없음", q); if (q.opts.length !== n || new Set(q.opts).size !== n || !q.opts.includes(q.real)) fail("표적 구성", q);
  const fits = l => { const v = val(l), a = q.ask; let m;
    if ((m = a.match(/^값이 (-?\d+)인/))) return eq(v, +m[1]);
    if ((m = a.match(/^(\d+)의 배수/))) return v % +m[1] === 0;
    if ((m = a.match(/^(\d+)의 약수/))) return +m[1] % v === 0;
    if ((m = a.match(/^(\d+)[와과] (\d+)의 공약수/))) return +m[1] % v === 0 && +m[2] % v === 0;
    if (a.startsWith("1/2보다")) return v > .5;
    if (a.startsWith("가장 큰")) return q.opts.every(o => val(o) <= v) ;
    if ((m = a.match(/^(\d+)\/(\d+)[와과] 크기/))) return eq(v, m[1] / m[2]);
    fail("모르는 문제", q); return false; };
  const right = q.opts.filter(fits); if (right.length !== 1 || right[0] !== q.real) fail("정답 개수", { q, right });
  q.opts.forEach(o => { if (val(o) < 0) fail("음수 값", q); }); }
for (let i = 0; i < N; i++) { const level = i % 3, q = Q.cipher(level), syms = [...new Set(q.clues.flat().filter(t => /^[abc]$/.test(t)))], sols = new Set();
  if (!(q.answer >= 1 && q.answer <= 9)) fail("답 범위", q);
  q.clues.forEach(c => { if (c.includes(null) || c[c.length - 1] < 0) fail("식 오류", q); });
  const walk = (k, env) => { if (k === syms.length) { const ok = q.clues.every(c => { const e = c.map(t => /^[abc]$/.test(t) ? env[t] : t === "×" ? "*" : t === "−" ? "-" : t === "=" ? "===" : t).join(" "); return Function(`return ${e}`)(); }); if (ok) sols.add(env[q.ask]); return; } for (let v = 1; v <= 9; v++) walk(k + 1, { ...env, [syms[k]]: v }); };
  walk(0, {}); if (sols.size !== 1 || !sols.has(q.answer)) fail("답이 하나가 아님", { q, sols: [...sols] }); }
const gridVal = s => { let m; if ((m = s.match(/^(\d+)의 (\d+)\/(\d+)$/))) return m[1] * m[2] / m[3]; if ((m = s.match(/^(\d+)의 (\d+)%$/))) return m[1] * m[2] / 100; if ((m = s.match(/^(\d+):(\d+) = (\d+):□$/))) return m[3] * m[2] / m[1]; return val(s); };
for (let i = 0; i < N; i++) { const wave = 1 + i % 10, q = Q.grid(wave);
  for (const [v, t] of [[q.x, q.xText], [q.y, q.yText]]) { if (!Number.isInteger(v) || v < 1 || v > 6) fail("칸 범위", q); if (!eq(gridVal(t), v)) fail("칸 계산 다름", q); if (/undefined|NaN/.test(t)) fail("글자 오류", q); }
  if (wave < 7 && q.wind) fail("이른 바람", q); if (q.x - q.wind < 1 || q.x - q.wind > 6) fail("조준 칸이 바다 밖", q); }
if (!Q.order(5, 3, "통로").ask.endsWith("통로")) fail("통로 문구", {});
// series: every rule a child could reasonably see in the numbers must lead to the same next number, and no wrong lamp may fit any of them
const numOf = l => { const f = l.match(/^(\d+)\/(\d+)$/); return f ? f[1] / f[2] : +l; };
const diffs = a => a.slice(1).map((x, i) => x - a[i]), same = a => a.every(x => eq(x, a[0]));
const guesses = t => { const out = [], n = t.length, d = diffs(t);
  if (same(d)) out.push(t[n - 1] + d[0]);
  if (same(diffs(d))) out.push(t[n - 1] + d[n - 2] + diffs(d)[0]);
  if (t.every(x => x > 0) && same(t.slice(1).map((x, i) => x / t[i]))) out.push(t[n - 1] * t[1] / t[0]);
  if (d.every((x, i) => i < 2 || eq(x, d[i - 2]))) out.push(t[n - 1] + d[n - 3]);
  if (t.every((x, i) => i < 2 || eq(x, t[i - 1] + t[i - 2]))) out.push(t[n - 1] + t[n - 2]);
  if (!eq(t[1], t[0])) { const a = (t[2] - t[1]) / (t[1] - t[0]), b = t[1] - a * t[0]; if (t.every((x, i) => !i || eq(x, a * t[i - 1] + b))) out.push(a * t[n - 1] + b); }
  return out; };
const partGuesses = t => { const fr = t.map(l => l.match(/^(\d+)\/(\d+)$/)); if (!fr.every(Boolean)) return []; const part = i => guesses(fr.map(f => +f[i])), tops = part(1), bots = part(2); return tops.flatMap(a => bots.map(b => a / b)); };
const rules = {};
for (let i = 0; i < N; i++) { const round = i % 8, q = Q.series(round), tape = [...q.shown]; rules[q.rule.replace(/[\d.]+/g, "#")] = 1;
  if (tape.length !== 5 || q.asks.length !== 3) fail("수열 길이", q);
  for (const a of q.asks) { const all = [...guesses(tape.map(numOf)), ...partGuesses(tape)], real = numOf(a.real);
    if (!all.length) fail("규칙을 못 찾음", q);
    if (!all.every(g => eq(g, real))) fail("규칙이 둘로 읽힘", { q, tape, all });
    if (a.opts.length !== 4 || !a.opts.includes(a.real)) fail("등 구성", a);
    const vals = a.opts.map(numOf); if (new Set(vals.map(v => v.toFixed(6))).size !== 4) fail("값이 같은 등", a);
    vals.forEach(v => { if (!(v > 0)) fail("0 이하 등", a); });
    if (/undefined|NaN/.test(a.opts.join())) fail("글자 오류", a);
    tape.push(a.real); } }
for (let i = 0; i < N; i++) { const wave = 1 + i % 10, q = Q.speed(wave); let m, v, T;
  if ((m = q.shipText.match(/^적함: 1분에 (\d+)m/))) v = m[1] / 60; else if ((m = q.shipText.match(/^적함: (\d+)초에 (\d+)m/))) v = m[2] / m[1]; else fail("적함 문구", q);
  if ((m = q.torpText.match(/^어뢰: (\d+)초 뒤/))) T = +m[1]; else if ((m = q.torpText.match(/^어뢰: 1초에 (\d+)m, 만나는 곳까지 (\d+)m/))) T = m[2] / m[1]; else fail("어뢰 문구", q);
  if (!eq(v * T, q.k * q.S) || q.k < 1 || q.k > 6 || q.D !== q.k * q.S) fail("쏠 거리 다름", { q, v, T });
  if (!Number.isInteger(v) || !Number.isInteger(T)) fail("정수가 아닌 값", { q, v, T });
  if (wave <= 3 && !q.shipText.startsWith("적함: 1초에")) fail("첫 단계가 어려움", q);
  if (wave <= 6 && q.torpText.includes("만나는 곳")) fail("어뢰 계산이 이름", q);
  if (wave > 6 && !q.torpText.includes("만나는 곳")) fail("어뢰 계산 없음", q); }
// the port's scales: read the weight back from the words on screen, then check the rack can really reach it
const grams = s => { let m; s = s.trim(); if ((m = s.match(/^(\d+)\/(\d+)kg$/))) return m[1] * 1000 / m[2]; if ((m = s.match(/^([\d.]+)kg$/))) return Math.round(m[1] * 1000); if ((m = s.match(/^(\d+)g$/))) return +m[1]; return NaN; };
const sum = a => a.reduce((x, y) => x + y, 0);
const loadWeight = t => { let m;
  if ((m = t.match(/^같은 .+ (\d+)개가 (\S+)일 때 1개 무게$/))) return grams(m[2]) / m[1];
  if ((m = t.match(/^1개에 (\d+)g인 .+ (\d+)개의 무게$/))) return m[1] * m[2];
  if ((m = t.match(/ (\d+)개의 평균이 (\S+)이고, (\d+)개가 (.+)일 때 나머지 1개$/))) { const gs = m[4].split(", ").map(grams); if (gs.length !== m[3] - 0 || m[3] - 0 !== m[1] - 1) return NaN; return m[1] * grams(m[2]) - sum(gs); }
  if ((m = t.match(/ (\d+)개가 (.+)일 때 평균 무게$/))) { const gs = m[2].split(", ").map(grams); return gs.length === +m[1] ? sum(gs) / m[1] : NaN; }
  if ((m = t.match(/ (\S+)과 (\S+)을 합한 무게$/))) return grams(m[1]) + grams(m[2]);
  if ((m = t.match(/ (\S+)을 (\d+):(\d+)(으?로) 나눌 때 더 (많은|적은) 쪽$/))) { if (m[4] !== ("36".includes(m[3].slice(-1)) ? "으로" : "로")) return NaN; return grams(m[1]) * (m[5] === "많은" ? Math.max(+m[2], +m[3]) : Math.min(+m[2], +m[3])) / (+m[2] + +m[3]); }
  if ((m = t.match(/ (\S+)의 (\d+)%$/))) return grams(m[1]) * m[2] / 100;
  if ((m = t.match(/ (\S+)의 (\d+)\/(\d+)$/))) return grams(m[1]) * m[2] / m[3];
  if ((m = t.match(/ (\S+)의 ([\d.]+)배$/))) return Math.round(grams(m[1]) * m[2]);
  if ((m = t.match(/무게의 (\d+)\/(\d+)가 (\S+)일 때 전체 무게$/))) return grams(m[3]) * m[2] / m[1];
  if ((m = t.match(/무게의 (\d+)%가 (\S+)일 때 전체 무게$/))) return grams(m[2]) * 100 / m[1];
  if ((m = t.match(/ (\d+)kg (\d+)g$/))) return m[1] * 1000 + +m[2];
  if ((m = t.match(/ ([\d.]+)kg$/))) return grams(m[1] + "kg");
  return NaN; };
const scaleTags = {};
for (let i = 0; i < N * 3; i++) { const map = i % 3, round = i % 10, q = Q.weigh(map, round), T = loadWeight(q.load); scaleTags[`${map}:${q.tag}`] = (scaleTags[`${map}:${q.tag}`] || 0) + 1;
  if (!eq(T, q.T) || !Number.isInteger(q.T)) fail("저울 무게 다름", { q, T });
  if (q.T < 150 || q.T > 6000) fail("저울 무게 범위", q);
  if (q.opts.length !== 6 || new Set(q.opts.map(o => o.g)).size !== 6) fail("추 구성", q);
  q.opts.forEach(o => { if (!eq(grams(o.label), o.g)) fail("추 글자와 무게 다름", o); if (o.g === q.T) fail("한 개로 끝나는 추", q); });
  if (!eq(sum(q.parts.map(grams)), q.T) || q.parts.length < 2 || !q.parts.every(p => q.opts.some(o => o.label === p))) fail("보여 줄 정답 오류", q);
  let ways = 0; for (let b = 1; b < 64; b++) if (sum(q.opts.filter((_, k) => b >> k & 1).map(o => o.g)) === q.T) ways++; if (!ways) fail("맞출 방법 없음", q);
  if (/undefined|NaN/.test(q.load + q.why + q.parts.join())) fail("글자 오류", q);
  if (map === 0 && q.opts.some(o => o.label.includes("/"))) fail("포구 마을에 분수 추", q); }
console.log("저울 유형", JSON.stringify(scaleTags));
/* ---------- 중등반: every answer worked out again from the words and signs on screen ---------- */
Q.setLevel(1);
const mval = (s, x) => { let e = String(s).replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/").replace(/\|([^|]+)\|/g, "Math.abs($1)").replace(/²/g, "**2").replace(/³/g, "**3").replace(/⁴/g, "**4").replace(/⁵/g, "**5").replace(/⁶/g, "**6");
  e = e.replace(/(^|[^\d)])-(\d+)\*\*(\d)/g, "$1-($2**$3)").replace(/(\d)x/g, "$1*x").replace(/(\d)\(/g, "$1*(").replace(/\)x/g, ")*x"); return Function("x", `return (${e})`)(x); };
const midOrder = {}; const G = (a, b) => b ? G(b, a % b) : a;
for (let i = 0; i < N; i++) { const wave = 1 + i % 10, n = 2 + i % 3, q = Q.order(wave, n); midOrder[q.tag] = (midOrder[q.tag] || 0) + 1;
  if (q.opts.length !== n || new Set(q.opts).size !== n || !q.opts.includes(q.real)) fail("중등 표적 구성", q);
  const a = q.ask, fits = l => { const v = mval(l, 0); let m;
    if ((m = a.match(/^값이 (−?\d+)인/))) return eq(v, mval(m[1]));
    if ((m = a.match(/^x=(−?\d+)일 때 값이 (−?\d+)인/))) return eq(mval(l, mval(m[1])), mval(m[2]));
    if ((m = a.match(/^([\d×²³⁴⁵⁶]+)인/))) return eq(v, mval(m[1]));
    if (a === "소수인 표적") { if (v < 2) return false; for (let d = 2; d * d <= v; d++) if (v % d === 0) return false; return true; }
    if ((m = a.match(/^(\d+)[와과] (\d+)의 최대공약수/))) return v === G(+m[1], +m[2]);
    if ((m = a.match(/^(\d+)[와과] (\d+)의 최소공배수/))) return v === m[1] * m[2] / G(+m[1], +m[2]);
    if (a.startsWith("가장 작은")) return q.opts.every(o => mval(o) >= v);
    if (a.startsWith("절댓값이")) return q.opts.every(o => Math.abs(mval(o)) <= Math.abs(v));
    fail("중등 모르는 문제", q); return false; };
  const right = q.opts.filter(fits); if (right.length !== 1 || right[0] !== q.real) fail("중등 정답 개수", { q, right }); }
for (let i = 0; i < N; i++) { const p = Q.pairs(); if (p.length !== 6) fail("중등 짝 수", p); const X = 1.73219, vs = p.map(c => mval(c.a, X)); // an awkward x, so two different expressions can't land on the same value by chance
  p.forEach(c => { if (!eq(mval(c.a, X), mval(c.b, X)) || !eq(mval(c.a, -3.1), mval(c.b, -3.1))) fail("중등 짝 값 다름", c); });
  vs.forEach((v, a) => vs.forEach((w, b) => { if (a < b && eq(v, w)) fail("중등 다른 짝이 같은 값", p); }));
  if (new Set(p.flatMap(c => [c.a, c.b])).size !== 12) fail("중등 같은 글자 카드", p); }
const midGridVal = s => { const m = s.match(/^(.+) = (.+)의 해$/); if (!m) return mval(s); const b = mval(m[1], 0), a = mval(m[1], 1) - b; return (mval(m[2]) - b) / a; };
for (let i = 0; i < N; i++) { const wave = 1 + i % 10, q = Q.grid(wave);
  for (const [v, t] of [[q.x - 4, q.xText], [q.y - 4, q.yText]]) { if (v < -3 || v > 3) fail("중등 칸 범위", q); if (!eq(midGridVal(t), v)) fail("중등 칸 계산", { q, v, t }); }
  if (wave < 7 && q.wind) fail("중등 이른 바람", q); if (q.x - q.wind < 1 || q.x - q.wind > 7) fail("중등 조준 칸", q); }
for (let i = 0; i < N; i++) { const level = i % 3, q = Q.cipher(level), syms = [...new Set(q.clues.flat().filter(t => /^[abc]$/.test(t)))], sols = new Set();
  if (!(q.answer >= 1 && q.answer <= 9)) fail("중등 답 범위", q);
  const sideOf = (c, env) => { let e = ""; c.forEach((t, k) => { const nx = c[k + 1]; const s = /^[abc]$/.test(t) ? `(${env[t]})` : t === "×" ? "*" : t === "−" ? "-" : t === "=" ? "===" : String(t).replace("−", "-"); e += s; if (typeof t === "number" && (/^[abc]$/.test(nx) || nx === "(")) e += "*"; e += " "; }); return Function(`return ${e}`)(); };
  const walk = (k, env) => { if (k === syms.length) { if (q.clues.every(c => sideOf(c, env))) sols.add(env[q.ask]); return; } for (let v = 1; v <= 9; v++) walk(k + 1, { ...env, [syms[k]]: v }); };
  walk(0, {}); if (sols.size !== 1 || !sols.has(q.answer)) fail("중등 답이 하나가 아님", { q, sols: [...sols] }); }
const midNum = l => mval(l, 0);
for (let i = 0; i < N; i++) { const round = i % 8, q = Q.series(round), tape = [...q.shown];
  if (tape.length !== 5 || q.asks.length !== 3) fail("중등 수열 길이", q);
  for (const a of q.asks) { const t = tape.map(midNum), n = t.length, d = diffs(t), all = [];
    if (same(d)) all.push(t[n - 1] + d[0]);
    if (same(diffs(d))) all.push(t[n - 1] + d[n - 2] + diffs(d)[0]);
    if (t.every(x => x) && same(t.slice(1).map((x, k) => x / t[k]))) all.push(t[n - 1] * t[1] / t[0]);
    if (d.every((x, k) => k < 2 || eq(x, d[k - 2]))) all.push(t[n - 1] + d[n - 3]);
    if (!eq(t[1], t[0])) { const A = (t[2] - t[1]) / (t[1] - t[0]), B = t[1] - A * t[0]; if (t.every((x, k) => !k || eq(x, A * t[k - 1] + B))) all.push(A * t[n - 1] + B); }
    const real = midNum(a.real); if (!all.length) fail("중등 규칙을 못 찾음", { q, tape }); if (!all.every(g => eq(g, real))) fail("중등 규칙 둘로 읽힘", { q, tape, all });
    if (a.opts.length !== 4 || !a.opts.includes(a.real)) fail("중등 등 구성", a);
    if (new Set(a.opts.map(o => midNum(o).toFixed(6))).size !== 4) fail("중등 값이 같은 등", a);
    if (/undefined|NaN|-/.test(a.opts.join())) fail("중등 글자 오류", a);
    tape.push(a.real); } }
for (let i = 0; i < N; i++) { const wave = 1 + i % 10, q = Q.speed(wave); let m, v, T;
  if ((m = q.shipText.match(/^적함: 시속 (\d+(?:\.\d+)?)km/))) v = m[1] * 1000 / 3600; else if ((m = q.shipText.match(/^적함: 1초에 (\d+)m/))) v = +m[1]; else fail("중등 적함 문구", q);
  if ((m = q.torpText.match(/^어뢰: (\d+)초 뒤/))) T = +m[1]; else if ((m = q.torpText.match(/^어뢰: 1초에 (\d+)m, 만나는 곳까지 (\d+)m/))) T = m[2] / m[1]; else if ((m = q.torpText.match(/^어뢰: 1초에 (\d+)m, 적함보다 (\d+)m 더/))) T = m[2] / (m[1] - v); else fail("중등 어뢰 문구", q);
  if (!eq(v * T, q.D) || q.D !== q.k * q.S || !Number.isInteger(T) || T < 1) fail("중등 쏠 거리", { q, v, T }); }
const midLoad = t => { let m;
  if ((m = t.match(/xkg: (.+) = (\S+)$/))) { const b = mval(m[1], 0), a = mval(m[1], 1) - b; return (mval(m[2]) - b) / a * 1000; }
  if ((m = t.match(/(\d+)개는 (\d+)개보다 (\S+) 무거워요\. 1개 무게$/))) return grams(m[3]) / (m[1] - m[2]);
  if ((m = t.match(/2개의 합이 (\S+)이고 한쪽이 (\S+) 더 무거워요\. 가벼운 쪽$/))) return (grams(m[1]) - grams(m[2])) / 2;
  if ((m = t.match(/3개가 차례로 (\S+)씩 무겁고 합이 (\S+)이에요\. 가장 가벼운 것$/))) return (grams(m[2]) - 3 * grams(m[1])) / 3;
  return NaN; };
for (let i = 0; i < N * 3; i++) { const map = i % 3, round = i % 10, q = Q.weigh(map, round), T = midLoad(q.load);
  if (!(Math.abs(T - q.T) < 1e-6)) fail("중등 저울 무게", { q, T });
  if (q.opts.length !== 6 || new Set(q.opts.map(o => o.g)).size !== 6 || q.opts.some(o => o.g === q.T)) fail("중등 추 구성", q);
  if (!eq(sum(q.parts.map(grams)), q.T) || q.parts.length < 2) fail("중등 저울 정답", q);
  if (/undefined|NaN/.test(q.load + q.why)) fail("중등 글자 오류", q); }
Q.setLevel(0);
console.log("중등 표적 유형", JSON.stringify(midOrder));
console.log("수열 규칙", Object.keys(rules).length, "가지");
// practising one kind of question: every kind a game can ask must come up when it is asked for
for (const level of [0, 1]) { Q.setLevel(level); const orderTags = new Set(), weighTags = [new Set(), new Set(), new Set()];
  for (let i = 0; i < 4000; i++) { orderTags.add(Q.order(1 + i % 10, 4).tag); weighTags[i % 3].add(Q.weigh(i % 3, i % 10).tag); }
  for (const tag of orderTags) { Q.setFocus(tag); for (let i = 0; i < 40; i++) { const q = Q.order(1 + i % 10, 4); if (q.tag !== tag) fail("연습 유형 다름", [tag, q.tag]); } Q.setFocus(null); }
  weighTags.forEach((tags, map) => { for (const tag of tags) { Q.setFocus(tag); for (let i = 0; i < 40; i++) { const q = Q.weigh(map, i % 10); if (q.tag !== tag) fail("연습 유형 다름", [map, tag, q.tag]); } Q.setFocus(null); } }); }
Q.setLevel(0);
console.log("검사 끝, 실패", bad, "건 / 문제 유형", JSON.stringify(asks)); process.exitCode = bad ? 1 : 0;
