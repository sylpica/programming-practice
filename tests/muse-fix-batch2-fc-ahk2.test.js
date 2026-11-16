import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ2「AutoHotkey・拡張班」（RA-49〜RA-52＋兄弟表面）
// 文面の是正が正本であり、モデル挙動は「文面が開示したとおりであること」を
// 固定する。モデル挙動そのものは変更していない。
const d = getDefinition("autohotkey");
const byName = (name) => d.reference.find((r) => r.name === name);
const run = async (code, model) =>
  d.simulate(code, structuredClone(model ?? { ...d.model.defaults, event: null }));
const errors = (r) => {
  const out = [];
  if (r.error) out.push(r.error);
  for (const p of r.paths || []) if (p.error) out.push(p.error);
  return out;
};
const outputs = (r) => (r.paths?.[0]?.outputs || []).map((o) => o.text);

// ---------- RA-49: IsSetRef の returns は実物どおり、注意書きは差異として明示 ----------
test("RA-49 IsSetRef returns stays the real contract and the caution marks the model divergence as a divergence", () => {
  // 修正バッチ13・R7-101 でテスト是正：ステップ5裁定は、旧モデル挙動
  // （代入済みの数値・文字列で 0）を「開示済みのモデル制限」とは認めず
  // B（現行でも有効な欠陥）とした。一次情報（公式 IsSetRef の契約）どおり
  // 挙動を是正したため、caution は差異の開示ではなく VarRef 必須と
  // 型によらない判定の説明へ変わる。このテストも追随させる。
  const item = byName("IsSetRef");
  assert.equal(item.returns, "参照先が代入済みなら1、未代入なら0");
  assert.match(item.description, /代入済みなら1、未代入なら0/);
  assert.match(item.caution, /VarRef（&変数）の形で渡す必要があります/);
  assert.match(item.caution, /値の型によらず判定します/);
  assert.doesNotMatch(item.caution, /実物と異なり/);
});

test("RA-49 the disclosed model behaviour is what the engine actually does", async () => {
  // 修正バッチ13・R7-101 でテスト是正（同上）：代入済みなら型によらず
  // 1 が実物の契約であり、エンジンもそれに是正された。
  assert.deepEqual(outputs(await run('s := "hi"\nMsgBox IsSetRef(&s)')), ["1"]);
  assert.deepEqual(outputs(await run("n := 42\nMsgBox IsSetRef(&n)")), ["1"]);
  assert.deepEqual(outputs(await run('e := ""\nMsgBox IsSetRef(&e)')), ["1"]);
  assert.deepEqual(outputs(await run("u := A_Now\nMsgBox IsSetRef(&u)")), ["1"]);
  // 配列・オブジェクトも 1、未代入は 0。
  assert.deepEqual(outputs(await run("a := [1, 2]\nMsgBox IsSetRef(&a)")), ["1"]);
  assert.deepEqual(outputs(await run("o := {x: 1}\nMsgBox IsSetRef(&o)")), ["1"]);
  assert.deepEqual(outputs(await run("MsgBox IsSetRef(&zzz)")), ["0"]);
  // 対照：IsSet は型によらず代入済みで 1（項目間でも矛盾しない）。
  assert.deepEqual(outputs(await run('s := "hi"\nMsgBox IsSet(s)')), ["1"]);
});

// ---------- RA-50: WinClose の TargetError 開示 ----------
test("RA-50 WinClose discloses TargetError, matching WinActivate", () => {
  assert.match(byName("WinClose").caution, /TargetError/);
  assert.match(byName("WinClose").caution, /見つからなければ/);
  assert.match(byName("WinActivate").caution, /TargetError/);
});

test("RA-50 WinClose really throws TargetError when the window is missing", async () => {
  const missing = await run('WinClose "存在しない"');
  assert.equal(errors(missing)[0]?.category, "TargetError");
  const found = await run('WinClose "メモ帳"');
  assert.deepEqual(errors(found), []);
  // 対照：WinExist は投げずに 0 を返す（非対称は実物の仕様どおり）。
  assert.deepEqual(outputs(await run('MsgBox WinExist("存在しない")')), ["0"]);
});

// ---------- RA-51: SetTitleMatchMode の書式・returns・注意書きの範囲一致 ----------
test("RA-51 syntax, returns and caution cover the same forms (1/2/3, RegEx, Fast/Slow)", () => {
  const item = byName("SetTitleMatchMode");
  for (const form of ['"RegEx"', '"Fast"', '"Slow"'])
    assert.ok(item.syntax.includes(form), `syntax must include ${form}`);
  assert.match(item.description, /Fast/);
  assert.match(item.description, /Slow/);
  assert.match(item.description, /独立/);
  assert.match(item.returns, /RegEx/);
  assert.match(item.returns, /Fast/);
  assert.match(item.returns, /Slow/);
  assert.match(item.caution, /1／2／3のみ/);
  assert.match(item.caution, /未対応として停止/);
});

test("RA-51 the model really stops on Fast/Slow/RegEx and returns the previous mode for 1/2/3", async () => {
  for (const form of ['"Fast"', '"Slow"', '"RegEx"']) {
    const r = await run(`SetTitleMatchMode ${form}`);
    assert.equal(errors(r)[0]?.category, "未対応", form);
  }
  const ok = await run("old := SetTitleMatchMode(3)\nMsgBox old");
  assert.deepEqual(errors(ok), []);
  assert.deepEqual(outputs(ok), ["2"]);
});

// ---------- RA-52: A_* の代入可能な例外の注記 ----------
test("RA-52 the bundled A_* item notes that some built-ins are assignable", () => {
  const item = byName("A_*（組み込み変数）");
  assert.match(item.description, /多くは読み取り専用/);
  assert.match(item.description, /代入で設定を変更できます/);
  for (const n of ["A_WorkingDir", "A_Clipboard", "A_TitleMatchMode", "A_SendMode", "A_FileEncoding"])
    assert.ok(item.description.includes(n), n);
  // 既存の正しい記述（固定値・実行時に決まる値・未対応系）は残っている。
  assert.match(item.description, /固定値/);
  assert.match(item.description, /実行時に決まる値/);
  assert.ok(item.caution.includes("A_LoopField"));
});

test("RA-52 sibling: A_TitleMatchMode is the concrete exception to 'runtime-determined'", async () => {
  const item = byName("A_*（組み込み変数）");
  assert.match(item.description, /A_TitleMatchModeだけは例外/);
  assert.match(item.returns, /A_TitleMatchModeは現在の一致モード/);
  // 実挙動：既定は 2、SetTitleMatchMode の変更がそのまま返る。
  assert.deepEqual(outputs(await run("MsgBox A_TitleMatchMode")), ["2"]);
  assert.deepEqual(
    outputs(await run("SetTitleMatchMode 3\nMsgBox A_TitleMatchMode")),
    ["3"],
  );
  // 注意書きの開示どおり、変数への代入は一致動作へ反映されない。
  assert.match(item.caution, /A_TitleMatchModeへの代入は、この教材のモデルではタイトル一致動作に反映されません/);
  assert.deepEqual(
    outputs(await run('A_TitleMatchMode := 3\nMsgBox WinExist("メモ")')),
    ["1"],
  );
  assert.deepEqual(
    outputs(await run('SetTitleMatchMode 3\nMsgBox WinExist("メモ")')),
    ["0"],
  );
});

// ---------- 兄弟表面: IsSet の A_* 一律主張の限定 ----------
test("sibling: IsSet caution is scoped to supported built-ins, and the engine agrees", async () => {
  assert.match(byName("IsSet").caution, /対応している組み込み変数/);
  assert.match(byName("IsSet").caution, /A_Loop\*系などは除きます/);
  assert.deepEqual(outputs(await run("MsgBox IsSet(A_Now)")), ["1"]);
  assert.deepEqual(outputs(await run("MsgBox IsSet(A_LoopField)")), ["0"]);
});

// ---------- 個票 reference-r2.json の同期（sha256 は統合時に正規方式で再計算） ----------
test("r2 rows for the fixed AHK items match the definitions and keep their sha256", () => {
  const rows = JSON.parse(
    readFileSync(new URL("../docs/audit/reference-r2.json", import.meta.url), "utf8"),
  );
  const expectedSha = {
    "WinClose": "672b8ae9f15b64a1a2528af6efe246f6b1b1df039ed6e2afe8fb25a53b8bdbc3",
    "SetTitleMatchMode": "524505044244dbef1e292c91cba8a701e9c02d4d21516d74b54b9a6a65decf6e",
    "IsSet": "d71624cbc85a2010771a4179ac3cda6a8d087bb63058f3789598111dbff2a33f",
    "IsSetRef": "0b2c5e22dd044147fd27a657d7868dc7430bf07d1c1af00e8b8fd9e14192a2a8",
    "A_*（組み込み変数）": "04bb7438fb485317d29c451ce786df39c5f579c35b23fdffe7380f75bad5e632",
  };
  for (const [name, sha] of Object.entries(expectedSha)) {
    const row = rows.find((r) => r.kind === "autohotkey" && r.name === name);
    assert.ok(row, name);
    assert.equal(row.sha256, sha, `${name}: sha256 は fields の正規方式で再計算された値`);
    const item = byName(name);
    for (const f of ["description", "returns", "caution", "example", "source"])
      assert.equal(row.fields[f], item[f], `${name}.${f} must match the definition`);
  }
});
