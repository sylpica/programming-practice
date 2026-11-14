import { isUnknown } from "./contract.js";
const PracticeError = class extends Error {
  constructor(message, line = 1, category = "未対応") {
    super(message);
    this.line = line;
    this.category = category;
  }
};
// DNF domains retain every viable alternative without inventing a concrete input value.
export function refineCondition(
  value,
  yes,
  alternatives = [{}],
  check = () => {},
) {
  function atomKey(v) {
    return v.id || v.symbol || v.source;
  }
  function test(op, a, b) {
    return op === "="
      ? a === b
      : op === "<>"
        ? a !== b
        : op === "<"
          ? a < b
          : op === ">"
            ? a > b
            : op === "<="
              ? a <= b
              : a >= b;
  }
  function solve(v, want, domain) {
    check();
    if (!isUnknown(v)) return Boolean(v) === want ? [domain] : [];
    if (v.op === "!" || v.op === "not") return solve(v.a, !want, domain);
    if (["&&", "and", "||", "or"].includes(v.op)) {
      let conjunction = ["&&", "and"].includes(v.op);
      let combos = conjunction
        ? want
          ? [[true, true]]
          : [
              [false, false],
              [false, true],
              [true, false],
            ]
        : want
          ? [
              [true, true],
              [true, false],
              [false, true],
            ]
          : [[false, false]];
      let out = [];
      for (let [a, b] of combos)
        for (let st of solve(v.a, a, structuredClone(domain)))
          out.push(...solve(v.b, b, st));
      if (out.length > 128)
        throw new PracticeError(
          "未確定条件の組み合わせが複雑すぎます",
          1,
          "未対応",
        );
      return out;
    }
    let predicate = JSON.stringify(v);
    if (domain["predicate:" + predicate] !== undefined)
      return domain["predicate:" + predicate] === want ? [domain] : [];
    if (
      ["=", "==", "===", "!=", "!==", "<>", "<", ">", "<=", ">="].includes(v.op)
    ) {
      let { a, b, op } = v;
      if (!isUnknown(a) && isUnknown(b)) {
        [a, b] = [b, a];
        op = { "<": ">", ">": "<", "<=": ">=", ">=": "<=" }[op] || op;
      }
      if (isUnknown(a) && a.op && typeof b === "number") {
        let linear = linearize(a);
        if (linear && linear.scale) {
          b = (b - linear.offset) / linear.scale;
          if (linear.scale < 0)
            op = { "<": ">", ">": "<", "<=": ">=", ">=": "<=" }[op] || op;
          a = linear.atom;
        }
      }
      if (isUnknown(a) && !a.op && !isUnknown(b)) {
        if (op === "===" || op === "==") op = "=";
        if (op === "!==" || op === "!=") op = "<>";
        if (!want)
          op = {
            "=": "<>",
            "<>": "=",
            "<": ">=",
            ">": "<=",
            "<=": ">",
            ">=": "<",
          }[op];
        let key = "atom:" + atomKey(a),
          conditions = domain[key] || [];
        conditions.push({ op, value: b });
        let equal = conditions.find((c) => c.op === "=");
        if (equal) {
          if (conditions.some((c) => !test(c.op, equal.value, c.value)))
            return [];
        } else {
          let lo,
            hi,
            loOpen = false,
            hiOpen = false;
          for (let c of conditions) {
            if (c.op === ">" || c.op === ">=") {
              if (lo === undefined || c.value > lo) {
                lo = c.value;
                loOpen = c.op === ">";
              } else if (c.value === lo) loOpen ||= c.op === ">";
            }
            if (c.op === "<" || c.op === "<=") {
              if (hi === undefined || c.value < hi) {
                hi = c.value;
                hiOpen = c.op === "<";
              } else if (c.value === hi) hiOpen ||= c.op === "<";
            }
          }
          if (
            lo !== undefined &&
            hi !== undefined &&
            (lo > hi ||
              (lo === hi &&
                (loOpen ||
                  hiOpen ||
                  conditions.some((c) => c.op === "<>" && c.value === lo))))
          )
            return [];
        }
        domain[key] = conditions;
      } else if (
        isUnknown(a) &&
        isUnknown(b) &&
        JSON.stringify(a) === JSON.stringify(b)
      ) {
        if (["=", "==", "===", "<=", ">="].includes(op) !== want) return [];
      } else
        throw new PracticeError(
          "複数の未確定値・非線形式を組み合わせた比較は未対応です",
          1,
          "未対応",
        );
    }
    domain["predicate:" + predicate] = want;
    return [domain];
  }
  let out = [];
  for (let domain of alternatives)
    out.push(...solve(value, yes, structuredClone(domain)));
  if (out.length > 128)
    throw new PracticeError(
      "未確定条件の組み合わせが複雑すぎます",
      1,
      "未対応",
    );
  return out;
}
function linearize(v) {
  if (!isUnknown(v)) return null;
  if (!v.op) return { atom: v, scale: 1, offset: 0 };
  let x = linearize(v.a);
  if (!x) return null;
  if (v.op === "-" && v.b === undefined)
    return { ...x, scale: -x.scale, offset: -x.offset };
  if (typeof v.b !== "number") return null;
  if (v.op === "+") return { ...x, offset: x.offset + v.b };
  if (v.op === "-") return { ...x, offset: x.offset - v.b };
  if (v.op === "*")
    return { ...x, scale: x.scale * v.b, offset: x.offset * v.b };
  if (v.op === "/" && v.b)
    return { ...x, scale: x.scale / v.b, offset: x.offset / v.b };
  return null;
}
