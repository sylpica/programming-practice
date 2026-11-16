import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ11・fx班
// - RG-361（R32-F01B-N3／R32-PLAT-N1）: CloudFormation の simulate 入口に
//   モデル形状検証を新設。他種の RG-345 水準（モデル自体は
//   「モデルはオブジェクト（JSON）で指定してください」／カテゴリ
//   「モデルエラー」、項目の型違いは項目名を名指す）に揃える。
// - RG-362（R32-PLAT-N2）: 要素・深部レベルの形状検証群。
//   (a) AutoHotkey windows 要素、(b) JavaScript dom.elements 要素値、
//   (c) ImageJ files フィールド。
// いずれも、汎用文言（「null / undefined …」「処理中に予期しない
// エラーが発生しました」）や誤帰属ではなく、モデル側の項目を
// 名指して停止することを固定する。正常形の対照も併せて固定する。

const GENERIC =
  /null \/ undefined|処理中に予期しないエラー|KeyError|へ書き込めません/;

const errOf = (r) => r.error ?? r.paths?.[0]?.error;

// ---------------------------------------------------------------- CFN
const cfn = getDefinition("cloudformation");
const cfnHandlerCode = cfn.templates.find((t) => t.id === "cfn-handler").code;
const cfnTemplateCode = cfn.templates.find((t) => t.id === "cfn-transform").code;
const cfnDefaults = () => structuredClone(cfn.model.defaults);

test("RG-361 CFN: モデル全体が非オブジェクトならモデル自体を名指す（両形）", async () => {
  for (const bad of [null, undefined, 123, "x", [], true]) {
    for (const code of [cfnHandlerCode, cfnTemplateCode]) {
      const r = await cfn.simulate(code, bad);
      assert.equal(r.error?.message, "モデルはオブジェクト（JSON）で指定してください", JSON.stringify(bad));
      assert.equal(r.error?.category, "モデルエラー");
      assert.doesNotMatch(r.error.message, GENERIC);
    }
  }
});

test("RG-361 CFN: ハンドラ形の {} は event の欠落をモデル側で名指す", async () => {
  const r = await cfn.simulate(cfnHandlerCode, {});
  assert.match(r.error.message, /モデルにeventがありません/);
  assert.equal(r.error.category, "モデルエラー");
  const r2 = await cfn.simulate(cfnHandlerCode, { event: {} });
  assert.match(r2.error.message, /モデルeventにfragmentがありません/);
  assert.doesNotMatch(r2.error.message, GENERIC);
});

test("RG-361 CFN: event の非オブジェクトは event を名指す（両形）", async () => {
  for (const badEvent of [123, [], "x", null]) {
    const m1 = cfnDefaults();
    m1.event = badEvent;
    const r1 = await cfn.simulate(cfnHandlerCode, m1);
    assert.match(r1.error.message, /モデルeventはオブジェクトで指定してください/);
    assert.equal(r1.error.category, "モデルエラー");
    const m2 = cfnDefaults();
    m2.event = badEvent;
    const r2 = await cfn.simulate(cfnTemplateCode, m2);
    assert.match(r2.error.message, /モデルeventはオブジェクトで指定してください/);
    assert.doesNotMatch(r2.error.message, GENERIC);
  }
});

test("RG-361 CFN: macros の形状・値の型違いはマクロ名を名指す", async () => {
  const m1 = cfnDefaults();
  m1.macros = { AddMetadata: 42 };
  const r1 = await cfn.simulate(cfnTemplateCode, m1);
  assert.match(r1.error.message, /モデルmacros\.AddMetadataは文字列で指定してください/);
  assert.equal(r1.error.category, "モデルエラー");
  assert.doesNotMatch(r1.error.message, GENERIC);
  const m2 = cfnDefaults();
  m2.macros = 42;
  const r2 = await cfn.simulate(cfnTemplateCode, m2);
  assert.match(r2.error.message, /モデルmacrosはオブジェクトで指定してください/);
  const m3 = cfnDefaults();
  m3.macros = { AddMetadata: null };
  const r3 = await cfn.simulate(cfnHandlerCode, m3);
  assert.match(r3.error.message, /モデルmacros\.AddMetadataは文字列で指定してください/);
});

test("RG-361 CFN: 正常なモデルは従来どおり実行できる（両形）", async () => {
  const r1 = await cfn.simulate(cfnHandlerCode, cfnDefaults());
  assert.ok(!errOf(r1), JSON.stringify(errOf(r1)));
  assert.ok(r1.paths.length >= 1);
  const r2 = await cfn.simulate(cfnTemplateCode, cfnDefaults());
  assert.ok(!errOf(r2), JSON.stringify(errOf(r2)));
  assert.ok(r2.paths.length >= 1);
  // event を欠くテンプレート形は従来どおり macros 側の名指しに帰着する
  const r3 = await cfn.simulate(cfnTemplateCode, {});
  assert.match(r3.error.message, /モデルにマクロ定義がありません/);
});

// ---------------------------------------------------------------- AHK
const ahk = getDefinition("autohotkey");
const ahkCode = ahk.templates.find((t) => t.id === "ahk-hotkey").code;
const ahkModel = (windows) => {
  const m = structuredClone(ahk.model.defaults);
  m.windows = windows;
  return m;
};

test("RG-362(a) AHK: windows 要素がオブジェクトでない形を位置で名指す", async () => {
  for (const bad of [[null], ["x"], [[ ]], [42]]) {
    const r = await ahk.simulate(ahkCode, ahkModel(bad));
    assert.match(r.error.message, /モデルwindows\[0\]はオブジェクトで指定してください/, JSON.stringify(bad));
    assert.equal(r.error.category, "モデルエラー");
    assert.doesNotMatch(r.error.message, GENERIC);
  }
});

test("RG-362(a) AHK: windows 要素の欠落・型違いをフィールド名で名指す", async () => {
  const cases = [
    [[{}], /モデルwindows\[0\]にidがありません/],
    [[{ id: "a" }], /モデルwindows\[0\]\.idは数値で指定してください/],
    [[{ id: 1 }], /モデルwindows\[0\]にtitleがありません/],
    [[{ id: 1, title: 42, text: "", exists: true }], /モデルwindows\[0\]\.titleは文字列で指定してください/],
    [[{ id: 1, title: "x" }], /モデルwindows\[0\]にtextがありません/],
    [[{ id: 1, title: "x", text: 1, exists: true }], /モデルwindows\[0\]\.textは文字列で指定してください/],
    [[{ id: 1, title: "x", text: "" }], /モデルwindows\[0\]にexistsがありません/],
    [[{ id: 1, title: "x", text: "", exists: 1 }], /モデルwindows\[0\]\.existsは真偽値で指定してください/],
    // 2番目の要素の不正は位置 [1] で名指す
    [
      [{ id: 1, title: "x", text: "", exists: true }, null],
      /モデルwindows\[1\]はオブジェクトで指定してください/,
    ],
  ];
  for (const [windows, pattern] of cases) {
    const r = await ahk.simulate(ahkCode, ahkModel(windows));
    assert.match(r.error.message, pattern, JSON.stringify(windows));
    assert.equal(r.error.category, "モデルエラー");
    assert.doesNotMatch(r.error.message, GENERIC);
  }
});

test("RG-362(a) AHK: 正常な windows では従来どおり実行できる", async () => {
  const r = await ahk.simulate(ahkCode, ahkModel([
    { id: 1, title: "メモ帳", text: "", exists: true },
  ]));
  assert.ok(!errOf(r), JSON.stringify(errOf(r)));
  assert.ok(r.paths.length >= 1);
});

// ---------------------------------------------------------------- JS
const js = getDefinition("javascript");
const jsCode = js.templates.find((t) => t.id === "js-dom").code;
const jsModel = (elements) => {
  const m = structuredClone(js.model.defaults);
  m.dom.elements = elements;
  return m;
};

test("RG-362(b) JS: dom.elements の要素値が非オブジェクトならキー名を名指す", async () => {
  for (const bad of [{ name: 42 }, { name: null }, { name: [] }, { name: "x" }, { result: true }]) {
    const key = Object.keys(bad)[0];
    const r = await js.simulate(jsCode, jsModel(bad));
    assert.match(
      r.error.message,
      new RegExp(`モデルdom\\.elements\\.${key}はオブジェクトで指定してください`),
      JSON.stringify(bad),
    );
    assert.equal(r.error.category, "モデルエラー");
    assert.doesNotMatch(r.error.message, GENERIC);
  }
});

test("RG-362(b) JS: 正常な elements では従来どおり実行できる", async () => {
  const r = await js.simulate(jsCode, structuredClone(js.model.defaults));
  assert.ok(!errOf(r), JSON.stringify(errOf(r)));
  assert.ok(r.paths.length >= 1);
});

// ---------------------------------------------------------------- ImageJ
const ij = getDefinition("imagej");
const ij5 = ij.templates.find((t) => t.id === "ij-5");
const ijModel = (files) => {
  const m = structuredClone(ij.model.defaults);
  m.files = files;
  return m;
};

test("RG-362(c) ImageJ: files の型違いは項目名を名指し、truncated 契約を保つ", async () => {
  for (const bad of [42, "x", [], true]) {
    const r = await ij.simulate(ij5.code, ijModel(bad));
    assert.match(r.error.message, /モデルの files はオブジェクトで指定してください/, JSON.stringify(bad));
    assert.ok("truncated" in r, "結果に truncated キーが必要");
    assert.equal(r.truncated, false);
    assert.doesNotMatch(r.error.message, GENERIC);
  }
  const r2 = await ij.simulate(ij5.code, ijModel({ "/model/x.tif": 42 }));
  assert.match(r2.error.message, /モデルの files\["\/model\/x\.tif"\] はオブジェクトで指定してください/);
  assert.ok("truncated" in r2);
});

test("RG-362(c) ImageJ: 正常な files では従来どおり実行できる", async () => {
  const r = await ij.simulate(ij5.code, structuredClone(ij.model.defaults));
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.ok(r.paths.length >= 1);
});
