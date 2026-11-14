/* Buildless, deterministic VBA teaching interpreter. Never evaluates user JavaScript. */
export const LIMITS = Object.freeze({
  paths: 2000,
  operations: 100000,
  milliseconds: 1200,
  steps: 600,
  iterations: 100,
  source: 100000,
  depth: 64,
});
export const EMPTY = { kind: "empty" },
  NULL = { kind: "null" },
  NOTHING = { kind: "nothing" };
const unknown = (source, extra = {}) => ({
  kind: "unknown",
  source: source.length > 300 ? source.slice(0, 297) + "…" : source,
  ...extra,
});
const isU = (v) => v?.kind === "unknown";
export function display(v) {
  if (v?.kind === "unknown") return `実行時に決まる（${v.source}）`;
  if (v?.kind === "empty") return "Empty";
  if (v?.kind === "null") return "Null";
  if (v?.kind === "nothing") return "Nothing";
  if (v?.kind === "range") return `Range("${v.cells.join(":")}")`;
  if (v?.kind === "array")
    return `[${v.values.map(display).join(", ")}]（${v.low}～${v.low + v.values.length - 1}）`;
  return typeof v === "string" ? `"${v}"` : String(v);
}
class VBAError extends Error {
  constructor(message, code = 0) {
    super(message);
    this.code = code;
  }
}
const fail = (m, c = 0) => {
  throw new VBAError(m, c);
};
const unsupported = (s) => fail(`この構文は説明に対応していません：${s}`);
export function lex(source) {
  let result = [],
    i = 0,
    line = 1;
  while (i < source.length) {
    let c = source[i];
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      result.push({ v: "\n", line });
      line++;
      i++;
      continue;
    }
    if (/[ \t]/.test(c)) {
      i++;
      continue;
    }
    if (c === "'") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === '"') {
      let value = "",
        start = line;
      i++;
      let closed = false;
      while (i < source.length) {
        if (source[i] === "\n") fail(`${start}行：文字列が閉じられていません`);
        if (source[i] === '"') {
          i++;
          if (source[i] === '"') {
            value += '"';
            i++;
          } else {
            closed = true;
            break;
          }
        } else value += source[i++];
      }
      if (!closed) fail(`${start}行：文字列が閉じられていません`);
      result.push({ v: value, type: "string", line: start });
      continue;
    }
    let m = source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?/);
    if (m) {
      result.push({ v: m[0], type: "number", line });
      i += m[0].length;
      continue;
    }
    m = source.slice(i).match(/^[A-Za-z_\u0080-\uFFFF][\w\u0080-\uFFFF]*/);
    if (m) {
      result.push({ v: m[0], type: "id", line });
      i += m[0].length;
      continue;
    }
    m = source.slice(i).match(/^(<=|>=|<>|[+\-*/\\^&=<>(),.:])/);
    if (m) {
      result.push({ v: m[0], line });
      i += m[0].length;
      continue;
    }
    fail(`${line}行：この構文は説明に対応していません：${c}`);
  }
  return result;
}
const lower = (t) => t?.v?.toLowerCase();
const precedence = {
  or: 1,
  xor: 2,
  and: 3,
  "=": 4,
  "<>": 4,
  "<": 4,
  ">": 4,
  "<=": 4,
  ">=": 4,
  "&": 5,
  "+": 6,
  "-": 6,
  mod: 7,
  "\\": 8,
  "*": 9,
  "/": 9,
  "^": 11,
};
class ExprParser {
  constructor(ts) {
    this.ts = ts;
    this.i = 0;
  }
  peek(v) {
    return lower(this.ts[this.i]) === v;
  }
  take(v) {
    if (v && !this.peek(v)) fail(`式に ${v} が必要です`);
    return this.ts[this.i++];
  }
  expr(min = 0, depth = 0) {
    if (depth > LIMITS.depth) fail("式の入れ子が深すぎます");
    let t = this.take();
    if (!t) fail("式が必要です");
    let v = lower(t),
      a;
    if (t.type === "string") a = { k: "lit", v: t.v };
    else if (t.type === "number") a = { k: "lit", v: Number(t.v) };
    else if (["-", "+", "not"].includes(v))
      a = { k: "unary", op: v, a: this.expr(v === "not" ? 4 : 10, depth + 1) };
    else if (v === "(") {
      a = this.expr(0, depth + 1);
      this.take(")");
    } else if (t.type === "id") a = { k: "id", name: v };
    else fail(`式を解釈できません：${t.v}`);
    while (this.i < this.ts.length) {
      let op = lower(this.ts[this.i]);
      if (op === "(") {
        if (min > 12) break;
        this.i++;
        let args = [];
        if (!this.peek(")")) {
          do {
            args.push(this.expr(0, depth + 1));
            if (!this.peek(",")) break;
            this.i++;
          } while (true);
        }
        this.take(")");
        a = { k: "call", target: a, args };
        continue;
      }
      if (op === ".") {
        this.i++;
        let p = this.take();
        if (p?.type !== "id") fail("プロパティ名が必要です");
        a = { k: "member", a, name: lower(p) };
        continue;
      }
      let prec = precedence[op];
      if (prec === undefined || prec < min) break;
      this.i++;
      a = {
        k: "binary",
        op,
        a,
        b: this.expr(prec + (op === "^" ? 0 : 1), depth + 1),
      };
    }
    return a;
  }
}
export function expression(ts) {
  let p = new ExprParser(ts);
  let a = p.expr();
  if (p.i !== ts.length)
    unsupported(
      ts
        .slice(p.i)
        .map((t) => t.v)
        .join(" "),
    );
  return a;
}
function split(ts, delimiter = ",") {
  let depth = 0,
    out = [],
    start = 0;
  ts.forEach((t, i) => {
    if (t.v === "(") depth++;
    if (t.v === ")") depth--;
    if (depth === 0 && lower(t) === delimiter) {
      out.push(ts.slice(start, i));
      start = i + 1;
    }
  });
  out.push(ts.slice(start));
  return out;
}
function topIndex(ts, v) {
  let d = 0;
  return ts.findIndex((t) => {
    if (t.v === "(") d++;
    if (t.v === ")") d--;
    return d === 0 && lower(t) === v;
  });
}
export function parse(source) {
  if (source.length > LIMITS.source)
    fail(`コードは${LIMITS.source}文字以内にしてください`);
  const ts = lex(source),
    lines = [];
  let cur = [];
  for (let t of ts) {
    if (t.v === "\n" || t.v === ":") {
      if (cur.length) lines.push(cur);
      cur = [];
    } else cur.push(t);
  }
  if (cur.length) lines.push(cur);
  let i = 0,
    base = 0,
    explicit = false,
    sub = false,
    subClosed = false;
  const starts = (s) =>
    lines[i]?.slice(0, s.split(" ").length).map(lower).join(" ") === s;
  function block(stops = [], depth = 0) {
    if (depth > LIMITS.depth) fail("ブロックの入れ子が深すぎます");
    let out = [];
    while (i < lines.length && !stops.some(starts)) {
      let row = lines[i++],
        words = row.map(lower),
        line = row[0].line,
        node = { line, tokens: row };
      let w = words[0];
      try {
        if (subClosed) fail("End Sub の後に実行文は置けません");
        if (w === "rem" || w === "attribute") continue;
        if (w === "option") {
          if (words[1] === "explicit" && row.length === 2) {
            explicit = true;
            continue;
          }
          if (
            words[1] === "base" &&
            ["0", "1"].includes(words[2]) &&
            row.length === 3
          ) {
            base = Number(words[2]);
            continue;
          }
          unsupported(words.join(" "));
        }
        if (w === "sub") {
          if (depth > 0) fail("Sub をブロック内に置くことはできません");
          if (
            sub ||
            !(
              row.length === 4 &&
              row[1].type === "id" &&
              words[2] === "(" &&
              words[3] === ")"
            )
          )
            unsupported("引数なしの単一 Sub のみ対応");
          sub = true;
          out.push({ ...node, k: "start" });
          continue;
        }
        if (w === "end" && words[1] === "sub") {
          if (!sub || subClosed || row.length !== 2 || depth > 0)
            fail("End Sub の位置が不正です");
          subClosed = true;
          out.push({ ...node, k: "exit", what: "sub" });
          continue;
        }
        if (w === "if") {
          let ti = topIndex(row, "then");
          if (ti < 0) fail("If に Then が必要です");
          if (ti !== row.length - 1)
            unsupported("1行形式の If（複数行形式を使用してください）");
          let branches = [
            {
              test: expression(row.slice(1, ti)),
              body: block(["elseif", "else", "end if"], depth + 1),
              line,
            },
          ];
          while (starts("elseif")) {
            let r = lines[i++],
              at = topIndex(r, "then");
            if (at !== r.length - 1 || at < 0)
              fail("ElseIf に Then が必要です");
            branches.push({
              test: expression(r.slice(1, at)),
              body: block(["elseif", "else", "end if"], depth + 1),
              line: r[0].line,
              tokens: r,
            });
          }
          let otherwise = [];
          if (starts("else")) {
            if (lines[i].length !== 1) fail("Else の後には改行が必要です");
            i++;
            otherwise = block(["end if"], depth + 1);
          }
          if (!starts("end if")) fail("End If が必要です");
          i++;
          out.push({ ...node, k: "if", branches, otherwise });
          continue;
        }
        if (w === "select" && words[1] === "case") {
          let test = expression(row.slice(2)),
            cases = [];
          while (starts("case")) {
            let r = lines[i++];
            let isElse = lower(r[1]) === "else";
            let checks = isElse
              ? null
              : split(r.slice(1)).map((part) => {
                  let to = topIndex(part, "to");
                  if (lower(part[0]) === "is") {
                    if (
                      !["=", "<>", "<", ">", "<=", ">="].includes(
                        lower(part[1]),
                      )
                    )
                      fail("Case Is の比較演算子が必要です");
                    return {
                      op: lower(part[1]),
                      value: expression(part.slice(2)),
                    };
                  }
                  if (to >= 0)
                    return {
                      op: "range",
                      low: expression(part.slice(0, to)),
                      high: expression(part.slice(to + 1)),
                    };
                  return { op: "=", value: expression(part) };
                });
            cases.push({
              checks,
              body: block(["case", "end select"], depth + 1),
              line: r[0].line,
              tokens: r,
            });
            if (isElse && starts("case"))
              fail("Case Else は最後に置いてください");
          }
          if (!starts("end select")) fail("End Select が必要です");
          i++;
          out.push({ ...node, k: "select", test, cases });
          continue;
        }
        if (w === "for") {
          let each = words[1] === "each",
            name = words[each ? 2 : 1];
          if (!/^[\w\u0080-\uFFFF]+$/.test(name || ""))
            fail("For の変数が必要です");
          let n = { ...node, k: each ? "each" : "for", name };
          if (each) {
            if (words[3] !== "in") fail("For Each に In が必要です");
            n.collection = expression(row.slice(4));
          } else {
            if (words[2] !== "=") fail("For に = が必要です");
            let to = topIndex(row, "to"),
              step = topIndex(row, "step");
            if (to < 0) fail("For に To が必要です");
            n.from = expression(row.slice(3, to));
            n.to = expression(row.slice(to + 1, step < 0 ? row.length : step));
            n.step =
              step < 0 ? { k: "lit", v: 1 } : expression(row.slice(step + 1));
          }
          n.body = block(["next"], depth + 1);
          if (!starts("next")) fail("Next が必要です");
          if (
            lines[i].length > 2 ||
            (lines[i][1] && lower(lines[i][1]) !== name)
          )
            fail("Next の変数が For と一致しません");
          n.endTokens = lines[i];
          n.endLine = lines[i++][0].line;
          out.push(n);
          continue;
        }
        if (w === "do") {
          let mode = words[1];
          if (mode && !["while", "until"].includes(mode))
            unsupported(words.join(" "));
          let test = mode ? expression(row.slice(2)) : null;
          let body = block(["loop"], depth + 1);
          if (!starts("loop")) fail("Loop が必要です");
          let r = lines[i++],
            post = lower(r[1]);
          if (post && !["while", "until"].includes(post))
            fail("Loop の後は While / Until です");
          if (test && post) fail("Do と Loop の両方に条件は指定できません");
          if (post) test = expression(r.slice(2));
          out.push({
            ...node,
            k: "do",
            mode: mode || post || "while",
            test,
            post: !!post,
            body,
            endLine: r[0].line,
            endTokens: r,
          });
          continue;
        }
        if (w === "dim") {
          let declarations = split(row.slice(1)).map((part) => {
            let as = topIndex(part, "as"),
              left = as < 0 ? part : part.slice(0, as),
              type = as < 0 ? "variant" : lower(part[as + 1]);
            if (as >= 0 && part.length !== as + 2)
              unsupported("As New / 固定長文字列");
            if (
              ![
                "variant",
                "integer",
                "long",
                "double",
                "single",
                "string",
                "boolean",
                "object",
                "range",
                "worksheet",
                "workbook",
              ].includes(type)
            )
              unsupported(`型 ${type}`);
            if (left[0]?.type !== "id") fail("変数名が必要です");
            let bounds = null;
            if (left.length > 1) {
              if (left[1].v !== "(" || left.at(-1).v !== ")")
                fail("配列宣言が不正です");
              let inside = left.slice(2, -1),
                to = topIndex(inside, "to");
              bounds =
                to < 0
                  ? [{ k: "lit", v: base }, expression(inside)]
                  : [
                      expression(inside.slice(0, to)),
                      expression(inside.slice(to + 1)),
                    ];
            }
            return { name: lower(left[0]), type, bounds };
          });
          out.push({ ...node, k: "dim", declarations });
          continue;
        }
        if (w === "on" && words.join(" ") === "on error resume next") {
          out.push({ ...node, k: "onerror", resume: true });
          continue;
        }
        if (w === "on" && words.join(" ") === "on error goto 0") {
          out.push({ ...node, k: "onerror", resume: false });
          continue;
        }
        if (
          w === "exit" &&
          ["for", "do", "sub"].includes(words[1]) &&
          row.length === 2
        ) {
          out.push({ ...node, k: "exit", what: words[1] });
          continue;
        }
        if (w === "debug" && words[1] === "." && words[2] === "print") {
          out.push({
            ...node,
            k: "output",
            channel: "Debug.Print",
            args: split(row.slice(3)).map(expression),
          });
          continue;
        }
        if (w === "msgbox") {
          out.push({
            ...node,
            k: "output",
            channel: "MsgBox",
            args: [expression(row.slice(1))],
          });
          continue;
        }
        let assignRow = w === "set" || w === "let" ? row.slice(1) : row;
        let eq = topIndex(assignRow, "=");
        if (eq > 0) {
          out.push({
            ...node,
            k: "assign",
            target: expression(assignRow.slice(0, eq)),
            value: expression(assignRow.slice(eq + 1)),
            set: w === "set",
          });
          continue;
        }
        if (["end", "else", "elseif", "case", "next", "loop"].includes(w))
          fail(`対応する開始文がありません：${row.map((t) => t.v).join(" ")}`);
        unsupported(row.map((t) => t.v).join(" "));
      } catch (e) {
        e.line = e.line || line;
        throw e;
      }
    }
    return out;
  }
  const body = block();
  if (sub && !subClosed) {
    let e = new VBAError("End Sub が必要です");
    e.line = lines.at(-1)?.[0].line || 1;
    throw e;
  }
  return { body, base, explicit };
}
const num = (v) => {
  if (v?.kind === "empty") return 0;
  if (v === true) return -1;
  if (v === false) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))
    return Number(v);
  fail("型が一致しません", 13);
};
const str = (v) =>
  v?.kind === "empty"
    ? ""
    : v === true
      ? "True"
      : v === false
        ? "False"
        : String(v);
const bool = (v) =>
  v?.kind === "null"
    ? false
    : v?.kind === "empty"
      ? false
      : typeof v === "boolean"
        ? v
        : num(v) !== 0;
function binary(op, a, b) {
  if (a?.kind === "null" || b?.kind === "null") {
    if (op === "&") {
      if (a?.kind === "null" && b?.kind === "null") return NULL;
      return a?.kind === "null" ? str(b) : str(a);
    }
    if (op === "and" && (a === false || b === false)) return false;
    if (op === "or" && (a === true || b === true)) return true;
    return NULL;
  }
  if (isU(a) || isU(b))
    return unknown(`${display(a)} ${op} ${display(b)}`, { op, a, b });
  if (["=", "<>", "<", ">", "<=", ">="].includes(op)) {
    if (a?.kind === "empty") a = typeof b === "string" ? "" : 0;
    if (b?.kind === "empty") b = typeof a === "string" ? "" : 0;
    let cmp;
    if (typeof a === "string" && typeof b === "string")
      cmp = a < b ? -1 : a > b ? 1 : 0;
    else if (typeof a === "string" || typeof b === "string")
      cmp = typeof a === "string" ? 1 : -1;
    else {
      a = num(a);
      b = num(b);
      cmp = a < b ? -1 : a > b ? 1 : 0;
    }
    return {
      "=": cmp === 0,
      "<>": cmp !== 0,
      "<": cmp < 0,
      ">": cmp > 0,
      "<=": cmp <= 0,
      ">=": cmp >= 0,
    }[op];
  }
  if (op === "&") return str(a) + str(b);
  if (op === "+" && a?.kind === "empty") return b?.kind === "empty" ? 0 : b;
  if (op === "+" && b?.kind === "empty") return a;
  if (op === "+" && typeof a === "string" && typeof b === "string")
    return a + b;
  if (["and", "or", "xor"].includes(op)) {
    if (typeof a === "boolean" && typeof b === "boolean")
      return op === "and" ? a && b : op === "or" ? a || b : a !== b;
    let x = num(a),
      y = num(b);
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      Math.abs(x) > 2147483647 ||
      Math.abs(y) > 2147483647
    )
      unsupported("小数または32ビット範囲外のビット演算");
    return op === "and" ? x & y : op === "or" ? x | y : x ^ y;
  }
  let x = num(a),
    y = num(b);
  if (["/", "\\", "mod"].includes(op) && y === 0) fail("0 で除算しました", 11);
  if (op === "\\" && roundEven(y) === 0) fail("0 で除算しました", 11);
  let v =
    op === "+"
      ? x + y
      : op === "-"
        ? x - y
        : op === "*"
          ? x * y
          : op === "/"
            ? x / y
            : op === "\\"
              ? Math.trunc(roundEven(x) / roundEven(y))
              : op === "mod"
                ? roundEven(x) % roundEven(y)
                : x ** y;
  if (!Number.isFinite(v)) fail("オーバーフローしました", 6);
  return v;
}
function roundEven(n) {
  let f = Math.floor(n),
    d = n - f;
  return d === 0.5 ? (f % 2 === 0 ? f : f + 1) : Math.round(n);
}
function cast(v, type) {
  if (isU(v))
    return { ...v, valueType: type === "variant" ? v.valueType : type };
  if (type === "variant") return v;
  if (v?.kind === "null") fail("Null の使い方が不正です", 94);
  if (["object", "range", "worksheet", "workbook"].includes(type)) {
    if (!["range", "nothing"].includes(v?.kind))
      fail("オブジェクトが必要です", 424);
    return v;
  }
  if (type === "string") return str(v);
  if (type === "boolean") return bool(v);
  let n = num(v);
  if (type === "single") {
    n = Math.fround(n);
    if (!Number.isFinite(n)) fail("オーバーフローしました", 6);
  }
  if (["integer", "long"].includes(type)) {
    n = roundEven(n);
    let max = type === "integer" ? 32767 : 2147483647;
    if (n > max || n < -max - 1) fail("オーバーフローしました", 6);
  }
  return n;
}
function cellsOf(address) {
  if (
    typeof address !== "string" ||
    !/^\$?[A-C]\$?[1-5](?::\$?[A-C]\$?[1-5])?$/i.test(address)
  )
    unsupported("モデルシートは A1:C5 のみ対応");
  let [a, b] = address.toUpperCase().replaceAll("$", "").split(":");
  b = b || a;
  let cells = [];
  for (let r = Number(a[1]); r <= Number(b[1]); r++)
    for (let c = a.charCodeAt(0); c <= b.charCodeAt(0); c++)
      cells.push(String.fromCharCode(c) + r);
  if (!cells.length) fail("Range の範囲指定が不正です", 1004);
  return cells;
}
function value(v, s) {
  if (isU(v) && !v.op) {
    let seeds = s.alternatives || [{ constraints: s.constraints || {} }],
      id = v.symbol || v.source;
    let vals = seeds.map(
      (st) => st.constraints[id]?.conditions?.find((c) => c.op === "=")?.value,
    );
    if (vals.length && vals.every((x) => x !== undefined && x === vals[0]))
      return vals[0];
  }
  if (v?.kind === "range") {
    if (v.cells.length !== 1) unsupported("複数セルの Value の読み取り");
    return s.cells[v.cells[0]] ?? EMPTY;
  }
  if (v?.kind === "nothing")
    fail("オブジェクト変数または With ブロック変数が設定されていません", 91);
  return v;
}
function expressionType(a, s) {
  if (a.k === "lit")
    return typeof a.v === "string"
      ? "string"
      : Number.isInteger(a.v) && a.v >= -32768 && a.v <= 32767
        ? "integer"
        : Number.isInteger(a.v) && a.v >= -2147483648 && a.v <= 2147483647
          ? "long"
          : "double";
  if (a.k === "id") {
    if (["true", "false"].includes(a.name)) return "boolean";
    if (["vbcrlf", "vbtab"].includes(a.name)) return "string";
    return s.types[a.name] || "variant";
  }
  if (a.k === "call" && a.target.k === "id") {
    if (s.vars[a.target.name]?.kind === "array")
      return s.vars[a.target.name].type || "variant";
    return (
      {
        cstr: "string",
        cint: "integer",
        clng: "long",
        cdbl: "double",
        inputbox: "string",
      }[a.target.name] || "variant"
    );
  }
  if (a.k === "unary") return expressionType(a.a, s);
  if (a.k === "binary") {
    if (["=", "<>", "<", ">", "<=", ">="].includes(a.op)) return "boolean";
    if (a.op === "&") return "string";
    let x = expressionType(a.a, s),
      y = expressionType(a.b, s);
    if (x === "variant" && y === "variant") return "variant";
    if (a.op === "+" && (x === "string" || y === "string")) return "string";
    if (a.op === "/" || a.op === "^") return "double";
    if (x === "double" || y === "double" || x === "single" || y === "single")
      return "double";
    return x === "long" || y === "long" ? "long" : "integer";
  }
  return "variant";
}
function typedCompare(op, x, y, xt, yt) {
  if (x?.kind === "null" || y?.kind === "null") return NULL;
  const numeric = (t) => !["string", "variant"].includes(t);

  if ((xt === "string" && numeric(yt)) || (yt === "string" && numeric(xt)))
    unsupported(
      "String型と数値型の直接比較（明示的な型変換を使用してください）",
    );
  if (xt === "string" || yt === "string") {
    if (!isU(x)) x = str(x);
    if (!isU(y)) y = str(y);
  } else if (numeric(xt) || numeric(yt)) {
    if (!isU(x)) x = num(x);
    if (!isU(y)) y = num(y);
  }

  return binary(op, x, y);
}
function expressionBinary(a, s) {
  let x = value(evalExpr(a.a, s), s),
    y = value(evalExpr(a.b, s), s),
    xt = expressionType(a.a, s),
    yt = expressionType(a.b, s),
    op = a.op;
  if (x?.kind === "null" || y?.kind === "null") return binary(op, x, y);
  const numeric = (t) => !["string", "variant"].includes(t);
  if (op === "+") {
    if ((xt === "string" && numeric(yt)) || (yt === "string" && numeric(xt)))
      fail("型が一致しません", 13);
    if (xt === "string" || yt === "string") {
      if (isU(x) || isU(y))
        return unknown(`${display(x)} + ${display(y)}`, {
          op,
          a: x,
          b: y,
          valueType: "string",
        });
      return str(x) + str(y);
    }
  }
  if (["=", "<>", "<", ">", "<=", ">="].includes(op))
    return typedCompare(op, x, y, xt, yt);
  let result = binary(op, x, y);
  if (
    !isU(result) &&
    typeof result === "number" &&
    ["+", "-", "*", "\\", "mod"].includes(op) &&
    xt !== "variant" &&
    yt !== "variant"
  ) {
    let type = expressionType(a, s);
    if (type === "integer" || type === "long") result = cast(result, type);
  }
  return result;
}
function evalExpr(a, s) {
  switch (a.k) {
    case "lit":
      return a.v;
    case "id": {
      if (a.name === "empty") return EMPTY;
      if (a.name === "null") return NULL;
      if (a.name === "nothing") return NOTHING;
      if (a.name === "true") return true;
      if (a.name === "false") return false;
      if (a.name === "vbcrlf") return "\r\n";
      if (a.name === "vbtab") return "\t";
      if (a.name === "err") return { kind: "err" };
      if (a.name === "date") return unknown("実行時の現在日付（時刻なし）");
      if (a.name === "now") return unknown("実行時の現在日時（日付と時刻）");
      if (!(a.name in s.vars)) {
        if (s.explicit) fail(`変数が定義されていません：${a.name}`);
        s.vars[a.name] = EMPTY;
        s.types[a.name] = "variant";
      }
      return s.vars[a.name];
    }
    case "unary": {
      let v = value(evalExpr(a.a, s), s);
      if (isU(v)) return unknown(`${a.op} ${display(v)}`, { op: a.op, a: v });
      if (v?.kind === "null") return NULL;
      return a.op === "not"
        ? typeof v === "boolean"
          ? !v
          : ~num(v)
        : a.op === "-"
          ? -num(v)
          : num(v);
    }
    case "binary":
      return expressionBinary(a, s);
    case "member": {
      let obj = evalExpr(a.a, s);
      if (obj?.kind === "nothing")
        fail(
          "オブジェクト変数または With ブロック変数が設定されていません",
          91,
        );
      if (obj?.kind === "err" && a.name === "number") return s.err || 0;
      if (obj?.kind === "range") {
        if (a.name === "value" || a.name === "value2") return value(obj, s);
        if (a.name === "count") return obj.cells.length;
        if (a.name === "row") return Number(obj.cells[0].slice(1));
        if (a.name === "column") return obj.cells[0].charCodeAt(0) - 64;
      }
      unsupported(`プロパティ ${a.name}`);
      break;
    }
    case "call": {
      let args = a.args.map((x) => value(evalExpr(x, s), s));
      if (a.target.k !== "id") unsupported("オブジェクトのメソッド呼び出し");
      let name = a.target.name;
      if (name === "inputbox") {
        if (args.length < 1 || args.length > 3)
          fail("引数の数が一致していません", 450);
        return unknown("InputBox の入力による", {
          symbol: `input-${s.inputId++}`,
          valueType: "string",
        });
      }
      const known = [
        "range",
        "cells",
        "array",
        "isnull",
        "isempty",
        "lbound",
        "ubound",
        "len",
        "left",
        "right",
        "mid",
        "trim",
        "lcase",
        "ucase",
        "abs",
        "int",
        "fix",
        "cint",
        "clng",
        "cdbl",
        "cstr",
        "val",
        "isnumeric",
        "round",
        "replace",
        "instr",
      ];
      if (!known.includes(name) && !(name in s.vars))
        unsupported(`関数 ${name}`);
      if (args.some(isU)) {
        if (["range", "cells", "lbound", "ubound"].includes(name))
          unsupported(`${name} の引数が未確定`);
        let meta = ["len", "instr"].includes(name)
          ? { valueType: "long", min: 0, max: 2147483647 }
          : ["cint", "clng", "cdbl", "cstr"].includes(name)
            ? {
                valueType: {
                  cint: "integer",
                  clng: "long",
                  cdbl: "double",
                  cstr: "string",
                }[name],
              }
            : name === "abs"
              ? { min: 0 }
              : {};
        return unknown(`${name} の引数による`, {
          symbol: JSON.stringify({ name, args }),
          ...meta,
        });
      }
      if (name === "range") {
        if (args.length !== 1) unsupported("Range の2引数形式");
        return { kind: "range", cells: cellsOf(args[0]) };
      }
      if (name === "cells") {
        if (args.length !== 2) unsupported("Cells は行・列の2引数のみ対応");
        let r = num(args[0]),
          c = num(args[1]);
        if (
          !Number.isInteger(r) ||
          !Number.isInteger(c) ||
          r < 1 ||
          r > 5 ||
          c < 1 ||
          c > 3
        )
          unsupported("モデルシートは A1:C5 のみ対応");
        return { kind: "range", cells: [String.fromCharCode(64 + c) + r] };
      }
      if (name === "array") return { kind: "array", low: s.base, values: args };
      if (name in s.vars) {
        let arr = s.vars[name];
        if (arr?.kind !== "array") fail("型が一致しません", 13);
        if (args.length !== 1) unsupported("多次元配列");
        let index = num(args[0]);
        if (
          !Number.isInteger(index) ||
          index < arr.low ||
          index >= arr.low + arr.values.length
        )
          fail("インデックスが有効範囲にありません", 9);
        return arr.values[index - arr.low];
      }
      if (
        ["isnull", "isempty", "lbound", "ubound"].includes(name) &&
        args.length !== 1
      )
        fail("引数の数が一致していません", 450);
      if (name === "isnull") return args[0]?.kind === "null";
      if (name === "isempty") return args[0]?.kind === "empty";
      if (["lbound", "ubound"].includes(name)) {
        if (args[0]?.kind !== "array") fail("型が一致しません", 13);
        return (
          args[0].low + (name === "ubound" ? args[0].values.length - 1 : 0)
        );
      }
      if (args.some((v) => v?.kind === "null")) {
        if (["cstr", "cint", "clng", "cdbl"].includes(name))
          fail("Null の使い方が不正です", 94);
        return NULL;
      }
      const arity = {
        len: [1, 1],
        left: [2, 2],
        right: [2, 2],
        mid: [2, 3],
        trim: [1, 1],
        lcase: [1, 1],
        ucase: [1, 1],
        abs: [1, 1],
        int: [1, 1],
        fix: [1, 1],
        cint: [1, 1],
        clng: [1, 1],
        cdbl: [1, 1],
        cstr: [1, 1],
        val: [1, 1],
        isnumeric: [1, 1],
        round: [1, 2],
        replace: [3, 3],
        instr: [2, 2],
      };
      if (!arity[name]) unsupported(`関数 ${name}`);
      if (args.length < arity[name][0] || args.length > arity[name][1])
        fail("引数の数が一致していません", 450);
      let [x, y, z] = args;
      if (name === "len") return str(x).length;
      if (["left", "right", "mid"].includes(name)) {
        let n = num(y);
        if (
          n < 0 ||
          !Number.isInteger(n) ||
          (name === "mid" && n < 1) ||
          (z !== undefined && num(z) < 0)
        )
          fail("プロシージャの呼び出し、または引数が不正です", 5);
        return name === "left"
          ? str(x).slice(0, n)
          : name === "right"
            ? n
              ? str(x).slice(-n)
              : ""
            : str(x).slice(n - 1, z === undefined ? undefined : n - 1 + num(z));
      }
      if (name === "trim") return str(x).replace(/^ +| +$/g, "");
      if (name === "lcase") return str(x).toLowerCase();
      if (name === "ucase") return str(x).toUpperCase();
      if (name === "abs") return Math.abs(num(x));
      if (name === "int") return Math.floor(num(x));
      if (name === "fix") return Math.trunc(num(x));
      if (name === "cint") return cast(x, "integer");
      if (name === "clng") return cast(x, "long");
      if (name === "cdbl") return num(x);
      if (name === "cstr") return str(x);
      if (name === "val") {
        if (/^[\s]*[&]|[%&!#@]/.test(str(x)))
          unsupported("Val の16進数・型接尾辞");
        let m = str(x)
          .replace(/[ \t\r\n]/g, "")
          .match(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)/);
        return m ? Number(m[0]) : 0;
      }
      if (name === "isnumeric")
        return (
          typeof x !== "boolean" &&
          !x?.kind &&
          str(x).trim() !== "" &&
          Number.isFinite(Number(x))
        );
      if (name === "round") {
        let dp = y === undefined ? 0 : num(y);
        if (!Number.isInteger(dp) || dp < 0 || dp > 15)
          fail("プロシージャの呼び出し、または引数が不正です", 5);
        return roundEven(num(x) * 10 ** dp) / 10 ** dp;
      }
      if (name === "replace")
        return str(y) === "" ? str(x) : str(x).split(str(y)).join(str(z));
      if (name === "instr") return str(x).indexOf(str(y)) + 1;
      break;
    }
  }
  unsupported(a.k);
}
function assign(target, v, s, set = false) {
  if (target.k === "id") {
    let name = target.name;
    if (s.explicit && !(name in s.vars))
      fail(`変数が定義されていません：${name}`);
    let type = s.types[name] || "variant";
    if (set) {
      if (!["range", "nothing"].includes(v?.kind))
        fail("オブジェクトが必要です", 424);
    } else v = value(v, s);
    s.vars[name] = cast(v, type);
    s.types[name] = type;
    return `${name} ← ${display(s.vars[name])}`;
  }
  if (
    target.k === "call" &&
    target.target.k === "id" &&
    s.vars[target.target.name]?.kind === "array"
  ) {
    let arr = s.vars[target.target.name],
      idx = num(value(evalExpr(target.args[0], s), s));
    if (target.args.length !== 1) unsupported("多次元配列");
    if (
      !Number.isInteger(idx) ||
      idx < arr.low ||
      idx >= arr.low + arr.values.length
    )
      fail("インデックスが有効範囲にありません", 9);
    arr.values[idx - arr.low] = cast(value(v, s), arr.type || "variant");
    return `${target.target.name}(${idx}) ← ${display(v)}`;
  }
  let obj = target;
  if (target.k === "member" && ["value", "value2"].includes(target.name))
    obj = target.a;
  let range = evalExpr(obj, s);
  if (range?.kind === "nothing")
    fail("オブジェクト変数または With ブロック変数が設定されていません", 91);
  if (range?.kind !== "range") unsupported("代入先");
  v = value(v, s);
  range.cells.forEach((c) => (s.cells[c] = v));
  return `セル ${range.cells.join(", ")} に ${display(v)} を入れます`;
}
function clone(s) {
  return structuredClone(s);
}
export function simulate(source, model = {}, custom = {}) {
  let limits = { ...LIMITS, ...custom },
    started = performance.now(),
    operations = 0,
    truncated = false,
    reasons = new Set();
  let ast;
  try {
    ast = parse(source);
  } catch (e) {
    return {
      paths: [],
      error: {
        line: e.line || Number(e.message.match(/^(\d+)行/)?.[1]) || 1,
        message: e.message,
        code: e.code || 0,
      },
      truncated: false,
      operations,
    };
  }
  const check = () => {
    operations++;
    if (
      operations > limits.operations ||
      performance.now() - started > limits.milliseconds
    ) {
      truncated = true;
      reasons.add("探索回数・時間の上限");
      return false;
    }
    return true;
  };
  const note = (s, n, text, kind = "step") => {
    if (s.trace.length >= limits.steps) {
      s.halt = true;
      truncated = true;
      reasons.add("手順数の上限");
      return;
    }
    s.trace.push({ line: n.line, text, kind, tokens: n.tokens || [] });
  };
  const error = (s, n, e) => {
    s.err = e.code || 0;
    note(s, n, `${e.code ? `エラー ${e.code}：` : ""}${e.message}`, "error");
    if (!s.resume || !e.code) {
      s.halt = true;
      s.error = { line: n.line, message: e.message, code: e.code || 0 };
    } else note(s, n, "On Error Resume Next により次の文へ進みます");
  };
  function branch(s, test, n) {
    let v = value(evalExpr(test, s), s);
    return choose(s, v, n);
  }
  function choose(s, v, n) {
    if (!isU(v)) return [{ s, yes: bool(v) }];
    let out = [];
    for (let yes of [true, false]) {
      let copy = clone(s);
      if (constrain(copy, v, yes)) {
        note(
          copy,
          n,
          `条件が${yes ? "成立する" : "成立しない"}場合：${display(v)}`,
        );
        out.push({ s: copy, yes, uncertain: true });
      }
    }
    return out;
  }
  function constrain(s, v, yes) {
    const seeds = s.alternatives || [
      { facts: s.facts, constraints: s.constraints },
    ];
    let solutions = [];
    for (let seed of seeds)
      solutions.push(...solve(v, yes, structuredClone(seed)));
    if (solutions.length > 128)
      unsupported(
        "未確定条件の組み合わせが複雑すぎます（条件を分割してください）",
      );
    if (!solutions.length) return false;
    s.alternatives = solutions;
    s.facts = solutions[0].facts;
    s.constraints = solutions[0].constraints;
    return true;
  }
  function solve(v, yes, state) {
    if (!check()) fail("条件の探索上限で説明を停止しました");
    if (!isU(v)) return bool(v) === yes ? [state] : [];
    if (v.op === "not") return solve(v.a, !yes, state);
    if (v.op === "and" || v.op === "or") {
      let combinations =
        v.op === "and"
          ? yes
            ? [[true, true]]
            : [
                [false, false],
                [false, true],
                [true, false],
              ]
          : yes
            ? [
                [true, true],
                [true, false],
                [false, true],
              ]
            : [[false, false]];
      let found = [];
      for (let [left, right] of combinations) {
        for (let st of solve(v.a, left, structuredClone(state)))
          found.push(...solve(v.b, right, st));
      }
      return found;
    }
    if (v.op === "xor") {
      let found = [];
      for (let left of [true, false])
        for (let st of solve(v.a, left, structuredClone(state)))
          found.push(...solve(v.b, yes ? !left : left, st));
      return found;
    }
    let key = JSON.stringify(v);
    if (key in state.facts) return state.facts[key] === yes ? [state] : [];
    if (["=", "<>", ">", "<", ">=", "<="].includes(v.op)) {
      let a = v.a,
        b = v.b,
        op = v.op;
      if (!isU(a) && isU(b)) {
        [a, b] = [b, a];
        op = {
          "<": ">",
          ">": "<",
          "<=": ">=",
          ">=": "<=",
          "=": "=",
          "<>": "<>",
        }[op];
      }
      if (isU(a) && a.op && typeof b === "number") {
        // Linear transforms of a single unknown preserve interval reachability.
        let normalized = linear(a);
        if (normalized && normalized.scale !== 0) {
          b = (b - normalized.offset) / normalized.scale;
          if (normalized.scale < 0)
            op = {
              "<": ">",
              ">": "<",
              "<=": ">=",
              ">=": "<=",
              "=": "=",
              "<>": "<>",
            }[op];
          a = normalized.atom;
        }
      }
      if (isU(a) && !a.op && !isU(b) && !b?.kind) {
        if (!yes)
          op = {
            "=": "<>",
            "<>": "=",
            ">": "<=",
            "<": ">=",
            ">=": "<",
            "<=": ">",
          }[op];
        let id = a.symbol || a.source,
          domain = state.constraints[id] || { conditions: [] };
        if (a.min !== undefined)
          domain.conditions.push({ op: ">=", value: a.min });
        if (a.max !== undefined)
          domain.conditions.push({ op: "<=", value: a.max });
        domain.conditions.push({ op, value: b });
        let conditions = domain.conditions,
          eq = conditions.find((c) => c.op === "=");
        if (eq) {
          if (
            ["long", "integer"].includes(a.valueType) &&
            typeof eq.value === "number" &&
            (!Number.isInteger(eq.value) ||
              eq.value < (a.valueType === "integer" ? -32768 : -2147483648) ||
              eq.value > (a.valueType === "integer" ? 32767 : 2147483647))
          )
            return [];
          if (conditions.some((c) => !bool(binary(c.op, eq.value, c.value))))
            return [];
        } else {
          let lo,
            hi,
            loOpen = false,
            hiOpen = false;
          for (let c of conditions) {
            if (c.op === ">" || c.op === ">=") {
              if (lo === undefined || binary(">", c.value, lo)) {
                lo = c.value;
                loOpen = c.op === ">";
              } else if (binary("=", c.value, lo)) loOpen ||= c.op === ">";
            }
            if (c.op === "<" || c.op === "<=") {
              if (hi === undefined || binary("<", c.value, hi)) {
                hi = c.value;
                hiOpen = c.op === "<";
              } else if (binary("=", c.value, hi)) hiOpen ||= c.op === "<";
            }
          }
          if (
            lo !== undefined &&
            hi !== undefined &&
            (binary(">", lo, hi) ||
              (binary("=", lo, hi) &&
                (loOpen ||
                  hiOpen ||
                  conditions.some(
                    (c) => c.op === "<>" && binary("=", c.value, lo),
                  ))))
          )
            return [];
          if (
            ["long", "integer"].includes(a.valueType) &&
            conditions.every((c) => typeof c.value === "number")
          ) {
            let min =
              lo === undefined
                ? a.valueType === "integer"
                  ? -32768
                  : -2147483648
                : loOpen
                  ? Math.floor(lo) + 1
                  : Math.ceil(lo);
            let max =
              hi === undefined
                ? a.valueType === "integer"
                  ? 32767
                  : 2147483647
                : hiOpen
                  ? Math.ceil(hi) - 1
                  : Math.floor(hi);
            let excluded = new Set(
              conditions
                .filter(
                  (c) =>
                    c.op === "<>" &&
                    Number.isInteger(c.value) &&
                    c.value >= min &&
                    c.value <= max,
                )
                .map((c) => c.value),
            );
            if (max - min + 1 <= excluded.size) return [];
          }
        }
        state.constraints[id] = domain;
      } else if (isU(a) && isU(b) && JSON.stringify(a) === JSON.stringify(b)) {
        let truth = ["=", "<=", ">="].includes(op);
        if (truth !== yes) return [];
      } else unsupported("複数の未確定値や非線形式を組み合わせた比較");
    }
    state.facts[key] = yes;
    return [state];
  }
  function linear(v) {
    if (!isU(v)) return null;
    if (!v.op) return { atom: v, scale: 1, offset: 0 };
    let left = linear(v.a);
    if (!left) return null;
    if (v.op === "-" && v.b === undefined)
      return { ...left, scale: -left.scale, offset: -left.offset };
    if (typeof v.b !== "number") return null;
    if (v.op === "+") return { ...left, offset: left.offset + v.b };
    if (v.op === "-") return { ...left, offset: left.offset - v.b };
    if (v.op === "*")
      return { ...left, scale: left.scale * v.b, offset: left.offset * v.b };
    if (v.op === "/" && v.b !== 0)
      return { ...left, scale: left.scale / v.b, offset: left.offset / v.b };
    return null;
  }

  function run(nodes, states, depth = 0) {
    for (let n of nodes) {
      let next = [];
      for (let s of states) {
        if (!check()) {
          for (let pending of states) {
            note(pending, n, "探索上限でこのパスの説明を停止しました", "limit");
            pending.halt = true;
          }
          return states.slice(0, limits.paths);
        }
        if (s.halt || s.signal) {
          next.push(s);
          continue;
        }
        try {
          next.push(...execute(n, s, depth));
        } catch (e) {
          error(s, n, e);
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
  function execute(n, s, depth) {
    if (depth > limits.depth) {
      unsupported("実行時の入れ子が深すぎます");
    }
    switch (n.k) {
      case "start":
        note(s, n, "マクロを開始します");
        return [s];
      case "dim":
        for (let d of n.declarations) {
          if (!s.initializing) {
            note(
              s,
              n,
              `${d.name} は ${d.type} の変数です：${display(s.vars[d.name])}`,
            );
            continue;
          }
          if (d.name in s.types)
            fail(`同じ変数が重複して宣言されています：${d.name}`);
          s.types[d.name] = d.type;
          let initial =
            d.type === "variant"
              ? EMPTY
              : d.type === "string"
                ? ""
                : d.type === "boolean"
                  ? false
                  : ["object", "range", "worksheet", "workbook"].includes(
                        d.type,
                      )
                    ? NOTHING
                    : 0;
          if (d.bounds) {
            if (
              d.bounds.some(
                (b) =>
                  JSON.stringify(b).includes('\"k\":\"id\"') ||
                  JSON.stringify(b).includes('\"k\":\"call\"'),
              )
            )
              unsupported("Dim の配列添字は定数式のみ対応");
            let low = num(evalExpr(d.bounds[0], s)),
              high = num(evalExpr(d.bounds[1], s));
            if (!Number.isInteger(low) || !Number.isInteger(high) || high < low)
              fail("インデックスが有効範囲にありません", 9);
            if (high - low > 10000) unsupported("配列要素は10001個まで");
            s.vars[d.name] = {
              kind: "array",
              low,
              type: d.type,
              values: Array.from({ length: high - low + 1 }, () => initial),
            };
          } else s.vars[d.name] = initial;
          note(
            s,
            n,
            `${d.name} を ${d.type} として用意します：${display(s.vars[d.name])}`,
          );
        }
        return [s];
      case "assign": {
        let v = evalExpr(n.value, s);
        let text = assign(n.target, v, s, n.set);
        s.facts = {};
        note(s, n, text);
        return [s];
      }
      case "output": {
        let vals = n.args.map((a) => value(evalExpr(a, s), s));
        let text = vals.map(display).join(", ");
        s.outputs.push({ channel: n.channel, text, line: n.line });
        note(s, n, `${n.channel} に ${text} を出力します`);
        return [s];
      }
      case "onerror":
        s.resume = n.resume;
        s.err = 0;
        note(
          s,
          n,
          n.resume
            ? "実行時エラー後も次の文へ進みます"
            : "エラーの無視を解除します",
        );
        return [s];
      case "exit":
        if (n.what !== "sub" && !s.loopStack?.includes(n.what))
          fail(`Exit ${n.what} が対応するループの外にあります`);
        if (n.what === "sub") {
          s.halt = true;
          note(s, n, "Sub を終了します");
        } else {
          s.signal = n.what;
          note(s, n, `${n.what === "for" ? "For" : "Do"} を抜けます`);
        }
        return [s];
      case "if": {
        let pending = [s],
          done = [];
        for (let b of n.branches) {
          let remain = [];
          for (let st of pending) {
            let marker = { ...n, line: b.line, tokens: b.tokens || n.tokens };
            for (let r of branch(st, b.test, marker)) {
              note(
                r.s,
                marker,
                r.yes
                  ? "If / ElseIf 条件が成立します"
                  : "If / ElseIf 条件が成立しません",
              );
              if (r.yes) done.push(...run(b.body, [r.s], depth + 1));
              else remain.push(r.s);
            }
          }
          pending = remain;
        }
        done.push(...run(n.otherwise, pending, depth + 1));
        return done;
      }
      case "select": {
        let subject = value(evalExpr(n.test, s), s),
          pending = [s],
          done = [];
        note(s, n, `Select Case ${display(subject)} を順に判定します`);
        for (let c of n.cases) {
          let rest = [];
          for (let st of pending) {
            let result = false;
            if (c.checks) {
              for (let x of c.checks) {
                let r =
                  x.op === "range"
                    ? binary(
                        "and",
                        typedCompare(
                          ">=",
                          subject,
                          value(evalExpr(x.low, st), st),
                          expressionType(n.test, st),
                          expressionType(x.low, st),
                        ),
                        typedCompare(
                          "<=",
                          subject,
                          value(evalExpr(x.high, st), st),
                          expressionType(n.test, st),
                          expressionType(x.high, st),
                        ),
                      )
                    : typedCompare(
                        x.op,
                        subject,
                        value(evalExpr(x.value, st), st),
                        expressionType(n.test, st),
                        expressionType(x.value, st),
                      );
                result = binary("or", result, r);
                if (result === true) break;
              }
            } else result = true;
            let branches = choose(st, result, {
              ...n,
              line: c.line,
              tokens: c.tokens,
            });
            for (let r of branches) {
              note(
                r.s,
                { ...n, line: c.line, tokens: c.tokens },
                r.yes ? "この Case に一致します" : "この Case には一致しません",
              );
              if (r.yes) done.push(...run(c.body, [r.s], depth + 1));
              else rest.push(r.s);
            }
          }
          pending = rest;
        }
        return done.concat(pending);
      }
      case "for":
      case "each":
      case "do":
        return loop(n, s, depth);
    }
    unsupported(n.k);
  }
  function symbolicFor(n, s, start, end, step, depth) {
    if (isU(step))
      unsupported("未確定の Step（方向・0の可能性を確定できません）");
    step = num(step);
    if (step === 0) unsupported("未確定の範囲と Step 0 の組み合わせ");
    assign({ k: "id", name: n.name }, start, s);
    let active = [s],
      done = [];
    for (let count = 0; count <= 2 && active.length; count++) {
      let next = [];
      for (let st of active) {
        let test = binary(step > 0 ? "<=" : ">=", st.vars[n.name], end);
        for (let r of choose(st, test, n)) {
          if (!r.yes) {
            note(
              r.s,
              n,
              `${count}回実行してループを終了します（実行時の値による）`,
            );
            done.push(r.s);
            continue;
          }
          if (count === 2) {
            note(
              r.s,
              n,
              "2回より多く続く可能性があります。以降の状態は確定できません",
              "limit",
            );
            r.s.halt = true;
            truncated = true;
            reasons.add("未確定ループの代表パス");
            done.push(r.s);
            continue;
          }
          note(
            r.s,
            n,
            `ループ ${count + 1}回目を実行します（実行時の値による）`,
          );
          r.s.loopStack ??= [];
          r.s.loopStack.push("for");
          for (let out of run(n.body, [r.s], depth + 1)) {
            out.loopStack.pop();
            if (out.signal === "for") {
              out.signal = null;
              done.push(out);
            } else if (out.halt || out.signal) done.push(out);
            else {
              assign(
                { k: "id", name: n.name },
                binary("+", out.vars[n.name], step),
                out,
              );
              out.facts = {};
              next.push(out);
            }
          }
        }
      }
      active = next;
    }
    return done;
  }
  function loop(n, s, depth) {
    let values, start, end, step, collection;
    if (n.k === "for") {
      start = value(evalExpr(n.from, s), s);
      end = value(evalExpr(n.to, s), s);
      step = value(evalExpr(n.step, s), s);
      if (isU(start) || isU(end) || isU(step))
        return symbolicFor(n, s, start, end, step, depth);
      start = num(start);
      end = num(end);
      step = num(step);
      assign({ k: "id", name: n.name }, start, s);
      if (step === 0) {
        note(s, n, "Step 0：Exit For がなければ終了条件に近づきません");
      }
    }
    if (n.k === "each") {
      collection = evalExpr(n.collection, s);
      if (collection?.kind === "range")
        values = collection.cells.map((c) => ({ kind: "range", cells: [c] }));
      else if (collection?.kind === "array") {
        if (s.types[n.name] && s.types[n.name] !== "variant")
          fail("配列の For Each 変数は Variant である必要があります");
        values = collection.values;
      } else unsupported("For Each のコレクション");
      if (
        s.types[n.name] &&
        !["variant", "object", "range"].includes(s.types[n.name])
      )
        fail("For Each の変数は Variant または Object である必要があります");
    }
    let active = [s],
      done = [];
    for (let count = 0; active.length; count++) {
      if (!check()) {
        for (let pending of active) {
          note(pending, n, "探索上限でループの説明を停止しました", "limit");
          pending.halt = true;
        }
        return done.concat(active);
      }
      let continuing = [];
      for (let st of active) {
        if (st.halt) {
          done.push(st);
          continue;
        }
        let choices;
        if (n.k === "for") {
          let current = num(st.vars[n.name]);
          choices = [
            { s: st, yes: step >= 0 ? current <= end : current >= end },
          ];
        } else if (n.k === "each")
          choices = [{ s: st, yes: count < values.length }];
        else if (n.post && count === 0) choices = [{ s: st, yes: true }];
        else if (!n.test) choices = [{ s: st, yes: true }];
        else {
          const conditionLine = n.post
            ? { ...n, line: n.endLine, tokens: n.endTokens }
            : n;
          try {
            choices = branch(st, n.test, conditionLine).map((r) => ({
              ...r,
              yes: n.mode === "until" ? !r.yes : r.yes,
            }));
          } catch (e) {
            error(st, conditionLine, e);
            done.push(st);
            continue;
          }
        }
        for (let r of choices) {
          if (!r.yes) {
            note(r.s, n, `${count}回実行してループを終了します`);
            done.push(r.s);
            continue;
          }
          if (count >= limits.iterations) {
            note(
              r.s,
              n,
              `${limits.iterations}回で表示を打ち切りました。ループは続く可能性があります`,
              "limit",
            );
            r.s.halt = true;
            truncated = true;
            reasons.add("ループ回数の上限");
            done.push(r.s);
            continue;
          }
          if (n.k === "do" && r.uncertain && count >= 2) {
            note(
              r.s,
              n,
              "2回より多く続く可能性があります。以降の状態は確定できません",
              "limit",
            );
            r.s.halt = true;
            truncated = true;
            reasons.add("未確定ループの代表パス");
            done.push(r.s);
            continue;
          }
          if (n.k === "each") {
            r.s.vars[n.name] = values[count];
            r.s.types[n.name] ||= "variant";
          }
          note(
            r.s,
            n,
            `ループ ${count + 1}回目を実行します${n.name ? `：${n.name} = ${display(r.s.vars[n.name])}` : ""}`,
          );
          r.s.loopStack ??= [];
          r.s.loopStack.push(n.k === "do" ? "do" : "for");
          let results = run(n.body, [r.s], depth + 1);
          for (let out of results) out.loopStack.pop();
          for (let out of results) {
            if (out.signal === (n.k === "do" ? "do" : "for")) {
              out.signal = null;
              done.push(out);
              continue;
            }
            if (out.halt || out.signal) {
              done.push(out);
              continue;
            }
            if (n.k === "for") {
              try {
                assign(
                  { k: "id", name: n.name },
                  num(out.vars[n.name]) + step,
                  out,
                );
              } catch (e) {
                error(out, { line: n.endLine, tokens: n.endTokens }, e);
                done.push(out);
                continue;
              }
              note(
                out,
                { line: n.endLine, tokens: n.endTokens },
                `Next：${n.name} を ${display(out.vars[n.name])} に進めます`,
              );
            } else
              note(
                out,
                { line: n.endLine, tokens: n.endTokens },
                n.k === "each"
                  ? "Next：次の要素へ進みます"
                  : "Loop：条件を確認します",
              );
            out.facts = {};
            continuing.push(out);
          }
        }
      }
      active = continuing;
      if (done.length + active.length > limits.paths) {
        done = done.slice(0, limits.paths);
        active = active.slice(0, Math.max(0, limits.paths - done.length));
        truncated = true;
        reasons.add("パス数の上限");
      }
    }
    return done;
  }
  const cells = {};
  for (let r = 1; r <= 5; r++)
    for (let c of ["A", "B", "C"])
      cells[c + r] = Object.hasOwn(model, c + r) ? model[c + r] : EMPTY;
  let initial = {
    vars: {},
    types: {},
    cells,
    outputs: [],
    trace: [],
    facts: {},
    explicit: ast.explicit,
    base: ast.base,
    resume: false,
    err: 0,
    halt: false,
    signal: null,
    inputId: 0,
    constraints: {},
  };
  for (let [key, v] of Object.entries(initial.cells))
    if (isU(v)) {
      initial.cells[key] = { ...v, symbol: `cell-${key}` };
    }
  let baseline = structuredClone(initial.cells);
  initial.initializing = true;
  function declarations(nodes) {
    for (let n of nodes) {
      if (n.k === "dim") {
        try {
          execute(n, initial, 0);
        } catch (e) {
          e.line = n.line;
          throw e;
        }
      }
      if (n.body) declarations(n.body);
      if (n.branches) for (let b of n.branches) declarations(b.body);
      if (n.otherwise) declarations(n.otherwise);
      if (n.cases) for (let c of n.cases) declarations(c.body);
    }
  }
  try {
    declarations(ast.body);
  } catch (e) {
    return {
      paths: [],
      error: { line: e.line || 1, message: e.message, code: e.code || 0 },
      operations,
      truncated: false,
    };
  }
  initial.initializing = false;
  initial.trace = [];
  let paths = run(ast.body, [initial]);
  for (let p of paths) {
    if (p.signal) {
      p.error = {
        line: p.trace.at(-1)?.line || 1,
        message: `Exit ${p.signal} が対応するループの外にあります`,
      };
    }
    p.id = paths.indexOf(p);
    p.changes = Object.entries(p.cells).filter(
      ([k, v]) => JSON.stringify(v) !== JSON.stringify(baseline[k]),
    );
  }
  return {
    paths,
    truncated,
    reasons: [...reasons],
    operations,
    elapsed: performance.now() - started,
    limits,
  };
}
