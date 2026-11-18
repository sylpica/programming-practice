import { getDefinition } from "../../../js/types/registry.js";
const d = getDefinition("r");
const code = [
  "a <- c(1, NA)",
  "b <- c(1, NaN)",
  "e <- c(TRUE, FALSE)",
  "f <- 1:3",
  "g <- \"a\"",
  "h <- 2.5",
  "i <- NaN",
  "j <- c(1, Inf)",
  "k <- list(1, 2)",
].join("\n");
const r = await d.simulate(code, structuredClone(d.model.defaults));
console.log(JSON.stringify(r.paths?.[0]?.vars, null, 1));
console.log("err:", JSON.stringify(r.error ?? r.paths?.[0]?.error ?? null));
