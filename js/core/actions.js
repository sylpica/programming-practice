import { parseJsonLocated } from "./data.js";
import { parseExpression, PracticeError } from "./script.js";
export function actionProgram(
  code,
  { key = "actions", command = "action", classify },
) {
  let { data, locations } = parseJsonLocated(code);
  // RG-10（R19-N4）: 入力が null の場合も、生の TypeError ではなく
  // 他の不正な形と同じ「配列が必要です」で停止する。
  if (!Array.isArray(data?.[key]))
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
      if (type === "unsupported-block") {
        let body = block(["end"]);
        if (i >= data[key].length || classify(data[key][i][command]) !== "end")
          throw new PracticeError(tag + " に対応するEndがありません", line);
        i++;
        nodes.push({ ...base, body });
        continue;
      }
      // 高度モード（UI.Vision）: do ... repeatIf。classify が "do" を返す
      // 種類でのみ到達する（他種類は "do" を返さないため無影響）。
      // 本体は対応する "repeatIf" までで、条件は repeatIf 項目の Target、
      // ノードの item は repeatIf 項目とする（契約 adv-b1）。
      if (type === "do") {
        let body = block(["repeatIf"]);
        if (
          i >= data[key].length ||
          classify(data[key][i][command]) !== "repeatIf"
        )
          throw new PracticeError("do に対応するrepeatIfがありません", line);
        let repItem = data[key][i],
          repIndex = i,
          repLine = locations.get("/" + key + "/" + i) || 1;
        i++;
        nodes.push({
          ...base,
          k: "action-loop",
          mode: "do",
          body,
          test: repItem.Target,
          item: repItem,
          line: repLine,
          nodeId: "action-" + repIndex,
          refs: [tag, repItem[command]],
        });
        continue;
      }
      if (type === "repeatIf")
        throw new PracticeError(
          "対応する開始アクションがありません：repeatIf には対応する do が必要です",
          line,
        );
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
// R7-121（修正バッチ13・fxb班）: UI.Vision のように変数名の大小文字を
// 区別しない種類向けに、caseInsensitive オプションを用意する。指定が
// 無い種類では従来どおり完全一致で解決し、挙動は変わらない。表示上の
// キー（最初に書かれた綴り）は保持し、参照側の綴り違いだけを吸収する。
export function resolveVarKey(vars, key, caseInsensitive) {
  if (Object.hasOwn(vars, key)) return key;
  if (!caseInsensitive) return undefined;
  const upper = String(key).toUpperCase();
  return Object.keys(vars).find((k) => k.toUpperCase() === upper);
}
export function interpolate(text, s, options = {}) {
  if (typeof text !== "string") return text;
  let unknownValue;
  let value = text.replace(/\$\{([^}]+)\}|%([A-Za-z_]\w*)%/g, (_, a, b) => {
    let key = resolveVarKey(s.vars, a || b, options.caseInsensitive) ?? (a || b);
    if (!Object.hasOwn(s.vars, key)) {
      if (b && (key === "True" || key === "False")) return key;
      throw new PracticeError("変数がありません：" + key);
    }
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
export function uiCondition(text, s, api, options = {}) {
  if (typeof text === "boolean") return text;
  if (typeof text !== "string")
    throw new PracticeError("条件は式で指定してください");
  let vars = {};
  let put = (key, percentStyle, asString) => {
    // R7-121: caseInsensitive 指定時は綴り違いのキーを解決してから読む。
    let resolved = resolveVarKey(s.vars, key, options.caseInsensitive);
    if (resolved === undefined) {
      if (percentStyle && (key === "True" || key === "False"))
        return key === "True" ? "true" : "false";
      throw new PracticeError("変数がありません：" + key);
    }
    let id = "__condition_" + Object.keys(vars).length;
    let v = s.vars[resolved];
    vars[id] =
      !asString &&
      typeof v === "string" &&
      v.trim() !== "" &&
      !Number.isNaN(Number(v))
        ? Number(v)
        : v;
    return id;
  };
  text = text
    .replace(/(["'])\$\{([^}]+)\}\1/g, (_, q, name) => put(name, false, true))
    .replace(/\$\{([^}]+)\}|%([A-Za-z_]\w*)%/g, (_, a, b) =>
      put(a || b, Boolean(b), false),
    );
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
