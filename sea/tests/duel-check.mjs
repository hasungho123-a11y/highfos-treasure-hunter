// checks the duel questions by working every answer out from the printed text, apart from how it was generated
import { duelQuestion } from "../src/duelq.js";
const labelVal = s => { const f = String(s).match(/^(\d+)\/(\d+)$/); return f ? f[1] / f[2] : Number(s); };
const exprVal = t => { let m;
  if ((m = t.match(/^(\d+)의 (\d+)%$/))) return m[1] * m[2] / 100;
  if ((m = t.match(/^(\d+)의 (\d+)\/(\d+)$/))) return m[1] * m[2] / m[3];
  if ((m = t.match(/^(\d+):(\d+) = (\d+):□$/))) return m[3] * m[2] / m[1];
  return Function(`return (${t.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-")})`)(); };
const eq = (a, b) => Math.abs(a - b) < 1e-9; let bad = 0; const fail = (m, x) => { if (bad++ < 12) console.log("실패:", m, JSON.stringify(x)); };
const seen = {};
for (let i = 0; i < 200000; i++) { const round = 1 + i % 8, q = duelQuestion(`시험${i}`, round), again = duelQuestion(`시험${i}`, round), v = exprVal(q.text);
  seen[q.text.replace(/[\d.]+/g, "#")] = 1;
  if (JSON.stringify(q) !== JSON.stringify(again)) fail("같은 시드인데 문제가 다름", q);
  if (!eq(labelVal(q.real), v)) fail("정답이 계산과 다름", { q, v });
  if (q.opts[q.realIdx] !== q.real) fail("정답 위치", q);
  if (q.opts.length !== 4) fail("보기 개수", q);
  const vals = q.opts.map(labelVal); if (new Set(vals.map(x => x.toFixed(6))).size !== 4) fail("값이 같은 보기", q);
  if (vals.filter(x => eq(x, v)).length !== 1) fail("정답이 하나가 아님", q);
  vals.forEach(x => { if (!(x > 0)) fail("0 이하 보기", q); });
  if (/undefined|NaN/.test(q.text + q.opts.join())) fail("글자 오류", q);
  q.opts.forEach(o => { const f = String(o).match(/^(\d+)\/(\d+)$/); if (f) { const g = (a, b) => b ? g(b, a % b) : a; if (g(+f[1], +f[2]) !== 1 || +f[2] === 1) fail("약분 안 된 보기", q); } }); }
console.log("문제 유형", Object.keys(seen).length, "가지 / 검사 끝, 실패", bad, "건"); process.exitCode = bad ? 1 : 0;
