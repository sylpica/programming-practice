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
import { formatModelValue as formatValue, isUnknown, unknown } from "./contract.js";
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
      if (sl === "l" || sl === "ul" || sl === "lu") return digits + "L";
      if (sl === "u") return digits;
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
function transformSource(source, language) {
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
  while (i < src.length) {
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
        let suffix = "";
        const srest = rest.slice(m[0].length);
        const pats =
          language === "csharp"
            ? ["ul", "lu", "f", "d", "m", "u", "l"]
            : ["ull", "llu", "ul", "lu", "ll", "u", "l", "f"];
        for (const p of pats) {
          if (
            srest.toLowerCase().startsWith(p) &&
            !/[A-Za-z0-9_]/.test(srest[p.length] || "")
          ) {
            suffix = srest.slice(0, p.length);
            break;
          }
        }
        if (/^0[bB]/.test(m[0]) && /[2-9]/.test(m[0]))
          unsupported(`2進数リテラル ${m[0]} に 0/1 以外の数字があります`, line);
        if (/^0[oO]/.test(m[0]) && /[89]/.test(m[0]))
          unsupported(`8進数リテラル ${m[0]} に 8/9 が含まれています`, line);
        out += transformNumberLiteral(m[0], suffix, language, line);
        advance(i + m[0].length + suffix.length);
        continue;
      }
    }
    out += c;
    advance(i + 1);
  }
  return out;
}
function parse(source, language) {
  let classes = {},
    code = transformSource(source, language);
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
        return { ...meta, k: "array", values };
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
                value = { k: "array", values, line: t.line };
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
    return simple();
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
        let type = this.take().v,
          field = this.take().v;
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
      return {
        k: "block",
        body: [...body, { k: "while", test, body, line: t.line, refs: ["while"] }],
        line: t.line,
        refs: ["do"],
      };
    }
    if (t.v === "foreach" && language === "csharp") {
      this.take();
      this.take("(");
      this.take();
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
                `ユーザー定義関数 ${nameTok.v} の定義は未対応です`,
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
  return { nodes: [...pendingDecls, ...p.program()], classes };
}
export function createCFamily({ id, name, extensions, language }) {
  const managed = id === "csharp";
  let reference = rows([
    [
      "int",
      "型",
      "int n = 1;",
      "モデルでは32ビット符号付き整数です。",
      "int n = 1;",
      "実環境の型サイズはモデル設定と区別します。",
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
        ? "範囲外はIndexOutOfRangeException。"
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
      "成立する側だけを実行します。",
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
      managed ? "return;" : "return 0;",
      "main の終了にも使います。",
    ],
    [
      "printf",
      "出力",
      'printf("%d\\n", n);',
      "書式と引数を対応させて出力を説明します。",
      'printf("%d\\n", n);',
      "%d / %i / %f / %s / %c / %%のみ。書式と型の不一致は停止します。",
      !managed,
    ],
    [
      "cout",
      "出力",
      "cout << n << endl;",
      "ストリームへの出力を説明します。",
      "cout << n << endl;",
      "数値・文字列・endlに限定。",
      id === "cpp",
    ],
    [
      "Console.WriteLine",
      "出力",
      "Console.WriteLine(value);",
      "標準出力に値と改行を出します。",
      "Console.WriteLine(total);",
      "1引数形式のみ。",
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
      "単純フィールドのみ。コンストラクタ・継承・プロパティ等は未対応。",
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
  ]);
  const prelude = {pointer:"int values[3]={1,2,3};",if:"int n=2;",for:"int total=0;",while:"int n=0;",printf:"int n=3;",cout:"int n=3;","Console.WriteLine":"int total=3;",class:"class Counter { public int Value; }",checked:"int n=1;"};
  for (const r of reference) if (prelude[r.name]) r.example = prelude[r.name] + "\n" + r.example;
  if (managed) reference.find(r => r.name === "array").syntax = "int[] values = {1, 2, 3};";
  reference = reference.filter(r => !managed
    ? !["Console.WriteLine","Console.ReadLine","class","checked", ...(id === "c" ? ["cout"] : [])].includes(r.name)
    : !["pointer","printf","cout"].includes(r.name));
  if (!managed) for (const r of reference) {
    if (id === "cpp") r.example = r.example.replace(/\b(cout|endl|printf)\b/g, "std::$1");
    r.example = `#include <${id === "cpp" ? "iostream>\n#include <cstdio" : "stdio.h"}>\nint main() {\n${r.example}\nreturn 0;\n}`;
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
    glossary: [
      ["配列", "同じ型の要素が並ぶオブジェクトです。"],
      [
        "ポインタ",
        "オブジェクト内の位置を指す値です。実アドレスとは分けてモデル化します。",
      ],
      [
        "未定義動作",
        "言語仕様が結果を規定しない実行です。予測値を作らず停止します。",
      ],
      [
        "参照オブジェクト",
        "複数の変数から同じ実体を参照できるオブジェクトです。",
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
        let { nodes, classes } = parse(code, language);
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
        function typeOf(a, s) {
          if (!a) return "int";
          if (a.k === "cast" || a.k === "type") return a.type;
          if (a.k === "post" || a.k === "pre") return typeOf(a.target, s);
          if (a.k === "ternary") return typeOf(a.then, s);
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
            if (a.op === "*") return typeOf(a.arg, s).replace(/\*$/, "");
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
          return t === "char" && !managed ? 8 : 32;
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
            if (!isPtr(target) || !Number.isInteger(index))
              api.fail("モデルポインタと整数添字が必要です", node);
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
                  v = Array.from({ length }, (_, i) =>
                    i < v.length ? cast(v[i], n.type, s, n, api) : defaultValue,
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
              if (!Number.isInteger(index) || index < 0 || index >= current.length)
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
              if (
                !Array.isArray(array) ||
                !Number.isInteger(index) ||
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
                    "配列の先頭～一つ先を超えるポインタ演算",
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
              if (op === "+" && (lt === "string" || rt === "string"))
                return csConcatText(a, lt) + csConcatText(b, rt);
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
            )
              return String(a ?? "") + String(b ?? "");
            const arithmetic = arithmeticType(lt, rt, s);
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
              if (arithmetic.startsWith("unsigned")) {
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
                result = arithmetic.startsWith("unsigned")
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
                min = -(1n << (bits - 1n)),
                max = (1n << (bits - 1n)) - 1n;
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
                value = BigInt.asIntN(Number(bits), value);
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
              if (typeof text !== "string")
                api.fail("TryParse の第1引数は文字列です", node, "CompileError");
              let ok = false,
                parsed = 0;
              if (name === "int.TryParse") {
                const t = text.trim();
                if (/^[+-]?\d+$/.test(t)) {
                  const big = BigInt(t);
                  if (big >= -2147483648n && big <= 2147483647n) {
                    ok = true;
                    parsed = Number(big);
                  }
                }
              } else {
                const t = text.trim();
                if (t !== "" && !Number.isNaN(Number(t))) {
                  ok = true;
                  parsed = Number(t);
                }
              }
              api.write(args[1], ok ? parsed : 0, s, node);
              return ok;
            }
            let values = args.map((a) => api.read(a, s));
            if (name === "Console.ReadLine") {
              if (!managed) api.fail("未対応の関数です", node);
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
                return type === "f" ? (!Number.isFinite(v) ? (Number.isNaN(v) ? "nan" : v > 0 ? "inf" : "-inf") : Object.is(v, -0) ? "-0.000000" : Number(v).toFixed(6)) : type === "c" ? String.fromCharCode(v) : String(v);
              });
              if (i !== rest.length)
                api.fail("printfの書式または引数の数は未対応です", node);
              s.outputs.push({ channel: "printf", text, line: node.line });
              api.note(s, node, "標準出力へ出します：" + text);
              return new TextEncoder().encode(text).length;
            }
            if (name === "abs") {
              let v = values[0];
              if (v === -2147483648)
                api.fail("absの結果がintで表せません", node, "未定義動作");
              return Math.abs(v);
            }
            api.fail("この関数は説明に対応していません：" + name, node);
          },
          action(n, s, api) {
            if (n.action === "cout") {
              let text = n.values
                .map((v) => { const value = api.read(v, s); const vt = typeOf(v, s); return typeof value === "boolean" ? String(Number(value)) : vt === "char" ? String.fromCharCode(value) : isPtr(value) && s.model.memory[value.object]?.type === "char" ? cString(value, s, api, n) : typeof value === "number" ? (Object.is(value, -0) ? "-0" : vt === "double" || vt === "float" || !Number.isInteger(value) ? cppGText(value) : String(value)) : formatValue(transformDisplay(value)); })
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
        return sourceFailure(e);
      }
    },
  };
}
