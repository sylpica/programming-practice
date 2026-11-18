// 高度A2班 WDL 監査チーム（lane-a2-team-wdl）の独立監査テスト。
// 対象：プローブ WDL-01〜WDL-32、B2 修正点16系統の再発確認、
// 書式 'T' リテラルの是正（コーディネーター裁定課題）の回帰固定、
// C-12 全数照合の補強（未対応21件の直接呼び出し）。
// 期待値はアプリ出力を見る前に Microsoft Learn「ワークフロー定義
// 言語 関数リファレンス」から再導出した。プローブ表
// （lanes/lane-a2/probes.md）の期待値と Learn が食い違う箇所は
// Learn を正とし、本表の誤りとして各テストに明記する。
import test from "node:test";
import assert from "node:assert/strict";
import { definition, UNSUPPORTED_FUNCTIONS} from "../js/types/powerautomatecloud/index.js";

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

// ---------------------------------------------------------------------
// プローブ WDL-01〜WDL-32（Learn 再導出の期待値）
// ---------------------------------------------------------------------
test("A2-WDL監査 プローブ WDL-01〜WDL-13（文字列・比較・日時）", async () => {
// WDL-01：replace は大小区別（Learn 明記）。'hello' は現れない。
assert.equal(await value("replace('Hello World', 'hello', 'X')"), "Hello World");
// WDL-02：contains は大小区別（Learn 明記）。
assert.equal(await value("contains('Hello', 'hello')"), false);
// WDL-03：表は false とするが、Learn の
// equals 例は equals(true, 1) → true（"Both values are
// equivalent"）。Learn を正とし true を期待する。
assert.equal(await value("equals(true, 1)"), true);
// WDL-04：表は false とするが、Learn の
// 論理比較の注記「null 値は空文字列 "" に変換される」により
// equals(null, '') は true。Learn を正とする。
assert.equal(await value("equals(null, '')"), true);
// WDL-05：素の decodeDataUri の戻り値はバイナリ値（Learn 明記）。
assert.deepEqual(
await value("decodeDataUri('data:text/plain;base64,SGVsbG8=')"),
{ kind: "binary", base64: "SGVsbG8="},
);
// WDL-05 後段の string(...) = 'Hello' は Learn の string() の
// 説明にバイナリ値の例が無く一次情報で確定できない（未確認）。
// 現在の挙動はバイナリの Base64 表現を返すこと。これは期待値の
// 断定ではなく挙動の記録であり、変われば検知できるよう固定する。
assert.equal(
await value("string(decodeDataUri('data:text/plain;base64,SGVsbG8='))"),
"SGVsbG8=", // 挙動記録（Learn 未定義）
);
// WDL-06：substring の length は任意（Learn 明記）。
assert.equal(await value("substring('hello world', 6)"), "world");
// WDL-07：表はエラーとするが、Learn は
// 「occurrence が負なら末尾から探す」と明記する。'aXbXc' の
// 'X' は位置1と3、末尾から1番目は 3。Learn を正とする。
assert.equal(await value("nthIndexOf('aXbXc', 'X', -1)"), 3);
assert.equal(await value("nthIndexOf('hello', 'l', -2)"), 2);
// occurrence = 0 は Learn の定義域（1始まり／負は末尾）外で停止。
assert.match((await failure("nthIndexOf('hello', 'l', 0)")).message, /nthIndexOf/);
// WDL-08：表はエラーとするが、Learn の
// slice は範囲外を切り捨てる（例 slice('Hello World', 30) →
// ''、slice('Hello World', 6, 20) → 'World'）。Learn を正とする。
assert.equal(await value("slice('hello', 1, 10)"), "ello");
assert.equal(await value("slice('hello', 10)"), "");
// WDL-09：addToTime の月末丸め（1月31日の1か月後は2月28日）。
assert.equal(await value("addToTime('2026-01-31T00:00:00Z', 1, 'Month', 'yyyy-MM-dd')"), "2026-02-28");
// WDL-10：表は引数順を取り違え '2.00:00:00'
// とするが、Learn の dateDifference(startDate, endDate) は
// endDate − startDate。1月1日 − 1月3日 は負になる。Learn を正とする。
assert.equal(
await value("dateDifference('2026-01-03T00:00:00Z', '2026-01-01T00:00:00Z')"),
"-2.00:00:00",
);
assert.equal(
await value("dateDifference('2026-01-01T00:00:00Z', '2026-01-03T00:00:00Z')"),
"2.00:00:00",
);
// WDL-11：div の小数判定（両方整数のときだけ整数の商）。
assert.equal(await value("div(7, 2)"), 3);
assert.equal(await value("div(7.0, 2)"), 3.5);
// WDL-12：utcNow() の既定は "o" 形式（'T' 区切り・末尾 'Z'）。
assert.match(await value("utcNow()"), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z$/);
// WDL-13：removeProperty は新しいオブジェクトを返す。式モデルに
// 変数の別名付けが無いため原物の不変は同一式内では観測できず、
// 実装が structuredClone 後に削除すること（コード確認済み）と
// 戻り値・欠けたキーの原形返却で固定する。
assert.deepEqual(await value("removeProperty(json('{\"a\":1,\"b\":2}'), 'a')"), { b: 2});
assert.deepEqual(await value("removeProperty(json('{\"a\":1,\"b\":2}'), 'zzz')"), { a: 1, b: 2});
});

test("A2-WDL監査 プローブ WDL-14／15（未確認再確認：挙動の記録のみ）", async () => {
// Learn の isFloat の説明には 'NaN'／'Infinity' の扱いの確定
// 文面が無い。以下は期待値の断定ではなく現在の挙動の記録。
assert.equal(await value("isFloat('NaN')"), false); // 挙動記録
assert.equal(await value("isFloat('Infinity')"), false); // 挙動記録
// 項目文面が確定を主張していないこと：isFloat の説明・注意に
// 'NaN'／'Infinity' への言及自体が無い（主張の不在を確認）。
const item = definition.reference.find((r) => r.name === "isFloat");
assert.ok(!/NaN|Infinity/.test(item.description + item.caution + item.syntax));
});

test("A2-WDL監査 プローブ WDL-16〜WDL-32", async () => {
// WDL-16：convertFromUtc（Tokyo は UTC+9）。
assert.equal(
await value("convertFromUtc('2026-01-01T00:00:00Z', 'Tokyo Standard Time', 'yyyy-MM-dd HH:mm')"),
"2026-01-01 09:00",
);
// WDL-16 付帯（B2 修正点）：タイムゾーン名の大小文字。誤った
// 大小でも「虚偽の結果」を返さないことが要件であり、本実装は
// 大小区別なく正規のゾーンへ解決するため、返る値はその名前が
// 指すゾーンの正しい変換結果である（捏造ではない）。
assert.equal(
await value("convertFromUtc('2026-01-01T00:00:00Z', 'tokyo standard time', 'yyyy-MM-dd HH:mm')"),
"2026-01-01 09:00",
);
// 存在しないゾーン名は名前を挙げて停止する。
assert.match((await failure("convertFromUtc('2026-01-01T00:00:00Z', 'No Such Zone')")).message, /タイムゾーン/);
// WDL-17
assert.equal(await value("formatDateTime('2026-02-03T04:05:06Z', 'yyyy/MM/dd')"), "2026/02/03");
// WDL-18
assert.equal(await value("join(createArray('a', 'b', 'c'), '-')"), "a-b-c");
// WDL-19
assert.equal(await value("json('{\"a\": 1}')['a']"), 1);
// WDL-20
assert.equal(await value("indexOf('hello', 'z')"), -1);
// WDL-21
assert.equal(await value("length('')"), 0);
assert.equal(await value("empty('')"), true);
// WDL-22
assert.equal(await value("coalesce(null, null, 'x')"), "x");
// WDL-23
assert.deepEqual(await value("range(5, 3)"), [5, 6, 7]);
// WDL-24〜WDL-28：敵対的入力は名前を挙げて停止する。
assert.match((await failure("div(1, 0)")).message, /div/);
assert.match((await failure("int('12a')")).message, /int/);
assert.match((await failure("substring('hi', 5)")).message, /substring/);
assert.match((await failure("toLower(42)")).message, /toLower/);
assert.match((await failure("formatDateTime('not-a-date', 'yyyy')")).message, /formatDateTime/);
// WDL-29：表は大小区別（false）とするが、
// Learn は startsWith／endsWith／indexOf／lastIndexOf を
// 「大文字と小文字を区別しない」と明記する。Learn を正とする。
assert.equal(await value("startsWith('Hello', 'he')"), true);
assert.equal(await value("endsWith('Hello', 'LO')"), true);
assert.equal(await value("indexOf('hello', 'L')"), 2);
assert.equal(await value("lastIndexOf('hello', 'L')"), 3);
// WDL-30
assert.equal(await value("string(add(1, mul(2, 3)))"), "7");
// WDL-31
assert.equal(await value("take('hello', 2)"), "he");
assert.deepEqual(await value("skip(createArray(1, 2, 3), 1)"), [2, 3]);
// WDL-32：guid は GUID 書式（値は決定的モデルだが形を照合）。
assert.match(
await value("guid()"),
/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
);
});

// ---------------------------------------------------------------------
// 書式 'T' リテラル是正の回帰（コーディネーター裁定課題）
// 根拠：Learn の formatDateTime 例は
// formatDateTime('03/15/2018 12:00:00', 'yyyy-MM-ddTHH:mm:ss')
// → '2018-03-15T12:00:00'。.NET カスタム書式では T は指定子では
// なくリテラル文字であり、引用符で囲んだ部分と \ エスケープも
// リテラルである。是正は formatParts を使う全表面に及ぶ。
// ---------------------------------------------------------------------
test("A2-WDL監査 'T' リテラル：Learn の代表例と formatParts 全表面", async () => {
assert.equal(
await value("formatDateTime('03/15/2018 12:00:00', 'yyyy-MM-ddTHH:mm:ss')"),
"2018-03-15T12:00:00",
);
const F = "'yyyy-MM-ddTHH:mm'";
const cases = [
[`formatDateTime('2026-01-15T09:00:00Z', ${F})`, "2026-01-15T09:00"],
[`utcNow(${F})`, "2026-01-15T09:00"],
[`addDays('2026-01-15T09:00:00Z', 1, ${F})`, "2026-01-16T09:00"],
[`addHours('2026-01-15T09:00:00Z', 1, ${F})`, "2026-01-15T10:00"],
[`addMinutes('2026-01-15T09:00:00Z', 1, ${F})`, "2026-01-15T09:01"],
[`addSeconds('2026-01-15T09:00:00Z', 90, ${F})`, "2026-01-15T09:01"],
[`addToTime('2026-01-15T09:00:00Z', 1, 'Day', ${F})`, "2026-01-16T09:00"],
[`subtractFromTime('2026-01-15T09:00:00Z', 1, 'Day', ${F})`, "2026-01-14T09:00"],
[`convertFromUtc('2026-01-15T09:00:00Z', 'Tokyo Standard Time', ${F})`, "2026-01-15T18:00"],
[`convertToUtc('2026-01-15T18:00:00', 'Asia/Tokyo', ${F})`, "2026-01-15T09:00"],
[`convertTimeZone('2026-01-15T18:00:00', 'Tokyo Standard Time', 'UTC', ${F})`, "2026-01-15T09:00"],
[`startOfDay('2026-01-15T09:30:00Z', ${F})`, "2026-01-15T00:00"],
[`startOfHour('2026-01-15T09:30:45Z', ${F})`, "2026-01-15T09:00"],
[`startOfMonth('2026-01-15T09:30:00Z', ${F})`, "2026-01-01T00:00"],
[`getFutureTime(1, 'Day', ${F})`, "2026-01-16T09:00"],
[`getPastTime(1, 'Day', ${F})`, "2026-01-14T09:00"],
];
for (const [code, expected] of cases) assert.equal(await value(code), expected, code);
// parseDateTime の整形側は既定書式だが、書式指定の解釈側でも
// 'T' はリテラルとして一致する。
assert.equal(
await value("parseDateTime('2018-03-15T12:00:00', 'en-US', 'yyyy-MM-ddTHH:mm:ss')"),
"2018-03-15T12:00:00.0000000",
);
});

test("A2-WDL監査 書式リテラル：引用符と \\ エスケープ、未対応トークンの名指し維持", async () => {
// 引用符で囲んだ部分はリテラル（.NET 書式の規則）。
assert.equal(
await value("formatDateTime('2026-01-15T09:00:00Z', 'yyyy\"年\"MM\"月\"dd\"日\"')"),
"2026年01月15日",
);
assert.equal(
await value("formatDateTime('2026-01-15T09:00:00Z', 'yyyy''MM''dd')"),
"2026MM15",
);
// \ エスケープした文字はリテラル（Learn の parseDateTime 例
// 'MM/dd/yyyy HH\h' の形）。
assert.equal(
await value("parseDateTime('03/15/2018 12h', 'en-US', 'MM/dd/yyyy HH\\h')"),
"2018-03-15T12:00:00.0000000",
);
assert.equal(
await value("formatDateTime('2026-01-15T09:00:00Z', 'HH\\hmm')"),
"09h00",
);
// 対応外トークンは引き続き名前を挙げて停止する。dddd の直後に
// リテラル T が続く形でも dddd を名指しできる（同字ランの判定）。
assert.match((await failure("formatDateTime('2026-01-15T09:00:00Z', 'dddd')")).message, /dddd/);
assert.match((await failure("formatDateTime('2026-01-15T09:00:00Z', 'ddddTHH:mm')")).message, /dddd/);
assert.match((await failure("formatDateTime('2026-01-15T09:00:00Z', 'yyyy-MM-ddTHH:mm:ssK')")).message, /K/);
assert.match((await failure("utcNow('MMMM')")).message, /MMMM/);
// 文面と挙動の整合：formatDateTime の注意文が 'T' リテラルを
// 明示し、「対応外は全て停止」と読める主張になっていない。
const item = definition.reference.find((r) => r.name === "formatDateTime");
assert.match(item.caution, /T は \.NET 書式では指定子ではなくリテラル/);
});

// ---------------------------------------------------------------------
// C-12 補強：未対応21件は「項目の例」経由でなく直接呼び出しでも
// 全件が自分の名前を挙げて未対応で停止する（機械全数）。
// ---------------------------------------------------------------------
test("A2-WDL監査 C-12補強：未対応21件の直接呼び出し全数", async () => {
assert.equal(UNSUPPORTED_FUNCTIONS.length, 21);
assert.equal(definition.reference.length, 137);
assert.equal(definition.reference.filter((r) => r.supported).length, 116);
for (const name of UNSUPPORTED_FUNCTIONS) {
const err = await failure(`${name}()`);
assert.equal(err.category, "未対応", `${name} のカテゴリ`);
assert.ok(err.message.includes(name), `${name} を名指しすること: ${err.message}`);
assert.match(err.message, /ランタイム/, `${name} の理由`);
}
});

// B2 再発確認の追加分（adv-b2-wdl.test.js の台帳と重ならない観点）。
test("A2-WDL監査 B2再発確認：既定書式 'o' の同根表面と slice 配列の範囲外", async () => {
// 既定書式 "o" は日時関数の同根表面で同じ形になる。
const O = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z$/;
assert.match(await value("addDays('2026-01-15T09:00:00Z', 1)"), O);
assert.match(await value("getFutureTime(1, 'Day')"), O);
assert.match(await value("getPastTime(1, 'Day')"), O);
assert.match(await value("startOfDay('2026-01-15T09:30:00Z')"), O);
// slice は配列でも範囲外を切り捨てる（Learn の slice は
// 文字列・配列共通で、開始が長さ以上なら空を返す）。
assert.deepEqual(await value("slice(createArray(1, 2, 3), 10)"), []);
assert.deepEqual(await value("slice(createArray(1, 2, 3), 1, 99)"), [2, 3]);
});
