import { pathToFileURL } from "node:url";
const ROOT = process.env.TREE_ROOT;
const { getDefinition } = await import(pathToFileURL(ROOT + "/js/types/registry.js"));
const FORMS = [
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
const d = getDefinition("r");
for (let i = 0; i < FORMS.length; i++) {
  const r = await d.simulate(`x <- 1\nprint(names(data.frame(${FORMS[i]})))`, structuredClone(d.model.defaults));
  const p = r.paths?.[0];
  const err = r.error ?? p?.error ?? null;
  const out = (p?.outputs ?? [])[0]?.text ?? "";
  const mm = out.match(/^c\("(.*)"\)$/) ?? out.match(/^"(.*)"$/);
  console.log(`${i + 1}\t${err ? `ERR:${err.message}` : (mm ? mm[1] : out)}`);
}
