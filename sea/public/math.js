/* 하이포스 매쓰아일랜드 — math for the mini-games, at upper-elementary level (Korean grades 5-6).
   Questions are made fresh every time and never stored, so answers can't be memorised or passed around.
   Labels are plain text such as "3/4", "0.75", "75%", "(2+3)×4"; MathQ.html() draws the fractions stacked. */
(() => {
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = ri(0, i); [o[i], o[j]] = [o[j], o[i]]; } return o; };
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const frac = (n, d) => `${n}/${d}`;
const wa = n => "2459".includes(String(n).slice(-1)) ? "와" : "과"; // the particle after a number depends on how its last digit is read; a fraction is read ending on its top number
const keyOf = (n, d) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };

// fractions that end neatly as decimals and percents
const NEAT = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20], [7, 20], [9, 20], [1, 25], [3, 25], [6, 25]];
const pctOf = ([n, d]) => n * 100 / d;
const decOf = v => String(pctOf(v) / 100);
const pctText = v => `${pctOf(v)}%`;
const anyForm = v => pick([frac(v[0], v[1]), decOf(v), pctText(v)]);

// a calculation in the order-of-operations style of the 5th grade: the value is worked out here, never written by hand
const calc = hard => {
  if (!hard) return pick([
    () => { const a = ri(3, 9), b = ri(3, 9); return { t: `${a}×${b}`, v: a * b }; },
    () => { const a = ri(12, 48), b = ri(6, 29); return { t: `${a}+${b}`, v: a + b }; },
    () => { const a = ri(30, 70), b = ri(6, 28); return { t: `${a}−${b}`, v: a - b }; },
    () => { const b = ri(3, 9), v = ri(3, 9); return { t: `${b * v}÷${b}`, v }; }
  ])();
  return pick([
    () => { const a = ri(2, 9), b = ri(2, 9), c = ri(2, 6); return { t: `${a}+${b}×${c}`, v: a + b * c, swap: { t: `(${a}+${b})×${c}`, v: (a + b) * c } }; },
    () => { const a = ri(2, 9), b = ri(2, 9), c = ri(2, 6); return { t: `(${a}+${b})×${c}`, v: (a + b) * c, swap: { t: `${a}+${b}×${c}`, v: a + b * c } }; },
    () => { const a = ri(3, 9), b = ri(3, 9), c = ri(2, 9); return { t: `${a}×${b}−${c}`, v: a * b - c }; },
    () => { const b = ri(2, 9), q = ri(2, 9), c = ri(2, 9); return { t: `${b * q}÷${b}+${c}`, v: q + c }; },
    () => { const b = ri(2, 6), c = ri(2, 5), a = b * c + ri(1, 12); return { t: `${a}−${b}×${c}`, v: a - b * c, swap: { t: `(${a}−${b})×${c}`, v: (a - b) * c } }; }
  ])();
};

/* ----- 보물 동굴: six pairs of cards that are worth the same, each pair a different kind of "same" ----- */
const PAIR = {
  fd: () => { const v = pick(NEAT); return [frac(...v), decOf(v), keyOf(...v)]; },
  fp: () => { const v = pick(NEAT); return [frac(...v), pctText(v), keyOf(...v)]; },
  dp: () => { const v = pick(NEAT); return [decOf(v), pctText(v), keyOf(...v)]; },
  reduce: () => { const [n, d] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [5, 6], [2, 7], [3, 7], [3, 8], [5, 8], [4, 9]]), k = ri(2, 5); return [frac(n * k, d * k), frac(n, d), keyOf(n, d)]; },
  add: () => { const [d1, d2] = pick([[2, 4], [2, 6], [2, 8], [3, 6], [4, 8], [3, 4], [2, 3], [2, 5], [5, 10], [3, 9], [4, 6]]); for (;;) { const n1 = ri(1, d1 - 1), n2 = ri(1, d2 - 1), top = n1 * d2 + n2 * d1, bot = d1 * d2; if (top >= bot) continue; const g = gcd(top, bot); return [`${frac(n1, d1)}+${frac(n2, d2)}`, frac(top / g, bot / g), keyOf(top, bot)]; } },
  calc: () => { const c = calc(true); return [c.t, String(c.v), `i${c.v}`]; }
};
function pairs() { const seen = new Set(), out = [];
  for (const kind of ["fd", "fp", "dp", "reduce", "add", "calc"]) { let p; do { p = PAIR[kind](); } while (seen.has(p[2])); seen.add(p[2]); out.push({ a: p[0], b: p[1], key: p[2] }); }
  return out; }

/* ----- 사격 훈련장: one target fits the order; the rest don't. Later waves ask harder things ----- */
const distinct = (real, make, n, ok = () => true) => { const out = [real]; let tries = 0; while (out.length < n && ++tries < 400) { const x = make(); if (!out.includes(x) && ok(x)) out.push(x); } return out.length === n ? out : null; };
const ORDER = {
  value(n, hard) { const r = calc(hard), near = hard ? 12 : 9, seen = new Set([r.v]), out = [r.t]; if (r.swap && r.swap.v !== r.v) { out.push(r.swap.t); seen.add(r.swap.v); } let tries = 0;
    while (out.length < n && ++tries < 400) { const c = calc(hard); if (!seen.has(c.v) && Math.abs(c.v - r.v) <= near) { seen.add(c.v); out.push(c.t); } }
    return out.length >= n ? { ask: `값이 ${r.v}인 표적`, real: r.t, opts: out.slice(0, n) } : null; },
  multiple(n) { const k = pick([3, 4, 6, 7, 8, 9]), real = String(k * ri(3, 11)); const opts = distinct(real, () => String(ri(12, 99)), n, x => x % k !== 0); return opts && { ask: `${k}의 배수인 표적`, real, opts }; },
  divisor(n) { const N = pick([24, 36, 48, 60, 72, 84]), all = []; for (let i = 3; i < N; i++) if (N % i === 0) all.push(i); const real = String(pick(all)), opts = distinct(real, () => String(ri(5, 29)), n, x => N % x !== 0); return opts && { ask: `${N}의 약수인 표적`, real, opts }; },
  common(n) { const [a, b] = pick([[12, 18], [24, 36], [18, 30], [20, 30], [16, 24], [24, 40], [30, 42], [36, 54]]), all = []; for (let i = 2; i <= a; i++) if (a % i === 0 && b % i === 0) all.push(i); const real = String(pick(all)), opts = distinct(real, () => String(ri(2, 15)), n, x => a % x !== 0 || b % x !== 0); return opts && { ask: `${a}${wa(a)} ${b}의 공약수인 표적`, real, opts }; },
  overHalf(n) { const over = NEAT.filter(v => v[0] * 2 > v[1]), under = NEAT.filter(v => v[0] * 2 < v[1]), real = anyForm(pick(over)), opts = distinct(real, () => anyForm(pick(under)), n); return opts && { ask: "1/2보다 큰 수인 표적", real, opts }; },
  biggest(n) { const vs = shuffle(NEAT).slice(0, n), top = vs.reduce((m, v) => pctOf(v) > pctOf(m) ? v : m), labels = vs.map(anyForm); return { ask: "가장 큰 수인 표적", real: labels[vs.indexOf(top)], opts: labels }; },
  same(n) { const v = pick(NEAT.filter(x => x[1] <= 10)), k = ri(2, 4), real = pick([frac(v[0] * k, v[1] * k), decOf(v), pctText(v)]), others = NEAT.filter(x => pctOf(x) !== pctOf(v)), opts = distinct(real, () => anyForm(pick(others)), n); return opts && { ask: `${frac(...v)}${wa(v[0])} 크기가 같은 표적`, real, opts }; }
};
const ORDER_TAG = { value: "식 계산", multiple: "배수", divisor: "약수", common: "공약수", overHalf: "크기 비교", biggest: "크기 비교", same: "같은 크기" };
// wave runs from 1 to 10, n is how many choices are on the water; noun is what the player is picking
function order(wave, n, noun = "표적") { const pool = wave <= 3 ? ["value", "multiple", "divisor"] : wave <= 7 ? ["value", "common", "overHalf", "same"] : ["value", "biggest", "same", "common"], hard = wave > 3;
  for (;;) { const kind = pick(pool), q = ORDER[kind](n, hard); if (q && q.opts.length === n) return { tag: ORDER_TAG[kind], ask: q.ask.replace(/표적$/, noun), real: q.real, opts: shuffle(q.opts) }; } }

/* ----- 포격 섬: a 6-by-6 sea. The hidden ship's two grid numbers are the answers to two sums; later a wind pushes the shot sideways. ----- */
const divisors = v => { const out = []; for (let i = 1; i <= v; i++) if (v % i === 0) out.push(i); return out; };
const WAYS = {
  plus: v => { const a = ri(1, 9) + v; return `${a}−${a - v}`; },
  add: v => { if (v < 2) return WAYS.plus(v); const a = ri(1, v - 1); return `${a}+${v - a}`; },
  times: v => { const a = pick(divisors(v)); return `${a}×${v / a}`; },
  over: v => { const b = ri(2, 9); return `${v * b}÷${b}`; },
  fraction: v => { const opts = []; for (const q of [2, 3, 4, 5, 6, 8]) for (let p = 1; p < q; p++) if (gcd(p, q) === 1 && v % p === 0) opts.push([p, q]); const [p, q] = pick(opts); return `${q * v / p}의 ${p}/${q}`; },
  percent: v => { const opts = [[50, 2 * v], [25, 4 * v], [10, 10 * v], [20, 5 * v]]; if (v % 3 === 0) opts.push([75, 4 * v / 3]); const [P, N] = pick(opts); return `${N}의 ${P}%`; },
  ratio: v => { if (v === 1) return WAYS.fraction(v); const bs = divisors(v).filter(b => b < v), b = pick(bs), k = v / b; let a; do { a = ri(1, 5); } while (a === b); return `${a}:${b} = ${a * k}:□`; },
  mixed: v => { let a, b, c; do { a = ri(2, 6); b = ri(2, 6); c = a * b - v; } while (c < 1); return `${a}×${b}−${c}`; }
};
const wayFor = wave => wave <= 3 ? pick(["plus", "add", "times", "over"]) : wave <= 6 ? pick(["fraction", "percent", "mixed"]) : pick(["fraction", "percent", "ratio", "mixed"]);
function grid(wave) { const x = ri(1, 6), y = ri(1, 6); let wind = 0; if (wave >= 7) do { wind = pick([-2, -1, 1, 2]); } while (x - wind < 1 || x - wind > 6);
  return { x, y, wind, xText: WAYS[wayFor(wave)](x), yText: WAYS[wayFor(wave)](y) }; }

/* ----- 통신 기지: work out what a symbol stands for from the clues. Every symbol is worth 1 to 9, so one key press answers.
   A clue is a list of tokens; "a", "b" and "c" stand for the symbols on screen. ----- */
const startClue = a => pick([
  () => ["a", "+", "a", "=", 2 * a], () => ["a", "+", "a", "+", "a", "=", 3 * a], () => ["a", "×", ri(3, 6), "=", null], () => ["a", "×", "a", "=", a * a], () => ["a", "+", ri(4, 15), "=", null], () => [ri(10, 25), "−", "a", "=", null]
])();
const settle = (clue, a) => { if (clue[4] !== null) return clue; const [x, op, y] = clue, l = x === "a" ? a : x, r = y === "a" ? a : y; return [x, op, y, "=", op === "×" ? l * r : op === "+" ? l + r : l - r]; };
const first = a => settle(startClue(a), a);
const levels = [
  () => { const a = ri(2, 9); return { clues: [first(a)], ask: "a", answer: a }; },
  () => { let a, b; do { a = ri(2, 9); b = ri(1, 9); } while (a === b); const second = pick([
      () => ["a", "+", "b", "=", a + b], () => ["b", "×", "a", "=", a * b], () => ["a", "×", 2, "+", "b", "=", a * 2 + b]
    ])(); return { clues: [first(a), second], ask: "b", answer: b }; },
  () => pick([
    () => { let a, b, c; do { a = ri(2, 9); b = ri(2, 9); c = ri(1, 9); } while (a === b || b === c || a === c); return { clues: [first(a), ["a", "+", "b", "=", a + b], ["b", "×", "c", "=", b * c]], ask: "c", answer: c }; }, // a chain of three
    () => { let a, b; do { a = ri(2, 9); b = ri(1, 9); } while (a <= b); return { clues: [["a", "+", "b", "=", a + b], ["a", "−", "b", "=", a - b]], ask: "b", answer: b }; }, // sum and difference
    () => { let a, b; do { a = ri(2, 9); b = ri(2, 9); } while (a === b); return { clues: [["a", "+", "a", "+", "b", "=", 2 * a + b], ["a", "+", "b", "=", a + b]], ask: "a", answer: a }; } // take one clue from the other
  ])()
];
const cipher = level => levels[Math.min(level, levels.length - 1)]();

/* ----- 암호 등대: five numbers of a series are sent; the player continues it for three more. Each round's rule is harder. ----- */
const build = (first, next, n = 8) => { const out = [first]; while (out.length < n) out.push(next(out[out.length - 1], out)); return out; };
const tenth = v => String(v / 10);
const RULES = [
  [
    () => { const d = ri(3, 12); return { nums: build(ri(1, 20), x => x + d), rule: `${d}씩 커져요` }; },
    () => { const d = ri(3, 9); return { nums: build(d * 7 + ri(3, 20), x => x - d), rule: `${d}씩 작아져요` }; },
    () => ({ nums: build(ri(1, 5), x => x * 2), rule: "2배씩 커져요" })
  ],
  [
    () => { const inc = ri(1, 3); let gap = ri(1, 4) - inc; return { nums: build(ri(1, 10), x => { gap += inc; return x + gap; }), rule: `늘어나는 수가 ${inc}씩 커져요` }; },
    () => { const up = ri(4, 9), dn = ri(1, up - 1); return { nums: build(ri(dn, 15), (x, all) => all.length % 2 ? x + up : x - dn), rule: `${up} 더하기와 ${dn} 빼기를 번갈아 해요` }; },
    () => { const s = ri(1, 4); return { nums: Array.from({ length: 8 }, (_, i) => (s + i) * (s + i)), rule: "같은 수를 두 번 곱한 수예요" }; },
    () => { const a = ri(1, 5), b = ri(a, 6); return { nums: build(a, (x, all) => all.length === 1 ? b : x + all[all.length - 2]), rule: "앞의 두 수를 더해요" }; },
    () => ({ nums: build(1, x => x * 3), rule: "3배씩 커져요" }),
    () => ({ nums: build(128 * ri(1, 3), x => x / 2), rule: "절반씩 작아져요" })
  ],
  [
    () => { const d = pick([2, 3, 4, 5, 6]), a = ri(1, 9); return { labels: Array.from({ length: 8 }, (_, i) => tenth(a + d * i)), dec: true, rule: `${tenth(d)}씩 커져요` }; },
    () => { const d = pick([1, 2]), D = d === 2 ? pick([15, 20]) : pick([10, 12, 15, 20]); return { labels: Array.from({ length: 8 }, (_, i) => frac(1 + d * i, D)), rule: `분모는 그대로, 분자가 ${d}씩 커져요` }; },
    () => { const s = ri(1, 3); return { labels: Array.from({ length: 8 }, (_, i) => frac(s + i, s + i + 1)), rule: "분자와 분모가 1씩 커져요" }; },
    () => { const D = pick([2, 3]); return { labels: Array.from({ length: 8 }, (_, i) => frac(1, D * 2 ** i)), rule: "분모가 2배씩 커져요" }; },
    () => ({ nums: build(ri(1, 4), x => x * 2 + 1), rule: "2배 하고 1을 더해요" }),
    () => ({ nums: build(ri(2, 5), x => x * 2 - 1), rule: "2배 하고 1을 빼요" })
  ]
];
const fakesOf = (label, dec) => { const f = label.match(/^(\d+)\/(\d+)$/);
  if (f) { const n = +f[1], d = +f[2]; return [[n + 1, d], [n - 1, d], [n + 2, d], [n, d + 1], [n, d - 1], [n + 1, d + 1], [n - 1, d - 1], [n, d + 2]].filter(([a, b]) => a >= 1 && b >= 2 && a * d !== n * b).map(([a, b]) => frac(a, b)); }
  if (dec) { const v = Math.round(label * 10); return [1, 2, 3, 5, 10, -1, -2, -3, -5].map(k => v + k).filter(x => x > 0).map(tenth); }
  const x = +label; return [1, 2, 3, 5, 10, -1, -2, -3, -5, -10].map(k => x + k).filter(y => y > 0).map(String); };
// round runs from 0 to 7
function series(round) { const made = pick(RULES[round < 2 ? 0 : round < 5 ? 1 : 2])(), labels = made.labels || made.nums.map(String);
  return { shown: labels.slice(0, 5), rule: made.rule, asks: labels.slice(5).map(real => ({ real, opts: shuffle([real, ...differentValues(fakesOf(real, made.dec), real)]) })) }; }
const valueOf = l => { const f = l.match(/^(\d+)\/(\d+)$/); return f ? f[1] / f[2] : +l; };
// three wrong numbers, no two worth the same: 7/7 and 8/8 on two lamps would give the game away
const differentValues = (fakes, real) => { const seen = [valueOf(real)], out = []; for (const x of shuffle(fakes)) { const v = valueOf(x); if (out.length < 3 && !seen.some(y => Math.abs(y - v) < 1e-9)) { seen.push(v); out.push(x); } } return out; };

/* ----- 포대 요새: while the torpedo runs, the ship keeps sailing. How far away must it be when the torpedo is fired? distance = speed × time ----- */
function speed(wave) { const level = wave <= 3 ? 0 : wave <= 6 ? 1 : 2;
  for (;;) { const S = pick([10, 20, 30, 40, 50, 60]), k = ri(2, 6), D = S * k, T = ri(2, 6), v = D / T; if (v % 5 || v > 80) continue;
    let shipText = `적함: 1초에 ${v}m 가요`, first = "";
    if (level) { if (Math.random() < .3) { shipText = `적함: 1분에 ${v * 60}m 가요`; first = `${v * 60}÷60=${v}, `; } else { const n = ri(2, 5); shipText = `적함: ${n}초에 ${v * n}m 가요`; first = `${v * n}÷${n}=${v}, `; } }
    let torpText = `어뢰: ${T}초 뒤에 도착해요`, second = "";
    if (level === 2) { const u = pick([10, 20, 25, 40, 50]); torpText = `어뢰: 1초에 ${u}m, 만나는 곳까지 ${u * T}m`; second = `${u * T}÷${u}=${T}, `; }
    return { shipText, torpText, S, k, D, why: `${first}${second}${v}×${T}=${D}` }; } }

/* ----- 포구의 저울: work out what the load weighs, then put weights on the other pan until it balances. Everything is counted in grams, so no rounding can creep in.
   Any set of weights with the right total is accepted; the load's weight is never on the rack, so at least two weights are always needed. ----- */
const KG = g => `${g / 1000}kg`;
const list = gs => gs.map(KG).join(", ");
const FRACS = { 50: [1, 20], 100: [1, 10], 200: [1, 5], 250: [1, 4], 300: [3, 10], 400: [2, 5], 500: [1, 2], 600: [3, 5], 700: [7, 10], 750: [3, 4], 800: [4, 5], 900: [9, 10] };
const WEIGHTS = [50, 100, 200, 250, 300, 400, 500, 600, 750, 800, 1000, 1200, 1500, 2000, 2500, 3000];
const fracKg = g => `${frac(...FRACS[g])}kg`;
const weightLabel = (g, map) => g >= 1000 ? KG(g) : map === 0 ? `${g}g` : map === 1 ? pick([fracKg(g), KG(g)]) : pick([`${g}g`, KG(g), fracKg(g)]);
const GOODS = [["생선 상자", "쌀 자루", "소금 포대", "밧줄 뭉치"], ["석탄 통", "철판 더미", "화물 상자", "기름통"], ["포탄 상자", "보급 상자", "연료통", "부품 상자"]];
const ro = n => "36".includes(String(n).slice(-1)) ? "으로" : "로"; // 3:6으로, 3:2로
// n-1 boxes whose weights leave a sensible last one, for the two average questions
const boxes = (n, avg) => { for (;;) { const gs = Array.from({ length: n - 1 }, () => ri(6, 40) * 100), last = n * avg - gs.reduce((a, b) => a + b, 0); if (last >= 500 && !gs.includes(last) && new Set(gs).size === n - 1) return { gs, last }; } };
const WEIGH = [
  [ // 포구 마을: units, then multiplying and dividing decimals, then the average
    it => { const T = ri(12, 45) * 100; if (T % 1000 === 0) return null; const k = Math.floor(T / 1000), rest = T - k * 1000, split = Math.random() < .5; return { tag: "무게 단위", T, load: split ? `${it} ${k}kg ${rest}g` : `${it} ${KG(T)}`, why: `${split ? `${k}kg ${rest}g` : KG(T)} = ${T}g` }; },
    it => { const n = ri(2, 6), one = ri(3, 18) * 100; if (one * n > 6000) return null; return Math.random() < .5 ? { tag: "소수의 나눗셈", T: one, load: `같은 ${it} ${n}개가 ${KG(one * n)}일 때 1개 무게`, why: `${one * n / 1000}÷${n}=${one / 1000}` } : { tag: "곱셈", T: one * n, load: `1개에 ${one}g인 ${it} ${n}개의 무게`, why: `${one}×${n}=${one * n}, ${one * n}g = ${KG(one * n)}` }; },
    it => { const n = ri(3, 4), T = ri(12, 30) * 100, { gs, last } = boxes(n, T), all = shuffle([...gs, last]); return { tag: "평균", T, load: `${it} ${n}개가 ${list(all)}일 때 평균 무게`, why: `(${all.map(g => g / 1000).join("+")})÷${n}=${T / 1000}` }; }
  ],
  [ // 증기 항구: adding unlike fractions, a part of a whole, sharing by a ratio
    it => { const keys = Object.keys(FRACS).map(Number), a = pick(keys), b = pick(keys), [n1, d1] = FRACS[a], [n2, d2] = FRACS[b]; if (d1 === d2) return null; const L = d1 * d2 / gcd(d1, d2), top = n1 * L / d1 + n2 * L / d2, g = gcd(top, L); return { tag: "분수의 덧셈", T: a + b, avoid: [a, b], load: `${it} ${frac(n1, d1)}kg과 ${frac(n2, d2)}kg을 합한 무게`, why: `${frac(n1, d1)}+${frac(n2, d2)} = ${frac(n1 * L / d1, L)}+${frac(n2 * L / d2, L)} = ${frac(top / g, L / g)}` }; },
    it => { const N = ri(2, 8); if (Math.random() < .6) { const P = pick([15, 20, 25, 30, 35, 40, 45, 60, 70, 75, 80]); return { tag: "백분율", T: N * 10 * P, load: `${it} ${N}kg의 ${P}%`, why: `${N * 1000}g×${P}÷100=${N * 10 * P}g` }; } const [p, q] = pick([[1, 4], [3, 4], [2, 5], [3, 5], [4, 5], [3, 8], [5, 8], [3, 10], [7, 10]]), T = N * 1000 * p / q; return { tag: "분수의 곱셈", T, load: `${it} ${N}kg의 ${frac(p, q)}`, why: `${N * 1000}g÷${q}×${p}=${T}g` }; },
    it => { const a = ri(1, 7), b = ri(1, 7), unit = ri(2, 6) * 100, more = Math.random() < .5; if (a === b || gcd(a, b) !== 1) return null; const part = more ? Math.max(a, b) : Math.min(a, b), total = (a + b) * unit; return { tag: "비례배분", T: part * unit, load: `${it} ${KG(total)}을 ${a}:${b}${ro(b)} 나눌 때 더 ${more ? "많은" : "적은"} 쪽`, why: `${total / 1000}×${frac(part, a + b)}=${part * unit / 1000}` }; }
  ],
  [ // 해군 기지: decimal times decimal, finding the whole from a part, the missing box from an average
    it => { const x = ri(4, 30), m = pick([5, 12, 15, 25, 35]), T = x * m * 10; if (T % 50 || T > 6000) return null; return { tag: "소수의 곱셈", T, load: `${it} ${x / 10}kg의 ${m / 10}배`, why: `${x / 10}×${m / 10}=${T / 1000}` }; },
    it => { const T = ri(10, 60) * 100, wt = g => Math.random() < .5 && g < 1000 ? `${g}g` : KG(g); if (Math.random() < .5) { const [p, q] = pick([[1, 4], [3, 4], [2, 5], [3, 5], [4, 5], [3, 10], [7, 10]]), part = T * p / q; if (part % 100) return null; return { tag: "전체 구하기", T, load: `${it} 무게의 ${frac(p, q)}가 ${wt(part)}일 때 전체 무게`, why: `${part}g÷${p}×${q}=${T}g` }; } const P = pick([10, 20, 25, 30, 40, 50, 60, 75]), part = T * P / 100; if (part % 100) return null; return { tag: "전체 구하기", T, load: `${it} 무게의 ${P}%가 ${wt(part)}일 때 전체 무게`, why: `${part}g÷${P}×100=${T}g` }; },
    it => { const n = ri(3, 4), A = ri(15, 35) * 100, { gs, last } = boxes(n, A); return { tag: "평균", T: last, load: `${it} ${n}개의 평균이 ${KG(A)}이고, ${n - 1}개가 ${list(gs)}일 때 나머지 1개`, why: `${A / 1000}×${n}−(${gs.map(g => g / 1000).join("+")})=${last / 1000}` }; }
  ]
];
// round runs from 0 to 9. Six different weights on the rack; `parts` is one way to reach the total, for showing the answer
function weigh(map, round) { const make = WEIGH[map][round < 3 ? 0 : round < 7 ? 1 : 2];
  for (;;) { const q = make(pick(GOODS[map])); if (!q || q.T % 50 || q.T > 6000) continue;
    const off = q.avoid || [], usable = WEIGHTS.filter(g => g !== q.T && !off.includes(g)), under = usable.filter(g => g < q.T); let parts = null;
    for (let t = 0; t < 300 && !parts; t++) { const take = shuffle(under).slice(0, ri(2, 3)); if (take.length >= 2 && take.reduce((a, b) => a + b, 0) === q.T) parts = take; }
    if (!parts) continue;
    const others = usable.filter(g => !parts.includes(g)), spare = [...shuffle(others.filter(g => g < q.T)), ...shuffle(others.filter(g => g > q.T))].slice(0, 6 - parts.length);
    if (spare.length + parts.length !== 6) continue;
    const opts = shuffle([...parts, ...spare]).map(g => ({ g, label: weightLabel(g, map) }));
    return { ...q, opts, parts: parts.map(g => opts.find(o => o.g === g).label) }; } }

const html = label => String(label).replace(/(\d+)\/(\d+)/g, '<span class="frac"><i>$1</i><i>$2</i></span>');
window.MathQ = { pairs, order, cipher, grid, series, speed, weigh, html, shuffle };
})();
