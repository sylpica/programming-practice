import { getDefinition } from "../../../js/types/registry.js";
const d = getDefinition("r");
const r = await d.simulate("z <- mean(c(1, NA))\nw <- NULL\nu <- numeric(0)\ns <- c(\"a\", \"b\")", structuredClone(d.model.defaults));
const p = r.paths?.[0];
console.log("path keys:", Object.keys(p ?? {}));
console.log(JSON.stringify(p, null, 1).slice(0, 2500));
