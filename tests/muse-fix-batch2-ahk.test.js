import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

const d = getDefinition("autohotkey");
const run = async (code, model) =>
  d.simulate(code, structuredClone(model ?? { ...d.model.defaults, event: null }));
const errors = (r) => {
  const out = [];
  if (r.error) out.push(r.error);
  for (const p of r.paths || []) if (p.error) out.push(p.error);
  return out;
};
const outputs = (r) => (r.paths?.[0]?.outputs || []).map((o) => o.text);
const vars = (r) => r.paths?.[0]?.vars || {};
const traceTexts = (r) => (r.paths?.[0]?.trace || []).map((t) => t.text);
const modeEntry = (r) =>
  (r.paths?.[0]?.groups || [])
    .find((g) => g.title === "モデル入力・ウィンドウ")
    ?.entries.find(([k]) => k === "タイトル一致モード")?.[1];
const winText = (r) => r.paths?.[0]?.model?.windows?.[0]?.text;

// ---------- NX-N1: for の break はループを実際に抜ける ----------
test("NX-N1 for break stops iteration at the break point", async () => {
  const r = await run(
    "total := 0\nfor v in [10, 20, 30] {\n if v = 20 {\n  break\n }\n total += v\n}\nMsgBox total",
  );
  assert.deepEqual(errors(r), []);
  assert.equal(vars(r).total, 10);
  assert.equal(vars(r).v, 20);
  assert.deepEqual(outputs(r), ["10"]);
  assert.ok(traceTexts(r).includes("ループを抜けます"));
  assert.ok(!traceTexts(r).includes("繰り返し 3回目"));
});

test("NX-N1 for break on the first element and nested inside while", async () => {
  const first = await run(
    "total := 0\nfor v in [10, 20, 30] {\n break\n total += v\n}\nMsgBox total",
  );
  assert.deepEqual(errors(first), []);
  assert.equal(vars(first).total, 0);
  assert.deepEqual(outputs(first), ["0"]);
  // The inner for's break must not be swallowed (and must not break
  // the outer while either): each while pass adds only v=1.
  const nested = await run(
    "total := 0\nn := 0\nwhile n < 2 {\n n += 1\n for v in [1, 2, 3] {\n  if v = 2 {\n   break\n  }\n  total += v\n }\n}\nMsgBox total",
  );
  assert.deepEqual(errors(nested), []);
  assert.equal(vars(nested).total, 2);
  assert.deepEqual(outputs(nested), ["2"]);
});

// ---------- NX-N2: for の continue は次の要素へ進む ----------
test("NX-N2 for continue skips one element and reaches the statements after the loop", async () => {
  const r = await run(
    "total := 0\nfor v in [10, 20, 30] {\n if v = 20 {\n  continue\n }\n total += v\n}\nMsgBox total",
  );
  assert.deepEqual(errors(r), []);
  assert.equal(vars(r).total, 40);
  assert.equal(vars(r).v, 30);
  assert.deepEqual(outputs(r), ["40"]);
  assert.ok(traceTexts(r).includes("繰り返し 3回目"));
});

test("NX-N2 for continue works for objects and on the last element", async () => {
  const obj = await run(
    'out := ""\nfor k, v in {a: 1, b: 2, c: 3} {\n if v = 2 {\n  continue\n }\n out .= k\n}\nMsgBox out',
  );
  assert.deepEqual(errors(obj), []);
  assert.deepEqual(outputs(obj), ["ac"]);
  const last = await run(
    "total := 0\nfor v in [10, 20, 30] {\n if v = 30 {\n  continue\n }\n total += v\n}\nMsgBox total",
  );
  assert.deepEqual(errors(last), []);
  assert.equal(vars(last).total, 30);
  assert.deepEqual(outputs(last), ["30"]);
});

test("NX-N1/N2 sibling loops (while / Loop / Loop Until) keep correct break/continue", async () => {
  const wb = await run("n := 0\nwhile n < 10 {\n n += 1\n if n = 2 {\n  break\n }\n}\nMsgBox n");
  assert.deepEqual(outputs(wb), ["2"]);
  const wc = await run(
    "n := 0\ntotal := 0\nwhile n < 3 {\n n += 1\n if n = 2 {\n  continue\n }\n total += n\n}\nMsgBox total",
  );
  assert.deepEqual(outputs(wc), ["4"]);
  const lb = await run('Loop 5 {\n if A_Index = 2 {\n  break\n }\n MsgBox A_Index\n}');
  assert.deepEqual(outputs(lb), ["1"]);
  const lc = await run('Loop 3 {\n if A_Index = 2 {\n  continue\n }\n MsgBox A_Index\n}');
  assert.deepEqual(outputs(lc), ["1", "3"]);
  const ub = await run("i := 0\nLoop {\n i++\n if i = 2 {\n  break\n }\n} Until i >= 10\nMsgBox i");
  assert.deepEqual(outputs(ub), ["2"]);
  const uc = await run(
    "i := 0\ntotal := 0\nLoop {\n i++\n if i = 2 {\n  continue\n }\n total += i\n} Until i >= 3\nMsgBox total",
  );
  assert.deepEqual(outputs(uc), ["4"]);
  for (const r of [wb, wc, lb, lc, ub, uc]) assert.deepEqual(errors(r), []);
});

test("NX-N1/N2 for return inside a hotkey still ends the handler", async () => {
  const r = await run(
    '^!n:: {\n for v in [10, 20, 30] {\n  return\n }\n MsgBox "after"\n}',
    { ...d.model.defaults, event: "^!n" },
  );
  assert.deepEqual(errors(r), []);
  assert.deepEqual(outputs(r), []);
});

// ---------- NX-N14: SetTitleMatchMode の説明は設定後のモードを示す ----------
test("NX-N14 the step names the new mode and its meaning, not the previous value", async () => {
  const r = await run('SetTitleMatchMode 3\nMsgBox WinExist("メモ")');
  assert.deepEqual(errors(r), []);
  assert.ok(traceTexts(r).some((t) => t.includes("タイトル一致モードを 3（完全一致）に設定します")));
  assert.ok(!traceTexts(r).some((t) => t.includes("式を評価します：2")));
  // Mode 3 is exact match, so the partial title no longer matches.
  assert.deepEqual(outputs(r), ["0"]);
  assert.equal(modeEntry(r), "3（完全一致）");
});

test("NX-N14 groups always show the current mode; the return value stays the previous mode", async () => {
  const plain = await run('MsgBox WinExist("メモ")');
  assert.equal(modeEntry(plain), "2（部分一致）");
  const r = await run("old := SetTitleMatchMode(3)\nMsgBox old\nMsgBox A_TitleMatchMode");
  assert.deepEqual(errors(r), []);
  // Documented contract: the function returns the previous setting.
  assert.deepEqual(outputs(r), ["2", "3"]);
  assert.ok(traceTexts(r).some((t) => t.includes("タイトル一致モードを 3（完全一致）に設定します")));
  assert.equal(modeEntry(r), "3（完全一致）");
  const m1 = await run('SetTitleMatchMode 1\nMsgBox WinExist("メモ")');
  assert.equal(modeEntry(m1), "1（先頭一致）");
  assert.deepEqual(outputs(m1), ["1"]);
});

// ---------- NX-N22: Send の {Enter} は記法のまま説明する ----------
test("NX-N22 Send {Enter} is quoted as {Enter} while the model receives a newline", async () => {
  const r = await run('Send "{Enter}"');
  assert.deepEqual(errors(r), []);
  assert.equal(traceTexts(r).length, 1);
  assert.equal(traceTexts(r)[0], "「メモ帳」へ {Enter} を入力します");
  assert.ok(!traceTexts(r)[0].includes("\n"));
  assert.equal(winText(r), "\n");
  const mixed = await run('Send "abc{Enter}def"');
  assert.equal(traceTexts(mixed)[0], "「メモ帳」へ abc{Enter}def を入力します");
  assert.equal(winText(mixed), "abc\ndef");
});

test("NX-N22 a literal newline sent with SendText is shown as （改行）", async () => {
  const r = await run('SendText "a`nb"');
  assert.deepEqual(errors(r), []);
  assert.equal(traceTexts(r)[0], "「メモ帳」へ a（改行）b を入力します");
  assert.equal(winText(r), "a\nb");
  const plain = await run('Send "hello"');
  assert.equal(traceTexts(plain)[0], "「メモ帳」へ hello を入力します");
});

// ---------- NX-N23: 添字代入の説明が対象要素を示す ----------
test("NX-N23 subscript assignments name the element, including compound assignment", async () => {
  const r = await run("a := [10, 20, 30]\na[2] := 99\na[1] += 5\nMsgBox a[1]");
  assert.deepEqual(errors(r), []);
  assert.ok(traceTexts(r).includes("a[2] に 99 を代入します"));
  assert.ok(traceTexts(r).includes("a[1] に 15 を代入します"));
  assert.ok(!traceTexts(r).some((t) => t.startsWith("対象 に")));
  assert.deepEqual(vars(r).a, [15, 99, 30]);
});

test("NX-N23 variable subscripts, nested targets, string keys and postfix name the element", async () => {
  const vi = await run("a := [10, 20, 30]\ni := 2\na[i] := 99\nMsgBox a[2]");
  assert.ok(traceTexts(vi).includes("a[i] に 99 を代入します"));
  const nested = await run("o := {list: [1, 2, 3]}\no.list[2] := 99\nMsgBox o.list[2]");
  assert.ok(traceTexts(nested).includes("o.list[2] に 99 を代入します"));
  const key = await run('o := {a: 1}\no["a"] := 5\nMsgBox o.a');
  assert.ok(traceTexts(key).includes('o["a"] に 5 を代入します'));
  const post = await run("a := [10, 20]\na[1]++\na[2]--\nMsgBox a[1]");
  assert.ok(traceTexts(post).some((t) => t.startsWith("a[1] を増やします")));
  assert.ok(traceTexts(post).some((t) => t.startsWith("a[2] を減らします")));
  assert.deepEqual(vars(post).a, [11, 19]);
  // Property and scalar assignments keep their existing narration.
  const prop = await run("o := {score: 1}\no.Score := 5\nMsgBox o.score");
  assert.ok(traceTexts(prop).includes("o.Score に 5 を代入します"));
});

// ---------- M-N5: 関数でない変数の呼び出しは原因を正しく伝える ----------
test("M-N5 calling a defined variable does not claim an unsupported function", async () => {
  const cases = [
    ["x := 5\nx()", "x は関数ではありません（数値は呼び出せません）"],
    ["arr := [1]\narr()", "arr は関数ではありません（配列は呼び出せません）"],
    ['s := "hi"\ns()', "s は関数ではありません（文字列は呼び出せません）"],
    ["o := {a: 1}\no()", "o は関数ではありません（オブジェクトは呼び出せません）"],
    ["Total := 5\nTOTAL()", "TOTAL は関数ではありません（数値は呼び出せません）"],
    ["A_Now()", "A_Now は関数ではありません（組み込み変数は呼び出せません）"],
  ];
  for (const [code, message] of cases) {
    const r = await run(code);
    assert.equal(errors(r)[0]?.message, message, code);
  }
  // A name with no definition at all keeps the unsupported message.
  const unknown = await run("UnknownFunc(1)");
  assert.equal(errors(unknown)[0]?.message, "このAutoHotkey関数は未対応です：UnknownFunc");
  const strLen = await run('x := StrLen("abc")');
  assert.equal(errors(strLen)[0]?.message, "このAutoHotkey関数は未対応です：StrLen");
});

// ---------- J-N1: 「64ビットのビット演算」 ----------
test("J-N1 both surfaces use 64ビットのビット演算", async () => {
  assert.ok(d.semantics.support.includes("64ビットのビット演算"));
  assert.ok(!d.semantics.support.includes("64ビットビット演算"));
  const r = await run("x := 1 & 2");
  assert.equal(errors(r)[0]?.message, "未対応：AutoHotkeyの64ビットのビット演算");
});
