import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ13（fxb班）: Codex一周監査 R7 のうちステップ5で「現行でも
// 有効（B）」と裁定された UI.Vision＋CloudFormation 系14件
// （R7-60, 61, 62, 66, 67, 121, 122, 126, 217, 218, 222, 223, 224, 230）
// の回帰テスト。正本は findings-step5-fxb.md の再現入力・実物の正解。
// R7-125 は script班が一括処置するため対象外。

const ui = getDefinition("uivision");
const cf = getDefinition("cloudformation");
const cmd = (Command, Target = "", Value = "") => ({ Command, Target, Value });
const OPEN = cmd("open", "https://example.test/form");
const uiRun = async (cmds, model) => {
  const r = await ui.simulate(
    JSON.stringify({ Name: "m", Commands: cmds }),
    model ?? structuredClone(ui.model.defaults),
  );
  return r;
};
const first = async (cmds, model) => {
  const r = await uiRun(cmds, model);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  return r.paths[0];
};
const errOf = (r) => r.error?.message ?? r.paths?.[0]?.error?.message;

/* ---------- R7-60: 引用した数値風文字列は文字列のまま ---------- */

test("R7-60 quoted ${x} keeps the string 001 and strict comparison holds", async () => {
  const p = await first([
    OPEN,
    cmd("store", "001", "x"),
    cmd("executeScript_Sandbox", 'return "${x}";', "y"),
  ]);
  assert.equal(p.vars.y, "001");
  assert.equal(typeof p.vars.y, "string");
  const q = await first([
    OPEN,
    cmd("store", "001", "x"),
    cmd("executeScript_Sandbox", 'return "${x}" === "001";', "y"),
  ]);
  assert.equal(q.vars.y, true);
  const s = await first([
    OPEN,
    cmd("store", "001", "x"),
    cmd("executeScript_Sandbox", 'return String("${x}");', "y"),
  ]);
  assert.equal(s.vars.y, "001");
});

test("R7-60 unquoted ${x} still reads numeric strings as numbers", async () => {
  const p = await first([
    OPEN,
    cmd("store", "001", "x"),
    cmd("executeScript_Sandbox", "return ${x} + 1;", "y"),
  ]);
  assert.equal(p.vars.y, 2);
});

/* ---------- R7-61: 引数なし String()／Number() ---------- */

test("R7-61 String() with no arguments is the empty string, Number() is 0", async () => {
  const p = await first([
    OPEN,
    cmd("executeScript_Sandbox", "return String();", "x"),
  ]);
  assert.equal(p.vars.x, "");
  const q = await first([
    OPEN,
    cmd("executeScript_Sandbox", "return Number();", "x"),
  ]);
  assert.equal(q.vars.x, 0);
  // 引数ありで undefined を渡す形は従来どおり undefined の変換になる
  const s = await first([
    OPEN,
    cmd("executeScript_Sandbox", "return String(undefined);", "x"),
  ]);
  assert.equal(s.vars.x, "undefined");
});

/* ---------- R7-62: 引用内変数を使う while 条件 ---------- */

test("R7-62 while with quoted ${x} condition follows the variable value", async () => {
  const p = await first([
    OPEN,
    cmd("store", "2", "x"),
    cmd("while", '"${x}" != "0"'),
    cmd("executeScript_Sandbox", "return Number(${x}) - 1;", "x"),
    cmd("end"),
    cmd("echo", "${x}"),
  ]);
  assert.equal(p.vars.x, 0);
  assert.deepEqual(p.outputs.map((o) => o.text), ["0"]);
});

test("R7-62 while with unquoted ${x} condition still works", async () => {
  const p = await first([
    OPEN,
    cmd("store", "2", "x"),
    cmd("while", "${x} != 0"),
    cmd("executeScript_Sandbox", "return Number(${x}) - 1;", "x"),
    cmd("end"),
    cmd("echo", "${x}"),
  ]);
  assert.equal(p.vars.x, 0);
  assert.deepEqual(p.outputs.map((o) => o.text), ["0"]);
});

/* ---------- R7-121: 変数名の大小文字を区別しない ---------- */

test("R7-121 variable references resolve case-insensitively", async () => {
  const p = await first([
    OPEN,
    cmd("store", "abc", "Name"),
    cmd("echo", "${name}"),
  ]);
  assert.deepEqual(p.outputs.map((o) => o.text), ["abc"]);
  // 最初に書かれた綴りのキーへ集約される（別キーを作らない）
  const q = await first([
    OPEN,
    cmd("store", "abc", "NAME"),
    cmd("store", "xyz", "name"),
    cmd("echo", "${NaMe}"),
  ]);
  assert.deepEqual(q.outputs.map((o) => o.text), ["xyz"]);
  assert.deepEqual(
    Object.keys(q.vars).filter((k) => k.toUpperCase() === "NAME"),
    ["NAME"],
  );
});

test("R7-121 internal variable names resolve case-insensitively (!ERRORIGNORE)", async () => {
  const p = await first([
    OPEN,
    cmd("store", "true", "!ERRORIGNORE"),
    cmd("click", "id=missing"),
    cmd("echo", "AFTER"),
  ]);
  assert.deepEqual(p.outputs.map((o) => o.text), ["AFTER"]);
});

/* ---------- R7-122: endIf／endWhile のリファレンス項目 ---------- */

test("R7-122 endIf and endWhile have reference items describing them as end aliases", () => {
  assert.equal(ui.reference.length, 25);
  for (const name of ["endIf", "endWhile"]) {
    const item = ui.reference.find((r) => r.name === name);
    assert.ok(item, name);
    assert.match(item.description, /endの別名/);
    assert.equal(item.supported, true);
  }
  assert.ok(ui.reference.some((r) => r.name === "!StringEscape"));
});

test("R7-122 endIf and endWhile still close blocks at runtime", async () => {
  const p = await first([
    OPEN,
    cmd("store", "0", "count"),
    cmd("if", "${count} == 0"),
    cmd("echo", "YES"),
    cmd("endIf"),
  ]);
  assert.deepEqual(p.outputs.map((o) => o.text), ["YES"]);
  const q = await first([
    OPEN,
    cmd("store", "0", "count"),
    cmd("while", "${count} < 2"),
    cmd("executeScript_Sandbox", "return Number(${count}) + 1;", "count"),
    cmd("endWhile"),
    cmd("echo", "AFTER"),
  ]);
  assert.deepEqual(q.outputs.map((o) => o.text), ["AFTER"]);
  assert.deepEqual(ui.scan(JSON.stringify({ Commands: [cmd("endIf"), cmd("endWhile")] })), ["endIf", "endWhile"]);
});

/* ---------- R7-126: 読取専用名・空名への store ---------- */

test("R7-126 store to !times or an empty name stops naming the reason", async () => {
  for (const name of ["!times", "!TIMES", "!Times"]) {
    const r = await uiRun([OPEN, cmd("store", "5", name)]);
    assert.match(errOf(r), /!times は読み取り専用/);
    assert.equal(r.paths[0]?.vars["!times"], undefined);
  }
  const empty = await uiRun([OPEN, cmd("store", "5", "")]);
  assert.match(errOf(empty), /変数名が空/);
  assert.ok(!Object.hasOwn(empty.paths[0]?.vars ?? {}, ""));
});

test("R7-126 sibling surfaces storeText and executeScript_Sandbox reject the same names", async () => {
  const r = await uiRun([OPEN, cmd("storeText", "id=result", "!times")]);
  assert.match(errOf(r), /!times は読み取り専用/);
  const s = await uiRun([
    OPEN,
    cmd("executeScript_Sandbox", "return 1;", ""),
  ]);
  assert.match(errOf(s), /変数名が空/);
  // 検証は !errorIgnore の継続処理の対象（止めずに次へ進める）
  const t = await first([
    OPEN,
    cmd("store", "true", "!errorIgnore"),
    cmd("store", "5", "!times"),
    cmd("echo", "AFTER"),
  ]);
  assert.deepEqual(t.outputs.map((o) => o.text), ["AFTER"]);
});

/* ---------- R7-222: 展開エラーも !errorIgnore で継続 ---------- */

test("R7-222 errors during variable expansion honour !errorIgnore", async () => {
  const p = await first([
    OPEN,
    cmd("store", "true", "!errorIgnore"),
    cmd("echo", "${Missing}"),
    cmd("echo", "AFTER"),
  ]);
  assert.deepEqual(p.outputs.map((o) => o.text), ["AFTER"]);
  // !errorIgnore が無ければ従来どおり止まる
  const r = await uiRun([OPEN, cmd("echo", "${Missing}"), cmd("echo", "AFTER")]);
  assert.match(errOf(r), /変数がありません：Missing/);
});

/* ---------- R7-223: Sandbox の裸の識別子はマクロ変数を読めない ---------- */

test("R7-223 bare identifiers in the Sandbox do not read macro variables", async () => {
  for (const expr of ["return x + 1;", "return String(x);", "return x == 7;"]) {
    const r = await uiRun([
      OPEN,
      cmd("store", "7", "x"),
      cmd("executeScript_Sandbox", expr, "y"),
    ]);
    assert.match(errOf(r), /未定義の名前：x/, expr);
  }
  // 明示展開 ${x} は従来どおり読める
  const p = await first([
    OPEN,
    cmd("store", "7", "x"),
    cmd("executeScript_Sandbox", "return String(${x});", "y"),
  ]);
  assert.equal(p.vars.y, "7");
  // 処置済みの大域名（undefined）は触らない
  const q = await first([
    OPEN,
    cmd("executeScript_Sandbox", "return String(undefined);", "y"),
  ]);
  assert.equal(q.vars.y, "undefined");
  const n = await first([
    OPEN,
    cmd("executeScript_Sandbox", "return Number(undefined);", "y"),
  ]);
  // 最終状態の表示スナップショットでは非有限数は文字列化される（R26-N18）
  assert.equal(n.vars.y, "NaN");
});

/* ---------- R7-230: Sandbox の &&／|| はオペランド値を返す ---------- */

test("R7-230 short-circuited || and && return the selected operand value", async () => {
  const cases = [
    ["return (1 || 7) === 1;", true],
    ['return ("x" || "fallback") === "x";', true],
    ["return (0 && 7) === 0;", true],
    ['return 1 && "yes";', "yes"],
    ['return 0 || "fb";', "fb"],
  ];
  for (const [expr, expected] of cases) {
    const p = await first([OPEN, cmd("executeScript_Sandbox", expr, "y")]);
    assert.equal(p.vars.y, expected, expr);
  }
});

/* ---------- R7-224: type の !StringEscape（既定 true） ---------- */

const textareaModel = () => {
  const m = structuredClone(ui.model.defaults);
  m.pages["https://example.test/form"].elements["id=name"] = {
    tag: "textarea",
    value: "",
    text: "",
  };
  return m;
};

test("R7-224 type interprets \\n and \\t escapes by default (!StringEscape)", async () => {
  const p = await first(
    [
      OPEN,
      cmd("type", "id=name", "a\\nb"),
      cmd("storeValue", "id=name", "Name"),
    ],
    textareaModel(),
  );
  assert.equal(p.vars.Name, "a\nb");
  const q = await first(
    [
      OPEN,
      cmd("type", "id=name", "a\\tb"),
      cmd("storeValue", "id=name", "Name"),
    ],
    textareaModel(),
  );
  assert.equal(q.vars.Name, "a\tb");
  // 実改行はそのまま保持される
  const s = await first(
    [
      OPEN,
      cmd("type", "id=name", "a\nb"),
      cmd("storeValue", "id=name", "Name"),
    ],
    textareaModel(),
  );
  assert.equal(s.vars.Name, "a\nb");
});

test("R7-224 !StringEscape=false keeps the literal backslash sequences", async () => {
  const p = await first(
    [
      OPEN,
      cmd("store", "false", "!StringEscape"),
      cmd("type", "id=name", "a\\nb"),
      cmd("storeValue", "id=name", "Name"),
    ],
    textareaModel(),
  );
  assert.equal(p.vars.Name, "a\\nb");
  // 大小文字違いの名前で設定しても効く（R7-121 の兄弟表面）
  const q = await first(
    [
      OPEN,
      cmd("store", "false", "!stringescape"),
      cmd("type", "id=name", "a\\tb"),
      cmd("storeValue", "id=name", "Name"),
    ],
    textareaModel(),
  );
  assert.equal(q.vars.Name, "a\\tb");
});

/* ---------- CloudFormation ---------- */

const cfRun = async (code, model) =>
  cf.simulate(code, model ?? structuredClone(cf.model.defaults));
const cfErr = (r) => r.error?.message ?? r.paths?.[0]?.error?.message;

test("R7-66 a missing response requestId stops even when the input requestId is unknown", async () => {
  const handler = 'def handler(event, context):\n    return {"status": "success", "fragment": {}}';
  const m = structuredClone(cf.model.defaults);
  delete m.event.requestId;
  const r = await cfRun(handler, m);
  assert.match(cfErr(r), /requestIdが含まれていません/);
  // テンプレート形（invoke 経由）でも同じ
  const m2 = structuredClone(cf.model.defaults);
  delete m2.event.requestId;
  m2.macros = { AddMetadata: handler };
  const r2 = await cfRun(
    JSON.stringify({ Transform: "AddMetadata", Resources: {} }),
    m2,
  );
  assert.match(cfErr(r2), /requestIdが含まれていません/);
  // 既知IDで応答が返す形は従来どおり成功する
  const ok = await cfRun(
    'def handler(event, context):\n    return {"requestId": event["requestId"], "status": "success", "fragment": {}}',
  );
  assert.equal(cfErr(ok), undefined);
});

test("R7-67 a non-string status is diagnosed as a type error, not as missing", async () => {
  for (const status of ["None", "1"]) {
    const r = await cfRun(
      `def handler(event, context):\n    return {"requestId": event["requestId"], "status": ${status}, "fragment": {}}`,
    );
    assert.match(cfErr(r), /statusが文字列ではありません/, status);
  }
  const missing = await cfRun(
    'def handler(event, context):\n    return {"requestId": event["requestId"], "fragment": {}}',
  );
  assert.match(cfErr(missing), /statusが含まれていません/);
});

test("R7-217 macro responses that are not JSON-serializable stop naming the value", async () => {
  const withValue = (v) =>
    `def handler(event, context):\n    return {"requestId": event["requestId"], "status": "success", "fragment": {"value": ${v}}}`;
  const set = await cfRun(withValue("{1, 2}"));
  assert.match(cfErr(set), /JSONへ変換できない値が含まれています：集合/);
  const nan = await cfRun(withValue('float("nan")'));
  assert.match(cfErr(nan), /JSONへ変換できない値が含まれています：NaN/);
  const inf = await cfRun(withValue('float("inf")'));
  assert.match(cfErr(inf), /JSONへ変換できない値が含まれています：Infinity/);
  // tuple は従来どおり配列として変換され成功する
  const ok = await cfRun(withValue("(1, 2)"));
  assert.equal(cfErr(ok), undefined);
  const group = ok.paths[0].groups.find((g) => g.title.includes("変換後"));
  assert.match(JSON.stringify(group), /\[\\n\s+1,\\n\s+2\\n\s+\]/);
});

test("R7-218 unregistered macro names inherited from Object.prototype stop as unconfirmed", async () => {
  for (const name of ["toString", "constructor", "Absent"]) {
    const r = await cfRun(
      JSON.stringify({ Resources: { X: { "Fn::Transform": { Name: name } } } }),
    );
    assert.match(cfErr(r), new RegExp("未確認：モデルにマクロ定義がありません：" + name), name);
  }
});
