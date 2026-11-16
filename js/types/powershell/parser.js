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
      // R30-N10: 改行由来の区切りは明示的な ";" と区別する（nl フラグ）。
      // 実 PowerShell では改行は文の区切りだが、演算子の後・括弧内など
      // 式が継続する位置では文を終えない（about_Parsing／言語仕様）。
      // パーサは継続位置でのみ nl 区切りを読み飛ばし、明示的な ";" の
      // 扱いは従来どおりにする。
      ts.at(-1).nl = true;
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
      // R29-N14: 部分式 $( は変数ではなく部分式演算子である（Microsoft
      // Learn about_Operator_Precedence の最上位グループ $() @() () @{}、
      // 言語仕様の primary-expression）。変数名の読み取りより先に
      // 演算子トークンとして切り取る。従来は変数形式の失敗文言
      // （「このPowerShell変数の形式」）という虚偽原因で止まっていた。
      if (source[i] === "(") {
        i++;
        push("op", "$(", start);
        continue;
      }
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
    // 引数位置の黙った分割の根治）、リテラル全体を1トークンとして切り取る。
    // R27-N5: 停止は parser の式モード側で行い、引数モードでは
    // generic-token の文字列引数になる（下の badnum 化を参照）。
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
      // R27-N5: 不完全な数値リテラルは字句段階ではエラーにせず badnum
      // トークンとして残す。式モードでは parser 側が従来どおりリテラルを
      // 名指して止め（RG-182）、引数モードでは oneArgument が generic-token
      // として単一の文字列引数にする（文法 B.1.7、RG-183／RG-195 と同じ規則）。
      // エラー文言はトークンに保持し、式位置での文面・カテゴリを不変に保つ。
      if (binary) {
        i += binary[0].length;
        push("badnum", binary[0], start);
        ts.at(-1).msg = "未対応：2進数リテラル（" + binary[0] + "）";
        continue;
      }
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
        // R27-N5: 上の 2進形と同じく badnum トークン化する（字句段階で
        // 止めると引数モードの generic-token 化に到達しないため）。
        i += literal.length;
        push("badnum", literal, start);
        ts.at(-1).msg = "未対応または不正な数値リテラル：" + literal;
        ts.at(-1).cat = "SyntaxError";
        continue;
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
        // R27-N5: 「.＋数字」継続形も badnum トークン化する。
        i += literal.length;
        push("badnum", literal, start);
        ts.at(-1).msg = "未対応または不正な数値リテラル：" + literal;
        ts.at(-1).cat = "SyntaxError";
        continue;
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
        /^(?:-(?:c|i)?(?:notlike|notmatch|eq|ne|ge|gt|le|lt|like|match)\b|-(?:c|i)?(?:notcontains|contains|notin|in)\b|-(?:and|or|not|f)\b|\+\+|--|\+=|-=|\*=|\/=|%=|\.\.|@\(|@\{|\$\(|[+\-*\/%=<>!|&.,;(){}\[\]:?])/i,
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
// R31-N8（修正バッチ10・シェル班）: 式が途中で終わった位置では、字句
// 解析器の内部終端トークン名 "<eof>" を学習者向け文言に出さず、入力が
// 途中で終わっている旨を学習者の言葉で示す。接頭辞は従来の式エラーと
// 揃え、stage() のパラメータ値の名指しラップ（正規表現照合）も従来
// どおり効くようにする。
export function failTruncatedExpression(line) {
  fail(
    "未対応または不正なPowerShellの式：式が途中で終わっています",
    line,
    "SyntaxError",
  );
}
// R31-N10: 代入先の先頭ブラケット列（キャストの積み重ね）を外側から
// 順にほどく。単一ブラケット形は従来どおり castType として engine の
// キャスト評価へ渡すが、2個以上の積み重ねは検証属性＋型・型同士の
// 積み重ねのいずれも、このモデルでは代入先の型制約として未対応で
// あるため、ブラケット列全体を castTypes として保持し、engine 側で
// 列全体を名指して止める（「代入してください」という虚偽原因にしない）。
export function castChain(node) {
  const types = [];
  let target = node;
  while (target?.k === "cast") {
    types.push(target.type);
    target = target.arg;
  }
  return { types, target };
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
    // R29-N13: 括弧内・条件括弧内では代入が式として値を返す（言語仕様
    // §7.1.1 グループ化括弧／§7.11 代入）。文頭のパイプラインでは従来
    // どおり文としての代入（出力なし）と区別するため、式としての代入を
    // 読み取る文脈（括弧・部分式・条件）でのみ立てるカウンタ。
    this.assignDepth = 0;
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
  // R30-N10: 改行由来の区切りだけを読み飛ばす。式が継続する位置
  // （二項演算子の右辺・カンマの後・括弧の内側など）で使う。
  // 明示的な ";" は文の区切りとして残す。
  skipNl() {
    while (this.ts[this.i]?.k === "sep" && this.ts[this.i]?.nl) this.i++;
  }
  block() {
    this.skip();
    this.take("{");
    // R26-N1: 波括弧（スクリプトブロック・関数本体等）の内側は独立した
    // 文脈であり、param 既定値のカンマ抑止（noComma）と引数モードの
    // 接着判定（argGlued）は内側へ継承しない。
    const savedComma = this.noComma,
      savedGlued = this.argGlued;
    this.noComma = 0;
    this.argGlued = 0;
    try {
      return this.program("}");
    } finally {
      this.noComma = savedComma;
      this.argGlued = savedGlued;
    }
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
    // R29-N13: 文の先頭では代入は文として処理する（出力なし）ため、
    // 括弧・部分式の文脈で立った assignDepth は文の境界で下ろす
    // （$() 内の代入文が式として出力されてしまう漏れの防止）。
    // 括弧が再度現れれば、その内側で再び立つ。
    const savedAssign = this.assignDepth;
    this.assignDepth = 0;
    try {
      return this.statementBody();
    } finally {
      this.assignDepth = savedAssign;
    }
  }
  statementBody() {
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
      // R30-N10: foreach ヘッダの閉じ括弧の前の改行は文を終えない。
      this.skipNl();
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
        // R27-N5: switch の条件値の位置も式モードとして扱う。
        if (value.k === "badnum") fail(value.msg, value.line, value.cat);
        // R31-N8: switch 本体が途中で終わった場合は途中終了として示す。
        if (value.k === "eof") failTruncatedExpression(value.line);
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
    // R27-N4: param の前に置く関数属性 [CmdletBinding()]／
    // [OutputType([型])]（B.2.4 attribute。about_Functions_CmdletBindingAttribute／
    // about_Functions_OutputTypeAttribute）は、後続が param のときに限り
    // 属性として読み飛ばし、param 文として解釈する。どちらも実行モデル
    // 上の意味（共通パラメータの追加・出力型の宣言）は持たない宣言であり、
    // param を伴わない位置では従来どおりキャスト式として解釈させるため、
    // 当てはまらない場合は読み位置を戻す。
    if (t.v === "[") {
      const saved = this.i;
      let sawAttribute = false,
        followedByParam = false;
      while (this.peek("[")) {
        const before = this.i,
          bc = this.bracketContent();
        // R28-N6: [CmdletBinding] の括弧なし形も文法 B.2.4 の属性の
        // 正規形であるため、括弧つき形と同様に属性として読む。
        if (
          !/^CmdletBinding\s*(\(|$)/i.test(bc.text.trim()) &&
          !/^OutputType\s*(\(|$)/i.test(bc.text.trim())
        ) {
          this.i = before;
          break;
        }
        sawAttribute = true;
        // R30-N10: 属性と param の間の改行は文を終えない
        // （[OutputType([int])]\nparam($x) は実物で受理される形）。
        this.skipNl();
        if (this.ts[this.i]?.v.toLowerCase() === "param") {
          followedByParam = true;
          break;
        }
        if (!this.peek("[")) break;
      }
      if (sawAttribute && followedByParam) {
        this.take();
        return { k: "param", params: this.parameters(), line };
      }
      this.i = saved;
    }
    const pipe = this.pipeline();
    const op = this.ts[this.i]?.v;
    if (["=", "+=", "-=", "*=", "/=", "%="].includes(op)) {
      this.take();
      if (pipe.stages.length !== 1 || pipe.stages[0].k !== "expression")
        fail("代入先が不正です", line, "SyntaxError");
      let target = pipe.stages[0].value,
        castType = null,
        castTypes = null;
      // R30-N11: 型付き代入文 [型]$x = 値（Microsoft Learn の型付き変数。
      // 例：[ValidateLength(8,12)][string]$computername = '...' の形で
      // 型制約つき代入が示される）。パーサ上はキャスト式の被演算子が
      // 代入先になっている形であり、左辺は変数への代入そのものなので、
      // 「変数へ代入してください」という虚偽原因で止めず、型変換つき
      // 代入として解釈する。変換は engine 側で通常のキャスト評価を
      // 再利用し、変換できない値は変換エラーで停止する。
      // RG-263／271 との関係：括弧なし属性名の型リテラル解釈（RG-263）
      // は param 内の話であり、ここでは被演算子が代入先のときに限って
      // 型付き代入として読むため競合しない。括弧付き代入式（RG-271）
      // の隣接形として expr 側の assign-expr でも同じ解釈をする。
      // R31-N10: ブラケットが2個以上積み重なる形（検証属性＋型、
      // 型＋検証属性、型同士、三重以上、メンバー／添字への同形）も
      // 代入先としてほどく。単一形は従来どおり castType で engine の
      // キャスト評価へ渡し（[ValidateLength(1,2)] 単独形が
      // 「未対応の型変換：[ValidateLength(1,2)]」と名指される経路を
      // 維持する）、積み重ねは castTypes として保持し、engine 側で
      // ブラケット列全体を名指して止める。ここで「代入してください」
      // へ落とすと、代入文に対して代入を指示する虚偽原因になる。
      {
        const chain = castChain(target);
        if (
          chain.types.length &&
          ["var", "member", "index"].includes(chain.target.k)
        ) {
          if (chain.types.length === 1) castType = chain.types[0];
          else castTypes = chain.types;
          target = chain.target;
        }
      }
      if (!["var", "member", "index"].includes(target.k))
        fail("変数・プロパティ・添字へ代入してください", line, "SyntaxError");
      // R29-N13: 代入の右辺では連鎖代入（$y = $x = 5）が式として
      // 読めるよう、右辺のパイプライン解析の間だけ assignDepth を立てる。
      const savedAssign = this.assignDepth;
      this.assignDepth++;
      let value;
      try {
        value = this.pipeline();
      } finally {
        this.assignDepth = savedAssign;
      }
      return { k: "assign", target, op, value, line, castType, castTypes };
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
  // R27-N4: 角括弧の内容全体を読む。文法（Appendix A）の type-literal は
  // [ type-spec ] で、type-spec はドット連結の type-name、array-type-name
  // （type-name [ dimension ] ]）、generic-type-name（type-name [
  // generic-type-arguments ]）を含み、B.2.4 の attribute は
  // [ attribute-name ( attribute-arguments ) ] の形を取る。従来は直後の
  // 単一トークンだけを型名として読み、直後に ] を要求したため、[]・.・()
  // を含む正当な内容が「] が必要です」という虚偽原因で止まっていた。
  // 入れ子の [ ] と ( ) の対応を数えて対応する ] までを内容として返し、
  // 内容の解釈（型名か属性か、対応可否）は呼び出し側が行う。
  bracketContent(open = null) {
    // open には、呼び出し側が既に消費した "[" トークンを渡せる
    // （expr のキャスト分岐）。省略時は現在位置の "[" を消費する。
    open ??= this.take("[");
    const tokens = [];
    let depth = 1,
      parens = 0,
      close = null;
    while (true) {
      const t = this.ts[this.i];
      if (!t || t.k === "eof")
        fail("] が必要です", open.line, "SyntaxError");
      if (t.v === "]" && depth === 1 && parens === 0) {
        close = this.take();
        break;
      }
      if (t.v === "[") depth++;
      else if (t.v === "]") depth--;
      else if (t.v === "(" || t.v === "@(") parens++;
      else if (t.v === ")") parens--;
      tokens.push(this.take());
    }
    return {
      text: this.source.slice(open.end, close.start),
      tokens,
      line: open.line,
    };
  }
  parameters() {
    this.take("(");
    const params = [];
    while (!this.peek(")")) {
      let type = null,
        validateSet = null,
        mandatory = false,
        validateNotNull = false;
      // R29-N9／N10: 括弧つき検証・許可属性の記録。validations は
      // {kind, name, min, max, pattern} の列（kind は notnull／
      // notnullorempty／notnullorwhitespace／count／length／range／
      // pattern）。allow 系は対応する検証の免除フラグ。
      const validations = [];
      let allowNull = false,
        allowEmptyString = false,
        allowEmptyCollection = false;
      const aliases = [];
      // R27-N4: 型制約とパラメータ属性（B.2.4 attribute）は複数並べて
      // 書ける（例：[Parameter(Mandatory=$true)][ValidateSet('a','b')]
      // [string]$a）。角括弧グループを繰り返し読み、括弧を含むものは
      // 属性、含まないものは型名として解釈する。対応しない属性は
      // 属性名を名指して止める。
      // R30-N10: param 括弧内では改行は文を終えないため、角括弧
      // グループ間・変数の前の改行由来区切りは読み飛ばす。
      for (;;) {
        this.skipNl();
        if (!this.peek("[")) break;
        const bc = this.bracketContent(),
          text = bc.text.trim();
        if (!text.includes("(")) {
          // RG-263（CI是正・R28-N6／RG-244 の裁定を撤回）: 括弧なしの
          // [Parameter] 等は属性ではなく型リテラルとして読む。文法
          // B.2.4 上は引数なし属性とも読めるが、実 PowerShell（CI
          // validate-shells 実測）では括弧なしの属性名は
          // ParameterAttribute 型への変換として解釈され、非 $null の
          // 引数は引数変換エラーで停止する（"Cannot process argument
          // transformation on parameter 'x'. Cannot convert the "42"
          // value ... to type "System.Management.Automation.
          // ParameterAttribute"."）。属性として扱われるのは括弧つき
          // [Parameter(...)] の形だけである。したがって括弧なし
          // グループは他の型名と同様に型制約として保持し（複数並んだ
          // 場合は従来どおり最後のものが勝つ）、変換の成否は engine
          // 側の型変換（属性型への変換規則）で裁定する。
          type = text.replace(/\s+/g, "");
          continue;
        }
        const attrName = text
          .slice(0, text.indexOf("("))
          .trim()
          .split(".")
          .at(-1)
          .toLowerCase()
          .replace(/attribute$/, "");
        const inner = bc.tokens.slice(
          bc.tokens.findIndex((x) => x.v === "(") + 1,
        );
        // R29-N9／N10: 括弧つき形は属性として解釈する（RG-263 の型
        // リテラル是正は括弧なし形だけの話であり、混同しない）。
        // 実 PowerShell では [ValidateNotNull()] 等の () 付きが標準
        // 表記である（Microsoft Learn about_Functions_Advanced_
        // Parameters）。検証意味論は engine 側の束縛時検証で実装する。
        const innerText = text.slice(
          text.indexOf("(") + 1,
          text.lastIndexOf(")"),
        );
        const attrNums = (innerText.match(/-?\d+(?:\.\d+)?/g) ?? []).map(
          Number,
        );
        if (attrName === "validateset")
          validateSet = inner
            .filter((x) => ["string", "number", "word"].includes(x.k))
            .map((x) => (x.k === "number" ? String(psNumber(x.v)) : x.v));
        else if (attrName === "validatenotnull") {
          validateNotNull = true;
          validations.push({ kind: "notnull", name: "ValidateNotNull" });
        } else if (attrName === "validatenotnullorempty")
          validations.push({
            kind: "notnullorempty",
            name: "ValidateNotNullOrEmpty",
          });
        else if (attrName === "validatenotnullorwhitespace")
          validations.push({
            kind: "notnullorwhitespace",
            name: "ValidateNotNullOrWhiteSpace",
          });
        else if (attrName === "validatecount" && attrNums.length >= 2)
          validations.push({
            kind: "count",
            name: "ValidateCount",
            min: attrNums[0],
            max: attrNums[1],
          });
        else if (attrName === "validatelength" && attrNums.length >= 2)
          validations.push({
            kind: "length",
            name: "ValidateLength",
            min: attrNums[0],
            max: attrNums[1],
          });
        else if (attrName === "validaterange" && attrNums.length >= 2)
          validations.push({
            kind: "range",
            name: "ValidateRange",
            min: attrNums[0],
            max: attrNums[1],
          });
        else if (attrName === "validatepattern") {
          const pm = innerText.match(/'([^']*)'|"([^"]*)"/);
          if (!pm) fail("未対応のパラメータ属性：[" + text + "]", bc.line);
          validations.push({
            kind: "pattern",
            name: "ValidatePattern",
            pattern: pm[1] ?? pm[2],
          });
        } else if (attrName === "allownull") allowNull = true;
        else if (attrName === "allowemptystring") allowEmptyString = true;
        else if (attrName === "allowemptycollection")
          allowEmptyCollection = true;
        else if (attrName === "parameter") {
          for (let j = 0; j < inner.length; j++) {
            if (
              inner[j].k === "word" &&
              inner[j].v.toLowerCase() === "mandatory"
            ) {
              // [Parameter(Mandatory)] は $true の省略形（名前付き引数の
              // 値省略は真として扱う）。= $false のときだけ偽にする。
              mandatory = !(
                inner[j + 1]?.v === "=" &&
                ((inner[j + 2]?.k === "var" &&
                  inner[j + 2].v.toLowerCase() === "false") ||
                  (inner[j + 2]?.k === "word" &&
                    inner[j + 2].v.toLowerCase() === "false"))
              );
            }
          }
        } else if (attrName === "alias")
          aliases.push(
            ...inner
              .filter((x) => x.k === "string")
              .map((x) => x.v),
          );
        else fail("未対応のパラメータ属性：[" + text + "]", bc.line);
      }
      this.skipNl();
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
      params.push({
        name: t.v,
        type,
        value,
        validateSet,
        mandatory,
        validateNotNull,
        validations,
        allowNull,
        allowEmptyString,
        allowEmptyCollection,
        aliases,
        line: t.line,
      });
      // R30-N10: パラメータ区切り・閉じ括弧の前の改行も継続として扱う。
      this.skipNl();
      if (!this.peek(",")) break;
      this.take();
    }
    this.take(")");
    return params;
  }
  condition() {
    this.skip();
    this.take("(");
    // R26-N1: 条件の括弧内も独立した文脈（block と同じくリセットする）。
    // R29-N13: 条件括弧内では代入式が受理される（if ($x = 5) 等）。
    const savedComma = this.noComma,
      savedGlued = this.argGlued,
      savedAssign = this.assignDepth;
    this.noComma = 0;
    this.argGlued = 0;
    this.assignDepth++;
    let p;
    try {
      p = this.pipeline();
    } finally {
      this.noComma = savedComma;
      this.argGlued = savedGlued;
      this.assignDepth = savedAssign;
    }
    // R30-N10: 条件括弧の閉じ括弧の前の改行は文を終えない。
    this.skipNl();
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
    // R30-N10: ステージ先頭の改行由来区切りは、継続位置（代入の右辺・
    // 括弧内・パイプの後等）では読み飛ばす。文頭では program 側の
    // skip() が既に消費しているため、文の区切り意味論は変わらない。
    this.skipNl();
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
    // R27-N5: 引数モードで不完全な数値リテラルで始まる入力は、式として
    // 解釈できないため文法 B.1.7 の generic-token として単一の文字列
    // 引数になる（RG-183／RG-195 の接着形と同じ規則）。接着した後続
    // トークン列（0x--1 の --1 等）も含めて原文のまま取り込む。
    if (t.k === "badnum") {
      let end = t.end;
      this.take();
      while (
        this.ts[this.i]?.start === end &&
        ![";", "|", ")", "}", "<eof>", ","].includes(this.ts[this.i].v)
      ) {
        this.take();
        end = this.ts[this.i - 1].end;
      }
      return {
        k: "literal",
        value: this.source.slice(t.start, end),
        line: t.line,
      };
    }
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
    // R26-N2: 二連演算子 ++／-- の接着形（1--2／1++2／1---2 等）も同じ
    // generic-token であり、対象に含める。含めないと式パース側で
    // リテラルへの後置 ++／-- になり、評価側の代入先参照でホスト例外の
    // 生文言が漏出していた。
    if (t.k === "number") {
      const next = this.ts[this.i + 1];
      if (
        next?.k === "op" &&
        ["+", "-", "*", "/", "%", "++", "--"].includes(next.v) &&
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
    // R26-N2: ++／-- で始まる接着形（--1／++2／----1 等）も B.1.7 の
    // generic-token として単一の文字列引数として渡る。空白で独立した
    // ++／--（-- 1／1 ++ の後続要素等）も、単独演算子の規則（R24-N31）
    // と同じく文字列引数として扱う。変数への前置（++$x／--$x）と
    // 括弧への前置は従来どおり式側で評価するため、この分岐では扱わない。
    if (t.k === "op" && (t.v === "++" || t.v === "--")) {
      const next = this.ts[this.i + 1];
      if (
        !next ||
        [";", "|", ")", "}", "<eof>", ","].includes(next.v) ||
        (next.start > t.end && next.k !== "var" && next.v !== "(")
      ) {
        this.take();
        return { k: "literal", value: t.v, line: t.line };
      }
      if (
        next.start === t.end &&
        (next.k === "number" || ["++", "--", "+", "-"].includes(next.v))
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
    // R26-N2: 符号つき数値で始まり ++／-- が接着する形（-1--2／+1++2 等）
    // も generic-token として単一の文字列引数として渡る。符号つき数値
    // 単独（-3 等）の現行挙動は変えないため、二連演算子の接着がある
    // 場合に限る。
    if (t.k === "op" && (t.v === "-" || t.v === "+")) {
      const n1 = this.ts[this.i + 1],
        n2 = this.ts[this.i + 2];
      if (
        n1?.k === "number" &&
        n1.start === t.end &&
        n2?.k === "op" &&
        ["++", "--"].includes(n2.v) &&
        n2.start === n1.end
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
    // R26-N2: 引用文字列に ++／-- が接着する形（'a'++／"a"--2 等）も
    // 単一の文字列引数として渡る。接着部分は引用符内の内容に続く
    // 文字列として取り込む（二重引用符では展開規則を保つため string
    // ノードのままにする）。
    if (t.k === "string") {
      const next = this.ts[this.i + 1];
      if (
        next?.k === "op" &&
        ["++", "--"].includes(next.v) &&
        next.start === t.end
      ) {
        const strToken = this.take();
        let end = strToken.end;
        while (
          this.ts[this.i]?.start === end &&
          ![";", "|", ")", "}", "<eof>", ","].includes(this.ts[this.i].v)
        ) {
          this.take();
          end = this.ts[this.i - 1].end;
        }
        const suffix = this.source.slice(strToken.end, end);
        return strToken.quote === '"'
          ? { k: "string", value: strToken.v + suffix, quote: '"', line: t.line }
          : { k: "literal", value: strToken.v + suffix, line: t.line };
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
    // R30-N10: expr() は被演算子が期待される位置（演算子の右辺・
    // カンマの後・括弧や添字の内側・単項演算子の被演算子等）から
    // 呼ばれるため、先頭の改行由来区切りは式の継続として読み飛ばす。
    // 被演算子を読み終えた後の改行はここでは消費しないため、文の
    // 区切りとしての意味は保たれる。例外はキャストの被演算子で、
    // 型リテラル [int] 自体が完結した式であるため改行を跨いで
    // 被演算子を取らない（キャスト分岐側で事前に判定する）。
    this.skipNl();
    const t = this.take(),
      line = t.line;
    let a;
    // R27-N5: 式モードでは不完全な数値リテラルを従来どおり名指して
    // 止める（RG-182）。文面・カテゴリは字句解析時にトークンへ保持した
    // ものをそのまま使う。引数モード（argGlued）では generic-token と
    // して文字列化する。oneArgument の先頭分岐を通らない経路（カンマ
    // 要素として expr のカンマ収集から読まれる場合等）でも同じ規則に
    // 揃えるため、ここでも argGlued を見て分岐する。
    if (t.k === "badnum") {
      if (this.argGlued > 0) {
        let end = t.end;
        while (
          this.ts[this.i]?.start === end &&
          ![";", "|", ")", "}", "<eof>", ","].includes(this.ts[this.i].v)
        ) {
          this.take();
          end = this.ts[this.i - 1].end;
        }
        this.depth--;
        return {
          k: "literal",
          value: this.source.slice(t.start, end),
          line,
        };
      }
      fail(t.msg, line, t.cat);
    }
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
      // R28-N3: 小数リテラル（小数点・指数を含む形）は .NET では double
      // として扱われる。値そのものは JS の数値に畳まれるため、由来を
      // dbl フラグとして保持し、engine 側の浮動小数点判定に使う
      // （16進リテラルは整数なので、e を含んでも対象外）。
      a = {
        k: "literal",
        value: v,
        line,
        dbl: !/^0x/i.test(t.v) && /[.eE]/.test(t.v),
      };
      // R25-N12: 引数モード（argGlued）でカンマ要素等として読まれる
      // 数値にも接着判定を効かせる。隣接演算子列を文字列として取り込み、
      // 後続処理（メンバー・二項演算子）へは渡さない。
      // R26-N2: 二連演算子 ++／-- も対象に含める（oneArgument と同じ）。
      if (this.argGlued > 0) {
        const next = this.ts[this.i];
        if (
          next?.k === "op" &&
          ["+", "-", "*", "/", "%", "++", "--"].includes(next.v) &&
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
      // R26-N1: 被演算子の内側は param 既定値のカンマ抑止（noComma）の
      // 対象外であり、区切り水準の抑止を内側へ継承しない（範囲右辺の
      // カンマは文法 B.2.3 どおり式のカンマとして読む）。
      const savedGlued = this.argGlued,
        savedComma = this.noComma;
      this.argGlued = 0;
      this.noComma = 0;
      let unaryArg;
      try {
        unaryArg = this.expr(8);
      } finally {
        this.argGlued = savedGlued;
        this.noComma = savedComma;
      }
      a = { k: "unary", op: t.v.toLowerCase(), arg: unaryArg, line };
    } else if (t.v === "++" || t.v === "--") {
      // R22-N16: 前置インクリメント／デクリメント。
      // R26-N1: 被演算子の内側へ noComma を継承しない（単項と同じ）。
      const savedGlued = this.argGlued,
        savedComma = this.noComma;
      this.argGlued = 0;
      this.noComma = 0;
      let preTarget;
      try {
        preTarget = this.expr(8);
      } finally {
        this.argGlued = savedGlued;
        this.noComma = savedComma;
      }
      // R26-N2: 引数モード（argGlued）でカンマ要素等として expr 経由で
      // 読まれた前置形は、oneArgument の先頭分岐を通らない。対象が
      // 代入可能（変数・プロパティ・添字）でない場合は前置として
      // 評価せず、接着した原文全体を generic-token の文字列として
      // 扱う（1,++2 の第2要素等。従来は評価側でホスト例外が漏出した）。
      // 変数等への前置（++$x）は従来どおり式として評価する。
      if (
        this.argGlued > 0 &&
        !["var", "member", "index"].includes(preTarget.k)
      )
        a = {
          k: "literal",
          value: this.source.slice(t.start, this.ts[this.i - 1].end),
          line,
        };
      else a = { k: "pre", op: t.v, target: preTarget, line };
    }
    else if (t.v === "(") {
      // R25-N12: 括弧内は式モードに戻るため、接着判定を一時的に下ろす。
      // R26-N1: 括弧・部分式の内側へ noComma を継承しない。param 既定値の
      // 区切りカンマが働くのはパラメータ列の水準だけであり、括弧内の
      // カンマは式のカンマである（文法 B.2.3）。
      // R29-N13: グループ化括弧の中では代入式が値を返す形で受理される
      // （($x = 5) は 5）。assignDepth を立てて expr 側の代入式読みを有効化する。
      const savedGlued = this.argGlued,
        savedComma = this.noComma,
        savedAssign = this.assignDepth;
      this.argGlued = 0;
      this.noComma = 0;
      this.assignDepth++;
      let pipe;
      try {
        pipe = this.pipeline();
      } finally {
        this.argGlued = savedGlued;
        this.noComma = savedComma;
        this.assignDepth = savedAssign;
      }
      // R30-N10: 閉じ括弧の前の改行は文を終えない（(1+2\n) も受理）。
      this.skipNl();
      this.take(")");
      a = { k: "subexpression", pipe, line };
    } else if (t.v === "$(") {
      // R29-N14: 部分式 $() は文の列（statement-list）を保持し、その
      // 出力全体が式の値になる（言語仕様の subexpression）。空の $() は
      // 出力なし（AutomationNull）になる。従来は字句段階で変数形式の
      // 虚偽原因により到達できなかった。
      const savedGlued = this.argGlued,
        savedComma = this.noComma,
        savedAssign = this.assignDepth;
      this.argGlued = 0;
      this.noComma = 0;
      this.assignDepth++;
      try {
        if (this.peek(")")) {
          this.take();
          a = { k: "subexpression", pipe: null, line };
        } else {
          a = { k: "subexpression-list", body: this.program(")"), line };
        }
      } finally {
        this.argGlued = savedGlued;
        this.noComma = savedComma;
        this.assignDepth = savedAssign;
      }
    } else if (t.v === "@(") {
      // R26-N1: 配列表記の内側へ noComma を継承しない（括弧と同じ）。
      const savedGlued = this.argGlued,
        savedComma = this.noComma;
      this.argGlued = 0;
      this.noComma = 0;
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
        this.noComma = savedComma;
      }
      this.take(")");
      a = { k: "array-pipelines", values, line };
    } else if (t.v === "@{") {
      // R26-N1: ハッシュ表記の内側へ noComma を継承しない（括弧と同じ）。
      const savedGlued = this.argGlued,
        savedComma = this.noComma;
      this.argGlued = 0;
      this.noComma = 0;
      const entries = [];
      try {
        this.skip();
        while (!this.peek("}")) {
          const key = this.take();
          // R27-N5: ハッシュキーの位置も式モードであり、不完全な数値
          // リテラルはリテラル自体を名指して止める。
          if (key.k === "badnum") fail(key.msg, key.line, key.cat);
          // R31-N8: ハッシュリテラルが途中で終わった場合は、存在しない
          // キーを原因にせず途中終了として示す。
          if (key.k === "eof") failTruncatedExpression(key.line);
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
        this.noComma = savedComma;
      }
      this.take("}");
      a = { k: "hashtable", entries, line };
    } else if (t.v === "[") {
      // R27-N4: 型名は単一トークンとは限らない（ドット連結・配列型・
      // ジェネリック型）。角括弧の内容全体を bracketContent で読み、
      // 型名文字列として評価側へ渡す（対応可否は評価側が型名を
      // 名指して裁定する）。
      const type = this.bracketContent(t).text.replace(/\s+/g, "");
      // R30-N10: 被演算子が続かない型リテラル単独形（[int] 単独文等）。
      // 型リテラル自体が完結した式であるため、改行・文区切り・閉じ
      // 括弧・パイプ・カンマが直後に来れば被演算子は無い。この形を
      // キャストとして読み進めると、存在しない ";" や "<eof>" が
      // 原因として表示される（虚偽原因）ため、typeliteral ノードに
      // して評価側で型リテラルそのものを名指して止める。改行を
      // 跨いだ次の文の式を被演算子として取り込むこともしない。
      const afterType = this.ts[this.i];
      if (
        !afterType ||
        afterType.k === "eof" ||
        afterType.k === "sep" ||
        [")", "}", "]", "|", ","].includes(afterType.v)
      ) {
        a = { k: "typeliteral", type, line };
      } else {
        // R24-N3: キャストの被演算子もカンマ演算子を含まない（単項と同様）。
        // R25-N12: 被演算子は式モードのため接着判定を下ろす。
        // R26-N1: 被演算子の内側へ noComma を継承しない（単項と同じ）。
        const savedGlued = this.argGlued,
          savedComma = this.noComma;
        this.argGlued = 0;
        this.noComma = 0;
        let castArg;
        try {
          castArg = this.expr(8);
        } finally {
          this.argGlued = savedGlued;
          this.noComma = savedComma;
        }
        a = { k: "cast", type, arg: castArg, line };
      }
    } else if (t.k === "eof")
      // R31-N8: 内部終端トークン名 "<eof>" を出さず、途中終了として示す。
      failTruncatedExpression(line);
    else
      fail("未対応または不正なPowerShellの式：" + t.v, line, "SyntaxError");
    while (true) {
      if (this.peek(".")) {
        this.take();
        // R30-N10: メンバー区切りの後の改行は式の継続として扱う。
        this.skipNl();
        const key = this.ts[this.i];
        // R28-N5: member-name（文法 B.2）は simple-name のほかに
        // string-literal（$h.'k'／$h."k"）、variable（$h.$name）、
        // ( expression )（$h.('k')）の生成を持つ。名前が存在するのに
        // 「プロパティ名が必要です」と名指すのは虚偽原因であるため、
        // これらを正規形として受理する。静的に決まる名前は name、
        // 実行時に決まる名前は nameExpr として保持し、engine 側で
        // 解決する。二重引用符でも展開（$）を含まない名前は静的に決まる。
        if (key.k === "string") {
          this.take();
          a =
            key.quote === '"' && key.v.includes("$")
              ? {
                  k: "member",
                  target: a,
                  name: null,
                  nameExpr: {
                    k: "string",
                    value: key.v,
                    quote: '"',
                    line: key.line,
                  },
                  line,
                }
              : { k: "member", target: a, name: key.v, line };
          if (this.peek("("))
            fail("未対応：.NETメソッド呼び出し " + key.v, line);
          continue;
        }
        if (key.k === "var") {
          this.take();
          a = {
            k: "member",
            target: a,
            name: null,
            nameExpr: { k: "var", name: key.v, line: key.line },
            line,
          };
          if (this.peek("("))
            fail("未対応：.NETメソッド呼び出し $" + key.v, line);
          continue;
        }
        if (key.v === "(") {
          const open = this.take(),
            savedGlued = this.argGlued,
            savedComma = this.noComma;
          this.argGlued = 0;
          this.noComma = 0;
          let pipe;
          try {
            pipe = this.pipeline();
          } finally {
            this.argGlued = savedGlued;
            this.noComma = savedComma;
          }
          this.take(")");
          a = {
            k: "member",
            target: a,
            name: null,
            nameExpr: { k: "subexpression", pipe, line: open.line },
            line,
          };
          continue;
        }
        this.take();
        if (key.k !== "word")
          fail("プロパティ名が必要です", key.line, "SyntaxError");
        let name = key.v;
        // R27-N1: メンバー名（文法 B.2 の member-name → simple-name、
        // B.1.10）の構成文字に「-」は含まれない。字句解析の単語トークンは
        // コマンド名（Write-Output 等）のために「-」を含むため、ドットの
        // 後では最初の「-」以降を演算子側へ戻す。戻し分を再トークン化して
        // 現在位置へ差し込むことで、接着した減算（$h.k-1）・後置 --・
        // 比較（$h.k-eq 10）が実物どおり演算子として解釈される。
        // R28-N2: 同じ字句規則を「/」にも広げる。相対パスの字句規則が
        // 「k/2」全体を1単語として取り込むため、接着した除算（$h.k/2）が
        // 存在しないメンバー名として黙って $null 化していた（$h.k/0 の
        // 無言化・$h.k/-2 の誤値・条件の誤分岐を含む）。「\」と、パス形に
        // 取り込まれた後続メンバー区切り「.」も同じ境界であり、simple-name
        // の構成文字でない最初の文字以降を再トークン化して演算子・区切り
        // 側へ戻す（引用符付き名前は文字列トークン側で処理済みのため、
        // ハイフン等を含む実在キーは従来どおり添字・引用形で読める）。
        const cut = name.search(/[-/\\.]/);
        if (cut > 0) {
          const restTokens = tokenizePS(name.slice(cut)).filter(
            (x) => x.k !== "eof",
          );
          const base = key.start + cut;
          for (const x of restTokens) {
            x.start += base;
            x.end += base;
            x.line = key.line;
          }
          this.ts.splice(this.i, 0, ...restTokens);
          // R29-N12: 単語トークンは「-」までしか取り込まないため、接着した
          // 複合代入 -= は「-」と「=」の2トークンに割れる。再トークン化で
          // 戻した「-」の直後に、原文で接着した「=」が続く場合は1つの
          // 複合代入トークンへ結合し直す（RG-240 の字句一般化を複合代入
          // 全般へ広げる。空白で離れた形は結合しない）。
          const first = this.ts[this.i],
            after = this.ts[this.i + restTokens.length];
          if (
            restTokens.length === 1 &&
            first?.v === "-" &&
            after?.v === "=" &&
            first.end === after.start
          )
            this.ts.splice(this.i, restTokens.length + 1, {
              k: "op",
              v: "-=",
              start: first.start,
              end: after.end,
              line: key.line,
            });
          name = name.slice(0, cut);
        }
        a = { k: "member", target: a, name, line };
        if (this.peek("(")) fail("未対応：.NETメソッド呼び出し " + name, line);
        continue;
      }
      if (this.peek("[")) {
        this.take();
        // R25-N12: 添字内は式モードのため接着判定を一時的に下ろす。
        // R26-N1: 添字の内側へ noComma を継承しない（括弧と同じ）。
        const savedGlued = this.argGlued,
          savedComma = this.noComma;
        this.argGlued = 0;
        this.noComma = 0;
        let index;
        try {
          index = this.expr();
        } finally {
          this.argGlued = savedGlued;
          this.noComma = savedComma;
        }
        // R30-N10: 添字の閉じ括弧の前の改行は文を終えない。
        this.skipNl();
        this.take("]");
        a = { k: "index", target: a, index, line };
        continue;
      }
      if (this.peek("++") || this.peek("--")) {
        // R26-N2: 引数モード（argGlued）では、代入可能な対象（変数・
        // プロパティ・添字）でない一次式への後置 ++／-- は消費しない。
        // 消費すると評価側の代入先参照でホスト例外が漏出していた
        // （Write-Output 1 --2 の第1引数等）。消費しなければ、後続の
        // ++／-- は次の引数として generic-token 側で文字列になる。
        // 式位置（argGlued=0）の解釈には触れない。
        if (
          this.argGlued > 0 &&
          !["var", "member", "index"].includes(a.k)
        )
          break;
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
        // R26-N1: noComma が届くのはパラメータ列の水準だけであり、括弧・
        // @()・@{}・キャスト・単項・添字・ブロック等の内側では各分岐が
        // noComma を 0 へ戻してから読むため、内側の範囲右辺はここで
        // 通常どおり収集される。
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
    // R29-N13: 括弧内・条件内（assignDepth が立った文脈）では代入式を
    // 受理する。代入は最も緩い結合であり、式の値として代入後の値を
    // 返す（言語仕様 §7.11）。文頭では statement() 側の代入文（出力
    // なし）が従来どおり処理するため、ここでは読まない。従来はこの
    // 読みが無く、括弧が揃っているのに「) が必要です」という虚偽
    // 原因で止まっていた。
    // R31-N10: 括弧内でもブラケットの積み重ねを文位置と同じくほどく。
    // ほどけない場合は従来どおり代入式として読まず、外側の
    // 「) が必要です」等の虚偽原因にも、代入先の虚偽原因にもしない
    // ため、条件判定は castChain の結果で行う。
    const assignChain = castChain(a);
    if (
      this.assignDepth > 0 &&
      min <= 1 &&
      ["=", "+=", "-=", "*=", "/=", "%="].includes(this.ts[this.i]?.v) &&
      (["var", "member", "index"].includes(a.k) ||
        // R30-N11: 括弧内でも型付き代入式（[int]$x = "42"）を文位置と
        // 同じく型変換つき代入として読む（RG-271 の隣接形）。
        (assignChain.types.length &&
          ["var", "member", "index"].includes(assignChain.target.k)))
    ) {
      const assignOp = this.take().v;
      a = assignChain.types.length
        ? {
            k: "assign-expr",
            target: assignChain.target,
            castType:
              assignChain.types.length === 1 ? assignChain.types[0] : null,
            castTypes:
              assignChain.types.length > 1 ? assignChain.types : null,
            op: assignOp,
            value: this.pipeline(),
            line,
          }
        : {
            k: "assign-expr",
            target: a,
            op: assignOp,
            value: this.pipeline(),
            line,
          };
    }
    // R28-N7: 三項（条件）演算子（言語仕様 7.4。PowerShell 7 以降の
    // 正規の演算子）。優先順位は全二項演算子より下であるため、最も
    // 緩い水準（min <= 1）でだけ読み、分岐は完全な式として読む。
    // 「?」はコマンド位置では Where-Object の別名として stage 側が
    // 扱い、式の値の後に現れる場合だけが三項演算子になる。従来は
    // この読みが無く、括弧が揃っているのに呼び出し側が「) が必要です」
    // という虚偽原因で止まっていた。
    if (min <= 1 && this.peek("?")) {
      this.take();
      const thenBranch = this.expr(0);
      if (!this.peek(":"))
        fail(": が必要です", this.ts[this.i]?.line || line, "SyntaxError");
      this.take();
      a = {
        k: "ternary",
        test: a,
        then: thenBranch,
        else: this.expr(0),
        line,
      };
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
