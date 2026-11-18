// 収束ラウンド A4: deparse 拡張スイープ統合ランナー
// アプリ names(data.frame(<式>)) と実 R を突合する。
// 括弧形（PAREN_IDS）は R7-27 の開示済みモデル制限として別枠で数える。
import { execFileSync } from "node:child_process";
import { getDefinition } from "../../../js/types/registry.js";

export const FORMS = [
  "1", "1.5", "\"a\"", "TRUE", "x",
  "-1", "-x", "!TRUE", "!x", "+1", "+x", "-1.5",
  "1 + 1", "1 - 2", "2 * 3", "1 / 2", "2 ^ 3", "5 %% 2", "5 %/% 2",
  "1 == 1", "1 < 2", "TRUE & FALSE", "TRUE | FALSE", "1 : 3",
  "x + 1", "x * x", "x == 1", "-x + 1", "1 + x * 2", "x : 3",
  "sin(1)", "cos(x)", "sqrt(4)", "abs(-1)", "log(8)", "log(8, 2)", "exp(1)",
  "round(1.5)", "mean(c(1, 2))", "sum(1, 2)", "c(1, 2)", "c(x, 1)",
  "paste(\"a\")", "paste(\"a\", \"b\")", "paste0(\"a\")",
  "sin(1) + cos(2)", "-sin(1)", "!(TRUE & FALSE)", "sqrt(abs(-4))",
  "1 + 2 * 3", "2 * 3 + 1", "sin(cos(1))", "log(exp(1))",
  "x[1]", "x[[1]]", "x[1:2]", "-x[1]", "length(x)", "is.na(x)",
  "as.numeric(\"1\")", "as.character(1)", "factor(\"a\")",
  "1 %in% c(1, 2)", "x > 0 & x < 2", "!is.na(x)", "- -1", "1 + -2",
  "TRUE == TRUE", "\"a\" == \"a\"", "max(1, 2)", "min(x, 1)",
  "seq(1, 3)", "rep(1, 2)", "rev(x)", "sort(x)", "unique(x)",
  "head(x)", "tail(x)", "ifelse(TRUE, 1, 2)", "x %% 2 == 0",
  "(1 + 1)", "(x)", "((1))", "(1 + 2) * 3", "-(1 + 1)", "(-1) ^ 2", "(!TRUE)",
  "x[(1)]", "(sin(1))", "((x + 1))",
];
const PAREN_START = 81; // 1-indexed: forms 81.. は括弧形

const d = getDefinition("r");
const appNames = new Map();
for (let i = 0; i < FORMS.length; i++) {
  const r = await d.simulate(`x <- 1\nprint(names(data.frame(${FORMS[i]})))`, structuredClone(d.model.defaults));
  const p = r.paths?.[0];
  const err = r.error ?? p?.error ?? null;
  // print(names(...)) は c("name") 形式。先頭要素を取り出す。
  const out = (p?.outputs ?? [])[0]?.text ?? "";
  const m = out.match(/^c\("(.*)"\)$/) ?? out.match(/^"(.*)"$/);
  appNames.set(i + 1, err ? `ERR:${err.message}` : (m ? m[1] : out));
}

const realTsv = execFileSync("Rscript", ["docs/audit/lane-a4-work/deparse-real.R"], { cwd: process.cwd(), encoding: "utf8", maxBuffer: 1 << 24 });
const realNames = new Map();
for (const line of realTsv.split("\n")) {
  if (!line.trim()) continue;
  const [id, nm] = line.split("\t");
  realNames.set(Number(id), nm);
}

let match = 0, parenDiff = 0;
const mismatches = [];
for (let i = 1; i <= FORMS.length; i++) {
  const a = appNames.get(i), r = realNames.get(i);
  if (a === r) { match++; continue; }
  if (i >= PAREN_START) { parenDiff++; mismatches.push(`PAREN ${i} ${FORMS[i - 1]}: app=${a} real=${r}`); }
  else mismatches.push(`MISMATCH ${i} ${FORMS[i - 1]}: app=${a} real=${r}`);
}
console.log(`forms=${FORMS.length} match=${match} parenDiff=${parenDiff} otherMismatch=${mismatches.length - parenDiff}`);
for (const m of mismatches) console.log(m);
