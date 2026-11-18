import { additionalTemplates } from "./additional-templates.js";
import {
  simulateScript,
  scanScript,
  baseBinary,
  callName,
} from "../../core/script.js";
import { rows } from "../../core/data.js";
import { formatModelValue as formatValue, unknown, isUnknown, LIMITS } from "../../core/contract.js";
// 高度モード ブロックB5（JSエンジン班）：高度差分の意味論は
// advanced-engine.js に分離し、このファイルからは委譲だけを行う。
import {
  advancedGlobalCall,
  advancedMemberCall,
  advancedGlobalProp,
  toDisplayModel,
  toJsonModel,
  modelContainsBigInt,
  modelToString,
  advancedIndexRead,
  advancedIndexWrite,
  makeRawJsonToken,
  classOf as advancedClassOf,
  isModelValue,
  ADVANCED_EAGER_NAMES,
  TYPEOF_FUNCTION_NAMES,
} from "./advanced-engine.js";
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
    "対応するのは model.selectors の指定、#id、タグ名、.クラス、カンマ区切りの組み合わせだけです。子孫・属性・疑似クラス等のセレクターは未対応として停止します。",
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
    "モデルの子要素一覧へ追加します。既に別の親がある要素は、元の親から外れて移動します。",
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
    "JSON.stringify(value, replacer, space)",
    "JSON文字列へ変換します。第2引数にキーの配列を渡すとそのキーだけを残し、第3引数（数値または文字列）で字下げを指定できます。",
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
    "最も内側のループ、switch文、またはラベル付き文を直ちに終了します。",
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
    "関数としてのBigInt(...)呼び出し（値の変換）はこのモデルでは未実装です。BigIntはコンストラクタではなく、new BigInt()は実JavaScriptでもエラーになります。リテラルとBigInt同士の演算だけに対応します。",
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
// JS-01：実 JavaScript に存在するグローバルオブジェクト名。これらへの
// メンバー呼び出し・プロパティ参照が未対応の場合に、基盤側の変数解決へ
// 落として「未定義の名前：Math」等の虚偽の ReferenceError にしない。
const GLOBAL_OBJECTS = new Set([
  "Math", "JSON", "console", "Array", "Object", "Number", "String",
  "Boolean", "Symbol", "BigInt", "Date", "RegExp", "Error", "TypeError",
  "RangeError", "SyntaxError", "ReferenceError", "Map", "Set", "WeakMap",
  "WeakSet", "Promise", "Reflect", "Proxy", "Intl", "globalThis",
  "window", "ArrayBuffer", "DataView",
  // 高度モード B5：実在するグローバル名の追加分（未対応の場合も
  // 「未定義の名前」という虚偽の理由にしないための JS-01 の拡張）。
  "EvalError", "URIError", "AggregateError", "SuppressedError",
  "Atomics", "Iterator", "WeakRef", "FinalizationRegistry",
  "SharedArrayBuffer", "DisposableStack", "AsyncDisposableStack",
  "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array",
  "Uint16Array", "Int32Array", "Uint32Array", "Float32Array",
  "Float64Array", "Float16Array", "BigInt64Array", "BigUint64Array",
]);
const exampleSetup = {"console.log":"let total=3;",appendChild:'const p=document.createElement("p");',push:"const values=[1,2,3];",pop:"const values=[1,2,3]; let last;",join:"const values=[1,2,3];",if:"let score=2;",for:"let total=0;"};
for (const r of reference) if (exampleSetup[r.name]) r.example = exampleSetup[r.name] + "\n" + r.example;
// P-N1: 配列の総内容量の見積もり（上限超過時点で打ち切る）。状態
// スナップショットの転送では同じ文字列への参照でも要素ごとに複製
// されるため、要素数だけでは配列の実サイズを抑えられない。
// R27-N11：分割代入パターンの葉（変数名）を集める。宣言位置のパターンは
// checkPattern で変数以外が弾かれているため、葉は変数か入れ子パターン。
function patternLeafNamesLocal(pattern, out = []) {
  const els =
    pattern.k === "arrayPattern" ? pattern.elements : pattern.props;
  for (const el of els) {
    if (!el) continue;
    if (el.target?.k === "arrayPattern" || el.target?.k === "objectPattern")
      patternLeafNamesLocal(el.target, out);
    else if (el.target?.k === "var") out.push(el.target.name);
  }
  return out;
}
// R27-N10（RG-208 と同型）：非有限数を、その文字列表現（"Infinity"／
// "-Infinity"／"NaN"）へ置き換えた表示用スナップショットを返す。
// 最終状態（paths[].vars）は JSON として直列化される表示面であり、
// そのままでは非有限数が null に化けて出力表示と矛盾していた。
// 実行完了後のスナップショットに限り置き換え、実行中の数値としての
// 働きは変えない。オブジェクト／配列にネストした非有限数も対象とし、
// 循環は元の参照構造を保つ。
function finiteSafeSnapshot(v, seen = new Map()) {
  if (typeof v === "number") return Number.isFinite(v) ? v : String(v);
  if (!v || typeof v !== "object") return v;
  if (isUnknown(v)) return v;
  if (seen.has(v)) return seen.get(v);
  let out = Array.isArray(v) ? [] : {};
  seen.set(v, out);
  if (Array.isArray(v))
    for (let x of v) out.push(finiteSafeSnapshot(x, seen));
  else
    for (let [k, x] of Object.entries(v))
      out[k] = finiteSafeSnapshot(x, seen);
  return out;
}
function arrayContentSize(v, budget = 200000, depth = 0) {
  if (typeof v === "string") return v.length;
  if (Array.isArray(v) && depth <= 4) {
    let total = 0;
    for (const x of v) {
      total += arrayContentSize(x, budget - total, depth + 1);
      if (total > budget) return total;
    }
    return total;
  }
  return 0;
}
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
  // 高度モード B5：モデル値（Date／Map 等）を含む値も表示変換の対象。
  if (isModelValue(value)) return true;
  if (isRecordLikeArray(value)) return true;
  seen.add(value);
  return Object.values(value).some((v) => needsDisplayValue(v, seen));
}
function displayValue(value, seen = new Map()) {
  // BigInt values display with the trailing n of real JavaScript notation.
  // (JSON.stringify never reaches this: it rejects BigInt before converting.)
  if (typeof value === "bigint") return value.toString() + "n";
  // 高度モード B5：モデル値（Date／RegExp／Error／TypedArray 等）は
  // advanced-engine.js 側の表示形へ変換する。
  const dm = toDisplayModel(value, displayValue);
  if (dm.handled) return dm.value;
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
// JS-B5-06：メソッド値の読み取りがホスト関数（Object.prototype 等の
// 実装）を解決した場合に返す未確定値。関数値はこの方言では表現できない
// ため、ホスト関数のソース文字列を値として漏らす代わりに「実行時に
// 決まる」値とする。valueType: "function" を付け、typeof だけは実
// JavaScript どおり "function" と答えられるようにする（typeof 演算子の
// 既存挙動への影響を最小化する裁定）。
function methodValueUnknown(key) {
  return {
    ...unknown("メソッド " + String(key) + " の値（関数値）"),
    valueType: "function",
  };
}
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
// R7-181（修正バッチ13）：値の奥に埋まった未確定値を探す。変換関数が
// 未確定値をホストの String／Number へ素の内部オブジェクトとして流すと
// "[object Object]" や NaN に固定されてしまうため、変換前に検出する。
function findUnknown(value, seen = new Set()) {
  if (isUnknown(value)) return value;
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  for (const v of Object.values(value)) {
    const found = findUnknown(v, seen);
    if (found) return found;
  }
  return null;
}
// Web IDL DOMString 変換／実 JavaScript の String 変換（alert・
// textContent・id の書き込みと String() で共用する）。BigInt は末尾の
// n なし、配列は要素をカンマで連結（null／undefined の要素は空文字）、
// 通常オブジェクトは "[object Object]"。
function jsStringValue(v) {
  if (typeof v === "string") return v;
  if (typeof v === "bigint") return v.toString();
  // 高度モード B5：モデル値は実 JavaScript の文字列表現へ変換する。
  if (isModelValue(v)) return modelToString(v, null).value;
  if (isRecordLikeArray(v)) return "[object Object]";
  if (Array.isArray(v))
    return v
      .map((el) =>
        el === null || el === undefined ? "" : jsStringValue(el),
      )
      .join(",");
  if (v && typeof v === "object") return "[object Object]";
  return String(v);
}
// A5班監査: 計算済みメンバー呼び出しの表示名。コアの callName は
// index ノードを描けないため、添字式がメンバー形（Symbol.iterator
// 等）・リテラル・変数の場合に「受け手[キー]」形を組み立てる。
// 受け手が描けない場合はキー部分だけでも返す（名指し欄を空にしない）。
function indexCallName(target) {
  if (!target || target.k !== "index" || !target.indexes?.length) return "";
  const idx = target.indexes[0];
  let key = null;
  if (idx.k === "member") key = callName(idx); // 例: Symbol.iterator
  else if (idx.k === "var") key = idx.name;
  else if (idx.k === "literal")
    key = typeof idx.value === "string" ? JSON.stringify(idx.value) : String(idx.value);
  if (!key) return "";
  const base = callName(target.target);
  return base ? `${base}[${key}]` : `[${key}]`;
}
// B5-JS Date文字列化修正：文字列連結（+）で実際に文字列化される位置に
// モデル値があるか。モデル値そのものと、配列の要素（入れ子を含む）だけ
// が対象で、通常オブジェクトの中のモデル値は実 JavaScript でも
// "[object Object]" の内側に隠れるため対象にしない。モデル値は素の
// プレーンオブジェクトで表されるため、ホストの + にそのまま渡すと
// Object.prototype.toString で "[object Object]" に化ける（Date なら
// 本来は UTC 文字列、Map なら "[object Map]" 等）。該当する場合は
// jsStringValue（String()／alert と同じモデルの文字列変換）で連結する。
function modelInConcatPosition(value, seen = new Set()) {
  if (isModelValue(value)) return true;
  if (!Array.isArray(value) || seen.has(value)) return false;
  seen.add(value);
  return value.some((v) => modelInConcatPosition(v, seen));
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
  extensions: [".js", ".mjs", ".cjs", ".txt"],
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
      "巻き上げ",
      "varの変数宣言や関数宣言が、スコープの先頭で宣言されたものとして扱われる動作です。varの変数は代入より前に参照するとundefinedになります。",
    ],
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
  // A5班監査: 機構が差し込む有効カタログ（高度モードでは合成カタログ、
  // 簡易モードでは基礎カタログ）を参照する（cmd／Python と同じ
  // __catalogReference 方式）。従来は基礎カタログに閉じており、高度
  // 項目が実行前チップに一切現れなかった。未設定の環境（単体テスト
  // 等）では従来どおり基礎カタログで走査する。
  scan: (code) => scanScript(code, definition.__catalogReference || reference),
  async simulate(code, model, limits) {
    // R31-N13：モデル形状の入口検証。モデル自体がオブジェクトでない
    // 場合や、必須項目（dom／dom.elements／dom.body）の欠落・型違いが
    // ある場合は、実行時の汎用文言（「null / undefined のプロパティ
    // は参照できません」）ではなく、モデル側の問題として項目名を
    // 名指して停止する（shell 種類の「モデルfilesは配列で指定して
    // ください」と同水準）。selectors／variables は欠落時のフォール
    // バックが実装にあるため、型違いの場合だけ名指す。
    const isModelObject = (v) =>
      !!v && typeof v === "object" && !Array.isArray(v);
    const modelFailure = (message) => ({
      paths: [],
      error: { line: 1, message, category: "モデルエラー" },
      truncated: false,
      limits: { ...LIMITS, ...limits },
    });
    if (!isModelObject(model))
      return modelFailure("モデルはオブジェクト（JSON）で指定してください");
    if (!isModelObject(model.dom))
      return modelFailure("モデルdomはオブジェクトで指定してください");
    if (!isModelObject(model.dom.elements))
      return modelFailure(
        "モデルdom.elementsはオブジェクトで指定してください",
      );
    // R32-PLAT-N2(b)（修正バッチ11・fx班）: 要素値の形状も入口で検証
    // する。要素値がオブジェクトでない形（例：{name: 42}）は、要素へ
    // の書き込み時に「null / undefined へ書き込めません」という
    // 要素を指さない汎用文言になっていた。Power Apps の
    // controls.<名前>、UI.Vision の pages.<URL>.elements.<ロケータ>
    // と同じく、要素キー名を名指して停止する。
    for (const [name, element] of Object.entries(model.dom.elements))
      if (!isModelObject(element))
        return modelFailure(
          `モデルdom.elements.${name}はオブジェクトで指定してください`,
        );
    if (!isModelObject(model.dom.body))
      return modelFailure("モデルdom.bodyはオブジェクトで指定してください");
    if (model.dom.selectors !== undefined && !isModelObject(model.dom.selectors))
      return modelFailure(
        "モデルdom.selectorsはオブジェクトで指定してください",
      );
    if (model.variables !== undefined && !isModelObject(model.variables))
      return modelFailure("モデルvariablesはオブジェクトで指定してください");
    // 修正バッチ13（R7-38／39／78／185／186）：モデルDOMの意味論。
    // 要素は tagName を持つオブジェクトとして識別し、親子関係は
    // children 配列そのものから辿る（索引の複製を持たないことで、
    // id の書き換えや移動に常に追随する）。
    const isDomNode = (v) =>
      !!v && typeof v === "object" && typeof v.tagName === "string";
    const walkDom = (root, visit, seen = new Set()) => {
      if (!root || typeof root !== "object" || seen.has(root)) return;
      seen.add(root);
      visit(root);
      for (const c of root.children || []) walkDom(c, visit, seen);
    };
    // 注意：実行中の要素は状態側の複製（s.model）の中にあるため、
    // 探索は必ず呼び出し時点の s.model に対して行う。
    const domRoots = (m) => [
      m.dom.body,
      ...Object.values(m.dom.elements),
    ];
    const findById = (m, id) => {
      let found = null;
      for (const root of domRoots(m))
        walkDom(root, (el) => {
          if (!found && el.id === id) found = el;
        });
      return found;
    };
    const findParentOf = (m, child) => {
      let parent = null;
      for (const root of domRoots(m))
        walkDom(root, (el) => {
          if (!parent && (el.children || []).includes(child)) parent = el;
        });
      return parent;
    };
    const domText = (el, seen = new Set()) => {
      if (!el || typeof el !== "object" || seen.has(el)) return "";
      seen.add(el);
      let text = typeof el.textContent === "string" ? el.textContent : "";
      for (const c of el.children || []) text += domText(c, seen);
      return text;
    };
    const isDomAncestor = (ancestor, node) => {
      let found = false;
      walkDom(ancestor, (el) => {
        if (el === node) found = true;
      });
      return found;
    };
    const result = simulateScript(
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
            // R27-N11：複数宣言子（declareList）の各宣言子と、分割代入の
            // 葉の名前も、単一宣言と同じ重複・const 初期化の検査対象にする。
            const declaratorNames = (n) =>
              n.k === "declareList"
                ? n.declarators.flatMap((d) =>
                    d.pattern ? patternLeafNamesLocal(d.pattern) : [d.name],
                  )
                : [n.name];
            for (const n of list) if (n.k === "declare" || n.k === "declareList") {
              if (!["let", "const", "var"].includes(n.type))
                api.fail("このJavaScript宣言は未対応です", n, "未対応");
              const parts =
                n.k === "declareList"
                  ? n.declarators
                  : [{ name: n.name, pointer: n.pointer, size: n.size, value: n.value }];
              for (const d of parts) {
                if (d.pointer || d.size)
                  api.fail("このJavaScript宣言は未対応です", n, "未対応");
                if (n.type === "const" && !d.value)
                  api.fail("constには初期化式が必要です", n, "SyntaxError");
              }
              if (n.type !== "var") {
                for (const nm of declaratorNames(n)) {
                  if (lexical.has(nm)) api.fail("同じスコープの宣言が重複しています", n, "SyntaxError");
                  lexical.add(nm);
                }
              }
            }
            const visible = new Set([...enclosing, ...lexical]);
            for (const n of list) {
              if (n.k === "declare" && n.type === "var") {
                if (visible.has(n.name)) api.fail("varとlet / constの宣言が競合しています", n, "SyntaxError");
                if (!Object.hasOwn(s.vars, n.name)) s.vars[n.name] = undefined;
              }
              if (n.k === "declareList" && n.type === "var") {
                for (const nm of declaratorNames(n)) {
                  if (visible.has(nm)) api.fail("varとlet / constの宣言が競合しています", n, "SyntaxError");
                  if (!Object.hasOwn(s.vars, nm)) s.vars[nm] = undefined;
                }
              }
              // R31 横断スイープ：for の初期化部が無い形（for (;;) 等）
              // では n.init が null で、巻き上げ走査が null を読んで
              // 「null / undefined のプロパティは参照できません」と
              // いう無関係な原因で停止していた。初期化部がある場合だけ
              // 走査する（step 側の enterScope は既に同じガードを持つ）。
              if (n.k === "for" && n.init) hoist([n.init], visible);
              if (n.body) hoist(n.body, visible);
              if (n.otherwise) hoist(n.otherwise, visible);
            }
          }
          hoist(nodes);
        },
        prepareScope(nodes, s, api) {
          for (const n of nodes) {
            if (n.k === "declare" && n.type !== "var") {
              api.registerDeclaration(s, n);
              s.vars[n.name] = { kind: "js-uninitialized" };
              s.types[n.name] = n.type;
            }
            // R27-N11：複数宣言子の各名前も単一宣言と同じくスコープへ
            // 登録し、初期化前参照（TDZ）を効かせる。パターン宣言子の
            // 葉は declarePattern と同じく実行時に登録する（ここで登録
            // すると bindPattern の同名検査と衝突するため）。
            if (n.k === "declareList" && n.type !== "var") {
              for (const d of n.declarators) {
                if (d.pattern) continue;
                api.registerDeclaration(s, { name: d.name, type: n.type, line: n.line });
                s.vars[d.name] = { kind: "js-uninitialized" };
                s.types[d.name] = n.type;
              }
            }
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
          // M-N2 兄弟表面：BigInt は Number() へ通すと型が通常の数値に
          // 化けてしまう。実 JavaScript どおり BigInt のまま増減する。
          if (typeof value === "bigint")
            return { previous: value, next: value + (node.op === "++" ? 1n : -1n) };
          const previous = Number(value);
          return { previous, next: previous + (node.op === "++" ? 1 : -1) };
        },
        binary(op, a, b, node, s, api) {
          if (!isUnknown(a) && !isUnknown(b)) {
            // B5-JS Date文字列化修正：モデル値を含む + 連結はホストの
            // +（素オブジェクトの "[object Object]" 化）に委ねず、
            // モデルの文字列変換（Date は modelToString の UTC 形式、
            // String()／alert と同一経路）で連結する。直接の Symbol
            // モデル値は実 JavaScript どおり暗黙変換できないため
            // TypeError で名指し停止する（String() の明示変換は従来
            // どおり可能）。
            if (
              op === "+" &&
              (modelInConcatPosition(a) || modelInConcatPosition(b))
            ) {
              for (const [v, other] of [[a, b], [b, a]])
                if (advancedClassOf(v) === "Symbol")
                  api.fail(
                    typeof other === "string" ||
                      (other !== null && typeof other === "object")
                      ? "Symbolを文字列へ変換できません"
                      : "Symbolを数値へ変換できません",
                    node,
                    "TypeError",
                  );
              return jsStringValue(a) + jsStringValue(b);
            }
            return baseBinary(op, a, b, "js");
          }
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
              // R24-N25：typeof のグローバル名解決。BigInt をはじめとする
              // グローバル関数・コンストラクタは "function"、グローバル
              // オブジェクトは "object"（実 Node／ECMAScript 仕様どおり）。
              // ここに無い名前だけが「存在しない名前」として "undefined"。
              if (["Number", "String", "Boolean", "parseInt", "parseFloat", "isNaN", "isFinite", "prompt", "alert", "BigInt", "Array", "Object", "Symbol", "Function", "Date", "RegExp", "Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError", "Map", "Set", "WeakMap", "WeakSet", "Promise", "Proxy", "ArrayBuffer", "DataView", "console.log", "Math.abs", "Math.floor", "Math.round", "JSON.stringify", "document.getElementById", "document.querySelector", "document.createElement", ...TYPEOF_FUNCTION_NAMES].includes(name)) return { handled: true, value: "function" };
              if (["console", "Math", "JSON", "document", "globalThis", "window", "Intl", "Reflect"].includes(name)) return { handled: true, value: "object" };
            }
            if (a.arg.k === "var" && !Object.hasOwn(s.vars, a.arg.name) && !["undefined", "NaN", "Infinity", "true", "false", "null"].includes(a.arg.name))
              return { handled: true, value: "undefined" };
            const value = api.read(a.arg, s);
            // 高度モード B5：タグ付きシンボルは typeof でも "symbol"。
            // JS-B5-06：メソッド値の未確定値（valueType: "function"）は
            // 実 JavaScript どおり "function" と答える。
            return { handled: true, value: isUnknown(value) ? (value.valueType === "function" ? "function" : unknown("typeof の対象の型")) : advancedClassOf(value) === "Symbol" ? "symbol" : typeof value };
          }
          // RG-11 統合対応：基数リテラル（0x…等）の末尾の英字は型接尾辞ではない。
          if (a.k === "literal" && a.raw && /[LfF]$/.test(a.raw) && !/^0[xXbBoO]/.test(a.raw))
            api.fail("JavaScriptに数値の型接尾辞はありません", a, "SyntaxError");
          if (a.k === "var" && s.vars[a.name]?.kind === "js-uninitialized")
            api.fail("初期化前のlet / constは参照できません", a, "ReferenceError");
          // JS-01 兄弟表面：グローバルオブジェクト名そのものの参照も
          // 「未定義の名前」にしない。値はモデル化しないため未確定値
          // として正直に扱う。
          if (
            a.k === "var" &&
            !Object.hasOwn(s.vars, a.name) &&
            GLOBAL_OBJECTS.has(a.name)
          )
            return {
              handled: true,
              value: unknown("グローバルオブジェクト " + a.name + " の値"),
            };
          if (a.k === "var" && ["True", "False", "TRUE", "FALSE", "NULL", "None", "Blank"].includes(a.name) && !Object.hasOwn(s.vars, a.name))
            api.fail("未定義の名前：" + a.name, a, "ReferenceError");
          if (a.k === "unary" && ["not", "&", "*"].includes(a.op))
            // R31-N5 兄弟表面：単項演算子も演算子名を名指す（** の
            // 二項形と水準を揃える）。
            api.fail("このJavaScript演算子は未対応です：" + a.op, a, "未対応");
          // R7-180（修正バッチ13）：undefined／NaN／Infinity はグローバル
          // 値だが、同名の宣言束縛（let／const）がある場合はそちらが
          // 優先する（ECMA-262 の ResolveBinding）。束縛の有無を確認
          // せずにグローバル値を返すと、let undefined = 1 等を無視して
          // しまう。一方、この3つのグローバルプロパティは書込み不可
          // のため、宣言なしの代入（undefined = 5）は実 JavaScript でも
          // 黙って無視され、値は変わらない（R25-N8 の sloppy 挙動）。
          // 宣言束縛かどうかは型記録とスコープ記録で判定する。
          const declaredLocal = (name) =>
            Object.hasOwn(s.types, name) ||
            (s.scopeStack || []).some((f) =>
              (f.records || []).some((r) => r.name === name),
            );
          if (a.k === "var" && a.name === "undefined" && !(Object.hasOwn(s.vars, "undefined") && declaredLocal("undefined")))
            return { handled: true, value: undefined };
          if (a.k === "var" && a.name === "NaN" && !(Object.hasOwn(s.vars, "NaN") && declaredLocal("NaN")))
            return { handled: true, value: NaN };
          if (a.k === "var" && a.name === "Infinity" && !(Object.hasOwn(s.vars, "Infinity") && declaredLocal("Infinity")))
            return { handled: true, value: Infinity };
          if (a.k === "member") {
            // RG-59 統合対応：リファレンス語彙にあるメンバ名（textContent／value 等の
            // DOM プロパティ）は使用チップの対象として refs に戻す。語彙に無い
            // データ名は refs に入れない（コア側の混入防止と対）。
            if (referenceNames.has(a.name)) {
              s.pendingRefs ??= [];
              if (!s.pendingRefs.includes(a.name)) s.pendingRefs.push(a.name);
            }
            if (["__proto__","constructor","prototype"].includes(a.name)) {
              // A5班監査: 停止自体は裁定済みのモデル境界だが、どの
              // プロパティか名指しする（従来は一律の汎用文言だった）。
              // callName が受け手まで描けない形（リテラル等）では
              // メンバー名だけを挙げる。
              const disp = callName(a);
              api.fail(
                "このプロパティはモデルでは未対応です：" +
                  (disp && !disp.startsWith(".") ? disp : a.name),
                a,
                "未対応",
              );
            }
            // 高度モード B5：Math.PI や Number.MAX_VALUE、Symbol.iterator
            // 等の定数・値プロパティは advanced-engine.js の表で解決する
            // （同名のローカル束縛がある場合はそちらが優先するため、
            // 束縛が無い場合に限る）。
            if (
              a.target?.k === "var" &&
              !Object.hasOwn(s.vars, a.target.name)
            ) {
              const gp = advancedGlobalProp(a.target.name, a.name);
              if (gp.handled) return { handled: true, value: gp.value };
            }
            // JS-01 兄弟表面：Math.PI のような実在グローバルのプロパティ
            // 参照も「未定義の名前」にしない（名前は存在し、プロパティが
            // モデル未対応であることが正しい理由）。
            if (
              a.target?.k === "var" &&
              !Object.hasOwn(s.vars, a.target.name) &&
              GLOBAL_OBJECTS.has(a.target.name)
            )
              api.fail(
                "このJavaScriptプロパティは説明に対応していません：" +
                  callName(a),
                a,
                "未対応",
              );
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
            // R7-39／R7-186（修正バッチ13）：DOM要素の textContent は
            // 自分と子孫のテキストの集約であり、id は未設定なら空文字列。
            if (isDomNode(value)) {
              if (a.name === "textContent")
                return { handled: true, value: domText(value) };
              if (a.name === "id")
                return { handled: true, value: value.id ?? "" };
            }
            // JS-B5-06：解決結果がホスト関数になる読み取り（メソッド値の
            // 読み取り）は、ホスト関数のソース文字列を値として返さない。
            // 利用者が同名の自分のプロパティを持つ場合はそちらが先に
            // 解決され（typeof が function にならない）影響しない。
            // メソッド呼び出しのディスパッチはこの経路を通らない。
            const resolvedMember = value[a.name];
            if (typeof resolvedMember === "function")
              return { handled: true, value: methodValueUnknown(a.name) };
            return { handled: true, value: resolvedMember };
          }
          if (a.k === "index") {
            if (a.indexes.length !== 1 || !a.indexes[0])
              api.fail("この添字式は未対応です", a, "未対応");
            // JS-B5-03：Math／JSON はグローバルオブジェクトとして値が
            // モデル化されないため、[Symbol.toStringTag] だけは対象名を
            // タグとして先に解決する。その他の添字は従来どおり未確定値。
            if (
              a.target?.k === "var" &&
              !Object.hasOwn(s.vars, a.target.name) &&
              (a.target.name === "Math" || a.target.name === "JSON")
            ) {
              const globalIndex = api.read(a.indexes[0], s);
              if (
                advancedClassOf(globalIndex) === "Symbol" &&
                globalIndex.wellKnown === "toStringTag"
              )
                return { handled: true, value: a.target.name };
              return {
                handled: true,
                value: unknown("実行時の添字参照"),
              };
            }
            let value = api.read(a.target, s),
              index = api.read(a.indexes[0], s);
            if (value == null)
              api.fail("null / undefined の添字参照です", a, "TypeError");
            if (isUnknown(value) || isUnknown(index))
              return { handled: true, value: unknown("実行時の添字参照") };
            // 高度モード B5：TypedArray の要素アクセスは型変換を伴う
            // ため advanced-engine.js 側で解決する。
            // JS-B5-03：Symbol キー（[Symbol.toStringTag] 等）もここで解決する。
            const air = advancedIndexRead(value, index);
            if (air.handled) return { handled: true, value: air.value };
            // JS-B5-06：文字列キーでホスト関数が解決される読み取り
            // （m["toString"] 等）もメンバ読み取りと同じガードにかける。
            const resolvedIndex = value[index];
            if (typeof resolvedIndex === "function")
              return { handled: true, value: methodValueUnknown(index) };
            return { handled: true, value: resolvedIndex };
          }
          return null;
        },
        write(a, v, s, api, node) {
          if (a.k === "var" && s.vars[a.name]?.kind === "js-uninitialized")
            api.fail("初期化前のlet / constへは代入できません", node, "ReferenceError");
          if (a.k === "var" && s.types[a.name] === "const")
            api.fail("const で宣言した変数には再代入できません", node, "TypeError");
          if (a.k === "member" || a.k === "index") {
            let obj = api.read(a.target, s);
            if (isUnknown(obj)) api.fail("未確定オブジェクトへの書き込みは未確認です", node, "未確認");
            if (obj == null)
              api.fail("null / undefined へ書き込めません", node, "TypeError");
            if (typeof obj !== "object")
              api.fail("プリミティブ値へは書き込めません", node, "TypeError");
            let key = a.k === "member" ? a.name : api.read(a.indexes[0], s);
            if (isUnknown(key)) api.fail("未確定の添字への書き込みは未確認です", node, "未確認");
            // A5班監査: Symbol キーの代入が文字列キー "[object Object]"
            // へ黙って変換され、通常キーとして現れる誤値を防ぐ。モデル
            // は Symbol キーのプロパティを保持できないため、正直に
            // 名指して停止する（Object.keys 等の表示も実 JS と一致する）。
            if (advancedClassOf(key) === "Symbol")
              api.fail("Symbol キーのプロパティはモデルでは未対応です", node, "未対応");
            // 高度モード B5：Object.freeze／seal／preventExtensions の
            // 印が付いたオブジェクトへの書き込みは、非 strict の実
            // JavaScript どおり黙って無視する（freeze は全て、seal／
            // preventExtensions は新しいプロパティの追加だけ）。
            // TypedArray の要素書き込み等は advanced-engine.js へ委譲する。
            if (obj.__jsFrozen) return true;
            if (
              (obj.__jsSealed || obj.__jsNoExt) &&
              key !== "length" &&
              !Object.hasOwn(obj, key)
            )
              return true;
            if (
              advancedIndexWrite(obj, key, v, {
                fail: (message, category) => api.fail(message, node, category),
              })
            )
              return true;
            // P-N1（配列の成長経路）: 巨大な添字への書き込みで疎な配列の
            // 実体（長さ）が爆発しないよう、要素数の上限で止める。
            // length への直接代入による拡張も同じ表面として塞ぐ。ただし
            // length の不正値（負数・小数・2^32以上・非数）は既存の
            // 「配列の長さが不正です」検証に委ね、ここでは有効な配列長
            // （0以上2^32-1以下の整数）で上限を超える場合だけを止める。
            if (
              (Array.isArray(obj) &&
                typeof key === "number" &&
                Number.isInteger(key) &&
                key >= 200000) ||
              (Array.isArray(obj) &&
                key === "length" &&
                typeof v === "number" &&
                Number.isInteger(v) &&
                v > 200000 &&
                v <= 4294967295)
            )
              api.fail(
                "配列の要素数が上限（200000）を超えます",
                node,
                "RangeError",
              );
            // P-N1: 大きな文字列を多数の要素へ書く経路も内容量で抑える。
            if (
              Array.isArray(obj) &&
              typeof v === "string" &&
              v.length &&
              arrayContentSize(obj) + v.length > 200000
            )
              api.fail(
                "配列の内容量が上限（200000文字相当）を超えます",
                node,
                "RangeError",
              );
            if (["__proto__", "constructor", "prototype"].includes(key))
              // A5班監査: 読み取り側と同じくプロパティ名を名指しする。
              api.fail("このプロパティはモデルでは未対応です：" + key, node);
            // R7-186（修正バッチ13）：DOMプロパティは素のレコード項目
            // ではない。tagName は読み取り専用（非strictでは代入を黙って
            // 無視）、textContent は DOMString 変換（null は空文字列＝
            // LegacyNullToEmptyString）を受け、設定すると子要素は置き
            // 換えられる。id も DOMString 変換を受ける。
            if (isDomNode(obj) && !isUnknown(v)) {
              if (key === "tagName") return true;
              if (key === "textContent") {
                obj.textContent = v === null ? "" : jsStringValue(v);
                if (Array.isArray(obj.children)) obj.children = [];
                return true;
              }
              if (key === "id") {
                obj.id = jsStringValue(v);
                return true;
              }
            }
            obj[key] = v;
            return true;
          }
          return false;
        },
        call(name, args, s, api, node) {
          // A5班監査: 計算済みメンバー呼び出し（arr[Symbol.iterator]()
          // 等）はコアの callName が名前を描けず、停止文言の名指し欄が
          // 空欄になっていた。添字式から表示名を補う（描けない形は
          // 従来どおり空欄にせず、対象自体を指す文言に倒す）。
          const fnName = name || indexCallName(node.target);
          let evaluated = null;
          const values = () => {
            if (!evaluated) evaluated = args.map((a) => api.read(a, s));
            return evaluated;
          };
          // R24-N24：引数の欠落は null ではなく undefined として渡る
          // （ECMAScript の呼び出し規約）。共有コアの read は「AST ノード
          // が無い」場合に null を返すため、args[0] を直接 read すると
          // 欠落と明示的な null が混同され、Math.abs() が 0、
          // JSON.stringify() が "null" 等の誤値になっていた。欠落位置は
          // ここで undefined に直してから各関数へ渡す。
          const arg = (idx) => (idx < args.length ? values()[idx] : undefined);
          // R7-125（修正バッチ13）：対応済み関数では、関数が使わない
          // 追加引数も含めて全引数を評価する（ECMA-262 の
          // ArgumentListEvaluation）。未使用引数の中の未定義名や
          // プロパティ参照エラーを黙って消さない。未対応関数は従来
          // どおり関数名を名指して停止する（引数を評価しない）。
          const EAGER = new Set([
            "console.log", "alert", "prompt",
            "document.getElementById", "document.querySelector",
            "document.createElement",
            "Number", "String", "Boolean", "parseInt",
            "Math.abs", "Math.floor", "Math.round", "JSON.stringify",
            // 高度モード B5：高度側で実装する呼び出しも引数を先に評価する。
            ...ADVANCED_EAGER_NAMES,
          ]);
          // 高度モード B5：advanced-engine.js への委譲用コンテキスト。
          const advCtx = () => ({
            s,
            api,
            node,
            fail: (message, category) => api.fail(message, node, category),
            values,
            argCount: args.length,
            findUnknown,
            containsUnknown,
            isRecordLikeArray,
            displayValue,
            jsStringValue,
            arrayContentSize,
            isDomNode,
          });
          if (EAGER.has(name)) values();
          // R7-180（修正バッチ13）：組み込みと同名のローカル束縛がある
          // 場合、その束縛が優先する。ローカル値は呼び出せないため、
          // 組み込みへ直行せず実 JavaScript どおり TypeError で止める
          // （document だけはモデルが注入したオブジェクト自身なら対象外）。
          {
            const rootName = name.split(".")[0];
            const SHADOWABLE = new Set([
              "Number", "String", "Boolean", "parseInt", "parseFloat",
              "isNaN", "isFinite", "prompt", "alert", "BigInt", "Array",
              "Object", "Symbol", "Function", "Date", "RegExp", "Error",
              "TypeError", "RangeError", "SyntaxError", "ReferenceError",
              "Map", "Set", "WeakMap", "WeakSet", "Promise", "Proxy",
              "ArrayBuffer", "DataView",
              "Math", "JSON", "console", "document", "globalThis",
              "window", "Intl", "Reflect",
              // 高度モード B5：高度側で扱うグローバル名も同名のローカル
              // 束縛が優先する（R7-180 の流儀の拡張）。
              "encodeURI", "decodeURI", "encodeURIComponent",
              "decodeURIComponent", "eval",
              "EvalError", "URIError", "AggregateError", "SuppressedError",
              "Atomics", "Iterator", "WeakRef", "FinalizationRegistry",
              "SharedArrayBuffer", "DisposableStack", "AsyncDisposableStack",
              "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array",
              "Uint16Array", "Int32Array", "Uint32Array", "Float32Array",
              "Float64Array", "Float16Array", "BigInt64Array",
              "BigUint64Array",
            ]);
            if (
              SHADOWABLE.has(rootName) &&
              Object.hasOwn(s.vars, rootName) &&
              !(rootName === "document" && s.vars.document?.body === s.model.dom.body)
            ) {
              if (isUnknown(s.vars[rootName]))
                api.fail(
                  "未確認：組み込みと同名のローカル変数 " + rootName + " の呼び出し",
                  node,
                  "未確認",
                );
              api.fail(
                rootName + " は関数ではありません（同名のローカル変数が組み込みを隠しています）",
                node,
                "TypeError",
              );
            }
          }
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
            case "alert": {
              // R7-183（修正バッチ13）：alert の文面は Web IDL の
              // DOMString 変換。引数なしは空文字列、undefined は
              // "undefined"、BigInt は末尾 n なし、配列はカンマ連結、
              // 通常オブジェクトは "[object Object]"。
              const v = arg(0);
              s.outputs.push({
                channel: "alert",
                text:
                  args.length === 0
                    ? ""
                    : isUnknown(v)
                      ? formatValue(displayValue(v))
                      : jsStringValue(isRecordLikeArray(v) ? displayValue(v) : v),
                line: node.line,
              });
              return undefined;
            }
            case "prompt":
              return { ...api.freshUnknown("promptの入力またはキャンセル", s), valueType: "prompt" };
            case "document.getElementById":
            {
              // R7-77（修正バッチ13）：必須引数の欠落は未発見 null では
              // なく TypeError（Web IDL）。R7-185：検索は要素自身の現在
              // の id プロパティに対して行う（id の書き換えに追随する）。
              if (!args.length)
                api.fail("引数が不足しています：document.getElementByIdにはIDを1つ渡してください", node, "TypeError");
              const id = arg(0);
              if (isUnknown(id)) api.fail("未確定のIDによるDOM探索は未確認です", node, "未確認");
              return findById(s.model, String(id));
            }
            case "document.querySelector": {
              // R7-184（修正バッチ13）：対応範囲は model.selectors の
              // 指定、#id、タグ名、.クラス、カンマ区切りの組み合わせ。
              // 末尾空白は実ブラウザどおり許容する。範囲外（子孫・属性・
              // 疑似クラス等）は確定 null を返さず未対応として名指しで
              // 停止し、構文として不正なものは SyntaxError で止める。
              if (!args.length)
                api.fail("引数が不足しています：document.querySelectorにはセレクターを1つ渡してください", node, "TypeError");
              let selector = arg(0);
              if (isUnknown(selector)) api.fail("未確定のセレクターによるDOM探索は未確認です", node, "未確認");
              if (typeof selector !== "string") selector = jsStringValue(selector);
              const table = s.model.dom.selectors || {};
              if (Object.hasOwn(table, selector))
                return findById(s.model, String(table[selector]));
              const resolveSimple = (sel) => {
                if (sel.startsWith("#")) {
                  const idPart = sel.slice(1);
                  if (!/^[A-Za-z0-9_-]+$/.test(idPart)) {
                    if (/[:[\]()>+~]/.test(idPart))
                      api.fail("このCSSセレクターは未対応です：" + sel, node, "未対応");
                    api.fail("セレクターの構文が不正です：" + selector, node, "SyntaxError");
                  }
                  return findById(s.model, idPart);
                }
                if (sel.startsWith(".")) {
                  const cls = sel.slice(1);
                  if (!/^[A-Za-z0-9_-]+$/.test(cls))
                    api.fail("セレクターの構文が不正です：" + selector, node, "SyntaxError");
                  let found = null;
                  for (const root of domRoots(s.model))
                    walkDom(root, (el) => {
                      if (!found && typeof el.className === "string" && el.className.split(/\s+/).includes(cls)) found = el;
                    });
                  return found;
                }
                if (/^[A-Za-z][A-Za-z0-9-]*$/.test(sel)) {
                  let found = null;
                  for (const root of domRoots(s.model))
                    walkDom(root, (el) => {
                      if (!found && el.tagName === sel.toUpperCase()) found = el;
                    });
                  return found;
                }
                if (/^[A-Za-z0-9_#.*-]+$/.test(sel) === false && sel.trim() === "")
                  api.fail("セレクターの構文が不正です：" + selector, node, "SyntaxError");
                api.fail("このCSSセレクターは未対応です：" + sel, node, "未対応");
              };
              const parts = selector.split(",").map((p) => p.trim());
              if (parts.some((p) => p === ""))
                api.fail("セレクターの構文が不正です：" + selector, node, "SyntaxError");
              for (const part of parts) {
                const hit = resolveSimple(part);
                if (hit) return hit;
              }
              return null;
            }
            case "document.createElement": {
              // R7-76（修正バッチ13）：タグ名は必須（Web IDL）で、
              // 有効な要素名でなければならない。値の DOMString 変換
              // 自体は実物どおり（null は "null" で有効な名前になる）。
              if (!args.length)
                api.fail("引数が不足しています：document.createElementにはタグ名を1つ渡してください", node, "TypeError");
              const rawTag = arg(0);
              if (isUnknown(rawTag)) api.fail("未確定のタグ名による要素作成は未確認です", node, "未確認");
              const tag = jsStringValue(rawTag);
              if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(tag))
                api.fail("要素名が不正です：" + tag, node, "InvalidCharacterError");
              return {
                id: "",
                tagName: tag.toUpperCase(),
                textContent: "",
                children: [],
              };
            }
            case "Number": {
              if (!args.length) return 0;
              let v = arg(0);
              if (isUnknown(v)) return convertedUnknown(v, "Number");
              // R7-181（修正バッチ13）：配列等の奥の未確定値も変換済み
              // 未確定値へ倒す（ホスト Number へ流して NaN に固定しない）。
              const inner = findUnknown(v);
              if (inner) return convertedUnknown(inner, "Number");
              // 高度モード B5：Date モデル値の数値変換は時刻値（実物どおり）。
              if (advancedClassOf(v) === "Date") return v.time;
              return Number(isRecordLikeArray(v) ? displayValue(v) : v);
            }
            case "String": {
              if (!args.length) return "";
              let v = arg(0);
              if (isUnknown(v)) return convertedUnknown(v, "String");
              const inner = findUnknown(v);
              if (inner) return convertedUnknown(inner, "String");
              // P-N1: 文字列化の結果も値サイズ上限の対象にする（大きな
              // 配列の文字列化などで実体が爆発しないようにする）。
              const text = jsStringValue(v);
              return text.length > 200000
                ? { ...unknown("とても長い文字列"), valueType: "string" }
                : text;
            }
            case "Boolean": {
              let v = arg(0);
              return isUnknown(v) ? convertedUnknown(v, "Boolean") : Boolean(v);
            }
            case "parseInt": {
              let [v, radix] = values();
              // R7-181（修正バッチ13）：基数側の未確定値も結果を未確定に
              // する（未確定の基数をホストへ流して基数10等に固定しない）。
              if (isUnknown(v) || isUnknown(radix) || findUnknown(v) || findUnknown(radix))
                return unknown("parseIntの入力による");
              return parseInt(v, radix);
            }
            case "Math.abs":
            case "Math.floor":
            case "Math.round": {
              let v = arg(0);
              return isUnknown(v) || findUnknown(v)
                ? unknown(name + "の引数による")
                : Math[name.split(".")[1]](v);
            }
            case "JSON.stringify": {
              let v = arg(0);
              // R7-37（修正バッチ13）：第2引数 replacer（キーの配列）と
              // 第3引数 space（字下げ）を実 JavaScript どおり適用する。
              // 関数形 replacer はこの方言では値として存在しない。
              const replacer = args.length > 1 ? arg(1) : undefined;
              const space = args.length > 2 ? arg(2) : undefined;
              if (containsUnknown(v)) return unknown("JSON.stringifyの入力に未確定値があります");
              if (findUnknown(replacer) || findUnknown(space))
                return unknown("JSON.stringifyの引数に未確定値があります");
              if (containsBigInt(v) || modelContainsBigInt(v))
                api.fail("BigIntはJSONへ変換できません", node, "TypeError");
              try {
                const replacerArg = Array.isArray(replacer) ? replacer : null;
                const spaceArg =
                  typeof space === "number"
                    ? Math.min(10, Math.max(0, Math.trunc(space) || 0))
                    : typeof space === "string"
                      ? space.slice(0, 10)
                      : 0;
                // 高度モード B5：モデル値（Date の toJSON、Map の {} 化、
                // TypedArray の添字オブジェクト化等）は toJsonModel で
                // 実 JavaScript の JSON 表現へ変換してから文字列化する。
                // JS-B5-10：RawJSON はホストの JSON.rawJSON に依存せず、
                // 呼び出しごとに一意なプレースホルダ文字列へ変換してから
                // 文字列化後に生 JSON テキストへ置換する（ホスト不在でも
                // 黙って undefined にならない）。
                const rawSink = [];
                const rawToken = makeRawJsonToken();
                let json = JSON.stringify(displayValue(toJsonModel(v, new Set(), rawSink, rawToken)), replacerArg, spaceArg);
                if (json !== undefined && rawSink.length)
                  for (const { placeholder, raw } of rawSink)
                    json = json.split(JSON.stringify(placeholder)).join(raw);
                // P-N1: JSON 文字列も値サイズ上限の対象にする。
                return json !== undefined && json.length > 200000
                  ? { ...unknown("とても長い文字列"), valueType: "string" }
                  : json;
              } catch {
                api.fail("循環参照はJSONへ変換できません", node, "TypeError");
              }
            }
          }
          // 高度モード B5：基礎スイッチで扱わないグローバル呼び出し
          // （Math の全関数、Object／Array の静的メソッド、JSON.parse、
          // Map／Set／Date 等のコンストラクタ、名指し停止に倒す
          // Promise／Proxy／eval 等）は advanced-engine.js へ委譲する。
          {
            const advGlobal = advancedGlobalCall(name, advCtx());
            if (advGlobal.handled) return advGlobal.value;
          }
          if (node.target.k === "member") {
            // JS-01：Math.max / JSON.parse 等、実在するグローバル
            // オブジェクトの未対応メンバー呼び出しは、オブジェクト名を
            // 「未定義」とする虚偽の ReferenceError ではなく、関数名を
            // 挙げて未対応として停止する（isNaN 等と同じ正直な経路）。
            if (
              node.target.target?.k === "var" &&
              !Object.hasOwn(s.vars, node.target.target.name) &&
              GLOBAL_OBJECTS.has(node.target.target.name)
            )
              api.fail(
                "このJavaScript関数は説明に対応していません：" + fnName,
                node,
              );
            let object = api.read(node.target.target, s),
              method = node.target.name;
            if (Array.isArray(object)) {
              if (method === "push") {
                const vals = values();
                // P-N1: 大きな文字列を多数積む経路も内容量で抑える。
                if (
                  vals.some((v) => typeof v === "string" && v.length) &&
                  arrayContentSize(object) + arrayContentSize(vals) > 200000
                )
                  api.fail(
                    "配列の内容量が上限（200000文字相当）を超えます",
                    node,
                    "RangeError",
                  );
                return object.push(...vals);
              }
              if (method === "pop") {
                values();
                return object.pop();
              }
              if (method === "join") {
                // R7-181（修正バッチ13）：区切りや要素に未確定値があれば
                // 結果も未確定にする（内部オブジェクトを "[object
                // Object]" 等へ文字列化して固定しない）。
                const sepArg = values()[0];
                if (isUnknown(sepArg) || containsUnknown(object)) {
                  const u = isUnknown(sepArg) ? sepArg : findUnknown(object);
                  return {
                    ...unknown("joinの入力に未確定値があります", "join:" + (u?.id ?? "")),
                    rootId: u?.rootId || u?.id,
                    valueType: "string",
                  };
                }
                // P-N1: join の結果長を要素ごとに見積もる（区切り文字を
                // 含め、上限を超える場合は実体を作らず未確定値へ倒す）。
                // B5-JS Date文字列化修正：区切り・要素の長さ見積もりと
                // 実変換はホストの String()／join（モデル値を
                // "[object Object]" に化けさせる）ではなく、モデルの
                // 文字列変換 jsStringValue で揃える（配列 toString が
                // advanced-engine 側でモデル値を正しく文字列化するのと
                // 同じ結果になる）。モデル値を含まない通常の配列は
                // 従来どおりホスト join のまま。
                const sep = sepArg === undefined ? "," : jsStringValue(sepArg);
                let total = 0;
                for (let i = 0; i < object.length; i++) {
                  const el = object[i];
                  total +=
                    (el === null || el === undefined || isUnknown(el)
                      ? 0
                      : typeof el === "string"
                        ? el.length
                        : jsStringValue(el).length) + (i ? sep.length : 0);
                  if (total > 200000)
                    return { ...unknown("とても長い文字列"), valueType: "string" };
                }
                if (modelInConcatPosition(object) || isModelValue(sepArg))
                  return object
                    .map((el) =>
                      el === null || el === undefined ? "" : jsStringValue(el),
                    )
                    .join(sep);
                return object.join(sepArg);
              }
            }
            if (method === "appendChild") {
              values();
              // R7-78（修正バッチ13）：レシーバーも子も DOM ノードで
              // なければならない。R7-38：既に親がある要素は移動する
              // （旧親から外し、重複させない）。自分自身や祖先の追加は
              // 循環になるため HierarchyRequestError で止める。
              if (!isDomNode(object))
                api.fail("appendChildは関数ではありません（対象がDOM要素ではありません）", node, "TypeError");
              let child = arg(0);
              if (!isDomNode(child))
                api.fail("appendChildの引数はNodeが必要です", node, "TypeError");
              if (child === object || isDomAncestor(child, object))
                api.fail("要素を自身またはその子孫へ追加できません", node, "HierarchyRequestError");
              const oldParent = findParentOf(s.model, child);
              if (oldParent) {
                const idx = oldParent.children.indexOf(child);
                if (idx >= 0) oldParent.children.splice(idx, 1);
              }
              object.children ??= [];
              object.children.push(child);
              if (child.id) s.model.dom.elements[child.id] = child;
              api.note(s, node, "モデルDOMの子要素に追加します");
              return child;
            }
            // 高度モード B5：配列・文字列・数値等のレシーバへのメンバ
            // 呼び出しと、モデル値（Map／Date／RegExp／TypedArray 等）
            // のメソッドは advanced-engine.js へ委譲する。委譲側が
            // 扱わない呼び出しは従来どおり関数名を挙げて停止する。
            const advMember = advancedMemberCall({
              ...advCtx(),
              receiver: object,
              method,
            });
            if (advMember.handled) return advMember.value;
          }
          api.fail("このJavaScript関数は説明に対応していません：" + fnName, node);
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
    // R27-N10：実行完了後の最終状態スナップショットに限り、非有限数を
    // 文字列表現へ置き換える（UI.Vision の RG-208 と同型の処置）。
    // vars の JSON 往復が出力・groups の表示と一致することが判定基準。
    for (let p of result.paths || []) p.vars = finiteSafeSnapshot(p.vars);
    return result;
  },
};

definition.templates.push(...additionalTemplates(definition.model.defaults));

import { referenceDetails } from "./reference-details.js";
for (const r of definition.reference) if (referenceDetails[r.name]) Object.assign(r, referenceDetails[r.name]);
