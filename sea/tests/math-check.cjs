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
console.log("수열 규칙", Object.keys(rules).length, "가지");
console.log("검사 끝, 실패", bad, "건 / 문제 유형", JSON.stringify(asks)); process.exitCode = bad ? 1 : 0;
