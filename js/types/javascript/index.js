import { additionalTemplates } from "./additional-templates.js";
import {
  simulateScript,
  scanScript,
  baseBinary,
  callName,
} from "../../core/script.js";
import { rows } from "../../core/data.js";
import { formatModelValue as formatValue, unknown, isUnknown } from "../../core/contract.js";
const reference = rows([
  [
    "console.log",
    "出力",
    "console.log(value, ...)",
    "コンソールへの出力を説明します。",
    'console.log("合計", total)',
  ],
  [
    "document.getElementById",
    "DOM",
    'document.getElementById("id")',
    "モデルDOMからIDの一致する要素を返します。存在しなければnullです。",
    'const input = document.getElementById("name");',
  ],
  [
    "document.querySelector",
    "DOM",
    'document.querySelector("#id")',
    "モデルに明示したセレクターに対応する最初の要素を返します。",
    'document.querySelector("#result").textContent = "完了";',
    "一般のCSS探索は未対応。model.selectorsで対応を指定できます。",
  ],
  [
    "document.createElement",
    "DOM",
    'document.createElement("tag")',
    "モデル内に未接続の要素を作ります。",
    'const p = document.createElement("p");',
  ],
  [
    "appendChild",
    "DOM",
    "parent.appendChild(node)",
    "モデルの子要素一覧へ追加します。",
    "document.body.appendChild(p);",
  ],
  [
    "textContent",
    "DOM",
    "node.textContent = text",
    "モデル要素のテキストを更新します。",
    'document.getElementById("result").textContent = "完了";',
  ],
  [
    "value",
    "DOM",
    "input.value",
    "入力欄の値を読み書きします。",
    'const name = document.getElementById("name").value;',
  ],
  [
    "push",
    "配列",
    "array.push(value)",
    "配列の末尾に値を追加し、新しい長さを返します。",
    "values.push(4);",
  ],
  [
    "pop",
    "配列",
    "array.pop()",
    "末尾の値を取り除いて返します。",
    "last = values.pop();",
  ],
  [
    "join",
    "配列",
    "array.join(separator)",
    "配列の要素を区切り文字列で連結した文字列を返します。区切りを省略するとカンマです。",
    'values.join("-")',
  ],
  [
    "Number",
    "型変換",
    "Number(value)",
    "ECMAScriptの数値変換を行います。",
    'const score = Number("12");',
  ],
  ["String", "型変換", "String(value)", "文字列に変換します。", "String(123)"],
  ["Boolean", "型変換", "Boolean(value)", "真偽値に変換します。", "Boolean(0)"],
  [
    "parseInt",
    "型変換",
    "parseInt(text, radix)",
    "先頭から整数として読める部分を変換します。",
    'parseInt("12px", 10)',
  ],
  ["Math.abs", "数値", "Math.abs(value)", "絶対値を返します。", "Math.abs(-3)"],
  [
    "Math.floor",
    "数値",
    "Math.floor(value)",
    "負の無限大方向へ丸めます。",
    "Math.floor(-1.2)",
  ],
  [
    "Math.round",
    "数値",
    "Math.round(value)",
    "近い整数へ丸めます。同点では正の無限大側です。",
    "Math.round(-1.5)",
  ],
  [
    "JSON.stringify",
    "オブジェクト",
    "JSON.stringify(value)",
    "JSON文字列へ変換します。",
    "JSON.stringify({a:1})",
  ],
  [
    "prompt",
    "入出力",
    'prompt("質問")',
    "結果は実行時の入力またはキャンセルで決まります。",
    'const answer = prompt("名前");',
  ],
  [
    "alert",
    "入出力",
    'alert("メッセージ")',
    "メッセージを出力欄に記録します。",
    'alert("完了");',
  ],
  [
    "if",
    "制御",
    "if (条件) { … } else { … }",
    "ToBooleanにより条件を判定します。",
    "if (score > 0) { console.log(score); }",
  ],
  [
    "for",
    "制御",
    "for (let i=0; i<3; i++) { … }",
    "初期化・条件・更新を順に評価します。",
    "for (let i=0; i<3; i++) { total += i; }",
  ],
  [
    "while",
    "制御",
    "while (条件) { … }／do { … } while (条件);",
    "条件が真の間繰り返します。do-whileは本体を一度実行してから条件を判定します。",
    "let n = 0;\nwhile (n < 3) { n = n + 1; }",
  ],
  [
    "break",
    "制御",
    "break;",
    "最も内側のループを直ちに終了します。",
    "for (let i = 0; i < 5; i++) { if (i === 2) { break; } }",
  ],
  [
    "continue",
    "制御",
    "continue;",
    "現在の繰り返しの残りを飛ばし、次の繰り返しへ進みます。",
    "for (let i = 0; i < 3; i++) { if (i === 1) { continue; } console.log(i); }",
  ],
  [
    "typeof",
    "演算子",
    "typeof 値",
    "値の型を表す文字列を返します。未宣言の名前に対してもエラーにならず \"undefined\" を返します。",
    "typeof 42",
  ],
  [
    "BigInt",
    "数値",
    "123n",
    "任意精度の整数です。末尾にnを付けたリテラルで表し、BigInt同士の演算ができます。通常の数値と混ぜて演算することはできません。",
    "10n + 20n",
    "BigInt(...)というコンストラクタ呼び出しはこのモデルでは未実装です。リテラルとBigInt同士の演算だけに対応します。",
  ],
  [
    "オブジェクトリテラル",
    "オブジェクト",
    "{キー: 値, …}",
    "プロパティを持つオブジェクトをその場で作ります。宣言の初期値としても使えます。",
    "const point = {a: 1, b: 2};",
  ],
  [
    "id",
    "DOM",
    "element.id",
    "モデル要素のIDを読み書きします。",
    'document.getElementById("result").id',
  ],
  [
    "tagName",
    "DOM",
    "element.tagName",
    "モデル要素のタグ名を返します。HTML要素では大文字です。",
    'document.getElementById("result").tagName',
  ],
  [
    "children",
    "DOM",
    "element.children",
    "モデル要素の子要素の一覧を返します。",
    "document.body.children",
  ],
  [
    "document.body",
    "DOM",
    "document.body",
    "モデルDOMのbody要素を返します。appendChildで子要素を追加できます。",
    'const p = document.createElement("p");\ndocument.body.appendChild(p);',
  ],
  [
    "undefined",
    "値",
    "undefined",
    "値が未定義であることを表すプリミティブ値です。初期化されていない変数の値でもあります。",
    "console.log(undefined);",
  ],
  [
    "NaN",
    "値",
    "NaN",
    "数値ではない計算結果を表す値です。NaN同士も等しくありません（NaN === NaNはfalse）。",
    "console.log(NaN);",
  ],
  [
    "Infinity",
    "値",
    "Infinity",
    "正の無限大を表す値です。1 / 0の結果などで現れます。",
    "console.log(Infinity);",
  ],
  [
    "let",
    "宣言",
    "let 名前 = 値;",
    "再代入できる変数を宣言します。ブロックの内側だけで有効で、初期化前に参照するとエラーになります。",
    "let total = 0;",
  ],
  [
    "const",
    "宣言",
    "const 名前 = 値;",
    "再代入できない変数を宣言します。宣言と同時に初期化が必要です。",
    "const limit = 3;",
  ],
  [
    "var",
    "宣言",
    "var 名前 = 値;",
    "関数または全体の範囲で有効な変数を宣言します。宣言は巻き上げられます。",
    "var count = 0;",
  ],
  [
    "addEventListener",
    "DOM",
    'node.addEventListener("click", handler)',
    "イベントにハンドラを登録するAPIです。",
    'button.addEventListener("click", handler);',
    "イベント・コールバック実行はこの初版では未対応です。",
    false,
  ],
]);
const referenceNames = new Set(reference.map((r) => r.name));
const exampleSetup = {"console.log":"let total=3;",appendChild:'const p=document.createElement("p");',push:"const values=[1,2,3];",pop:"const values=[1,2,3]; let last;",join:"const values=[1,2,3];",if:"let score=2;",for:"let total=0;"};
for (const r of reference) if (exampleSetup[r.name]) r.example = exampleSetup[r.name] + "\n" + r.example;
function convertedUnknown(value, conversion) {
  return { ...unknown(conversion + "の入力による", conversion + ":" + value.id),
    rootId: value.rootId || value.id, conversion,
    valueType: conversion === "Number" ? "number" : conversion === "Boolean" ? "boolean" : "string" };
}
function containsUnknown(value, seen = new Set()) {
  if (isUnknown(value)) return true;
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some(v => containsUnknown(v, seen));
}
// A record written as a declaration initializer (let o = {}; o.a = 1) is
// currently modelled as a zero-length array carrying named fields, because
// the shared parser reads {…} in a declaration as an array initializer.
// Such a value is a record, not an array: display and JSON conversion in
// this type treat it as a plain object. Genuine arrays (any elements, or
// no named fields) are returned unchanged.
function isRecordLikeArray(value) {
  return (
    Array.isArray(value) &&
    value.length === 0 &&
    Object.keys(value).length > 0
  );
}
function containsBigInt(value, seen = new Set()) {
  if (typeof value === "bigint") return true;
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some((v) => containsBigInt(v, seen));
}
function needsDisplayValue(value, seen = new Set()) {
  if (typeof value === "bigint") return true;
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  if (isRecordLikeArray(value)) return true;
  seen.add(value);
  return Object.values(value).some((v) => needsDisplayValue(v, seen));
}
function displayValue(value, seen = new Map()) {
  // BigInt values display with the trailing n of real JavaScript notation.
  // (JSON.stringify never reaches this: it rejects BigInt before converting.)
  if (typeof value === "bigint") return value.toString() + "n";
  if (!needsDisplayValue(value)) return value;
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  if (isRecordLikeArray(value)) {
    let out = {};
    seen.set(value, out);
    for (let [k, v] of Object.entries(value))
      out[k] = displayValue(v, seen);
    return out;
  }
  if (Array.isArray(value)) {
    let out = [];
    seen.set(value, out);
    for (let v of value) out.push(displayValue(v, seen));
    return out;
  }
  let out = {};
  seen.set(value, out);
  for (let [k, v] of Object.entries(value)) out[k] = displayValue(v, seen);
  return out;
}
// RG-04 追加表面（R21-N5／N7）: console.log の表記を実 JavaScript に
// 合わせる。スカラーの -0 は "-0"（String(-0) は "0" になる）、配列・
// オブジェクト内の undefined は「未設定」ではなく undefined、-0 も -0。
// formatValue（JSON 整形）は undefined を「未設定」へ写し -0 を 0 に
// 潰すため、表示値へ番兵文字列を埋め、整形後に素の表記へ戻す。
// モデル値（kind／__class を持つもの）は formatValue 側の表記に委ねる。
const UNDEF_MARK = "\u0001undefined\u0001",
  NEGZERO_MARK = "\u0001-0\u0001";
function markForLog(v, seen = new Map()) {
  if (v === undefined) return UNDEF_MARK;
  if (typeof v === "number" && Object.is(v, -0)) return NEGZERO_MARK;
  if (!v || typeof v !== "object") return v;
  if (v.kind || v.__class) return v;
  if (seen.has(v)) return seen.get(v);
  if (Array.isArray(v)) {
    const out = [];
    seen.set(v, out);
    for (const x of v) out.push(markForLog(x, seen));
    return out;
  }
  const out = {};
  seen.set(v, out);
  for (const [k, x] of Object.entries(v)) out[k] = markForLog(x, seen);
  return out;
}
function logText(x) {
  if (typeof x === "bigint") return x.toString() + "n";
  if (typeof x === "number" && Object.is(x, -0)) return "-0";
  if (x && typeof x === "object")
    return formatValue(markForLog(displayValue(x)))
      .replaceAll(JSON.stringify(UNDEF_MARK), "undefined")
      .replaceAll(JSON.stringify(NEGZERO_MARK), "-0");
  return String(x);
}
export const definition = {
  id: "javascript",
  name: "JavaScript",
  extensions: [".js", ".txt"],
  syntax: {
    name: "ブラウザJavaScript 部分集合",
    caseSensitive: true,
    lineComment: "//",
  },
  reference,
  templates: [
    {
      id: "js-dom",
      title: "モデルDOMの入力と表示",
      code: 'const input = document.getElementById("name");\nconst result = document.getElementById("result");\nresult.textContent = "こんにちは、" + input.value;\nconsole.log(result.textContent);',
      intro:
        "getElementByIdでモデルの入力値を読み、textContentを書き換えます。実際の画面要素には触れません。",
      refs: ["document.getElementById", "value", "textContent", "console.log"],
    },
    {
      id: "js-array",
      title: "配列とオブジェクトの参照共有",
      code: "const values = [1, 2, 3];\nconst same = values;\nsame.push(4);\nlet total = 0;\nfor (let i = 0; i < values.length; i++) {\n    total += values[i];\n}\nconsole.log(total);\nconsole.log(values);",
      intro:
        "配列を代入すると同じオブジェクトへの参照が共有されます。constでも要素は変更できます。",
      refs: ["push", "for", "console.log"],
    },
    {
      id: "js-runtime",
      title: "入力が未確定の条件分岐",
      code: 'const answer = prompt("続けますか");\nif (answer === "はい") {\n    document.getElementById("result").textContent = "開始";\n} else {\n    alert("終了");\n}',
      intro:
        "promptの入力値は捏造しません。選択中のパスでDOMの変化と出力を比較できます。",
      refs: ["prompt", "if", "document.getElementById", "textContent", "alert"],
    },
  ],
  glossary: [
    ["DOM", "文書を要素ノードの構造として扱う仕組みです。"],
    ["参照", "同じオブジェクトを指す値です。"],
    ["const", "変数への再代入を禁止します。オブジェクトの内容は変更できます。"],
    [
      "未確定（値）",
      "実行時に決まる値のことです。このアプリでは値を仮定して作らず、未確定のまま扱って、到達可能な分岐をすべて表示します。",
    ],
  ],
  model: {
    kind: "json",
    title: "モデルDOM",
    hint: "elements、selectors、bodyを編集できます。実DOMやネットワークを操作せず、このモデルだけを更新します。",
    defaults: {
      variables: {},
      dom: {
        elements: {
          name: {
            id: "name",
            tagName: "INPUT",
            value: "学習者",
            textContent: "",
          },
          result: { id: "result", tagName: "P", textContent: "未実行" },
        },
        selectors: { "#name": "name", "#result": "result" },
        body: { tagName: "BODY", children: [] },
      },
    },
  },
  semantics: {
    description:
      "ブラウザJavaScriptの変数・配列・オブジェクト参照・型変換と、明示したDOMモデルを追跡します。",
    support:
      "let / const / var、代入、If / For / While、掲載APIに対応。関数定義・コールバック・イベント・非同期処理・fetch・任意のDOM APIは未対応です。モデルにないサイトの挙動は推測しません。",
    sources: [
      { title: "ECMAScript公式仕様", url: "https://tc39.es/ecma262/" },
      { title: "WHATWG DOM Standard", url: "https://dom.spec.whatwg.org/" },
    ],
  },
  scan: (code) => scanScript(code, reference),
  async simulate(code, model, limits) {
    return simulateScript(
      code,
      model,
      {
        dialect: "js",
        blockScopes: true,
        logicalOperands: true,
        initialize(s, api, nodes) {
          s.vars.document = { body: s.model.dom.body };
          function hoist(list, enclosing = new Set()) {
            const lexical = new Set();
            for (const n of list) if (n.k === "declare") {
              if (!["let", "const", "var"].includes(n.type) || n.pointer || n.size)
                api.fail("このJavaScript宣言は未対応です", n, "未対応");
              if (n.type === "const" && !n.value)
                api.fail("constには初期化式が必要です", n, "SyntaxError");
              if (n.type !== "var") {
                if (lexical.has(n.name)) api.fail("同じスコープの宣言が重複しています", n, "SyntaxError");
                lexical.add(n.name);
              }
            }
            const visible = new Set([...enclosing, ...lexical]);
            for (const n of list) {
              if (n.k === "declare" && n.type === "var") {
                if (visible.has(n.name)) api.fail("varとlet / constの宣言が競合しています", n, "SyntaxError");
                if (!Object.hasOwn(s.vars, n.name)) s.vars[n.name] = undefined;
              }
              if (n.k === "for") hoist([n.init], visible);
              if (n.body) hoist(n.body, visible);
              if (n.otherwise) hoist(n.otherwise, visible);
            }
          }
          hoist(nodes);
        },
        prepareScope(nodes, s, api) {
          for (const n of nodes) if (n.k === "declare" && n.type !== "var") {
            api.registerDeclaration(s, n);
            s.vars[n.name] = { kind: "js-uninitialized" };
            s.types[n.name] = n.type;
          }
        },
        step(n, s, api) {
          if (n.k !== "declare") return;
          const v = n.value ? api.read(n.value, s) : undefined;
          if (n.type !== "var" || n.value) s.vars[n.name] = v;
          api.note(s, n, `${n.name} を用意します：${formatValue(displayValue(s.vars[n.name]))}`);
          return [s];
        },
        increment(value, node, s, api) {
          if (isUnknown(value)) api.fail("未確定値の増減は未確認です", node, "未確認");
          const previous = Number(value);
          return { previous, next: previous + (node.op === "++" ? 1 : -1) };
        },
        binary(op, a, b, node, s, api) {
          if (!isUnknown(a) && !isUnknown(b)) return baseBinary(op, a, b, "js");
          const comparison = ["==", "!=", "===", "!==", "<", ">", "<=", ">="].includes(op);
          const numeric = ["<", ">", "<=", ">="].includes(op) &&
            (typeof a === "number" || typeof b === "number" || a?.valueType === "number" || b?.valueType === "number");
          if (numeric) {
            if (isUnknown(a) && a.valueType === "prompt") a = convertedUnknown(a, "Number");
            if (isUnknown(b) && b.valueType === "prompt") b = convertedUnknown(b, "Number");
          }
          if (["==", "!="].includes(op)) {
            const u = isUnknown(a) ? a : b, known = isUnknown(a) ? b : a;
            const safe = !isUnknown(known) &&
              ((u.valueType === "prompt" && (known === null || typeof known === "string")) || typeof known === u.valueType);
            if (!safe) api.fail("未確認：未確定値を型変換する == / != の比較", node, "未確認");
          }
          if (comparison) for (const value of [a, b].filter(isUnknown)) {
            const root = value.rootId || value.id, mode = value.conversion || "raw";
            s.jsComparisonModes ??= {};
            if (s.jsComparisonModes[root] && s.jsComparisonModes[root] !== mode)
              api.fail("未確認：型変換前後の未確定値を組み合わせた条件", node, "未確認");
            s.jsComparisonModes[root] = mode;
          }
          if (["+", "-", "*", "/", "%", "^", "&", "|"].includes(op) &&
              [a,b].some(v => isUnknown(v) && v.valueType !== "number"))
            api.fail("未確認：型が未確定の算術・文字列演算", node, "未確認");
          return baseBinary(op, a, b, "js");
        },
        read(a, s, api) {
          if (a.k === "unary" && a.op === "typeof") {
            const name = callName(a.arg), root = name?.split(".")[0];
            if (name && !Object.hasOwn(s.vars, root)) {
              if (["Number", "String", "Boolean", "parseInt", "prompt", "alert", "console.log", "Math.abs", "Math.floor", "Math.round", "JSON.stringify", "document.getElementById", "document.querySelector", "document.createElement"].includes(name)) return { handled: true, value: "function" };
              if (["console", "Math", "JSON", "document"].includes(name)) return { handled: true, value: "object" };
            }
            if (a.arg.k === "var" && !Object.hasOwn(s.vars, a.arg.name) && !["undefined", "NaN", "Infinity", "true", "false", "null"].includes(a.arg.name))
              return { handled: true, value: "undefined" };
            const value = api.read(a.arg, s);
            return { handled: true, value: isUnknown(value) ? unknown("typeof の対象の型") : typeof value };
          }
          // RG-11 統合対応：基数リテラル（0x…等）の末尾の英字は型接尾辞ではない。
          if (a.k === "literal" && a.raw && /[LfF]$/.test(a.raw) && !/^0[xXbBoO]/.test(a.raw))
            api.fail("JavaScriptに数値の型接尾辞はありません", a, "SyntaxError");
          if (a.k === "var" && s.vars[a.name]?.kind === "js-uninitialized")
            api.fail("初期化前のlet / constは参照できません", a, "ReferenceError");
          if (a.k === "var" && ["True", "False", "TRUE", "FALSE", "NULL", "None", "Blank"].includes(a.name) && !Object.hasOwn(s.vars, a.name))
            api.fail("未定義の名前：" + a.name, a, "ReferenceError");
          if (a.k === "unary" && ["not", "&", "*"].includes(a.op))
            api.fail("このJavaScript演算子は未対応です", a, "未対応");
          if (a.k === "var" && a.name === "undefined")
            return { handled: true, value: undefined };
          if (a.k === "var" && a.name === "NaN")
            return { handled: true, value: NaN };
          if (a.k === "var" && a.name === "Infinity")
            return { handled: true, value: Infinity };
          if (a.k === "member") {
            // RG-59 統合対応：リファレンス語彙にあるメンバ名（textContent／value 等の
            // DOM プロパティ）は使用チップの対象として refs に戻す。語彙に無い
            // データ名は refs に入れない（コア側の混入防止と対）。
            if (referenceNames.has(a.name)) {
              s.pendingRefs ??= [];
              if (!s.pendingRefs.includes(a.name)) s.pendingRefs.push(a.name);
            }
            if (["__proto__","constructor","prototype"].includes(a.name))
              api.fail("このプロパティはモデルでは未対応です", a, "未対応");
            let value = api.read(a.target, s);
            if (value == null)
              api.fail(
                "null / undefined のプロパティは参照できません",
                a,
                "TypeError",
              );
            if (isUnknown(value))
              return {
                handled: true,
                value: unknown("実行時のオブジェクトプロパティ"),
              };
            return { handled: true, value: value[a.name] };
          }
          if (a.k === "index") {
            if (a.indexes.length !== 1 || !a.indexes[0])
              api.fail("この添字式は未対応です", a, "未対応");
            let value = api.read(a.target, s),
              index = api.read(a.indexes[0], s);
            if (value == null)
              api.fail("null / undefined の添字参照です", a, "TypeError");
            if (isUnknown(value) || isUnknown(index))
              return { handled: true, value: unknown("実行時の添字参照") };
            return { handled: true, value: value[index] };
          }
          return null;
        },
        write(a, v, s, api, node) {
          if (a.k === "var" && s.vars[a.name]?.kind === "js-uninitialized")
            api.fail("初期化前のlet / constへは代入できません", node, "ReferenceError");
          if (a.k === "var" && s.types[a.name] === "const")
            api.fail("Assignment to constant variable", node, "TypeError");
          if (a.k === "member" || a.k === "index") {
            let obj = api.read(a.target, s);
            if (isUnknown(obj)) api.fail("未確定オブジェクトへの書き込みは未確認です", node, "未確認");
            if (obj == null)
              api.fail("null / undefined へ書き込めません", node, "TypeError");
            if (typeof obj !== "object")
              api.fail("プリミティブ値へは書き込めません", node, "TypeError");
            let key = a.k === "member" ? a.name : api.read(a.indexes[0], s);
            if (isUnknown(key)) api.fail("未確定の添字への書き込みは未確認です", node, "未確認");
            if (["__proto__", "constructor", "prototype"].includes(key))
              api.fail("このプロパティはモデルでは未対応です", node);
            obj[key] = v;
            return true;
          }
          return false;
        },
        call(name, args, s, api, node) {
          const values = () => args.map((a) => api.read(a, s));
          switch (name) {
            case "console.log": {
              let v = values();
              s.outputs.push({
                channel: "console.log",
                text: v.map(logText).join(" "),
                line: node.line,
              });
              return undefined;
            }
            case "alert":
              s.outputs.push({
                channel: "alert",
                text: formatValue(displayValue(api.read(args[0], s))),
                line: node.line,
              });
              return undefined;
            case "prompt":
              return { ...api.freshUnknown("promptの入力またはキャンセル", s), valueType: "prompt" };
            case "document.getElementById":
            {
              const id = api.read(args[0], s);
              if (isUnknown(id)) api.fail("未確定のIDによるDOM探索は未確認です", node, "未確認");
              return Object.hasOwn(s.model.dom.elements,id) ? s.model.dom.elements[id] : null;
            }
            case "document.querySelector": {
              let selector = api.read(args[0], s),
                id = Object.hasOwn(s.model.dom.selectors || {},selector) ? s.model.dom.selectors[selector] : undefined;
              if (id) return s.model.dom.elements[id] ?? null;
              if (typeof selector === "string" && selector.startsWith("#"))
                return Object.hasOwn(s.model.dom.elements,selector.slice(1)) ? s.model.dom.elements[selector.slice(1)] : null;
              api.fail("モデルに未定義のCSSセレクターです", node);
            }
            case "document.createElement":
              return {
                tagName: String(api.read(args[0], s)).toUpperCase(),
                textContent: "",
                children: [],
              };
            case "Number": {
              if (!args.length) return 0;
              let v = api.read(args[0], s);
              return isUnknown(v)
                ? convertedUnknown(v, "Number")
                : Number(v);
            }
            case "String": {
              if (!args.length) return "";
              let v = api.read(args[0], s);
              return isUnknown(v) ? convertedUnknown(v, "String") : String(v);
            }
            case "Boolean": {
              let v = api.read(args[0], s);
              return isUnknown(v) ? convertedUnknown(v, "Boolean") : Boolean(v);
            }
            case "parseInt": {
              let [v, radix] = values();
              return isUnknown(v)
                ? unknown("parseIntの入力による")
                : parseInt(v, radix);
            }
            case "Math.abs":
            case "Math.floor":
            case "Math.round": {
              let v = api.read(args[0], s);
              return isUnknown(v)
                ? unknown(name + "の引数による")
                : Math[name.split(".")[1]](v);
            }
            case "JSON.stringify": {
              let v = api.read(args[0], s);
              if (containsUnknown(v)) return unknown("JSON.stringifyの入力に未確定値があります");
              if (containsBigInt(v))
                api.fail("BigIntはJSONへ変換できません", node, "TypeError");
              try {
                return JSON.stringify(displayValue(v));
              } catch {
                api.fail("循環参照はJSONへ変換できません", node, "TypeError");
              }
            }
          }
          if (node.target.k === "member") {
            let object = api.read(node.target.target, s),
              method = node.target.name;
            if (Array.isArray(object)) {
              if (method === "push") return object.push(...values());
              if (method === "pop") return object.pop();
              if (method === "join") return object.join(values()[0]);
            }
            if (method === "appendChild") {
              let child = api.read(args[0], s);
              if (!child || typeof child !== "object")
                api.fail("ノードが必要です", node, "TypeError");
              object.children ??= [];
              object.children.push(child);
              if (child.id) s.model.dom.elements[child.id] = child;
              api.note(s, node, "モデルDOMの子要素に追加します");
              return child;
            }
          }
          api.fail("このJavaScript関数は説明に対応していません：" + name, node);
        },
        groups: (p) => [
          {
            title: "変数・オブジェクト",
            entries: Object.entries(p.vars)
              .filter(([k]) => k !== "document")
              .map(([k, v]) => [k, formatValue(displayValue(v))]),
          },
          {
            title: "モデルDOM",
            entries: [
              ["要素", formatValue(displayValue(p.model.dom.elements))],
              ["body", formatValue(displayValue(p.model.dom.body))],
            ],
          },
        ],
      },
      limits,
    );
  },
};

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
