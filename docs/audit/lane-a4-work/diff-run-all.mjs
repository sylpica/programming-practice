// 収束ラウンド A4: 差分バッテリ統合ランナー（アプリ実測×実 R 実測を同一プロセスで突合）
// シェルのリダイレクトが書き込み障害で空になる環境のため、ファイル経由にしない。
import { execFileSync } from "node:child_process";
import { getDefinition } from "../../../js/types/registry.js";

const d = getDefinition("r");
function serElem(e) {
  if (e === null || e === undefined) return "NA";
  if (typeof e === "number") return String(e);
  if (typeof e === "string") {
    if (e === "NaN" || e === "Inf" || e === "-Inf") return e;
    return `"${e}"`;
  }
  if (typeof e === "boolean") return e ? "TRUE" : "FALSE";
  if (typeof e === "object" && e.kind) return e.kind;
  return "OTHER";
}
function ser(v) {
  if (v === null || v === undefined) return "NULL";
  if (Array.isArray(v)) return v.length === 0 ? "EMPTY" : "[" + v.map(serElem).join(",") + "]";
  return "[" + serElem(v) + "]";
}

const appTsv = execFileSync("node", ["docs/audit/lane-a4-work/diff-r-app.mjs"], { cwd: process.cwd(), encoding: "utf8", maxBuffer: 1 << 24 });
const realTsv = execFileSync("Rscript", ["docs/audit/lane-a4-work/diff-r-real.R"], { cwd: process.cwd(), encoding: "utf8", maxBuffer: 1 << 24 });

const load = (tsv) => {
  const m = new Map();
  for (const line of tsv.split("\n")) {
    if (!line.trim()) continue;
    const [id, err, warn, val, msg] = line.split("\t");
    m.set(id, { err: err === "1", warn: Number(warn) > 0, val, msg: msg ?? "" });
  }
  return m;
};
const app = load(appTsv), real = load(realTsv);
const elems = (v) => (v === "NULL" || v === "EMPTY" || v === "-" ? v : v.slice(1, -1).split(","));
function numEq(a, b) {
  const na = Number(a), nb = Number(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return a === b;
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return a === b;
  return Math.abs(na - nb) <= 1e-9 * Math.max(1, Math.abs(na), Math.abs(nb));
}
function valEq(a, b) {
  if (a === b) return true;
  const ea = elems(a), eb = elems(b);
  if (typeof ea === "string" || typeof eb === "string") return false;
  return ea.length === eb.length && ea.every((x, i) => x === eb[i] || numEq(x, eb[i]));
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
