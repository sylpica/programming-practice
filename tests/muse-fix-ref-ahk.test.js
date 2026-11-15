import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as d } from "../js/types/autohotkey/index.js";

const byName = (name) => d.reference.find((r) => r.name === name);
const BUNDLED = "A_*（組み込み変数）";
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);

// ---------- R22: 第1層の個別項目が追加されている ----------
test("ref-ahk: IsSet／IsSetRef／for／break／continue／return／Length／A_Index が個別項目である", () => {
  for (const n of [
    "IsSet",
    "IsSetRef",
    "for",
    "break",
    "continue",
    "return",
    "Length",
    "A_Index",
  ])
    assert.ok(byName(n), n);
  // 追加後は 17 + 9（個別8＋束ね1）= 26件
  assert.equal(d.reference.length, 26);
});

test("ref-ahk: 束ね項目が固定値／実行時に決まる値の区別と代表名を持つ", () => {
  const b = byName(BUNDLED);
  assert.ok(b);
  assert.match(b.description, /固定値/);
  assert.match(b.description, /実行時に決まる値/);
  for (const n of ["A_Space", "A_Tab", "A_ScriptDir", "A_Now", "A_TickCount", "A_UserName"])
    assert.ok(b.description.includes(n) || b.syntax.includes(n), n);
  assert.ok(b.caution.includes("A_LoopField"));
});

// ---------- R22: scan の A_* 別名解決 ----------
test("ref-ahk scan: A_Index は個別項目へ解決される（大文字小文字不区別）", () => {
  assert.ok(d.scan("Loop 3 {\n MsgBox A_Index\n}").includes("A_Index"));
  assert.ok(d.scan("MsgBox a_index").includes("A_Index"));
  // A_Index は束ね項目へは寄せない
  assert.ok(!d.scan("MsgBox A_Index").includes(BUNDLED));
});

test("ref-ahk scan: 実装済み A_* の代表名は束ね項目へ解決される", () => {
  for (const n of [
    "A_ScriptDir",
    "A_Space",
    "A_Tab",
    "A_Now",
    "A_TickCount",
    "A_Clipboard",
    "A_UserName",
    "A_ScreenWidth",
    "A_TitleMatchMode",
    "a_scriptdir",
  ])
    assert.ok(d.scan(`x := ${n}`).includes(BUNDLED), n);
  // 複数名が混在しても束ね項目は1回だけ現れる
  const mixed = d.scan("MsgBox A_ScriptDir\nMsgBox A_Now\nMsgBox A_Index");
  assert.equal(mixed.filter((x) => x === BUNDLED).length, 1);
  assert.ok(mixed.includes("A_Index"));
});

test("ref-ahk scan: 未対応21件と未知の A_* 名は解決されない", () => {
  const unsupported21 = [
    "A_LoopField",
    "A_LoopFileName",
    "A_LoopFileExt",
    "A_LoopFileDir",
    "A_LoopFileFullPath",
    "A_LoopFileShortPath",
    "A_LoopFileShortName",
    "A_LoopFileTimeModified",
    "A_LoopFileTimeCreated",
    "A_LoopFileTimeAccessed",
    "A_LoopFileAttrib",
    "A_LoopFileSize",
    "A_LoopFileSizeKB",
    "A_LoopFileSizeMB",
    "A_LoopReadLine",
    "A_LoopRegName",
    "A_LoopRegType",
    "A_LoopRegKey",
    "A_LoopRegSubKey",
    "A_LoopRegTimeModified",
    "A_ThisFunc",
  ];
  assert.equal(unsupported21.length, 21);
  for (const n of unsupported21) {
    const found = d.scan(`x := ${n}`);
    assert.ok(!found.includes(BUNDLED), n);
    assert.ok(!found.includes("A_Index"), n);
  }
  assert.ok(!d.scan("x := A_Banana").includes(BUNDLED));
});

test("ref-ahk scan: 新規の個別項目も scan で到達できる", () => {
  assert.ok(d.scan("MsgBox IsSet(x)").includes("IsSet"));
  assert.ok(d.scan("MsgBox IsSetRef(&y)").includes("IsSetRef"));
  assert.ok(d.scan("for k, v in [1, 2] {\n MsgBox v\n}").includes("for"));
  assert.ok(d.scan("Loop 3 {\n break\n}").includes("break"));
  assert.ok(d.scan("Loop 3 {\n continue\n}").includes("continue"));
  assert.ok(d.scan("return").includes("return"));
  assert.ok(d.scan("a := [1, 2]\nMsgBox a.Length").includes("Length"));
});

// ---------- R22: 第2層 Loop の Until 記載 ----------
test("ref-ahk: Loop 項目の構文と本文に Until 形式がある", () => {
  const loop = byName("Loop");
  assert.ok(loop.syntax.includes("Until"), loop.syntax);
  assert.ok(loop.description.includes("Until"), loop.description);
});

// ---------- R22: 新規項目の使用例がエラーなく実行できる ----------
test("ref-ahk: 新規・変更項目の使用例が自種分エラーなしで実行できる", async () => {
  for (const n of [
    "IsSet",
    "IsSetRef",
    "for",
    "break",
    "continue",
    "return",
    "Length",
    "A_Index",
    BUNDLED,
    "Loop",
  ]) {
    const r = await d.simulate(
      byName(n).example,
      structuredClone(d.model.defaults),
    );
    assert.deepEqual(errors(r), [], n);
    assert.ok(r.paths.length, n);
  }
});
