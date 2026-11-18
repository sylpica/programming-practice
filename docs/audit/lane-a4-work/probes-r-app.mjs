// 収束ラウンド A4: R プローブ全38件（probes.md 第2部）のアプリ側再実行。
// 出力は id ごとに正規化した1行。実 R 側（probes-r-real.R）と突き合わせて裁定する。
import { getDefinition } from "../../../js/types/registry.js";

const d = getDefinition("r");
const run = async (code) => d.simulate(code, structuredClone(d.model.defaults));
const probe = async (code) => {
  const r = await run(code);
  const top = r.error ?? null;
  const p = r.paths?.[0];
  const err = top ?? p?.error ?? null;
  const outs = (p?.outputs ?? []).map((o) => o.text);
  const warns = (p?.trace ?? []).filter((t) => t.kind === "warning").length;
  return { err: err ? (err.message ?? String(err)) : null, outs, warns, truncated: r.truncated };
};

// [id, code] — code は単一の出力行を出すよう設計（cat 優先、print は表示形確認用に限定）
const cases = [
  ["R1", 'cat(mean(NULL))'],
  ["R2a", 'cat(mean(numeric(0)))'],
  ["R2b", 'cat(mean(c(1, 2, NA)))'],
  ["R2c", 'cat(mean(c(1, 2, NA), na.rm = TRUE))'],
  ["R3a", 'cat(length(median(NULL)))'],
  ["R3b", 'cat(median(NA_real_))'],
  ["R3c", 'cat(median(NaN))'],
  ["R4a", 'cat(median(c(TRUE, FALSE, TRUE)))'],
  ["R4b", 'cat(median(c(1, 2, 3, 4)))'],
  ["R5a", 'cat(as.numeric(NaN))'],
  ["R5b", 'cat(is.na(NaN), is.nan(NA_real_), is.nan(NaN))'],
  ["R6", 'cat(NaN %in% NA_real_, NA %in% NaN, NaN %in% NaN, NA %in% NA)'],
  ["R7", 'cat(1 ^ NA, NA ^ 0, 0 ^ 0)'],
  ["R8", 'cat(1 / 0, -1 / 0, 0 / 0, 5 %% 0, 5 %/% 0)'],
  ["R9a", 'cat(rep(1:3, times = 2), sep = ",")'],
  ["R9b", 'cat(rep(1:3, each = 2), sep = ",")'],
  ["R9c", 'cat(rep(1:3, length.out = 5), sep = ",")'],
  ["R10a", 'cat(seq_len(3), sep = ",")'],
  ["R10b", 'cat(length(seq_len(0)))'],
  ["R10c", 'cat(seq(2, 5), sep = ",")'],
  ["R10d", 'cat(1:0, sep = ",")'],
  ["R11a", 'cat(c(1, "a"), sep = ",")'],
  ["R11b", 'cat(c(1, TRUE), sep = ",")'],
  ["R11c", 'x <- c(x = 1, use.names = FALSE); cat(length(x), is.null(names(x)), x)'],
  ["R12a", 'cat(as.character(1e20))'],
  ["R12b", 'cat(as.character(0.1))'],
  ["R12c", 'print(1 / 3)'],
  ["R13a", 'print(names(data.frame(1 + 1)))'],
  ["R13b", 'print(names(data.frame(x = 1 + 1)))'],
  ["R13c", 'print(names(data.frame(2 * 3)))'],
  ["R13d", 'print(names(data.frame(sin(1))))'],
  ["R14", 'print(names(data.frame((1 + 1))))'],
  ["R15a", 'x <- list(a = list(b = 42)); cat(x[[c("a", "b")]])'],
  ["R15b", 'cat((1:3)[5])'],
  ["R15c", 'cat(length((1:3)[0]))'],
  ["R15d", 'cat((1:3)[-1], sep = ",")'],
  ["R16a", 'v <- c(a = 1); w <- v["zzz"]; cat(w, is.na(names(w)))'],
  ["R16b", 'v <- c(a = 1); v["b"] <- 2; cat(names(v), sep = ",")'],
  ["R17", 'cat(names(c(a = 1, 2)), sep = "|")'],
  ["R18", 'v <- c(1, 2); v[1] <- "a"; cat(v, sep = ",")'],
  ["R19a", 'df <- data.frame(a = 1:3); df$a <- NULL; cat(nrow(df), ncol(df))'],
  ["R19b", 'df0 <- data.frame(x = numeric(0)); df0$y <- 1; cat("noerror")'],
  ["R20", 'df <- data.frame(a = 1:2, b = 3:4); cat(ncol(df[, TRUE]))'],
  ["R21a", 'cat(1:3, sep = "-")'],
  ["R21b", 'print("a", quote = TRUE)'],
  ["R22a", 'd <- read.csv(text = "a,b\\n1,2"); cat(names(d), sep = ",")'],
  ["R22b", 'd <- read.csv(text = "a,b\\n1,2", header = FALSE); cat(names(d), sep = ",")'],
  ["R22c", 'd <- read.csv(text = "a,b\\n1,2", colClasses = c("character", "character")); cat(class(d$b))'],
  ["R23a", 'cat(sd(c(1, 2, 3)))'],
  ["R23b", 'cat(sd(5))'],
  ["R23c", 'cat(mean(1:3, trim = 0))'],
  ["R24", 'cat(NaN == "NaN")'],
  ["R25", 'cat(nosuchfun(1))'],
  ["R26a", 'cat(quantile(c(1, 2, 3, 4), 0.25))'],
  ["R26b", 'cat(var(c(1, 2, 3)))'],
  ["R27a", 'cat(head(1:10), sep = ",")'],
  ["R27b", 'cat(tail(1:10), sep = ",")'],
  ["R28a", 'x <- rnorm(3); cat(length(x))'],
  ["R28b", 'x <- runif(3); cat(length(x))'],
  ["RB1a", 'cat(seq_len(NULL))'],
  ["RB1b", 'cat(length(seq(NULL)))'],
  ["RB2", 'cat(rep(1, times = -1))'],
  ["RB3", 'cat(numeric(0) + "a")'],
  ["RB4a", 'df <- data.frame(a = 1:3, b = 1:2); cat("noerror")'],
  ["RB4b", 'df <- data.frame(a = 1:3, b = 1); cat(nrow(df))'],
  ["RB5", 'cat((1:3)[c(-1, 2)])'],
  ["RB6", 'cat(mean(1:3, trim = NULL))'],
  ["RB7", 'cat(length(as.numeric()))'],
  ["RB8a", 'cat(length(logical(0) & TRUE))'],
  ["RB8b", 'cat(length(numeric(0) + 1))'],
  ["RB9", 'cat(sum(1:100000))'],
  ["RB10", 'if (c(TRUE, TRUE)) 1; cat("noerror")'],
];

for (const [id, code] of cases) {
  let res;
  try { res = await probe(code); } catch (e) { res = { err: "THROWN " + String(e) }; }
  console.log(`${id}\terr=${res.err ?? "-"}\twarn=${res.warns ?? 0}\touts=${JSON.stringify(res.outs)}`);
}
