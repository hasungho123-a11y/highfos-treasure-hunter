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
  if (q.opts.length !== n || new Set(q.opts).size !== n || !q.opts.includes(q.real)) fail("표적 구성", q);
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
console.log("검사 끝, 실패", bad, "건 / 문제 유형", JSON.stringify(asks)); process.exitCode = bad ? 1 : 0;
