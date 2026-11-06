/* 실시간 대결 문제: both players get the same question each round, and only the server knows which choice is right.
   The question comes from a fixed seed, so nothing has to be stored. Upper-elementary level; harder as the rounds go on.
   Labels are plain text such as "3/4" or "(2+3)×4"; MathQ.html() on the page draws the fractions stacked. */
const rngOf = seed => { let h = 2166136261; for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = h + 0x6D2B79F5 | 0; let t = Math.imul(h ^ h >>> 15, 1 | h); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const reduced = (n, d) => { const g = gcd(n, d); return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`; };
const valueOf = label => { const f = String(label).match(/^(\d+)\/(\d+)$/); return f ? f[1] / f[2] : Number(label); };
const decimal = v => String(Math.round(v * 100) / 100);

const KINDS = R => { const ri = (a, b) => a + Math.floor(R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)];
  const WHOLE = [
    [ // rounds 1-2: one operation, big enough to need working out
      () => { const a = ri(13, 49), b = ri(3, 9); return { text: `${a}×${b}`, real: a * b, near: [a * b + 10, a * b - 10, a * (b + 1)] }; },
      () => { const a = ri(126, 487), b = ri(127, 389); return { text: `${a}+${b}`, real: a + b, near: [a + b + 10, a + b - 10, a + b + 100] }; },
      () => { const a = ri(312, 780), b = ri(127, 289); return { text: `${a}−${b}`, real: a - b, near: [a - b + 10, a - b - 10, a - b + 100] }; },
      () => { const b = ri(3, 8), q = ri(13, 39); return { text: `${b * q}÷${b}`, real: q, near: [q + 1, q - 1, q + 10] }; }
    ],
    [ // rounds 3-4: order of operations, with the wrong order among the choices
      () => { const a = ri(3, 19), b = ri(3, 9), c = ri(3, 9); return { text: `${a}+${b}×${c}`, real: a + b * c, near: [(a + b) * c] }; },
      () => { const a = ri(3, 12), b = ri(3, 12), c = ri(3, 9); return { text: `(${a}+${b})×${c}`, real: (a + b) * c, near: [a + b * c] }; },
      () => { const b = ri(3, 6), c = ri(3, 6), a = b * c + ri(5, 30); return { text: `${a}−${b}×${c}`, real: a - b * c, near: [(a - b) * c] }; },
      () => { const b = ri(3, 8), q = ri(4, 12), c = ri(2, 6), d = ri(2, 6); return { text: `${b * q}÷${b}+${c}×${d}`, real: q + c * d, near: [(q + c) * d] }; }
    ]
  ];
  const FRACTION = [ // rounds 5-6: the common slip of adding tops and bottoms is among the choices
    () => { for (;;) { const [d1, d2] = pick([[2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [2, 7], [3, 8], [4, 6], [6, 8], [3, 10]]), n1 = ri(1, d1 - 1), n2 = ri(1, d2 - 1), top = n1 * d2 + n2 * d1, bot = d1 * d2; if (top >= bot || bot / gcd(top, bot) === 1) continue; return { text: `${n1}/${d1}+${n2}/${d2}`, real: reduced(top, bot), near: [reduced(n1 + n2, d1 + d2)] }; } },
    () => { for (;;) { const [d1, d2] = pick([[2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [2, 7], [3, 8], [4, 6], [6, 8], [3, 10]]), n1 = ri(1, d1 - 1), n2 = ri(1, d2 - 1), top = n1 * d2 - n2 * d1, bot = d1 * d2; if (top <= 0 || bot / gcd(top, bot) === 1) continue; return { text: `${n1}/${d1}−${n2}/${d2}`, real: reduced(top, bot), near: [reduced(n1 + n2, d1 + d2)] }; } },
    () => { for (;;) { const d = pick([6, 8, 9, 10, 12, 15]), n = ri(1, d - 1), k = ri(2, 5); if (gcd(n, d) !== 1 || n * k >= d || d / gcd(n * k, d) === 1) continue; return { text: `${n}/${d}×${k}`, real: reduced(n * k, d), near: [reduced(n, d * k)] }; } },
    () => { const [n, d] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 7], [5, 8], [7, 9]]), k = ri(2, 4); return { text: `${n}/${d}÷${k}`, real: reduced(n, d * k), near: [reduced(n * k, d)] }; }
  ];
  const MIXED = [ // rounds 7-8: percent, a fraction of a number, ratio and decimals
    () => { const [p, b] = pick([[10, 10], [20, 5], [25, 4], [50, 2], [30, 10], [40, 5], [60, 5], [75, 4]]), k = ri(3, 16) * b; return { text: `${k}의 ${p}%`, real: k * p / 100, near: [k * p / 10, k - k * p / 100] }; },
    () => { const [n, d] = pick([[3, 4], [2, 3], [3, 5], [5, 6], [2, 5], [4, 7]]), k = ri(4, 15) * d; return { text: `${k}의 ${n}/${d}`, real: k * n / d, near: [k / d, k - k * n / d] }; },
    () => { const a = ri(2, 7), b = ri(2, 9), k = ri(2, 8); if (a === b) return { text: `${a}:${b + 1} = ${a * k}:□`, ask: "□에 들어갈 수는?", real: (b + 1) * k, near: [b + 1 + a * k - a] }; return { text: `${a}:${b} = ${a * k}:□`, ask: "□에 들어갈 수는?", real: b * k, near: [b + a * k - a] }; },
    () => { const a = ri(12, 49) / 10, b = ri(3, 8); return { text: `${decimal(a)}×${b}`, real: decimal(a * b), near: [decimal(a * b * 10), decimal(a * b + 1)] }; },
    () => { const a = ri(115, 495) / 100, b = ri(11, 49) / 10; return { text: `${decimal(a)}+${decimal(b)}`, real: decimal(a + b), near: [decimal(a + b + 1), decimal(a + b - .1)] }; }
  ];
  return [...WHOLE, FRACTION, MIXED]; };

// fills the choices with values close enough to need checking, and never two that are worth the same
function choices(real, near, R) { const out = [String(real)], taken = new Set([valueOf(real).toFixed(6)]);
  const add = x => { const label = String(x), v = valueOf(label); if (out.length < 4 && v > 0 && Number.isFinite(v) && !taken.has(v.toFixed(6))) { taken.add(v.toFixed(6)); out.push(label); } };
  near.forEach(add);
  const f = String(real).match(/^(\d+)\/(\d+)$/);
  if (f) { const n = +f[1], d = +f[2]; for (const [a, b] of [[n + 1, d], [n, d + 1], [Math.max(1, n - 1), d], [n + 2, d], [n, d * 2 + 1], [n + 3, d]]) add(reduced(a, b)); }
  else if (String(real).includes(".")) { const v = +real; for (const s of [.1, 1, .5, .2, 2]) { add(decimal(v + s)); add(decimal(v - s)); } }
  else { const v = +real; for (const s of [1, 2, 10, 3, 5, 20, 7]) { add(v + s); add(v - s); } }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out; }

export function duelQuestion(seed, round) { const R = rngOf(`${seed}|${round}`), tiers = KINDS(R), tier = tiers[Math.min(tiers.length - 1, Math.floor((round - 1) / 2))], q = tier[Math.floor(R() * tier.length)](), real = String(q.real), opts = choices(real, q.near, R);
  return { ask: q.ask || "값은 얼마일까요?", text: q.text, opts, real, realIdx: opts.indexOf(real) }; }
