// 高度A2班 Power Fx 監査チーム（lane-a2-team-pfx）の回帰テスト。
// プローブ PFX-01〜PFX-31（lanes/lane-a2/probes.md）の実測結果のうち、
// Microsoft Learn（Power Fx 関数リファレンス）で確定できた期待値を固定する。
// PFX-08／PFX-09 はプローブ表の期待値が Learn と食い違ったため、Learn を
// 正として記録し、Learn どおりの挙動（エラー停止）を固定する。
// PFX-12／13／14／16／17／18 は「未検証・未確認の維持」が合格条件であり、
// ここではエンジンの実際の挙動を期待値として断定せず、文面側の確認は
// 報告書（docs/audit/lane-a2-team-pfx.md）に記録する。本ファイルでは
// それらの式が「捏造した値を返さない」ことだけを固定する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { applyAdvancedEngine } from "../js/types/powerapps/advanced-engine.js";

const d = getDefinition("powerapps");
applyAdvancedEngine(d, null);
const run = async (code, model) =>
  d.simulate(code, structuredClone(model || d.model.defaults));
const val = async (expr) => {
  const r = await run(`Set(r, ${expr})`);
  assert.ok(!r.error, JSON.stringify(r.error));
  const p = r.paths[0];
  assert.ok(!p.error, JSON.stringify(p.error));
  return p.model.variables.r;
};
const errOf = async (code) => {
  const r = await run(code);
  return r.error || r.paths?.[0]?.error || null;
};

test("PFX-01 Atan2(1, 1) は π/4（Learn: Atan2(X, Y)）", async () => {
  assert.equal(await val("Atan2(1, 1)"), Math.PI / 4);
});

test("PFX-02 Weekday 日曜・月曜始まりは数値コード2で 7（列挙形は名指し停止）", async () => {
  // 2026-11-15 は日曜日。Learn（function-datetime-parts）: コード2/11 は
  // 月曜=1〜日曜=7。
  assert.equal(await val("Weekday(Date(2026, 11, 15), 2)"), 7);
  assert.equal(await val("Weekday(Date(2026, 11, 15), 11)"), 7);
  // StartOfWeek 列挙のメンバー参照はこのモデルでは解決できず、名前を
  // 挙げて停止する（WeekNum／Sort と同じ開示方針。Weekday 項目の
  // caution に開示を追加した）。
  const err = await errOf("Set(r, Weekday(Date(2026, 11, 15), StartOfWeek.Monday))");
  assert.ok(err);
  assert.match(err.message, /StartOfWeek/);
});

test("PFX-03 Weekday 種別12（火曜始まり）で日曜は 6", async () => {
  assert.equal(await val("Weekday(Date(2026, 11, 15), 12)"), 6);
});

test("PFX-04 Index の範囲外は Blank でなくエラー（Learn: function-first-last）", async () => {
  const err = await errOf("Set(r, Index(Table({Value: 10}, {Value: 20}, {Value: 30}), 4))");
  assert.ok(err);
  assert.match(err.message, /Index/);
});

test("PFX-05 DateDiff の Quarters は 2（文字列形。列挙形は名指し停止）", async () => {
  assert.equal(await val('DateDiff(Date(2026, 1, 1), Date(2026, 7, 1), "Quarters")'), 2);
  const err = await errOf("Set(r, DateDiff(Date(2026, 1, 1), Date(2026, 7, 1), TimeUnit.Quarters))");
  assert.ok(err);
  assert.match(err.message, /TimeUnit/);
});

test("PFX-06 Sum は数値でない値を変換せず無視する（Learn: function-aggregates）", async () => {
  // 修正前は Number("text") の強制変換で NaN になっていた（欠陥 PFX-D1）。
  assert.equal(await val('Sum(Table({Value: 3}, {Value: "text"}, {Value: 4}), Value)'), 7);
  // 数値が1つも無ければ Blank（0 でも NaN でもない）。
  assert.equal(await val('Sum(Table({Value: "a"}), Value)'), null);
  assert.equal(await val('Sum(Table({Value: Blank()}, {Value: "x"}), Value)'), null);
  // 数値形でも文字列は無視する（Average など高度集計と同規則）。
  assert.equal(await val('Sum("5", 3)'), 3);
  assert.equal(await val("Sum(Blank(), 5)"), 5);
  assert.equal(await val("Sum(Blank())"), null);
});

test("PFX-07 Count に複数列テーブルを渡すと 0 を捏造せずエラー", async () => {
  const err = await errOf("Set(r, Count(Table({A: 1, B: 2})))");
  assert.ok(err);
  assert.match(err.message, /Count/);
});

test("PFX-08 Trunc に小数桁は指定できない（Learn: function-round。プローブ表の期待値は誤り）", async () => {
  const err = await errOf("Set(r, Trunc(-3.99, 1))");
  assert.ok(err);
  assert.match(err.message, /引数の数が正しくありません/);
  assert.equal(await val("Trunc(-3.99)"), -3);
});

test("PFX-09 Round の DecimalPlaces は必須（Learn: function-round。プローブ表の期待値は誤り）", async () => {
  const err = await errOf("Set(r, Round(123.456))");
  assert.ok(err);
  assert.match(err.message, /引数の数が正しくありません/);
  assert.equal(await val("Round(123.456, 0)"), 123);
});

test("PFX-10 With の内側でレコード項目が使える", async () => {
  assert.equal(await val("With({x: 5}, x * x)"), 25);
});

test("PFX-11 Column は動的レコードから値を取り出す（Learn: function-columnnames-column）", async () => {
  assert.equal(await val('Column(ParseJSON("{""a"": 5}"), "a")'), 5);
});

test("PFX-14 \"5\" + 3 は 8 や \"53\" を捏造せず型エラーで停止する（挙動の記録）", async () => {
  const err = await errOf('Set(r, "5" + 3)');
  assert.ok(err);
});

test("PFX-16/24 定義域外は NaN や虚数を捏造せず停止する（挙動の記録）", async () => {
  assert.ok(await errOf("Set(r, Acos(2))"));
  assert.ok(await errOf("Set(r, Sqrt(-1))"));
});

test("PFX-18 Value(\"1,000\") は値を捏造せず変換エラーで停止する（挙動の記録）", async () => {
  assert.ok(await errOf('Set(r, Value("1,000"))'));
});

test("PFX-19 in は大小不区別、exactin は区別する（Learn: operators）", async () => {
  assert.equal(await val('"ell" in "Hello"'), true);
  assert.equal(await val('"ELL" exactin "Hello"'), false);
});

test("PFX-20 テキストの等値は大小不区別（修正 PFX-D2）", async () => {
  assert.equal(await val('"abc" = "ABC"'), true);
  assert.equal(await val('"abc" <> "ABC"'), false);
  assert.equal(await val('"abc" = "abd"'), false);
  // 同根の兄弟表面: Switch の一致判定と Filter の条件も同じ規則。
  assert.equal(await val('Switch("a", "A", 1, 0)'), 1);
  assert.equal(await val('CountRows(Filter(Table({Name: "a"}, {Name: "B"}), Name = "A"))'), 1);
  // 型が異なる場合は従来どおり一致しない。
  assert.equal(await val('"5" = 5'), false);
});

test("PFX-21 Coalesce は最初の Blank でない値を返す", async () => {
  assert.equal(await val("Coalesce(Blank(), Blank(), 7)"), 7);
});

test("PFX-22/23 IfError は0除算を捕捉し、素の0除算はエラー", async () => {
  assert.equal(await val("IfError(1 / 0, -1)"), -1);
  assert.ok(await errOf("Set(r, 1 / 0)"));
});

test("PFX-25 Value(\"abc\") は 0 を捏造せずエラー", async () => {
  assert.ok(await errOf('Set(r, Value("abc"))'));
});

test("PFX-26 Left の境界（0文字・超過）", async () => {
  assert.equal(await val('Left("abc", 0)'), "");
  assert.equal(await val('Left("abc", 10)'), "abc");
});

test("PFX-27 Sequence(3, 10, 5) は 10, 15, 20", async () => {
  assert.deepEqual(await val("Sequence(3, 10, 5)"), [{ Value: 10 }, { Value: 15 }, { Value: 20 }]);
});

test("PFX-28 Text(3.14159, \"0.00\") は \"3.14\"", async () => {
  assert.equal(await val('Text(3.14159, "0.00")'), "3.14");
});

test("PFX-29 Mod(7, 0) はエラー", async () => {
  assert.ok(await errOf("Set(r, Mod(7, 0))"));
});

test("PFX-30 Substitute の出現番号指定はその出現だけを置換する", async () => {
  assert.equal(await val('Substitute("aaa", "a", "b", 2)'), "aba");
});

test("PFX-31 IsBlank(\"\") は true（Learn: function-isblank-isempty）", async () => {
  assert.equal(await val('IsBlank("")'), true);
});

test("CountA は空文字列を数える（Learn: function-table-counts。修正 PFX-D3）", async () => {
  assert.equal(await val('CountA(Table({Value: 1}, {Value: ""}, {Value: 2}))'), 3);
  assert.equal(await val('CountA(Table({Value: 1}, {Value: ""}))'), 2);
  assert.equal(await val("CountA(Table({Value: Blank()}, {Value: 1}))"), 1);
});
