show <- function(label, expr) {
  r <- tryCatch({ v <- expr; paste0("OK len=", length(v), " is.null=", is.null(v)) },
                error = function(e) paste0("ERR: ", conditionMessage(e)))
  cat(label, "=>", r, "\n")
}
show("order()", order())
show("order(1:3, NULL)", order(1:3, NULL))
show("order(NULL, 1:3)", order(NULL, 1:3))
show("order(NULL)", order(NULL))
show("sort.list(NULL)", sort.list(NULL))
show("order(na.last=TRUE, NULL)", order(na.last = TRUE, NULL))
