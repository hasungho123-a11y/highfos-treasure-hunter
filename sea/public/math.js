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
const valueOf = l => { const f = l.match(/^(−?)(\d+)\/(\d+)$/); return f ? (f[1] ? -1 : 1) * f[2] / f[3] : +l.replace("−", "-"); };
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
function weigh(map, round) { return rack(map, WEIGH[map][round < 3 ? 0 : round < 7 ? 1 : 2]); }
function rack(map, make) {
  for (;;) { const q = make(pick(GOODS[map])); if (!q || q.T % 50 || q.T > 6000) continue;
    const off = q.avoid || [], usable = WEIGHTS.filter(g => g !== q.T && !off.includes(g)), under = usable.filter(g => g < q.T); let parts = null;
    for (let t = 0; t < 300 && !parts; t++) { const take = shuffle(under).slice(0, ri(2, 3)); if (take.length >= 2 && take.reduce((a, b) => a + b, 0) === q.T) parts = take; }
    if (!parts) continue;
    const others = usable.filter(g => !parts.includes(g)), spare = [...shuffle(others.filter(g => g < q.T)), ...shuffle(others.filter(g => g > q.T))].slice(0, 6 - parts.length);
    if (spare.length + parts.length !== 6) continue;
    const opts = shuffle([...parts, ...spare]).map(g => ({ g, label: weightLabel(g, map) }));
    return { ...q, opts, parts: parts.map(g => opts.find(o => o.g === g).label) }; } }

/* ===== 중등반 (middle-school grade 1): negative numbers, letters, prime factors and equations. Same shapes as the questions above, so the games need no new rules.
   A class's level comes from the server; setLevel() is called before a game starts and the elementary questions above stay exactly as they were. ===== */
let LEVEL = 0;
const neg = x => String(x).replace(/-/g, "−"); // the printed minus sign
const sg = n => n < 0 ? `(${neg(n)})` : String(n); // a negative number in the middle of a sum wears brackets
const nz = (a, b) => { let v; do { v = ri(a, b); } while (!v); return v; };
const lin = (a, b) => `${a === 1 ? "" : a === -1 ? "−" : neg(a)}x${b > 0 ? `+${b}` : b < 0 ? `−${-b}` : ""}`;
const SUP = { 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶" };
const primeForm = N => { const out = []; for (const p of [2, 3, 5, 7]) { let e = 0; while (N % p === 0) { N /= p; e++; } if (e) out.push(`${p}${SUP[e] || ""}`); } return out.join("×"); };
const signedCalc = hard => hard ? pick([
  () => { const a = nz(-9, 9), b = nz(-6, 6), c = nz(-6, 6); return { t: `${sg(a)}+${sg(b)}×${sg(c)}`, v: a + b * c }; },
  () => { const b = pick([-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]), q = nz(-9, 9); return { t: `${sg(b * q)}÷${sg(b)}`, v: q }; },
  () => { const a = ri(2, 6), inside = Math.random() < .5; return { t: inside ? `(−${a})²` : `−${a}²`, v: inside ? a * a : -(a * a) }; },
  () => { const a = ri(2, 4); return { t: `(−${a})³`, v: -(a * a * a) }; },
  () => { const a = ri(2, 12), b = nz(-9, 9); return { t: `|−${a}|+${sg(b)}`, v: a + b }; }
])() : pick([
  () => { const a = nz(-15, 15), b = nz(-15, 15); return { t: `${sg(a)}+${sg(b)}`, v: a + b }; },
  () => { const a = nz(-15, 15), b = nz(-15, 15); return { t: `${sg(a)}−${sg(b)}`, v: a - b }; },
  () => { const a = nz(-9, 9), b = nz(-9, 9); return { t: `${sg(a)}×${sg(b)}`, v: a * b }; }
])();
const FACTORED = [12, 18, 20, 24, 28, 36, 40, 45, 48, 50, 54, 56, 60, 63, 72, 75, 80, 84, 90, 96, 98, 100, 108, 120];
const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47], NOT_PRIME = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57];
const PAIRS_GL = [[12, 18], [18, 24], [16, 24], [20, 30], [24, 36], [15, 25], [14, 21], [18, 30], [30, 45], [28, 42], [36, 48], [24, 40]];
const signedItem = () => { const k = ri(0, 2); if (!k) { const v = nz(-9, 9); return { label: neg(v), v }; } const [p, q] = pick(NEAT.filter(x => x[1] <= 10)), s = pick([1, -1]); return { label: k === 1 ? `${s < 0 ? "−" : ""}${p}/${q}` : neg(s * p / q), v: s * p / q }; };
const signedItems = n => { const out = []; while (out.length < n) { const it = signedItem(); if (!out.some(o => Math.abs(Math.abs(o.v) - Math.abs(it.v)) < 1e-9)) out.push(it); } return out; };
const ORDER_MID = {
  value(n, hard) { const r = signedCalc(hard), seen = new Set([r.v]), out = [r.t]; let tries = 0; while (out.length < n && ++tries < 600) { const c = signedCalc(hard); if (!seen.has(c.v) && Math.abs(c.v - r.v) <= 20) { seen.add(c.v); out.push(c.t); } } return out.length === n ? { tag: "정수의 계산", ask: `값이 ${neg(r.v)}인 표적`, real: r.t, opts: out } : null; },
  subst(n) { const x = nz(-4, 4), a = nz(-5, 5), b = ri(-9, 9), v = a * x + b, seen = new Set([v]), out = [lin(a, b)]; let tries = 0; while (out.length < n && ++tries < 400) { const c = nz(-5, 5), d = ri(-9, 9), w = c * x + d; if (!seen.has(w)) { seen.add(w); out.push(lin(c, d)); } } return out.length === n ? { tag: "문자식의 값", ask: `x=${neg(x)}일 때 값이 ${neg(v)}인 표적`, real: out[0], opts: out } : null; },
  factor(n) { const N = pick(FACTORED), opts = distinct(String(N), () => String(pick(FACTORED)), n); return opts && { tag: "소인수분해", ask: `${primeForm(N)}인 표적`, real: String(N), opts }; },
  prime(n) { const real = String(pick(PRIMES)), opts = distinct(real, () => String(pick(NOT_PRIME)), n); return opts && { tag: "소수", ask: "소수인 표적", real, opts }; },
  gcd(n) { const [a, b] = pick(PAIRS_GL), G = gcd(a, b), real = String(G), opts = distinct(real, () => String(ri(2, 18)), n); return opts && { tag: "최대공약수", ask: `${a}${wa(a)} ${b}의 최대공약수인 표적`, real, opts }; },
  lcm(n) { const [a, b] = pick(PAIRS_GL), L = a * b / gcd(a, b), real = String(L), opts = distinct(real, () => String(pick([a * b, L * 2, L * 3, L + a, L + b, L - a, L - b, a * ri(2, 6), b * ri(2, 6)])), n, x => +x !== L); return opts && { tag: "최소공배수", ask: `${a}${wa(a)} ${b}의 최소공배수인 표적`, real, opts }; },
  smallest(n) { const its = signedItems(n), low = its.reduce((m, o) => o.v < m.v ? o : m); return { tag: "수의 크기", ask: "가장 작은 수인 표적", real: low.label, opts: its.map(o => o.label) }; },
  biggestAbs(n) { const its = signedItems(n), top = its.reduce((m, o) => Math.abs(o.v) > Math.abs(m.v) ? o : m); return { tag: "절댓값", ask: "절댓값이 가장 큰 표적", real: top.label, opts: its.map(o => o.label) }; }
};
const WAYS_MID = {
  add: v => { let a, b; do { a = nz(-9, 9); b = v - a; } while (!b); return `${sg(a)}+${sg(b)}`; },
  sub: v => { let a, b; do { a = nz(-9, 9); b = a - v; } while (!b); return `${sg(a)}−${sg(b)}`; },
  times: v => { if (!v) return `0×${sg(nz(-9, -2))}`; const a = pick([-1, 1].flatMap(s => divisors(Math.abs(v)).map(d => s * d))); return `${sg(a)}×${sg(v / a)}`; },
  over: v => { const b = pick([-5, -4, -3, -2, 2, 3, 4, 5]); return `${sg(v * b)}÷${sg(b)}`; },
  power: v => { const c = v - 4; return c ? `(−2)²+${sg(c)}` : "(−2)²"; },
  size: v => { const a = ri(2, 9), c = v - a; return c ? `|−${a}|+${sg(c)}` : `|−${a}|`; },
  solve: v => { const a = ri(2, 5), b = nz(-9, 9); return `${lin(a, b)} = ${neg(a * v + b)}의 해`; }
};
const MID = {
  order(wave, n, noun = "표적") { const pool = wave <= 3 ? ["value", "factor", "prime"] : wave <= 7 ? ["value", "gcd", "lcm", "smallest", "subst"] : ["value", "subst", "biggestAbs", "smallest", "lcm"], hard = wave > 3;
    for (;;) { const q = ORDER_MID[pick(pool)](n, hard); if (q && q.opts.length === n) return { tag: q.tag, ask: q.ask.replace(/표적$/, noun), real: q.real, opts: shuffle(q.opts) }; } },
  pairs() { const kinds = {
      power: () => { const p = pick([[2, 3], [2, 4], [2, 5], [3, 2], [3, 3], [5, 2], [4, 2], [7, 2]]), v = p[0] ** p[1]; return Math.random() < .3 && p[1] === 2 ? [`(−${p[0]})²`, String(v), `i${v}`] : [`${p[0]}${SUP[p[1]]}`, String(v), `i${v}`]; },
      signed: () => { const c = signedCalc(true); return [c.t, neg(c.v), `i${c.v}`]; },
      fracDec: () => { const [n, d] = pick(NEAT.filter(x => x[1] <= 10)); return [`−${n}/${d}`, neg(-n / d), `f${n}/${d}`]; },
      like: () => { const a = ri(2, 6), b = ri(1, 6), plus = Math.random() < .5 || a === b, s = plus ? a + b : a - b; return [plus ? `${a}x+${b === 1 ? "" : b}x` : `${a}x−${b === 1 ? "" : b}x`, lin(s, 0), `L${s},0`]; },
      dist: () => { const a = ri(2, 5), b = nz(-6, 6); return [`${a}(${lin(1, b)})`, lin(a, a * b), `L${a},${a * b}`]; },
      mix: () => { const a = ri(3, 7), b = nz(-6, 6), c = ri(1, a - 1); return [`${lin(a, b)}−${c === 1 ? "" : c}x`, lin(a - c, b), `L${a - c},${b}`]; }
    }, seen = new Set(), out = [];
    for (const kind of Object.keys(kinds)) { let p; do { p = kinds[kind](); } while (seen.has(p[2]) || p[0] === p[1]); seen.add(p[2]); out.push({ a: p[0], b: p[1], key: p[2] }); }
    return out; },
  // a 7-by-7 sea with -3 to 3 on both axes; x and y stay column and row numbers from 1, as the game counts them
  grid(wave) { const vx = ri(-3, 3), vy = ri(-3, 3), x = vx + 4, y = vy + 4, way = () => WAYS_MID[wave <= 3 ? pick(["add", "sub"]) : wave <= 6 ? pick(["times", "over", "power", "size"]) : pick(["solve", "times", "power", "size"])]; let wind = 0; if (wave >= 7) do { wind = pick([-2, -1, 1, 2]); } while (x - wind < 1 || x - wind > 7);
    return { x, y, wind, xText: way()(vx), yText: way()(vy) }; },
  cipher(level) { const side = (m, s, k) => { const out = []; if (m === 1) out.push(s); else out.push(m, s); if (k > 0) out.push("+", k); else if (k < 0) out.push("−", -k); return out; }, one = a => pick([
      () => { const m = ri(2, 6), k = nz(-9, 9); return [...side(m, "a", k), "=", neg(m * a + k)]; },
      () => { const m = ri(2, 4), k = nz(-5, 9); return [m, "(", ...side(1, "a", k), ")", "=", neg(m * (a + k))]; },
      () => { const m = ri(3, 6), n = ri(1, m - 1), k = nz(-9, 9), l = (m - n) * a + k; return [...side(m, "a", k), "=", ...side(n, "a", l)]; }
    ])();
    if (level === 0) { const a = ri(1, 9), m = ri(2, 6), k = nz(-9, 9); return { clues: [[...side(m, "a", k), "=", neg(m * a + k)]], ask: "a", answer: a }; }
    if (level === 1) { const a = ri(1, 9); return { clues: [one(a)], ask: "a", answer: a }; }
    let a, b; do { a = ri(1, 9); b = ri(1, 9); } while (a === b); const p = ri(2, 4); return { clues: [one(a), [p, "b", "−", "a", "=", neg(p * b - a)]], ask: "b", answer: b }; },
  series(round) { const tiers = [
      [() => { const d = ri(3, 9); return { nums: build(d * ri(1, 3) + ri(1, d - 1), x => x - d), rule: `${d}씩 작아져요` }; },
       () => { const d = ri(3, 9); return { nums: build(ri(1, d - 1) - d * ri(2, 4), x => x + d), rule: `${d}씩 커져요` }; }],
      [() => ({ nums: build(ri(1, 3), x => x * -2), rule: "−2배씩 변해요" }),
       () => ({ nums: build(1, x => x * -3), rule: "−3배씩 변해요" }),
       () => { const inc = ri(1, 3); let gap = ri(5, 8) + inc; return { nums: build(ri(-5, 9), x => { gap -= inc; return x + gap; }), rule: `늘어나는 수가 ${inc}씩 작아져요` }; },
       () => { const dn = ri(5, 9), up = ri(1, dn - 2); return { nums: build(ri(1, 6), (x, all) => all.length % 2 ? x - dn : x + up), rule: `${dn} 빼기와 ${up} 더하기를 번갈아 해요` }; }],
      [() => { const d = pick([3, 5, 7]), a = d * ri(1, 2) + ri(1, d - 1); return { labels: Array.from({ length: 8 }, (_, i) => neg(tenth(a - d * i))), dec: true, rule: `${tenth(d)}씩 작아져요` }; },
       () => { const D = pick([8, 10]), a = pick([3, 5, 7]); return { labels: Array.from({ length: 8 }, (_, i) => { const m = a - 2 * i; return `${m < 0 ? "−" : ""}${Math.abs(m)}/${D}`; }), rule: "분모는 그대로, 분자가 2씩 작아져요" }; },
       () => ({ nums: build(ri(1, 2) + 1, x => x * 2 - 3).map(x => x), rule: "2배 하고 3을 빼요" }),
       () => ({ nums: build(pick([1, 2]), x => x * -2 + 1), rule: "−2배 하고 1을 더해요" })]
    ], made = pick(tiers[round < 2 ? 0 : round < 5 ? 1 : 2])(), labels = made.labels || made.nums.map(neg);
    const fakes = label => { const f = label.match(/^(−?)(\d+)\/(\d+)$/); if (f) { const m = (f[1] ? -1 : 1) * f[2], d = +f[3]; return [2, -2, 4, -4, 1, -1, -2 * m].map(k => m + k).filter(Boolean).map(x => `${x < 0 ? "−" : ""}${Math.abs(x)}/${d}`); }
      const n = +label.replace("−", "-"); if (made.dec) { const v = Math.round(n * 10); return [1, 2, 3, 5, 10, -1, -2, -3, -5, -2 * v].map(k => neg(tenth(v + k))); } return [1, 2, 3, 5, 10, -1, -2, -3, -5, -10, -2 * n].map(k => neg(n + k)); };
    return { shown: labels.slice(0, 5), rule: made.rule, asks: labels.slice(5).map(real => ({ real, opts: shuffle([real, ...differentValues(fakes(real), real)]) })) }; },
  speed(wave) { const level = wave <= 3 ? 0 : wave <= 6 ? 1 : 2;
    for (;;) { const S = pick([10, 20, 30, 40, 50, 60]), k = ri(2, 6), D = S * k, T = ri(2, 6), v = D / T; if (v % 5 || v > 80) continue; const kmh = v * 18 / 5;
      if (level === 2) { const u = v + pick([10, 20, 30, 40]), more = (u - v) * T; return { shipText: `적함: 1초에 ${v}m 가요`, torpText: `어뢰: 1초에 ${u}m, 적함보다 ${more}m 더 가요`, S, k, D, why: `${u}x−${v}x=${more}에서 x=${T}, ${v}×${T}=${D}` }; }
      if (level === 1) { const u = pick([10, 20, 25, 40, 50]); return { shipText: `적함: 시속 ${kmh}km로 가요`, torpText: `어뢰: 1초에 ${u}m, 만나는 곳까지 ${u * T}m`, S, k, D, why: `시속 ${kmh}km는 1초에 ${v}m, ${u * T}÷${u}=${T}, ${v}×${T}=${D}` }; }
      return { shipText: `적함: 시속 ${kmh}km로 가요`, torpText: `어뢰: ${T}초 뒤에 도착해요`, S, k, D, why: `시속 ${kmh}km는 1초에 ${v}m, ${v}×${T}=${D}` }; } },
  weigh(map, round) { const n = g => g / 1000, plain = [
      it => { const T = ri(8, 45) * 100, b = ri(2, 20) * 100; return { tag: "일차방정식", T, load: `${it} xkg: x+${n(b)} = ${n(T + b)}`, why: `x = ${n(T + b)}−${n(b)} = ${n(T)}` }; },
      it => { const T = ri(8, 45) * 100, b = ri(2, 7) * 100; return T > b ? { tag: "일차방정식", T, load: `${it} xkg: x−${n(b)} = ${n(T - b)}`, why: `x = ${n(T - b)}+${n(b)} = ${n(T)}` } : null; },
      it => { const T = ri(4, 18) * 100, a = ri(2, 6); return { tag: "일차방정식", T, load: `${it} xkg: ${a}x = ${n(a * T)}`, why: `x = ${n(a * T)}÷${a} = ${n(T)}` }; }
    ], twoStep = [
      it => { const T = ri(4, 18) * 100, a = ri(2, 5), b = ri(2, 12) * 100; return { tag: "일차방정식", T, load: `${it} xkg: ${a}x+${n(b)} = ${n(a * T + b)}`, why: `${a}x = ${n(a * T)}, x = ${n(T)}` }; },
      it => { const T = ri(4, 18) * 100, a = ri(2, 5), b = ri(2, 6) * 100; return a * T > b ? { tag: "일차방정식", T, load: `${it} xkg: ${a}x−${n(b)} = ${n(a * T - b)}`, why: `${a}x = ${n(a * T)}, x = ${n(T)}` } : null; }
    ], twoStepHard = [
      it => { const T = ri(10, 50) * 100, [p, q] = pick([[1, 2], [1, 4], [3, 4], [2, 5], [3, 5]]), part = T * p / q; return part % 100 ? null : { tag: "분수가 있는 방정식", T, load: `${it} xkg: ${p}/${q}x = ${n(part)}`, why: `x = ${n(part)}÷${p}×${q} = ${n(T)}` }; },
      it => { const T = ri(4, 18) * 100, a = ri(2, 4), b = ri(2, 8) * 100; return { tag: "일차방정식", T, load: `${it} xkg: ${a}(x+${n(b)}) = ${n(a * (T + b))}`, why: `x+${n(b)} = ${n(T + b)}, x = ${n(T)}` }; }
    ], words = [
      it => { const T = ri(4, 18) * 100, m = ri(3, 6), k = ri(1, m - 1); return { tag: "방정식의 활용", T, load: `같은 ${it} ${m}개는 ${k}개보다 ${KG((m - k) * T)} 무거워요. 1개 무게`, why: `${m}x = ${k}x+${n((m - k) * T)}, x = ${n(T)}` }; },
      it => { const T = ri(5, 25) * 100, d = ri(1, 12) * 100; return { tag: "방정식의 활용", T, load: `${it} 2개의 합이 ${KG(2 * T + d)}이고 한쪽이 ${KG(d)} 더 무거워요. 가벼운 쪽`, why: `x+(x+${n(d)}) = ${n(2 * T + d)}, x = ${n(T)}` }; }
    ], wordsHard = [
      it => { const T = ri(5, 15) * 100, d = ri(1, 6) * 100; return { tag: "방정식의 활용", T, load: `${it} 3개가 차례로 ${KG(d)}씩 무겁고 합이 ${KG(3 * T + 3 * d)}이에요. 가장 가벼운 것`, why: `x+(x+${n(d)})+(x+${n(2 * d)}) = ${n(3 * T + 3 * d)}, x = ${n(T)}` }; }
    ], stage = round < 3 ? plain : round < 7 ? (map ? [...twoStep, ...twoStepHard] : twoStep) : (map === 2 ? [...words, ...wordsHard] : words);
    return rack(map, it => pick(stage)(it)); }
};
const HOLD = { pairs, order, cipher, grid, series, speed, weigh };
const either = name => (...a) => (LEVEL ? MID : HOLD)[name](...a);
const html = label => String(label).replace(/(\d+)\/(\d+)/g, '<span class="frac"><i>$1</i><i>$2</i></span>');
window.MathQ = { pairs: either("pairs"), order: either("order"), cipher: either("cipher"), grid: either("grid"), series: either("series"), speed: either("speed"), weigh: either("weigh"), html, shuffle,
  setLevel: n => { LEVEL = n ? 1 : 0; }, level: () => LEVEL, gridSize: () => LEVEL ? 7 : 6, gridLabel: i => LEVEL ? neg(i - 4) : String(i) };
})();
