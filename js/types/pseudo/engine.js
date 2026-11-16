// IPA擬似言語（基本情報技術者試験・応用情報技術者試験の「擬似言語の記述形式」
// Ver.5.1 別紙2）の字句解析・構文解析・パス探索型インタプリタ。
// 一次情報：IPA『試験で使用する情報技術に関する用語・プログラム言語など』Ver.5.1
// 別紙2（pp.4-5）と、科目Bサンプル問題・令和6年度・令和7年度公開問題の実例で裁定した。
// 解釈が割れる点の裁定（C1〜C11）は docs/audit/MUSE-ADD-PSEUDO.md に記録する。
import { LIMITS, isUnknown } from "../../core/contract.js";
import { unknownLabel } from "../../core/presentation.js";
import { PracticeError } from "../../core/script.js";

// 「未定義」の値。値が格納されていない状態そのものを表す単一の値として扱う（C6）。
export const UNDEF = Object.freeze({ kind: "pseudo-undef" });
export const isUndef = (value) => value === UNDEF;

const isObj = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && !isUnknown(value) && !isUndef(value) && typeof value.__class === "string";

function makeUnknown(source, extra = {}) {
  return { kind: "unknown", source, ...extra };
}

function cloneVal(value) {
  if (Array.isArray(value)) {
    const copy = value.map(cloneVal);
    if (value.__reals) attachReals(copy, [...value.__reals]);
    return copy;
  }
  if (isObj(value)) {
    const fields = new Map();
    for (const [key, item] of value.fields) fields.set(key, cloneVal(item));
    const copy = { __class: value.__class, fields };
    if (value.fieldReals) copy.fieldReals = new Map(value.fieldReals);
    return copy;
  }
  return value;
}

// 配列の要素ごとの「実数として扱うべきか」の印（C1 の伝播を代入・格納を跨いで保持する）。
// 表示・直列化には現れないよう enumerable でないプロパティに置く。
function attachReals(array, reals) {
  Object.defineProperty(array, "__reals", { value: reals, writable: true, configurable: true, enumerable: false });
}
function elemReal(array, index) {
  return !!(array && array.__reals && array.__reals[index]);
}

// 配列（入れ子を含む）の要素のうち、実数として扱うべきものが1つでもあるか。
// 実数性の印（__reals）のほか、整数でない数値そのものも実数として数える
// （画面入力など印が付かない経路で入った 7.5 のような値のため）。
function anyRealElems(value) {
  if (!Array.isArray(value)) return false;
  for (let i = 0; i < value.length; i++) {
    const elem = value[i];
    if (elemReal(value, i)) return true;
    if (typeof elem === "number" && !Number.isInteger(elem)) return true;
    if (anyRealElems(elem)) return true;
  }
  return false;
}

// 属性句の対象が名前で、その宣言型が実数型（配列型を含む）かどうか。
function declaredObjReal(node, state) {
  if (node && node.obj && node.obj.k === "name") {
    const cell = findCell(state, node.obj.name);
    return !!(cell && cell.t && cell.t.base === "実数型");
  }
  return false;
}

// 配列変数に宣言型がある場合、要素の実数性も型で決める（スカラーと同じ原則）。
function forcedElemReal(node, state, real) {
  if (node.obj && node.obj.k === "name") {
    const cell = findCell(state, node.obj.name);
    if (cell && cell.t) return cell.t.base === "実数型";
  }
  return real;
}
function setElemReal(array, index, real) {
  if (!array) return;
  if (!array.__reals) attachReals(array, []);
  array.__reals[index] = !!real;
}

// 値の表示。文字列は引用符付き、未定義は「未定義」、未確定は unknownLabel で示す。
export function fmtVal(value) {
  if (isUndef(value)) return "未定義";
  if (isUnknown(value)) return unknownLabel(value);
  if (typeof value === "string") return `“${value}”`;
  if (typeof value === "number") {
    if (value === Infinity) return "∞";
    if (value === -Infinity) return "-∞";
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `{${value.map(fmtVal).join(", ")}}`;
  if (isObj(value)) {
    const parts = [...value.fields.entries()].map(([key, item]) => `${key}: ${fmtVal(item)}`);
    return `${value.__class}(${parts.join(", ")})`;
  }
  return String(value);
}

function valueTypeName(value) {
  if (isUndef(value)) return "未定義";
  if (isUnknown(value)) return "未確定";
  if (typeof value === "number") return Number.isInteger(value) ? "整数型" : "実数型";
  if (typeof value === "string") return value.length === 1 ? "文字型" : "文字列型";
  if (typeof value === "boolean") return "論理型";
  if (Array.isArray(value)) return "配列";
  if (isObj(value)) return `${value.__class}型`;
  return "値";
}

// 型 { base, depth, twoDim } の表示名（正規化した表記）。
function typeDisplay(type) {
  if (!type) return null;
  let name = type.base;
  if (type.twoDim) name += "の二次元配列";
  for (let i = 0; i < (type.depth || 0); i++) name += "の配列";
  return name;
}

// 宣言型があるスカラーは型が実数性を決める（C1。独立検証で確認した解釈：
// 整数型で宣言した変数に 7.0 を入れても商になる）。宣言が無い場合だけ値が決める。
function declaredReal(type) {
  return !!(type && type.base === "実数型" && type.depth === 0 && !type.twoDim);
}

function fail(line, message, category = "未対応") {
  throw new PracticeError(message, line, category);
}

// ---------------------------------------------------------------------------
// 行分割と字句の正規化
// ---------------------------------------------------------------------------

// 全角の演算子・句読点を半角へ寄せ、表記揺れを吸収する（C5）。
// × ÷ ≦ ≧ ≠ は擬似言語固有の glyph としてそのまま保持する。
function normalizeGlyphs(text) {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/＋/g, "+")
    .replace(/－/g, "-")
    .replace(/−/g, "-")
    .replace(/＝/g, "=")
    .replace(/＜/g, "<")
    .replace(/＞/g, ">")
    .replace(/：/g, ":")
    .replace(/，/g, ",")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/［/g, "[")
    .replace(/］/g, "]")
    .replace(/｛/g, "{")
    .replace(/｝/g, "}")
    .replace(/＂/g, "\"")
    .replace(/≤/g, "≦")
    .replace(/≥/g, "≧")
    .replace(/　/g, " ");
}

// プログラム中の注釈（/* */ または //）に「実数として計算する」が含まれるかを調べる
// （裁定 C1 改訂版。サンプル問5の問題文定義・令和6年度問5の行内注釈が根拠）。
// 文字列リテラルの中身は注釈ではないので数えない。
export function hasRealDivAnnotation(code) {
  const text = String(code);
  let inString = false;
  let inBlock = false;
  let inLine = false;
  let commentText = "";
  const comments = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const pair = text.slice(i, i + 2);
    if (inBlock) {
      if (pair === "*/") { inBlock = false; comments.push(commentText); commentText = ""; i++; } else commentText += ch;
      continue;
    }
    if (inLine) {
      if (ch === "\n" || ch === "\r") { inLine = false; comments.push(commentText); commentText = ""; } else commentText += ch;
      continue;
    }
    if (inString) {
      if (ch === "\"" || ch === "＂") inString = false;
      continue;
    }
    if (ch === "\"" || ch === "＂") { inString = true; continue; }
    if (pair === "/*") { inBlock = true; i++; continue; }
    if (pair === "//") { inLine = true; i++; continue; }
  }
  if (commentText) comments.push(commentText);
  return comments.some((c) => c.includes("実数として計算する"));
}

// ソースを行に分け、注釈 /* */ と // を取り除く。行末注釈は繰返しのラベルとして保持する。
// 全角 glyph の正規化（C5）は字句（コード側）だけに適用し、文字列リテラルの中身は
// 原文どおり保持する（R30-PAR-8。是正前は行全体を先に正規化していたため、
// リテラル内の全角英数字・記号まで半角化されて値が変わっていた）。
export function splitLines(code) {
  const rawLines = String(code).split(/\r\n|\r|\n/);
  const lines = [];
  let inBlock = false;
  rawLines.forEach((rawOriginal, index) => {
    const raw = rawOriginal;
    let text = "";
    let comment = null;
    let j = 0;
    let inString = false;
    while (j < raw.length) {
      const ch = raw[j];
      const pair = raw.slice(j, j + 2);
      if (inBlock) {
        const end = raw.indexOf("*/", j);
        if (end < 0) { j = raw.length; } else { inBlock = false; j = end + 2; }
        continue;
      }
      if (inString) {
        // リテラル内は正規化しない。ただし閉じ引用符（全角 ＂ を含む）は半角 " にそろえる。
        if (ch === "\"" || ch === "＂") { text += "\""; inString = false; } else text += ch;
        j++;
        continue;
      }
      if (ch === "\"" || ch === "＂") { inString = true; text += "\""; j++; continue; }
      if (pair === "/*") { inBlock = true; j += 2; continue; }
      if (pair === "//") { comment = normalizeGlyphs(raw.slice(j + 2)).trim(); break; }
      text += normalizeGlyphs(ch);
      j++;
    }
    const indent = /^[ \t　]*/.exec(raw)[0].length;
    lines.push({ no: index + 1, text: text.trim(), comment, indent });
  });
  return lines;
}

// 行末注釈が短い1語だけのとき、それを繰返しのラベルとみなす（例： // α）。
function lineLabel(line) {
  if (line.comment && /^[^\s]{1,4}$/.test(line.comment)) return line.comment;
  return null;
}

// ---------------------------------------------------------------------------
// 式の字句解析
// ---------------------------------------------------------------------------

// 式の中で最長一致させる日本語の句。文レベルの句（〜を追加する等）は含めない。
const JP_PHRASES = [
  "文字目の文字", "未定義である", "未定義でない", "未定義の値",
  "より大きい", "より小さい", "と等しい",
  "要素の和", "要素数", "文字数", "でない", "以上", "以下",
  "行数", "列数", "商", "が", "の",
].sort((a, b) => b.length - a.length);

const isCjk = (ch) => /[぀-ヿ一-鿿]/.test(ch);

// 記述形式に無い演算子への案内つき名指し停止。
const OPERATOR_HINTS = {
  "*": "演算子 * は記述形式にありません。乗算は × を使います",
  "/": "演算子 / は記述形式にありません。除算は ÷ を使います",
  "%": "演算子 % は記述形式にありません。剰余は mod を使います",
  "^": "べき乗の演算子は記述形式にありません",
  "&": "演算子 & は記述形式にありません。論理積は and を使います",
  "|": "演算子 | は記述形式にありません。論理和は or を使います",
  "!": "演算子 ! は記述形式にありません。否定は not を使います",
};

function tokenizeExpr(text, line) {
  const tokens = [];
  let i = 0;
  const push = (kind, value, start, end) => tokens.push({ kind, value, start, end });
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "\"") {
      const end = text.indexOf("\"", i + 1);
      if (end < 0) fail(line, "文字列が閉じていません。二重引用符 \" で囲みます", "構文エラー");
      push("str", text.slice(i + 1, end), i, end + 1);
      i = end + 1;
      continue;
    }
    if (ch === "∞") {
      // 無限大のリテラル（令和6年度問5の実例 `maxL ← －∞`）。符号は単項演算子として読む。
      tokens.push({ kind: "num", value: Infinity, start: i, end: i + 1, real: true });
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const match = /^\d+(\.\d+)?/.exec(text.slice(i));
      const token = { kind: "num", value: Number(match[0]), start: i, end: i + match[0].length, real: match[0].includes(".") };
      tokens.push(token);
      i += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(i));
      const word = match[0];
      if (word === "mod" || word === "and" || word === "or" || word === "not") push("op", word, i, i + word.length);
      else if (word === "true" || word === "false") push("bool", word === "true", i, i + word.length);
      else push("ident", word, i, i + word.length);
      i += word.length;
      continue;
    }
    const two = text.slice(i, i + 2);
    if (two === "==") fail(line, "== は記述形式にありません。等しいかどうかは = で表します");
    if (two === "!=") fail(line, "!= は記述形式にありません。等しくないことは ≠ で表します");
    if (two === "&&" || two === "||") fail(line, `${two} は記述形式にありません。and / or を使います`);
    if ("()[]{},.:←".includes(ch)) { push("punct", ch, i, i + 1); i++; continue; }
    if ("+-×÷≠≦≧<>=".includes(ch)) { push("op", ch, i, i + 1); i++; continue; }
    if (OPERATOR_HINTS[ch]) fail(line, OPERATOR_HINTS[ch]);
    if (isCjk(ch)) {
      const phrase = JP_PHRASES.find((p) => text.startsWith(p, i));
      if (phrase) { push("jp", phrase, i, i + phrase.length); i += phrase.length; continue; }
      // 日本語の名前：句が始まる位置の手前までを1つの名前として読む。
      let j = i;
      while (j < text.length && isCjk(text[j]) && !JP_PHRASES.some((p) => text.startsWith(p, j))) j++;
      push("ident", text.slice(i, j), i, j);
      i = j;
      continue;
    }
    fail(line, `文字「${ch}」は記述形式では使いません`, "構文エラー");
  }
  push("eof", null, text.length, text.length);
  return tokens;
}

// ---------------------------------------------------------------------------
// 式の構文解析（優先順位は記述形式の表どおり：
// () . ＞ 単項 not + - ＞ mod × ÷ ＞ + - ＞ 関係 ＞ and ＞ or）
// ---------------------------------------------------------------------------

class ExprParser {
  constructor(text, line) {
    this.text = text;
    this.line = line;
    this.tokens = tokenizeExpr(text, line);
    this.pos = 0;
  }
  peek() { return this.tokens[this.pos]; }
  next() { return this.tokens[this.pos++]; }
  isOp(...ops) { const t = this.peek(); return t.kind === "op" && ops.includes(t.value); }
  isPunct(v) { const t = this.peek(); return t.kind === "punct" && t.value === v; }
  isJp(v) { const t = this.peek(); return t.kind === "jp" && t.value === v; }
  expectPunct(v) {
    if (!this.isPunct(v)) fail(this.line, `「${v}」が必要です（対象：${this.text}）`, "構文エラー");
    return this.next();
  }
  parse() {
    const node = this.parseOr();
    if (this.peek().kind !== "eof") fail(this.line, `式の後ろに解釈できない部分があります：${this.text}`, "構文エラー");
    return node;
  }
  parseOr() {
    let left = this.parseAnd();
    while (this.isOp("or")) { this.next(); left = { k: "bin", op: "or", l: left, r: this.parseAnd(), line: this.line }; }
    return left;
  }
  parseAnd() {
    let left = this.parseCmp();
    while (this.isOp("and")) { this.next(); left = { k: "bin", op: "and", l: left, r: this.parseCmp(), line: this.line }; }
    return left;
  }
  parseCmp() {
    const left = this.parseAdd();
    if (this.isJp("が")) {
      this.next();
      if (this.isJp("未定義である")) { this.next(); return { k: "isundef", v: left, neg: false, line: this.line }; }
      if (this.isJp("未定義でない")) { this.next(); return { k: "isundef", v: left, neg: true, line: this.line }; }
      const right = this.parseAdd();
      const table = { "と等しい": "=", "でない": "≠", "以上": "≧", "以下": "≦", "より大きい": ">", "より小さい": "<" };
      const t = this.peek();
      if (t.kind === "jp" && table[t.value]) { this.next(); return { k: "bin", op: table[t.value], l: left, r: right, jp: true, line: this.line }; }
      fail(this.line, "「〜 が 〜」の条件は、と等しい／でない／以上／以下／より大きい／より小さい／未定義である／未定義でない の形で書きます");
    }
    if (this.peek().kind === "op" && ["≠", "≦", "≧", "<", "=", ">"].includes(this.peek().value)) {
      const op = this.next().value;
      return { k: "bin", op, l: left, r: this.parseAdd(), line: this.line };
    }
    return left;
  }
  parseAdd() {
    let left = this.parseMul();
    while (this.isOp("+", "-")) { const op = this.next().value; left = { k: "bin", op, l: left, r: this.parseMul(), line: this.line }; }
    return left;
  }
  parseMul() {
    let left = this.parseUnary();
    while (this.isOp("mod", "×", "÷")) {
      const op = this.next().value;
      let right = this.parseUnary();
      // 「式 ÷ 式 の商」の連鎖形では、「の商」は除数だけではなく除算全体の結果に
      // 掛かる（R30F01B-N5。裁定 C1「『の商』の句は常に trunc」）。後置の quot が
      // 右辺の先頭に付いていたら剥がし、乗除の結果全体へ付け直す。
      const peelQuot = (node) => {
        // 括弧で明示的にくくった部分（grouped）は付け直しの対象にしない。
        // 別紙2で () は最高位の優先順位であり、学習者が括弧で示した
        // 「この部分の商」という範囲を勝手に広げてはならない（R31-N1）。
        if (node.grouped) return { base: node, layers: 0 };
        if (node.k === "quot") { const inner = peelQuot(node.v); return { base: inner.base, layers: inner.layers + 1 }; }
        if (node.k === "un" && (node.op === "-" || node.op === "+")) {
          const inner = peelQuot(node.v);
          if (inner.layers > 0) return { base: { ...node, v: inner.base }, layers: inner.layers };
        }
        return { base: node, layers: 0 };
      };
      const peeled = peelQuot(right);
      const quotLayers = peeled.layers;
      right = peeled.base;
      left = { k: "bin", op, l: left, r: right, line: this.line };
      for (let n = 0; n < quotLayers; n++) left = { k: "quot", v: left, line: this.line };
    }
    return left;
  }
  parseUnary() {
    if (this.isOp("not")) { this.next(); return { k: "un", op: "not", v: this.parseUnary(), line: this.line }; }
    if (this.isOp("-")) { this.next(); return { k: "un", op: "-", v: this.parseUnary(), line: this.line }; }
    if (this.isOp("+")) { this.next(); return { k: "un", op: "+", v: this.parseUnary(), line: this.line }; }
    return this.parsePostfix();
  }
  parsePostfix() {
    let node = this.parsePrimary();
    for (;;) {
      if (this.isPunct("[")) {
        this.next();
        const first = this.parseOr();
        let second = null;
        if (this.isPunct(",")) { this.next(); second = this.parseOr(); }
        this.expectPunct("]");
        node = { k: "index", obj: node, i: first, j: second, line: this.line };
        continue;
      }
      if (this.isPunct(".")) {
        this.next();
        const nameTok = this.next();
        if (nameTok.kind !== "ident") fail(this.line, "「.」の後にはメンバ変数名かメソッド名を書きます", "構文エラー");
        node = { k: "member", obj: node, name: nameTok.value, line: this.line };
        if (this.isPunct("(")) node = { k: "call", target: node, args: this.parseArgs(), line: this.line };
        continue;
      }
      if (this.isPunct("(")) {
        if (node.k !== "name") fail(this.line, "呼び出せるのは手続き・関数・メソッドの名前だけです", "構文エラー");
        node = { k: "call", target: node, args: this.parseArgs(), line: this.line };
        continue;
      }
      if (this.isJp("の") && !(this.noAttr > 0)) {
        this.next();
        const t = this.peek();
        if (t.kind === "jp" && ["要素数", "行数", "列数", "文字数", "要素の和"].includes(t.value)) {
          this.next();
          node = { k: "prop", obj: node, prop: t.value, line: this.line };
          continue;
        }
        if (t.kind === "jp" && t.value === "商") {
          this.next();
          node = { k: "quot", v: node, line: this.line };
          continue;
        }
        if (t.kind === "ident" && (t.value === "行番号" || t.value === "列番号")) {
          this.next();
          // 添字式の中で「の要素の和」を後置として奪われないよう、属性句を止めて読む。
          this.noAttr = (this.noAttr || 0) + 1;
          const index = this.parseAdd();
          this.noAttr--;
          if (!this.isJp("の")) fail(this.line, `「${t.value}（式）の要素の和」の形で書きます`, "構文エラー");
          this.next();
          if (!this.isJp("要素の和")) fail(this.line, `「${t.value}（式）の要素の和」の形で書きます`, "構文エラー");
          this.next();
          node = { k: t.value === "行番号" ? "rowsum" : "colsum", obj: node, i: index, line: this.line };
          continue;
        }
        const index = this.parseAdd();
        if (this.isJp("文字目の文字")) {
          this.next();
          node = { k: "charat", obj: node, i: index, line: this.line };
          continue;
        }
        fail(this.line, "「の」の後は 要素数／行数／列数／文字数／要素の和／行番号（式）の要素の和／列番号（式）の要素の和／（式）文字目の文字／商 のいずれかで書きます");
      }
      break;
    }
    return node;
  }
  parseArgs() {
    this.expectPunct("(");
    const args = [];
    if (!this.isPunct(")")) {
      args.push(this.parseOr());
      while (this.isPunct(",")) { this.next(); args.push(this.parseOr()); }
    }
    this.expectPunct(")");
    return args;
  }
  parsePrimary() {
    const t = this.next();
    if (t.kind === "num") return { k: "num", v: t.value, real: !!t.real, line: this.line };
    if (t.kind === "str") return { k: "str", v: t.value, line: this.line };
    if (t.kind === "bool") return { k: "bool", v: t.value, line: this.line };
    if (t.kind === "ident") return { k: "name", name: t.value, line: this.line };
    if (t.kind === "jp" && t.value === "未定義の値") return { k: "undef", line: this.line };
    if (t.kind === "punct" && t.value === "(") {
      const inner = this.parseOr();
      this.expectPunct(")");
      // 括弧によるグループ化の情報を保持する（「の商」の付け直しが
      // 括弧の中へ及ばないようにするため。R31-N1）。
      inner.grouped = true;
      return inner;
    }
    if (t.kind === "punct" && t.value === "{") return this.parseArrayLiteral(t);
    if (t.kind === "eof") fail(this.line, "式を解釈できません（式が途中で終わっています）", "構文エラー");
    fail(this.line, `式が解釈できません：${this.text}`, "構文エラー");
  }
  // { } の中身は元の文字列から切り出し、カンマの深さで分割して解釈する。
  parseArrayLiteral(openTok) {
    let depth = 0;
    let closeTok = null;
    for (let p = this.pos - 1; p < this.tokens.length; p++) {
      const tk = this.tokens[p];
      if (tk.kind === "punct" && tk.value === "{") depth++;
      if (tk.kind === "punct" && tk.value === "}") { depth--; if (depth === 0) { closeTok = tk; this.pos = p + 1; break; } }
    }
    if (!closeTok) fail(this.line, "配列の { } が閉じていません", "構文エラー");
    const inner = this.text.slice(openTok.end, closeTok.start);
    if (!inner.trim()) return { k: "array", elems: [], line: this.line };
    const segments = splitTopLevel(inner);
    if (segments.length === 1) {
      const seg = segments[0];
      const fill2 = /^\s*(.+?)行\s*(.+?)列の\s*(.+)$/s.exec(seg);
      if (fill2) return { k: "fill2", rows: parseTextExpr(fill2[1], this.line), cols: parseTextExpr(fill2[2], this.line), v: parseTextExpr(fill2[3], this.line), line: this.line };
      const fill = /^\s*(.+?)個の\s*(.+)$/s.exec(seg);
      if (fill) return { k: "fill", n: parseTextExpr(fill[1], this.line), v: parseTextExpr(fill[2], this.line), line: this.line };
    }
    return { k: "array", elems: segments.map((seg) => parseTextExpr(seg, this.line)), line: this.line };
  }
}

// 文字列・括弧の深さを数えながら、最上位のカンマで分割する。
function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let inString = false;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) { if (ch === "\"") inString = false; continue; }
    if (ch === "\"") { inString = true; continue; }
    if ("({[".includes(ch)) depth++;
    else if (")}]".includes(ch)) depth--;
    else if (ch === "," && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts;
}

export function parseTextExpr(text, line) {
  return new ExprParser(String(text).trim(), line).parse();
}

// ---------------------------------------------------------------------------
// 型と宣言
// ---------------------------------------------------------------------------

const BASIC_TYPES = ["整数型", "実数型", "文字型", "文字列型", "論理型"];

// 型名の表記揺れを { base, depth, twoDim } に正規化する（C5）。
// 例：整数型の配列 / 整数型配列（depth 1）、整数型の二次元配列（twoDim）、
//     整数型の配列の配列 / 整数型配列の配列（depth 2）、クラス名そのもの（クラス型）。
function parseType(text, line) {
  let rest = String(text).trim();
  if (!rest) fail(line, "型名がありません", "構文エラー");
  let twoDim = false;
  let depth = 0;
  for (;;) {
    if (rest.endsWith("の二次元配列")) { twoDim = true; rest = rest.slice(0, -"の二次元配列".length); continue; }
    if (rest.endsWith("二次元配列")) { twoDim = true; rest = rest.slice(0, -"二次元配列".length); continue; }
    if (rest.endsWith("の配列")) { depth++; rest = rest.slice(0, -"の配列".length); continue; }
    if (rest.endsWith("配列")) { depth++; rest = rest.slice(0, -"配列".length); continue; }
    break;
  }
  const base = rest.trim();
  if (!base) fail(line, `型名が解釈できません：${text}`, "構文エラー");
  return { base, depth, twoDim };
}

// 項目名として使う型の代表名。
function typeRefName(type) {
  if (!type) return null;
  if (BASIC_TYPES.includes(type.base) && type.depth === 0 && !type.twoDim) return type.base;
  if (type.twoDim) return "二次元配列型";
  if (type.depth >= 2) return "配列の配列";
  if (type.depth === 1) return "配列型";
  return "クラス型";
}

const IDENT = "[A-Za-z_][A-Za-z0-9_]*|[぀-ヿ一-鿿][぀-ヿ一-鿿A-Za-z0-9_]*";
const DECL_RE = new RegExp(`^(${IDENT})\\s*:\\s*(.+)$`);
const GLOBAL_RE = /^大域\s*:\s*(.+)$/;

// 「型名: 変数名」の形かどうかを判定する。型名側に空白・記号が無いことが条件。
function matchDeclHead(text) {
  const match = DECL_RE.exec(text);
  if (!match) return null;
  const typeText = match[1];
  if (/[\s()[\]{}←=<>+×÷]/.test(typeText)) return null;
  return { typeText, rest: match[2] };
}

// 括弧で囲まれた部分を切り出す（文字列の中の括弧は数えない）。
function extractParen(text, line) {
  const open = text.indexOf("(");
  if (open < 0) fail(line, `「(」が必要です：${text}`, "構文エラー");
  let depth = 0;
  let inString = false;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inString) { if (ch === "\"") inString = false; continue; }
    if (ch === "\"") { inString = true; continue; }
    if (ch === "(") depth++;
    if (ch === ")") { depth--; if (depth === 0) return { inner: text.slice(open + 1, i), rest: text.slice(i + 1).trim() }; }
  }
  fail(line, `括弧が閉じていません：${text}`, "構文エラー");
}

// 代入の左辺（名前・添字・メンバ）を式として解釈し、代入先として妥当か確かめる。
function parseTarget(text, line) {
  const node = parseTextExpr(text, line);
  if (node.k !== "name" && node.k !== "index" && node.k !== "member") {
    fail(line, `代入の左辺には変数名・配列の要素・メンバ変数を書きます：${text}`, "構文エラー");
  }
  return node;
}

// ---------------------------------------------------------------------------
// 文の構文解析
// ---------------------------------------------------------------------------

const BLOCK_ENDS = ["elseif", "else", "endif", "endwhile", "endfor"];

function headKeyword(text) {
  const match = /^(elseif|else|endif|endwhile|endfor|if|while|do|for|return)\b/.exec(text);
  if (match) return match[1];
  if (/^(elseif|else|endif|endwhile|endfor)\s*(\(|$)/.test(text)) return /^\w+/.exec(text)[0];
  return null;
}

class Parser {
  constructor(code) {
    this.code = String(code);
    this.lines = splitLines(code).filter((line) => line.text !== "");
    this.pos = 0;
  }
  peekLine() { return this.lines[this.pos] || null; }
  takeLine() { return this.lines[this.pos++]; }

  parseProgram() {
    const program = { globals: [], funcs: new Map(), funcOrder: [], classNames: new Set(), main: [], realDiv: hasRealDivAnnotation(this.code) };
    this.program = program;
    while (this.pos < this.lines.length) {
      const line = this.peekLine();
      if (line.text.startsWith("○")) { this.parseFunc(); continue; }
      if (GLOBAL_RE.test(line.text)) { program.globals.push(this.parseGlobalDecl()); continue; }
      program.main.push(this.parseStatement({ inFunc: false, loopLabels: [] }));
    }
    return program;
  }

  parseFunc() {
    const line = this.takeLine();
    const head = line.text.slice(1).trim();
    const open = head.indexOf("(");
    if (open < 0) fail(line.no, `手続き・関数の宣言には (引数, …) が必要です：${line.text}`, "構文エラー");
    const { inner: paramText, rest } = extractParen(head, line.no);
    if (rest) fail(line.no, `宣言の後ろに解釈できない部分があります：${line.text}`, "構文エラー");
    const beforeParen = head.slice(0, open).trim();
    let retType = null;
    let name = beforeParen;
    if (beforeParen.includes(":")) {
      const idx = beforeParen.lastIndexOf(":");
      retType = parseType(beforeParen.slice(0, idx), line.no);
      name = beforeParen.slice(idx + 1).trim();
    }
    if (!new RegExp(`^(${IDENT})$`).test(name)) fail(line.no, `手続き・関数名が解釈できません：${line.text}`, "構文エラー");
    if (this.program.funcs.has(name)) fail(line.no, `手続き・関数 ${name} は既に宣言されています`, "構文エラー");
    const params = [];
    if (paramText.trim()) {
      for (const part of splitTopLevel(paramText)) {
        const decl = matchDeclHead(part.trim());
        if (!decl) fail(line.no, `引数は「型名: 引数名」の形で書きます：${part.trim()}`, "構文エラー");
        const names = decl.rest.split(",").map((s) => s.trim());
        if (names.length !== 1 || !new RegExp(`^(${IDENT})$`).test(names[0])) fail(line.no, `引数名が解釈できません：${part.trim()}`, "構文エラー");
        params.push({ type: parseType(decl.typeText, line.no), name: names[0] });
      }
    }
    const fn = { name, retType, params, body: [], line: line.no };
    this.program.funcs.set(name, fn);
    this.program.funcOrder.push(fn);
    if (retType && !BASIC_TYPES.includes(retType.base) && retType.depth === 0 && !retType.twoDim) this.program.classNames.add(retType.base);
    for (const param of params) {
      if (!BASIC_TYPES.includes(param.type.base) && param.type.depth === 0 && !param.type.twoDim) this.program.classNames.add(param.type.base);
    }
    // 本体は、宣言行より字下げした行の集まりとする（試験の掲載形式と同じ約束）。
    // 字下げのない行が来たら本体は終わり、その行からはプログラム本体（主処理）になる。
    const bodyLines = [];
    while (this.pos < this.lines.length && this.lines[this.pos].indent > line.indent) {
      bodyLines.push(this.lines[this.pos]);
      this.pos++;
    }
    const sub = new Parser("");
    sub.lines = bodyLines;
    sub.pos = 0;
    sub.program = this.program;
    fn.body = sub.parseBlock([], { inFunc: true, loopLabels: [] });
    if (sub.pos < bodyLines.length) {
      const rest = bodyLines[sub.pos];
      fail(rest.no, `手続き・関数 ${name} の本体として解釈できない行です：${rest.text}`, "構文エラー");
    }
    return fn;
  }

  parseGlobalDecl() {
    const line = this.takeLine();
    const inner = GLOBAL_RE.exec(line.text)[1];
    const stmt = this.parseDeclText(inner, line.no, true);
    stmt.line = line.no;
    return stmt;
  }

  // 「型名: 変数名, 変数名 ← 式, …」を宣言文として解釈する。宣言でなければ null。
  tryParseDecl(text, lineNo) {
    const decl = matchDeclHead(text);
    if (!decl) return null;
    return this.parseDeclText(text, lineNo, false);
  }

  parseDeclText(text, lineNo, global) {
    const decl = matchDeclHead(text);
    if (!decl) fail(lineNo, `宣言は「型名: 変数名」の形で書きます：${text}`, "構文エラー");
    const type = parseType(decl.typeText, lineNo);
    if (!BASIC_TYPES.includes(type.base) && type.depth === 0 && !type.twoDim && this.program) this.program.classNames.add(type.base);
    const items = [];
    for (const part of splitTopLevel(decl.rest)) {
      const piece = part.trim();
      if (!piece) fail(lineNo, "変数名が書かれていません（宣言が途中で終わっているか、カンマの前後が空になっています）", "構文エラー");
      const arrow = piece.indexOf("←");
      let name = piece;
      let init = null;
      if (arrow >= 0) {
        name = piece.slice(0, arrow).trim();
        init = parseTextExpr(piece.slice(arrow + 1), lineNo);
      }
      if (!new RegExp(`^(${IDENT})$`).test(name)) fail(lineNo, `変数名が解釈できません：${piece}`, "構文エラー");
      items.push({ name, init });
    }
    return { k: "decl", type, items, global, line: lineNo };
  }

  parseBlock(terminators, opts) {
    const stmts = [];
    for (;;) {
      const line = this.peekLine();
      if (!line) break;
      const head = headKeyword(line.text);
      if (head && terminators.includes(head)) break;
      if (opts.stopAtDecl && (line.text.startsWith("○") || GLOBAL_RE.test(line.text))) break;
      stmts.push(this.parseStatement(opts));
    }
    return stmts;
  }

  expectEnd(keyword, startLine, startName) {
    const line = this.peekLine();
    if (!line || headKeyword(line.text) !== keyword) {
      fail(startLine, `${startName} に対応する ${keyword} が必要です`, "構文エラー");
    }
    this.takeLine();
    return line;
  }

  parseStatement(opts) {
    const line = this.takeLine();
    const text = line.text;
    const head = headKeyword(text);
    if (head && BLOCK_ENDS.includes(head)) fail(line.no, `${head} に対応する開始行がありません`, "構文エラー");
    if (text.startsWith("○")) fail(line.no, "手続き・関数の宣言は、他の手続き・関数の中には書けません", "構文エラー");
    if (GLOBAL_RE.test(text)) fail(line.no, "大域変数の宣言は、手続き・関数の外に書きます", "構文エラー");

    if (head === "if") return this.parseIf(line, opts);
    if (head === "while") return this.parseWhile(line, opts);
    if (head === "do") return this.parseDo(line, opts);
    if (head === "for") return this.parseFor(line, opts);
    if (head === "return") {
      if (!opts.inFunc) fail(line.no, "return は手続き・関数の中で使います", "構文エラー");
      const rest = text.slice("return".length).trim();
      return { k: "return", expr: rest ? parseTextExpr(rest, line.no) : null, line: line.no };
    }

    // 「型名:」だけで終わる宣言は、式の解釈に落とさず宣言の途中終了として名指す。
    if (new RegExp(`^(${IDENT})\\s*:\\s*$`).test(text)) {
      fail(line.no, `宣言が途中で終わっています。「型名: 変数名」の形で変数名まで書きます：${text}`, "構文エラー");
    }

    const decl = this.tryParseDecl(text, line.no);
    if (decl) { decl.line = line.no; return decl; }

    // 日本語の文（実例で確認した閉じた集合のみ受理する）。
    let match = /^(.+?)の末尾\s*に\s*(.+?)\s*を追加する$/.exec(text);
    if (match) {
      let valueText = match[2];
      if (valueText.endsWith("の値")) valueText = valueText.slice(0, -2);
      return { k: "append", arrayText: match[1], array: parseTextExpr(match[1], line.no), value: parseTextExpr(valueText, line.no), line: line.no };
    }
    match = /^(.+?)の値を\s*(\d+)\s*(増やす|減らす)$/.exec(text);
    if (match) {
      if (match[3] === "減らす") fail(line.no, "「の値を〜減らす」は、確認した試験問題の範囲では見つかりませんでした。本アプリでは未対応です");
      return { k: "incr", targetText: match[1], target: parseTarget(match[1], line.no), delta: Number(match[2]), line: line.no };
    }
    match = /^(.+?)の値を\s*(.+?)\s*(増やす|減らす)$/.exec(text);
    if (match) {
      if (match[3] === "減らす") fail(line.no, "「の値を〜減らす」は、確認した試験問題の範囲では見つかりませんでした。本アプリでは未対応です");
      fail(line.no, `「の値を〜増やす」の増分は数値で書きます（「${match[2]}」のような式は、確認した試験問題の範囲に無いため未対応です）`);
    }
    // 対応形式は2値だけなので、最上位の区切り「の値と」がちょうど1つでない
    // 出力文（3値以上など）は、式の解釈に進めず出力文自体を名指して止める。
    // 2値用正規表現の非欲張りマッチが第2式へ後続の値を吸収し、属性句の
    // 文法を原因としてしまう誤帰属を防ぐ（R31-N3）。分割も正規表現では
    // なく最上位の区切り位置で行い、文字列リテラル内の同文言に引きずられない。
    if (/をこの順にコンマ区切りで出力する$/.test(text)) {
      const suffix = "の値をこの順にコンマ区切りで出力する";
      const seps = topLevelPhraseIndexes(text, "の値と");
      if (seps.length === 1 && text.endsWith(suffix)) {
        const expr1 = text.slice(0, seps[0]);
        const expr2 = text.slice(seps[0] + "の値と".length, text.length - suffix.length);
        if (expr1.trim() && expr2.trim()) {
          return { k: "output", exprs: [parseTextExpr(expr1, line.no), parseTextExpr(expr2, line.no)], line: line.no };
        }
      }
      fail(line.no, `「${text}」という形の出力文には対応していません。対応している出力形式は「式の値と式の値をこの順にコンマ区切りで出力する」です`);
    }
    // 対応していない出力文の形は、属性句の文法ではなく出力文自体を真因として名指す
    // （R30-PAR-9）。対応形式を案内して止める。
    if (/出力する$/.test(text)) {
      fail(line.no, `「${text}」という形の出力文には対応していません。対応している出力形式は「式の値と式の値をこの順にコンマ区切りで出力する」です`);
    }
    match = /^(?:(.+?)の行から始まる)?繰返し処理を終了する$/.exec(text);
    if (match) {
      const label = match[1] ? match[1].trim() : null;
      if (opts.loopLabels.length === 0) fail(line.no, "「繰返し処理を終了する」は繰返しの中で使います", "構文エラー");
      if (label !== null && !opts.loopLabels.includes(label)) fail(line.no, `ラベル「${label}」の繰返しが見つかりません`, "構文エラー");
      return { k: "break", label, line: line.no };
    }

    // 代入：最上位の ← で左右に分ける。
    const arrow = findTopLevelArrow(text);
    if (arrow >= 0) {
      return { k: "assign", targetText: text.slice(0, arrow).trim(), target: parseTarget(text.slice(0, arrow), line.no), expr: parseTextExpr(text.slice(arrow + 1), line.no), line: line.no };
    }

    // 式文は手続き・関数の呼出しだけを認める。
    const expr = parseTextExpr(text, line.no);
    if (expr.k === "call") return { k: "callstmt", expr, line: line.no };
    fail(line.no, `文として解釈できません：${text}`, "構文エラー");
  }

  parseIf(line, opts) {
    const { inner, rest } = extractParen(line.text, line.no);
    if (rest) fail(line.no, `if の条件の後ろに解釈できない部分があります：${line.text}`, "構文エラー");
    const branches = [{ condText: inner, cond: parseTextExpr(inner, line.no), body: null, line: line.no, kind: "if" }];
    branches[0].body = this.parseBlock(["elseif", "else", "endif"], opts);
    let elseBody = null;
    for (;;) {
      const next = this.peekLine();
      if (!next) fail(line.no, "if に対応する endif が必要です", "構文エラー");
      const head = headKeyword(next.text);
      if (head === "elseif") {
        this.takeLine();
        const part = extractParen(next.text, next.no);
        if (part.rest) fail(next.no, `elseif の条件の後ろに解釈できない部分があります：${next.text}`, "構文エラー");
        const branch = { condText: part.inner, cond: parseTextExpr(part.inner, next.no), body: null, line: next.no, kind: "elseif" };
        branch.body = this.parseBlock(["elseif", "else", "endif"], opts);
        branches.push(branch);
        continue;
      }
      if (head === "else") {
        this.takeLine();
        elseBody = this.parseBlock(["endif"], opts);
      }
      break;
    }
    this.expectEnd("endif", line.no, "if");
    return { k: "if", branches, elseBody, line: line.no };
  }

  parseWhile(line, opts) {
    const { inner, rest } = extractParen(line.text, line.no);
    if (rest) fail(line.no, `while の条件の後ろに解釈できない部分があります：${line.text}`, "構文エラー");
    const label = lineLabel(line);
    const body = this.parseBlock(["endwhile"], { ...opts, loopLabels: [...opts.loopLabels, label] });
    this.expectEnd("endwhile", line.no, "while");
    return { k: "while", condText: inner, cond: parseTextExpr(inner, line.no), body, label, line: line.no };
  }

  parseDo(line, opts) {
    if (line.text !== "do") fail(line.no, `do は単独で書きます：${line.text}`, "構文エラー");
    const label = lineLabel(line);
    const body = this.parseBlock(["while"], { ...opts, loopLabels: [...opts.loopLabels, label] });
    const closer = this.peekLine();
    if (!closer || headKeyword(closer.text) !== "while") fail(line.no, "do に対応する while (条件式) が必要です", "構文エラー");
    this.takeLine();
    const { inner, rest } = extractParen(closer.text, closer.no);
    if (rest) fail(closer.no, `while の条件の後ろに解釈できない部分があります：${closer.text}`, "構文エラー");
    return { k: "do", condText: inner, cond: parseTextExpr(inner, closer.no), condLine: closer.no, body, label, line: line.no };
  }

  parseFor(line, opts) {
    const { inner, rest } = extractParen(line.text, line.no);
    if (rest) fail(line.no, `for の制御記述の後ろに解釈できない部分があります：${line.text}`, "構文エラー");
    const control = parseForControl(inner, line.no);
    const label = lineLabel(line);
    const body = this.parseBlock(["endfor"], { ...opts, loopLabels: [...opts.loopLabels, label] });
    this.expectEnd("endfor", line.no, "for");
    return { k: "for", control, body, label, line: line.no };
  }
}

// for の制御記述：実例で確認した3形式だけを受理する（C7）。
function parseForControl(text, line) {
  if (!text.trim()) fail(line, "for の制御記述が書かれていません（式が途中で終わっています）。対応形式は「変数 を 初期値 から 終値 まで 増分 ずつ増やす」「変数に配列の要素を順に代入する」です", "構文エラー");
  let match = /^(.+?)に(.+?)の要素を順に代入する$/.exec(text);
  if (match) {
    const varName = match[1].trim();
    if (!new RegExp(`^(${IDENT})$`).test(varName)) fail(line, `for の制御変数名が解釈できません：${text}`, "構文エラー");
    return { form: "each", var: varName, arrayText: match[2], array: parseTextExpr(match[2], line) };
  }
  match = /^(.+?)を(.+?)から始めて(.+?)を超えない範囲で(.+?)ずつ増やす$/.exec(text);
  if (match) {
    return { form: "count", var: match[1].trim(), from: parseTextExpr(match[2], line), to: parseTextExpr(match[3], line), step: parseTextExpr(match[4], line) };
  }
  match = /^(.+?)を(.+?)から(.+?)まで(.+?)ずつ増やす$/.exec(text);
  if (match) {
    return { form: "count", var: match[1].trim(), from: parseTextExpr(match[2], line), to: parseTextExpr(match[3], line), step: parseTextExpr(match[4], line) };
  }
  if (/ずつ減らす/.test(text)) fail(line, "「ずつ減らす」は、確認した試験問題の範囲では見つかりませんでした。本アプリでは未対応です");
  fail(line, `for の制御記述が解釈できません。対応形式は「変数 を 初期値 から 終値 まで 増分 ずつ増やす」「変数に配列の要素を順に代入する」です：${text}`);
}

// 文字列リテラルの中と括弧の内側を除いた「最上位」に現れる句の位置の一覧。
function topLevelPhraseIndexes(text, phrase) {
  const indexes = [];
  let depth = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) { if (ch === "\"") inString = false; continue; }
    if (ch === "\"") { inString = true; continue; }
    if ("({[".includes(ch)) { depth++; continue; }
    if (")}]".includes(ch)) { depth--; continue; }
    if (depth === 0 && text.startsWith(phrase, i)) { indexes.push(i); i += phrase.length - 1; }
  }
  return indexes;
}

// 文字列・括弧の外にある最初の ← の位置。無ければ -1。
function findTopLevelArrow(text) {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) { if (ch === "\"") inString = false; continue; }
    if (ch === "\"") { inString = true; continue; }
    if ("({[".includes(ch)) depth++;
    else if (")}]".includes(ch)) depth--;
    else if (ch === "←" && depth === 0) return i;
  }
  return -1;
}

export function parseProgram(code) {
  return new Parser(code).parseProgram();
}

// ---------------------------------------------------------------------------
// 実行（状態リスト方式のパス探索）
// ---------------------------------------------------------------------------

function newState() {
  return { scopes: [new Map()], trace: [], outputs: [], steps: 0, callDepth: 0, error: null, limited: false, breakSignal: null, returnSignal: null };
}

function cloneState(state) {
  const scopes = state.scopes.map((scope) => {
    const copy = new Map();
    for (const [name, cell] of scope) copy.set(name, { v: cloneVal(cell.v), t: cell.t, real: cell.real });
    return copy;
  });
  return {
    scopes,
    trace: [...state.trace],
    outputs: [...state.outputs],
    steps: state.steps,
    callDepth: state.callDepth,
    error: state.error,
    limited: state.limited,
    breakSignal: state.breakSignal,
    returnSignal: state.returnSignal ? { v: cloneVal(state.returnSignal.v), line: state.returnSignal.line, real: state.returnSignal.real } : null,
  };
}

function noteStep(state, line, text, refs = []) {
  state.trace.push({ line, text, kind: "step", refs });
  state.steps++;
}

function noteLimit(state, line, ctx, reason) {
  ctx.truncated = true;
  ctx.reasons.add(reason);
  if (!state.limited) {
    state.limited = true;
    state.trace.push({ line, text: `上限（${reason}）に達したため、このパスの説明を打ち切ります`, kind: "limit", refs: [] });
  }
}

function errState(state, line, message, category = "実行時エラー") {
  if (!state.error) {
    state.error = { line, message, category };
    state.trace.push({ line, text: `${category}：${message}`, kind: "error", refs: [] });
  }
  return state;
}

function findCell(state, name) {
  for (let i = state.scopes.length - 1; i >= 0; i--) {
    if (state.scopes[i].has(name)) return state.scopes[i].get(name);
  }
  return null;
}

function currentScope(state) { return state.scopes[state.scopes.length - 1]; }

function capPaths(states, ctx) {
  if (states.length > LIMITS.paths) {
    ctx.truncated = true;
    ctx.reasons.add("分岐パスの上限（2,000パス）");
    return states.slice(0, LIMITS.paths);
  }
  return states;
}

// ---------------------------------------------------------------------------
// 式の評価。戻り値は [{ v, s }]（関数呼出しで分岐しうる）。
// ハードなエラーは PracticeError を投げ、文の実行側でパスエラーに変換する。
// ---------------------------------------------------------------------------

// 評価結果は { v, s, real }。real は「実数として扱うべき数か」の印で、
// リテラルの小数点表記と、実数型として宣言された変数・戻り値から伝わる（÷ の裁定 C1 に使う）。
function evalChain(node, state, ctx, fn) {
  const first = evalExpr(node, state, ctx);
  const out = [];
  for (const result of first) {
    if (result.s.error) { out.push(result); continue; }
    out.push(...fn(result.v, result.s, result.real));
  }
  return out;
}

function evalExpr(node, state, ctx) {
  switch (node.k) {
    case "num": return [{ v: node.v, s: state, real: !!node.real }];
    case "str": case "bool": return [{ v: node.v, s: state, real: false }];
    case "undef": return [{ v: UNDEF, s: state, real: false }];
    case "name": {
      const cell = findCell(state, node.name);
      if (!cell) fail(node.line, `変数 ${node.name} は宣言も代入もされていません`, "実行時エラー");
      const real = typeof cell.real === "boolean"
        ? cell.real
        : !!(cell.t && cell.t.base === "実数型" && cell.t.depth === 0 && !cell.t.twoDim);
      return [{ v: cell.v, s: state, real }];
    }
    case "un": return evalChain(node.v, state, ctx, (v, s, real) => {
      const applied = applyUnary(node, v, real);
      return [{ v: applied.v, s, real: applied.real }];
    });
    case "bin": return evalBinary(node, state, ctx);
    case "isundef": return evalChain(node.v, state, ctx, (v, s) => {
      if (isUnknown(v)) return [{ v: makeUnknown("未定義かどうか", { op: "未定義である", a: v }), s, real: false }];
      return [{ v: node.neg ? !isUndef(v) : isUndef(v), s, real: false }];
    });
    case "index": return evalChain(node.i, state, ctx, (iv, s1) => {
      // 添字式を先に評価し、配列は分岐後の状態で取り直す（代入先の解決と同じ理由。
      // 読み取り自体は値が変わらないが、要素が配列のとき、その同一性が後の
      // 書き込みに効くため、世代を揃える）。
      const typeRealIn = (s) => !!(node.obj.k === "name" && (() => { const c = findCell(s, node.obj.name); return c && c.t && c.t.base === "実数型"; })());
      if (node.j) return evalChain(node.j, s1, ctx, (jv, s2) => evalChain(node.obj, s2, ctx, (obj, s3) => {
        const v = readIndex(obj, iv, jv, node);
        const inner = Array.isArray(obj) && Number.isInteger(iv) ? obj[iv - 1] : null;
        const real = typeRealIn(s3) || (Array.isArray(inner) && Number.isInteger(jv) ? elemReal(inner, jv - 1) : false);
        return [{ v, s: s3, real }];
      }));
      return evalChain(node.obj, s1, ctx, (obj, s2) => {
        const v = readIndex(obj, iv, null, node);
        const real = typeRealIn(s2) || (Array.isArray(obj) && Number.isInteger(iv) ? elemReal(obj, iv - 1) : false);
        return [{ v, s: s2, real }];
      });
    });
    case "member": return evalChain(node.obj, state, ctx, (obj, s) => [{ v: readMember(obj, node), s, real: !!(isObj(obj) && obj.fieldReals && obj.fieldReals.get(node.name)) }]);
    case "prop": return evalChain(node.obj, state, ctx, (obj, s) => {
      // 「要素の和」の実数性は値駆動（C1）：宣言型が実数型であるか、
      // 合計した要素のいずれかが実数であれば実数として扱う（R31-N2）。
      const sumReal = node.prop === "要素の和" && (declaredObjReal(node, s) || anyRealElems(obj));
      return [{ v: readProp(obj, node), s, real: sumReal }];
    });
    case "rowsum": return evalChain(node.obj, state, ctx, (obj, s1) => evalChain(node.i, s1, ctx, (iv, s2) => {
      const v = readRowSum(obj, iv, node);
      const row = Array.isArray(obj) && Number.isInteger(iv) ? obj[iv - 1] : null;
      const real = declaredObjReal(node, s2) || anyRealElems(row);
      return [{ v, s: s2, real }];
    }));
    case "colsum": return evalChain(node.obj, state, ctx, (obj, s1) => evalChain(node.i, s1, ctx, (iv, s2) => {
      const v = readColSum(obj, iv, node);
      let real = declaredObjReal(node, s2);
      if (!real && Array.isArray(obj) && Number.isInteger(iv)) {
        real = obj.some((row) => Array.isArray(row) && iv >= 1 && iv <= row.length
          && (elemReal(row, iv - 1) || (typeof row[iv - 1] === "number" && !Number.isInteger(row[iv - 1])) || anyRealElems(row[iv - 1])));
      }
      return [{ v, s: s2, real }];
    }));
    case "charat": return evalChain(node.obj, state, ctx, (obj, s1) => evalChain(node.i, s1, ctx, (iv, s2) => [{ v: readCharAt(obj, iv, node), s: s2, real: false }]));
    case "quot": return evalChain(node.v, state, ctx, (v, s) => {
      if (isUnknown(v)) return [{ v: makeUnknown("商", { op: "の商", a: v }), s, real: false }];
      if (typeof v !== "number") fail(node.line, `「の商」は数値に使います（対象は ${valueTypeName(v)}）`, "実行時エラー");
      return [{ v: Math.trunc(v), s, real: false }];
    });
    case "array": {
      let results = [{ v: [], s: state, real: false, reals: [] }];
      for (const elem of node.elems) {
        const next = [];
        for (const result of results) {
          if (result.s.error) { next.push(result); continue; }
          for (const item of evalExpr(elem, result.s, ctx)) {
            if (item.s.error) { next.push({ ...item, reals: result.reals }); continue; }
            next.push({ v: [...result.v, item.v], s: item.s, real: false, reals: [...(result.reals || []), !!item.real] });
          }
        }
        results = next;
      }
      return results.map((result) => {
        if (!result.s.error && Array.isArray(result.v) && result.reals) attachReals(result.v, result.reals);
        const { reals, ...rest } = result;
        void reals;
        return rest;
      });
    }
    case "fill": return evalChain(node.n, state, ctx, (n, s1) => evalChain(node.v, s1, ctx, (v, s2, vReal) => {
      if (isUnknown(n)) return [{ v: makeUnknown("要素数が実行時に決まる配列"), s: s2, real: false }];
      checkFillCount(n, node);
      checkFillTotal(n * leafSize(v), node, `入れ子を含む合計`);
      const array = Array.from({ length: n }, () => cloneVal(v));
      attachReals(array, Array.from({ length: n }, () => !!vReal));
      return [{ v: array, s: s2, real: false }];
    }));
    case "fill2": return evalChain(node.rows, state, ctx, (r, s1) => evalChain(node.cols, s1, ctx, (c, s2) => evalChain(node.v, s2, ctx, (v, s3, vReal) => {
      if (isUnknown(r) || isUnknown(c)) return [{ v: makeUnknown("行数・列数が実行時に決まる配列"), s: s3, real: false }];
      checkFillCount(r, node);
      checkFillCount(c, node);
      if (r * c > MAX_FILL_TOTAL) fail(node.line, `要素数の指定が大きすぎます（${r}行×${c}列＝${r * c}個）`, "実行時エラー");
      checkFillTotal(r * c * leafSize(v), node, `入れ子を含む合計`);
      const array = Array.from({ length: r }, () => {
        const row = Array.from({ length: c }, () => cloneVal(v));
        attachReals(row, Array.from({ length: c }, () => !!vReal));
        return row;
      });
      return [{ v: array, s: s3, real: false }];
    })));
    case "call": return evalCall(node, state, ctx);
    default: fail(node.line, "式が解釈できません", "構文エラー");
  }
}

const MAX_FILL_TOTAL = 10000;

function checkFillCount(n, node) {
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0) fail(node.line, `要素数の指定は0以上の整数で書きます（実際：${fmtVal(n)}）`, "実行時エラー");
  if (n > MAX_FILL_TOTAL) fail(node.line, `要素数の指定が大きすぎます（${n}個）`, "実行時エラー");
}

// 入れ子生成でも上限を葉の総数で数えるための、値1個が占める葉の数（R30 D3）。
// 配列は要素の葉の数の合計、空配列とスカラー・オブジェクト等は1と数える。
function leafSize(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return 1;
    return value.reduce((sum, elem) => sum + leafSize(elem), 0);
  }
  return 1;
}

function checkFillTotal(total, node, label) {
  if (total > MAX_FILL_TOTAL) fail(node.line, `要素数の指定が大きすぎます（${label} ${total}個）`, "実行時エラー");
}

function applyUnary(node, v, real) {
  if (isUnknown(v)) return { v: makeUnknown(node.op === "not" ? "否定の結果" : "符号を付けた値", { op: node.op, a: v }), real: false };
  if (isUndef(v)) fail(node.line, "未定義の値には演算できません。先に値を代入してください", "実行時エラー");
  if (node.op === "not") {
    if (typeof v !== "boolean") fail(node.line, `not は論理型に使います（対象は ${valueTypeName(v)}）`, "実行時エラー");
    return { v: !v, real: false };
  }
  if (typeof v !== "number") fail(node.line, `${node.op} は数値に使います（対象は ${valueTypeName(v)}）`, "実行時エラー");
  return { v: node.op === "-" ? -v : v, real: !!real };
}

function evalBinary(node, state, ctx) {
  // and / or は短絡評価する（記述形式に評価順の規定は無いため裁定として採用）。
  if (node.op === "and" || node.op === "or") {
    return evalChain(node.l, state, ctx, (lv, s1) => {
      if (!isUnknown(lv) && typeof lv !== "boolean") fail(node.line, `${node.op} の左辺は論理型で書きます（実際は ${valueTypeName(lv)}）`, "実行時エラー");
      if (!isUnknown(lv) && ((node.op === "and" && lv === false) || (node.op === "or" && lv === true))) {
        return [{ v: lv, s: s1, real: false }];
      }
      return evalChain(node.r, s1, ctx, (rv, s2) => {
        if (!isUnknown(rv) && typeof rv !== "boolean") fail(node.line, `${node.op} の右辺は論理型で書きます（実際は ${valueTypeName(rv)}）`, "実行時エラー");
        if (isUnknown(lv) || isUnknown(rv)) return [{ v: makeUnknown(node.op === "and" ? "論理積の結果" : "論理和の結果", { op: node.op, a: lv, b: rv }), s: s2, real: false }];
        return [{ v: node.op === "and" ? lv && rv : lv || rv, s: s2, real: false }];
      });
    });
  }
  return evalChain(node.l, state, ctx, (lv, s1, lvReal) => evalChain(node.r, s1, ctx, (rv, s2, rvReal) => {
    const applied = applyBinary(node, lv, rv, lvReal, rvReal, ctx);
    return [{ v: applied.v, s: s2, real: applied.real }];
  }));
}

// ÷ は値駆動：整数÷整数は商（0方向への切捨て）、実数を含むときは実数除算（C1）。
// 「実数を含む」は、実数リテラル（小数点表記）か実数型で宣言された値が相手にいることで判定する。
// ただし問題文・注釈で「実数として計算する」と明示定義されたプログラムでは、
// 注釈の指定が優先し、そのプログラムの ÷ は全て実数除算になる（C1 改訂版、R30 D1）。
// mod は a - trunc(a/b)*b（被除数符号）。文字列の + は連結として採用する（C2）。
function checkedNum(node, value) {
  if (typeof value === "number" && Number.isNaN(value)) {
    fail(node.line, "この演算の結果は定義されません（∞ － ∞、∞ ÷ ∞、∞ × 0 のように、無限大どうしの組合せで値が定まらないためです）", "実行時エラー");
  }
  return value;
}

function applyBinary(node, lv, rv, lvReal, rvReal, ctx = null) {
  const op = node.op;
  const anyReal = !!(lvReal || rvReal);
  if (isUnknown(lv) || isUnknown(rv)) {
    return { v: makeUnknown("演算の結果", { op, a: lv, b: rv }), real: false };
  }
  if (op === "=" || op === "≠") {
    let equal;
    if (isUndef(lv) || isUndef(rv)) equal = isUndef(lv) && isUndef(rv);
    else if (Array.isArray(lv) || Array.isArray(rv)) fail(node.line, "配列どうしは = や ≠ で比較できません。要素ごとに比較してください", "実行時エラー");
    else if (isObj(lv) || isObj(rv)) equal = lv === rv;
    else if (typeof lv !== typeof rv) fail(node.line, `型の異なる値は比較できません（${valueTypeName(lv)} と ${valueTypeName(rv)}）`, "実行時エラー");
    else equal = lv === rv;
    return { v: op === "=" ? equal : !equal, real: false };
  }
  if (isUndef(lv) || isUndef(rv)) fail(node.line, "未定義の値では演算できません。先に値を代入してください", "実行時エラー");
  if (op === "+") {
    if (typeof lv === "string" || typeof rv === "string") {
      // C2 の範囲は文字列どうし・文字との連結まで。数値等との混在は裁定範囲外として止める。
      if (typeof lv !== "string" || typeof rv !== "string") {
        const other = typeof lv !== "string" ? lv : rv;
        fail(node.line, `+ で文字列とつなげられるのは文字列・文字だけです（相手は ${valueTypeName(other)}）`, "実行時エラー");
      }
      return { v: lv + rv, real: false };
    }
    if (typeof lv === "number" && typeof rv === "number") return { v: checkedNum(node, lv + rv), real: anyReal };
    fail(node.line, `+ は数値の加算か文字列の連結に使います（${valueTypeName(lv)} と ${valueTypeName(rv)}）`, "実行時エラー");
  }
  if (typeof lv !== "number" || typeof rv !== "number") {
    fail(node.line, `演算子 ${op} は数値に使います（${valueTypeName(lv)} と ${valueTypeName(rv)}）`, "実行時エラー");
  }
  switch (op) {
    case "-": return { v: checkedNum(node, lv - rv), real: anyReal };
    case "×": return { v: checkedNum(node, lv * rv), real: anyReal };
    case "÷": {
      if (rv === 0) fail(node.line, "0で割ることはできません", "実行時エラー");
      if (ctx && ctx.program && ctx.program.realDiv) return { v: checkedNum(node, lv / rv), real: true };
      if (!anyReal) return { v: Math.trunc(lv / rv), real: false };
      return { v: checkedNum(node, lv / rv), real: true };
    }
    case "mod": {
      if (rv === 0) fail(node.line, "0で割ることはできません（mod の余りは求められません）", "実行時エラー");
      return { v: checkedNum(node, lv - Math.trunc(lv / rv) * rv), real: anyReal };
    }
    case "<": return { v: lv < rv, real: false };
    case "≦": return { v: lv <= rv, real: false };
    case ">": return { v: lv > rv, real: false };
    case "≧": return { v: lv >= rv, real: false };
    default: fail(node.line, `演算子 ${op} は解釈できません`, "構文エラー");
  }
}

function checkIndexValue(iv, node) {
  if (isUnknown(iv)) return false;
  if (typeof iv !== "number" || !Number.isInteger(iv)) fail(node.line, `要素番号は整数で指定します（実際：${fmtVal(iv)}）`, "実行時エラー");
  return true;
}

// 添字は1始まり（C3）。a[i, j] と a[i][j] の両形式を値の形で解釈する（C4）。
function readIndex(obj, iv, jv, node) {
  if (isUnknown(obj)) return makeUnknown("配列の要素");
  if (isUndef(obj)) fail(node.line, "未定義の値からは要素を取り出せません", "実行時エラー");
  if (typeof obj === "string") fail(node.line, "文字列の文字は「文字列 の i文字目の文字」の形で取り出します", "実行時エラー");
  if (!Array.isArray(obj)) fail(node.line, `添字で要素を取り出せるのは配列です（対象は ${valueTypeName(obj)}）`, "実行時エラー");
  if (!checkIndexValue(iv, node)) return makeUnknown("配列の要素");
  if (iv < 1 || iv > obj.length) fail(node.line, `要素番号 ${iv} は範囲外です（要素数は ${obj.length}、有効範囲は 1〜${obj.length}）`, "実行時エラー");
  const elem = obj[iv - 1];
  if (jv === null || jv === undefined) return elem;
  if (!Array.isArray(elem)) fail(node.line, `a[行, 列] の形は二次元配列で使います（${iv} 行目は配列ではありません）`, "実行時エラー");
  if (!checkIndexValue(jv, node)) return makeUnknown("配列の要素");
  if (jv < 1 || jv > elem.length) fail(node.line, `要素番号 ${jv} は範囲外です（${iv} 行目の要素数は ${elem.length}、有効範囲は 1〜${elem.length}）`, "実行時エラー");
  return elem[jv - 1];
}

function readMember(obj, node) {
  if (isUnknown(obj)) return makeUnknown(`メンバ ${node.name} の値`);
  if (isUndef(obj)) fail(node.line, `未定義の値のメンバ ${node.name} は参照できません`, "実行時エラー");
  if (Array.isArray(obj)) fail(node.line, "配列の要素数などは「配列の要素数」の形で書きます。「.」はクラスのメンバに使います", "実行時エラー");
  if (!isObj(obj)) fail(node.line, `「.」でメンバを参照できるのはクラスのオブジェクトです（対象は ${valueTypeName(obj)}）`, "実行時エラー");
  return obj.fields.has(node.name) ? obj.fields.get(node.name) : UNDEF;
}

function readProp(obj, node) {
  if (isUnknown(obj)) return makeUnknown(node.prop);
  if (isUndef(obj)) fail(node.line, `未定義の値の${node.prop}は求められません`, "実行時エラー");
  if (node.prop === "文字数") {
    if (typeof obj !== "string") fail(node.line, `文字数は文字列に使います（対象は ${valueTypeName(obj)}）`, "実行時エラー");
    return [...obj].length;
  }
  if (!Array.isArray(obj)) fail(node.line, `${node.prop}は配列に使います（対象は ${valueTypeName(obj)}）`, "実行時エラー");
  if (node.prop === "要素数" || node.prop === "行数") return obj.length;
  if (node.prop === "列数") {
    if (obj.length === 0) return 0;
    if (!Array.isArray(obj[0])) fail(node.line, "列数は二次元配列で使います（1行目が配列ではありません）", "実行時エラー");
    return obj[0].length;
  }
  if (node.prop === "要素の和") {
    const total = sumValue(obj, node);
    return total === UNKNOWN_SUM ? makeUnknown("要素の和") : total;
  }
  fail(node.line, `${node.prop} は解釈できません`, "構文エラー");
}

const UNKNOWN_SUM = Symbol("unknown-sum");

// 要素の合計。配列は入れ子も含めて全要素を合計する（R7問5：二次元配列の総和）。
function sumValue(value, node) {
  if (isUnknown(value)) return UNKNOWN_SUM;
  if (Array.isArray(value)) {
    let total = 0;
    for (const elem of value) {
      const part = sumValue(elem, node);
      if (part === UNKNOWN_SUM) return UNKNOWN_SUM;
      total += part;
      if (Number.isNaN(total)) fail(node.line, "要素の和は定義されません（∞ と -∞ のように、無限大どうしの組合せで値が定まらないためです）", "実行時エラー");
    }
    return total;
  }
  if (isUndef(value)) fail(node.line, "未定義の要素は合計できません", "実行時エラー");
  if (typeof value !== "number") fail(node.line, `要素の和は数値の配列に使います（${valueTypeName(value)} の要素があります）`, "実行時エラー");
  return value;
}

function readRowSum(obj, iv, node) {
  if (isUnknown(obj) || isUnknown(iv)) return makeUnknown("行の要素の和");
  if (!Array.isArray(obj)) fail(node.line, `「行番号〜の要素の和」は二次元配列に使います（対象は ${valueTypeName(obj)}）`, "実行時エラー");
  if (!checkIndexValue(iv, node)) return makeUnknown("行の要素の和");
  if (iv < 1 || iv > obj.length) fail(node.line, `行番号 ${iv} は範囲外です（行数は ${obj.length}、有効範囲は 1〜${obj.length}）`, "実行時エラー");
  const row = obj[iv - 1];
  if (!Array.isArray(row)) fail(node.line, `「行番号〜の要素の和」は二次元配列に使います（${iv} 行目は配列ではありません）`, "実行時エラー");
  const total = sumValue(row, node);
  return total === UNKNOWN_SUM ? makeUnknown("行の要素の和") : total;
}

function readColSum(obj, iv, node) {
  if (isUnknown(obj) || isUnknown(iv)) return makeUnknown("列の要素の和");
  if (!Array.isArray(obj)) fail(node.line, `「列番号〜の要素の和」は二次元配列に使います（対象は ${valueTypeName(obj)}）`, "実行時エラー");
  if (!checkIndexValue(iv, node)) return makeUnknown("列の要素の和");
  let total = 0;
  for (let r = 0; r < obj.length; r++) {
    const row = obj[r];
    if (!Array.isArray(row)) fail(node.line, `「列番号〜の要素の和」は二次元配列に使います（${r + 1} 行目は配列ではありません）`, "実行時エラー");
    if (iv < 1 || iv > row.length) fail(node.line, `列番号 ${iv} は範囲外です（${r + 1} 行目の要素数は ${row.length}、有効範囲は 1〜${row.length}）`, "実行時エラー");
    const part = sumValue(row[iv - 1], node);
    if (part === UNKNOWN_SUM) return makeUnknown("列の要素の和");
    total += part;
  }
  return total;
}

function readCharAt(obj, iv, node) {
  if (isUnknown(obj) || isUnknown(iv)) return makeUnknown("文字列の文字");
  if (typeof obj !== "string") fail(node.line, `「文字目の文字」は文字列に使います（対象は ${valueTypeName(obj)}）`, "実行時エラー");
  if (!checkIndexValue(iv, node)) return makeUnknown("文字列の文字");
  const chars = [...obj];
  if (iv < 1 || iv > chars.length) fail(node.line, `${iv}文字目は範囲外です（文字数は ${chars.length}、有効範囲は 1〜${chars.length}）`, "実行時エラー");
  return chars[iv - 1];
}

// ---------------------------------------------------------------------------
// 呼出し
// ---------------------------------------------------------------------------

function evalCall(node, state, ctx) {
  const target = node.target;
  // 引数を左から評価する（分岐を伝播させる）。
  let argResults = [{ v: [], s: state }];
  for (const arg of node.args) {
    const next = [];
    for (const result of argResults) {
      if (result.s.error) { next.push(result); continue; }
      for (const item of evalExpr(arg, result.s, ctx)) {
        if (item.s.error) { next.push({ v: result.v, s: item.s }); continue; }
        next.push({ v: [...result.v, item.v], s: item.s });
      }
    }
    argResults = next;
  }
  const out = [];
  for (const result of argResults) {
    if (result.s.error) { out.push({ v: UNDEF, s: result.s }); continue; }
    const argVals = result.v;
    const s = result.s;
    if (target.k === "member") {
      for (const objResult of evalExpr(target.obj, s, ctx)) {
        if (objResult.s.error) { out.push({ v: UNDEF, s: objResult.s }); continue; }
        const obj = objResult.v;
        if (isUnknown(obj)) { out.push({ v: makeUnknown(`メソッド ${target.name} の戻り値`), s: objResult.s }); continue; }
        if (isUndef(obj)) fail(node.line, `未定義の値のメソッド ${target.name} は呼び出せません`, "実行時エラー");
        // メソッドの動作は問題文で定義されるため、戻り値は未確定として扱う。
        noteStep(objResult.s, node.line, `メソッド ${target.name} の動作は問題文で定義されるため、戻り値は実行時に決まるとして扱います`, ["メンバアクセス"]);
        out.push({ v: makeUnknown(`メソッド ${target.name} の戻り値`), s: objResult.s });
      }
      continue;
    }
    const name = target.name;
    const fn = ctx.program.funcs.get(name);
    if (fn) {
      // 戻り値型の宣言がある場合は型が実数性を決める。型宣言のない関数では
      // return した値そのものの実数性を引き継ぐ（独立検証 第2回 N1）。
      out.push(...execFunction(fn, argVals, s, ctx, node.line).map((r) => ({ ...r, real: fn.retType ? declaredReal(fn.retType) : !!r.real })));
      continue;
    }
    if (ctx.program.classNames.has(name)) {
      // コンストラクタ呼出し：インスタンスは生成するが、メンバの初期化は
      // 問題文で定義されるため再現せず、メンバは未定義として扱う。
      noteStep(s, node.line, `${name} のオブジェクトを生成します。メンバの初期値は問題文で定義されるため、ここでは未定義として扱います`, ["クラス型"]);
      out.push({ v: { __class: name, fields: new Map() }, s });
      continue;
    }
    // プログラム中で定義されていない関数は、問題文で定義される前提の言語特性として
    // エラーにせず、戻り値を未確定値にする。
    noteStep(s, node.line, `関数 ${name} はプログラム中で定義されていないため、戻り値は実行時に決まるとして扱います`, ["手続・関数の呼出し"]);
    out.push({ v: makeUnknown(`関数 ${name} の戻り値`), s });
  }
  return out;
}

// 関数・手続の実行。戻り値は [{ v, s, frame }]（frame は自動呼出し時の状態表示用）。
function execFunction(fn, argVals, state, ctx, callLine) {
  if (argVals.length !== fn.params.length) {
    fail(callLine, `${fn.name} の引数の数が合いません（定義は ${fn.params.length} 個、呼出しは ${argVals.length} 個）`, "実行時エラー");
  }
  if (state.callDepth + 1 > LIMITS.depth) {
    noteLimit(state, callLine, ctx, "呼出しの深さの上限");
    return [{ v: UNDEF, s: state, frame: null }];
  }
  const frame = new Map();
  fn.params.forEach((param, i) => frame.set(param.name, { v: argVals[i], t: param.type }));
  noteStep(state, callLine, `${fn.retType ? "関数" : "手続き"} ${fn.name} を呼び出します`, ["手続・関数の呼出し"]);
  state.scopes.push(frame);
  state.callDepth++;
  const results = execBlock(fn.body, [state], ctx);
  const out = [];
  for (const result of results) {
    const usedFrame = result.scopes[result.scopes.length - 1];
    result.scopes.pop();
    result.callDepth--;
    if (result.breakSignal) {
      errState(result, callLine, "繰返し処理の終了が手続き・関数の境界を越えました", "実行時エラー");
      result.breakSignal = null;
    }
    let returned = UNDEF;
    let returnedReal = false;
    let returnLine = fn.line;
    if (result.returnSignal) {
      returned = result.returnSignal.v;
      returnedReal = !!result.returnSignal.real;
      returnLine = result.returnSignal.line;
      result.returnSignal = null;
      if (!result.error && fn.retType) noteStep(result, returnLine, `${fn.name} の戻り値 ${fmtVal(returned)} を返します`, ["return"]);
    } else if (!result.error && fn.retType) {
      noteStep(result, fn.line, `${fn.name} は return されずに終了したため、戻り値は未定義です`, ["return"]);
    }
    out.push({ v: returned, s: result, frame: usedFrame, real: returnedReal });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 代入先の解決
// ---------------------------------------------------------------------------

function targetTextOf(node, state) {
  if (node.k === "name") return node.name;
  if (node.k === "member") return `${targetTextOf(node.obj, state)}.${node.name}`;
  if (node.k === "index") {
    const cell = null;
    void cell;
    return targetTextOf(node.obj, state);
  }
  return "値";
}

// 代入先を { get, set, describe } に解決する。分岐しうるため [{ ref, s }] を返す。
function resolveTarget(node, state, ctx) {
  if (node.k === "name") {
    let cell = findCell(state, node.name);
    if (!cell) {
      // 宣言なし変数への代入は試験の実例に合わせて許す（C9）。
      cell = { v: UNDEF, t: null, real: false };
      currentScope(state).set(node.name, cell);
    }
    return [{ ref: { get: () => cell.v, set: (v, real) => { cell.v = v; if (real !== undefined) cell.real = cell.t ? declaredReal(cell.t) : !!real; }, describe: () => node.name }, s: state }];
  }
  if (node.k === "member") {
    return evalChain(node.obj, state, ctx, (obj, s) => {
      if (isUnknown(obj)) fail(node.line, "実行時に決まる値のメンバには代入できません", "実行時エラー");
      if (!isObj(obj)) fail(node.line, `メンバ ${node.name} へ代入できるのはクラスのオブジェクトです（対象は ${valueTypeName(obj)}）`, "実行時エラー");
      const ref = {
        get: () => (obj.fields.has(node.name) ? obj.fields.get(node.name) : UNDEF),
        set: (v, real) => {
          obj.fields.set(node.name, v);
          if (real !== undefined) {
            if (!obj.fieldReals) obj.fieldReals = new Map();
            obj.fieldReals.set(node.name, !!real);
          }
        },
        describe: () => `${targetTextOf(node.obj, s)}.${node.name}`,
      };
      return [{ ref, s }];
    }).map((r) => (r.ref ? r : { ref: null, s: r.s }));
  }
  if (node.k === "index") {
    // 添字式を先に評価し、配列は最後に（分岐後の状態で）取り直す。配列を先に
    // 捕捉すると、添字式の評価で状態が複製されたときに書き込みが複製元の配列へ
    // 行き、パス間で混線する（独立検証 第4回 新規問題）。
    return evalChain(node.i, state, ctx, (iv, s1) => {
      const withObj = (jv, s2) => evalChain(node.obj, s2, ctx, (obj, s3) => {
        if (isUnknown(obj)) fail(node.line, "実行時に決まる値の要素には代入できません", "実行時エラー");
        if (!Array.isArray(obj)) fail(node.line, `要素へ代入できるのは配列です（対象は ${valueTypeName(obj)}）`, "実行時エラー");
        if (!checkIndexValue(iv, node)) fail(node.line, "要素番号が実行時に決まる要素には代入できません", "実行時エラー");
        if (iv < 1 || iv > obj.length) fail(node.line, `要素番号 ${iv} は範囲外です（要素数は ${obj.length}、有効範囲は 1〜${obj.length}）`, "実行時エラー");
        if (jv !== null && jv !== undefined) {
          const row = obj[iv - 1];
          if (!Array.isArray(row)) fail(node.line, `a[行, 列] の形は二次元配列で使います（${iv} 行目は配列ではありません）`, "実行時エラー");
          if (!checkIndexValue(jv, node)) fail(node.line, "要素番号が実行時に決まる要素には代入できません", "実行時エラー");
          if (jv < 1 || jv > row.length) fail(node.line, `要素番号 ${jv} は範囲外です（${iv} 行目の要素数は ${row.length}）`, "実行時エラー");
          return [{ ref: { get: () => row[jv - 1], set: (v, real) => { row[jv - 1] = v; if (real !== undefined) setElemReal(row, jv - 1, forcedElemReal(node, s3, real)); }, describe: () => `${targetTextOf(node.obj, s3)}[${iv}, ${jv}]` }, s: s3 }];
        }
        return [{ ref: { get: () => obj[iv - 1], set: (v, real) => { obj[iv - 1] = v; if (real !== undefined) setElemReal(obj, iv - 1, forcedElemReal(node, s3, real)); }, describe: () => `${targetTextOf(node.obj, s3)}[${iv}]` }, s: s3 }];
      });
      if (node.j) return evalChain(node.j, s1, ctx, (jv, s2) => withObj(jv, s2));
      return withObj(null, s1);
    }).map((r) => (r.ref ? r : { ref: null, s: r.s }));
  }
  fail(node.line, "代入先が解釈できません", "構文エラー");
}

// ---------------------------------------------------------------------------
// 文の実行
// ---------------------------------------------------------------------------

function execBlock(stmts, states, ctx) {
  let current = states;
  for (const stmt of stmts) {
    const next = [];
    for (const state of current) {
      if (state.error || state.limited || state.breakSignal || state.returnSignal) { next.push(state); continue; }
      try {
        next.push(...execStmt(stmt, state, ctx));
      } catch (error) {
        if (error instanceof PracticeError) { next.push(errState(state, error.line ?? stmt.line, error.message, error.category || "実行時エラー")); continue; }
        throw error;
      }
    }
    current = capPaths(next, ctx);
    for (const state of current) {
      if (!state.error && !state.limited && state.steps > LIMITS.steps) noteLimit(state, stmt.line, ctx, "手順の上限（600ステップ）");
    }
    if (Date.now() - ctx.startedAt > LIMITS.milliseconds) {
      ctx.truncated = true;
      ctx.reasons.add("時間の上限（1,200ミリ秒）");
      for (const state of current) if (!state.error && !state.limited) noteLimit(state, stmt.line, ctx, "時間の上限（1,200ミリ秒）");
      break;
    }
  }
  return current;
}

function execStmt(stmt, state, ctx) {
  state.steps++;
  switch (stmt.k) {
    case "decl": return execDecl(stmt, state, ctx);
    case "assign": {
      // 右辺を先に評価し、代入先は結果の状態ごとに解決する。先に代入先を
      // 捕捉すると、右辺の関数内部で状態が複製（未知条件の分岐）されたときに
      // 書き込みが複製元のセルへ行って結果の状態に残らない（独立検証 第3回 別件観察）。
      const out = [];
      for (const result of evalExpr(stmt.expr, state, ctx)) {
        if (result.s.error) { out.push(result.s); continue; }
        for (const target of resolveTarget(stmt.target, result.s, ctx)) {
          if (!target.ref) { out.push(target.s); continue; }
          target.ref.set(result.v, result.real);
          noteStep(target.s, stmt.line, `${target.ref.describe()} に ${fmtVal(result.v)} を代入します`, ["代入"]);
          out.push(target.s);
        }
      }
      return out;
    }
    case "callstmt": {
      const out = [];
      for (const result of evalExpr(stmt.expr, state, ctx)) out.push(result.s);
      return out;
    }
    case "append": {
      // 追加する値を先に評価し、配列は結果の状態ごとに取り直す（代入と同じ理由）。
      const out = [];
      for (const valResult of evalExpr(stmt.value, state, ctx)) {
        if (valResult.s.error) { out.push(valResult.s); continue; }
        for (const arrResult of evalExpr(stmt.array, valResult.s, ctx)) {
          if (arrResult.s.error) { out.push(arrResult.s); continue; }
          const arr = arrResult.v;
          if (isUnknown(arr)) fail(stmt.line, "実行時に決まる値には末尾追加できません", "実行時エラー");
          if (!Array.isArray(arr)) fail(stmt.line, `末尾に追加できるのは配列です（対象は ${valueTypeName(arr)}）`, "実行時エラー");
          arr.push(valResult.v);
          if (valResult.real) setElemReal(arr, arr.length - 1, true);
          noteStep(arrResult.s, stmt.line, `${stmt.arrayText}の末尾に ${fmtVal(valResult.v)} を追加します（要素数は ${arr.length} になりました）`, ["末尾に追加する"]);
          out.push(arrResult.s);
        }
      }
      return out;
    }
    case "incr": {
      const out = [];
      for (const target of resolveTarget(stmt.target, state, ctx)) {
        if (!target.ref) { out.push(target.s); continue; }
        const current = target.ref.get();
        if (isUnknown(current)) {
          noteStep(target.s, stmt.line, `${target.ref.describe()} は実行時に決まる値のため、${stmt.delta}増やした結果も実行時に決まります`, ["値を増やす"]);
          target.ref.set(makeUnknown(`${stmt.delta}増やした値`));
          out.push(target.s);
          continue;
        }
        if (typeof current !== "number") fail(stmt.line, `「の値を増やす」は数値に使います（対象は ${valueTypeName(current)}）`, "実行時エラー");
        target.ref.set(current + stmt.delta);
        noteStep(target.s, stmt.line, `${target.ref.describe()} の値を${stmt.delta}増やします（${fmtVal(current + stmt.delta)} になりました）`, ["値を増やす"]);
        out.push(target.s);
      }
      return out;
    }
    case "output": {
      let results = [{ v: [], s: state }];
      for (const expr of stmt.exprs) {
        const next = [];
        for (const result of results) {
          if (result.s.error) { next.push(result); continue; }
          for (const item of evalExpr(expr, result.s, ctx)) {
            if (item.s.error) { next.push({ v: result.v, s: item.s }); continue; }
            next.push({ v: [...result.v, item.v], s: item.s });
          }
        }
        results = next;
      }
      const out = [];
      for (const result of results) {
        if (result.s.error) { out.push(result.s); continue; }
        const text = result.v.map(fmtVal).join(", ");
        result.s.outputs.push({ channel: "出力", text, line: stmt.line });
        noteStep(result.s, stmt.line, `「${text}」を出力します`, ["出力する"]);
        out.push(result.s);
      }
      return out;
    }
    case "break": state.breakSignal = { label: stmt.label }; return [state];
    case "return": {
      if (!stmt.expr) { state.returnSignal = { v: UNDEF, line: stmt.line, real: false }; return [state]; }
      const out = [];
      for (const result of evalExpr(stmt.expr, state, ctx)) {
        if (result.s.error) { out.push(result.s); continue; }
        result.s.returnSignal = { v: result.v, line: stmt.line, real: !!result.real };
        out.push(result.s);
      }
      return out;
    }
    case "if": return execIf(stmt, state, ctx);
    case "while": return execWhile(stmt, state, ctx, 0, 0);
    case "do": return execDo(stmt, state, ctx, 0, 0);
    case "for": return execFor(stmt, state, ctx);
    default: fail(stmt.line, "文が解釈できません", "構文エラー");
  }
}

function execDecl(stmt, state, ctx) {
  // スコープは状態ごとに取り直す（初期化式の評価で状態が複製されても宣言が残るように）。
  const scopeOf = (s) => (stmt.global ? s.scopes[0] : currentScope(s));
  let states = [state];
  for (const item of stmt.items) {
    const next = [];
    for (const s of states) {
      if (s.error || s.limited) { next.push(s); continue; }
      if (scopeOf(s).has(item.name) && !stmt.global) fail(stmt.line, `変数 ${item.name} は既に宣言されています`, "実行時エラー");
      if (!item.init) {
        scopeOf(s).set(item.name, { v: UNDEF, t: stmt.type, real: false });
        noteStep(s, stmt.line, `${stmt.global ? "大域変数" : "変数"} ${item.name}（${typeDisplay(stmt.type)}）を宣言します。値は未定義です`, declRefs(stmt));
        next.push(s);
        continue;
      }
      for (const result of evalExpr(item.init, s, ctx)) {
        if (result.s.error) { next.push(result.s); continue; }
        scopeOf(result.s).set(item.name, { v: result.v, t: stmt.type, real: declaredReal(stmt.type) });
        noteStep(result.s, stmt.line, `${stmt.global ? "大域変数" : "変数"} ${item.name}（${typeDisplay(stmt.type)}）を宣言し、${fmtVal(result.v)} を代入します`, declRefs(stmt));
        next.push(result.s);
      }
    }
    states = next;
  }
  return states;
}

function declRefs(stmt) {
  const refs = [stmt.global ? "大域変数の宣言" : "変数の宣言"];
  const typeRef = typeRefName(stmt.type);
  if (typeRef) refs.push(typeRef);
  return refs;
}

// 条件式の評価結果でパスを分ける。未確定のときは真・偽の両方を仮定する。
function branchOnCondition(cond, condText, state, ctx, line, refs) {
  const out = [];
  for (const result of evalExpr(cond, state, ctx)) {
    if (result.s.error) { out.push({ taken: null, s: result.s }); continue; }
    const v = result.v;
    if (isUnknown(v)) {
      const sTrue = cloneState(result.s);
      noteStep(sTrue, line, `条件式（${condText}）は実行時に決まります。このパスでは真と仮定します`, refs);
      out.push({ taken: true, s: sTrue, wasUnknown: true });
      noteStep(result.s, line, `条件式（${condText}）は実行時に決まります。このパスでは偽と仮定します`, refs);
      out.push({ taken: false, s: result.s, wasUnknown: true });
      continue;
    }
    if (typeof v !== "boolean") fail(line, `条件式は論理型で書きます（実際は ${valueTypeName(v)}）`, "実行時エラー");
    noteStep(result.s, line, `条件式（${condText}）は${v ? "真" : "偽"}です`, refs);
    out.push({ taken: v, s: result.s, wasUnknown: false });
  }
  return out;
}

function execIf(stmt, state, ctx) {
  let pending = [{ s: state }];
  const out = [];
  for (const branch of stmt.branches) {
    const nextPending = [];
    for (const item of pending) {
      if (item.s.error || item.s.limited || item.s.breakSignal || item.s.returnSignal) { out.push(item.s); continue; }
      for (const result of branchOnCondition(branch.cond, branch.condText, item.s, ctx, branch.line, [branch.kind])) {
        if (result.taken === null) { out.push(result.s); continue; }
        if (result.taken) out.push(...execBlock(branch.body, [result.s], ctx));
        else nextPending.push({ s: result.s });
      }
    }
    pending = nextPending;
  }
  for (const item of pending) {
    if (stmt.elseBody) {
      noteStep(item.s, stmt.line, "どの条件式も真にならなかったため、else の処理を実行します", ["else"]);
      out.push(...execBlock(stmt.elseBody, [item.s], ctx));
    } else {
      out.push(item.s);
    }
  }
  return capPaths(out, ctx);
}

// 未確定の条件で真と仮定して続ける回数の上限（パス爆発を防ぐための打ち切り）。
const UNKNOWN_LOOP_CAP = 3;

function execWhile(stmt, state, ctx, iter, unknownIter) {
  if (state.error || state.limited || state.breakSignal || state.returnSignal) return [state];
  const out = [];
  for (const result of branchOnCondition(stmt.cond, stmt.condText, state, ctx, stmt.line, ["while"])) {
    if (result.taken === null) { out.push(result.s); continue; }
    if (!result.taken) { out.push(result.s); continue; }
    if (result.wasUnknown) {
      if (unknownIter + 1 > UNKNOWN_LOOP_CAP) {
        noteLimit(result.s, stmt.line, ctx, "未確定の条件による繰返しの上限");
        out.push(result.s);
        continue;
      }
      out.push(...continueWhile(stmt, result.s, ctx, iter, unknownIter + 1));
      continue;
    }
    out.push(...continueWhile(stmt, result.s, ctx, iter, unknownIter));
  }
  return capPaths(out, ctx);
}

function continueWhile(stmt, state, ctx, iter, unknownIter) {
  if (iter + 1 > LIMITS.iterations) {
    noteLimit(state, stmt.line, ctx, "繰返しの上限（100回）");
    return [state];
  }
  const out = [];
  for (const bodyState of execBlock(stmt.body, [state], ctx)) {
    if (bodyState.breakSignal) {
      if (bodyState.breakSignal.label === null || bodyState.breakSignal.label === stmt.label) {
        bodyState.breakSignal = null;
        noteStep(bodyState, stmt.line, "繰返し処理を終了します", ["繰返し処理を終了する"]);
        out.push(bodyState);
      } else out.push(bodyState);
      continue;
    }
    if (bodyState.error || bodyState.limited || bodyState.returnSignal) { out.push(bodyState); continue; }
    out.push(...execWhile(stmt, bodyState, ctx, iter + 1, unknownIter));
  }
  return out;
}

function execDo(stmt, state, ctx, iter, unknownIter) {
  if (iter + 1 > LIMITS.iterations) {
    noteLimit(state, stmt.line, ctx, "繰返しの上限（100回）");
    return [state];
  }
  const out = [];
  for (const bodyState of execBlock(stmt.body, [state], ctx)) {
    if (bodyState.breakSignal) {
      if (bodyState.breakSignal.label === null || bodyState.breakSignal.label === stmt.label) {
        bodyState.breakSignal = null;
        noteStep(bodyState, stmt.line, "繰返し処理を終了します", ["繰返し処理を終了する"]);
        out.push(bodyState);
      } else out.push(bodyState);
      continue;
    }
    if (bodyState.error || bodyState.limited || bodyState.returnSignal) { out.push(bodyState); continue; }
    for (const result of branchOnCondition(stmt.cond, stmt.condText, bodyState, ctx, stmt.condLine, ["do"])) {
      if (result.taken === null || !result.taken) { out.push(result.s); continue; }
      if (result.wasUnknown && unknownIter + 1 > UNKNOWN_LOOP_CAP) {
        noteLimit(result.s, stmt.condLine, ctx, "未確定の条件による繰返しの上限");
        out.push(result.s);
        continue;
      }
      out.push(...execDo(stmt, result.s, ctx, iter + 1, result.wasUnknown ? unknownIter + 1 : unknownIter));
    }
  }
  return capPaths(out, ctx);
}

function execFor(stmt, state, ctx) {
  const control = stmt.control;
  if (control.form === "each") {
    const out = [];
    for (const result of evalExpr(control.array, state, ctx)) {
      if (result.s.error) { out.push(result.s); continue; }
      const arr = result.v;
      if (isUnknown(arr)) {
        noteLimit(result.s, stmt.line, ctx, "要素が実行時に決まる配列の繰返し");
        out.push(result.s);
        continue;
      }
      if (!Array.isArray(arr)) fail(stmt.line, `「要素を順に代入する」は配列に使います（対象は ${valueTypeName(arr)}）`, "実行時エラー");
      if (!findCell(result.s, control.var)) currentScope(result.s).set(control.var, { v: UNDEF, t: null });
      out.push(...runForRounds(stmt, [result.s], ctx, (s, round) => {
        // 本体が配列を変更した場合に備え、名前で参照する配列は毎ラウンド読み直す。
        let current = arr;
        if (control.array.k === "name") {
          const cell = findCell(s, control.array.name);
          if (cell && Array.isArray(cell.v)) current = cell.v;
        }
        if (round > current.length) return false;
        const cell = findCell(s, control.var);
        cell.v = current[round - 1];
        cell.real = cell.t ? declaredReal(cell.t) : elemReal(current, round - 1);
        noteStep(s, stmt.line, `${control.var} に ${control.arrayText} の ${round} 番目の要素 ${fmtVal(current[round - 1])} を代入します`, ["要素を順に代入する"]);
        return true;
      }));
    }
    return capPaths(out, ctx);
  }
  // 数値の制御記述：初期値・終値・増分を順に評価する。
  let seeds = [{ values: {}, reals: {}, s: state }];
  for (const key of ["from", "to", "step"]) {
    const next = [];
    for (const seed of seeds) {
      if (seed.s.error) { next.push(seed); continue; }
      for (const result of evalExpr(control[key], seed.s, ctx)) {
        if (result.s.error) { next.push({ values: seed.values, reals: seed.reals, s: result.s }); continue; }
        next.push({ values: { ...seed.values, [key]: result.v }, reals: { ...seed.reals, [key]: !!result.real }, s: result.s });
      }
    }
    seeds = next;
  }
  const out = [];
  for (const seed of seeds) {
    if (seed.s.error) { out.push(seed.s); continue; }
    const { from, to, step } = seed.values;
    if (isUnknown(from) || isUnknown(to) || isUnknown(step)) {
      noteLimit(seed.s, stmt.line, ctx, "制御記述に実行時に決まる値を含む繰返し");
      out.push(seed.s);
      continue;
    }
    for (const [label, v] of [["初期値", from], ["終値", to], ["増分", step]]) {
      if (typeof v !== "number") fail(stmt.line, `for の${label}は数値で書きます（実際は ${valueTypeName(v)}）`, "実行時エラー");
    }
    if (step === 0) fail(stmt.line, "for の増分に 0 は指定できません（無限に繰り返します）", "実行時エラー");
    if (!findCell(seed.s, control.var)) currentScope(seed.s).set(control.var, { v: UNDEF, t: null, real: false });
    const startCell = findCell(seed.s, control.var);
    startCell.v = from;
    startCell.real = !!seed.reals.from;
    out.push(...runForRounds(stmt, [seed.s], ctx, (s, round) => {
      void round;
      const cell = findCell(s, control.var);
      const v = cell.v;
      if (typeof v !== "number") return false;
      if (v > to) return false;
      noteStep(s, stmt.line, `${control.var} = ${fmtVal(v)} で繰返します`, ["for", "ずつ増やす"]);
      return true;
    }, (s) => {
      const cell = findCell(s, control.var);
      if (typeof cell.v === "number") cell.v += step;
    }));
  }
  return capPaths(out, ctx);
}

// for のラウンド実行：各ラウンドで全アクティブパスを1回ずつ進める。
function runForRounds(stmt, states, ctx, beforeRound, afterRound = null) {
  const out = [];
  let active = states;
  let round = 0;
  while (active.length) {
    round++;
    if (round > LIMITS.iterations) {
      for (const s of active) { noteLimit(s, stmt.line, ctx, "繰返しの上限（100回）"); out.push(s); }
      break;
    }
    const nextActive = [];
    for (const s of active) {
      if (s.error || s.limited || s.returnSignal) { out.push(s); continue; }
      if (!beforeRound(s, round)) { out.push(s); continue; }
      for (const bodyState of execBlock(stmt.body, [s], ctx)) {
        if (bodyState.breakSignal) {
          if (bodyState.breakSignal.label === null || bodyState.breakSignal.label === stmt.label) {
            bodyState.breakSignal = null;
            noteStep(bodyState, stmt.line, "繰返し処理を終了します", ["繰返し処理を終了する"]);
            out.push(bodyState);
          } else out.push(bodyState);
          continue;
        }
        if (bodyState.error || bodyState.limited || bodyState.returnSignal) { out.push(bodyState); continue; }
        if (afterRound) afterRound(bodyState);
        nextActive.push(bodyState);
      }
    }
    active = capPaths(nextActive, ctx);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 入口：プログラム全体の実行
// ---------------------------------------------------------------------------

// モデル（画面からの入力値）を擬似言語の値へ変換する。null は未定義の値として扱う。
function fromModel(value, typeHint = null) {
  if (value === null || value === undefined) return UNDEF;
  if (Array.isArray(value)) return value.map((item) => fromModel(item));
  if (typeof value === "object") {
    const fields = new Map();
    for (const [key, item] of Object.entries(value)) fields.set(key, fromModel(item));
    return { __class: typeHint && !BASIC_TYPES.includes(typeHint.base) ? typeHint.base : "オブジェクト", fields };
  }
  return value;
}

function finalizePath(state, extra = {}) {
  const varsMap = new Map();
  for (const scope of state.scopes) for (const [name, cell] of scope) varsMap.set(name, cell);
  if (extra.locals) for (const [name, cell] of extra.locals) varsMap.set(name, cell);
  if ("ret" in extra) varsMap.set("戻り値", { v: extra.ret, t: extra.retType || null });
  const entries = [...varsMap.entries()].map(([name, cell]) => [name, `${fmtVal(cell.v)}（${typeDisplay(cell.t) || valueTypeName(cell.v)}）`]);
  const vars = {};
  for (const [name, cell] of varsMap) vars[name] = rawVal(cell.v);
  return {
    trace: state.trace,
    outputs: state.outputs,
    vars,
    groups: [{ title: "変数・オブジェクト", entries }],
    error: state.error || undefined,
  };
}

function rawVal(value) {
  if (isUndef(value)) return null;
  if (isUnknown(value)) return unknownLabel(value);
  if (Array.isArray(value)) return value.map(rawVal);
  if (isObj(value)) {
    const out = {};
    for (const [key, item] of value.fields) out[key] = rawVal(item);
    return out;
  }
  return value;
}

// simulate の本体。構文エラー等は { fatal } で返し、それ以外は { paths, truncated, reasons }。
export function simulatePseudo(code, input = {}) {
  let program;
  try {
    program = parseProgram(code);
  } catch (error) {
    if (error instanceof PracticeError) return { fatal: { line: error.line ?? 1, message: error.message, category: error.category || "構文エラー" } };
    throw error;
  }
  const ctx = { program, startedAt: Date.now(), truncated: false, reasons: new Set() };
  const model = input && typeof input === "object" ? input : {};
  const modelGlobals = model.globals && typeof model.globals === "object" ? model.globals : {};
  const modelArgs = Array.isArray(model.args) ? model.args : [];

  const start = newState();
  let states = [start];
  try {
    states = execBlock(program.globals, states, ctx);
    // 画面からの大域変数の初期値で上書きする（宣言より入力を優先する）。
    for (const state of states) {
      if (state.error) continue;
      for (const [name, value] of Object.entries(modelGlobals)) {
        const cell = findCell(state, name);
        if (cell) cell.v = fromModel(value, cell.t);
        else state.scopes[0].set(name, { v: fromModel(value), t: null });
      }
    }
    if (program.main.length > 0) {
      states = execBlock(program.main, states, ctx);
      return { paths: states.map((state) => finalizePath(state)), truncated: ctx.truncated, reasons: [...ctx.reasons] };
    }
    if (program.funcOrder.length > 0) {
      // 文が無く手続き・関数だけのプログラムは、最初の関数を自動で呼び出す。
      const fn = program.funcOrder[0];
      const paths = [];
      for (const state of states) {
        if (state.error) { paths.push(finalizePath(state)); continue; }
        const argVals = fn.params.map((param, i) => (i < modelArgs.length && modelArgs.length === fn.params.length
          ? fromModel(modelArgs[i], param.type)
          : makeUnknown(`引数 ${param.name}`)));
        noteStep(state, fn.line, `プログラムに文がないため、最初の${fn.retType ? "関数" : "手続き"} ${fn.name} を自動で呼び出します`, ["関数・手続の宣言"]);
        for (const result of execFunction(fn, argVals, state, ctx, fn.line)) {
          const extra = { locals: result.frame };
          if (fn.retType) { extra.ret = result.v; extra.retType = fn.retType; }
          paths.push(finalizePath(result.s, extra));
        }
      }
      return { paths: capPaths(paths, ctx), truncated: ctx.truncated, reasons: [...ctx.reasons] };
    }
    return { paths: states.map((state) => finalizePath(state)), truncated: ctx.truncated, reasons: [...ctx.reasons] };
  } catch (error) {
    if (error instanceof PracticeError) return { fatal: { line: error.line ?? 1, message: error.message, category: error.category || "実行時エラー" } };
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 使用項目の静的収集（scan 用）
// ---------------------------------------------------------------------------

const REF = {
  decl: "関数・手続の宣言", varDecl: "変数の宣言", globalDecl: "大域変数の宣言",
  assign: "代入", call: "手続・関数の呼出し", ret: "return", undef: "未定義の値",
  trueItem: "true", falseItem: "false", comment: "注釈",
  mod: "mod", mul: "×", div: "÷", add: "+", sub: "-", rel: "関係演算子",
  and: "and", or: "or", not: "not", member: "メンバアクセス",
  ifItem: "if", elseif: "elseif", elseItem: "else", endif: "endif",
  whileItem: "while", endwhile: "endwhile", doItem: "do", forItem: "for", endfor: "endfor",
  step: "ずつ増やす", each: "要素を順に代入する", breakItem: "繰返し処理を終了する",
  array: "配列リテラル", index: "添字アクセス", len: "要素数", rows: "行数", cols: "列数",
  chars: "文字数", charat: "文字目の文字", append: "末尾に追加する", fill: "サイズ指定生成",
  jpCond: "日本語の条件句", incr: "値を増やす", output: "出力する",
};

function collectExprNames(node, used) {
  if (!node || typeof node !== "object") return;
  switch (node.k) {
    case "undef": used.add(REF.undef); break;
    case "bool": used.add(node.v ? REF.trueItem : REF.falseItem); break;
    case "un": used.add(REF.not); collectExprNames(node.v, used); break;
    case "bin":
      if (node.jp) used.add(REF.jpCond);
      if (node.op === "mod") used.add(REF.mod);
      else if (node.op === "×") used.add(REF.mul);
      else if (node.op === "÷") used.add(REF.div);
      else if (node.op === "+") used.add(REF.add);
      else if (node.op === "-") used.add(REF.sub);
      else if (node.op === "and") used.add(REF.and);
      else if (node.op === "or") used.add(REF.or);
      else if (!node.jp) used.add(REF.rel);
      collectExprNames(node.l, used);
      collectExprNames(node.r, used);
      break;
    case "isundef": used.add(REF.undef); used.add(REF.jpCond); collectExprNames(node.v, used); break;
    case "index": used.add(REF.index); collectExprNames(node.obj, used); collectExprNames(node.i, used); collectExprNames(node.j, used); break;
    case "member": used.add(REF.member); collectExprNames(node.obj, used); break;
    case "prop":
      used.add(node.prop === "要素数" || node.prop === "要素の和" ? REF.len : node.prop === "行数" ? REF.rows : node.prop === "列数" ? REF.cols : REF.chars);
      collectExprNames(node.obj, used);
      break;
    case "rowsum": case "colsum":
      used.add(REF.len);
      collectExprNames(node.obj, used);
      collectExprNames(node.i, used);
      break;
    case "charat": used.add(REF.charat); collectExprNames(node.obj, used); collectExprNames(node.i, used); break;
    case "quot": used.add(REF.div); collectExprNames(node.v, used); break;
    case "array": used.add(REF.array); node.elems.forEach((e) => collectExprNames(e, used)); break;
    case "fill": used.add(REF.array); used.add(REF.fill); collectExprNames(node.n, used); collectExprNames(node.v, used); break;
    case "fill2": used.add(REF.array); used.add(REF.fill); collectExprNames(node.rows, used); collectExprNames(node.cols, used); collectExprNames(node.v, used); break;
    case "call":
      used.add(REF.call);
      if (node.target.k === "member") { used.add(REF.member); collectExprNames(node.target.obj, used); }
      node.args.forEach((a) => collectExprNames(a, used));
      break;
    default: break;
  }
}

function collectStmtNames(stmt, used) {
  switch (stmt.k) {
    case "decl": {
      used.add(stmt.global ? REF.globalDecl : REF.varDecl);
      const typeRef = typeRefName(stmt.type);
      if (typeRef) used.add(typeRef);
      for (const item of stmt.items) collectExprNames(item.init, used);
      break;
    }
    case "assign": used.add(REF.assign); collectExprNames(stmt.target, used); collectExprNames(stmt.expr, used); break;
    case "callstmt": collectExprNames(stmt.expr, used); break;
    case "append": used.add(REF.append); collectExprNames(stmt.array, used); collectExprNames(stmt.value, used); break;
    case "incr": used.add(REF.incr); collectExprNames(stmt.target, used); break;
    case "output": used.add(REF.output); stmt.exprs.forEach((e) => collectExprNames(e, used)); break;
    case "break": used.add(REF.breakItem); break;
    case "return": used.add(REF.ret); collectExprNames(stmt.expr, used); break;
    case "if":
      for (const branch of stmt.branches) {
        used.add(branch.kind === "if" ? REF.ifItem : REF.elseif);
        collectExprNames(branch.cond, used);
        branch.body.forEach((s) => collectStmtNames(s, used));
      }
      if (stmt.elseBody) { used.add(REF.elseItem); stmt.elseBody.forEach((s) => collectStmtNames(s, used)); }
      used.add(REF.endif);
      break;
    case "while": used.add(REF.whileItem); used.add(REF.endwhile); collectExprNames(stmt.cond, used); stmt.body.forEach((s) => collectStmtNames(s, used)); break;
    case "do": used.add(REF.doItem); used.add(REF.whileItem); collectExprNames(stmt.cond, used); stmt.body.forEach((s) => collectStmtNames(s, used)); break;
    case "for":
      used.add(REF.forItem);
      used.add(REF.endfor);
      if (stmt.control.form === "each") { used.add(REF.each); collectExprNames(stmt.control.array, used); }
      else {
        used.add(REF.step);
        collectExprNames(stmt.control.from, used);
        collectExprNames(stmt.control.to, used);
        collectExprNames(stmt.control.step, used);
      }
      stmt.body.forEach((s) => collectStmtNames(s, used));
      break;
    default: break;
  }
}

// プログラム中で使われているリファレンス項目名の集合を返す（scan 用）。
export function collectUsedNames(program) {
  const used = new Set();
  for (const stmt of program.globals) collectStmtNames(stmt, used);
  for (const fn of program.funcOrder) {
    used.add(REF.decl);
    const retRef = fn.retType ? typeRefName(fn.retType) : null;
    if (retRef) used.add(retRef);
    for (const param of fn.params) { const r = typeRefName(param.type); if (r) used.add(r); }
    fn.body.forEach((s) => collectStmtNames(s, used));
  }
  program.main.forEach((s) => collectStmtNames(s, used));
  return used;
}
