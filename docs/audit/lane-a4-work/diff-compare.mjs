// 収束ラウンド A4: 差分バッテリ突合（アプリ TSV vs 実 R TSV）
// 数値は相対誤差 1e-9 で比較。それ以外は完全一致を要求する。
import { readFileSync } from "node:fs";

const load = (path) => {
  const m = new Map();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const [id, err, warn, val, msg] = line.split("\t");
    m.set(id, { err: err === "1", warn: warn === "1", val, msg: msg ?? "" });
  }
  return m;
};
const app = load(process.argv[2]);
const real = load(process.argv[3]);

function elems(v) {
  if (v === "NULL" || v === "EMPTY" || v === "-") return v;
  return v.slice(1, -1).split(",");
}
function numEq(a, b) {
  const na = Number(a), nb = Number(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return a === b;
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return a === b;
  const diff = Math.abs(na - nb);
  return diff <= 1e-9 * Math.max(1, Math.abs(na), Math.abs(nb));
}
function valEq(a, b) {
  if (a === b) return true;
  const ea = elems(a), eb = elems(b);
  if (typeof ea === "string" || typeof eb === "string") return false;
  if (ea.length !== eb.length) return false;
  return ea.every((x, i) => x === eb[i] || numEq(x, eb[i]));
}

let match = 0;
const mismatches = [];
for (const [id, r] of real) {
  const a = app.get(id);
  if (!a) { mismatches.push(`${id}: アプリ側にケースなし`); continue; }
  const problems = [];
  if (a.err !== r.err) problems.push(`err app=${a.err} real=${r.err} (appMsg=${a.msg} realMsg=${r.msg})`);
  if (!a.err && !r.err) {
    if (a.warn !== r.warn) problems.push(`warn app=${a.warn} real=${r.warn}`);
    if (!valEq(a.val, r.val)) problems.push(`val app=${a.val} real=${r.val}`);
  }
  if (problems.length) mismatches.push(`${id}: ${problems.join("; ")}`);
  else match++;
}
console.log(`cases=${real.size} match=${match} mismatch=${mismatches.length}`);
for (const m of mismatches) console.log("MISMATCH " + m);
