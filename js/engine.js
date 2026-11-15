import {
  unknownLabel,
  truncateDisplayText,
  VALUE_LENGTH_LIMIT,
} from "./core/presentation.js";
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
// RG-04 (一部): VBA の数値の文字列変換は有効数字15桁が既定
// （例: 0.1 + 0.2 は JS の全桁 "0.30000000000000004" でなく "0.3" と表示される）
function vbaNumberString(n) {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const toScientific = (s) => {
    let [mantissa, exp] = s.split(/e/i);
    mantissa = mantissa.replace(/\.?0+$/, "");
    let e = parseInt(exp, 10);
    return `${mantissa}E${e < 0 ? "-" : "+"}${String(Math.abs(e)).padStart(2, "0")}`;
  };
  // VBA の変換は絶対値が 0.0001 未満では指数表記になる
  if (n !== 0 && Math.abs(n) < 0.0001) return toScientific(n.toExponential(14));
  let s = n.toPrecision(15);
  if (/e/i.test(s)) return toScientific(s);
  return String(Number(s));
}
// 型名は VBA の正規表記（先頭大文字）で表示する。内部の型名は小文字のまま保持する
export function typeLabel(type) {
  return (
    {
      variant: "Variant",
      integer: "Integer",
      long: "Long",
      double: "Double",
      single: "Single",
      string: "String",
      boolean: "Boolean",
      object: "Object",
      range: "Range",
      worksheet: "Worksheet",
      workbook: "Workbook",
    }[type] || type
  );
}
export function display(v) {
  // P-N2: 未確定値の説明も表示専用なので、合成が深い場合の長い説明は
  // 省略記法つきで切り詰める（値の同一性・制約情報は変えない）。
  if (v?.kind === "unknown") return truncateDisplayText(unknownLabel(v));
  if (v?.kind === "empty") return "Empty";
  if (v?.kind === "null") return "Null";
  if (v?.kind === "nothing") return "Nothing";
  if (v?.kind === "range") return `Range("${v.cells.join(":")}")`;
  if (v?.kind === "array")
    return truncateDisplayText(
      `[${v.values.map(display).join(", ")}]（${v.low}〜${v.low + v.values.length - 1}）`,
    );
  if (typeof v === "number") return vbaNumberString(v);
  // RG-04（R5-N4／R6-N5・統合裁定）: 実 VBA の表示は Boolean が True／False、
  // 文字列は引用符なし。旧表示（小文字 true／false、引用符つき文字列）は
  // 既存テストが固定していたが、台帳の受け入れ条件（実物表記の一致）を
  // 優先して是正した。
  // P-N2: 表示専用の整形では長い文字列を省略記法つきで切り詰める
  // （代入のたびに値全体が手順テキストへ複製されて肥大するのを防ぐ）。
  if (typeof v === "string") return truncateDisplayText(v);
  if (typeof v === "boolean") return v ? "True" : "False";
  return String(v);
}
class VBAError extends Error {
  constructor(message, code = 0) {
    super(message);
    this.code = code;
  }
}
// P-N3 受け皿：ホスト例外（V8 の TypeError／RangeError、structuredClone の
// DataCloneError、JSON 化の TypeError 等）の生文言を学習者向け表示
// （トップレベルエラー／パスエラー／手順テキスト）へ漏らさないための変換。
// VBAError はこのエンジンが意図して作った正当な停止理由なのでそのまま通し、
// それ以外は内部文言を一切出さず日本語の汎用文言で受ける
// （js/core/script.js の toLearnerError、c-family の hostErrorAsPractice と同方針）。
// このエンジンは core/script.js の executeProgram を経由しない独立実装の
// ため、変換層はこちらに置く。
function toLearnerVBAError(e) {
  if (e instanceof VBAError) return e;
  if (e instanceof RangeError)
    return new VBAError(
      "値や処理が大きすぎて処理できませんでした。コードを小さくして再実行してください。",
    );
  return new VBAError(
    "処理中に予期しないエラーが発生しました。コードやモデルを小さくして再実行してください。",
  );
}
const fail = (m, c = 0) => {
  throw new VBAError(m, c);
};
// 字句解析のエラーは行番号をメッセージ本文に埋め込まず、line フィールドに分離する
// （UI 側が「N行：」を前置するため、本文に埋め込むと二重表示になる。他エンジンと同設計）
const lexFail = (m, lineNo) => {
  let e = new VBAError(m, 0);
  e.line = lineNo;
  throw e;
};
const unsupported = (s) => fail(`この構文は説明に対応していません：${s}`);
// RG-60（R18-N1）：識別子に取り込んではいけない文字（空白的文字・不可視文字・
// スマートクォート・CJK 句読点・全角英数字記号）。貼り付けで混入しやすく、
// 取り込むと幻の変数になって無言の誤値を生むため、文字を名指して停止する。
const ID_EXCLUDED = /[\u00A0\u1680\u2000-\u200D\u2018-\u201D\u202F\u205F\u2060\u3000-\u303F\uFEFF\uFF01-\uFF5E]/;
export function charLabel(c) {
  const cp = c.codePointAt(0);
  const hex = "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
  const names = {
    0x3000: "全角スペース",
    0x00a0: "ノーブレークスペース",
    0x200b: "ゼロ幅スペース",
    0xfeff: "ゼロ幅ノーブレークスペース（BOM）",
    0x201c: "スマートクォート",
    0x201d: "スマートクォート",
    0x2018: "スマートクォート",
    0x2019: "スマートクォート",
  };
  if (names[cp]) return `${names[cp]}（${hex}）`;
  if (cp >= 0xff10 && cp <= 0xff19) return `全角数字（${hex}）`;
  if (cp >= 0xff01 && cp <= 0xff5e) return `全角文字（${hex}）`;
  return `文字（${hex}）`;
}
export function lex(source) {
  // 先頭の BOM は取り込み経路（import）と揃えて取り除く
  if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);
  let result = [],
    i = 0,
    line = 1;
  while (i < source.length) {
    let c = source[i];
    if (c === "\r") {
      // RG-60（R18-N2）：CR も行境界として扱う（CRLF は1つの境界）。
      if (source[i + 1] === "\n") i++;
      result.push({ v: "\n", line });
      line++;
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
      while (i < source.length && source[i] !== "\n" && source[i] !== "\r") i++;
      continue;
    }
    if (c === '"') {
      let value = "",
        start = line;
      i++;
      let closed = false;
      while (i < source.length) {
        if (source[i] === "\n") lexFail("文字列が閉じられていません", start);
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
      if (!closed) lexFail("文字列が閉じられていません", start);
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
      // RG-60：除外文字が混ざっていたら、そこで識別子を打ち切る（先頭なら即停止）。
      // 除外文字そのものは次の周回で名指しのエラーになる。
      const bad = m[0].search(ID_EXCLUDED);
      if (bad === 0)
        lexFail(`識別子に使えない文字があります：${charLabel(c)}`, line);
      const name = bad > 0 ? m[0].slice(0, bad) : m[0];
      result.push({ v: name, type: "id", line });
      i += name.length;
      continue;
    }
    m = source.slice(i).match(/^(<=|>=|<>|[+\-*/\\^&=<>(),.:])/);
    if (m) {
      result.push({ v: m[0], line });
      i += m[0].length;
      continue;
    }
    if (ID_EXCLUDED.test(c) || c.codePointAt(0) < 0x20)
      lexFail(`識別子や記号として扱えない文字があります：${charLabel(c)}`, line);
    lexFail(`この構文は説明に対応していません：${c}`, line);
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
    // 文字列リテラルの中身（":" "," "(" ")" など）を区切り・括弧と混同しない
    if (t.type !== "string") {
      if (t.v === "(") depth++;
      if (t.v === ")") depth--;
      if (depth === 0 && lower(t) === delimiter) {
        out.push(ts.slice(start, i));
        start = i + 1;
      }
    }
  });
  out.push(ts.slice(start));
  return out;
}
function topIndex(ts, v) {
  let d = 0;
  return ts.findIndex((t) => {
    if (t.type === "string") return false;
    if (t.v === "(") d++;
    if (t.v === ")") d--;
    return d === 0 && lower(t) === v;
  });
}
export function parse(source) {
  if (source.length > LIMITS.source)
    fail(`コードは${LIMITS.source}文字以内にしてください`);
  // 行継続 "_"：行末の単独 "_" トークンと直後の改行を取り除き、論理行を連結する。
  // 文字列リテラル "_"（type: "string"）や識別子の一部（my_var 等）は対象にしない。
  const rawTokens = lex(source),
    ts = [];
  for (let k = 0; k < rawTokens.length; k++) {
    let t = rawTokens[k];
    if (t.type === "id" && t.v === "_" && rawTokens[k + 1]?.v === "\n") {
      k++; // "_" と改行を両方落とす
      continue;
    }
    ts.push(t);
  }
  const lines = [];
  let cur = [];
  for (let t of ts) {
    // 文の区切り ":" は演算子トークンのときだけ。中身が ":" の文字列リテラルは文を区切らない
    if ((t.v === "\n" || t.v === ":") && t.type !== "string") {
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
    // 入れ子ブロックの解析中に外側ブロックの終端（End Sub 等）に当たったら、
    // その終端を消費せずに呼び出し元へ戻す。呼び出し元が「End If が必要です」等、
    // 欠けている終端そのものを名指して停止する（終端側を責めない）。
    const foreignTerminator = () =>
      depth > 0 &&
      ["end if", "end select", "end sub", "next", "loop", "else", "elseif", "case"].some(
        (t) => !stops.includes(t) && starts(t),
      );
    while (i < lines.length && !stops.some(starts) && !foreignTerminator()) {
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
            if (as >= 0 && as + 1 >= part.length)
              fail("As の後に型名が必要です");
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
            let bounds = null,
              dynamic = false;
            if (left.length > 1) {
              if (left[1].v !== "(" || left.at(-1).v !== ")")
                fail("配列宣言が不正です");
              let inside = left.slice(2, -1),
                to = topIndex(inside, "to");
              if (!inside.length) {
                // Dim a() は動的配列の宣言そのものは受理する（要素は未割当）。
                // サイズの割当は ReDim で行うが、本エンジンでは ReDim を未対応として名指す。
                dynamic = true;
              } else
                bounds =
                  to < 0
                    ? [{ k: "lit", v: base }, expression(inside)]
                    : [
                        expression(inside.slice(0, to)),
                        expression(inside.slice(to + 1)),
                      ];
            }
            return { name: lower(left[0]), type, bounds, dynamic };
          });
          out.push({ ...node, k: "dim", declarations });
          continue;
        }
        if (w === "redim") {
          // 動的配列は宣言済み未対応。汎用文でなく構文名を挙げて停止する
          unsupported(
            words[1] === "preserve"
              ? "ReDim Preserve（動的配列）"
              : "ReDim（動的配列）",
          );
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
const str = (v) => {
  if (v?.kind === "empty") return "";
  // F-VBA-02: 数値の文字列化は表示と同じ VBA 既定変換（有効数字15桁）を使う。
  // JS の String(数値) の全桁文字列（"0.30000000000000004" 等）を返さない。
  if (typeof v === "number") return vbaNumberString(v);
  // F-VBA-03: 配列・オブジェクト等の内部表現を JS の String(obj)
  // （"[object Object]"）で文字列化して捏造しない。実 VBA はエラー13。
  if (typeof v === "object" && v !== null) fail("型が一致しません", 13);
  return v === true ? "True" : v === false ? "False" : String(v);
};
const bool = (v) => {
  // F-VBA-01: 条件位置（および Boolean への変換）で Null は黙って False に
  // せず、実 VBA どおりエラー94で停止する。
  if (v?.kind === "null") fail("Null の使い方が不正です", 94);
  // RG-74（R20-N4）: 実 VBA の条件変換（CBool と同じ規則）では、文字列
  // "True"／"False" は大小を区別せず真偽値に変換される。
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (t === "true") return true;
    if (t === "false") return false;
  }
  return v?.kind === "empty"
    ? false
    : typeof v === "boolean"
      ? v
      : num(v) !== 0;
};
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
  // P-N1: 文字列連結は、実体を作る前に長さを見積もり、上限を超える
  // 結果は Python 系統と同じく未確定値へ倒す（倍々連結での OOM 防止）。
  if (op === "&") {
    const sa = str(a),
      sb = str(b);
    if (sa.length + sb.length > VALUE_LENGTH_LIMIT)
      return unknown("とても長い文字列");
    return sa + sb;
  }
  if (op === "+" && a?.kind === "empty") return b?.kind === "empty" ? 0 : b;
  if (op === "+" && b?.kind === "empty") return a;
  if (op === "+" && typeof a === "string" && typeof b === "string") {
    if (a.length + b.length > VALUE_LENGTH_LIMIT)
      return unknown("とても長い文字列");
    return a + b;
  }
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
  // F-VBA-09: 負の底に整数でない指数を使う ^ は、オーバーフロー(6)ではなく
  // 実 VBA どおりエラー5（底に負数を使えるのは指数が整数の場合のみ）。
  if (op === "^" && x < 0 && !Number.isInteger(y))
    fail("プロシージャの呼び出し、または引数が不正です", 5);
  if (["/", "\\", "mod"].includes(op) && y === 0) fail("0 で除算しました", 11);
  // RG-31: \ と Mod は被演算子を丸めてから除算する。丸めた後の除数が 0 なら
  // どちらもエラー11（0除算）であり、Mod だけオーバーフロー(6)にしない。
  if (["\\", "mod"].includes(op) && roundEven(y) === 0)
    fail("0 で除算しました", 11);
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
    // RG-12／F-VBA-10: 文字列（リテラル・String型変数・文字列を返す式）＋
    // 数値型の + は数値演算（結果は Double 扱い）
    if (a.op === "+") {
      const numericT = (t) =>
        ["integer", "long", "double", "single", "boolean"].includes(t);
      if ((x === "string" && numericT(y)) || (y === "string" && numericT(x)))
        return "double";
    }
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
    // RG-12／F-VBA-10: 片方が文字列でもう片方が数値なら、文字列を数値へ
    // 変換して加算するのが VBA の + の古典規則（"5" + 3 = 8、変換できない
    // 文字列はエラー13）。対象は文字列リテラルだけでなく、String 型変数や
    // 文字列を返す式・Variant に格納された文字列も同じで、宣言型によって
    // 規則を変えない（RG-12 の VBA 側方針どおり暗黙変換を実装する）。
    // 両方とも文字列のときだけ連結になる。
    const numericT = (t) =>
      ["integer", "long", "double", "single", "boolean"].includes(t);
    const isNumVal = (v) => typeof v === "number" || typeof v === "boolean";
    if (
      (typeof x === "string" && isNumVal(y)) ||
      (typeof y === "string" && isNumVal(x))
    )
      return binary(op, x, y);
    if (
      (isU(x) || isU(y)) &&
      ((xt === "string" && numericT(yt)) ||
        (yt === "string" && numericT(xt)) ||
        (xt === "string" && isNumVal(y)) ||
        (yt === "string" && isNumVal(x)))
    )
      return unknown(`${display(x)} + ${display(y)}`, {
        op,
        a: x,
        b: y,
        valueType: "double",
      });
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
      // RG-24: 括弧なしで参照される引数なし組み込み関数は、暗黙変数（Empty）に
      // 落とさず、組み込み関数として「実行時に決まる値」で扱う（Date／Now と同じ扱い）。
      // 呼び出すたびに値が変わり得るものは評価ごとに独立した未確定値にする。
      const bareBuiltins = {
        time: ["実行時の現在時刻", "double"],
        rnd: ["Rnd による乱数（0以上1未満）", "double"],
        timer: ["実行時の午前0時からの経過秒数（Timer）", "double"],
        command: ["起動時に渡された引数文字列（Command）", "string"],
        curdir: ["現在のフォルダ（CurDir）", "string"],
        freefile: ["使用可能な次のファイル番号（FreeFile）", "long"],
        doevents: ["DoEvents の戻り値", "long"],
        imestatus: ["IME の状態（IMEStatus）", "long"],
      };
      if (a.name in bareBuiltins) {
        let [source, valueType] = bareBuiltins[a.name];
        let changing = ["rnd", "timer", "freefile", "doevents"].includes(a.name);
        return unknown(source, {
          valueType,
          ...(changing ? { symbol: `${a.name}-${s.inputId++}` } : {}),
        });
      }
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
        // F-VBA-08: InputBox は prompt 以外にも title／default／xpos／ypos／
        // helpfile／context まで最大7引数が有効。4引数以降を個数エラー(450)
        // で拒否しない（戻り値が未確定値である点は従来どおり）。
        if (args.length < 1 || args.length > 7)
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
        // F-VBA-06（同根の兄弟表面）: 行・列は Long 引数なので、小数は
        // VBA の暗黙変換（銀行丸め）で整数化してから範囲判定する。
        let r = roundEven(num(args[0])),
          c = roundEven(num(args[1]));
        if (r < 1 || r > 5 || c < 1 || c > 3)
          unsupported("モデルシートは A1:C5 のみ対応");
        return { kind: "range", cells: [String.fromCharCode(64 + c) + r] };
      }
      if (name === "array") return { kind: "array", low: s.base, values: args };
      if (name in s.vars) {
        let arr = s.vars[name];
        if (arr?.kind !== "array") fail("型が一致しません", 13);
        if (args.length !== 1) unsupported("多次元配列");
        // F-VBA-06: 添字は Long への暗黙変換（銀行丸め）を受ける。
        // 整数でないことを理由にエラー9にはしない。
        let index = roundEven(num(args[0]));
        if (index < arr.low || index >= arr.low + arr.values.length)
          fail("インデックスが有効範囲にありません", 9);
        return arr.values[index - arr.low];
      }
      if (
        ["isnull", "isempty"].includes(name) &&
        args.length !== 1
      )
        fail("引数の数が一致していません", 450);
      if (name === "isnull") return args[0]?.kind === "null";
      if (name === "isempty") return args[0]?.kind === "empty";
      if (["lbound", "ubound"].includes(name)) {
        // R24-N17: VBA-Docs の構文は LBound/UBound(arrayname, [dimension]) で、
        // dimension は省略可能（省略時は 1）。従来は次元引数を渡す形をすべて
        // 個数エラー 450 で拒否していたが、450 は引数の個数が実際に合わない
        // 場合（0 個または 3 個以上）だけに使う。本アプリの配列は 1 次元のみ
        // なので、有効な次元は 1 だけであり、それ以外の次元は実 VBA どおり
        // 「添字が範囲を超えている」エラー 9 で止める。次元は Long 引数なので
        // 他の Long 引数と同じく銀行丸めで整数化してから判定する。
        if (args.length < 1 || args.length > 2)
          fail("引数の数が一致していません", 450);
        if (args[0]?.kind !== "array") fail("型が一致しません", 13);
        if (args[0].dynamic && !args[0].values.length)
          fail("インデックスが有効範囲にありません", 9);
        let dim = args.length === 2 ? roundEven(num(args[1])) : 1;
        if (dim !== 1) fail("インデックスが有効範囲にありません", 9);
        return (
          args[0].low + (name === "ubound" ? args[0].values.length - 1 : 0)
        );
      }
      if (args.some((v) => v?.kind === "null")) {
        // F-VBA-05: Null の扱いは関数ごとに異なる。一括で Null を返して
        // 関数固有の規則を上書きしない。
        // ・CStr／CInt／CLng／CDbl／Val はエラー94（値を取得できない）
        // ・Replace は文書の戻り値表で「Null ならエラー」と明記（94とする）
        // ・IsNumeric は Boolean を返す関数なので Null には False
        // ・上記以外（Len／Left／Right／Mid／Trim／UCase／LCase／Abs／Int／
        //   Fix／Round／InStr 等）は各関数の文書どおり Null を返す
        if (["cstr", "cint", "clng", "cdbl", "val", "replace"].includes(name))
          fail("Null の使い方が不正です", 94);
        if (name === "isnumeric") return false;
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
        replace: [3, 6],
        instr: [2, 4],
      };
      if (!arity[name]) unsupported(`関数 ${name}`);
      if (args.length < arity[name][0] || args.length > arity[name][1])
        fail("引数の数が一致していません", 450);
      let [x, y, z] = args;
      if (name === "len") {
        // F-VBA-04／RA-3: Len には2形式ある。文字列は文字数、型付き変数は
        // その格納に必要なバイト数（Integer=2／Long=4／Single=4／
        // Double=8／Boolean=2）。Variant は文字列として文字数を返す。
        // 配列は文字列化できずエラー13（str の規則と同根）。
        if (x?.kind === "array") fail("型が一致しません", 13);
        let argNode = a.args[0];
        if (argNode?.k === "id") {
          const sizes = {
            integer: 2,
            long: 4,
            single: 4,
            double: 8,
            boolean: 2,
          };
          let t = s.types[argNode.name];
          if (t in sizes) return sizes[t];
        }
        return str(x).length;
      }
      if (["left", "right", "mid"].includes(name)) {
        // F-VBA-06: 文字数・開始位置・長さは Long 引数なので、先に暗黙変換
        // （銀行丸め）してから範囲を判定する。整数でないことを理由に
        // エラー5にはせず、長さを切り捨てで黙って誤値を返すこともしない。
        let n = roundEven(num(y)),
          m = z === undefined ? undefined : roundEven(num(z));
        if (n < 0 || (name === "mid" && n < 1) || (m !== undefined && m < 0))
          fail("プロシージャの呼び出し、または引数が不正です", 5);
        return name === "left"
          ? str(x).slice(0, n)
          : name === "right"
            ? n
              ? str(x).slice(-n)
              : ""
            : str(x).slice(n - 1, m === undefined ? undefined : n - 1 + m);
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
      if (name === "isnumeric") {
        // F-VBA-05: Empty は数値文脈では 0 として扱われるため True。
        // Null は上の関数別規則で False を返済み。Boolean は False、
        // 配列等の値そのものは数値として評価できないため False
        // （文字列化して捏造しない）。
        if (x?.kind === "empty") return true;
        if (x?.kind) return false;
        if (typeof x === "boolean") return false;
        if (typeof x === "number") return true;
        return str(x).trim() !== "" && Number.isFinite(Number(x));
      }
      if (name === "round") {
        // F-VBA-06: 桁数は Long 引数として銀行丸めで変換してから判定する。
        let dp = y === undefined ? 0 : roundEven(num(y));
        if (dp < 0 || dp > 15)
          fail("プロシージャの呼び出し、または引数が不正です", 5);
        return roundEven(num(x) * 10 ** dp) / 10 ** dp;
      }
      if (name === "replace") {
        // Replace(対象, 検索, 置換, [start], [count], [compare])（Microsoft 仕様）
        // start: 検索・返却の開始位置（1始まり）。戻り値は start 位置から始まる。
        // count: 置換回数の上限（-1 = 全部、0 = 置換なし）。compare: 0 = 大文字小文字を区別、1 = 区別しない。
        let source = str(x),
          findText = str(y),
          replacement = str(z);
        // F-VBA-06: start／count／compare は整数引数として銀行丸めで変換する。
        let start = args[3] === undefined ? 1 : roundEven(num(args[3])),
          count = args[4] === undefined ? -1 : roundEven(num(args[4])),
          compare = args[5] === undefined ? 0 : roundEven(num(args[5]));
        if (start < 1)
          fail("プロシージャの呼び出し、または引数が不正です", 5);
        if (count < -1)
          fail("プロシージャの呼び出し、または引数が不正です", 5);
        if (compare === -1)
          unsupported("Replace の compare 引数 -1（Option Compare 依存）");
        if (compare !== 0 && compare !== 1)
          fail("プロシージャの呼び出し、または引数が不正です", 5);
        if (start > source.length) return "";
        let working = source.slice(start - 1);
        if (findText === "" || count === 0) return working;
        // P-N1（連結以外の成長経路）: Replace は置換文字列を出現回数だけ
        // 繰り返すため、短い入力でも結果が爆発しうる。出現回数の上限
        // （重ならない出現は対象文字列長／検索文字列長以下）から結果長を
        // 見積もり、上限を超える場合は実体を作らず未確定値へ倒す。
        {
          const maxHits =
            count === -1
              ? Math.floor(working.length / findText.length)
              : Math.min(count, Math.floor(working.length / findText.length));
          if (
            working.length + maxHits * replacement.length >
            VALUE_LENGTH_LIMIT
          )
            return unknown("とても長い文字列");
        }
        let haystack = compare === 1 ? working.toLowerCase() : working,
          needle = compare === 1 ? findText.toLowerCase() : findText,
          out = "",
          pos = 0,
          done = 0;
        while (count === -1 || done < count) {
          let at = haystack.indexOf(needle, pos);
          if (at < 0) break;
          out += working.slice(pos, at) + replacement;
          pos = at + findText.length;
          done++;
        }
        return out + working.slice(pos);
      }
      if (name === "instr") {
        // F-VBA-07／F-VBA-08: InStr([start], string1, string2, [compare]) の
        // 全形式に対応する。戻り値規則は文書どおりで、string1 が空文字列
        // なら string2 の内容によらず 0、string2 が空文字列なら start を
        // 返す。start／compare は整数引数として銀行丸めで変換する（F-VBA-06）。
        let startPos = 1,
          s1,
          s2,
          compare = 0;
        if (args.length === 2) {
          s1 = str(x);
          s2 = str(y);
        } else {
          startPos = roundEven(num(x));
          s1 = str(y);
          s2 = str(z);
          compare = args[3] === undefined ? 0 : roundEven(num(args[3]));
        }
        if (startPos < 1)
          fail("プロシージャの呼び出し、または引数が不正です", 5);
        if (compare === -1)
          unsupported("InStr の compare 引数 -1（Option Compare 依存）");
        if (compare !== 0 && compare !== 1)
          fail("プロシージャの呼び出し、または引数が不正です", 5);
        if (s1.length === 0) return 0;
        if (s2.length === 0) return startPos;
        if (startPos > s1.length) return 0;
        let haystack = compare === 1 ? s1.toLowerCase() : s1,
          needle = compare === 1 ? s2.toLowerCase() : s2,
          at = haystack.indexOf(needle, startPos - 1);
        return at < 0 ? 0 : at + 1;
      }
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
    // P-N1 最終防衛: どの生成経路から来た文字列でも、上限を超える実体は
    // 変数へ保持しない（未確定値として保持する）。
    if (
      typeof s.vars[name] === "string" &&
      s.vars[name].length > VALUE_LENGTH_LIMIT
    )
      s.vars[name] = unknown("とても長い文字列");
    s.types[name] = type;
    return `${name} ← ${display(s.vars[name])}`;
  }
  if (
    target.k === "call" &&
    target.target.k === "id" &&
    s.vars[target.target.name]?.kind === "array"
  ) {
    let arr = s.vars[target.target.name],
      // F-VBA-06（書込側の兄弟表面）: 添字は読取側と同じく銀行丸めで変換する。
      idx = roundEven(num(value(evalExpr(target.args[0], s), s)));
    if (target.args.length !== 1) unsupported("多次元配列");
    if (idx < arr.low || idx >= arr.low + arr.values.length)
      fail("インデックスが有効範囲にありません", 9);
    // NX-N9: 説明文は未変換の値ではなく、格納された（型変換後の）値を引用する。
    // スカラー代入が格納後の s.vars[name] を表示するのと同じ規則にそろえる。
    let stored = cast(value(v, s), arr.type || "variant");
    arr.values[idx - arr.low] = stored;
    return `${target.target.name}(${idx}) ← ${display(stored)}`;
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
function simulateImpl(source, model = {}, custom = {}) {
  let limits = { ...LIMITS, ...custom },
    started = performance.now(),
    operations = 0,
    truncated = false,
    reasons = new Set();
  let ast;
  try {
    ast = parse(source);
  } catch (e) {
    // P-N3：パース段階のホスト例外も生文言を返さない。
    const le = toLearnerVBAError(e);
    return {
      paths: [],
      error: {
        line: le.line || Number(le.message.match(/^(\d+)行/)?.[1]) || 1,
        message: le.message,
        code: le.code || 0,
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
    // P-N3：実行中のホスト例外はパスエラーの文言へ変換してから記録する
    // （学習者向けでない JS ホスト例外の生文言をパスに残さない）。
    e = toLearnerVBAError(e);
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
              d.dynamic
                ? `${d.name} は ${typeLabel(d.type)} の動的配列です（要素はまだ割り当てられていません）`
                : `${d.name} は ${typeLabel(d.type)} の変数です：${display(s.vars[d.name])}`,
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
            // F-VBA-06（同根の兄弟表面）: 配列の境界も Long への暗黙変換
            // （銀行丸め）を受けてから判定する。
            let low = roundEven(num(evalExpr(d.bounds[0], s))),
              high = roundEven(num(evalExpr(d.bounds[1], s)));
            if (high < low) fail("インデックスが有効範囲にありません", 9);
            if (high - low > 10000) unsupported("配列要素は10001個まで");
            s.vars[d.name] = {
              kind: "array",
              low,
              type: d.type,
              values: Array.from({ length: high - low + 1 }, () => initial),
            };
          } else if (d.dynamic) {
            s.vars[d.name] = {
              kind: "array",
              low: s.base,
              type: d.type,
              values: [],
              dynamic: true,
            };
            note(
              s,
              n,
              `${d.name} を ${typeLabel(d.type)} の動的配列として用意します（要素はまだ割り当てられていません）`,
            );
            continue;
          } else s.vars[d.name] = initial;
          note(
            s,
            n,
            `${d.name} を ${typeLabel(d.type)} として用意します：${display(s.vars[d.name])}`,
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
                // RG-27: 蓄積の初期値 false との or を合成すると、未確定値の説明に
                // 内部表現 "false or …" が漏れる。恒等元（false）との or は相手そのもので
                // 置き換え、false が相手側の場合も合成しない。
                if (result === false) result = r;
                else if (r === true) result = true;
                else if (r !== false && result !== true)
                  result = binary("or", result, r);
                if (result === true) break;
              }
            } else result = true;
            // Select Case では Null との比較結果（Null）は「一致しない」扱いで
            // Case Else へ進むのが実 VBA の規則であり、If 条件位置の
            // エラー94（F-VBA-01）とは切り分ける。
            if (result?.kind === "null") result = false;
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
            // NX-N18: 後判定 Do では終了判定は Loop 行で行われるため、終了注記も
            // Do 行ではなく Loop 行（endLine / endTokens）に帰属させる。
            // 前判定 Do・For・For Each は条件のある行（n）への帰属が正しいため変えない。
            note(
              r.s,
              n.post ? { line: n.endLine, tokens: n.endTokens } : n,
              `${count}回実行してループを終了します`,
            );
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
    // P-N3：宣言処理段階のホスト例外も生文言を返さない。
    const le = toLearnerVBAError(e);
    return {
      paths: [],
      error: { line: le.line || 1, message: le.message, code: le.code || 0 },
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
export function simulate(source, model = {}, custom = {}) {
  try {
    return simulateImpl(source, model, custom);
  } catch (e) {
    // P-N3 最終受け皿：後処理（基準状態の structuredClone や、変化量を
    // 求める JSON 化など、個別の catch の外側）から漏れたホスト例外も、
    // 生文言のまま呼び出し側へ投げず、日本語の汎用文言のエラー結果で返す。
    const le = toLearnerVBAError(e);
    return {
      paths: [],
      error: { line: le.line || 1, message: le.message, code: le.code || 0 },
      truncated: false,
      operations: 0,
    };
  }
}
