import { LIMITS, isUnknown, unknown, formatModelValue as formatValue } from "./contract.js";
import { VALUE_LENGTH_LIMIT, truncateDisplayText } from "./presentation.js";
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
// M-N2：ホスト（V8）例外の学習者向け文言への変換層。
// 評価はホストの演算子・API で行うため、BigInt 混在・BigInt の 0 除算・
// 配列長の検証などではホスト例外がそのまま発生しうる。ホスト例外の英語
// 文言を利用者向け停止理由へ流さないよう、例外の出口（run の catch、
// executeProgram／simulateScript の catch）でここを通し、日本語の原因
// 文言へ変換する。PracticeError はモデル側が意図して作った正当な停止
// 理由なので変換しない（R の実物エラー文言の再現など、意図的な英語
// 文言も PracticeError として作られている）。
const HOST_ERROR_MESSAGES = [
  [/^Cannot mix BigInt and other types/, "BigIntと通常の数値は混ぜて演算できません", "TypeError"],
  [/^Division by zero$/, "0で割ることはできません", "RangeError"],
  [/^Cannot convert a BigInt value to a number/, "BigIntを通常の数値として使うことはできません（Number()による明示的な変換が必要です）", "TypeError"],
  [/^BigInts have no unsigned right shift/, "BigIntに符号なし右シフト（>>>）は使えません（>>を使ってください）", "TypeError"],
  [/^Invalid array length/, "配列の長さが不正です（0以上の整数で指定してください）", "RangeError"],
  [/^Maximum BigInt size exceeded/, "BigIntの大きさが上限を超えました", "RangeError"],
  [/^Do not know how to serialize a BigInt/, "BigIntはJSONへ変換できません", "TypeError"],
  [/^Assignment to constant variable/, "const で宣言した変数には再代入できません", "TypeError"],
  [/^Cannot read properties of (?:null|undefined)/, "null / undefined のプロパティは参照できません", "TypeError"],
  [/^Cannot set properties of (?:null|undefined)/, "null / undefined へ書き込めません", "TypeError"],
];
const GENERIC_HOST_ERROR_MESSAGE = "処理中に予期しないエラーが発生しました";
export function toLearnerError(e) {
  if (e instanceof PracticeError) return e;
  const raw = e instanceof Error ? e.message : "";
  for (const [pattern, message, category] of HOST_ERROR_MESSAGES) {
    if (pattern.test(raw))
      return new PracticeError(message, e?.line || 1, category);
  }
  // 未知のホスト例外は内部文言を出さず、汎用の日本語文言で受ける。
  return new PracticeError(GENERIC_HOST_ERROR_MESSAGE, e?.line || 1, "エラー");
}
// RG-61（R18-N3）：不可視文字はそのまま原因表示に出すと空に見えるため、
// 名称とコードポイントで可視化する。
export function charLabel(c) {
  const cp = c.codePointAt(0);
  const hex = "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
  const names = {
    0x3000: "全角スペース",
    0x00a0: "ノーブレークスペース",
    0x200b: "ゼロ幅スペース",
    0x200c: "ゼロ幅非接合子",
    0x200d: "ゼロ幅接合子",
    0xfeff: "ゼロ幅ノーブレークスペース（BOM）",
    0x00ad: "ソフトハイフン",
    0x2060: "ワードジョイナー",
  };
  if (names[cp]) return `${names[cp]}（${hex}）`;
  if (cp >= 0xff10 && cp <= 0xff19) return `全角数字（${hex}）`;
  if (cp >= 0xff01 && cp <= 0xff5e) return `全角文字（${hex}）`;
  return `文字（${hex}）`;
}
const INVISIBLE_CHAR = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u2060\u3000\u00AD\uFEFF\u200B-\u200D]/;
// 行頭（空白・タブのみが前置）かどうか。RG-68 の AutoHotkey コメント規則で使う。
export function atLineStart(source, i) {
  const start = source.lastIndexOf("\n", i - 1) + 1;
  return /^[ \t]*$/.test(source.slice(start, i));
}
export function tokenize(source, dialect = "js") {
  // 先頭の BOM は取り込み経路と揃えて取り除く（文中では RG-61／RG-62 の扱い）。
  if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);
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
      // RG-62（R18-N4）：R／C／C++ では非 ASCII の空白的文字は実言語でもエラーになる。
      // 無言で空白として受理せず、文字を名指して停止する（JS は仕様どおり受理する）。
      if (
        ["r", "c", "cpp"].includes(dialect) &&
        c.codePointAt(0) > 0x7f
      )
        throw new PracticeError(
          `空白として扱えない文字があります：${charLabel(c)}`,
          line,
          "SyntaxError",
        );
      i++;
      continue;
    }
    // RG-68（R19-N2）：AutoHotkey v2 の ; は、行頭にあるか直前に空白／タブが
    // あるときだけコメントになる。それ以外の ; はコメントとして受理しない。
    if (dialect === "ahk" && c === ";") {
      const prev = source[i - 1];
      if (i === 0 || prev === "\n" || prev === " " || prev === "\t") {
        while (i < source.length && source[i] !== "\n") i++;
        continue;
      }
      unsupported(";", line);
    }
    if (
      (c === "/" && next === "/" && !["r", "ahk"].includes(dialect)) ||
      ((dialect === "r" || dialect === "python") && c === "#")
    ) {
      // RG-67（R19-N1）：C／C++ では行末のバックスラッシュは翻訳フェーズ2の
      // 行スプライスとして働き、行コメントが次行も取り込む（C#／JS は対象外）。
      for (;;) {
        while (i < source.length && source[i] !== "\n") i++;
        if (!["c", "cpp"].includes(dialect) || i >= source.length) break;
        let j = i - 1;
        if (source[j] === "\r") j--;
        if (source[j] !== "\\") break;
        i++; // スプライスされた改行を消費する
        line++;
      }
      continue;
    }
    // RG-43（R15-N6）：R にブロックコメントは無い。R では /* を演算子列として扱う。
    // RG-68：AutoHotkey v2 の /* は行頭（空白・タブを除く）にあるときだけコメント。
    if (
      c === "/" &&
      next === "*" &&
      dialect !== "r" &&
      !(dialect === "ahk" && !atLineStart(source, i))
    ) {
      if (["c", "cpp"].includes(dialect)) {
        // RG-67：ブロックコメント内でもスプライスが先に働くため、
        // 「* + バックスラッシュ + 改行 + /」の並びも終端になる。
        let end = -1;
        for (let j = i + 2; j < source.length; j++) {
          if (source[j] !== "*") continue;
          if (source[j + 1] === "/") {
            end = j + 2;
            break;
          }
          if (source[j + 1] === "\\") {
            const nl =
              source[j + 2] === "\r" && source[j + 3] === "\n"
                ? 2
                : source[j + 2] === "\n"
                  ? 1
                  : 0;
            if (nl && source[j + 2 + nl] === "/") {
              end = j + 2 + nl + 1;
              break;
            }
          }
        }
        if (end < 0)
          throw new PracticeError("コメントが閉じられていません", line);
        line += source.slice(i, end).split("\n").length - 1;
        i = end;
        continue;
      }
      let end = source.indexOf("*/", i + 2);
      if (end < 0) {
        // RG-68：AutoHotkey v2 では未閉じの /* はファイル末尾まで有効（エラーにしない）。
        if (dialect === "ahk") {
          line += source.slice(i).split("\n").length - 1;
          i = source.length;
          continue;
        }
        throw new PracticeError("コメントが閉じられていません", line);
      }
      line += source.slice(i, end + 2).split("\n").length - 1;
      i = end + 2;
      continue;
    }
    if (dialect === "fx" && c === "'") {
      // R23-N3: Power Fx の単一引用符は文字列ではなく、空白や特殊文字を
      // 含む識別子を引用する記法（Microsoft Learn「Operators and data
      // types」）。文字列として受理すると 'abc' が変数 abc の参照ではなく
      // 文字列 "abc" になり、未定義名でも黙って誤値になる。識別子
      // トークンとして読み、内部の '' は単一引用符1文字として扱う。
      let text = "",
        start = line;
      i++;
      let closed = false;
      while (i < source.length) {
        if (source[i] === "'") {
          if (source[i + 1] === "'") {
            text += "'";
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        if (source[i] === "\n")
          throw new PracticeError(
            "引用識別子（'...'）の途中で改行されています",
            start,
            "SyntaxError",
          );
        text += source[i++];
      }
      if (!closed)
        throw new PracticeError(
          "引用識別子（'...'）が閉じられていません",
          start,
        );
      if (text === "")
        throw new PracticeError("引用識別子（'...'）が空です", start);
      out.push({ v: text, k: "id", line: start });
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
    // RG-11 追加表面（R21-N12）: JavaScript の数値区切り（1_000 等）。
    // 区切りは数字の間にだけ置ける。妥当な形は区切りを除去して通常の
    // 数値／BigInt として扱い、不正な配置はリテラルを名指しして弾く
    // （位置依存の虚偽の原因表示にしない）。
    if (dialect === "js" && /\d/.test(source[i])) {
      let sm = source
        .slice(i)
        .match(/^(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?n?)/);
      if (sm && sm[0].includes("_")) {
        const raw = sm[0],
          big = raw.endsWith("n"),
          body = big ? raw.slice(0, -1) : raw;
        const valid =
          /^0[xX]/.test(body)
            ? /^0[xX][0-9a-fA-F](?:_?[0-9a-fA-F])*$/.test(body)
            : /^0[bB]/.test(body)
              ? /^0[bB][01](?:_?[01])*$/.test(body)
              : /^0[oO]/.test(body)
                ? /^0[oO][0-7](?:_?[0-7])*$/.test(body)
                : big
                  ? /^\d(?:_?\d)*$/.test(body)
                  : /^\d(?:_?\d)*(?:\.\d(?:_?\d)*)?(?:[eE][+-]?\d(?:_?\d)*)?$/.test(body);
        // R25-N9 兄弟表面：区切り入りでも先行ゼロの10進形（0_777／0_777n 等）は
        // 実 Node では SyntaxError（先行ゼロ自体が不可）。整数部が 0 で始まり
        // 2文字以上ある形は、区切りの位置以前にリテラルとして不正。
        const intPart = body.split(/[.eE]/)[0];
        if (!/^0[xXbBoO]/.test(body) && intPart.length > 1 && intPart.startsWith("0"))
          throw new PracticeError(`先行ゼロの数値リテラルは JavaScript では使えません：${raw}`, line, "SyntaxError");
        if (!valid)
          throw new PracticeError(`数値リテラルの区切り（_）の位置が不正です：${raw}`, line, "SyntaxError");
        out.push({ v: body.replaceAll("_", "") + (big ? "n" : ""), k: "number", line });
        i += raw.length;
        continue;
      }
    }
    // RG-51：BigInt リテラル（末尾 n）は JavaScript のみ。通常の数値より先に認識する。
    if (dialect === "js") {
      let bm = source.slice(i).match(/^\d+n(?![\w$])/);
      if (bm) {
        // R25-N9：先行ゼロを持つ10進 BigInt（0777n／08n／00n 等）は実 Node
        // では SyntaxError。正規形は 0n のみで、n なしの 0777 が名指し停止
        // していることと揃え、値を捏造せずリテラルを名指して停止する。
        if (/^0\d/.test(bm[0]))
          throw new PracticeError(
            `先行ゼロの数値リテラルは JavaScript では使えません：${bm[0]}`,
            line,
            "SyntaxError",
          );
        out.push({ v: bm[0], k: "number", line });
        i += bm[0].length;
        continue;
      }
    }
    // R24-N13：JavaScript の不正な数値リテラル（1e／0x／0b2／0o8／1.5n／
    // 0xZZ 等）は、接頭辞だけを通常の数値として切り取り残りを別トークンに
    // 化けさせると、後段で「) が必要です」という虚偽原因になる。字句の
    // 段階でリテラル全体の形を検証し、リテラル自体を名指して停止する
    // （Python エンジンや JS 自身の 1__0 の扱いと一貫させる）。検証だけを
    // 行い、妥当な形の字句化は従来の経路に委ねる。
    // R25-N11：この検証は JS 分岐だけにあり、同じ共有トークナイザを使う
    // 他方言（R／AutoHotkey／Power Fx／C／C++／C#）では不完全なリテラルが
    // 汎用の区切りエラー（虚偽原因）になっていた。検証を各方言へ広げ、
    // 方言ごとの正当な接尾辞・基数形は従来経路（方言専用の名指しを含む）
    // に委ねたまま、不正な形だけをリテラル自体の名指しで停止する。
    // R25-N10（JS 分）：数値リテラル直後の「.＋数字」（1.5.2／1..2／
    // 0b101.5／1e5.5）も末尾検証を素通りしていた。直後が識別子の形
    // （1.5.toString() のメンバーアクセス）は区別して壊さない。
    if (
      ["js", "r", "ahk", "fx", "c", "cpp", "csharp"].includes(dialect) &&
      (/\d/.test(source[i]) || (source[i] === "." && /\d/.test(source[i + 1] || "")))
    ) {
      const rest0 = source.slice(i);
      const wordRe = dialect === "js" ? /^[\w$]+/ : /^\w+/;
      // 基数接頭辞の直後に有効な数字が無い形（0x／0xZZ／0b2／0o8 等）。
      // いずれかの基数で整形されている接頭辞は、方言専用の名指し
      // （R／AutoHotkey の「0b 形式はありません」、Power Fx の「基数
      // リテラルはありません」、C系の「0o 形式は使えません」等）を
      // 持つ従来経路に委ねる。
      const prefix = rest0.match(dialect === "js" ? /^0[xXbBoO][\w$]*/ : /^0[xXbBoO]\w*/)?.[0];
      const prefixValid =
        /^0[xX][0-9a-fA-F]/.test(rest0) ||
        /^0[bB][01]/.test(rest0) ||
        /^0[oO][0-7]/.test(rest0);
      if (prefix && !prefixValid)
        throw new PracticeError(
          `数値リテラルの書き方が不正です：${prefix}`,
          line,
          "SyntaxError",
        );
      // 妥当な核（基数形／10進形＋指数部）の直後に識別子文字が続く形
      // （1.5n／0b102／1e5n／123abc 等）と、指数部が不完全な形（1e／1e+）。
      const core = rest0.match(
        /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/,
      )?.[0];
      if (core) {
        const after = rest0.slice(core.length);
        if (/^[eE][+-]?(?!\d)/.test(after) && !/[.eE]/.test(core.slice(2)) && !/^0[xXbBoO]/.test(core))
          throw new PracticeError(
            `数値リテラルの書き方が不正です：${core}${after.match(/^[eE][+-]?/)?.[0] || ""}`,
            line,
            "SyntaxError",
          );
        // R25-N10：リテラル直後の「.＋数字」はリテラル自体の誤り。
        // C系は16進浮動小数（0x1F.5p3 等）の表面があるため対象外とし、
        // JS／R／AutoHotkey／Power Fx で名指す（「.＋識別子」の正当な
        // メンバーアクセスは数字で始まらないため区別できる）。
        if (
          ["js", "r", "ahk", "fx"].includes(dialect) &&
          /^\.\d/.test(after)
        )
          throw new PracticeError(
            `数値リテラルの書き方が不正です：${core}${after.match(/^\.\d+(?:\.\d+)*/)?.[0] || ""}`,
            line,
            "SyntaxError",
          );
        // C系では、核が「.」で終わり識別子が続く形（10.ToString() 等）の
        // 末尾ドットはメンバーアクセスのドットでありリテラルの一部では
        // ない（R24-N15 の C# 表面。c-family 側の変換も同じ裁定）。
        // C系でのみ末尾検証の対象から外す。JS では実 Node でも
        // 10.toString() はリテラル直後の識別子として SyntaxError に
        // なるため、従来どおり名指す。
        if (
          !(["c", "cpp", "csharp"].includes(dialect) && core.endsWith(".")) &&
          (dialect === "js" ? /^[\w$]/ : /^\w/).test(after)
        ) {
          const token = core + (after.match(wordRe)?.[0] || "");
          // 方言ごとの正当な接尾辞は従来経路に委ねる：JS の BigInt
          // 末尾 n（0x1Fn 等）と型接尾辞（1f 等、専用メッセージあり）、
          // R の L（整数リテラル、専用の未対応名指しあり）と i（複素数
          // リテラルの表面として従来経路に残す）、C／C++／C# の型接尾辞
          // （u／l／ll／ul／f 等。C系は c-family 側の変換で正規化済みの
          // 形がここを通る）。
          const suffixWord = after.match(wordRe)?.[0] || "";
          const exempt =
            dialect === "js"
              ? ((suffixWord === "n" ||
                  /^n(?![\w$])/.test(after)) &&
                  !/[.eE]/.test(core.replace(/^0[xXbBoO]/, ""))) ||
                /^[LfF](?![\w$])/.test(after)
              : dialect === "r"
                ? suffixWord === "L" || suffixWord === "i"
                : dialect === "c" || dialect === "cpp"
                  ? /^(?:[uU](?:[lL]{1,2})?|[lL]{1,2}[uU]?|[fF])$/.test(suffixWord)
                  : dialect === "csharp"
                    ? /^(?:[uU][lL]?|[lL][uU]?|[fFdDmM])$/.test(suffixWord)
                    : false;
          if (!exempt)
            throw new PracticeError(
              `数値リテラルの書き方が不正です：${token}`,
              line,
              "SyntaxError",
            );
        }
      }
    }
    // RG-11：基数リテラル（0x／0b／0o）。対応形式は言語ごとに異なるため、
    // 存在しない形式は値を捏造せず名前を挙げて弾く。
    let rm = source
      .slice(i)
      .match(/^0[xX][0-9a-fA-F]+|^0[bB][01]+|^0[oO][0-7]+/);
    if (rm) {
      let form = rm[0][1].toLowerCase();
      if (dialect === "fx")
        throw new PracticeError(`Power Fx に基数リテラルはありません：${rm[0]}`, line, "SyntaxError");
      if ((dialect === "r" || dialect === "ahk") && form !== "x")
        throw new PracticeError(`${dialect === "r" ? "R" : "AutoHotkey"} に 0${form} 形式の数値リテラルはありません：${rm[0]}`, line, "SyntaxError");
      if (["c", "cpp", "csharp"].includes(dialect) && form === "o")
        throw new PracticeError(`0o 形式の数値リテラルはこの言語では使えません（8進数は先行ゼロで表記します）：${rm[0]}`, line, "SyntaxError");
      // R24-N13 兄弟表面：JavaScript の基数 BigInt リテラル（0x1Fn 等）は
      // 末尾 n までを1トークンとして取り込む（従来は n が別トークンに
      // 化けて「) が必要です」の虚偽原因になっていた）。
      if (dialect === "js" && source[i + rm[0].length] === "n" && !/[\w$]/.test(source[i + rm[0].length + 1] || "")) {
        out.push({ v: rm[0] + "n", k: "number", line });
        i += rm[0].length + 1;
        continue;
      }
      out.push({ v: rm[0], k: "number", line });
      i += rm[0].length;
      continue;
    }
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
        /^(===|!==|%\/%|%%|%in%|<-|->|:=|==|!=|<=|>=|&&=|\|\|=|\?\?=|&&|\|\||\+\+|--|\*\*=|>>>=|\*\*|\+=|-=|\*=|\/=|<<=|<<|>>=|>>>|>>|&=|\|=|\^=|::|=>|<>|\[\[|\]\]|[+\-*\/%^&|!<>=(){}\[\],;:.$?])/,
      );
    if (!m) {
      // RG-61：不可視文字・制御文字は、そのまま出すと原因表示が空に見えるため名指しする。
      if (INVISIBLE_CHAR.test(c) || c.codePointAt(0) < 0x20 || c.codePointAt(0) === 0x7f)
        unsupported(charLabel(c) + "という文字", line);
      unsupported(c, line);
    }
    // RG-39: `[[` / `]]` を単一トークンにするのは R の抽出演算子だけ。
    // 他の方言では `[` `]` 2つとして扱い、入れ子配列リテラルを壊さない。
    if ((m[0] === "[[" || m[0] === "]]") && dialect !== "r") {
      out.push({ v: m[0][0], line });
      i += 1;
      continue;
    }
    // R26-N16：`**` を単一トークンにするのは AutoHotkey（累乗演算子）だけ。
    // 他方言では従来どおり `*` 2つとして扱い、挙動を変えない。
    if (m[0] === "**" && dialect !== "ahk") {
      out.push({ v: "*", line });
      i += 1;
      continue;
    }
    // R27-N8：複合代入トークン（**= ／ &= ／ |= ／ ^= ／ <<= ／ >>= ／ >>>=）を
    // 単一トークンにするのは AutoHotkey だけ。他方言では従来の構成トークン
    // 列へ戻し（先頭の演算子だけを出し、残りは次の周回で字句化する）、
    // トークン列を一切変えない。
    const compoundHeads = {
      "**=": "*", "&=": "&", "|=": "|", "^=": "^",
      "<<=": "<<", ">>=": ">>", ">>>=": ">>>",
    };
    if (compoundHeads[m[0]] !== undefined && dialect !== "ahk") {
      out.push({ v: compoundHeads[m[0]], line });
      i += compoundHeads[m[0]].length;
      continue;
    }
    // R30-N16：論理代入（&&= ／ ||= ／ ??=）を単一トークンにするのは
    // JavaScript だけ。他方言では従来の構成トークン列へ戻し（先頭の
    // 演算子だけを出し、残りは次の周回で字句化する）、トークン列を
    // 一切変えない（C系は c-family 側の変換で別途処理される）。
    const logicalAssignHeads = { "&&=": "&&", "||=": "||", "??=": "?" };
    if (logicalAssignHeads[m[0]] !== undefined && dialect !== "js") {
      out.push({ v: logicalAssignHeads[m[0]], line });
      i += logicalAssignHeads[m[0]].length;
      continue;
    }
    // RG-43: `<-`（R の代入）と `:=`（AutoHotkey の代入）を単一トークンにするのは
    // 所有方言だけ。他の方言では `<` + `-`、`:` + `=` として解釈する。
    if (m[0] === "<-" && dialect !== "r") {
      out.push({ v: "<", line });
      i += 1;
      continue;
    }
    if (m[0] === ":=" && dialect !== "ahk") {
      out.push({ v: ":", line });
      i += 1;
      continue;
    }
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
  // R26-N16：AutoHotkey の累乗 `**` は乗除より強く結合する（公式ドキュメントの
  // 演算子優先順位）。`**` トークンは ahk 方言でしか生成されないため、
  // この表を共有する他方言（Power Fx）の式には現れない。
  "**": 11,
};
// R26-N16：AutoHotkey では `:` は二項演算子ではなく三項演算子の区切り専用。
// 共有表の ":"（連番演算子）を残すと、三項の真側の式が ":" を飲み込んで
// 「: が必要です」という虚偽原因になるため、ahk 方言の表からは除く。
// あわせてシフト `<<` / `>>`（加減算より弱い結合）を表に入れる：従来は
// 表に無く式が途中で切れ、「代入の区切りが必要です」という実態と違う
// 名指しになっていた。評価側はビット演算として名前を挙げて停止する。
const ahkPrec = { ...prec, "<<": 6, ">>": 6 };
delete ahkPrec[":"];
const jsPrec = { "||": 1, "&&": 2, "|": 3, "^": 4, "&": 5,
  "==": 6, "!=": 6, "===": 6, "!==": 6,
  "<": 7, ">": 7, "<=": 7, ">=": 7,
  // RG-51：シフト演算子は関係演算子より強く、加減算より弱く結合する（実 JavaScript の段付け）。
  "<<": 8, ">>": 8, ">>>": 8,
  "+": 9, "-": 9, "*": 10, "/": 10, "%": 10 };
// RG-21／RG-49：R 公式（?Syntax）の段付け。高→低で ^、単項 - +、:、%any%、* /、+ -、
// 比較、!、& &&、| ||。 RG-49 N3 の裁定：%any% は * / より上位（公式表どおり）。
// したがって `2 * 5 %% 3` = 4、`10 %% 3 * 2` = 2 が実 R の値であり、後者は従来どおり正しい。
const rPrec = {
  "||": 2, or: 2,
  "|": 4,
  "&&": 6, and: 6, "&": 6,
  "=": 8, "==": 8, "===": 8, "!=": 8, "!==": 8, "<>": 8,
  "<": 8, ">": 8, "<=": 8, ">=": 8,
  "+": 10, "-": 10,
  "*": 12, "/": 12, "%": 12,
  "%%": 14, "%/%": 14, "%in%": 14,
  ":": 16,
  ".": 17,
  "^": 18,
};
// RG-49（R16-N1）：C 標準の段付け。高→低で * / %、+ -、関係、== !=、&、^、|、&&、||。
// 数値の範囲は c-family 側の既存の前提（キャスト被演算子 expr(9) が二項演算子を
// 吸収しないこと）に合わせ、最も緩い || を 0、最も強い * / % を 8 に収める。
// `<<` / `>>` は式演算子として表に入れない：C++ の cout チェーン解析が
// 区切りとして使うため。C系シフトの扱いは c-family 側の RG-06／RG-54 で決める。
const cPrec = {
  "||": 0, "&&": 1, "|": 2, "^": 3, "&": 4,
  "==": 5, "!=": 5,
  "<": 6, ">": 6, "<=": 6, ">=": 6,
  "+": 7, "-": 7, "*": 8, "/": 8, "%": 8,
};
export class ScriptParser {
  constructor(source, dialect = "js") {
    if (source.length > LIMITS.source)
      throw new PracticeError("コードは100000文字以内にしてください");
    this.ts = tokenize(source, dialect);
    this.i = 0;
    this.dialect = dialect;
    this.depth = 0;
    // R27-N13／N12：式位置の代入式・カンマ演算子を受け付ける文脈かどうか。
    // 文の先頭の対象式（従来どおり文レベルの代入として読む位置）では false
    // のままにし、括弧内・引数・要素・宣言値・代入値などの「代入式が
    // 置ける位置」でのみ exprCtx が true にする。noComma は、カンマが
    // 区切りとして働く文脈（引数・要素・宣言子・代入の右辺）でカンマ
    // 演算子の消費を抑えるカウンタ。
    this.assignOk = false;
    this.noComma = 0;
  }
  // 代入式が置ける文脈として式を読む。noCommaDelta=1 ではカンマを
  // 区切りとして残し、0 では括弧内としてカンマ演算子を許可する。
  exprCtx(noCommaDelta = 1) {
    const sa = this.assignOk,
      sc = this.noComma;
    this.assignOk = true;
    this.noComma = noCommaDelta === 0 ? 0 : sc + 1;
    try {
      return this.expr(0);
    } finally {
      this.assignOk = sa;
      this.noComma = sc;
    }
  }
  // R27-N14：`(` の直後から対応する `)` の直後が `=>` かどうかを先読みする。
  // オブジェクトパターン引数 `({x}) => x` は、内側をオブジェクトリテラル
  // として読み始めると「: が必要です」という虚偽原因になるため、引数
  // リストとして読む前にアロー関数であることを名指しで止める。
  arrowAhead() {
    let depth = 1;
    for (let j = this.i; j < this.ts.length; j++) {
      const v = this.ts[j]?.v;
      if (v === "(" || v === "[" || v === "{") depth++;
      else if (v === ")" || v === "]" || v === "}") {
        depth--;
        if (depth === 0) return this.ts[j + 1]?.v === "=>";
      } else if (v === "<eof>") return false;
    }
    return false;
  }
  peek(v) {
    return this.ts[this.i]?.v === v;
  }
  precTable() {
    if (this.dialect === "js") return jsPrec;
    if (this.dialect === "r") return rPrec;
    if (this.dialect === "ahk") return ahkPrec;
    if (["c", "cpp", "csharp"].includes(this.dialect)) return cPrec;
    return prec;
  }
  // 単項演算子の被演算子が吸収してよい二項演算子の下限（方言の段付け表に合わせる）。
  unaryMin(op) {
    if (this.dialect === "js") return 11;
    if (this.dialect === "r") return op === "!" ? 8 : 17;
    if (this.dialect === "ahk" && op === "not") return 4;
    // C系は c-family.js の expr 上書き（表の最大は 9＝乗除）より上を指定し、
    // 単項演算子の被演算子が二項演算子を吸収しないようにする。
    if (["c", "cpp", "csharp"].includes(this.dialect)) return 10;
    return 9;
  }
  take(v) {
    let t = this.ts[this.i++];
    if (v && t?.v !== v)
      throw new PracticeError(`${v} が必要です`, t?.line || 1);
    return t;
  }
  skip() {
    while (
      (this.ts[this.i]?.v === "\n" && !this.ts[this.i]?.k) ||
      this.peek(";")
    )
      this.i++;
  }
  expr(min = 0) {
    // RG-07（R9-N9／R14B-N2）：被演算子の位置に来た改行は式の継続として読み飛ばす
    // （行末演算子の後の継続、括弧・引数・添字の中の改行）。
    // 区切りトークンは k を持たないことで、内容が改行の文字列トークンと区別する。
    while (this.ts[this.i]?.v === "\n" && !this.ts[this.i]?.k) this.i++;
    if (++this.depth > LIMITS.depth)
      throw new PracticeError("式の入れ子が深すぎます", this.ts[this.i]?.line);
    let t = this.take(),
      a;
    if (!t) throw new PracticeError("式が必要です");
    // RG-07（R11-N8）：スプレッド構文は対象を名指して停止する。
    if (
      t.v === "." &&
      this.ts[this.i]?.v === "." &&
      this.ts[this.i + 1]?.v === "."
    )
      unsupported("スプレッド構文（...）", t.line);
    let meta = { line: t.line };
    if (t.k === "number" && this.dialect === "js" && /[LfF]$/.test(t.v) && !/^0[xXbBoO]/.test(t.v))
      throw new PracticeError("JavaScriptに数値の型接尾辞はありません", t.line, "SyntaxError");
    if (t.k === "number") {
      let raw = t.v,
        value;
      // RG-51：BigInt リテラルは BigInt 値として保持する。
      // R24-N13：基数形（0x1Fn／0b101n／0o17n）も BigInt として保持する。
      if (this.dialect === "js" && /^(?:\d+|0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+)n$/.test(raw))
        value = BigInt(raw.slice(0, -1));
      // RG-11：C／C++ の先行ゼロは8進数。8・9 を含むものは不正な8進リテラルとして弾く。
      else if (["c", "cpp"].includes(this.dialect) && /^0[0-7]+$/.test(raw))
        value = parseInt(raw, 8);
      else if (["c", "cpp"].includes(this.dialect) && /^0\d+$/.test(raw))
        throw new PracticeError(`不正な8進数リテラルです：${raw}`, t.line, "SyntaxError");
      else if (this.dialect === "js" && /^0\d/.test(raw))
        throw new PracticeError(`先行ゼロの数値リテラルは JavaScript では使えません：${raw}`, t.line, "SyntaxError");
      // 基数リテラルの末尾の英字は接尾辞ではないので削らない。
      else value = Number(/^0[xXbBoO]/.test(raw) ? raw : raw.replace(/[LfF]$/, ""));
      a = { ...meta, k: "literal", value, raw };
    }
    else if (t.k === "string") a = { ...meta, k: "literal", value: t.v, quote: t.quote };
    else if (t.v === "sizeof" && this.parseSizeof?.()) a = this.parseSizeof(meta, true);
    else if (["!", "not", "-", "+", "&", "*", ...(this.dialect === "js" ? ["typeof", "void", "delete"] : []), ...(["c", "cpp"].includes(this.dialect) ? ["sizeof"] : [])].includes(t.v))
      a = { ...meta, k: "unary", op: t.v, arg: this.expr(this.unaryMin(t.v)) };
    else if (t.v === "(") {
      a = this.parseCast?.(meta);
      if (!a) {
        // R27-N14：引数がオブジェクトパターン等のアロー関数は、内側を
        // 読み始める前に先読みで名指しする（虚偽原因の回避）。
        if (this.dialect === "js" && this.arrowAhead())
          unsupported("アロー関数（=>）", t.line);
        a = this.exprCtx(0);
        this.skipLines();
        this.take(")");
      }
    } else if (t.v === "[") {
      // R27-N13：式位置の配列分割代入（[a] = [1] 等）。代入式が置ける
      // 文脈では、配列リテラルとして読む前にパターンを投機的に読み、
      // 直後が = の場合だけ分割代入式として採用する。不採用なら位置を
      // 戻して従来どおり配列リテラルとして読む。
      let destructure = null;
      if (this.dialect === "js" && this.assignOk) {
        const saveI = this.i,
          saveD = this.depth;
        let pattern = null;
        try {
          pattern = this.parseArrayPattern(t.line);
        } catch (e) {
          // R28-N15／R29-N30：RG-227 の名指し（残余への既定値・裸の
          // 残余）は、投機的パターン読みの全ての式位置で伝播させる。
          // バッチ7では「閉じ括弧の直後が = の場合」に限ったため、
          // オブジェクト値・三項分岐・論理演算・呼出引数・入れ子要素
          // 等では名指しが届かず「スプレッド構文」等に化けていた。
          // 残余名指しエラーは `...対象 = 既定値`／裸の `...` という
          // パターン専用の断片からしか生じないため、位置によらず
          // そのまま伝播させてよい。本物のスプレッド（`...[1]` 等、
          // パターン読みで名指しエラーを生じない形）は従来どおり
          // リテラルとして読み直され「スプレッド構文」の名指しを保つ。
          if (this.isRestNamingError(e)) throw e;
          pattern = null;
        }
        if (pattern && this.peek("=")) {
          this.checkPattern(pattern, false, t.line);
          this.take("=");
          destructure = {
            ...meta,
            k: "destructureExpr",
            pattern,
            value: this.exprCtx(1),
          };
        } else {
          this.i = saveI;
          this.depth = saveD;
        }
      }
      if (destructure) a = destructure;
      else {
        // RG-07（R14B-N2）：括弧の中の改行は継続として読み飛ばす。
        let values = [];
        this.skipLines();
        while (!this.peek("]")) {
          values.push(this.exprCtx(1));
          this.skipLines();
          if (!this.peek(",")) break;
          this.take();
          this.skipLines();
        }
        this.take("]");
        a = { ...meta, k: "array", values };
      }
    } else if (t.v === "{") {
      // R27-N13：式位置のオブジェクト分割代入（{a} = obj 等）。配列形と
      // 同じく投機的にパターンを読み、直後が = の場合だけ採用する。
      let destructure = null;
      if (this.dialect === "js" && this.assignOk) {
        const saveI = this.i,
          saveD = this.depth;
        let pattern = null;
        try {
          pattern = this.parseObjectPattern(t.line);
        } catch (e) {
          // R28-N15／R29-N30：配列形と同じく、RG-227 の名指しを全ての
          // 式位置で伝播させる（従来は握り潰されてレコードとして読み
          // 直され「レコードのフィールド名が必要です」等の虚偽原因に
          // なっていた。オブジェクト値に内包された {...r = {}} 等）。
          if (this.isRestNamingError(e)) throw e;
          pattern = null;
        }
        if (pattern && this.peek("=")) {
          this.checkPattern(pattern, false, t.line);
          this.take("=");
          destructure = {
            ...meta,
            k: "destructureExpr",
            pattern,
            value: this.exprCtx(1),
          };
        } else {
          this.i = saveI;
          this.depth = saveD;
        }
      }
      if (destructure) a = destructure;
      else {
        let entries = [];
        this.skipLines();
        while (!this.peek("}")) {
          // R30-N14：JavaScript のオブジェクトリテラル内スプレッド
          // {...式}。従来は先頭の "." をフィールド名として読もうとして
          // 「レコードのフィールド名が必要です」という虚偽原因になって
          // いた（RG-291 の到達範囲の取り残し）。ECMA-262 の
          // CopyDataProperties 意味論で実装する：元オブジェクトの自分自身
          // の列挙可能なプロパティを、定義順に、新しいオブジェクトへ
          // シャローコピーする（評価は read 側の record 分岐）。
          if (
            this.dialect === "js" &&
            this.ts[this.i]?.v === "." &&
            this.ts[this.i + 1]?.v === "." &&
            this.ts[this.i + 2]?.v === "."
          ) {
            const spreadLine = this.ts[this.i].line;
            this.take();
            this.take();
            this.take();
            entries.push({ spread: this.exprCtx(1), line: spreadLine });
            this.skipLines();
            if (!this.peek(",")) break;
            this.take();
            this.skipLines();
            continue;
          }
          let key = this.take();
          if (!["id", "string"].includes(key.k))
            throw new PracticeError("レコードのフィールド名が必要です", key.line);
          this.take(":");
          entries.push([key.v, this.exprCtx(1)]);
          this.skipLines();
          if (!this.peek(",")) break;
          this.take();
          this.skipLines();
        }
        this.take("}");
        a = { ...meta, k: "record", entries };
      }
    } else if (t.v === "if") {
      // RG-07（R13-N12）：R の if は値を返す式として使える。他方言の式位置の if は名指しで停止する。
      if (this.dialect !== "r") unsupported("式の位置の if", t.line);
      this.take("(");
      let test = this.expr();
      this.take(")");
      let branch = () => {
        this.skipLines();
        if (this.peek("{")) {
          this.take();
          this.skipLines();
          let inner = this.expr();
          this.skipLines();
          if (!this.peek("}"))
            unsupported("値としての if 式の複数文ブロック", t.line);
          this.take("}");
          return inner;
        }
        return this.expr();
      };
      let then = branch(),
        save = this.i;
      // R30-N13：R では文が完結した後の改行 else は parse error
      // （"unexpected else"）であり、else は if と同じ行（同じ式の中）
      // に無ければならない（R Language Definition の制御構造／
      // ?Control の "you should not have a newline between } and else"）。
      // 改行を読み飛ばして else を結ぶのは他方言だけにする。
      if (this.dialect !== "r") this.skipLines();
      let otherwise = null;
      if (this.peek("else")) {
        this.take();
        otherwise = branch();
      } else this.i = save;
      a = { ...meta, k: "ifexpr", test, then, otherwise };
    } else if (t.k === "id") a = { ...meta, k: "var", name: t.v };
    else throw new PracticeError(`式を解釈できません：${t.v}`, t.line);
    while (true) {
      // RG-07 追加表面（R21-N10 同根）：行頭の二項演算子は式の継続として扱う
      // （JS／C系の実物どおり）。改行の後ろに二項演算子か ? が続く場合だけ
      // 改行を消費する。R は改行自体が文の区切りなので対象外。
      if (
        ["js", "c", "cpp", "csharp"].includes(this.dialect) &&
        this.ts[this.i]?.v === "\n"
      ) {
        let j = this.i;
        while (this.ts[j]?.v === "\n") j++;
        const nv = this.ts[j]?.v;
        if (nv === "?" || this.precTable()[nv] !== undefined) this.i = j;
      }
      let next = this.ts[this.i],
        v = next?.v;
      if (v === "(") {
        // 呼び出しは後置演算として全方言で最も強く結合する。二項演算子の
        // 被演算子の文脈（min が大きい場合）でも束縛を妨げない。
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
          let arg = this.exprCtx(1);
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
        this.skipLines();
        while (this.peek(",")) {
          this.take();
          indexes.push(this.peek("]") ? null : this.expr());
          this.skipLines();
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
      // RG-50（R16-N7）：Power Fx の And／Or は大文字始まりの綴りでも演算子として扱う。
      if (this.dialect === "fx" && next?.k === "id" && /^(and|or)$/i.test(v))
        v = v.toLowerCase();
      // RG-50（R16-N8）：Power Fx の % は後置のパーセント演算子（50% = 0.5）。
      if (this.dialect === "fx" && v === "%") {
        this.take();
        a = { k: "percent", arg: a, line: a.line };
        continue;
      }
      // RG-07（R8-N6）：Power Fx の in／exactin は二項演算子として解析する（評価は種類側）。
      if (this.dialect === "fx" && next?.k === "id" && /^(in|exactin)$/i.test(v)) {
        if (4 < min) break;
        this.take();
        let b = this.expr(5);
        a = { k: "binary", op: v.toLowerCase(), a, b, line: a.line };
        continue;
      }
      if (v === "?") {
        // RG-51／RG-06：null 合体（??）は JS／C# の演算子として評価する。
        if (
          ["js", "csharp"].includes(this.dialect) &&
          this.ts[this.i + 1]?.v === "?"
        ) {
          if (min > 1) break;
          this.take();
          this.take();
          let b = this.expr(1);
          a = { k: "nullish", a, b, line: a.line };
          continue;
        }
        if (this.ts[this.i + 1]?.v === ".")
          unsupported("オプショナルチェーン（?.）", next.line);
        // RG-06：条件演算子（?:）は JS／C系で評価する。他方言では ? を名指しで弾く経路に落とす。
        // R26-N16：AutoHotkey v2 にも正式な三項演算子 ?: がある（公式ドキュメントの
        // 演算子表）。従来は ahk が対象外で break し、呼び出し側の「) が必要です」等の
        // 虚偽原因になっていたため、ahk 方言でも条件演算子として解析する。
        if (!["js", "c", "cpp", "csharp", "ahk"].includes(this.dialect)) break;
        if (min > 0) break;
        this.take();
        let then = this.exprCtx(1);
        this.take(":");
        let otherwise = this.exprCtx(1);
        a = { k: "cond", test: a, then, otherwise, line: a.line };
        continue;
      }
      // RG-07（R9-N5）：アロー関数は対象を名指して停止する。
      if (v === "=>") unsupported("アロー関数（=>）", next.line);
      // R24-N15（JS 部分）：in／instanceof は JavaScript の二項演算子だが
      // このモデルでは未対応。演算子の位置に現れたら、優先順位表に無い
      // ことを理由に素通りして後段の「) が必要です」等の虚偽原因にせず、
      // 演算子自体を名指して停止する。
      if (
        this.dialect === "js" &&
        next?.k === "id" &&
        (v === "in" || v === "instanceof")
      )
        unsupported(`${v} 演算子`, next.line);
      let p = this.precTable()[v];
      if (
        p === undefined ||
        p < min ||
        (v === "=" && !["fx", "ahk"].includes(this.dialect))
      )
        break;
      this.take();
      // R26-N16：`**`（AutoHotkey の累乗）は `^` と同じく右結合。
      let b = this.expr(p + (v === "^" || v === "**" ? 0 : 1));
      a = { k: "binary", op: v, a, b, line: a.line };
    }
    // R27-N13／N12／N8：代入式とカンマ演算子。代入は式としても置ける
    // （JavaScript の代入式、AutoHotkey の右結合の連鎖代入 `x := y := 5`、
    // 公式ドキュメントの代入演算子表）。文の先頭では従来どおり文レベル
    // の代入として読むため、ここは exprCtx で開かれた文脈（assignOk）
    // かつ最外の式（min=0）に限る。カンマ演算子は JavaScript の最も
    // 弱い演算子として実装する（区切りのカンマと競合する文脈では
    // noComma が消費を抑える）。
    if (
      min === 0 &&
      this.assignOk &&
      (this.dialect === "js" || this.dialect === "ahk")
    ) {
      const assignOpsHere =
        this.dialect === "js"
          ? ["=", "+=", "-=", "*=", "/=", "&&=", "||=", "??="]
          : [":=", "+=", "-=", "*=", "/=", "&=", "|=", "^=", "<<=", ">>=", ">>>="];
      if (assignOpsHere.includes(this.ts[this.i]?.v)) {
        const op = this.take().v;
        if (!["var", "member", "index"].includes(a.k)) {
          const form =
            {
              literal: "リテラル",
              call: "関数呼び出しの結果",
              binary: "演算の結果",
              unary: "単項演算の結果",
              cond: "条件式の結果",
              array: "配列リテラル",
              record: "オブジェクトリテラル",
              post: "++ / -- の結果",
              comma: "カンマ式の結果",
              destructureExpr: "分割代入の結果",
            }[a.k] || "この式";
          throw new PracticeError(
            `代入先が不正です：${form}には代入できません（Invalid left-hand side in assignment）`,
            a.line,
            "SyntaxError",
          );
        }
        a = {
          k: "assignExpr",
          target: a,
          op,
          value: this.exprCtx(1),
          line: a.line,
        };
      }
      if (this.dialect === "js" && !this.noComma && this.peek(",")) {
        let left = a;
        while (this.peek(",")) {
          this.take();
          left = {
            k: "comma",
            a: left,
            b: this.exprCtx(1),
            line: left.line,
          };
        }
        a = left;
      }
    }
    this.depth--;
    return a;
  }
  skipLines() {
    while (this.ts[this.i]?.v === "\n" && !this.ts[this.i]?.k) this.take();
  }
  // R26-N7：JavaScript の分割代入パターン（[ … ] / { … }）を読む。
  // 文位置では式文の配列・オブジェクトリテラルと区別がつかないため、
  // 呼び出し側が位置を保存して投機的に読み、直後に = が続く場合だけ
  // 分割代入として採用する。パターンとして不正な要素（リテラル・呼び出し
  // 結果・キーワード等）は invalid に記録し、採用時に Invalid LHS で
  // 名指す（実 Node の SyntaxError と同じ帰属にする）。
  parsePatternRoot(line) {
    if (this.peek("[")) {
      this.take();
      return this.parseArrayPattern(line);
    }
    this.take("{");
    return this.parseObjectPattern(line);
  }
  // R28-N15／R29-N30：RG-227 の名指しエラー（残余要素への既定値・
  // 裸の残余）か。投機的なパターン読みでこのエラーが生じるのは
  // `...対象 = 既定値`／裸の `...` というパターン専用の断片だけであり、
  // 本物のスプレッド要素（`...式`）のパターン読みはこのエラーを生じ
  // ない。そのためバッチ7の「閉じ括弧の直後が = の場合だけ伝播」と
  // いう条件（patternFollowedByAssign）は R29-N30 で撤廃し、全ての
  // 式位置でそのまま伝播させる（宣言位置の帰属と揃える）。
  isRestNamingError(e) {
    return (
      e instanceof PracticeError &&
      typeof e.message === "string" &&
      e.message.includes("分割代入の残余要素（...）")
    );
  }
  parseArrayPattern(line) {
    const pattern = { k: "arrayPattern", elements: [], invalid: null, line };
    while (true) {
      this.skipLines();
      if (this.peek("]")) {
        this.take();
        return pattern;
      }
      if (this.peek(",")) {
        this.take();
        pattern.elements.push(null);
        continue;
      }
      const el = this.parsePatternElement(line, pattern);
      pattern.elements.push(el);
      this.skipLines();
      if (this.peek(",")) {
        this.take();
        continue;
      }
      this.take("]");
      return pattern;
    }
  }
  parseObjectPattern(line) {
    const pattern = { k: "objectPattern", props: [], invalid: null, line };
    while (true) {
      this.skipLines();
      if (this.peek("}")) {
        this.take();
        return pattern;
      }
      if (
        this.ts[this.i]?.v === "." &&
        this.ts[this.i + 1]?.v === "." &&
        this.ts[this.i + 2]?.v === "."
      ) {
        this.take();
        this.take();
        this.take();
        // R27-N14：裸の `...`（受け先が無い残余）は、汎用の式エラーでは
        // なく残余要素そのものを名指して止める。
        if ([",", "}", "<eof>"].includes(this.ts[this.i]?.v))
          throw new PracticeError(
            "分割代入の残余要素（...）には代入先が必要です",
            line,
            "SyntaxError",
          );
        const target = this.parsePatternTarget(line, pattern);
        // R27-N14：残余要素への既定値は文法上置けない（実 Node も
        // SyntaxError）。「} が必要です」等の虚偽原因にしない。
        if (this.peek("="))
          throw new PracticeError(
            "分割代入の残余要素（...）には既定値を指定できません",
            line,
            "SyntaxError",
          );
        pattern.props.push({ rest: true, target });
      } else if (this.peek("[")) {
        // 計算済みキーは記録し、採用時に名前を挙げて停止する。
        if (!pattern.invalid) pattern.invalid = "computed-key";
        this.take();
        this.expr();
        this.take("]");
        this.take(":");
        const el = this.parsePatternElement(line, pattern);
        pattern.props.push({ key: null, ...el });
      } else {
        const keyTok = this.take();
        if (!["id", "string", "number"].includes(keyTok.k))
          throw new PracticeError("分割代入のキーが必要です", keyTok.line);
        const key = keyTok.k === "number" ? String(keyTok.v) : keyTok.v;
        if (this.peek(":")) {
          this.take();
          const el = this.parsePatternElement(line, pattern);
          pattern.props.push({ key, ...el });
        } else {
          if (keyTok.k !== "id")
            throw new PracticeError("分割代入のキーが必要です", keyTok.line);
          const target = { k: "var", name: key, line: keyTok.line };
          if (
            ["true", "false", "null", "this"].includes(key) &&
            !pattern.invalid
          )
            pattern.invalid = target;
          const prop = { key, target };
          if (this.peek("=")) {
            this.take();
            prop.default = this.exprCtx(1);
          }
          pattern.props.push(prop);
        }
      }
      this.skipLines();
      if (this.peek(",")) {
        this.take();
        continue;
      }
      this.take("}");
      return pattern;
    }
  }
  parsePatternElement(line, pattern) {
    if (
      this.ts[this.i]?.v === "." &&
      this.ts[this.i + 1]?.v === "." &&
      this.ts[this.i + 2]?.v === "."
    ) {
      this.take();
      this.take();
      this.take();
      // R27-N14：裸の `...`（受け先が無い残余）は残余要素そのものを
      // 名指して止める。残余への既定値も同様に名指す（実 Node は
      // いずれも SyntaxError で、既定値は Rest 要素の文法に無い）。
      if ([",", "]", "}", "<eof>"].includes(this.ts[this.i]?.v))
        throw new PracticeError(
          "分割代入の残余要素（...）には代入先が必要です",
          line,
          "SyntaxError",
        );
      // 残余の受け先は識別子・プロパティ・添字のほか、入れ子のパターン
      // （...[a, b] / ...{x}）も実 JavaScript では合法（Node 実測）。
      let target;
      if (this.peek("[")) {
        this.take();
        target = this.parseArrayPattern(line);
      } else if (this.peek("{")) {
        this.take();
        target = this.parseObjectPattern(line);
      } else target = this.parsePatternTarget(line, pattern);
      if (this.peek("="))
        throw new PracticeError(
          "分割代入の残余要素（...）には既定値を指定できません",
          line,
          "SyntaxError",
        );
      return { target, rest: true };
    }
    let target;
    if (this.peek("[")) {
      this.take();
      target = this.parseArrayPattern(line);
    } else if (this.peek("{")) {
      this.take();
      target = this.parseObjectPattern(line);
    } else target = this.parsePatternTarget(line, pattern);
    if (this.peek("=")) {
      this.take();
      const def = this.exprCtx(1);
      return { target, default: def };
    }
    return { target };
  }
  parsePatternTarget(line, pattern) {
    // R27-N13：パターンの代入先そのものは代入式として読まない（既定値の
    // `=` を代入演算子と取り違えないため、assignOk を一時的に閉じる）。
    const saveAssign = this.assignOk;
    this.assignOk = false;
    let target;
    try {
      target = this.expr();
    } finally {
      this.assignOk = saveAssign;
    }
    if (
      !["var", "member", "index"].includes(target.k) &&
      !pattern.invalid
    )
      pattern.invalid = target;
    if (
      target.k === "var" &&
      ["true", "false", "null", "this"].includes(target.name) &&
      !pattern.invalid
    )
      pattern.invalid = target;
    return target;
  }
  // 採用が決まったパターンの検証。不正な代入先・残余要素の位置・
  // 宣言位置で使えないプロパティ／添字ターゲットを名指しで停止する。
  checkPattern(pattern, declaring, line) {
    if (pattern.invalid === "computed-key")
      unsupported("分割代入の計算済みキー", line);
    if (pattern.invalid) {
      const inv = pattern.invalid;
      const form =
        inv.k === "var"
          ? `${inv.name} には`
          : `${
              {
                literal: "リテラル",
                call: "関数呼び出しの結果",
                binary: "演算の結果",
                unary: "単項演算の結果",
                cond: "条件式の結果",
                array: "配列リテラル",
                record: "オブジェクトリテラル",
                post: "++ / -- の結果",
              }[inv.k] || "この式"
            }には`;
      throw new PracticeError(
        `代入先が不正です：${form}代入できません（Invalid left-hand side in assignment）`,
        line,
        "SyntaxError",
      );
    }
    const els =
      pattern.k === "arrayPattern" ? pattern.elements : pattern.props;
    els.forEach((el, idx) => {
      if (!el) return;
      if (el.rest && idx !== els.length - 1)
        throw new PracticeError(
          "分割代入の残余要素（...）は最後に置く必要があります",
          line,
          "SyntaxError",
        );
      const t = el.target;
      if (t?.k === "arrayPattern" || t?.k === "objectPattern")
        this.checkPattern(t, declaring, line);
      else if (declaring && t && t.k !== "var")
        throw new PracticeError(
          "代入先が不正です：宣言の分割代入ではプロパティや添字へは代入できません（Invalid left-hand side in assignment）",
          line,
          "SyntaxError",
        );
    });
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
    const stmt = this.statement();
    // R29-N29：波括弧なしの単一文本体では、本体文を終端する ; は本体
    // 自身に属する（ECMAScript の ExpressionStatement 等は ; を含む）。
    // 従来は ; が呼び出し側に残り、if の else 照合・do-while の while
    // 照合が ; に阻まれて「未対応：x」「while が必要です」等の虚偽原因
    // になっていた。本体側で ; を消費すれば、else／else if／while の
    // 照合が実文法どおりに働く（波括弧あり本体の後ろの ; は従来どおり
    // 空文として扱われ、else とは結ばない）。
    // R30-N13：R では ; も文の完結であり、その後の else は実 R でも
    // parse error になるため、R では ; を消費せず文の区切りとして残す
    // （後続の else は対応する if のない else として名指される）。
    if (this.dialect !== "r" && this.peek(";")) this.take();
    return [stmt];
  }
  statement() {
    this.skip();
    let t = this.ts[this.i],
      line = t.line,
      v = t.v;
    // R30-N13：文頭の else は、直前の if に結ばれなかった孤立した else
    // である。実 R では "unexpected else" の parse error、JavaScript
    // でも SyntaxError であり、対象（else 自身）を名指して停止する
    // （従来は式文として読み進めて別のトークンを原因にしていた）。
    if (v === "else")
      throw new PracticeError(
        this.dialect === "r"
          ? "対応する if のない else です（R では else は if と同じ行に書きます）"
          : "対応する if のない else です",
        line,
        "SyntaxError",
      );
    if (v === "if") {
      this.take();
      let test;
      if (this.peek("(")) {
        this.take();
        test = this.exprCtx(1);
        this.take(")");
      } else test = this.exprCtx(1);
      let body = this.body();
      // R30-N13：R では改行を跨いだ else を結ばない（式位置の if と同じ
      // 規則。実 R では文が完結した後の else は "unexpected else" の
      // parse error）。他方言は従来どおり改行を読み飛ばす。
      if (this.dialect !== "r") this.skipLines();
      let otherwise = [];
      if (this.peek("else")) {
        this.take();
        otherwise = this.peek("if") ? [this.statement()] : this.body();
      }
      return { k: "if", test, body, otherwise, line, refs: ["if"] };
    }
    if (v === "do") {
      // RG-06：do-while は末尾条件のループ（postTest）として実行する。対応しない方言では名指しで停止する。
      if (!["js", "c", "cpp", "csharp"].includes(this.dialect))
        unsupported("do-while", line);
      this.take();
      let body = this.body();
      this.skipLines();
      this.take("while");
      this.take("(");
      let test = this.exprCtx(1);
      this.take(")");
      if (this.peek(";")) this.take();
      return { k: "while", test, body, line, postTest: true, refs: ["while"] };
    }
    // RG-06：switch は対象を名指して正直に停止する（無言の無視や誤った実行をしない）。
    if (v === "switch") unsupported("switch 文", line);
    if (v === "while") {
      this.take();
      let test;
      if (this.dialect === "ahk" && !this.peek("(")) test = this.exprCtx(1);
      else {
        this.take("(");
        test = this.exprCtx(1);
        this.take(")");
      }
      return { k: "while", test, body: this.body(), line, refs: ["while"] };
    }
    if (v === "repeat" || v === "Loop") {
      // RG-43（R15-N3）：repeat は R、Loop は AutoHotkey の構文。他方言では正直に停止する。
      if (v === "repeat" && this.dialect !== "r") unsupported("repeat", line);
      if (v === "Loop" && this.dialect !== "ahk") unsupported("Loop", line);
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
      let test = this.peek(";") ? { k: "literal", value: true, line } : this.exprCtx(1);
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
      // RG-43（R15-N3）：next は R の構文。return は JavaScript／Power Fx の文としては存在しない。
      if (v === "next" && this.dialect !== "r") unsupported("next", line);
      if (v === "return" && ["js", "fx"].includes(this.dialect))
        unsupported("return", line);
      this.take();
      let value = null;
      if (
        v === "return" &&
        ![";", "\n", "}", "<eof>"].includes(this.ts[this.i]?.v)
      )
        value = this.exprCtx(1);
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
      // R27-N11：JavaScript の複数宣言子（let a = 1, b = 2; 等）。宣言
      // パーサが宣言子を1つしか読まず、カンマを「宣言の区切りが必要
      // です」という虚偽原因で止めていた。ECMAScript の LexicalDeclaration
      // ／VariableDeclarationList はカンマ区切りの宣言子列が正規の文法
      // であり、for 初期化部でも同じ列が使える。宣言子を列として読み、
      // 1個だけの場合は従来の declare／declarePattern ノードをそのまま
      // 返して既存の実行経路を変えない。他方言は従来どおり1個だけ。
      const declarators = [];
      while (true) {
        let pointer = false;
        if (this.peek("*")) {
          this.take();
          pointer = true;
        }
        let name = this.take();
        // RG-07：分割代入は対象を名指して停止する（汎用の「変数名が必要です」に化けさせない）。
        // R26-N7：JavaScript 方言では宣言の分割代入も文位置と同じ機構で実装する。
        // 他方言では従来どおり対象を名指して停止する。
        if (name.v === "[" || name.v === "{") {
          if (kind !== "js") unsupported("分割代入", line);
          const pattern =
            name.v === "["
              ? this.parseArrayPattern(line)
              : this.parseObjectPattern(line);
          this.checkPattern(pattern, true, line);
          if (["of", "in"].includes(this.ts[this.i]?.v))
            unsupported("分割代入（for-of / for-in の反復変数）", line);
          if (!this.peek("="))
            throw new PracticeError(
              "分割代入の宣言には初期化式（= の右辺）が必要です",
              line,
              "SyntaxError",
            );
          this.take();
          declarators.push({ pattern, value: this.exprCtx(1) });
        } else {
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
            // RG-07（R12-N6）：{ } の初期化子は C系の配列初期化だけ。他方言（JS）の
            // レコードリテラルは通常の式として読む。
            if (this.peek("{") && ["c", "cpp", "csharp"].includes(kind)) {
              this.take();
              let vals = [];
              while (!this.peek("}")) {
                vals.push(this.expr());
                if (!this.peek(",")) break;
                this.take();
              }
              this.take("}");
              value = { k: "array", values: vals, line };
            } else value = this.exprCtx(1);
          }
          declarators.push({ name: name.v, pointer, size, value });
        }
        if (kind === "js" && this.peek(",")) {
          this.take();
          continue;
        }
        break;
      }
      if (!["\n", ";", ")", "}", "<eof>"].includes(this.ts[this.i]?.v))
        unsupported("宣言の区切りが必要です", line);
      if (declarators.length === 1) {
        const d = declarators[0];
        if (d.pattern)
          return {
            k: "declarePattern",
            name: null,
            type,
            pattern: d.pattern,
            value: d.value,
            line,
            refs: [type],
          };
        return {
          k: "declare",
          name: d.name,
          type,
          pointer: d.pointer,
          size: d.size,
          value: d.value,
          line,
          refs: [type],
        };
      }
      return { k: "declareList", type, declarators, line, refs: [type] };
    }
    // R26-N7：文位置の分割代入（JavaScript 方言のみ）。`[` で始まる文は
    // 式文の配列リテラルでもありうるため、パターンを投機的に読み、直後が
    // = の場合だけ分割代入として採用する。括弧で包んだ ([…] = …) /
    // ({…} = …) も同じ扱いにする。不採用の場合は位置を戻して通常の
    // 式文として読み直すため、配列リテラル式文等の挙動は変わらない。
    if (
      this.dialect === "js" &&
      (this.peek("[") ||
        (this.peek("(") && ["[", "{"].includes(this.ts[this.i + 1]?.v)))
    ) {
      const save = this.i,
        saveDepth = this.depth,
        paren = this.peek("(");
      if (paren) this.take();
      let pattern = null;
      try {
        pattern = this.parsePatternRoot(line);
      } catch (e) {
        // R28-N15／R29-N30：文位置でも RG-227 の名指しを式位置と
        // 一貫して伝播させる（伝播条件は expr 側と同一）。
        if (this.isRestNamingError(e)) throw e;
        pattern = null;
      }
      if (pattern && this.peek("=")) {
        this.checkPattern(pattern, false, line);
        this.take();
        const value = this.exprCtx(1);
        if (paren && this.peek(",")) {
          // R28-N14：文位置の括弧グループで、先頭要素が分割代入の
          // シーケンス（([a] = [1], x = 2) 等）は、括弧内のカンマも
          // カンマ演算子として読む。従来は単独形しか想定しておらず、
          // 最初の代入の直後のカンマで「) が必要です」という虚偽原因
          // になっていた（括弧は揃っている）。括弧の外側のカンマ列も
          // 従来どおり式文のカンマ演算子として続ける。
          let left = { k: "destructureExpr", pattern, value, line };
          while (this.peek(",")) {
            this.take();
            left = { k: "comma", a: left, b: this.exprCtx(1), line };
          }
          this.take(")");
          while (this.peek(",")) {
            this.take();
            left = { k: "comma", a: left, b: this.exprCtx(1), line };
          }
          if (
            !["\n", ";", "}", ")", "<eof>", "else"].includes(this.ts[this.i]?.v)
          )
            unsupported("代入の区切りが必要です", line);
          return { k: "expression", value: left, line };
        }
        if (paren) this.take(")");
        // R27-N12：文頭のカンマ列はカンマ演算子（式文）として続ける。
        if (this.dialect === "js" && this.peek(",")) {
          let left = { k: "destructureExpr", pattern, value, line };
          while (this.peek(",")) {
            this.take();
            left = { k: "comma", a: left, b: this.exprCtx(1), line };
          }
          if (
            !["\n", ";", "}", ")", "<eof>", "else"].includes(this.ts[this.i]?.v)
          )
            unsupported("代入の区切りが必要です", line);
          return { k: "expression", value: left, line };
        }
        if (
          !["\n", ";", "}", ")", "<eof>", "else"].includes(this.ts[this.i]?.v)
        )
          unsupported("代入の区切りが必要です", line);
        return { k: "destructure", pattern, value, line };
      }
      this.i = save;
      this.depth = saveDepth;
    }
    let target = this.expr();
    // RG-43：代入演算子は方言ごとに限定する（他方言の演算子の無言受理を防ぐ）。
    const assignOps = {
      // R30-N16：JavaScript の論理代入（&&= ／ ||= ／ ??=）を追加。
      js: ["=", "+=", "-=", "*=", "/=", "&&=", "||=", "??="],
      r: ["=", "<-", "+=", "-=", "*=", "/="],
      // R27-N8：AutoHotkey v2 公式の代入演算子表にある複合代入を追加。
      // **= は公式の代入演算子表に無いため含めない（式位置では ** の
      // 二項演算として読まれ、代入先の検証で名前を挙げて止まる）。
      ahk: [":=", "=", "+=", "-=", "*=", "/=", "&=", "|=", "^=", "<<=", ">>=", ">>>="],
      fx: ["=", "+=", "-=", "*=", "/="],
      c: ["=", "+=", "-=", "*=", "/="],
      cpp: ["=", "+=", "-=", "*=", "/="],
      csharp: ["=", "+=", "-=", "*=", "/="],
    }[this.dialect] || ["=", "+=", "-=", "*=", "/="];
    if (assignOps.includes(this.ts[this.i]?.v)) {
      let op = this.take().v,
        value = this.exprCtx(1);
      // R27-N12／AHK カンマ列：代入に続くカンマ列は、JavaScript では
      // カンマ演算子の式文として、AutoHotkey v2 では公式の
      // multi-statement（カンマ）として、順に評価する式文へ畳む。
      if (
        (this.dialect === "js" || this.dialect === "ahk") &&
        this.peek(",")
      ) {
        let left = { k: "assignExpr", target, op, value, line };
        while (this.peek(",")) {
          this.take();
          left = { k: "comma", a: left, b: this.exprCtx(1), line };
        }
        if (!["\n", ";", "}", ")", "<eof>", "else"].includes(this.ts[this.i]?.v))
          unsupported("代入の区切りが必要です", line);
        return { k: "expression", value: left, line };
      }
      // RG-79（R21-N11）：代入文の直後も宣言・式文と同じく終端を検査する。
      // 同一行に区切りなく次の文が続く形（x <- 1 y <- 2）を無言で実行しない。
      // 波形なし if の代入体に続く else は終端として認める。
      if (!["\n", ";", "}", ")", "<eof>", "else"].includes(this.ts[this.i]?.v))
        unsupported("代入の区切りが必要です", line);
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
    // R27-N12／AHK カンマ列：式文のカンマ列（JS のカンマ演算子、AHK v2
    // の multi-statement）を順に評価する。コマンド形式の呼出の引数
    // カンマは上の AHK 分岐で消費済みのため、ここに残るカンマは
    // 文の区切りとしてのみ現れる。
    if (
      (this.dialect === "js" || this.dialect === "ahk") &&
      this.peek(",")
    ) {
      let left = target;
      while (this.peek(",")) {
        this.take();
        left = { k: "comma", a: left, b: this.exprCtx(1), line };
      }
      if (!["\n", ";", "}", ")", "<eof>"].includes(this.ts[this.i]?.v))
        unsupported(this.ts[this.i].v, line);
      return { k: "expression", value: left, line };
    }
    // R30-N13：式文も else の手前で終端する（波括弧なし if 本体の
    // 呼び出し文 `print(1) else …`／`f() else …`）。else 自体は外側の
    // if 文が照合し、結ばれない else は文頭の else として名指される。
    // 従来は else が終端集合に無く、式文の本体が「未対応：else」と
    // 虚偽原因で停止していた（代入文の終端集合には既に含まれていた）。
    if (!["\n", ";", "}", ")", "<eof>", "else"].includes(this.ts[this.i]?.v))
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
// P-N1: 文字列連結の結果長を、実体を作る前に見積もるための長さ。
// 配列は String() 化（要素のカンマ連結）の長さで数え、上限を超えた
// 時点で打ち切る（巨大な実体を作らない）。
function concatLength(v, depth = 0) {
  if (typeof v === "string") return v.length;
  if (Array.isArray(v)) {
    if (depth > 8) return VALUE_LENGTH_LIMIT + 1;
    let total = Math.max(0, v.length - 1);
    for (const x of v) {
      total += concatLength(x, depth + 1);
      if (total > VALUE_LENGTH_LIMIT) return total;
    }
    return total;
  }
  if (v === null) return 4;
  if (v === undefined) return 9;
  if (typeof v === "object") return 15; // "[object Object]"
  return String(v).length;
}
// P-N1: 連結結果が値サイズ上限を超える場合は、Python 系統と同じく
// 未確定値へ倒す（連結を繰り返しても実体は二度と作られない）。
function concatGuard(op, a, b, dialect) {
  const isConcat =
    (dialect === "js" && op === "+") ||
    (dialect === "ahk" && (op === "." || op === ".concat")) ||
    (dialect === "fx" && op === "&") ||
    (op === "+" && typeof a === "string" && typeof b === "string");
  if (!isConcat) return null;
  if (typeof a !== "string" && typeof b !== "string" && dialect !== "ahk")
    return null;
  return concatLength(a) + concatLength(b) > VALUE_LENGTH_LIMIT
    ? unknown("とても長い文字列")
    : null;
}
export function baseBinary(op, a, b, dialect = "js") {
  if (isUnknown(a) || isUnknown(b))
    return {
      ...unknown(`${formatValue(a)} ${op} ${formatValue(b)}`),
      op,
      a,
      b,
    };
  const guarded = concatGuard(op, a, b, dialect);
  if (guarded) return guarded;
  if (dialect === "js") {
    if (op === "&&") return a && b;
    if (op === "||") return a || b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (op === "/") return a / b;
    if (op === "%") return a % b;
    // RG-51：シフト演算子は実 JavaScript の演算で評価する（BigInt 同士のシフトも含む）。
    if (op === "<<") return a << b;
    if (op === ">>") return a >> b;
    if (op === ">>>") return a >>> b;
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
  // RG-04：表示形式は種類側が semantics.format で差し替えられる（言語の正規表記に合わせる）。
  const fmt = semantics.format || formatValue;
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
    // P-N2: 手順テキスト（ステップごとの状態スナップショット）も表示用に
    // 切り詰める。値そのものではなく表示だけを省略する。
    text = truncateDisplayText(text);
    s.trace.push({
      line: n.line || 1,
      nodeId: n.nodeId,
      text,
      kind,
      refs: [...new Set([...(n.refs || []), ...(s.pendingRefs || [])])],
    });
    s.pendingRefs = [];
  }
  // R30-N16：JavaScript の論理代入（&&= ／ ||= ／ ??=）の評価。
  // ECMA-262 どおり、現在の代入先の値で短絡判定し、代入が必要な場合
  // だけ右辺を評価して書き込む。式としての値は、代入した場合はその
  // 値、短絡した場合は現在の値。未確定値では判定できないため、結果を
  // 未確定値として書き込む（黙って確定値を捏造しない）。
  function evalLogicalAssign(target, op, valueNode, s, node) {
    const cur = read(target, s);
    if (isUnknown(cur)) {
      const u = unknown("論理代入の結果による");
      write(target, u, s, node);
      return u;
    }
    const need =
      op === "&&="
        ? truth(cur, node.line, target, s)
        : op === "||="
          ? !truth(cur, node.line, target, s)
          : cur === null || cur === undefined;
    if (!need) return cur;
    const v = read(valueNode, s);
    write(target, v, s, node);
    return v;
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
    if (answer?.handled) return answer.value;
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
      case "record": {
        // R30-N14：スプレッド要素 {…式} は ECMA-262 の CopyDataProperties
        // どおり、元値の自分自身の列挙可能なプロパティを定義順にコピー
        // する（浅いコピー：値そのものは共有し、元オブジェクトの後からの
        // 変更はコピー先のプロパティ集合に影響しない）。null／undefined
        // は無視され、文字列は文字ごとの添字プロパティになる
        // （Object.entries の列挙が実物と一致する）。後勝ちの上書きと
        // キーの初出順は Object.fromEntries の蓄積で再現する。
        const pairs = [];
        for (const e of a.entries) {
          if (Array.isArray(e)) pairs.push([e[0], read(e[1], s)]);
          else {
            const src = read(e.spread, s);
            if (isUnknown(src)) return unknown("スプレッド元の値による");
            if (src === null || src === undefined) continue;
            for (const [k, v] of Object.entries(Object(src)))
              pairs.push([k, v]);
          }
        }
        return Object.fromEntries(pairs);
      }
      case "unary": {
        // R30-N16：JavaScript の void／delete（ECMA-262 の意味論）。
        // void は被演算子を評価（副作用は実行）して undefined を返す。
        if (a.op === "void") {
          read(a.arg, s);
          return undefined;
        }
        // delete はプロパティを削除して成否を返す。存在しないプロパティ
        // の削除も true（参照の読み取りで止めない）。変数そのものは
        // 削除できない（通常スクリプトの意味論で false を返し、変数は
        // 残る）。参照でない形は被演算子を評価して true。
        if (a.op === "delete") {
          const arg = a.arg;
          if (arg.k === "member" || arg.k === "index") {
            const obj = read(arg.target, s);
            if (isUnknown(obj)) return unknown("delete の結果による");
            if (obj === null || obj === undefined)
              throw new PracticeError(
                "null / undefined のプロパティは削除できません",
                a.line,
                "TypeError",
              );
            const key =
              arg.k === "member" ? arg.name : read(arg.indexes[0], s);
            if (isUnknown(key)) return unknown("delete の結果による");
            if (Array.isArray(obj) && key === "length") return false;
            if (typeof obj === "string") return false;
            if (typeof obj === "object") delete obj[key];
            return true;
          }
          if (arg.k === "var") {
            if (Object.hasOwn(s.vars, arg.name)) return false;
            if (["undefined", "NaN", "Infinity"].includes(arg.name))
              return false;
            return true;
          }
          read(arg, s);
          return true;
        }
        let x = read(a.arg, s);
        if (isUnknown(x))
          return { ...unknown(a.op + formatValue(x)), op: a.op, a: x };
        if (a.op === "!" || a.op === "not") return !truth(x, a.line, a.arg, s);
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
          if (["&&", "and"].includes(a.op) && !truth(x, a.line, a.a, s))
            return semantics.logicalOperands ? x : false;
          if (["||", "or"].includes(a.op) && truth(x, a.line, a.a, s))
            return semantics.logicalOperands ? x : true;
        }
        let y = read(a.b, s);
        if (semantics.logicalOperands && ["&&", "and", "||", "or"].includes(a.op) && !isUnknown(x))
          return y;
        return semantics.binary
          ? semantics.binary(a.op, x, y, a, s, api)
          : baseBinary(a.op, x, y, semantics.dialect);
      }
      case "cond": {
        // RG-06：条件演算子は選ばれた側だけを評価する。
        let t = read(a.test, s);
        if (isUnknown(t)) return unknown("条件演算子の結果による");
        return truth(t, a.line, a.test, s) ? read(a.then, s) : read(a.otherwise, s);
      }
      case "nullish": {
        let x = read(a.a, s);
        if (isUnknown(x)) return x;
        return x ?? read(a.b, s);
      }
      case "percent": {
        // RG-50：Power Fx の後置 % は値を 100 で割る。
        let x = read(a.arg, s);
        if (isUnknown(x))
          return { ...unknown(formatValue(x) + "%"), op: "%", a: x };
        return x / 100;
      }
      case "assignExpr": {
        // R27-N13／N8：式位置の代入（JS の代入式、AHK の連鎖代入）。
        // 代入先の検証は文レベルの代入と同じく評価より前に行い、
        // 書き込みは write() を通すため const／TDZ 等の種類側検証が
        // 文レベルと同一に効く。値は代入した値そのもの（右結合）。
        if (
          a.target?.k === "var" &&
          semantics.dialect === "js" &&
          ["true", "false", "null", "this"].includes(a.target.name)
        )
          throw new PracticeError(
            `代入先が不正です：${a.target.name} には代入できません（Invalid left-hand side in assignment）`,
            a.line,
            "SyntaxError",
          );
        // R30-N16：論理代入は短絡評価が本質のため専用経路で評価する。
        if (["&&=", "||=", "??="].includes(a.op))
          return evalLogicalAssign(a.target, a.op, a.value, s, a);
        let v;
        if (a.op === "=" || a.op === ":=")
          v = read(a.value, s);
        else {
          const base = {
            "+=": "+", "-=": "-", "*=": "*", "/=": "/", "**=": "**",
          }[a.op];
          if (!base)
            throw new PracticeError(
              `この構文は説明に対応していません：複合代入演算子 ${a.op}`,
              a.line,
              "未対応",
            );
          v = semantics.binary
            ? semantics.binary(base, read(a.target, s), read(a.value, s), a, s, api)
            : baseBinary(base, read(a.target, s), read(a.value, s), semantics.dialect);
        }
        write(a.target, v, s, a);
        return v;
      }
      case "destructureExpr": {
        // R27-N13：式位置の分割代入。右辺を評価してから束縛し、
        // 式の値としては右辺の値を返す（実 JavaScript の意味論）。
        let v = read(a.value, s);
        bindPattern(a.pattern, v, s, a, null);
        return v;
      }
      case "comma": {
        // R27-N12：カンマ演算子／AHK の multi-statement。左から順に
        // 評価し、最後の値を返す。
        read(a.a, s);
        return read(a.b, s);
      }
      case "ifexpr": {
        // RG-07：R の if 式。else が無く条件不成立の場合は NULL を返す。
        let t = read(a.test, s);
        if (isUnknown(t)) return unknown("if 式の条件による");
        if (truth(t, a.line, a.test, s)) return read(a.then, s);
        return a.otherwise ? read(a.otherwise, s) : null;
      }
      case "member": {
        // RG-59：メンバ名（プロパティ名・列名などのデータ名）はリファレンス語彙では
        // ないため refs に入れない。呼び出された名前は call 経由で callName が記録する。
        // メンバ名を refs に出したい種類は semantics.read の中で明示的に追加すること。
        let x = read(a.target, s);
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
  // R26-N7：分割代入のパターンを値へ束縛する。右辺は一度だけ評価され
  // （呼び出し側で read 済み）、要素の既定値は要素が undefined のときだけ
  // 評価する（実 JavaScript の意味論）。反復可能でない右辺・null /
  // undefined のオブジェクト分割は TypeError で名指す。
  function patternLeafNames(pattern, out = []) {
    const els =
      pattern.k === "arrayPattern" ? pattern.elements : pattern.props;
    for (const el of els) {
      if (!el) continue;
      if (
        el.target?.k === "arrayPattern" ||
        el.target?.k === "objectPattern"
      )
        patternLeafNames(el.target, out);
      else if (el.target?.k === "var") out.push(el.target.name);
    }
    return out;
  }
  function bindPattern(pattern, value, s, n, declareType) {
    const bound = [];
    const leaf = (target, v) => {
      if (target.k === "arrayPattern" || target.k === "objectPattern") {
        bound.push(...bindPattern(target, v, s, n, declareType));
        return;
      }
      if (declareType) {
        if (Object.hasOwn(s.types, target.name) && declareType !== "var")
          throw new PracticeError("同名の変数が宣言済みです", n.line);
        s.types[target.name] = declareType;
        s.vars[target.name] = v;
      } else write(target, v, s, n);
      bound.push(
        target.k === "var" ? target.name : callName(target) || "対象",
      );
    };
    if (isUnknown(value)) {
      const u = unknown("分割代入の右辺による");
      const els =
        pattern.k === "arrayPattern" ? pattern.elements : pattern.props;
      for (const el of els) if (el) leaf(el.target, u);
      return bound;
    }
    if (pattern.k === "arrayPattern") {
      let items;
      if (Array.isArray(value)) items = value;
      else if (typeof value === "string") items = [...value];
      else
        throw new PracticeError(
          "分割代入の右辺が反復可能ではありません（配列や文字列が必要です）",
          n.line,
          "TypeError",
        );
      pattern.elements.forEach((el, idx) => {
        if (!el) return;
        if (el.rest) {
          leaf(el.target, items.slice(idx));
          return;
        }
        let v = items[idx];
        if (v === undefined && el.default) v = read(el.default, s);
        leaf(el.target, v);
      });
    } else {
      if (value == null)
        throw new PracticeError(
          "null / undefined は分割代入できません",
          n.line,
          "TypeError",
        );
      const boxed = Object(value),
        used = new Set();
      for (const prop of pattern.props) {
        if (prop.rest) {
          const restObj = {};
          for (const k of Object.keys(boxed))
            if (!used.has(k)) restObj[k] = boxed[k];
          leaf(prop.target, restObj);
          continue;
        }
        used.add(prop.key);
        let v = boxed[prop.key];
        if (v === undefined && prop.default) v = read(prop.default, s);
        leaf(prop.target, v);
      }
    }
    return bound;
  }
  function truth(v, line, node, s) {
    // RG-76：条件の式ノードと状態も渡し、型に依存する条件可否（C++ の
    // std::string 等）を種類側が判定できるようにする。既存の truth 実装は
    // 追加引数を無視する。
    if (semantics.truth) return semantics.truth(v, line, node, s);
    return Boolean(v);
  }
  function choose(s, v, n) {
    if (!isUnknown(v)) return [{ s, yes: truth(v, n.line, n.test ?? n, s) }];
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
    if (depth > limits.depth) {
      // RG-01：深さ超過は「パス内のエラー」ではなく打ち切りとして必ず記録する。
      truncated = true;
      reasons.add("ブロックの入れ子の深さ上限");
      throw new PracticeError("ブロックの入れ子が深すぎます", 1, "limit");
    }
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
          // M-N2：ホスト例外は変換層を通してから停止理由にする。
          const pe = toLearnerError(e);
          let line = pe.line > 1 ? pe.line : n.line;
          // RG-81（R21-N8）: カテゴリは category 欄が持つ。メッセージ側へ
          // 接頭辞を焼き込むと「カテゴリ：メッセージ」の合成で二重表示に
          // なるため、ここでは前置しない。
          s.error = {
            line,
            message: pe.message,
            category: pe.category || "エラー",
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
            : // RG-06：do-while（postTest）は1回目は無条件に実行する。
              n.postTest && i === 0
              ? true
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
    // RG-77（R20-N8）: C# では、ローカル変数の宣言スペースと入れ子の宣言
    // スペースが同じ名前を含むことは CS0136 のコンパイルエラー（順序不問）。
    // 兄弟ブロック同士の同名は合法なので、外側の自スコープ宣言と、自スコープ
    // 内で既に閉じた子スコープの宣言（extent）だけを衝突対象にする。
    if (semantics.nestedShadowError) {
      scope.extent ??= new Set();
      const inAncestor = s.scopeStack
        .slice(0, -1)
        .some((f) => f.records.some((r) => r.name === n.name));
      if (inAncestor || scope.extent.has(n.name))
        throw new PracticeError(
          `ローカル変数 '${n.name}' は、このスコープを含む宣言スペースで既に宣言されています（CS0136）`,
          n.line,
          "CompileError",
        );
      scope.extent.add(n.name);
    }
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
    // RG-77: 閉じた子スコープの宣言名は外側スコープの extent へ引き継ぐ
    // （内側が先・外側の宣言が後の順序でも CS0136 を検出するため）。
    if (semantics.nestedShadowError && scope?.extent) {
      const parent = s.scopeStack.at(-1);
      if (parent) {
        parent.extent ??= new Set();
        for (const name of scope.extent) parent.extent.add(name);
      }
    }
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
    if (n.k === "declareList" && !semantics.prepareScope)
      for (const d of n.declarators)
        if (!d.pattern)
          registerDeclaration(s, { name: d.name, type: n.type, line: n.line });
        else
          for (const nm of patternLeafNames(d.pattern))
            registerDeclaration(s, { name: nm, type: n.type, line: n.line });
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
        note(s, n, `${n.name} を用意します：${fmt(s.vars[n.name])}`);
        return [s];
      }
      case "declareList": {
        // R27-N11：複数宣言子。各宣言子を左から順に初期化する（後の
        // 宣言子の初期化子は前の宣言子を参照できる。実 JavaScript の
        // 意味論）。スコープ登録は declare と同じ経路（prepareScope
        // がある種類ではそちら、無い場合は step 冒頭）で済んでいる。
        const parts = [];
        for (const d of n.declarators) {
          if (d.pattern) {
            // パターンの葉のスコープ登録は declarePattern と同じく
            // この実行時点で行う（prepareScope では単純名だけを登録）。
            if (
              semantics.blockScopes &&
              semantics.dialect === "js" &&
              n.type !== "var"
            )
              for (const nm of patternLeafNames(d.pattern))
                registerDeclaration(s, { name: nm, type: n.type, line: n.line });
            let v = read(d.value, s);
            const bound = bindPattern(d.pattern, v, s, n, n.type);
            parts.push(...bound.map((nm) => `${nm}：${fmt(s.vars[nm])}`));
          } else {
            s.types[d.name] = n.type;
            s.vars[d.name] = d.value ? read(d.value, s) : undefined;
            parts.push(`${d.name}：${fmt(s.vars[d.name])}`);
          }
        }
        note(s, n, `${parts.join("、")} を用意します`);
        return [s];
      }
      case "assign": {
        // R24-N12：代入ターゲットの形の検証を右辺の評価より前に行う。
        // リテラル・呼び出し結果・演算結果等への代入は構文段階の誤り
        // （Node の SyntaxError: Invalid left-hand side in assignment 相当）
        // であり、右辺に未定義の名前があってもそちらを先に指してはならない。
        // 書き込み可能な形は var／index／member と、C系の逆参照（*p）のみ。
        // R25-N8：キーワードリテラルは var ノードとして運ばれるため形の
        // 検証を素通りしていた（JS の true／null／this への代入が黙って
        // 受理され、右辺の未定義名を誤って指した）。方言ごとの予約
        // リテラル名を代入先として先に名指す。JS の undefined／NaN／
        // Infinity は識別子であり、実 Node の sloppy な挙動（黙った
        // 無効化）とアプリの現行扱いが一致するため対象に含めない。
        // R の T／F は再代入可能な変数なので対象に含めない。
        const keywordTarget =
          n.target?.k === "var"
            ? {
                js: ["true", "false", "null", "this"],
                r: ["TRUE", "FALSE", "NULL"],
              }[semantics.dialect]?.includes(n.target.name)
            : false;
        if (keywordTarget)
          throw new PracticeError(
            `代入先が不正です：${n.target.name} には代入できません（Invalid left-hand side in assignment）`,
            n.line,
            "SyntaxError",
          );
        if (
          !["var", "index", "member"].includes(n.target?.k) &&
          !(n.target?.k === "unary" && n.target?.op === "*")
        ) {
          const form =
            {
              literal: "リテラル",
              call: "関数呼び出しの結果",
              binary: "演算の結果",
              array: "配列リテラル",
              record: "オブジェクトリテラル",
              post: "++ / -- の結果",
              unary: "単項演算の結果",
              cond: "条件式の結果",
              nullish: "条件式の結果",
            }[n.target?.k] || "この式";
          throw new PracticeError(
            `代入先が不正です：${form}には代入できません（Invalid left-hand side in assignment）`,
            n.line,
            "SyntaxError",
          );
        }
        // R30-N16：論理代入は短絡評価が本質のため専用経路で評価する
        // （右辺の評価を先に行うと、短絡すべき副作用が実行されてしまう）。
        let v;
        if (["&&=", "||=", "??="].includes(n.op)) {
          v = evalLogicalAssign(n.target, n.op, n.value, s, n);
          note(
            s,
            n,
            `${callName(n.target) || "対象"} に ${fmt(v)} を代入します`,
          );
          return [s];
        }
        v = read(n.value, s);
        // R27-N8：複合代入の基底演算子への対応表（従来の op[0] では
        // **= ／ <<= 等の複数文字演算子を扱えない）。
        const compoundBase = {
          "+=": "+", "-=": "-", "*=": "*", "/=": "/", "**=": "**",
          "&=": "&", "|=": "|", "^=": "^",
          "<<=": "<<", ">>=": ">>", ">>>=": ">>>",
        }[n.op];
        if (compoundBase)
          v = semantics.binary
            ? semantics.binary(compoundBase, read(n.target, s), v, n, s, api)
            : baseBinary(compoundBase, read(n.target, s), v, semantics.dialect);
        write(n.target, v, s, n);
        note(
          s,
          n,
          `${callName(n.target) || "対象"} に ${fmt(v)} を代入します`,
        );
        return [s];
      }
      case "destructure": {
        // R26-N7：文位置の分割代入。右辺を先に評価してから束縛する
        // （[a, b] = [b, a] の swap が実 JavaScript どおり動く）。
        let v = read(n.value, s);
        let bound = bindPattern(n.pattern, v, s, n, null);
        note(s, n, `分割代入で ${bound.join("、")} に値を割り当てます`);
        return [s];
      }
      case "declarePattern": {
        // R26-N7：宣言の分割代入。ブロックスコープの登録は通常の宣言と
        // 同じ台帳へ step 時点で行う（prepareScope は declare のみ対象）。
        if (
          semantics.blockScopes &&
          semantics.dialect === "js" &&
          n.type !== "var"
        )
          for (const nm of patternLeafNames(n.pattern))
            registerDeclaration(s, { name: nm, type: n.type, line: n.line });
        let v = read(n.value, s);
        let bound = bindPattern(n.pattern, v, s, n, n.type);
        note(s, n, `分割代入で ${bound.join("、")} を用意します`);
        return [s];
      }
      case "expression": {
        const before = s.trace.length;
        let v = read(n.value, s);
        if (s.trace.length === before) {
          const text = n.value.k === "post"
            ? `${callName(n.value.target) || "対象"} を${n.value.op === "++" ? "増やし" : "減らし"}ます（後置式の値は変更前の ${fmt(v)}）`
            : v == null ? "処理を実行します（表示する戻り値はありません）" : `式を評価します：${fmt(v)}`;
          note(s, n, text);
        }
        return [s];
      }
      case "if": {
        let v = read(n.test, s),
          done = [];
        for (let r of choose(s, v, n)) {
          note(r.s, n, r.yes ? "条件が成立します" : "条件が成立しません");
          // RG-01：else-if の継ぎ目は入れ子ではないので深さを消費しない。
          let branch = r.yes ? n.body : n.otherwise,
            d =
              !r.yes && branch.length === 1 && branch[0].k === "if"
                ? depth
                : depth + 1;
          done.push(...scoped(branch, [r.s], d));
        }
        return done;
      }
      case "for":
      case "while":
      case "each":
      case "repeat": {
        if (semantics.blockScopes) enterScope(s, n.init ? [n.init] : []);
        // NX-N19 根因：each（C# foreach）の反復変数は loop() が vars へ
        // 直接書くためスコープ記録に残らず、終了後も最終状態に残留した。
        // for の初期化変数と同じく宣言として登録し、leaveScope で
        // 除去（外側に同名があれば復元）されるようにする。blockScopes を
        // 使わない種類（R 等、反復変数が残るのが正しい言語）は対象外。
        if (semantics.blockScopes && n.k === "each" && n.name)
          registerDeclaration(s, {
            name: n.name,
            type: n.varType,
            line: n.line,
          });
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
        note(s, n, `値を返して終了します：${fmt(s.returnValue)}`);
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
    format: fmt,
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
    // M-N2：ホスト例外は変換層を通してから停止理由にする。
    const pe = toLearnerError(e);
    return {
      paths: [],
      error: { line: pe.line || 1, message: pe.message, category: pe.category },
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
            entries: Object.entries(p.vars).map(([k, v]) => [k, fmt(v)]),
          },
          {
            title: "モデル状態",
            entries: Object.entries(p.model).map(([k, v]) => [k, fmt(v)]),
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
    // M-N2：ホスト例外は変換層を通してから停止理由にする。
    const pe = toLearnerError(e);
    return {
      paths: [],
      error: { line: pe.line || 1, message: pe.message, category: pe.category },
      truncated: false,
      limits: { ...LIMITS, ...limits },
    };
  }
}
