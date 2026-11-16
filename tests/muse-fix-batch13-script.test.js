// 修正バッチ13（script班）の回帰テスト。
// 対象：Codex 一周監査で「現行でも有効（B）」と裁定された JavaScript 13件
// （R7-37, 38, 39, 76, 77, 78, 180, 181, 182, 183, 184, 185, 186）、
// AutoHotkey 13件（R7-40, 41, 42, 51, 101, 103, 104, 105, 106, 107,
// 108, 109, 110）、横断 R7-125（JavaScript 種類＋UI.Vision Sandbox）。
// 期待値は ECMA-262／WHATWG DOM／Web IDL、AutoHotkey 公式ドキュメント
// （autohotkey.com/docs/v2）と Codex の Windows 実測に基づく。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const run = async (id, code, model) => {
  const d = getDefinition(id);
  return d.simulate(
    code,
    model === undefined ? structuredClone(d.model.defaults) : model,
  );
};
const js = (code, model) => run("javascript", code, model);
const ahk = (code, extra = {}) =>
  run("autohotkey", code, {
    ...structuredClone(getDefinition("autohotkey").model.defaults),
    event: null,
    ...extra,
  });
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message);
const outputs = (r) => (r.paths?.[0]?.outputs || []).map((o) => o.text);
const allOutputs = (r) =>
  (r.paths || []).flatMap((p) => (p.outputs || []).map((o) => o.text));
const vars = (r) => r.paths?.[0]?.vars || {};

/* ---------------- R7-37: JSON.stringify の replacer／space ---------------- */
test("R7-37: JSON.stringify applies an array replacer and the space argument", async () => {
  let r = await js('console.log(JSON.stringify({a:1,b:2},["a"]));');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ['{"a":1}']);
  r = await js('console.log(JSON.stringify([1,2],null,2));');
  assert.deepEqual(outputs(r), ["[\n  1,\n  2\n]"]);
  // 入れ子のオブジェクトにもキーの絞り込みが効く／文字列の space も有効
  r = await js('console.log(JSON.stringify({a:{a:1,b:2},b:3},["a"]));');
  assert.deepEqual(outputs(r), ['{"a":{"a":1}}']);
  r = await js('console.log(JSON.stringify({a:1},null,"--"));');
  assert.deepEqual(outputs(r), ['{\n--"a": 1\n}']);
  // 従来形は不変
  r = await js('console.log(JSON.stringify({a:1}));');
  assert.deepEqual(outputs(r), ['{"a":1}']);
});

/* ---------------- R7-38: appendChild は要素を移動する ---------------- */
test("R7-38: appendChild moves a node from its old parent instead of duplicating it", async () => {
  const r = await js(
    'let a=document.createElement("a"); let b=document.createElement("b");' +
      "document.body.appendChild(a); b.appendChild(a);" +
      "console.log(document.body.children.length); console.log(b.children.length);" +
      "document.body.appendChild(a); document.body.appendChild(a);" +
      "console.log(document.body.children.length);",
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["0", "1", "1"]);
});

/* ---------------- R7-39: 親の textContent は子の集約 ---------------- */
test("R7-39: a parent element's textContent aggregates its descendants", async () => {
  const r = await js(
    'let a=document.createElement("a"); a.textContent="x"; document.body.appendChild(a); console.log(document.body.textContent);',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["x"]);
  const nested = await js(
    'let a=document.createElement("a"); a.textContent="x"; let b=document.createElement("b"); b.textContent="y"; a.appendChild(b); document.body.appendChild(a); console.log(document.body.textContent); console.log(a.textContent);',
  );
  assert.deepEqual(errors(nested), []);
  assert.deepEqual(outputs(nested), ["xy", "xy"]);
});

/* ---------------- R7-76: createElement の引数検証 ---------------- */
test("R7-76: createElement requires a valid element name", async () => {
  let r = await js("document.createElement();");
  assert.match(errors(r)[0] || "", /引数が不足しています：document.createElement/);
  r = await js('console.log(document.createElement("a b").tagName);');
  assert.match(errors(r)[0] || "", /要素名が不正です/);
  r = await js("console.log(document.createElement(1).tagName);");
  assert.match(errors(r)[0] || "", /要素名が不正です/);
  // DOMString 変換自体は実物どおり（null は "null" で有効な名前）
  r = await js("console.log(document.createElement(null).tagName);");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["NULL"]);
  r = await js('console.log(document.createElement("p").tagName);');
  assert.deepEqual(outputs(r), ["P"]);
});

/* ---------------- R7-77: getElementById の引数欠落 ---------------- */
test("R7-77: getElementById with no argument is a TypeError, distinct from not-found null", async () => {
  let r = await js("document.getElementById();");
  assert.match(errors(r)[0] || "", /引数が不足しています：document.getElementById/);
  r = await js('console.log(document.getElementById("missing"));');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["null"]);
});

/* ---------------- R7-78: appendChild の型・循環検査 ---------------- */
test("R7-78: appendChild rejects non-Node children, non-Node receivers and cycles", async () => {
  let r = await js('let b=document.createElement("b"); b.appendChild({});');
  assert.match(errors(r)[0] || "", /appendChildの引数はNodeが必要です/);
  r = await js('let a={}; let b=document.createElement("b"); a.appendChild(b);');
  assert.match(errors(r)[0] || "", /appendChildは関数ではありません/);
  r = await js('let a=document.createElement("a"); a.appendChild(a);');
  assert.match(errors(r)[0] || "", /自身またはその子孫へ追加できません/);
  r = await js(
    'let a=document.createElement("a"); let b=document.createElement("b"); a.appendChild(b); b.appendChild(a);',
  );
  assert.match(errors(r)[0] || "", /自身またはその子孫へ追加できません/);
});

/* ---------------- R7-180: ローカル束縛が組み込みを隠す ---------------- */
test("R7-180: local bindings shadow the undefined/NaN globals and builtin functions", async () => {
  let r = await js('let out; { let undefined=1; out=String(undefined); } console.log(out);');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["1"]);
  r = await js('{ let NaN="x"; console.log(String(NaN)); }');
  assert.deepEqual(outputs(r), ["x"]);
  r = await js('{ let Number=0; Number("1"); }');
  assert.match(errors(r)[0] || "", /Number は関数ではありません/);
  r = await js("{ let Math=0; Math.abs(-1); }");
  assert.match(errors(r)[0] || "", /Math は関数ではありません/);
  // 束縛が無ければ従来どおり組み込みが働く
  r = await js('console.log(String(undefined), String(NaN), Number("1"), Math.abs(-1));');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["undefined NaN 1 1"]);
});

/* ---------------- R7-181: 未確定値を変換へ流さない ---------------- */
test("R7-181: unknown values stay unknown through parseInt radix, join, String and Number", async () => {
  // 基数が未確定なら結果も未確定で、到達可能な分岐が両方残る
  let r = await js(
    'let x=prompt(); let out=""; if (parseInt("10",x)===2) { out="base2"; } else { out="other"; } console.log(out);',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(
    [...new Set(allOutputs(r))].sort(),
    ["base2", "other"],
  );
  r = await js('let x=prompt(); console.log(String([x]));');
  assert.match(outputs(r)[0] || "", /実行時に決まる/);
  assert.doesNotMatch(outputs(r)[0] || "", /object Object/);
  r = await js('let x=prompt(); console.log(Number([x]));');
  assert.match(outputs(r)[0] || "", /実行時に決まる/);
  r = await js('let x=prompt(); console.log([1,2].join(x));');
  assert.match(outputs(r)[0] || "", /実行時に決まる/);
  assert.doesNotMatch(outputs(r)[0] || "", /object Object/);
  // 既知値の変換は不変
  r = await js('console.log(String([1,2]), Number(["5"]), parseInt("10",2), [1,2].join("-"));');
  assert.deepEqual(outputs(r), ["1,2 5 2 1-2"]);
});

/* ---------------- R7-182: kind:"unknown" の通常オブジェクト ---------------- */
test("R7-182: a user object with kind:'unknown' is not mistaken for an internal unknown", async () => {
  let r = await js(
    'let v={kind:"unknown",value:1}; console.log(JSON.stringify(v)); console.log(v.value===2?"wrong":"right");',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ['{"kind":"unknown","value":1}', "right"]);
  assert.equal(r.paths.length, 1);
  r = await js('let v={kind:"unknown",n:1}; console.log(v.n);');
  assert.deepEqual(outputs(r), ["1"]);
  // 本物の未確定値は従来どおり分岐する
  r = await js('let x=prompt(); if (x==="a") { console.log("A"); } else { console.log("B"); }');
  assert.deepEqual([...new Set(allOutputs(r))].sort(), ["A", "B"]);
});

/* ---------------- R7-183: alert の DOMString 変換 ---------------- */
test("R7-183: alert stringifies its argument the DOMString way", async () => {
  const r = await js(
    'alert(); alert(undefined); alert(1n); alert([1,2]); alert({a:1}); alert(null); alert("hi"); alert(0);',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), [
    "",
    "undefined",
    "1",
    "1,2",
    "[object Object]",
    "null",
    "hi",
    "0",
  ]);
});

/* ---------------- R7-184: querySelector の対応範囲 ---------------- */
test("R7-184: querySelector trims, supports lists, and stops honestly outside its range", async () => {
  let r = await js('console.log(document.querySelector("#name ")===null);');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["false"]);
  r = await js('console.log(document.querySelector("#name, #result")===null);');
  assert.deepEqual(outputs(r), ["false"]);
  r = await js('console.log(document.querySelector("#missing")===null);');
  assert.deepEqual(outputs(r), ["true"]);
  r = await js('console.log(document.querySelector("p").id);');
  assert.deepEqual(outputs(r), ["result"]);
  r = await js('console.log(document.querySelector("#")===null);');
  assert.match(errors(r)[0] || "", /セレクターの構文が不正です/);
  r = await js('console.log(document.querySelector("#name:not(#result)")===null);');
  assert.match(errors(r)[0] || "", /このCSSセレクターは未対応です/);
  // model.selectors の指定は従来どおり
  r = await js('console.log(document.querySelector("#result").textContent);');
  assert.deepEqual(outputs(r), ["未実行"]);
});

/* ---------------- R7-185: id 書き換えへの追随 ---------------- */
test("R7-185: getElementById follows id property rewrites", async () => {
  const r = await js(
    'let e=document.getElementById("result"); e.id="renamed";' +
      'console.log(document.getElementById("result")===null); console.log(document.getElementById("renamed")===e);',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["true", "true"]);
});

/* ---------------- R7-186: DOMプロパティの初期値・型・読取専用性 ---------------- */
test("R7-186: DOM properties have proper defaults, DOMString conversion and read-only tagName", async () => {
  const r = await js(
    'let p=document.createElement("p"); console.log(p.id==="");' +
      'p.textContent=1; console.log(typeof p.textContent);' +
      'p.textContent=null; console.log(p.textContent==="");' +
      'p.tagName="X"; console.log(p.tagName);',
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["true", "string", "true", "P"]);
  // textContent の設定は子要素を置き換える
  const cleared = await js(
    'let p=document.createElement("p"); let c=document.createElement("span"); p.appendChild(c); p.textContent="t"; console.log(p.children.length); console.log(p.textContent);',
  );
  assert.deepEqual(errors(cleared), []);
  assert.deepEqual(outputs(cleared), ["0", "t"]);
});

/* ---------------- R7-125: 未使用引数の評価（JavaScript 種類） ---------------- */
test("R7-125: unused extra arguments are still evaluated in the JavaScript type", async () => {
  let r = await js('console.log(String("1", NoSuchR7));');
  assert.match(errors(r)[0] || "", /未定義の名前：NoSuchR7/);
  r = await js("console.log(Math.floor(1.5, null.x));");
  assert.match(errors(r)[0] || "", /プロパティは参照できません/);
  r = await js("console.log(JSON.stringify({a:1}, NoSuchR7));");
  assert.match(errors(r)[0] || "", /未定義の名前：NoSuchR7/);
  r = await js("let a=[1,2]; console.log(a.pop(NoSuchR7));");
  assert.match(errors(r)[0] || "", /未定義の名前：NoSuchR7/);
  // 副作用のある追加引数も一度だけ評価される
  r = await js('let n=0; console.log(String("x", n+=1), n);');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["x 1"]);
});

/* ---------------- R7-125: 未使用引数の評価（UI.Vision Sandbox） ---------------- */
test("R7-125: unused extra arguments are still evaluated in the UI.Vision Sandbox", async () => {
  const d = getDefinition("uivision");
  const macro = (commands) =>
    JSON.stringify({ Name: "練習", CreationDate: "モデル", Commands: commands });
  const cmd = (Command, Target = "", Value = "") => ({ Command, Target, Value });
  let r = await d.simulate(
    macro([
      cmd("open", "https://example.test/form"),
      cmd("executeScript_Sandbox", 'return String("1", NoSuchR7);', "out"),
    ]),
    structuredClone(d.model.defaults),
  );
  assert.match(errors(r)[0] || "", /未定義の名前：NoSuchR7/);
  r = await d.simulate(
    macro([
      cmd("open", "https://example.test/form"),
      cmd("store", "0", "count"),
      cmd("executeScript_Sandbox", "return Number(${count}) + 1;", "count"),
      cmd("echo", "${count}"),
    ]),
    structuredClone(d.model.defaults),
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["1"]);
});

/* ---------------- R7-40: 文字列に Length は無い ---------------- */
test("R7-40: strings have no Length property in AutoHotkey v2", async () => {
  let r = await ahk('MsgBox "abc".Length');
  assert.match(errors(r)[0] || "", /プロパティがありません：Length/);
  r = await ahk('s := "abc"\nMsgBox s.Length');
  assert.match(errors(r)[0] || "", /プロパティがありません：Length/);
  r = await ahk("a := [10, 20, 30]\nMsgBox a.Length");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["3"]);
  const item = getDefinition("autohotkey").reference.find((x) => x.name === "Length");
  assert.doesNotMatch(item.description, /文字列では文字数を返す/);
  assert.doesNotMatch(item.example, /hello/);
  assert.match(item.description, /文字列には Length プロパティはありません/);
});

/* ---------------- R7-41: 単項 ! の真偽規則 ---------------- */
test("R7-41: unary ! uses the same truthiness as conditions for numeric strings", async () => {
  let r = await ahk('MsgBox !"0"');
  assert.deepEqual(outputs(r), ["1"]);
  r = await ahk('MsgBox !"0.0"');
  assert.deepEqual(outputs(r), ["1"]);
  r = await ahk('x := "0"\nMsgBox !x');
  assert.deepEqual(outputs(r), ["1"]);
  r = await ahk('MsgBox !"1"');
  assert.deepEqual(outputs(r), ["0"]);
  r = await ahk("MsgBox !0");
  assert.deepEqual(outputs(r), ["1"]);
  r = await ahk('MsgBox !""');
  assert.deepEqual(outputs(r), ["1"]);
  r = await ahk('if "0" {\n MsgBox "T"\n} else {\n MsgBox "F"\n}');
  assert.deepEqual(outputs(r), ["F"]);
});

/* ---------------- R7-42: IsSet は変数を要求する ---------------- */
test("R7-42: IsSet with a non-variable argument stops like the real function", async () => {
  let r = await ahk("MsgBox IsSet(1)");
  assert.match(errors(r)[0] || "", /IsSetの引数には変数が必要です/);
  r = await ahk("x := 1\nMsgBox IsSet(x)\nMsgBox IsSet(y)");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["1", "0"]);
});

/* ---------------- R7-51: 用語集「自動実行」は v2 の定義 ---------------- */
test("R7-51: the glossary definition of auto-execute matches AutoHotkey v2", () => {
  const d = getDefinition("autohotkey");
  const entry = d.glossary.find(([term]) => term === "自動実行");
  assert.ok(entry);
  assert.doesNotMatch(entry[1], /定義が始まるまでが自動実行部分/);
  assert.match(entry[1], /定義は読み飛ばされ/);
});

/* ---------------- R7-101: IsSetRef の契約 ---------------- */
test("R7-101: IsSetRef requires a VarRef and reports set-ness regardless of type", async () => {
  let r = await ahk("x := 1\nMsgBox IsSetRef(&x)");
  assert.deepEqual(outputs(r), ["1"]);
  r = await ahk('x := ""\nMsgBox IsSetRef(&x)');
  assert.deepEqual(outputs(r), ["1"]);
  r = await ahk("MsgBox IsSetRef(&z)");
  assert.deepEqual(outputs(r), ["0"]);
  r = await ahk("a := [1]\nMsgBox IsSetRef(a)");
  assert.match(errors(r)[0] || "", /IsSetRefの引数にはVarRef/);
  r = await ahk("MsgBox IsSetRef(1)");
  assert.match(errors(r)[0] || "", /IsSetRefの引数にはVarRef/);
  const item = getDefinition("autohotkey").reference.find((x) => x.name === "IsSetRef");
  assert.doesNotMatch(item.caution, /モデルは実物と異なり/);
});

/* ---------------- R7-103: 通常 Object は列挙できない ---------------- */
test("R7-103: for over a plain Object is a TypeError, arrays still enumerate", async () => {
  let r = await ahk("n := 0\nfor k, v in {a: 1, b: 2} {\n n += 1\n}\nMsgBox n");
  assert.match(errors(r)[0] || "", /列挙できません/);
  assert.equal(vars(r).n, 0);
  r = await ahk("n := 0\nfor v in {a: 1} {\n n += 1\n}\nMsgBox n");
  assert.match(errors(r)[0] || "", /列挙できません/);
  r = await ahk("n := 0\nfor v in [10, 20, 30] {\n n += v\n}\nMsgBox n");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["60"]);
  const item = getDefinition("autohotkey").reference.find((x) => x.name === "for");
  assert.match(item.caution, /通常の Object は列挙できないため TypeError になります/);
});

/* ---------------- R7-104: Float の文字列化 ---------------- */
test("R7-104: Float values keep their fractional part when stringified", async () => {
  let r = await ahk('x := 1.0 . ""\nMsgBox x\nMsgBox (x == "1.0")');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["1.0", "1"]);
  assert.equal(vars(r).x, "1.0");
  r = await ahk('MsgBox 1.0 . ""');
  assert.deepEqual(outputs(r), ["1.0"]);
  r = await ahk("MsgBox 4 / 2");
  assert.deepEqual(outputs(r), ["2.0"]);
  r = await ahk("x := 1.0\nx += 1\nMsgBox x");
  assert.deepEqual(outputs(r), ["2.0"]);
  // 整数・非整数 Float は従来どおり
  r = await ahk("MsgBox 1.5");
  assert.deepEqual(outputs(r), ["1.5"]);
  r = await ahk("MsgBox 2");
  assert.deepEqual(outputs(r), ["2"]);
});

/* ---------------- R7-105: Sleep の型検査 ---------------- */
test("R7-105: Sleep rejects a non-numeric argument", async () => {
  let r = await ahk('Sleep "bad"\nMsgBox "AFTER"');
  assert.match(errors(r)[0] || "", /数値または数値文字列が必要です/);
  assert.deepEqual(outputs(r), []);
  r = await ahk('Sleep 0\nMsgBox "AFTER"');
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["AFTER"]);
  r = await ahk('Sleep "100"\nMsgBox "AFTER"');
  assert.deepEqual(outputs(r), ["AFTER"]);
});

/* ---------------- R7-106: 組み込み関数の引数個数 ---------------- */
test("R7-106: builtin functions reject too many arguments", async () => {
  for (const code of [
    'Sleep 0, 0\nMsgBox "AFTER"',
    'SendText "x", "y"\nMsgBox "AFTER"',
    'SetTitleMatchMode(2, 3)\nMsgBox "AFTER"',
    'InputBox("p", "t", "", "d", "extra")\nMsgBox "AFTER"',
  ]) {
    const r = await ahk(code);
    assert.match(errors(r)[0] || "", /引数が多すぎます/, code);
    assert.deepEqual(outputs(r), [], code);
  }
  const ok = await ahk('SetTitleMatchMode 2\nMsgBox "AFTER"');
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outputs(ok), ["AFTER"]);
});

/* ---------------- R7-107/108/109: ウィンドウ解決 ---------------- */
const twoWindows = {
  windows: [
    { id: 1, title: "R7 Window A", text: "present text", exists: true },
    { id: 2, title: "R7 Window B", text: "present text", exists: true },
  ],
  activeId: 2,
};
test("R7-107: WinActive considers every matching window", async () => {
  const r = await ahk('MsgBox WinActive("R7 Window")', twoWindows);
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["2"]);
});
test("R7-108: WinExist honours the WinText argument", async () => {
  let r = await ahk('MsgBox WinExist("R7 Window", "absent text")', twoWindows);
  assert.deepEqual(outputs(r), ["0"]);
  r = await ahk('MsgBox WinExist("R7 Window", "present text")', twoWindows);
  assert.deepEqual(outputs(r), ["1"]);
});
test("R7-109: WinExist with no title uses the Last Found Window", async () => {
  const r = await ahk(
    'x := WinExist("R7 Window B")\nMsgBox WinExist()\nMsgBox (WinExist() = x)',
    twoWindows,
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), ["2", "1"]);
  // Last Found Window が無ければ 0
  const none = await ahk("MsgBox WinExist()", twoWindows);
  assert.deepEqual(outputs(none), ["0"]);
});

/* ---------------- R7-110: InputBox の Result は呼び出しごとに独立 ---------------- */
test("R7-110: separate InputBox calls have independent Result unknowns", async () => {
  const r = await ahk(
    'a := InputBox("A")\nb := InputBox("B")\nx := 0\n' +
      'if a.Result = "OK" {\n x += 1\n}\nif b.Result = "OK" {\n x += 2\n}\nMsgBox x',
  );
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths.length, 4);
  assert.deepEqual(
    [...new Set(allOutputs(r))].sort(),
    ["0", "1", "2", "3"],
  );
  const a = vars(r).a, b = vars(r).b;
  assert.notEqual(a.Result.id, b.Result.id);
});
