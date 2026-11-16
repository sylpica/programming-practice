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
            const shown =
              raw +
              (rest.slice(raw.length).match(/^[0-9A-Za-z_.']*/) || [""])[0];
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
            let badTail = afterNum.match(/^[A-Za-z0-9_]+/)?.[0] || "";
            if (
              /[eE]$/.test(raw + suffix + badTail) &&
              /^[+-]/.test(afterNum.slice(badTail.length))
            )
              badTail += afterNum[badTail.length];
            throw new PracticeError(
              `数値リテラルの書き方が不正です：${raw}${suffix}${badTail}`,
              line,
              "SyntaxError",
            );
          }
          if (afterNum[0] === "." && /[0-9]/.test(afterNum[1] || "")) {
            const badTail =
              "." + (afterNum.slice(1).match(/^[0-9]+/)?.[0] || "");
            throw new PracticeError(
              `数値リテラルの書き方が不正です：${raw}${suffix}${badTail}`,
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
  const genericNames =
    language === "cpp"
      ? ["vector", "set", "map", "pair", "unordered_map", "unordered_set", "deque", "queue", "stack", "list"]
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
    if (after && (after.k === "id" || after.v === "(" || after.v === "["))
      unsupported(
        `ジェネリック型 ${p.ts[i].v}<...> の宣言は未対応です`,
        p.ts[i].line,
      );
  }
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
    for (let i = 2; i < p.ts.length; i++) {
      if (
        p.ts[i].v !== "TryParse" ||
        p.ts[i - 1].v !== "." ||
        !["int", "double"].includes(p.ts[i - 2].v) ||
        p.ts[i + 1]?.v !== "("
      )
        continue;
      const baseType = p.ts[i - 2].v;
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
            ["int", "long", "double", "float", "short", "uint", "ulong", "ushort", "byte", "sbyte", "char", "bool", "string", "var"].includes(n1.v)
          ) {
            p.ts.splice(j, 1);
            pendingDecls.push({
              k: "declare",
              name: n2.v,
              type: n1.v === "var" ? baseType : n1.v,
              value: { k: "literal", value: 0, line: n2.line },
              line: n2.line,
              refs: [n1.v === "var" ? baseType : n1.v],
            });
          }
          break;
        }
      }
    }
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
          value = this.expr(0);
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
  p.simple = function () {
    let t = this.ts[this.i];
    if (["let", "const", "auto", "var"].includes(t.v))
      unsupported("この宣言・型推論はモデルで未対応です：" + t.v, t.line);
    if (t.v === "cout") {
      if (language !== "cpp") unsupported("coutはC++専用です", t.line);
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
      if (!values.length) unsupported("coutの書式", t.line);
      return {
        k: "action",
        action: "cout",
        values,
        line: t.line,
        refs: ["cout"],
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
      (builtinTypes.includes(t.v) || classes[t.v] || compositeTypes.includes(t.v)) &&
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
    if (t.v === "class") {
      if (language !== "csharp") unsupported("この言語のクラスは未対応です", t.line);
      this.take();
      let name = this.take().v;
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
      (n.k === "action" && n.action === "cout")
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
export function createCFamily({ id, name, extensions, language }) {
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
      "%d / %i / %f / %s / %c / %%のみです。書式と型の不一致は停止します。",
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
      "既定（unchecked）では、範囲を超える演算・変換は 65536 の剰余で折り返します。checked では OverflowException になります。また ushort.MaxValue／MinValue は静的メンバーの表になく未対応として停止します（型自体は対応済み）。",
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
      "対応形式は std::getline(std::cin, 変数) のみです。cin >> x の抽出も、モデルでは抽出先の変数が未確定値になります（実際の入力内容は再現されません）。",
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
  const cppOnly = ["参照","getline","endl"];
  reference = reference.filter(r => !managed
    ? !["Console.WriteLine","Console.ReadLine","class","checked", ...csharpOnly, ...(id === "c" ? ["cout","string", ...cppOnly] : [])].includes(r.name)
    : !["pointer","printf","cout","unsigned int","unsigned long","unsigned short","unsigned char","signed char","sizeof","abs", ...cppOnly].includes(r.name));
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
      support:
        "mainまたは文の断片、単純宣言、代入、If / For / While、掲載出力。多次元配列にも対応します（C／C++ は連鎖添字の多次元配列、C# は矩形配列（int[,]）とジャグ配列（int[][]））。未対応：型推論（auto / var）、動的確保・解放、複雑な型・テンプレート・関数定義・多重宣言・スコープのシャドーイング。64ビット整数の安全な精度範囲外は未確認として停止。",
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
          if (Array.isArray(v)) return v.map((x) => transformDisplay(x));
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
        function csArrayTypeName(node, value, s, typeHint) {
          for (const cand of [node ? csTypeStrOf(node, s) : null, typeHint]) {
            const p = cand ? csParseTypeStr(cand) : null;
            if (p?.suffix) {
              const sys = CS_SYSTEM_NAMES[p.elem];
              return (sys ? "System." + sys : p.elem) + p.suffix;
            }
          }
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
            if (nm === "abs") {
              const at = a.args?.length ? typeOf(a.args[0], s) : "int";
              if (["float", "double"].includes(at))
                return !managed && language === "cpp" ? at : "int";
              return "int";
            }
            if (nm === "Console.ReadLine") return "string";
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
          if (managed && a.k === "member") return classes[typeOf(a.target, s)]?.[a.name]?.type || "int";
          if (a.k === "var") return s.types[a.name] || s.loopVarTypes?.[a.name] || (["true", "false"].includes(a.name) && language !== "c" ? "bool" : "int");
          if (a.k === "binary") {
            if (["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(a.op)) return language === "c" ? "int" : "bool";
            let l = typeOf(a.a, s),
              r = typeOf(a.b, s);
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
        function deref(ptr, s, api, node) {
          if (!isPtr(ptr) || !s.model.memory[ptr.object]?.alive)
            api.fail(
              managed
                ? "無効な参照です"
                : "無効または寿命の切れたポインタの参照",
              node,
              managed ? "NullReferenceException" : "未定義動作",
            );
          let mem = s.model.memory[ptr.object];
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
            return Boolean(v);
          },
          step(n, s, api) {
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
              if (Object.hasOwn(s.types, n.name)) {
                api.fail(
                  "この初版は同名変数の再宣言・スコープのシャドーイングに対応していません",
                  n,
                  "未対応",
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
                  const padVal = n.type === "bool" ? false : 0;
                  let flat;
                  if (v === uninitialized) {
                    if (dimVals[0] === null)
                      api.fail("配列長を指定してください", n);
                    flat = Array.from(
                      { length: dimVals.reduce((a, b) => a * b, 1) },
                      () => uninitialized,
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
                const defaultValue = n.type === "bool" ? false : n.type === "string" || classes[n.type] ? null : 0;
                if (v === uninitialized)
                  v = Array.from({ length }, () =>
                    managed ? defaultValue : uninitialized,
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
                mem = deref(ptr, s, api, a),
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
                    if (idxVals.length > mem0.dims.length)
                      api.fail("添字の数が次元の数を超えています", a, "CompileError");
                    let offset = rootPtr.offset;
                    for (let d = 0; d < idxVals.length; d++) {
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
              let ptr = { ...target, offset: target.offset + index },
                mem = deref(ptr, s, api, a),
                value = mem.values[ptr.offset];
              if (value?.kind === "uninitialized")
                api.fail("未初期化の配列要素です", a, "未定義動作");
              return { handled: true, value };
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
                  };
                if (Object.hasOwn(statics, key))
                  return { handled: true, value: statics[key] };
                if (key === "long.MaxValue" || key === "long.MinValue" || key === "ulong.MaxValue")
                  return {
                    handled: true,
                    value: unknown(key + "（64ビット境界値）"),
                  };
                if (
                  ["int", "long", "double", "float", "char", "bool", "string", "String", "Math", "short", "uint", "ulong", "ushort", "byte", "sbyte", "DateTime", "Console"].includes(a.target.name)
                )
                  api.fail(
                    `型 ${a.target.name} のメンバー ${a.name} は未対応です`,
                    a,
                    "未対応",
                  );
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
            if (
              !managed &&
              (a.k === "index" || (a.k === "unary" && a.op === "*"))
            ) {
              let ptr =
                  a.k === "index"
                    ? targetPointer(a, s, api, node)
                    : api.read(a.arg, s),
                mem = deref(ptr, s, api, node);
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
                if (next.offset < 0 || next.offset > mem.values.length)
                  api.fail(
                    "配列の先頭〜一つ先を超えるポインタ演算",
                    node,
                    "未定義動作",
                  );
                return next;
              }
              api.fail("このポインタ比較・演算は未対応です", node);
            }
            const na = node.k === "assign" ? node.target : node.a,
              nb = node.k === "assign" ? node.value : node.b;
            const lt = typeOf(na, s),
              rt = typeOf(nb, s);
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
            // （char・文字列リテラル・char* との比較は実 C++ でも有効なので対象外）
            if (
              !managed &&
              language === "cpp" &&
              ["==", "!=", "<", ">", "<=", ">="].includes(op)
            ) {
              const otherOk = (t) =>
                t === "string" || t === "char[]" || t === "char" || t.endsWith("*");
              // std::string と char の比較は実 C++ でも有効で、1文字文字列との
              // 比較として評価する（char の数値コードを文字へ戻す）。
              if (lt === "string" && rt === "char" && typeof b === "number")
                b = String.fromCharCode(b);
              if (rt === "string" && lt === "char" && typeof a === "number")
                a = String.fromCharCode(a);
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
              (node.k === "assign" ? s.types[callName(node.target)] === "string" : [lt, rt].includes("string"))
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
                if (s.checked)
                  api.fail("整数のオーバーフロー", node, "OverflowException");
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
            if (op === "%" && integer && result === 0) result = 0;
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
              a === -2147483648 &&
              b === -1 &&
              (managed ? op === "/" : ["/", "%"].includes(op))
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
              return v;
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
            // D13：引数を評価する前に未順序の競合を検査する。
            if (!managed && name === "printf")
              checkUnsequencedArgs(args, node, api);
            let values = args.map((a) => api.read(a, s));
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
              const v0 = values[0],
                argType = typeOf(args[0], s);
              let text;
              if (typeof v0 === "boolean") text = v0 ? "True" : "False";
              else if (v0 === null) text = "";
              else if (Array.isArray(v0)) {
                // R29-N21：char[] には Console.WriteLine(char[]) の
                // オーバーロードがあり、型名ではなく文字そのものを
                // 出力する（dotnet 実測）。1次元 char[] の場合だけ
                // その扱いにし、それ以外は宣言型から導出した型名。
                const shape = csArrayShape(args[0], s, argType);
                if (shape?.elem === "char" && shape.suffix === "[]")
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
              let [fmt, ...rest] = values;
              if (typeof fmt !== "string")
                api.fail("printfの書式文字列が必要です", node);
              if (fmt.replace(/%[%disfcu]/g, "").includes("%")) api.fail("このprintf書式はモデルで扱えません", node, "未対応");
              let i = 0;
              let text = fmt.replace(/%([%disfcu])/g, (_, type) => {
                if (type === "%") return "%";
                let sourceArg = args[i + 1],
                  sourceType = typeOf(sourceArg, s),
                  v = rest[i++];
                if (typeof v === "boolean") v = Number(v);
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
                return type === "f" ? (!Number.isFinite(v) ? (Number.isNaN(v) ? "nan" : v > 0 ? "inf" : "-inf") : Object.is(v, -0) ? "-0.000000" : formatFixed6(Number(v))) : type === "c" ? String.fromCharCode(v) : String(v);
              });
              if (i !== rest.length)
                api.fail("printfの書式または引数の数は未対応です", node);
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
            api.fail("この関数は説明に対応していません：" + name, node);
          },
          action(n, s, api) {
            if (n.action === "cout") {
              let text = n.values
                .map((v) => { const value = api.read(v, s); const vt = typeOf(v, s); return typeof value === "boolean" ? String(Number(value)) : ["char", "signed char", "unsigned char"].includes(vt) ? String.fromCharCode(value) : isPtr(value) && s.model.memory[value.object]?.type === "char" ? cString(value, s, api, n) : typeof value === "number" ? (Object.is(value, -0) ? "-0" : vt === "double" || vt === "float" || !Number.isInteger(value) ? cppGText(value) : String(value)) : formatValue(transformDisplay(value)); })
                .join("");
              s.outputs.push({ channel: "cout", text, line: n.line });
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
