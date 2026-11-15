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
      if (sl === "u") return `((uint)${digits})`;
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
    const flushLit = () => {
      if (lit) parts.push('"' + lit + '"');
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
        parts.push(
          "(" + transformSource(splitHole(hole, line), language) + ")",
        );
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
    out += parts.length ? parts.join(" + ") : '""';
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
      const m = rest.match(
        /^(?:0[xX][0-9a-fA-F]+|0[bB][0-9]+|0[oO][0-9]+|\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/,
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
        out += transformNumberLiteral(raw, suffix, language, line);
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
    for (let i = 0; i < p.ts.length; i++) {
      if (p.ts[i].v === "%" && p.ts[i + 1]?.v === "=") {
        ts.push({ v: "%=", line: p.ts[i].line });
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
    for (let i = 2; i < p.ts.length; i++) {
      if (
        p.ts[i].v !== "TryParse" ||
        p.ts[i - 1].v !== "." ||
        !["int", "double"].includes(p.ts[i - 2].v) ||
        p.ts[i + 1]?.v !== "("
      )
        continue;
      const baseType = p.ts[i - 2].v;
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
          return { ...meta, k: "array", values };
        }
        unsupported("new " + typeName + "[] のこの形式は未対応です", start.line);
      }
      let count = this.expr();
      this.take("]");
      if (this.peek("{")) {
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
        return { ...meta, k: "array", values, size: count };
      }
      return { ...meta, k: "construct", name: typeName + "[]", args: [count] };
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
    if (t?.v === "++" || t?.v === "--") {
      this.take();
      a = { k: "pre", target: this.expr(10), op: t.v, line: t.line };
    } else if (t?.v === "new" && language === "csharp") {
      a = this.parseNewExpr();
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
        ["=", "+=", "-=", "*=", "/=", "%="].includes(v) &&
        min <= 0 &&
        ["var", "index", "member"].includes(a.k)
      ) {
        const op = this.take().v,
          value = this.expr(0);
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
    if (savedChain) this.coutChain = savedChain;
    return a;
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
      let type = this.take().v,
        array = false,
        size = null,
        pointer = false, referenceAlias = false;
      if (language === "c" && type === "string") unsupported("Cには組込みstring型がありません。char配列を使ってください", t.line);
      if (this.peek("[")) {
        this.take();
        this.take("]");
        array = true;
      }
      if (this.peek("*")) {
        this.take();
        pointer = true;
      }
      if (this.peek("&")) {
        if (language !== "cpp") unsupported("参照宣言はC++専用です", t.line);
        this.take(); referenceAlias = true;
      }
      if (type === "unsigned") type = "unsigned int";
      if (type === "signed") type = "int";
      let name = this.take();
      if (name.k !== "id") throw new PracticeError("変数名が必要です", t.line);
      if (this.peek("[")) {
        this.take();
        size = this.peek("]") ? null : this.expr();
        this.take("]");
        array = true;
      }
      let value = null;
      if (this.peek("(")) {
        // Direct initialization: Type name(args) — a single argument only.
        this.take();
        let args = [];
        while (!this.peek(")")) {
          args.push(this.expr());
          if (!this.peek(",")) break;
          this.take();
        }
        this.take(")");
        if (args.length !== 1)
          unsupported("複数引数の直接初期化は未対応です", t.line);
        value = args[0];
      } else if (this.peek("=")) {
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
          value = { k: "array", values, line: t.line };
        } else if (this.peek("new")) {
          this.take();
          let typeName = this.take().v;
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
                value = { k: "array", values, line: t.line };
                array = true;
                size = null;
              } else
                unsupported(
                  "new " + typeName + "[] のこの形式は未対応です",
                  t.line,
                );
            } else {
              let count = this.expr();
              this.take("]");
              if (this.peek("{")) {
                this.take();
                let values = [];
                while (!this.peek("}")) {
                  values.push(this.expr());
                  if (!this.peek(",")) break;
                  this.take();
                }
                this.take("}");
                // R24-N11 根因（宣言経路も同じ）：宣言長を保持する。
                value = { k: "array", values, size: count, line: t.line };
                array = true;
                size = null;
              } else
                value = {
                  k: "construct",
                  name: typeName + "[]",
                  args: [count],
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
      return {
        k: "declare",
        name: name.v,
        type,
        array,
        size,
        pointer,
        referenceAlias,
        value,
        line: t.line,
        refs: [pointer ? "pointer" : array ? "array" : type],
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
      if (target && this.peek("%=")) {
        this.take();
        const value = this.expr();
        return { k: "assign", target, value, op: "%=", line: t.line };
      }
      this.i = save;
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
      ["declare", "assign", "expression", "return", "break", "continue"].includes(n.k) ||
      (n.k === "action" && n.action === "cout")
    ) {
      if (!this.peek(";"))
        throw new PracticeError("; が必要です", this.ts[this.i]?.line ?? n.line, "SyntaxError");
      this.take(";");
    }
    return n;
  };
  const nodes = [...pendingDecls, ...p.program()];
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
      "checked と対の指定です。定数式のオーバーフローは unchecked でもコンパイルエラーとして停止します。",
    ],
    [
      "new",
      "式",
      "new 型[個数] / new 型[] { … } / new クラス名()",
      "配列またはオブジェクトを生成する式です。配列は要素が型の既定値で初期化されます。",
      "int[] values = new int[3];\nvalues[0] = 1;",
      "対応形式は new 型[個数]、new 型[] {…}、引数なしの new クラス名() のみです。引数付きコンストラクタなどは未対応です。",
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
  if (managed) reference.find(r => r.name === "array").syntax = "int[] values = {1, 2, 3};";
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
        "mainまたは文の断片、単純宣言、代入、If / For / While、掲載出力。未対応：型推論（auto / var）、多次元配列、動的確保・解放、複雑な型・テンプレート・関数定義・多重宣言・スコープのシャドーイング。64ビット整数の安全な精度範囲外は未確認として停止。",
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
        function csConcatText(v, type) {
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
        function typeOf(a, s) {
          if (!a) return "int";
          if (a.k === "cast" || a.k === "type") return a.type;
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
          if (a.k === "var") return s.types[a.name] || (["true", "false"].includes(a.name) && language !== "c" ? "bool" : "int");
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
          if (a.k === "index") {
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
          // （定数式のオーバーフローは unchecked でもコンパイルエラー
          // という unchecked 項目の開示方針と揃える）。
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
            if (v !== null && typeof v !== "string" && !isUnknown(v))
              api.fail("文字列型が一致しません", node);
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
            if (typeof c !== "number") api.fail("未初期化の文字です", node, "未定義動作");
            text += String.fromCharCode(c);
          }
          api.fail("終端のヌル文字がない文字列の読み取り", node, "未定義動作");
        }
        const semantics = {
          dialect: language,
          blockScopes: true,
          // RG-77: C# の入れ子宣言スペース同名禁止（CS0136）は managed のみ。
          nestedShadowError: managed,
          manualLifetime: !managed,
          initialize(s, api) {
            if (s.model.intBits !== 32)
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
            if (n.k === "assign" && (managed || n.op === "%=")) {
              let v = api.read(n.value, s);
              if (n.op && n.op !== "=")
                v = semantics.binary(
                  n.op[0],
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
                `${callName(n.target) || "対象"} に ${fmtFor(v, s.types[callName(n.target)])} を代入します`,
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
              let type = n.type + (n.pointer ? "*" : n.array ? "[]" : "");
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
                if (!managed && n.type === "char" && typeof v === "string") {
                  if ([...v].some(c => c.codePointAt(0) > 127)) api.fail("このモデルのchar文字列はASCIIに限定します", n, "未対応");
                  const bytes = [...v].map(c => c.charCodeAt(0));
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
              let v = api.read(a.value, s);
              if (a.op && a.op !== "=") {
                const cur = api.read(a.target, s);
                v = semantics.binary(
                  a.op[0],
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
            if (a.k === "construct") {
              if (!managed)
                api.fail("動的確保／クラスの生成はこのモデルでは未対応です", a);
              if (a.name.endsWith("[]")) {
                let n = api.read(a.args[0], s);
                if (!Number.isInteger(n) || n < 0 || n > 10000)
                  api.fail("配列サイズが不正です", a);
                const type = a.name.slice(0, -2);
                return { handled: true, value: Array(n).fill(type === "bool" ? false : type === "string" ? null : 0) };
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
              if (a.name === "Length" && Array.isArray(obj))
                return { handled: true, value: obj.length };
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
              let array = api.read(a.target, s),
                index = api.read(a.indexes[0], s);
              // R23-N5 書き込み側：非整数の添字を範囲外と誤診しない。
              if (
                managed &&
                typeof index === "string" &&
                index.length === 1 &&
                typeOf(a.indexes[0], s) === "char"
              )
                index = index.charCodeAt(0);
              if (!Number.isInteger(index))
                api.fail("添字は整数型でなければなりません", node, "CompileError");
              if (
                !Array.isArray(array) ||
                index < 0 ||
                index >= array.length
              )
                api.fail("配列範囲外です", node, "IndexOutOfRangeException");
              const type = s.types[callName(a.target)]?.replace(/\[\]$/, "");
              if (!type) api.fail("この配列要素型の推定は未対応です", node, "未対応");
              array[index] = cast(v, type, s, node, api);
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
                const ta = csConcatText(a, lt),
                  tb = csConcatText(b, rt);
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
              const old = s.checked;
              s.checked = name === "checked";
              try {
                return api.read(args[0], s);
              } finally {
                s.checked = old;
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
              const text = api.read(args[0], s);
              // R24-N34：第1引数 null は例外ではなく変換失敗（False）。
              // 実 C# の TryParse は null を受け付け、false を返す
              // （dotnet 実測。"" が False であることと一貫させる）。
              if (text === null) {
                api.write(args[1], 0, s, node);
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
              api.write(args[1], ok ? parsed : 0, s, node);
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
                const elem = {
                  int: "System.Int32[]",
                  long: "System.Int64[]",
                  double: "System.Double[]",
                  float: "System.Single[]",
                  bool: "System.Boolean[]",
                  char: "System.Char[]",
                  string: "System.String[]",
                }[String(argType).replace(/\[\]$/, "")];
                text =
                  elem ||
                  (v0.length
                    ? typeof v0[0] === "string"
                      ? "System.String[]"
                      : typeof v0[0] === "boolean"
                        ? "System.Boolean[]"
                        : "System.Double[]"
                    : "System.Int32[]");
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
              let old = s.checked;
              s.checked = n.action === "checked";
              let results = api.run(n.body, [s]);
              for (let state of results) state.checked = old;
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
                `${v.name}（${v.type}、${v.alive ? "有効" : "寿命終了"}）：${formatValue(transformDisplay(v.values))}`,
              ]),
            },
          ],
        };
        // P-N3：実行境界でもホスト例外の生文言を漏らさない（文字列の
        // 倍増などで V8 の RangeError が semantics 内から出る経路）。
        for (const key of ["step", "read", "write", "binary", "call", "action"])
          if (semantics[key]) semantics[key] = guardHostErrors(semantics[key]);
        const result = executeProgram(nodes, model, semantics, limits);
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
        return result;
      } catch (e) {
        // P-N3：解析・後処理段階のホスト例外も日本語の停止理由へ変換する。
        return sourceFailure(hostErrorAsPractice(e, e?.line));
      }
    },
  };
}
