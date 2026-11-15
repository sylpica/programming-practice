import { fail } from "../shell/model.js";
export function tokenizePS(source) {
  const ts = [];
  let i = 0,
    line = 1;
  const push = (k, v, start, quote) =>
    ts.push({ k, v, start, end: i, line, quote });
  while (i < source.length) {
    const c = source[i],
      start = i;
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      i++;
      push("sep", ";", start);
      line++;
      continue;
    }
    if (/[ \t]/.test(c)) {
      i++;
      continue;
    }
    if (source.startsWith("<#", i)) {
      const end = source.indexOf("#>", i + 2);
      if (end < 0)
        fail("ブロックコメントが閉じられていません", line, "SyntaxError");
      line += source.slice(i, end + 2).split("\n").length - 1;
      i = end + 2;
      continue;
    }
    if (c === "#") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "`" && source[i + 1] === "\n") {
      i += 2;
      line++;
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c,
        beginLine = line;
      let text = "";
      i++;
      let closed = false;
      while (i < source.length) {
        if (source[i] === q) {
          if (source[i + 1] === q) {
            text += q;
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        if (source[i] === "`" && q === '"') {
          text += "`" + (source[i + 1] ?? "");
          i += 2;
        } else {
          if (source[i] === "\n") line++;
          text += source[i++];
        }
      }
      if (!closed) fail("文字列が閉じられていません", beginLine, "SyntaxError");
      push("string", text, start, q);
      ts.at(-1).line = beginLine;
      continue;
    }
    if (c === "$") {
      i++;
      if (source[i] === "{") {
        const end = source.indexOf("}", i + 1);
        if (end < 0) fail("変数名の } がありません", line, "SyntaxError");
        const v = source.slice(i + 1, end);
        i = end + 1;
        push("var", v, start);
        continue;
      }
      const m = source.slice(i).match(/^(?:[\p{L}_][\p{L}\p{N}_]*|\?)/u);
      if (!m) fail("未対応：このPowerShell変数の形式", line);
      i += m[0].length;
      push("var", m[0], start);
      continue;
    }
    const path = source
      .slice(i)
      .match(/^(?:[A-Za-z]:[\\/]|\.\.?[\\/])[^\s;|(){}]+/);
    if (path) {
      i += path[0].length;
      push("word", path[0], start);
      continue;
    }
    const relative = source
      .slice(i)
      .match(/^(?:[\p{L}_][\p{L}\p{N}_.-]*|\.{1,2})[\\/][^\s;|(){}\[\]"']+/u);
    if (relative) {
      i += relative[0].length;
      push("word", relative[0], start);
      continue;
    }
    const number = source.slice(i).match(/^(?:\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i);
    if (number) {
      i += number[0].length;
      push("number", number[0], start);
      continue;
    }
    const word = source.slice(i).match(/^[\p{L}_][\p{L}\p{N}_-]*/u);
    if (word) {
      i += word[0].length;
      push("word", word[0], start);
      continue;
    }
    const op = source
      .slice(i)
      .match(
        /^(?:-(?:c|i)?(?:notlike|notmatch|eq|ne|ge|gt|le|lt|like|match)\b|-(?:and|or|not|contains|in|f)\b|\+\+|--|\+=|-=|\*=|\/=|\.\.|@\(|@\{|\$\(|[+\-*\/%=<>!|&.,;(){}\[\]:])/i,
      );
    if (op) {
      i += op[0].length;
      push(op[0] === ";" ? "sep" : "op", op[0], start);
      continue;
    }
    fail("未対応のPowerShell構文：" + c, line);
  }
  ts.push({ k: "eof", v: "<eof>", line, start: i, end: i });
  return ts;
}
const prec = {
  "-or": 1,
  "-and": 2,
  "-eq": 3,
  "-ne": 3,
  "-gt": 3,
  "-ge": 3,
  "-lt": 3,
  "-le": 3,
  "-like": 3,
  "-notlike": 3,
  "-match": 3,
  "-notmatch": 3,
  "-ceq": 3,
  "-cne": 3,
  "-ieq": 3,
  "-ine": 3,
  "+": 4,
  "-": 4,
  "*": 5,
  "/": 5,
  "%": 5,
  "..": 6,
};
export class PSParser {
  constructor(source, line = 1) {
    this.source = source;
    this.ts = tokenizePS(source).map((t) => ({
      ...t,
      line: t.line + line - 1,
    }));
    this.i = 0;
    this.depth = 0;
  }
  peek(v) {
    return this.ts[this.i]?.v === v;
  }
  take(v) {
    const t = this.ts[this.i++];
    if (v && t?.v !== v) fail(v + " が必要です", t?.line || 1, "SyntaxError");
    return t;
  }
  skip() {
    while (this.peek(";")) this.i++;
  }
  block() {
    this.skip();
    this.take("{");
    return this.program("}");
  }
  program(end = "<eof>") {
    const out = [];
    this.skip();
    while (!this.peek(end) && !this.peek("<eof>")) {
      out.push(this.statement());
      this.skip();
    }
    if (end !== "<eof>") this.take(end);
    return out;
  }
  statement() {
    const t = this.ts[this.i],
      name = t.v.toLowerCase(),
      line = t.line;
    if (name === "if") {
      this.take();
      const test = this.condition(),
        body = this.block();
      this.skip();
      let other = [];
      if (this.ts[this.i]?.v.toLowerCase() === "elseif") {
        this.ts[this.i] = { ...this.ts[this.i], v: "if" };
        other = [this.statement()];
      } else if (this.ts[this.i]?.v.toLowerCase() === "else") {
        this.take();
        other = this.block();
      }
      return { k: "if", test, body, other, line };
    }
    if (name === "while") {
      this.take();
      return { k: "while", test: this.condition(), body: this.block(), line };
    }
    if (name === "do") {
      this.take();
      const body = this.block();
      this.skip();
      if (this.take().v.toLowerCase() !== "while")
        fail("doの後はwhileのみ対応します", line);
      return { k: "do", body, test: this.condition(), line };
    }
    if (name === "foreach" && this.ts[this.i + 1]?.v === "(") {
      this.take();
      this.take("(");
      const variable = this.take();
      if (variable.k !== "var" || this.take().v.toLowerCase() !== "in")
        fail("foreach ($変数 in 式) の形が必要です", line, "SyntaxError");
      const collection = this.pipeline();
      this.take(")");
      return {
        k: "foreach",
        name: variable.v,
        collection,
        body: this.block(),
        line,
      };
    }
    if (name === "for") {
      this.take();
      this.take("(");
      const init = this.peek(";") ? null : this.statement();
      this.take(";");
      const test = this.peek(";")
        ? {
            stages: [
              { k: "expression", value: { k: "literal", value: true, line } },
            ],
          }
        : this.pipeline();
      this.take(";");
      const update = this.peek(")") ? null : this.statement();
      this.take(")");
      return { k: "for", init, test, update, body: this.block(), line };
    }
    if (name === "switch") {
      this.take();
      const test = this.condition();
      this.skip();
      this.take("{");
      this.skip();
      const cases = [];
      while (!this.peek("}")) {
        const value = this.take();
        if (!["string", "number", "word"].includes(value.k))
          fail("未対応：switchの条件形式", value.line);
        cases.push({
          value: value.k === "number" ? Number(value.v) : value.v,
          isDefault: value.k === "word" && value.v.toLowerCase() === "default",
          body: this.block(),
        });
        this.skip();
      }
      this.take("}");
      return { k: "switch", test, cases, line };
    }
    if (name === "function") {
      this.take();
      const id = this.take();
      if (id.k !== "word") fail("関数名が必要です", line, "SyntaxError");
      let params = this.peek("(") ? this.parameters() : [];
      const body = this.block();
      if (body[0]?.k === "param") {
        if (params.length)
          fail("paramと引数リストの同時指定は未対応です", line);
        params = body.shift().params;
      }
      return { k: "function", name: id.v, params, body, line };
    }
    if (name === "param") {
      this.take();
      return { k: "param", params: this.parameters(), line };
    }
    if (["break", "continue", "return"].includes(name)) {
      this.take();
      const value =
        name === "return" && ![";", "}", "<eof>"].includes(this.ts[this.i].v)
          ? this.pipeline()
          : null;
      return { k: name, value, line };
    }
    const pipe = this.pipeline();
    const op = this.ts[this.i]?.v;
    if (["=", "+=", "-=", "*=", "/="].includes(op)) {
      this.take();
      if (pipe.stages.length !== 1 || pipe.stages[0].k !== "expression")
        fail("代入先が不正です", line, "SyntaxError");
      const target = pipe.stages[0].value;
      if (!["var", "member", "index"].includes(target.k))
        fail("変数・プロパティ・添字へ代入してください", line, "SyntaxError");
      return { k: "assign", target, op, value: this.pipeline(), line };
    }
    return {
      k: "pipeline",
      pipe,
      line,
      suppress:
        pipe.stages.length === 1 &&
        ["post", "pre"].includes(pipe.stages[0].value?.k),
    };
  }
  parameters() {
    this.take("(");
    const params = [];
    while (!this.peek(")")) {
      let type = null;
      if (this.peek("[")) {
        this.take();
        type = this.take().v;
        this.take("]");
      }
      const t = this.take();
      if (t.k !== "var")
        fail("paramには$変数が必要です", t.line, "SyntaxError");
      const value = this.peek("=") ? (this.take(), this.expr()) : null;
      params.push({ name: t.v, type, value, line: t.line });
      if (!this.peek(",")) break;
      this.take();
    }
    this.take(")");
    return params;
  }
  condition() {
    this.skip();
    this.take("(");
    const p = this.pipeline();
    this.take(")");
    return p;
  }
  pipeline() {
    const stages = [this.stage()];
    while (this.peek("|")) {
      this.take();
      // R22-N18: 行末の | は改行継続として扱う（改行は ";" トークン）。
      this.skip();
      stages.push(this.stage());
    }
    return { stages, line: stages[0].line };
  }
  stage() {
    const t = this.ts[this.i];
    if (t.k === "word" || (t.k === "op" && (t.v === "%" || t.v === "?"))) {
      const name = this.take().v,
        args = [],
        params = {};
      while (![";", "|", ")", "}", "<eof>"].includes(this.ts[this.i]?.v)) {
        const token = this.ts[this.i];
        if (token.v === "-" && this.ts[this.i + 1]?.k === "word") {
          this.take();
          const p = this.take().v.toLowerCase();
          if (Object.hasOwn(params, p))
            fail(
              "パラメーターが重複しています：" + p,
              token.line,
              "SyntaxError",
            );
          const switches = [
            "raw",
            "recurse",
            "file",
            "directory",
            "descending",
            "sum",
            "average",
            "maximum",
            "minimum",
            "force",
            "nonewline",
          ];
          if (switches.includes(p))
            params[p] = { k: "literal", value: true, line: token.line };
          else {
            const next = this.ts[this.i];
            // R22-N17: 値のないパラメーターは <eof> 等の汎用エラーにせず、
            // コマンド名とパラメーター名を名指しする。
            if (
              !next ||
              [";", "|", ")", "}", ",", "<eof>"].includes(next.v) ||
              (next.v === "-" && this.ts[this.i + 1]?.k === "word")
            )
              fail(
                "未対応のパラメーター：" + name + " -" + p,
                token.line,
                "SyntaxError",
              );
            try {
              params[p] = this.argument();
            } catch (e) {
              // R22-N15: パラメーター値の汎用パースエラーは対象を名指しする。
              if (/未対応または不正なPowerShellの式/.test(e.message))
                fail(
                  "未対応または不正なパラメーター値：" +
                    name +
                    " -" +
                    p +
                    "（" +
                    e.message +
                    "）",
                  token.line,
                  "SyntaxError",
                );
              throw e;
            }
          }
        } else args.push(this.argument());
      }
      return { k: "command", name, args, params, line: t.line };
    }
    const values = [this.expr()];
    while (this.peek(",")) {
      this.take();
      values.push(this.expr());
    }
    return {
      k: "expression",
      value:
        values.length === 1 ? values[0] : { k: "array", values, line: t.line },
      line: t.line,
    };
  }
  argument() {
    const first = this.oneArgument();
    if (!this.peek(",")) return first;
    const values = [first];
    while (this.peek(",")) {
      this.take();
      values.push(this.oneArgument());
    }
    return { k: "array", values, line: first.line };
  }
  oneArgument() {
    const t = this.ts[this.i];
    if (t.v === "{") return { k: "block", body: this.block(), line: t.line };
    // 引数モードでは "."（現在フォルダ）と ".."（親フォルダ）はパス文字列。
    // ただし ".5" のような数値リテラルに隣接する場合は対象外（従来どおり式側へ）。
    if (
      (t.v === "." || t.v === "..") &&
      !(
        this.ts[this.i + 1]?.start === t.end &&
        this.ts[this.i + 1]?.k === "number"
      )
    ) {
      this.take();
      return { k: "literal", value: t.v, line: t.line };
    }
    if (t.k === "word" || ["*", "?"].includes(t.v)) {
      let text = this.take().v,
        end = this.ts[this.i - 1].end;
      while (
        this.ts[this.i]?.start === end &&
        ![";", "|", ")", "}", "<eof>", ","].includes(this.ts[this.i].v)
      ) {
        text += this.take().v;
        end = this.ts[this.i - 1].end;
      }
      return { k: "literal", value: text, line: t.line };
    }
    return this.expr(7);
  }
  expr(min = 0) {
    if (++this.depth > 64)
      fail("PowerShellの式が深すぎます", this.ts[this.i]?.line, "limit");
    const t = this.take(),
      line = t.line;
    let a;
    if (t.k === "number") {
      const v = Number(t.v);
      if (
        !Number.isFinite(v) ||
        (Number.isInteger(v) && !Number.isSafeInteger(v))
      )
        fail(
          "未確認：PowerShellの数値が安全なモデル範囲外です",
          line,
          "未確認",
        );
      a = { k: "literal", value: v, line };
    } else if (t.k === "string")
      a = { k: "string", value: t.v, quote: t.quote, line };
    else if (t.k === "var") a = { k: "var", name: t.v, line };
    else if (["-", "+", "!", "-not"].includes(t.v.toLowerCase()))
      a = { k: "unary", op: t.v.toLowerCase(), arg: this.expr(7), line };
    else if (t.v === "++" || t.v === "--")
      // R22-N16: 前置インクリメント／デクリメント。
      a = { k: "pre", op: t.v, target: this.expr(7), line };
    else if (t.v === "(" || t.v === "$(") {
      const pipe = this.pipeline();
      this.take(")");
      a = { k: "subexpression", pipe, line };
    } else if (t.v === "@(") {
      const values = [];
      this.skip();
      while (!this.peek(")")) {
        values.push(this.pipeline());
        if (!this.peek(";")) break;
        this.skip();
      }
      this.take(")");
      a = { k: "array-pipelines", values, line };
    } else if (t.v === "@{") {
      const entries = [];
      this.skip();
      while (!this.peek("}")) {
        const key = this.take();
        if (!["word", "string", "number"].includes(key.k))
          fail("未対応：ハッシュテーブルのキー", key.line);
        this.take("=");
        entries.push([
          key.k === "number" ? Number(key.v) : key.v,
          this.pipeline(),
        ]);
        if (!this.peek(";")) break;
        this.skip();
      }
      this.take("}");
      a = { k: "hashtable", entries, line };
    } else if (t.v === "[") {
      const type = this.take().v;
      this.take("]");
      a = { k: "cast", type, arg: this.expr(7), line };
    } else
      fail("未対応または不正なPowerShellの式：" + t.v, line, "SyntaxError");
    while (true) {
      if (this.peek(".")) {
        this.take();
        const key = this.take();
        if (key.k !== "word")
          fail("プロパティ名が必要です", key.line, "SyntaxError");
        a = { k: "member", target: a, name: key.v, line };
        if (this.peek("(")) fail("未対応：.NETメソッド呼び出し " + key.v, line);
        continue;
      }
      if (this.peek("[")) {
        this.take();
        const index = this.expr();
        this.take("]");
        a = { k: "index", target: a, index, line };
        continue;
      }
      if (this.peek("++") || this.peek("--")) {
        a = { k: "post", op: this.take().v, target: a, line };
        continue;
      }
      const op = this.ts[this.i]?.v.toLowerCase(),
        p = prec[op];
      if (p === undefined || p < min) break;
      this.take();
      a = { k: "binary", op, a, b: this.expr(p + 1), line };
    }
    this.depth--;
    return a;
  }
}
export function parsePS(source, line = 1) {
  const p = new PSParser(source, line),
    nodes = p.program();
  if (!p.peek("<eof>")) fail("未対応：PowerShellの末尾", p.ts[p.i]?.line);
  return nodes;
}
