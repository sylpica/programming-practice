// 収束ラウンド A4: R 差分バッテリ（アプリ側）
// 各ケースを z <- <式> で実行し、最終状態の値を正規形で TSV 出力する。
// 正規形: NULL / EMPTY / [elem,...]（elem は数値文字列・NA・NaN・Inf・-Inf・TRUE・FALSE・"文字列"）
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
  if (typeof e === "object" && e.kind) return e.kind; // NA 等
  return "OTHER:" + JSON.stringify(e);
}
function ser(v) {
  if (v === null || v === undefined) return "NULL";
  if (Array.isArray(v)) {
    if (v.length === 0) return "EMPTY";
    return "[" + v.map(serElem).join(",") + "]";
  }
  return "[" + serElem(v) + "]";
}

const INPUTS = {
  NUL: "NULL", E0: "numeric(0)", NA: "NA", NAN: "NaN", VNA: "c(1, NA)",
  VNAN: "c(1, NaN)", V123: "c(1, 2, 3)", CH: 'c("a", "b")',
  LG: "c(TRUE, FALSE)", INF: "Inf", CE0: "character(0)", LG0: "logical(0)",
};
const F = (fn, ...ins) => ins.map((i) => [`${fn}:${i}`, `${fn}(${INPUTS[i]})`]);
const cases = [
  ...F("mean", "NUL", "E0", "NA", "NAN", "VNA", "VNAN", "V123", "CH", "LG", "INF"),
  ["mean:VNA+na.rm", "mean(c(1, NA), na.rm = TRUE)"],
  ["mean:VNAN+na.rm", "mean(c(1, NaN), na.rm = TRUE)"],
  ["mean:str", 'mean("a")'],
  ...F("median", "NAN", "NA", "VNA", "V123", "LG", "CH"),
  ["sd:V123", "sd(c(1, 2, 3))"],
  ["sd:single", "sd(5)"],
  ["sd:VNA", "sd(c(1, NA))"],
  ["sd:CH", 'sd(c("a", "b"))'],
  ["sd:numstr+na.rm", 'sd(c("a", "1", "2"), na.rm = TRUE)'],
  ...F("var", "V123", "VNA", "CH"),
  ...F("sum", "NUL", "E0", "NA", "VNA", "V123", "LG", "CH", "INF"),
  ["sum:VNA+na.rm", "sum(c(1, NA), na.rm = TRUE)"],
  ...F("prod", "V123", "NA", "E0"),
  ...F("min", "NUL", "E0", "NA", "VNA", "V123", "CH"),
  ["min:VNA+na.rm", "min(c(1, NA), na.rm = TRUE)"],
  ...F("max", "NUL", "E0", "NA", "V123", "CH"),
  ...F("range", "V123", "NA", "NUL"),
  ...F("length", "NUL", "E0", "V123", "CE0", "CH"),
  ["sort:rev", "sort(c(3, 1, 2))"],
  ["sort:VNA", "sort(c(1, NA))"],
  ["sort:CH", 'sort(c("b", "a"))'],
  ["sort:NUL", "sort(NULL)"],
  ...F("rev", "V123", "E0"),
  ["unique:dupNA", "unique(c(1, NA, 1, NaN, NaN))"],
  ["unique:dup", "unique(c(1, 1, 2))"],
  ...F("cumsum", "V123", "VNA"),
  ["abs:mix", "abs(c(-1, 2))"],
  ["abs:NA", "abs(NA)"],
  ["sqrt:V", "sqrt(c(4, 9))"],
  ["sqrt:neg", "sqrt(-1)"],
  ["sqrt:NA", "sqrt(NA)"],
  ["log:V", "log(c(1, 2.718281828459045))"],
  ["log:zero", "log(0)"],
  ["log:neg", "log(-1)"],
  ["exp:V", "exp(c(0, 1))"],
  ["exp:NA", "exp(NA)"],
  ["round:V", "round(c(1.5, 2.5))"],
  ["round:NA", "round(NA)"],
  ...F("any", "LG"),
  ["any:TNA", "any(c(TRUE, NA))"],
  ["any:FNA", "any(c(FALSE, NA))"],
  ["any:LG0", "any(logical(0))"],
  ...F("all", "LG"),
  ["all:TNA", "all(c(TRUE, NA))"],
  ["all:TT", "all(c(TRUE, TRUE))"],
  ["all:LG0", "all(logical(0))"],
  ["sign:V", "sign(c(-2, 0, 3))"],
  ["sign:NA", "sign(NA)"],
  ["floor:V", "floor(c(1.5, -1.5))"],
  ["ceiling:V", "ceiling(c(1.5, -1.5))"],
  ["as.numeric:CH", 'as.numeric(c("a", "b"))'],
  ["as.numeric:numstr", 'as.numeric("3.5")'],
  ["as.numeric:NAN", "as.numeric(NaN)"],
  ["as.numeric:NA", "as.numeric(NA)"],
  ["as.numeric:LG", "as.numeric(c(TRUE, FALSE))"],
  ["as.character:1e20", "as.character(1e20)"],
  ["as.character:V123", "as.character(c(1, 2, 3))"],
  ["as.character:LG", "as.character(c(TRUE, FALSE))"],
  ["as.character:NA", "as.character(NA)"],
  ["as.character:INF", "as.character(Inf)"],
  ["head:1to10", "head(1:10)"],
  ["tail:1to10", "tail(1:10)"],
];

for (const [id, call] of cases) {
  const r = await d.simulate(`z <- ${call}`, structuredClone(d.model.defaults));
  const p = r.paths?.[0];
  const err = r.error ?? p?.error ?? null;
  const warn = (p?.trace ?? []).some((t) => t.kind === "warning") ? 1 : 0;
  const val = err ? "-" : ser(p?.vars?.z);
  console.log(`${id}\t${err ? 1 : 0}\t${warn}\t${val}\t${err ? (err.message ?? "") : ""}`);
}
