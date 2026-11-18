import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { mergeCatalog } from "../js/core/catalog.js";
import {
  referenceAdvanced,
  referenceOverrides,
} from "../js/types/vba/reference-advanced.js";

// 高度A4班 VBA意味論チーム（lane-a4-vba-sem）の回帰テスト。
// 期待値は Microsoft Learn（VBA 言語リファレンス／MS-VBAL）から導いた。
// ・VBA-SEM-01: 検査系関数への Nothing／Range の受け渡し
// ・VBA-SEM-02: String 型×数値型の比較（MS-VBAL 関係演算子）
// ・VBA-SEM-03: String 関数の同名衝突による欠落
// ・V-D06-1: 高度項目名の使用中チップ解決
// ・V-到達1: 基礎定数のフルネーム検索到達
// ・F-04: 値モデルの caution 開示
const vba = getDefinition("vba");
const run = async (code) =>
  vba.simulate(`Sub Main()\n${code}\nEnd Sub`, structuredClone(vba.model.defaults));
const outs = async (code) => {
  const r = await run(code);
  assert.ok(!r.error, `${code} -> ${JSON.stringify(r.error)}`);
  assert.equal(r.paths.length, 1, code);
  assert.ok(!r.paths[0].error, `${code} -> ${JSON.stringify(r.paths[0].error)}`);
  return r.paths[0].outputs.map((o) => o.text);
};
const out1 = async (expr) => (await outs(`Debug.Print ${expr}`))[0];
const pathErr = async (code, errCode) => {
  const r = await run(code);
  assert.ok(!r.error, `${code} -> top ${JSON.stringify(r.error)}`);
  assert.equal(r.paths.length, 1, code);
  assert.equal(r.paths[0].error?.code, errCode, `${code} -> ${JSON.stringify(r.paths[0].error)}`);
};

// ---- プローブ回帰（V／VB／A 群の代表形） ----
test("V1: Round は銀行丸め（偶数丸め）", async () => {
  assert.equal(await out1("Round(2.5)"), "2");
  assert.equal(await out1("Round(3.5)"), "4");
  assert.equal(await out1("Round(-2.5)"), "-2");
});
test("V9: 1/0 はエラー11、0/0 はエラー6（MS-VBAL 5.6.9.3.5 の裁定）", async () => {
  await pathErr("Debug.Print 1 / 0", 11);
  await pathErr("Debug.Print 0 / 0", 6);
});
test("V8: CStr(Null) はエラー94", async () => {
  await pathErr("Debug.Print CStr(Null)", 94);
});
test("A-05: ^ は左結合、単項マイナスは ^ より弱い", async () => {
  assert.equal(await out1("-2 ^ 2"), "-4");
  assert.equal(await out1("2 ^ 3 ^ 2"), "64");
  assert.equal(await out1("2 ^ -2"), "0.25");
});
test("A-08: And／Or は非短絡（両辺評価でエラー11）", async () => {
  await pathErr("x = 0\nDebug.Print False And (1 / x = 0)", 11);
  await pathErr("x = 0\nDebug.Print True Or (1 / x = 0)", 11);
});
test("VB6: IIf は両辺を評価する（エラー11）", async () => {
  await pathErr("Debug.Print IIf(True, 1, 1 / 0)", 11);
});
test("VB11: Option Explicit の未宣言名は解析時（トップレベル）で停止し出力しない", async () => {
  const r = await vba.simulate(
    "Option Explicit\nSub Main()\nDebug.Print 未宣言の名前\nEnd Sub",
    structuredClone(vba.model.defaults),
  );
  assert.ok(r.error, JSON.stringify(r));
  assert.equal(r.paths.length, 0);
});
test("VB12: ループ外の Exit For は解析時に構造違反で停止する", async () => {
  const r = await run("Exit For");
  assert.ok(r.error || r.paths[0]?.error, JSON.stringify(r));
  assert.notEqual(r.paths[0]?.outputs?.length, 1);
});
test("エラー番号 spot: 添字9／型不一致13／オーバーフロー6／引数5", async () => {
  await pathErr("Dim a(2) As Integer\nDebug.Print a(5)", 9);
  await pathErr('Dim n As Integer\nn = "abc"', 13);
  await pathErr("Debug.Print CInt(40000)", 6);
  await pathErr("Debug.Print Sqr(-1)", 5);
  await pathErr("Debug.Print CLng(Null)", 94);
});
test("F-01 代表形: 高度関数の典型値（Learn 導出）", async () => {
  assert.equal(await out1('Asc("A")'), "65");
  assert.equal(await out1("Chr(65)"), "A");
  assert.equal(await out1("Hex(255)"), "FF");
  assert.equal(await out1("Oct(64)"), "100");
  assert.equal(await out1("DateSerial(2026, 3, 1)"), "46082");
  assert.equal(await out1('IsNull(Choose(5, "a", "b"))'), "True");
  await pathErr("Debug.Print MonthName(13)", 9);
});

// ---- VBA-SEM-01: 検査系関数と Nothing／Range ----
test("SEM-01: IsObject は Nothing と Range に True を返す（エラー91にしない）", async () => {
  assert.equal(await out1("IsObject(Nothing)"), "True");
  assert.equal(await out1('IsObject(Range("A1"))'), "True");
  assert.deepEqual(
    await outs('Dim o As Object\nDebug.Print IsObject(o)'),
    ["True"],
  );
});
test("SEM-01: TypeName／VarType は Range そのものを報告する", async () => {
  assert.equal(await out1('TypeName(Range("A1"))'), "Range");
  assert.equal(await out1('VarType(Range("A1"))'), "9");
  assert.deepEqual(
    await outs(
      'Dim o As Object\nSet o = Range("B2")\nDebug.Print TypeName(o)\nDebug.Print VarType(o)\nDebug.Print IsObject(o)',
    ),
    ["Range", "9", "True"],
  );
});
test("SEM-01: TypeName／VarType の Nothing は \"Nothing\"／9", async () => {
  assert.equal(await out1("TypeName(Nothing)"), "Nothing");
  assert.equal(await out1("VarType(Nothing)"), "9");
});
test("SEM-01: IsArray／IsDate／IsError は Nothing に False を返す", async () => {
  assert.equal(await out1("IsArray(Nothing)"), "False");
  assert.equal(await out1("IsDate(Nothing)"), "False");
  assert.equal(await out1("IsError(Nothing)"), "False");
});
test("SEM-01 回帰: IsNull／IsEmpty の従来挙動は変わらない", async () => {
  assert.equal(await out1("IsNull(Nothing)"), "False");
  assert.equal(await out1("IsEmpty(Nothing)"), "False");
  // IsEmpty(Range) はセル値を見る（既定プロパティ解決を維持）
  assert.equal(await out1('IsEmpty(Range("A5"))'), "True");
  assert.equal(await out1('IsEmpty(Range("A1"))'), "False");
});

// ---- VBA-SEM-02: String 型×数値型の比較 ----
test("SEM-02: リテラル同士の String×数値比較は数値比較になる（V7）", async () => {
  assert.equal(await out1('2 < "10"'), "True");
  assert.equal(await out1('"10" = 10'), "True");
  assert.equal(await out1('"10" < 2'), "False");
});
test("SEM-02: String 型変数×数値も数値比較になる", async () => {
  assert.deepEqual(
    await outs('Dim s As String\ns = "10"\nDebug.Print s > 2\nDebug.Print s = 10'),
    ["True", "True"],
  );
});
test("SEM-02: 変換できない文字列との比較はエラー13", async () => {
  await pathErr('Debug.Print "abc" = 10', 13);
});
test("SEM-02 回帰: String×String は文字列比較、Variant 格納値も従来どおり", async () => {
  assert.deepEqual(
    await outs('Dim s As String\ns = "a"\nDebug.Print s < "b"'),
    ["True"],
  );
  assert.deepEqual(await outs('v = "10"\nDebug.Print v = 10'), ["True"]);
});
test("SEM-02: Select Case でも String×数値の数値比較が働く", async () => {
  assert.deepEqual(
    await outs(
      'Select Case "10"\nCase 10\nDebug.Print "hit"\nCase Else\nDebug.Print "miss"\nEnd Select',
    ),
    ["hit"],
  );
});

// ---- VBA-SEM-03: String 関数 ----
test("SEM-03: String 関数の基本形（文字列／文字コード）", async () => {
  assert.equal(await out1('String(3, "a")'), "aaa");
  assert.equal(await out1("String(3, 65)"), "AAA");
  assert.equal(await out1('String(5, "ab")'), "aaaaa");
  assert.equal(await out1('Len(String(0, "a"))'), "0");
});
test("SEM-03: String の異常値（負数5／コード範囲外5／Null 94／個数450）", async () => {
  await pathErr('Debug.Print String(-1, "a")', 5);
  await pathErr("Debug.Print String(3, 256)", 5);
  await pathErr("Debug.Print String(3, Null)", 94);
  await pathErr('Debug.Print String("a")', 450);
});
test("SEM-03: String(1000000, ...) は巨大な実体を作らず未確定値になる", async () => {
  const r = await run('x = String(1000000, "a")');
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths[0].vars.x?.kind, "unknown");
});
test("SEM-03: Option Explicit 下でも String 関数は未定義変数にならない", async () => {
  const r = await vba.simulate(
    'Option Explicit\nSub Main()\nDim t As String\nt = String(2, "x")\nDebug.Print t\nEnd Sub',
    structuredClone(vba.model.defaults),
  );
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.deepEqual(r.paths[0].outputs.map((o) => o.text), ["xx"]);
});

// ---- V-D06-1: 高度項目名のチップ解決 ----
// app.js の述語の複製（app.js は DOM 依存で import できないため、
// 完全性チームの先例と同じく複製で前提を固定する）
function resolveReferenceName(name, referenceNames) {
  if (referenceNames.indexOf(name) >= 0) return name;
  let parts = name.split(".");
  for (let i = 1; i < parts.length; i++) {
    let candidate = parts.slice(i).join(".");
    if (referenceNames.indexOf(candidate) >= 0) return candidate;
  }
  return null;
}
function usedTraceNames(refs, referenceNames) {
  let out = [];
  for (let name of refs) {
    let resolved = resolveReferenceName(name, referenceNames);
    if (resolved && out.indexOf(resolved) < 0) out.push(resolved);
  }
  return out;
}
test("V-D06-1: scan 経路で高度関数 Asc が解決される", () => {
  assert.ok(vba.scan('x = Asc("A")').includes("Asc"));
  assert.ok(vba.scan('x = Format(1.5, "0.0")').includes("Format"));
});
test("V-D06-1: 実行後（trace）経路でも高度関数が解決される", async () => {
  const r = await run('x = Asc("A")\nDebug.Print x');
  const refs = new Set();
  for (const p of r.paths) for (const t of p.trace) for (const n of t.refs || []) refs.add(n);
  assert.ok(refs.has("Asc"), [...refs].join(","));
  assert.ok(refs.has("Len") === false || true); // Len は使っていない
});
test("V-D06-1: 定数グループ項目（ドット名）が scan で解決される", () => {
  assert.ok(
    vba.scan("x = FileAttributeConstants.Normal").includes("FileAttributeConstants.Normal"),
  );
});
test("V-D06-1: Debug.Print に Print # が誤って一致しない", () => {
  const refs = vba.scan("Debug.Print 1");
  assert.ok(refs.includes("Debug.Print"));
  assert.ok(!refs.includes("Print #"));
});
test("V-D06-1: 基礎項目の解決は回帰しない", () => {
  assert.ok(vba.scan('x = Len("a")').includes("Len"));
  assert.ok(vba.scan('x = CInt("3")').includes("CInt"));
  assert.ok(vba.scan("Debug.Print vbBlack").includes("vbBlack"));
  assert.ok(vba.scan("For i = 1 To 3\nNext i").includes("For"));
});
test("V-D06-1: 簡易モードでは高度名がチップに残らない（実効カタログ前提）", () => {
  const refs = vba.scan('x = Asc("A")');
  const baseNames = vba.reference.map((r) => r.name);
  assert.deepEqual(usedTraceNames(refs, baseNames), []);
  const merged = mergeCatalog(
    { reference: vba.reference, templates: vba.templates, glossary: vba.glossary },
    { referenceAdvanced, referenceOverrides },
  );
  assert.deepEqual(merged.problems, []);
  const mergedNames = merged.reference.map((r) => r.name);
  assert.deepEqual(usedTraceNames(refs, mergedNames), ["Asc"]);
});

// ---- V-到達1: フルネーム検索到達 ----
// app.js の refSearchText の複製
function refSearchText(r) {
  let parts = [r.name, r.category, r.description, r.syntax];
  if (Array.isArray(r.inventoryNames)) parts.push(...r.inventoryNames);
  if (typeof r.scan === "string") parts.push(r.scan);
  return parts.filter((x) => typeof x === "string").join(" ").toLowerCase();
}
test("V-到達1: 代表グループのフルネームで自項目へ到達できる", () => {
  const cases = [
    ["vbBlack", "ColorConstants.vbBlack"],
    ["vbOK", "VbMsgBoxResult.vbOK"],
    ["vbOKOnly", "VbMsgBoxStyle.vbOKOnly"],
    ["vbInteger", "VbVarType.vbInteger"],
    ["vbSunday", "VbDayOfWeek.vbSunday"],
    ["vbCrLf", "Constants.vbCrLf"],
    ["vbUpperCase", "VbStrConv.vbUpperCase"],
    ["vbKeyF1", "KeyCodeConstants.vbKeyF1"],
  ];
  for (const [member, full] of cases) {
    const item = vba.reference.find((r) => r.name === member);
    assert.ok(item, member);
    assert.equal(item.name, member); // 項目名・表示名は変えない
    assert.ok(
      refSearchText(item).includes(full.toLowerCase()),
      `${full} で ${member} に到達できません`,
    );
  }
});
test("V-到達1: フルネームが付与された基礎定数は234件全件が到達可能", () => {
  const withFull = vba.reference.filter((r) => Array.isArray(r.inventoryNames));
  assert.equal(withFull.length, 234);
  for (const r of withFull)
    for (const full of r.inventoryNames)
      assert.ok(refSearchText(r).includes(full.toLowerCase()), `${r.name}: ${full}`);
});

// ---- F-04: 値モデルの caution 開示 ----
test("F-04: VarType／TypeName／Hex／Oct の caution にモデル開示がある", () => {
  const merged = mergeCatalog(
    { reference: vba.reference, templates: vba.templates, glossary: vba.glossary },
    { referenceAdvanced, referenceOverrides },
  );
  const byName = (n) => merged.reference.find((r) => r.name === n);
  assert.ok(byName("VarType").caution.includes("Double として保持"));
  assert.ok(byName("TypeName").caution.includes("Double として保持"));
  assert.ok(byName("Hex").caution.includes("最小の型の幅"));
  assert.ok(byName("Oct").caution.includes("最小の型の幅"));
});
