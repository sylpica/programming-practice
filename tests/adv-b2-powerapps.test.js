// ブロックB2（Power Apps / Power Fx 高度モード）のテスト。
// (a) カタログ完全性: 棚卸し「未収録」193件と referenceAdvanced の一致
// (b) F-01: 実装した全関数の典型・境界・異常・組み合わせ実行テスト
//     （simulate は基礎 definition 経由＝合成フックを通る）
// (c) 未対応22件が名前を挙げて正直に停止すること
// (d) 未検証項目の扱い（カタログで未検証と明記され、実行は停止する）
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getDefinition } from "../js/types/registry.js";
import { referenceAdvanced } from "../js/types/powerapps/reference-advanced.js";
import { advancedFunctions, advancedState } from "../js/types/powerapps/semantics-advanced.js";
import { applyAdvancedEngine } from "../js/types/powerapps/advanced-engine.js";
import { templatesAdvanced } from "../js/types/powerapps/templates-advanced.js";
import { glossaryAdvanced } from "../js/types/powerapps/glossary-advanced.js";
import { isUnknown } from "../js/core/contract.js";

const d = getDefinition("powerapps");
const run = async (code, model) =>
  d.simulate(code, structuredClone(model || d.model.defaults));
const first = async (code, model) => {
  const r = await run(code, model);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  const p = r.paths[0];
  assert.ok(!p.error, JSON.stringify(p.error));
  return p;
};
const errOf = async (code, model) => {
  const r = await run(code, model);
  return r.error || r.paths?.[0]?.error || null;
};
// Set(r, <式>) の r を取り出す
const val = async (expr, prefix = "") => {
  const p = await first(`${prefix}Set(r, ${expr})`);
  return p.model.variables.r;
};
const outputs = (p) => p.outputs.map((o) => o.text);

// ---------------- (a) カタログ完全性 ----------------
// 統合第1弾でパスを是正：棚卸しは監査ワークスペース直下
// （programming-practice-audit/advanced-inventory/）が正本。ブロック単体
// ツリー（work/adv-b2/）配下で実行する場合の旧相対パスもフォールバックで
// 受ける（アサーション自体は無変更）。
import { existsSync } from "node:fs";
const inventoryUrl = [
  "../../advanced-inventory/inventory-powerapps.md",
  "../../../advanced-inventory/inventory-powerapps.md",
]
  .map((p) => new URL(p, import.meta.url))
  .find((u) => existsSync(u));
// 棚卸しはリポジトリ外（監査ワークスペース）にのみ存在する。素の
// チェックアウト（CI 等）では候補が全て不在になり、従来はモジュール
// 読込時点で例外になってファイル全体が落ちていた。データが解決できない
// 環境では (a) の実物照合2件だけを理由明示でスキップする（データがある
// 環境では従来どおり全件実行し、アサーションは不変。修正バッチ21／RG-684）。
const inventory = inventoryUrl ? readFileSync(inventoryUrl, "utf8") : null;
const inventoryMissing = inventory === null ? null : [];
if (inventory !== null) {
  for (const line of inventory.split("\n")) {
    if (!line.startsWith("| ")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells[3] === "未収録") inventoryMissing.push(cells[1]);
  }
}
const INVENTORY_SKIP =
  "棚卸しファイル（advanced-inventory/inventory-powerapps.md）が配置されていない環境のため実物照合をスキップ";

test("(a) 棚卸しの未収録は193件である", (t) => {
  if (inventoryMissing === null) return t.skip(INVENTORY_SKIP);
  assert.equal(inventoryMissing.length, 193);
});

test("(a) referenceAdvanced は未収録193件と過不足なく一致する", (t) => {
  if (inventoryMissing === null) return t.skip(INVENTORY_SKIP);
  const names = referenceAdvanced.map((r) => r.name);
  assert.equal(names.length, 193);
  assert.equal(new Set(names).size, 193, "重複があります");
  assert.deepEqual([...names].sort(), [...inventoryMissing].sort());
});

test("(a) status が3値で必須フィールドが揃い、supported を併記しない", () => {
  for (const r of referenceAdvanced) {
    assert.ok(["supported", "unsupported", "unverified"].includes(r.status), r.name);
    // 契約 3.2：高度項目は status のみで状態を表し、supported は持たない。
    assert.ok(!("supported" in r), r.name);
    for (const k of ["name", "category", "syntax", "description", "example", "returns", "source"])
      assert.ok(typeof r[k] === "string" && r[k].length > 0, `${r.name}.${k}`);
    assert.ok(typeof r.caution === "string", r.name);
  }
});

test("(a) source はすべて learn.microsoft.com の URL である", () => {
  for (const r of referenceAdvanced)
    assert.match(r.source, /^https:\/\/learn\.microsoft\.com\//, r.name);
});

test("(a) 未対応・未検証には caution に理由がある", () => {
  for (const r of referenceAdvanced) {
    if (r.status === "unsupported") assert.match(r.caution, /未対応/, r.name);
    if (r.status === "unverified") assert.match(r.caution, /未検証/, r.name);
  }
});

test("(a) 件数内訳: supported 136 / unsupported 52 / unverified 5", () => {
  // 監査班Aの裁定変更（2026-11-17）: Column は Learn
  // （function-columnnames-column）で動的レコードからの値取得と確定
  // できたため unverified → supported に変更した。内訳はその分移動する。
  const by = {};
  for (const r of referenceAdvanced) by[r.status] = (by[r.status] || 0) + 1;
  assert.deepEqual(by, { supported: 136, unsupported: 52, unverified: 5 });
});

test("(a) supported の関数にはハンドラがある（exactin は基礎演算子、Calendar/Clock は配下関数）", () => {
  for (const r of referenceAdvanced) {
    if (r.status !== "supported") continue;
    const fn = r.name.toLowerCase();
    if (fn === "exactin" || fn === "calendar" || fn === "clock") continue;
    assert.ok(fn in advancedFunctions, r.name);
  }
  // Calendar / Clock の配下関数
  for (const k of ["calendar.monthslong", "calendar.monthsshort", "calendar.weekdayslong", "calendar.weekdaysshort", "clock.ampm", "clock.ampmshort"])
    assert.ok(k in advancedFunctions, k);
});

test("(a) unsupported / unverified にはハンドラが無い（基礎の default で停止する）", () => {
  for (const r of referenceAdvanced) {
    if (r.status === "supported") continue;
    assert.ok(!(r.name.toLowerCase() in advancedFunctions), r.name);
  }
});

// ---------------- ゲーティング（合成分離） ----------------
// 本テストはファイル内で最初に simulate を使うテストとして宣言する
// （node:test のトップレベルテストは宣言順に逐次実行される）。未適用
// （既定・無効）状態の確認を先に行い、その後フック経由で有効化する。
// 以後の (b)〜(d) は有効化済みの状態で実行される。
test("(gating) 未適用では基礎どおり停止し、applyAdvancedEngine 適用後に高度関数が動く", async () => {
  assert.equal(advancedState.enabled, false, "既定は無効でなければならない");
  // 高度関数は基礎どおり名前を挙げて停止する。
  const err = await errOf("Set(r, Abs(-3))");
  assert.ok(err, "未適用時は高度関数で停止するはずです");
  assert.match(err.message, /対応していません：Abs/);
  // 基礎の代表ケースはフラグ無効状態でも無傷である。
  const p = await first('Set(Count, Value(Input1.Text)); If(Count >= 3, Set(Status, "十分"), Set(Status, "追加しよう")); Notify(Status)');
  assert.deepEqual(outputs(p), ["十分"]);
  // フック経由で有効化する（フラグの直接操作はしない）。
  applyAdvancedEngine(d, null);
  assert.equal(advancedState.enabled, true);
  assert.equal(await val("Abs(-3)"), 3);
});

// ---------------- (b) F-01 実行テスト ----------------
test("(b) 数学: 典型・境界・組み合わせ", async () => {
  assert.equal(await val("Abs(-3)"), 3);
  assert.equal(await val("Abs(0)"), 0);
  assert.equal(await val("Abs(Blank())"), null);
  assert.equal(await val("Round(Acos(0.5), 4)"), 1.0472);
  assert.equal(await val("Round(Acot(1), 4)"), 0.7854);
  assert.equal(await val("Round(Asin(0.5), 4)"), 0.5236);
  assert.equal(await val("Round(Atan(1), 4)"), 0.7854);
  assert.equal(await val("Round(Atan2(1, 1), 4)"), 0.7854);
  assert.equal(await val("Round(Sin(Radians(30)), 4)"), 0.5);
  assert.equal(await val("Round(Cos(Radians(60)), 4)"), 0.5);
  assert.equal(await val("Round(Tan(Radians(45)), 4)"), 1);
  assert.equal(await val("Round(Cot(Radians(45)), 4)"), 1);
  assert.equal(await val("Round(Degrees(Pi()), 10)"), 180);
  assert.equal(await val("Round(Radians(180), 10)"), 3.1415926536);
  assert.equal(await val("Round(Pi(), 4)"), 3.1416);
  assert.equal(await val("Round(Exp(1), 4)"), 2.7183);
  assert.equal(await val("Round(Ln(10), 4)"), 2.3026);
  assert.equal(await val("Log(100)"), 2);
  assert.equal(await val("Log(8, 2)"), 3);
  assert.equal(await val("Power(2, 10)"), 1024);
  assert.equal(await val("Sqrt(25)"), 5);
  assert.equal(await val("Round(Sqrt(2), 4)"), 1.4142);
  assert.equal(await val("Int(19.5)"), 19);
  assert.equal(await val("Int(-19.5)"), -20);
  assert.equal(await val("Trunc(19.5)"), 19);
  assert.equal(await val("Trunc(-19.5)"), -19);
  assert.equal(await val("Round(2.675, 2)"), 2.68);
  assert.equal(await val("Round(123.449, 2)"), 123.45);
  assert.equal(await val("Round(2.5, 0)"), 3);
  assert.equal(await val("RoundDown(2.679, 2)"), 2.67);
  assert.equal(await val("RoundDown(-2.679, 2)"), -2.67);
  assert.equal(await val("RoundUp(2.671, 2)"), 2.68);
  assert.equal(await val("RoundUp(-2.671, 2)"), -2.68);
  assert.equal(await val("Mod(11, 4)"), 3);
  assert.equal(await val("Mod(-3, 2)"), 1);
  assert.equal(await val("Mod(3, -2)"), -1);
  assert.equal(await val('Dec2Hex(255)'), "FF");
  assert.equal(await val('Dec2Hex(255, 4)'), "00FF");
  assert.equal(await val("Dec2Hex(-1)"), "FFFFFFFFFF");
  assert.equal(await val('Hex2Dec("FF")'), 255);
  assert.equal(await val('Hex2Dec("FFFFFFFFFF")'), -1);
  // 入れ子・条件式内
  assert.equal(await val("If(Abs(-5) > 3, Sqrt(Power(3, 2) + Power(4, 2)), 0)"), 5);
});

test("(b) 数学: 異常（定義域・0除算・型違い・引数過不足）", async () => {
  assert.match((await errOf("Set(r, Sqrt(-1))")).message, /定義域|エラー値/);
  assert.match((await errOf("Set(r, Acos(2))")).message, /定義域|エラー値/);
  assert.match((await errOf("Set(r, Ln(0))")).message, /定義域|エラー値/);
  assert.match((await errOf("Set(r, Mod(1, 0))")).message, /0 で割ることはできません/);
  assert.match((await errOf('Set(r, Abs("abc"))')).message, /数値で指定してください/);
  assert.match((await errOf("Set(r, Abs())")).message, /引数の数が正しくありません/);
  assert.match((await errOf("Set(r, Abs(1, 2))")).message, /引数の数が正しくありません/);
  assert.match((await errOf("Set(r, Power(1))")).message, /引数の数が正しくありません/);
  // Learn（function-round）: Trunc に小数桁は指定できない。Round 系の
  // DecimalPlaces は必須（省略できる既定値はない）。
  assert.match((await errOf("Set(r, Trunc(19.567, 2))")).message, /引数の数が正しくありません/);
  assert.match((await errOf("Set(r, Round(2.5))")).message, /引数の数が正しくありません/);
  assert.match((await errOf("Set(r, RoundDown(2.679))")).message, /引数の数が正しくありません/);
  assert.match((await errOf("Set(r, RoundUp(2.671))")).message, /引数の数が正しくありません/);
  // Learn（function-trig）: Atan2 は Atan2(X, Y) の順（Atan2(5, 3) ≒ 0.5404）。
  assert.equal(await val("Round(Atan2(5, 3), 4)"), 0.5404);
  assert.equal(await val("Round(Atan2(0, 1), 4)"), 1.5708);
  assert.equal(await val("Atan2(1, 0)"), 0);
});

test("(b) 集計: テーブル形・数値形・Blank の扱い", async () => {
  assert.equal(await val("Average(Table({Value: 2}, {Value: 4}), Value)"), 3);
  assert.equal(await val("Average(1, 2, 3)"), 2);
  assert.equal(await val("Max(Table({Value: 2}, {Value: 9}, {Value: 4}), Value)"), 9);
  assert.equal(await val("Min(5, 3, 8)"), 3);
  assert.equal(await val("Max(Blank(), 5)"), 5);
  assert.equal(await val("Average(Table({Value: Blank()}, {Value: 4}), Value)"), 4);
  assert.equal(await val("Average(Table({Value: Blank()}), Value)"), null);
  assert.equal(await val("StdevP(Table({Value: 2}, {Value: 4}, {Value: 4}, {Value: 4}, {Value: 5}, {Value: 5}, {Value: 7}, {Value: 9}), Value)"), 2);
  assert.equal(await val("VarP(Table({Value: 2}, {Value: 4}), Value)"), 1);
  assert.equal(await val("Count(Table({Value: 1}, {Value: \"a\"}, {Value: 2}))"), 2);
  // Learn（function-table-counts）: CountA は空文字列（""）も数える
  // （Blank でない値の個数）。PFX-D3（高度A2監査）で期待値を是正。
  assert.equal(await val('CountA(Table({Value: 1}, {Value: ""}, {Value: 2}))'), 3);
  assert.equal(await val("CountIf(Table({Value: 1}, {Value: 2}, {Value: 3}), Value >= 2)"), 2);
  assert.equal(await val("CountIf(Table(), Value > 0)"), 0);
  assert.match((await errOf("Set(r, StdevP(1, 2))")).message, /テーブル形式/);
  assert.match((await errOf("Set(r, Average(5, Value))")).message, /未定義|テーブル/);
  // Learn（function-aggregates）: 集計は数値だけが対象で、文字列など
  // 数値でない値は変換されず無視される。数値が無ければ Blank。
  assert.equal(await val('Average(Table({Value: "a"}, {Value: 4}), Value)'), 4);
  assert.equal(await val('Average(Table({Value: "a"}), Value)'), null);
  assert.equal(await val('Max("a", 5)'), 5);
  assert.equal(await val('Average("5", 3)'), 3);
  // Learn（function-table-counts）: Count は単一列テーブル専用。
  assert.match((await errOf("Set(r, Count(Table({A: 1, B: 2})))")).message, /Count/);
});

test("(b) テキスト: 典型・境界", async () => {
  assert.equal(await val("Char(65)"), "A");
  assert.equal(await val("UniChar(65)"), "A");
  assert.equal(await val("UniChar(9731)"), "☃");
  assert.equal(await val('Len("Hello")'), 5);
  assert.equal(await val('Len("")'), 0);
  assert.equal(await val("Len(Table({Value: 1}, {Value: 2}))"), 2);
  assert.equal(await val('Left("Hello", 2)'), "He");
  assert.equal(await val('Left("Hello", 0)'), "");
  assert.equal(await val('Left("Hello", 99)'), "Hello");
  assert.equal(await val('Right("Hello", 2)'), "lo");
  assert.equal(await val('Right("Hello", 0)'), "");
  assert.equal(await val('Mid("Hello", 2, 3)'), "ell");
  assert.equal(await val('Mid("Hello", 4)'), "lo");
  assert.equal(await val('Find("l", "Hello")'), 3);
  assert.equal(await val('Find("L", "Hello")'), 3);
  assert.equal(await val('Find("z", "Hello")'), null);
  assert.equal(await val('Find("l", "Hello", 4)'), 4);
  assert.equal(await val('Replace("Hello", 1, 1, "J")'), "Jello");
  assert.equal(await val('Replace("Hello", 6, 0, "!")'), "Hello!");
  assert.equal(await val('Substitute("a-a-a", "a", "b")'), "b-b-b");
  assert.equal(await val('Substitute("a-a-a", "a", "b", 2)'), "a-b-a");
  assert.deepEqual(await val('Split("a,b,c", ",")'), [{ Value: "a" }, { Value: "b" }, { Value: "c" }]);
  assert.deepEqual(await val('Split("", ",")'), [{ Value: "" }]);
  assert.equal(await val('Lower("HELLO")'), "hello");
  assert.equal(await val('Upper("hello")'), "HELLO");
  assert.equal(await val('Proper("hello world")'), "Hello World");
  assert.deepEqual(await val('Lower(Table({Value: "A"}, {Value: "B"}))'), [{ Value: "a" }, { Value: "b" }]);
  assert.equal(await val('Trim("  a   b  ")'), "a b");
  assert.equal(await val('TrimEnds("  a  b  ")'), "a  b");
  assert.equal(await val('StartsWith("Hello", "he")'), true);
  assert.equal(await val('StartsWith("Hello", "lo")'), false);
  assert.equal(await val('EndsWith("Hello", "LO")'), true);
  assert.equal(await val('Concatenate("a", Blank(), "c")'), "ac");
  assert.equal(await val('Concat(Split("a,b", ","), Value & ";")'), "a;b;");
  assert.equal(await val('EncodeUrl("a b&c")'), "a%20b%26c");
  assert.equal(await val('EncodeHTML("<a>")'), "&lt;a&gt;");
  assert.equal(await val('PlainText("<b>太字</b>")'), "太字");
  assert.deepEqual(await val('HashTags("投稿 #PowerFx と #テスト")'), [{ Value: "#PowerFx" }, { Value: "#テスト" }]);
  assert.equal(await val('IsMatch("abc123", "[0-9]+")'), true);
  assert.equal(await val('IsMatch("abc", "[0-9]+")'), false);
  assert.equal(await val('IsMatch("ABC", "abc", "IgnoreCase")'), true);
  assert.equal(await val('Match("abc123", "[0-9]+").Start'), 4);
  assert.equal(await val('Match("abc123", "[0-9]+").FullMatch'), "123");
  assert.equal(await val('Match("abc", "[0-9]+")'), null);
  assert.equal(await val('CountRows(MatchAll("a1 b2", "[a-z][0-9]"))'), 2);
  assert.equal(await val('IsNumeric("123")'), true);
  assert.equal(await val('IsNumeric("10%")'), true);
  assert.equal(await val('IsNumeric("abc")'), false);
  assert.equal(await val("IsNumeric(true)"), false);
  assert.equal(await val("IsNumeric(Blank())"), false);
  // Blank の伝播
  assert.equal(await val("Left(Blank(), 2)"), null);
  assert.equal(await val("Len(Blank())"), null);
});

test("(b) テキスト: 異常", async () => {
  assert.match((await errOf("Set(r, Char(0))")).message, /Char/);
  assert.match((await errOf("Set(r, UniChar(-1))")).message, /UniChar/);
  assert.match((await errOf('Set(r, Mid("abc", 0))')).message, /Mid/);
  assert.match((await errOf('Set(r, Left("abc", -1))')).message, /Left/);
  assert.match((await errOf('Set(r, IsMatch("a", "["))')).message, /正規表現が不正です/);
  assert.match((await errOf('Set(r, Left("abc"))')).message, /引数の数が正しくありません/);
});

test("(b) 色と列挙（Calendar / Clock）", async () => {
  assert.equal(await val('ColorValue("#FF0000")'), "#FF0000");
  assert.equal(await val('ColorValue("red")'), "#FF0000");
  assert.equal(await val("RGBA(255, 0, 0, 1)"), "#FF0000");
  assert.equal(await val("RGBA(0, 128, 255, 0.5)"), "#0080FF80");
  assert.equal(await val("ColorFade(RGBA(255, 0, 0, 1), -0.5)"), "#800000");
  assert.equal(await val("ColorFade(RGBA(255, 0, 0, 1), 0.5)"), "#FF8080");
  assert.equal(await val("ColorFade(RGBA(255, 0, 0, 1), 0)"), "#FF0000");
  assert.match((await errOf("Set(r, RGBA(256, 0, 0, 1))")).message, /RGBA/);
  assert.match((await errOf('Set(r, ColorValue("notacolor"))')).message, /色として解釈できません/);
  assert.equal(await val("CountRows(Calendar.MonthsLong())"), 12);
  assert.equal(await val("First(Calendar.MonthsLong()).Value"), "January");
  assert.equal(await val("Last(Calendar.MonthsShort()).Value"), "Dec");
  assert.equal(await val("First(Calendar.WeekdaysLong()).Value"), "Sunday");
  assert.deepEqual(await val("Clock.AmPm()"), [{ Value: "AM" }, { Value: "PM" }]);
  assert.deepEqual(await val("Clock.AmPmShort()"), [{ Value: "A" }, { Value: "P" }]);
});

test("(b) テーブル操作: 整形・並べ替え・検索", async () => {
  assert.deepEqual(await val("First(Table({Value: 1}, {Value: 2}))"), { Value: 1 });
  assert.deepEqual(await val("Last(Table({Value: 1}, {Value: 2}))"), { Value: 2 });
  assert.equal(await val("First(Table())"), null);
  assert.deepEqual(await val("FirstN(Table({Value: 1}, {Value: 2}, {Value: 3}), 2)"), [{ Value: 1 }, { Value: 2 }]);
  assert.deepEqual(await val("LastN(Table({Value: 1}, {Value: 2}, {Value: 3}), 2)"), [{ Value: 2 }, { Value: 3 }]);
  assert.deepEqual(await val("Index(Table({Value: 10}, {Value: 20}), 2)"), { Value: 20 });
  // Learn（function-first-last）: Index の範囲外は Blank でなくエラー値。
  assert.match((await errOf("Set(r, Index(Table({Value: 10}), 5))")).message, /Index/);
  assert.match((await errOf("Set(r, Index(Table({Value: 10}), 0))")).message, /Index/);
  assert.match((await errOf("Set(r, Index(Table(), 1))")).message, /Index/);
  assert.equal(await val("IfError(Index(Table({Value: 10}), 5), -1)"), -1);
  assert.deepEqual(await val("AddColumns(Table({Price: 100, Qty: 2}), Total, Price * Qty)"), [{ Price: 100, Qty: 2, Total: 200 }]);
  assert.deepEqual(await val('AddColumns(Table({A: 1}), "B", A + 1)'), [{ A: 1, B: 2 }]);
  assert.deepEqual(await val("DropColumns(Table({A: 1, B: 2}), B)"), [{ A: 1 }]);
  assert.deepEqual(await val("ShowColumns(Table({A: 1, B: 2}), A)"), [{ A: 1 }]);
  assert.deepEqual(await val("RenameColumns(Table({A: 1}), A, Amount)"), [{ Amount: 1 }]);
  assert.deepEqual(await val("Sort(Table({Value: 3}, {Value: 1}, {Value: 2}), Value)"), [{ Value: 1 }, { Value: 2 }, { Value: 3 }]);
  assert.deepEqual(await val('Sort(Table({Value: 1}, {Value: 3}), Value, "Descending")'), [{ Value: 3 }, { Value: 1 }]);
  assert.deepEqual(await val('SortByColumns(Table({Name: "b"}, {Name: "a"}), "Name")'), [{ Name: "a" }, { Name: "b" }]);
  assert.deepEqual(
    await val('SortByColumns(Table({A: 1, B: 2}, {A: 1, B: 1}, {A: 0, B: 9}), "A", "B")'),
    [{ A: 0, B: 9 }, { A: 1, B: 1 }, { A: 1, B: 2 }],
  );
  assert.deepEqual(await val('Search(Table({Name: "Apple"}, {Name: "Banana"}), "app", Name)'), [{ Name: "Apple" }]);
  assert.equal(await val('CountRows(Search(Table({Name: "Apple"}), "", Name))'), 1);
  assert.deepEqual(await val("Distinct(Table({V: 1}, {V: 1}, {V: 2}), V)"), [{ Value: 1 }, { Value: 2 }]);
  assert.deepEqual(await val("ColumnNames(Table({A: 1, B: 2}))"), [{ Value: "A" }, { Value: "B" }]);
  assert.equal(await val("IsEmpty(Table())"), true);
  assert.equal(await val("IsEmpty(Table({Value: 1}))"), false);
  // GroupBy / Ungroup の往復
  assert.deepEqual(
    await val('GroupBy(Table({City: "東京", V: 1}, {City: "東京", V: 2}, {City: "大阪", V: 3}), City, Rows)'),
    [
      { City: "東京", Rows: [{ V: 1 }, { V: 2 }] },
      { City: "大阪", Rows: [{ V: 3 }] },
    ],
  );
  assert.deepEqual(
    await val('Ungroup(GroupBy(Table({City: "東京", V: 1}, {City: "東京", V: 2}), City, Rows), Rows)'),
    [{ City: "東京", V: 1 }, { City: "東京", V: 2 }],
  );
  // 入れ子: 整形→並べ替え→先頭
  assert.deepEqual(
    await val("First(Sort(AddColumns(Table({Price: 50, Qty: 5}, {Price: 100, Qty: 2}), Total, Price * Qty), Total))"),
    { Price: 100, Qty: 2, Total: 200 },
  );
  assert.match((await errOf("Set(r, Sort(5, Value))")).message, /テーブルが必要です/);
  assert.match((await errOf("Set(r, First(5))")).message, /テーブルが必要です/);
});

test("(b) コレクション変更: Remove / RemoveIf / Update / UpdateIf / Errors", async () => {
  const setup = "ClearCollect(Items, {Name: \"A\", Done: false}, {Name: \"B\", Done: false});\n";
  let p = await first(setup + "Remove(Items, {Name: \"A\", Done: false}); Set(r, CountRows(Items))");
  assert.equal(p.model.variables.r, 1);
  p = await first(setup + "Remove(Items, All); Set(r, CountRows(Items))");
  assert.equal(p.model.variables.r, 0);
  p = await first(setup + "RemoveIf(Items, Name = \"B\"); Set(r, CountRows(Items))");
  assert.equal(p.model.variables.r, 1);
  p = await first(setup + "Update(Items, First(Items), {Done: true}); Set(r, First(Items).Done)");
  assert.equal(p.model.variables.r, true);
  p = await first(setup + "UpdateIf(Items, Done = false, {Done: true}); Set(r, CountIf(Items, Done))");
  assert.equal(p.model.variables.r, 2);
  assert.deepEqual(await val("Errors(Orders)"), []);
  assert.match((await errOf("Set(r, Errors(Nope))")).message, /Nope/);
  assert.match(
    (await errOf(setup + "Update(Items, Defaults(Orders), {Done: true})")).message,
    /Update は既存レコード専用です/,
  );
  // ForAll 内の副作用は基礎と同じ文言で止まる
  assert.match(
    (await errOf(setup + "ForAll(Items, Remove(Items, ThisRecord))")).message,
    /副作用はこのモデルでは未対応です/,
  );
});

test("(b) 日時: 生成・分解・加減・曜日", async () => {
  assert.equal(await val("Date(2026, 1, 15)"), "2026-01-15");
  assert.equal(await val("Date(2026, 13, 1)"), "2027-01-01");
  assert.equal(await val("DateTime(2026, 1, 15, 13, 30, 5)"), "2026-01-15T13:30:05");
  assert.equal(await val("Time(13, 30, 5)"), "13:30:05");
  assert.equal(await val('DateValue("2026-01-15")'), "2026-01-15");
  assert.equal(await val('DateValue("1/15/2026")'), "2026-01-15");
  assert.equal(await val('TimeValue("1:30 PM")'), "13:30:00");
  assert.equal(await val('DateTimeValue("2026-01-15 13:30")'), "2026-01-15T13:30:00");
  assert.equal(await val("Day(Date(2026, 1, 15))"), 15);
  assert.equal(await val("Month(Date(2026, 1, 15))"), 1);
  assert.equal(await val("Year(Date(2026, 1, 15))"), 2026);
  assert.equal(await val("Hour(Time(13, 30, 0))"), 13);
  assert.equal(await val("Minute(Time(13, 30, 0))"), 30);
  assert.equal(await val("Second(Time(13, 30, 45))"), 45);
  assert.equal(await val("DateAdd(Date(2026, 1, 15), 7)"), "2026-01-22");
  assert.equal(await val('DateAdd(Date(2026, 1, 31), 1, "Months")'), "2026-02-28");
  assert.equal(await val('DateAdd(Date(2026, 1, 15), -1, "Years")'), "2025-01-15");
  assert.equal(await val('DateAdd(DateTime(2026, 1, 15, 13, 0, 0), 90, "Minutes")'), "2026-01-15T14:30:00");
  assert.equal(await val("DateDiff(Date(2026, 1, 1), Date(2026, 2, 1))"), 31);
  assert.equal(await val('DateDiff(Date(2026, 1, 15), Date(2026, 3, 14), "Months")'), 1);
  assert.equal(await val('DateDiff(Date(2026, 1, 15), Date(2027, 1, 14), "Years")'), 0);
  assert.equal(await val('DateDiff(Date(2026, 1, 15), Date(2027, 1, 15), "Years")'), 1);
  assert.equal(await val("EDate(Date(2026, 1, 31), 1)"), "2026-02-28");
  assert.equal(await val("EDate(Date(2026, 1, 15), -1)"), "2025-12-15");
  assert.equal(await val("EOMonth(Date(2026, 1, 15), 0)"), "2026-01-31");
  assert.equal(await val("EOMonth(Date(2026, 2, 5), 0)"), "2026-02-28");
  assert.equal(await val("Weekday(Date(2026, 1, 15))"), 5); // 木曜
  assert.equal(await val("Weekday(Date(2026, 1, 15), 2)"), 4);
  assert.equal(await val("Weekday(Date(2026, 1, 15), 3)"), 3);
  // Learn（function-datetime-parts）の Weekday コード表: 11=月曜始まり、
  // 12=火曜、13=水曜、14=木曜、15=金曜、16=土曜、17=日曜始まり。
  assert.equal(await val("Weekday(Date(2026, 1, 15), 11)"), 4);
  assert.equal(await val("Weekday(Date(2026, 1, 15), 12)"), 3);
  assert.equal(await val("Weekday(Date(2026, 1, 15), 13)"), 2);
  assert.equal(await val("Weekday(Date(2026, 1, 15), 14)"), 1);
  assert.equal(await val("Weekday(Date(2026, 1, 15), 15)"), 7);
  assert.equal(await val("Weekday(Date(2026, 1, 15), 16)"), 6);
  assert.equal(await val("Weekday(Date(2026, 1, 15), 17)"), 5);
  // Learn（function-dateadd-datediff）: DateDiff の単位には Quarters がある。
  assert.equal(await val('DateDiff(Date(2026, 1, 1), Date(2026, 4, 1), "Quarters")'), 1);
  assert.equal(await val('DateDiff(Date(2026, 1, 15), Date(2026, 8, 14), "Quarters")'), 2);
  assert.equal(await val('DateDiff(Date(2026, 4, 1), Date(2026, 1, 1), "Quarters")'), -1);
  assert.equal(await val("WeekNum(Date(2026, 1, 15))"), 3);
  assert.equal(await val("ISOWeekNum(Date(2026, 1, 1))"), 1);
  assert.equal(await val("ISOWeekNum(Date(2021, 1, 1))"), 53);
  // 条件式内での組み合わせ
  assert.equal(await val('If(Weekday(Date(2026, 1, 15)) = 5, "木曜", "その他")'), "木曜");
  assert.match((await errOf('Set(r, DateValue("not a date"))')).message, /日時として解釈できません/);
  assert.match((await errOf('Set(r, Day("hello"))')).message, /日時として解釈できません/);
  assert.match((await errOf('Set(r, DateAdd(Date(2026, 1, 1), 1, "Weeks"))')).message, /単位が正しくありません/);
});

test("(b) 型変換: Boolean / Decimal / Float / GUID / JSON / ParseJSON", async () => {
  assert.equal(await val('Boolean("true")'), true);
  assert.equal(await val('Boolean("FALSE")'), false);
  assert.equal(await val("Boolean(2)"), true);
  assert.equal(await val("Boolean(0)"), false);
  assert.equal(await val("Boolean(Blank())"), null);
  assert.match((await errOf('Set(r, Boolean("hello"))')).message, /Boolean に変換できません/);
  assert.equal(await val('Decimal("1.5")'), 1.5);
  assert.equal(await val('Decimal("10%")'), 0.1);
  assert.equal(await val('Float("1e3")'), 1000);
  assert.equal(await val("Decimal(7)"), 7);
  assert.match((await errOf('Set(r, Decimal("abc"))')).message, /数値へ変換できません/);
  assert.equal(await val('GUID("6F9619FF-8B86-D011-B42D-00C04FC964FF")'), "6f9619ff-8b86-d011-b42d-00c04fc964ff");
  assert.match((await errOf('Set(r, GUID("not-a-guid"))')).message, /GUIDとして解釈できません/);
  assert.equal(await val("JSON({a: 1})"), '{"a":1}');
  assert.equal(await val("JSON(Table({Value: 1}))"), '[{"Value":1}]');
  assert.equal(await val('ParseJSON("{""a"": 5}").a'), 5);
  assert.deepEqual(await val('ParseJSON("[1, 2]")'), [{ Value: 1 }, { Value: 2 }]);
  assert.match((await errOf('Set(r, ParseJSON("{invalid"))')).message, /JSONとして解釈できません/);
});

test("(b) 論理・欠損・エラー処理", async () => {
  assert.equal(await val('Coalesce(Blank(), "", "x")'), "x");
  assert.equal(await val("Coalesce(0, 1)"), 0);
  assert.equal(await val("Coalesce(Blank(), Blank())"), null);
  assert.equal(await val("IfError(1 / 0, -1)"), -1);
  assert.equal(await val("IfError(5, -1)"), 5);
  assert.equal(await val("IfError(1 / 0, -1, 2 / 0, -2)"), -1);
  assert.equal(await val("IfError(5, -1, 99)"), 99);
  assert.equal(await val('IfError(Value("abc"), Value("12"))'), 12);
  assert.equal(await val('IsError(Value("abc"))'), true);
  assert.equal(await val("IsError(1 / 0)"), true);
  assert.equal(await val("IsError(5)"), false);
  assert.equal(await val("IsBlankOrError(Blank())"), true);
  assert.equal(await val("IsBlankOrError(1 / 0)"), true);
  assert.equal(await val("IsBlankOrError(5)"), false);
  assert.equal(await val("Assert(1 < 2)"), true);
  assert.match((await errOf('Set(r, Error("カスタムエラー"))')).message, /カスタムエラー/);
  assert.match((await errOf('Set(r, Error({Message: "入力が不正です"}))')).message, /入力が不正です/);
  assert.match((await errOf('Set(r, Assert(1 > 2, "検証に失敗しました"))')).message, /検証に失敗しました/);
  // If の条件の中での組み合わせ: エラー判定で分岐する
  assert.equal(await val('If(IsError(Value(Input1.Text)), "数値", "その他")', ""), "その他");
  assert.equal(await val('If(IsBlankOrError(Blank()), "空", "値あり")'), "空");
});

test("(b) 型: Column（動的レコードからの値取得）", async () => {
  // Learn（function-columnnames-column）: 存在しない列は Blank、
  // レコードでない動的値はエラー。監査班Aの裁定変更で supported 化。
  assert.equal(await val('Column(ParseJSON("{""a"": 5}"), "a")'), 5);
  assert.equal(await val('Column(ParseJSON("{""a"": 5}"), "missing")'), null);
  assert.equal(await val('IsBlank(Column(ParseJSON("{""a"": 5}"), "missing"))'), true);
  assert.match((await errOf('Set(r, Column(ParseJSON("[1, 2]"), "a"))')).message, /Column/);
  assert.match((await errOf('Set(r, Column(5, "a"))')).message, /Column/);
});

test("(b) With / Concurrent / Language / Trace / exactin", async () => {
  assert.equal(await val("With({x: 2, y: 3}, x * y)"), 6);
  assert.equal(await val("With({x: 2}, With({y: 5}, x + y))"), 7);
  // With は動作数式を包める（内側の Set が行スコープの副作用ガードで
  // 誤って止まらない）。
  const wp = await first("With({x: 2}, Set(r, x * 3))");
  assert.equal(wp.model.variables.r, 6);
  const p = await first("Concurrent(Set(a, 1), Set(b, 2)); Set(r, a + b)");
  assert.equal(p.model.variables.r, 3);
  assert.equal(await val("Language()"), "en-US");
  const t = await first('Trace("開始"); Notify("完了")');
  assert.deepEqual(t.outputs.map((o) => o.channel), ["Trace", "Notify"]);
  assert.deepEqual(outputs(t), ["開始", "完了"]);
  assert.equal(await val('"ell" exactin "Hello"'), true);
  assert.equal(await val('"ELL" exactin "Hello"'), false);
  assert.equal(await val('"ELL" in "Hello"'), true);
});

test("(b) 実行時に決まる値は捏造せず未確定になる", async () => {
  for (const expr of [
    "Now()",
    "Today()",
    "UTCNow()",
    "UTCToday()",
    "Rand()",
    "RandBetween(1, 6)",
    "GUID()",
    "Shuffle(Table({Value: 1}))",
    "TimeZoneOffset()",
    'Confirm("よいですか？")',
    "IsToday(Date(2026, 1, 15))",
    "IsUTCToday(Date(2026, 1, 15))",
    "Abs(Now())",
  ]) {
    const v = await val(expr);
    assert.ok(isUnknown(v), expr);
  }
});

// ---------------- (c) 未対応22件 ----------------
const UNSUPPORTED_22 = [
  ["Acceleration", "Set(r, Acceleration.X)", /Acceleration/],
  ["AIClassify", 'Set(r, AIClassify("x", "y"))', /AIClassify/],
  ["AIExtract", 'Set(r, AIExtract("x", "y"))', /AIExtract/],
  ["AIReply", 'Set(r, AIReply("x", "y"))', /AIReply/],
  ["AISentiment", 'Set(r, AISentiment("x"))', /AISentiment/],
  ["AISummarize", 'Set(r, AISummarize("x"))', /AISummarize/],
  ["AITranslate", 'Set(r, AITranslate("x"))', /AITranslate/],
  ["App", "Set(r, App.ActiveScreen)", /App/],
  ["Compass", "Set(r, Compass.Heading)", /Compass/],
  ["Connection", "Set(r, Connection.Connected)", /Connection/],
  ["Dataverse.Unmask", "Set(r, Dataverse.Unmask(1, 2))", /Dataverse\.Unmask/],
  ["Disable", "Disable(1)", /Disable/],
  ["Download", 'Download("https://example.com/f")', /Download/],
  ["Enable", "Enable(1)", /Enable/],
  ["Host", "Set(r, Host.OSType)", /Host/],
  ["Launch", 'Launch("https://example.com")', /Launch/],
  ["Location", "Set(r, Location.Latitude)", /Location/],
  ["Param", 'Set(r, Param("id"))', /Param/],
  ["ReadNFC", "Set(r, ReadNFC())", /ReadNFC/],
  ["RequestHide", "RequestHide()", /RequestHide/],
  ["ShowHostInfo", "ShowHostInfo()", /ShowHostInfo/],
  ["User", "Set(r, User().Email)", /User/],
];
test("(c) 未対応候補22件はカタログで unsupported である", () => {
  assert.equal(UNSUPPORTED_22.length, 22);
  for (const [name] of UNSUPPORTED_22) {
    const r = referenceAdvanced.find((x) => x.name === name);
    assert.ok(r, name);
    assert.equal(r.status, "unsupported", name);
    assert.ok(!("supported" in r), name);
  }
});
for (const [name, code, pattern] of UNSUPPORTED_22) {
  test(`(c) 未対応 ${name} は名前を挙げて停止する`, async () => {
    const err = await errOf(code);
    assert.ok(err, `${name} は停止するはずです`);
    assert.match(err.message, pattern);
    assert.match(err.message, /対応していません|未定義の名前/);
  });
}

test("(c) 追加の未対応項目も名前を挙げて停止する", async () => {
  for (const [code, pattern] of [
    ["Back()", /Back/],
    ['Copy("x")', /Copy/],
    ["Exit()", /Exit/],
    ["Print()", /Print/],
    ['Choices(Orders)', /Choices/],
    ['Refresh(Orders)', /Refresh/],
    ['SaveData(Items, "x")', /SaveData/],
    ["EditForm(Form1)", /EditForm|Form1/],
    ["Set(r, Color.Red)", /Color/],
    ["Set(r, Parent.Width)", /Parent/],
    ["Set(r, ThisItem.Name)", /ThisItem/],
  ]) {
    const err = await errOf(code);
    assert.ok(err, code);
    assert.match(err.message, pattern, code);
  }
});

// ---------------- (d) 未検証項目 ----------------
const UNVERIFIED = ["AsType", "IsType", "RecordOf", "Summarize", "Type"];
test("(d) 未検証5件はカタログで unverified と明記される", () => {
  assert.equal(UNVERIFIED.length, 5);
  for (const name of UNVERIFIED) {
    const r = referenceAdvanced.find((x) => x.name === name);
    assert.ok(r, name);
    assert.equal(r.status, "unverified", name);
    assert.ok(!("supported" in r), name);
    assert.match(r.caution, /未検証/, name);
  }
});
for (const [name, code] of [
  ["AsType", 'Set(r, AsType({A: 1}, "Orders"))'],
  ["IsType", 'Set(r, IsType({A: 1}, "Orders"))'],
  ["RecordOf", 'Set(r, RecordOf("Orders"))'],
  ["Summarize", "Set(r, Summarize(Table({A: 1}), A))"],
  ["Type", 'Set(r, Type("Orders"))'],
]) {
  test(`(d) 未検証 ${name} は未対応と同様に名前を挙げて停止する`, async () => {
    const err = await errOf(code);
    assert.ok(err, name);
    assert.match(err.message, new RegExp(name));
    assert.match(err.message, /対応していません/);
  });
}

// ---------------- 教材・用語集 ----------------
test("教材6件はすべて実行でき、refs が実在する", async () => {
  assert.ok(templatesAdvanced.length >= 4 && templatesAdvanced.length <= 6);
  const baseNames = new Set(d.reference.map((r) => r.name));
  const advNames = new Set(referenceAdvanced.map((r) => r.name));
  // 契約チェックリスト (f): refs は対応（supported）項目だけを指す。
  const advStatus = new Map(referenceAdvanced.map((r) => [r.name, r.status]));
  const baseUnsupported = new Set(
    d.reference.filter((r) => r.supported === false).map((r) => r.name),
  );
  for (const t of templatesAdvanced) {
    for (const k of ["id", "title", "level", "code", "intro", "refs"])
      assert.ok(t[k], `${t.id}.${k}`);
    for (const ref of t.refs) {
      assert.ok(baseNames.has(ref) || advNames.has(ref), `${t.id} の refs: ${ref}`);
      if (advStatus.has(ref)) assert.equal(advStatus.get(ref), "supported", `${t.id} の refs: ${ref}`);
      assert.ok(!baseUnsupported.has(ref), `${t.id} の refs: ${ref}`);
    }
    const p = await first(t.code);
    assert.ok(p.outputs.length > 0, t.id);
  }
});

test("用語集は基礎と重複しない追加分のみである", () => {
  const baseTerms = new Set(d.glossary.map(([term]) => term));
  assert.ok(glossaryAdvanced.length >= 5);
  for (const [term, def] of glossaryAdvanced) {
    assert.ok(typeof term === "string" && term.length > 0);
    assert.ok(typeof def === "string" && def.length > 0, term);
    assert.ok(!baseTerms.has(term), term);
  }
});

test("基礎の挙動が無傷であること（代表ケース）", async () => {
  const p = await first('Set(Count, Value(Input1.Text)); If(Count >= 3, Set(Status, "十分"), Set(Status, "追加しよう")); Notify(Status)');
  assert.deepEqual(outputs(p), ["十分"]);
  const q = await first("ClearCollect(Items, ForAll(Sequence(3), {Number: Value, Square: Value * Value})); Set(Total, Sum(Items, Square)); Notify(Text(Total))");
  assert.deepEqual(outputs(q), ["14"]);
});
