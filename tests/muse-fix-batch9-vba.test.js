import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ9（VBA班）: Round 30 の VBA 欠陥5件
//  N15（R30-PAR-6）: 16進・8進リテラル &H／&O の実装
//  N18（F01A-N1）: 文字列→数値変換から JS Number() 意味論の漏れを除去
//  N19（F01A-N2）: 比較定数3件への代入ガード
//  N20（F01A-N3）: IsNull／IsEmpty の Nothing 扱い
//  N32（R30-SEM-N1）: べき乗演算子 ^ の左結合化
// 一次情報（Microsoft Learn の VBA 言語リファレンス）:
//  N15: 基数接頭辞 &H／&O。符号解釈は Val 関数の例（Val("&HFFFF") は -1）
//       と最小符号付き型の規則による。&HFFFF&（Long 接尾辞）は 65535。
//  N18: Hex 関数の説明（逆変換は &H 接頭辞）、KB 161304、Val function
//       （&O／&H を認識する前方一致。CDbl 系の全体一致とは別規則）。
//  N19: 組み込み定数への代入はコンパイルエラー（R28-N8 の RG-240 系）。
//  N20: IsNull／IsEmpty の定義（Nothing は Null でも Empty でもない）。
//  N32: Operator precedence（同一優先順位は左から右へ）と VB 公式の
//       Exponentiation Operator 項（^ は左から右に評価、(2^3)^2 = 64）。

const vba = getDefinition("vba");
const run = async (code) => vba.simulate(code, structuredClone(vba.model.defaults));
const errs = (r) => [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const outs = async (code) => {
  const r = await run(code);
  assert.deepEqual(errs(r), [], code);
  return r.paths[0].outputs.map((o) => o.text);
};
const expectErr = async (code, pattern, errCode) => {
  const r = await run(code);
  const all = errs(r);
  assert.ok(all.length >= 1, code + " must stop");
  if (pattern) assert.match(all[0].message, pattern, code);
  if (errCode !== undefined) assert.equal(all[0].code, errCode, code);
  return all[0];
};

/* ---------------- N15: &H／&O リテラル ---------------- */

test("R30-N15 hex/octal literals evaluate as numbers", async () => {
  assert.deepEqual(await outs("Debug.Print &H1F"), ["31"]);
  assert.deepEqual(await outs("Debug.Print &O17"), ["15"]);
  assert.deepEqual(await outs("Debug.Print &H10"), ["16"]);
  assert.deepEqual(await outs("Debug.Print &O10"), ["8"]);
  assert.deepEqual(await outs("Debug.Print &hff"), ["255"]);
  assert.deepEqual(await outs("Debug.Print &H10 + &O10"), ["24"]);
  assert.deepEqual(await outs("Debug.Print -&H10"), ["-16"]);
  assert.deepEqual(await outs("Dim i As Integer\ni = &HFF\nDebug.Print i"), ["255"]);
});

test("R30-N15 hex/octal literals use VBA signed interpretation", async () => {
  // 接尾辞なし: 最小の符号付き型に収まる解釈（&HFFFF は -1）
  assert.deepEqual(await outs("Debug.Print &HFFFF"), ["-1"]);
  assert.deepEqual(await outs("Debug.Print &H8000"), ["-32768"]);
  assert.deepEqual(await outs("Debug.Print &H10000"), ["65536"]);
  assert.deepEqual(await outs("Debug.Print &HFFFFFFFF"), ["-1"]);
  assert.deepEqual(await outs("Debug.Print &O177777"), ["-1"]);
  // 型接尾辞: & は Long（&HFFFF& は 65535）、% は Integer
  assert.deepEqual(await outs("Debug.Print &HFFFF&"), ["65535"]);
  assert.deepEqual(await outs("Debug.Print &H10%"), ["16"]);
  assert.deepEqual(await outs("Debug.Print &HFF&"), ["255"]);
});

test("R30-N15 malformed based literals stop naming the literal form", async () => {
  await expectErr("Debug.Print &H", /16進リテラル &H/);
  await expectErr("Debug.Print &O8", /8進リテラル &O/);
  await expectErr("Debug.Print &H10000%", /リテラルの値が型の範囲を超えています：&H10000%/);
});

test("R30-N15 decimal type suffixes are part of the literal", async () => {
  assert.deepEqual(await outs("Debug.Print 5&"), ["5"]);
  assert.deepEqual(await outs("Debug.Print 5%"), ["5"]);
  assert.deepEqual(await outs("x = 5&\nDebug.Print x"), ["5"]);
  await expectErr("Debug.Print 40000%", /リテラルの値が型の範囲を超えています/);
});

test("R30-N15 concatenation operator & is not disturbed", async () => {
  assert.deepEqual(await outs('Debug.Print "a" & "b"'), ["ab"]);
  assert.deepEqual(await outs('x = "a"\nDebug.Print x & "b"'), ["ab"]);
  assert.deepEqual(await outs("Debug.Print 1 & 2"), ["12"]);
  // 空白を伴う通常の連結（右辺は暗黙変数 H10）は従来どおり
  assert.deepEqual(await outs('Debug.Print "a" & H10'), ["a"]);
  // 連結には & を演算子として書く（& &H10 で 16進リテラルを連結できる）
  assert.deepEqual(await outs('Debug.Print "x" & &H10'), ["x16"]);
  assert.deepEqual(await outs('Dim s As String\ns = "n=" & &HFF\nDebug.Print s'), ["n=255"]);
});

/* ---------------- N18: 文字列→数値変換 ---------------- */

test("R30-N18 JS-style radix prefixes are type mismatch (error 13)", async () => {
  for (const code of [
    'Debug.Print CDbl("0x10")',
    'Debug.Print CInt("0x10")',
    'Debug.Print CLng("0x10")',
    'Debug.Print CDbl("0o17")',
    'Debug.Print CDbl("0b101")',
    'Debug.Print "0x10" + 0',
    'Debug.Print "0x10" * 2',
    'Debug.Print Abs("0x10")',
    'Debug.Print Int("0x10")',
    'Debug.Print Fix("0x10")',
    'Debug.Print Round("0x10")',
    'Dim n As Long\nn = "0x10"',
  ])
    await expectErr(code, /型が一致しません/, 13);
});

test("R30-N18 VBA radix prefixes in strings convert", async () => {
  assert.deepEqual(await outs('Debug.Print CDbl("&H10")'), ["16"]);
  assert.deepEqual(await outs('Debug.Print CLng("&HFF")'), ["255"]);
  assert.deepEqual(await outs('Debug.Print CLng("&O17")'), ["15"]);
  assert.deepEqual(await outs('Debug.Print CDbl("&HFFFF")'), ["-1"]);
  assert.deepEqual(await outs('Debug.Print "&H10" + 0'), ["16"]);
  assert.deepEqual(await outs('Debug.Print Abs("&H10")'), ["16"]);
  assert.deepEqual(await outs('Dim n As Long\nn = "&H10"\nDebug.Print n'), ["16"]);
});

test("R30-N18 ordinary decimal strings keep converting", async () => {
  assert.deepEqual(await outs('Debug.Print CDbl("1e3")'), ["1000"]);
  assert.deepEqual(await outs('Debug.Print CDbl(" 12 ")'), ["12"]);
  assert.deepEqual(await outs('Debug.Print CDbl(".5")'), ["0.5"]);
  assert.deepEqual(await outs('Debug.Print CInt("2.5")'), ["2"]);
  await expectErr('Debug.Print CDbl("12abc")', /型が一致しません/, 13);
  await expectErr('Debug.Print CDbl("")', /型が一致しません/, 13);
});

test("R30-N18 IsNumeric follows the VBA conversion rule", async () => {
  assert.deepEqual(await outs('Debug.Print IsNumeric("&H10")'), ["True"]);
  assert.deepEqual(await outs('Debug.Print IsNumeric("&O17")'), ["True"]);
  assert.deepEqual(await outs('Debug.Print IsNumeric("0x10")'), ["False"]);
  assert.deepEqual(await outs('Debug.Print IsNumeric("0o17")'), ["False"]);
  assert.deepEqual(await outs('Debug.Print IsNumeric("12")'), ["True"]);
  assert.deepEqual(await outs('Debug.Print IsNumeric("1e3")'), ["True"]);
  assert.deepEqual(await outs('Debug.Print IsNumeric("abc")'), ["False"]);
  assert.deepEqual(await outs('Debug.Print IsNumeric("")'), ["False"]);
});

test("R30-N18 Val keeps its own partial-parse rule and learns radix prefixes", async () => {
  assert.deepEqual(await outs('Debug.Print Val("&H10")'), ["16"]);
  assert.deepEqual(await outs('Debug.Print Val("&O17")'), ["15"]);
  // Microsoft Learn の Val function の明示例: Val("&HFFFF") は -1
  assert.deepEqual(await outs('Debug.Print Val("&HFFFF")'), ["-1"]);
  // 前方一致（部分パース）は CDbl 系と混同せず従来どおり
  assert.deepEqual(await outs('Debug.Print Val("12abc")'), ["12"]);
  assert.deepEqual(await outs('Debug.Print Val("abc")'), ["0"]);
  assert.deepEqual(await outs('Debug.Print Val("&H")'), ["0"]);
  assert.deepEqual(await outs('Debug.Print Val("1 2")'), ["12"]);
  // 型接尾辞は従来どおり未対応として名指す
  await expectErr('Debug.Print Val("12%")', /Val の型接尾辞/);
});

/* ---------------- N19: 比較定数への代入ガード ---------------- */

const CONST_ASSIGN = /には代入できません（組み込み定数への代入はエラーです）/;

test("R30-N19 assignment to compare constants stops naming them", async () => {
  for (const [code, key] of [
    ["vbBinaryCompare = 5", /vbbinarycompare/],
    ["vbTextCompare = 0", /vbtextcompare/],
    ["vbDatabaseCompare = 9", /vbdatabasecompare/],
    ["Let vbTextCompare = 0", /vbtextcompare/],
    ["Set vbTextCompare = Nothing", /vbtextcompare/],
    ["VBTEXTCOMPARE = 0", /vbtextcompare/],
    ["For vbTextCompare = 1 To 2\nNext", /vbtextcompare/],
  ]) {
    const e = await expectErr(code, CONST_ASSIGN);
    assert.match(e.message, key, code);
  }
  // Option Explicit 下でも虚偽の「変数が定義されていません」にならない
  const e = await expectErr("Option Explicit\nvbTextCompare = 0", CONST_ASSIGN);
  assert.match(e.message, /vbtextcompare/);
  // 同名宣言も他の定数と同じく名指し停止
  await expectErr("Dim vbTextCompare As Long", /定数 vbtextcompare と同じ名前の変数は宣言できません/);
});

test("R30-N19 compare constants remain usable as values", async () => {
  assert.deepEqual(
    await outs("Debug.Print vbBinaryCompare + vbTextCompare + vbDatabaseCompare"),
    ["3"],
  );
  assert.deepEqual(
    await outs('Debug.Print InStr(1, "abcabc", "BC", vbTextCompare)'),
    ["2"],
  );
  assert.deepEqual(
    await outs('Debug.Print Replace("AAA", "a", "b", 1, -1, vbTextCompare)'),
    ["bbb"],
  );
  // compare=2（vbDatabaseCompare）は従来どおりエラー5で停止する
  await expectErr('Debug.Print InStr(1, "abc", "b", vbDatabaseCompare)', /プロシージャの呼び出し、または引数が不正です/, 5);
});

test("R30-N19 full sweep: all 242 constants checked for assignment", async () => {
  const consts = vba.reference.filter((r) => r.category === "定数");
  assert.equal(consts.length, 242);
  // リテラルキーワード5件（Empty／Null／Nothing／True／False）への代入は
  // F01A §4 の未確認候補5として N19 の範囲外（本テストでは件数のみ固定）。
  const literals = new Set(["empty", "null", "nothing", "true", "false"]);
  let guarded = 0;
  for (const c of consts) {
    const name = c.name;
    if (literals.has(name.toLowerCase())) continue;
    const r = await run(`${name} = 1`);
    const all = errs(r);
    assert.ok(all.length >= 1, `${name} = 1 must stop`);
    assert.match(all[0].message, CONST_ASSIGN, `${name} = 1`);
    assert.match(all[0].message, new RegExp(name.toLowerCase()), name);
    guarded++;
  }
  assert.equal(guarded, 237);
});

/* ---------------- N20: IsNull／IsEmpty と Nothing ---------------- */

test("R30-N20 IsNull/IsEmpty of Nothing are False, not error 91", async () => {
  assert.deepEqual(await outs("Debug.Print IsNull(Nothing)"), ["False"]);
  assert.deepEqual(await outs("Debug.Print IsEmpty(Nothing)"), ["False"]);
  assert.deepEqual(await outs("Set x = Nothing\nDebug.Print IsNull(x)"), ["False"]);
  assert.deepEqual(await outs("Set x = Nothing\nDebug.Print IsEmpty(x)"), ["False"]);
  assert.deepEqual(await outs("Set x = Nothing\nDebug.Print IsNull(x) Or IsEmpty(x)"), ["False"]);
});

test("R30-N20 IsNull/IsEmpty keep their existing meanings", async () => {
  assert.deepEqual(await outs("Debug.Print IsNull(Null)"), ["True"]);
  assert.deepEqual(await outs("Debug.Print IsEmpty(Empty)"), ["True"]);
  assert.deepEqual(await outs("Debug.Print IsNull(Empty)"), ["False"]);
  assert.deepEqual(await outs("Debug.Print IsEmpty(Null)"), ["False"]);
  // Range の既定プロパティ解決（セル値で判定）は従来どおり
  assert.deepEqual(await outs('Debug.Print IsEmpty(Range("A5"))'), ["True"]);
  assert.deepEqual(await outs('Debug.Print IsNull(Range("A5"))'), ["False"]);
  assert.deepEqual(await outs('Debug.Print IsEmpty(Range("A2"))'), ["False"]);
});

test("R30-N20 Nothing in value positions still raises error 91", async () => {
  await expectErr("Debug.Print Nothing", /オブジェクト変数または With ブロック変数が設定されていません/, 91);
  await expectErr("x = Nothing", /オブジェクト変数または With ブロック変数が設定されていません/, 91);
  await expectErr("Debug.Print Len(Nothing)", /オブジェクト変数または With ブロック変数が設定されていません/, 91);
});

/* ---------------- N32: ^ の左結合 ---------------- */

test("R30-N32 power operator is left-associative", async () => {
  assert.deepEqual(await outs("Debug.Print 2 ^ 3 ^ 2"), ["64"]);
  assert.deepEqual(await outs("Debug.Print 2 ^ 2 ^ 3"), ["64"]);
  assert.deepEqual(await outs("Debug.Print 16 ^ 0.5 ^ 2"), ["16"]);
  assert.deepEqual(await outs("Debug.Print 4 ^ 0.5 ^ 2"), ["4"]);
});

test("R30-N32 power operator keeps its other rules", async () => {
  assert.deepEqual(await outs("Debug.Print 2 ^ 3"), ["8"]);
  assert.deepEqual(await outs("Debug.Print (2 ^ 3) ^ 2"), ["64"]);
  assert.deepEqual(await outs("Debug.Print 2 ^ (3 ^ 2)"), ["512"]);
  // 単項マイナスより ^ が先（-2 ^ 2 = -(2^2)）
  assert.deepEqual(await outs("Debug.Print -2 ^ 2"), ["-4"]);
  assert.deepEqual(await outs("Debug.Print 2 ^ -2"), ["0.25"]);
  assert.deepEqual(await outs("Debug.Print (-2) ^ 2"), ["4"]);
});
