import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { referenceAdvanced as cmdRefAdv } from "../js/types/cmd/reference-advanced.js";
import { templatesAdvanced as cmdTplAdv } from "../js/types/cmd/templates-advanced.js";
import { advancedStops as cmdStops } from "../js/types/cmd/advanced-engine.js";

// 高度A1班（UI.Vision RPA＋cmd）監査・修正の回帰テスト。
// 欠陥と裁定の詳細は docs/audit/LANE-A1-EXEC.md。

const cmd = getDefinition("cmd");
const runC = (code, extra = {}) =>
  cmd.simulate(code, { ...structuredClone(cmd.model.defaults), ...extra });
const cErrs = (r) => [r.error, ...r.paths.map((p) => p.error)].filter(Boolean);
const cErr = (r) => cErrs(r)[0];
const cFlat = (r) => r.paths.flatMap((p) => p.outputs.map((o) => o.text));
const cAllText = (r) =>
  JSON.stringify([r.error, r.paths.map((p) => [p.error, p.outputs, p.notes, p.vars])]);

// ---------------------------------------------------------- cmd 展開修飾
test("lane-a1 cmd: substring expansion %VAR:~n,m% follows Learn/SET help semantics", () => {
  assert.deepEqual(cFlat(runC("set S=abcdef\necho %S:~0,3%")), ["abc"]);
  assert.deepEqual(cFlat(runC("set S=abcdef\necho %S:~-3%")), ["def"]);
  assert.deepEqual(cFlat(runC("set S=abcdef\necho %S:~1,-1%")), ["bcde"]);
  assert.deepEqual(cFlat(runC("set S=abcdef\necho %S:~2%")), ["cdef"]);
});

test("lane-a1 cmd: replacement expansion is case-insensitive replace-all", () => {
  assert.deepEqual(cFlat(runC("set S=abcdef\necho %S:abc=XYZ%")), ["XYZdef"]);
  assert.deepEqual(cFlat(runC("set S=aXbXc\necho %S:X=y%")), ["aybyc"]);
  assert.deepEqual(cFlat(runC("set S=abcdef\necho %S:z=Y%")), ["abcdef"]);
});

test("lane-a1 cmd: asterisk replacement replaces the span through the first match once", () => {
  // SET ヘルプ文: * で始まる検索は「先頭から、残りの検索文字列の最初の
  // 一致まで」に一致し、その全体が置換文字列に置き換わる。
  assert.deepEqual(cFlat(runC("set S=aXbXc\necho %S:*X=Y%")), ["YbXc"]);
  assert.deepEqual(cFlat(runC("set S=abcdef\necho %S:*c=X%")), ["Xdef"]);
  // 一致が無ければ値は変わらない（空文字に化けない）。
  assert.deepEqual(cFlat(runC("set S=abcdef\necho %S:*z=Y%")), ["abcdef"]);
});

test("lane-a1 cmd: delayed expansion supports the same modifiers", () => {
  const r = runC(
    "setlocal EnableDelayedExpansion\nset S=abcdef\necho !S:~0,3!\necho !S:abc=Z!",
  );
  assert.deepEqual(cErrs(r), []);
  assert.deepEqual(cFlat(r), ["abc", "Zdef"]);
});

test("lane-a1 cmd: modifiers never fabricate values for unknown or undefined bases", () => {
  // 未確定値（%RANDOM%）は未確定のまま表示され、数字を捏造しない。
  const r = runC("echo %RANDOM:~0,3%");
  assert.deepEqual(cErrs(r), []);
  assert.match(cFlat(r)[0], /実行時に決まる/);
  assert.doesNotMatch(cAllText(r), /__CMD_VALUE_/);
  // 未定義変数は R26-N23 の裁定どおりリテラルのまま残る。
  assert.deepEqual(cFlat(runC("echo %NOPE:~0,3%")), ["%NOPE:~0,3%"]);
  // 解釈できない修飾子は名指しで止まる。
  assert.match(cErr(runC("set S=abc\necho %S:~x%")).message, /未対応：環境変数の部分文字列・置換展開/);
});

// ---------------------------------------------------------- cmd 未確定ラベル
test("lane-a1 cmd: goto/call with unknown labels stop as unconfirmed without leaking placeholders", () => {
  for (const [code, msg] of [
    ["goto %RANDOM%", /未確認：移動先のラベル/],
    ["call :%RANDOM%", /未確認：呼び出し先のラベル/],
  ]) {
    const r = runC(code);
    assert.match(cErr(r).message, msg, code);
    assert.doesNotMatch(cAllText(r), /__CMD_VALUE_/, code);
  }
  // 既知ラベルの通常動作は不変。
  const ok = runC("goto end\necho A\n:end\necho B");
  assert.deepEqual(cErrs(ok), []);
  assert.deepEqual(cFlat(ok), ["B"]);
});

// ---------------------------------------------------------- cmd 複合名停止の到達性
test("lane-a1 cmd: set-prefixed composite stops are reachable by their own names", () => {
  assert.match(
    cErr(runC("set shadow copy")).message,
    /未対応：set shadow copy（DiskShadow／VSS/,
  );
  assert.match(
    cErr(runC("set environmental variables")).message,
    /未対応：set environmental variables（setコマンドへの索引見出し/,
  );
  // 通常の set は影響を受けない。
  const r = runC("set S=hello\necho %S%");
  assert.deepEqual(cErrs(r), []);
  assert.deepEqual(cFlat(r), ["hello"]);
});

test("lane-a1 cmd: real-world typed forms reach their named stops", () => {
  assert.match(cErr(runC("manage-bde -status")).message, /未対応：manage bde（/);
  assert.match(cErr(runC("powershell_ise")).message, /未対応：powershell ise（/);
  assert.match(
    cErr(runC("rundll32 printui.dll,PrintUIEntry")).message,
    /未対応：rundll32 printui（/,
  );
});

test("lane-a1 cmd: stop reasons match each item's caution class", () => {
  const reasonOf = (name) => cmdStops.find((s) => s.name === name)?.reason;
  for (const n of ["add", "automount"])
    assert.match(reasonOf(n), /DiskPartの内部コマンド/, n);
  for (const n of ["add alias", "add volume", "exec", "mount", "revert", "expose"])
    assert.match(reasonOf(n), /DiskShadow／VSSの内部コマンド/, n);
  assert.match(reasonOf("diantz"), /キャビネット書庫/);
  for (const n of ["diskshadow", "vssadmin", "wbadmin"])
    assert.match(reasonOf(n), /バックアップ／復元やシャドウコピーの実状態/, n);
  assert.match(reasonOf("set environmental variables"), /索引見出し/);
  // 実行面でも expose が DiskShadow の理由で止まる。
  assert.match(cErr(runC("expose")).message, /未対応：expose（DiskShadow／VSS/);
});

// ---------------------------------------------------------- cmd scan（名前解決）
test("lane-a1 cmd: scan resolves catalog names case-insensitively and per segment", () => {
  cmd.__catalogReference = [...cmd.reference, ...cmdRefAdv];
  try {
    // CAT-01: 索引表記 Evntcmd がエンジン側の小文字名でも解決する。
    assert.ok(cmd.scan("evntcmd").includes("Evntcmd"));
    // CAT-02: 記号でしか書けない概念項目が演算子から解決する。
    assert.ok(cmd.scan("echo hi > out.txt").includes("リダイレクト"));
    const piped = cmd.scan('type notes.txt|find "x"');
    assert.ok(piped.includes("パイプ"));
    // CAT-03: パイプ後段のコマンドも解決する。
    assert.ok(piped.includes("find"));
    assert.ok(cmd.scan("echo a && sort data.csv").includes("sort"));
    // set /a 行の > は比較・シフト演算子でありリダイレクトではない。
    assert.ok(!cmd.scan("set /a x=1>2").includes("リダイレクト"));
  } finally {
    delete cmd.__catalogReference;
  }
});

test("lane-a1 cmd: template cmd-adv-text refs match its code", () => {
  const t = cmdTplAdv.find((x) => x.id === "cmd-adv-text");
  assert.deepEqual(t.refs, ["findstr", "sort"]);
});

// ---------------------------------------------------------- UI.Vision
const ui = getDefinition("uivision");
const uc = (Command, Target = "", Value = "") => ({ Command, Target, Value });
const runU = async (cmds, model) =>
  ui.simulate(
    JSON.stringify({ Name: "m", Commands: cmds }),
    model ?? structuredClone(ui.model.defaults),
  );
const uErr = (r) => r.error ?? r.paths[0]?.error;
const statusOK = (r) =>
  Object.entries(r.paths[0]?.vars ?? {}).find(
    ([k]) => k.toLowerCase() === "!statusok",
  )?.[1];

test("lane-a1 uv: !statusOK becomes false when a condition-position command errors", async () => {
  const r = await runU([
    uc("store", "5", "x"),
    uc("if", "${x.missing}"),
    uc("echo", "A"),
    uc("endIf"),
  ]);
  assert.ok(uErr(r), "条件エラーで停止すること");
  assert.equal(statusOK(r), false);
  // 正常な条件では true のまま。
  const ok = await runU([
    uc("store", "5", "x"),
    uc("if", "${x}===5"),
    uc("echo", "A"),
    uc("endIf"),
  ]);
  assert.equal(uErr(ok), undefined);
  assert.equal(statusOK(ok), true);
});

test("lane-a1 uv: statement input to storeEval stops with the subset message, not the operand", async () => {
  const r = await runU([uc("storeEval", "throw 1", "r")]);
  assert.match(uErr(r).message, /storeEval：return 式の部分集合のみ対応しています/);
});

test("lane-a1 uv: storedVars in expression position stops as unsupported on all surfaces", async () => {
  for (const cmds of [
    [uc("storeEval", "storedVars['n']", "r")],
    [uc("executeScript_Sandbox", "return storedVars;", "r")],
    [uc("if", "storedVars.n > 0"), uc("echo", "A"), uc("endIf")],
  ]) {
    const r = await runU(cmds);
    assert.match(
      uErr(r).message,
      /未対応：storedVars（式の語彙として提供していません）/,
      JSON.stringify(cmds),
    );
  }
  // 文字列リテラルの内側は対象にしない。
  const ok = await runU([uc("store", "storedVars", "s"), uc("echo", "${s}")]);
  assert.equal(uErr(ok), undefined);
});

test("lane-a1 uv: csvsave with an empty file name stops by name", async () => {
  const r = await runU([uc("csvsave", "", "")]);
  assert.match(uErr(r).message, /csvsave：保存先のCSVファイル名が空です/);
});

test("lane-a1 uv: completed stop reasons cover the cautions' targets", async () => {
  const cases = [
    [uc("XClick", "img.png"), /画像照合と実入力イベント/],
    [uc("XMoveRelative", "img.png"), /画像照合と実入力イベント/],
    [uc("XRunAndWait", "prog"), /外部プログラムの起動と完了待ち/],
    [uc("OCRExtractRelative", "img.png", "v"), /OCR（画面の文字認識）と画像照合/],
  ];
  for (const [cmdDef, re] of cases) {
    const r = await runU([cmdDef]);
    assert.match(uErr(r).message, re, cmdDef.Command);
  }
});
