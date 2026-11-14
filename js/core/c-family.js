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
import { formatValue, isUnknown, unknown } from "./contract.js";
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
function parse(source, language) {
  let classes = {},
    code = source
      .split("\n")
      .map((line) =>
        /^\s*#include\s+[<"].*[>"]\s*$/.test(line) ||
        /^\s*using\s+(namespace\s+std|System)\s*;\s*$/.test(line)
          ? ""
          : line.replace(/std::/g, ""),
      )
      .join("\n");
  let p = new ScriptParser(code, language),
    simple = p.simple.bind(p),
    statement = p.statement.bind(p);
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
        values.push(this.expr());
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
    if (
      (builtinTypes.includes(t.v) || classes[t.v]) &&
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
      let name = this.take();
      if (name.k !== "id") throw new PracticeError("変数名が必要です", t.line);
      if (this.peek("[")) {
        this.take();
        size = this.peek("]") ? null : this.expr();
        this.take("]");
        array = true;
      }
      let value = null;
      if (this.peek("=")) {
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
            let count = this.expr();
            this.take("]");
            value = {
              k: "construct",
              name: typeName + "[]",
              args: [count],
              line: t.line,
            };
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
    return statement();
  };
  return { nodes: p.program(), classes };
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
        function typeOf(a, s) {
          if (!a) return "int";
          if (a.k === "literal") {
            if (typeof a.value === "boolean") return language === "c" ? "int" : "bool";
            return typeof a.value === "string"
              ? (managed ? "string" : a.quote === "'" ? (language === "c" ? "int" : "char") : "char[]")
              : /[.eEfF]/.test(a.raw || "")
                ? "double"
                : a.raw?.endsWith("L") || Math.abs(a.value) > 2147483647
                  ? "long"
                  : "int";
          }
          if (a.k === "var") return s.types[a.name] || (["true", "false"].includes(a.name) && language !== "c" ? "bool" : "int");
          if (a.k === "binary") {
            if (["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(a.op)) return language === "c" ? "int" : "bool";
            let l = typeOf(a.a, s),
              r = typeOf(a.b, s);
            if (language === "cpp" && a.op === "+" && [l, r].includes("string")) return "string";
            return [l, r].includes("double") || [l, r].includes("float")
              ? "double"
              : [l, r].includes("long")
                ? "long"
                : "int";
          }
          if (a.k === "index")
            return (
              s.types[callName(a.target)]?.replace(/\[\]|\*/g, "") || "int"
            );
          if (a.k === "unary") {
            if (a.op === "!") return language === "c" ? "int" : "bool";
            if (a.op === "&") return typeOf(a.arg, s) + "*";
            if (a.op === "*") return typeOf(a.arg, s).replace(/\*$/, "");
            return typeOf(a.arg, s);
          }
          return "int";
        }
        function width(type, s) {
          return type === "long" ? (managed ? 64 : s.model.longBits || 64) : 32;
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
          if (!managed && typeof v === "boolean") v = Number(v);
          if (typeof v !== "number") api.fail("数値型が一致しません", node);
          if (["float", "double"].includes(type))
            return type === "float" ? Math.fround(v) : v;
          let bits = width(type, s),
            value = Math.trunc(v);
          if (!Number.isSafeInteger(value))
            api.fail(
              "未確認：この64ビット整数は安全に計算できる範囲外です",
              node,
              "未確認",
            );
          let min = -(2 ** (bits - 1)),
            max = 2 ** (bits - 1) - 1;
          if (value < min || value > max) {
            api.fail(
              managed
                ? "整数への変換が範囲外です"
                : "整数への変換結果は処理系依存です",
              node,
              managed ? "OverflowException" : "環境依存",
            );
          }
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
          manualLifetime: !managed,
          initialize(s, api) {
            if (s.model.intBits !== 32)
              api.fail("このモデルのintは32ビットのみ対応です", { line: 1 });
            s.vars = {};
            s.addresses = {};
            s.references = {};
          },
          truth(v, line) {
            if (isUnknown(v)) return v;
            if (managed && typeof v !== "boolean")
              throw new PracticeError(
                "C#の条件にはboolが必要です",
                line,
                "CompileError",
              );
            return Boolean(v);
          },
          step(n, s, api) {
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
                  api.fail("未対応：参照は同じ型の宣言済み変数で初期化してください", n, "未対応");
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
              let v = n.value ? api.read(n.value, s) : uninitialized;
              if (n.array) {
                if (!managed && n.type === "char" && typeof v === "string") {
                  if ([...v].some(c => c.codePointAt(0) > 127)) api.fail("未対応：このモデルのchar文字列はASCIIに限定します", n, "未対応");
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
                if (v !== uninitialized) v = cast(v, type, s, n, api);
                s.vars[n.name] = v;
                allocate(s, n.name, [v], type);
              }
              s.types[n.name] = type;
              api.note(
                s,
                n,
                `${n.name} を ${type} として用意します：${formatValue(s.vars[n.name])}`,
              );
              return [s];
            }
          },
          read(a, s, api) {
            if (!managed && a.k === "literal" && a.quote === "'") {
              if (a.value.length !== 1 || a.value.charCodeAt(0) > 127)
                api.fail("未対応：単一ASCII文字以外の文字定数", a, "未対応");
              return { handled: true, value: a.value.charCodeAt(0) };
            }
            if (!managed && a.k === "unary" && a.op === "sizeof") {
              const arg = a.arg;
              function checkSizeOperand(expr) {
                if (!["var", "literal", "index", "unary", "binary"].includes(expr.k) || (expr.k === "unary" && expr.op === "sizeof")) api.fail("未対応：このsizeofオペランドの型はモデルで確定できません", a, "未対応");
                if (expr.k === "var" && !builtinTypes.includes(expr.name) && !["true", "false"].includes(expr.name) && !Object.hasOwn(s.types, expr.name)) api.fail("宣言されていないsizeof対象です", a, "CompileError");
                if (expr.k === "index" && builtinTypes.includes(expr.target.name)) api.fail("未対応：sizeofの配列型指定。宣言済み配列の変数名を指定してください", a, "未対応");
                for (const child of [expr.arg, expr.a, expr.b, expr.target]) if (child) checkSizeOperand(child);
              }
              checkSizeOperand(arg);
              if (arg.k === "var" && !builtinTypes.includes(arg.name) && !["true", "false"].includes(arg.name) && !Object.hasOwn(s.types, arg.name)) api.fail("宣言されていないsizeof対象です", a, "CompileError");
              let type = arg.k === "var" && builtinTypes.includes(arg.name) ? arg.name : typeOf(arg, s);
              if (arg.k === "literal" && typeof arg.value === "string" && arg.quote !== "'") return { handled: true, value: new TextEncoder().encode(arg.value).length + 1 };
              const sizes = { char: 1, bool: 1, int: 4, long: (s.model.longBits || 64) / 8, float: 4, double: 8 };
              if (type.endsWith("[]") && arg.k === "var") {
                const mem = s.model.memory[s.addresses[arg.name]];
                return { handled: true, value: mem.values.length * sizes[mem.type] };
              }
              if (type.endsWith("*")) api.fail("未対応：ポインタのsizeofはABIにより異なります", a, "未対応");
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
                api.fail("クラス定義がありません：" + a.name, a);
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
              let obj = api.read(a.target, s);
              if (obj === null)
                api.fail("null参照です", a, "NullReferenceException");
              if (a.name === "Length" && Array.isArray(obj))
                return { handled: true, value: obj.length };
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
            if (
              (managed || (language === "cpp" && typeof a === "string" && typeof b === "string" && (node.k === "assign" ? s.types[callName(node.target)] === "string" : [typeOf(node.a, s), typeOf(node.b, s)].includes("string")))) &&
              op === "+" &&
              (typeof a === "string" || typeof b === "string")
            )
              return String(a ?? "") + String(b ?? "");
            if (["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(op))
              return baseBinary(op, a, b);
            if (typeof a !== "number" || typeof b !== "number")
              api.fail("演算する型が一致しません", node, "CompileError");
            let type =
                node.k === "assign"
                  ? s.types[callName(node.target)]
                  : typeOf(node, s),
              integer = !["double", "float"].includes(type);
            if ((op === "/" || op === "%") && b === 0 && integer)
              api.fail(
                "整数の0除算です",
                node,
                managed ? "DivideByZeroException" : "未定義動作",
              );
            let result =
              op === "/" && integer ? Math.trunc(a / b) : baseBinary(op, a, b);
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
                api.fail("未確認：64ビット精度の上限です", node, "未確認");
              result = Number(value);
            }
            if (
              integer &&
              a === -2147483648 &&
              b === -1 &&
              ["/", "%"].includes(op)
            )
              api.fail(
                "整数除算のオーバーフロー",
                node,
                managed ? "OverflowException" : "未定義動作",
              );
            return result;
          },
          call(name, args, s, api, node) {
            let values = args.map((a) => api.read(a, s));
            if (name === "Console.ReadLine") {
              if (!managed) api.fail("未対応の関数です", node);
              return api.freshUnknown("標準入力またはストリーム終端", s);
            }
            if (name === "Console.WriteLine") {
              if (!managed || values.length !== 1)
                api.fail("Console.WriteLineは1引数のみ対応します", node);
              s.outputs.push({
                channel: name,
                text: typeof values[0] === "boolean" ? (values[0] ? "True" : "False") : values[0] === null ? "" : formatValue(values[0]),
                line: node.line,
              });
              api.note(
                s,
                node,
                "標準出力へ出します：" + formatValue(values[0]),
              );
              return null;
            }
            if (name === "printf") {
              if (managed) api.fail("C#のprintfは未対応です", node);
              let [fmt, ...rest] = values;
              if (typeof fmt !== "string")
                api.fail("printfの書式文字列が必要です", node);
              if (fmt.replace(/%[%disfc]/g, "").includes("%")) api.fail("未対応：このprintf書式はモデルで扱えません", node, "未対応");
              let i = 0;
              let text = fmt.replace(/%([%disfc])/g, (_, type) => {
                if (type === "%") return "%";
                let sourceArg = args[i + 1],
                  sourceType = typeOf(sourceArg, s),
                  v = rest[i++];
                if (typeof v === "boolean") v = Number(v);
                if (type === "s") v = cString(v, s, api, node);
                if (
                  ((type === "d" || type === "i" || type === "c") &&
                    !["int", "char", "bool"].includes(sourceType)) ||
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
                return type === "f" ? Number(v).toFixed(6) : type === "c" ? String.fromCharCode(v) : String(v);
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
                .map((v) => { const value = api.read(v, s); return typeof value === "boolean" ? String(Number(value)) : typeOf(v, s) === "char" ? String.fromCharCode(value) : isPtr(value) && s.model.memory[value.object]?.type === "char" ? cString(value, s, api, n) : formatValue(value); })
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
                formatValue(v),
              ]),
            },
            {
              title: managed
                ? "モデルオブジェクト・配列"
                : "モデルメモリ（実アドレスではありません）",
              entries: Object.entries(p.model.memory).map(([k, v]) => [
                k,
                `${v.name}（${v.type}、${v.alive ? "有効" : "寿命終了"}）：${formatValue(v.values)}`,
              ]),
            },
          ],
        };
        return executeProgram(nodes, model, semantics, limits);
      } catch (e) {
        return sourceFailure(e);
      }
    },
  };
}
