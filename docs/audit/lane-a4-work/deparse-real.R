## 収束ラウンド A4: deparse 拡張スイープ（実 R 側）
## names(data.frame(<式>)) の第1要素を TSV 出力する。
forms <- c(
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
  "x[(1)]", "(sin(1))", "((x + 1))"
)
x <- 1
for (i in seq_along(forms)) {
  nm <- tryCatch({
    expr <- parse(text = forms[i])[[1]]
    v <- names(eval(call("data.frame", expr)))
    if (is.null(v)) "NULLNAME" else v[1]
  }, error = function(e) paste0("ERR:", conditionMessage(e)))
  cat(i, "\t", nm, "\n", sep = "")
}
