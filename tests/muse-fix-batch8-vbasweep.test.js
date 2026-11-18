import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ8（VBA棚卸し追加班）
// 先行班（fix8-cfnvba-report §7-4）の申し送り: バッチ6定数の説明文が
// 案内する GetAttr／SetAttr／Dir にリファレンス項目が皆無だった。
// あわせて VBA 全定数242件の説明文が案内する所有者（定数が引数に
// なる先／戻り値の出所である関数・イベント・メソッド・文）の最終
// 棚卸しを行い、同じ所有者パターンで皆無だった FormatDateTime／
// VarType／Weekday も同根として一掃した（計6件を参照専用で追加）。
// 一次情報は Microsoft Learn（VBA-Docs 原文）の各ページ:
// getattr-function／setattr-statement／dir-function／
// formatdatetime-function／vartype-function／weekday-function。
// いずれも supported=false で caution に未対応（参照専用）を明示し
// （U-45 充足形、先行6件 StrConv 等と同方針）、使用例が正直に
// 停止することを固定する。

const vba = getDefinition("vba");
const vbaErrs = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const searchHit = (r, q) =>
  (r.name + " " + r.category + " " + r.description + " " + r.syntax)
    .toLowerCase()
    .includes(q.toLowerCase());

const NEW_REF_ONLY = {
  GetAttr: {
    category: "入出力",
    syntax: "GetAttr(pathname)",
    returns: "Integer（ファイル属性定数の合計）",
    source:
      "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/getattr-function.md",
  },
  SetAttr: {
    category: "文",
    syntax: "SetAttr pathname, attributes",
    returns: "戻り値なし（宣言または制御文）",
    source:
      "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/setattr-statement.md",
  },
  Dir: {
    category: "入出力",
    syntax: "Dir([pathname], [attributes])",
    returns: "String（一致したファイル・フォルダの名前。見つからなければ空文字列）",
    source:
      "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/dir-function.md",
  },
  FormatDateTime: {
    category: "日時",
    syntax: "FormatDateTime(Date, [NamedFormat])",
    returns: "String（書式化された日付・時刻）",
    source:
      "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/formatdatetime-function.md",
  },
  VarType: {
    category: "型変換",
    syntax: "VarType(varname)",
    returns: "Integer（変数のサブタイプを表す定数値）",
    source:
      "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/vartype-function.md",
  },
  Weekday: {
    category: "日時",
    syntax: "Weekday(date, [firstdayofweek])",
    returns: "Variant（Integer）（曜日を表す定数値）",
    source:
      "https://raw.githubusercontent.com/MicrosoftDocs/VBA-Docs/main/Language/Reference/User-Interface-Help/weekday-function.md",
  },
};

test("vbasweep: VBA reference count is 338 after the 6 sweep reference-only owners", () => {
  assert.equal(
    vba.reference.length,
    338,
    "332 (batch8 cfnvba) + 6 sweep reference-only owners",
  );
  assert.equal(
    vba.reference.filter((r) => !r.supported).length,
    20,
    "VBA reference-only: 8 pre-existing + 6 cfnvba + 6 vbasweep",
  );
});

for (const [name, exp] of Object.entries(NEW_REF_ONLY)) {
  test(`vbasweep reference-only owner exists with all fields and 未対応 caution: ${name}`, () => {
    const r = vba.reference.find((x) => x.name === name);
    assert.ok(r, name + " must exist");
    assert.equal(r.supported, false, name + " must be reference-only");
    assert.equal(r.category, exp.category, name);
    assert.equal(r.syntax, exp.syntax, name);
    assert.equal(r.returns, exp.returns, name);
    assert.equal(r.source, exp.source, name);
    for (const f of ["description", "example", "caution"])
      assert.ok(typeof r[f] === "string" && r[f].length > 0, `${name}.${f}`);
    assert.match(r.caution, /未対応/, name);
    assert.match(r.caution, /参照専用/, name);
    assert.ok(searchHit(r, r.name), name + " must be found by its own name");
  });

  test(`vbasweep reference-only owner example stops honestly (no silent success): ${name}`, async () => {
    const r = vba.reference.find((x) => x.name === name);
    const res = await vba.simulate(r.example, structuredClone(vba.model.defaults));
    // 統合第2弾の裁定（ADV-B4-REPORT §5）：FormatDateTime／VarType／
    // Weekday は B4 が高度実装したため、基礎リファレンスでは参照のみ
    // のままでもエンジンでは例が実行できる（単一エンジン原則）。
    // FormatDateTime／Weekday の例は Date（実行時値）を引数にするため
    // 結果は未確定値になり、VarType の例は値が返る。いずれも停止しない
    // ことが正しい挙動。根拠：Microsoft Learn の各関数。
    if (["FormatDateTime", "VarType", "Weekday"].includes(name)) {
      assert.equal(vbaErrs(res).length, 0, `${name} example must run: ${r.example}`);
      return;
    }
    assert.ok(vbaErrs(res).length >= 1, `${name} example must stop: ${r.example}`);
  });
}

test("vbasweep function owners stop naming the function", async () => {
  for (const [code, re] of [
    ['x = GetAttr("TESTFILE")', /getattr/],
    ['x = Dir("*.txt")', /dir/],
  ]) {
    const r = await vba.simulate(code, structuredClone(vba.model.defaults));
    assert.ok(vbaErrs(r).length >= 1, code);
    assert.match(vbaErrs(r)[0].message, re, code);
  }
  // 統合第2弾の裁定（ADV-B4-REPORT §5）：FormatDateTime／VarType／
  // Weekday は B4 が高度実装したため実行できる。FormatDateTime／
  // Weekday は Date が実行時値のため未確定値、VarType(42) は本エンジン
  // の数値モデル（実数は Double）により vbDouble=5 を返す。
  for (const code of [
    "x = FormatDateTime(Date, vbLongDate)",
    "x = VarType(42)",
    "x = Weekday(Date)",
  ]) {
    const r = await vba.simulate(code, structuredClone(vba.model.defaults));
    assert.equal(vbaErrs(r).length, 0, code);
  }
  const vt = await vba.simulate(
    "x = VarType(42)",
    structuredClone(vba.model.defaults),
  );
  assert.equal(vt.paths[0].vars.x, 5);
  // SetAttr は文形式のため、文全体を名指しした未対応停止になる
  const r = await vba.simulate(
    'SetAttr "TESTFILE", vbReadOnly',
    structuredClone(vba.model.defaults),
  );
  assert.ok(vbaErrs(r).length >= 1);
  assert.match(vbaErrs(r)[0].message, /SetAttr/);
});

test("vbasweep scan resolves the new owner names", () => {
  assert.ok(vba.scan('x = GetAttr("TESTFILE")').includes("GetAttr"));
  assert.ok(vba.scan('SetAttr "TESTFILE", vbReadOnly').includes("SetAttr"));
  assert.ok(vba.scan('x = Dir("*.txt")').includes("Dir"));
  assert.ok(vba.scan("x = FormatDateTime(Date, vbLongDate)").includes("FormatDateTime"));
  assert.ok(vba.scan("x = VarType(42)").includes("VarType"));
  assert.ok(vba.scan("x = Weekday(Date)").includes("Weekday"));
});

// 最終棚卸しの固定: 全定数（242件）の説明文が所有者として名指しする
// 関数・イベント・メソッド・文は、全て項目が存在する。
// （所有者 = 定数が引数になる先／戻り値の出所。Chr は定数値の定義式
// としての等価表現であり所有者ではないため含めない。先行班が
// 対象外とした Calendar／KeyCode は説明文が所有者を名指ししない。）
test("vbasweep final sweep: every owner named by a constant description exists", () => {
  const names = new Set(vba.reference.map((r) => r.name.toLowerCase()));
  const OWNERS = [
    "MsgBox", "InStr", "Replace", "StrConv", "Shell", "CallByName",
    "IMEStatus", "QueryClose", "Show", "Unload",
    "GetAttr", "SetAttr", "Dir", "FormatDateTime", "VarType", "Weekday",
  ];
  for (const owner of OWNERS)
    assert.ok(names.has(owner.toLowerCase()), owner + " must have a reference item");
  // 上記所有者を実際に案内している定数が存在することも確認する
  const consts = vba.reference.filter((r) => r.category === "定数");
  assert.equal(consts.length, 242);
  for (const owner of OWNERS) {
    const guiding = consts.filter((c) => c.description.includes(owner));
    assert.ok(guiding.length >= 1, owner + " must be named by at least one constant description");
  }
});

test("vbasweep guiding constants keep their guidance text (file attributes)", () => {
  for (const n of ["vbNormal", "vbReadOnly", "vbHidden", "vbSystem"]) {
    const c = vba.reference.find((x) => x.name === n);
    assert.match(c.description, /GetAttr／SetAttr／Dir/, n);
  }
  const vol = vba.reference.find((x) => x.name === "vbVolume");
  assert.match(vol.description, /Dir/, "vbVolume");
  const dirC = vba.reference.find((x) => x.name === "vbDirectory");
  assert.match(dirC.description, /GetAttr／Dir/, "vbDirectory");
  const arc = vba.reference.find((x) => x.name === "vbArchive");
  assert.match(arc.description, /GetAttr／SetAttr/, "vbArchive");
});
