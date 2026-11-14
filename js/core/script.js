import { LIMITS, isUnknown, unknown, formatModelValue as formatValue } from "./contract.js";
import { refineCondition } from "./conditions.js";
export class PracticeError extends Error {
  constructor(message, line = 1, category = "エラー") {
    super(message);
    this.line = line;
    this.category = category;
  }
}
export function unsupported(text, line = 1) {
  throw new PracticeError(
    "この構文は説明に対応していません：" + text,
    line,
    "未対応",
  );
}
export function tokenize(source, dialect = "js") {
  let out = [],
    i = 0,
    line = 1;
  while (i < source.length) {
    let c = source[i],
      next = source[i + 1];
    if (c === "\n") {
      out.push({ v: "\n", line });
      line++;
      i++;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (
      (c === "/" && next === "/" && !["r", "ahk"].includes(dialect)) ||
      ((dialect === "r" || dialect === "python") && c === "#") ||
      (dialect === "ahk" && c === ";")
    ) {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      let end = source.indexOf("*/", i + 2);
      if (end < 0)
        throw new PracticeError("コメントが閉じられていません", line);
      line += source.slice(i, end + 2).split("\n").length - 1;
      i = end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      let quote = c,
        text = "",
        start = line;
      i++;
      let closed = false;
      while (i < source.length) {
        if (source[i] === quote) {
          if (
            (dialect === "fx" || dialect === "ahk") &&
            source[i + 1] === quote
          ) {
            text += quote;
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        if (source[i] === "\\" && dialect !== "ahk" && dialect !== "fx") {
          i++;
          let e = source[i++];
          if (e === "x" || e === "u" || e === "U" || /[1-7]/.test(e || ""))
            unsupported("未確認の文字エスケープ（実際の文字を入力してください）", start);
          const escapes = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", 0: "\0", "\\": "\\", '"': '"', "'": "'" };
          if (!Object.hasOwn(escapes, e))
            unsupported("未確認の文字エスケープ", start);
          text += escapes[e];
        } else if (source[i] === "`" && dialect === "ahk") {
          i++;
          text += { n: "\n", r: "\r", t: "\t" }[source[i]] ?? source[i];
          i++;
        } else {
          if (source[i] === "\n" && dialect !== "r")
            throw new PracticeError("文字列の途中で改行されています", start, "SyntaxError");
          if (source[i] === "\n") line++;
          text += source[i++];
        }
      }
      if (!closed) throw new PracticeError("文字列が閉じられていません", start);
      out.push({ v: text, k: "string", quote, line: start });
      continue;
    }
    if (dialect === "ahk" && source.slice(i, i + 2) === "//") unsupported("AutoHotkeyの整数除算 // は未対応です", line);
    let m = source
      .slice(i)
      .match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?:[LfF])?/);
    if (m) {
      out.push({ v: m[0], k: "number", line });
      i += m[0].length;
      continue;
    }
    m = source.slice(i).match(dialect === "js"
      ? /^[$_\p{ID_Start}][$\p{ID_Continue}\u200C\u200D]*(?:\.[A-Za-z_]\w*)*/u
      : /^[\p{ID_Start}_][\p{ID_Continue}_]*(?:\.[A-Za-z_]\w*)*/u);
    if (m) {
      let parts = dialect === "r" ? [m[0]] : m[0].split(".");
      parts.forEach((v, j) => {
        if (j) out.push({ v: ".", line });
        out.push({ v, k: "id", line });
      });
      i += m[0].length;
      continue;
    }
    m = source
      .slice(i)
      .match(
        /^(===|!==|%\/%|%%|%in%|<-|->|:=|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|<<|>>|::|=>|<>|\[\[|\]\]|[+\-*\/%^&|!<>=(){}\[\],;:.$?])/,
      );
    if (!m) unsupported(c, line);
    out.push({
      v:
        m[0] === "." &&
        dialect === "ahk" &&
        (/\s/.test(source[i - 1] || "") || /\s/.test(source[i + 1] || ""))
          ? ".concat"
          : m[0],
      line,
    });
    i += m[0].length;
  }
  out.push({ v: "<eof>", line });
  return out;
}
const prec = {
  or: 1,
  "||": 1,
  and: 2,
  "&&": 2,
  "|": 2,
  "&": 3,
  "=": 4,
  "==": 4,
  "===": 4,
  "!=": 4,
  "!==": 4,
  "<>": 4,
  "<": 4,
  ">": 4,
  "<=": 4,
  ">=": 4,
  "%in%": 4,
  ":": 5,
  ".": 6,
  ".concat": 6,
  "+": 7,
  "-": 7,
  "*": 8,
  "/": 8,
  "%": 8,
  "%%": 8,
  "%/%": 8,
  "^": 10,
};
const jsPrec = { "||": 1, "&&": 2, "|": 3, "^": 4, "&": 5,
  "==": 6, "!=": 6, "===": 6, "!==": 6,
  "<": 7, ">": 7, "<=": 7, ">=": 7,
  "+": 8, "-": 8, "*": 9, "/": 9, "%": 9 };
export class ScriptParser {
  constructor(source, dialect = "js") {
    if (source.length > LIMITS.source)
      throw new PracticeError("コードは100000文字以内にしてください");
    this.ts = tokenize(source, dialect);
    this.i = 0;
    this.dialect = dialect;
    this.depth = 0;
  }
  peek(v) {
    return this.ts[this.i]?.v === v;
  }
  take(v) {
    let t = this.ts[this.i++];
    if (v && t?.v !== v)
      throw new PracticeError(`${v} が必要です`, t?.line || 1);
    return t;
  }
  skip() {
    while (this.peek("\n") || this.peek(";")) this.i++;
  }
  expr(min = 0) {
    if (++this.depth > LIMITS.depth)
      throw new PracticeError("式の入れ子が深すぎます", this.ts[this.i]?.line);
    let t = this.take(),
      a;
    if (!t) throw new PracticeError("式が必要です");
    let meta = { line: t.line };
    if (t.k === "number" && this.dialect === "js" && /[LfF]$/.test(t.v))
      throw new PracticeError("JavaScriptに数値の型接尾辞はありません", t.line, "SyntaxError");
    if (t.k === "number")
      a = {
        ...meta,
        k: "literal",
        value: Number(t.v.replace(/[LfF]$/, "")),
        raw: t.v,
      };
    else if (t.k === "string") a = { ...meta, k: "literal", value: t.v, quote: t.quote };
    else if (t.v === "sizeof" && this.parseSizeof?.()) a = this.parseSizeof(meta, true);
    else if (["!", "not", "-", "+", "&", "*", ...(this.dialect === "js" ? ["typeof"] : []), ...(["c", "cpp"].includes(this.dialect) ? ["sizeof"] : [])].includes(t.v))
      a = { ...meta, k: "unary", op: t.v, arg: this.expr(this.dialect === "js" ? 10 : 9) };
    else if (t.v === "(") {
      a = this.parseCast?.(meta);
      if (!a) { a = this.expr(); this.take(")"); }
    } else if (t.v === "[") {
      let values = [];
      while (!this.peek("]")) {
        values.push(this.expr());
        if (!this.peek(",")) break;
        this.take();
      }
      this.take("]");
      a = { ...meta, k: "array", values };
    } else if (t.v === "{") {
      let entries = [];
      while (!this.peek("}")) {
        let key = this.take();
        if (!["id", "string"].includes(key.k))
          throw new PracticeError("レコードのフィールド名が必要です", key.line);
        this.take(":");
        entries.push([key.v, this.expr()]);
        if (!this.peek(",")) break;
        this.take();
      }
      this.take("}");
      a = { ...meta, k: "record", entries };
    } else if (t.k === "id") a = { ...meta, k: "var", name: t.v };
    else throw new PracticeError(`式を解釈できません：${t.v}`, t.line);
    while (true) {
      let next = this.ts[this.i],
        v = next?.v;
      if (v === "(") {
        if (min > 12) break;
        this.take();
        let args = [];
        this.skipLines();
        while (!this.peek(")")) {
          let named = null;
          if (
            this.ts[this.i]?.k === "id" &&
            this.ts[this.i + 1]?.v === "=" &&
            this.dialect === "r"
          ) {
            named = this.take().v;
            this.take("=");
          }
          let arg = this.expr();
          args.push(named ? { ...arg, argName: named } : arg);
          this.skipLines();
          if (!this.peek(",")) break;
          this.take();
          this.skipLines();
        }
        this.take(")");
        a = { k: "call", target: a, args, line: a.line };
        continue;
      }
      if (v === "[" || v === "[[") {
        this.take();
        let indexes = [];
        if (this.peek(",")) indexes.push(null);
        else if (!this.peek(v === "[[" ? "]]" : "]")) indexes.push(this.expr());
        while (this.peek(",")) {
          this.take();
          indexes.push(this.peek("]") ? null : this.expr());
        }
        this.take(v === "[[" ? "]]" : "]");
        a = {
          k: "index",
          target: a,
          indexes,
          double: v === "[[",
          line: a.line,
        };
        continue;
      }
      if (v === "$" || (v === "." && this.ts[this.i + 1]?.k === "id")) {
        this.take();
        let name = this.take();
        a = { k: "member", target: a, name: name.v, line: a.line };
        continue;
      }
      if (v === "++" || v === "--") {
        this.take();
        a = { k: "post", target: a, op: v, line: a.line };
        continue;
      }
      let p = (this.dialect === "js" ? jsPrec : prec)[v];
      if (
        p === undefined ||
        p < min ||
        (v === "=" && !["fx", "ahk"].includes(this.dialect))
      )
        break;
      this.take();
      let b = this.expr(p + (v === "^" ? 0 : 1));
      a = { k: "binary", op: v, a, b, line: a.line };
    }
    this.depth--;
    return a;
  }
  skipLines() {
    while (this.peek("\n")) this.take();
  }
  program(end = "<eof>") {
    let out = [];
    this.skip();
    while (!this.peek(end) && !this.peek("<eof>")) {
      out.push(this.statement());
      this.skip();
    }
    if (end !== "<eof>") this.take(end);
    return out;
  }
  body() {
    this.skipLines();
    if (this.peek("{")) {
      this.take();
      return this.program("}");
    }
    return [this.statement()];
  }
  statement() {
    this.skip();
    let t = this.ts[this.i],
      line = t.line,
      v = t.v;
    if (v === "if") {
      this.take();
      let test;
      if (this.peek("(")) {
        this.take();
        test = this.expr();
        this.take(")");
      } else test = this.expr();
      let body = this.body();
      this.skipLines();
      let otherwise = [];
      if (this.peek("else")) {
        this.take();
        otherwise = this.peek("if") ? [this.statement()] : this.body();
      }
      return { k: "if", test, body, otherwise, line, refs: ["if"] };
    }
    if (v === "while") {
      this.take();
      let test;
      if (this.dialect === "ahk" && !this.peek("(")) test = this.expr();
      else {
        this.take("(");
        test = this.expr();
        this.take(")");
      }
      return { k: "while", test, body: this.body(), line, refs: ["while"] };
    }
    if (v === "repeat" || v === "Loop") {
      if (this.dialect === "js") unsupported(v, line);
      this.take();
      let count =
        v === "Loop" && !this.peek("{") && !this.peek("\n")
          ? this.expr()
          : null;
      return {
        k: count ? "repeat" : "while",
        count,
        test: { k: "literal", value: true, line },
        body: this.body(),
        line,
        refs: [v],
      };
    }
    if (v === "for") {
      this.take();
      this.take("(");
      if (this.dialect === "r") {
        let name = this.take().v;
        this.take("in");
        let collection = this.expr();
        this.take(")");
        return {
          k: "each",
          name,
          collection,
          body: this.body(),
          line,
          refs: ["for"],
        };
      }
      let init = this.peek(";") ? null : this.simple();
      this.take(";");
      let test = this.peek(";") ? { k: "literal", value: true, line } : this.expr();
      this.take(";");
      let update = this.peek(")") ? null : this.simple();
      this.take(")");
      return {
        k: "for",
        init,
        test,
        update,
        body: this.body(),
        line,
        refs: ["for"],
      };
    }
    if (["break", "continue", "next", "return"].includes(v)) {
      if (this.dialect === "js" && ["next", "return"].includes(v))
        unsupported(v, line);
      this.take();
      let value = null;
      if (
        v === "return" &&
        ![";", "\n", "}", "<eof>"].includes(this.ts[this.i]?.v)
      )
        value = this.expr();
      return { k: v === "next" ? "continue" : v, value, line, refs: [v] };
    }
    if (v === "{") {
      this.take();
      return { k: "block", body: this.program("}"), line };
    }
    return this.simple();
  }
  simple() {
    let t = this.ts[this.i],
      line = t.line,
      kind = this.dialect;
    if (
      ["js", "c", "cpp", "csharp"].includes(kind) &&
      [
        "let",
        "const",
        "var",
        "int",
        "long",
        "double",
        "float",
        "bool",
        "string",
        "char",
        "auto",
      ].includes(t.v)
    ) {
      let type = this.take().v;
      if (kind === "js" && !["let", "const", "var"].includes(type))
        unsupported(type, line);
      let pointer = false;
      if (this.peek("*")) {
        this.take();
        pointer = true;
      }
      let name = this.take();
      if (name.k !== "id") throw new PracticeError("変数名が必要です", line);
      let size = null;
      if (this.peek("[")) {
        this.take();
        size = this.peek("]") ? null : this.expr();
        this.take("]");
      }
      let value = null;
      if (this.peek("=") || this.peek(":=")) {
        this.take();
        if (this.peek("{")) {
          this.take();
          let vals = [];
          while (!this.peek("}")) {
            vals.push(this.expr());
            if (!this.peek(",")) break;
            this.take();
          }
          this.take("}");
          value = { k: "array", values: vals, line };
        } else value = this.expr();
      }
      if (!["\n", ";", ")", "}", "<eof>"].includes(this.ts[this.i]?.v))
        unsupported("宣言の区切りが必要です", line);
      return {
        k: "declare",
        name: name.v,
        type,
        pointer,
        size,
        value,
        line,
        refs: [type],
      };
    }
    let target = this.expr();
    if (
      ["=", "<-", ":=", "+=", "-=", "*=", "/="].includes(this.ts[this.i]?.v)
    ) {
      let op = this.take().v,
        value = this.expr();
      return { k: "assign", target, value, op, line };
    }
    if (
      kind === "ahk" &&
      target.k === "var" &&
      !["\n", "<eof>", "}", ";"].includes(this.ts[this.i]?.v)
    ) {
      let args = [this.expr()];
      while (this.peek(",")) {
        this.take();
        args.push(this.expr());
      }
      target = { k: "call", target, args, line };
    }
    if (!["\n", ";", "}", ")", "<eof>"].includes(this.ts[this.i]?.v))
      unsupported(this.ts[this.i].v, line);
    return { k: "expression", value: target, line };
  }
}
export function parseExpression(text, dialect = "js") {
  let p = new ScriptParser(text, dialect),
    a = p.expr();
  p.skip();
  if (!p.peek("<eof>")) unsupported(p.ts[p.i].v, p.ts[p.i].line);
  return a;
}
export function astRefs(node) {
  let refs = [];
  function walk(x) {
    if (!x || typeof x !== "object") return;
    if (x.k === "call") {
      let name = callName(x.target);
      if (name && !refs.includes(name)) refs.push(name);
    }
    if (x.refs) for (let n of x.refs) if (!refs.includes(n)) refs.push(n);
    for (let [k, v] of Object.entries(x)) {
      if (["body", "otherwise", "refs"].includes(k)) continue;
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    }
  }
  walk(node);
  return refs;
}
export function callName(a) {
  if (a?.k === "var") return a.name;
  if (a?.k === "member") return callName(a.target) + "." + a.name;
  return "";
}
export function scanScript(code, refs, dialect = "js") {
  try {
    let ts = tokenize(code, dialect);
    let found = [];
    for (let i = 0; i < ts.length; i++) {
      if (ts[i].k !== "id") continue;
      for (let r of refs) {
        let name = r.name.replace(/\(\)$/, "");
        let parts = name.split("."),
          slice = ts.slice(i, i + parts.length * 2 - 1);
        if (
          parts.every((p, j) => slice[j * 2]?.v === p) &&
          !found.includes(r.name)
        )
          found.push(r.name);
      }
    }
    return found;
  } catch {
    return [];
  }
}
export function baseBinary(op, a, b, dialect = "js") {
  if (isUnknown(a) || isUnknown(b))
    return {
      ...unknown(`${formatValue(a)} ${op} ${formatValue(b)}`),
      op,
      a,
      b,
    };
  if (dialect === "js") {
    if (op === "&&") return a && b;
    if (op === "||") return a || b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (op === "/") return a / b;
    if (op === "%") return a % b;
    if (op === "^") return a ^ b;
    if (op === "&") return a & b;
    if (op === "|") return a | b;
  }
  if (op === "==" || op === "=") return a == b;
  if (op === "===") return a === b;
  if (op === "!=" || op === "<>") return a != b;
  if (op === "!==") return a !== b;
  if (op === "<") return a < b;
  if (op === ">") return a > b;
  if (op === "<=") return a <= b;
  if (op === ">=") return a >= b;
  if (op === "&&" || op === "and") return Boolean(a && b);
  if (op === "||" || op === "or") return Boolean(a || b);
  if (
    (op === "&" && dialect === "fx") ||
    ((op === "." || op === ".concat") && dialect === "ahk")
  )
    return String(a ?? "") + String(b ?? "");
  if (op === "+" && dialect === "js") return a + b;
  if (op === "+" && typeof a === "string" && typeof b === "string")
    return a + b;
  if (typeof a !== "number" || typeof b !== "number")
    throw new PracticeError("数値の型が一致しません");
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  if (op === "/") return a / b;
  if (op === "^") return a ** b;
  if (op === "%") return a % b;
  if (op === "%%") return a - Math.floor(a / b) * b;
  if (op === "%/%") return Math.floor(a / b);
  unsupported(op);
}
export function executeProgram(nodes, model, semantics = {}, custom = {}) {
  let limits = { ...LIMITS, ...custom },
    start = performance.now(),
    operations = 0,
    truncated = false,
    reasons = new Set();
  const state = {
    vars: structuredClone(model.variables || {}),
    types: {},
    model: structuredClone(model),
    trace: [],
    outputs: [],
    facts: [],
    halt: false,
    signal: null,
  };
  function check() {
    if (
      ++operations > limits.operations ||
      performance.now() - start > limits.milliseconds
    ) {
      truncated = true;
      reasons.add("探索回数・時間の上限");
      throw new PracticeError("探索上限で説明を停止しました", 1, "limit");
    }
  }
  function note(s, n, text, kind = "step") {
    check();
    if (s.trace.length >= limits.steps) {
      s.halt = true;
      truncated = true;
      reasons.add("手順数の上限");
      kind = "limit";
      text = "手順数の上限で説明を停止しました";
    }
    s.trace.push({
      line: n.line || 1,
      nodeId: n.nodeId,
      text,
      kind,
      refs: [...new Set([...(n.refs || []), ...(s.pendingRefs || [])])],
    });
    s.pendingRefs = [];
  }
  function read(a, s) {
    check();
    if (!a) return null;
    if (a.k === "call") {
      s.pendingRefs ??= [];
      let name = callName(a.target);
      if (name && !s.pendingRefs.includes(name)) s.pendingRefs.push(name);
    }
    let answer = semantics.read?.(a, s, api);
    if (answer?.handled) {
      if (a.k === "member") {
        s.pendingRefs ??= [];
        s.pendingRefs.push(a.name);
      }
      return answer.value;
    }
    switch (a.k) {
      case "literal":
        return semantics.literal ? semantics.literal(a.value, a, s) : a.value;
      case "var": {
        if (Object.hasOwn(s.vars, a.name)) return s.vars[a.name];
        let constants = semantics.constants || {
          true: true,
          false: false,
          null: null,
        };
        if (Object.hasOwn(constants, a.name)) return constants[a.name];
        throw new PracticeError(`未定義の名前：${a.name}`, a.line, semantics.dialect === "js" ? "ReferenceError" : "NameError");
      }
      case "array":
        return a.values.map((x) => read(x, s));
      case "record":
        return Object.fromEntries(a.entries.map(([k, v]) => [k, read(v, s)]));
      case "unary": {
        let x = read(a.arg, s);
        if (isUnknown(x))
          return { ...unknown(a.op + formatValue(x)), op: a.op, a: x };
        if (a.op === "!" || a.op === "not") return !truth(x, a.line);
        if (a.op === "-") return -x;
        if (a.op === "+") return +x;
        unsupported(a.op, a.line);
        break;
      }
      case "binary": {
        let x = read(a.a, s);
        if (isUnknown(x) && ["&&", "and", "||", "or"].includes(a.op)) {
          function hasEffects(node) {
            if (!node || typeof node !== "object") return false;
            if (["call", "post"].includes(node.k)) return true;
            return Object.values(node).some(v => Array.isArray(v) ? v.some(hasEffects) : hasEffects(v));
          }
          if (hasEffects(a.b)) unsupported("未確定の短絡評価に含まれる関数呼び出し・副作用", a.line);
        }
        if (["&&", "and", "||", "or"].includes(a.op) && !isUnknown(x)) {
          if (["&&", "and"].includes(a.op) && !truth(x, a.line))
            return semantics.logicalOperands ? x : false;
          if (["||", "or"].includes(a.op) && truth(x, a.line))
            return semantics.logicalOperands ? x : true;
        }
        let y = read(a.b, s);
        if (semantics.logicalOperands && ["&&", "and", "||", "or"].includes(a.op) && !isUnknown(x))
          return y;
        return semantics.binary
          ? semantics.binary(a.op, x, y, a, s, api)
          : baseBinary(a.op, x, y, semantics.dialect);
      }
      case "member": {
        let x = read(a.target, s);
        s.pendingRefs ??= [];
        s.pendingRefs.push(a.name);
        if (isUnknown(x))
          return unknown(`${x.source}.${a.name}`, `${x.id}.${a.name}`);
        if (x == null)
          throw new PracticeError("空のオブジェクトは参照できません", a.line);
        if (a.name === "length" && Array.isArray(x)) return x.length;
        if (!Object.hasOwn(x, a.name))
          throw new PracticeError(`プロパティがありません：${a.name}`, a.line);
        return x[a.name];
      }
      case "index": {
        let x = read(a.target, s),
          index = read(a.indexes[0], s);
        if (isUnknown(x) || isUnknown(index))
          return unknown("実行時の添字による");
        if (x == null || !(index in Object(x)))
          throw new PracticeError(
            "添字が有効範囲にありません",
            a.line,
            "IndexError",
          );
        return x[index];
      }
      case "call": {
        let name = callName(a.target);
        if (!semantics.call) unsupported(name, a.line);
        return semantics.call(name, a.args, s, api, a);
      }
      case "post": {
        let x = read(a.target, s);
        if (semantics.increment) {
          let value = semantics.increment(x, a, s, api);
          write(a.target, value.next, s, a);
          return value.previous;
        }
        write(
          a.target,
          baseBinary(a.op === "++" ? "+" : "-", x, 1, semantics.dialect),
          s,
          a,
        );
        return x;
      }
      default:
        unsupported(a.k, a.line);
    }
  }
  function write(target, v, s, node) {
    if (semantics.write?.(target, v, s, api, node)) return;
    if (target.k === "var") {
      s.vars[target.name] = semantics.copyOnAssign ? structuredClone(v) : v;
      return;
    }
    if (target.k === "index" || target.k === "member") {
      let x = read(target.target, s);
      if (isUnknown(x))
        unsupported("未確定オブジェクトへの書き込み", target.line);
      let key =
        target.k === "member" ? target.name : read(target.indexes[0], s);
      if (isUnknown(key)) unsupported("未確定の添字への書き込み", target.line);
      if (x == null)
        throw new PracticeError(
          "空のオブジェクトへの書き込みです",
          target.line,
        );
      x[key] = v;
      return;
    }
    unsupported("代入先", target.line);
  }
  function truth(v, line) {
    if (semantics.truth) return semantics.truth(v, line);
    return Boolean(v);
  }
  function choose(s, v, n) {
    if (!isUnknown(v)) return [{ s, yes: truth(v, n.line) }];
    let out = [];
    for (let yes of [true, false]) {
      let domains = refineCondition(v, yes, s.domains || [{}], check);
      if (domains.length) {
        let st = structuredClone(s);
        st.domains = domains;
        note(
          st,
          n,
          `条件が${yes ? "成立する" : "成立しない"}場合（実行時の値による）`,
        );
        out.push({ s: st, yes, uncertain: true });
      }
    }
    return out;
  }

  function run(list, states, depth = 0) {
    if (depth > limits.depth)
      throw new PracticeError("ブロックの入れ子が深すぎます");
    for (let n of list) {
      let next = [];
      for (let s of states) {
        if (s.halt || s.signal) {
          next.push(s);
          continue;
        }
        try {
          check();
          next.push(...step(n, s, depth));
        } catch (e) {
          let line = e.line > 1 ? e.line : n.line;
          s.error = {
            line,
            message:
              (e.category === "未定義動作" ? "未定義動作：" : "") + e.message,
            category: e.category || "エラー",
          };
          noteError(s, n, s.error);
          s.halt = true;
          next.push(s);
        }
        if (next.length > limits.paths) {
          next.length = limits.paths;
          truncated = true;
          reasons.add("パス数の上限");
        }
      }
      states = next;
    }
    return states;
  }
  function noteError(s, n, e) {
    s.trace.push({
      line: e.line || n.line,
      nodeId: n.nodeId,
      text: e.message,
      category: e.category,
      kind: e.category === "limit" ? "limit" : "error",
      refs: n.refs || astRefs(n),
    });
  }
  function loop(n, s, depth) {
    let active = [s],
      done = [],
      values = null,
      countLimit = null;
    if (n.k === "for" && n.init) active = run([n.init], active, depth + 1);
    if (n.k === "each") {
      values = read(n.collection, s);
      if (!Array.isArray(values))
        unsupported("未確定または配列でない繰り返し対象", n.line);
    }
    if (n.k === "repeat") {
      countLimit = read(n.count, s);
      if (
        isUnknown(countLimit) ||
        !Number.isInteger(countLimit) ||
        countLimit < 0
      )
        unsupported("未確定または不正な回数", n.line);
    }
    for (let i = 0; active.length; i++) {
      let next = [];
      for (let st of active) {
        if (st.halt || st.signal) {
          done.push(st);
          continue;
        }
        let cond = values
          ? i < values.length
          : countLimit !== null
            ? i < countLimit
            : read(n.test, st);
        for (let r of choose(st, cond, n)) {
          if (!r.yes) {
            note(r.s, n, `${i}回実行してループを終了します`);
            done.push(r.s);
            continue;
          }
          if (i >= limits.iterations || (r.uncertain && i >= 2)) {
            note(
              r.s,
              n,
              r.uncertain
                ? "2回より多く続く可能性があります。後続状態は未確定です"
                : "ループ上限で説明を停止しました",
              "limit",
            );
            r.s.halt = true;
            truncated = true;
            reasons.add("ループの代表パス・回数上限");
            done.push(r.s);
            continue;
          }
          if (values) r.s.vars[n.name] = values[i];
          if (n.counterName) r.s.vars[n.counterName] = i + 1;
          note(r.s, n, `繰り返し ${i + 1}回目`);
          r.s.loopDepth = (r.s.loopDepth || 0) + 1;
          (r.s.loopIterations ??= []).push(i + 1);
          for (let out of scoped(n.body, [r.s], depth + 1)) {
            out.loopDepth--;
            out.loopIterations.pop();
            if (out.signal === "break") {
              out.signal = null;
              done.push(out);
            } else if (out.halt || out.signal === "return") done.push(out);
            else {
              out.signal = null;
              if (n.update) next.push(...run([n.update], [out], depth + 1));
              else next.push(out);
            }
          }
        }
      }
      active = next;
      if (done.length + active.length > limits.paths) {
        done = done.slice(0, limits.paths);
        active = active.slice(0, Math.max(0, limits.paths - done.length));
        truncated = true;
        reasons.add("パス数の上限");
      }
    }
    return done;
  }
  function enterScope(s, nodes = []) {
    s.scopeStack ??= [];
    s.scopeStack.push({ records: [] });
    semantics.prepareScope?.(nodes, s, api);
  }
  function registerDeclaration(s, n) {
    if (
      !semantics.blockScopes ||
      (n.type === "var" && semantics.dialect === "js")
    )
      return;
    let scope = s.scopeStack.at(-1);
    if (scope.records.some((r) => r.name === n.name))
      throw new PracticeError(
        "同じスコープで名前が重複しています：" + n.name,
        n.line,
        "SyntaxError",
      );
    scope.records.push({
      name: n.name,
      hadVar: Object.hasOwn(s.vars, n.name),
      value: s.vars[n.name],
      hadType: Object.hasOwn(s.types, n.name),
      type: s.types[n.name],
      address: s.addresses?.[n.name],
      reference: s.references?.[n.name],
    });
    delete s.vars[n.name];
    delete s.types[n.name];
  }
  function leaveScope(s) {
    let scope = s.scopeStack.pop();
    for (let r of scope.records.reverse()) {
      let id = s.addresses?.[r.name];
      if (semantics.manualLifetime && id && s.model.memory?.[id]?.name === r.name)
        s.model.memory[id].alive = false;
      if (r.hadVar) s.vars[r.name] = r.value;
      else delete s.vars[r.name];
      if (r.hadType) s.types[r.name] = r.type;
      else delete s.types[r.name];
      if (s.references) {
        if (r.reference) s.references[r.name] = r.reference;
        else delete s.references[r.name];
      }
      if (s.addresses) {
        if (r.address) s.addresses[r.name] = r.address;
        else delete s.addresses[r.name];
      }
    }
  }
  function scoped(nodes, states, depth) {
    if (!semantics.blockScopes) return run(nodes, states, depth);
    for (let s of states) enterScope(s, nodes);
    let result = run(nodes, states, depth);
    for (let s of result) leaveScope(s);
    return result;
  }
  function step(n, s, depth) {
    if (n.k === "declare" && !semantics.prepareScope) registerDeclaration(s, n);
    if (semantics.step) {
      let special = semantics.step(n, s, api);
      if (special) return special;
    }
    switch (n.k) {
      case "block":
        return n.entry
          ? run(n.body, [s], depth + 1)
          : scoped(n.body, [s], depth + 1);
      case "declare": {
        if (Object.hasOwn(s.types, n.name) && n.type !== "var")
          throw new PracticeError("同名の変数が宣言済みです", n.line);
        s.types[n.name] = n.type;
        s.vars[n.name] = n.value ? read(n.value, s) : undefined;
        note(s, n, `${n.name} を用意します：${formatValue(s.vars[n.name])}`);
        return [s];
      }
      case "assign": {
        let v = read(n.value, s);
        if (["+=", "-=", "*=", "/="].includes(n.op))
          v = semantics.binary
            ? semantics.binary(n.op[0], read(n.target, s), v, n, s, api)
            : baseBinary(n.op[0], read(n.target, s), v, semantics.dialect);
        write(n.target, v, s, n);
        note(
          s,
          n,
          `${callName(n.target) || "対象"} に ${formatValue(v)} を代入します`,
        );
        return [s];
      }
      case "expression": {
        const before = s.trace.length;
        let v = read(n.value, s);
        if (s.trace.length === before) {
          const text = n.value.k === "post"
            ? `${callName(n.value.target) || "対象"} を${n.value.op === "++" ? "増やし" : "減らし"}ます（後置式の値は変更前の ${formatValue(v)}）`
            : v == null ? "処理を実行します（表示する戻り値はありません）" : `式を評価します：${formatValue(v)}`;
          note(s, n, text);
        }
        return [s];
      }
      case "if": {
        let v = read(n.test, s),
          done = [];
        for (let r of choose(s, v, n)) {
          note(r.s, n, r.yes ? "条件が成立します" : "条件が成立しません");
          done.push(...scoped(r.yes ? n.body : n.otherwise, [r.s], depth + 1));
        }
        return done;
      }
      case "for":
      case "while":
      case "each":
      case "repeat": {
        if (semantics.blockScopes) enterScope(s, n.init ? [n.init] : []);
        let out = loop(n, s, depth);
        if (semantics.blockScopes) for (let state of out) leaveScope(state);
        return out;
      }
      case "break":
      case "continue":
        if (!s.loopDepth)
          throw new PracticeError("繰り返しの外では使えません", n.line);
        s.signal = n.k;
        note(
          s,
          n,
          n.k === "break" ? "ループを抜けます" : "次の繰り返しへ進みます",
        );
        return [s];
      case "return":
        s.returnValue = read(n.value, s);
        s.signal = "return";
        note(s, n, `値を返して終了します：${formatValue(s.returnValue)}`);
        return [s];
      case "action":
        return semantics.action(n, s, api) || [s];
      default:
        unsupported(n.k, n.line);
    }
  }
  const api = {
    read,
    write,
    note,
    choose,
    run,
    check,
    registerDeclaration,
    unknown,
    freshUnknown: (source, s) =>
      unknown(source, source + "-" + (s.inputCount = (s.inputCount || 0) + 1)),
    format: formatValue,
    fail: (message, n, category) => {
      throw new PracticeError(message, n?.line || 1, category);
    },
  };
  let paths;
  try {
    semantics.initialize?.(state, api, nodes);
    if (semantics.blockScopes) enterScope(state, nodes);
    paths = run(nodes, [state]);
  } catch (e) {
    return {
      paths: [],
      error: { line: e.line || 1, message: e.message, category: e.category },
      limits,
      truncated,
      operations,
    };
  }
  for (let [id, p] of paths.entries()) {
    p.id = id;
    p.groups = semantics.groups
      ? semantics.groups(p)
      : [
          {
            title: "変数",
            entries: Object.entries(p.vars).map(([k, v]) => [
              k,
              formatValue(v),
            ]),
          },
          {
            title: "モデル状態",
            entries: Object.entries(p.model).map(([k, v]) => [
              k,
              formatValue(v),
            ]),
          },
        ];
  }
  return {
    paths,
    truncated,
    limits,
    reasons: [...reasons],
    operations,
    elapsed: performance.now() - start,
  };
}
export function simulateScript(source, model, semantics = {}, limits = {}) {
  try {
    let parser = new ScriptParser(source, semantics.dialect || "js");
    let nodes = parser.program();
    return executeProgram(nodes, model, semantics, limits);
  } catch (e) {
    return {
      paths: [],
      error: { line: e.line || 1, message: e.message, category: e.category },
      truncated: false,
      limits: { ...LIMITS, ...limits },
    };
  }
}
