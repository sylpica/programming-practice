import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import {
  advancedActionHandlers,
  advancedStops,
} from "../js/types/uivision/advanced-engine.js";
import { referenceAdvanced } from "../js/types/uivision/reference-advanced.js";

// 高度モード ブロックB1（UV-ENG班）: UI.Vision 高度コマンド64件の実装、
// 未対応44件の名指し停止、モデル拡張、基礎挙動の不変確認。
const ui = getDefinition("uivision");
const cmd = (Command, Target = "", Value = "") => ({ Command, Target, Value });
const OPEN = cmd("open", "https://example.test/form");
const run = async (cmds, model) =>
  ui.simulate(
    JSON.stringify({ Name: "m", Commands: cmds }),
    model ?? structuredClone(ui.model.defaults),
  );
const first = async (cmds, model) => {
  const r = await run(cmds, model);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1, JSON.stringify(r.paths));
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const errOf = (r) => r.error?.message ?? r.paths?.[0]?.error?.message;

function extModel() {
  const m = structuredClone(ui.model.defaults);
  const page = m.pages["https://example.test/form"];
  page.title = "フォーム画面";
  Object.assign(page.elements, {
    "id=agree": { tag: "input", checked: false },
    "id=locked": { tag: "input", value: "固定", readonly: true },
    "id=rich": { tag: "div", text: "旧テキスト", contentEditable: true },
    "id=country": {
      tag: "select",
      value: "",
      options: [
        { label: "日本", value: "jp" },
        { label: "アメリカ", value: "us" },
        { label: "ドイツ", value: "de" },
      ],
    },
    "id=alertBtn": { tag: "button", text: "警告", onClick: { alert: "注意してください" } },
    "id=confirmBtn": { tag: "button", text: "確認", onClick: { confirm: "よろしいですか" } },
    "id=promptBtn": { tag: "button", text: "入力", onClick: { prompt: "名前は？" } },
    "id=link": { tag: "a", text: "リンク", attributes: { target: "_blank" } },
    "id=hidden": { tag: "div", text: "隠し", visible: false },
    "id=msg": { tag: "div", text: "処理が完了しました" },
  });
  m.csvs = {
    "users.csv": "name,age\nAlice,30\nBob,25\n",
    "quoted.csv": 'a,"b,c"\n',
  };
  return m;
}
const el = (p, loc) => p.model.pages[p.model.url].elements[loc];

/* ---------- 件数 ---------- */
test("counts: 61 handlers + do/repeatIf/forEach = 64 supported, 44 stops", () => {
  assert.equal(Object.keys(advancedActionHandlers).length, 61);
  assert.equal(Object.keys(advancedStops).length, 44);
  for (const s of Object.values(advancedStops)) {
    assert.equal(s.status, "unsupported");
    assert.ok(s.reason.length > 0);
  }
});

/* ---------- assert / verify（変数） ---------- */
test("assert and verify on variables: success, hard fail, soft fail", async () => {
  const p = await first([OPEN, cmd("store", "hello", "greeting"), cmd("assert", "greeting", "hello")], extModel());
  assert.equal(p.vars["!statusOK"], true);
  const r = await run([OPEN, cmd("store", "hello", "greeting"), cmd("assert", "greeting", "bye"), cmd("echo", "AFTER")], extModel());
  assert.match(errOf(r), /assert：値が一致しません/);
  const q = await first([OPEN, cmd("store", "hello", "greeting"), cmd("verify", "greeting", "bye"), cmd("echo", "AFTER")], extModel());
  assert.deepEqual(q.outputs.map((o) => o.text), ["AFTER"]);
  assert.equal(q.vars["!statusOK"], false);
  assert.ok(q.trace.some((t) => t.kind === "error" && /verify/.test(t.text)));
  // glob パターンも使える
  await first([OPEN, cmd("store", "hello", "greeting"), cmd("assert", "greeting", "he*")], extModel());
  // 存在しない変数は assert で名指し停止、verify では継続
  const r2 = await run([OPEN, cmd("assert", "missingVar", "x")], extModel());
  assert.match(errOf(r2), /変数がありません：missingVar/);
});

/* ---------- ダイアログ系 ---------- */
test("dialogs: click records dialog, assert/verify dialog commands consume it", async () => {
  const p = await first([OPEN, cmd("click", "id=alertBtn"), cmd("assertAlert", "注意してください")], extModel());
  assert.equal(p.model.dialog, undefined);
  const p2 = await first([OPEN, cmd("click", "id=alertBtn")], extModel());
  assert.deepEqual(p2.model.dialog, { type: "alert", text: "注意してください" });
  assert.ok(p2.groups.some((g) => g.title === "ダイアログ・表示"));
  // 型違いは assert で停止
  const r = await run([OPEN, cmd("click", "id=alertBtn"), cmd("assertConfirmation", "注意してください")], extModel());
  assert.match(errOf(r), /assertConfirmation/);
  // verify は継続
  const q = await first([OPEN, cmd("click", "id=confirmBtn"), cmd("verifyConfirmation", "違います"), cmd("echo", "AFTER")], extModel());
  assert.deepEqual(q.outputs.map((o) => o.text), ["AFTER"]);
  assert.equal(q.vars["!statusOK"], false);
  // ダイアログが無い状態での assertPrompt は停止
  const r2 = await run([OPEN, cmd("assertPrompt", "名前は？")], extModel());
  assert.match(errOf(r2), /ダイアログが表示されていません/);
});

test("answerOnNextPrompt supplies the prompt dialog answer", async () => {
  const p = await first(
    [OPEN, cmd("answerOnNextPrompt", "たろう"), cmd("click", "id=promptBtn"), cmd("assertPrompt", "名前は？")],
    extModel(),
  );
  assert.equal(p.vars["!statusOK"], true);
  const q = await first([OPEN, cmd("answerOnNextPrompt", "たろう"), cmd("click", "id=promptBtn")], extModel());
  assert.equal(q.model.dialog.answer, "たろう");
});

/* ---------- checked / editable / present / text / title / value ---------- */
test("check/uncheck and assertChecked family", async () => {
  const p = await first([OPEN, cmd("check", "id=agree"), cmd("assertChecked", "id=agree")], extModel());
  assert.equal(el(p, "id=agree").checked, true);
  const q = await first([OPEN, cmd("check", "id=agree"), cmd("uncheck", "id=agree"), cmd("assertNOTChecked", "id=agree")], extModel());
  assert.equal(el(q, "id=agree").checked, false);
  const r = await run([OPEN, cmd("assertChecked", "id=agree")], extModel());
  assert.match(errOf(r), /assertChecked/);
  const s = await first([OPEN, cmd("verifyNOTChecked", "id=agree"), cmd("verifyChecked", "id=agree"), cmd("echo", "AFTER")], extModel());
  assert.deepEqual(s.outputs.map((o) => o.text), ["AFTER"]);
  assert.equal(s.vars["!statusOK"], false);
});

test("editable family honours readonly and contentEditable", async () => {
  await first([OPEN, cmd("assertEditable", "id=name"), cmd("assertNOTEditable", "id=locked"), cmd("assertEditable", "id=rich")], extModel());
  const r = await run([OPEN, cmd("assertEditable", "id=locked")], extModel());
  assert.match(errOf(r), /assertEditable/);
  const q = await first([OPEN, cmd("verifyEditable", "id=locked"), cmd("echo", "AFTER")], extModel());
  assert.equal(q.vars["!statusOK"], false);
});

test("element present family and verifyText", async () => {
  await first(
    [OPEN, cmd("assertElementPresent", "id=msg"), cmd("assertElementNOTPresent", "id=absent"), cmd("verifyText", "id=msg", "処理が*しました")],
    extModel(),
  );
  const r = await run([OPEN, cmd("assertElementPresent", "id=absent")], extModel());
  assert.match(errOf(r), /assertElementPresent/);
  const q = await first([OPEN, cmd("verifyElementPresent", "id=absent"), cmd("verifyText", "id=msg", "不一致"), cmd("echo", "AFTER")], extModel());
  assert.deepEqual(q.outputs.map((o) => o.text), ["AFTER"]);
  assert.equal(q.vars["!statusOK"], false);
});

test("assertTitle/verifyTitle and assertValue/verifyValue", async () => {
  await first([OPEN, cmd("assertTitle", "フォーム画面"), cmd("verifyTitle", "フォーム*")], extModel());
  const r = await run([OPEN, cmd("assertTitle", "別画面")], extModel());
  assert.match(errOf(r), /assertTitle/);
  const p = await first([OPEN, cmd("type", "id=name", "学習者"), cmd("assertValue", "id=name", "学習者")], extModel());
  assert.equal(p.vars["!statusOK"], true);
  const q = await first([OPEN, cmd("verifyValue", "id=name", "別人"), cmd("echo", "AFTER")], extModel());
  assert.equal(q.vars["!statusOK"], false);
});

/* ---------- click 系・その他アクション ---------- */
test("clickAndWait applies onClick effects; clickAt notes coordinates", async () => {
  const p = await first([OPEN, cmd("clickAndWait", "id=submit"), cmd("storeText", "id=result", "Result")], extModel());
  assert.equal(p.vars.Result, "完了");
  const q = await first([OPEN, cmd("clickAt", "id=submit", "10,10")], extModel());
  assert.ok(q.trace.some((t) => /10,10/.test(t.text)));
});

test("comment/label/pause/highlight/mouseOver/refresh complete without state change", async () => {
  const p = await first(
    [OPEN, cmd("comment", "メモ"), cmd("label", "START"), cmd("pause", "500"), cmd("highlight", "id=msg"), cmd("mouseOver", "id=msg"), cmd("refresh"), cmd("echo", "OK")],
    extModel(),
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["OK"]);
  const r = await run([OPEN, cmd("pause", "abc")], extModel());
  assert.match(errOf(r), /pause/);
});

test("dragAndDropToObject and editContent", async () => {
  const p = await first([OPEN, cmd("dragAndDropToObject", "id=msg", "id=result"), cmd("editContent", "id=rich", "新テキスト"), cmd("storeText", "id=rich", "T")], extModel());
  assert.equal(p.vars.T, "新テキスト");
  const r = await run([OPEN, cmd("dragAndDropToObject", "id=msg", "id=absent")], extModel());
  assert.match(errOf(r), /モデルに要素がありません/);
});

test("prompt command uses reserved answer only; default alone stays unknown", async () => {
  const p = await first([OPEN, cmd("answerOnNextPrompt", "予約値"), cmd("prompt", "名前は？@既定", "ans")], extModel());
  assert.equal(p.vars.ans, "予約値");
  // B1A-13: @既定値だけでは確定しない（入力欄の初期表示にすぎない）
  const q = await first([OPEN, cmd("prompt", "名前は？@既定", "ans")], extModel());
  assert.equal(typeof q.vars.ans, "object"); // 未確定値のまま捏造しない
  const s = await first([OPEN, cmd("prompt", "名前は？", "ans")], extModel());
  assert.equal(typeof s.vars.ans, "object"); // 未確定値のまま捏造しない
});

test("ThrowError stops with the given message", async () => {
  const r = await run([OPEN, cmd("ThrowError", "独自エラーです")], extModel());
  assert.match(errOf(r), /独自エラーです/);
});

/* ---------- select 系 ---------- */
test("select by label/value/index, addSelection/removeSelection", async () => {
  const p = await first([OPEN, cmd("select", "id=country", "label=アメリカ")], extModel());
  assert.equal(el(p, "id=country").value, "us");
  assert.deepEqual(el(p, "id=country").options.map((o) => Boolean(o.selected)), [false, true, false]);
  const q = await first([OPEN, cmd("select", "id=country", "value=de")], extModel());
  assert.equal(el(q, "id=country").value, "de");
  const s = await first([OPEN, cmd("select", "id=country", "index=0")], extModel());
  assert.equal(el(s, "id=country").value, "jp");
  const t = await first(
    [OPEN, cmd("select", "id=country", "label=日本"), cmd("addSelection", "id=country", "label=ドイツ"), cmd("removeSelection", "id=country", "label=日本")],
    extModel(),
  );
  assert.deepEqual(el(t, "id=country").options.map((o) => Boolean(o.selected)), [false, false, true]);
  const u = await first([OPEN, cmd("selectAndWait", "id=country", "label=*メ*")], extModel());
  assert.equal(el(u, "id=country").value, "us");
  const r = await run([OPEN, cmd("select", "id=country", "label=フランス")], extModel());
  assert.match(errOf(r), /選択肢が見つかりません/);
});

test("sendKeys appends without erasing and accepts KEY tokens", async () => {
  const p = await first(
    [OPEN, cmd("type", "id=name", "ab"), cmd("sendKeys", "id=name", "cd"), cmd("sendKeys", "id=name", "${KEY_ENTER}"), cmd("storeValue", "id=name", "V")],
    extModel(),
  );
  assert.equal(p.vars.V, "abcd");
});

test("setWindowSize and resize set viewport and extend groups", async () => {
  const p = await first([OPEN, cmd("setWindowSize", "1366x768")], extModel());
  assert.deepEqual(p.model.viewport, { width: 1366, height: 768 });
  assert.ok(p.groups.some((g) => g.title === "ダイアログ・表示"));
  const q = await first([OPEN, cmd("resize", "800@600")], extModel());
  assert.deepEqual(q.model.viewport, { width: 800, height: 600 });
  const r = await run([OPEN, cmd("setWindowSize", "abc")], extModel());
  assert.match(errOf(r), /setWindowSize/);
});

/* ---------- store 系 ---------- */
test("storeAttribute, storeChecked, storeTitle, storeXpathCount", async () => {
  const p = await first(
    [OPEN, cmd("storeAttribute", "id=link@target", "T"), cmd("storeChecked", "id=agree", "C"), cmd("storeTitle", "", "Ti"), cmd("storeXpathCount", "id=msg", "N1"), cmd("storeXpathCount", "id=absent", "N0")],
    extModel(),
  );
  assert.equal(p.vars.T, "_blank");
  assert.equal(p.vars.C, false);
  assert.equal(p.vars.Ti, "フォーム画面");
  assert.equal(p.vars.N1, 1);
  assert.equal(p.vars.N0, 0);
  const q = await first([OPEN, cmd("storeAttribute", "id=absent@href", "T"), cmd("echo", "AFTER")], extModel());
  assert.equal(q.vars.T, "#LNF");
  assert.equal(q.vars["!statusOK"], false);
});

/* ---------- executeScript / storeEval ---------- */
test("executeScript and storeEval use the Sandbox return-expression subset", async () => {
  const p = await first(
    [OPEN, cmd("store", "2", "x"), cmd("executeScript", "return Number(${x}) + 3;", "y"), cmd("storeEval", "${x} * 10", "z")],
    extModel(),
  );
  assert.equal(p.vars.y, 5);
  assert.equal(p.vars.z, 20);
  const r = await run([OPEN, cmd("executeScript", "return window.location.href;", "y")], extModel());
  assert.match(errOf(r), /未定義の名前：window/);
  const r2 = await run([OPEN, cmd("storeEval", "var a = 1; return a;", "y")], extModel());
  assert.ok(errOf(r2), "複文は部分集合外として停止する");
});

/* ---------- CSV 系 ---------- */
test("csvRead reads the line chosen by !csvReadLineNumber and sets status/maxRow", async () => {
  const p = await first(
    [OPEN, cmd("store", "2", "!csvReadLineNumber"), cmd("csvRead", "users.csv"), cmd("echo", "${!COL1}")],
    extModel(),
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["Alice"]);
  assert.equal(p.vars["!csvReadStatus"], "OK");
  assert.equal(p.vars["!csvReadMaxRow"], 3);
  const q = await first([OPEN, cmd("csvRead", "quoted.csv"), cmd("echo", "${!COL2}")], extModel());
  assert.deepEqual(q.outputs.map((o) => o.text), ["b,c"]);
  const r = await run([OPEN, cmd("csvRead", "missing.csv")], extModel());
  assert.match(errOf(r), /モデルにCSVがありません/);
});

test("csvRead at EOF soft-fails with status Error and continues", async () => {
  const p = await first(
    [OPEN, cmd("store", "99", "!csvReadLineNumber"), cmd("csvRead", "users.csv"), cmd("echo", "AFTER")],
    extModel(),
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["AFTER"]);
  assert.equal(p.vars["!csvReadStatus"], "Error");
  assert.equal(p.vars["!statusOK"], false);
});

test("csvReadArray and csvsave/csvsaveArray round-trip through the model", async () => {
  const p = await first([OPEN, cmd("csvReadArray", "users.csv", "rows")], extModel());
  assert.deepEqual(p.vars.rows, [["name", "age"], ["Alice", "30"], ["Bob", "25"]]);
  const q = await first(
    [OPEN, cmd("store", "A", "!csvLine"), cmd("store", "B", "!csvLine"), cmd("csvsave", "out.csv"), cmd("csvReadArray", "out.csv", "rows")],
    extModel(),
  );
  assert.equal(q.model.csvs["out.csv"], "A,B\n");
  assert.deepEqual(q.vars.rows, [["A", "B"]]);
  const s = await first(
    [OPEN, cmd("executeScript_Sandbox", 'return [["x","1"],["y","2"]];', "arr"), cmd("csvsaveArray", "arr", "data.csv"), cmd("csvReadArray", "data.csv", "back")],
    extModel(),
  );
  assert.equal(s.model.csvs["data.csv"], "x,1\ny,2\n");
  assert.deepEqual(s.vars.back, [["x", "1"], ["y", "2"]]);
});

/* ---------- フロー: forEach / do...repeatIf ---------- */
test("forEach iterates the array variable and honours break", async () => {
  const p = await first(
    [OPEN, cmd("executeScript_Sandbox", 'return ["a","b","c"];', "arr"), cmd("forEach", "arr", "item"), cmd("echo", "${item}"), cmd("end")],
    extModel(),
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["a", "b", "c"]);
  const q = await first(
    [OPEN, cmd("executeScript_Sandbox", 'return ["a","b","c"];', "arr"), cmd("forEach", "arr", "item"), cmd("if", '"${item}" == "b"'), cmd("break"), cmd("end"), cmd("echo", "${item}"), cmd("end"), cmd("echo", "DONE")],
    extModel(),
  );
  assert.deepEqual(q.outputs.map((o) => o.text), ["a", "DONE"]);
  const r = await run([OPEN, cmd("forEach", "missingArr", "item"), cmd("echo", "x"), cmd("end")], extModel());
  assert.match(errOf(r), /変数がありません：missingArr/);
});

test("do...repeatIf is a bottom-tested loop", async () => {
  const p = await first(
    [OPEN, cmd("store", "0", "count"), cmd("do"), cmd("executeScript_Sandbox", "return Number(${count}) + 1;", "count"), cmd("repeatIf", "${count} < 3"), cmd("echo", "${count}")],
    extModel(),
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["3"]);
  // 条件が最初から偽でも本体は1回実行される
  const q = await first(
    [OPEN, cmd("store", "5", "count"), cmd("do"), cmd("echo", "once"), cmd("repeatIf", "${count} < 3")],
    extModel(),
  );
  assert.deepEqual(q.outputs.map((o) => o.text), ["once"]);
});

test("repeatIf without do and do without repeatIf are named errors", async () => {
  const r = await run([OPEN, cmd("repeatIf", "true")], extModel());
  assert.match(errOf(r), /対応する開始アクションがありません/);
  const r2 = await run([OPEN, cmd("do"), cmd("echo", "x")], extModel());
  assert.match(errOf(r2), /do に対応するrepeatIfがありません/);
});

/* ---------- 待機系 ---------- */
test("wait family checks the static model honestly", async () => {
  await first(
    [OPEN, cmd("waitForElementPresent", "id=msg"), cmd("waitForElementToLoad", "id=msg"), cmd("waitForPageToLoad"), cmd("waitForVisible", "id=msg")],
    extModel(),
  );
  const r = await run([OPEN, cmd("waitForElementPresent", "id=absent")], extModel());
  assert.match(errOf(r), /waitForElementPresent/);
  const r2 = await run([OPEN, cmd("waitForVisible", "id=hidden")], extModel());
  assert.match(errOf(r2), /表示されていません/);
});

/* ---------- 未対応の名指し停止 ---------- */
test("unsupported commands stop by name, case-insensitively", async () => {
  for (const name of ["XClick", "OCRSearch", "executeAsyncScript", "gotoLabel", "storedVars", "visualAssert", "selectWindow", "run"]) {
    const r = await run([OPEN, cmd(name)], extModel());
    assert.match(errOf(r), new RegExp("未対応：" + name), name);
  }
  const lower = await run([OPEN, cmd("xclick")], extModel());
  assert.match(errOf(lower), /未対応：XClick/);
  const upper = await first([OPEN, cmd("CHECK", "id=agree"), cmd("ASSERTCHECKED", "id=agree")], extModel());
  assert.equal(el(upper, "id=agree").checked, true);
});

/* ---------- scan ---------- */
test("scan resolves advanced command names to canonical names", () => {
  const names = ui.scan(JSON.stringify({ Commands: [cmd("open"), cmd("CHECK"), cmd("csvRead"), cmd("XClick"), cmd("forEach"), cmd("unknownCmd")] }));
  assert.deepEqual(names, ["open", "check", "csvRead", "XClick", "forEach"]);
});

/* ---------- 基礎挙動の不変確認 ---------- */
test("basic behaviour is unchanged: groups, assertText, reference size", async () => {
  const p = await first([OPEN, cmd("store", "0", "count"), cmd("click", "id=submit")]);
  assert.deepEqual(p.groups.map((g) => g.title), ["変数", "モデルページ・入力値"]);
  assert.deepEqual(p.groups[1].entries.map((e) => e[0]), ["URL", "要素", "クリック履歴"]);
  const q = await first([OPEN, cmd("click", "id=submit"), cmd("assertText", "id=result", "完了")]);
  assert.equal(q.vars["!statusOK"], true);
  assert.equal(ui.reference.length, 25);
  // 旧来モデル（title/csvs 無し）も従来どおり受理される
  const r = await run([OPEN, cmd("echo", "hi")], structuredClone(ui.model.defaults));
  assert.equal(r.error, undefined);
});

test("model validation names csvs/title type errors but stays permissive otherwise", async () => {
  const bad = extModel();
  bad.csvs = "not-an-object";
  const r = await run([OPEN], bad);
  assert.match(errOf(r), /csvs/);
  const bad2 = extModel();
  bad2.pages["https://example.test/form"].title = 42;
  const r2 = await run([OPEN], bad2);
  assert.match(errOf(r2), /title/);
});

/* ---------- B1監査修正の回帰テスト（UV分） ---------- */
const refItem = (name) => referenceAdvanced.find((r) => r.name === name);

test("B1A-01 resize accepts the official @ form; size parsing is per-command", async () => {
  const p = await first([OPEN, cmd("resize", "375@667")], extModel());
  assert.deepEqual(p.model.viewport, { width: 375, height: 667 });
  const q = await first([OPEN, cmd("resize", "1024@768")], extModel());
  assert.deepEqual(q.model.viewport, { width: 1024, height: 768 });
  // ドキュメント上の @@（@ のエスケープ表記）も受理する
  const q2 = await first([OPEN, cmd("resize", "1024@@768")], extModel());
  assert.deepEqual(q2.model.viewport, { width: 1024, height: 768 });
  // resize に x 形式は使えない（@ 形式を案内する）
  const r = await run([OPEN, cmd("resize", "375x667")], extModel());
  assert.match(errOf(r), /resize：サイズは「幅@高さ」/);
  // setWindowSize は従来どおり x 形式で、@ 形式は使えない
  const ok = await first([OPEN, cmd("setWindowSize", "375x667")], extModel());
  assert.deepEqual(ok.model.viewport, { width: 375, height: 667 });
  const r2 = await run([OPEN, cmd("setWindowSize", "375@667")], extModel());
  assert.match(errOf(r2), /setWindowSize：サイズは「幅x高さ」/);
  // リファレンス resize 項目自身の例が defaults で完走する
  const ex = JSON.parse(refItem("resize").example);
  const rr = await run(ex.Commands);
  assert.equal(rr.error, undefined, JSON.stringify(rr.error));
  assert.equal(rr.paths[0].error, undefined, JSON.stringify(rr.paths[0].error));
});

test("B1A-03 structural commands resolve fully case-insensitively", async () => {
  for (const name of ["FOREACH", "Foreach", "forEach", "foreach"]) {
    const p = await first(
      [OPEN, cmd("executeScript_Sandbox", 'return ["a","b"];', "arr"), cmd(name, "arr", "item"), cmd("echo", "${item}"), cmd("end")],
      extModel(),
    );
    assert.deepEqual(p.outputs.map((o) => o.text), ["a", "b"], name);
  }
  for (const [doName, repName] of [["DO", "REPEATIF"], ["Do", "RepeatIf"], ["do", "repeatif"], ["DO", "repeatIf"]]) {
    const p = await first(
      [OPEN, cmd("store", "0", "count"), cmd(doName), cmd("executeScript_Sandbox", "return Number(${count}) + 1;", "count"), cmd(repName, "${count} < 3"), cmd("echo", "${count}")],
      extModel(),
    );
    assert.deepEqual(p.outputs.map((o) => o.text), ["3"], `${doName}/${repName}`);
  }
  // repeatIf 単独は、名前と原因（対応する do が必要）を含む文言で止まる
  for (const name of ["REPEATIF", "RepeatIf", "repeatif", "repeatIf"]) {
    const r = await run([OPEN, cmd(name, "true")], extModel());
    assert.match(errOf(r), /repeatIf には対応する do が必要です/, name);
    assert.doesNotMatch(errOf(r), /このコマンドは説明に対応していません/, name);
  }
  // do に対応する repeatIf が無い場合は do 側を名指しする
  const r2 = await run([OPEN, cmd("do"), cmd("echo", "x")], extModel());
  assert.match(errOf(r2), /do に対応するrepeatIfがありません/);
});

test("B1A-13 prompt @default alone is not a confirmed answer (reference caution)", async () => {
  const q = await first([OPEN, cmd("prompt", "名前は？@既定", "ans")], extModel());
  assert.equal(typeof q.vars.ans, "object");
  assert.notEqual(q.vars.ans, "既定");
  const p = await first([OPEN, cmd("answerOnNextPrompt", "予約値"), cmd("prompt", "名前は？@既定", "ans")], extModel());
  assert.equal(p.vars.ans, "予約値");
  assert.match(refItem("prompt").caution, /既定値は入力欄の初期表示であり、回答は実行時に決まります/);
  assert.match(refItem("prompt").caution, /answerOnNextPromptで予約した値だけが確定します/);
});

test("B1A-14 sendKeys stops by name on non-ENTER KEY tokens, keeps normal text", async () => {
  for (const token of ["${KEY_DOWN}", "${KEY_FOO}", "${KEY_TAB}"]) {
    const r = await run([OPEN, cmd("type", "id=name", "ab"), cmd("sendKeys", "id=name", token)], extModel());
    assert.match(errOf(r), new RegExp("未対応：" + token.replace(/[$ {}]/g, "\\$&")), token);
    assert.match(errOf(r), /公式に使える特殊キーは \$\{KEY_ENTER\} のみです/, token);
  }
  // 通常文字と ${KEY_ENTER} の送信挙動は従来どおり
  const p = await first(
    [OPEN, cmd("type", "id=name", "ab"), cmd("sendKeys", "id=name", "cd"), cmd("sendKeys", "id=name", "${KEY_ENTER}"), cmd("storeValue", "id=name", "V")],
    extModel(),
  );
  assert.equal(p.vars.V, "abcd");
});

test("B1A-15 unsupported stops are reached before variable expansion", async () => {
  // XType の通常形（Target に ${KEY_ENTER}）が展開エラーに遮られない
  const r = await run([OPEN, cmd("XType", "hello${KEY_ENTER}")], extModel());
  assert.match(errOf(r), /未対応：XType/);
  assert.doesNotMatch(errOf(r), /変数がありません/);
  const lower = await run([OPEN, cmd("xtype", "hello${KEY_ENTER}")], extModel());
  assert.match(errOf(lower), /未対応：XType/);
  // B1A-19: gotoIf のリファレンス例（未定義変数 count を含む）が自項目の停止に届く
  const ex = JSON.parse(refItem("gotoIf").example);
  const rg = await run(ex.Commands);
  assert.match(errOf(rg), /未対応：gotoIf/);
  assert.doesNotMatch(errOf(rg), /変数がありません/);
  // XType のリファレンス例も自項目の停止に届く
  const ex2 = JSON.parse(refItem("XType").example);
  const rx = await run(ex2.Commands);
  assert.match(errOf(rx), /未対応：XType/);
  // ハンドラ対象コマンドの展開エラーは従来どおり（停止照合の先行で変えない）
  const rh = await run([OPEN, cmd("echo", "${missingVar}")], extModel());
  assert.match(errOf(rh), /変数がありません：missingVar/);
});

test("B1A-16 semicolons inside string literals are not statement separators", async () => {
  const p = await first(
    [OPEN, cmd("storeEval", '"a;b"', "y"), cmd("executeScript", '"a;b"', "z"), cmd("storeEval", "'c;d'", "w")],
    extModel(),
  );
  assert.equal(p.vars.y, "a;b");
  assert.equal(p.vars.z, "a;b");
  assert.equal(p.vars.w, "c;d");
  const q = await first([OPEN, cmd("executeScript", 'return "a;b";', "y")], extModel());
  assert.equal(q.vars.y, "a;b");
  // リテラル外の ";" を含む複文は従来どおり部分集合外として止まる
  const r = await run([OPEN, cmd("storeEval", "var a = 1; return a;", "y")], extModel());
  assert.match(errOf(r), /return 式の部分集合のみ対応しています/);
});

test("B1A-17 pause accepts an empty Target like 0", async () => {
  const p = await first([OPEN, cmd("pause", ""), cmd("pause", "0"), cmd("echo", "AFTER")], extModel());
  assert.deepEqual(p.outputs.map((o) => o.text), ["AFTER"]);
  assert.ok(p.trace.some((t) => /0ミリ秒待機します/.test(t.text)));
  const r = await run([OPEN, cmd("pause", "abc")], extModel());
  assert.match(errOf(r), /pause：待機時間（ミリ秒）が不正です/);
  assert.match(refItem("pause").caution, /Targetが空の場合も不正とはせず、0と同様に待機指定として受理します/);
});

test("B1A-18 storeXpathCount caution discloses exact-key counting, no XPath evaluation", () => {
  assert.match(refItem("storeXpathCount").caution, /XPath は評価せず、Target と完全一致するロケーターキーを持つ要素だけを数えます/);
});

test("B1A-19 assertNOTEditable example passes on base defaults (id=result div)", async () => {
  const item = refItem("assertNOTEditable");
  assert.match(item.example, /id=result/);
  const ex = JSON.parse(item.example);
  const r = await run(ex.Commands); // defaults モデルで検証が成立する
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  assert.equal(r.paths[0].vars["!statusOK"], true);
});

/* ---------- B1再監査修正の回帰テスト（UV分・第2ラウンド） ---------- */
test("B1B-01 forEach close commands resolve case-insensitively", async () => {
  for (const close of ["End", "END", "EndIf", "EndWhile", "ENDIF", "ENDWHILE", "eNd"]) {
    const p = await first(
      [OPEN, cmd("executeScript_Sandbox", 'return ["a","b"];', "arr"), cmd("forEach", "arr", "item"), cmd("echo", "${item}"), cmd(close)],
      extModel(),
    );
    assert.deepEqual(p.outputs.map((o) => o.text), ["a", "b"], close);
  }
  // 開始側の大小形（FOREACH）と閉じ側の大小形の組合せも完走する
  const p = await first(
    [OPEN, cmd("executeScript_Sandbox", 'return ["a"];', "arr"), cmd("FOREACH", "arr", "item"), cmd("echo", "${item}"), cmd("End")],
    extModel(),
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["a"]);
  // 入れ子: forEach の中の if を EndIf で閉じ、外側を End で閉じる
  const q = await first(
    [OPEN, cmd("executeScript_Sandbox", 'return ["a","b"];', "arr"), cmd("forEach", "arr", "item"), cmd("if", '"${item}" == "a"'), cmd("echo", "A"), cmd("EndIf"), cmd("End")],
    extModel(),
  );
  assert.deepEqual(q.outputs.map((o) => o.text), ["A"]);
  // 閉じが本当に無い場合は従来どおり「Endがありません」で止まる（真の欠落）
  const r = await run([OPEN, cmd("forEach", "arr", "item"), cmd("echo", "x")], extModel());
  assert.match(errOf(r), /ループに対応するEndがありません/);
});

test("B1B-01 end case-insensitivity reaches basic block closes only; starts stay case-sensitive", async () => {
  // 波及範囲: classify は共有のため、基礎ブロック if／while／times の
  // 閉じも大小形で閉じる（基礎テストと矛盾しないことをここで固定する）
  const p = await first(
    [OPEN, cmd("store", "0", "count"), cmd("if", "${count} == 0"), cmd("echo", "zero"), cmd("End")],
    extModel(),
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["zero"]);
  const q = await first(
    [OPEN, cmd("store", "0", "count"), cmd("while", "${count} < 3"), cmd("executeScript_Sandbox", "return Number(${count}) + 1;", "count"), cmd("EndWhile"), cmd("echo", "${count}")],
    extModel(),
  );
  assert.deepEqual(q.outputs.map((o) => o.text), ["3"]);
  const s = await first([OPEN, cmd("times", "2"), cmd("echo", "x"), cmd("END")], extModel());
  assert.deepEqual(s.outputs.map((o) => o.text), ["x", "x"]);
  // 開始コマンドの大小区別は変えない: IF／WHILE／TIMES 大文字形は
  // ブロック開始として受理されずエラーになる
  for (const cmds of [
    [cmd("store", "0", "count"), cmd("IF", "${count} == 0"), cmd("echo", "zero"), cmd("end")],
    [cmd("store", "0", "count"), cmd("WHILE", "${count} < 3"), cmd("echo", "x"), cmd("end")],
    [cmd("TIMES", "2"), cmd("echo", "x"), cmd("end")],
  ]) {
    const r = await run([OPEN, ...cmds], extModel());
    assert.ok(errOf(r), JSON.stringify(cmds.map((c) => c.Command)));
  }
  // else の大小区別も変えない: ELSE 大文字形は真のパスで従来どおり止まる
  const re = await run(
    [OPEN, cmd("store", "0", "count"), cmd("if", "${count} == 0"), cmd("echo", "zero"), cmd("ELSE"), cmd("echo", "other"), cmd("end")],
    extModel(),
  );
  assert.match(errOf(re), /このコマンドは説明に対応していません：ELSE/);
});

test("B1B-06 csvReadArray example runs to completion on a model with the CSV", async () => {
  const item = refItem("csvReadArray");
  // 添字つき補間 ${rows[0][0]} は例から除かれている
  assert.ok(!item.example.includes("${rows[0][0]}"), item.example);
  assert.match(item.caution, /添字つき補間は扱いません/);
  const ex = JSON.parse(item.example);
  // 再監査の再現モデル（csvs にサンプルCSVを持つモデル）で完走する
  const model = structuredClone(ui.model.defaults);
  model.csvs = { "data.csv": "name,age\nAlice,30\n" };
  const r = await run(ex.Commands, model);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  assert.deepEqual(r.paths[0].vars.rows, [["name", "age"], ["Alice", "30"]]);
  // executeScript_Sandbox の式の中の添字アクセスで先頭セルが取れる
  assert.equal(r.paths[0].vars.first, "name");
  assert.deepEqual(r.paths[0].outputs.map((o) => o.text), ["name"]);
  // CSV の無い defaults では、虚偽の「変数がありません」ではなく
  // CSV 不在の正直なモデルエラーで止まる
  const r2 = await run(ex.Commands);
  assert.match(errOf(r2), /csvReadArray：モデルにCSVがありません：data\.csv/);
  assert.doesNotMatch(errOf(r2), /変数がありません/);
});

/* ---------- B1C-01: scan が閉じコマンドの大小形を解決する ---------- */

test("B1C-01 scan resolves End/END/EndIf/EndWhile case forms like classify", async () => {
  for (const closer of ["End", "END", "eNd"])
    assert.deepEqual(
      ui.scan(JSON.stringify({ Commands: [cmd("forEach", "${items}", "item"), cmd("echo", "x"), cmd(closer)] })),
      ["forEach", "echo", "end"],
      closer,
    );
  assert.deepEqual(
    ui.scan(JSON.stringify({ Commands: [cmd("if", "true"), cmd("echo", "x"), cmd("EndIf")] })),
    ["if", "echo", "endIf"],
  );
  assert.deepEqual(
    ui.scan(JSON.stringify({ Commands: [cmd("while", "false"), cmd("ENDWHILE")] })),
    ["while", "endWhile"],
  );
});

/* ---------- B1G-06〜08／観察事項3: 未確定値の意味文字列（第3ラウンド） ---------- */
// 未確定変数 ${ans} は prompt（Target=質問、Value=ans）で作る（監査所見の作り方）。
const UNKNOWN_SETUP = [OPEN, cmd("prompt", "q?", "ans")];

test("B1G-06 editContent/sendKeys with an unknown Value stop as unconfirmed and do not write", async () => {
  const r = await run([...UNKNOWN_SETUP, cmd("editContent", "id=result", "${ans}")], extModel());
  assert.match(errOf(r), /未確認：editContentの値が確定していません/);
  assert.doesNotMatch(errOf(r), /\[object Object\]/);
  assert.equal(el(r.paths[0], "id=result").text, "未送信");
  const r2 = await run(
    [...UNKNOWN_SETUP, cmd("type", "id=name", "ab"), cmd("sendKeys", "id=name", "${ans}")],
    extModel(),
  );
  assert.match(errOf(r2), /未確認：sendKeysの値が確定していません/);
  assert.equal(el(r2.paths[0], "id=name").value, "ab");
  // 埋め込み形 x${ans}y でも値全体が未確定として止まる
  const r3 = await run(
    [...UNKNOWN_SETUP, cmd("type", "id=name", "ab"), cmd("sendKeys", "id=name", "x${ans}y")],
    extModel(),
  );
  assert.match(errOf(r3), /未確認：sendKeysの値が確定していません/);
  assert.equal(el(r3.paths[0], "id=name").value, "ab");
  // 確定値の経路は従来どおり書き込める
  const p = await first([OPEN, cmd("editContent", "id=rich", "新テキスト"), cmd("sendKeys", "id=name", "xy")], extModel());
  assert.equal(el(p, "id=rich").text, "新テキスト");
  assert.equal(el(p, "id=name").value, "xy");
});

test("B1G-07 csvsave/csvsaveArray with an unknown file name stop as unconfirmed and create no CSV", async () => {
  const r = await run([...UNKNOWN_SETUP, cmd("store", "A", "!csvLine"), cmd("csvsave", "${ans}")], extModel());
  assert.match(errOf(r), /未確認：csvsaveのファイル名が確定していません/);
  assert.ok(!("[object Object]" in (r.paths[0].model.csvs ?? {})));
  const r2 = await run(
    [OPEN, cmd("executeScript_Sandbox", 'return [["x","1"]];', "arr"), cmd("prompt", "q?", "ans"), cmd("csvsaveArray", "arr", "${ans}")],
    extModel(),
  );
  assert.match(errOf(r2), /未確認：csvsaveArrayのファイル名が確定していません/);
  assert.ok(!("[object Object]" in (r2.paths[0].model.csvs ?? {})));
  // 確定値のファイル名は従来どおり保存できる
  const p = await first([OPEN, cmd("store", "A", "!csvLine"), cmd("csvsave", "out.csv")], extModel());
  assert.equal(p.model.csvs["out.csv"], "A\n");
});

test("B1G-07 storeXpathCount with an unknown locator does not save a confirmed 0", async () => {
  const r = await run([...UNKNOWN_SETUP, cmd("storeXpathCount", "${ans}", "cnt")], extModel());
  assert.match(errOf(r), /未確認：storeXpathCountのロケーターが確定していません/);
  assert.equal(r.paths[0].vars.cnt, undefined);
  // 確定ロケーターは従来どおり数える（存在しない要素は 0 が正直な確定値）
  const p = await first([OPEN, cmd("storeXpathCount", "id=msg", "N1"), cmd("storeXpathCount", "id=absent", "N0")], extModel());
  assert.equal(p.vars.N1, 1);
  assert.equal(p.vars.N0, 0);
});

test("B1G-08 storeTitle/storeChecked with an unknown destination name stop as unconfirmed", async () => {
  const r = await run([...UNKNOWN_SETUP, cmd("storeTitle", "", "${ans}")], extModel());
  assert.match(errOf(r), /未確認：storeTitleの保存先が確定していません/);
  assert.ok(!("[object Object]" in r.paths[0].vars));
  // Target フォールバック形（Value 空、Target が保存先）
  const r2 = await run([...UNKNOWN_SETUP, cmd("storeTitle", "${ans}", "")], extModel());
  assert.match(errOf(r2), /未確認：storeTitleの保存先が確定していません/);
  assert.ok(!("[object Object]" in r2.paths[0].vars));
  const r3 = await run([...UNKNOWN_SETUP, cmd("storeChecked", "id=agree", "${ans}")], extModel());
  assert.match(errOf(r3), /未確認：storeCheckedの保存先が確定していません/);
  assert.ok(!("[object Object]" in r3.paths[0].vars));
  // 確定した保存先名は従来どおり保存できる
  const p = await first([OPEN, cmd("storeTitle", "", "Ti"), cmd("storeChecked", "id=agree", "C")], extModel());
  assert.equal(p.vars.Ti, "フォーム画面");
  assert.equal(p.vars.C, false);
});

test("B1G-08 other store destinations with an unknown name stop as unconfirmed", async () => {
  const cases = [
    [cmd("storeAttribute", "id=link@target", "${ans}"), /未確認：storeAttributeの保存先が確定していません/],
    [cmd("storeXpathCount", "id=msg", "${ans}"), /未確認：storeXpathCountの保存先が確定していません/],
    [cmd("csvReadArray", "users.csv", "${ans}"), /未確認：csvReadArrayの保存先が確定していません/],
    [cmd("storeEval", "1 + 1", "${ans}"), /未確認：storeEvalの保存先が確定していません/],
    [cmd("executeScript", "return 1;", "${ans}"), /未確認：executeScriptの保存先が確定していません/],
    [cmd("prompt", "q2?", "${ans}"), /未確認：promptの保存先が確定していません/],
  ];
  for (const [c, pattern] of cases) {
    const r = await run([...UNKNOWN_SETUP, c], extModel());
    assert.match(errOf(r), pattern, c.Command);
    assert.doesNotMatch(errOf(r), /\[object Object\]/, c.Command);
    assert.ok(!("[object Object]" in r.paths[0].vars), c.Command);
  }
  // 確定した保存先名の経路は従来どおり
  const p = await first(
    [OPEN, cmd("storeAttribute", "id=link@target", "T"), cmd("csvReadArray", "users.csv", "rows"), cmd("storeEval", "1 + 1", "z")],
    extModel(),
  );
  assert.equal(p.vars.T, "_blank");
  assert.deepEqual(p.vars.rows, [["name", "age"], ["Alice", "30"], ["Bob", "25"]]);
  assert.equal(p.vars.z, 2);
});

test("observation 3: csvRead/csvReadArray/dragAndDropToObject/select/ThrowError do not name [object Object]", async () => {
  const cases = [
    [cmd("csvRead", "${ans}"), /未確認：csvReadのファイル名が確定していません/],
    [cmd("csvReadArray", "${ans}", "rows"), /未確認：csvReadArrayのファイル名が確定していません/],
    [cmd("dragAndDropToObject", "id=msg", "${ans}"), /未確認：dragAndDropToObjectの移動先ロケーターが確定していません/],
    [cmd("select", "id=country", "${ans}"), /未確認：selectの選択肢が確定していません/],
    [cmd("addSelection", "id=country", "${ans}"), /未確認：addSelectionの選択肢が確定していません/],
    [cmd("removeSelection", "id=country", "${ans}"), /未確認：removeSelectionの選択肢が確定していません/],
    [cmd("ThrowError", "${ans}"), /未確認：ThrowErrorのメッセージが確定していません/],
  ];
  for (const [c, pattern] of cases) {
    const r = await run([...UNKNOWN_SETUP, c], extModel());
    assert.match(errOf(r), pattern, c.Command);
    assert.doesNotMatch(errOf(r), /\[object Object\]/, c.Command);
  }
  // 確定値の失敗名指しは従来どおり利用者の入力を名指す
  const r = await run([OPEN, cmd("csvRead", "missing.csv")], extModel());
  assert.match(errOf(r), /モデルにCSVがありません：missing\.csv/);
  const r2 = await run([OPEN, cmd("ThrowError", "独自エラーです")], extModel());
  assert.match(errOf(r2), /独自エラーです/);
  const r3 = await run([OPEN, cmd("select", "id=country", "label=フランス")], extModel());
  assert.match(errOf(r3), /選択肢が見つかりません：label=フランス/);
});

test("same-type sweep: clickAt coordinate, storeAttribute locator and csvsave cell unknowns stop as unconfirmed", async () => {
  const r = await run([...UNKNOWN_SETUP, cmd("clickAt", "id=submit", "${ans}")], extModel());
  assert.match(errOf(r), /未確認：clickAtの座標が確定していません/);
  const r2 = await run([...UNKNOWN_SETUP, cmd("storeAttribute", "${ans}", "T")], extModel());
  assert.match(errOf(r2), /未確認：storeAttributeのロケーターが確定していません/);
  assert.equal(r2.paths[0].vars.T, undefined);
  const r3 = await run([...UNKNOWN_SETUP, cmd("store", "${ans}", "!csvLine"), cmd("csvsave", "out.csv")], extModel());
  assert.match(errOf(r3), /未確認：csvsaveの書き込む値が確定していません/);
  assert.ok(!("out.csv" in (r3.paths[0].model.csvs ?? {})));
  const r4 = await run(
    [OPEN, cmd("prompt", "q?", "ans"), cmd("executeScript_Sandbox", "return [[${ans}]];", "arr"), cmd("csvsaveArray", "arr", "out.csv")],
    extModel(),
  );
  // 未確定セルを含む配列は、"[object Object]" をセルとして書かず未確認で止まる
  assert.match(errOf(r4), /未確認：csvsaveArrayの書き込む値が確定していません/);
  assert.ok(!("out.csv" in (r4.paths[0].model.csvs ?? {})));
});
