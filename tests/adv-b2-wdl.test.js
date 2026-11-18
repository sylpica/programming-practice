// 高度モード ブロックB2：Power Automate（クラウド）＝ WDL 式関数の新種別
// （ユーザー決定 U-47）の検証。
// 一次情報：Microsoft Learn「Workflow Definition Language functions
// reference」。棚卸しは advanced-inventory/inventory-powerautomate.md
// （全137件、未対応候補21件）。
import test from "node:test";
import assert from "node:assert/strict";
import { definition, UNSUPPORTED_FUNCTIONS } from "../js/types/powerautomatecloud/index.js";
import { validateDefinition } from "../js/types/registry.js";

const M = definition.model.defaults;
const runRaw = (code, model) => definition.simulate(code, model || M);
const value = async (code, model) => {
  const r = await runRaw(code, model);
  assert.ok(!r.error, `${code}: ${JSON.stringify(r.error)}`);
  assert.equal(r.paths.length, 1);
  assert.ok(!r.paths[0].error, `${code}: ${JSON.stringify(r.paths[0].error)}`);
  return r.paths[0].vars["結果"];
};
const failure = async (code, model) => {
  const r = await runRaw(code, model);
  const err = r.error || r.paths[0]?.error;
  assert.ok(err, `${code} は停止するはずです`);
  return err;
};

// 棚卸し全137件（inventory-powerautomate.md の項目名、その表記どおり）。
const INVENTORY = [
  "action", "actions", "add", "addDays", "addHours", "addMinutes", "addProperty",
  "addSeconds", "addToTime", "and", "array", "base64", "base64ToBinary",
  "base64ToJson", "base64ToString", "binary", "body", "bool", "chunk", "coalesce",
  "concat", "contains", "convertFromUtc", "convertTimeZone", "convertToUtc",
  "createArray", "dataUri", "dataUriToBinary", "dataUriToString", "dateDifference",
  "dayOfMonth", "dayOfWeek", "dayOfYear", "decimal", "decodeBase64", "decodeDataUri",
  "decodeUriComponent", "decodeXmlName", "decodeXmlValue", "div", "empty",
  "encodeBase64", "encodeUriComponent", "encodeXmlName", "encodeXmlValue",
  "endsWith", "equals", "first", "float", "formatDateTime", "formatNumber",
  "formatTimeSpan", "formDataMultiValues", "formDataValue", "getFutureTime",
  "getPastTime", "greater", "greaterOrEquals", "guid", "if", "indexOf", "int",
  "intersection", "isFloat", "isInt", "item", "items", "iterationIndexes", "join",
  "json", "last", "lastIndexOf", "length", "less", "lessOrEquals",
  "listCallbackUrl", "max", "mergeObjects", "min", "mod", "mul", "multipartBody",
  "not", "nthIndexOf", "or", "outputs", "parameters", "parse", "parseDateTime",
  "pow", "rand", "range", "removeProperty", "replace", "result", "reverse",
  "setProperty", "skip", "slice", "sort", "split", "startOfDay", "startOfHour",
  "startOfMonth", "startsWith", "string", "strongEquals", "sub", "substring",
  "subtractFromTime", "take", "ticks", "toLower", "toUpper", "trigger",
  "triggerBody", "triggerFormDataMultiValues", "triggerFormDataValue",
  "triggerMultipartBody", "triggerOutputs", "trim", "trimByteOrderMark", "union",
  "uriComponent", "uriComponentToBinary", "uriComponentToString", "uriHost",
  "uriPath", "uriPathAndQuery", "uriPort", "uriQuery", "uriScheme", "utcNow",
  "variables", "workflow", "xml", "xpath",
];
const EXPECTED_UNSUPPORTED = [
  "action", "actions", "body", "formDataMultiValues", "formDataValue", "item",
  "items", "iterationIndexes", "listCallbackUrl", "multipartBody", "outputs",
  "parameters", "result", "trigger", "triggerBody", "triggerFormDataMultiValues",
  "triggerFormDataValue", "triggerMultipartBody", "triggerOutputs", "variables",
  "workflow",
];

test("B2-WDL (a) validateDefinition を満たし、id／name が指定どおり", () => {
  validateDefinition(definition);
  assert.equal(definition.id, "powerautomatecloud");
  assert.equal(definition.name, "Power Automate（クラウド）");
  assert.equal(definition.model.kind, "json");
  assert.ok(definition.templates.length >= 5 && definition.templates.length <= 7);
  assert.ok(definition.glossary.length >= 5 && definition.glossary.length <= 8);
  // 既存のデスクトップ種別とは別物であることが semantics に明示されている。
  assert.match(definition.semantics.description, /デスクトップ/);
  assert.match(definition.semantics.support, /基準時刻/);
});

test("B2-WDL (b) カタログ完全性：棚卸し137件が過不足なく、未対応21件が supported=false", () => {
  assert.equal(INVENTORY.length, 137);
  const names = definition.reference.map((r) => r.name);
  assert.deepEqual([...names].sort(), [...INVENTORY].sort());
  assert.equal(new Set(names.map((n) => n.toLowerCase())).size, 137);
  const unsupported = definition.reference.filter((r) => !r.supported).map((r) => r.name);
  assert.deepEqual([...unsupported].sort(), [...EXPECTED_UNSUPPORTED].sort());
  assert.deepEqual([...UNSUPPORTED_FUNCTIONS].sort(), [...EXPECTED_UNSUPPORTED].sort());
  assert.equal(definition.reference.filter((r) => r.supported).length, 116);
  for (const r of definition.reference) {
    assert.ok(r.returns, `${r.name} に returns が必要です`);
    assert.ok(r.source?.startsWith("https://learn.microsoft.com/en-us/azure/logic-apps/workflow-definition-language-functions-reference"), `${r.name} の source`);
    assert.ok(r.category && r.syntax && r.description && r.example, `${r.name} の rows 形式`);
  }
});

test("B2-WDL テンプレートと対応116件の例が全て正常に実行できる", async () => {
  for (const t of definition.templates) {
    const r = await runRaw(t.code);
    assert.ok(!r.error && !r.paths[0].error, `${t.id}: ${JSON.stringify(r.error || r.paths[0].error)}`);
    for (const ref of t.refs)
      assert.ok(definition.reference.some((x) => x.name === ref), `${t.id} の参照 ${ref}`);
  }
  for (const item of definition.reference) {
    if (!item.supported) continue;
    const r = await runRaw(item.example);
    assert.ok(!r.error && !r.paths[0].error, `項目 ${item.name} の例: ${JSON.stringify(r.error || r.paths[0].error)}`);
  }
  // scan は実在項目だけを返す。
  const scanned = definition.scan("concat(uriHost('x'), string(utcNow()))");
  assert.deepEqual([...scanned].sort(), ["concat", "string", "uriHost", "utcNow"]);
});

test("B2-WDL (c) F-01 文字列関数：典型・境界・異常・組み合わせ", async () => {
  assert.equal(await value("concat('Hello', ' ', 'WDL')"), "Hello WDL");
  assert.deepEqual(await value("concat(createArray(1, 2), createArray(3))"), [1, 2, 3]);
  assert.deepEqual(await value("chunk('abcdef', 2)"), ["ab", "cd", "ef"]);
  assert.deepEqual(await value("chunk('abcdef', 4)"), ["abcd", "ef"]);
  assert.deepEqual(await value("chunk(createArray(1, 2, 3, 4, 5), 2)"), [[1, 2], [3, 4], [5]]);
  assert.match((await failure("chunk('abc', 0)")).message, /chunk/);
  assert.equal(await value("endsWith('report.txt', '.TXT')"), true);
  assert.equal(await value("startsWith('report.txt', 'report')"), true);
  assert.equal(await value("indexOf('hello', 'L')"), 2);
  assert.equal(await value("indexOf('hello', 'z')"), -1);
  assert.equal(await value("lastIndexOf('hello', 'l')"), 3);
  assert.equal(await value("nthIndexOf('hello', 'l', 2)"), 3);
  assert.equal(await value("nthIndexOf('hello', 'l', 3)"), -1);
  assert.equal(await value("isFloat('1.5')"), true);
  assert.equal(await value("isFloat('abc')"), false);
  assert.equal(await value("isInt('42')"), true);
  assert.equal(await value("isInt('4.2')"), false);
  assert.equal(await value("length('hello')"), 5);
  assert.equal(await value("length(createArray(1, 2))"), 2);
  assert.match((await failure("length(42)")).message, /length/);
  assert.equal(await value("replace('a-b-a', 'a', 'x')"), "x-b-x");
  assert.equal(await value("replace('a-b-a', 'A', 'x')"), "a-b-a"); // Learn：replace は大小区別
  assert.equal(await value("slice('abcdef', 1, 4)"), "bcd");
  assert.equal(await value("slice('abcdef', -2)"), "ef");
  assert.deepEqual(await value("slice(createArray(1, 2, 3), 1)"), [2, 3]);
  assert.deepEqual(await value("split('a,b,c', ',')"), ["a", "b", "c"]);
  assert.equal(await value("substring('abcdef', 2, 3)"), "cde");
  assert.match((await failure("substring('abc', 2, 5)")).message, /substring/);
  assert.equal(await value("toLower('AbC')"), "abc");
  assert.equal(await value("toUpper('AbC')"), "ABC");
  assert.equal(await value("trim('  hi  ')"), "hi");
  assert.equal(await value("trimByteOrderMark('﻿abc﻿')"), "abc﻿"); // Learn：先頭の BOM のみ除去
  assert.equal(await value("formatNumber(1234.5, '#,##0.00')"), "1,234.50");
  assert.equal(await value("formatNumber(0.256, '0.0%')"), "25.6%");
  assert.equal(await value("formatNumber(1234, 'C', 'ja-JP')"), "¥1,234");
  assert.match((await failure("formatNumber(1, 'Q')")).message, /formatNumber/);
  // guid は決定的：同じモデルでは同じ値、1回の実行内では呼び出すたびに変わる。
  const g1 = await value("guid()"), g2 = await value("guid()");
  assert.equal(g1, g2);
  assert.match(g1, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const pair = await runRaw("guid()\nguid()");
  assert.notEqual(pair.paths[0].vars["式1"], pair.paths[0].vars["式2"]);
  assert.equal((await value("guid('N')")).length, 32);
  assert.match((await failure("guid('Q')")).message, /guid/);
});

test("B2-WDL (c) F-01 コレクション・論理比較：典型・境界・異常・組み合わせ", async () => {
  assert.equal(await value("contains(createArray(1, 2, 3), 2)"), true);
  assert.equal(await value("contains('Hello', 'ell')"), true);
  assert.equal(await value("contains(json('{\"Name\": 1}'), 'name')"), false); // Learn：contains は大小区別
  assert.equal(await value("contains(json('{\"Name\": 1}'), 'Name')"), true);
  assert.equal(await value("empty(null)"), true);
  assert.equal(await value("empty('')"), true);
  assert.equal(await value("empty(createArray())"), true);
  assert.equal(await value("empty(createArray(1))"), false);
  assert.match((await failure("empty(42)")).message, /empty/);
  assert.equal(await value("first(createArray(3, 1, 2))"), 3);
  assert.equal(await value("first('')"), null);
  assert.equal(await value("last(createArray(3, 1, 2))"), 2);
  assert.deepEqual(await value("intersection(createArray(1, 2, 3), createArray(2, 3, 4))"), [2, 3]);
  assert.deepEqual(await value("union(createArray(1, 2), createArray(2, 3))"), [1, 2, 3]);
  assert.equal(await value("join(createArray('a', 'b'), '-')"), "a-b");
  assert.deepEqual(await value("reverse(createArray(1, 2, 3))"), [3, 2, 1]);
  assert.deepEqual(await value("skip(createArray(1, 2, 3), 1)"), [2, 3]);
  assert.deepEqual(await value("take(createArray(1, 2, 3), 2)"), [1, 2]);
  assert.equal(await value("take('hello', 2)"), "he");
  assert.match((await failure("take(createArray(1), -1)")).message, /take/);
  assert.deepEqual(await value("sort(createArray(3, 1, 2))"), [1, 2, 3]);
  assert.deepEqual(await value("sort(json('[{\"n\": 3}, {\"n\": 1}]'), 'n')"), [{ n: 1 }, { n: 3 }]);
  assert.match((await failure("sort(createArray(1, 'a'))")).message, /sort/);
  // 論理比較：equals は型変換あり、strongEquals は型まで厳密。
  assert.equal(await value("equals(1, '1')"), true);
  assert.equal(await value("equals('a', 'A')"), true);
  assert.match((await failure("strongEquals(1, '1')")).message, /strongEquals/); // Learn：型が違うとエラー
  assert.equal(await value("strongEquals('a', 'A')"), false);
  assert.equal(await value("strongEquals(1, 1)"), true);
  assert.equal(await value("greater(3, 2)"), true);
  assert.equal(await value("greaterOrEquals(2, 2)"), true);
  assert.equal(await value("less(2, 3)"), true);
  assert.equal(await value("lessOrEquals(2, 2)"), true);
  assert.equal(await value("and(equals(1, 1), greater(3, 2))"), true);
  assert.equal(await value("or(equals(1, 2), greater(3, 2))"), true);
  assert.equal(await value("not(equals(1, 2))"), true);
  // if／coalesce／and／or は確定した側・残りを評価しない（0除算に触れない）。
  assert.equal(await value("if(false, div(1, 0), 'safe')"), "safe");
  assert.equal(await value("if(greater(3, 2), '大きい', '小さい')"), "大きい");
  assert.equal(await value("coalesce(null, 'x', div(1, 0))"), "x");
  assert.equal(await value("coalesce(null, null)"), null);
  assert.equal(await value("and(false, div(1, 0) == 0)"), false);
});

test("B2-WDL (c) F-01 変換・数学：典型・境界・異常・組み合わせ", async () => {
  assert.deepEqual(await value("array('a')"), ["a"]);
  assert.match((await failure("array(createArray(1))")).message, /array/);
  assert.deepEqual(await value("createArray(1, 'a', true)"), [1, "a", true]);
  assert.equal(await value("base64('hello')"), "aGVsbG8=");
  assert.equal(await value("base64ToString(base64('こんにちは'))"), "こんにちは");
  assert.deepEqual(await value("base64ToBinary('aGVsbG8=')"), { kind: "binary", base64: "aGVsbG8=" });
  assert.deepEqual(await value("base64ToJson('eyJhIjoxfQ==')"), { a: 1 });
  assert.deepEqual(await value("binary('hello')"), { kind: "binary", base64: "aGVsbG8=" });
  assert.equal(await value("base64(binary('hello'))"), "aGVsbG8=");
  assert.match((await failure("base64ToString('!!!')")).message, /Base64/);
  assert.equal(await value("bool('True')"), true);
  assert.equal(await value("bool(1)"), true);
  assert.equal(await value("bool(0)"), false);
  assert.match((await failure("bool('yes')")).message, /bool/);
  assert.equal(await value("dataUriToString(dataUri('hello'))"), "hello");
  assert.deepEqual(await value("dataUriToBinary('data:text/plain;base64,aGVsbG8=')"), { kind: "binary", base64: "aGVsbG8=" });
  assert.deepEqual(await value("decodeDataUri(dataUri('abc'))"), { kind: "binary", base64: "YWJj" }); // Learn：dataUriToBinary の別名
  assert.equal(await value("decimal('1.25')"), 1.25);
  assert.equal(await value("float('1e3')"), 1000);
  assert.equal(await value("int('42')"), 42);
  assert.equal(await value("int(2.5)"), 2);
  assert.equal(await value("int(3.5)"), 4);
  assert.match((await failure("int('1.5')")).message, /int/);
  assert.equal(await value("json('{\"a\": {\"b\": 5}}').a.b"), 5);
  assert.equal(await value("json('{\"a\": [10, 20]}')['a'][1]"), 20);
  assert.deepEqual(await value("parse('{\"a\": 1}')"), { a: 1 });
  assert.match((await failure("json('not json')")).message, /json/);
  assert.equal(await value("string(42)"), "42");
  assert.equal(await value("string(null)"), "");
  assert.equal(await value("string(json('{\"a\": 1}'))"), "{\"a\":1}");
  assert.equal(await value("uriComponentToString(uriComponent('a b&c'))"), "a b&c");
  assert.equal(await value("decodeUriComponent('a%20b')"), "a b");
  assert.equal(await value("encodeUriComponent('a b')"), "a%20b");
  assert.deepEqual(await value("uriComponentToBinary('a%20b')"), { kind: "binary", base64: "YSBi" });
  // 数学
  assert.equal(await value("add(1, 2)"), 3);
  assert.equal(await value("sub(5, 3)"), 2);
  assert.equal(await value("mul(3, 4)"), 12);
  assert.equal(await value("div(10, 3)"), 3);
  assert.equal(await value("div(10.5, 2)"), 5.25);
  assert.equal(await value("mod(-7, 3)"), -1);
  assert.match((await failure("div(1, 0)")).message, /div/);
  assert.match((await failure("mod(1, 0)")).message, /mod/);
  assert.equal(await value("pow(2, 10)"), 1024);
  assert.equal(await value("max(1, 5, 3)"), 5);
  assert.equal(await value("max(createArray(1, 5, 3))"), 5);
  assert.equal(await value("min(1, 5, 3)"), 1);
  assert.deepEqual(await value("range(1, 4)"), [1, 2, 3, 4]);
  assert.deepEqual(await value("range(5, 0)"), []);
  assert.match((await failure("range(1, -1)")).message, /range/);
  // rand は決定的で範囲内：同じモデルで再現し、[min, max) に収まる。
  const seq1 = await runRaw("rand(1, 7)\nrand(1, 7)\nrand(1, 7)");
  const seq2 = await runRaw("rand(1, 7)\nrand(1, 7)\nrand(1, 7)");
  assert.deepEqual(seq1.paths[0].vars, seq2.paths[0].vars);
  for (const k of ["式1", "式2", "式3"]) {
    const v = seq1.paths[0].vars[k];
    assert.ok(Number.isInteger(v) && v >= 1 && v < 7, `rand の範囲: ${v}`);
  }
  assert.equal(await value("rand(5, 6)"), 5);
});

test("B2-WDL (c) F-01 日時・URI・JSON/XML：典型・境界・異常・組み合わせ", async () => {
  // 決定的モデル：utcNow はモデルの基準時刻そのもの。編集すれば変わる。
  assert.equal(await value("utcNow()"), "2026-01-15T09:00:00.0000000Z"); // Learn：既定は "o" 形式
  assert.equal(await value("utcNow('yyyy-MM-dd')"), "2026-01-15");
  assert.equal(await value("utcNow()", { ...M, baseTime: "2027-06-30T00:00:00.000Z" }), "2027-06-30T00:00:00.0000000Z");
  assert.equal((await runRaw("utcNow()", { baseTime: "not-a-date" })).error.category, "モデルエラー");
  assert.equal(await value("addDays('2026-01-15T09:00:00Z', 3, 'yyyy-MM-dd')"), "2026-01-18");
  assert.equal(await value("addHours('2026-01-15T09:00:00Z', 5, 'HH:mm')"), "14:00");
  assert.equal(await value("addMinutes('2026-01-15T09:00:00Z', 90, 'HH:mm')"), "10:30");
  assert.equal(await value("addSeconds('2026-01-15T09:00:00Z', 30, 'HH:mm:ss')"), "09:00:30");
  assert.equal(await value("addToTime(utcNow(), 1, 'Month', 'yyyy-MM-dd')"), "2026-02-15");
  assert.equal(await value("subtractFromTime('2026-01-15T09:00:00Z', 2, 'Day', 'yyyy-MM-dd')"), "2026-01-13");
  assert.equal(await value("getFutureTime(3, 'Day', 'yyyy-MM-dd')"), "2026-01-18");
  assert.equal(await value("getPastTime(1, 'Day', 'yyyy-MM-dd')"), "2026-01-14");
  assert.equal(await value("convertFromUtc(utcNow(), 'Tokyo Standard Time', 'yyyy-MM-dd HH:mm')"), "2026-01-15 18:00");
  assert.equal(await value("convertToUtc('2026-01-15T18:00:00', 'Asia/Tokyo', 'HH:mm')"), "09:00");
  assert.equal(await value("convertTimeZone('2026-01-15T18:00:00', 'Tokyo Standard Time', 'UTC', 'HH:mm')"), "09:00");
  assert.match((await failure("convertFromUtc(utcNow(), 'No Such Zone')")).message, /タイムゾーン/);
  assert.equal(await value("dateDifference('2026-01-15T09:00:00Z', '2026-01-17T09:00:00Z')"), "2.00:00:00"); // Learn 例 "1268.00:00:00" と同形式
  assert.equal(await value("dayOfMonth('2026-01-15T09:00:00Z')"), 15);
  assert.equal(await value("dayOfWeek('2026-01-15T09:00:00Z')"), 4);
  assert.equal(await value("dayOfYear('2026-02-01T09:00:00Z')"), 32);
  assert.equal(await value("formatDateTime('2026-01-15T09:00:00Z', 'yyyy/MM/dd HH:mm')"), "2026/01/15 09:00");
  assert.match((await failure("formatDateTime(utcNow(), 'dddd')")).message, /dddd/);
  assert.equal(await value("formatTimeSpan('1.02:03:04', 'd.hh:mm:ss')"), "1.02:03:04");
  assert.equal(await value("parseDateTime('2026/01/15 09:00', 'ja-JP', 'yyyy/MM/dd HH:mm')"), "2026-01-15T09:00:00.0000000"); // Learn 例と同形式
  assert.equal(await value("startOfDay('2026-01-15T09:30:00Z', 'HH:mm:ss')"), "00:00:00");
  assert.equal(await value("startOfHour('2026-01-15T09:30:45Z', 'HH:mm:ss')"), "09:00:00");
  assert.equal(await value("startOfMonth('2026-01-15T09:30:00Z', 'yyyy-MM-dd')"), "2026-01-01");
  assert.equal(String(await value("ticks('2026-01-15T09:00:00Z')")), "639040644000000000");
  // URI解析
  assert.equal(await value("uriHost('https://example.com:8080/path?q=1')"), "example.com");
  assert.equal(await value("uriPath('https://example.com/path/to?q=1')"), "/path/to");
  assert.equal(await value("uriPathAndQuery('https://example.com/p?q=1')"), "/p?q=1");
  assert.equal(await value("uriPort('https://example.com/path')"), 443);
  assert.equal(await value("uriPort('https://example.com:8080/path')"), 8080);
  assert.equal(await value("uriQuery('https://example.com/path?q=1&r=2')"), "q=1&r=2");
  assert.equal(await value("uriScheme('https://example.com/path')"), "https");
  assert.match((await failure("uriHost('/relative/path')")).message, /uriHost/);
  // JSON・XML操作
  assert.deepEqual(await value("addProperty(json('{\"a\": 1}'), 'b', 2)"), { a: 1, b: 2 });
  assert.match((await failure("addProperty(json('{\"a\": 1}'), 'a', 2)")).message, /addProperty/);
  assert.deepEqual(await value("setProperty(json('{\"a\": 1}'), 'a', 9)"), { a: 9 });
  assert.deepEqual(await value("removeProperty(json('{\"a\": 1, \"b\": 2}'), 'a')"), { b: 2 });
  assert.deepEqual(await value("removeProperty(json('{\"a\": 1}'), 'b')"), { a: 1 }); // Learn：無い場合は元のオブジェクトを返す
  assert.deepEqual(await value("mergeObjects(json('{\"a\": 1}'), json('{\"a\": 2, \"b\": 3}'))"), { a: 2, b: 3 });
  assert.equal(await value("encodeXmlName('a b')"), "a_x0020_b");
  assert.equal(await value("decodeXmlName('a_x0020_b')"), "a b");
  assert.equal(await value("encodeXmlValue('a & b')"), "a &amp; b");
  assert.equal(await value("decodeXmlValue('a &amp; b')"), "a & b");
  assert.equal(await value("xml(json('{\"root\": {\"@id\": \"7\", \"a\": 1}}'))"), "<root id=\"7\"><a>1</a></root>");
  assert.deepEqual(await value("xpath('<root><a>1</a><a>2</a></root>', '/root/a')"), ["<a>1</a>", "<a>2</a>"]);
  assert.equal(await value("xpath('<root><a>1</a><a>2</a></root>', 'count(/root/a)')"), 2);
  assert.deepEqual(await value("xpath('<root><a id=\"x\">1</a></root>', '/root/a/@id')"), ["x"]);
  assert.deepEqual(await value("xpath('<root><a>hello</a></root>', '/root/a/text()')"), ["hello"]);
  assert.deepEqual(await value("xpath('<root><b><a>deep</a></b></root>', '//a')"), ["<a>deep</a>"]);
  assert.match((await failure("xpath('<root/>', '/other')")).message, /xpath/);
});

test("B2-WDL (c) F-01 演算子と文法の範囲：優先順位・短絡・リテラル記法の停止", async () => {
  assert.equal(await value("1 + 2 * 3"), 7);
  assert.equal(await value("(1 + 2) * 3"), 9);
  assert.equal(await value("10 % 3"), 1);
  assert.equal(await value("-3 + 1"), -2);
  assert.equal(await value("not(true && false)"), true);
  assert.equal(await value("false && (div(1, 0) == 0)"), false);
  assert.equal(await value("true || (div(1, 0) == 0)"), true);
  assert.equal(await value("add(1, 2) == 3"), true);
  assert.equal(await value("length('abc') >= 3"), true);
  // 配列・オブジェクトのリテラル記法は WDL の式文法に無いため名指しで止まる。
  assert.match((await failure("[1, 2]")).message, /配列リテラルはありません/);
  assert.match((await failure("{a: 1}")).message, /オブジェクトリテラルはありません/);
  assert.match((await failure("\"abc\"")).message, /単一引用符/);
  // 未知の関数・裸の名前は名指しで止まる。
  assert.match((await failure("unknownFn(1)")).message, /unknownFn/);
  assert.match((await failure("nosuchvar")).message, /nosuchvar/);
  // 関数名は大文字小文字を区別しない。
  assert.equal(await value("CONCAT('a', 'B')"), "aB");
  assert.equal(await value("UtcNow('yyyy')"), "2026");
});

test("B2-WDL (d) 未対応21件は関数名とランタイム依存の理由を挙げて正直に停止する", async () => {
  for (const name of EXPECTED_UNSUPPORTED) {
    const item = definition.reference.find((r) => r.name === name);
    const err = await failure(item.example);
    assert.equal(err.category, "未対応", `${name} のカテゴリ`);
    assert.ok(err.message.includes(name), `${name} を名指しすること: ${err.message}`);
    assert.match(err.message, /ランタイム/, `${name} の理由: ${err.message}`);
  }
  // 組み合わせの中でも、未対応関数に到達したら止まる。
  const err = await failure("concat('x', string(triggerBody()))");
  assert.ok(err.message.includes("triggerBody"));
});

test("B2-WDL (e) 補間 @{...} と @@ エスケープ、'' エスケープ、@ 形式", async () => {
  assert.equal(await value("'結果は @{add(1, 2)} です'"), "結果は 3 です");
  assert.equal(await value("'@{concat('A', string(add(1, 2)))}'"), "A3");
  assert.equal(await value("'価格は @@100 です'"), "価格は @100 です");
  assert.equal(await value("'it''s'"), "it's");
  assert.equal(await value("'@{toUpper('abc')} と @@マーク'"), "ABC と @マーク");
  // ワークフロー定義 JSON での式の書き方：先頭の @ と @{式} 全体。
  assert.equal(await value("@concat('a', 'b')"), "ab");
  assert.equal(await value("@{add(1, 2)}"), 3);
  // 補間が閉じられていない場合は構文エラーとして止まる。
  const err = await failure("'@{add(1, 2)'");
  assert.match(err.message, /補間|閉じられ/);
});

// ---------------------------------------------------------------------
// F-01 台帳：対応116件全件に正常系＋境界系のプローブを割り当て、
// 対応表に載る全関数が台帳に2件以上あることを機械的に保証する。
// 期待値は Microsoft Learn の各関数の説明・例に基づく。
// ---------------------------------------------------------------------
const BIN = (base64) => ({ kind: "binary", base64 });
const PROBES = [
  // ---- 文字列 ----
  ["chunk", "chunk('abcdef', 2)", ["ab", "cd", "ef"]],
  ["chunk", "chunk('', 3)", []],
  ["chunk", "chunk(createArray(1, 2, 3), 5)", [[1, 2, 3]]],
  ["concat", "concat('Hello', 'World')", "HelloWorld"],
  ["concat", "concat('', 'a', '')", "a"],
  ["endsWith", "endsWith('hello world', 'world')", true],
  ["endsWith", "endsWith('hello world', 'universe')", false],
  ["endsWith", "endsWith('abc', '')", true],
  ["formatNumber", "formatNumber(1234567890, '#,##0.00', 'en-US')", "1,234,567,890.00"],
  ["formatNumber", "formatNumber(17.35, 'C2')", "$17.35"],
  ["formatNumber", "formatNumber(0, '0.00')", "0.00"],
  ["guid", "guid('N')", /^[0-9a-f]{32}$/],
  ["guid", "guid('B')", /^\{[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\}$/],
  ["guid", "guid('P')", /^\([0-9a-f-]{36}\)$/],
  ["indexOf", "indexOf('hello world', 'world')", 6],
  ["indexOf", "indexOf('hello', '')", 0],
  ["indexOf", "indexOf('', 'x')", -1],
  ["isFloat", "isFloat('10,000.00')", true],
  ["isFloat", "isFloat('abc')", false],
  ["isFloat", "isFloat('')", false],
  ["isInt", "isInt('10')", true],
  ["isInt", "isInt('-42')", true],
  ["isInt", "isInt('4.2')", false],
  ["lastIndexOf", "lastIndexOf('hello world hello world', 'world')", 18],
  ["lastIndexOf", "lastIndexOf('hello world hello world', '')", 22],
  ["lastIndexOf", "lastIndexOf('', 'x')", -1],
  ["lastIndexOf", "lastIndexOf('', '')", 0],
  ["length", "length('abcd')", 4],
  ["length", "length('')", 0],
  ["length", "length('😀')", 2],
  ["nthIndexOf", "nthIndexOf('123456789123465789', '12', 2)", 9],
  ["nthIndexOf", "nthIndexOf('123456789123465789', '6', 4)", -1],
  ["nthIndexOf", "nthIndexOf('hello', 'l', -1)", 3],
  ["nthIndexOf", "nthIndexOf('hello', 'l', -2)", 2],
  ["replace", "replace('the old string', 'old', 'new')", "the new string"],
  ["replace", "replace('a-b-a', 'A', 'x')", "a-b-a"],
  ["replace", "replace('aaa', 'aa', 'b')", "ba"],
  ["slice", "slice('Hello World', 2)", "llo World"],
  ["slice", "slice('Hello World', 30)", ""],
  ["slice", "slice('Hello World', 6, 20)", "World"],
  ["slice", "slice('Hello World', 3, 3)", ""],
  ["split", "split('a_b_c', '_')", ["a", "b", "c"]],
  ["split", "split('a_b_c', ' ')", ["a_b_c"]],
  ["split", "split('a,,b', ',')", ["a", "", "b"]],
  ["startsWith", "startsWith('hello world', 'hello')", true],
  ["startsWith", "startsWith('hello world', 'greetings')", false],
  ["startsWith", "startsWith('abc', '')", true],
  ["substring", "substring('hello world', 6, 5)", "world"],
  ["substring", "substring('hello world', 6)", "world"],
  ["substring", "substring('abc', 3, 0)", ""],
  ["toLower", "toLower('Hello World')", "hello world"],
  ["toLower", "toLower('')", ""],
  ["toUpper", "toUpper('Hello World')", "HELLO WORLD"],
  ["toUpper", "toUpper('')", ""],
  ["trim", "trim('  hello world  ')", "hello world"],
  ["trim", "trim('   ')", ""],
  ["trimByteOrderMark", "trimByteOrderMark('﻿abc')", "abc"],
  ["trimByteOrderMark", "trimByteOrderMark('﻿abc﻿')", "abc﻿"],
  ["trimByteOrderMark", "trimByteOrderMark(null)", ""],
  // ---- コレクション ----
  ["contains", "contains('hello world', 'world')", true],
  ["contains", "contains('hello world', 'World')", false],
  ["contains", "contains(createArray(1, 2), 2)", true],
  ["contains", "contains(createArray(), 1)", false],
  ["empty", "empty('')", true],
  ["empty", "empty('abc')", false],
  ["empty", "empty(json('{}'))", true],
  ["empty", "empty(' ')", false],
  ["first", "first('hello')", "h"],
  ["first", "first(createArray(0, 1, 2))", 0],
  ["first", "first('')", null],
  ["intersection", "intersection(createArray(1, 2, 3), createArray(101, 2, 1, 10), createArray(6, 8, 1, 2))", [1, 2]],
  ["intersection", "intersection(createArray(1, 2), createArray(3, 4))", []],
  ["intersection", "intersection(createArray(1, 1, 2), createArray(1, 2))", [1, 2]],
  ["join", "join(createArray('a', 'b', 'c'), '.')", "a.b.c"],
  ["join", "join(createArray(), '-')", ""],
  ["join", "join(createArray(1, 2), ',')", "1,2"],
  ["last", "last('abcd')", "d"],
  ["last", "last(createArray(0, 1, 2, 3))", 3],
  ["last", "last('')", null],
  ["reverse", "reverse(createArray(0, 1, 2, 3))", [3, 2, 1, 0]],
  ["reverse", "reverse(createArray())", []],
  ["reverse", "reverse(reverse(createArray(1, 2, 3)))", [1, 2, 3]],
  ["skip", "skip(createArray(0, 1, 2, 3), 1)", [1, 2, 3]],
  ["skip", "skip(createArray(1, 2), 99)", []],
  ["skip", "skip(createArray(1, 2), 0)", [1, 2]],
  ["sort", "sort(createArray(2, 1, 0, 3))", [0, 1, 2, 3]],
  ["sort", "sort(createArray('b', 'a'))", ["a", "b"]],
  ["sort", "sort(createArray(true, false))", [false, true]],
  ["sort", "sort(createArray())", []],
  ["take", "take('abcde', 3)", "abc"],
  ["take", "take(createArray(0, 1, 2, 3, 4), 3)", [0, 1, 2]],
  ["take", "take('abc', 0)", ""],
  ["union", "union(createArray(1, 2, 3), createArray(1, 2, 10, 101))", [1, 2, 3, 10, 101]],
  ["union", "union(createArray(), createArray(1))", [1]],
  // ---- 論理比較 ----
  ["and", "and(true, true)", true],
  ["and", "and(false, true)", false],
  ["and", "and(true, true, true)", true],
  ["equals", "equals(true, 1)", true],
  ["equals", "equals('abc', 'abcd')", false],
  ["equals", "equals(null, '')", true],
  ["equals", "equals(createArray(1, 2), createArray(1, 2))", true],
  ["greater", "greater(10, 5)", true],
  ["greater", "greater('apple', 'banana')", false],
  ["greater", "greater(2, 2)", false],
  ["greaterOrEquals", "greaterOrEquals(2, 2)", true],
  ["greaterOrEquals", "greaterOrEquals(1, 2)", false],
  ["if", "if(equals(1, 1), 'yes', 'no')", "yes"],
  ["if", "if(true, 1, div(1, 0))", 1],
  ["less", "less(5, 10)", true],
  ["less", "less('banana', 'apple')", false],
  ["less", "less(2, 2)", false],
  ["lessOrEquals", "lessOrEquals(2, 2)", true],
  ["lessOrEquals", "lessOrEquals(3, 2)", false],
  ["not", "not(false)", true],
  ["not", "not(true)", false],
  ["or", "or(true, false)", true],
  ["or", "or(false, false)", false],
  ["or", "or(false, false, true)", true],
  ["strongEquals", "strongEquals(1, 1.0)", true],
  ["strongEquals", "strongEquals(1, 1, 1)", true],
  ["strongEquals", "strongEquals('a', 'A')", false],
  ["strongEquals", "strongEquals(null, null)", true],
  // ---- 変換 ----
  ["array", "array('hello')", ["hello"]],
  ["array", "array(null)", [null]],
  ["base64", "base64('hello')", "aGVsbG8="],
  ["base64", "base64('')", ""],
  ["base64ToBinary", "base64ToBinary('aGVsbG8=')", BIN("aGVsbG8=")],
  ["base64ToBinary", "base64(base64ToBinary('aGk='))", "aGk="],
  ["base64ToJson", "base64ToJson('eyJhIjoxfQ==')", { a: 1 }],
  ["base64ToJson", "base64ToJson(base64('{\"x\": [1, 2]}'))", { x: [1, 2] }],
  ["base64ToString", "base64ToString('aGVsbG8=')", "hello"],
  ["base64ToString", "base64ToString('')", ""],
  ["binary", "binary('hello')", BIN("aGVsbG8=")],
  ["binary", "binary('')", BIN("")],
  ["bool", "bool(-1)", true],
  ["bool", "bool(0)", false],
  ["bool", "bool('false')", false],
  ["bool", "bool(0.5)", true],
  ["createArray", "createArray('h', 'e', 'l', 'l', 'o')", ["h", "e", "l", "l", "o"]],
  ["createArray", "createArray()", []],
  ["dataUri", "dataUri('hello')", "data:text/plain;charset=utf-8;base64,aGVsbG8="],
  ["dataUri", "dataUri('')", "data:text/plain;charset=utf-8;base64,"],
  ["dataUriToBinary", "dataUriToBinary('data:text/plain;base64,aGVsbG8=')", BIN("aGVsbG8=")],
  ["dataUriToBinary", "dataUriToBinary('data:,hello')", BIN("aGVsbG8=")],
  ["dataUriToString", "dataUriToString('data:text/plain;charset=utf-8;base64,aGVsbG8=')", "hello"],
  ["dataUriToString", "dataUriToString('data:,a%20b')", "a b"],
  ["decimal", "decimal('1.25')", 1.25],
  ["decimal", "decimal('10,000.00')", 10000],
  ["decodeBase64", "decodeBase64('aGVsbG8=')", "hello"],
  ["decodeBase64", "decodeBase64('aGk=')", "hi"],
  ["decodeDataUri", "decodeDataUri('data:text/plain;charset=utf-8;base64,aGVsbG8=')", BIN("aGVsbG8=")],
  ["decodeDataUri", "decodeDataUri('data:,hi')", BIN("aGk=")],
  ["decodeUriComponent", "decodeUriComponent('a%20b')", "a b"],
  ["decodeUriComponent", "decodeUriComponent('%E3%81%82')", "あ"],
  ["encodeBase64", "encodeBase64('hello')", "aGVsbG8="],
  ["encodeBase64", "encodeBase64('')", ""],
  ["encodeUriComponent", "encodeUriComponent('https://contoso.com')", "https%3A%2F%2Fcontoso.com"],
  ["encodeUriComponent", "encodeUriComponent('a b')", "a%20b"],
  ["float", "float('10,000.333')", 10000.333],
  ["float", "float('1e3')", 1000],
  ["float", "float(2.5)", 2.5],
  ["int", "int('10')", 10],
  ["int", "int(-2.5)", -2],
  ["int", "int(-3.5)", -4],
  ["int", "int(' 42 ')", 42],
  ["json", "json('{\"a\": {\"b\": 5}}')", { a: { b: 5 } }],
  ["json", "json('123')", 123],
  ["json", "json('null')", null],
  ["parse", "parse('{\"a\": 1}')", { a: 1 }],
  ["parse", "parse('true')", true],
  ["string", "string(10)", "10"],
  ["string", "string(true)", "true"],
  ["string", "string(createArray(1, 2))", "[1,2]"],
  ["uriComponent", "uriComponent('https://contoso.com')", "https%3A%2F%2Fcontoso.com"],
  ["uriComponent", "uriComponent('a b&c')", "a%20b%26c"],
  ["uriComponentToBinary", "uriComponentToBinary('a%20b')", BIN("YSBi")],
  ["uriComponentToBinary", "uriComponentToBinary('abc')", BIN("YWJj")],
  ["uriComponentToString", "uriComponentToString('a%20b')", "a b"],
  ["uriComponentToString", "uriComponentToString(uriComponent('a&b'))", "a&b"],
  ["xml", "xml(json('{\"name\": \"Sophia Owen\"}'))", "<name>Sophia Owen</name>"],
  ["xml", "xml('<name>Sophia Owen</name>')", "<name>Sophia Owen</name>"],
  // ---- 数学 ----
  ["add", "add(1, 1.5)", 2.5],
  ["add", "add(-1, 1)", 0],
  ["div", "div(11, 5)", 2],
  ["div", "div(11, 5.0)", 2.2],
  ["div", "div(11.0, 5)", 2.2],
  ["div", "div(-11, 5)", -2],
  ["max", "max(1, 5, 3)", 5],
  ["max", "max(createArray(-5))", -5],
  ["min", "min(1, 2, 3)", 1],
  ["min", "min(createArray(1, 2, 3))", 1],
  ["min", "min(0, -1)", -1],
  ["mod", "mod(-5, 2)", -1],
  ["mod", "mod(4, -3)", 1],
  ["mod", "mod(5.5, 2)", 1.5],
  ["mul", "mul(1.5, 2)", 3],
  ["mul", "mul(0, 5)", 0],
  ["pow", "pow(2, 10)", 1024],
  ["pow", "pow(9, 0.5)", 3],
  ["pow", "pow(2, -1)", 0.5],
  ["rand", "rand(5, 6)", 5],
  ["rand", "rand(0, 1)", 0],
  ["range", "range(1, 4)", [1, 2, 3, 4]],
  ["range", "range(-2, 3)", [-2, -1, 0]],
  ["range", "range(5, 0)", []],
  ["sub", "sub(5, 3)", 2],
  ["sub", "sub(0, 5)", -5],
  ["sub", "sub(1.5, 0.5)", 1],
];
const FAIL_PROBES = [
  ["chunk", "chunk(42, 2)", /chunk/],
  ["concat", "concat()", /concat/],
  ["endsWith", "endsWith(1, 'a')", /endsWith/],
  ["formatNumber", "formatNumber('x', '0')", /formatNumber/],
  ["guid", "guid(1, 2)", /guid/],
  ["indexOf", "indexOf('a')", /indexOf/],
  ["isFloat", "isFloat('1.5', 'de-DE')", /isFloat/],
  ["isInt", "isInt('1', 'de-DE')", /isInt/],
  ["lastIndexOf", "lastIndexOf('a')", /lastIndexOf/],
  ["length", "length(null)", /length/],
  ["nthIndexOf", "nthIndexOf('hello', 'l', 0)", /nthIndexOf/],
  ["replace", "replace('abc', '', 'x')", /replace/],
  ["slice", "slice(42, 1)", /slice/],
  ["split", "split('a,b', '')", /split/],
  ["startsWith", "startsWith('a')", /startsWith/],
  ["substring", "substring('abc', -1, 1)", /substring/],
  ["toLower", "toLower(1)", /toLower/],
  ["toUpper", "toUpper(null)", /toUpper/],
  ["trim", "trim(1)", /trim/],
  ["trimByteOrderMark", "trimByteOrderMark(42)", /trimByteOrderMark/],
  ["contains", "contains(42, 1)", /contains/],
  ["empty", "empty(true)", /empty/],
  ["first", "first(42)", /first/],
  ["intersection", "intersection(createArray(1), 2)", /intersection/],
  ["join", "join('ab', '-')", /join/],
  ["last", "last(json('{}'))", /last/],
  ["reverse", "reverse('abc')", /reverse/],
  ["skip", "skip(createArray(1), -1)", /skip/],
  ["sort", "sort(1)", /sort/],
  ["take", "take(1, 1)", /take/],
  ["union", "union(createArray(1), 2)", /union/],
  ["and", "and(true)", /and/],
  ["or", "or(false)", /or/],
  ["not", "not(1)", /not/],
  ["greater", "greater(true, false)", /greater/],
  ["if", "if(1, 'a', 'b')", /if/],
  ["strongEquals", "strongEquals(1, '1')", /strongEquals/],
  ["base64", "base64(42)", /base64/],
  ["base64ToBinary", "base64ToBinary('!!!')", /Base64/],
  ["base64ToJson", "base64ToJson('aGVsbG8=')", /base64ToJson/],
  ["binary", "binary(42)", /binary/],
  ["dataUriToBinary", "dataUriToBinary('not a uri')", /dataUriToBinary/],
  ["dataUriToString", "dataUriToString('not a uri')", /dataUriToString/],
  ["decimal", "decimal('abc')", /decimal/],
  ["decodeBase64", "decodeBase64('!!!')", /Base64/],
  ["decodeDataUri", "decodeDataUri('x')", /decodeDataUri/],
  ["decodeUriComponent", "decodeUriComponent('%')", /decodeUriComponent/],
  ["encodeBase64", "encodeBase64(42)", /encodeBase64/],
  ["encodeUriComponent", "encodeUriComponent(42)", /encodeUriComponent/],
  ["float", "float('abc')", /float/],
  ["parse", "parse('{')", /parse/],
  ["uriComponent", "uriComponent(42)", /uriComponent/],
  ["uriComponentToBinary", "uriComponentToBinary('%')", /uriComponentToBinary/],
  ["uriComponentToString", "uriComponentToString('%')", /uriComponentToString/],
  ["xml", "xml(createArray(1))", /xml/],
  ["xml", "xml('<a>')", /xml/],
  ["add", "add('1', 2)", /add/],
  ["sub", "sub('a', 1)", /sub/],
  ["mul", "mul(null, 1)", /mul/],
  ["max", "max(createArray())", /max/],
  ["min", "min()", /min/],
  ["pow", "pow('a', 2)", /pow/],
  ["rand", "rand(7, 7)", /rand/],
  ["rand", "rand(1.5, 7)", /rand/],
  ["range", "range(0, 10001)", /range/],
];

test("B2-WDL (f) F-01 台帳：対応116件全件に正常系・境界系プローブがある", async () => {
  const supported = definition.reference.filter((r) => r.supported).map((r) => r.name);
  assert.equal(supported.length, 116);
  const counts = {};
  for (const [name] of [...PROBES, ...PROBES2]) counts[name] = (counts[name] || 0) + 1;
  for (const name of supported)
    assert.ok((counts[name] || 0) >= 2, `${name} のプローブが2件未満です`);
  for (const name of Object.keys(counts))
    assert.ok(supported.includes(name), `台帳に未知の関数 ${name} があります`);
  for (const [name, code, expected] of PROBES) {
    const actual = await value(code);
    if (expected instanceof RegExp) assert.match(String(actual), expected, `${name}: ${code}`);
    else assert.deepEqual(actual, expected, `${name}: ${code}`);
  }
  for (const [name, code, pattern] of [...FAIL_PROBES, ...FAIL_PROBES2]) {
    const err = await failure(code);
    assert.match(err.message, pattern, `${name}: ${code} の停止理由`);
  }
});

const PROBES2 = [
  // ---- 日時（既定書式は Learn の "o" 形式 yyyy-MM-ddTHH:mm:ss.fffffffK） ----
  ["addDays", "addDays('2018-03-15T00:00:00Z', 10)", "2018-03-25T00:00:00.0000000Z"],
  ["addDays", "addDays('2018-03-15T00:00:00Z', -5)", "2018-03-10T00:00:00.0000000Z"],
  ["addDays", "addDays('2018-03-15T00:00:00Z', 0)", "2018-03-15T00:00:00.0000000Z"],
  ["addHours", "addHours('2018-03-15T00:00:00Z', 10)", "2018-03-15T10:00:00.0000000Z"],
  ["addHours", "addHours('2018-03-15T15:00:00Z', -5)", "2018-03-15T10:00:00.0000000Z"],
  ["addMinutes", "addMinutes('2018-03-15T00:00:00Z', 90)", "2018-03-15T01:30:00.0000000Z"],
  ["addMinutes", "addMinutes('2018-03-15T00:30:00Z', -45)", "2018-03-14T23:45:00.0000000Z"],
  ["addSeconds", "addSeconds('2018-03-15T00:00:00Z', 90)", "2018-03-15T00:01:30.0000000Z"],
  ["addSeconds", "addSeconds('2018-03-15T00:00:00Z', -1)", "2018-03-14T23:59:59.0000000Z"],
  ["addToTime", "addToTime('2018-01-01T00:00:00Z', 1, 'Day')", "2018-01-02T00:00:00.0000000Z"],
  ["addToTime", "addToTime('2026-01-31T09:00:00Z', 1, 'Month', 'yyyy-MM-dd')", "2026-02-28"],
  ["addToTime", "addToTime('2024-02-29T09:00:00Z', 1, 'Year', 'yyyy-MM-dd')", "2025-02-28"],
  ["convertFromUtc", "convertFromUtc('2018-01-01T08:00:00.0000000Z', 'Pacific Standard Time')", "2018-01-01T00:00:00.0000000"],
  ["convertFromUtc", "convertFromUtc('2026-01-15T09:00:00Z', 'UTC', 'yyyy-MM-dd HH:mm')", "2026-01-15 09:00"],
  ["convertFromUtc", "convertFromUtc('2026-07-15T09:00:00Z', 'Pacific Standard Time', 'HH:mm')", "02:00"],
  ["convertTimeZone", "convertTimeZone('2018-01-01T08:00:00.0000000Z', 'UTC', 'Pacific Standard Time')", "2018-01-01T00:00:00.0000000"],
  ["convertTimeZone", "convertTimeZone('2026-01-15T09:00:00', 'UTC', 'Tokyo Standard Time', 'HH:mm')", "18:00"],
  ["convertToUtc", "convertToUtc('2018-01-01T00:00:00', 'Pacific Standard Time')", "2018-01-01T08:00:00.0000000Z"],
  ["convertToUtc", "convertToUtc('2026-01-15T09:00:00', 'UTC')", "2026-01-15T09:00:00.0000000Z"],
  ["convertToUtc", "convertToUtc('2026-07-15T02:00:00', 'Pacific Standard Time')", "2026-07-15T09:00:00.0000000Z"],
  ["dateDifference", "dateDifference('2015-02-08', '2018-07-30')", "1268.00:00:00"],
  ["dateDifference", "dateDifference('2026-01-17T09:00:00Z', '2026-01-15T09:00:00Z')", "-2.00:00:00"],
  ["dateDifference", "dateDifference('2026-01-15T09:00:00Z', '2026-01-15T09:00:01.500Z')", "00:00:01.5000000"],
  ["dayOfMonth", "dayOfMonth('2018-03-15T13:27:36Z')", 15],
  ["dayOfMonth", "dayOfMonth('2026-02-28T00:00:00Z')", 28],
  ["dayOfWeek", "dayOfWeek('2018-03-15T13:27:36Z')", 4],
  ["dayOfWeek", "dayOfWeek('2026-01-18T00:00:00Z')", 0],
  ["dayOfWeek", "dayOfWeek('2026-01-17T00:00:00Z')", 6],
  ["dayOfYear", "dayOfYear('2018-03-15T13:27:36Z')", 74],
  ["dayOfYear", "dayOfYear('2026-01-01T00:00:00Z')", 1],
  ["dayOfYear", "dayOfYear('2024-12-31T00:00:00Z')", 366],
  ["formatDateTime", "formatDateTime('03/15/2018')", "2018-03-15T00:00:00.0000000"],
  ["formatDateTime", "formatDateTime('2018-03-15T00:00:00Z')", "2018-03-15T00:00:00.0000000Z"],
  ["formatDateTime", "formatDateTime('2026-01-15T09:00:00Z', 'yyyy')", "2026"],
  ["formatDateTime", "formatDateTime('2026-01-15T09:05:03Z', 'hh:mm:ss tt')", "09:05:03 AM"],
  ["formatTimeSpan", "formatTimeSpan('4.20:00:00', '%d')", "4"],
  ["formatTimeSpan", "formatTimeSpan('1.02:03:04')", "1.02:03:04"],
  ["formatTimeSpan", "formatTimeSpan('-2.00:00:00', 'd')", "-2"],
  ["getFutureTime", "getFutureTime(5, 'Day')", "2026-01-20T09:00:00.0000000Z"],
  ["getFutureTime", "getFutureTime(2, 'Week', 'yyyy-MM-dd')", "2026-01-29"],
  ["getPastTime", "getPastTime(5, 'Day')", "2026-01-10T09:00:00.0000000Z"],
  ["getPastTime", "getPastTime(1, 'Month', 'yyyy-MM-dd')", "2025-12-15"],
  ["parseDateTime", "parseDateTime('2018-03-15T00:00:00Z')", "2018-03-15T00:00:00.0000000Z"],
  ["parseDateTime", "parseDateTime('15/01/2026', 'en-GB', 'dd/MM/yyyy')", "2026-01-15T00:00:00.0000000"],
  ["startOfDay", "startOfDay('2018-03-15T13:30:30Z')", "2018-03-15T00:00:00.0000000Z"],
  ["startOfDay", "startOfDay('2018-03-15T00:00:00Z')", "2018-03-15T00:00:00.0000000Z"],
  ["startOfHour", "startOfHour('2018-03-15T13:30:30Z')", "2018-03-15T13:00:00.0000000Z"],
  ["startOfHour", "startOfHour('2018-03-15T13:00:00Z', 'HH:mm')", "13:00"],
  ["startOfMonth", "startOfMonth('2018-03-15T13:30:30Z')", "2018-03-01T00:00:00.0000000Z"],
  ["startOfMonth", "startOfMonth('2018-03-15T13:30:30Z', 'yyyy-MM-dd')", "2018-03-01"],
  ["subtractFromTime", "subtractFromTime('2026-01-15T09:00:00Z', 1, 'Week')", "2026-01-08T09:00:00.0000000Z"],
  ["subtractFromTime", "subtractFromTime('2026-01-15T09:00:00Z', 1, 'Hour', 'HH:mm')", "08:00"],
  ["ticks", "ticks('0001-01-01T00:00:00Z')", 0n],
  ["ticks", "ticks('1970-01-01T00:00:00Z')", 621355968000000000n],
  ["utcNow", "utcNow()", "2026-01-15T09:00:00.0000000Z"],
  ["utcNow", "utcNow('HH:mm')", "09:00"],
  // ---- URI解析 ----
  ["uriHost", "uriHost('https://www.localhost.com:8080')", "www.localhost.com"],
  ["uriHost", "uriHost('https://example.com')", "example.com"],
  ["uriPath", "uriPath('https://www.contoso.com/catalog/shownew.htm?date=today')", "/catalog/shownew.htm"],
  ["uriPath", "uriPath('https://example.com')", "/"],
  ["uriPathAndQuery", "uriPathAndQuery('https://www.contoso.com/catalog/shownew.htm?date=today')", "/catalog/shownew.htm?date=today"],
  ["uriPathAndQuery", "uriPathAndQuery('https://example.com?q=1')", "/?q=1"],
  ["uriPort", "uriPort('https://example.com:8080/path')", 8080],
  ["uriPort", "uriPort('http://example.com/')", 80],
  ["uriPort", "uriPort('ftp://example.com/')", 21],
  ["uriQuery", "uriQuery('https://example.com/path?q=1&r=2')", "q=1&r=2"],
  ["uriQuery", "uriQuery('https://example.com/path')", ""],
  ["uriScheme", "uriScheme('https://example.com/path')", "https"],
  ["uriScheme", "uriScheme('ftp://example.com/')", "ftp"],
  // ---- JSON・XML操作 ----
  ["addProperty", "addProperty(json('{}'), 'a', null)", { a: null }],
  ["addProperty", "addProperty(json('{\"a\": 1}'), 'b', 2)", { a: 1, b: 2 }],
  ["coalesce", "coalesce(null, true, false)", true],
  ["coalesce", "coalesce(null, null, null)", null],
  ["coalesce", "coalesce('', 'x')", ""],
  ["coalesce", "coalesce(createArray(), 1)", []],
  ["decodeXmlName", "decodeXmlName('a_x0020_b')", "a b"],
  ["decodeXmlName", "decodeXmlName('_x0041_')", "A"],
  ["decodeXmlName", "decodeXmlName('plain')", "plain"],
  ["decodeXmlValue", "decodeXmlValue('&lt;value&gt;')", "<value>"],
  ["decodeXmlValue", "decodeXmlValue('&#65;')", "A"],
  ["encodeXmlName", "encodeXmlName('data/value')", "data_x002F_value"],
  ["encodeXmlName", "encodeXmlName('valid_name')", "valid_name"],
  ["encodeXmlName", "encodeXmlName('1abc')", "_x0031_abc"],
  ["encodeXmlValue", "encodeXmlValue('<value>')", "&lt;value&gt;"],
  ["encodeXmlValue", "encodeXmlValue('\"a\"')", "&quot;a&quot;"],
  ["mergeObjects", "mergeObjects(json('{\"name\":\"Alice\",\"address\":{\"city\":\"Seattle\"}}'), json('{\"address\":{\"country\":\"USA\"}}'))", { name: "Alice", address: { city: "Seattle", country: "USA" } }],
  ["mergeObjects", "mergeObjects(json('{\"A\": 1}'), json('{\"a\": 2}'))", { A: 2 }],
  ["mergeObjects", "mergeObjects(json('{\"a\": [1, 2]}'), json('{\"a\": [9]}'))", { a: [9, 2] }],
  ["removeProperty", "removeProperty(json('{\"a\": 1, \"b\": 2}'), 'b')", { a: 1 }],
  ["removeProperty", "removeProperty(json('{\"a\": 1}'), 'missing')", { a: 1 }],
  ["setProperty", "setProperty(json('{\"a\": 1}'), 'b', 2)", { a: 1, b: 2 }],
  ["setProperty", "setProperty(json('{\"a\": 1}'), 'a', null)", { a: null }],
  ["xpath", "xpath('<root><a>1</a><a>2</a></root>', '/root/a[2]')", ["<a>2</a>"]],
  ["xpath", "xpath('<root><a id=\"x\">1</a><a id=\"y\">2</a></root>', '/root/a[@id=''y'']')", ["<a id=\"y\">2</a>"]],
  ["xpath", "xpath('<root><a>1</a></root>', 'count(/root/b)')", 0],
  ["xpath", "xpath('<root><a>1</a></root>', '/root')", ["<root><a>1</a></root>"]],
];
const FAIL_PROBES2 = [
  ["addDays", "addDays('2026-01-15T09:00:00Z', 1.5)", /addDays/],
  ["addDays", "addDays('not-a-date', 1)", /addDays/],
  ["addHours", "addHours('2026-01-15T09:00:00Z', 1.5)", /addHours/],
  ["addMinutes", "addMinutes('2026-01-15T09:00:00Z', 0.5)", /addMinutes/],
  ["addSeconds", "addSeconds('2026-01-15T09:00:00Z', 0.5)", /addSeconds/],
  ["addToTime", "addToTime(utcNow(), 1, 'Fortnight')", /addToTime/],
  ["convertTimeZone", "convertTimeZone('2026-01-15T09:00:00', 'UTC', 'No Such Zone')", /convertTimeZone/],
  ["convertToUtc", "convertToUtc('2026-01-15T18:00:00', 'No Such Zone')", /convertToUtc/],
  ["dateDifference", "dateDifference('x', utcNow())", /dateDifference/],
  ["dayOfMonth", "dayOfMonth('x')", /dayOfMonth/],
  ["dayOfWeek", "dayOfWeek('x')", /dayOfWeek/],
  ["dayOfYear", "dayOfYear('x')", /dayOfYear/],
  ["formatDateTime", "formatDateTime(utcNow(), 'yyyy', 'fr-FR')", /formatDateTime/],
  ["formatTimeSpan", "formatTimeSpan('x')", /formatTimeSpan/],
  ["formatTimeSpan", "formatTimeSpan('1.00:00:00', 'q')", /formatTimeSpan/],
  ["getFutureTime", "getFutureTime(1, 'Fortnight')", /getFutureTime/],
  ["getPastTime", "getPastTime(1, 'Fortnight')", /getPastTime/],
  ["parseDateTime", "parseDateTime('not a date')", /parseDateTime/],
  ["startOfDay", "startOfDay('x')", /startOfDay/],
  ["startOfHour", "startOfHour('x')", /startOfHour/],
  ["startOfMonth", "startOfMonth('x')", /startOfMonth/],
  ["subtractFromTime", "subtractFromTime(utcNow(), 1, 'Fortnight')", /subtractFromTime/],
  ["ticks", "ticks('x')", /ticks/],
  ["utcNow", "utcNow('dddd')", /utcNow/],
  ["uriPath", "uriPath('/relative')", /uriPath/],
  ["uriPathAndQuery", "uriPathAndQuery('/relative')", /uriPathAndQuery/],
  ["uriPort", "uriPort('/relative')", /uriPort/],
  ["uriQuery", "uriQuery('/relative')", /uriQuery/],
  ["uriScheme", "uriScheme('/relative')", /uriScheme/],
  ["addProperty", "addProperty(createArray(1), 'a', 2)", /addProperty/],
  ["coalesce", "coalesce()", /coalesce/],
  ["decodeXmlName", "decodeXmlName(1)", /decodeXmlName/],
  ["decodeXmlValue", "decodeXmlValue(1)", /decodeXmlValue/],
  ["encodeXmlName", "encodeXmlName(1)", /encodeXmlName/],
  ["encodeXmlValue", "encodeXmlValue(1)", /encodeXmlValue/],
  ["mergeObjects", "mergeObjects(json('{\"a\": 1}'), createArray(1))", /mergeObjects/],
  ["removeProperty", "removeProperty(1, 'a')", /removeProperty/],
  ["setProperty", "setProperty(1, 'a', 2)", /setProperty/],
  ["xpath", "xpath('<root>', '/root')", /xpath/],
];

test("B2-WDL (f2) F-01 台帳：日時・URI・JSON/XML の正常系・境界系・異常系", async () => {
  const counts = {};
  for (const [name] of PROBES2) counts[name] = (counts[name] || 0) + 1;
  for (const name of Object.keys(counts)) assert.ok(counts[name] >= 2, `${name} のプローブが2件未満です`);
  for (const [name, code, expected] of PROBES2)
    assert.deepEqual(await value(code), expected, `${name}: ${code}`);
  for (const [name, code, pattern] of FAIL_PROBES2) {
    const err = await failure(code);
    assert.match(err.message, pattern, `${name}: ${code} の停止理由`);
  }
});

test("B2-WDL (g) 演算子の優先順位・結合性とメンバー参照・添字の位置マトリクス", async () => {
  assert.equal(await value("2 + 3 * 4 - 1"), 13);
  assert.equal(await value("10 - 4 - 3"), 3);
  assert.equal(await value("2 * 3 % 4"), 2);
  assert.equal(await value("20 / 4 / 5"), 1);
  assert.equal(await value("1 < 2 == true"), true);
  assert.equal(await value("true || false && false"), true);
  assert.equal(await value("-2 * -3"), 6);
  assert.equal(await value("!false == true"), true);
  assert.equal(await value("-(1 + 2) * 2"), -6);
  assert.equal(await value("'abc'[1]"), "b");
  assert.equal(await value("createArray(10, 20, 30)[add(1, 1)]"), 30);
  assert.equal(await value("json('{\"Name\": {\"Age\": 5}}').name.age"), 5);
  assert.equal(await value("json('{\"a\": 1}').missing"), null);
  assert.equal(await value("json('{\"a\": 1}')['A']"), 1);
  assert.match((await failure("json('{\"a\": null}').a.b")).message, /メンバー参照/);
  assert.match((await failure("createArray(1, 2)[5]")).message, /添字/);
  assert.match((await failure("'abc'[3]")).message, /添字/);
  // null 条件演算子 ? は文法の範囲外として、文字を名指しして止まる。
  assert.match((await failure("json('{\"a\": null}')?.a")).message, /\?/);
  // 入れ子の深さと再実行の独立性（状態漏れがないこと）。
  assert.equal(await value("(".repeat(200) + "1" + ")".repeat(200)), 1);
  assert.equal(await value("concat(".repeat(30) + "'a'" + ", 'b')".repeat(30)), "a" + "b".repeat(30));
  await failure("div(1, 0)");
  assert.equal(await value("add(1, 2)"), 3);
  // 退化入力はクラッシュせず理由を挙げて止まる。
  for (const bad of ["", "   \n  ", "'unterminated", "add(1,)", "1 +", "@", "add(,)", "unknownFn(1)"]) {
    const err = await failure(bad);
    assert.ok(err.message.length > 0, `${JSON.stringify(bad)} のエラー文`);
  }
});

test("B2-WDL (h) 大小文字非区別の全数スイープと F-02 到達性（scan／検索述語）", async () => {
  // 関数名の大小文字ゆれ：scan は全137件で正規名に解決する。
  for (const item of definition.reference) {
    const scanned = definition.scan(`${item.name.toUpperCase()}()`);
    assert.ok(scanned.includes(item.name), `${item.name} の大文字表記の scan`);
  }
  // 未対応21件は大文字で呼んでも正規名を挙げて未対応で止まる。
  for (const name of EXPECTED_UNSUPPORTED) {
    const item = definition.reference.find((r) => r.name === name);
    const code = item.example.replace(name, name.toUpperCase());
    const err = await failure(code);
    assert.equal(err.category, "未対応", `${name} の大文字呼び出し`);
    assert.ok(err.message.includes(name), `${name} の正規名での名指し: ${err.message}`);
  }
  // 対応関数の大小文字ゆれ（カテゴリ横断サンプル）。
  assert.equal(await value("CoNcAt('a', 'b')"), "ab");
  assert.equal(await value("JSON('{\"a\": 1}').A"), 1);
  assert.equal(await value("XPATH('<root><a>1</a></root>', 'count(/root/a)')"), 1);
  assert.equal(await value("TRUE && !FALSE"), true);
  assert.equal(await value("NULL"), null);
  // F-02 到達性：各項目の example を scan すると自項目に届き、
  // アプリの検索述語（name／category／description／syntax の
  // 小文字部分一致）でも自項目名で自項目がヒットする。
  for (const item of definition.reference) {
    assert.ok(definition.scan(item.example).includes(item.name), `${item.name} の example からの到達性`);
    const q = item.name.toLowerCase();
    const hit = [item.name, item.category, item.description, item.syntax].some((f) => f.toLowerCase().includes(q));
    assert.ok(hit, `${item.name} の検索到達性`);
    assert.ok(item.source.includes("#" + item.name.toLowerCase()), `${item.name} の source アンカー`);
  }
});

test("B2-WDL (i) モデル検証と決定的生成の開示整合", async () => {
  assert.equal((await runRaw("utcNow()", { randSeed: "x" })).error.category, "モデルエラー");
  assert.equal((await runRaw("utcNow()", { guidSeed: { bad: 1 } })).error.category, "モデルエラー");
  assert.equal((await runRaw("utcNow()", { baseTime: 12345 })).error.category, "モデルエラー");
  assert.equal((await runRaw("utcNow()", [])).error.category, "モデルエラー");
  // シードが変われば rand の列は変わり、同じシードでは再現する。
  const seqA = await runRaw("rand(1, 1000000)\nrand(1, 1000000)\nrand(1, 1000000)", { ...M, randSeed: 42 });
  const seqB = await runRaw("rand(1, 1000000)\nrand(1, 1000000)\nrand(1, 1000000)", { ...M, randSeed: 7 });
  assert.notDeepEqual(seqA.paths[0].vars, seqB.paths[0].vars);
  const seqA2 = await runRaw("rand(1, 1000000)\nrand(1, 1000000)\nrand(1, 1000000)", { ...M, randSeed: 42 });
  assert.deepEqual(seqA.paths[0].vars, seqA2.paths[0].vars);
  // guid もシードで変わり、書式 X の形が .NET の Guid.ToString("X") と一致する。
  const gx = await value("guid('X')");
  assert.match(gx, /^\{0x[0-9a-f]{8},0x[0-9a-f]{4},0x[0-9a-f]{4},\{0x[0-9a-f]{2}(,0x[0-9a-f]{2}){7}\}\}$/);
  const gOther = await value("guid()", { ...M, guidSeed: "another-seed" });
  assert.notEqual(gOther, await value("guid()"));
  // 開示文面：semantics と各項目の caution が決定的モデルを明示する。
  assert.match(definition.semantics.support, /決定的/);
  for (const n of ["utcNow", "getFutureTime", "getPastTime", "rand", "guid"]) {
    const item = definition.reference.find((r) => r.name === n);
    assert.match(item.caution + item.description, /基準時刻|シード|決定的/, `${n} の決定的モデルの開示`);
  }
});
