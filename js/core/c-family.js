import {
  ScriptParser,
  executeProgram,
  PracticeError,
  scanScript,
  baseBinary,
  callName,
  unsupported,
} from "./script.js";
import { sourceFailure, rows } from "./data.js";
// 高度モード ブロックB5（C#）：高度側の呼び出し意味論テーブル。
// 委譲は call ディスパッチ末尾の managed 限定ブロック1箇所だけから行う。
import { handleAdvancedCall, advancedValueText } from "../types/csharp/advanced-engine.js";
// RG-81（R21-N8）: エラーのカテゴリは category 引数だけが持つ。メッセージ
// 本文に「未対応：」「未確認：」等の接頭辞を焼き込むと、カテゴリと合成する
// 表示で二重になるため、このファイルの fail メッセージには付けない。
import { formatModelValue as formatValue, isUnknown, unknown, LIMITS } from "./contract.js";
// P-N3 受け皿：ホスト例外（V8 の RangeError 等）の生文言を学習者向けの
// 表示へ漏らさないための変換。モデルのエラー（PracticeError）はそのまま
// 通し、それ以外は日本語の停止理由に置き換える。
function hostErrorAsPractice(e, line) {
  if (e instanceof PracticeError) return e;
  if (e instanceof RangeError)
    return new PracticeError(
      /string/i.test(e?.message || "")
        ? "文字列が長くなりすぎて処理できませんでした。文字列を短くして再実行してください。"
        : "値が大きすぎて処理できませんでした。コードを小さくして再実行してください。",
      line || 1,
      "limit",
    );
  return new PracticeError(
    "処理を完了できませんでした。コードを小さくして再実行してください。",
    line || 1,
    "エラー",
  );
}
// R31-N8（C家族分）：共有字句解析器の終端トークン値 <eof> は入力の
// どこにも現れない内部名で、式の途中終了（int x = 等）で「式を解釈
// できません：<eof>」として学習者向け文言に露出していた（RG-08 と
// 同型）。C家族の解析は共有パーサに委ねるため、このファイルの境界
// （simulate の例外変換と実行結果のエラー欄）で、途中終了を表す
// 学習者の言葉へ翻訳する。
function translateEofMessage(message) {
  if (typeof message !== "string" || !message.includes("<eof>")) return message;
  return message
    .replace("式を解釈できません：<eof>", "式を解釈できません（式が途中で終わっています）")
    .replaceAll("<eof>", "文末");
}
function translateEofError(e) {
  if (e instanceof PracticeError && e.message?.includes("<eof>"))
    return new PracticeError(translateEofMessage(e.message), e.line, e.category);
  return e;
}
// semantics の各境界でホスト例外を受け止め、日本語の停止理由へ変換する。
function guardHostErrors(fn) {
  return function (...args) {
    try {
      return fn.apply(this, args);
    } catch (e) {
      if (e instanceof PracticeError) throw e;
      const node = args.find(
        (a) => a && typeof a === "object" && typeof a.line === "number",
      );
      throw hostErrorAsPractice(e, node?.line);
    }
  };
}
// RG-348（R32-N2）：複合代入演算子から基底の二項演算子への対応。
// 従来は op[0]（先頭1文字）で代用していたため、<<= が「<」になる等、
// 複合代入の意味論が壊れていた（そもそもパーサが受理しなかった）。
function compoundBaseOp(op) {
  return (
    {
      "+=": "+",
      "-=": "-",
      "*=": "*",
      "/=": "/",
      "%=": "%",
      "<<=": "<<",
      ">>=": ">>",
      "&=": "&",
      "|=": "|",
      "^=": "^",
    }[op] || op
  );
}
const uninitialized = { kind: "uninitialized" },
  isPtr = (v) => v?.kind === "pointer",
  builtinTypes = [
    "int",
    "long",
    "double",
    "float",
    "bool",
    "string",
    "char",
    "auto",
    "var",
  ];
function transformNumberLiteral(raw, suffix, language, line) {
  const isFloat = !/^0[xXbBoO]/.test(raw) && /[.eE]/.test(raw);
  let value = null;
  if (/^0[xX]/.test(raw)) value = BigInt("0x" + raw.slice(2)).toString();
  else if (/^0[bB]/.test(raw)) value = BigInt("0b" + raw.slice(2)).toString();
  else if (/^0[oO]/.test(raw)) {
    if (language === "csharp")
      unsupported(`8進数接頭辞 0o は C# にはありません：${raw}`, line);
    value = BigInt("0o" + raw.slice(2)).toString();
  } else if (!isFloat && /^0[0-9]+$/.test(raw) && language !== "csharp") {
    if (/[89]/.test(raw))
      throw new PracticeError(
        `8進整数リテラル ${raw} に 8 または 9 は使えません`,
        line,
        "CompileError",
      );
    value = BigInt("0o" + raw.slice(1)).toString();
  }
  const digits = value ?? raw,
    sl = (suffix || "").toLowerCase();
  if (language === "csharp") {
    if (!suffix) return digits;
    if (sl === "m")
      unsupported(`decimal リテラル ${raw}${suffix} は未対応です（m 接尾辞）`, line);
    if (isFloat) {
      if (sl === "f") return digits + "f";
      if (sl === "d") return digits;
    } else {
      if (sl === "l") return digits + "L";
      // §3.3(b) 根因の一部：ul 接尾辞を L 付きリテラルへ落とすと型が
      // long になり、ulong 定数への暗黙変換規則（変換先は ulong のみ）を
      // 判定できない。u 接尾辞と同じくキャスト形で型を保持する。
      if (sl === "ul" || sl === "lu") return `((ulong)${digits})`;
      // D3 兄弟表面：u 接尾辞の型情報を落とすと uint リテラルが int
      // として扱われ、uint 同士の演算が long へ昇格して折り返さない。
      // C 側の ((unsigned int)…) と同じくキャスト形で型を保持する。
      // R25-N25：u 接尾辞リテラルの型は仕様どおり「uint、ulong の順に
      // 収まる型」。uint の範囲を超える値を uint のキャスト形で包むと
      // 評価時に 2^32 の剰余へ切り捨てられて黙った誤値になるため、
      // 範囲を超える場合は ulong のキャスト形で型を保持する
      // （dotnet 実測：4294967296u の型は ulong、uint への代入は
      // CS0266、ulong／double への代入と式の値はそのまま）。
      if (sl === "u") {
        let big = null;
        try {
          big = BigInt(digits);
        } catch {
          big = null;
        }
        if (big !== null && big > 4294967295n)
          return `((ulong)${digits})`;
        return `((uint)${digits})`;
      }
    }
    unsupported(`数値リテラル ${raw}${suffix} の接尾辞 ${suffix} は未対応です`, line);
  }
  if (isFloat) {
    if (!suffix) return raw;
    if (sl === "f") return raw + "f";
    if (sl === "l")
      unsupported(`long double リテラル ${raw}${suffix} は未対応です`, line);
    unsupported(`数値リテラル ${raw}${suffix} の接尾辞 ${suffix} は未対応です`, line);
  }
  if (!suffix) return digits;
  if (sl === "l" || sl === "ll") return digits + "L";
  if (sl === "u") return `((unsigned int)${digits})`;
  if (sl === "ul" || sl === "lu" || sl === "ull" || sl === "llu")
    return `((unsigned long)${digits})`;
  unsupported(`数値リテラル ${raw}${suffix} の接尾辞 ${suffix} は未対応です`, line);
}
// Source-level normalization that is literal-aware: string/char literal
// contents are never rewritten (std:: inside a literal stays intact),
// numeric literals follow the per-language grammar, C# interpolation is
// lowered to concatenation, and unsupported literal forms stop honestly.
function transformSource(source, language, deadline) {
  const lines = source.split("\n").map((line, idx) => {
    if (/^\s*#/.test(line)) {
      if (/^\s*#\s*include\s*[<"][^>"]*[>"]\s*(\/\/.*)?$/.test(line)) return "";
      const m = line.match(/^\s*#\s*(\w+)/);
      unsupported(
        `プリプロセッサディレクティブ #${m ? m[1] : ""}`,
        idx + 1,
      );
    }
    if (
      /^\s*using\s+(namespace\s+)?[\w:.<>]+(\s*=\s*[\w:.<>]+)?\s*;\s*(\/\/.*)?$/.test(
        line,
      )
    )
      return "";
    if (
      language === "csharp" &&
      /^\s*namespace\s+[\w.]+\s*;\s*(\/\/.*)?$/.test(line)
    )
      return "";
    return line;
  });
  const src = lines.join("\n");
  let out = "",
    i = 0,
    line = 1;
  const advance = (to) => {
    line += src.slice(i, to).split("\n").length - 1;
    i = to;
  };
  const literalAt = (pos, quote) => {
    let j = pos + 1;
    while (j < src.length) {
      const c = src[j];
      if (c === "\\") {
        j += 2;
        continue;
      }
      if (c === quote) return { inner: src.slice(pos + 1, j), end: j + 1 };
      if (c === "\n") return null;
      j++;
    }
    return null;
  };
  const emitString = () => {
    // src[i] === '"'; merges adjacent string literals for C/C++.
    let parts = [],
      pos = i;
    for (;;) {
      const r = literalAt(pos, '"');
      if (!r) {
        out += src.slice(i);
        advance(src.length);
        return;
      }
      parts.push(r.inner);
      pos = r.end;
      if (language === "csharp") break;
      let k = pos;
      while (k < src.length && /\s/.test(src[k])) k++;
      const pm = src.slice(k).match(/^(u8|u|U|L)"/);
      if (src[k] === '"' || pm) {
        pos = pm ? k + pm[1].length : k;
        continue;
      }
      break;
    }
    out += '"' + parts.join("") + '"';
    advance(pos);
  };
  const splitHole = (hole, holeLine) => {
    let depth = 0,
      q = 0;
    for (let k = 0; k < hole.length; k++) {
      const c = hole[k];
      if (c === '"' || c === "'") {
        let j = k + 1;
        while (j < hole.length && hole[j] !== c) {
          if (hole[j] === "\\") j++;
          j++;
        }
        k = j;
        continue;
      }
      if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) depth--;
      else if (depth === 0 && c === "?") q++;
      else if (depth === 0 && c === ",")
        unsupported("文字列補間の配置指定（{式,配置}）は未対応です", holeLine);
      else if (depth === 0 && c === ":") {
        if (q > 0) q--;
        else
          unsupported(
            "文字列補間の書式指定子（{式:書式}）は未対応です",
            holeLine,
          );
      }
    }
    return hole.trim();
  };
  const emitInterpolation = () => {
    // src[i] === '$', src[i + 1] === '"'
    let j = i + 2,
      lit = "",
      parts = [],
      closed = false;
    // R30-N30：各パートがリテラルか穴（式）かを保持する。先頭が穴の
    // 補間は連結への下ろし方を変える必要があるため（下記参照）。
    const flushLit = () => {
      if (lit) parts.push({ text: '"' + lit + '"', hole: false });
      lit = "";
    };
    while (j < src.length) {
      const c = src[j];
      if (c === "\\") {
        lit += src.slice(j, j + 2);
        j += 2;
        continue;
      }
      if (c === '"') {
        closed = true;
        j++;
        break;
      }
      if (c === "{") {
        if (src[j + 1] === "{") {
          lit += "{";
          j += 2;
          continue;
        }
        let depth = 1,
          k = j + 1,
          hole = "";
        while (k < src.length && depth > 0) {
          const cc = src[k];
          if (cc === '"' || cc === "'") {
            const r = literalAt(k, cc);
            if (!r) break;
            hole += src.slice(k, r.end);
            k = r.end;
            continue;
          }
          if (cc === "{") depth++;
          if (cc === "}") {
            depth--;
            if (depth === 0) {
              k++;
              break;
            }
          }
          hole += cc;
          k++;
        }
        flushLit();
        parts.push({
          text: "(" + transformSource(splitHole(hole, line), language) + ")",
          hole: true,
        });
        j = k;
        continue;
      }
      if (c === "}" && src[j + 1] === "}") {
        lit += "}";
        j += 2;
        continue;
      }
      lit += c;
      j++;
    }
    if (!closed)
      throw new PracticeError("文字列が閉じられていません", line);
    flushLit();
    // R30-N30 根因：補間は常に string を生むが、連結への下ろしでは
    // 先頭が穴だけの場合に穴の値の型がそのまま残っていた。そのため
    // $"{a}"（char[]）が WriteLine(char[]) オーバーロード相当の誤値
    // "hi" になり、string への代入では型不一致、"{a}{a}" では配列
    // 同士の + で CompileError と、形ごとにバラバラだった。実
    // dotnet では補間内の配列値は全形で型名文字列（System.Char[] 等）
    // になる。先頭が穴の場合は空文字列を先頭に置いて全体を括弧で
    // 包み、最初の演算から文字列連結（型名表示への変換を含む従来の
    // RG-284 経路）にすることで、全形を実物に統一する。先頭が
    // リテラルの場合は従来どおり（既に文字列連結として正しい）。
    if (!parts.length) out += '""';
    else if (parts[0].hole)
      out += '("" + ' + parts.map((p) => p.text).join(" + ") + ")";
    else out += parts.map((p) => p.text).join(" + ");
    advance(j);
  };
  // RG-373／RG-374（R33-N10／N11）：不正な数値リテラルのエラー表示は、
  // ソース上で連続するリテラル全体を示すための表示専用走査。従来は
  // 核（正規表現で受理できた部分）＋英数字だけの尾部を連結していた
  // ため、接頭辞直後の区切り（0x'FF →「0x」）、指数符号直後の区切り
  // （1e+_5 →「1e+」）、小数点の後の続き（1.5.2'3 →「1.5.2」）等で
  // 表示が途中で切れた。数字・英字・_・'・. を連続する限り取り込み、
  // 指数符号（直前が区切りを挟んでも e／E になる位置の +／-）も
  // 取り込む。空白・;・,・) 等で止まるため、正当な後続コード
  // （1e5 + 5 の + 等）は取り込まない。
  const fullNumericLiteral = (text) => {
    let end = 0;
    while (end < text.length) {
      const ch = text[end];
      if (/[0-9A-Za-z_'.]/.test(ch)) {
        end++;
        continue;
      }
      if (ch === "+" || ch === "-") {
        let j = end - 1;
        while (j >= 0 && (text[j] === "_" || text[j] === "'")) j--;
        if (j >= 0 && (text[j] === "e" || text[j] === "E")) {
          end++;
          continue;
        }
      }
      break;
    }
    return text.slice(0, end);
  };
  let scanCount = 0;
  while (i < src.length) {
    // P-N4：準備段階も時間上限の対象にする。一定間隔で時刻を検査し、
    // 超えたら日本語の理由で正直に打ち切る（上限体系の対象外をなくす）。
    if (
      deadline !== undefined &&
      ++scanCount % 4096 === 0 &&
      performance.now() > deadline
    )
      throw new PracticeError(
        "解析時間の上限で停止しました。コードを小さくして再実行してください。",
        line,
        "limit",
      );
    const c = src[i],
      rest = src.slice(i);
    if (rest.startsWith("//")) {
      let end = src.indexOf("\n", i);
      if (end < 0) end = src.length;
      // RG-67: C／C++ では末尾バックスラッシュの行スプライスでコメントが
      // 次行へ続くため、複写も継続行まで含める（継続行をコードとして処理しない）。
      if (language !== "csharp") {
        for (;;) {
          let j = end - 1;
          if (src[j] === "\r") j--;
          if (src[j] !== "\\" || end >= src.length) break;
          const nextEnd = src.indexOf("\n", end + 1);
          end = nextEnd < 0 ? src.length : nextEnd;
          if (nextEnd < 0) break;
        }
      }
      out += src.slice(i, end);
      advance(end);
      continue;
    }
    if (rest.startsWith("/*")) {
      let end = src.indexOf("*/", i + 2);
      end = end < 0 ? src.length : end + 2;
      out += src.slice(i, end);
      advance(end);
      continue;
    }
    if (language === "csharp" && rest.startsWith('"""'))
      unsupported('C# の raw 文字列リテラル """...""" は未対応です', line);
    if (language === "csharp" && c === "$" && src[i + 1] === '"') {
      emitInterpolation();
      continue;
    }
    if (c === '"') {
      emitString();
      continue;
    }
    if (c === "'") {
      const r = literalAt(i, "'");
      if (!r) {
        out += src.slice(i);
        advance(src.length);
        break;
      }
      out += src.slice(i, r.end);
      advance(r.end);
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const word = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/)[0];
      const after = i + word.length;
      if (word === "std" && src.slice(after, after + 2) === "::") {
        // A8収束ラウンド是正：std::NULL は高度カタログで未対応の項目だが、
        // std:: を落とすと基盤エンジンの NULL リテラルとして評価され、
        // 未対応の表示に反して黙って成功してしまう。実C++にも std::NULL は
        // 存在しないため、変換層で名指しして止める。
        if (
          language === "cpp" &&
          /^NULL(?![A-Za-z0-9_])/.test(src.slice(after + 2))
        )
          unsupported("std::NULL は未対応です", line);
        advance(after + 2);
        continue;
      }
      // B8（cpp-engine-a）：std::numbers::pi と std::string::npos は、
      // :: のままでは式パーサが扱えないため、C# の Math.PI と同じ
      // メンバー参照の形（numbers.pi／string.npos）へ寄せる。対象は
      // この2つの修飾だけに限り、他の :: には触らない。
      // 統合時修正（コーディネーター）：string 側は後続が npos の場合に
      // 限定する。無条件に string:: を潰すと std::string::iterator 等の
      // 型名（cpp-engine-b が処理する）まで壊れるため。
      if (
        language === "cpp" &&
        src.slice(after, after + 2) === "::" &&
        (word === "numbers" ||
          (word === "string" &&
            /^npos(?![A-Za-z0-9_])/.test(src.slice(after + 2))))
      ) {
        out += word + ".";
        advance(after + 2);
        continue;
      }
      if (
        ["u8", "u", "U", "L"].includes(word) &&
        (src[after] === '"' || src[after] === "'")
      ) {
        advance(after);
        continue;
      }
      if (language === "cpp" && word === "R" && src[after] === '"')
        unsupported('C++ の raw 文字列リテラル R"..." は未対応です', line);
      out += word;
      advance(after);
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] || ""))) {
      // RG-352／RG-353（R32-N6／N7）：桁区切りを含む数値リテラル。
      // C# の `_` は数字と数字の間（連続も可）と 0x／0b 接頭辞の直後に
      // 置ける（dotnet 8.0.428 実走：1__000／0x__FF／0b_1010／1_0.5／
      // 1.5_0／1e1_0 は合法、1000_／1_.5／1e_5／1000_u は CS1013）。
      // C／C++ の `'` は数字と数字の間に1つだけ置ける（g++ -std=c++14／
      // gcc -std=c2x 実走：1'000／0x1'000／1.5'5／1e1'0 は合法、
      // 1''000 は adjacent digit separators エラー）。区切りは値の
      // 計算前に取り除き、元の並びはエラー表示のために raw へ残す。
      const m = rest.match(
        language === "csharp"
          ? /^(?:0[xX]_*[0-9a-fA-F](?:_*[0-9a-fA-F])*|0[bB]_*[0-9](?:_*[0-9])*|0[oO]_*[0-9](?:_*[0-9])*|\d(?:_*\d)*(?:\.(?:\d(?:_*\d)*)?)?(?:[eE][+-]?\d(?:_*\d)*)?|\.\d(?:_*\d)*(?:[eE][+-]?\d(?:_*\d)*)?)/
          : /^(?:0[xX][0-9a-fA-F](?:'?[0-9a-fA-F]+)*|0[bB][0-9](?:'?[0-9]+)*|0[oO][0-9](?:'?[0-9]+)*|\d(?:'?\d)*(?:\.(?:\d(?:'?\d)*)?)?(?:[eE][+-]?\d(?:'?\d)*)?|\.\d(?:'?\d)*(?:[eE][+-]?\d(?:'?\d)*)?)/,
      );
      if (m) {
        // R24-N15（C# 部分）根因：正規表現 \d+\.?\d* が `10.ToString()` の
        // メンバーアクセスのドットまで小数点として取り込むため、リテラル
        // 直結のメンバーアクセスが「) が必要です」という虚偽原因に化けて
        // いた。ドットの直後が識別子文字ならドットはリテラルに含めない
        // （実 C# の字句規則どおり。`1.e5` のような指数形は正規表現側で
        // 指数まで取り込むため末尾ドットにはならない）。
        let raw = m[0];
        if (raw.endsWith(".") && /[A-Za-z_]/.test(rest[raw.length] || ""))
          raw = raw.slice(0, -1);
        // RG-352／RG-353：区切り文字が数字の直後に残っている場合は、
        // 数字と数字の間ではない不正な配置（末尾の区切り、二重の
        // 区切り、小数点・指数・接尾辞に隣接する区切り）である。
        // C／C++ で文字リテラルの開始と誤認して「文字列が閉じられて
        // いません」等の虚偽原因にせず、桁区切り／書式そのものを
        // 名指して停止する。リテラル全体を表示する（途中表示にしない）。
        {
          const sep = language === "csharp" ? "_" : "'";
          if (rest[raw.length] === sep) {
            // RG-373／RG-374：表示は核＋一部ではなくリテラル全文
            // （fullNumericLiteral）。従来の尾部正規表現は指数符号を
            // 含まず、1_000.5_e+_3 が「1_000.5_e」で切れていた。
            const shown = fullNumericLiteral(rest);
            throw new PracticeError(
              language === "csharp"
                ? `数値リテラルの書き方が不正です：${shown}`
                : `数値リテラルの桁区切り（'）の書き方が不正です：${shown}`,
              line,
              "SyntaxError",
            );
          }
        }
        let suffix = "";
        const srest = rest.slice(raw.length);
        const pats =
          language === "csharp"
            ? ["ul", "lu", "f", "d", "m", "u", "l"]
            : ["ull", "llu", "ul", "lu", "ll", "u", "l", "f"];
        for (const p of pats) {
          // P-N4 根因：残り全体を toLowerCase() すると数値リテラル1個ごとに
          // 残り全文のコピーが発生し、文数に対して二乗コストになる。
          // 接頭辞の候補（最大3文字）だけを切り出してから小文字化する。
          if (
            srest.slice(0, p.length).toLowerCase() === p &&
            !/[A-Za-z0-9_]/.test(srest[p.length] || "")
          ) {
            suffix = srest.slice(0, p.length);
            break;
          }
        }
        if (/^0[bB]/.test(raw) && /[2-9]/.test(raw))
          unsupported(`2進数リテラル ${raw} に 0/1 以外の数字があります`, line);
        if (/^0[oO]/.test(raw) && /[89]/.test(raw))
          unsupported(`8進数リテラル ${raw} に 8/9 が含まれています`, line);
        // R25-N11（C家族分）：不完全な数値リテラル（1e／1e+／1.5e／
        // 0x／123abc／0x1Fg 等）は、核だけを通常の数値として切り取り
        // 残りを別トークンに化けさせると、後段で「; が必要です」と
        // いう虚偽原因（セミコロンは実際に書かれている）になる。
        // 字句の段階（この変換層が C家族の字句の所在）でリテラル
        // 自体を名指して停止する。正当な接尾辞（1e5f／1.5e-3 等）は
        // raw／suffix として消費済みのため対象にならない。ドット＋
        // 数字の継続（1e5.5／1.5.2）もリテラル自体の誤りであり、
        // ドット＋識別子（10.ToString() のメンバーアクセス）は対象外。
        {
          const afterNum = srest.slice(suffix.length);
          if (/^[A-Za-z0-9_]/.test(afterNum)) {
            // RG-373／RG-374：尾部は英数字だけでは不十分（0x'FF の
            // '、1e+_5 の符号と後続を取りこぼす）。表示はリテラル
            // 全文（fullNumericLiteral）にする。停止条件・文言は不変。
            throw new PracticeError(
              `数値リテラルの書き方が不正です：${fullNumericLiteral(rest)}`,
              line,
              "SyntaxError",
            );
          }
          if (afterNum[0] === "." && /[0-9]/.test(afterNum[1] || "")) {
            throw new PracticeError(
              `数値リテラルの書き方が不正です：${fullNumericLiteral(rest)}`,
              line,
              "SyntaxError",
            );
          }
        }
        out += transformNumberLiteral(raw.replace(/[_']/g, ""), suffix, language, line);
        advance(i + raw.length + suffix.length);
        continue;
      }
    }
    out += c;
    advance(i + 1);
  }
  return out;
}
function parse(source, language, deadline) {
  let classes = {},
    code = transformSource(source, language, deadline);
  let p = new ScriptParser(code, language),
    simple = p.simple.bind(p),
    statement = p.statement.bind(p);
  // Token-stream normalization: %= becomes one token, generic type
  // declarations stop honestly, and C# TryParse out-declarations are
  // rewritten to plain variables whose declarations are prepended.
  {
    let ts = [];
    // RG-348（R32-N2）：共有トークナイザは複合代入トークン（<<= 等）を
    // 演算子＋「=」へ分割して返す（AutoHotkey 以外）。C家族では文・式の
    // 両経路で複合代入として扱えるよう、%= と同じく単一トークンへ戻す。
    // 戻さないと RHS の先頭の「=」だけが「式を解釈できません：=」と
    // 断片表示されていた。単なる二項演算（a << b、a & b 等）は直後が
    // 「=」でないため影響しない。
    const compoundMerges = { "<<": "<<=", ">>": ">>=", "&": "&=", "|": "|=", "^": "^=" };
    for (let i = 0; i < p.ts.length; i++) {
      if (p.ts[i].v === "%" && p.ts[i + 1]?.v === "=") {
        ts.push({ v: "%=", line: p.ts[i].line });
        i++;
      } else if (compoundMerges[p.ts[i].v] && p.ts[i + 1]?.v === "=") {
        ts.push({ v: compoundMerges[p.ts[i].v], line: p.ts[i].line });
        i++;
      } else if (
        // R24-N15（C# 部分）根因の本体：共有トークナイザの数値正規表現
        // \d+\.?\d* も `10.ToString()` のドットを小数点として取り込む。
        // 末尾ドットの数値トークンの直後が識別子なら、ドットをメンバー
        // アクセスとして分離する（識別子のドット分割と同じ扱い）。
        // これでリテラル直結メンバーも (10) 形と同じく対象を名指して
        // 止まるようになる。
        p.ts[i].k === "number" &&
        p.ts[i].v.endsWith(".") &&
        p.ts[i + 1]?.k === "id"
      ) {
        ts.push({ ...p.ts[i], v: p.ts[i].v.slice(0, -1) });
        ts.push({ v: ".", line: p.ts[i].line });
      } else ts.push(p.ts[i]);
    }
    p.ts = ts;
  }
  // B8（cpp-engine-b）：C++ の呼び出し引数位置の波括弧初期化子リスト
  // （v.assign({1,2})、insert(it, {1,2}) 等）は、共有パーサが "{" を
  // レコードリテラルとして読んでしまうため、そのままでは受理できない。
  // 呼び出し括弧の直下（直前が "(" または引数区切りの ","）にある "{"
  // と、書き換えたリストの要素位置にある "{" だけを配列リテラルの
  // "[", "]" へ置き換える。ブロック・宣言の初期化子・代入の右辺の
  // "{" は対象外（従来経路が処理する）。C／C# には適用しない。
  if (language === "cpp") {
    const ts = p.ts,
      out = [];
    const stack = []; // {t:"call"|"paren"|"list"|"block"|"bracket"}
    const sigPrev = () => {
      for (let k = out.length - 1; k >= 0; k--)
        if (out[k].v !== "\n") return out[k];
      return null;
    };
    const sigPrev2 = () => {
      let seen = 0;
      for (let k = out.length - 1; k >= 0; k--) {
        if (out[k].v === "\n") continue;
        if (++seen === 2) return out[k];
      }
      return null;
    };
    // 型名そのもの・宣言子（型 名前(…)）の括弧は呼び出しではない
    // （string({...}) の関数形式キャストや string s({…}) の直接初期化は
    // 従来の "{" 経路が処理するため、書き換え対象から外す）。
    const TYPE_WORDS = new Set([
      "int", "long", "double", "float", "bool", "char", "string", "short",
      "unsigned", "signed", "void", "auto", "vector", "array", "pair",
    ]);
    for (let i = 0; i < ts.length; i++) {
      const tk = ts[i],
        v = tk.v;
      if (v === "(") {
        const pv = sigPrev();
        const ppv = sigPrev2();
        const isDeclParen =
          pv?.k === "id" &&
          (TYPE_WORDS.has(pv.v) ||
            TYPE_WORDS.has(ppv?.v) ||
            [">", ">>", "::"].includes(ppv?.v) ||
            ppv?.k === "id");
        const isCall =
          pv &&
          (pv.k === "id" ||
            pv.v === ")" ||
            pv.v === "]") &&
          !isDeclParen &&
          !["if", "for", "while", "switch", "catch"].includes(pv.v);
        stack.push({ t: isCall ? "call" : "paren" });
        out.push(tk);
        continue;
      }
      if (v === ")") {
        while (stack.length && !["call", "paren"].includes(stack.at(-1).t))
          stack.pop();
        if (stack.length) stack.pop();
        out.push(tk);
        continue;
      }
      if (v === "[") {
        stack.push({ t: "bracket" });
        out.push(tk);
        continue;
      }
      if (v === "]") {
        while (stack.length && stack.at(-1).t !== "bracket") stack.pop();
        if (stack.length) stack.pop();
        out.push(tk);
        continue;
      }
      if (v === "{") {
        const pv = sigPrev(),
          top = stack.at(-1);
        const inCallArg =
          top?.t === "call" && pv && (pv.v === "(" || pv.v === ",");
        const inListElem =
          top?.t === "list" && pv && (pv.v === "[" || pv.v === ",");
        if (inCallArg || inListElem) {
          stack.push({ t: "list" });
          out.push({ v: "[", line: tk.line });
          continue;
        }
        stack.push({ t: "block" });
        out.push(tk);
        continue;
      }
      if (v === "}") {
        const top = stack.at(-1);
        if (top?.t === "list") {
          stack.pop();
          out.push({ v: "]", line: tk.line });
          continue;
        }
        if (top?.t === "block") stack.pop();
        out.push(tk);
        continue;
      }
      out.push(tk);
    }
    p.ts = out;
  }
  // B8: 関数オブジェクト（std::greater<int>() 等）の構築は、比較関数を
  // 指定する形式として未対応であることを名指しで止める（cpp のみ）。
  // 通常の比較式と取り違えないよう「名前 <...> (」の形だけを対象にする。
  if (language === "cpp") {
    const FUNCTORS = new Set([
      "greater", "less", "greater_equal", "less_equal", "equal_to", "not_equal_to",
      "plus", "minus", "multiplies", "divides", "modulus", "negate",
      "logical_and", "logical_or", "logical_not",
    ]);
    const ts = p.ts;
    for (let i = 0; i < ts.length; i++) {
      if (ts[i].k !== "id" || !FUNCTORS.has(ts[i].v)) continue;
      if (ts[i + 1]?.v !== "<") continue;
      let depth = 0,
        j = i + 1,
        closed = false;
      for (; j < ts.length; j++) {
        if (ts[j].v === "<") depth++;
        else if (ts[j].v === ">") {
          depth--;
          if (depth === 0) { closed = true; break; }
        } else if (ts[j].v === ">>") {
          depth -= 2;
          if (depth <= 0) { closed = true; break; }
        }
      }
      if (closed && ts[j + 1]?.v === "(")
        unsupported(
          "比較関数や演算を指定する形式（関数オブジェクト）は未対応です",
          ts[i].line,
        );
    }
  }
  const genericNames =
    language === "cpp"
      ? ["vector", "set", "map", "pair", "unordered_map", "unordered_set", "deque", "queue", "stack", "list",
         // A8班（高度A8監査）：カタログ収載のクラステンプレートのうち
         // 従来リストに無く、宣言が汎用エラーに化けていたもの
         // （std::optional の初期化子形が「代入先が不正です」等）。
         // いずれも値モデル未実装のため、map／set と同じ名指しで止める。
         "optional", "variant", "tuple", "span", "expected", "function",
         "complex", "bitset", "valarray", "shared_ptr", "unique_ptr",
         "weak_ptr", "priority_queue", "multimap", "multiset",
         "unordered_multimap", "unordered_multiset", "forward_list",
         "basic_string", "initializer_list", "atomic", "lock_guard",
         "unique_lock", "scoped_lock", "shared_lock", "promise", "future",
         "packaged_task", "barrier", "counting_semaphore"]
      : language === "csharp"
        ? ["List", "Dictionary", "HashSet", "Queue", "Stack", "SortedDictionary", "SortedSet", "LinkedList"]
        : [];
  for (let i = 0; i < p.ts.length; i++) {
    if (!genericNames.includes(p.ts[i].v) || p.ts[i + 1]?.v !== "<") continue;
    let depth = 0,
      close = -1;
    for (let j = i + 1; j < p.ts.length; j++) {
      const v = p.ts[j].v;
      if (v === "<") depth++;
      else if (v === ">") {
        depth--;
        if (depth === 0) {
          close = j;
          break;
        }
      } else if (["<<", ">>", ";", ")", "<eof>"].includes(v)) break;
    }
    if (close < 0) continue;
    const after = p.ts[close + 1];
    // B8（cpp-engine-b）：高度モードで値モデルを実装した3クラス
    // （vector／array／pair）の宣言と、そのイテレータ型の宣言は
    // 未対応にせず、宣言パーサ（tryParseCppDecl）へ委ねる。それ以外
    // のジェネリック型（set／map／deque 等）は従来どおり名指しで止める。
    if (
      language === "cpp" &&
      ["vector", "array", "pair"].includes(p.ts[i].v) &&
      after &&
      (after.k === "id" || after.v === "::")
    )
      continue;
    if (after && (after.k === "id" || after.v === "(" || after.v === "["))
      unsupported(
        `ジェネリック型 ${p.ts[i].v}<...> の宣言は未対応です`,
        p.ts[i].line,
      );
  }
  // A6監査CF-06：C の複素数型（double complex 等）の宣言は、宣言パーサが
  // 「; が必要です」という汎用構文エラーで止めていた。div_t 等の単一型名と
  // 同じく、型を名指して止める。変数名としての complex（<complex.h> を
  // 読まない文脈では通常の識別子）と区別するため、浮動小数点型の語
  // （float／double／long）の直後に complex／_Complex が続き、その次が
  // 宣言子名（識別子）の形だけを対象にする。
  if (language === "c") {
    const prevSig = (j) => {
      while (j >= 0 && p.ts[j]?.v === "\n" && !p.ts[j]?.k) j--;
      return j;
    };
    const nextSig = (j) => {
      while (p.ts[j]?.v === "\n" && !p.ts[j]?.k) j++;
      return j;
    };
    const FLOATW = ["float", "double", "long"];
    for (let i = 0; i < p.ts.length; i++) {
      const t = p.ts[i];
      if (t.v !== "complex" && t.v !== "_Complex") continue;
      const pi = prevSig(i - 1),
        pv = p.ts[pi]?.v;
      const ni = nextSig(i + 1),
        nv = p.ts[ni]?.v;
      let typeName = null;
      if (FLOATW.includes(pv) && p.ts[ni]?.k === "id") {
        const longBefore = pv === "double" && p.ts[prevSig(pi - 1)]?.v === "long";
        typeName = (longBefore ? "long double" : pv === "long" ? "long double" : pv) + " complex";
      } else if (t.v === "_Complex" && FLOATW.includes(nv) && p.ts[nextSig(ni + 1)]?.k === "id") {
        typeName = (nv === "long" ? "long double" : nv) + " complex";
      }
      if (typeName) unsupported(`型 ${typeName} の宣言は未対応です`, t.line);
    }
  }
  // A8班（高度A8監査・C++）：未対応の修飾名・構文が式パーサの汎用
  // 構文エラー（「; が必要です」「) が必要です」等、原因を誤認させる
  // 文言）に化けていた3系統を、受理範囲は変えずに名指しで止める。
  // いずれも cpp のみ。C／C# のトークン列には適用しない。
  if (language === "cpp") {
    const ts = p.ts;
    const prevSigIdx = (j) => {
      for (let k = j - 1; k >= 0; k--) if (ts[k].v !== "\n") return k;
      return -1;
    };
    const skipAnglesFwd = (j) => {
      // ts[j] === "<" から対応する ">" の次を返す。無ければ -1。
      let depth = 0;
      for (; j < ts.length; j++) {
        if (ts[j].v === "<") depth++;
        else if (ts[j].v === ">") {
          depth--;
          if (depth === 0) return j + 1;
        } else if (ts[j].v === ">>") {
          depth -= 2;
          if (depth <= 0) return j + 1;
        }
      }
      return -1;
    };
    // (1) 修飾名チェーン（std::ranges::sort、std::filesystem::path、
    // std::execution::par、std::string::size_type 等）。変換層で
    // std:: は除かれるため、トークン列では先頭セグメントから読む。
    // 除外：string／vector／array のイテレータ型（宣言パーサが処理
    // する）、std::numbers::* と std::string::npos（変換層でメンバ
    // 参照へ寄せられる正規形。空白を挟んだ形に備えた保険）、同一
    // ソース内で宣言された利用者型の名前（宣言自体が別途名指しで
    // 止まるため、その文言を優先する）。
    {
      const ITER = new Set([
        "iterator", "const_iterator", "reverse_iterator", "const_reverse_iterator",
      ]);
      const declaredHeads = new Set();
      for (let i = 0; i < ts.length; i++) {
        if (["enum", "struct", "class", "namespace", "typedef", "union"].includes(ts[i].v)) {
          const nx = ts[i + 1];
          if (nx?.k === "id") declaredHeads.add(nx.v);
          else if (nx?.v === "class" && ts[i + 2]?.k === "id")
            declaredHeads.add(ts[i + 2].v);
        }
      }
      for (let i = 0; i < ts.length; i++) {
        if (ts[i].k !== "id") continue;
        if (ts[i - 1]?.v === "::" || ts[i - 1]?.v === ".") continue;
        let j = i + 1;
        if (ts[j]?.v === "<") {
          const e = skipAnglesFwd(j);
          if (e < 0) continue;
          j = e;
        }
        if (ts[j]?.v !== "::") continue;
        const segments = [ts[i].v];
        let okChain = true;
        while (ts[j]?.v === "::") {
          const seg = ts[j + 1];
          if (!seg || seg.k !== "id") { okChain = false; break; }
          segments.push(seg.v);
          j += 2;
          if (ts[j]?.v === "<") {
            const e = skipAnglesFwd(j);
            if (e < 0) { okChain = false; break; }
            j = e;
          }
        }
        if (!okChain || segments.length < 2) continue;
        const tail = segments[segments.length - 1];
        if (ITER.has(tail) && ["string", "vector", "array"].includes(segments[0])) continue;
        if (segments[0] === "numbers") continue;
        if (segments.length === 2 && segments[0] === "string" && tail === "npos") continue;
        if (declaredHeads.has(segments[0])) continue;
        unsupported(`std::${segments.join("::")} は未対応です`, ts[i].line);
      }
    }
    // (2) 明示的なテンプレート引数を付けた呼び出し
    // （std::make_pair<int, int>(...) 等）。関数形式キャストや比較式
    // （a < b > (c)）と取り違えないよう、引数リストの形（型名・
    // カンマ・:: のみで構成され、カンマ／::／型キーワード始まりの
    // いずれかを含む）だけを対象にする。ジェネリック型名と関数
    // オブジェクト名は先行する各チェックが処理するため除外する。
    {
      const TYPE_HEADS = new Set([
        "int", "long", "double", "float", "char", "bool", "unsigned",
        "signed", "short", "void", "size_t",
      ]);
      const FN_SET = new Set([
        "make_pair", "byteswap", "forward", "move", "swap", "make_tuple",
        "make_unique", "make_shared", "make_optional",
      ]);
      const EXCLUDED = new Set([
        ...genericNames,
        "greater", "less", "greater_equal", "less_equal", "equal_to",
        "not_equal_to", "plus", "minus", "multiplies", "divides",
        "modulus", "negate", "logical_and", "logical_or", "logical_not",
        "if", "for", "while", "switch", "catch", "return", "sizeof",
        "static_cast", "dynamic_cast", "const_cast", "reinterpret_cast",
        "new", "delete", "throw", "string", "vector", "array", "pair",
      ]);
      for (let i = 0; i < ts.length; i++) {
        if (ts[i].k !== "id" || EXCLUDED.has(ts[i].v)) continue;
        if (ts[i + 1]?.v !== "<") continue;
        const close = skipAnglesFwd(i + 1);
        if (close < 0 || ts[close]?.v !== "(") continue;
        const pi = prevSigIdx(i);
        if (pi >= 0 && (ts[pi].k === "id" || ts[pi].v === ")" || ts[pi].v === "]" || ts[pi].k === "number")) continue;
        const inner = ts.slice(i + 2, close - 1);
        if (!inner.length) continue;
        const allowed = (t) =>
          t.k === "id" || t.k === "number" ||
          [",", "::", "<", ">", ">>", "*", "&"].includes(t.v);
        if (!inner.every(allowed)) continue;
        const discriminated =
          inner.some((t) => t.v === "," || t.v === "::") ||
          TYPE_HEADS.has(inner[0].v) ||
          FN_SET.has(ts[i].v);
        if (!discriminated) continue;
        unsupported(
          `明示的なテンプレート引数（${ts[i].v}<...>）は未対応です`,
          ts[i].line,
        );
      }
    }
    // (3) ラムダ式。添字（直前が識別子等）と取り違えないよう、引数・
    // 初期化の位置にある "[" で、捕捉リストの形をしていて、直後に
    // 引数リスト／本体が続くものだけを対象にする。呼び出しの引数内
    // にある場合は、その呼び出し名も併せて名指す。
    {
      for (let i = 0; i < ts.length; i++) {
        if (ts[i].v !== "[") continue;
        const pi = prevSigIdx(i);
        if (pi < 0) continue;
        if (!["(", ",", "=", "return"].includes(ts[pi].v)) continue;
        let depth = 0,
          closeB = -1;
        for (let j = i; j < ts.length; j++) {
          if (ts[j].v === "[") depth++;
          else if (ts[j].v === "]") {
            depth--;
            if (depth === 0) { closeB = j; break; }
          }
        }
        if (closeB < 0) continue;
        const inner = ts.slice(i + 1, closeB);
        const captureLike = inner.every(
          (t) => t.k === "id" || t.k === "number" ||
            ["&", "=", ",", "*", "[", "]"].includes(t.v),
        );
        if (!captureLike) continue;
        let nx = closeB + 1;
        while (ts[nx]?.v === "\n") nx++;
        if (!["(", "{", "->"].includes(ts[nx]?.v)) continue;
        // 囲んでいる呼び出しの名前を後方走査で特定する。
        let callee = null,
          d2 = 0;
        for (let k = i - 1; k >= 0; k--) {
          const v = ts[k].v;
          if (v === ")") d2++;
          else if (v === "(") {
            if (d2 === 0) {
              const ci = prevSigIdx(k);
              if (ci >= 0 && ts[ci].k === "id") callee = ts[ci].v;
              break;
            }
            d2--;
          } else if (d2 === 0 && (v === ";" || v === "{" || v === "}")) break;
        }
        if (callee)
          unsupported(`${callee} へ渡すラムダ式は未対応です`, ts[i].line);
        unsupported("ラムダ式は未対応です", ts[i].line);
      }
    }
  }
  // RG-365〜RG-369（修正バッチ12・C#班）共通の先読みヘルパー群。
  // いずれもトークン列に対する純粋な形検査であり、受理範囲は変えず、
  // 未対応構文を「第一トークンで構文名を名指す」ための判定にだけ使う。
  // sigNext：改行トークンを読み飛ばした次の有意トークンの位置。
  const sigNext = (ts, j) => {
    while (ts[j]?.v === "\n" && !ts[j]?.k) j++;
    return j;
  };
  // attrBracketEnd：start の "[" が属性1つ分の角括弧（[名前]／
  // [名前(引数)]／[対象: 名前]／[A, B] 等）の形に一致すれば、閉じ "]"
  // の次の有意位置を返す。一致しなければ -1。添字（[0]／[式]）は
  // 先頭が識別子でない・式演算子を含むため一致しない。
  const attrBracketEnd = (ts, start) => {
    let j = sigNext(ts, start + 1);
    for (;;) {
      // 対象指定子（assembly:／return: 等）。
      if (ts[j]?.k === "id" && ts[sigNext(ts, j + 1)]?.v === ":")
        j = sigNext(ts, j + 2);
      if (ts[j]?.k !== "id") return -1;
      j = sigNext(ts, j + 1);
      while (ts[j]?.v === "." && ts[sigNext(ts, j + 1)]?.k === "id")
        j = sigNext(ts, j + 2);
      if (ts[j]?.v === "(") {
        let depth = 0,
          ok = false;
        for (let k = j; k < ts.length; k++) {
          const v = ts[k].v;
          if (v === "(") depth++;
          else if (v === ")") {
            depth--;
            if (depth === 0) {
              j = sigNext(ts, k + 1);
              ok = true;
              break;
            }
          } else if (v === "<eof>") break;
        }
        if (!ok) return -1;
      }
      if (ts[j]?.v === ",") {
        j = sigNext(ts, j + 1);
        continue;
      }
      if (ts[j]?.v === "]") return sigNext(ts, j + 1);
      return -1;
    }
  };
  // genericArgsEnd：start の "<" から始まる型引数リストの内容が
  // 型らしいトークン（識別子・カンマ・入れ子の <>・?・[]・.）だけで
  // 構成されれば、閉じ ">" の次の有意位置を返す。比較式（a < b）は
  // 閉じ ">" が無い／内容に演算子を含むため一致しない。
  const genericArgsEnd = (ts, start) => {
    let depth = 0,
      hasId = false;
    for (let j = start; j < ts.length; j++) {
      const tk = ts[j],
        v = tk?.v;
      if (v === "\n" && !tk.k) continue;
      if (v === "<") depth++;
      else if (v === ">" || v === ">>") {
        depth -= v === ">>" ? 2 : 1;
        if (depth === 0) return hasId ? sigNext(ts, j + 1) : -1;
        if (depth < 0) return -1;
      } else if (
        depth >= 1 &&
        (tk.k === "id" || [",", "?", "[", "]", "."].includes(v))
      ) {
        if (tk.k === "id") hasId = true;
      } else return -1;
    }
    return -1;
  };
  // parenCommaInfo：start の "(" に対応する ")" の位置と、最上位
  // カンマの有無、カンマ区切りの各要素が全て型らしい並びか
  // （タプルリテラルとタプル型キャストの切り分け用）を返す。
  const parenCommaInfo = (ts, start) => {
    let depth = 0,
      close = -1;
    const segments = [];
    let cur = [];
    for (let j = start; j < ts.length; j++) {
      const tk = ts[j],
        v = tk?.v;
      if (v === "\n" && !tk.k) continue;
      if (v === "<eof>") break;
      if (["(", "[", "{"].includes(v)) {
        depth++;
        if (depth > 1) cur.push(tk);
        continue;
      }
      if ([")", "]", "}"].includes(v)) {
        depth--;
        if (depth === 0) {
          close = j;
          break;
        }
        cur.push(tk);
        continue;
      }
      if (depth === 1 && v === ",") {
        segments.push(cur);
        cur = [];
        continue;
      }
      if (depth >= 1) cur.push(tk);
    }
    if (close < 0) return null;
    segments.push(cur);
    const typeLike = (seg) =>
      seg.length > 0 &&
      seg.some((t) => t.k === "id") &&
      seg.every(
        (t) =>
          t.k === "id" ||
          [".", "<", ">", ">>", "?", "[", "]"].includes(t.v),
      );
    return {
      close,
      hasTopComma: segments.length > 1,
      allTypeLike: segments.every(typeLike),
    };
  };
  let pendingDecls = [];
  if (language === "csharp") {
    // R25-N27 の判定用：`_` が通常の変数として宣言されているか
    // （型名の直後に `_` が来る宣言形）をトークン列から先に見る。
    // 宣言済みの `_` への `out _` はその変数への代入として扱い、
    // 未宣言の場合の `out _` だけをディスカードとして扱う。
    const underscoreDeclared = (() => {
      const typeWords = ["int", "long", "double", "float", "short", "uint", "ulong", "ushort", "byte", "sbyte", "char", "bool", "string", "var"];
      for (let t = 1; t < p.ts.length; t++)
        if (
          p.ts[t].v === "_" &&
          p.ts[t].k === "id" &&
          typeWords.includes(p.ts[t - 1]?.v)
        )
          return true;
      return false;
    })();
    // === 高度モード ブロックB5（C#）修正2A：TryParse 一般化（ここから） ===
    // CS-F08／CS-F09-1：TryParse のレシーバを「型名.TryParse」一般へ
    // 広げる。int／double は CLR 名（Int32／Double）もエイリアスへ
    // 正規化して既存意味論で実行し、それ以外の型は out を取り除いて
    // 解析を通し、実行時の call 側（B5 修正2Aブロック）で項目名を
    // 挙げた名前付き停止にする。値がエイリアス文字列の型だけが対応。
    const CS_B5_TRYPARSE = {
      int: "int", Int32: "int", double: "double", Double: "double",
      long: null, Int64: null, float: null, Single: null,
      bool: null, Boolean: null, char: null, Char: null,
      byte: null, Byte: null, sbyte: null, SByte: null,
      short: null, Int16: null, ushort: null, UInt16: null,
      uint: null, UInt32: null, ulong: null, UInt64: null,
      decimal: null, Decimal: null, DateTime: null, TimeSpan: null,
    };
    // CLR 型名 → エイリアス（out 宣言の型名の正規化に使う）。
    const CS_B5_CLR_ALIAS = {
      Int32: "int", Int64: "long", Int16: "short", UInt16: "ushort",
      UInt32: "uint", UInt64: "ulong", SByte: "sbyte", Byte: "byte",
      Char: "char", Boolean: "bool", Single: "float", Double: "double",
      Decimal: "decimal",
    };
    // === 高度モード ブロックB5（C#）修正2A：TryParse 一般化（ここまで） ===
    for (let i = 2; i < p.ts.length; i++) {
      if (
        p.ts[i].v !== "TryParse" ||
        p.ts[i - 1].v !== "." ||
        !Object.hasOwn(CS_B5_TRYPARSE, p.ts[i - 2].v) ||
        p.ts[i + 1]?.v !== "("
      )
        continue;
      const baseType = p.ts[i - 2].v;
      // === 高度モード ブロックB5（C#）修正2A：TryParse 一般化（ここから） ===
      // 対応型の CLR 名レシーバはエイリアスへ書き換え、call 側の
      // 既存の int.TryParse／double.TryParse 意味論へ届ける。
      const tryParseAlias = CS_B5_TRYPARSE[baseType];
      if (tryParseAlias && tryParseAlias !== baseType)
        p.ts[i - 2].v = tryParseAlias;
      // === 高度モード ブロックB5（C#）修正2A：TryParse 一般化（ここまで） ===
      // R25-N26：第2引数が存在するのに out で始まらない呼び出しは、
      // 実 C# では CS1620 のコンパイルエラー（dotnet 実測）。out の
      // 有無は実行時には区別できない（書き換えで out が取り除かれる）
      // ため、トークン段階で検証し、左辺ではなく引数そのものを
      // 名指して停止する。引数が1つだけの形は従来どおり呼び出し側の
      // 形式エラーに委ねる。
      {
        let depth = 0,
          close = -1;
        const commas = [];
        for (let j = i + 1; j < p.ts.length; j++) {
          const v = p.ts[j].v;
          if (v === "(") depth++;
          else if (v === ")") {
            depth--;
            if (depth === 0) {
              close = j;
              break;
            }
          } else if (depth === 1 && v === ",") commas.push(j);
          else if (v === "<eof>") break;
        }
        if (close > 0 && commas.length) {
          let a2 = commas[0] + 1;
          while (p.ts[a2]?.v === "\n") a2++;
          if (a2 < close && p.ts[a2]?.v !== "out")
            throw new PracticeError(
              `${baseType}.TryParse の第2引数は out キーワードを付けて渡す必要があります（CS1620）`,
              p.ts[i].line,
              "CompileError",
            );
        }
      }
      let depth = 0;
      for (let j = i + 1; j < p.ts.length; j++) {
        const v = p.ts[j].v;
        if (v === "(") depth++;
        else if (v === ")") {
          depth--;
          if (depth === 0) break;
        }
        if (depth === 1 && v === "out") {
          const n1 = p.ts[j + 1],
            n2 = p.ts[j + 2];
          p.ts.splice(j, 1);
          // R25-N27：`out _` は C# 7 以降のディスカードで合法
          // （dotnet 実測で True を返す）。宣言されていない `_` を
          // 変数として書き込もうとすると「変数が宣言されていません」
          // という虚偽理由になるため、専用マーカーへ置き換え、
          // 呼び出し側で書き込みを省略する（変数は生成しない）。
          // 宣言済みの `_` は通常の変数として扱い対象にしない。
          if (
            n1?.v === "_" &&
            !underscoreDeclared &&
            (n2?.v === ")" || n2?.v === ",")
          ) {
            p.ts[j] = { v: "__tryParseDiscard", k: "id", line: n1.line };
            break;
          }
          if (
            n1?.k === "id" &&
            n2?.k === "id" &&
            ["int", "long", "double", "float", "short", "uint", "ulong", "ushort", "byte", "sbyte", "char", "bool", "string", "var", "Int32", "Int64", "Int16", "UInt16", "UInt32", "UInt64", "SByte", "Byte", "Char", "Boolean", "Single", "Double", "Decimal", "decimal", "DateTime", "TimeSpan"].includes(n1.v)
          ) {
            p.ts.splice(j, 1);
            // === 高度モード ブロックB5（C#）修正2A（ここから） ===
            // out 宣言の型名は CLR 名でもエイリアスへ正規化する
            // （var の場合はレシーバ型。未対応型はレシーバの型名）。
            const declType =
              n1.v === "var"
                ? (tryParseAlias ?? CS_B5_CLR_ALIAS[baseType] ?? baseType)
                : (CS_B5_CLR_ALIAS[n1.v] ?? n1.v);
            // === 高度モード ブロックB5（C#）修正2A（ここまで） ===
            pendingDecls.push({
              k: "declare",
              name: n2.v,
              type: declType,
              // === 高度モード ブロックB5（C#）修正2A（ここから） ===
              // bool／string の out 宣言は数値 0 では初期化できない
              // ため、型の既定値を置く（数値型は従来どおり 0）。
              value: {
                k: "literal",
                value: declType === "bool" ? false : declType === "string" ? null : 0,
                line: n2.line,
              },
              // === 高度モード ブロックB5（C#）修正2A（ここまで） ===
              line: n2.line,
              refs: [declType],
            });
          }
          break;
        }
      }
    }
    // === 高度モード ブロックB5（C#）修正2A：ref／out／in 引数修飾（ここから） ===
    // CS-F09-2：managed の呼び出し引数で ref／out／in 修飾を構文として
    // 受理する。修飾は引数の先頭（直前の有意トークンが "(" または ","）
    // でのみ取り除き、ディスパッチ先（高度側の名前付き停止等）へ届く
    // ようにする。foreach の in や ref ローカル（直前が "="）は引数
    // 位置ではないため対象外。TryParse の out は上の専用処理で除去
    // 済みであり、ここに残る out はその他の呼び出しのものである。
    // out 型名 変数名 の形は TryParse と同じく宣言として取り出す。
    {
      const sigIdxB5 = (from) => {
        let j = from;
        while (p.ts[j]?.v === "\n" && !p.ts[j]?.k) j++;
        return j;
      };
      const rebuilt = [];
      let prevSigV = null;
      for (let idx = 0; idx < p.ts.length; idx++) {
        const tk = p.ts[idx];
        if (tk.v === "\n" && !tk.k) {
          rebuilt.push(tk);
          continue;
        }
        if (
          ["ref", "in", "out"].includes(tk.v) &&
          (prevSigV === "(" || prevSigV === ",")
        ) {
          const j1 = sigIdxB5(idx + 1),
            n1 = p.ts[j1];
          if (n1?.k === "id" && n1.v !== "_") {
            if (tk.v === "out") {
              const j2 = sigIdxB5(j1 + 1),
                n2 = p.ts[j2];
              if (
                n2?.k === "id" &&
                ["int", "long", "double", "float", "short", "uint", "ulong", "ushort", "byte", "sbyte", "char", "bool", "string", "var", "Int32", "Int64", "Int16", "UInt16", "UInt32", "UInt64", "SByte", "Byte", "Char", "Boolean", "Single", "Double", "Decimal", "decimal", "DateTime", "TimeSpan"].includes(n1.v)
              ) {
                const declType =
                  n1.v === "var" ? "int" : (CS_B5_CLR_ALIAS[n1.v] ?? n1.v);
                pendingDecls.push({
                  k: "declare",
                  name: n2.v,
                  type: declType,
                  value: {
                    k: "literal",
                    value: declType === "bool" ? false : declType === "string" ? null : 0,
                    line: n2.line,
                  },
                  line: n2.line,
                  refs: [declType],
                });
                idx = j2 - 1; // 型名まで読み飛ばし、変数名は引数として残す
                continue;
              }
            }
            continue; // 修飾トークンだけを取り除く
          }
        }
        rebuilt.push(tk);
        prevSigV = tk.v;
      }
      p.ts = rebuilt;
    }
    // === 高度モード ブロックB5（C#）修正2A：ref／out／in 引数修飾（ここまで） ===
  }
  if (["c", "cpp"].includes(language)) p.parseCast = function(meta) {
    const start = this.i;
    const first = this.ts[start]?.v;
    if (classes[first]) unsupported("キャストのこの形式は未対応です（クラス型）", meta.line);
    const typeWords = ["int", "double", "float", "char", "long", "unsigned", "signed", "short", "bool", "void", "const", "volatile", "struct", "unsigned int", "unsigned long", "unsigned short", "unsigned char", "signed char"];
    if (!typeWords.includes(first)) {
      const after = this.ts[start + 1]?.v, operand = this.ts[start + 2];
      if (this.ts[start]?.k === "id" && ((after === ")" && (operand?.k === "id" || operand?.k === "number" || operand?.v === "(")) || (after === "*" && this.ts[start + 2]?.v === ")"))) unsupported("キャストのこの形式は未対応です（独自型・ポインタ型）", meta.line);
      return null;
    }
    const words = [];
    while (this.ts[this.i]?.k === "id" && typeWords.includes(this.ts[this.i].v)) words.push(this.take().v);
    if (!this.peek(")")) unsupported("キャストのこの形式は未対応です（ポインタ・参照・修飾型等）", meta.line);
    this.take(")");
    const forms = {
      int:"int", signed:"int", "signed int":"int", unsigned:"unsigned int", "unsigned int":"unsigned int",
      short:"short", "short int":"short", "signed short":"short", "signed short int":"short", "unsigned short":"unsigned short", "unsigned short int":"unsigned short",
      long:"long", "long int":"long", "signed long":"long", "signed long int":"long", "unsigned long":"unsigned long", "unsigned long int":"unsigned long",
      char:"char", "signed char":"signed char", "unsigned char":"unsigned char", float:"float", double:"double", bool:"bool"
    };
    const type = forms[words.join(" ")];
    if (!type || (language === "c" && type === "bool")) unsupported("キャストのこの形式は未対応です：" + words.join(" "), meta.line);
    return {...meta, k:"cast", type, arg:this.expr(10)};
  };
  if (["c", "cpp"].includes(language)) p.parseSizeof = function(meta, consume = false) {
    if (!this.peek("(")) return false;
    let depth = 0,
      end = -1;
    for (let j = this.i; j < this.ts.length; j++) {
      const v = this.ts[j].v;
      if (v === "(") depth++;
      else if (v === ")") {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      } else if (v === "<eof>") break;
    }
    if (end < 0) return false;
    const inner = this.ts.slice(this.i + 1, end),
      typeWords = ["int", "double", "float", "char", "long", "unsigned", "signed", "short", "bool", "void", "const", "volatile", "struct", "unsigned int", "unsigned long", "unsigned short", "unsigned char", "signed char"];
    const isTypeForm =
      inner.length > 0 &&
      (typeWords.includes(inner[0].v) ||
        inner.some((t) => t.v === "*" || t.v === "&"));
    if (!isTypeForm) return false;
    let k = this.i + 1;
    const words = [];
    while (k < end && typeWords.includes(this.ts[k].v) && this.ts[k].v !== "struct" && this.ts[k].v !== "void") words.push(this.ts[k++].v);
    if (!words.length || k !== end)
      unsupported(
        `sizeof(${inner.map((t) => t.v).join(" ")}) は未対応です：ポインタ型・構造体型・修飾型の sizeof`,
        meta?.line ?? this.ts[this.i].line,
      );
    if (!consume) return true;
    this.i = end + 1;
    let type = words.join(" ").replace(/^signed (?!char)/, "").replace(/^(unsigned|signed)$/, "$1 int").replace(/ (short|long) int$/, " $1");
    if (type === "long int") type = "long";
    if (type === "short int") type = "short";
    if (type === "long long") type = "long";
    if (type === "unsigned long long") type = "unsigned long";
    if (type === "signed long long") type = "long";
    return {...meta,k:"unary",op:"sizeof",arg:{...meta,k:"type",type}};
  };
  if (language === "csharp") p.parseCast = function(meta) {
    const start = this.i;
    const first = this.ts[start]?.v;
    // RG-369 兄弟表面（修正バッチ12・C#班）：ジェネリック型への
    // キャスト（(Func<int, int>)x 等）は、型そのものを名指す。
    // 直後が ")" の場合だけが対象で、ジェネリックメソッド呼出し
    // （(M<int>(3)) 等）や比較の括弧式（(a < b > c) 等）には届かない。
    if (
      this.ts[start]?.k === "id" &&
      this.ts[sigNext(this.ts, start + 1)]?.v === "<"
    ) {
      const end = genericArgsEnd(this.ts, sigNext(this.ts, start + 1));
      if (end > 0 && this.ts[end]?.v === ")")
        unsupported(`ジェネリック型 ${first}<...>`, meta.line);
    }
    const csTypes = ["int", "long", "double", "float", "char", "bool", "short", "uint", "ulong", "ushort", "byte", "sbyte", "string", "decimal"];
    // D14 追随（修正バッチ2・追随班）：キャスト位置の C 形式の型名
    // （(unsigned int)5 等）も、宣言位置と同様に正名を提示して停止する。
    // 複合型名（unsigned int 等）は後ろに ")" が続く場合にキャストと
    // みなす。単独の unsigned／signed は、後ろに被演算子らしい
    // トークンが続く場合だけキャストとみなし、同名変数の括弧式と
    // 誤認しない。
    if (["unsigned", "signed"].includes(first)) {
      const cWords = [];
      let j = start;
      while (
        ["int", "long", "short", "char", "unsigned", "signed"].includes(this.ts[j]?.v)
      )
        cWords.push(this.ts[j++].v);
      const afterParen = this.ts[j]?.v === ")" ? this.ts[j + 1] : null;
      const looksLikeCast =
        this.ts[j]?.v === ")" &&
        (cWords.length > 1 ||
          (afterParen &&
            (afterParen.k === "id" ||
              afterParen.k === "number" ||
              afterParen.v === "(")));
      if (looksLikeCast) {
        const suggestion =
          {
            "unsigned int": "uint",
            "unsigned long": "ulong",
            "unsigned short": "ushort",
            "unsigned char": "byte",
            "signed char": "sbyte",
            "signed int": "int",
            "signed long": "long",
            "signed short": "short",
            unsigned: "uint",
            signed: "int",
          }[cWords.join(" ")] || "対応する C# の型";
        unsupported(
          `C# に「${cWords.join(" ")}」という型名はありません（${suggestion} を使います）`,
          meta.line,
        );
      }
      return null;
    }
    if (!csTypes.includes(first)) return null;
    if (first === "decimal") unsupported("decimal 型へのキャストは未対応です", meta.line);
    this.take();
    // RG-351：キャスト位置の nullable 型（(int?)x 等）も型を名指す。
    if (this.peek("?")) unsupported(`nullable 型（${first}?）`, meta.line);
    if (!this.peek(")")) {
      this.i = start;
      return null;
    }
    this.take(")");
    return { ...meta, k: "cast", type: first, arg: this.expr(10) };
  };
  const origExpr = p.expr.bind(p);
  p.parseNewExpr = function () {
    const start = this.take(),
      meta = { line: start.line };
    const typeTok = this.take();
    if (typeTok.k !== "id")
      throw new PracticeError("new の後に型名が必要です", start.line);
    const typeName = typeTok.v;
    if (this.peek("[")) {
      this.take();
      if (this.peek("]")) {
        this.take();
        if (this.peek("{")) {
          this.take();
          let values = [];
          while (!this.peek("}")) {
            values.push(this.expr());
            if (!this.peek(",")) break;
            this.take();
          }
          this.take("}");
          return { ...meta, k: "array", values, elemType: typeName };
        }
        unsupported("new " + typeName + "[] のこの形式は未対応です", start.line);
      }
      // R28-N19：式位置の new でも多次元（new int[2,2]）とジャグ
      // （new int[2][]）を読めるようにする（宣言経路と同形）。
      let counts = [this.expr()];
      while (this.peek(",")) {
        this.take();
        counts.push(this.expr());
      }
      this.take("]");
      let jaggedSuffix = 0;
      while (this.peek("[")) {
        const saveJag = this.i;
        this.take();
        if (this.peek("]")) {
          this.take();
          jaggedSuffix++;
        } else {
          this.i = saveJag;
          break;
        }
      }
      if (this.peek("{")) {
        if (counts.length > 1 || jaggedSuffix > 0)
          unsupported("new による多次元／ジャグ配列の初期化子は未対応です", start.line);
        this.take();
        let values = [];
        while (!this.peek("}")) {
          values.push(this.expr());
          if (!this.peek(",")) break;
          this.take();
        }
        this.take("}");
        // R24-N11 根因：宣言長が捨てられ、要素数との不一致を検証できて
        // いなかった。size として保持し、評価時に CS0847 相当で止める。
        return { ...meta, k: "array", values, size: counts[0], elemType: typeName };
      }
      if (counts.length > 1) {
        if (jaggedSuffix > 0)
          unsupported("new " + typeName + "[,] の後に [] を続ける形式は未対応です", start.line);
        return {
          ...meta,
          k: "construct",
          name: typeName + "[" + ",".repeat(counts.length - 1) + "]",
          args: counts,
        };
      }
      if (jaggedSuffix > 0)
        return {
          ...meta,
          k: "construct",
          name: typeName + "[]".repeat(jaggedSuffix + 1),
          args: counts,
        };
      return { ...meta, k: "construct", name: typeName + "[]", args: counts };
    }
    if (this.peek("(")) {
      this.take();
      let args = [];
      while (!this.peek(")")) {
        args.push(this.expr());
        if (!this.peek(",")) break;
        this.take();
      }
      this.take(")");
      return { ...meta, k: "construct", name: typeName, args };
    }
    unsupported("new " + typeName + " のこの形式は未対応です", start.line);
  };
  p.expr = function (min = 0) {
    const SHARED = { "||": 0, "&&": 1, "|": 2, "^": 3, "&": 4, "==": 5, "!=": 5, "<": 6, ">": 6, "<=": 6, ">=": 6, "<<": 7, ">>": 7, "+": 8, "-": 8, "*": 9, "/": 9, "%": 9 }; // RG-49（統合で是正）: C 標準の優先順位（script.js の cPrec と同じ並び、シフトは cout チェーン処理のため 7 に置く）
    // Inside parentheses the cout-chain flag does not apply: a "(" starts a
    // genuinely nested expression where << is a real shift operator.
    let savedChain = 0;
    if (this.coutChain && ["(", "["].includes(this.ts[this.i - 1]?.v)) {
      savedChain = this.coutChain;
      this.coutChain = 0;
    }
    let t = this.ts[this.i],
      a;
    // RG-367／RG-369（修正バッチ12・C#班）：sizeof／typeof／nameof／
    // stackalloc は式のどの位置（被演算子位置を含む）でも演算子・
    // 構文そのものを名指す。従来は識別子として読み進めてしまい、
    // 引数の型名が「未定義の名前」という虚偽帰属になっていた
    // （RG-351 で是正された default(int) の同型残余）。nameof は
    // 文脈キーワードのため、直後が "(" の形だけを対象にする。
    // RG-366：括弧内に最上位カンマがある形は C# ではタプル
    // （リテラル・型・分解代入）であり、カンマ演算子は存在しない。
    // 要素が全て型らしい並びで、直後に被演算子が続き、その後ろが
    // 代入・区切りでない場合だけはタプル型キャストとして対象外に
    // する（(int, int) t = ... の宣言形は被演算子の後ろが = に
    // なるためタプル側に残る）。
    if (language === "csharp") {
      if (
        ["sizeof", "typeof", "nameof"].includes(t?.v) &&
        this.ts[sigNext(this.ts, this.i + 1)]?.v === "("
      )
        unsupported(`${t.v} 演算子`, t.line);
      if (t?.v === "stackalloc") unsupported("stackalloc 式", t.line);
      if (t?.v === "(" && !t.k) {
        const info = parenCommaInfo(this.ts, this.i);
        // 括弧内全体が単一のジェネリック型（(Func<int, int>)x の
        // キャスト等）の場合はタプルではなく、parseCast 側の
        // ジェネリック型の名指しに委ねる。
        const singleGenericType =
          info &&
          this.ts[sigNext(this.ts, this.i + 1)]?.k === "id" &&
          this.ts[sigNext(this.ts, sigNext(this.ts, this.i + 1) + 1)]?.v ===
            "<" &&
          genericArgsEnd(
            this.ts,
            sigNext(this.ts, sigNext(this.ts, this.i + 1) + 1),
          ) === info.close;
        if (info?.hasTopComma && !singleGenericType) {
          let isTuple = !info.allTypeLike;
          if (info.allTypeLike) {
            const after = sigNext(this.ts, info.close + 1),
              av = this.ts[after]?.v;
            const operandStart =
              this.ts[after]?.k === "id" ||
              this.ts[after]?.k === "number" ||
              this.ts[after]?.k === "string" ||
              av === "(";
            if (!operandStart) isTuple = true;
            else {
              // 被演算子の末尾（呼出し形 M(...) の閉じ括弧まで）を
              // 求め、その後ろが代入・区切り・本体開始ならキャスト
              // ではなくタプル側（宣言・メソッド定義）とみなす。
              let opEnd = after;
              const second = sigNext(this.ts, after + 1);
              if (this.ts[second]?.v === "(") {
                let d3 = 0;
                for (let k = second; k < this.ts.length; k++) {
                  const tv = this.ts[k].v;
                  if (tv === "(") d3++;
                  else if (tv === ")") {
                    d3--;
                    if (d3 === 0) {
                      opEnd = k;
                      break;
                    }
                  } else if (tv === "<eof>") break;
                }
              }
              if (
                ["=", ";", ",", ")", "]", "}", "{"].includes(
                  this.ts[sigNext(this.ts, opEnd + 1)]?.v,
                )
              )
                isTuple = true;
            }
          }
          if (isTuple) unsupported("タプル", t.line);
        }
      }
    }
    // RG-356（R32-N10）：C／C++ のカンマ演算子が読める文脈の判定。
    // カンマが区切りとして使われる文脈（宣言子列・呼出し引数・添字・
    // 初期化子リスト）では消費しない。読めるのは (1) 括弧式の中身
    // （共有 expr が exprCtx(0) で開く文脈）、(2) for 句・while 条件
    // など c-family が cCommaDepth を立てて読む全文脈、(3) 文の条件
    // 括弧など「(」の直後から直接読まれる文脈。C# にはカンマ演算子が
    // 無いため対象外（既存の裁定済みの扱いを変えない）。
    const commaCtx =
      language !== "csharp" &&
      min <= 0 &&
      ((this.cCommaDepth || 0) > 0 ||
        (this.assignOk && this.noComma === 0) ||
        (!this.assignOk && !this.cNoComma && this.ts[this.i - 1]?.v === "("));
    // R29-N18 兄弟表面：C# で式の先頭に裸の波括弧初期化子が現れる位置
    // （代入の右辺・引数など）は、実物では CS0623（配列初期化子は変数
    // またはフィールドの初期化子でのみ使用できる）。共有パーサが
    // レコードリテラルとして読み「レコードのフィールド名が必要です」
    // という虚偽原因になるため、ここで真因を名指す。宣言位置の
    // 初期化子は宣言パーサが先に処理し、波括弧で始まる要素は
    // parseBracedInit が先に処理するため、合法形には届かない。
    if (language === "csharp" && t?.v === "{")
      throw new PracticeError(
        "配列初期化子は変数またはフィールドの初期化子でのみ使用できます。new 式を使ってください（CS0623）",
        t.line,
        "CompileError",
      );
    // RG-351（R32-N5）：C# の式位置の未対応構文は、JS 側の RG-336 と
    // 同じ水準で「式の先頭トークン」で構文そのものを名指す。従来は
    // var として読み進めてしまい、後続の句読点・未定義名・閉じ括弧の
    // 断片が原因として表示されていた。
    if (language === "csharp" && min <= 0) {
      if (t?.v === "default") unsupported("default 式", t.line);
      if (t?.v === "is") unsupported("is 演算子（パターンマッチング）", t.line);
      if (t?.v === "as") unsupported("as 演算子", t.line);
      if (t?.v === "(") {
        // ラムダ式（(引数) => 本体）。対応する閉じ括弧の直後が => の
        // 場合だけ名指す（通常の括弧式・キャストは対象外）。
        let depth = 0,
          closeIdx = -1;
        for (let j = this.i; j < this.ts.length; j++) {
          const tv = this.ts[j].v;
          if (tv === "(") depth++;
          else if (tv === ")") {
            depth--;
            if (depth === 0) {
              closeIdx = j;
              break;
            }
          } else if (tv === "<eof>") break;
        }
        if (closeIdx > 0 && this.ts[closeIdx + 1]?.v === "=>")
          unsupported("ラムダ式", t.line);
      }
    }
    if (t?.v === "++" || t?.v === "--") {
      this.take();
      a = { k: "pre", target: this.expr(10), op: t.v, line: t.line };
    } else if (t?.v === "new" && language === "csharp") {
      a = this.parseNewExpr();
    } else if (
      // R30-N31：式位置の std::string({...})（関数形式キャスト／一時
      // オブジェクト）。宣言位置と同じく波括弧初期化子として読み、
      // stringInitList として印付ける（評価は read 側、型は typeOf 側）。
      language === "cpp" &&
      t?.v === "string" &&
      this.ts[this.i + 1]?.v === "(" &&
      this.ts[this.i + 2]?.v === "{"
    ) {
      const line = t.line;
      this.take();
      this.take();
      let init = parseBracedInit(this);
      init = normalizeBracedInit(init, {
        isArray: false,
        baseType: "string",
        line,
      });
      this.take(")");
      a = { ...init, stringInitList: true, line };
      if (
        init.values.length === 2 &&
        init.values[0]?.k === "literal" &&
        typeof init.values[0].value === "string" &&
        init.values[0].quote !== "'"
      )
        a.strCountInit = true;
    } else {
      a = origExpr(12);
    }
    while (true) {
      // RG-07 追加表面（R21-N10 同根）：行頭の二項演算子は式の継続として
      // 扱う（C系の実物どおり）。後続が二項演算子か ? のときだけ改行を消費。
      if (this.ts[this.i]?.v === "\n") {
        let j = this.i;
        while (this.ts[j]?.v === "\n") j++;
        const nv = this.ts[j]?.v;
        if (nv === "?" || SHARED[nv] !== undefined) this.i = j;
      }
      const v = this.ts[this.i]?.v;
      // R30-N17：C# の switch 式（値 switch { … }）は未対応であり、
      // 対象そのものを名指して停止する。従来は式の後続として読めずに
      // 呼び出し側の宣言・文の終端チェックが「; が必要です」という
      // 虚偽原因を表示していた（セミコロンは不足していない）。switch
      // 文は statement 側で別途名指し済み。
      if (v === "switch" && language === "csharp")
        unsupported("switch 式", this.ts[this.i].line);
      // RG-349（R32-N3・C家族分）：メンバーアクセスの末尾形。ドット／
      // -> の直後にメンバー名が無い場合は、区切り記号ではなくメン
      // バー名の欠落そのものを名指す（セミコロンが書かれている形で
      // 「; が必要です」になっていた）。-> は . と同じメンバーアク
      // セスとして読む（対象の値に対する可否は実行側の既存経路が
      // 判定する）。
      if (v === "." || v === "->") {
        const nx = this.ts[this.i + 1];
        if (nx?.k !== "id")
          throw new PracticeError(
            "メンバー名が必要です",
            this.ts[this.i].line,
            "SyntaxError",
          );
        if (v === "->") {
          this.take();
          const nameTok = this.take();
          a = { k: "member", target: a, name: nameTok.v, line: a.line };
          continue;
        }
        // "." で直後が識別子の場合は通常のメンバーアクセスとして
        // 読み直す（origExpr の後置処理が届かなかった位置向け）。
        this.take();
        const nameTok = this.take();
        a = { k: "member", target: a, name: nameTok.v, line: a.line };
        continue;
      }
      // RG-351（R32-N5）：C# の is／as は被演算子の後ろに現れる中置の
      // 構文であるため、後置ループでも第一トークンとして名指す。
      if (language === "csharp" && v === "is")
        unsupported("is 演算子（パターンマッチング）", this.ts[this.i].line);
      if (language === "csharp" && v === "as")
        unsupported("as 演算子", this.ts[this.i].line);
      if (language === "csharp" && v === "=>")
        unsupported("ラムダ式", this.ts[this.i].line);
      if (v === "?" && min <= 0) {
        if (this.ts[this.i + 1]?.v === "?")
          unsupported("null 合体演算子 ?? は未対応です", this.ts[this.i].line);
        if (this.ts[this.i + 1]?.v === ".") break;
        // RG-368（修正バッチ12・C#班）：null 条件インデックス
        // （s?[0] 等）。直後が "[" で、対応する三項演算子の ":" が
        // 無い場合だけ名指す。条件 ? [..] : .. の三項形（":" が
        // ある形）は従来の三項演算子の経路を壊さない。
        if (language === "csharp" && this.ts[this.i + 1]?.v === "[") {
          let d2 = 0,
            q2 = 0,
            hasColon = false;
          for (let j = this.i + 1; j < this.ts.length; j++) {
            const tv = this.ts[j].v;
            if (["(", "[", "{"].includes(tv)) d2++;
            else if ([")", "]", "}"].includes(tv)) {
              if (d2 === 0) break;
              d2--;
            } else if (d2 === 0 && tv === "?") q2++;
            else if (d2 === 0 && tv === ":") {
              if (q2 === 0) {
                hasColon = true;
                break;
              }
              q2--;
            } else if (d2 === 0 && (tv === ";" || tv === "<eof>")) break;
          }
          if (!hasColon)
            unsupported("null 条件アクセス（?[]）", this.ts[this.i].line);
        }
        // Locate the colon that belongs to this "?" and hide it while the
        // then-branch is parsed, so ":" is never read as a binary operator.
        let depth = 0,
          q = 0,
          colon = -1;
        for (let j = this.i + 1; j < this.ts.length; j++) {
          const tv = this.ts[j].v;
          if (["(", "[", "{"].includes(tv)) depth++;
          else if ([")", "]", "}"].includes(tv)) {
            if (depth === 0) break;
            depth--;
          } else if (depth === 0 && tv === "?") q++;
          else if (depth === 0 && tv === ":") {
            if (q === 0) {
              colon = j;
              break;
            }
            q--;
          } else if (depth === 0 && (tv === ";" || tv === "<eof>")) break;
        }
        if (colon < 0)
          throw new PracticeError("三項演算子の ： が必要です", this.ts[this.i].line);
        const colonTok = this.ts[colon];
        colonTok.v = "\u0000";
        this.take();
        const thenE = this.expr(0);
        if (this.ts[this.i]?.v !== "\u0000") {
          colonTok.v = ":";
          throw new PracticeError("三項演算子の ： が必要です", a.line);
        }
        this.take();
        colonTok.v = ":";
        const elseE = this.expr(0);
        a = { k: "ternary", test: a, then: thenE, els: elseE, line: a.line };
        continue;
      }
      if (
        ["=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", "&=", "|=", "^="].includes(v) &&
        min <= 0 &&
        ["var", "index", "member"].includes(a.k)
      ) {
        const op = this.take().v;
        // RG-356：代入の右辺は代入式であり、同じ階層のカンマは右辺に
        // 属さない（(i = 5, i + 1) のカンマは外側のカンマ演算子）。
        // 右辺を読む間だけカンマ消費の文脈を切り、括弧で包まれた
        // カンマ式は括弧側の exprCtx が改めて開く文脈で読む。
        const savedAssignOk = this.assignOk,
          savedNoComma = this.noComma,
          savedCommaDepth = this.cCommaDepth || 0;
        this.assignOk = false;
        this.noComma = 1;
        this.cCommaDepth = 0;
        let value;
        try {
          // B8（cpp-engine-b）：代入の右辺の波括弧初期化子リスト
          // （v = {1,2,3};、p = {1, "x"};）は初期化子リストとして読む
          // （共有パーサのレコードリテラル読みに落とさない）。C は従来どおり。
          value =
            language === "cpp" && op === "=" && this.peek("{")
              ? parseBracedInit(this)
              : this.expr(0);
        } finally {
          this.assignOk = savedAssignOk;
          this.noComma = savedNoComma;
          this.cCommaDepth = savedCommaDepth;
        }
        a = { k: "assign", target: a, value, op, line: a.line };
        continue;
      }
      if (v === "<<" && this.coutChain) break;
      const pr = SHARED[v];
      if (pr === undefined || pr < min) break;
      this.take();
      const b = this.expr(pr + (v === "^" ? 0 : 1));
      a = { k: "binary", op: v, a, b, line: a.line };
    }
    // RG-356：カンマ演算子（左を副作用のため評価し、値は右）。
    if (commaCtx) {
      for (;;) {
        let j = this.i;
        while (this.ts[j]?.v === "\n") j++;
        if (this.ts[j]?.v !== ",") break;
        this.i = j;
        this.take();
        a = { k: "comma", a, b: this.expr(0), line: a.line };
      }
    }
    if (savedChain) this.coutChain = savedChain;
    return a;
  };
  // R27-N18 根因：波括弧初期化子の要素は、それ自体が波括弧で包まれた
  // 部分初期化子（sub-initializer）になりうる。共有パーサの expr() は
  // 先行する "{" をレコードリテラルとして読むため、入れ子波括弧が
  // 「レコードのフィールド名が必要です」という虚偽原因になっていた。
  // 初期化子の文脈では要素位置の "{" を初期化子リストとして再帰的に
  // 読む（要素の式そのものが "{" で始まる場合だけが対象で、それ以外
  // の式の読みは従来どおり expr() に委ねる）。
  const parseBracedInit = (parser) => {
    const line = parser.ts[parser.i]?.line;
    parser.take(); // "{"
    const values = [];
    while (!parser.peek("}")) {
      values.push(
        parser.peek("{") ? parseBracedInit(parser) : parser.expr(),
      );
      if (!parser.peek(",")) break;
      parser.take();
    }
    parser.take("}");
    // R29-N18：裸の波括弧初期化子であることを印付けする。new 式の配列
    // 初期化子（parseNewExpr が返す k:"array"）と区別し、C# のジャグ／
    // 1次元配列で要素位置の裸の入れ子を CS0623 として名指すために使う。
    return { k: "array", values, line, bracedInit: true };
  };
  // R27-N18：部分初期化子の波括弧を、言語規則どおりに畳む／名指す。
  // - C：スカラーへの余分な波括弧は合法（gcc 実測：値は内側の値、
  //   余分な要素は先頭を採用）。配列要素を包む波括弧も同様に剥がす。
  // - C++：配列要素を包む波括弧は合法だが、スカラーへの二重波括弧は
  //   g++ が "too many braces around scalar initializer" でエラーに
  //   する。停止自体は正しいため、真因を名指して停止する。要素位置
  //   の波括弧に複数要素が入る形も g++ では変換エラーになる。
  // - C#：波括弧の入れ子は従来どおり実行側の型検査に委ねる（不変）。
  const normalizeBracedInit = (value, { isArray, baseType, line, multiDim = false }) => {
    if (!["c", "cpp"].includes(language) || value?.k !== "array")
      return value;
    // R28-N19：多次元配列では入れ子の波括弧は「行」の初期化子であり、
    // 要素を包む波括弧の剥がし対象ではない。そのまま実行側へ渡す。
    if (multiDim) return value;
    const emptyElem = () =>
      baseType === "string"
        ? { k: "literal", value: "", line }
        : baseType === "bool"
          ? { k: "literal", value: false, line }
          : { k: "literal", value: 0, line };
    if (isArray) {
      // char 配列の要素を波括弧で包んだ文字列（{{"hi"}}）は剥がさない。
      // C++ では変換エラー、C でも文字列ではなくポインタ値の変換に
      // なる形（gcc 実測で警告つきの別物）であり、"hi" と捏造せず
      // 実行側の型検査で停止させる。{"hi"} の単一波括弧形（R27-N17）
      // は要素自体が文字列なので、ここには来ない。
      const wrapsString = (el) => {
        let cur = el;
        while (cur?.k === "array" && cur.values.length === 1)
          cur = cur.values[0];
        return (
          cur?.k === "literal" &&
          typeof cur.value === "string" &&
          cur.quote !== "'"
        );
      };
      value.values = value.values.map((el) => {
        if (el?.k !== "array") return el;
        if (baseType === "char" && wrapsString(el)) return el;
        if (language === "c") {
          // C は要素を包む波括弧の中の先頭要素を採用する（gcc 実測：
          // {{1,2},{3}} は警告のみで 1 と 3 が入る）。
          let cur = el;
          while (cur?.k === "array")
            cur = cur.values.length ? cur.values[0] : emptyElem();
          return cur;
        }
        // C++：要素を包む波括弧は単一要素（または空＝値初期化）だけ。
        let cur = el;
        while (cur?.k === "array" && cur.values.length === 1)
          cur = cur.values[0];
        if (cur?.k === "array") {
          if (cur.values.length === 0) return emptyElem();
          throw new PracticeError(
            "配列要素の波括弧初期化子に要素が多すぎます（要素を波括弧で包む場合は要素1つだけです）",
            line,
            "CompileError",
          );
        }
        return cur;
      });
      return value;
    }
    // スカラー形
    if (language === "cpp") {
      // R28-N21：std::string の二重波括弧 {{"hi"}} は g++ 13.3 実測で
      // 合法（コンストラクタへ渡る初期化子リストの波括弧であり、
      // スカラーへの過剰な波括弧ではない）。単一要素の入れ子が文字列
      // リテラル（または通常の要素列）へほどける場合だけ1段剥がす。
      // 三重 {{{"hi"}}} は g++ でも変換エラーになるため剥がさない。
      if (
        baseType === "string" &&
        value.values.length === 1 &&
        value.values[0]?.k === "array" &&
        !value.values[0].values.some((el) => el?.k === "array")
      )
        return value.values[0];
      if (value.values.some((el) => el?.k === "array"))
        throw new PracticeError(
          "スカラーの初期化子に波括弧が多すぎます（too many braces around scalar initializer）",
          line,
          "CompileError",
        );
      return value;
    }
    // C：{{…}} は内側のリストをそのまま初期化子として採用し、
    // 先頭要素が波括弧の場合はその中身の先頭まで剥がす。
    while (value.values.length === 1 && value.values[0]?.k === "array")
      value = value.values[0];
    if (value.values[0]?.k === "array") {
      let cur = value.values[0];
      while (cur?.k === "array")
        cur = cur.values.length ? cur.values[0] : emptyElem();
      value.values[0] = cur;
    }
    return value;
  };
  // ===== B8（cpp-engine-b）：C++ コンテナ／イテレータ／auto 宣言のパーサ =====
  // 型指定を読み、正規化した型文字列と構造（spec）を返す。宣言の形で
  // なければ parser.i を戻して null を返す。ハードな誤り（array の
  // 要素数の形など）は名指しで停止する。
  const CPP_ITER_NAMES = ["iterator", "const_iterator", "reverse_iterator", "const_reverse_iterator"];
  const takeGreater = (parser) => {
    const v = parser.ts[parser.i]?.v;
    if (v === ">") {
      parser.take();
      return;
    }
    if (v === ">>" || v === ">>>") {
      const tk = parser.ts[parser.i],
        parts = [...v].map(() => ({ v: ">", line: tk.line }));
      parser.ts.splice(parser.i, 1, ...parts);
      parser.take();
      return;
    }
    throw new PracticeError(
      "型引数リストの > が必要です",
      parser.ts[parser.i]?.line ?? 1,
      "SyntaxError",
    );
  };
  const parseCppTypeSpec = (parser) => {
    const startI = parser.i;
    let isConst = false;
    if (parser.peek("const")) {
      parser.take();
      isConst = true;
    }
    const w = parser.ts[parser.i];
    if (!w || w.k !== "id") {
      parser.i = startI;
      return null;
    }
    let spec = null;
    if (["vector", "array", "pair"].includes(w.v)) {
      const kind = w.v;
      parser.take();
      if (!parser.peek("<")) {
        parser.i = startI;
        return null;
      }
      parser.take();
      const e1 = parseCppTypeSpec(parser);
      if (!e1 || e1.kind === "iterator" || e1.kind === "auto") {
        parser.i = startI;
        return null;
      }
      if (kind === "vector") {
        takeGreater(parser);
        spec = { kind: "vector", elem: e1, text: `vector<${e1.text}>` };
      } else if (kind === "pair") {
        if (!parser.peek(",")) {
          parser.i = startI;
          return null;
        }
        parser.take();
        const e2 = parseCppTypeSpec(parser);
        if (!e2 || e2.kind === "iterator" || e2.kind === "auto") {
          parser.i = startI;
          return null;
        }
        takeGreater(parser);
        spec = { kind: "pair", t1: e1, t2: e2, text: `pair<${e1.text},${e2.text}>` };
      } else {
        if (!parser.peek(",")) {
          parser.i = startI;
          return null;
        }
        parser.take();
        const sz = parser.ts[parser.i];
        let sizeExpr = null,
          sizeText = null;
        if (sz?.k === "number") {
          sizeExpr = { k: "literal", value: Number(sz.v), raw: sz.v, line: sz.line };
          sizeText = sz.v;
          parser.take();
        } else if (sz?.k === "id") {
          sizeExpr = { k: "var", name: sz.v, line: sz.line };
          sizeText = sz.v;
          parser.take();
        } else
          unsupported(
            "std::array の要素数は整数リテラルまたは変数で指定してください",
            sz?.line ?? w.line,
          );
        takeGreater(parser);
        spec = { kind: "array", elem: e1, sizeExpr, text: `array<${e1.text},${sizeText}>` };
      }
    } else if (
      builtinTypes.includes(w.v) ||
      ["unsigned", "signed", "long", "short"].includes(w.v)
    ) {
      // 複合型名（unsigned int 等）は宣言パーサ本体と同じ正規化表で畳む。
      const typeWordSet = ["int", "long", "short", "char", "unsigned", "signed", "bool", "double", "float"];
      let j = parser.i;
      const words = [];
      while (typeWordSet.includes(parser.ts[j]?.v)) words.push(parser.ts[j++].v);
      if (words.length > 1) {
        const normalized = {
          "long long": "long",
          "unsigned long long": "unsigned long",
          "signed long long": "long",
          "long int": "long",
          "signed long int": "long",
          "unsigned long int": "unsigned long",
          "short int": "short",
          "signed short int": "short",
          "unsigned short int": "unsigned short",
          "unsigned int": "unsigned int",
          "signed int": "int",
          "unsigned long": "unsigned long",
          "signed long": "long",
          "unsigned short": "unsigned short",
          "signed short": "short",
          "unsigned char": "unsigned char",
          "signed char": "signed char",
        }[words.join(" ")];
        if (!normalized) {
          parser.i = startI;
          return null;
        }
        parser.i = j;
        spec = { kind: "scalar", text: normalized };
      } else {
        parser.take();
        spec = { kind: "scalar", text: w.v };
      }
    } else {
      parser.i = startI;
      return null;
    }
    // イテレータ型（コンテナ::iterator 等。string::iterator も含む）。
    if (
      parser.peek("::") &&
      CPP_ITER_NAMES.includes(parser.ts[parser.i + 1]?.v) &&
      (spec.kind !== "scalar" || spec.text === "string")
    ) {
      parser.take();
      const itName = parser.take().v;
      return {
        kind: "iterator",
        host: spec,
        iterName: itName,
        rev: itName.includes("reverse"),
        constIt: itName.includes("const"),
        text: `${spec.text}::${itName}`,
        isConst,
      };
    }
    return { ...spec, isConst };
  };
  // 宣言文の形（型 名前 初期化子?）なら declare ノードを返す。
  const tryParseCppDecl = (parser) => {
    const startI = parser.i,
      line = parser.ts[startI]?.line ?? 1,
      t0 = parser.ts[startI];
    let gate = false;
    if (t0?.v === "auto")
      gate =
        parser.ts[startI + 1]?.k === "id" || parser.ts[startI + 1]?.v === "[";
    else if (t0?.v === "const") {
      const t1 = parser.ts[startI + 1];
      gate =
        !!t1 &&
        (["vector", "array", "pair", "auto"].includes(t1.v) ||
          (t1.v === "string" && parser.ts[startI + 2]?.v === "::"));
    } else if (["vector", "array", "pair"].includes(t0?.v))
      gate = parser.ts[startI + 1]?.v === "<";
    else if (t0?.v === "string") gate = parser.ts[startI + 1]?.v === "::";
    if (!gate) return null;
    if (t0.v === "auto" && parser.ts[startI + 1]?.v === "[")
      unsupported("構造化束縛は未対応です", line);
    let spec;
    if (t0.v === "auto") {
      parser.take();
      spec = { kind: "auto", text: "auto" };
    } else {
      spec = parseCppTypeSpec(parser);
      if (!spec) {
        parser.i = startI;
        return null;
      }
    }
    const declarators = [];
    for (;;) {
      if (parser.peek("*"))
        unsupported(
          spec.kind === "iterator"
            ? "イテレータへのポインタは未対応です"
            : "コンテナへのポインタは未対応です",
          line,
        );
      if (parser.peek("&"))
        unsupported("コンテナ／イテレータへの参照の宣言は未対応です", line);
      const nameTok = parser.ts[parser.i];
      if (!nameTok || nameTok.k !== "id") {
        if (declarators.length === 0) {
          parser.i = startI;
          return null;
        }
        throw new PracticeError("変数名が必要です", line);
      }
      parser.take();
      if (parser.peek("["))
        unsupported("コンテナの配列は未対応です", line);
      let value = null,
        initArgs = null,
        bracedInit = false;
      if (parser.peek("(")) {
        parser.take();
        if (parser.peek("{")) {
          value = parseBracedInit(parser);
          bracedInit = true;
          parser.take(")");
        } else {
          const args = [];
          parser.cNoComma = (parser.cNoComma || 0) + 1;
          try {
            while (!parser.peek(")")) {
              args.push(parser.expr());
              if (!parser.peek(",")) break;
              parser.take();
            }
          } finally {
            parser.cNoComma--;
          }
          parser.take(")");
          initArgs = args;
        }
      } else if (parser.peek("{")) {
        value = parseBracedInit(parser);
        bracedInit = true;
      } else if (parser.peek("=")) {
        parser.take();
        if (parser.peek("{")) {
          value = parseBracedInit(parser);
          bracedInit = true;
        } else value = parser.expr();
      }
      declarators.push({
        k: "declare",
        name: nameTok.v,
        type: spec.text,
        cppKind: spec.kind,
        cppSpec: spec,
        value,
        initArgs,
        bracedInit,
        array: false,
        pointer: false,
        line,
        refs: [spec.kind === "iterator" ? "iterator" : spec.kind === "auto" ? "auto" : spec.text.split("<")[0]],
      });
      if (!parser.peek(",")) break;
      parser.take();
    }
    if (declarators.length === 1) return declarators[0];
    return {
      k: "declareGroup",
      declarations: declarators,
      line,
      refs: [...new Set(declarators.flatMap((d) => d.refs))],
    };
  };
  // 範囲 for のヘッダ（型 名前 : 対象）を試行する。形が違えば null。
  const tryParseRangeFor = (parser) => {
    const startI = parser.i,
      line = parser.ts[startI]?.line ?? 1;
    let isConst = false;
    if (parser.peek("const")) {
      parser.take();
      isConst = true;
    }
    let spec = null;
    if (parser.peek("auto")) {
      parser.take();
      spec = { kind: "auto", text: "auto" };
    } else spec = parseCppTypeSpec(parser);
    if (!spec || spec.kind === "iterator") {
      parser.i = startI;
      return null;
    }
    let ref = false;
    if (parser.peek("&")) {
      parser.take();
      ref = true;
    }
    const nameTok = parser.ts[parser.i];
    if (!nameTok || nameTok.k !== "id") {
      parser.i = startI;
      return null;
    }
    parser.take();
    if (!parser.peek(":")) {
      parser.i = startI;
      return null;
    }
    parser.take();
    let collection;
    if (parser.peek("{")) collection = parseBracedInit(parser);
    else collection = parser.expr();
    if (!parser.peek(")")) {
      parser.i = startI;
      return null;
    }
    parser.take(")");
    return {
      name: nameTok.v,
      varType: spec.text,
      varSpec: spec,
      ref,
      isConst,
      collection,
      line,
    };
  };
  p.simple = function () {
    let t = this.ts[this.i];
    // RG-366（修正バッチ12・C#班）：var によるタプル分解代入
    // （var (x, y) = ...）は、var 一般ではなくタプルとして名指す。
    if (
      language === "csharp" &&
      t.v === "var" &&
      this.ts[sigNext(this.ts, this.i + 1)]?.v === "("
    )
      unsupported("タプル（分解代入）", t.line);
    // B8（cpp-engine-b）：C++ のコンテナ／イテレータ／auto 宣言は
    // 専用パーサが受理する（形が合わなければ従来経路へ戻す）。
    if (language === "cpp") {
      const cppDecl = tryParseCppDecl(this);
      if (cppDecl) return cppDecl;
    }
    if (["let", "const", "auto", "var"].includes(t.v))
      unsupported("この宣言・型推論はモデルで未対応です：" + t.v, t.line);
    if (["cout", "cerr", "clog"].includes(t.v)) {
      if (language !== "cpp") unsupported(t.v + "はC++専用です", t.line);
      const streamName = t.v;
      this.take();
      let values = [];
      while (this.peek("<<")) {
        this.take();
        this.coutChain = (this.coutChain || 0) + 1;
        try {
          values.push(this.expr());
        } finally {
          this.coutChain--;
        }
      }
      if (!values.length) unsupported(streamName + "の書式", t.line);
      return {
        k: "action",
        action: streamName,
        values,
        line: t.line,
        refs: streamName === "cout" ? ["cout"] : [],
      };
    }
    if (t.v === "new") unsupported("newを文として使うことはできません", t.line);
    if (["unsigned", "signed", "short", "long"].includes(t.v)) {
      // D14 根因：C# に unsigned int 等の C 形式の型名は存在しない
      // （uint 等が正名）。複合型名として黙って受理していた。
      if (language === "csharp" && ["unsigned", "signed"].includes(t.v)) {
        let j = this.i;
        const cWords = [];
        while (
          ["int", "long", "short", "char", "unsigned", "signed", "bool", "double", "float"].includes(this.ts[j]?.v)
        )
          cWords.push(this.ts[j++].v);
        const suggestion =
          {
            "unsigned int": "uint",
            "unsigned long": "ulong",
            "unsigned short": "ushort",
            "unsigned char": "byte",
            "signed char": "sbyte",
            "signed int": "int",
            "signed long": "long",
            "signed short": "short",
            unsigned: "uint",
            signed: "int",
          }[cWords.join(" ")] || "対応する C# の型";
        unsupported(
          `C# に「${cWords.join(" ")}」という型名はありません（${suggestion} を使います）`,
          t.line,
        );
      }
      // Multi-word type names (long long, unsigned int, …): fold the word
      // sequence into a single type token when a variable name follows.
      let j = this.i;
      const words = [];
      while (
        ["int", "long", "short", "char", "unsigned", "signed", "bool", "double", "float"].includes(this.ts[j]?.v)
      )
        words.push(this.ts[j++].v);
      if (words.length > 1 && this.ts[j]?.k === "id") {
        const normalized = {
          "long long": "long",
          "unsigned long long": "unsigned long",
          "signed long long": "long",
          "long int": "long",
          "signed long int": "long",
          "unsigned long int": "unsigned long",
          "short int": "short",
          "signed short int": "short",
          "unsigned short int": "unsigned short",
          "unsigned int": "unsigned int",
          "signed int": "int",
          "unsigned long": "unsigned long",
          "signed long": "long",
          "unsigned short": "unsigned short",
          "signed short": "short",
          "unsigned char": "unsigned char",
          "signed char": "signed char",
        }[words.join(" ")];
        if (!normalized)
          unsupported(`型 ${words.join(" ")} は未対応です`, t.line);
        this.ts.splice(this.i, words.length, {
          v: normalized,
          k: "id",
          line: t.line,
        });
        t = this.ts[this.i];
      }
    }
    const compositeTypes = ["unsigned int", "unsigned long", "unsigned short", "unsigned char", "signed char", "short", "unsigned", "signed", ...(language === "csharp" ? ["uint", "ulong", "ushort", "byte", "sbyte"] : [])];
    if (
      (builtinTypes.includes(t.v) ||
        classes[t.v] ||
        compositeTypes.includes(t.v) ||
        // B8（cpp-engine-a）：std::div の戻り値型だけは C++ でのみ型名として受理する。
        (language === "cpp" && ["div_t", "ldiv_t", "lldiv_t"].includes(t.v))) &&
      this.ts[this.i + 1]?.v !== "("
    ) {
      let type = this.take().v;
      if (language === "c" && type === "string") unsupported("Cには組込みstring型がありません。char配列を使ってください", t.line);
      if (type === "unsigned") type = "unsigned int";
      if (type === "signed") type = "int";
      // RG-351（R32-N5）：C# の nullable 型（int? 等）は型そのものを
      // 名指して停止する。従来は宣言子側で「変数名が必要です」という
      // 虚偽原因になっていた（? は変数名の欠落ではない）。
      if (language === "csharp" && this.peek("?"))
        unsupported(`nullable 型（${type}?）`, t.line);
      // 型の直後の []（C# 形式の配列型）は基本型の一部として全ての
      // 宣言子に共通する。それ以外の修飾（* ／ & ／ [長さ]）と初期化子
      // は宣言子ごとのものとして読み直す。
      let baseArray = false,
        baseArrayKind = null,
        baseArrayRank = 0;
      if (this.peek("[")) {
        if (language === "csharp") {
          // R28-N19 根因：C# の多次元配列型（int[,]）とジャグ配列型
          // （int[][]）の接尾辞を読まず、宣言子側で「変数名が必要です」
          // という虚偽原因になっていた。型接尾辞として全形を読む。
          const saveAll = this.i;
          const suffixes = [];
          let suffixOk = true;
          while (this.peek("[")) {
            this.take();
            let commas = 0;
            while (this.peek(",")) {
              this.take();
              commas++;
            }
            if (!this.peek("]")) {
              suffixOk = false;
              break;
            }
            this.take();
            suffixes.push(commas);
          }
          if (!suffixOk) this.i = saveAll;
          else if (suffixes.length === 1 && suffixes[0] === 0) baseArray = true;
          else if (suffixes.length === 1 && suffixes[0] >= 1) {
            baseArray = true;
            baseArrayKind = "rect";
            baseArrayRank = suffixes[0] + 1;
          } else if (suffixes.length >= 2 && suffixes.every((c) => c === 0)) {
            baseArray = true;
            baseArrayKind = "jagged";
            baseArrayRank = suffixes.length;
          } else if (suffixes.length) {
            unsupported(
              "この配列型の形式は未対応です：" + type + suffixes.map((c) => "[" + ",".repeat(c) + "]").join(""),
              t.line,
            );
          }
        } else {
          const saveBracket = this.i;
          this.take();
          if (this.peek("]")) {
            this.take();
            baseArray = true;
          } else this.i = saveBracket;
        }
      }
      // R27-N11 根因：宣言パーサが宣言子を1つしか読まず、カンマの位置で
      // 「; が必要です」という虚偽原因になっていた。C／C++／C# の基本
      // 文法である宣言子列（型 名1 = 初期化子, 名2, …;）を宣言子ごとに
      // 読み、各宣言子を独立した declare ノードとして返す。単独宣言の
      // 場合は従来どおり declare ノードそのものを返す。
      const declarators = [];
      for (;;) {
        let array = baseArray,
          arrayKind = baseArrayKind,
          arrayRank = baseArrayRank,
          dims = null,
          size = null,
          pointer = false,
          referenceAlias = false;
        if (this.peek("*")) {
          this.take();
          pointer = true;
        }
        if (this.peek("&")) {
          if (language !== "cpp") unsupported("参照宣言はC++専用です", t.line);
          this.take(); referenceAlias = true;
        }
        let name = this.take();
        if (name.k !== "id") throw new PracticeError("変数名が必要です", t.line);
        if (this.peek("[")) {
          // R28-N19 根因：宣言子の角括弧を1つしか読まず、2つ目の "["
          // の位置で「; が必要です」という虚偽原因になっていた。
          // C／C++ の多次元配列（int a[2][2] 等）は次元を全て読み、
          // dims として保持する（実行側で平坦化して扱う）。
          dims = [];
          while (this.peek("[")) {
            this.take();
            dims.push(this.peek("]") ? null : this.expr());
            this.take("]");
          }
          size = dims[0];
          array = true;
          if (language === "csharp") {
            // C# で次元サイズ付きの宣言子（int a[2]）は実物でも不正。
            // 従来の受理範囲（1次元）は変えず、多次元だけ真因を名指す。
            if (dims.length >= 2)
              unsupported("C#では配列のサイズは型側ではなく new で指定します（int[,] の形で書いてください）", t.line);
            dims = null;
          }
        }
        let value = null;
        if (this.peek("(")) {
          // Direct initialization: Type name(args) — a single argument only.
          this.take();
          // R30-N31：C++ の括弧付き波括弧構築 `型 名({…})`（括弧で包んだ
          // リスト初期化）。実 g++ では合法で、std::string s({'h','i'})
          // は初期化子リストコンストラクタで "hi" になる。従来は波括弧
          // の中身をレコードリテラルとして読み始め、「: が必要です」
          // （std:: の :: と誤認させる）という虚偽原因で停止していた。
          // 波括弧初期化子として読み、直接リスト初期化（型 名{…}）と
          // 同じ実行経路（narrowing 検査・std::string の初期化子リスト
          // 構築）に委ねる。std::string の (文字列, 個数) 形
          // （{"hi", 1} → "h"、g++ 実測）は strCountInit で印付ける。
          if (language === "cpp" && !array && !pointer && this.peek("{")) {
            value = parseBracedInit(this);
            value = normalizeBracedInit(value, {
              isArray: false,
              baseType: type,
              line: t.line,
            });
            if (
              type === "string" &&
              value.values.length === 2 &&
              value.values[0]?.k === "literal" &&
              typeof value.values[0].value === "string" &&
              value.values[0].quote !== "'"
            )
              value.strCountInit = true;
            this.take(")");
          } else {
            // RG-356：直接初期化の引数のカンマは区切りであり、カンマ
            // 演算子として消費させない（複数引数の名指しを維持する）。
            let args = [];
            this.cNoComma = (this.cNoComma || 0) + 1;
            try {
              while (!this.peek(")")) {
                args.push(this.expr());
                if (!this.peek(",")) break;
                this.take();
              }
            } finally {
              this.cNoComma--;
            }
            this.take(")");
            if (args.length !== 1)
              unsupported("複数引数の直接初期化は未対応です", t.line);
            value = args[0];
          }
        } else if (this.peek("{")) {
          // R26-N19：直接リスト初期化 `型 名{値};` は C++ の基本形（g++ 実測で
          // 合法）。従来は波括弧位置で「; が必要です」という虚偽原因になって
          // いた。`=` 付きコピー形と同じ { k:"array" } の初期化子として読み、
          // 実行側の narrowing 検査（RG-192）をそのまま適用する。
          // C（C11 の gcc 実測でエラー）／C# では実物でも不正なので受理せず、
          // 真因を名指して停止する（セミコロンは書かれているため
          // 「; が必要です」とは言わない）。
          if (language !== "cpp")
            throw new PracticeError(
              language === "c"
                ? "Cでは波括弧による直接初期化はできません（= {値} の形で書いてください）"
                : "C#では波括弧による直接初期化はできません（= new 型 {値} など通常の初期化で書いてください）",
              t.line,
              "SyntaxError",
            );
          value = parseBracedInit(this);
          value = normalizeBracedInit(value, { isArray: array, baseType: type, line: t.line, multiDim: Array.isArray(dims) && dims.length >= 2 });
        } else if (this.peek("=")) {
          this.take();
          if (this.peek("{")) {
            value = parseBracedInit(this);
            value = normalizeBracedInit(value, { isArray: array, baseType: type, line: t.line, multiDim: Array.isArray(dims) && dims.length >= 2 });
          } else if (this.peek("new")) {
            this.take();
            let typeName = this.take().v;
            if (this.peek("[")) {
              this.take();
              if (this.peek("]")) {
                this.take();
                if (this.peek("{")) {
                  value = parseBracedInit(this);
                  array = true;
                  size = null;
                } else
                  unsupported(
                    "new " + typeName + "[] のこの形式は未対応です",
                    t.line,
                  );
              } else {
                // R28-N19：new int[2,2]（多次元）と new int[2][]（ジャグ）
                // の次元列・接尾辞も読む。
                let counts = [this.expr()];
                while (this.peek(",")) {
                  this.take();
                  counts.push(this.expr());
                }
                this.take("]");
                let jaggedSuffix = 0;
                while (this.peek("[")) {
                  const saveJag = this.i;
                  this.take();
                  if (this.peek("]")) {
                    this.take();
                    jaggedSuffix++;
                  } else {
                    this.i = saveJag;
                    break;
                  }
                }
                if (this.peek("{")) {
                  if (counts.length > 1 || jaggedSuffix > 0)
                    unsupported("new による多次元／ジャグ配列の初期化子は未対応です", t.line);
                  value = parseBracedInit(this);
                  // R24-N11 根因（宣言経路も同じ）：宣言長を保持する。
                  value = { ...value, size: counts[0] };
                  array = true;
                  size = null;
                } else if (counts.length > 1) {
                  if (jaggedSuffix > 0)
                    unsupported("new " + typeName + "[,] の後に [] を続ける形式は未対応です", t.line);
                  value = {
                    k: "construct",
                    name: typeName + "[" + ",".repeat(counts.length - 1) + "]",
                    args: counts,
                    line: t.line,
                  };
                  array = true;
                  size = null;
                } else if (jaggedSuffix > 0) {
                  value = {
                    k: "construct",
                    name: typeName + "[]".repeat(jaggedSuffix + 1),
                    args: counts,
                    line: t.line,
                  };
                  array = true;
                  size = null;
                } else
                  value = {
                    k: "construct",
                    name: typeName + "[]",
                    args: counts,
                    line: t.line,
                  };
              }
            } else {
              this.take("(");
              let args = [];
              while (!this.peek(")")) {
                args.push(this.expr());
                if (!this.peek(",")) break;
                this.take();
              }
              this.take(")");
              value = { k: "construct", name: typeName, args, line: t.line };
            }
          } else value = this.expr();
        }
        declarators.push({
          k: "declare",
          name: name.v,
          type,
          array,
          arrayKind,
          arrayRank,
          dims,
          size,
          pointer,
          referenceAlias,
          value,
          line: t.line,
          refs: [pointer ? "pointer" : array ? "array" : type],
        });
        if (!this.peek(",")) break;
        this.take();
      }
      if (declarators.length === 1) return declarators[0];
      return {
        k: "declareGroup",
        declarations: declarators,
        line: t.line,
        refs: [...new Set(declarators.flatMap((d) => d.refs))],
      };
    }
    // RG-369 兄弟表面（修正バッチ12・C#班、バッチ11 §5-4 の同根）：
    // ジェネリック型の利用形は、既知名リスト（List 等）以外の型名
    // （Func<int, int> 等の複数型引数を含む）でも、宣言位置では
    // 型そのものを名指す。トークン段階の既知名スキャンと同じ文言に
    // 揃える。直後が識別子（変数名）か [] ＋識別子の場合だけが対象で、
    // ジェネリックメソッド呼出し（名前<...>(...)）には届かない。
    if (
      language === "csharp" &&
      t.k === "id" &&
      this.ts[sigNext(this.ts, this.i + 1)]?.v === "<"
    ) {
      const end = genericArgsEnd(this.ts, sigNext(this.ts, this.i + 1));
      if (end > 0) {
        const after = this.ts[end];
        if (
          after?.k === "id" ||
          (after?.v === "[" &&
            this.ts[sigNext(this.ts, end + 1)]?.v === "]" &&
            this.ts[sigNext(this.ts, sigNext(this.ts, end + 1) + 1)]?.k ===
              "id")
        )
          unsupported(`ジェネリック型 ${t.v}<...> の宣言は未対応です`, t.line);
      }
    }
    if (t.k === "id" && this.ts[this.i + 1]?.k === "id" && !classes[t.v])
      unsupported(`型 ${t.v} の宣言は未対応です`, t.line);
    {
      const save = this.i;
      let target = null;
      try {
        target = this.expr();
      } catch {
        target = null;
      }
      // RG-348：複合代入の受け皿。変数・添字・メンバーへの複合代入は
      // expr() 自身が代入ノードまで読むため、ここに残るのは逆参照
      // （*p <<= 1 等）のように expr() が対象として受理しない形だけ。
      // 従来は %= だけが対象で、他の演算子は共有 simple() の演算子表
      // （C系は = ／ += ／ -= ／ *= ／ /= のみ）に無く「; が必要です」
      // という虚偽原因になっていた。全標準複合代入を同じ機構で受ける。
      if (
        target &&
        target.k !== "assign" &&
        ["%=", "<<=", ">>=", "&=", "|=", "^=", "+=", "-=", "*=", "/="].includes(
          this.ts[this.i]?.v,
        )
      ) {
        const op = this.take().v;
        const value = this.expr();
        return { k: "assign", target, value, op, line: t.line };
      }
      this.i = save;
    }
    // RG-356（R32-N10）：C／C++ の文位置のカンマ演算子（i++, j++; や
    // x = 1, y = 2; の式文）。カンマ無しで読むとカンマの位置で止まる
    // 形だけを、カンマ演算子として読み直して式文にする。それ以外の
    // 形（呼出し引数のカンマ等は式の内側で消費され、カンマ位置で
    // 止まらない）は従来の経路のまま変えない。
    if (["c", "cpp"].includes(language)) {
      const saveC = this.i;
      let stopsAtComma = false;
      try {
        this.expr();
        stopsAtComma = this.ts[this.i]?.v === ",";
      } catch {
        stopsAtComma = false;
      }
      this.i = saveC;
      if (stopsAtComma) {
        this.cCommaDepth = (this.cCommaDepth || 0) + 1;
        try {
          const value = this.expr();
          if (
            ["\n", ";", "}", ")", "<eof>", "else"].includes(this.ts[this.i]?.v)
          )
            return { k: "expression", value, line: t.line };
        } finally {
          this.cCommaDepth--;
        }
        this.i = saveC;
      }
    }
    try {
      return simple();
    } catch (e) {
      // R22-N20（RG-78 の別表面）：共有パーサの simple() は、代入文・式文の
      // 終端チェックで「次のトークン」を未対応として名指しする。しかし
      // C系で文が完結した直後に別トークンが続くのは ; の欠落が真因であり、
      // 宣言文と同じく「; が必要です」と表示する。文の内部で起きた未対応
      // （固定文言のもの）は対象外で、そのまま伝える。
      if (e instanceof PracticeError && e.category === "未対応") {
        const tok = this.ts[this.i]?.v;
        if (
          e.message ===
            "この構文は説明に対応していません：代入の区切りが必要です" ||
          e.message ===
            "この構文は説明に対応していません：宣言の区切りが必要です" ||
          (tok !== undefined &&
            e.message === "この構文は説明に対応していません：" + tok)
        )
          throw new PracticeError(
            "; が必要です",
            this.ts[this.i]?.line ?? t.line,
            "SyntaxError",
          );
      }
      throw e;
    }
  };
  p.statement = function () {
    this.skip();
    let t = this.ts[this.i];
    if (["checked", "unchecked"].includes(t.v)) {
      if (language !== "csharp") unsupported(t.v, t.line);
      this.take();
      return {
        k: "action",
        action: t.v,
        body: this.body(),
        line: t.line,
        refs: [t.v],
      };
    }
    // RG-351（R32-N5）：文頭の未対応構文は構文そのものを名指して停止
    // する（JS 側の RG-336 と同水準）。従来は式文として読み進めて
    // しまい、句読点・区切りが原因として表示されていた。try／catch
    // は C++／C# のキーワード（C では識別子として使えるため対象外）。
    if (t.v === "try" && language !== "c") unsupported("try 文", t.line);
    if (t.v === "catch" && language !== "c") unsupported("catch 節", t.line);
    if (t.v === "finally" && language === "csharp") unsupported("finally 節", t.line);
    if (t.v === "using" && language === "csharp") unsupported("using 文", t.line);
    if (t.v === "lock" && language === "csharp") unsupported("lock 文", t.line);
    // RG-365（修正バッチ12・C#班）：文頭の属性（型宣言・文位置の
    // 宣言に付く形、[assembly: ...] 等の対象指定子付きを含む）は
    // 属性そのものを名指す。添字で文が始まることは C# には無い。
    if (
      language === "csharp" &&
      t.v === "[" &&
      attrBracketEnd(this.ts, this.i) > 0
    )
      unsupported("属性（アトリビュート）", t.line);
    // RG-369（修正バッチ12・C#班）：unsafe ブロックと unsafe 付き
    // 宣言。unsafe は文脈キーワードのため、直後がブロック開始か
    // 型・修飾子の場合だけを対象にする（同名変数への代入等は不変）。
    if (language === "csharp" && t.v === "unsafe") {
      const nv = this.ts[sigNext(this.ts, this.i + 1)]?.v;
      if (
        nv === "{" ||
        ["class", "struct", "interface", "enum", "void", "int", "long", "double", "float", "bool", "char", "string", "public", "private", "protected", "static"].includes(nv)
      )
        unsupported("unsafe 文", t.line);
    }
    // RG-369：class 以外のジェネリック型宣言の型パラメータ
    // （struct Box<T>／interface IBox<T>／record R<T>／
    // delegate void D<T>()）。class は下の class 分岐で名指す。
    if (
      language === "csharp" &&
      ["struct", "interface", "record"].includes(t.v)
    ) {
      const n1 = sigNext(this.ts, this.i + 1),
        n2 = sigNext(this.ts, n1 + 1);
      if (this.ts[n1]?.k === "id" && this.ts[n2]?.v === "<")
        unsupported("ジェネリック型パラメータ（<T>）の宣言", t.line);
    }
    if (language === "csharp" && t.v === "delegate") {
      let j = sigNext(this.ts, this.i + 1);
      while (
        this.ts[j]?.k === "id" &&
        this.ts[sigNext(this.ts, j + 1)]?.k === "id"
      )
        j = sigNext(this.ts, j + 1);
      if (
        this.ts[j]?.k === "id" &&
        this.ts[sigNext(this.ts, j + 1)]?.v === "<"
      )
        unsupported("ジェネリック型パラメータ（<T>）の宣言", t.line);
    }
    // RG-369：文頭のジェネリックメソッド定義（型 名前<T>(...)）。
    // 戻り値型・名前の2識別子の直後が "<" の形だけが対象で、
    // ジェネリック型の利用形（名前<...> 変数）や型宣言には届かない。
    if (language === "csharp") {
      let j = this.i;
      while (
        ["public", "private", "protected", "static", "internal", "sealed", "virtual", "override", "async", "partial"].includes(this.ts[j]?.v)
      )
        j = sigNext(this.ts, j + 1);
      const rt = this.ts[j],
        nmIdx = sigNext(this.ts, j + 1),
        nm = this.ts[nmIdx];
      if (
        rt?.k === "id" &&
        nm?.k === "id" &&
        !["class", "struct", "interface", "record", "delegate", "enum", "namespace"].includes(rt.v) &&
        this.ts[sigNext(this.ts, nmIdx + 1)]?.v === "<"
      )
        unsupported("ジェネリックメソッド（型パラメータ）", t.line);
    }
    if (t.v === "class") {
      if (language !== "csharp") unsupported("この言語のクラスは未対応です", t.line);
      this.take();
      let name = this.take().v;
      // RG-369（修正バッチ12・C#班）：ジェネリック型パラメータ宣言
      // （class Box<T> {}）。制約（where T : ...）が続く形も、
      // 先に現れる型パラメータそのものを名指す。
      if (this.ts[sigNext(this.ts, this.i)]?.v === "<")
        unsupported("ジェネリック型パラメータ（<T>）の宣言", t.line);
      this.take("{");
      let fields = {},
        main = [];
      while (!this.peek("}")) {
        this.skip();
        if (this.peek("}")) break;
        // R22-N21：クラス末尾の } が無いまま入力が終わると、take() が
        // トークン列の末尾を越えて生の TypeError になる。} 欠落として
        // 名指しで停止する（この経路は C# 専用）。
        if (this.peek("<eof>"))
          throw new PracticeError("} が必要です", this.ts[this.i]?.line ?? t.line);
        // RG-365（修正バッチ12・C#班）：メンバー位置の属性
        // （メソッド／フィールド／プロパティ／[return: ...] 等の
        // 対象指定子付き）は属性そのものを名指す。従来は "[" が
        // フィールド型として断片表示されていた。
        {
          const s = sigNext(this.ts, this.i);
          if (this.ts[s]?.v === "[" && attrBracketEnd(this.ts, s) > 0)
            unsupported("属性（アトリビュート）", this.ts[s]?.line ?? t.line);
        }
        let start = this.i;
        while (
          ["public", "private", "protected", "static"].includes(
            this.ts[this.i]?.v,
          )
        )
          this.take();
        if (this.peek("void") && this.ts[this.i + 1]?.v === "Main") {
          this.take();
          this.take();
          this.take("(");
          while (!this.peek(")") && !this.peek("<eof>")) this.take();
          this.take(")");
          main.push(...this.body());
          continue;
        }
        // R22-N21：修飾子の直後や型の直後で入力が終わっている場合も、
        // 未定義トークンの読み取りではなく } 欠落として停止する。
        if (this.peek("<eof>"))
          throw new PracticeError("} が必要です", this.ts[this.i]?.line ?? t.line);
        let typeTok = this.take(),
          fieldTok = this.take();
        if (!fieldTok || fieldTok.v === "<eof>")
          throw new PracticeError(
            "} が必要です",
            fieldTok?.line ?? typeTok?.line ?? t.line,
          );
        let type = typeTok.v,
          field = fieldTok.v;
        // RG-369（修正バッチ12・C#班）：インデクサ
        // （型 this[引数] ...）とジェネリックメソッド
        // （型 名前<T>(...)）は構文そのものを名指す。
        if (
          fieldTok.v === "this" &&
          this.ts[sigNext(this.ts, this.i)]?.v === "["
        )
          unsupported("インデクサ（this[...]）", t.line);
        if (this.ts[sigNext(this.ts, this.i)]?.v === "<")
          unsupported("ジェネリックメソッド（型パラメータ）", t.line);
        if (!builtinTypes.includes(type))
          unsupported("クラスのフィールド型 " + type, t.line);
        if (this.peek("=")) unsupported("クラスフィールドの初期化式", t.line);
        this.take(";");
        fields[field] = {
          type,
          initial: ["int", "long", "double", "float"].includes(type)
            ? 0
            : type === "bool"
              ? false
              : null,
        };
      }
      this.take("}");
      classes[name] = fields;
      return { k: "block", body: main, line: t.line, entry: true };
    }
    if (["int", "void", "static", "public"].includes(t.v)) {
      let j = this.i;
      while (["public", "static"].includes(this.ts[j]?.v)) j++;
      if (
        ["int", "void"].includes(this.ts[j]?.v) &&
        ["main", "Main"].includes(this.ts[j + 1]?.v) &&
        this.ts[j + 2]?.v === "("
      ) {
        while (this.i < j + 3) this.take();
        while (!this.peek(")") && !this.peek("<eof>")) this.take();
        this.take(")");
        return {
          k: "block",
          body: this.body(),
          line: t.line,
          refs: ["main"],
          entry: true,
        };
      }
    }
    if (t.v === "if") {
      // Same shape as the shared parser, but a braceless body may end with
      // ";" — consume separators before looking for "else".
      this.take();
      let test;
      if (this.peek("(")) {
        this.take();
        test = this.expr();
        this.take(")");
      } else test = this.expr();
      let body = this.body();
      this.skip();
      let otherwise = [];
      if (this.peek("else")) {
        this.take();
        otherwise = this.peek("if") ? [this.statement()] : this.body();
      }
      return { k: "if", test, body, otherwise, line: t.line, refs: ["if"] };
    }
    if (t.v === "switch") unsupported("switch 文は未対応です", t.line);
    if (t.v === "do") {
      this.take();
      let body = this.body();
      this.skip();
      if (!this.peek("while"))
        throw new PracticeError("do-while の while が必要です", t.line);
      this.take();
      this.take("(");
      let test = this.expr();
      this.take(")");
      // NX-N5／NX-N10 根因：本体を先行実行して残りを while に書き換える
      // 旧変換では、先行分が回数注記に含まれず（常に1回少ない）、先行分の
      // break／continue がループ文脈の外で「繰り返しの外」と誤判定された。
      // 共有パーサと同じく後判定ループ（postTest）として表し、初回反復も
      // ループの中で数え・制御する。
      return {
        k: "while",
        test,
        body,
        line: t.line,
        postTest: true,
        refs: ["do", "while"],
      };
    }
    if (t.v === "foreach" && language === "csharp") {
      this.take();
      this.take("(");
      let typeTok = this.take();
      // RG-351：foreach の反復変数の nullable 型も型そのものを名指す。
      if (this.peek("?")) unsupported(`nullable 型（${typeTok.v}?）`, t.line);
      if (this.peek("[")) {
        this.take();
        this.take("]");
      }
      let name = this.take();
      if (name.k !== "id") throw new PracticeError("foreach の変数名が必要です", t.line);
      if (!this.peek("in")) throw new PracticeError("foreach の in が必要です", t.line);
      this.take();
      let collection = this.expr();
      this.take(")");
      return {
        k: "each",
        name: name.v,
        varType: typeTok.v,
        collection,
        body: this.body(),
        line: t.line,
        refs: ["foreach"],
      };
    }
    if (t.v === "while") {
      // RG-356：while 条件は C／C++ では全文（カンマ演算子を含む）を
      // 読む。共有パーサの exprCtx(1) 経由ではカンマが区切り扱いに
      // なり、単独括弧の条件（while (i++, i < 3) 等）が読めなかった。
      this.take();
      this.take("(");
      this.cCommaDepth = (this.cCommaDepth || 0) + 1;
      let test;
      try {
        test = this.expr();
      } finally {
        this.cCommaDepth--;
      }
      this.take(")");
      return { k: "while", test, body: this.body(), line: t.line, refs: ["while"] };
    }
    if (t.v === "for") {
      // RG-356（R32-N10）：for 句の読みを c-family 側で行う。
      // - C／C++：初期化部は宣言か全文（カンマ演算子を含む式文）、
      //   条件・更新部も全文。共有パーサの simple() 経由では初期化部
      //   の代入のカンマ列・更新部のカンマ列が「; が必要です」という
      //   虚偽原因になっていた。
      // - C#：初期化部・更新部は文式のカンマ列（宣言子列は simple()
      //   が読む）。条件は単一の式（カンマ演算子は無い）。
      this.take();
      this.take("(");
      const line = t.line;
      // B8（cpp-engine-b）：範囲 for（for (型 名前 : 対象)）は C++ 専用
      // の形として先に試行する。形が合わなければ読み位置を戻し、
      // 従来の for として読み直す（通常 for の初期化部に ":" は現れない）。
      if (language === "cpp") {
        const saveRf = this.i;
        let rf = null;
        try {
          rf = tryParseRangeFor(this);
        } catch {
          rf = null;
        }
        if (rf) {
          return {
            k: "each",
            name: rf.name,
            varType: rf.varType,
            varSpec: rf.varSpec,
            rangeRef: rf.ref,
            rangeConst: rf.isConst,
            cppRange: true,
            collection: rf.collection,
            body: this.body(),
            line,
            refs: ["for"],
          };
        }
        this.i = saveRf;
      }
      const exprFull = () => {
        this.cCommaDepth = (this.cCommaDepth || 0) + 1;
        try {
          return this.expr();
        } finally {
          this.cCommaDepth--;
        }
      };
      const startsDeclaration = () => {
        const h = this.ts[this.i];
        if (!h) return false;
        if (
          builtinTypes.includes(h.v) ||
          classes[h.v] ||
          ["unsigned", "signed", "short", "long", "uint", "ulong", "ushort", "byte", "sbyte"].includes(h.v)
        )
          return true;
        // B8（cpp-engine-b）：for 初期化部のコンテナ／イテレータ／auto
        // 宣言（auto it = v.begin() 等）も宣言として読む。
        if (
          language === "cpp" &&
          (["vector", "array", "pair", "auto", "const"].includes(h.v) ||
            (h.v === "string" && this.ts[this.i + 1]?.v === "::"))
        )
          return true;
        return h.k === "id" && this.ts[this.i + 1]?.k === "id";
      };
      const statementList = () => {
        // 文式をカンマで区切って並べた列（C# の初期化部・更新部。
        // カンマ演算子ではなく文法上の列）。要素は expr() で読む：
        // simple() 経由では代入要素の直後のカンマが共有側の終端
        // チェックに触れて「; が必要です」になっていた（HEAD でも
        // 同形は停止していた）。要素が1つなら従来の文ノードの形
        // （= 代入は代入文、それ以外は式文）を保ち、複数ならカンマ
        // 式の式文にする（評価順・値は実 C# の列と同じ）。
        const parts = [this.expr()];
        while (this.peek(",")) {
          this.take();
          parts.push(this.expr());
        }
        if (parts.length === 1) {
          const only = parts[0];
          return only?.k === "assign" && only.op === "="
            ? only
            : { k: "expression", value: only, line };
        }
        let chain = parts[0];
        for (let k = 1; k < parts.length; k++)
          chain = { k: "comma", a: chain, b: parts[k], line };
        return { k: "expression", value: chain, line };
      };
      const clauseExpr = () => {
        // C／C++ の初期化部（宣言でない形）・更新部。カンマが現れる
        // 形だけ全文として読み直し、それ以外は従来どおり simple()
        // の結果（文ノードの形）をそのまま使う。
        const save = this.i;
        let stopsAtComma = false;
        try {
          this.expr();
          stopsAtComma = this.ts[this.i]?.v === ",";
        } catch {
          stopsAtComma = false;
        }
        this.i = save;
        if (!stopsAtComma) return this.simple();
        return { k: "expression", value: exprFull(), line };
      };
      let init = null;
      if (!this.peek(";")) {
        if (startsDeclaration()) init = this.simple();
        else if (language === "csharp") init = statementList();
        else init = clauseExpr();
      }
      this.take(";");
      let test = this.peek(";")
        ? { k: "literal", value: true, line }
        : language === "csharp"
          ? this.expr()
          : exprFull();
      this.take(";");
      let update = null;
      if (!this.peek(")")) {
        if (language === "csharp") update = statementList();
        else update = clauseExpr();
      }
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
    {
      // User-defined function definitions/prototypes: stop honestly,
      // naming the function, instead of blaming a cast or a token.
      let j = this.i;
      while (["public", "private", "protected", "static"].includes(this.ts[j]?.v)) j++;
      const typeWords = ["int", "long", "double", "float", "bool", "char", "string", "void", "unsigned int", "unsigned long", "unsigned short", "unsigned char", "signed char", "short", "unsigned", "signed"];
      let words = 0;
      while (
        typeWords.includes(this.ts[j]?.v) ||
        (words > 0 && this.ts[j]?.k === "id" && classes[this.ts[j].v])
      ) {
        j++;
        words++;
      }
      if (words > 0) {
        const nameTok = this.ts[j];
        if (nameTok?.k === "id" && this.ts[j + 1]?.v === "(") {
          let depth = 0,
            close = -1;
          for (let k = j + 1; k < this.ts.length; k++) {
            const v = this.ts[k].v;
            if (v === "(") depth++;
            else if (v === ")") {
              depth--;
              if (depth === 0) {
                close = k;
                break;
              }
            } else if (v === "<eof>") break;
          }
          if (close > 0) {
            // RG-365（修正バッチ12・C#班）：引数位置の属性は、
            // 関数定義そのものより先に（出現順どおり）名指す。
            if (language === "csharp") {
              for (let k = j + 2; k < close; k++) {
                if (this.ts[k]?.v !== "[") continue;
                let pk = k - 1;
                while (this.ts[pk]?.v === "\n" && !this.ts[pk]?.k) pk--;
                if (
                  (pk === j + 1 || this.ts[pk]?.v === ",") &&
                  attrBracketEnd(this.ts, k) > 0
                )
                  unsupported("属性（アトリビュート）", t.line);
              }
            }
            const after = this.ts[close + 1]?.v,
              params = this.ts.slice(j + 2, close);
            const paramIsTyped =
              params.length === 0 ||
              typeWords.includes(params[0].v) ||
              classes[params[0].v];
            if (after === "{" || (after === ";" && paramIsTyped))
              unsupported(
                `ユーザ定義関数 ${nameTok.v} の定義は未対応です`,
                t.line,
              );
          }
        }
      }
    }
    return statement();
  };
  // RG-78（R21-N9）: C系では文の終わりの ; が必須。宣言・代入・式文・
  // return・break・continue・cout 文は直後の ; を必須とし、無ければ
  // 名指しで停止する（; 欠落を「次の文」として無言で実行しない）。
  // for の初期化・更新は simple() を直接使うため影響しない。
  const innerStatement = p.statement;
  p.statement = function () {
    const n = innerStatement.call(this);
    if (
      ["declare", "declareGroup", "assign", "expression", "return", "break", "continue"].includes(n.k) ||
      (n.k === "action" && ["cout", "cerr", "clog"].includes(n.action))
    ) {
      if (!this.peek(";"))
        throw new PracticeError("; が必要です", this.ts[this.i]?.line ?? n.line, "SyntaxError");
      this.take(";");
    }
    return n;
  };
  const nodes = [...pendingDecls, ...p.program()];
  // R25-N8（C家族分）：キーワードリテラル（true／false／null／
  // nullptr）は共有パーサでは k:"var" ノードとして運ばれるため、
  // 共有 executeProgram の代入ターゲット検証（書き込み可能な形は
  // var／index／member のみ）を素通りし、`true = x;` が右辺の名前を
  // 誤って指したり、`true = 5;` が書き込み先の未宣言エラーに化け
  // たりしていた。言語のキーワードをリテラルノードへ分類し直し、
  // 検証が右辺評価より前に代入先を名指せるようにする。宣言名・
  // メンバー名は文字列フィールドであり var ノードではないため
  // 影響しない。
  {
    const keywordLiterals =
      language === "csharp"
        ? { true: true, false: false, null: null }
        : language === "cpp"
          ? { true: true, false: false, nullptr: null }
          : { true: true, false: false };
    const convertKeywords = (x) => {
      if (!x || typeof x !== "object") return;
      if (Array.isArray(x)) {
        for (const el of x) convertKeywords(el);
        return;
      }
      if (
        x.k === "var" &&
        Object.hasOwn(keywordLiterals, x.name)
      ) {
        x.k = "literal";
        x.value = keywordLiterals[x.name];
        delete x.name;
        return;
      }
      for (const v of Object.values(x)) convertKeywords(v);
    };
    convertKeywords(nodes);
  }
  // P-N4：構文解析の段階も時間上限の対象にする（段階末でも検査する）。
  if (deadline !== undefined && performance.now() > deadline)
    throw new PracticeError(
      "解析時間の上限で停止しました。コードを小さくして再実行してください。",
      1,
      "limit",
    );
  return { nodes, classes };
}
// 高度モード（ブロックB6）のライブラリ拡張フック用センチネル。
// 種類の index.js が createCFamily の library オプションへ渡した
// ハンドラが「この名前は扱わない」と返すときに使う。
export const LIBRARY_UNHANDLED = Symbol("library-unhandled");

export function createCFamily({ id, name, extensions, language, library = null }) {
  // 高度モード（ブロックB6）：ライブラリ拡張ファクトリは後付けで
  // 差し替えられる（definition.installAdvancedLibrary）。高度エンジン
  // フック（advanced-engine.js の applyAdvancedEngine）が使う入口で、
  // エンジン本体にモード分岐は持たない（契約 advanced-interface.md
  // 第5章(e)）。従来どおり library オプションでの同時指定も可能。
  let libraryFactory = library;
  const managed = id === "csharp";
  let reference = rows([
    [
      "int",
      "型",
      "int n = 1;",
      // RA-38：C# の int は仕様で常に32ビット固定であり、「実環境で
      // サイズが変わりうる」含みは C# では誤り。言語別に文面を分ける。
      // RA-35：C／C++ では signed／signed int の別名にも言及する。
      managed
        ? "32ビット符号付き整数（System.Int32）です。C# では幅は常に32ビット固定です。"
        : "モデルでは32ビット符号付き整数です。",
      "int n = 1;",
      managed
        ? "C# では常に32ビット固定で、実環境によってサイズが変わることはありません。"
        : "実環境の型サイズはモデル設定と区別します。別名表記 signed、signed int も同じ型です（signed 単独でも int を表します）。",
    ],
    [
      "double",
      "型",
      "double x = 1.5;",
      "浮動小数点数を扱います。",
      "double x = 1.5;",
    ],
    [
      "array",
      "メモリ",
      "int values[3] = {1, 2, 3};",
      "添字0から連続する要素を表します。",
      managed ? "int[] values = {1,2,3};" : "int values[3] = {1,2,3};",
      managed
        ? "範囲外はIndexOutOfRangeExceptionです。"
        : "範囲外の読み書きは未定義動作として停止します。",
    ],
    [
      "pointer",
      "メモリ",
      "int *p = &values[0];",
      "モデル上のオブジェクトとオフセットでポインタを表します。",
      "int *p = &values[0];\n*(p + 1) = 20;",
      "数値の実アドレスは捏造しません。" +
        (managed ? "C#のunsafeポインタは未対応です。" : ""),
      !managed,
    ],
    [
      "NULL",
      "定数",
      "int *p = NULL;",
      "ヌルポインタ定数を表すマクロです（<stddef.h> や <stdio.h> などで定義されます）。どのオブジェクトも指していないポインタを表します。",
      "int *p = NULL;\nif (p == NULL) { p = NULL; }",
      "モデルでは null として扱い、ポインタへの代入と比較に使えます。指していない先の読み書きは未定義動作として停止します。",
      !managed,
    ],
    [
      "nullptr",
      "定数",
      "int *p = nullptr;",
      "C++11 で導入されたヌルポインタリテラルです。型は std::nullptr_t で、任意のポインタ型へ変換できますが整数型へは変換できません。NULL より型安全なため、C++ ではこちらが推奨されます。",
      "int *p = nullptr;\nif (p == nullptr) { p = nullptr; }",
      "モデルでは null として扱い、ポインタへの代入と比較に使えます。",
      id === "cpp",
    ],
    [
      "if",
      "制御",
      "if (condition) { … } else { … }",
      "条件が真なら if のブロック、偽なら else のブロック（あれば）を実行します。else if で条件を連ねることもできます。",
      "if (n > 0) { n = 1; }",
    ],
    [
      "for",
      "制御",
      "for (int i=0; i<3; i++) { … }",
      "初期化・条件・更新で繰り返します。",
      "for (int i=0; i<3; i++) { total += i; }",
    ],
    [
      "while",
      "制御",
      "while (condition) { … }",
      "条件成立中に繰り返します。",
      "while (n < 3) { n++; }",
    ],
    [
      "return",
      "制御",
      "return value;",
      "関数から値を返して実行を終えます。",
      // RA-39：C／C++ の例が return 0; の重複行（2行目は到達不能）に
      // なっていた。条件分岐で早期 return を示す形にする。
      // RA-38：C# では Main（大文字）が正表記。
      managed ? "return;" : "int n = 1;\nif (n > 0) { return 0; }",
      managed ? "Main の終了にも使います。" : "main の終了にも使います。",
    ],
    [
      "printf",
      "出力",
      'printf("%d\\n", n);',
      "書式と引数を対応させて出力を説明します。",
      'printf("%d\\n", n);',
      "%d / %i / %f / %s / %c / %u / %%のみです。書式と型の不一致は停止します。",
      !managed,
    ],
    [
      "cout",
      "出力",
      "cout << n << endl;",
      "ストリームへの出力を説明します。",
      "cout << n << endl;",
      "数値・文字列・endlに限定します。",
      id === "cpp",
    ],
    [
      "Console.WriteLine",
      "出力",
      "Console.WriteLine(value);",
      "標準出力に値と改行を出します。",
      "Console.WriteLine(total);",
      "1引数形式のみです。",
      managed,
    ],
    [
      "Console.ReadLine",
      "入力",
      "Console.ReadLine()",
      "実行時の入力またはnullを未確定値として扱います。",
      "string text = Console.ReadLine();",
      "実際の標準入力は読みません。",
      managed,
    ],
    [
      "class",
      "オブジェクト",
      "class Counter { public int Value; }",
      "モデルのフィールドを持つ参照オブジェクトを作ります。",
      "Counter c = new Counter();\nc.Value = 1;",
      "単純フィールドのみです。コンストラクタ・継承・プロパティ等は未対応です。",
      managed,
    ],
    [
      "checked",
      "数値",
      "checked { … }",
      "整数オーバーフローを例外として扱います。",
      "checked { n = n + 1; }",
      "uncheckedの実行時int演算は32ビットへ折り返します。",
      managed,
    ],
    [
      "long",
      "型",
      "long n = 1;",
      managed
        ? "64ビット符号付き整数（System.Int64）です。"
        : "符号付き整数です。モデルでは longBits（既定64ビット）で幅を表します。",
      "long n = 1;",
      managed
        ? "範囲は -9223372036854775808〜9223372036854775807です。安全な精度範囲を超える計算は未確認として停止します。"
        : "別名表記 long int、signed long、signed long int も同じ型です。long long は実言語では別の型ですが、モデルでは long へ畳み込んで受理します。",
    ],
    [
      "float",
      "型",
      "float x = 1.5f;",
      // RA-32：C／C++ の規格は 32ビット／IEEE 形式を保証しない。
      // モデルの幅を実物一般の事実のように断定しない（C# の float は
      // 仕様で binary32 固定のため、その旨を明記する）。
      managed
        ? "32ビット単精度浮動小数点数（System.Single）です。C# では IEEE 754 binary32 形式と仕様で定められています。"
        : "モデルでは32ビット単精度浮動小数点数（IEEE 754 binary32 相当）です。実環境では規格上、32ビットであることや IEEE 形式であることは保証されません。",
      "float x = 1.5f;",
      managed
        ? "リテラル 1.5 は double 型です。float には f 接尾辞（1.5f）を付けます。"
        : "リテラル 1.5 は double 型です。float には f 接尾辞（1.5f）を付けます。double より精度が粗くなります。",
    ],
    [
      "char",
      "型",
      "char c = 'A';",
      managed
        ? "16ビットの Unicode 文字1文字を表します（System.Char）。"
        : "1バイトの文字型です。モデルでは文字コードの数値として扱います（'A' は 65）。",
      "char c = 'A';",
      managed
        ? "文字列ではなく1文字です。数値との相互変換はキャストで行います。"
        : "char の符号は処理系依存です。モデルでは範囲外の値への変換を未確認として停止します。符号を保証したい場合は signed char／unsigned char を使います。",
    ],
    [
      "short",
      "型",
      "short n = 1;",
      // RA-32：C／C++ の short は少なくとも16ビットで幅は処理系依存、
      // 保証される最小範囲は -32767〜32767。モデルの幅と分けて書く。
      // RA-35：signed short int の別名にも言及する。
      managed
        ? "16ビット符号付き整数（System.Int16）です。C# では幅は常に16ビット固定です。"
        : "モデルでは16ビット符号付き整数です。実環境では少なくとも16ビットで、幅は処理系依存です。",
      "short n = 1;",
      managed
        ? "範囲は -32768〜32767（System.Int16）です。"
        : "別名表記 short int、signed short、signed short int も同じ型です。モデルでの範囲は -32768〜32767（実環境で保証される最小範囲は -32767〜32767）です。",
    ],
    [
      "bool",
      "型",
      "bool ok = true;",
      id === "csharp"
        ? "真偽値 true／false を表します（System.Boolean）。"
        : id === "cpp"
          ? "真偽値 true／false を表す型です。整数との相互変換もできます。"
          : "真偽値 true／false を表す型です（本来は <stdbool.h> の bool）。モデルでは宣言と真偽値の代入に対応します。",
      "bool ok = true;",
      id === "c"
        ? "部分実装です：(bool) 式のキャストは C では明示的に対応しておらず、未対応として停止します（宣言・代入は動作します）。"
        : id === "cpp"
          ? "(bool) キャストを含め対応しています。"
          : "条件式の結果も bool です。数値との暗黙変換はありません。",
    ],
    [
      "unsigned int",
      "型",
      "unsigned int n = 1;",
      // RA-32 兄弟表面：unsigned int もモデルの幅と実物の保証を分ける。
      "モデルでは32ビット符号なし整数です。負の値にはならず、演算は 2^32 の剰余で折り返します。実環境では少なくとも16ビットで、幅は処理系依存です。",
      "unsigned int n = 1;",
      "unsigned だけでも同じ型を表します（unsigned = unsigned int）。",
    ],
    [
      "unsigned long",
      "型",
      "unsigned long n = 1;",
      "符号なし整数です。幅は long と同じで、モデルでは longBits（既定64ビット）に従います。",
      "unsigned long n = 1;",
      "別名表記 unsigned long int も同じ型です。unsigned long long は実言語では別の型ですが、モデルでは unsigned long へ畳み込んで受理します。",
    ],
    [
      "unsigned short",
      "型",
      "unsigned short n = 1;",
      // RA-32：short と同様、実物では少なくとも16ビットで処理系依存。
      "モデルでは16ビット符号なし整数です（0〜65535）。実環境では少なくとも16ビットで、幅は処理系依存です。",
      "unsigned short n = 1;",
      "別名表記 unsigned short int も同じ型です。",
    ],
    [
      "unsigned char",
      "型",
      "unsigned char n = 65;",
      // RA-32 兄弟表面：0〜255 は CHAR_BIT=8 のモデルの範囲。
      "モデルでは1バイト（8ビット）符号なし整数です（0〜255）。文字コードの格納にも使います。実環境ではバイト幅（CHAR_BIT）が8より大きい処理系もあり、その場合は上限が広がります。",
      "unsigned char n = 65;",
      "char とは別の型で、符号なしであることが保証されます。",
    ],
    [
      "signed char",
      "型",
      "signed char c = 'A';",
      // RA-32：-128〜127 は CHAR_BIT=8 のモデルの範囲。
      "モデルでは1バイト（8ビット）符号付き整数です（-128〜127）。実環境ではバイト幅（CHAR_BIT）が8より大きい処理系もあり、その場合は範囲が広がります。",
      "signed char c = 'A';",
      "通常の char とは別の型です。char の符号は処理系依存ですが、signed char は符号付きが保証されます。",
    ],
    [
      "uint",
      "型",
      "uint n = 1;",
      "32ビット符号なし整数（System.UInt32）です。範囲は 0〜4294967295。",
      "uint n = 1;",
      // D3 是正に合わせた文面：符号なし範囲で扱い、unchecked では
      // 折り返し、checked では OverflowException になる。
      "既定（unchecked）では、範囲を超える演算・変換は 2^32 の剰余で折り返します。checked では OverflowException になります。uint.MaxValue 自体も参照できます。",
    ],
    [
      "ulong",
      "型",
      "ulong n = 1;",
      "64ビット符号なし整数（System.UInt64）です。範囲は 0〜18446744073709551615。",
      "ulong n = 1;",
      // RA-37：ulong.MinValue が未対応であることも開示する
      // （ushort の MaxValue／MinValue 開示と揃える）。
      "64ビットの大きな値は安全な精度範囲外として未確認になる場合があります。ulong.MaxValue は未確定値として返ります（定数項目を参照）。ulong.MinValue は静的メンバーの表になく未対応として停止します（実値は 0）。",
    ],
    [
      "ushort",
      "型",
      "ushort n = 1;",
      "16ビット符号なし整数（System.UInt16）です。範囲は 0〜65535。",
      "ushort n = 1;",
      "既定（unchecked）では、範囲を超える演算・変換は 65536 の剰余で折り返します。checked では OverflowException になります。ushort.MaxValue／MinValue 自体も参照できます。",
    ],
    [
      "byte",
      "型",
      "byte n = 1;",
      "8ビット符号なし整数（System.Byte）です。範囲は 0〜255。",
      "byte n = 1;",
      "既定（unchecked）では、範囲を超える演算・変換は 256 の剰余で折り返します。checked では OverflowException になります。byte.MaxValue 自体も参照できます。",
    ],
    [
      "sbyte",
      "型",
      "sbyte n = -1;",
      "8ビット符号付き整数（System.SByte）です。範囲は -128〜127。",
      "sbyte n = -1;",
      "byte と異なり負の値を表せます。",
    ],
    [
      "string",
      "型",
      managed ? "string s = \"tea\";" : "std::string s = \"tea\";",
      managed
        ? "文字列を表す参照型です。Length プロパティと添字 s[i] に対応します。"
        : "std::string 型の文字列です。既定では空文字列で、+／+= で連結でき、添字で1文字ずつ読み書きできます。比較もできます。",
      managed
        ? "string s = \"tea\";"
        : "string s = \"ab\";\ns += \"c\";\ncout << s << endl;",
      managed
        ? "文字列補間 $\"…\" は別項目です。"
        : "メソッド（.length() 等）は未実装です。C にはこの型はなく、char 配列を使います。",
    ],
    [
      "参照",
      "型",
      "int& ref = n;",
      "宣言した変数の別名です。参照を通した読み書きは、参照先の変数そのものへの読み書きになります。",
      "int n = 1;\nint& ref = n;\nref = 2;\ncout << n << endl;",
      "C++専用です。宣言時に参照先の指定が必須で、後から別の変数へ付け替えることはできません（代入は参照先への代入になります）。ポインタとは別の仕組みです。",
    ],
    [
      "do",
      "制御",
      "do { … } while (condition);",
      "本体を先に1回実行し、その後、条件が真の間くり返します。条件が最初から偽でも本体は1回実行されます。",
      "int n = 0;\ndo { n++; } while (n < 3);",
      "末尾の while の後には ; が必要です。",
    ],
    [
      "sizeof",
      "演算子",
      "sizeof(型) / sizeof 式",
      "型または式の型の大きさをバイト数で返します。モデルでのサイズは char・bool が1、short が2、int・float が4、double が8、long は longBits（既定64で8）です。",
      "int bytes = sizeof(double);",
      "オペランドの式は評価されません（副作用は起きません）。結果の型は size_t 相当で、モデルでは longBits=64 のとき unsigned long です。ポインタ型・構造体型の sizeof は未対応です。",
    ],
    [
      "キャスト",
      "型",
      "(型)式",
      managed
        ? "式の値を指定した型へ明示的に変換します。対応する型は int、long、double、float、char、bool、short、uint、ulong、ushort、byte、sbyte、string です。ただし bool へキャストできるのは bool の値だけ、string へキャストできるのは文字列と参照型だけです。"
        : "式の値を指定した型へ明示的に変換します（C形式キャスト）。浮動小数点から整数への変換では小数部が切り捨てられます。",
      "double x = 1.5;\nint n = (int)x;",
      id === "c"
        ? "(bool) 式のキャストは C では未対応です（bool 項目を参照）。ポインタ型・修飾型・独自型へのキャストも未対応です。"
        : id === "cpp"
          ? "static_cast 等の名前付きキャストと関数形式のキャストは未対応です。ポインタ型・参照型・修飾型へのキャストも未対応です。"
          : "decimal へのキャストは未対応です。数値から bool／string へのキャストはできません。範囲外の変換は例外または未確認として停止します。",
    ],
    [
      "三項演算子",
      "演算子",
      "condition ? value1 : value2",
      "条件が真なら value1、偽なら value2 を値とする式です。条件演算子とも呼びます。",
      "int n = 2;\nint label = n > 0 ? 1 : 0;",
      managed
        ? "null 合体演算子 ?? は未対応です。"
        : "文ではなく式です。入れ子にすると読みにくくなるため、複雑な分岐は if を使います。",
    ],
    [
      "abs",
      "関数",
      "abs(n)",
      "int の絶対値を返します（<stdlib.h>／<cstdlib> の関数）。",
      "int n = abs(-3);",
      "最も小さい int（-2147483648）の絶対値は int で表せず、未定義動作として停止します。",
    ],
    [
      "break",
      "制御",
      "break;",
      "内側のループの実行を直ちに終了し、ループの次の文へ進みます。",
      "int total = 0;\nfor (int i = 0; i < 10; i++) { if (i == 3) { break; } total += i; }",
      managed
        ? "switch 文から抜けるためにも使いますが、モデルでは switch 文は未対応です。"
        : "ループの外では使えません。",
    ],
    [
      "continue",
      "制御",
      "continue;",
      "ループの今回の繰り返しを打ち切り、次の繰り返しの判定へ進みます。",
      "int total = 0;\nfor (int i = 0; i < 5; i++) { if (i == 2) { continue; } total += i; }",
      "for では更新式を実行してから次の判定へ進みます。",
    ],
    [
      "getline",
      "入力",
      "std::getline(std::cin, stringVariable)",
      "標準入力から1行を読み取り、string 変数へ格納します。モデルでは実行時の入力を未確定値として扱います。std::cin はこの関数の第1引数として使います。",
      "string line;\nstd::getline(std::cin, line);",
      // D7 是正に合わせた文面：抽出先は未確定値になる。
      "対応形式は std::getline(std::cin, 変数) のみです。cin >> x の抽出も、モデルでは抽出先の変数が未確定値になります（実際の入力内容は再現されません）。戻り値は std::istream& であり読み取った文字列ではないため、変数へ代入する形（std::string r = std::getline(…) 等）はコンパイルエラーとして停止します。",
    ],
    [
      "endl",
      "出力",
      "std::endl",
      "cout への出力で改行を表します。モデルでは改行文字 \"\\n\" として扱います。",
      "cout << 1 << endl;",
      "実物の std::endl は改行に加えてストリームをフラッシュしますが、モデルではフラッシュは再現しません。",
    ],
    [
      "foreach",
      "制御",
      "foreach (型 変数 in コレクション) { … }",
      "配列などの要素を先頭から順に変数へ代入しながらくり返します。",
      "int[] values = {1, 2, 3};\nint total = 0;\nforeach (int v in values) { total += v; }",
    ],
    [
      "unchecked",
      "数値",
      "unchecked { … } / unchecked(式)",
      "整数演算のオーバーフローを検査せず、ビット幅で折り返して計算することを明示します。C# の既定の動作でもあります。",
      "int n = 2147483647;\nunchecked { n = n + 1; }",
      "checked と対の指定です。実 C# では、定数式の算術オーバーフローは unchecked では折り返し（checked と既定ではコンパイルエラー CS0220）、範囲外の定数キャストも unchecked では折り返し（checked と既定ではコンパイルエラー CS0221）、キャストなしの暗黙の定数変換だけは unchecked でも CS0031 で拒否されます。このモデルでは、定数キャストは実 C# どおり（unchecked では折り返し、それ以外は CS0221 で停止）ですが、定数式の算術オーバーフローは unchecked でも停止します（モデルの制限）。",
    ],
    [
      "new",
      "式",
      "new 型[個数] / new 型[個数,個数] / new 型[個数][] / new 型[] { … } / new クラス名()",
      "配列またはオブジェクトを生成する式です。配列は要素が型の既定値で初期化されます。",
      "int[] values = new int[3];\nvalues[0] = 1;",
      "対応形式は new 型[個数]、new 型[個数,個数]（矩形配列）、new 型[個数][]（ジャグ配列）、new 型[] {…}、引数なしの new クラス名() です。引数付きコンストラクタや、多次元／ジャグ配列への new と初期化子 {…} の併用などは未対応です。",
    ],
    [
      "文字列補間",
      "文字列",
      "$\"…{式}…\"",
      "文字列リテラル内の {式} の部分を、その値の文字列表現で置き換えます。{{ と }} は波括弧そのものを表します。",
      "int n = 3;\nstring s = $\"n={n}\";\nConsole.WriteLine(s);",
      "配置指定（{式,配置}）と書式指定子（{式:書式}）は未対応です。",
    ],
    [
      "int.TryParse",
      "変換",
      "int.TryParse(string, out int variable)",
      "文字列を int へ変換できるか試します。成功すると true を返し out 変数へ値を入れ、失敗すると false を返し out 変数へ 0 を入れます。",
      "int n;\nbool ok = int.TryParse(\"42\", out n);\nConsole.WriteLine(n);",
      "int.Parse と異なり、変換できない文字列でも例外にはなりません。対応形式は（文字列, out 変数）の2引数のみです。int.Parse／double.Parse は未実装です。",
    ],
    [
      "double.TryParse",
      "変換",
      "double.TryParse(string, out double variable)",
      "文字列を double へ変換できるか試します。成功すると true を返し out 変数へ値を入れ、失敗すると false を返し out 変数へ 0 を入れます。",
      "double x;\nbool ok = double.TryParse(\"1.5\", out x);\nConsole.WriteLine(x);",
      "double.Parse と異なり、変換できない文字列でも例外にはなりません。対応形式は（文字列, out 変数）の2引数のみです。",
    ],
    [
      "Length",
      "プロパティ",
      "array.Length / text.Length",
      "配列では要素数、文字列では文字数を int で返します。",
      "int[] values = {1, 2, 3};\nstring s = \"tea\";\nint n = values.Length + s.Length;",
      "文字列の各文字へは添字 s[i] でもアクセスできます。",
    ],
    ...[
      ["int.MaxValue", "int の最大値です。"],
      ["int.MinValue", "int の最小値です。"],
      ["uint.MaxValue", "uint の最大値です。"],
      ["uint.MinValue", "uint の最小値です。"],
      ["short.MaxValue", "short の最大値です。"],
      ["short.MinValue", "short の最小値です。"],
      ["byte.MaxValue", "byte の最大値です。"],
      ["byte.MinValue", "byte の最小値です。"],
      ["sbyte.MaxValue", "sbyte の最大値です。"],
      ["sbyte.MinValue", "sbyte の最小値です。"],
      ["char.MaxValue", "char の最大値です（U+FFFF）。"],
      ["char.MinValue", "char の最小値です（U+0000）。"],
      ["Math.PI", "円周率 π の近似値です。"],
      ["Math.E", "自然対数の底 e の近似値です。"],
      ["String.Empty", "空文字列 \"\" です。string.Empty と同じ値です。"],
      ["string.Empty", "空文字列 \"\" です。String.Empty と同じ値です。"],
      ["long.MaxValue", "long の最大値です。"],
      ["long.MinValue", "long の最小値です。"],
      ["ulong.MaxValue", "ulong の最大値です。"],
    ].map(([n, d]) => [
      n,
      "定数",
      n,
      d,
      `Console.WriteLine(${n});`,
      n === "uint.MaxValue" || n === "byte.MaxValue"
        ? "変数へ代入しても、そのままの値が入ります。"
        : n === "long.MaxValue"
          ? "モデルでは64ビット境界値を安全な整数として表せないため、未確定値として返ります（実値は 9223372036854775807）。"
          : n === "long.MinValue"
            ? "モデルでは64ビット境界値を安全な整数として表せないため、未確定値として返ります（実値は -9223372036854775808）。"
            : n === "ulong.MaxValue"
              ? "モデルでは64ビット境界値を安全な整数として表せないため、未確定値として返ります（実値は 18446744073709551615）。"
              : "",
    ]),
  ]);
  const prelude = {pointer:"int values[3]={1,2,3};",if:"int n=2;",for:"int total=0;",while:"int n=0;",printf:"int n=3;",cout:"int n=3;","Console.WriteLine":"int total=3;",class:"class Counter { public int Value; }",checked:"int n=1;"};
  for (const r of reference) if (prelude[r.name]) r.example = prelude[r.name] + "\n" + r.example;
  if (managed) reference.find(r => r.name === "array").syntax = "int[] values = {1, 2, 3}; / int[,] table = {{1, 2}, {3, 4}}; / int[][] jagged = {new int[]{1, 2}, new int[]{3}};";
  const csharpOnly = ["uint","ulong","ushort","byte","sbyte","foreach","unchecked","new","文字列補間","int.TryParse","double.TryParse","Length","int.MaxValue","int.MinValue","uint.MaxValue","uint.MinValue","short.MaxValue","short.MinValue","byte.MaxValue","byte.MinValue","sbyte.MaxValue","sbyte.MinValue","char.MaxValue","char.MinValue","Math.PI","Math.E","String.Empty","string.Empty","long.MaxValue","long.MinValue","ulong.MaxValue"];
  const cppOnly = ["参照","getline","endl","nullptr"];
  reference = reference.filter(r => !managed
    ? !["Console.WriteLine","Console.ReadLine","class","checked", ...csharpOnly, ...(id === "c" ? ["cout","string", ...cppOnly] : [])].includes(r.name)
    : !["pointer","printf","cout","unsigned int","unsigned long","unsigned short","unsigned char","signed char","sizeof","abs","NULL", ...cppOnly].includes(r.name));
  if (!managed) for (const r of reference) {
    if (id === "cpp") r.example = r.example.replace(/\b(cout|endl|printf|string)\b/g, "std::$1");
    // The native examples must compile as written: C needs <stdbool.h> for
    // bool/true/false (C17), and C++ needs <string> for std::string. The
    // integer abs family (abs/labs/llabs) is declared by <stdlib.h> /
    // <cstdlib>; without that header the call is an implicit declaration,
    // which GCC 14+ (CI) rejects even though older gcc only warns (RG-144).
    // Add only the headers each example actually uses.
    const usesAbs = /\b(abs|labs|llabs)\s*\(/.test(r.example);
    const headers =
      id === "cpp"
        ? ["iostream", "cstdio", ...(r.example.includes("std::string") ? ["string"] : []), ...(usesAbs ? ["cstdlib"] : [])]
        : ["stdio.h", ...(/\b(bool|true|false)\b/.test(r.example) ? ["stdbool.h"] : []), ...(usesAbs ? ["stdlib.h"] : [])];
    r.example = `${headers.map((h) => `#include <${h}>`).join("\n")}\nint main() {\n${r.example}\nreturn 0;\n}`;
  }
  let codeArray = managed
    ? "int[] values = {1, 2, 3};\nint total = 0;\nfor (int i = 0; i < 3; i++) {\n    total += values[i];\n}\nConsole.WriteLine(total);"
    : `#include <${id === "cpp" ? "iostream" : "stdio.h"}>\nint main() {\n    int values[3] = {1, 2, 3};\n    int total = 0;\n    for (int i = 0; i < 3; i++) {\n        total += values[i];\n    }\n    ${id === "cpp" ? "std::cout << total << std::endl;" : 'printf("%d\\n", total);'}\n    return 0;\n}`;
  let templates = [
    {
      id: id + "-array",
      title: "配列と合計",
      code: codeArray,
      intro:
        "配列の要素を添字0から順に読み、合計6を求めます。変数とモデルメモリを確認できます。",
      refs: [
        "array",
        "int",
        "for",
        managed ? "Console.WriteLine" : id === "cpp" ? "cout" : "printf",
      ],
    },
    managed
      ? {
          id: "cs-object",
          title: "参照オブジェクトの共有",
          code: "class Counter { public int Value; }\nCounter first = new Counter();\nCounter same = first;\nsame.Value = 5;\nConsole.WriteLine(first.Value);",
          intro:
            "2つの変数が同じ参照オブジェクトを指すと、一方の更新をもう一方から読めます。",
          refs: ["class", "Console.WriteLine"],
        }
      : {
          id: id + "-pointer",
          title: "ポインタと配列の更新",
          code: `#include <${id === "cpp" ? "iostream" : "stdio.h"}>\nint main() {\n    int values[3] = {10, 20, 30};\n    int *p = &values[0];\n    *(p + 1) = 99;\n    ${id === "cpp" ? "std::cout << values[1] << std::endl;" : 'printf("%d\\n", values[1]);'}\n    return 0;\n}`,
          intro:
            "ポインタはモデルオブジェクトとオフセットで表します。配列の一つ先は作れますが、読み書きはできません。",
          refs: ["pointer", "array", id === "cpp" ? "cout" : "printf"],
        },
    {
      id: id + "-error",
      title: managed ? "範囲外アクセスの例外" : "範囲外アクセスと未定義動作",
      code: managed
        ? "int[] values = {1, 2};\nConsole.WriteLine(values[2]);"
        : "int main() {\n    int values[2] = {1,2};\n    int result = values[2];\n    return 0;\n}",
      intro: managed
        ? "範囲外の添字は例外として停止します。"
        : "配列の範囲を外れた値は説明に使わず、未定義動作としてその行で停止します。",
      refs: ["array"],
    },
  ];
  return {
    id,
    name,
    extensions,
    syntax: {
      name: managed ? "C# 部分集合（int32）" : name + " 部分集合（モデルABI）",
      caseSensitive: true,
      lineComment: "//",
    },
    reference,
    templates,
    // 高度モード（ブロックB6）：高度エンジンフックからのライブラリ
    // 拡張の後付け入口（モード分岐ではない。導入後は単一エンジンの
    // 一部として両モードで同じ結果を返す）。
    installAdvancedLibrary(factory) {
      libraryFactory = factory;
    },
    // 用語集は言語ごとに分ける（旧実装は3種類で同一配列を共有し、C# に
    // ポインタ／未定義動作、C に参照オブジェクトが混入していた：RG-136）。
    glossary: [
      ["配列", "同じ型の要素が並ぶオブジェクトです。"],
      ...(managed
        ? [
            [
              "参照オブジェクト",
              "複数の変数から同じ実体を参照できるオブジェクトです。",
            ],
            [
              "例外",
              "実行中に起きた異常を表し、throwで投げてtry／catchで受け取る仕組みです。配列の範囲外の添字などが例外で停止します。",
            ],
          ]
        : [
            [
              "ポインタ",
              "オブジェクト内の位置を指す値です。実アドレスとは分けてモデル化します。",
            ],
            [
              "未定義動作",
              "言語仕様が結果を規定しない実行です。予測値を作らず停止します。",
            ],
            [
              "添字",
              "配列の要素の位置を指定する番号です。0から始まるため、先頭の要素の添字は0です。",
            ],
          ]),
      ...(id === "cpp"
        ? [
            [
              "参照",
              "宣言した変数の別名です。参照への代入は、参照先の変数への代入になります。",
            ],
          ]
        : []),
      [
        "未確定（値）",
        "実行時に決まる値のことです。このアプリでは値を仮定して作らず、未確定のまま扱って、到達可能な分岐をすべて表示します。",
      ],
    ],
    model: {
      kind: "json",
      title: managed ? "モデル変数・オブジェクト" : "モデルABI・メモリ",
      hint: managed
        ? "intは32ビット、既定はuncheckedです。実CLRは実行しません。"
        : "intは32ビット。longはmodel.longBitsで32 / 64を指定します。実アドレスではなくシンボルでメモリを表示します。",
      defaults: {
        variables: {},
        intBits: 32,
        longBits: 64,
        memory: {},
        input: unknown("実行時の標準入力"),
      },
    },
    semantics: {
      description: managed
        ? "C#のint32演算、配列範囲検査、単純クラス・参照共有をモデル化します。"
        : "C / C++の符号付き整数・配列・ポインタをモデルメモリ上で追跡し、範囲外・未初期化・オーバーフローは停止します。",
      // RG-379（バッチ12表示追随）：スコープのシャドーイングは言語で
      // 実挙動が分かれる（C／C++ は内側ブロックで受理、C# は実 C# の
      // 規則どおり CS0136 で停止）ため、表明文も言語で出し分ける。
      // 同じスコープでの再宣言は全言語でエラーとして停止する。
      support:
        "mainまたは文の断片、単純宣言、代入、If / For / While、掲載出力。複数宣言子（int a = 1, b = 2; のように、1つの宣言に複数の名前を初期化子の有無を混ぜて書く形）にも対応します。宣言子ごとのポインタ（C／C++）・配列の修飾や、for の初期化部での複数宣言子も同じです。多次元配列にも対応します（C／C++ は連鎖添字の多次元配列、C# は矩形配列（int[,]）とジャグ配列（int[][]））。" +
        (managed
          ? "スコープ：同じスコープでの同名の再宣言はエラーとして停止します。外側で宣言した名前を内側のブロック・for・foreach で再宣言する形（シャドーイング）は、実 C# の規則どおり CS0136 として停止します（内側の宣言が先にある場合も同じです。兄弟ブロック同士の同名宣言は対応します）。未対応：型推論（auto / var）、動的確保・解放、複雑な型・テンプレート・関数定義。"
          : "スコープ：内側のブロックや for の初期化部で外側と同じ名前を再宣言する形（シャドーイング）に対応します（ブロックを抜けると外側の変数に戻ります）。同じスコープでの同名の再宣言はエラーとして停止します。ただしファイルスコープの大域変数と同名の変数を main の直下で宣言する形は、同一スコープとして停止します。未対応：型推論（auto / var）、複雑な型・テンプレート・関数定義。動的確保・解放は未対応（ただし高度モードの C では malloc／calloc／realloc／free をモデル範囲で対応し、その範囲は各項目の注意に開示します。C++ の new／delete は高度モードでも未対応です）。") +
        "64ビット整数の安全な精度範囲外は未確認として停止。",
      sources: managed
        ? [
            {
              title: "Microsoft C#整数演算",
              url: "https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/arithmetic-operators",
            },
          ]
        : [
            {
              title: "C++標準ドラフト ポインタ加算",
              url: "https://eel.is/c++draft/expr.add",
            },
            {
              title: "C11委員会ドラフト N1570",
              url: "https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf",
            },
          ],
    },
    scan: (code) => scanScript(code, reference, language),
    async simulate(code, model, limits) {
      try {
        // P-N4：準備（解析）段階にも実行と同じ時間上限を適用する。
        const deadline =
          performance.now() + (limits?.milliseconds ?? LIMITS.milliseconds);
        let { nodes, classes } = parse(code, language, deadline);
        // R31-N12：モデルが null／undefined の場合は共有実行系の初期化が
        // モデル参照でホスト例外になり汎用文言へ落ちるため、initialize の
        // 形状検証と同じモデル側の原因でここで停止する。
        if (model === null || model === undefined)
          return sourceFailure(
            new PracticeError("モデルに intBits が必要です", 1, "エラー"),
          );
        function netParts(av, isFloat) {
          let s;
          if (isFloat) {
            s = av.toExponential(8);
            for (let p = 1; p <= 9; p++) {
              const cand = av.toExponential(p - 1);
              if (Math.fround(Number(cand)) === av) {
                s = cand;
                break;
              }
            }
          } else s = av.toExponential();
          const [m, e] = s.split("e");
          return {
            digits: m.replace(".", "").replace(/0+$/, "") || "0",
            exp: parseInt(e, 10),
          };
        }
        function netFormat(v, isFloat) {
          if (Number.isNaN(v)) return "NaN";
          if (!Number.isFinite(v)) return v > 0 ? "Infinity" : "-Infinity";
          if (v === 0) return Object.is(v, -0) ? "-0" : "0";
          const neg = v < 0 ? "-" : "",
            { digits, exp } = netParts(Math.abs(v), isFloat);
          if (exp >= (isFloat ? 7 : 15) || exp <= -5) {
            const mant =
              digits.length > 1 ? digits[0] + "." + digits.slice(1) : digits;
            return `${neg}${mant}E${exp >= 0 ? "+" : "-"}${String(Math.abs(exp)).padStart(2, "0")}`;
          }
          if (exp >= 0) {
            if (digits.length <= exp + 1)
              return neg + digits + "0".repeat(exp + 1 - digits.length);
            return (
              neg + digits.slice(0, exp + 1) + "." + digits.slice(exp + 1)
            );
          }
          return neg + "0." + "0".repeat(-exp - 1) + digits;
        }
        function csDoubleText(v) {
          return netFormat(v, false);
        }
        function csFloatText(v) {
          return netFormat(v, true);
        }
        function cppGText(v) {
          if (Number.isNaN(v)) return "nan";
          if (!Number.isFinite(v)) return v > 0 ? "inf" : "-inf";
          if (v === 0) return Object.is(v, -0) ? "-0" : "0";
          const neg = v < 0 ? "-" : "",
            av = Math.abs(v),
            exp = Math.floor(Math.log10(av));
          if (exp < -4 || exp >= 6) {
            let [mant, e] = av.toExponential(5).split("e");
            mant = mant.replace(/\.?0+$/, "");
            const ev = parseInt(e, 10);
            return `${neg}${mant}e${ev >= 0 ? "+" : "-"}${String(Math.abs(ev)).padStart(2, "0")}`;
          }
          let s = av.toPrecision(6);
          if (s.includes(".")) s = s.replace(/\.?0+$/, "");
          return neg + s;
        }
        function csNumText(v, type) {
          return type === "float" ? csFloatText(v) : csDoubleText(v);
        }
        // D8 根因：printf %f は常に固定小数表記だが、JS の toFixed は
        // |値| >= 1e21 で指数表記へフォールバックする。その範囲の
        // double は整数値なので、BigInt 経由で正確な10進桁を出す。
        function formatFixed6(v) {
          if (Math.abs(v) < 1e21) return v.toFixed(6);
          return (v < 0 ? "-" : "") + BigInt(Math.abs(v)).toString() + ".000000";
        }
        // D13 根因：関数引数の評価順は未規定（C／C++）であり、同じ
        // 変数への副作用（++／--／代入）と別の読み取りが1回の呼び出し
        // の引数に混在すると未定義動作。左から右への確定値を捏造せず
        // 停止する。C# は評価順が規定されているため対象外。cout の
        // << 連鎖は C++17 で左から右へ順序付けられるため対象外とし、
        // printf の引数だけを検査する。
        function checkUnsequencedArgs(argNodes, node, api) {
          const mods = new Map(),
            reads = new Map();
          const bump = (m, name) => m.set(name, (m.get(name) || 0) + 1);
          const rootName = (t) =>
            t?.k === "var" ? t.name : t?.k === "index" || t?.k === "member" ? rootName(t.target) : null;
          const walk = (n, asModTarget) => {
            if (!n || typeof n !== "object") return;
            if (Array.isArray(n)) return n.forEach((c) => walk(c, asModTarget));
            if (n.k === "pre" || n.k === "post") {
              const rn = rootName(n.target);
              if (rn) bump(mods, rn);
              if (n.target?.k !== "var") walk(n.target, true);
              return;
            }
            if (n.k === "assign") {
              const rn = rootName(n.target);
              if (rn) bump(mods, rn);
              if (n.target?.k !== "var") walk(n.target, true);
              walk(n.value, false);
              return;
            }
            if (n.k === "var") {
              if (!asModTarget) bump(reads, n.name);
              return;
            }
            for (const key of Object.keys(n))
              if (!["line", "refs"].includes(key)) walk(n[key], false);
          };
          for (const a of argNodes) walk(a, false);
          for (const [name, count] of mods)
            if (count > 1 || reads.has(name))
              api.fail(
                `引数の評価順が未規定なため、変数 ${name} への副作用と読み取り（または複数の副作用）が同じ呼び出しの中で競合します`,
                node,
                "未定義動作",
              );
        }
        // R28-N23 根因：最終状態グループ（モデルメモリ）の表示は、生の
        // 数値をそのまま formatValue（JSON 整形）へ渡すため、非有限数が
        // JS 式表記（"Infinity"／"NaN"）になり、C／C++ の言語別表記
        // （inf／-inf／nan）で統一された出力・vars・model.memory の
        // スナップショットと一致しなかった。表示専用に、非有限数だけを
        // スナップショットと同じ文字列表現へ置き換える（実行中の値や
        // model.memory の生値は変えない）。
        function displayNonFinite(v) {
          if (typeof v === "number")
            return Number.isFinite(v)
              ? v
              : managed
                ? String(v)
                : Number.isNaN(v)
                  ? "nan"
                  : v > 0
                    ? "inf"
                    : "-inf";
          if (Array.isArray(v)) return v.map((x) => displayNonFinite(x));
          if (
            v &&
            typeof v === "object" &&
            !v.kind &&
            !v.__class
          ) {
            const o = {};
            for (const k of Object.keys(v)) o[k] = displayNonFinite(v[k]);
            return o;
          }
          return v;
        }
        function transformDisplay(v) {
          if (typeof v === "boolean")
            return managed ? (v ? "True" : "False") : v;
          if (typeof v === "number" && Object.is(v, -0)) return "-0";
          // === 高度モード ブロックB5（C#）表示修正（ここから） ===
          // __adv 値（DateTime／TimeSpan／List／HashSet）は内部表現の
          // まま表示せず、C# の ToString 形にする。配列要素マップより
          // 前に置く（List／HashSet は配列として保持されるため）。
          // managed 限定で、対象外は null が返り従来経路に落ちる。
          if (managed && v && typeof v === "object" && v.__adv) {
            const advText = advancedValueText(v);
            if (advText !== null) return advText;
          }
          // === 高度モード ブロックB5（C#）表示修正（ここまで） ===
          if (Array.isArray(v)) return v.map((x) => transformDisplay(x));
          if (language === "cpp" && v && typeof v === "object") {
            if (v.__pair)
              return {
                first: transformDisplay(v.first),
                second: transformDisplay(v.second),
              };
            if (v.kind === "cpp-iterator")
              return v.singular
                ? "イテレータ（未初期化）"
                : `イテレータ（位置 ${v.pos}）`;
          }
          if (v && typeof v === "object" && v.__class) {
            const o = { ...v };
            for (const k of Object.keys(o)) o[k] = transformDisplay(o[k]);
            return o;
          }
          return v;
        }
        function fmtFor(v, type) {
          if (
            typeof v === "number" &&
            (type === "double" || type === "float")
          )
            return managed ? csNumText(v, type) : cppGText(v);
          return formatValue(transformDisplay(v));
        }
        // R29-N21 根因：配列の ToString（型名表示）が、宣言した要素型
        // ではなく保持した要素値の JS 型から導出されていたため、byte／
        // sbyte／short／ushort／uint／ulong の配列や矩形・ジャグが全て
        // "System.Double[]" になっていた。型名は宣言型（csTypeStrOf／
        // 型ヒント）から要素型＋形（[]／[,]／[][]）で組み立てる。
        // 導出できない場合だけ従来の値ベース推定へ落とす。
        const CS_SYSTEM_NAMES = {
          int: "Int32", long: "Int64", double: "Double", float: "Single",
          bool: "Boolean", char: "Char", string: "String", byte: "Byte",
          sbyte: "SByte", short: "Int16", ushort: "UInt16", uint: "UInt32",
          ulong: "UInt64",
        };
        // === 高度モード ブロックB5（C#）修正2A：型推論テーブル（ここから） ===
        // CS-F11：高度メソッドの戻り型。advanced-engine.js の実装が
        // char／short／sbyte を返す呼び出し（エイリアス形・CLR 名形の
        // 両方）について、typeOf が int と誤推論して型付き変数への
        // 代入が CS0266 にならないよう、正しい型を返す。
        // char[] を返す String.ToCharArray はレシーバ依存のため
        // typeOf 側の構造判定で扱う。
        const CS_B5_CALL_RETURN_TYPES = {
          "Char.Parse": "char", "char.Parse": "char",
          "Char.ToLower": "char", "char.ToLower": "char",
          "Char.ToUpper": "char", "char.ToUpper": "char",
          "Char.ToLowerInvariant": "char", "char.ToLowerInvariant": "char",
          "Char.ToUpperInvariant": "char", "char.ToUpperInvariant": "char",
          "Convert.ToChar": "char",
          "Convert.ToInt16": "short",
          "Convert.ToSByte": "sbyte",
          "SByte.Parse": "sbyte", "sbyte.Parse": "sbyte",
          "Int16.Parse": "short", "short.Parse": "short",
        };
        // CS-F02 随伴：静的定数メンバーの型。MaxValue／MinValue 等の
        // 値の型をレシーバ型名（エイリアス形・CLR 名形）から返す
        // （従来は一律 int で、float／double 定数の表示と代入検査が
        // 実型とずれていた）。
        const CS_B5_MEMBER_TYPES = {
          "int.MaxValue": "int", "int.MinValue": "int",
          "Int32.MaxValue": "int", "Int32.MinValue": "int",
          "long.MaxValue": "long", "long.MinValue": "long",
          "Int64.MaxValue": "long", "Int64.MinValue": "long",
          "short.MaxValue": "short", "short.MinValue": "short",
          "Int16.MaxValue": "short", "Int16.MinValue": "short",
          "ushort.MaxValue": "ushort", "ushort.MinValue": "ushort",
          "UInt16.MaxValue": "ushort", "UInt16.MinValue": "ushort",
          "uint.MaxValue": "uint", "uint.MinValue": "uint",
          "UInt32.MaxValue": "uint", "UInt32.MinValue": "uint",
          "ulong.MaxValue": "ulong", "ulong.MinValue": "ulong",
          "UInt64.MaxValue": "ulong", "UInt64.MinValue": "ulong",
          "byte.MaxValue": "byte", "byte.MinValue": "byte",
          "Byte.MaxValue": "byte", "Byte.MinValue": "byte",
          "sbyte.MaxValue": "sbyte", "sbyte.MinValue": "sbyte",
          "SByte.MaxValue": "sbyte", "SByte.MinValue": "sbyte",
          "char.MaxValue": "char", "char.MinValue": "char",
          "Char.MaxValue": "char", "Char.MinValue": "char",
          "float.MaxValue": "float", "float.MinValue": "float",
          "Single.MaxValue": "float", "Single.MinValue": "float",
          "double.MaxValue": "double", "double.MinValue": "double",
          "Double.MaxValue": "double", "Double.MinValue": "double",
          "bool.TrueString": "string", "bool.FalseString": "string",
          "Boolean.TrueString": "string", "Boolean.FalseString": "string",
          "string.Empty": "string", "String.Empty": "string",
        };
        // === 高度モード ブロックB5（C#）修正2A：型推論テーブル（ここまで） ===
        function csArrayTypeName(node, value, s, typeHint) {
          for (const cand of [node ? csTypeStrOf(node, s) : null, typeHint]) {
            const p = cand ? csParseTypeStr(cand) : null;
            if (p?.suffix) {
              const sys = CS_SYSTEM_NAMES[p.elem];
              return (sys ? "System." + sys : p.elem) + p.suffix;
            }
          }
          // === 高度モード ブロックB5（C#）修正2A：表示側（ここから） ===
          // CS-F05：高度側が生成した配列に要素型タグ __elemSys
          // （非列挙プロパティ、例 "Int32"）がある場合は、値ベース
          // 推定（整数要素→Double の誤判定）より優先して使う。
          if (
            managed &&
            Array.isArray(value) &&
            typeof value.__elemSys === "string" &&
            value.__elemSys
          )
            return "System." + value.__elemSys + "[]";
          // === 高度モード ブロックB5（C#）修正2A：表示側（ここまで） ===
          let depth = 0,
            cur = value;
          while (Array.isArray(cur)) {
            depth++;
            cur = cur[0];
          }
          if (!depth) return null;
          const elemName =
            typeof cur === "string"
              ? "String"
              : typeof cur === "boolean"
                ? "Boolean"
                : typeof cur === "number"
                  ? "Double"
                  : "Int32";
          return "System." + elemName + "[]".repeat(depth);
        }
        function csArrayShape(node, s, typeHint) {
          for (const cand of [node ? csTypeStrOf(node, s) : null, typeHint]) {
            const p = cand ? csParseTypeStr(cand) : null;
            if (p?.suffix) return p;
          }
          return null;
        }
        function csConcatText(v, type, node, s) {
          // === 高度モード ブロックB5（C#）表示修正（ここから） ===
          // __adv 値（DateTime／TimeSpan／List／HashSet）の連結・補間は
          // C# の ToString 形にする（従来は String(v) の
          // "[object Object]" や配列型名の誤導出になっていた）。
          // csConcatText は managed の文字列連結経路からだけ呼ばれる。
          if (managed && v && typeof v === "object" && v.__adv) {
            const advText = advancedValueText(v);
            if (advText !== null) return advText;
          }
          // === 高度モード ブロックB5（C#）表示修正（ここまで） ===
          // R29-N22 根因：文字列連結・補間の中の配列は、実物では
          // ToString（型名）になる。JS の String(配列)（要素のカンマ
          // 連結）で代用していたため "v=1,2,3" になっていた。
          if (Array.isArray(v))
            return csArrayTypeName(node, v, s, type) ?? String(v);
          if (v === null || v === undefined) return "";
          if (typeof v === "boolean") return v ? "True" : "False";
          if (typeof v === "number")
            return type === "double" || type === "float" || !Number.isInteger(v)
              ? csNumText(v, type === "float" ? "float" : "double")
              : String(v);
          return String(v);
        }
        // D7 根因：std::cin >> x はシフト演算として評価されるだけで、
        // 抽出先の変数が旧値を保持したまま確定値として表示されていた
        // （値の捏造）。モデルの入力は未確定であるため、抽出先は
        // std::getline と同じく未確定値になるのが正直な扱い。
        function isCinChain(node) {
          if (!node) return false;
          if (node.k === "var" && node.name === "cin") return true;
          return node.k === "binary" && node.op === ">>" && isCinChain(node.a);
        }
        function extractFromCin(node, s, api) {
          if (node.a?.k === "binary") extractFromCin(node.a, s, api);
          const target = node.b;
          if (target && ["var", "index", "member"].includes(target.k))
            api.write(target, api.freshUnknown("標準入力", s), s, node);
        }
        // R29-N20／N21 根因：C# の配列の「形」（要素型と添字の形）は
        // 値（入れ子配列）からは復元できないため、宣言型の文字列から
        // 導出する。型文字列 "int[,]"／"int[][]"／"byte[]" を
        // { elem, suffix } に分解し、式ノードから結果型の文字列を
        // 再構成する（変数・添字・new 式・キャストだけが対象で、
        // 導出できない形は null を返し、従来の経路に委ねる）。
        function csParseTypeStr(str) {
          if (typeof str !== "string") return null;
          const m = str.match(/^([A-Za-z_][\w.]*?)(\[.*\])$/);
          if (!m) return { elem: str, suffix: null };
          return { elem: m[1], suffix: m[2] };
        }
        function csTypeStrOf(node, s) {
          if (!node || typeof node !== "object") return null;
          if (node.k === "var") return s.types[node.name] ?? null;
          if (node.k === "index") {
            const t = csTypeStrOf(node.target, s);
            if (!t) return null;
            if (t === "string")
              return node.indexes.length === 1 ? "char" : null;
            const p = csParseTypeStr(t);
            if (!p?.suffix) return null;
            if (/^\[,+\]$/.test(p.suffix)) {
              const rank = p.suffix.split(",").length;
              return node.indexes.length === rank ? p.elem : null;
            }
            if (/^(\[\])+$/.test(p.suffix)) {
              if (node.indexes.length !== 1) return null;
              const groups = p.suffix.length / 2;
              return groups === 1 ? p.elem : p.elem + "[]".repeat(groups - 1);
            }
            return null;
          }
          if (node.k === "construct")
            return node.name?.includes("[") ? node.name : (node.name ?? null);
          if (node.k === "array" && node.elemType)
            return node.elemType + "[]";
          if (node.k === "cast") return node.type;
          if (node.k === "literal" && typeof node.value === "string")
            return node.quote === "'" ? "char" : "string";
          return null;
        }
        // R29-N20：添字の個数が対象の形と一致しなければ CS0022
        // （dotnet 実測：矩形への a[0]／a[0][1]、ジャグ・1次元への
        // a[0,1] は全て CS0022）。形を導出できない対象は対象外。
        function csCheckIndex(node, s, api, errNode) {
          const targetStr = csTypeStrOf(node.target, s);
          if (!targetStr) return;
          const fail = (expected) =>
            api.fail(
              `インデックスの数が正しくありません：${targetStr} には ${expected} 個のインデックスが必要です（CS0022）`,
              errNode || node,
              "CompileError",
            );
          if (targetStr === "string") {
            if (node.indexes.length !== 1) fail(1);
            return;
          }
          const p = csParseTypeStr(targetStr);
          if (!p?.suffix) return;
          if (/^\[,+\]$/.test(p.suffix)) {
            const rank = p.suffix.split(",").length;
            if (node.indexes.length !== rank) fail(rank);
            return;
          }
          if (/^(\[\])+$/.test(p.suffix) && node.indexes.length !== 1)
            fail(1);
        }
        function typeOf(a, s) {
          if (!a) return "int";
          if (a.k === "cast" || a.k === "type") return a.type;
          // RG-356：カンマ式の型は右辺の型。
          if (a.k === "comma") return typeOf(a.b, s);
          if (a.k === "post" || a.k === "pre") return typeOf(a.target, s);
          if (a.k === "call") {
            // D4 受け皿：abs の結果型は引数型と変換規則で決まる。C では
            // 引数が int へ変換されるため常に int、C++ では double
            // オーバーロードが選ばれるため引数型のまま。
            const nm = callName(a.target);
            // B8: コンテナ・イテレータ関連の呼び出しの結果型。
            if (language === "cpp") {
              const ct = cppCallType(a, s);
              if (ct) return ct;
            }
            if (nm === "abs") {
              const at = a.args?.length ? typeOf(a.args[0], s) : "int";
              if (["float", "double"].includes(at))
                return !managed && language === "cpp" ? at : "int";
              return "int";
            }
            // B8（cpp-engine-a）：C++ スカラー関数と std::string メンバの
            // 結果型。printf の型照合・cout の表示・整数／浮動小数点の
            // 演算規則がこの型で決まるため、実物の戻り型に合わせる。
            if (language === "cpp") {
              const base = nm.includes(".") ? nm.slice(nm.lastIndexOf(".") + 1) : nm;
              const memberTarget = a.target?.k === "member" ? a.target.target : null;
              if (memberTarget && typeOf(memberTarget, s) === "string") {
                if (["substr", "assign", "append", "insert", "replace", "erase"].includes(base)) return "string";
                if (["at", "front", "back"].includes(base)) return "char";
                if (["empty", "starts_with", "ends_with", "contains"].includes(base)) return "bool";
                return "int";
              }
              if (!nm.includes(".")) {
                if (["sqrt", "pow", "fmod", "remainder", "exp", "exp2", "log", "log2", "log10", "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "sinh", "cosh", "tanh", "asinh", "acosh", "atanh", "cbrt", "hypot", "fmin", "fmax", "fdim", "fabs", "copysign", "ldexp", "scalbn", "scalbln", "logb", "nextafter", "nexttoward", "round", "trunc", "floor", "ceil", "rint", "nearbyint", "atof", "strtod", "stod", "nan"].includes(base)) return "double";
                if (base === "stof" || base === "strtof") return "float";
                if (["isnan", "isinf", "isfinite", "isnormal", "signbit", "isgreater", "isgreaterequal", "isless", "islessequal", "islessgreater", "isunordered", "has_single_bit", "isalpha", "isdigit", "isalnum", "isspace", "isupper", "islower", "ispunct", "isxdigit", "iscntrl", "isprint", "isgraph"].includes(base)) return "bool";
                if (base === "to_string") return "string";
                if (base === "div") return "div_t";
                if (base === "ldiv") return "ldiv_t";
                if (base === "lldiv") return "lldiv_t";
                if (["stol", "stoll", "atol", "atoll", "strtol", "strtoll", "labs", "llabs", "lround", "llround", "lrint", "llrint"].includes(base)) return "long";
                if (["stoul", "stoull", "strtoul", "strtoull"].includes(base)) return "unsigned long";
                if (["bit_ceil", "bit_floor", "bit_width", "countl_zero", "countl_one", "countr_zero", "countr_one", "popcount", "rotl", "rotr", "byteswap"].includes(base))
                  return a.args?.length ? typeOf(a.args[0], s) : "int";
              }
            }
            if (nm === "Console.ReadLine") return "string";
            // R7-168（修正バッチ13）：checked／unchecked 式の結果型は
            // 中の式の型そのもの。int と決め打ちすると checked(x)/2
            // （x は double）が整数除算に化けた（dotnet 実測は 2.5）。
            if (
              managed &&
              ["checked", "unchecked"].includes(nm) &&
              a.args?.length === 1
            )
              return typeOf(a.args[0], s);
            // 高度モード（ブロックB6）：ライブラリ拡張が戻り型を
            // 宣言する関数（sqrt 等）はその型を返す。宣言が無い
            // 呼び出しは従来どおり int とみなす。
            if (libraryReturnType) {
              const lt = libraryReturnType(
                nm,
                (a.args || []).map((x) => typeOf(x, s)),
              );
              if (lt) return lt;
            }
            // === 高度モード ブロックB5（C#）修正2A（ここから） ===
            // CS-F11：高度メソッドの戻り型（char／short／sbyte）は
            // テーブルから、String.ToCharArray の char[] はメソッド名の
            // 構造判定から返す（レシーバは文字列式のため名前では
            // 決まらない）。
            if (managed) {
              const advRetB5 = CS_B5_CALL_RETURN_TYPES[nm];
              if (advRetB5) return advRetB5;
              if (a.target?.k === "member" && a.target.name === "ToCharArray")
                return "char[]";
            }
            // === 高度モード ブロックB5（C#）修正2A（ここまで） ===
            return "int";
          }
          if (a.k === "ternary") {
            // D9 根因：三項演算子の結果型は両分岐の通常の算術変換で
            // 統一される。第2被演算子の型だけを返すと int／double
            // 混合で printf の型検査が虚偽の不一致になる。
            const lt = typeOf(a.then, s),
              rt = typeOf(a.els, s);
            if (lt === rt) return lt;
            if ([lt, rt].includes("string")) return "string";
            if (lt.endsWith("*") || rt.endsWith("*") || lt.endsWith("[]") || rt.endsWith("[]")) return lt;
            return arithmeticType(lt, rt, s);
          }
          if (a.k === "assign") return typeOf(a.value, s);
          if (a.k === "literal") {
            if (/^0[xXbBoO]/.test(a.raw || ""))
              return Math.abs(a.value) > 2147483647 ? "long" : "int";
            if (/[fF]$/.test(a.raw || "")) return "float";
            if (typeof a.value === "boolean") return language === "c" ? "int" : "bool";
            return typeof a.value === "string"
              ? (managed ? (a.quote === "'" && a.value.length === 1 ? "char" : "string") : a.quote === "'" ? (language === "c" ? "int" : "char") : "char[]")
              : /[.eEfF]/.test(a.raw || "")
                ? "double"
                : a.raw?.endsWith("L") || Math.abs(a.value) > 2147483647
                  ? "long"
                  : "int";
          }
          if (language === "cpp" && a.k === "member" && a.target?.k === "var" && a.target.name === "numbers") return "double";
          if (language === "cpp" && a.k === "member" && a.target?.k === "var" && a.target.name === "string" && a.name === "npos") return "unsigned long";
          if (managed && a.k === "member") {
            // === 高度モード ブロックB5（C#）修正2A（ここから） ===
            // CS-F02 随伴：静的定数メンバーはレジストリの型を返す。
            const memberTypeB5 = CS_B5_MEMBER_TYPES[callName(a)];
            if (memberTypeB5) return memberTypeB5;
            // === 高度モード ブロックB5（C#）修正2A（ここまで） ===
            return classes[typeOf(a.target, s)]?.[a.name]?.type || "int";
          }
          // B8: pair の first／second、イテレータ経由の pair メンバの型。
          if (language === "cpp" && a.k === "member") {
            const sp = parseCppTypeText(typeOf(a.target, s));
            if (sp?.kind === "pair")
              return a.name === "first" ? sp.t1.text : a.name === "second" ? sp.t2.text : "int";
            if (sp?.kind === "iterator") {
              const esp = parseCppTypeText(sp.elem);
              if (esp?.kind === "pair")
                return a.name === "first" ? esp.t1.text : a.name === "second" ? esp.t2.text : "int";
            }
          }
          if (a.k === "var") return s.types[a.name] || s.loopVarTypes?.[a.name] || (["true", "false"].includes(a.name) && language !== "c" ? "bool" : "int");
          if (a.k === "binary") {
            if (["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(a.op)) return language === "c" ? "int" : "bool";
            let l = typeOf(a.a, s),
              r = typeOf(a.b, s);
            // B8: イテレータ ± 整数の結果型はイテレータ型そのもの。
            if (language === "cpp" && (a.op === "+" || a.op === "-")) {
              const lsp = parseCppTypeText(l),
                rsp = parseCppTypeText(r);
              if (lsp?.kind === "iterator" && rsp?.kind !== "iterator") return l;
              if (rsp?.kind === "iterator" && a.op === "+") return r;
            }
            if (language === "cpp" && a.op === "+" && [l, r].includes("string")) return "string";
            // R22-N22（RG-05 別表面）：C# では string との + は連結であり、
            // 結果型は string。左結合チェーン（"x" + 1 + 2）でも後続の + が
            // 連結として扱えるよう、内側の連結結果の型を string として伝える。
            if (managed && a.op === "+" && [l, r].includes("string")) return "string";
            return arithmeticType(l, r, s);
          }
          if (a.k === "construct" && a.name?.includes("["))
            return a.name;
          // R30-N31：std::string({...}) の結果型は std::string。
          if (a.k === "array" && a.stringInitList) return "string";
          if (a.k === "array" && a.elemType) return a.elemType + "[]";
          if (a.k === "index") {
            // R29-N21：ジャグ配列の行など、添字の結果が配列になる形は
            // 要素型ではなく配列型として伝える（表示・連結の型名導出用）。
            if (managed) {
              const ts = csTypeStrOf(a, s);
              if (ts && ts.includes("[")) return ts;
            }
            // R28-N19：多次元配列への部分添字（a[1] で行を取り出す形）
            // の結果型は要素型の配列。完全添字は従来どおり要素型。
            if (!managed) {
              let chainLen = 0,
                curT = a;
              while (curT?.k === "index") {
                chainLen++;
                curT = curT.target;
              }
              if (curT?.k === "var") {
                const memT = s.model.memory[s.addresses?.[curT.name]];
                if (memT?.dims && chainLen < memT.dims.length)
                  return (memT.type || "int") + "[]";
              }
            }
            // RG-376（R33 §4）：従来は対象変数の宣言型から []／* を
            // 一律に剥がして要素型としており、string[] の要素まで
            // 「string 変数の要素＝char」と誤判定していた（a[0] の
            // 型が char になり、cout が String.fromCharCode("ab")＝
            // "\u0000" を出し、文字列演算が型不一致で停止した）。
            // 連鎖添字（a[0][0]）では callName が空になり int に
            // 化けていた。非 managed では対象式の型を再帰的に辿り、
            // 配列／ポインタ型からは1段だけ剥がし、string 型からは
            // char を返すのが要素型の正しい導出である。managed は
            // csTypeStrOf と従来経路をそのまま使う。
            if (!managed) {
              const tt = typeOf(a.target, s);
              // B8: コンテナ／イテレータへの添字は要素型。
              if (language === "cpp") {
                const sp = parseCppTypeText(tt);
                if (sp && (["vector", "array"].includes(sp.kind) || sp.kind === "iterator"))
                  return sp.kind === "iterator" ? sp.elem : sp.elem.text;
              }
              if (tt === "string") return "char";
              if (tt.endsWith("[]")) return tt.slice(0, -2) || "int";
              if (tt.endsWith("*")) return tt.slice(0, -1) || "int";
              return tt || "int";
            }
            const targetType = s.types[callName(a.target)]?.replace(/\[\]|\*/g, "");
            if (targetType === "string") return "char";
            return targetType || "int";
          }
          if (a.k === "unary") {
            if (a.op === "sizeof") return (s.model.longBits || 64) === 64 ? "unsigned long" : "unsigned int";
            if (a.op === "!") return language === "c" ? "int" : "bool";
            if (a.op === "&") return typeOf(a.arg, s) + "*";
            if (a.op === "*") {
              // D10 根因：配列名の逆参照では要素型が結果型になる。
              // "int[]" の末尾の "*" だけを剥がす旧実装では配列型が
              // そのまま残り、printf の型検査が虚偽の不一致になった。
              const t = typeOf(a.arg, s);
              // B8: イテレータの逆参照は要素型。
              if (language === "cpp") {
                const sp = parseCppTypeText(t);
                if (sp?.kind === "iterator") return sp.elem;
              }
              if (t.endsWith("[]")) return t.slice(0, -2);
              return t.replace(/\*$/, "");
            }
            if (
              managed &&
              a.op === "-" &&
              a.arg.k === "literal" &&
              a.arg.value === 2147483648
            )
              return "int";
            return typeOf(a.arg, s);
          }
          return "int";
        }
        function arithmeticType(l, r, s) {
          if ([l,r].includes("double")) return "double";
          if ([l,r].includes("float")) return "float";
          if (managed) {
            // D3 根因の一部：C# の符号なし型名（uint 等）は "unsigned"
            // で始まらないため、従来は符号付き int として扱われ、
            // uint 同士の演算まで int の範囲で折り返されていた。
            // C# の二項数値昇格：小さい整数型は int へ、uint と int の
            // 混合は long へ、uint 同士は uint のまま。
            const promote = (t) =>
              ["byte", "sbyte", "short", "ushort", "char"].includes(t) ? "int" : t;
            l = promote(l);
            r = promote(r);
            if ([l, r].includes("ulong")) return "ulong";
            if ([l, r].includes("long")) return "long";
            if ([l, r].includes("uint")) return [l, r].includes("int") ? "long" : "uint";
            return "int";
          }
          l = /char|short|bool/.test(l) ? "int" : l;
          r = /char|short|bool/.test(r) ? "int" : r;
          const hasLong = l.includes("long") || r.includes("long"), unsigned = l.startsWith("unsigned") || r.startsWith("unsigned");
          if (!unsigned) return hasLong ? "long" : "int";
          if ([l,r].includes("unsigned long")) return "unsigned long";
          if (hasLong) return (s.model.longBits || 64) > 32 ? "long" : "unsigned long";
          return "unsigned int";
        }
        function width(type, s) {
          const t = String(type || "int");
          if (t.includes("long")) return managed ? 64 : s.model.longBits || 64;
          if (t.includes("short")) return 16;
          if (t === "byte" || t === "sbyte") return 8;
          // NX-N6 根因の一部：複合型名 "unsigned char"／"signed char" が
          // t === "char" に一致せず32ビットと誤判定されていた（本来8ビット）。
          if (!managed && ["char", "unsigned char", "signed char"].includes(t))
            return 8;
          return t === "char" && !managed ? 8 : 32;
        }
        // A6監査CF-03：要素型のバイト幅（LP64 モデル）。width() は整数の
        // ビット幅専用（double を32と数える）ため、メモリ範囲判定には
        // 使えない。判定できない型（構造体等）は 0 を返し、呼び出し側は
        // 従来の要素単位検査に倒す。
        function byteSizeOf(type) {
          if (!type) return 0;
          const t = String(type).trim();
          if (t.includes("*")) return 8;
          if (t.includes("long double")) return 16;
          if (t.includes("double")) return 8;
          if (t.includes("long")) return 8;
          if (t.includes("float")) return 4;
          if (t.includes("short")) return 2;
          if (t.includes("char")) return 1;
          if (t === "bool") return 1;
          if (t.includes("int")) return 4;
          return 0;
        }
        // ポインタ値の式が「指す先の型」を返す（ポインタでない式は null）。
        // 二項の +/- は typeOf が算術型へ畳んでしまうため、ポインタ側の
        // オペランドへ再帰して型を取り出す（*(p - 1) 等の形の要）。
        function pointeeTypeOf(node, s) {
          if (!node || typeof node !== "object") return null;
          if (node.k === "binary" && (node.op === "+" || node.op === "-"))
            return pointeeTypeOf(node.a, s) ?? pointeeTypeOf(node.b, s);
          if (node.k === "unary" && node.op === "*") {
            const inner = pointeeTypeOf(node.arg, s);
            if (!inner || !inner.includes("*")) return null;
            return inner.slice(0, inner.lastIndexOf("*")).trim() || null;
          }
          const t = typeOf(node, s);
          if (typeof t !== "string") return null;
          const x = t.trim();
          if (!x.includes("*")) return null;
          return x.slice(0, x.lastIndexOf("*")).trim() || null;
        }
        // アクセス式（添字／逆参照）から要素型を取り出す。ポインタ型は
        // 末尾の * を剥がして指す先の型にする。
        function elemTypeOf(node, s) {
          if (!node || typeof node !== "object") return null;
          if (node.k === "unary" && node.op === "*") return pointeeTypeOf(node.arg, s);
          if (node.k === "binary") return pointeeTypeOf(node, s);
          let t = typeOf(node, s);
          if (typeof t !== "string") return null;
          t = t.trim();
          if (t.endsWith("*")) t = t.slice(0, t.lastIndexOf("*")).trim();
          return t || null;
        }
        // D3 追随（修正バッチ2・追随班）：C# の定数式かどうかの構文判定。
        // リテラル、定数への単項 -／+／~、定数同士の二項演算、定数への
        // キャストだけを定数とみなし、変数・呼び出し・メンバー参照など
        // 実行時に決まる式は定数とみなさない（C# 仕様の constant_expression
        // §12.26 の部分集合）。暗黙の定数式変換（§10.2.11）は値が変換先の
        // 範囲内のときだけ許され、範囲外は CS0031 のコンパイルエラーに
        // なるため、単項マイナス経由（uint u = -1; 等）や定数同士の演算
        // （byte b = 100 + 200; 等）でもリテラル単体と同じく停止させる。
        function isConstantIntegerExpr(node) {
          if (!node || typeof node !== "object") return false;
          if (node.k === "literal") return typeof node.value === "number";
          if (node.k === "unary" && ["-", "+", "~"].includes(node.op))
            return isConstantIntegerExpr(node.arg);
          if (node.k === "binary")
            return (
              isConstantIntegerExpr(node.a) && isConstantIntegerExpr(node.b)
            );
          if (node.k === "cast") return isConstantIntegerExpr(node.arg);
          // checked(式)／unchecked(式) で包まれた定数も定数式のまま
          // （実 C# の unchecked では定数算術は折り返すが、このモデル
          // では定数式のオーバーフローを停止する制限として、unchecked
          // 項目の caution に明示している）。
          if (
            node.k === "call" &&
            ["checked", "unchecked"].includes(callName(node.target)) &&
            node.args?.length === 1
          )
            return isConstantIntegerExpr(node.args[0]);
          return false;
        }
        function cast(v, type, s, node, api) {
          // R7-95（修正バッチ13）：std::getline の戻り値は std::istream&
          // であり、読み取った文字列ではない。戻り値マーカーを変数へ
          // 初期化・代入する形は実 g++ でもコンパイルエラーになるため、
          // 変換先の型を問わず名指しで停止する（文として呼び出す正規形
          // は戻り値を破棄するため影響しない）。
          if (isUnknown(v) && String(v.id).startsWith("getline-result"))
            api.fail(
              `std::getline の戻り値（std::istream&）は ${type} へ変換できません（戻り値は読み取った文字列ではありません）`,
              node,
              "CompileError",
            );
          // R7-57（修正バッチ13）：C# の整数型同士の暗黙変換は、変換先が
          // 変換元の全ての値を表せる場合だけ存在する（int 変数→short は
          // CS0266）。従来は接尾辞定数だけを検査し、変数・実行時値は
          // 範囲内の値なら黙って受理していた。定数式は定数変換の規則
          // （範囲内なら可）が別に効くため対象外とし、複合代入は組み込み
          // のキャストバックがあるため対象外とする。浮動小数点が絡む
          // 既存の縮小検査はこの後の既存ブロックが従来の文面で担う。
          // 対象は符号付き系と char への変換だけに限る：符号なし型
          // （byte／ushort／uint／ulong）への実行時値の代入は、修正
          // バッチ2で確定したモデル規則（unchecked の折り返し。各符号
          // なし項目の caution に開示済み）を維持し、ここでは止めない。
          if (
            managed &&
            node?.value &&
            !(node.k === "assign" && node.op && node.op !== "=") &&
            !isConstantIntegerExpr(node.value)
          ) {
            const csIntegral = ["sbyte", "byte", "short", "ushort", "int", "uint", "long", "ulong", "char"];
            if (["sbyte", "short", "int", "long", "char"].includes(type)) {
              const srcT = typeOf(node.value, s);
              const implicitTargets = {
                sbyte: ["short", "int", "long"],
                byte: ["short", "ushort", "int", "uint", "long", "ulong"],
                short: ["int", "long"],
                ushort: ["int", "uint", "long", "ulong"],
                int: ["long"],
                uint: ["long", "ulong"],
                long: [],
                ulong: [],
                char: ["ushort", "int", "uint", "long", "ulong"],
              };
              if (
                csIntegral.includes(srcT) &&
                srcT !== type &&
                !implicitTargets[srcT].includes(type)
              )
                api.fail(
                  `${srcT} から ${type} への暗黙の変換はできません（CS0266：明示キャストが必要です）`,
                  node,
                  "CompileError",
                );
            }
          }
          if (isUnknown(v)) return v;
          if (type.endsWith("*")) {
            if (!isPtr(v) && v !== null)
              api.fail("ポインタ型が一致しません", node);
            return v;
          }
          if (classes[type]) {
            if (v !== null && v?.__class !== type)
              api.fail("参照型が一致しません", node);
            return v;
          }
          if (type === "string") {
            if (v !== null && typeof v !== "string" && !isUnknown(v)) {
              // RG-357（R32-N11）：C++ の std::string への代入形は、
              // char を受ける代入演算子（operator=(char)）があり、整数
              // 値も char への変換を経て1文字になる（g++ 13.3 実測：
              // s = 'x' は "x"、s = 65 は "A"、s = true は文字コード1）。
              // 代入形（assign ノード経由）だけ変換を実装する。初期化形
              // （declare ノード経由）は実 C++ でもコンパイルエラー
              // （char から std::string への変換コンストラクタが無い）
              // であり、代入形と区別できる文言で停止する。変換の範囲
              // 規則は char への cast と同じ経路に委ねる。
              if (
                language === "cpp" &&
                (typeof v === "number" || typeof v === "boolean")
              ) {
                if (node?.k === "assign") {
                  const code = cast(
                    typeof v === "boolean" ? Number(v) : v,
                    "char",
                    s,
                    node,
                    api,
                  );
                  return String.fromCharCode(
                    ((Math.trunc(code) % 256) + 256) % 256,
                  );
                }
                if (node?.k === "declare")
                  api.fail(
                    "std::string の初期化に char は使えません（char を受け取るコンストラクタがありません。宣言した後に代入してください）",
                    node,
                    "CompileError",
                  );
              }
              api.fail("文字列型が一致しません", node);
            }
            return v;
          }
          // B8（cpp-engine-a）：div 系の結果オブジェクトは数値変換を
          // 介さずそのまま保持する（.quot／.rem を持つ値）。
          if (
            language === "cpp" &&
            ["div_t", "ldiv_t", "lldiv_t"].includes(type) &&
            v &&
            typeof v === "object" &&
            "quot" in v &&
            "rem" in v
          )
            return v;
          if (type === "bool") {
            if (managed && typeof v !== "boolean")
              api.fail("bool型が必要です", node);
            return Boolean(v);
          }
          if (["auto", "var"].includes(type)) return v;
          // §3.3(b) 是正：接尾辞で型が決まる整数定数（u→uint、L→long、
          // ul→ulong。変換形 ((uint)200) や (uint)200 のような定数への
          // キャストも含む）には、C# の暗黙変換規則がそのまま効く。
          // uint 定数から byte／int 等への暗黙変換は存在せず、実 C# では
          // CS0266 のコンパイルエラーになる（dotnet 実測：byte b = 200u、
          // int n = 200u、byte b = 200L、long l = 200ul、uint u = 200L、
          // char c = 65u が全て CS0266。(uint)200 の代入も同じ）。
          // 接尾辞なしリテラルや変数・実行時値の変換は従来のモデル規則
          // （範囲チェック／折り返し）を維持し、ここでは対象にしない。
          if (
            managed &&
            node?.value &&
            !(
              node?.k === "assign" &&
              node?.op &&
              node.op !== "="
            ) &&
            [
              "int",
              "long",
              "short",
              "char",
              "uint",
              "ulong",
              "ushort",
              "byte",
              "sbyte",
            ].includes(type)
          ) {
            const suffixedType = (el) => {
              if (!el || typeof el !== "object") return null;
              if (
                el.k === "cast" &&
                ["uint", "ulong", "long"].includes(el.type) &&
                isConstantIntegerExpr(el.arg)
              )
                return el.type;
              if (el.k === "literal" && typeof el.value === "number")
                return /L$/.test(el.raw || "") ? "long" : null;
              if (el.k === "unary" && ["-", "+", "~"].includes(el.op))
                return suffixedType(el.arg);
              if (el.k === "binary") {
                const l = suffixedType(el.a),
                  r = suffixedType(el.b);
                if (!l && !r) return null;
                const plain = (x) =>
                  x?.k === "literal" && typeof x.value === "number"
                    ? "int"
                    : null;
                const lt = l || plain(el.a),
                  rt = r || plain(el.b);
                return lt && rt ? arithmeticType(lt, rt, s) : null;
              }
              return null;
            };
            const sct = suffixedType(node.value);
            if (sct) {
              const allowed = {
                uint: ["uint", "long", "ulong"],
                ulong: ["ulong"],
                long: ["long", "ulong"],
              }[sct];
              if (!allowed.includes(type))
                api.fail(
                  `${sct} から ${type} への暗黙の変換はできません（明示キャストが必要です）`,
                  node,
                  "CompileError",
                );
            }
          }
          if (managed && type === "char") {
            if (typeof v === "string" && v.length === 1) return v;
            if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 65535)
              return String.fromCharCode(v);
            api.fail("char型が一致しません", node, "CompileError");
          }
          if (managed && node?.value) {
            const srcType = typeOf(node.value, s);
            if (
              srcType === "char" &&
              typeof v === "string" &&
              v.length === 1 &&
              type !== "string"
            )
              v = v.charCodeAt(0);
            const integral = ["int", "long", "short", "char", "uint", "ulong", "ushort", "byte", "sbyte"].includes(type);
            if (
              integral &&
              (srcType === "double" || srcType === "float" || (srcType === "long" && ["int", "short", "char"].includes(type)) || (srcType === "double" && type === "float"))
            )
              api.fail(
                `${srcType} から ${type} への暗黙の縮小変換はできません（明示キャストが必要です）`,
                node,
                "CompileError",
              );
            if (type === "float" && srcType === "double")
              api.fail(
                "double から float への暗黙の縮小変換はできません（明示キャストが必要です）",
                node,
                "CompileError",
              );
          }
          if (!managed && typeof v === "boolean") v = Number(v);
          if (typeof v !== "number") api.fail("数値型が一致しません", node);
          if (["float", "double"].includes(type)) {
            const converted = type === "float" ? Math.fround(v) : v;
            if (!managed && Number.isFinite(v) && !Number.isFinite(converted)) api.fail("浮動小数点変換が型の範囲外です", node, "未定義動作");
            return converted;
          }
          let bits = width(type, s),
            value = Math.trunc(v);
          if (!managed && type === "char" && ["float", "double"].includes(typeOf(node.value, s)) && (value < -128 || value > 255)) api.fail("浮動小数点からcharへの変換が範囲外です", node, "未定義動作");
          if (!managed && type === "char" && (value < 0 || value > 127)) api.fail("charの範囲外変換は符号と処理系により異なります（未確認）", node, "環境依存");
          // NX-N6 根因：unsigned 型への変換にも符号付きの min／max を適用し、
          // 型に取り得ない値を返したり、規格で定義された折り返しを
          // 「処理系依存」と誤って停止したりしていた。unsigned への整数の
          // 変換は規格どおり 2^bits の剰余で折り返す。浮動小数点からの
          // 変換は、切り捨て後の値が表せない場合に限り従来どおり
          // 範囲外（未定義動作）として停止する。C# の unsigned 型は
          // reference にモデル制限として開示済みの範囲外停止を維持する。
          if (!managed && type.startsWith("unsigned")) {
            const fromFloat = ["float", "double"].includes(
              typeOf(node?.value, s),
            );
            if (fromFloat) {
              if (value < 0 || value > 2 ** bits - 1)
                api.fail(
                  "浮動小数点から整数への変換が範囲外です",
                  node,
                  "未定義動作",
                );
              if (!Number.isSafeInteger(value))
                api.fail(
                  "この64ビット整数は安全に計算できる範囲外です",
                  node,
                  "未確認",
                );
              return value;
            } else {
              if (!Number.isFinite(value))
                api.fail(
                  "この64ビット整数は安全に計算できる範囲外です",
                  node,
                  "未確認",
                );
              const wrapped = BigInt.asUintN(bits, BigInt(value));
              if (wrapped > BigInt(Number.MAX_SAFE_INTEGER))
                api.fail(
                  "この64ビット整数は安全に計算できる範囲外です",
                  node,
                  "未確認",
                );
              return Number(wrapped);
            }
          }
          // D3／SEM-3 根因：C# の符号なし型（byte／ushort／uint／ulong）
          // にも符号付きの min／max を適用していたため、正当な値
          // （byte 200、uint 4000000000 等）が虚偽の OverflowException
          // になり、逆に符号付き範囲内の負値（uint への -1 代入）が
          // 素通りして誤値になっていた。符号なし型の範囲は
          // 0〜2^bits-1 で、checked では範囲外を例外にし、既定の
          // unchecked では 2^bits の剰余で折り返す（実 C# の規則）。
          // ただし宣言時の整数リテラル定数が範囲外の場合は、実 C# でも
          // 定数変換エラーになるため折り返さず停止する。
          // D3 追随：リテラル単体だけでなく、単項マイナスや定数同士の
          // 演算を含む定数式（isConstantIntegerExpr）も同じ定数変換の
          // 対象にする。実行時に決まる式は従来どおり折り返す。
          if (managed && ["uint", "ulong", "ushort", "byte"].includes(type)) {
            const maxU = 2 ** bits - 1;
            if (value >= 0 && value <= maxU) {
              if (!Number.isSafeInteger(value))
                api.fail(
                  "この64ビット整数は安全に計算できる範囲外です",
                  node,
                  "未確認",
                );
              return value;
            }
            if (s.checked)
              api.fail("整数への変換が範囲外です", node, "OverflowException");
            // 複合代入（+= 等）では node.value は被演算子の一部でしか
            // なく、変換元の値は対象変数の実行時の値を含むため定数式
            // 変換の対象にしない（u += -1; の折り返しを誤って止めない）。
            if (
              !(
                node?.k === "assign" &&
                node?.op &&
                node.op !== "="
              ) &&
              isConstantIntegerExpr(node?.value)
            )
              api.fail("整数への変換が範囲外です", node, "OverflowException");
            const wrappedU = BigInt.asUintN(bits, BigInt(value));
            if (wrappedU > BigInt(Number.MAX_SAFE_INTEGER))
              api.fail(
                "この64ビット整数は安全に計算できる範囲外です",
                node,
                "未確認",
              );
            return Number(wrappedU);
          }
          let min = -(2 ** (bits - 1)),
            max = 2 ** (bits - 1) - 1;
          if (value < min || value > max) {
            api.fail(
              managed
                ? "整数への変換が範囲外です"
                : ["float", "double"].includes(typeOf(node.value, s)) ? "浮動小数点から整数への変換が範囲外です" : "整数への変換結果は処理系依存です",
              node,
              managed ? "OverflowException" : ["float", "double"].includes(typeOf(node.value, s)) ? "未定義動作" : "環境依存",
            );
          }
          if (!Number.isSafeInteger(value))
            api.fail(
              "この64ビット整数は安全に計算できる範囲外です",
              node,
              "未確認",
            );
          return value;
        }
        function allocate(s, name, values, type) {
          s.model.memory ??= {};
          let id = "object-" + (Object.keys(s.model.memory).length + 1);
          s.model.memory[id] = { name, type, alive: true, values };
          s.addresses ??= {};
          s.addresses[name] = id;
          return id;
        }
        function targetPointer(expr, s, api, node) {
          if (expr.k === "var") {
            let id = s.addresses?.[expr.name];
            if (!id) api.fail("アドレスがない変数です", node);
            return { kind: "pointer", object: id, offset: 0 };
          }
          if (expr.k === "index") {
            let target = api.read(expr.target, s),
              index = api.read(expr.indexes[0], s);
            // A6監査CF-02派生：NULL ポインタへの添字アクセスを名指しする
            if (!managed && target === null)
              api.fail("NULLポインタへのアクセスです", node, "未定義動作");
            if (!isPtr(target))
              api.fail("モデルポインタと整数添字が必要です", node);
            // R23-N5 書き込み側：小数の添字を「ポインタと整数添字が
            // 必要」という曖昧な理由でなく、添字の型として名指す。
            if (typeof index === "boolean") index = Number(index);
            if (!Number.isInteger(index))
              api.fail("添字は整数型でなければなりません", node, "CompileError");
            return { ...target, offset: target.offset + index };
          }
          if (expr.k === "unary" && expr.op === "*")
            return api.read(expr.arg, s);
          api.fail("このアドレス指定は未対応です", node);
        }
        function deref(ptr, s, api, node, elemType) {
          // A6監査CF-02派生：NULL ポインタの参照は汎用文言でなく名指しする
          if (!managed && ptr === null)
            api.fail("NULLポインタの参照です", node, "未定義動作");
          if (!isPtr(ptr) || !s.model.memory[ptr.object]?.alive)
            api.fail(
              managed
                ? "無効な参照です"
                : "無効または寿命の切れたポインタの参照",
              node,
              managed ? "NullReferenceException" : "未定義動作",
            );
          let mem = s.model.memory[ptr.object];
          // A6監査CF-03：ヒープ確保は char 型メモリにバイト数分の要素を
          // 置くため、要素幅の広い型でアクセスする場合は要素単位でなく
          // バイト単位で範囲を判定する（幅が広くないアクセスは従来どおり）。
          if (!managed && elemType) {
            const ew = byteSizeOf(elemType),
              mw = byteSizeOf(mem.type);
            if (ew > 0 && mw > 0 && ew > mw) {
              if (ptr.offset < 0 || (ptr.offset + 1) * ew > mem.values.length * mw)
                api.fail(
                  "配列の有効範囲外を読み書きしています",
                  node,
                  "未定義動作",
                );
              return mem;
            }
          }
          if (ptr.offset < 0 || ptr.offset >= mem.values.length)
            api.fail(
              "配列の有効範囲外を読み書きしています",
              node,
              managed ? "IndexOutOfRangeException" : "未定義動作",
            );
          return mem;
        }
        function cString(value, s, api, node) {
          if (typeof value === "string") return value;
          if (!isPtr(value)) api.fail("文字列へのポインタが必要です", node, "未定義動作");
          const mem = deref(value, s, api, node);
          if (mem.type !== "char") api.fail("char配列が必要です", node, "未定義動作");
          let text = "";
          for (let i = value.offset; i < mem.values.length; i++) {
            const c = mem.values[i];
            if (c === 0) return text;
            // R29-N23：ポインタから変換された未確定の文字に到達した
            // 場合は、未初期化と誤診せず未確認として停止する（終端の
            // ヌル文字より前にあれば、文字列の内容自体が確定しない）。
            if (isUnknown(c))
              api.fail(
                "確定できない文字（文字列リテラルから変換された値）が含まれています",
                node,
                "未確認",
              );
            if (typeof c !== "number") api.fail("未初期化の文字です", node, "未定義動作");
            text += String.fromCharCode(c);
          }
          api.fail("終端のヌル文字がない文字列の読み取り", node, "未定義動作");
        }
        // B8（cpp-engine-a）：C++ スカラー関数群（<cmath>／<cstdlib>／
        // <cctype>／<cstring>／std::stoi 系／std::to_string／<bit>）と
        // std::string メンバ関数の実行。language === "cpp" のときだけ
        // call から呼ばれる。担当外の名前（コンテナ／イテレータ／
        // <algorithm> 等）は null を返し、従来の停止に委ねる。
        function cppScalarCall(name, args, values, s, api, node) {
          const done = (value) => ({ handled: true, value });
          const fail = (msg, cat = "CompileError") => api.fail(msg, node, cat);
          const need = (counts) => {
            if (!counts.includes(args.length))
              fail(`引数の個数が合いません（${args.length}個は渡せません）`);
          };
          const asNum = (v, argNode) => {
            if (typeof v === "boolean") return Number(v);
            if (typeof v === "string" && v.length === 1 && typeOf(argNode, s) === "char") return v.charCodeAt(0);
            if (typeof v !== "number") fail("引数は数値でなければなりません");
            return v;
          };
          const idx = (v, argNode) => Math.trunc(asNum(v, argNode));
          const asText = (v, argNode) => {
            if (typeof v === "string") return v;
            if (isPtr(v)) return cString(v, s, api, node);
            if (typeof v === "number" && typeOf(argNode, s) === "char") return String.fromCharCode(v);
            fail("引数は文字列でなければなりません");
          };
          const asChar = (v, argNode) => {
            if (typeof v === "string" && v.length === 1) return v;
            if (typeof v === "number") return String.fromCharCode(v);
            if (typeof v === "boolean") return String.fromCharCode(Number(v));
            fail("引数は文字でなければなりません");
          };
          const rhe = (x) => {
            // 偶数への丸め（rint／nearbyint／remainder の商）。
            if (!Number.isFinite(x)) return x;
            const f = Math.floor(x), d = x - f;
            if (d > 0.5) return f + 1;
            if (d < 0.5) return f;
            return Math.abs(f) % 2 === 0 ? f : f + 1;
          };
          const roundAway = (x) => Math.sign(x) * Math.round(Math.abs(x));
          const parseIntPrefix = (text, base) => {
            let t = String(text).replace(/^\s+/, ""), sign = 1n;
            if (t.startsWith("+")) t = t.slice(1);
            else if (t.startsWith("-")) { sign = -1n; t = t.slice(1); }
            let b = base;
            if (b === 0) {
              if (/^0[xX]/.test(t)) { b = 16; t = t.slice(2); }
              else if (t.length > 1 && t.startsWith("0")) b = 8;
              else b = 10;
            } else if (b === 16 && /^0[xX]/.test(t)) t = t.slice(2);
            if (b < 2 || b > 36) return null;
            const digits = "0123456789abcdefghijklmnopqrstuvwxyz";
            let val = 0n, any = false;
            for (const ch of t) {
              const d = digits.indexOf(ch.toLowerCase());
              if (d < 0 || d >= b) break;
              val = val * BigInt(b) + BigInt(d);
              any = true;
            }
            return any ? sign * val : null;
          };
          const parseFloatPrefix = (text) => {
            const m = String(text).match(/^\s*[+-]?(?:inf(?:inity)?|nan|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/i);
            if (!m) return null;
            const t = m[0].trim().toLowerCase();
            if (/^[+-]?inf/.test(t)) return t.startsWith("-") ? -Infinity : Infinity;
            if (/^[+-]?nan/.test(t)) return NaN;
            return Number(m[0]);
          };
          const cmpText = (a, b) => {
            const n = Math.min(a.length, b.length);
            for (let i = 0; i < n; i++) {
              const d = a.charCodeAt(i) - b.charCodeAt(i);
              if (d) return d;
            }
            return a.length - b.length;
          };
          /* ---------- std::string メンバ ---------- */
          if (node?.target?.k === "member") {
            const targetNode = node.target.target;
            const method = name.slice(name.lastIndexOf(".") + 1);
            if (typeOf(targetNode, s) !== "string") return null;
            const cur = api.read(targetNode, s);
            if (isUnknown(cur)) return done(unknown(`未確定の文字列の ${method}`));
            if (typeof cur !== "string") return null;
            const MUTATING = ["assign", "append", "insert", "erase", "replace", "resize", "clear", "push_back", "pop_back", "swap", "reserve", "shrink_to_fit"];
            if (![...MUTATING, "size", "length", "empty", "at", "front", "back", "substr", "find", "rfind", "find_first_of", "find_first_not_of", "find_last_of", "find_last_not_of", "compare", "starts_with", "ends_with", "contains"].includes(method)) return null;
            if (values.some(isUnknown)) {
              if (MUTATING.includes(method))
                api.write(targetNode, api.freshUnknown("未確定の文字列", s), s, node);
              return done(unknown(`未確定の引数による ${method}`));
            }
            const setStr = (next) => { api.write(targetNode, next, s, node); return next; };
            const outOfRange = () => fail("添字／位置が文字列の範囲外です（std::out_of_range）", "std::out_of_range");
            const needleOf = (i) =>
              typeof values[i] === "number" || typeOf(args[i], s) === "char"
                ? asChar(values[i], args[i])
                : asText(values[i], args[i]);
            switch (method) {
              case "size": case "length": need([0]); return done(cur.length);
              case "empty": need([0]); return done(cur.length === 0);
              case "at": {
                need([1]);
                const p = idx(values[0], args[0]);
                if (p < 0 || p >= cur.length) outOfRange();
                return done(cur.charCodeAt(p));
              }
              case "front":
                need([0]);
                if (!cur.length) fail("空文字列への front() は未定義動作です", "未定義動作");
                return done(cur.charCodeAt(0));
              case "back":
                need([0]);
                if (!cur.length) fail("空文字列への back() は未定義動作です", "未定義動作");
                return done(cur.charCodeAt(cur.length - 1));
              case "substr": {
                need([0, 1, 2]);
                const p = args.length ? idx(values[0], args[0]) : 0;
                if (p < 0 || p > cur.length) outOfRange();
                let c = args.length >= 2 ? idx(values[1], args[1]) : -1;
                if (c < 0) c = cur.length - p;
                return done(cur.slice(p, p + c));
              }
              case "find": case "rfind": case "find_first_of": case "find_first_not_of": case "find_last_of": case "find_last_not_of": {
                need([1, 2, 3]);
                let needle = needleOf(0);
                if (args.length === 3 && (method === "find" || method === "rfind")) {
                  const c = idx(values[2], args[2]);
                  needle = asText(values[0], args[0]).slice(0, Math.max(0, c));
                }
                const posGiven = args.length >= 2 ? idx(values[1], args[1]) : null;
                if (method === "find") {
                  const p = posGiven ?? 0;
                  if (p < 0) return done(-1);
                  return done(cur.indexOf(needle, p));
                }
                if (method === "rfind") {
                  let p = posGiven ?? -1;
                  if (p === -1) p = cur.length;
                  if (p < 0) return done(-1);
                  if (needle === "") return done(Math.min(p, cur.length));
                  return done(cur.lastIndexOf(needle, p));
                }
                if (method === "find_first_of" || method === "find_first_not_of") {
                  const p = posGiven ?? 0, want = method === "find_first_of";
                  if (p < 0) return done(-1);
                  for (let i = p; i < cur.length; i++)
                    if (needle.includes(cur[i]) === want) return done(i);
                  return done(-1);
                }
                let p = posGiven ?? -1;
                if (p === -1) p = cur.length - 1;
                const want = method === "find_last_of";
                for (let i = Math.min(p, cur.length - 1); i >= 0; i--)
                  if (needle.includes(cur[i]) === want) return done(i);
                return done(-1);
              }
              case "compare": {
                need([1, 3, 5]);
                if (args.length === 1) return done(cmpText(cur, asText(values[0], args[0])));
                const p = idx(values[0], args[0]);
                if (p < 0 || p > cur.length) outOfRange();
                let c = idx(values[1], args[1]);
                if (c < 0) c = cur.length - p;
                const mine = cur.slice(p, p + c);
                if (args.length === 3) return done(cmpText(mine, asText(values[2], args[2])));
                const other = asText(values[2], args[2]);
                const p2 = idx(values[3], args[3]);
                if (p2 < 0 || p2 > other.length) outOfRange();
                let c2 = idx(values[4], args[4]);
                if (c2 < 0) c2 = other.length - p2;
                return done(cmpText(mine, other.slice(p2, p2 + c2)));
              }
              case "starts_with": need([1]); return done(cur.startsWith(needleOf(0)));
              case "ends_with": need([1]); return done(cur.endsWith(needleOf(0)));
              case "contains": need([1]); return done(cur.includes(needleOf(0)));
              case "assign": case "append": {
                need([1, 2, 3]);
                const base = method === "append" ? cur : "";
                if (args.length === 1) return done(setStr(base + asText(values[0], args[0])));
                if (args.length === 2) {
                  const c = idx(values[0], args[0]);
                  if (c < 0) fail("個数が不正です", "std::length_error");
                  return done(setStr(base + asChar(values[1], args[1]).repeat(c)));
                }
                const src = asText(values[0], args[0]), p = idx(values[1], args[1]);
                if (p < 0 || p > src.length) outOfRange();
                let c = idx(values[2], args[2]);
                if (c < 0) c = src.length - p;
                return done(setStr(base + src.slice(p, p + c)));
              }
              case "push_back":
                need([1]);
                setStr(cur + asChar(values[0], args[0]));
                return done(null);
              case "pop_back":
                need([0]);
                if (!cur.length) fail("空文字列への pop_back() は未定義動作です", "未定義動作");
                setStr(cur.slice(0, -1));
                return done(null);
              case "clear": need([0]); setStr(""); return done(null);
              case "reserve": need([0, 1]); return done(null);
              case "shrink_to_fit": need([0]); return done(null);
              case "insert": {
                need([2, 3]);
                const p = idx(values[0], args[0]);
                if (p < 0 || p > cur.length) outOfRange();
                if (args.length === 2)
                  return done(setStr(cur.slice(0, p) + asText(values[1], args[1]) + cur.slice(p)));
                const c = idx(values[1], args[1]);
                if (c < 0) fail("個数が不正です", "std::length_error");
                return done(setStr(cur.slice(0, p) + asChar(values[2], args[2]).repeat(c) + cur.slice(p)));
              }
              case "erase": {
                need([0, 1, 2]);
                const p = args.length ? idx(values[0], args[0]) : 0;
                if (p < 0 || p > cur.length) outOfRange();
                let c = args.length >= 2 ? idx(values[1], args[1]) : -1;
                if (c < 0) c = cur.length - p;
                return done(setStr(cur.slice(0, p) + cur.slice(p + c)));
              }
              case "replace": {
                need([3, 5]);
                const p = idx(values[0], args[0]);
                if (p < 0 || p > cur.length) outOfRange();
                let c = idx(values[1], args[1]);
                if (c < 0) c = cur.length - p;
                let ins;
                if (args.length === 3) ins = asText(values[2], args[2]);
                else {
                  const src = asText(values[2], args[2]), p2 = idx(values[3], args[3]);
                  if (p2 < 0 || p2 > src.length) outOfRange();
                  let c2 = idx(values[4], args[4]);
                  if (c2 < 0) c2 = src.length - p2;
                  ins = src.slice(p2, p2 + c2);
                }
                return done(setStr(cur.slice(0, p) + ins + cur.slice(p + c)));
              }
              case "resize": {
                need([1, 2]);
                const n = idx(values[0], args[0]);
                if (n < 0) fail("resize のサイズが不正です", "std::length_error");
                if (n > 200000) fail("resize のサイズがモデルの上限を超えます", "limit");
                const fill = args.length === 2 ? asChar(values[1], args[1]) : "\0";
                setStr(n <= cur.length ? cur.slice(0, n) : cur + fill.repeat(n - cur.length));
                return done(null);
              }
              case "swap": {
                need([1]);
                const otherNode = args[0];
                if (!["var", "index", "member"].includes(otherNode?.k))
                  fail("swap の引数は文字列変数でなければなりません");
                const other = api.read(otherNode, s);
                if (typeof other !== "string") fail("swap の引数は文字列でなければなりません");
                api.write(otherNode, cur, s, node);
                setStr(other);
                return done(null);
              }
            }
            return null;
          }
          /* ---------- 自由関数 ---------- */
          if (name.includes(".")) return null;
          if (name === "srand") { need([1]); return done(null); }
          if (name === "rand") {
            need([0]);
            return done(api.freshUnknown("rand の戻り値（実行ごとに変わる値）", s));
          }
          if (values.some(isUnknown)) return done(unknown(`${name} の戻り値`));
          const D1 = { sqrt: Math.sqrt, exp: Math.exp, log: Math.log, log2: Math.log2, log10: Math.log10, sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh, cbrt: Math.cbrt, fabs: Math.abs, floor: Math.floor, ceil: Math.ceil, trunc: Math.trunc };
          if (Object.hasOwn(D1, name)) { need([1]); return done(D1[name](asNum(values[0], args[0]))); }
          if (name === "exp2") { need([1]); return done(2 ** asNum(values[0], args[0])); }
          if (name === "round") { need([1]); return done(roundAway(asNum(values[0], args[0]))); }
          if (name === "rint" || name === "nearbyint") { need([1]); return done(rhe(asNum(values[0], args[0]))); }
          if (name === "lround" || name === "llround" || name === "lrint" || name === "llrint") {
            need([1]);
            const x = asNum(values[0], args[0]);
            const r = name.endsWith("round") ? roundAway(x) : rhe(x);
            if (!Number.isSafeInteger(r)) fail("結果が安全整数の範囲外です", "未確認");
            return done(r);
          }
          const nextAfterImpl = (x, y) => {
            if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
            if (x === y) return y;
            if (x === 0) return y > 0 ? Number.MIN_VALUE : -Number.MIN_VALUE;
            const buf = new DataView(new ArrayBuffer(8));
            buf.setFloat64(0, x);
            let bits = buf.getBigUint64(0);
            bits += (y > x) !== (x < 0) ? 1n : -1n;
            buf.setBigUint64(0, bits);
            return buf.getFloat64(0);
          };
          const D2 = {
            pow: (x, y) => x ** y,
            fmod: (x, y) => x % y,
            remainder: (x, y) => (y === 0 ? NaN : x - rhe(x / y) * y),
            atan2: Math.atan2,
            hypot: Math.hypot,
            fmin: (x, y) => (Number.isNaN(x) ? y : Number.isNaN(y) ? x : Math.min(x, y)),
            fmax: (x, y) => (Number.isNaN(x) ? y : Number.isNaN(y) ? x : Math.max(x, y)),
            fdim: (x, y) => (x > y ? x - y : 0),
            copysign: (x, y) => Math.abs(x) * (Object.is(y, -0) || y < 0 ? -1 : 1),
            ldexp: (x, e) => x * 2 ** Math.trunc(e),
            scalbn: (x, e) => x * 2 ** Math.trunc(e),
            scalbln: (x, e) => x * 2 ** Math.trunc(e),
            nextafter: nextAfterImpl,
            nexttoward: nextAfterImpl,
          };
          if (Object.hasOwn(D2, name)) { need([2]); return done(D2[name](asNum(values[0], args[0]), asNum(values[1], args[1]))); }
          if (["isnan", "isinf", "isfinite", "isnormal", "signbit", "fpclassify", "logb", "ilogb"].includes(name)) {
            need([1]);
            const x = asNum(values[0], args[0]);
            if (name === "isnan") return done(Number.isNaN(x));
            if (name === "isinf") return done(!Number.isFinite(x) && !Number.isNaN(x));
            if (name === "isfinite") return done(Number.isFinite(x));
            if (name === "isnormal") return done(x !== 0 && Number.isFinite(x) && Math.abs(x) >= 2.2250738585072014e-308);
            if (name === "signbit") return done(x < 0 || Object.is(x, -0));
            if (name === "fpclassify") return done(Number.isNaN(x) ? 0 : !Number.isFinite(x) ? 1 : x === 0 ? 2 : Math.abs(x) < 2.2250738585072014e-308 ? 3 : 4);
            if (name === "logb") return done(x === 0 ? -Infinity : Number.isNaN(x) ? NaN : !Number.isFinite(x) ? Infinity : Math.floor(Math.log2(Math.abs(x))));
            return done(x === 0 ? -2147483648 : Number.isNaN(x) ? 2147483647 : !Number.isFinite(x) ? 2147483647 : Math.floor(Math.log2(Math.abs(x))));
          }
          if (["isgreater", "isgreaterequal", "isless", "islessequal", "islessgreater", "isunordered"].includes(name)) {
            need([2]);
            const x = asNum(values[0], args[0]), y = asNum(values[1], args[1]);
            if (name === "isunordered") return done(Number.isNaN(x) || Number.isNaN(y));
            if (name === "isgreater") return done(x > y);
            if (name === "isgreaterequal") return done(x >= y);
            if (name === "isless") return done(x < y);
            if (name === "islessequal") return done(x <= y);
            return done(x < y || x > y);
          }
          if (name === "nan") { need([1]); return done(NaN); }
          /* <cstdlib> 文字列変換 */
          if (["atoi", "atol", "atoll"].includes(name)) {
            need([1]);
            const parsed = parseIntPrefix(asText(values[0], args[0]), 10);
            if (parsed === null) return done(0);
            if (name === "atoi" && (parsed > 2147483647n || parsed < -2147483648n))
              fail("atoi の結果が int の範囲外です", "未定義動作");
            if (parsed > BigInt(Number.MAX_SAFE_INTEGER) || parsed < BigInt(Number.MIN_SAFE_INTEGER))
              fail("結果が安全整数の範囲外です", "未確認");
            return done(Number(parsed));
          }
          if (name === "atof" || name === "strtod" || name === "strtof") {
            need(name === "atof" ? [1] : [1, 2]);
            const v = parseFloatPrefix(asText(values[0], args[0]));
            const r = v === null ? 0 : v;
            return done(name === "strtof" ? Math.fround(r) : r);
          }
          if (["strtol", "strtoll", "strtoul", "strtoull"].includes(name)) {
            need([2, 3]);
            const base = args.length >= 3 ? idx(values[2], args[2]) : 0;
            let parsed = parseIntPrefix(asText(values[0], args[0]), base);
            if (parsed === null) return done(0);
            if (name === "strtoul" || name === "strtoull") {
              const MOD = 1n << 64n;
              parsed = ((parsed % MOD) + MOD) % MOD;
            }
            if (parsed > BigInt(Number.MAX_SAFE_INTEGER) || parsed < BigInt(Number.MIN_SAFE_INTEGER))
              fail("結果が安全整数の範囲外です", "未確認");
            return done(Number(parsed));
          }
          if (["div", "ldiv", "lldiv"].includes(name)) {
            need([2]);
            const n = idx(values[0], args[0]), d = idx(values[1], args[1]);
            if (d === 0) fail("0 で割る除算です", "未定義動作");
            // A5班監査: 整数除算の商に -0 は存在しない（演算子側と同根）。
            let quot = Math.trunc(n / d);
            if (quot === 0) quot = 0;
            return done({ quot, rem: n - quot * d });
          }
          if (name === "labs" || name === "llabs") {
            need([1]);
            const r = Math.abs(asNum(values[0], args[0]));
            if (!Number.isSafeInteger(r)) fail("結果が安全整数の範囲外です", "未確認");
            return done(r);
          }
          /* <cctype>（"C" ロケール） */
          const CTYPE = {
            isalpha: (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122),
            isdigit: (c) => c >= 48 && c <= 57,
            isalnum: (c) => ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57)),
            isspace: (c) => [9, 10, 11, 12, 13, 32].includes(c),
            isupper: (c) => c >= 65 && c <= 90,
            islower: (c) => c >= 97 && c <= 122,
            ispunct: (c) => c >= 33 && c <= 126 && !((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57)),
            isxdigit: (c) => (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102),
            iscntrl: (c) => (c >= 0 && c < 32) || c === 127,
            isprint: (c) => c >= 32 && c <= 126,
            isgraph: (c) => c >= 33 && c <= 126,
          };
          if (Object.hasOwn(CTYPE, name)) {
            need([1]);
            const c = idx(values[0], args[0]);
            return done(c === -1 ? false : CTYPE[name](c));
          }
          if (name === "tolower" || name === "toupper") {
            need([1]);
            const c = idx(values[0], args[0]);
            if (c === -1) return done(-1);
            if (name === "tolower") return done(c >= 65 && c <= 90 ? c + 32 : c);
            return done(c >= 97 && c <= 122 ? c - 32 : c);
          }
          /* <cstring> */
          if (name === "strlen") { need([1]); return done(asText(values[0], args[0]).length); }
          if (name === "strcmp") { need([2]); return done(cmpText(asText(values[0], args[0]), asText(values[1], args[1]))); }
          if (name === "strncmp") {
            need([3]);
            const a = asText(values[0], args[0]), b = asText(values[1], args[1]), n = idx(values[2], args[2]);
            for (let i = 0; i < n; i++) {
              const ca = i < a.length ? a.charCodeAt(i) : 0, cb = i < b.length ? b.charCodeAt(i) : 0;
              if (ca !== cb) return done(ca - cb);
              if (ca === 0) return done(0);
            }
            return done(0);
          }
          if (name === "strchr" || name === "strrchr") {
            need([2]);
            const wasPtr = isPtr(values[0]);
            const text = asText(values[0], args[0]);
            const code = ((idx(values[1], args[1]) % 256) + 256) % 256;
            if (code === 0) return done(wasPtr ? { ...values[0], offset: values[0].offset + text.length } : "");
            const ch = String.fromCharCode(code);
            const at = name === "strchr" ? text.indexOf(ch) : text.lastIndexOf(ch);
            if (at < 0) return done(null);
            return done(wasPtr ? { ...values[0], offset: values[0].offset + at } : text.slice(at));
          }
          if (name === "strstr") {
            need([2]);
            const wasPtr = isPtr(values[0]);
            const big = asText(values[0], args[0]), needle = asText(values[1], args[1]);
            if (needle === "") return done(values[0]);
            const at = big.indexOf(needle);
            if (at < 0) return done(null);
            return done(wasPtr ? { ...values[0], offset: values[0].offset + at } : big.slice(at));
          }
          /* std::stoi 系／std::to_string */
          if (["stoi", "stol", "stoll", "stoul", "stoull", "stof", "stod"].includes(name)) {
            need([1, 2, 3]);
            if (typeof values[0] !== "string") fail("第1引数は文字列でなければなりません");
            const text = values[0];
            if (name === "stof" || name === "stod") {
              const v = parseFloatPrefix(text);
              if (v === null) fail("変換できる数値がありません（std::invalid_argument）", "std::invalid_argument");
              if (!Number.isFinite(v) && !/^\s*[+-]?inf/i.test(text))
                fail("変換結果が範囲外です（std::out_of_range）", "std::out_of_range");
              return done(name === "stof" ? Math.fround(v) : v);
            }
            const base = args.length >= 3 ? idx(values[2], args[2]) : 10;
            let parsed = parseIntPrefix(text, base);
            if (parsed === null) fail("変換できる数値がありません（std::invalid_argument）", "std::invalid_argument");
            if (name === "stoi" && (parsed > 2147483647n || parsed < -2147483648n))
              fail("変換結果が int の範囲外です（std::out_of_range）", "std::out_of_range");
            if (name === "stoul" || name === "stoull") {
              const MOD = 1n << 64n;
              parsed = ((parsed % MOD) + MOD) % MOD;
            }
            if (parsed > BigInt(Number.MAX_SAFE_INTEGER) || parsed < BigInt(Number.MIN_SAFE_INTEGER))
              fail("変換結果が安全整数の範囲外です", "未確認");
            return done(Number(parsed));
          }
          if (name === "to_string") {
            need([1]);
            const v = values[0];
            if (typeof v === "boolean") return done(String(Number(v)));
            if (typeof v === "string") {
              if (typeOf(args[0], s) === "char" && v.length === 1) return done(String(v.charCodeAt(0)));
              fail("to_string の引数は数値でなければなりません");
            }
            if (typeof v !== "number") fail("to_string の引数は数値でなければなりません");
            if (Number.isNaN(v)) return done("nan");
            if (!Number.isFinite(v)) return done(v > 0 ? "inf" : "-inf");
            if (["double", "float"].includes(typeOf(args[0], s)) || !Number.isInteger(v))
              return done(Object.is(v, -0) ? "-0.000000" : formatFixed6(v));
            return done(String(v));
          }
          /* <bit> */
          if (["has_single_bit", "bit_ceil", "bit_floor", "bit_width", "countl_zero", "countl_one", "countr_zero", "countr_one", "popcount", "rotl", "rotr", "byteswap"].includes(name)) {
            need(name === "rotl" || name === "rotr" ? [2] : [1]);
            const t0 = typeOf(args[0], s);
            const w = t0.includes("char") ? 8 : t0.includes("short") ? 16 : t0.includes("long") ? 64 : 32;
            const xv = asNum(values[0], args[0]);
            if (!Number.isSafeInteger(Math.trunc(xv))) fail("引数が安全整数の範囲外です", "未確認");
            const mask = (1n << BigInt(w)) - 1n;
            const x = BigInt.asUintN(w, BigInt(Math.trunc(xv)));
            const toNum = (b) => {
              if (b > BigInt(Number.MAX_SAFE_INTEGER)) fail("結果が安全整数の範囲外です", "未確認");
              return Number(b);
            };
            const bitWidth = (b) => (b === 0n ? 0 : b.toString(2).length);
            const pop = (b) => b.toString(2).replaceAll("0", "").length;
            switch (name) {
              case "has_single_bit": return done(x !== 0n && (x & (x - 1n)) === 0n);
              case "bit_width": return done(bitWidth(x));
              case "popcount": return done(pop(x));
              case "countl_zero": return done(w - bitWidth(x));
              case "countl_one": {
                let c = 0;
                for (let i = w - 1; i >= 0 && ((x >> BigInt(i)) & 1n) === 1n; i--) c++;
                return done(c);
              }
              case "countr_zero": {
                if (x === 0n) return done(w);
                let c = 0;
                while (((x >> BigInt(c)) & 1n) === 0n) c++;
                return done(c);
              }
              case "countr_one": {
                let c = 0;
                while (c < w && ((x >> BigInt(c)) & 1n) === 1n) c++;
                return done(c);
              }
              case "bit_ceil": {
                if (x <= 1n) return done(1);
                const p = 1n << BigInt(bitWidth(x - 1n));
                if (p > (1n << BigInt(w - 1))) fail("bit_ceil の結果が型で表せません", "未定義動作");
                return done(toNum(p));
              }
              case "bit_floor":
                if (x === 0n) return done(0);
                return done(toNum(1n << BigInt(bitWidth(x) - 1)));
              case "rotl": case "rotr": {
                let sc = idx(values[1], args[1]);
                sc = ((sc % w) + w) % w;
                if (sc === 0) return done(toNum(x));
                const r = name === "rotl"
                  ? ((x << BigInt(sc)) | (x >> BigInt(w - sc))) & mask
                  : ((x >> BigInt(sc)) | (x << BigInt(w - sc))) & mask;
                return done(toNum(r));
              }
              case "byteswap": {
                let r = 0n;
                for (let i = 0; i < w / 8; i++) r = (r << 8n) | ((x >> BigInt(8 * i)) & 0xffn);
                return done(toNum(r));
              }
            }
          }
          return null;
        }
        // R25-N8（C家族分）：C#（managed）の代入は semantics.step／
        // read が右辺を先に読む経路のため、共有 executeProgram の
        // 代入ターゲット検証（右辺評価より前に形を名指す）に届く前に
        // 右辺のエラーを誤帰属していた。同じ検証を右辺評価の前に
        // ここでも行う。C# は実 csc の最初の診断 CS0131（左辺が
        // 変数・プロパティ・インデクサーでない）に相当する文面で
        // 名指す。C／C++ の通常代入は共有検証が同じ文面
        // （SyntaxError）で処理するため、ここは managed と
        // C／C++ の %= 経路だけが通る。
        function validateAssignTarget(target, node, api) {
          if (!target) return;
          if (["var", "index", "member"].includes(target.k)) return;
          if (!managed && target.k === "unary" && target.op === "*")
            return;
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
              ternary: "条件式の結果",
              nullish: "条件式の結果",
              cast: "キャストの結果",
            }[target.k] || "この式";
          if (managed)
            api.fail(
              `代入先が不正です：${form}には代入できません。代入の左辺は変数、プロパティ、またはインデクサーでなければなりません（CS0131）`,
              node,
              "CompileError",
            );
          api.fail(
            `代入先が不正です：${form}には代入できません（Invalid left-hand side in assignment）`,
            node,
            "SyntaxError",
          );
        }
        // R25-N14（C家族の同根表面）：代入の narration は代入先を
        // 特定する（NX-N23 の裁定。他エンジンでは「a[2] に 99 を
        // 代入します」の形）。共有 callName は var／member しか
        // 返さないため、ポインタ逆参照（*(p + 1) = 99 等）の代入が
        // 「対象 に 99 を代入します」と代入先を特定できていなかった。
        // AHK 班の処置（RG-55 系）と同じく、代入先を AST の形から
        // レンダリングする。レンダリングできない形は空を返し、
        // 呼び出し側が従来の表示へフォールバックする。
        function targetLabel(a) {
          if (!a || typeof a !== "object") return "";
          switch (a.k) {
            case "literal":
              return typeof a.value === "string"
                ? `"${a.value}"`
                : String(a.value);
            case "var":
              return a.name;
            case "member": {
              const t = targetLabel(a.target);
              return t ? `${t}.${a.name}` : "";
            }
            case "index": {
              const t = targetLabel(a.target);
              if (!t) return "";
              const parts = (a.indexes || []).map(targetLabel);
              if (!parts.length || parts.some((p) => p === "")) return "";
              return `${t}[${parts.join(", ")}]`;
            }
            case "binary": {
              const l = targetLabel(a.a),
                r = targetLabel(a.b);
              return l && r ? `${l} ${a.op} ${r}` : "";
            }
            case "unary": {
              const x = targetLabel(a.arg);
              if (!x) return "";
              // 逆参照の被演算子が二項式なら括弧で形を保つ
              // （*(p + 1) を *p + 1 と表示しない）。
              return a.op === "*" && a.arg.k === "binary"
                ? `*(${x})`
                : `${a.op}${x}`;
            }
            case "post": {
              const x = targetLabel(a.target);
              return x ? `${x}${a.op}` : "";
            }
            case "pre": {
              const x = targetLabel(a.target);
              return x ? `${a.op}${x}` : "";
            }
            case "cast": {
              const x = targetLabel(a.arg);
              return x ? `(${a.type})${x}` : "";
            }
            case "call": {
              const t = targetLabel(a.target);
              if (!t) return "";
              const args = (a.args || []).map(targetLabel);
              return args.some((x) => x === "") ? "" : `${t}(${args.join(", ")})`;
            }
            default:
              return "";
          }
        }
        // 高度モード（ブロックB6）：printf の書式処理を切り出した共通
        // 関数。printf 本体と、ライブラリ拡張（sprintf 等）が同じ書式
        // 規則・同じ型検査・同じ停止文面を共有するためのもの。挙動は
        // 切り出し前と同一（書式の受理範囲は %d %i %s %f %c %u %% のみ）。
        function formatPrintf(fmt, args, values, s, api, node) {
          if (isPtr(fmt)) fmt = cString(fmt, s, api, node);
          if (typeof fmt !== "string")
            api.fail("printfの書式文字列が必要です", node);
          // R7-162（修正バッチ13）：書式文字列は最初のヌル文字で
          // 終端する（gcc 実測：printf("A\0B%d",7) の出力は "A" で
          // 戻り値は 1。ヌル以降の書式は読まれず、余った引数は
          // 実物でも無視される）。
          const nulAt = fmt.indexOf("\0");
          const truncatedAtNul = nulAt >= 0;
          if (truncatedAtNul) fmt = fmt.slice(0, nulAt);
          if (fmt.replace(/%[%disfcu]/g, "").includes("%")) api.fail("このprintf書式はモデルで扱えません", node, "未対応");
          const rest = values.slice(1);
          let i = 0;
          let text = fmt.replace(/%([%disfcu])/g, (_, type) => {
            if (type === "%") return "%";
            let sourceArg = args[i + 1],
              sourceType = typeOf(sourceArg, s),
              v = rest[i++];
            if (typeof v === "boolean") v = Number(v);
            // B6監査（A-C P2-1是正）：「実行時に決まる値」は型のある値であり、
            // 値が数値でないことを理由に「書式と型が一致しない（未定義動作）」
            // とするのは虚偽原因。宣言型と書式の整合だけを検査し、値は
            // ラベルで表示する（rand() の printf が標準的な使い方のため）。
            if (isUnknown(v)) {
              if (
                ((type === "d" || type === "i" || type === "c") &&
                  !["int", "char", "signed char", "unsigned char", "short", "unsigned short", "bool"].includes(sourceType)) ||
                (type === "u" && sourceType !== "unsigned int") ||
                (type === "f" && !["float", "double"].includes(sourceType)) ||
                // A6監査CF-07：%s も宣言型検査の対象（char ポインタ／
                // char 配列でない未確定値をラベル表示で通さない）
                (type === "s" &&
                  !(/\bchar\b/.test(sourceType) &&
                    (sourceType.includes("*") || sourceType.includes("["))))
              )
                api.fail(
                  "printfの書式と引数型が一致しません",
                  node,
                  "未定義動作",
                );
              return formatValue(v);
            }
            if (type === "s") v = cString(v, s, api, node);
            if (
              ((type === "d" || type === "i" || type === "c") &&
                !["int", "char", "signed char", "unsigned char", "short", "unsigned short", "bool"].includes(sourceType)) ||
              (type === "u" && sourceType !== "unsigned int") ||
              (type === "f" && !["float", "double"].includes(sourceType))
            )
              api.fail(
                "printfの書式と引数型が一致しません",
                node,
                "未定義動作",
              );
            if (
              (type === "s" && typeof v !== "string") ||
              (type !== "s" && typeof v !== "number")
            )
              api.fail(
                "printfの書式と引数型が一致しません",
                node,
                "未定義動作",
              );
            // RG-04 追加表面（R21-N6）: 非有限値の %f は C の実物表記
            // （inf／-inf／nan）。JS の toFixed が返す "Infinity" を出さない。
            // R7-44（修正バッチ13）：%c は int の引数を unsigned char へ
            // 変換してから1バイト出力する（gcc 実測：256 は 00、
            // -1 は FF）。コード点として文字化すると存在しない
            // 文字（U+0100 等）を捏造する。
            return type === "f" ? (!Number.isFinite(v) ? (Number.isNaN(v) ? "nan" : v > 0 ? "inf" : "-inf") : Object.is(v, -0) ? "-0.000000" : formatFixed6(Number(v))) : type === "c" ? String.fromCharCode(((Math.trunc(v) % 256) + 256) % 256) : String(v);
          });
          if (i !== rest.length && !(truncatedAtNul && i < rest.length))
            api.fail("printfの書式または引数の数は未対応です", node);
          return text;
        }
        // 高度モード（ブロックB6）：種類が library オプションを渡した
        // 場合のみ、エンジン内部ヘルパーを束ねてライブラリ拡張を
        // 生成する。渡さない種類（C++／C#）では null のままで、呼び出し
        // 経路に一切現れない。library ファクトリは
        // { call, returnType } を返す（returnType は任意）。
        const libraryImpl = libraryFactory
          ? libraryFactory({
              typeOf,
              cString,
              isPtr,
              deref,
              targetPointer,
              width,
              allocate,
              isUnknown,
              formatPrintf,
              language,
              managed,
            })
          : null;
        const libraryCall = libraryImpl?.call ?? null;
        const libraryReturnType = libraryImpl?.returnType ?? null;
        // ===== B8（cpp-engine-b）：コンテナ／イテレータ／アルゴリズム =====
        // 値モデル：vector／array の値は要素の JS 配列そのもの（変数へ
        // の代入・引数渡しでは castElem が要素ごとの複写を作り、C++ の
        // 値セマンティクスを再現する）。pair は {__pair, t1, t2, first,
        // second}。イテレータは {kind:"cpp-iterator", arr／strVar／
        // strObj（指す対象）, pos（begin からの歩数）, elem, rev,
        // constIt, itype} で、「指す対象＋位置」を表す。コンテナ側の
        // 破壊的操作は配列をその場で変更するため、既存イテレータは
        // 同じ配列を見続ける（変数への再代入で対象が切り替わった場合
        // は旧対象を見続ける。実物では無効化＝未定義動作の領域であり、
        // モデルでは旧対象の値が読める点が相違として残る）。
        const isIterVal = (v) => v?.kind === "cpp-iterator",
          isPairVal = (v) => v?.__pair === true;
        function parseCppTypeText(text) {
          if (typeof text !== "string" || !text) return null;
          let i = 0;
          const parseBase = () => {
            const m = /^[A-Za-z_][\w]*/.exec(text.slice(i));
            if (!m) return null;
            let word = m[0];
            i += word.length;
            if (["unsigned", "signed"].includes(word)) {
              const m2 = /^\s+(int|long|short|char)\b/.exec(text.slice(i));
              if (m2) {
                word = word + " " + m2[1];
                i += m2[0].length;
              } else word = word === "unsigned" ? "unsigned int" : "int";
            }
            if (text[i] === "<") {
              i++;
              if (word === "vector") {
                const e = parseType();
                if (!e || text[i] !== ">") return null;
                i++;
                return { kind: "vector", elem: e, text: `vector<${e.text}>` };
              }
              if (word === "pair") {
                const a = parseType();
                if (!a || text[i] !== ",") return null;
                i++;
                const b = parseType();
                if (!b || text[i] !== ">") return null;
                i++;
                return { kind: "pair", t1: a, t2: b, text: `pair<${a.text},${b.text}>` };
              }
              if (word === "array") {
                const e = parseType();
                if (!e || text[i] !== ",") return null;
                i++;
                const m3 = /^\d+/.exec(text.slice(i));
                if (!m3) return null;
                const sz = Number(m3[0]);
                i += m3[0].length;
                if (text[i] !== ">") return null;
                i++;
                return { kind: "array", elem: e, size: sz, text: `array<${e.text},${sz}>` };
              }
              return null;
            }
            return { kind: "scalar", text: word };
          };
          const parseType = () => {
            const base = parseBase();
            if (!base) return null;
            const m4 = /^::(const_iterator|const_reverse_iterator|reverse_iterator|iterator)\b/.exec(text.slice(i));
            if (m4) {
              i += m4[0].length;
              return {
                kind: "iterator",
                host: base,
                elem: base.kind === "scalar" ? "char" : base.elem.text,
                iterName: m4[1],
                rev: m4[1].includes("reverse"),
                constIt: m4[1].includes("const"),
                text: `${base.text}::${m4[1]}`,
              };
            }
            return base;
          };
          const r = parseType();
          return r && i === text.length ? r : null;
        }
        function finalizeCppSpec(spec, s, api, node) {
          if (!spec) return spec;
          if (spec.kind === "vector")
            return { ...spec, elem: finalizeCppSpec(spec.elem, s, api, node) };
          if (spec.kind === "pair")
            return {
              ...spec,
              t1: finalizeCppSpec(spec.t1, s, api, node),
              t2: finalizeCppSpec(spec.t2, s, api, node),
            };
          if (spec.kind === "array") {
            const elem = finalizeCppSpec(spec.elem, s, api, node);
            let size = spec.size;
            if (size === undefined) {
              const sz = api.read(spec.sizeExpr, s);
              if (!Number.isInteger(sz) || sz < 0 || sz > 10000)
                api.fail("std::array の要素数が不正です", node, "CompileError");
              size = sz;
            }
            return { ...spec, elem, size, text: `array<${elem.text},${size}>` };
          }
          if (spec.kind === "iterator")
            return { ...spec, host: finalizeCppSpec(spec.host, s, api, node) };
          return spec;
        }
        function defaultForSpec(spec, s, api, node) {
          if (!spec) return 0;
          if (spec.kind === "scalar") {
            if (spec.text === "string") return "";
            if (spec.text === "bool") return false;
            return 0;
          }
          if (spec.kind === "vector") return [];
          if (spec.kind === "array")
            return Array.from({ length: spec.size ?? 0 }, () =>
              defaultForSpec(spec.elem, s, api, node),
            );
          if (spec.kind === "pair")
            return {
              __pair: true,
              t1: spec.t1.text,
              t2: spec.t2.text,
              first: defaultForSpec(spec.t1, s, api, node),
              second: defaultForSpec(spec.t2, s, api, node),
            };
          if (spec.kind === "iterator")
            return {
              kind: "cpp-iterator",
              singular: true,
              pos: 0,
              elem:
                spec.host.kind === "scalar"
                  ? "char"
                  : spec.host.elem?.text || "int",
              rev: !!spec.rev,
              constIt: !!spec.constIt,
              itype: spec.text,
            };
          return 0;
        }
        function castElem(v, spec, s, api, node) {
          if (!spec || isUnknown(v)) return v;
          if (spec.kind === "scalar") return cast(v, spec.text, s, node, api);
          if (spec.kind === "vector") {
            if (!Array.isArray(v))
              api.fail(
                `型が一致しません：${spec.text} の値が必要です`,
                node,
                "CompileError",
              );
            return v.map((e) => castElem(e, spec.elem, s, api, node));
          }
          if (spec.kind === "array") {
            if (!Array.isArray(v))
              api.fail(
                `型が一致しません：${spec.text} の値が必要です`,
                node,
                "CompileError",
              );
            if (v.length > spec.size)
              api.fail(
                "std::array の初期化子が要素数を超えています",
                node,
                "CompileError",
              );
            const out = v.map((e) => castElem(e, spec.elem, s, api, node));
            while (out.length < spec.size)
              out.push(defaultForSpec(spec.elem, s, api, node));
            return out;
          }
          if (spec.kind === "pair") {
            if (isPairVal(v))
              return {
                __pair: true,
                t1: spec.t1.text,
                t2: spec.t2.text,
                first: castElem(v.first, spec.t1, s, api, node),
                second: castElem(v.second, spec.t2, s, api, node),
              };
            if (Array.isArray(v) && v.length === 2)
              return {
                __pair: true,
                t1: spec.t1.text,
                t2: spec.t2.text,
                first: castElem(v[0], spec.t1, s, api, node),
                second: castElem(v[1], spec.t2, s, api, node),
              };
            api.fail(
              `型が一致しません：${spec.text} の値が必要です`,
              node,
              "CompileError",
            );
          }
          if (spec.kind === "iterator") {
            if (!isIterVal(v))
              api.fail("イテレータの値が必要です", node, "CompileError");
            return v;
          }
          return v;
        }
        function compareElems(a, b, spec, s, api, node) {
          if (isUnknown(a) || isUnknown(b))
            api.fail("未確定の値同士の比較はできません", node, "未確認");
          const sp =
            spec ||
            (isPairVal(a) && isPairVal(b)
              ? {
                  kind: "pair",
                  t1: parseCppTypeText(a.t1),
                  t2: parseCppTypeText(a.t2),
                }
              : Array.isArray(a) && Array.isArray(b)
                ? { kind: "vector", elem: null }
                : { kind: "scalar", text: "int" });
          if (sp.kind === "pair") {
            const c1 = compareElems(a.first, b.first, sp.t1, s, api, node);
            return c1 !== 0
              ? c1
              : compareElems(a.second, b.second, sp.t2, s, api, node);
          }
          if (sp.kind === "vector" || sp.kind === "array") {
            const n = Math.min(a.length, b.length);
            for (let k = 0; k < n; k++) {
              const c = compareElems(a[k], b[k], sp.elem, s, api, node);
              if (c !== 0) return c;
            }
            return a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
          }
          let x = a,
            y = b;
          if (sp.text === "char" || sp.text === "bool") {
            if (typeof x === "string" && x.length === 1) x = x.charCodeAt(0);
            if (typeof y === "string" && y.length === 1) y = y.charCodeAt(0);
            if (typeof x === "boolean") x = Number(x);
            if (typeof y === "boolean") y = Number(y);
          }
          if (typeof x === "string" && typeof y === "string")
            return x < y ? -1 : x > y ? 1 : 0;
          if (typeof x === "number" && typeof y === "number")
            return x < y ? -1 : x > y ? 1 : 0;
          if (typeof x === "boolean" && typeof y === "boolean")
            return x === y ? 0 : x ? 1 : -1;
          api.fail("比較できる型の組み合わせではありません", node, "CompileError");
        }
        function binaryOpVal(op, a, b, s, api, node) {
          if (typeof a === "string" && typeof b === "string" && op === "+") {
            if (a.length + b.length > 200000)
              return unknown("とても長い文字列");
            return a + b;
          }
          const lit = (v) => ({
            k: "literal",
            value: v,
            raw: typeof v === "number" ? String(v) : undefined,
            line: node?.line ?? 1,
          });
          return semantics.binary(
            op,
            a,
            b,
            { k: "binary", op, a: lit(a), b: lit(b), line: node?.line ?? 1 },
            s,
            api,
          );
        }
        // --- イテレータの基本操作 ---
        function iterLen(it, s, api, node) {
          if (it.singular)
            api.fail("初期化されていないイテレータです", node, "未定義動作");
          if (it.arr) return it.arr.length;
          if (it.strVar) {
            const v = s.vars[it.strVar];
            if (typeof v !== "string")
              api.fail("イテレータの指す文字列がありません", node);
            return v.length;
          }
          if (it.strObj) return it.strObj.str.length;
          api.fail("イテレータの指す対象がありません", node, "未定義動作");
        }
        function iterString(it, s) {
          return it.strVar ? s.vars[it.strVar] : it.strObj?.str;
        }
        function iterGet(it, s, api, node) {
          const len = iterLen(it, s, api, node),
            idx = it.rev ? len - 1 - it.pos : it.pos;
          if (idx < 0 || idx >= len)
            api.fail(
              "イテレータの指す先がありません（範囲外の参照）",
              node,
              "未定義動作",
            );
          let v;
          if (it.arr) v = it.arr[idx];
          else {
            const str = iterString(it, s);
            if (typeof str !== "string")
              api.fail("イテレータの指す文字列がありません", node);
            v = str.charCodeAt(idx);
          }
          if (v?.kind === "uninitialized")
            api.fail("未初期化の要素です", node, "未定義動作");
          return v;
        }
        function iterSet(it, val, s, api, node) {
          if (it.constIt)
            api.fail(
              "const イテレータ経由では要素を書き換えできません",
              node,
              "CompileError",
            );
          const len = iterLen(it, s, api, node),
            idx = it.rev ? len - 1 - it.pos : it.pos;
          if (idx < 0 || idx >= len)
            api.fail(
              "イテレータの指す先がありません（範囲外への書き込み）",
              node,
              "未定義動作",
            );
          const spec = parseCppTypeText(it.elem),
            cv = spec ? castElem(val, spec, s, api, node) : val;
          if (it.arr) {
            it.arr[idx] = cv;
            return;
          }
          if (it.strVar) {
            const cur = s.vars[it.strVar],
              ch = typeof cv === "string" ? cv : String.fromCharCode(cv),
              next = cur.slice(0, idx) + ch + cur.slice(idx + 1);
            s.vars[it.strVar] = next;
            const id = s.addresses?.[it.strVar];
            if (id && s.model.memory[id]) s.model.memory[id].values[0] = next;
            return;
          }
          api.fail(
            "一時文字列のイテレータ経由の書き込みは未対応です",
            node,
            "未対応",
          );
        }
        function iterAdvanceVal(it, n, s, api, node) {
          const len = iterLen(it, s, api, node),
            pos = it.pos + n;
          if (!Number.isInteger(n))
            api.fail("イテレータの移動量は整数でなければなりません", node, "CompileError");
          if (pos < 0 || pos > len)
            api.fail(
              "イテレータの移動が範囲を超えています",
              node,
              "未定義動作",
            );
          return { ...it, pos };
        }
        function iterSameHost(a, b) {
          return (
            (a.arr && a.arr === b.arr) ||
            (a.strVar && a.strVar === b.strVar) ||
            (a.strObj && a.strObj === b.strObj)
          );
        }
        function makeArrIter(arr, hostSpec, elemText, pos, rev, constIt) {
          const iterName = constIt
            ? rev
              ? "const_reverse_iterator"
              : "const_iterator"
            : rev
              ? "reverse_iterator"
              : "iterator";
          return {
            kind: "cpp-iterator",
            arr,
            pos,
            elem: elemText,
            rev: !!rev,
            constIt: !!constIt,
            itype: `${hostSpec.text}::${iterName}`,
          };
        }
        // イテレータ／生ポインタ共通の参照・書込み・移動・差。
        function iterOrPtrGet(val, s, api, node) {
          if (isIterVal(val)) return iterGet(val, s, api, node);
          if (isPtr(val)) {
            const mem = deref(val, s, api, node, elemTypeOf(node, s)),
              v = mem.values[val.offset];
            if (v?.kind === "uninitialized")
              api.fail("未初期化の配列要素です", node, "未定義動作");
            return v;
          }
          api.fail("イテレータが必要です", node, "CompileError");
        }
        function iterOrPtrSet(val, v, s, api, node) {
          if (isIterVal(val)) return iterSet(val, v, s, api, node);
          if (isPtr(val)) {
            const mem = deref(val, s, api, node, elemTypeOf(node, s));
            mem.values[val.offset] = cast(v, mem.type, s, node, api);
            // スカラー変数を指すポインタ経由の書き込みは変数側にも同期する
            // （既存の参照書き込みと同じ規則）。
            for (const [name, id] of Object.entries(s.addresses))
              if (id === val.object && !String(s.types[name] || "").endsWith("[]"))
                s.vars[name] = mem.values[val.offset];
            return;
          }
          api.fail("イテレータが必要です", node, "CompileError");
        }
        function iterOrPtrAdvance(val, n, s, api, node) {
          if (isIterVal(val)) return iterAdvanceVal(val, n, s, api, node);
          if (isPtr(val)) {
            const mem = s.model.memory[val.object];
            if (!mem || !Number.isInteger(n))
              api.fail("ポインタの移動が不正です", node, "CompileError");
            const off = val.offset + n;
            if (off < 0 || off > mem.values.length)
              api.fail(
                "ポインタの移動が範囲を超えています",
                node,
                "未定義動作",
              );
            return { ...val, offset: off };
          }
          api.fail("イテレータが必要です", node, "CompileError");
        }
        function iterOrPtrDiff(a, b, s, api, node) {
          if (isIterVal(a) && isIterVal(b)) {
            if (!iterSameHost(a, b))
              api.fail(
                "異なるコンテナのイテレータ同士は演算できません",
                node,
                "未定義動作",
              );
            return a.pos - b.pos;
          }
          if (isPtr(a) && isPtr(b)) {
            if (a.object !== b.object)
              api.fail(
                "異なる配列のポインタ同士は演算できません",
                node,
                "未定義動作",
              );
            return a.offset - b.offset;
          }
          api.fail("イテレータ同士の組が必要です", node, "CompileError");
        }
        function iterOrPtrElemSpec(val, s) {
          if (isIterVal(val)) return parseCppTypeText(val.elem);
          if (isPtr(val))
            return parseCppTypeText(s.model.memory[val.object]?.type) ||
              { kind: "scalar", text: s.model.memory[val.object]?.type || "int" };
          return null;
        }
        function makeRange(fv, lv, s, api, node) {
          const size = iterOrPtrDiff(lv, fv, s, api, node);
          if (size < 0)
            api.fail("範囲の終わりが先頭より前にあります", node, "CompileError");
          return {
            size,
            elem: iterOrPtrElemSpec(fv, s),
            first: fv,
            get(k) {
              return iterOrPtrGet(
                iterOrPtrAdvance(fv, k, s, api, node),
                s,
                api,
                node,
              );
            },
            set(k, v) {
              iterOrPtrSet(
                iterOrPtrAdvance(fv, k, s, api, node),
                v,
                s,
                api,
                node,
              );
            },
            values() {
              const out = [];
              for (let k = 0; k < size; k++) out.push(this.get(k));
              return out;
            },
          };
        }
        // --- 呼び出しの結果型（typeOf から使う） ---
        function cppCallType(a, s) {
          const nm = callName(a.target);
          if (a.target?.k === "member") {
            const method = a.target.name,
              ot = typeOf(a.target.target, s),
              ospec = parseCppTypeText(ot);
            const iterNameFor = (m) => {
              const rev = m.startsWith("r") || m.startsWith("cr"),
                cst = m.startsWith("c");
              return rev
                ? cst
                  ? "const_reverse_iterator"
                  : "reverse_iterator"
                : cst
                  ? "const_iterator"
                  : "iterator";
            };
            const ITER_METHOD_NAMES = ["begin", "end", "cbegin", "cend", "rbegin", "rend", "crbegin", "crend"];
            if (ot === "string" && ITER_METHOD_NAMES.includes(method))
              return `string::${iterNameFor(method)}`;
            if (ospec?.kind === "iterator" && method === "base")
              return ospec.text.replace("reverse_iterator", "iterator");
            if (!ospec || !["vector", "array", "pair"].includes(ospec.kind))
              return null;
            if (ospec.kind === "pair") return method === "swap" ? "int" : null;
            if (ITER_METHOD_NAMES.includes(method))
              return `${ospec.text}::${iterNameFor(method)}`;
            if (["at", "front", "back"].includes(method)) return ospec.elem.text;
            if (method === "size" || method === "max_size") return "int";
            if (method === "empty") return "bool";
            if (["insert", "emplace", "erase"].includes(method))
              return `${ospec.text}::iterator`;
            if (method === "emplace_back") return ospec.elem.text;
            return null;
          }
          if (a.target?.k !== "var") return null;
          const t0 = a.args?.length ? typeOf(a.args[0], s) : "int";
          switch (nm) {
            case "make_pair": {
              if (a.args?.length !== 2) return null;
              const norm = (t) => (t === "char[]" ? "string" : t);
              return `pair<${norm(t0)},${norm(typeOf(a.args[1], s))}>`;
            }
            case "minmax":
              return a.args?.length === 2 ? `pair<${t0},${t0}>` : null;
            case "equal_range":
              return a.args?.length === 3 ? `pair<${t0},${t0}>` : null;
            case "mismatch":
              return a.args?.length === 3
                ? `pair<${t0},${typeOf(a.args[2], s)}>`
                : null;
            case "distance":
              return "int";
            case "lower_bound":
            case "upper_bound":
            case "find":
            case "min_element":
            case "max_element":
            case "remove":
            case "unique":
            case "next":
            case "prev":
            case "fill_n":
              return t0;
            case "copy":
            case "copy_n":
            case "partial_sum":
            case "adjacent_difference":
              return a.args?.length >= 3 ? typeOf(a.args[2], s) : null;
            case "clamp":
              return t0;
            case "min":
            case "max": {
              if (a.args?.length === 2) return t0;
              if (a.args?.length === 1 && a.args[0].k === "array" && a.args[0].items?.length)
                return typeOf(a.args[0].items[0], s);
              return t0;
            }
            case "accumulate":
              return a.args?.length >= 3 ? typeOf(a.args[2], s) : null;
            case "inner_product":
              return a.args?.length >= 4 ? typeOf(a.args[3], s) : null;
            case "exchange":
            case "move":
            case "forward":
            case "as_const":
              return t0;
            case "is_sorted":
            case "binary_search":
            case "equal":
            case "lexicographical_compare":
            case "next_permutation":
            case "prev_permutation":
              return "bool";
            case "count":
              return "int";
          }
          return null;
        }
        // --- コンテナのメンバ呼び出し ---
        function cppMemberCall(memberNode, args, s, api, node) {
          const method = memberNode.name,
            objNode = memberNode.target,
            ot = typeOf(objNode, s),
            ospec = parseCppTypeText(ot);
          const ITER_METHODS = ["begin", "end", "cbegin", "cend", "rbegin", "rend", "crbegin", "crend"];
          // std::string のイテレータ取得（イテレータモデル担当分）。
          // 文字列の他のメンバは cpp-engine-a の担当のため素通りする。
          if (ot === "string" && ITER_METHODS.includes(method)) {
            if (args.length !== 0)
              api.fail(`${method} は引数を取りません`, node, "CompileError");
            const strVal = api.read(objNode, s);
            if (isUnknown(strVal))
              return { handled: true, value: unknown("未確定の文字列のイテレータ") };
            if (typeof strVal !== "string") return null;
            const isRev = method.startsWith("r") || method.startsWith("cr");
            const isConst = method.startsWith("c");
            const isEnd = method.includes("end");
            const iterName = isConst
              ? isRev
                ? "const_reverse_iterator"
                : "const_iterator"
              : isRev
                ? "reverse_iterator"
                : "iterator";
            const host =
              objNode.k === "var" && s.types[objNode.name] === "string"
                ? { strVar: objNode.name }
                : { strObj: { str: strVal } };
            return {
              handled: true,
              value: {
                kind: "cpp-iterator",
                ...host,
                pos: isEnd ? strVal.length : 0,
                elem: "char",
                rev: isRev,
                constIt: isConst,
                itype: `string::${iterName}`,
              },
            };
          }
          if (ospec?.kind === "iterator" && method === "base") {
            const itv = api.read(objNode, s);
            if (!isIterVal(itv)) return null;
            if (!itv.rev)
              api.fail("base() は reverse_iterator のメンバです", node, "CompileError");
            const len = iterLen(itv, s, api, node);
            return {
              handled: true,
              value: {
                ...itv,
                rev: false,
                pos: len - itv.pos,
                itype: itv.itype.replace("reverse_iterator", "iterator"),
              },
            };
          }
          if (!ospec || !["vector", "array", "pair"].includes(ospec.kind))
            return null;
          const obj = api.read(objNode, s);
          if (isUnknown(obj))
            return { handled: true, value: unknown(`未確定の対象の ${method}`) };
          if (ospec.kind === "pair") {
            if (!isPairVal(obj)) return null;
            if (method === "swap") {
              if (args.length !== 1)
                api.fail("swap は引数を1つ取ります", node, "CompileError");
              const other = api.read(args[0], s);
              if (!isPairVal(other))
                api.fail("swap の引数は pair です", node, "CompileError");
              const f = obj.first,
                sc = obj.second;
              obj.first = other.first;
              obj.second = other.second;
              other.first = f;
              other.second = sc;
              return { handled: true, value: null };
            }
            return null;
          }
          if (!Array.isArray(obj)) return null;
          const arr = obj,
            elem = ospec.elem,
            isVec = ospec.kind === "vector";
          const iterFor = (pos, rev = false, constIt = false) =>
            makeArrIter(arr, ospec, elem.text, pos, rev, constIt);
          const checkIndex = (iv, allowEnd = false) => {
            if (!Number.isInteger(iv))
              api.fail("添字は整数型でなければなりません", node, "CompileError");
            const hi = allowEnd ? arr.length : arr.length - 1;
            if (iv < 0 || iv > hi)
              api.fail("範囲外の添字です", node, "未定義動作");
          };
          const elemAt = (idx) => {
            const v = arr[idx];
            if (v?.kind === "uninitialized")
              api.fail("未初期化の要素です", node, "未定義動作");
            return v;
          };
          const posIndex = (itv) => {
            if (!isIterVal(itv) || itv.arr !== arr)
              api.fail("別のコンテナのイテレータです", node, "CompileError");
            if (itv.rev)
              api.fail("この操作には通常のイテレータが必要です", node, "未対応");
            return itv.pos;
          };
          switch (method) {
            case "size":
              if (args.length) break;
              return { handled: true, value: arr.length };
            case "max_size":
              if (!isVec && args.length === 0)
                return { handled: true, value: ospec.size };
              return null;
            case "empty":
              if (args.length) break;
              return { handled: true, value: arr.length === 0 };
            case "at": {
              if (args.length !== 1) break;
              const iv = api.read(args[0], s);
              if (!Number.isInteger(iv))
                api.fail("添字は整数型でなければなりません", node, "CompileError");
              if (iv < 0 || iv >= arr.length)
                api.fail(
                  "範囲外の添字です（std::out_of_range が送出されます）",
                  node,
                  "例外",
                );
              return { handled: true, value: elemAt(iv) };
            }
            case "front":
              if (args.length) break;
              if (!arr.length)
                api.fail("空のコンテナに対する front() です", node, "未定義動作");
              return { handled: true, value: elemAt(0) };
            case "back":
              if (args.length) break;
              if (!arr.length)
                api.fail("空のコンテナに対する back() です", node, "未定義動作");
              return { handled: true, value: elemAt(arr.length - 1) };
            case "begin":
            case "cbegin":
            case "rbegin":
            case "crbegin":
              if (args.length) break;
              return {
                handled: true,
                value: iterFor(0, method.includes("rbegin"), method.startsWith("c")),
              };
            case "end":
            case "cend":
            case "rend":
            case "crend":
              if (args.length) break;
              return {
                handled: true,
                value: iterFor(arr.length, method.includes("rend"), method.startsWith("c")),
              };
            case "push_back": {
              if (!isVec) return null;
              if (args.length !== 1) break;
              arr.push(castElem(api.read(args[0], s), elem, s, api, node));
              return { handled: true, value: null };
            }
            case "pop_back": {
              if (!isVec) return null;
              if (args.length) break;
              if (!arr.length)
                api.fail("空の vector に対する pop_back() です", node, "未定義動作");
              arr.pop();
              return { handled: true, value: null };
            }
            case "emplace_back": {
              if (!isVec) return null;
              let v;
              if (args.length === 1)
                v = castElem(api.read(args[0], s), elem, s, api, node);
              else if (elem.kind === "pair" && args.length === 2)
                v = {
                  __pair: true,
                  t1: elem.t1.text,
                  t2: elem.t2.text,
                  first: castElem(api.read(args[0], s), elem.t1, s, api, node),
                  second: castElem(api.read(args[1], s), elem.t2, s, api, node),
                };
              else break;
              arr.push(v);
              return { handled: true, value: arr[arr.length - 1] };
            }
            case "insert": {
              if (!isVec) return null;
              if (args.length < 2 || args.length > 3) break;
              const idx = posIndex(api.read(args[0], s));
              checkIndex(idx, true);
              let vals;
              if (args.length === 2) {
                const v = api.read(args[1], s);
                vals =
                  args[1].k === "array" && Array.isArray(v)
                    ? v.map((e) => castElem(e, elem, s, api, node))
                    : [castElem(v, elem, s, api, node)];
              } else {
                const second = api.read(args[1], s);
                if (isIterVal(second) || isPtr(second)) {
                  const r = makeRange(second, api.read(args[2], s), s, api, node);
                  vals = r.values().map((e) => castElem(e, elem, s, api, node));
                } else {
                  if (!Number.isInteger(second) || second < 0 || second > 10000)
                    api.fail("insert の個数が不正です", node, "CompileError");
                  const v = castElem(api.read(args[2], s), elem, s, api, node);
                  vals = Array.from({ length: second }, () =>
                    castElem(v, elem, s, api, node),
                  );
                }
              }
              arr.splice(idx, 0, ...vals);
              return { handled: true, value: iterFor(idx) };
            }
            case "emplace": {
              if (!isVec) return null;
              if (args.length < 2) break;
              const idx = posIndex(api.read(args[0], s));
              checkIndex(idx, true);
              let v;
              const rest = args.slice(1);
              if (rest.length === 1)
                v = castElem(api.read(rest[0], s), elem, s, api, node);
              else if (elem.kind === "pair" && rest.length === 2)
                v = {
                  __pair: true,
                  t1: elem.t1.text,
                  t2: elem.t2.text,
                  first: castElem(api.read(rest[0], s), elem.t1, s, api, node),
                  second: castElem(api.read(rest[1], s), elem.t2, s, api, node),
                };
              else break;
              arr.splice(idx, 0, v);
              return { handled: true, value: iterFor(idx) };
            }
            case "erase": {
              if (!isVec) return null;
              if (args.length === 1) {
                const idx = posIndex(api.read(args[0], s));
                checkIndex(idx);
                arr.splice(idx, 1);
                return { handled: true, value: iterFor(idx) };
              }
              if (args.length === 2) {
                const i1 = posIndex(api.read(args[0], s)),
                  i2 = posIndex(api.read(args[1], s));
                if (i2 < i1)
                  api.fail("erase の範囲が逆転しています", node, "CompileError");
                arr.splice(i1, i2 - i1);
                return { handled: true, value: iterFor(i1) };
              }
              break;
            }
            case "clear":
              if (!isVec) return null;
              if (args.length) break;
              arr.length = 0;
              return { handled: true, value: null };
            case "resize": {
              if (!isVec) return null;
              if (args.length < 1 || args.length > 2) break;
              const n = api.read(args[0], s);
              if (!Number.isInteger(n) || n < 0 || n > 10000)
                api.fail("resize の要素数が不正です", node, "CompileError");
              const hasVal = args.length === 2,
                rawVal = hasVal ? api.read(args[1], s) : null;
              while (arr.length < n)
                arr.push(
                  hasVal
                    ? castElem(rawVal, elem, s, api, node)
                    : defaultForSpec(elem, s, api, node),
                );
              arr.length = n;
              return { handled: true, value: null };
            }
            case "assign": {
              if (!isVec) return null;
              let vals = null;
              if (args.length === 1 && args[0].k === "array") {
                const v = api.read(args[0], s);
                vals = v.map((e) => castElem(e, elem, s, api, node));
              } else if (args.length === 2) {
                const first = api.read(args[0], s);
                if (isIterVal(first) || isPtr(first)) {
                  const r = makeRange(first, api.read(args[1], s), s, api, node);
                  vals = r.values().map((e) => castElem(e, elem, s, api, node));
                } else if (Number.isInteger(first) && first >= 0 && first <= 10000) {
                  const v = api.read(args[1], s);
                  vals = Array.from({ length: first }, () =>
                    castElem(v, elem, s, api, node),
                  );
                }
              }
              if (!vals) break;
              arr.length = 0;
              arr.push(...vals);
              return { handled: true, value: null };
            }
            case "swap": {
              if (args.length !== 1) break;
              const other = api.read(args[0], s);
              if (!Array.isArray(other))
                api.fail("swap の引数は同じコンテナ型です", node, "CompileError");
              if (other === arr) return { handled: true, value: null };
              const mine = arr.slice(),
                theirs = other.slice();
              arr.length = 0;
              arr.push(...theirs);
              if (["var", "index", "member"].includes(args[0].k))
                api.write(args[0], mine, s, node);
              else {
                other.length = 0;
                other.push(...mine);
              }
              return { handled: true, value: null };
            }
            case "fill": {
              if (isVec) return null;
              if (args.length !== 1) break;
              const raw = api.read(args[0], s);
              for (let k = 0; k < arr.length; k++)
                arr[k] = castElem(raw, elem, s, api, node);
              return { handled: true, value: null };
            }
            case "reserve": {
              if (!isVec) return null;
              if (args.length !== 1) break;
              api.read(args[0], s); // 容量予約はモデルの動作に影響しない
              return { handled: true, value: null };
            }
            case "shrink_to_fit":
              if (!isVec) return null;
              if (args.length) break;
              return { handled: true, value: null };
          }
          // 引数の個数が合わないメンバ呼び出しは、個数を名指して止める。
          if (
            ["size", "empty", "at", "front", "back", "begin", "cbegin", "end", "cend", "rbegin", "crbegin", "rend", "crend", "push_back", "pop_back", "clear", "fill", "swap", "reserve", "shrink_to_fit"].includes(method)
          )
            api.fail(`${method} の引数の数が違います`, node, "CompileError");
          return null;
        }
        // --- <algorithm>／<numeric>／<utility>／<iterator> の自由関数 ---
        function cppCall(name, args, s, api, node) {
          if (node?.target?.k === "member") return cppMemberCall(node.target, args, s, api, node);
          if (node?.target?.k !== "var") return null;
          const R = (a) => api.read(a, s),
            H = (value) => ({ handled: true, value }),
            arity = (ns) => {
              if (!ns.includes(args.length))
                api.fail(`${name} の引数の数が違います`, node, "CompileError");
            },
            noComp = () =>
              api.fail("比較関数や演算を指定する形式は未対応です", node, "未対応"),
            range2 = () => makeRange(R(args[0]), R(args[1]), s, api, node),
            cmpOp = (op, c) =>
              op === "==" ? c === 0 : op === "!=" ? c !== 0 : op === "<" ? c < 0 : op === "<=" ? c <= 0 : op === ">" ? c > 0 : c >= 0;
          switch (name) {
            case "swap": {
              arity([2]);
              if (!["var", "index", "member"].includes(args[0].k) || !["var", "index", "member"].includes(args[1].k))
                api.fail("swap の引数は左辺値が必要です", node, "CompileError");
              const va = R(args[0]),
                vb = R(args[1]);
              api.write(args[0], vb, s, node);
              api.write(args[1], va, s, node);
              return H(null);
            }
            case "exchange": {
              arity([2]);
              if (!["var", "index", "member"].includes(args[0].k))
                api.fail("exchange の第1引数は左辺値が必要です", node, "CompileError");
              const old = R(args[0]);
              api.write(args[0], R(args[1]), s, node);
              return H(old);
            }
            case "move":
            case "forward":
            case "as_const":
              arity([1]);
              return H(R(args[0]));
            case "make_pair": {
              arity([2]);
              const v1 = R(args[0]),
                v2 = R(args[1]);
              const norm = (t, v) => (t === "char[]" && typeof v === "string" ? "string" : t);
              return H({
                __pair: true,
                t1: norm(typeOf(args[0], s), v1),
                t2: norm(typeOf(args[1], s), v2),
                first: v1,
                second: v2,
              });
            }
            case "distance":
              arity([2]);
              return H(iterOrPtrDiff(R(args[1]), R(args[0]), s, api, node));
            case "advance": {
              arity([2]);
              if (!["var", "index", "member"].includes(args[0].k))
                api.fail("advance の第1引数は左辺値が必要です", node, "CompileError");
              const cur = R(args[0]),
                nv = iterOrPtrAdvance(cur, R(args[1]), s, api, node);
              api.write(args[0], nv, s, node);
              return H(null);
            }
            case "next":
            case "prev": {
              arity([1, 2]);
              const n = args.length === 2 ? R(args[1]) : 1;
              return H(
                iterOrPtrAdvance(R(args[0]), name === "next" ? n : -n, s, api, node),
              );
            }
            case "sort":
            case "stable_sort": {
              arity([2, 3]);
              if (args.length === 3) noComp();
              const r = range2(),
                vals = r.values();
              vals.sort((x, y) => compareElems(x, y, r.elem, s, api, node));
              for (let k = 0; k < vals.length; k++) r.set(k, vals[k]);
              return H(null);
            }
            case "reverse": {
              arity([2]);
              const r = range2(),
                vals = r.values().reverse();
              for (let k = 0; k < vals.length; k++) r.set(k, vals[k]);
              return H(null);
            }
            case "fill": {
              arity([3]);
              const r = range2(),
                v = R(args[2]);
              for (let k = 0; k < r.size; k++)
                r.set(k, r.elem ? castElem(v, r.elem, s, api, node) : v);
              return H(null);
            }
            case "fill_n": {
              arity([3]);
              const first = R(args[0]),
                n = R(args[1]),
                v = R(args[2]);
              if (!Number.isInteger(n) || n < 0)
                api.fail("fill_n の個数が不正です", node, "CompileError");
              const spec = iterOrPtrElemSpec(first, s);
              for (let k = 0; k < n; k++)
                iterOrPtrSet(
                  iterOrPtrAdvance(first, k, s, api, node),
                  spec ? castElem(v, spec, s, api, node) : v,
                  s,
                  api,
                  node,
                );
              return H(iterOrPtrAdvance(first, n, s, api, node));
            }
            case "find": {
              arity([3]);
              const r = range2(),
                v = R(args[2]);
              for (let k = 0; k < r.size; k++)
                if (compareElems(r.get(k), v, r.elem, s, api, node) === 0)
                  return H(iterOrPtrAdvance(r.first, k, s, api, node));
              return H(R(args[1]));
            }
            case "count": {
              arity([3]);
              const r = range2(),
                v = R(args[2]);
              let c = 0;
              for (let k = 0; k < r.size; k++)
                if (compareElems(r.get(k), v, r.elem, s, api, node) === 0) c++;
              return H(c);
            }
            case "min":
            case "max": {
              arity([1, 2]);
              if (args.length === 2) {
                const a = R(args[0]),
                  b = R(args[1]),
                  c = compareElems(a, b, null, s, api, node);
                return H(name === "min" ? (c <= 0 ? a : b) : c >= 0 ? a : b);
              }
              const list = R(args[0]);
              if (!Array.isArray(list) || !list.length)
                api.fail(`${name} の初期化子リストが空か、形式が違います`, node, "CompileError");
              let best = list[0];
              for (const v of list.slice(1)) {
                const c = compareElems(v, best, null, s, api, node);
                if (name === "min" ? c < 0 : c > 0) best = v;
              }
              return H(best);
            }
            case "minmax": {
              arity([2]);
              const a = R(args[0]),
                b = R(args[1]),
                c = compareElems(a, b, null, s, api, node),
                t = typeOf(args[0], s);
              return H({
                __pair: true,
                t1: t,
                t2: t,
                first: c <= 0 ? a : b,
                second: c <= 0 ? b : a,
              });
            }
            case "clamp": {
              arity([3]);
              const v = R(args[0]),
                lo = R(args[1]),
                hi = R(args[2]);
              if (compareElems(v, lo, null, s, api, node) < 0) return H(lo);
              if (compareElems(hi, v, null, s, api, node) < 0) return H(hi);
              return H(v);
            }
            case "iter_swap": {
              arity([2]);
              const a = R(args[0]),
                b = R(args[1]),
                va = iterOrPtrGet(a, s, api, node),
                vb = iterOrPtrGet(b, s, api, node);
              iterOrPtrSet(a, vb, s, api, node);
              iterOrPtrSet(b, va, s, api, node);
              return H(null);
            }
            case "rotate": {
              arity([3]);
              const f = R(args[0]),
                m = R(args[1]),
                l = R(args[2]),
                r = makeRange(f, l, s, api, node),
                mid = iterOrPtrDiff(m, f, s, api, node),
                vals = r.values(),
                out = [...vals.slice(mid), ...vals.slice(0, mid)];
              for (let k = 0; k < out.length; k++) r.set(k, out[k]);
              return H(iterOrPtrAdvance(f, r.size - mid, s, api, node));
            }
            case "binary_search": {
              arity([3]);
              const r = range2(),
                v = R(args[2]);
              let lo = 0,
                hi = r.size;
              while (lo < hi) {
                const mid = (lo + hi) >> 1,
                  c = compareElems(r.get(mid), v, r.elem, s, api, node);
                if (c === 0) return H(true);
                if (c < 0) lo = mid + 1;
                else hi = mid;
              }
              return H(false);
            }
            case "lower_bound":
            case "upper_bound": {
              arity([3]);
              const r = range2(),
                v = R(args[2]);
              let lo = 0,
                hi = r.size;
              while (lo < hi) {
                const mid = (lo + hi) >> 1,
                  c = compareElems(r.get(mid), v, r.elem, s, api, node);
                if (name === "lower_bound" ? c < 0 : c <= 0) lo = mid + 1;
                else hi = mid;
              }
              return H(iterOrPtrAdvance(r.first, lo, s, api, node));
            }
            case "equal_range": {
              arity([3]);
              const lo = cppCall("lower_bound", args, s, api, node).value,
                hi = cppCall("upper_bound", args, s, api, node).value,
                t = typeOf(args[0], s);
              return H({ __pair: true, t1: t, t2: t, first: lo, second: hi });
            }
            case "equal": {
              arity([3, 4]);
              const r1 = range2(),
                f2 = R(args[2]);
              if (args.length === 4) {
                const r2 = makeRange(f2, R(args[3]), s, api, node);
                if (r2.size !== r1.size) return H(false);
                for (let k = 0; k < r1.size; k++)
                  if (compareElems(r1.get(k), r2.get(k), r1.elem, s, api, node) !== 0)
                    return H(false);
                return H(true);
              }
              for (let k = 0; k < r1.size; k++)
                if (
                  compareElems(
                    r1.get(k),
                    iterOrPtrGet(iterOrPtrAdvance(f2, k, s, api, node), s, api, node),
                    r1.elem,
                    s,
                    api,
                    node,
                  ) !== 0
                )
                  return H(false);
              return H(true);
            }
            case "mismatch": {
              arity([3]);
              const r1 = range2(),
                f2 = R(args[2]),
                t = typeOf(args[0], s);
              let k = 0;
              while (
                k < r1.size &&
                compareElems(
                  r1.get(k),
                  iterOrPtrGet(iterOrPtrAdvance(f2, k, s, api, node), s, api, node),
                  r1.elem,
                  s,
                  api,
                  node,
                ) === 0
              )
                k++;
              return H({
                __pair: true,
                t1: t,
                t2: typeOf(args[2], s),
                first: iterOrPtrAdvance(r1.first, k, s, api, node),
                second: iterOrPtrAdvance(f2, k, s, api, node),
              });
            }
            case "is_sorted": {
              arity([2]);
              const r = range2();
              for (let k = 1; k < r.size; k++)
                if (compareElems(r.get(k), r.get(k - 1), r.elem, s, api, node) < 0)
                  return H(false);
              return H(true);
            }
            case "nth_element": {
              arity([3]);
              const f = R(args[0]),
                nth = R(args[1]),
                r = makeRange(f, R(args[2]), s, api, node),
                ni = iterOrPtrDiff(nth, f, s, api, node),
                vals = r.values();
              if (ni < 0 || ni >= vals.length)
                api.fail("nth_element の位置が範囲外です", node, "未定義動作");
              const sorted = [...vals].sort((x, y) =>
                compareElems(x, y, r.elem, s, api, node),
              );
              const out = [
                ...sorted.slice(0, ni),
                sorted[ni],
                ...sorted.slice(ni + 1),
              ];
              for (let k = 0; k < out.length; k++) r.set(k, out[k]);
              return H(null);
            }
            case "partial_sort": {
              arity([3]);
              const f = R(args[0]),
                m = R(args[1]),
                r = makeRange(f, R(args[2]), s, api, node),
                mi = iterOrPtrDiff(m, f, s, api, node),
                vals = r.values(),
                sorted = [...vals].sort((x, y) =>
                  compareElems(x, y, r.elem, s, api, node),
                );
              for (let k = 0; k < vals.length; k++) r.set(k, sorted[k]);
              void mi;
              return H(null);
            }
            case "copy": {
              arity([3]);
              const r = range2(),
                out = R(args[2]);
              for (let k = 0; k < r.size; k++)
                iterOrPtrSet(
                  iterOrPtrAdvance(out, k, s, api, node),
                  r.get(k),
                  s,
                  api,
                  node,
                );
              return H(iterOrPtrAdvance(out, r.size, s, api, node));
            }
            case "copy_n": {
              arity([3]);
              const f = R(args[0]),
                n = R(args[1]),
                out = R(args[2]);
              if (!Number.isInteger(n) || n < 0)
                api.fail("copy_n の個数が不正です", node, "CompileError");
              for (let k = 0; k < n; k++)
                iterOrPtrSet(
                  iterOrPtrAdvance(out, k, s, api, node),
                  iterOrPtrGet(iterOrPtrAdvance(f, k, s, api, node), s, api, node),
                  s,
                  api,
                  node,
                );
              return H(iterOrPtrAdvance(out, n, s, api, node));
            }
            case "min_element":
            case "max_element": {
              arity([2]);
              const r = range2();
              if (!r.size) return H(R(args[1]));
              let bi = 0;
              for (let k = 1; k < r.size; k++) {
                const c = compareElems(r.get(k), r.get(bi), r.elem, s, api, node);
                if (name === "min_element" ? c < 0 : c > 0) bi = k;
              }
              return H(iterOrPtrAdvance(r.first, bi, s, api, node));
            }
            case "lexicographical_compare": {
              arity([4]);
              const r1 = makeRange(R(args[0]), R(args[1]), s, api, node),
                r2 = makeRange(R(args[2]), R(args[3]), s, api, node),
                n = Math.min(r1.size, r2.size);
              for (let k = 0; k < n; k++) {
                const c = compareElems(r1.get(k), r2.get(k), r1.elem, s, api, node);
                if (c !== 0) return H(c < 0);
              }
              return H(r1.size < r2.size);
            }
            case "next_permutation":
            case "prev_permutation": {
              arity([2]);
              const r = range2(),
                vals = r.values(),
                dir = name === "next_permutation" ? 1 : -1;
              let i = vals.length - 2;
              while (
                i >= 0 &&
                compareElems(vals[i], vals[i + 1], r.elem, s, api, node) * dir >= 0
              )
                i--;
              if (i < 0) {
                const sorted = [...vals].sort((x, y) =>
                  compareElems(x, y, r.elem, s, api, node),
                );
                const fin = dir > 0 ? sorted : [...sorted].reverse();
                for (let k = 0; k < fin.length; k++) r.set(k, fin[k]);
                return H(false);
              }
              let j = vals.length - 1;
              while (
                compareElems(vals[j], vals[i], r.elem, s, api, node) * dir <= 0
              )
                j--;
              [vals[i], vals[j]] = [vals[j], vals[i]];
              const tail = vals.splice(i + 1).reverse();
              const out = [...vals, ...tail];
              for (let k = 0; k < out.length; k++) r.set(k, out[k]);
              return H(true);
            }
            case "remove": {
              arity([3]);
              const r = range2(),
                v = R(args[2]),
                vals = r.values(),
                kept = vals.filter(
                  (x) => compareElems(x, v, r.elem, s, api, node) !== 0,
                );
              for (let k = 0; k < kept.length; k++) r.set(k, kept[k]);
              return H(iterOrPtrAdvance(r.first, kept.length, s, api, node));
            }
            case "replace": {
              arity([4]);
              const r = range2(),
                oldV = R(args[2]),
                newV = R(args[3]);
              for (let k = 0; k < r.size; k++)
                if (compareElems(r.get(k), oldV, r.elem, s, api, node) === 0)
                  r.set(k, r.elem ? castElem(newV, r.elem, s, api, node) : newV);
              return H(null);
            }
            case "unique": {
              arity([2]);
              const r = range2(),
                vals = r.values(),
                kept = vals.filter(
                  (x, k) =>
                    k === 0 ||
                    compareElems(x, vals[k - 1], r.elem, s, api, node) !== 0,
                );
              for (let k = 0; k < kept.length; k++) r.set(k, kept[k]);
              return H(iterOrPtrAdvance(r.first, kept.length, s, api, node));
            }
            case "accumulate": {
              arity([3, 4]);
              if (args.length === 4) noComp();
              const r = range2();
              let acc = R(args[2]);
              for (let k = 0; k < r.size; k++)
                acc = binaryOpVal("+", acc, r.get(k), s, api, node);
              return H(acc);
            }
            case "inner_product": {
              arity([4, 5, 6]);
              if (args.length > 4) noComp();
              const r = makeRange(R(args[0]), R(args[1]), s, api, node),
                f2 = R(args[2]);
              let acc = R(args[3]);
              for (let k = 0; k < r.size; k++) {
                const prod = binaryOpVal(
                  "*",
                  r.get(k),
                  iterOrPtrGet(iterOrPtrAdvance(f2, k, s, api, node), s, api, node),
                  s,
                  api,
                  node,
                );
                acc = binaryOpVal("+", acc, prod, s, api, node);
              }
              return H(acc);
            }
            case "iota": {
              arity([3]);
              const r = range2();
              let v = R(args[2]);
              for (let k = 0; k < r.size; k++) {
                r.set(k, r.elem ? castElem(v, r.elem, s, api, node) : v);
                v = binaryOpVal("+", v, 1, s, api, node);
              }
              return H(null);
            }
            case "partial_sum": {
              arity([3, 4]);
              if (args.length === 4) noComp();
              const r = range2(),
                out = R(args[2]),
                vals = r.values();
              let acc = null;
              for (let k = 0; k < vals.length; k++) {
                acc = k === 0 ? vals[0] : binaryOpVal("+", acc, vals[k], s, api, node);
                iterOrPtrSet(iterOrPtrAdvance(out, k, s, api, node), acc, s, api, node);
              }
              return H(iterOrPtrAdvance(out, vals.length, s, api, node));
            }
            case "adjacent_difference": {
              arity([3, 4]);
              if (args.length === 4) noComp();
              const r = range2(),
                out = R(args[2]),
                vals = r.values();
              for (let k = 0; k < vals.length; k++) {
                const v =
                  k === 0 ? vals[0] : binaryOpVal("-", vals[k], vals[k - 1], s, api, node);
                iterOrPtrSet(iterOrPtrAdvance(out, k, s, api, node), v, s, api, node);
              }
              return H(iterOrPtrAdvance(out, vals.length, s, api, node));
            }
          }
          return null;
        }
        // at()／front()／back() の戻り参照を添字ノードへ書き換える。
        function cppRefTarget(t) {
          if (!t || t.k !== "call" || t.target?.k !== "member") return t;
          const m = t.target.name,
            obj = t.target.target;
          if (m === "at" && t.args?.length === 1)
            return { k: "index", target: obj, indexes: [t.args[0]], viaAt: true, line: t.line };
          if (m === "front" && !t.args?.length)
            return { k: "index", target: obj, indexes: [{ k: "literal", value: 0, raw: "0", line: t.line }], line: t.line };
          if (m === "back" && !t.args?.length)
            return {
              k: "index",
              target: obj,
              indexes: [
                {
                  k: "binary",
                  op: "-",
                  a: { k: "call", target: { k: "member", target: obj, name: "size", line: t.line }, args: [], line: t.line },
                  b: { k: "literal", value: 1, raw: "1", line: t.line },
                  line: t.line,
                },
              ],
              line: t.line,
            };
          return t;
        }
        // --- 読み取り（添字／メンバ／逆参照） ---
        function cppRead(a, s, api) {
          if (a.k === "index") {
            const sp = parseCppTypeText(typeOf(a.target, s));
            if (sp && (["vector", "array"].includes(sp.kind) || sp.kind === "iterator")) {
              const target = api.read(a.target, s);
              if (isUnknown(target))
                return { handled: true, value: unknown("未確定の値の要素") };
              const index = api.read(a.indexes[0], s);
              if (isUnknown(index))
                api.fail("未確定の添字による参照は未対応です", a, "未対応");
              let iv = index;
              if (typeof iv === "boolean") iv = Number(iv);
              if (typeof iv === "string" && iv.length === 1) iv = iv.charCodeAt(0);
              if (!Number.isInteger(iv))
                api.fail("添字は整数型でなければなりません", a, "CompileError");
              if (isIterVal(target))
                return {
                  handled: true,
                  value: iterGet(iterAdvanceVal(target, iv, s, api, a), s, api, a),
                };
              if (Array.isArray(target)) {
                if (iv < 0 || iv >= target.length)
                  api.fail("範囲外の添字です", a, "未定義動作");
                const v = target[iv];
                if (v?.kind === "uninitialized")
                  api.fail("未初期化の要素です", a, "未定義動作");
                return { handled: true, value: v };
              }
            }
            return null;
          }
          if (a.k === "member") {
            const sp = parseCppTypeText(typeOf(a.target, s));
            if (sp?.kind === "pair") {
              const obj = api.read(a.target, s);
              if (isUnknown(obj))
                return { handled: true, value: unknown(`未確定の対象の ${a.name}`) };
              if (!isPairVal(obj)) return null;
              if (a.name === "first" || a.name === "second")
                return { handled: true, value: obj[a.name] };
              api.fail("フィールドがありません：" + a.name, a, "CompileError");
            }
            if (sp?.kind === "iterator") {
              const itv = api.read(a.target, s);
              if (!isIterVal(itv)) return null;
              const el = iterGet(itv, s, api, a);
              if (isPairVal(el)) {
                if (a.name === "first" || a.name === "second")
                  return { handled: true, value: el[a.name] };
                api.fail("フィールドがありません：" + a.name, a, "CompileError");
              }
              api.fail(
                "イテレータの指す要素にそのメンバはありません：" + a.name,
                a,
                "CompileError",
              );
            }
            return null;
          }
          if (a.k === "unary" && a.op === "*") {
            if (parseCppTypeText(typeOf(a.arg, s))?.kind === "iterator") {
              const v = api.read(a.arg, s);
              if (isIterVal(v)) return { handled: true, value: iterGet(v, s, api, a) };
            }
            return null;
          }
          if (a.k === "unary" && a.op === "&") {
            const inner = a.arg;
            if (inner?.k === "index") {
              const sp = parseCppTypeText(typeOf(inner.target, s));
              if (sp && ["vector", "array", "iterator"].includes(sp.kind))
                api.fail("コンテナ要素へのポインタは未対応です", a, "未対応");
            }
            if (inner?.k === "unary" && inner.op === "*") {
              if (parseCppTypeText(typeOf(inner.arg, s))?.kind === "iterator")
                api.fail(
                  "イテレータの指す要素へのポインタは未対応です",
                  a,
                  "未対応",
                );
            }
            return null;
          }
          return null;
        }
        // --- 書き込み（変数／添字／メンバ／逆参照） ---
        function cppWrite(a, v, s, api, node) {
          if (a.k === "var") {
            const type = s.types[a.name];
            if (type === undefined) return false;
            const sp = parseCppTypeText(type);
            if (!sp) return false;
            if (sp.kind === "vector" || sp.kind === "array") {
              const nv = castElem(v, finalizeCppSpec(sp, s, api, node), s, api, node);
              s.vars[a.name] = nv;
              const id = s.addresses[a.name];
              if (id && s.model.memory[id]) s.model.memory[id].values[0] = nv;
              return true;
            }
            if (sp.kind === "pair") {
              const nv = castElem(v, sp, s, api, node);
              s.vars[a.name] = nv;
              const id = s.addresses[a.name];
              if (id && s.model.memory[id]) s.model.memory[id].values[0] = nv;
              return true;
            }
            if (sp.kind === "iterator") {
              if (!isIterVal(v))
                api.fail("イテレータの値が必要です", node, "CompileError");
              s.vars[a.name] = v;
              const id = s.addresses[a.name];
              if (id && s.model.memory[id]) s.model.memory[id].values[0] = v;
              return true;
            }
            return false;
          }
          if (a.k === "index") {
            const sp = parseCppTypeText(typeOf(a.target, s));
            if (!sp || !(["vector", "array"].includes(sp.kind) || sp.kind === "iterator"))
              return false;
            const target = api.read(a.target, s);
            const index = api.read(a.indexes[0], s);
            if (!Number.isInteger(index))
              api.fail("添字は整数型でなければなりません", node, "CompileError");
            if (isIterVal(target)) {
              iterSet(iterAdvanceVal(target, index, s, api, node), v, s, api, node);
              return true;
            }
            if (Array.isArray(target)) {
              if (index < 0 || index >= target.length)
                api.fail(
                  a.viaAt
                    ? "範囲外の添字です（std::out_of_range が送出されます）"
                    : "範囲外の添字への書き込みです",
                  node,
                  a.viaAt ? "例外" : "未定義動作",
                );
              target[index] = castElem(v, sp.kind === "iterator" ? null : sp.elem, s, api, node);
              return true;
            }
            return false;
          }
          if (a.k === "member") {
            const sp = parseCppTypeText(typeOf(a.target, s));
            if (sp?.kind === "pair") {
              const obj = api.read(a.target, s);
              if (!isPairVal(obj)) return false;
              if (a.name === "first") obj.first = castElem(v, sp.t1, s, api, node);
              else if (a.name === "second") obj.second = castElem(v, sp.t2, s, api, node);
              else api.fail("フィールドがありません：" + a.name, node, "CompileError");
              return true;
            }
            if (sp?.kind === "iterator") {
              const itv = api.read(a.target, s);
              if (!isIterVal(itv)) return false;
              const el = iterGet(itv, s, api, node);
              if (!isPairVal(el)) return false;
              const esp = parseCppTypeText(el.t1 ? `pair<${el.t1},${el.t2}>` : "");
              if (a.name === "first")
                el.first = esp ? castElem(v, esp.t1, s, api, node) : v;
              else if (a.name === "second")
                el.second = esp ? castElem(v, esp.t2, s, api, node) : v;
              else api.fail("フィールドがありません：" + a.name, node, "CompileError");
              return true;
            }
            return false;
          }
          if (a.k === "unary" && a.op === "*") {
            if (parseCppTypeText(typeOf(a.arg, s))?.kind === "iterator") {
              const ptr = api.read(a.arg, s);
              if (isIterVal(ptr)) {
                iterSet(ptr, v, s, api, node);
                return true;
              }
            }
            return false;
          }
          return false;
        }
        // --- 二項演算（イテレータ演算と比較） ---
        function cppBinary(op, a, b, node, s, api, lt, rt) {
          if (isIterVal(a) || isIterVal(b)) {
            if (op === "+") {
              if (isIterVal(a) && typeof b === "number")
                return { value: iterAdvanceVal(a, b, s, api, node) };
              if (typeof a === "number" && isIterVal(b))
                return { value: iterAdvanceVal(b, a, s, api, node) };
              api.fail("イテレータと加算できるのは整数だけです", node, "CompileError");
            }
            if (op === "-") {
              if (isIterVal(a) && isIterVal(b)) {
                if (!iterSameHost(a, b))
                  api.fail(
                    "異なるコンテナのイテレータ同士は演算できません",
                    node,
                    "未定義動作",
                  );
                return { value: a.pos - b.pos };
              }
              if (isIterVal(a) && typeof b === "number")
                return { value: iterAdvanceVal(a, -b, s, api, node) };
              api.fail("イテレータの減算の形式が違います", node, "CompileError");
            }
            if (["==", "!=", "<", "<=", ">", ">="].includes(op)) {
              if (!isIterVal(a) || !isIterVal(b))
                api.fail(
                  "イテレータと比較できるのはイテレータだけです",
                  node,
                  "CompileError",
                );
              if (!iterSameHost(a, b))
                api.fail(
                  "異なるコンテナのイテレータ同士は比較できません",
                  node,
                  "未定義動作",
                );
              const d = a.pos - b.pos;
              return {
                value:
                  op === "==" ? d === 0 : op === "!=" ? d !== 0 : op === "<" ? d < 0 : op === "<=" ? d <= 0 : op === ">" ? d > 0 : d >= 0,
              };
            }
            api.fail("このイテレータ演算は未対応です", node, "未対応");
          }
          if (["==", "!=", "<", "<=", ">", ">="].includes(op)) {
            const lsp = parseCppTypeText(lt),
              rsp = parseCppTypeText(rt);
            const lCont = lsp && ["vector", "array", "pair"].includes(lsp.kind),
              rCont = rsp && ["vector", "array", "pair"].includes(rsp.kind);
            if (lCont || rCont) {
              if (!lCont || !rCont || lsp.kind !== rsp.kind)
                api.fail(
                  `型が一致しません：${lt} と ${rt} は比較できません`,
                  node,
                  "CompileError",
                );
              const c = compareElems(a, b, lsp, s, api, node);
              return {
                value:
                  op === "==" ? c === 0 : op === "!=" ? c !== 0 : op === "<" ? c < 0 : op === "<=" ? c <= 0 : op === ">" ? c > 0 : c >= 0,
              };
            }
            if ((isPairVal(a) || isPairVal(b)) && !(isPairVal(a) && isPairVal(b)))
              api.fail("pair と比較できるのは pair だけです", node, "CompileError");
            if (isPairVal(a) && isPairVal(b)) {
              const c = compareElems(a, b, null, s, api, node);
              return {
                value:
                  op === "==" ? c === 0 : op === "!=" ? c !== 0 : op === "<" ? c < 0 : op === "<=" ? c <= 0 : op === ">" ? c > 0 : c >= 0,
              };
            }
          }
          return null;
        }
        // --- 宣言の実行 ---
        function cppDeclare(n, s, api) {
          if (Object.hasOwn(s.types, n.name))
            api.fail(
              `同じスコープで名前が重複しています：${n.name}`,
              n,
              "SyntaxError",
            );
          const spec = finalizeCppSpec(n.cppSpec, s, api, n);
          // 初期化子の中の自己参照は未初期化として扱う（RG-06 と同じ）。
          s.vars[n.name] = uninitialized;
          s.types[n.name] = spec.text;
          const finish = (v, typeText) => {
            s.vars[n.name] = v;
            s.types[n.name] = typeText;
            allocate(s, n.name, [v], typeText);
            api.note(
              s,
              n,
              `${n.name} を ${typeText} として用意します：${fmtFor(v, typeText)}`,
            );
            return [s];
          };
          if (spec.kind === "auto") {
            if (!n.value && !n.initArgs)
              api.fail("auto には初期化子が必要です", n, "CompileError");
            const srcNode = n.initArgs ? n.initArgs[0] : n.value;
            if (n.initArgs && n.initArgs.length !== 1)
              api.fail("auto の初期化子は1つだけです", n, "CompileError");
            const v = api.read(srcNode, s);
            if (isIterVal(v)) return finish(v, v.itype);
            if (isPairVal(v)) {
              const ps = parseCppTypeText(`pair<${v.t1},${v.t2}>`);
              return finish(castElem(v, ps, s, api, n), ps.text);
            }
            if (Array.isArray(v)) {
              const ss = parseCppTypeText(typeOf(srcNode, s));
              if (ss && ["vector", "array"].includes(ss.kind))
                return finish(castElem(v, ss, s, api, n), ss.text);
              api.fail(
                "auto の型推論はコンテナ・イテレータ・pair の初期化子だけ対応します",
                n,
                "未対応",
              );
            }
            // スカラーの auto 推論は従来どおり未対応（監査テストで確定済みの
            // 境界）。推論できるのはコンテナ・イテレータ・pair の初期化子だけ。
            api.fail(
              "auto の型推論はコンテナ・イテレータ・pair の初期化子だけ対応します（スカラーは未対応です）",
              n,
              "未対応",
            );
          }
          if (spec.kind === "iterator") {
            let v;
            if (n.initArgs) {
              if (n.initArgs.length !== 1)
                api.fail("イテレータの初期化子は1つだけです", n, "CompileError");
              v = api.read(n.initArgs[0], s);
            } else if (n.value) v = api.read(n.value, s);
            else v = defaultForSpec(spec, s, api, n);
            if (!isIterVal(v))
              api.fail("イテレータで初期化してください", n, "CompileError");
            const hostElem =
              spec.host.kind === "scalar" ? "char" : spec.host.elem?.text;
            if (!v.singular && hostElem && v.elem !== hostElem)
              api.fail("イテレータの要素型が一致しません", n, "CompileError");
            if (!v.singular && !!spec.rev !== !!v.rev)
              api.fail("イテレータの種類（通常／逆向き）が一致しません", n, "CompileError");
            if (!v.singular && !spec.constIt && v.constIt)
              api.fail(
                "const イテレータを通常のイテレータへ変換できません",
                n,
                "CompileError",
              );
            return finish(v, spec.text);
          }
          if (spec.kind === "pair" || spec.kind === "vector" || spec.kind === "array") {
            let v;
            if (n.bracedInit) {
              const raw = api.read(n.value, s);
              if (!Array.isArray(raw))
                api.fail("初期化子リストが必要です", n, "CompileError");
              if (spec.kind === "pair") {
                if (raw.length === 0) v = defaultForSpec(spec, s, api, n);
                else if (raw.length !== 2)
                  api.fail("pair の初期化子は2要素です", n, "CompileError");
                else
                  v = {
                    __pair: true,
                    t1: spec.t1.text,
                    t2: spec.t2.text,
                    first: castElem(raw[0], spec.t1, s, api, n),
                    second: castElem(raw[1], spec.t2, s, api, n),
                  };
              } else v = castElem(raw, spec, s, api, n);
            } else if (n.initArgs) {
              v = buildFromArgs(n.initArgs, spec, s, api, n);
            } else if (n.value) {
              v = castElem(api.read(n.value, s), spec, s, api, n);
            } else if (spec.kind === "vector") v = [];
            else if (spec.kind === "pair") v = defaultForSpec(spec, s, api, n);
            else
              v = Array.from({ length: spec.size }, () =>
                spec.elem.kind === "scalar"
                  ? spec.elem.text === "string"
                    ? ""
                    : uninitialized
                  : defaultForSpec(spec.elem, s, api, n),
              );
            return finish(v, spec.text);
          }
          return null;
        }
        function buildFromArgs(argNodes, spec, s, api, n) {
          const R = (a) => api.read(a, s);
          if (spec.kind === "pair") {
            if (argNodes.length === 0) return defaultForSpec(spec, s, api, n);
            if (argNodes.length === 2)
              return {
                __pair: true,
                t1: spec.t1.text,
                t2: spec.t2.text,
                first: castElem(R(argNodes[0]), spec.t1, s, api, n),
                second: castElem(R(argNodes[1]), spec.t2, s, api, n),
              };
            if (argNodes.length === 1) return castElem(R(argNodes[0]), spec, s, api, n);
            api.fail("pair のコンストラクタの引数の数が違います", n, "CompileError");
          }
          if (spec.kind === "array")
            api.fail(
              "std::array は ( ) による初期化はできません（{ } を使ってください）",
              n,
              "CompileError",
            );
          // vector
          if (argNodes.length === 0) return [];
          if (argNodes.length === 1) {
            const v = R(argNodes[0]);
            if (isIterVal(v) || isPtr(v))
              api.fail("vector の範囲コンストラクタには2つのイテレータが必要です", n, "CompileError");
            if (Array.isArray(v) || isPairVal(v))
              return castElem(v, spec, s, api, n);
            if (typeof v === "number") {
              if (!Number.isInteger(v) || v < 0 || v > 10000)
                api.fail("vector の要素数が不正です", n, "CompileError");
              return Array.from({ length: v }, () =>
                defaultForSpec(spec.elem, s, api, n),
              );
            }
            api.fail("vector のコンストラクタの形式は未対応です", n, "未対応");
          }
          if (argNodes.length === 2) {
            const a = R(argNodes[0]);
            if (isIterVal(a) || isPtr(a)) {
              const r = makeRange(a, R(argNodes[1]), s, api, n);
              return r.values().map((e) => castElem(e, spec.elem, s, api, n));
            }
            if (typeof a === "number") {
              if (!Number.isInteger(a) || a < 0 || a > 10000)
                api.fail("vector の要素数が不正です", n, "CompileError");
              const raw = R(argNodes[1]);
              return Array.from({ length: a }, () =>
                castElem(raw, spec.elem, s, api, n),
              );
            }
            api.fail("vector のコンストラクタの形式は未対応です", n, "未対応");
          }
          api.fail("vector のコンストラクタの引数が多すぎます", n, "CompileError");
        }
        // --- 範囲 for の実行（参照書き戻しを含む専用ループ） ---
        function cppRangeFor(n, s, api) {
          const collNode = n.collection,
            collVal = api.read(collNode, s);
          if (isUnknown(collVal))
            api.fail("未確定または配列でない繰り返し対象", n, "未対応");
          const collSpec = parseCppTypeText(typeOf(collNode, s));
          let elems = null,
            elemSpec = null,
            writeBackHost = null; // (state, i, castedValue) => void
          if (
            Array.isArray(collVal) &&
            collSpec &&
            ["vector", "array"].includes(collSpec.kind)
          ) {
            elemSpec = collSpec.elem;
            elems = collVal.slice();
            writeBackHost = (st, i2, v2) => {
              const hv = api.read(collNode, st);
              if (Array.isArray(hv)) hv[i2] = v2;
            };
          } else if (typeof collVal === "string") {
            elemSpec = { kind: "scalar", text: "char" };
            elems = collVal.split("").map((c) => c.charCodeAt(0));
            if (collNode.k === "var" && s.types[collNode.name] === "string") {
              const varName = collNode.name;
              writeBackHost = (st, i2, v2) => {
                const cur = st.vars[varName];
                if (typeof cur !== "string") return;
                const ch = typeof v2 === "string" ? v2 : String.fromCharCode(v2),
                  next = cur.slice(0, i2) + ch + cur.slice(i2 + 1);
                st.vars[varName] = next;
                const id = st.addresses?.[varName];
                if (id && st.model.memory[id]) st.model.memory[id].values[0] = next;
              };
            }
          } else if (
            isPtr(collVal) &&
            collNode.k === "var" &&
            String(s.types[collNode.name] || "").endsWith("[]")
          ) {
            const mem = s.model.memory[collVal.object];
            if (!mem) api.fail("繰り返し対象のメモリがありません", n);
            elemSpec =
              parseCppTypeText(mem.type) || { kind: "scalar", text: mem.type };
            elems = mem.values.slice(collVal.offset);
            const objId = collVal.object,
              baseOff = collVal.offset;
            writeBackHost = (st, i2, v2) => {
              const m2 = st.model.memory[objId];
              if (m2) m2.values[baseOff + i2] = v2;
            };
          } else if (collNode.k === "array" && Array.isArray(collVal)) {
            elems = collVal.slice();
            elemSpec = null;
          } else
            api.fail(
              "範囲 for の対象はコンテナ・文字列・配列でなければなりません",
              n,
              "CompileError",
            );
          let varSpec = n.varSpec ? finalizeCppSpec(n.varSpec, s, api, n) : null;
          if (!varSpec || varSpec.kind === "auto") {
            const dt = elemSpec
              ? elemSpec.text
              : elems.length
                ? typeof elems[0] === "string"
                  ? "string"
                  : typeof elems[0] === "boolean"
                    ? "bool"
                    : "int"
                : "int";
            varSpec = parseCppTypeText(dt) || { kind: "scalar", text: dt };
          }
          const writeBack = !!n.rangeRef && !n.rangeConst && !!writeBackHost;
          const saved = {
            hadVar: Object.hasOwn(s.vars, n.name),
            val: s.vars[n.name],
            hadType: Object.hasOwn(s.types, n.name),
            type: s.types[n.name],
          };
          let active = [s];
          const done = [],
            total = elems.length;
          for (let i = 0; ; i++) {
            if (i >= total) {
              done.push(...active);
              break;
            }
            if (i >= LIMITS.iterations) {
              for (const st of active) {
                if (st.halt || st.signal) {
                  done.push(st);
                  continue;
                }
                api.note(st, n, "ループ上限で説明を停止しました", "limit");
                st.halt = true;
                done.push(st);
              }
              break;
            }
            const next = [];
            for (const st of active) {
              if (st.halt || st.signal) {
                done.push(st);
                continue;
              }
              let bindVal = elems[i];
              if (bindVal?.kind === "uninitialized")
                api.fail("未初期化の要素です", n, "未定義動作");
              if (!writeBack && varSpec)
                bindVal = castElem(bindVal, varSpec, st, api, n);
              st.vars[n.name] = bindVal;
              st.types[n.name] = varSpec.text;
              api.note(st, n, `繰り返し ${i + 1}回目`);
              st.loopDepth = (st.loopDepth || 0) + 1;
              (st.loopIterations ??= []).push(i + 1);
              const outs = api.run(
                [{ k: "block", body: n.body, line: n.line, refs: [] }],
                [st],
              );
              for (const out of outs) {
                out.loopDepth--;
                out.loopIterations.pop();
                if (writeBack && !out.error) {
                  const wb = out.vars[n.name];
                  writeBackHost(
                    out,
                    i,
                    elemSpec ? castElem(wb, elemSpec, out, api, n) : wb,
                  );
                }
                if (out.signal === "break") {
                  out.signal = null;
                  done.push(out);
                } else if (out.halt || out.signal === "return") done.push(out);
                else {
                  out.signal = null;
                  next.push(out);
                }
              }
            }
            active = next;
            if (done.length + active.length > LIMITS.paths)
              active = active.slice(0, Math.max(0, LIMITS.paths - done.length));
            if (!active.length) break;
          }
          for (const st of done) {
            if (saved.hadVar) st.vars[n.name] = saved.val;
            else delete st.vars[n.name];
            if (saved.hadType) st.types[n.name] = saved.type;
            else delete st.types[n.name];
          }
          return done;
        }
        const semantics = {
          dialect: language,
          blockScopes: true,
          // RG-77: C# の入れ子宣言スペース同名禁止（CS0136）は managed のみ。
          nestedShadowError: managed,
          manualLifetime: !managed,
          initialize(s, api) {
            // R31-N12（PLAT-N1）：従来は intBits !== 32 の一条件で「未対応の
            // 幅」と「フィールド欠落・モデル自体の形状不正」を区別せず、
            // {}・数値・文字列・配列のモデルでも「intは32ビットのみ対応」
            // という虚偽原因になっていた。形状不正はモデル側を名指し、
            // 正当な形状の未対応幅（64 等）にだけ従来文言を使う。
            const model = s.model;
            if (
              !model ||
              typeof model !== "object" ||
              Array.isArray(model) ||
              !Object.hasOwn(model, "intBits") ||
              model.intBits === undefined ||
              model.intBits === null
            )
              api.fail("モデルに intBits が必要です", { line: 1 });
            if (typeof model.intBits !== "number")
              api.fail("モデルの intBits は数値で指定してください", { line: 1 });
            if (model.intBits !== 32)
              api.fail("このモデルのintは32ビットのみ対応です", { line: 1 });
            s.vars = {};
            s.addresses = {};
            s.references = {};
          },
          truth(v, line, node, s) {
            if (isUnknown(v)) return v;
            if (managed && typeof v !== "boolean")
              throw new PracticeError(
                "C#の条件にはboolが必要です",
                line,
                "CompileError",
              );
            // RG-76（R20-N6）: C++ の std::string には bool への文脈変換がなく、
            // 条件に置くのはコンパイルエラー。内容依存の truthiness で処理しない。
            if (
              !managed &&
              language === "cpp" &&
              node &&
              s &&
              typeOf(node, s) === "string"
            )
              throw new PracticeError(
                "std::string を条件には使えません（bool への変換がありません）",
                line,
                "CompileError",
              );
            // B8: コンテナ・イテレータ・pair も条件には置けない（bool 変換なし）。
            if (language === "cpp" && node && s) {
              const sp = parseCppTypeText(typeOf(node, s));
              if (sp && ["vector", "array", "pair", "iterator"].includes(sp.kind))
                throw new PracticeError(
                  "コンテナ・イテレータ・pair を条件には使えません（bool への変換がありません）",
                  line,
                  "CompileError",
                );
            }
            return Boolean(v);
          },
          step(n, s, api) {
            // B8: C++ のコンテナ宣言と範囲 for は専用実行へ。
            if (language === "cpp") {
              if (n.k === "each" && n.cppRange) return cppRangeFor(n, s, api);
              if (n.k === "declare" && n.cppKind) return cppDeclare(n, s, api);
            }
            // R27-N11：宣言子列（int a = 1, b = 2; 等）は、宣言子ごとの
            // declare ノードを同じスコープで順に実行する。
            if (n.k === "declareGroup")
              return api.run(n.declarations, [s]);
            // R25-N28：null 配列の foreach は「未確定または配列でない
            // 繰り返し対象」（未対応）ではなく NullReferenceException
            // （dotnet 実測）。共有 loop() の配列検査より前に、確定した
            // null を名指す。コレクション式の読み取りに副作用のある
            // 形（呼び出し等）は対象にせず、従来の経路へ委ねる。
            if (managed && n.k === "each") {
              const c = n.collection;
              let collIsNull = false;
              if (c?.k === "var" && Object.hasOwn(s.vars, c.name))
                collIsNull = s.vars[c.name] === null;
              else if (c?.k === "literal") collIsNull = c.value === null;
              else if (c && ["member", "index"].includes(c.k))
                collIsNull = api.read(c, s) === null;
              if (collIsNull)
                api.fail("null参照です", n, "NullReferenceException");
              // R29-N19 根因：矩形配列は入れ子配列として保持されるため、
              // 共有 loop() が外側だけを走査し、foreach が要素ではなく
              // 行を列挙していた。実物では矩形の foreach は全要素を
              // 行優先に列挙する。コレクションを平坦化して読む専用
              // ノードへ差し替え、共有 loop() の反復・break／continue・
              // スコープ処理はそのまま使う（ジャグは行の列挙が正しい
              // ため対象外）。
              if (n.collection?.k !== "rectFlat") {
                const shape = csArrayShape(n.collection, s, null);
                if (shape?.suffix && /^\[,+\]$/.test(shape.suffix))
                  n.collection = {
                    k: "rectFlat",
                    target: n.collection,
                    line: n.line,
                  };
              }
              // R31-N7：C# の string は IEnumerable<char> で foreach の
              // 正当な対象（Microsoft Learn の iteration statements、
              // dotnet 8.0 実走で確定）。共有 loop() は配列しか受け付けず
              // 確定した文字列にも「未確定または配列でない」という虚偽
              // 原因になっていた。文字列を文字の列へ読み替える専用
              // ノードへ差し替え、反復・break／continue・スコープ処理は
              // 共有 loop() のまま使う。配列・未確定値・数値等は read 側で
              // そのまま返るため、既存の動作と文言（未定義名の名指し、
              // 数値への実態どおりの停止）は変わらない。
              if (n.collection?.k !== "rectFlat" && n.collection?.k !== "stringChars")
                n.collection = {
                  k: "stringChars",
                  target: n.collection,
                  line: n.line,
                };
              // R31-N7 隣接形：foreach の反復変数は共有 loop() が vars へ
              // 直接書くため s.types に型が残らず、typeOf が int とみなして
              // char 要素との比較（c == 'b' 等）が「int と char は比較
              // できません」という虚偽原因になっていた（char[] 対象でも
              // 同根）。反復変数の要素型を状態へ記録し、typeOf が参照
              // する（スコープ終了後の除去は vars／types と同じく共有側の
              // 登録機構が担う範囲外のため、最終状態には記録が残るが
              // 表示は vars／types／model のみを使う）。
              {
                const collNode =
                  n.collection?.k === "stringChars" || n.collection?.k === "rectFlat"
                    ? n.collection.target
                    : n.collection;
                const ct = collNode ? typeOf(collNode, s) : null;
                let elem = null;
                if (ct === "string") elem = "char";
                else if (ct && /\[[^\]]*\]$/.test(ct)) elem = ct.replace(/\[[^\]]*\]$/, "");
                else if (n.varType && n.varType !== "var") elem = n.varType;
                if (elem && elem !== ct) (s.loopVarTypes ??= {})[n.name] = elem;
                else if (elem && n.varType && n.varType !== "var" && ct === elem)
                  (s.loopVarTypes ??= {})[n.name] = elem;
                // RG-359（R32-N13）：要素型→反復変数の宣言型への変換が
                // 適用されず、変換前の値がそのまま束縛されていた
                // （foreach (int c in "ab") が 'a','b' を表示する誤値。
                // dotnet 8.0.428 実走では 97, 98）。変換が存在する数値型
                // ・char の組合せでは、読み取り時に変換する eachConvert
                // で包み、反復変数の型記録も宣言型に合わせる（表示・
                // 比較が宣言型で解釈される）。変換が存在しない組合せ
                // （bool／string 等）の黙った反復はバッチ10 §5 の既知の
                // 緩さで、本件の範囲外として変更しない。
                const numericConvTypes = [
                  "char", "sbyte", "byte", "short", "ushort", "int", "uint",
                  "long", "ulong", "float", "double",
                ];
                if (
                  elem &&
                  n.varType &&
                  n.varType !== "var" &&
                  elem !== n.varType &&
                  numericConvTypes.includes(elem) &&
                  numericConvTypes.includes(n.varType) &&
                  n.collection?.k !== "eachConvert"
                ) {
                  n.collection = {
                    k: "eachConvert",
                    target: n.collection,
                    from: elem,
                    to: n.varType,
                    line: n.line,
                  };
                  (s.loopVarTypes ??= {})[n.name] = n.varType;
                }
              }
            }
            if (n.k === "assign") {
              // B8: at()／front()／back() は参照を返すため代入先になれる。
              // 検証より前に等価な添字ノードへ書き換える（cpp のみ）。
              if (language === "cpp") n.target = cppRefTarget(n.target);
              // R25-N14（C家族の同根表面）：文として届く代入（C／C++
              // では主にポインタ逆参照への代入と %= 形）は、従来は
              // managed と %= だけをここで処理し、それ以外は共有
              // executeProgram の narration（callName が空になる形は
              // 「対象」）に委ねていた。代入先を特定する narration を
              // C家族側で一貫させるため、文の代入は全てここで処理
              // する。処理内容（右辺評価→複合演算→書き込み）は
              // 共有側と同一で、検証は validateAssignTarget が
              // 右辺評価より前に行う（R25-N8）。
              validateAssignTarget(n.target, n, api);
              let v = api.read(n.value, s);
              if (n.op && n.op !== "=")
                v = semantics.binary(
                  compoundBaseOp(n.op),
                  api.read(n.target, s),
                  v,
                  n,
                  s,
                  api,
                );
              api.write(n.target, v, s, n);
              api.note(
                s,
                n,
                `${targetLabel(n.target) || callName(n.target) || "対象"} に ${fmtFor(v, s.types[callName(n.target)])} を代入します`,
              );
              return [s];
            }
            if (n.k === "declare") {
              // RG-379（バッチ12表示追随）：この検査に届く時点で、内側
              // スコープでの同名宣言（シャドーイング）は共有エンジンの
              // スコープ登録が s.types から外側の型を退避済みであり、
              // 同じスコープの重複は通常そちらが先に名指しで停止する。
              // ここで名前が残っているのは同一スコープの再宣言だけなの
              // で、文言もシャドーイングと切り分けて同一スコープの重複
              // として名指す（カテゴリも未対応ではなく SyntaxError）。
              if (Object.hasOwn(s.types, n.name)) {
                api.fail(
                  `同じスコープで名前が重複しています：${n.name}`,
                  n,
                  "SyntaxError",
                );
              }
              if (managed && n.pointer)
                api.fail("C#のunsafeポインタは未対応です", n);
              if (n.referenceAlias) {
                if (!n.value || n.value.k !== "var" || s.types[n.value.name] !== n.type || n.array || n.pointer)
                  api.fail("参照は同じ型の宣言済み変数で初期化してください", n, "未対応");
                const ptr = targetPointer(n.value, s, api, n);
                s.references[n.name] = ptr;
                s.addresses[n.name] = ptr.object;
                s.types[n.name] = n.type;
                s.vars[n.name] = api.read(n.value, s);
                api.note(s, n, `${n.name} は ${n.value.name} の別名です`);
                return [s];
              }
              delete s.references[n.name];
              let type =
                n.type +
                (n.pointer
                  ? "*"
                  : n.arrayKind === "rect"
                    ? "[" + ",".repeat((n.arrayRank || 2) - 1) + "]"
                    : n.arrayKind === "jagged"
                      ? "[]".repeat(n.arrayRank || 2)
                      : n.array
                        ? "[]"
                        : "");
              // RG-06 追加表面（R21-N3）: 初期化子の中で自変数は宣言済みに
              // 見えるのが実 C／C++／C# の規則。先に未初期化として登録して
              // から初期化子を読むことで、自己参照が「未定義の名前」ではなく
              // 未初期化読み（C／C++ は未定義動作、C# は未割り当て）として
              // 正直に停止する。
              if (n.value) {
                s.vars[n.name] = uninitialized;
                s.types[n.name] = type;
              }
              let v = n.value ? api.read(n.value, s) : uninitialized;
              if (n.array) {
                // R29-N18 根因：ジャグ配列の初期化子受理が矩形の入れ子
                // 経路を流用し、行位置の裸の波括弧初期化子 {{1,2},{3}}
                // まで受理していた。実物ではジャグの各行は new 式で
                // なければならず、裸の入れ子は CS0623（矩形の入れ子
                // 行は合法なので矩形は対象外）。1次元配列の要素位置の
                // 裸の波括弧も同じく CS0623（dotnet 実測：int[] の
                // {{1},{2}}、string[] の {{"x"}} も CS0623）。
                if (
                  managed &&
                  n.arrayKind !== "rect" &&
                  n.value?.k === "array" &&
                  Array.isArray(n.value.values) &&
                  n.value.values.some((el) => el?.bracedInit)
                )
                  api.fail(
                    "配列初期化子は変数またはフィールドの初期化子でのみ使用できます。要素（ジャグ配列の行など）は new 式で書いてください（CS0623）",
                    n,
                    "CompileError",
                  );
                // R24-N10 根因：null で初期化した配列変数まで「配列長が
                // 必要」と誤診していた。実 C# では null 配列の宣言は正当で
                // （dotnet 実測で a == null → True）、メンバー／添字アク
                // セス時に NullReferenceException で止まるのが正しい。
                // string／自作クラスの null と同じ扱いに揃える。
                if (managed && n.value && v === null) {
                  s.vars[n.name] = null;
                  s.types[n.name] = type;
                  api.note(
                    s,
                    n,
                    `${n.name} を ${type} として用意します：null`,
                  );
                  return [s];
                }
                // §3.3(a) 再裁定：波括弧初期化子の浮動小数点要素は、C では
                // 暗黙変換で合法（切り捨て、gcc 実測）だが、C++ では定数
                // の浮動小数点→整数変換は narrowing conversion でエラー
                // （g++ 実測：error: narrowing conversion）。言語別に分ける。
                // 変数などの非定数要素は g++ でも警告止まりで切り捨て
                // られるため、定数要素だけを対象にする。
                if (
                  language === "cpp" &&
                  Array.isArray(n.value?.values) &&
                  !["float", "double"].includes(n.type)
                ) {
                  const isConstFloat = (el) => {
                    if (!el || typeof el !== "object") return false;
                    if (el.k === "literal")
                      return (
                        typeof el.value === "number" &&
                        /[.eE]/.test(String(el.raw || "")) &&
                        !/^0[xXbBoO]/.test(String(el.raw || ""))
                      );
                    if (el.k === "unary" && ["-", "+"].includes(el.op))
                      return isConstFloat(el.arg);
                    if (el.k === "binary")
                      return isConstFloat(el.a) && isConstFloat(el.b);
                    if (el.k === "cast")
                      return (
                        ["float", "double"].includes(el.type) &&
                        isConstFloat(el.arg)
                      );
                    return false;
                  };
                  for (const el of n.value.values)
                    if (isConstFloat(el))
                      api.fail(
                        "波括弧初期化で浮動小数点の定数を整数型へ縮小変換（narrowing）はできません",
                        n,
                        "CompileError",
                      );
                }
                // R25-N29：波括弧初期化の整数定数→符号なし狭型の
                // narrowing も g++ ではエラー（実測：unsigned int
                // {-1}、unsigned char {300}、unsigned short {70000}、
                // unsigned long {-1}、unsigned int {4294967296} が
                // 全て narrowing conversion エラー）。従来は cast の
                // 剰余変換で黙ってラップしていた（70000 は printf の
                // 書式不一致という誤った理由で停止）。定数要素だけを
                // 対象とし、変数要素の警告・切り捨て受理（g++ 一致）
                // と C 側（narrowing の概念なし・gcc 一致）は変えない。
                if (
                  language === "cpp" &&
                  Array.isArray(n.value?.values) &&
                  ["unsigned int", "unsigned long", "unsigned short", "unsigned char", "unsigned"].includes(n.type)
                ) {
                  const isConstInt = (el) => {
                    if (!el || typeof el !== "object") return false;
                    if (el.k === "literal")
                      return (
                        typeof el.value === "number" &&
                        Number.isInteger(el.value) &&
                        (/^0[xXbBoO]/.test(String(el.raw || "")) ||
                          !/[.eE]/.test(
                            String(el.raw || "").replace(/[uUlLfF]+$/, ""),
                          ))
                      );
                    if (el.k === "unary" && ["-", "+", "~"].includes(el.op))
                      return isConstInt(el.arg);
                    if (el.k === "binary")
                      return isConstInt(el.a) && isConstInt(el.b);
                    if (el.k === "cast")
                      return (
                        !["float", "double"].includes(el.type) &&
                        isConstInt(el.arg)
                      );
                    return false;
                  };
                  const unsignedMax = {
                    "unsigned char": 255,
                    "unsigned short": 65535,
                    "unsigned int": 4294967295,
                    unsigned: 4294967295,
                    // unsigned long は 2^64-1 が上限で、モデルで安全に
                    // 表せる整数は全て収まる。負値だけが対象になる。
                    "unsigned long": Infinity,
                  }[n.type];
                  n.value.values.forEach((el, idx) => {
                    if (!isConstInt(el)) return;
                    const val = Array.isArray(v) ? v[idx] : undefined;
                    if (
                      typeof val === "number" &&
                      (val < 0 || val > unsignedMax)
                    )
                      api.fail(
                        `波括弧初期化で整数の定数 ${val} を ${n.type} へ縮小変換（narrowing）はできません`,
                        n,
                        "CompileError",
                      );
                  });
                }
                // R27-N16 根因：narrowing 検査の対象型テーブルに bool が
                // 含まれず、`bool b{2}` 等の整数定数が黙って受理されて
                // いた（g++ 13.3 実測では全形が narrowing エラー）。
                // bool が表せる整数定数は 0 と 1 だけであり、true／false
                // のリテラルは対象外（合法）。文字定数（'a' は 97 として
                // 評価される）も整数定数として扱う（g++ 実測で
                // bool{'a'} も narrowing エラー）。
                // 棚卸しで見つけた同根の漏れ：float への整数定数も、
                // float で正確に表せない値は g++ では narrowing エラー
                // （実測：float{16777217}）だが黙って丸めていた。
                // double はモデルで安全な整数を全て正確に表せるため
                // 対象外。符号付き狭型（char／short／int 等）の範囲外
                // 定数は cast 側で従来どおり停止する（理由分類は既知の
                // 候補 U-4 の範囲で、本バッチでは変えない）。
                if (
                  language === "cpp" &&
                  Array.isArray(n.value?.values) &&
                  ["bool", "float"].includes(n.type)
                ) {
                  const isConstIntVal = (el) => {
                    if (!el || typeof el !== "object") return false;
                    if (el.k === "literal") {
                      if (typeof el.value === "number")
                        return (
                          Number.isInteger(el.value) &&
                          (/^0[xXbBoO]/.test(String(el.raw || "")) ||
                            !/[.eE]/.test(
                              String(el.raw || "").replace(/[uUlLfF]+$/, ""),
                            ))
                        );
                      return (
                        el.quote === "'" &&
                        typeof el.value === "string" &&
                        el.value.length === 1
                      );
                    }
                    if (el.k === "unary" && ["-", "+", "~"].includes(el.op))
                      return isConstIntVal(el.arg);
                    if (el.k === "binary")
                      return isConstIntVal(el.a) && isConstIntVal(el.b);
                    if (el.k === "cast")
                      return (
                        !["float", "double"].includes(el.type) &&
                        isConstIntVal(el.arg)
                      );
                    return false;
                  };
                  n.value.values.forEach((el, idx) => {
                    if (!isConstIntVal(el)) return;
                    const val = Array.isArray(v) ? v[idx] : undefined;
                    if (typeof val !== "number") return;
                    if (n.type === "bool" && val !== 0 && val !== 1)
                      api.fail(
                        `波括弧初期化で整数の定数 ${val} を bool へ縮小変換（narrowing）はできません`,
                        n,
                        "CompileError",
                      );
                    if (n.type === "float" && Math.fround(val) !== val)
                      api.fail(
                        `波括弧初期化で整数の定数 ${val} を float へ縮小変換（narrowing）はできません`,
                        n,
                        "CompileError",
                      );
                  });
                }
                // R28-N19（C#）：多次元配列（矩形）の初期化。値は行の配列
                // として保持し、要素ごとに宣言本体と同じ定数変換チェック
                // を効かせる。行の長さが揃わない初期化子は実 C# でも
                // コンパイルエラーになるため、その旨を名指して停止する。
                if (managed && n.arrayKind === "rect") {
                  if (v === uninitialized)
                    api.fail("配列長を指定してください", n);
                  if (!Array.isArray(v))
                    api.fail("配列初期化子が必要です", n);
                  const castRect = (val, node) => {
                    if (Array.isArray(val))
                      return val.map((x, i) => castRect(x, node?.values?.[i]));
                    return cast(
                      val,
                      n.type,
                      s,
                      node ? { ...n, value: node } : n,
                      api,
                    );
                  };
                  const shapeOf = (val) => {
                    if (!Array.isArray(val)) return [];
                    const first = shapeOf(val[0]);
                    for (const row of val)
                      if (JSON.stringify(shapeOf(row)) !== JSON.stringify(first))
                        return null;
                    return [val.length, ...first];
                  };
                  if (shapeOf(v) === null)
                    api.fail(
                      "配列初期化子の要素数が一致しません（多次元配列では各行の長さを揃えてください）",
                      n,
                      "CompileError",
                    );
                  const rectVals = castRect(v, n.value);
                  s.vars[n.name] = rectVals;
                  allocate(s, n.name, rectVals, n.type);
                  s.types[n.name] = type;
                  api.note(
                    s,
                    n,
                    `${n.name} を ${type} として用意します：${fmtFor(s.vars[n.name], type)}`,
                  );
                  return [s];
                }
                // R28-N19（C#）：ジャグ配列の初期化。要素は配列または
                // null（new int[2][] の各行は null）だけを許す。
                if (managed && n.arrayKind === "jagged") {
                  if (v === uninitialized)
                    api.fail("配列長を指定してください", n);
                  if (!Array.isArray(v))
                    api.fail("配列初期化子が必要です", n);
                  for (const el of v)
                    if (el !== null && !Array.isArray(el))
                      api.fail(
                        "ジャグ配列の要素は配列または null でなければなりません",
                        n,
                        "CompileError",
                      );
                  s.vars[n.name] = v;
                  allocate(s, n.name, v, n.type);
                  s.types[n.name] = type;
                  api.note(
                    s,
                    n,
                    `${n.name} を ${type} として用意します：${fmtFor(s.vars[n.name], type)}`,
                  );
                  return [s];
                }
                // R28-N19（C／C++）：多次元配列。次元を全て読み、要素は
                // 行優先（row-major）で平坦化して1つのメモリオブジェクト
                // に保持する（dims を併せて保持し、添字アクセスで使う）。
                // 入れ子波括弧は行の初期化子、平坦な並びは先頭からの
                // 詰め込み、不足分は 0 埋め（実物の集約初期化どおり）。
                if (!managed && Array.isArray(n.dims) && n.dims.length >= 2) {
                  const dimVals = n.dims.map((d) => (d ? api.read(d, s) : null));
                  for (const dv of dimVals)
                    if (
                      dv !== null &&
                      (!Number.isInteger(dv) || dv < 0 || dv > 10000)
                    )
                      api.fail("配列長が不正または上限を超えています", n);
                  if (dimVals.slice(1).some((dv) => dv === null))
                    api.fail("配列長を指定してください", n);
                  const rowSize = dimVals
                    .slice(1)
                    .reduce((a, b) => a * b, 1);
                  // RG-376：C++ の std::string（クラス型）要素は既定構築
                  // され "" になる。埋め値・未初期化要素に 0／未初期化
                  // マーカーを使うと、部分初期化が char 初期化エラーに
                  // 化け、未初期化読みが虚偽の未定義動作になっていた。
                  // trivial 型（int／char 等）の未初期化は従来どおり。
                  const padVal = n.type === "bool" ? false : language === "cpp" && n.type === "string" ? "" : 0;
                  let flat;
                  if (v === uninitialized) {
                    if (dimVals[0] === null)
                      api.fail("配列長を指定してください", n);
                    flat = Array.from(
                      { length: dimVals.reduce((a, b) => a * b, 1) },
                      () => (language === "cpp" && n.type === "string" ? "" : uninitialized),
                    );
                  } else if (!Array.isArray(v)) {
                    api.fail("配列初期化子が必要です", n);
                  } else {
                    flat = [];
                    const appendGroup = (list, dimsLeft) => {
                      const subSize =
                        dimsLeft.length > 1
                          ? dimsLeft.slice(1).reduce((a, b) => a * b, 1)
                          : 1;
                      for (const el of list) {
                        if (Array.isArray(el)) {
                          while (flat.length % subSize !== 0) flat.push(padVal);
                          appendGroup(el, dimsLeft.slice(1));
                        } else if (typeof el === "string" && n.type === "char") {
                          if ([...el].some((c) => c.codePointAt(0) > 127))
                            api.fail(
                              "このモデルのchar文字列はASCIIに限定します",
                              n,
                              "未対応",
                            );
                          while (flat.length % subSize !== 0) flat.push(padVal);
                          const bytes = [...el].map((c) => c.charCodeAt(0));
                          if (bytes.length > subSize)
                            api.fail(
                              "文字配列の初期化子が多すぎます（文字列が行の長さを超えています）",
                              n,
                              "CompileError",
                            );
                          if (language === "cpp" && bytes.length === subSize)
                            api.fail(
                              "C++の文字配列には終端ヌル文字の領域も必要です",
                              n,
                              "CompileError",
                            );
                          flat.push(...bytes);
                          while (flat.length % subSize !== 0) flat.push(0);
                        } else flat.push(el);
                      }
                    };
                    appendGroup(v, dimVals);
                    if (dimVals[0] === null)
                      dimVals[0] = Math.ceil(flat.length / rowSize);
                    const total = dimVals.reduce((a, b) => a * b, 1);
                    if (flat.length > total)
                      api.fail("配列初期化子が多すぎます", n);
                    while (flat.length < total) flat.push(padVal);
                  }
                  flat = flat.map((x) =>
                    x === uninitialized ? x : cast(x, n.type, s, n, api),
                  );
                  const memId = allocate(s, n.name, flat, n.type);
                  s.model.memory[memId].dims = dimVals;
                  s.vars[n.name] = { kind: "pointer", object: memId, offset: 0 };
                  s.types[n.name] = type;
                  api.note(
                    s,
                    n,
                    `${n.name} を ${type} として用意します：${fmtFor(s.vars[n.name], type)}`,
                  );
                  return [s];
                }
                // R28-N20 根因：char 配列に文字列リテラルを2つ以上並べる
                // 波括弧初期化（char s[] = {"hi", "x"};）は、gcc／g++ 実測
                // では excess elements（要素過剰）のエラーになる形だが、
                // 要素を数値として cast する経路で「数値型が一致しません」
                // という誤った理由になっていた。真因を名指して停止する。
                // 文字リテラル（'h' 等）の並びは対象外（合法）。
                // R29-N23 根因：その是正が「文字列リテラルを含む2要素
                // 以上」を一律 excess とし、文字列が配列全体の初期化子
                // ではなく1要素として現れる形まで誤停止していた。
                // gcc／g++ 13.3 実測で切り分ける：
                // - 先頭要素が文字列（{"hi","x"}／{"hi",'x'}）：文字列が
                //   配列全体を初期化し、残りは excess（両言語ともエラー）。
                // - 文字列が2番目以降の1要素（{'h','i',0,"x",'y'}）：
                //   C は警告のみで合法（char へのポインタ変換。値は
                //   アドレス依存で確定できないため未確定値として保持
                //   する）、C++ は invalid conversion のエラー。
                {
                  const initElemNodes = Array.isArray(n.value?.values)
                    ? n.value.values
                    : [];
                  const isStrLit = (el) =>
                    el?.k === "literal" &&
                    typeof el.value === "string" &&
                    el.quote !== "'";
                  if (!managed && n.type === "char" && initElemNodes.length > 1) {
                    if (isStrLit(initElemNodes[0]))
                      api.fail(
                        "文字配列の初期化子に要素が多すぎます（excess elements in char array initializer）：文字列リテラルは1つだけ指定できます",
                        n,
                        "CompileError",
                      );
                    if (initElemNodes.some((el, i) => i > 0 && isStrLit(el))) {
                      if (language === "cpp")
                        api.fail(
                          "文字列リテラルを char へ変換できません（invalid conversion from 'const char*' to 'char'）",
                          n,
                          "CompileError",
                        );
                      if (Array.isArray(v))
                        v = v.map((el, i) =>
                          i > 0 && isStrLit(initElemNodes[i])
                            ? api.freshUnknown(
                                "文字列リテラルから char への変換値（アドレスに依存します）",
                                s,
                              )
                            : el,
                        );
                    }
                  }
                }
                // R27-N17 根因：char 配列の波括弧で包んだ文字列初期化
                // （char s[] = {"hi"};）は gcc／g++ ともに合法だが、配列
                // 初期化子が要素を数値としてのみ解釈し「数値型が一致し
                // ません」で停止していた。単一の文字列要素だけを、波括弧
                // なし形（char s[] = "hi";）と同じ文字列初期化として扱う。
                const charInitString =
                  !managed && n.type === "char"
                    ? typeof v === "string"
                      ? v
                      : Array.isArray(v) &&
                          v.length === 1 &&
                          typeof v[0] === "string"
                        ? v[0]
                        : null
                    : null;
                if (charInitString !== null) {
                  if ([...charInitString].some(c => c.codePointAt(0) > 127)) api.fail("このモデルのchar文字列はASCIIに限定します", n, "未対応");
                  const bytes = [...charInitString].map(c => c.charCodeAt(0));
                  const size = n.size ? api.read(n.size, s) : bytes.length + 1;
                  if (language === "cpp" && size <= bytes.length) api.fail("C++の文字配列には終端ヌル文字の領域も必要です", n, "CompileError");
                  v = size === bytes.length ? bytes : [...bytes, 0];
                }
                let length = n.size
                  ? api.read(n.size, s)
                  : Array.isArray(v)
                    ? v.length
                    : null;
                if (length === null) api.fail("配列長を指定してください", n);
                if (!Number.isInteger(length) || length < 0 || length > 10000)
                  api.fail("配列長が不正または上限を超えています", n);
                // RG-376：C++ の std::string 要素の既定値は ""（クラス型の
                // 既定構築。スカラー形 RG-40 と同じ）。従来は C# と共通の
                // null が部分初期化の埋め値になり、未初期化配列では要素が
                // 未初期化マーカーのまま「未定義動作」で停止していた。
                // C# の string[] の null、trivial 型の未初期化は不変。
                const defaultValue = n.type === "bool" ? false : n.type === "string" ? (language === "cpp" ? "" : null) : classes[n.type] ? null : 0;
                if (v === uninitialized)
                  v = Array.from({ length }, () =>
                    managed ? defaultValue : language === "cpp" && n.type === "string" ? "" : uninitialized,
                  );
                else if (!Array.isArray(v))
                  api.fail("配列初期化子が必要です", n);
                else if (v.length > length)
                  api.fail("配列初期化子が多すぎます", n);
                else if (managed && n.value?.k === "var") {
                  if (s.types[n.value.name] !== type) api.fail("配列型が一致しません", n, "CompileError");
                  // Assignment copies an array reference, not its elements.
                } else
                  // D3 追随：C# では配列初期化子の要素にも宣言本体と同じ
                  // 定数変換チェックが効くよう、要素ごとの式ノードを
                  // cast へ渡す（byte[] a = {300}; が 44 に折り返されず
                  // 停止する）。C／C++ は従来どおり宣言ノードを渡し、
                  // 符号なしの剰余変換（NX-N6）を維持する。
                  v = Array.from({ length }, (_, i) =>
                    i < v.length
                      ? cast(
                          v[i],
                          n.type,
                          s,
                          managed && Array.isArray(n.value?.values)
                            ? { ...n, value: n.value.values[i] }
                            : n,
                          api,
                        )
                      : defaultValue,
                  );
                if (managed) {
                  s.vars[n.name] = v;
                  allocate(s, n.name, v, n.type);
                } else {
                  let id = allocate(s, n.name, v, n.type);
                  s.vars[n.name] = { kind: "pointer", object: id, offset: 0 };
                }
              } else {
                if (!managed && n.pointer && n.type === "char" && typeof v === "string") {
                  if ([...v].some((c) => c.codePointAt(0) > 127))
                    api.fail("このモデルのchar文字列はASCIIに限定します", n, "未対応");
                  const bytes = [...v].map((c) => c.charCodeAt(0));
                  bytes.push(0);
                  const id = allocate(s, n.name, bytes, "char");
                  s.vars[n.name] = { kind: "pointer", object: id, offset: 0 };
                  s.types[n.name] = type;
                  api.note(
                    s,
                    n,
                    `${n.name} を ${type} として用意します：${fmtFor(s.vars[n.name], type)}`,
                  );
                  return [s];
                }
                // RG-40（R20-N1）: C++ の std::string は初期化子が無くても既定構築され、
                // 空文字列として初期化済みになる（未初期化として扱わない）。
                if (language === "cpp" && n.type === "string" && v === uninitialized)
                  v = "";
                // R25-N29（スカラー形）：C++ のスカラー波括弧初期化
                // （Type x = {値};）は配列と別経路で、従来は要素が
                // 範囲内でも「数値型が一致しません」という汎用文言で
                // 停止していた（g++ 実測では合法で値が入る）。要素を
                // 取り出して通常の初期化として扱い、理由文を配列形と
                // 揃える：浮動小数点定数→整数型と、符号なし型への
                // 範囲外整数定数は narrowing として名指し、符号付き
                // 型の範囲外は配列形と同じく cast の処理系依存の
                // 停止に委ねる。空波括弧は値初期化（0／false／""）。
                // C は対象外（従来の扱いを変えない）。
                if (
                  language === "cpp" &&
                  v !== uninitialized &&
                  Array.isArray(n.value?.values) &&
                  Array.isArray(v)
                ) {
                  // R29-N24 根因：std::string の初期化子リスト構築
                  // （std::string s{{'h','i'}}／s{'h','i'}／s = {'h','i'}
                  // は g++ 13.3 実測で合法で "hi" になる）が、スカラー
                  // 扱いの「要素が1つだけ必要です」で停止していた。
                  // 要素が全て char へ変換できる値（文字リテラル・
                  // char 型の値・数値）なら、initializer_list<char>
                  // コンストラクタとして文字列を組み立てる。文字列
                  // リテラルが複数要素の中に混ざる形は g++ でも
                  // invalid conversion のエラー。整数リテラルの定数が
                  // char の範囲外なら narrowing として名指す。
                  let bracedHandled = false;
                  if (n.type === "string" && n.value.values.length > 0) {
                    const elNodes = n.value.values;
                    const isStrLitEl = (el) =>
                      el?.k === "literal" &&
                      typeof el.value === "string" &&
                      el.quote !== "'";
                    if (n.value.strCountInit) {
                      // R30-N31：括弧付き波括弧構築の (文字列, 個数) 形は
                      // 初期化子リストではなく basic_string(const char*,
                      // size_type) コンストラクタが選ばれる（g++ 13.3
                      // 実測：std::string s({"hi", 1}) は "h"）。個数が
                      // 文字列の長さを超える読みは実物では範囲外の読みに
                      // なるため、確定値を出さずその旨を名指す。
                      const count = v[1];
                      if (typeof count !== "number")
                        api.fail(
                          "文字列リテラルを char へ変換できません（invalid conversion from 'const char*' to 'char'）",
                          n,
                          "CompileError",
                        );
                      if (!Number.isInteger(count) || count < 0)
                        api.fail(
                          "std::string の (文字列, 個数) 構築の個数が不正です",
                          n,
                          "CompileError",
                        );
                      if (count > String(v[0]).length)
                        api.fail(
                          "std::string の (文字列, 個数) 構築で個数が文字列の長さを超える形は未対応です",
                          n,
                          "未対応",
                        );
                      v = String(v[0]).slice(0, count);
                      bracedHandled = true;
                    } else if (v.some((elVal) => isUnknown(elVal))) {
                      v = v.find((elVal) => isUnknown(elVal));
                      bracedHandled = true;
                    } else if (elNodes.length > 1 && elNodes.some(isStrLitEl))
                      api.fail(
                        "文字列リテラルを char へ変換できません（invalid conversion from 'const char*' to 'char'）",
                        n,
                        "CompileError",
                      );
                    else if (
                      v.every(
                        (elVal) =>
                          typeof elVal === "number" ||
                          typeof elVal === "boolean" ||
                          (typeof elVal === "string" && elVal.length === 1),
                      )
                    ) {
                      for (const el of elNodes)
                        if (
                          el?.k === "literal" &&
                          typeof el.value === "number" &&
                          (el.value < -128 || el.value > 127)
                        )
                          api.fail(
                            `波括弧初期化で整数の定数 ${el.value} を char へ縮小変換（narrowing）はできません`,
                            n,
                            "CompileError",
                          );
                      v = v
                        .map((elVal) =>
                          typeof elVal === "string"
                            ? elVal
                            : String.fromCharCode(
                                ((Math.trunc(Number(elVal)) % 256) + 256) %
                                  256,
                              ),
                        )
                        .join("");
                      bracedHandled = true;
                    }
                  }
                  if (bracedHandled) {
                    // v は組み立て済みの文字列。通常の初期化へ進む。
                  } else if (n.value.values.length === 0) {
                    v =
                      n.type === "bool"
                        ? false
                        : n.type === "string"
                          ? ""
                          : 0;
                  } else if (n.value.values.length !== 1) {
                    api.fail(
                      "スカラーの波括弧初期化には要素が1つだけ必要です",
                      n,
                      "CompileError",
                    );
                  } else {
                    const el = n.value.values[0],
                      elVal = v[0];
                    const constKind = (e) => {
                      if (!e || typeof e !== "object") return null;
                      if (e.k === "literal") {
                        if (typeof e.value !== "number") return null;
                        if (/^0[xXbBoO]/.test(String(e.raw || "")))
                          return "int";
                        return /[.eE]/.test(String(e.raw || ""))
                          ? "float"
                          : "int";
                      }
                      if (e.k === "unary" && ["-", "+"].includes(e.op))
                        return constKind(e.arg);
                      if (e.k === "binary") {
                        const ka = constKind(e.a),
                          kb = constKind(e.b);
                        if (!ka || !kb) return null;
                        return ka === "float" || kb === "float"
                          ? "float"
                          : "int";
                      }
                      if (e.k === "cast") {
                        const inner = constKind(e.arg);
                        if (!inner) return null;
                        return ["float", "double"].includes(e.type)
                          ? "float"
                          : "int";
                      }
                      return null;
                    };
                    const kind = constKind(el);
                    if (
                      kind === "float" &&
                      !["float", "double", "string"].includes(n.type)
                    )
                      api.fail(
                        "波括弧初期化で浮動小数点の定数を整数型へ縮小変換（narrowing）はできません",
                        n,
                        "CompileError",
                      );
                    if (
                      kind === "int" &&
                      ["unsigned int", "unsigned long", "unsigned short", "unsigned char", "unsigned"].includes(n.type) &&
                      typeof elVal === "number"
                    ) {
                      const max = {
                        "unsigned char": 255,
                        "unsigned short": 65535,
                        "unsigned int": 4294967295,
                        unsigned: 4294967295,
                        "unsigned long": Infinity,
                      }[n.type];
                      if (elVal < 0 || elVal > max)
                        api.fail(
                          `波括弧初期化で整数の定数 ${elVal} を ${n.type} へ縮小変換（narrowing）はできません`,
                          n,
                          "CompileError",
                        );
                    }
                    // R27-N16（スカラー形）：bool への整数定数と、float
                    // で正確に表せない整数定数は、配列形と同じく
                    // narrowing として名指す。文字定数は constKind では
                    // 数値リテラルとして数えられないため、評価値
                    // （文字コード）と形から別に判定する（bool{'a'} は
                    // g++ 実測で narrowing エラー）。
                    const isCharConst = (e) =>
                      e?.k === "literal" &&
                      e.quote === "'" &&
                      typeof e.value === "string" &&
                      e.value.length === 1;
                    if (
                      n.type === "bool" &&
                      typeof elVal === "number" &&
                      (kind === "int" || isCharConst(el)) &&
                      elVal !== 0 &&
                      elVal !== 1
                    )
                      api.fail(
                        `波括弧初期化で整数の定数 ${elVal} を bool へ縮小変換（narrowing）はできません`,
                        n,
                        "CompileError",
                      );
                    if (
                      n.type === "float" &&
                      typeof elVal === "number" &&
                      (kind === "int" || isCharConst(el)) &&
                      Math.fround(elVal) !== elVal
                    )
                      api.fail(
                        `波括弧初期化で整数の定数 ${elVal} を float へ縮小変換（narrowing）はできません`,
                        n,
                        "CompileError",
                      );
                    v = elVal;
                  }
                }
                // R26-N20：C のスカラー波括弧初期化（型 名 = {値};）は
                // C11 の gcc 実測で合法（値は通常の変換を受ける）。
                // 従来は配列のまま cast へ渡り「数値型が一致しません」で
                // 停止していた（C++ の同形は動作する内部不整合）。
                // C には narrowing の概念はないため、要素を取り出して
                // 通常の初期化として扱う（char への {300} は切り捨て、
                // 余分な要素は gcc どおり先頭要素を採用、空波括弧は 0）。
                if (
                  language === "c" &&
                  v !== uninitialized &&
                  Array.isArray(n.value?.values) &&
                  Array.isArray(v)
                ) {
                  v = n.value.values.length === 0 ? 0 : v[0];
                }
                if (v !== uninitialized) v = cast(v, type, s, n, api);
                s.vars[n.name] = v;
                allocate(s, n.name, [v], type);
              }
              s.types[n.name] = type;
              api.note(
                s,
                n,
                `${n.name} を ${type} として用意します：${fmtFor(s.vars[n.name], type)}`,
              );
              return [s];
            }
          },
          read(a, s, api) {
            // B8: コンテナ／イテレータ／pair の読み取り。
            if (language === "cpp") {
              const r = cppRead(a, s, api);
              if (r) return r;
            }
            // R29-N19：矩形配列の foreach 用に平坦化して読む（step で
            // 差し替えられた専用ノード）。行優先に全要素を並べる。
            if (managed && a.k === "rectFlat") {
              const target = api.read(a.target, s);
              if (target === null)
                api.fail("null参照です", a, "NullReferenceException");
              if (!Array.isArray(target)) return { handled: true, value: target };
              const flat = [];
              const walkFlat = (x) => {
                if (Array.isArray(x)) x.forEach(walkFlat);
                else flat.push(x);
              };
              walkFlat(target);
              return { handled: true, value: flat };
            }
            // R31-N7：foreach の文字列対象を文字の列として読む（step で
            // 差し替えられた専用ノード）。C# の char は UTF-16 コード
            // 単位のため、コードポイント単位ではなくコード単位で
            // 分割する（split("") の挙動）。文字列でなければ対象を
            // そのまま返し、共有 loop() の既存判定に委ねる。
            if (managed && a.k === "stringChars") {
              const target = api.read(a.target, s);
              // RG-360（R32-N14）：char スカラーは文字列対象から外す。
              // char の内部表現が1文字の文字列であるため、RG-338 の
              // 文字列反復が char 変数・char リテラルまで取り込み、
              // 実 C# では CS1579（foreach に使えない）の形が黙って
              // 1回反復していた。他のスカラーと同じく、反復対象では
              // ないものとして共有 loop() の停止に委ねる。
              if (typeof target === "string" && typeOf(a.target, s) !== "char")
                return { handled: true, value: target.split("") };
              return { handled: true, value: target };
            }
            if (managed && a.k === "eachConvert") {
              // RG-359（R32-N13）：foreach の要素変換（読み取り時に
              // 一括変換）。変換規則は dotnet 8.0.428 実走で確定：
              // 整数系は切り捨て＋ビット幅でのラップ（checked 文脈では
              // OverflowException）、char は16ビット符号なし、浮動
              // 小数→整数系も切り捨て＋ラップ。cast() の暗黙変換の
              // 規則（定数式の範囲検査等）は foreach の明示変換の
              // 意味論と異なるため、専用の変換として実装する。
              const values = api.read(a.target, s);
              if (!Array.isArray(values)) return { handled: true, value: values };
              const converted = values.map((v) => {
                if (v === null || v === undefined || isUnknown(v)) return v;
                let num;
                if (typeof v === "string") {
                  if (v.length !== 1) return v;
                  num = v.charCodeAt(0);
                } else if (typeof v === "boolean") num = v ? 1 : 0;
                else if (typeof v === "number") num = v;
                else return v;
                if (a.to === "char") {
                  if (!Number.isFinite(num))
                    api.fail(
                      "範囲外の浮動小数点から整数への変換結果は不定（unspecified）な値のため、確定値として扱えません",
                      a,
                      "未確認",
                    );
                  const t = Math.trunc(num);
                  if (s.checked && (t < 0 || t > 65535))
                    api.fail("整数へのキャストが範囲外です", a, "OverflowException");
                  return String.fromCharCode(((t % 65536) + 65536) % 65536);
                }
                if (a.to === "double") return num;
                if (a.to === "float") return Math.fround(num);
                if (!Number.isFinite(num))
                  api.fail(
                    "範囲外の浮動小数点から整数への変換結果は不定（unspecified）な値のため、確定値として扱えません",
                    a,
                    "未確認",
                  );
                const t = Math.trunc(num);
                const bits = width(a.to, false);
                const wrapped = ["byte", "ushort", "uint", "ulong"].includes(a.to)
                  ? Number(BigInt.asUintN(bits, BigInt(t)))
                  : Number(BigInt.asIntN(bits, BigInt(t)));
                if (s.checked && wrapped !== t)
                  api.fail("整数へのキャストが範囲外です", a, "OverflowException");
                return wrapped;
              });
              return { handled: true, value: converted };
            }
            if (
              a.k === "literal" &&
              typeof a.value === "number" &&
              Number.isInteger(a.value) &&
              !Number.isSafeInteger(a.value) &&
              (/^0[xXbBoO]/.test(String(a.raw || "")) ||
                !/[.eE]/.test(String(a.raw || "").replace(/[LfF]$/, "")))
            )
              api.fail(
                "この整数リテラルは安全に計算できる範囲外です",
                a,
                "未確認",
              );
            // D7：cin 抽出は被演算子を読む前に横取りする（未初期化の
            // 抽出先を読むと未初期化エラーになってしまうため）。
            if (
              language === "cpp" &&
              a.k === "binary" &&
              a.op === ">>" &&
              isCinChain(a.a)
            ) {
              extractFromCin(a, s, api);
              return {
                handled: true,
                value: api.freshUnknown("標準入力ストリーム", s),
              };
            }
            if (a.k === "assign") {
              // B8: 参照を返すメンバ呼び出しの代入先書き換え（cpp のみ）。
              if (language === "cpp") a.target = cppRefTarget(a.target);
              validateAssignTarget(a.target, a, api);
              let v = api.read(a.value, s);
              if (a.op && a.op !== "=") {
                const cur = api.read(a.target, s);
                v = semantics.binary(
                  compoundBaseOp(a.op),
                  cur,
                  v,
                  { k: "binary", a: a.target, b: a.value, line: a.line },
                  s,
                  api,
                );
              }
              api.write(a.target, v, s, a);
              return { handled: true, value: v };
            }
            if (a.k === "pre" || a.k === "post") {
              const cur = api.read(a.target, s);
              if (isUnknown(cur))
                return {
                  handled: true,
                  value: unknown(`未確定の値への ${a.op}`),
                };
              const next = semantics.binary(
                a.op === "++" ? "+" : "-",
                cur,
                1,
                {
                  k: "binary",
                  a: a.target,
                  b: { k: "literal", value: 1, raw: "1", line: a.line },
                  line: a.line,
                },
                s,
                api,
              );
              api.write(a.target, next, s, a);
              return { handled: true, value: a.k === "pre" ? next : cur };
            }
            if (a.k === "ternary") {
              const test = api.read(a.test, s);
              if (isUnknown(test))
                return {
                  handled: true,
                  value: unknown("条件（三項演算子）による値"),
                };
              if (managed && typeof test !== "boolean")
                api.fail("C#の条件にはboolが必要です", a, "CompileError");
              return {
                handled: true,
                value: api.read(test ? a.then : a.els, s),
              };
            }
            if (a.k === "literal" && /[fF]$/.test(a.raw || "") && !/^0[xXbBoO]/.test(a.raw || "")) {
              const value = Math.fround(a.value);
              if (!Number.isFinite(value)) api.fail("floatリテラルがモデルの有限範囲外です", a, "未確認");
              return {handled:true,value};
            }
            if (!managed && a.k === "var" && ["static_cast", "dynamic_cast", "reinterpret_cast", "const_cast"].includes(a.name)) api.fail("キャストのこの形式は未対応です（C++名前付きキャスト）", a, "未対応");
            if (!managed && a.k === "unary" && a.op === "-" && !["double", "float"].includes(typeOf(a.arg, s)) && !typeOf(a.arg, s).startsWith("unsigned")) {
              const v = api.read(a.arg, s), bits = typeOf(a.arg, s) === "long" ? width("long", s) : 32;
              if (isUnknown(v)) return {handled:true,value:unknown("- " + formatValue(v))};
              if (v === -(2 ** (bits - 1))) api.fail("符号付き整数の単項マイナスがオーバーフローします", a, "未定義動作");
              return {handled:true,value:-v};
            }
            if (!managed && a.k === "unary" && ["+", "-"].includes(a.op) && typeOf(a.arg, s).startsWith("unsigned")) {
              const v = api.read(a.arg, s);
              if (isUnknown(v)) return {handled:true,value:unknown(a.op + formatValue(v))};
              if (!Number.isSafeInteger(v)) api.fail("unsigned単項演算の安全整数範囲外です", a, "未確認");
              const result = Number(BigInt.asUintN(width(typeOf(a.arg, s), s), a.op === "-" ? -BigInt(v) : BigInt(v)));
              if (!Number.isSafeInteger(result)) api.fail("unsigned単項演算の安全整数範囲外です", a, "未確認");
              return {handled:true,value:result};
            }
            if (!managed && a.k === "cast") {
              let v = api.read(a.arg, s);
              if (isUnknown(v)) return {handled:true, value: unknown(`(${a.type}) ${formatValue(v)}`, v.id + ":cast:" + a.type)};
              if (typeof v === "boolean") v = Number(v);
              if (typeof v !== "number") api.fail("キャストのこの形式は未対応です（数値以外）", a, "未対応");
              if (["float", "double", "bool"].includes(a.type)) {
                const value = a.type === "bool" ? v !== 0 : a.type === "float" ? Math.fround(v) : v;
                if (a.type === "float" && Number.isFinite(v) && !Number.isFinite(value)) api.fail("floatへのキャストが範囲外です", a, "未定義動作");
                return {handled:true,value};
              }
              const bits = a.type.includes("char") ? 8 : a.type.includes("short") ? 16 : a.type.includes("long") ? (s.model.longBits || 64) : 32;
              const unsigned = a.type.startsWith("unsigned");
              const integral = !["float", "double"].includes(typeOf(a.arg, s));
              const n = Math.trunc(v), min = unsigned ? 0 : -(2 ** (bits - 1)), max = unsigned ? 2 ** bits - 1 : 2 ** (bits - 1) - 1;
              if (unsigned && integral) {
                if (!Number.isSafeInteger(n)) api.fail("このキャストは安全に計算できる数値範囲外です", a, "未確認");
                const modulus = 1n << BigInt(bits);
                const value = Number((BigInt(n) % modulus + modulus) % modulus);
                if (!Number.isSafeInteger(value)) api.fail("このunsigned変換の値は安全整数範囲外です", a, "未確認");
                return {handled:true,value};
              }
              if (a.type === "char" && !integral && (n < -128 || n > 255)) api.fail("浮動小数点からcharへのキャストが範囲外です", a, "未定義動作");
              if (a.type === "char" && (n < 0 || n > 127)) api.fail("charキャストの符号と範囲は処理系に依存します（未確認）", a, "環境依存");
              if (n < min || n > max) api.fail(integral ? "整数キャストの範囲外変換は処理系依存です（このモデルでは未確認）" : "浮動小数点から整数へのキャストが範囲外です", a, integral ? "環境依存" : "未定義動作");
              if (!Number.isSafeInteger(n)) api.fail("このキャストは安全に計算できる数値範囲外です", a, "未確認");
              return {handled:true,value:n};
            }
            if (!managed && a.k === "literal" && a.quote === "'") {
              if (a.value.length !== 1 || a.value.charCodeAt(0) > 127)
                api.fail("単一ASCII文字以外の文字定数", a, "未対応");
              return { handled: true, value: a.value.charCodeAt(0) };
            }
            if (!managed && a.k === "unary" && a.op === "sizeof") {
              const arg = a.arg;
              function checkSizeOperand(expr) {
                if (!["var", "literal", "index", "unary", "binary", "cast", "post"].includes(expr.k) || (expr.k === "unary" && expr.op === "sizeof")) api.fail("このsizeofオペランドの型はモデルで確定できません", a, "未対応");
                if (expr.k === "var" && !builtinTypes.includes(expr.name) && !["true", "false"].includes(expr.name) && !Object.hasOwn(s.types, expr.name)) api.fail("宣言されていないsizeof対象です", a, "CompileError");
                if (expr.k === "index" && builtinTypes.includes(expr.target.name)) api.fail("sizeofの配列型指定。宣言済み配列の変数名を指定してください", a, "未対応");
                for (const child of [expr.arg, expr.a, expr.b, expr.target]) if (child) checkSizeOperand(child);
              }
              if (arg.k !== "type") checkSizeOperand(arg);
              if (arg.k === "var" && !builtinTypes.includes(arg.name) && !["true", "false"].includes(arg.name) && !Object.hasOwn(s.types, arg.name)) api.fail("宣言されていないsizeof対象です", a, "CompileError");
              let type = arg.k === "var" && builtinTypes.includes(arg.name) ? arg.name : typeOf(arg, s);
              // R7-160（修正バッチ13）：単項 +／-／~ の結果型は整数昇格後の
              // 型（char／short／bool 等は int へ昇格。gcc／g++ 実測：
              // sizeof(+x)（char）は 4、sizeof(-x)（short）は 4）。
              // typeOf は単項演算子の型をオペランドの型のまま返すため、
              // sizeof の型導出だけ昇格を適用する（オペランド自体は
              // 評価されないので、他の経路の型には影響させない）。
              if (arg.k === "unary") {
                const promotedType = (e) => {
                  if (e.k === "unary" && ["+", "-", "~"].includes(e.op)) {
                    const inner = promotedType(e.arg);
                    return ["char", "signed char", "unsigned char", "short", "unsigned short", "bool"].includes(inner)
                      ? "int"
                      : inner;
                  }
                  if (e.k === "unary" && e.op === "!")
                    return language === "c" ? "int" : "bool";
                  return typeOf(e, s);
                };
                type = promotedType(arg);
              }
              if (arg.k === "literal" && typeof arg.value === "string" && arg.quote !== "'") return { handled: true, value: new TextEncoder().encode(arg.value).length + 1 };
              const sizes = { char: 1, bool: 1, int: 4, long: (s.model.longBits || 64) / 8, float: 4, double: 8 };
              if (type.startsWith("unsigned ") || type.startsWith("signed ")) type = type.replace(/^(unsigned|signed) /, "");
              if (type === "short") return {handled:true,value:2};
              if (type.endsWith("[]") && arg.k === "var") {
                const mem = s.model.memory[s.addresses[arg.name]];
                return { handled: true, value: mem.values.length * sizes[mem.type] };
              }
              if (type.endsWith("*")) api.fail("ポインタのsizeofはABIにより異なります", a, "未対応");
              if (!sizes[type]) api.fail("未対応のsizeof対象です", a, "未対応");
              return { handled: true, value: sizes[type] };
            }
            if (a.k === "var" && Object.hasOwn(s.types, a.name) && s.references[a.name]) {
              const ptr = s.references[a.name], mem = deref(ptr, s, api, a);
              const value = mem.values[ptr.offset];
              if (value?.kind === "uninitialized") api.fail("未初期化の値です", a, "未定義動作");
              s.vars[a.name] = value;
              return { handled: true, value };
            }
            if (!managed && a.k === "var" && a.name === "NULL")
              return { handled:true,value:null };
            if (language === "cpp" && a.k === "var" && a.name === "nullptr")
              return { handled: true, value: null };
            if (language === "cpp" && a.k === "var" && a.name === "endl")
              return { handled: true, value: "\n" };
            if (
              a.k === "var" &&
              Object.hasOwn(s.vars, a.name) &&
              s.vars[a.name]?.kind === "uninitialized"
            )
              api.fail(
                managed
                  ? "未割り当てのローカル変数です"
                  : "未初期化の値を読み取っています",
                a,
                managed ? "CompileError" : "未定義動作",
              );
            if (managed && a.k === "cast") {
              let v = api.read(a.arg, s);
              if (isUnknown(v))
                return {
                  handled: true,
                  value: unknown(`(${a.type}) ${formatValue(v)}`, v.id + ":cast:" + a.type),
                };
              const target = a.type;
              if (target === "string") {
                if (v === null) return { handled: true, value: null };
                if (typeof v === "string") return { handled: true, value: v };
                if (v && typeof v === "object" && v.__class) return { handled: true, value: v };
                api.fail("string へキャストできるのは文字列と参照型だけです", a, "CompileError");
              }
              if (target === "bool") {
                if (typeof v !== "boolean")
                  api.fail("bool への明示キャストはできません", a, "CompileError");
                return { handled: true, value: v };
              }
              if (target === "char") {
                if (typeof v === "string" && v.length === 1) return { handled: true, value: v };
                if (typeof v !== "number") api.fail("char へのキャスト元が数値ではありません", a, "CompileError");
                // R29-N25 兄弟表面：定数（整数・浮動小数点とも）の
                // char へのキャストが範囲外なら、実物は CS0221
                // （dotnet 実測：(char)70000.5／(char)70000 とも
                // CS0221）。明示 unchecked では実物の畳み込み
                // （切り捨て＋16ビット折り返し）を維持し、実行時値は
                // 従来どおり折り返す。
                if (
                  isConstantIntegerExpr(a.arg) &&
                  s.checkMode !== "unchecked" &&
                  (!Number.isFinite(Math.trunc(v)) ||
                    Math.trunc(v) < 0 ||
                    Math.trunc(v) > 65535)
                )
                  api.fail(
                    `定数値 '${v}' は 'char' へ変換できません（CS0221：定数キャストが範囲外です。unchecked を使うと折り返します）`,
                    a,
                    "CompileError",
                  );
                return { handled: true, value: String.fromCharCode(Math.trunc(v) & 0xffff) };
              }
              if (typeof v === "string" && v.length === 1) v = v.charCodeAt(0);
              if (typeof v !== "number")
                api.fail("数値型へのキャスト元が数値ではありません", a, "CompileError");
              if (target === "double") return { handled: true, value: v };
              if (target === "float") return { handled: true, value: Math.fround(v) };
              // D11 根因：unchecked 文脈での範囲外の浮動小数点→整数
              // 変換は C# 仕様で unspecified な値であり、BigInt の
              // 折り返しで得た 0 等を確定値として返してはならない。
              // checked では OverflowException、unchecked では
              // 未確認として停止する。非有限値も同じ扱い（従来は
              // BigInt(Infinity) のホスト例外が limit に化けていた）。
              if (["float", "double"].includes(typeOf(a.arg, s))) {
                const t = Math.trunc(v),
                  cBits = width(target, s),
                  cUnsigned = ["uint", "ulong", "ushort", "byte"].includes(target),
                  cMin = cUnsigned ? 0 : -(2 ** (cBits - 1)),
                  cMax = cUnsigned ? 2 ** cBits - 1 : 2 ** (cBits - 1) - 1;
                if (!Number.isFinite(t) || t < cMin || t > cMax) {
                  // R29-N25 根因：RG-257 の定数判定（isConstantIntegerExpr）
                  // は整数定数の経路だけに届き、浮動小数点の定数キャストが
                  // 実行時変換の経路（未確認／OverflowException）に落ちて
                  // いた。実物では定数の浮動小数点キャストも、既定／
                  // checked 文脈では CS0221 のコンパイルエラーになる
                  // （dotnet 8.0.428 実測：(byte)300.5／(byte)300.0／
                  // checked((byte)300.5)／(int)(1.0/0.0) は全て CS0221）。
                  // 明示 unchecked の実物の定数畳み込み値（例：0）は
                  // 仕様上 unspecified のため、確定値を出さず従来の
                  // 未確認停止を維持する（監査側も妥当と裁定済み）。
                  if (
                    isConstantIntegerExpr(a.arg) &&
                    s.checkMode !== "unchecked"
                  )
                    api.fail(
                      `定数値 '${v}' は '${target}' へ変換できません（CS0221：定数キャストが範囲外です）`,
                      a,
                      "CompileError",
                    );
                  if (s.checked)
                    api.fail("整数へのキャストが範囲外です", a, "OverflowException");
                  api.fail(
                    "範囲外の浮動小数点から整数への変換結果は不定（unspecified）な値のため、確定値として扱えません",
                    a,
                    "未確認",
                  );
                }
              }
              const bits = width(target, s),
                unsigned = ["uint", "ulong", "ushort", "byte"].includes(target);
              let n = BigInt(Math.trunc(v));
              const wrapped = unsigned
                ? BigInt.asUintN(bits, n)
                : BigInt.asIntN(bits, n);
              // R28-N22 根因：定数キャストも実行時キャストと同じ折り返し
              // で処理され、通常（既定）文脈の (byte)300 が黙って 44 に
              // なっていた。実 C#（dotnet 8.0.428 実測）では、定数式の
              // キャストが範囲外の場合、既定・checked 文脈ではコンパイル
              // エラー CS0221、明示 unchecked 文脈でのみ折り返す。変数等
              // の実行時値のキャストは従来どおり（既定は折り返し、
              // checked は OverflowException）。
              if (
                wrapped !== n &&
                s.checkMode !== "unchecked" &&
                isConstantIntegerExpr(a.arg)
              )
                api.fail(
                  `定数値 '${Math.trunc(v)}' は '${target}' へ変換できません（CS0221：定数キャストが範囲外です。unchecked を使うと折り返します）`,
                  a,
                  "CompileError",
                );
              if (s.checked && wrapped !== n)
                api.fail("整数へのキャストが範囲外です", a, "OverflowException");
              if (!Number.isSafeInteger(Number(wrapped)))
                api.fail("このキャストは安全に計算できる数値範囲外です", a, "未確認");
              return { handled: true, value: Number(wrapped) };
            }
            if (language === "cpp" && a.k === "var" && a.name === "cin")
              return { handled: true, value: unknown("標準入力ストリーム") };
            if (managed && a.k === "array" && a.size) {
              // R24-N11：new 型[n]{…} は要素数が宣言長と一致しなければ
              // コンパイルエラー CS0847（dotnet 実測）。多すぎ・少なすぎ
              // の両方向を止める。一致する場合は通常の配列として評価する。
              const n = api.read(a.size, s);
              if (!Number.isInteger(n) || n < 0 || n > 10000)
                api.fail("配列サイズが不正です", a);
              if (a.values.length !== n)
                api.fail(
                  `配列初期化子の要素数（${a.values.length}）が宣言長（${n}）と一致しません`,
                  a,
                  "CompileError",
                );
              return {
                handled: true,
                value: a.values.map((x) => api.read(x, s)),
              };
            }
            if (language === "cpp" && a.k === "array" && a.stringInitList) {
              // R30-N31：式位置の std::string({...}) の評価。宣言位置の
              // 初期化子リスト構築（R29-N24）と規則を揃える：要素が全て
              // char へ変換できる値なら initializer_list<char> で組み
              // 立て、単一の文字列はそのまま、(文字列, 個数) 形は
              // basic_string(const char*, size_type) として切り取る。
              const elNodes = a.values;
              const vals = elNodes.map((x) => api.read(x, s));
              if (vals.some((x) => isUnknown(x)))
                return {
                  handled: true,
                  value: unknown("std::string の初期化子リストによる"),
                };
              const isStrLitEl = (el) =>
                el?.k === "literal" &&
                typeof el.value === "string" &&
                el.quote !== "'";
              if (a.strCountInit) {
                const count = vals[1];
                if (typeof count !== "number")
                  api.fail(
                    "文字列リテラルを char へ変換できません（invalid conversion from 'const char*' to 'char'）",
                    a,
                    "CompileError",
                  );
                if (!Number.isInteger(count) || count < 0)
                  api.fail(
                    "std::string の (文字列, 個数) 構築の個数が不正です",
                    a,
                    "CompileError",
                  );
                if (count > String(vals[0]).length)
                  api.fail(
                    "std::string の (文字列, 個数) 構築で個数が文字列の長さを超える形は未対応です",
                    a,
                    "未対応",
                  );
                return { handled: true, value: String(vals[0]).slice(0, count) };
              }
              if (vals.length > 1 && elNodes.some(isStrLitEl))
                api.fail(
                  "文字列リテラルを char へ変換できません（invalid conversion from 'const char*' to 'char'）",
                  a,
                  "CompileError",
                );
              if (vals.length === 1 && typeof vals[0] === "string")
                return { handled: true, value: vals[0] };
              if (
                vals.every(
                  (elVal) =>
                    typeof elVal === "number" ||
                    typeof elVal === "boolean" ||
                    (typeof elVal === "string" && elVal.length === 1),
                )
              ) {
                for (const el of elNodes)
                  if (
                    el?.k === "literal" &&
                    typeof el.value === "number" &&
                    (el.value < -128 || el.value > 127)
                  )
                    api.fail(
                      `波括弧初期化で整数の定数 ${el.value} を char へ縮小変換（narrowing）はできません`,
                      a,
                      "CompileError",
                    );
                return {
                  handled: true,
                  value: vals
                    .map((elVal) =>
                      typeof elVal === "string"
                        ? elVal
                        : String.fromCharCode(
                            ((Math.trunc(Number(elVal)) % 256) + 256) % 256,
                          ),
                    )
                    .join(""),
                };
              }
              api.fail(
                "std::string の初期化子リストの要素を char へ変換できません",
                a,
                "CompileError",
              );
            }
            if (a.k === "construct") {
              if (!managed)
                api.fail("動的確保／クラスの生成はこのモデルでは未対応です", a);
              if (a.name.includes("[") && a.name.includes(",")) {
                // R28-N19：new int[2,2] 等の多次元（矩形）配列は、次元
                // ごとの入れ子配列を要素型の既定値で満たして作る。
                const dims = a.args.map((x) => api.read(x, s));
                for (const dn of dims)
                  if (!Number.isInteger(dn) || dn < 0 || dn > 10000)
                    api.fail("配列サイズが不正です", a);
                const baseType = a.name.slice(0, a.name.indexOf("["));
                const fillRect = (ds) =>
                  ds.length === 1
                    ? Array.from({ length: ds[0] }, () =>
                        baseType === "bool"
                          ? false
                          : baseType === "string"
                            ? null
                            : 0,
                      )
                    : Array.from({ length: ds[0] }, () => fillRect(ds.slice(1)));
                return { handled: true, value: fillRect(dims) };
              }
              if (a.name.endsWith("[]")) {
                let n = api.read(a.args[0], s);
                if (!Number.isInteger(n) || n < 0 || n > 10000)
                  api.fail("配列サイズが不正です", a);
                const type = a.name.slice(0, -2);
                // R28-N19：ジャグ配列（int[][] 等）の要素は配列型であり、
                // 既定値は 0 ではなく null（実 C# どおり）。
                return { handled: true, value: Array(n).fill(type === "bool" ? false : type === "string" || type.endsWith("[]") ? null : 0) };
              }
              if (!classes[a.name])
                api.fail(
                  `new ${a.name}(...) は未対応です（${a.name} 型の生成）`,
                  a,
                  "未対応",
                );
              if (a.args.length)
                api.fail("引数付きコンストラクタは未対応です", a);
              return {
                handled: true,
                value: {
                  __class: a.name,
                  ...Object.fromEntries(
                    Object.entries(classes[a.name]).map(([k, d]) => [
                      k,
                      d.initial,
                    ]),
                  ),
                },
              };
            }
            if (a.k === "unary" && a.op === "&") {
              if (managed) api.fail("unsafeポインタは未対応です", a);
              return { handled: true, value: targetPointer(a.arg, s, api, a) };
            }
            if (a.k === "unary" && a.op === "*") {
              let ptr = api.read(a.arg, s),
                mem = deref(ptr, s, api, a, elemTypeOf(a, s)),
                value = mem.values[ptr.offset];
              if (value?.kind === "uninitialized")
                api.fail("未初期化の配列要素です", a, "未定義動作");
              return { handled: true, value };
            }
            if (a.k === "index") {
              // R29-N20：添字の形（カンマ形か連鎖形か）と個数を、対象の
              // 宣言型の形と照合する（実物は全て CS0022）。
              if (managed) csCheckIndex(a, s, api, a);
              // R28-N19（C#）：a[1,1] のような多次元（矩形）添字は、
              // indexes に全次元が入る。入れ子配列を順にたどる。
              if (managed && a.indexes.length > 1) {
                let target = api.read(a.target, s);
                if (target === null)
                  api.fail("null参照です", a, "NullReferenceException");
                let curVal = target;
                for (let d = 0; d < a.indexes.length; d++) {
                  let iv = api.read(a.indexes[d], s);
                  if (
                    typeof iv === "string" &&
                    iv.length === 1 &&
                    typeOf(a.indexes[d], s) === "char"
                  )
                    iv = iv.charCodeAt(0);
                  if (!Number.isInteger(iv))
                    api.fail("添字は整数型でなければなりません", a, "CompileError");
                  if (!Array.isArray(curVal) || iv < 0 || iv >= curVal.length)
                    api.fail("配列範囲外です", a, "IndexOutOfRangeException");
                  curVal = curVal[iv];
                }
                return { handled: true, value: curVal };
              }
              // R28-N19（C／C++）：a[1][1] のような連鎖添字は、次元を
              // 保持するメモリオブジェクトに対して行優先の平坦オフ
              // セットへ畳む。次元より添字が少ない場合は行へのポインタ
              // を返す（char 行を %s で読む等の実物の振る舞いに合う）。
              if (!managed) {
                let chain = [];
                let curNode = a;
                while (curNode?.k === "index") {
                  chain.unshift(curNode);
                  curNode = curNode.target;
                }
                if (curNode?.k === "var") {
                  const rootPtr = s.vars[curNode.name];
                  const mem0 = isPtr(rootPtr)
                    ? s.model.memory[rootPtr.object]
                    : null;
                  if (mem0?.dims && mem0.dims.length >= 2) {
                    const idxVals = chain.map((nd) =>
                      api.read(nd.indexes[0], s),
                    );
                    for (const iv of idxVals) {
                      if (isUnknown(iv))
                        api.fail("未確定の添字によるメモリ参照は未対応です", a);
                      if (!Number.isInteger(iv))
                        api.fail(
                          "添字は整数型でなければなりません",
                          a,
                          "CompileError",
                        );
                    }
                    // RG-376：要素型が std::string の多次元配列では、次元
                    // 分の添字で得た文字列への追加の添字1つ（a[0][0][0]）
                    // は char アクセスとして合法であり、「次元超過」では
                    // ない。それ以外の超過は従来どおり次元超過で停止する。
                    const stringCharExtra =
                      language === "cpp" &&
                      mem0.type === "string" &&
                      idxVals.length === mem0.dims.length + 1;
                    if (idxVals.length > mem0.dims.length && !stringCharExtra)
                      api.fail("添字の数が次元の数を超えています", a, "CompileError");
                    let offset = rootPtr.offset;
                    const elemIdxCount = Math.min(idxVals.length, mem0.dims.length);
                    for (let d = 0; d < elemIdxCount; d++) {
                      const iv = idxVals[d];
                      if (iv < 0 || iv >= mem0.dims[d])
                        api.fail("配列の範囲外の添字です", a, "未定義動作");
                      offset +=
                        iv *
                        mem0.dims.slice(d + 1).reduce((x, y) => x * y, 1);
                    }
                    if (idxVals.length < mem0.dims.length)
                      return {
                        handled: true,
                        value: { kind: "pointer", object: rootPtr.object, offset },
                      };
                    const memObj = deref(
                      { kind: "pointer", object: rootPtr.object, offset },
                      s,
                      api,
                      a,
                    );
                    const value = memObj.values[offset];
                    if (value?.kind === "uninitialized")
                      api.fail("未初期化の配列要素です", a, "未定義動作");
                    if (stringCharExtra) {
                      if (isUnknown(value))
                        return { handled: true, value: unknown("未確定の値の要素") };
                      if (typeof value !== "string")
                        api.fail("添字の数が次元の数を超えています", a, "CompileError");
                      const ci = idxVals[idxVals.length - 1];
                      if (ci === value.length) return { handled: true, value: 0 };
                      if (ci < 0 || ci > value.length)
                        api.fail("文字列の有効範囲外の添字です", a, "未定義動作");
                      return { handled: true, value: value.charCodeAt(ci) };
                    }
                    return { handled: true, value };
                  }
                }
              }
              let target = api.read(a.target, s),
                index = api.read(a.indexes[0], s);
              if (isUnknown(index))
                api.fail("未確定の添字によるメモリ参照は未対応です", a);
              // D12 兄弟表面：未確定の対象（ReadLine 結果等）の要素は
              // 未確定値として伝播させる。範囲外という虚偽の理由で
              // 止めない。
              if (isUnknown(target))
                return {
                  handled: true,
                  value: unknown("未確定の値の要素"),
                };
              // R23-N5 根因：添字式の型が検証されておらず、小数・文字列
              // の添字が範囲外や「未設定」の捏造に化けていた。実言語では
              // 添字は整数型でなければならず、型の問題として停止する。
              {
                const idxType = typeOf(a.indexes[0], s);
                if (
                  ["double", "float", "string"].includes(idxType) ||
                  (managed && idxType === "bool")
                )
                  api.fail(
                    "添字は整数型でなければなりません",
                    a,
                    "CompileError",
                  );
                if (typeof index === "boolean") index = Number(index);
                if (
                  managed &&
                  typeof index === "string" &&
                  index.length === 1 &&
                  idxType === "char"
                )
                  index = index.charCodeAt(0);
                if (!Number.isInteger(index))
                  api.fail(
                    "添字は整数型でなければなりません",
                    a,
                    "CompileError",
                  );
              }
              if (typeof target === "string") {
                if (!Number.isInteger(index))
                  api.fail("添字が整数ではありません", a, "CompileError");
                if (managed) {
                  if (index < 0 || index >= target.length)
                    api.fail("文字列の範囲外の添字です", a, "IndexOutOfRangeException");
                  return { handled: true, value: target[index] };
                }
                if (index === target.length) return { handled: true, value: 0 };
                if (index < 0 || index > target.length)
                  api.fail("文字列の有効範囲外の添字です", a, "未定義動作");
                return { handled: true, value: target.charCodeAt(index) };
              }
              if (managed) {
                if (target === null)
                  api.fail("null参照です", a, "NullReferenceException");
                if (
                  !Array.isArray(target) ||
                  !Number.isInteger(index) ||
                  index < 0 ||
                  index >= target.length
                )
                  api.fail("配列範囲外です", a, "IndexOutOfRangeException");
                return { handled: true, value: target[index] };
              }
              // A6監査CF-02派生：NULL ポインタへの添字は、対象の展開で
              // ホスト例外に化けず、NULL へのアクセスとして名指しする
              if (target === null)
                api.fail("NULLポインタへのアクセスです", a, "未定義動作");
              let ptr = { ...target, offset: target.offset + index },
                mem = deref(ptr, s, api, a, elemTypeOf(a, s)),
                value = mem.values[ptr.offset];
              if (value?.kind === "uninitialized")
                api.fail("未初期化の配列要素です", a, "未定義動作");
              return { handled: true, value };
            }
            // B8（cpp-engine-a）：std::numbers の数学定数と
            // std::string::npos。npos の実値は size_t の最大値
            // （18446744073709551615）で安全整数の範囲外のため、
            // モデルでは「見つからなかった位置」の番兵として -1 で
            // 表す（find 系の戻り値と一致させ、== npos の慣用形が
            // そのまま成り立つようにする。報告書に制限として明記）。
            if (language === "cpp" && a.k === "member" && a.target?.k === "var") {
              if (a.target.name === "numbers") {
                const numbersConsts = {
                  e: Math.E,
                  log2e: Math.log2(Math.E),
                  log10e: Math.log10(Math.E),
                  pi: Math.PI,
                  inv_pi: 1 / Math.PI,
                  inv_sqrtpi: 0.56418958354775628695,
                  ln2: Math.LN2,
                  ln10: Math.LN10,
                  sqrt2: Math.SQRT2,
                  sqrt3: 1.7320508075688772935,
                  egamma: 0.57721566490153286061,
                  phi: 1.6180339887498948482,
                };
                if (Object.hasOwn(numbersConsts, a.name))
                  return { handled: true, value: numbersConsts[a.name] };
                api.fail(`std::numbers::${a.name} は未対応です`, a, "未対応");
              }
              if (a.target.name === "string" && a.name === "npos")
                return { handled: true, value: -1 };
            }
            if (managed && a.k === "member") {
              if (a.target.k === "var") {
                const key = a.target.name + "." + a.name,
                  statics = {
                    "int.MaxValue": 2147483647,
                    "int.MinValue": -2147483648,
                    "uint.MaxValue": 4294967295,
                    "uint.MinValue": 0,
                    "short.MaxValue": 32767,
                    "short.MinValue": -32768,
                    "byte.MaxValue": 255,
                    "byte.MinValue": 0,
                    "sbyte.MaxValue": 127,
                    "sbyte.MinValue": -128,
                    "char.MaxValue": "\uffff",
                    "char.MinValue": "\u0000",
                    "Math.PI": Math.PI,
                    "Math.E": Math.E,
                    "String.Empty": "",
                    "string.Empty": "",
                    // === 高度モード ブロックB5（C#）修正2A：型名レジストリ補完（ここから） ===
                    // CS-F02／CS-F09-3：CLR 型名形をエイリアス等価として
                    // 登録する。値は全て ~/dotnet（SDK 8.0.428）実走で
                    // 裏付けた（Single は float の最大値の倍精度表現、
                    // Double は double の最大値そのもの）。
                    "Int32.MaxValue": 2147483647,
                    "Int32.MinValue": -2147483648,
                    "Int16.MaxValue": 32767,
                    "Int16.MinValue": -32768,
                    "UInt16.MaxValue": 65535,
                    "UInt16.MinValue": 0,
                    "ushort.MaxValue": 65535,
                    "ushort.MinValue": 0,
                    "UInt32.MaxValue": 4294967295,
                    "UInt32.MinValue": 0,
                    "SByte.MaxValue": 127,
                    "SByte.MinValue": -128,
                    "Byte.MaxValue": 255,
                    "Byte.MinValue": 0,
                    "Char.MaxValue": "\uffff",
                    "Char.MinValue": "\u0000",
                    "Boolean.TrueString": "True",
                    "Boolean.FalseString": "False",
                    "bool.TrueString": "True",
                    "bool.FalseString": "False",
                    "Single.MaxValue": 3.4028234663852886e38,
                    "Single.MinValue": -3.4028234663852886e38,
                    "float.MaxValue": 3.4028234663852886e38,
                    "float.MinValue": -3.4028234663852886e38,
                    "Double.MaxValue": 1.7976931348623157e308,
                    "Double.MinValue": -1.7976931348623157e308,
                    "double.MaxValue": 1.7976931348623157e308,
                    "double.MinValue": -1.7976931348623157e308,
                    // === 高度モード ブロックB5（C#）修正2A：型名レジストリ補完（ここまで） ===
                  };
                if (Object.hasOwn(statics, key))
                  return { handled: true, value: statics[key] };
                if (key === "long.MaxValue" || key === "long.MinValue" || key === "ulong.MaxValue")
                  return {
                    handled: true,
                    value: unknown(key + "（64ビット境界値）"),
                  };
                // === 高度モード ブロックB5（C#）修正2A（ここから） ===
                // CS-F02：64ビット境界値の CLR 名形もエイリアス形と
                // 同じく未確定値として返す。Decimal は96ビット精度を
                // 再現できないため、下の型名表で名前付き停止に倒す。
                if (key === "Int64.MaxValue" || key === "Int64.MinValue" || key === "UInt64.MaxValue")
                  return {
                    handled: true,
                    value: unknown(key + "（64ビット境界値）"),
                  };
                // === 高度モード ブロックB5（C#）修正2A（ここまで） ===
                if (
                  ["int", "long", "double", "float", "char", "bool", "string", "String", "Math", "short", "uint", "ulong", "ushort", "byte", "sbyte", "DateTime", "Console"].includes(a.target.name)
                )
                  api.fail(
                    `型 ${a.target.name} のメンバー ${a.name} は未対応です`,
                    a,
                    "未対応",
                  );
                // === 高度モード ブロックB5（C#）修正2A（ここから） ===
                // CS-F02／CS-F09-3：CLR 型名・TimeSpan・Decimal・
                // ConsoleColor のメンバー読み取りも、NameError では
                // なく型とメンバーを名指した未対応停止にする
                // （TimeSpan.Zero／MaxValue／MinValue は値を捏造しない）。
                if (
                  ["Int32", "Int64", "Int16", "UInt16", "UInt32", "UInt64", "SByte", "Byte", "Char", "Boolean", "Single", "Double", "Decimal", "decimal", "TimeSpan", "ConsoleColor"].includes(a.target.name)
                )
                  api.fail(
                    `型 ${a.target.name} のメンバー ${a.name} は未対応です`,
                    a,
                    "未対応",
                  );
                // === 高度モード ブロックB5（C#）修正2A（ここまで） ===
              }
              let obj = api.read(a.target, s);
              if (obj === null)
                api.fail("null参照です", a, "NullReferenceException");
              // D12 根因：ReadLine 結果のような未確定の文字列でも
              // .Length は実在するプロパティであり、「フィールドが
              // ありません」は虚偽の理由。未確定値として伝播させる。
              if (isUnknown(obj))
                return {
                  handled: true,
                  value: unknown(`未確定の対象の ${a.name}`),
                };
              if (a.name === "Length" && Array.isArray(obj)) {
                // R28-N19：矩形配列の Length は全要素数（実 C# どおり）。
                // ジャグ配列は従来どおり外側の長さ。
                let rootNodeL = a.target;
                while (rootNodeL?.k === "index") rootNodeL = rootNodeL.target;
                const rootTypeL =
                  rootNodeL?.k === "var" ? s.types[rootNodeL.name] : null;
                if (rootTypeL && rootTypeL.includes(",]")) {
                  const countAll = (x) =>
                    Array.isArray(x) ? x.reduce((acc, y) => acc + countAll(y), 0) : 1;
                  return { handled: true, value: countAll(obj) };
                }
                return { handled: true, value: obj.length };
              }
              if (typeof obj === "string") {
                if (a.name === "Length")
                  return { handled: true, value: obj.length };
                api.fail(
                  `文字列のメンバー ${a.name} は未対応です`,
                  a,
                  "未対応",
                );
              }
              if (!obj || !Object.hasOwn(obj, a.name))
                api.fail(
                  "フィールドがありません：" + a.name,
                  a,
                  "CompileError",
                );
              return { handled: true, value: obj[a.name] };
            }
            return null;
          },
          write(a, v, s, api, node) {
            // B8: コンテナ／イテレータ／pair への書き込み。
            if (language === "cpp" && cppWrite(a, v, s, api, node)) return true;
            if (a.k === "var") {
              if (!Object.hasOwn(s.types, a.name))
                api.fail(
                  "変数が宣言されていません：" + a.name,
                  node,
                  "CompileError",
                );
              let type = s.types[a.name];
              if (!managed && type.endsWith("[]")) api.fail("配列へは代入できません", node, "CompileError");
              if (s.references[a.name]) {
                const ptr = s.references[a.name], mem = deref(ptr, s, api, node);
                const value = cast(v, type, s, node, api);
                mem.values[ptr.offset] = value;
                for (const [name, id] of Object.entries(s.addresses))
                  if (id === ptr.object && !s.types[name]?.endsWith("[]")) s.vars[name] = value;
                return true;
              }
              s.vars[a.name] = cast(v, type, s, node, api);
              let id = s.addresses[a.name];
              if (id) {
                s.model.memory[id].values[0] = s.vars[a.name];
                for (const [name, ptr] of Object.entries(s.references)) if (ptr.object === id) s.vars[name] = s.vars[a.name];
              }
              return true;
            }
            if (
              !managed &&
              a.k === "index" &&
              a.target.k === "var" &&
              s.types[a.target.name] === "string" &&
              typeof s.vars[a.target.name] === "string"
            ) {
              const current = s.vars[a.target.name],
                index = api.read(a.indexes[0], s);
              // R23-N5 書き込み側：非整数の添字は範囲の問題ではなく型の問題。
              if (!Number.isInteger(index))
                api.fail("添字は整数型でなければなりません", node, "CompileError");
              if (index < 0 || index >= current.length)
                api.fail("文字列の有効範囲外への書き込みです", node, "未定義動作");
              const ch = cast(v, "char", s, node, api);
              const next =
                current.slice(0, index) +
                (typeof ch === "string" ? ch : String.fromCharCode(ch)) +
                current.slice(index + 1);
              s.vars[a.target.name] = next;
              const id = s.addresses[a.target.name];
              if (id && s.model.memory[id]) s.model.memory[id].values[0] = next;
              return true;
            }
            // RG-376：文字列値への添字書込みの一般形（a[0][0] = 'z' 等）。
            // スカラー string 変数への書込みは上の専用経路が処理するが、
            // 配列要素の文字列は読み取りが文字列値を返すため、下の
            // ポインタ経路では「モデルポインタと整数添字が必要です」に
            // 化けていた。対象式の型が string で、実際の値も文字列の
            // ときだけ、文字列を組み替えて対象コンテナへ書き戻す
            // （書き戻しは要素代入・スカラー代入の既存経路が担う）。
            // 範囲・型の停止理由はスカラー形と揃える。
            if (
              !managed &&
              a.k === "index" &&
              !(a.target.k === "var" && s.types[a.target.name] === "string") &&
              typeOf(a.target, s) === "string"
            ) {
              const current = api.read(a.target, s);
              if (typeof current === "string") {
                const index = api.read(a.indexes[0], s);
                if (!Number.isInteger(index))
                  api.fail("添字は整数型でなければなりません", node, "CompileError");
                if (index < 0 || index >= current.length)
                  api.fail("文字列の有効範囲外への書き込みです", node, "未定義動作");
                const ch = cast(v, "char", s, node, api);
                const next =
                  current.slice(0, index) +
                  (typeof ch === "string" ? ch : String.fromCharCode(ch)) +
                  current.slice(index + 1);
                api.write(a.target, next, s, api, node);
                return true;
              }
            }
            if (
              !managed &&
              (a.k === "index" || (a.k === "unary" && a.op === "*"))
            ) {
              let ptr =
                  a.k === "index"
                    ? targetPointer(a, s, api, node)
                    : api.read(a.arg, s),
                mem = deref(ptr, s, api, node, elemTypeOf(a, s));
              let value = cast(v, mem.type, s, node, api);
              mem.values[ptr.offset] = value;
              let variable = mem.name;
              if (
                s.types[variable] &&
                !s.types[variable].endsWith("[]") &&
                ptr.offset === 0
              )
                s.vars[variable] = value;
              for (const [name, alias] of Object.entries(s.references)) if (alias.object === ptr.object && alias.offset === ptr.offset) s.vars[name] = value;
              return true;
            }
            if (managed && a.k === "index") {
              // R29-N20：書き込み側も読み取りと同じ添字形の照合を行う
              // （矩形への a[0][1]／a[1]、ジャグへの a[0,1] は CS0022）。
              csCheckIndex(a, s, api, node);
              // R28-N19：a[1,1]（矩形）／a[0][1]（ジャグ連鎖）の書き込み
              // にも対応する。対象の入れ子配列を全添字でたどり、最後の
              // 添字の位置へ要素型で cast して書き込む。ジャグの行代入
              // （a[0] = new int[]{...}）は配列そのものを割り当てる。
              let rootNode = a;
              while (rootNode?.k === "index") rootNode = rootNode.target;
              const rootNameW =
                rootNode?.k === "var" ? rootNode.name : callName(a.target);
              let array = api.read(a.target, s);
              // R25-N28：null 配列への要素代入は IndexOutOfRangeException
              // ではなく NullReferenceException（dotnet 実測。読み取り
              // 添字・.Length と同じ経路に揃える）。
              if (array === null)
                api.fail("null参照です", node, "NullReferenceException");
              // 連鎖形（a[0][1]）では a.target の読み取りが対象の行を
              // 返すため、ここでの array は最終コンテナそのものになる。
              // a[1,1] 形では indexes が全次元を持つため、最後の1つを
              // 残してたどる。
              let container = array;
              let index;
              if (a.indexes.length > 1) {
                container = array;
                for (let d = 0; d < a.indexes.length - 1; d++) {
                  let iv = api.read(a.indexes[d], s);
                  if (
                    typeof iv === "string" &&
                    iv.length === 1 &&
                    typeOf(a.indexes[d], s) === "char"
                  )
                    iv = iv.charCodeAt(0);
                  if (!Number.isInteger(iv))
                    api.fail("添字は整数型でなければなりません", node, "CompileError");
                  if (!Array.isArray(container) || iv < 0 || iv >= container.length)
                    api.fail("配列範囲外です", node, "IndexOutOfRangeException");
                  container = container[iv];
                  if (container === null)
                    api.fail("null参照です", node, "NullReferenceException");
                }
                index = api.read(a.indexes[a.indexes.length - 1], s);
                var lastIdxNode = a.indexes[a.indexes.length - 1];
              } else {
                index = api.read(a.indexes[0], s);
                var lastIdxNode = a.indexes[0];
              }
              // R23-N5 書き込み側：非整数の添字を範囲外と誤診しない。
              if (
                typeof index === "string" &&
                index.length === 1 &&
                typeOf(lastIdxNode, s) === "char"
              )
                index = index.charCodeAt(0);
              if (!Number.isInteger(index))
                api.fail("添字は整数型でなければなりません", node, "CompileError");
              if (
                !Array.isArray(container) ||
                index < 0 ||
                index >= container.length
              )
                api.fail("配列範囲外です", node, "IndexOutOfRangeException");
              const type = s.types[rootNameW]?.replace(/(\[\]|\[,*\])+$/, "");
              if (!type) api.fail("この配列要素型の推定は未対応です", node, "未対応");
              container[index] =
                Array.isArray(v) ||
                (v === null && (type === "string" || classes[type]))
                  ? v
                  : cast(v, type, s, node, api);
              return true;
            }
            if (managed && a.k === "member") {
              // === 高度モード ブロックB5（C#）修正2A（ここから） ===
              // CS-F09-3：型名へのメンバー書き込み（Console.Title や
              // Console.ForegroundColor への代入形）は、対象を読む前に
              // 型とメンバーを名指した未対応停止にする（従来は対象の
              // 読み取りが NameError になっていた）。読み取り側の型名
              // 表（エイリアス形＋CLR 名形）と同範囲を対象にする。
              if (
                a.target.k === "var" &&
                ["int", "long", "double", "float", "char", "bool", "string", "String", "Math", "short", "uint", "ulong", "ushort", "byte", "sbyte", "DateTime", "TimeSpan", "Console", "Int32", "Int64", "Int16", "UInt16", "UInt32", "UInt64", "SByte", "Byte", "Char", "Boolean", "Single", "Double", "Decimal", "decimal", "ConsoleColor"].includes(a.target.name)
              )
                api.fail(
                  `型 ${a.target.name} のメンバー ${a.name} は未対応です`,
                  node,
                  "未対応",
                );
              // === 高度モード ブロックB5（C#）修正2A（ここまで） ===
              let obj = api.read(a.target, s);
              if (obj === null)
                api.fail("null参照です", node, "NullReferenceException");
              let field = classes[obj?.__class]?.[a.name];
              if (!field)
                api.fail("フィールドがありません", node, "CompileError");
              obj[a.name] = cast(v, field.type, s, node, api);
              return true;
            }
            return false;
          },
          binary(op, a, b, node, s, api) {
            if (isUnknown(a) || isUnknown(b)) return baseBinary(op, a, b);
            if (!managed) {
              if (typeof a === "boolean") a = Number(a);
              if (typeof b === "boolean") b = Number(b);
            }
            if (isPtr(a) || isPtr(b)) {
              // A6監査CF-02：等価比較（== / !=）は具体評価する。相手は
              // ポインタ同士（対象＋位置の同一性）か NULL／整数 0
              // （実ポインタは決して等しくない）。関係演算などは従来
              // どおり名指しで止める。
              if (op === "==" || op === "!=") {
                const nullish = (v) => v === null || v === 0;
                let eq;
                if (isPtr(a) && isPtr(b))
                  eq = a.object === b.object && a.offset === b.offset;
                else if (isPtr(a) && nullish(b)) eq = false;
                else if (isPtr(b) && nullish(a)) eq = false;
                else api.fail("このポインタ比較・演算は未対応です", node);
                return op === "==" ? eq : !eq;
              }
              if (op === "+" || op === "-") {
                let ptr = isPtr(a) ? a : b,
                  amount = isPtr(a) ? b : a;
                if (!Number.isInteger(amount) || (!isPtr(a) && op === "-"))
                  api.fail("未対応のポインタ演算です", node);
                let next = {
                    ...ptr,
                    offset: ptr.offset + (op === "-" ? -amount : amount),
                  },
                  mem = s.model.memory[ptr.object];
                // A6監査CF-03：要素幅の広い型のポインタでは、形成範囲も
                // バイト単位で判定する（ヒープの char メモリ等）。
                const ew = byteSizeOf(pointeeTypeOf(isPtr(a) ? (node.k === "assign" ? node.target : node.a) : (node.k === "assign" ? node.value : node.b), s)),
                  mw = mem ? byteSizeOf(mem.type) : 0;
                if (
                  ew > 0 && mw > 0 && ew > mw
                    ? next.offset < 0 || next.offset * ew > mem.values.length * mw
                    : next.offset < 0 || next.offset > mem.values.length
                )
                  api.fail(
                    "配列の先頭〜一つ先を超えるポインタ演算",
                    node,
                    "未定義動作",
                  );
                return next;
              }
              api.fail("このポインタ比較・演算は未対応です", node);
            }
            // A6収束ラウンド第2回：ヌルポインタ値（モデルでは JS の null）と
            // 数値の等価比較。C11 6.3.2.3／6.5.9（C++ も同旨）では整数定数 0 は
            // ヌルポインタ定数であり、ポインタとの等価比較ではポインタ型へ
            // 変換されるため、null と 0 は等しく、null と 0 以外の数値は等しく
            // ない。従来はこの経路が baseBinary の JS 緩い等価（null == 0 が
            // false）に委ねられ、NULL == 0 が実 C と逆の 0 を返していた。
            // 関係演算は JS 側でも null が 0 に読み替えられて実 C と一致する
            // ため対象外とし、ポインタ実体との比較は上の CF-02 ブロックが
            // 担う（実ポインタは null／0 と決して等しくない）。
            if (
              !managed &&
              (op === "==" || op === "!=") &&
              (a === null || b === null) &&
              (a === null || typeof a === "number") &&
              (b === null || typeof b === "number")
            ) {
              const eq = (a === null ? 0 : a) === (b === null ? 0 : b);
              return op === "==" ? eq : !eq;
            }
            const na = node.k === "assign" ? node.target : node.a,
              nb = node.k === "assign" ? node.value : node.b;
            const lt = typeOf(na, s),
              rt = typeOf(nb, s);
            // B8: イテレータ演算・コンテナ／pair の比較。
            if (language === "cpp") {
              const r = cppBinary(op, a, b, node, s, api, lt, rt);
              if (r) return r.value;
            }
            if (managed) {
              if (
                ["&", "|", "^"].includes(op) &&
                typeof a === "boolean" &&
                typeof b === "boolean"
              )
                return op === "&" ? a && b : op === "|" ? a || b : a !== b;
              // char promotes to its numeric code unless the other side is
              // a genuine string (then it is string concatenation).
              if (lt === "char" && rt !== "string" && typeof a === "string")
                a = a.charCodeAt(0);
              if (rt === "char" && lt !== "string" && typeof b === "string")
                b = b.charCodeAt(0);
              if (op === "+" && (lt === "string" || rt === "string")) {
                // P-N1: 文字列連結は実体を作る前に長さを見積もる。C系の
                // 契約はフェーズ1（P-N3）で「上限で日本語の理由を付けて
                // 停止」と定まっているため、ホストが実際に死ぬのを待たず
                // 上限 200,000 で決定的に同じ停止を発生させる。
                const ta = csConcatText(a, lt, na, s),
                  tb = csConcatText(b, rt, nb, s);
                if (ta.length + tb.length > 200000)
                  throw hostErrorAsPractice(
                    new RangeError("Invalid string length"),
                    node?.line,
                  );
                return ta + tb;
              }
              if (["==", "!=", "<", ">", "<=", ">="].includes(op)) {
                // R7-164（修正バッチ13）：非 null 許容の値型と null の比較は
                // 実 C# では CS0472 警告のみで、== は常に False、!= は常に
                // True、関係演算は常に False（リフトした演算子。dotnet
                // 8.0.428 実測）。「比較できません」の CompileError は
                // 虚偽の言語規則だったため、確定した真偽を返す。
                {
                  const nullSide = (t, v) =>
                    v === null
                      ? "null"
                      : t === "bool" || typeof v === "boolean"
                        ? "bool"
                        : t === "char"
                          ? "char"
                          : typeof v === "number" || ["sbyte", "byte", "short", "ushort", "int", "uint", "long", "ulong", "float", "double"].includes(t)
                            ? "number"
                            : null;
                  const ca0 = nullSide(lt, a),
                    cb0 = nullSide(rt, b);
                  if (
                    (ca0 === "null" && ["number", "bool", "char"].includes(cb0)) ||
                    (cb0 === "null" && ["number", "bool", "char"].includes(ca0))
                  )
                    return op === "!=";
                }
                const cat = (t, v) =>
                  v === null
                    ? "null"
                    : t === "string" || (typeof v === "string" && t !== "char")
                      ? "string"
                      : t === "bool" || typeof v === "boolean"
                        ? "bool"
                        : t === "char"
                          ? "char"
                          : v && typeof v === "object"
                            ? "ref"
                            : "number";
                const ca = cat(lt, a),
                  cb = cat(rt, b);
                if (ca !== cb) {
                  const numericMix =
                    ["number", "char"].includes(ca) &&
                    ["number", "char"].includes(cb);
                  // RG-05（R20-N8）: null との比較ができるのは参照型（string／ref）
                  // だけ。bool・数値・char など値型と null の等値比較は実 C# では
                  // CS0019 のコンパイルエラーであり、無言で false にしない。
                  const nullOk =
                    (ca === "null" && (cb === "string" || cb === "ref")) ||
                    (cb === "null" && (ca === "string" || ca === "ref"));
                  if (!numericMix && !nullOk)
                    api.fail(
                      `型が一致しません：${ca === "null" ? "null" : lt} と ${cb === "null" ? "null" : rt} は比較できません`,
                      node,
                      "CompileError",
                    );
                }
                if (ca === "null" || cb === "null") {
                  if (!["==", "!="].includes(op))
                    api.fail("null との関係比較はできません", node, "CompileError");
                } else if (ca === "string" && !["==", "!="].includes(op))
                  api.fail(
                    "文字列に関係演算子（<、>、<=、>=）は使えません",
                    node,
                    "CompileError",
                  );
                else if (ca === "bool" && !["==", "!="].includes(op))
                  api.fail(
                    "bool に関係演算子（<、>、<=、>=）は使えません",
                    node,
                    "CompileError",
                  );
              }
            }
            // RG-71（R19-N9）: C++ では std::string と数値の比較演算子は存在しない。
            // 無言で真偽を合成せず、型の組み合わせを指して停止する。
            // （文字列リテラル・char* との比較は実 C++ でも有効なので対象外）
            // R7-163（修正バッチ13）: std::string と char の比較演算子も
            // 存在しない（g++ 13 実測：no match for 'operator=='、operand
            // types are 'std::string' and 'char'）。旧コメントの「char との
            // 比較は有効」は誤りで、 RG-71 の変換は虚偽の成功だった。
            // char との + （連結）は operator+ の char オーバーロードが
            // 実在するため、下の RG-40 ブロックで従来どおり扱う。
            if (
              !managed &&
              language === "cpp" &&
              ["==", "!=", "<", ">", "<=", ">="].includes(op)
            ) {
              const otherOk = (t) =>
                t === "string" || t === "char[]" || t.endsWith("*");
              if (
                (lt === "string" && !otherOk(rt)) ||
                (rt === "string" && !otherOk(lt))
              )
                api.fail(
                  `型が一致しません：std::string と ${lt === "string" ? rt : lt} は比較できません`,
                  node,
                  "CompileError",
                );
            }
            // RG-40 追加表面（R21-N2）: std::string と char の + は実 C++ でも
            // 連結（operator+ の char オーバーロード）。char の数値コードを
            // 1文字へ戻してから文字列連結として扱う。char + char は数値のまま。
            if (!managed && language === "cpp" && op === "+") {
              if (lt === "string" && rt === "char" && typeof b === "number")
                b = String.fromCharCode(b);
              if (rt === "string" && lt === "char" && typeof a === "number")
                a = String.fromCharCode(a);
            }
            if (
              !managed &&
              language === "cpp" &&
              op === "+" &&
              typeof a === "string" &&
              typeof b === "string" &&
              // RG-376：複合代入（文位置の assign ノード）でも、被演算子
              // の型に string が含まれるかを併せて見る。従来は代入先が
              // スカラー変数の場合しか連結を認めず、a[0] += "X" のような
              // 配列要素への複合代入が（要素型の誤判定と相まって）
              // 型不一致で停止していた。スカラー string 変数への従来の
              // 認定はそのまま残す。
              (node.k === "assign" ? s.types[callName(node.target)] === "string" || [lt, rt].includes("string") : [lt, rt].includes("string"))
            ) {
              // P-N1: C++ の std::string 連結も同じ上限・同じ停止契約
              // （P-N3 のホスト例外漏れの発生源自体を断つ）。
              const ta = String(a ?? ""),
                tb = String(b ?? "");
              if (ta.length + tb.length > 200000)
                throw hostErrorAsPractice(
                  new RangeError("Invalid string length"),
                  node?.line,
                );
              return ta + tb;
            }
            const arithmetic = arithmeticType(lt, rt, s);
            // D5 根因：C／C++ では % の被演算子は整数型でなければならず、
            // 浮動小数点数同士の剰余はコンパイルエラー。fmod 相当の値を
            // 黙って返していた。C# では浮動小数点の % も定義済みのため
            // managed は対象外。
            if (
              !managed &&
              op === "%" &&
              (["double", "float"].includes(lt) || ["double", "float"].includes(rt))
            )
              api.fail(
                "剰余演算子 % の被演算子は整数型でなければなりません",
                node,
                "CompileError",
              );
            if (op === "<<" || op === ">>") {
              if (typeof a !== "number" || typeof b !== "number")
                api.fail("シフト演算の型が一致しません", node, "CompileError");
              if (["double", "float"].includes(arithmetic))
                api.fail("シフト演算は整数型専用です", node, "CompileError");
              const bits = width(arithmetic, s);
              let count = b;
              if (managed) count = b & (bits === 64 ? 63 : 31);
              else if (count < 0 || count >= bits)
                api.fail(
                  "シフト量が型のビット幅以上です",
                  node,
                  "未定義動作",
                );
              if (!Number.isSafeInteger(a))
                api.fail("シフト演算の安全整数範囲外です", node, "未確認");
              const x = BigInt(a);
              let result = op === "<<" ? x << BigInt(count) : x >> BigInt(count);
              if (arithmetic.startsWith("unsigned") || ["uint", "ulong"].includes(arithmetic)) {
                result = BigInt.asUintN(bits, result);
                if (result > BigInt(Number.MAX_SAFE_INTEGER))
                  api.fail("シフト結果が安全整数範囲外です", node, "未確認");
                return Number(result);
              }
              const min = -(1n << BigInt(bits - 1)),
                max = (1n << BigInt(bits - 1)) - 1n;
              if (result < min || result > max) {
                if (!managed)
                  api.fail("符号付き整数のオーバーフロー", node, "未定義動作");
                // R7-166（修正バッチ13）：C# のシフト演算は checked 文脈の
                // 対象外で、結果はビット幅で折り返す（dotnet 8.0.428 実測：
                // checked(x<<31) も checked ブロック内の x<<31 も
                // -2147483648。例外は出ない）。
                result = BigInt.asIntN(bits, result);
              }
              if (!Number.isSafeInteger(Number(result)))
                api.fail("シフト結果が安全整数範囲外です", node, "未確認");
              return Number(result);
            }
            if (["&", "|", "^"].includes(op)) {
              if (
                typeof a === "number" &&
                typeof b === "number" &&
                Number.isInteger(a) &&
                Number.isInteger(b) &&
                !["double", "float"].includes(arithmetic)
              ) {
                const bits = width(arithmetic, s);
                if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b))
                  api.fail("ビット演算の安全整数範囲外です", node, "未確認");
                let result =
                  op === "&"
                    ? BigInt(a) & BigInt(b)
                    : op === "|"
                      ? BigInt(a) | BigInt(b)
                      : BigInt(a) ^ BigInt(b);
                result = arithmetic.startsWith("unsigned") || ["uint", "ulong"].includes(arithmetic)
                  ? BigInt.asUintN(bits, result)
                  : BigInt.asIntN(bits, result);
                if (!Number.isSafeInteger(Number(result)))
                  api.fail("ビット演算の結果が安全整数範囲外です", node, "未確認");
                return Number(result);
              }
              api.fail("演算する型が一致しません", node, "CompileError");
            }
            if (!managed && arithmetic.startsWith("unsigned") && !["&&", "||"].includes(op)) {
              if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) api.fail("unsigned演算の安全整数範囲外です", node, "未確認");
              const bits = width(arithmetic, s), x = BigInt.asUintN(bits, BigInt(a)), y = BigInt.asUintN(bits, BigInt(b));
              if (["==", "!=", "<", ">", "<=", ">="].includes(op)) return baseBinary(op, x, y);
              if (["/", "%"].includes(op) && y === 0n) api.fail("整数の0除算です", node, "未定義動作");
              if (!["+", "-", "*", "/", "%"].includes(op)) api.fail("このunsigned演算", node, "未対応");
              const result = BigInt.asUintN(bits, op === "+" ? x+y : op === "-" ? x-y : op === "*" ? x*y : op === "/" ? x/y : x%y);
              if (result > BigInt(Number.MAX_SAFE_INTEGER)) api.fail("unsigned演算の結果が安全整数範囲外です", node, "未確認");
              return Number(result);
            }
            if (["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(op))
              return baseBinary(op, a, b);
            if (typeof a !== "number" || typeof b !== "number")
              api.fail("演算する型が一致しません", node, "CompileError");
            let type =
                arithmetic,
              integer = !["double", "float"].includes(type);
            if ((op === "/" || op === "%") && b === 0 && integer)
              api.fail(
                "整数の0除算です",
                node,
                managed ? "DivideByZeroException" : "未定義動作",
              );
            let result =
              op === "/" && integer ? Math.trunc(a / b) : baseBinary(op, a, b);
            // A5班監査: Math.trunc は -1/3 のような商で -0 を返すが、
            // 整数除算・剰余の結果に負のゼロは存在しない（実 C#／C／
            // C++ では 0）。% 側だけにあった正規化を / にも広げる。
            // 浮動小数点の -0 は正当なため integer の場合に限る。
            if ((op === "/" || op === "%") && integer && result === 0) result = 0;
            if (
              integer &&
              Number.isInteger(a) &&
              Number.isInteger(b) &&
              ["+", "-", "*"].includes(op)
            ) {
              let x = BigInt(a),
                y = BigInt(b),
                value = op === "+" ? x + y : op === "-" ? x - y : x * y,
                bits = BigInt(width(type, s)),
                // D3 兄弟表面：C# の uint／ulong 演算は符号なし範囲で
                // 折り返す。符号付きの min／max で判定すると uint の
                // 加算が int の範囲で誤って折り返されていた。
                unsignedArith = ["uint", "ulong"].includes(type),
                min = unsignedArith ? 0n : -(1n << (bits - 1n)),
                max = unsignedArith ? (1n << bits) - 1n : (1n << (bits - 1n)) - 1n;
              if (value < min || value > max) {
                if (!managed)
                  api.fail("符号付き整数のオーバーフロー", node, "未定義動作");
                let constant =
                  node.a?.k === "literal" && node.b?.k === "literal";
                if (s.checked || constant)
                  api.fail(
                    "整数のオーバーフロー",
                    node,
                    constant ? "CompileError" : "OverflowException",
                  );
                value = unsignedArith
                  ? BigInt.asUintN(Number(bits), value)
                  : BigInt.asIntN(Number(bits), value);
              }
              if (
                value > BigInt(Number.MAX_SAFE_INTEGER) ||
                value < BigInt(Number.MIN_SAFE_INTEGER)
              )
                api.fail("64ビット精度の上限です", node, "未確認");
              result = Number(value);
            }
            if (
              integer &&
              b === -1 &&
              ["/", "%"].includes(op) &&
              a === -(2 ** (width(type, s) - 1))
            )
              api.fail(
                "整数除算のオーバーフロー",
                node,
                managed ? "OverflowException" : "未定義動作",
              );
            if (type === "float") {
              result = Math.fround(result);
              if (!managed && !Number.isFinite(result)) api.fail("float演算結果が有限のモデル範囲外です", node, "未確認");
            }
            return result;
          },
          call(name, args, s, api, node) {
            // B8: コンテナのメンバ呼び出しと <algorithm> 等の自由関数。
            if (language === "cpp") {
              const r = cppCall(name, args, s, api, node);
              if (r) return r.value;
            }
            if (!managed && builtinTypes.includes(name)) api.fail("キャストのこの形式は未対応です（関数形式ではなく (型)式 を使用してください）", node, "未対応");
            if (managed && ["checked", "unchecked"].includes(name)) {
              if (args.length !== 1)
                api.fail(name + " 式は1つの引数を取ります", node);
              const old = s.checked,
                oldMode = s.checkMode;
              s.checked = name === "checked";
              // R28-N22：定数式の規則は「既定」と「明示 unchecked」で
              // 異なる（既定は checked 相当の CS0221、明示 unchecked は
              // 折り返し）。s.checked だけでは両者を区別できないため、
              // 明示文脈を別に保持する。
              s.checkMode = name;
              try {
                return api.read(args[0], s);
              } finally {
                s.checked = old;
                s.checkMode = oldMode;
              }
            }
            if (language === "cpp" && name === "getline") {
              if (args.length !== 2 || args[0]?.k !== "var" || args[0].name !== "cin")
                api.fail("std::getline は std::getline(std::cin, 変数) の形式のみ対応します", node, "未対応");
              const v = api.freshUnknown("標準入力の1行", s);
              api.write(args[1], v, s, node);
              // R7-95（修正バッチ13）：戻り値は読み取った文字列ではなく
              // std::istream&。文字列と区別できる専用マーカーを返し、
              // 変数への初期化・代入は cast 側で名指し停止する。
              return unknown(
                "std::getline の戻り値（std::istream&）",
                "getline-result",
              );
            }
            if (managed && ["int.TryParse", "double.TryParse"].includes(name)) {
              // The out argument is write-only: it must not be read first
              // (it is normally uninitialized at this point).
              if (args.length !== 2)
                api.fail("TryParse は（文字列, out 変数）の2引数形式のみ対応します", node, "未対応");
              // R25-N27：`out _` ディスカード（解析段階でマーカーへ
              // 置換済み）は書き込み先を持たない。変数を生成せず、
              // 成否だけを返す。
              const isDiscard =
                args[1]?.k === "var" && args[1]?.name === "__tryParseDiscard";
              const writeOut = (val) => {
                if (!isDiscard) api.write(args[1], val, s, node);
              };
              const text = api.read(args[0], s);
              // R24-N34：第1引数 null は例外ではなく変換失敗（False）。
              // 実 C# の TryParse は null を受け付け、false を返す
              // （dotnet 実測。"" が False であることと一貫させる）。
              if (text === null) {
                writeOut(0);
                return false;
              }
              if (typeof text !== "string")
                api.fail("TryParse の第1引数は文字列です", node, "CompileError");
              let ok = false,
                parsed = 0;
              if (name === "int.TryParse") {
                // NumberStyles.Integer：前後の空白と先行符号のみ許可。
                // 桁区切りは認めない（dotnet 実測で "1,000" は False）。
                const t = text.trim();
                if (/^[+-]?\d+$/.test(t)) {
                  const big = BigInt(t);
                  if (big >= -2147483648n && big <= 2147483647n) {
                    ok = true;
                    parsed = Number(big);
                  }
                }
              } else {
                // R24-N33：既定スタイルは Float | AllowThousands。
                // dotnet 実測に基づく受理形：NaN 記号（符号・大小文字
                // 不問）、Infinity 記号、整数部内の桁区切りカンマ
                // （位置は不問だが先頭カンマと小数部・指数部のカンマは
                // 不可）、指数。溢れは ±Infinity、下方溢れは 0 で True。
                // Number() の緩い解釈（"0x10" 等）は実物と異なるため
                // 専用検証に置き換える。
                const t = text.trim();
                const lower = t.toLowerCase(),
                  signless = lower.replace(/^[+-]/, "");
                if (signless === "nan") {
                  ok = true;
                  parsed = NaN;
                } else if (signless === "infinity") {
                  ok = true;
                  parsed = lower.startsWith("-") ? -Infinity : Infinity;
                } else if (
                  /^[+-]?(?:\d[\d,]*(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(t)
                ) {
                  ok = true;
                  parsed = Number(t.replace(/,/g, ""));
                }
              }
              writeOut(ok ? parsed : 0);
              return ok;
            }
            // === 高度モード ブロックB5（C#）修正2A：TryParse 一般化（ここから） ===
            // CS-F08／CS-F09-1：int／double 以外の型名.TryParse は、解析を
            // 通した上で（out 引数を評価する前に）項目名を挙げて停止する。
            if (managed && name.endsWith(".TryParse")) {
              const recvB5 = name.slice(0, -".TryParse".length).split(".").pop();
              if (
                !["int", "double"].includes(recvB5) &&
                Object.hasOwn(
                  {
                    long: 1, Int64: 1, float: 1, Single: 1, bool: 1, Boolean: 1,
                    char: 1, Char: 1, byte: 1, Byte: 1, sbyte: 1, SByte: 1,
                    short: 1, Int16: 1, ushort: 1, UInt16: 1, uint: 1, UInt32: 1,
                    ulong: 1, UInt64: 1, decimal: 1, Decimal: 1,
                    DateTime: 1, TimeSpan: 1,
                  },
                  recvB5,
                )
              )
                api.fail(
                  `${name} は未対応です（対応しているのは int と double のみ）`,
                  node,
                  "未対応",
                );
            }
            // === 高度モード ブロックB5（C#）修正2A：TryParse 一般化（ここまで） ===
            // D13：引数を評価する前に未順序の競合を検査する。
            if (!managed && name === "printf")
              checkUnsequencedArgs(args, node, api);
            let values = args.map((a) => api.read(a, s));
            // B8（cpp-engine-a）：C++ スカラー関数／std::string メンバ。
            // C／C# では従来どおりこの分岐に入らない。
            if (language === "cpp") {
              const r = cppScalarCall(name, args, values, s, api, node);
              if (r) return r.value;
            }
            if (name === "Console.ReadLine") {
              if (!managed) api.fail("未対応の関数です", node);
              // 固定引数関数の同根一掃（R24-N9）：引数なしが正規形で、
              // 引数を渡す呼び出しは実 C# ではコンパイルエラー。
              if (args.length !== 0)
                api.fail("Console.ReadLine は引数を取りません", node, "CompileError");
              return api.freshUnknown("標準入力またはストリーム終端", s);
            }
            if (name === "Console.WriteLine") {
              if (!managed || values.length !== 1)
                api.fail("Console.WriteLineは1引数のみ対応します", node);
              // R7-170（修正バッチ13）：null リテラルそのものは char[] と
              // string の両方へ解釈でき、実 C# では CS0121 の曖昧エラー
              // （dotnet 8.0.428 実測）。null を保持する string 変数や
              // (string)null のキャスト形は従来どおり空行を出力する。
              if (args[0]?.k === "literal" && args[0].value === null)
                api.fail(
                  "Console.WriteLine(null) は呼び出しが曖昧です（CS0121：char[] と string のどちらのオーバーロードか決められません）",
                  node,
                  "CompileError",
                );
              const v0 = values[0],
                argType = typeOf(args[0], s);
              let text;
              if (typeof v0 === "boolean") text = v0 ? "True" : "False";
              else if (v0 === null) text = "";
              // === 高度モード ブロックB5（C#）表示修正（ここから） ===
              // __adv 値（DateTime／TimeSpan／List／HashSet）は、配列
              // 分岐（List／HashSet は配列として保持され、従来は型名を
              // 誤導出していた）より前に C# の ToString 形へ変換する。
              else if (
                managed &&
                v0 &&
                typeof v0 === "object" &&
                v0.__adv &&
                advancedValueText(v0) !== null
              )
                text = advancedValueText(v0);
              // === 高度モード ブロックB5（C#）表示修正（ここまで） ===
              else if (Array.isArray(v0)) {
                // R29-N21：char[] には Console.WriteLine(char[]) の
                // オーバーロードがあり、型名ではなく文字そのものを
                // 出力する（dotnet 実測）。1次元 char[] の場合だけ
                // その扱いにし、それ以外は宣言型から導出した型名。
                const shape = csArrayShape(args[0], s, argType);
                // === 高度モード ブロックB5（C#）修正2A（ここから） ===
                // CS-F05／F06：高度側生成の配列は宣言型から形を導出
                // できないため、要素型タグ __elemSys が "Char" の配列も
                // char[] オーバーロード（文字そのものを出力）で扱う。
                if (
                  (shape?.elem === "char" && shape.suffix === "[]") ||
                  (managed && v0.__elemSys === "Char")
                )
                // === 高度モード ブロックB5（C#）修正2A（ここまで） ===
                  text = v0
                    .map((ch) =>
                      typeof ch === "number"
                        ? String.fromCharCode(ch)
                        : String(ch ?? ""),
                    )
                    .join("");
                else
                  text =
                    csArrayTypeName(args[0], v0, s, argType) ??
                    "System.Int32[]";
              } else if (typeof v0 === "number")
                text =
                  argType === "float"
                    ? csFloatText(v0)
                    : argType === "double" || !Number.isInteger(v0)
                      ? csDoubleText(v0)
                      : Object.is(v0, -0)
                        ? "-0"
                        : String(v0);
              else if (v0 && typeof v0 === "object" && v0.__class)
                text = v0.__class;
              else text = formatValue(transformDisplay(v0));
              s.outputs.push({ channel: name, text, line: node.line });
              api.note(s, node, "標準出力へ出します：" + text);
              return null;
            }
            if (name === "printf") {
              if (managed) api.fail("C#のprintfは未対応です", node);
              // R7-177（修正バッチ13）：書式は文字列リテラルだけでなく
              // char 配列・char* 経由でも渡せる（gcc／g++ 実測：
              // char fmt[]="%d"; printf(fmt,7) は 7 を出力）。ポインタは
              // ヌル終端までの文字列として読み取る。std::string そのもの
              // は const char* へ変換できないため対象外として名指す。
              if (language === "cpp" && typeOf(args[0], s) === "string")
                api.fail(
                  "printf の書式に std::string は使えません（const char* が必要です）",
                  node,
                  "CompileError",
                );
              // 書式処理の実体は formatPrintf（高度モードのライブラリ
              // 拡張と共有するため切り出した。挙動は従来と同一）。
              const text = formatPrintf(values[0], args, values, s, api, node);
              s.outputs.push({ channel: "printf", text, line: node.line });
              api.note(s, node, "標準出力へ出します：" + text);
              return new TextEncoder().encode(text).length;
            }
            if (name === "abs") {
              // D14 兄弟表面：実 C# にグローバル関数 abs は無い。
              if (managed)
                api.fail(
                  "C# に abs 関数はありません（Math.Abs は未対応です）",
                  node,
                  "CompileError",
                );
              // R24-N9 根因：引数の個数・型を一切検査せず、abs() が
              // NaN、abs(1, 2) が先頭引数、abs("x") が NaN を捏造して
              // いた。実物は全てコンパイルエラー（gcc 実測：too few /
              // too many arguments、g++ 実測：no matching function）。
              if (args.length !== 1)
                api.fail(
                  `abs は引数を1つだけ取ります（${args.length}個は渡せません）`,
                  node,
                  "CompileError",
                );
              let v = values[0];
              if (isUnknown(v)) return v;
              if (typeof v !== "number" && typeof v !== "boolean")
                api.fail(
                  "abs の引数は数値でなければなりません",
                  node,
                  "CompileError",
                );
              // D4 根因：abs は引数を int 化せず Math.abs をそのまま
              // 返していたため、%d で 5.5 が表示されていた。C では
              // 引数が int へ変換されてから絶対値を取る。C++ では
              // double オーバーロードが選ばれ結果は double のまま
              // （%d で表示すれば型不一致として停止する）。
              const argType = typeOf(args[0], s);
              if (["float", "double"].includes(argType)) {
                if (language === "cpp") return Math.abs(v);
                const t = Math.trunc(v);
                if (!Number.isFinite(t) || t < -2147483648 || t > 2147483647)
                  api.fail(
                    "浮動小数点から整数への変換が範囲外です",
                    node,
                    "未定義動作",
                  );
                v = t;
              }
              if (v === -2147483648)
                api.fail("absの結果がintで表せません", node, "未定義動作");
              return Math.abs(v);
            }
            // 高度モード（ブロックB6）：種類がライブラリ拡張を持つ
            // 場合のみ、組み込みで扱わなかった名前を委譲する。委譲先が
            // LIBRARY_UNHANDLED を返した名前は従来どおり正直に停止する。
            if (libraryCall) {
              checkUnsequencedArgs(args, node, api);
              const r = libraryCall(name, args, values, s, api, node);
              if (r !== LIBRARY_UNHANDLED) return r;
            }
            // === 高度モード ブロックB5（C#）委譲ブロック（ここから） ===
            // managed（C#）の場合だけ、最終フォールスルーの直前で高度側
            // テーブルへ委譲する。C／C++ の挙動は変えない。テーブルが
            // 対象外（null）を返した場合は従来どおり直後の fail に落ちる。
            if (managed) {
              const adv = handleAdvancedCall({
                name, args, values, s, api, node,
                typeOf, isUnknown, unknown,
                csDoubleText, csFloatText, csArrayTypeName, csArrayShape,
                callName,
              });
              if (adv) return adv.value;
            }
            // === 高度モード ブロックB5（C#）委譲ブロック（ここまで） ===
            api.fail("この関数は説明に対応していません：" + name, node);
          },
          action(n, s, api) {
            if (["cout", "cerr", "clog"].includes(n.action)) {
              // B8: コンテナ・イテレータ・pair 自体の出力は未対応（実 C++ でも
              // 標準の operator<< はない）。engine-a の cerr/clog 拡張と
              // engine-b のコンテナ出力ガードを合成した形。
              if (language === "cpp")
                for (const v of n.values) {
                  const sp = parseCppTypeText(typeOf(v, s));
                  if (sp && ["vector", "array", "pair", "iterator"].includes(sp.kind))
                    api.fail(
                      "コンテナ・イテレータ・pair 自体は std::cout へ出力できません（要素を取り出して出力してください）",
                      n,
                      "未対応",
                    );
                }
              let text = n.values
                .map((v) => { const value = api.read(v, s); const vt = typeOf(v, s); return typeof value === "boolean" ? String(Number(value)) : ["char", "signed char", "unsigned char"].includes(vt) ? String.fromCharCode(value) : isPtr(value) && s.model.memory[value.object]?.type === "char" ? cString(value, s, api, n) : typeof value === "number" ? (Object.is(value, -0) ? "-0" : vt === "double" || vt === "float" || !Number.isInteger(value) ? cppGText(value) : String(value)) : formatValue(transformDisplay(value)); })
                .join("");
              s.outputs.push({ channel: n.action, text, line: n.line });
              api.note(s, n, "標準出力へ出します：" + text);
              return [s];
            }
            if (["checked", "unchecked"].includes(n.action)) {
              if (!managed) api.fail("C#以外では使えません", n);
              let old = s.checked,
                oldMode = s.checkMode;
              s.checked = n.action === "checked";
              s.checkMode = n.action;
              let results = api.run(n.body, [s]);
              for (let state of results) {
                state.checked = old;
                state.checkMode = oldMode;
              }
              return results;
            }
          },
          groups: (p) => [
            {
              title: "変数・参照",
              entries: Object.entries(p.vars).map(([k, v]) => [
                k,
                fmtFor(v, p.types?.[k]),
              ]),
            },
            {
              title: managed
                ? "モデルオブジェクト・配列"
                : "モデルメモリ（実アドレスではありません）",
              entries: Object.entries(p.model.memory).map(([k, v]) => [
                k,
                `${v.name}（${v.type}、${v.alive ? "有効" : "寿命終了"}）：${formatValue(transformDisplay(displayNonFinite(v.values)))}`,
              ]),
            },
          ],
        };
        // P-N3：実行境界でもホスト例外の生文言を漏らさない（文字列の
        // 倍増などで V8 の RangeError が semantics 内から出る経路）。
        for (const key of ["step", "read", "write", "binary", "call", "action"])
          if (semantics[key]) semantics[key] = guardHostErrors(semantics[key]);
        const result = executeProgram(nodes, model, semantics, limits);
        // R31-N8：実行段階のエラー欄・トレースにも内部トークン <eof> を
        // 残さない（解析段階は simulate の catch 側で翻訳する）。
        if (result.paths)
          for (const p of result.paths) {
            if (p.error?.message) p.error.message = translateEofMessage(p.error.message);
            for (const tr of p.trace || [])
              if (tr.text) tr.text = translateEofMessage(tr.text);
          }
        if (result.error?.message)
          result.error.message = translateEofMessage(result.error.message);
        if (result.paths) {
          // User-defined names (C# class names and their field names) can
          // never be reference entries, so they must not leak into trace
          // refs where they would silently drop out of the chips.
          const userNames = new Set();
          for (const [cls, fields] of Object.entries(classes)) {
            userNames.add(cls);
            for (const f of Object.keys(fields)) userNames.add(f);
          }
          if (userNames.size)
            for (const p of result.paths)
              for (const tr of p.trace || [])
                if (tr.refs)
                  tr.refs = tr.refs.filter((r) => !userNames.has(r));
        }
        // R27-N10（RG-208 と同型・C家族への拡大）：最終状態
        // （paths[].vars と、C家族の配列が入る paths[].model.memory）は
        // JSON として直列化される表示面であり、非有限数
        // （Infinity／-Infinity／NaN）が null に化けて、プログラムの
        // 出力表示（C／C++ は "inf"／"-inf"／"nan"、C# は "Infinity"／
        // "-Infinity"／"NaN"）と矛盾していた。実行完了後のスナップ
        // ショットに限り、非有限数を出力表示と同じ文字列表現へ置き
        // 換える（実行中の数値としての働きは変えない）。未確定値と
        // 未初期化マーカーは数値を含まないため、そのまま返す。
        if (result.paths) {
          const nonFiniteText = (v) =>
            managed
              ? String(v)
              : Number.isNaN(v)
                ? "nan"
                : v > 0
                  ? "inf"
                  : "-inf";
          const finiteSafeSnapshot = (v, seen = new Map()) => {
            if (typeof v === "number")
              return Number.isFinite(v) ? v : nonFiniteText(v);
            if (!v || typeof v !== "object") return v;
            if (isUnknown(v) || v === uninitialized) return v;
            if (seen.has(v)) return seen.get(v);
            const out = Array.isArray(v) ? [] : {};
            seen.set(v, out);
            if (Array.isArray(v))
              for (const x of v) out.push(finiteSafeSnapshot(x, seen));
            else
              for (const [k, x] of Object.entries(v))
                out[k] = finiteSafeSnapshot(x, seen);
            return out;
          };
          for (const p of result.paths) {
            p.vars = finiteSafeSnapshot(p.vars);
            if (p.model?.memory)
              p.model.memory = finiteSafeSnapshot(p.model.memory);
          }
        }
        return result;
      } catch (e) {
        // P-N3：解析・後処理段階のホスト例外も日本語の停止理由へ変換する。
        return sourceFailure(hostErrorAsPractice(translateEofError(e), e?.line));
      }
    },
  };
}
