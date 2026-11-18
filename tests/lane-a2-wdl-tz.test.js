// 高度A2班 監査：WDL のタイムゾーン依存の是正（台帳 RG-630）の回帰固定。
// 症状：ゾーン指定の無いタイムスタンプ文字列を JavaScript の
// Date.parse に委ねていたため、実行環境のローカル時刻として解釈
// され、利用者のタイムゾーンで結果が変わっていた（JST では
// formatDateTime('03/15/2018') が -9時間ずれた）。
// 裁定：実 Power Automate／Logic Apps はサーバー側（UTC）で動作
// するランタイムであり、Learn の formatDateTime 例
// （'03/15/2018' → '2018-03-15T00:00:00.0000000'、
// '03/15/2018 12:00:00' → 壁時計保存）が示すとおり、ゾーンなし
// 文字列は書かれた壁時計をそのまま UTC として解釈するのが正しい。
// 本ファイルの期待値は全て UTC 解釈の結果であり、どのタイム
// ゾーンで実行しても同じ結果にならなければならない（JST 実行で
// 是正前は失敗するケースを含む）。
import test from "node:test";
import assert from "node:assert/strict";
import { definition } from "../js/types/powerautomatecloud/index.js";

const M = definition.model.defaults;
const value = async (code, model) => {
  const r = await definition.simulate(code, model || M);
  assert.ok(!r.error, `${code}: ${JSON.stringify(r.error)}`);
  assert.equal(r.paths.length, 1);
  assert.ok(!r.paths[0].error, `${code}: ${JSON.stringify(r.paths[0].error)}`);
  return r.paths[0].vars["結果"];
};
const failure = async (code, model) => {
  const r = await definition.simulate(code, model || M);
  const err = r.error || r.paths[0]?.error;
  assert.ok(err, `${code} は停止するはずです`);
  return err;
};

// ゾーンなし入力は壁時計＝UTC として解釈される（全日時関数の同根表面）。
const ZONELESS_CASES = [
  ["formatDateTime('03/15/2018')", "2018-03-15T00:00:00.0000000"],
  ["formatDateTime('2018-03-15')", "2018-03-15T00:00:00.0000000"],
  ["formatDateTime('2018-03-15T00:00:00')", "2018-03-15T00:00:00.0000000"],
  ["formatDateTime('2018-03-15 00:00:00')", "2018-03-15T00:00:00.0000000"],
  ["formatDateTime('2018/03/15 09:00:00', 'yyyy-MM-dd HH:mm')", "2018-03-15 09:00"],
  ["dayOfWeek('2018-03-15')", 4],
  ["dayOfWeek('2018-03-15T00:30:00')", 4],
  ["dayOfMonth('2018-03-15T00:30:00')", 15],
  ["dayOfYear('2018-03-15T00:30:00')", 74],
  ["dateDifference('2015-02-08', '2018-07-30')", "1268.00:00:00"],
  ["dateDifference('2018-03-15T00:00:00', '2018-03-16T00:00:00')", "1.00:00:00"],
  ["addToTime('2018-03-15T00:00:00', 1, 'Day')", "2018-03-16T00:00:00.0000000"],
  ["subtractFromTime('2018-03-15T00:00:00', 1, 'Hour', 'HH:mm')", "23:00"],
  ["startOfDay('2018-03-15T13:30:30')", "2018-03-15T00:00:00.0000000"],
  ["startOfHour('2018-03-15T13:30:30')", "2018-03-15T13:00:00.0000000"],
  ["startOfMonth('2018-03-15T13:30:30')", "2018-03-01T00:00:00.0000000"],
  ["ticks('2018-03-15T00:00:00')", 636566688000000000n],
  ["parseDateTime('2018-03-15T00:00:00')", "2018-03-15T00:00:00.0000000"],
  ["convertFromUtc('2018-03-15T00:00:00', 'Tokyo Standard Time', 'yyyy-MM-dd HH:mm')", "2018-03-15 09:00"],
];

test("A2-WDL-TZ (a) ゾーンなしタイムスタンプは UTC の壁時計として解釈される", async () => {
  for (const [code, expected] of ZONELESS_CASES)
    assert.deepEqual(await value(code), expected, code);
});

test("A2-WDL-TZ (b) ゾーンなし形式と Z 付き形式は同じ絶対時刻を指す", async () => {
  assert.equal(await value("ticks('2018-03-15T00:00:00')"), await value("ticks('2018-03-15T00:00:00Z')"));
  assert.equal(
    await value("dateDifference('2018-03-15T00:00:00', '2018-03-16T12:00:00')"),
    await value("dateDifference('2018-03-15T00:00:00Z', '2018-03-16T12:00:00Z')"),
  );
  // 明示オフセットは従来どおり絶対時刻として尊重される。
  assert.equal(await value("ticks('2018-03-15T09:00:00+09:00')"), await value("ticks('2018-03-15T00:00:00Z')"));
});

test("A2-WDL-TZ (c) モデルの baseTime もゾーンなしなら UTC として解釈される", async () => {
  const model = { ...M, baseTime: "2026-01-15T09:00:00" };
  assert.equal(await value("utcNow()", model), "2026-01-15T09:00:00.0000000");
  assert.equal(await value("getFutureTime(5, 'Day')", model), "2026-01-20T09:00:00.0000000");
});

test("A2-WDL-TZ (d) 解釈できない入力の停止はタイムゾーンに依存しない", async () => {
  assert.match((await failure("formatDateTime('not-a-date', 'yyyy')")).message, /解釈できません/);
  assert.match((await failure("formatDateTime('2018-13-01')")).message, /解釈できません/);
  assert.match((await failure("formatDateTime('2018-03-32')")).message, /解釈できません/);
});
