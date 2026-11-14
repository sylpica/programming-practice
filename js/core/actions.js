import { parseJsonLocated } from "./data.js";
import { parseExpression, PracticeError } from "./script.js";
export function actionProgram(
  code,
  { key = "actions", command = "action", classify },
) {
  let { data, locations } = parseJsonLocated(code);
  if (!Array.isArray(data[key]))
    throw new PracticeError(key + " 配列が必要です", 1);
  let i = 0;
  function block(stops = []) {
    let nodes = [];
    while (i < data[key].length) {
      let item = data[key][i],
        index = i,
        tag = item?.[command];
      if (typeof tag !== "string")
        throw new PracticeError(
          command + " は文字列で指定してください",
          locations.get("/" + key + "/" + i) || 1,
        );
      let type = classify(tag);
      if (stops.includes(type)) break;
      let line = locations.get("/" + key + "/" + i) || 1;
      i++;
      let base = {
        k: "action",
        action: tag,
        item,
        index,
        line,
        nodeId: "action-" + index,
        refs: [tag],
      };
      if (type === "if") {
        let branches = [
          {
            ...base,
            test: item.condition ?? item.Target,
            body: block(["elseif", "else", "end"]),
          },
        ];
        while (
          i < data[key].length &&
          classify(data[key][i][command]) === "elseif"
        ) {
          let alt = data[key][i],
            at = i++;
          branches.push({
            ...base,
            item: alt,
            line: locations.get("/" + key + "/" + at) || 1,
            nodeId: "action-" + at,
            refs: [alt[command]],
            test: alt.condition ?? alt.Target,
            body: block(["elseif", "else", "end"]),
          });
        }
        let otherwise = [];
        if (
          i < data[key].length &&
          classify(data[key][i][command]) === "else"
        ) {
          i++;
          otherwise = block(["end"]);
        }
        if (i >= data[key].length || classify(data[key][i][command]) !== "end")
          throw new PracticeError("条件分岐に対応するEndがありません", line);
        i++;
        let nested = otherwise;
        for (let b of branches.reverse())
          nested = [{ ...b, k: "action-if", otherwise: nested }];
        nodes.push(...nested);
        continue;
      }
      if (type === "loop" || type === "each" || type === "while") {
        let body = block(["end"]);
        if (i >= data[key].length || classify(data[key][i][command]) !== "end")
          throw new PracticeError("ループに対応するEndがありません", line);
        i++;
        nodes.push({ ...base, k: "action-loop", mode: type, body });
        continue;
      }
      if (["end", "else", "elseif"].includes(type))
        throw new PracticeError("対応する開始アクションがありません", line);
      nodes.push(base);
    }
    return nodes;
  }
  return { data, nodes: block() };
}
export function valueExpression(value, dialect = "js") {
  if (typeof value !== "string") return { k: "literal", value, line: 1 };
  if (/^%[\s\S]*%$/.test(value))
    return parseExpression(value.slice(1, -1), dialect);
  return { k: "literal", value, line: 1 };
}
export function interpolate(text, s) {
  if (typeof text !== "string") return text;
  let unknownValue;
  let value = text.replace(/\$\{([^}]+)\}|%([A-Za-z_]\w*)%/g, (_, a, b) => {
    let key = a || b;
    if (!Object.hasOwn(s.vars, key))
      throw new PracticeError("変数がありません：" + key);
    let v = s.vars[key];
    if (v?.kind === "unknown") {
      unknownValue = v;
      return "";
    }
    return String(v);
  });
  return unknownValue
    ? { ...unknownValue, source: "変数を展開した文字列による" }
    : value;
}
export function uiCondition(text, s, api) {
  if (typeof text === "boolean") return text;
  if (typeof text !== "string")
    throw new PracticeError("条件は式で指定してください");
  let vars = {};
  text = text
    .replace(/(["'])\$\{([^}]+)\}\1/g, "${$2}")
    .replace(/\$\{([^}]+)\}|%([A-Za-z_]\w*)%/g, (_, a, b) => {
      let key = a || b;
      if (!Object.hasOwn(s.vars, key))
        throw new PracticeError("変数がありません：" + key);
      let id = "__condition_" + Object.keys(vars).length;
      vars[id] = s.vars[key];
      return id;
    });
  let previous = {};
  for (let [k, v] of Object.entries(vars)) {
    previous[k] = s.vars[k];
    s.vars[k] = v;
  }
  try {
    return api.read(parseExpression(text), s);
  } finally {
    for (let k of Object.keys(vars)) delete s.vars[k];
  }
}
