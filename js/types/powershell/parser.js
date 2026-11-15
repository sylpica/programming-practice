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
    // R23-N8: BOM（U+FEFF）は実PowerShellが .ps1 で受理するとおり読み飛ばし、
    // NBSP（U+00A0）は区切りとして扱う。貼り付け由来の不可視文字が
    // 「見えない原因」で利用者を止めないようにするため。
    if (c === "\uFEFF") {
      i++;
      continue;
    }
    if (/[ \t\u00A0]/.test(c)) {
      i++;
      continue;
    }
    // SEM-4／SH-P3追記：:: は対象（.NET型の静的メンバー）を名指して止める。
    // ":" 1文字だけの原因表示にしない。
    if (source.startsWith("::", i))
      fail("未対応：.NET型の静的メンバーアクセス（::）", line);
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
    // R24-N2: 数値リテラルの字句解析。実 PowerShell の文法（言語仕様
    // B.1.9.1／B.1.9.2、about_Numeric_Literals）に沿って、先行ドット形
    // （.5／.5e2）と末尾ドット＋指数形（1.e2）、末尾ドット形（1.）も
    // リテラルとして取り込む。末尾ドットはメンバーアクセス（1.Length）
    // と範囲演算子（1..3）と衝突しない場合に限る。
    // あわせて末尾検証を行う：リテラルの直後に英数字・_ が続く不完全形
    // （0x、1e、1.5e、1KBB、1_000 等）は接頭辞だけを切り取って別トークン
    // に化けさせず（代入位置の虚偽原因・括弧位置の「) が必要です」・
    // 引数位置の黙った分割の根治）、リテラル自体を名指して止める。
    // 字句解析段階で止めるため、全位置（引数モード含む）で一貫する。
    const numStart =
      /[0-9]/.test(c) || (c === "." && /[0-9]/.test(source[i + 1] ?? ""));
    if (numStart) {
      const rest = source.slice(i);
      // R23-N2 追随: 2進リテラル（0b…）は実 PowerShell の数値リテラルに
      // 存在しないため、"0" と "b101" に黙って分割して誤値や虚偽原因に
      // せず、リテラル自体を名指して未対応で止める。R24-N2: 0b の後に
      // 0／1 以外の文字が続く形（0b2 等）も接頭辞として捕捉する
      // （従来は ^0b[01]+ を要求するため名指し経路をすり抜けていた）。
      const binary = rest.match(/^0[bB][0-9A-Za-z_]*/);
      if (binary) fail("未対応：2進数リテラル（" + binary[0] + "）", line);
      // R23-N2: 16進接頭辞 0x と単位接尾辞（KB／MB／GB／TB／PB）も
      // 数値リテラルの一部として取り込む。取り込まないと "0" と "x1F" の
      // ように黙って分割され、誤値や虚偽原因になる。
      const number = rest.match(
        /^(?:0x[0-9a-f]+|(?:\d+\.\d+|\.\d+|\d+\.(?=[eE][+-]?\d)|\d+\.(?![\p{L}\p{N}_.])|\d+)(?:[eE][+-]?\d+)?)(?:kb|mb|gb|tb|pb)?/iu,
      );
      const after = rest[number[0].length] ?? "";
      if (/[\p{L}\p{N}_]/u.test(after)) {
        let literal = rest.match(/^[0-9A-Za-z_.]+/)[0];
        if (/[eE]$/.test(literal) && /^[+-]/.test(rest.slice(literal.length)))
          literal += rest[literal.length];
        fail(
          "未対応または不正な数値リテラル：" + literal,
          line,
          "SyntaxError",
        );
      }
      // R25-N10: 数値リテラルの直後に「.＋数字」が続く形（1.5.2／1.5e2.3／
      // 0x1F.2 等）は、リテラルの継続として不正である（言語仕様 B.1.9.2 の
      // 数値リテラル文法にこの形はない）。直後1文字が英数字・_ の場合だけを
      // 見ていた従来の末尾検証では「.」が網を抜け、1.5 と .2 の2トークンに
      // 割れて文位置では黙って2文に分割され、括弧位置では「) が必要です」
      // という虚偽原因になっていた。字句段階でリテラル全体を名指して止める。
      // 範囲（1..3 の「..」は次の文字も「.」）とメンバーアクセス
      // （5.ToString() の「.＋英字」）は対象外であり、従来どおり扱う。
      if (after === "." && /[0-9]/.test(rest[number[0].length + 1] ?? "")) {
        const literal = rest.match(/^[0-9A-Za-z_.]+/)[0];
        fail(
          "未対応または不正な数値リテラル：" + literal,
          line,
          "SyntaxError",
        );
      }
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
        /^(?:-(?:c|i)?(?:notlike|notmatch|eq|ne|ge|gt|le|lt|like|match)\b|-(?:c|i)?(?:notcontains|contains|notin|in)\b|-(?:and|or|not|f)\b|\+\+|--|\+=|-=|\*=|\/=|\.\.|@\(|@\{|\$\(|[+\-*\/%=<>!|&.,;(){}\[\]:?])/i,
      );
    if (op) {
      i += op[0].length;
      push(op[0] === ";" ? "sep" : "op", op[0], start);
      continue;
    }
    // R23-N8: 不可視文字は文字そのものではなくコードポイントで名指す。
    fail(
      "未対応のPowerShell構文：" +
        (/[\x00-\x1F\x7F-\x9F\u00AD\u200B-\u200F\u202A-\u202E\u2060]/.test(c)
          ? "U+" +
            c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0") +
            "（不可視文字）"
          : c),
      line,
    );
  }
  ts.push({ k: "eof", v: "<eof>", line, start: i, end: i });
  return ts;
}
// M-N1: パラメーターの値不足と未対応を区別するための、コマンドレット別の
// 値必須パラメーター表（engine.js の known 表と対応する値パラメーターのみ。
// スイッチは stage() 側で先に処理されるため含めない）。
const psAlias = {
  echo: "write-output",
  gci: "get-childitem",
  ls: "get-childitem",
  dir: "get-childitem",
  where: "where-object",
  "?": "where-object",
  foreach: "foreach-object",
  "%": "foreach-object",
  select: "select-object",
  sort: "sort-object",
  measure: "measure-object",
  cd: "set-location",
  pwd: "get-location",
  cat: "get-content",
  gc: "get-content",
  sc: "set-content",
  ac: "add-content",
  ni: "new-item",
  ri: "remove-item",
  rm: "remove-item",
  ren: "rename-item",
  cp: "copy-item",
  mv: "move-item",
};
const psValueParams = {
  "write-output": ["inputobject"],
  "write-host": ["object", "separator"],
  "read-host": ["prompt"],
  "get-childitem": ["path", "filter"],
  "where-object": ["filterscript"],
  "foreach-object": ["process"],
  "select-object": ["property", "first", "last", "skip", "expandproperty"],
  "sort-object": ["property"],
  "measure-object": ["property"],
  "get-location": [],
  "set-location": ["path"],
  "test-path": ["path", "pathtype"],
  "get-content": ["path"],
  "set-content": ["path", "value"],
  "add-content": ["path", "value"],
  "new-item": ["path", "name", "itemtype", "value"],
  "remove-item": ["path"],
  "rename-item": ["path", "newname"],
  "copy-item": ["path", "destination"],
  "move-item": ["path", "destination"],
};
const prec = {
  "-or": 1,
  "-and": 2,
  "+": 4,
  "-": 4,
  "*": 5,
  "/": 5,
  "%": 5,
  // SH-P3: -f は未対応だが、優先順位表に無いと式の途中で止まって
  // 「) が必要です」という虚偽原因になる。パースは通し、評価側で
  // 「未対応：書式演算子 -f」と名指す。
  "-f": 5,
  "..": 6,
};
// SH-P3: 比較演算子は -c／-i 変種と包含演算子（-contains／-in 系）まで
// 優先順位表に載せる。字句解析だけが受理して優先順位表に無いと、
// 括弧内などで「) が必要です」という無関係な原因で止まっていた。
for (const base of [
  "eq",
  "ne",
  "gt",
  "ge",
  "lt",
  "le",
  "like",
  "notlike",
  "match",
  "notmatch",
  "contains",
  "notcontains",
  "in",
  "notin",
])
  for (const prefix of ["-", "-c", "-i"]) prec[prefix + base] = 3;
// R23-N2: 数値リテラル文字列（0x 接頭辞・単位接尾辞つき）を値へ変換する。
// R24-N2: 字句解析側と同じ文法に揃え、先行ドット形（.5）と末尾ドット形
// （1.／1.e2）も変換できるようにする。
export function psNumber(text) {
  const m = String(text).match(
    /^(0x[0-9a-f]+|(?:\d+\.\d+|\.\d+|\d+\.|\d+)(?:e[+-]?\d+)?)(kb|mb|gb|tb|pb)?$/i,
  );
  if (!m) return Number(text);
  let v = /^0x/i.test(m[1]) ? parseInt(m[1], 16) : Number(m[1]);
  if (m[2])
    v *=
      { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4, pb: 1024 ** 5 }[
        m[2].toLowerCase()
      ];
  return v;
}
export class PSParser {
  constructor(source, line = 1) {
    this.source = source;
    this.ts = tokenizePS(source).map((t) => ({
      ...t,
      line: t.line + line - 1,
    }));
    this.i = 0;
    this.depth = 0;
    // R24-N3: param 定義の既定値など、カンマが区切りとして働く文脈では
    // カンマ演算子の消費を抑止するためのカウンタ。
    this.noComma = 0;
    // R25-N12: 引数モードの式解析中だけ立てるカウンタ。この間は数値
    // リテラルに接着した演算子形を文字列として読む（oneArgument 参照）。
    // 括弧内・添字内・キャスト被演算子は式モードに戻るため、その範囲では
    // expr() 側で一時的に下ろす。
    this.argGlued = 0;
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
      // R24-N30: switch のオプション（about_Switch）を、条件の括弧と
      // 誤認して「( が必要です」という虚偽原因にしない。対応する
      // オプションは AST の options に記録する（照合方法の切り替えは
      // engine 側が options を読んで -like／-match／-ceq の既存意味論で
      // 行う。-Exact は従来の -eq 照合そのもの）。ファイル入力の -File は
      // 実行モデル側の対応が要るため、対象を名指して正直に止める。
      // 未知のオプションも同様に名指す。
      const options = [];
      while (
        this.ts[this.i]?.v === "-" &&
        this.ts[this.i + 1]?.k === "word"
      ) {
        const optToken = this.ts[this.i],
          optWord = this.ts[this.i + 1].v,
          optName = optWord.toLowerCase();
        if (optName === "file")
          fail("未対応：switchの -File オプション", optToken.line);
        if (!["wildcard", "regex", "exact", "casesensitive"].includes(optName))
          fail("未対応：switchのオプション -" + optWord, optToken.line);
        this.take();
        this.take();
        options.push(optName);
      }
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
          value: value.k === "number" ? psNumber(value.v) : value.v,
          isDefault: value.k === "word" && value.v.toLowerCase() === "default",
          body: this.block(),
        });
        this.skip();
      }
      this.take("}");
      return { k: "switch", test, cases, options, line };
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
      // R24-N3: 既定値のカンマはパラメータの区切りであり、カンマ演算子
      // として消費させない（param($a = 1, $b = 2) の形を壊さないため）。
      let value = null;
      if (this.peek("=")) {
        this.take();
        this.noComma++;
        try {
          value = this.expr();
        } finally {
          this.noComma--;
        }
      }
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
              "パラメータが重複しています：" + p,
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
            // M-N1: ただし原因は区別する。対応パラメーターは「値が必要」、
            // 真に未対応のパラメーターだけを「未対応のパラメーター」とし、
            // カテゴリも値がある場合（engine 側の判定）と揃える。
            if (
              !next ||
              [";", "|", ")", "}", ",", "<eof>"].includes(next.v) ||
              (next.v === "-" && this.ts[this.i + 1]?.k === "word")
            ) {
              const canonical =
                psAlias[name.toLowerCase()] || name.toLowerCase(),
                knownParams = psValueParams[canonical];
              if (knownParams && !knownParams.includes(p))
                fail(
                  "未対応のパラメータ：" + name + " -" + p,
                  token.line,
                );
              fail(
                name + " -" + p + " の値が必要です",
                token.line,
                "ParameterBindingException",
              );
            }
            try {
              params[p] = this.argument();
            } catch (e) {
              // R22-N15: パラメーター値の汎用パースエラーは対象を名指しする。
              if (/未対応または不正なPowerShellの式/.test(e.message))
                fail(
                  "未対応または不正なパラメータ値：" +
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
    // R24-N31: 引数モードでは、空白で独立した演算子トークンは式の演算子
    // ではなく文字列引数として渡る（about_Parsing）。従来は "+" だけが
    // 単項演算子として消費されて黙って落ち（Write-Output 1 + 2 が
    // 1 と 2 だけになる）、文字列形では誤った変換エラーになっていた。
    // "*"／"?" と同種の記号（+ - / % =）を一掃する。隣接形（-5 や +2）は
    // 従来どおり式側（単項演算子）で解釈する。
    if (t.k === "op" && ["+", "-", "/", "%", "="].includes(t.v)) {
      const prev = this.ts[this.i - 1],
        next = this.ts[this.i + 1],
        gapBefore = !prev || prev.end < t.start,
        gapAfter =
          !next ||
          next.start > t.end ||
          [";", "|", ")", "}", "<eof>", ","].includes(next.v);
      if (gapBefore && gapAfter) {
        this.take();
        return { k: "literal", value: t.v, line: t.line };
      }
    }
    // NX-N8: var トークンは bareword として取り込まない。
    // 特に $? は v が "?" のためワイルドカード分岐に誤って入り、文字列 "?"
    // になっていた。自動変数として式側で評価させる。
    if (t.k !== "var" && (t.k === "word" || ["*", "?"].includes(t.v))) {
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
    // R25-N12: 引数モードでは、数値リテラルに空白なく接着した演算子形
    // （1+2／3-2／2*3／6/2／10%3 等）は式ではなく単一の文字列引数として
    // 渡る。根拠は一次情報：言語仕様 B.1.7 の generic-token はこれらの
    // 記号を含む連続文字列を1トークンとして認め、about_Parsing は
    // 引数モードの入力を構文として解釈できない限り文字列として扱う。
    // 単語で始まる接着形（a+b／hello-world）が word 側の接着処理で
    // 1トークンになるのと対称に、数値で始まる接着形も隣接トークン列を
    // そのまま文字列として取り込む。空白で独立した演算子トークンの
    // 規則（R24-N31）や式位置の解釈には触れない。範囲（1..3 の「..」は
    // 対象演算子に含めないため、下の範囲構築が従来どおり働く。
    if (t.k === "number") {
      const next = this.ts[this.i + 1];
      if (
        next?.k === "op" &&
        ["+", "-", "*", "/", "%"].includes(next.v) &&
        next.start === t.end
      ) {
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
    }
    // カンマで区切られた後続要素（1,2+3 の 2+3 等）も含め、この引数の
    // 式解析の間は argGlued を立て、expr() 側の接着判定を効かせる。
    this.argGlued++;
    try {
      const first = this.expr(7);
      // §3.3 既知残存の是正：引数モードでも範囲演算子は式として受理する
      // （Write-Output 1..3 は実 PowerShell では 1,2,3 を出力する。
      // 代入形・括弧形は従来から正常だった）。左辺は expr(7) が範囲の
      // 手前で止まるため、ここで範囲として組み立てる。
      if (this.peek("..")) {
        this.take();
        return {
          k: "binary",
          op: "..",
          a: first,
          b: this.expr(7),
          line: t.line,
        };
      }
      return first;
    } finally {
      this.argGlued--;
    }
  }
  expr(min = 0) {
    if (++this.depth > 64)
      fail("PowerShellの式が深すぎます", this.ts[this.i]?.line, "limit");
    const t = this.take(),
      line = t.line;
    let a;
    if (t.k === "number") {
      const v = psNumber(t.v);
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
      // R25-N12: 引数モード（argGlued）でカンマ要素等として読まれる
      // 数値にも接着判定を効かせる。隣接演算子列を文字列として取り込み、
      // 後続処理（メンバー・二項演算子）へは渡さない。
      if (this.argGlued > 0) {
        const next = this.ts[this.i];
        if (
          next?.k === "op" &&
          ["+", "-", "*", "/", "%"].includes(next.v) &&
          next.start === t.end
        ) {
          let text = t.v,
            end = t.end;
          while (
            this.ts[this.i]?.start === end &&
            ![";", "|", ")", "}", "<eof>", ","].includes(this.ts[this.i].v)
          ) {
            text += this.take().v;
            end = this.ts[this.i - 1].end;
          }
          this.depth--;
          return { k: "literal", value: text, line };
        }
      }
    } else if (t.k === "string")
      a = { k: "string", value: t.v, quote: t.quote, line };
    else if (t.k === "var") a = { k: "var", name: t.v, line };
    else if (["-", "+", "!", "-not"].includes(t.v.toLowerCase())) {
      // R24-N3: 単項演算子の被演算子はカンマ演算子を含まない
      // （-1,2 は (-1) と 2 の配列であり、-(1,2) ではないため）。
      // R25-N12: 被演算子は数値で始まる接着形の対象外（-3 等の負数形の
      // 現行挙動を変えないため、接着判定は下ろす）。
      const savedGlued = this.argGlued;
      this.argGlued = 0;
      let unaryArg;
      try {
        unaryArg = this.expr(8);
      } finally {
        this.argGlued = savedGlued;
      }
      a = { k: "unary", op: t.v.toLowerCase(), arg: unaryArg, line };
    } else if (t.v === "++" || t.v === "--") {
      // R22-N16: 前置インクリメント／デクリメント。
      const savedGlued = this.argGlued;
      this.argGlued = 0;
      let preTarget;
      try {
        preTarget = this.expr(8);
      } finally {
        this.argGlued = savedGlued;
      }
      a = { k: "pre", op: t.v, target: preTarget, line };
    }
    else if (t.v === "(" || t.v === "$(") {
      // R25-N12: 括弧内は式モードに戻るため、接着判定を一時的に下ろす。
      const savedGlued = this.argGlued;
      this.argGlued = 0;
      let pipe;
      try {
        pipe = this.pipeline();
      } finally {
        this.argGlued = savedGlued;
      }
      this.take(")");
      a = { k: "subexpression", pipe, line };
    } else if (t.v === "@(") {
      const savedGlued = this.argGlued;
      this.argGlued = 0;
      const values = [];
      try {
        this.skip();
        while (!this.peek(")")) {
          values.push(this.pipeline());
          if (!this.peek(";")) break;
          this.skip();
        }
      } finally {
        this.argGlued = savedGlued;
      }
      this.take(")");
      a = { k: "array-pipelines", values, line };
    } else if (t.v === "@{") {
      const savedGlued = this.argGlued;
      this.argGlued = 0;
      const entries = [];
      try {
        this.skip();
        while (!this.peek("}")) {
          const key = this.take();
          if (!["word", "string", "number"].includes(key.k))
            fail("未対応：ハッシュテーブルのキー", key.line);
          this.take("=");
          entries.push([
            key.k === "number" ? psNumber(key.v) : key.v,
            this.pipeline(),
          ]);
          if (!this.peek(";")) break;
          this.skip();
        }
      } finally {
        this.argGlued = savedGlued;
      }
      this.take("}");
      a = { k: "hashtable", entries, line };
    } else if (t.v === "[") {
      const type = this.take().v;
      this.take("]");
      // R24-N3: キャストの被演算子もカンマ演算子を含まない（単項と同様）。
      // R25-N12: 被演算子は式モードのため接着判定を下ろす。
      const savedGlued = this.argGlued;
      this.argGlued = 0;
      let castArg;
      try {
        castArg = this.expr(8);
      } finally {
        this.argGlued = savedGlued;
      }
      a = { k: "cast", type, arg: castArg, line };
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
        // R25-N12: 添字内は式モードのため接着判定を一時的に下ろす。
        const savedGlued = this.argGlued;
        this.argGlued = 0;
        let index;
        try {
          index = this.expr();
        } finally {
          this.argGlued = savedGlued;
        }
        this.take("]");
        a = { k: "index", target: a, index, line };
        continue;
      }
      if (this.peek("++") || this.peek("--")) {
        a = { k: "post", op: this.take().v, target: a, line };
        continue;
      }
      // R24-N3: カンマ演算子（配列生成）は二項演算子より強く結合する
      // （about_Operator_Precedence：カンマは比較・算術・論理の各演算子
      // より上位）。被演算子側でカンマ列を先に配列としてまとめないと、
      // stage 側の「式の値リストの区切り」に分割されて -in／-eq フィルタ
      // ／配列への + などが黙って誤値になっていた。優先順位は全二項
      // 演算子（最大6＝範囲）より上の7とし、要素は expr(8)（カンマも
      // 二項演算子も含まない一次側）で読む。連鎖は平坦な配列にする。
      // param 既定値などカンマが区切りの文脈では noComma で抑止する。
      if (this.peek(",") && !this.noComma && min <= 7) {
        const values = a.k === "array" ? [...a.values] : [a];
        while (this.peek(",")) {
          this.take();
          values.push(this.expr(8));
        }
        a = { k: "array", values, line };
        continue;
      }
      const opToken = this.ts[this.i],
        op = opToken?.v.toLowerCase(),
        p = prec[op];
      if (p === undefined) {
        // SH-P3（同根の一掃）：単一トークンの -演算子が優先順位表に無いまま
        // ここで黙って止まると、呼び出し側が「) が必要です」等と
        // 無関係な原因を表示する。演算子を名指して止める。
        // R24-N1（回帰の根治）：この名指しは「表に実際に無い場合」に限る。
        // p < min は、より高い優先順位の部分式や比較の右辺の解析中に
        // 表内の演算子（-eq／-and 等）が現れる正常な場面であり、従来
        // どおり break して外側で消費させる（両条件で発火させると
        // 複合式の比較・論理結合が全て虚偽原因で止まる）。
        if (opToken?.k === "op" && /^-[a-z]/i.test(opToken.v))
          fail(
            "未対応または不正なPowerShellの式：" + opToken.v,
            opToken.line,
            "SyntaxError",
          );
        break;
      }
      if (p < min) break;
      this.take();
      if (op === "..") {
        // R25-N2（R24-N3 の裁定を是正）：範囲演算子の右辺も左辺と対称に
        // array-literal-expression（カンマ列）として読む。根拠は一次情報：
        // PowerShell 言語仕様 Appendix A の文法 B.2.3 は
        // 「range-expression: array-literal-expression |
        //   range-expression .. array-literal-expression」と定め、両辺とも
        // カンマ列を取るとし、about_Operator_Precedence でもカンマは
        // 「..」より上位である。したがって 1..3,4 は 1..(3,4) と parse され、
        // 複数要素配列から整数への変換が失敗して変換エラーで止まるのが
        // 実物の挙動である（括弧明示形 1..(3,4) の現行挙動とも一致する）。
        // バッチ3 RG-166 の旧裁定コメント（「1..3, 4 は (1..3) と 4 の配列
        // であり、1..(3,4) ではない」）は文法 B.2.3 と逆であったため、
        // 右辺を expr(8) で読む抑止は撤回する。要素は左辺のカンマ収集と
        // 同じく expr(8) で読み、param 既定値などカンマが区切りの文脈
        // （noComma）では従来どおり収集しない。
        let b = this.expr(8);
        if (this.peek(",") && !this.noComma) {
          const values = [b];
          while (this.peek(",")) {
            this.take();
            values.push(this.expr(8));
          }
          b = { k: "array", values, line };
        }
        a = { k: "binary", op, a, b, line };
      } else {
        a = { k: "binary", op, a, b: this.expr(p + 1), line };
      }
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
