import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { referenceAdvanced, referenceOverrides } from "../js/types/vba/reference-advanced.js";
import { templatesAdvanced } from "../js/types/vba/templates-advanced.js";
import { glossaryAdvanced } from "../js/types/vba/glossary-advanced.js";
import { advancedBuiltins } from "../js/types/vba/functions-advanced.js";
import { advancedConstants } from "../js/types/vba/constants-advanced.js";
import { reference as baseReference, glossary as baseGlossary } from "../js/content.js";

// ADV-B4 VBA監査班テスト（独立監査）。
// 期待値は一次情報（Microsoft Learn／MS-VBAL）から導いた。
// 欠陥番号 D1〜D10 は報告書 docs/audit/ADV-B4-audit-vba.md に対応する。
const vba = getDefinition("vba");
const run = async (code) =>
  vba.simulate(code, structuredClone(vba.model.defaults));
const runBody = async (body) => run(`Sub Main()\n${body}\nEnd Sub`);
const out1 = async (expr) => {
  const r = await runBody(`Debug.Print ${expr}`);
  assert.ok(!r.error, `${expr} -> top ${JSON.stringify(r.error)}`);
  assert.equal(r.paths.length, 1, expr);
  assert.ok(!r.paths[0].error, `${expr} -> ${JSON.stringify(r.paths[0].error)}`);
  return r.paths[0].outputs.map((o) => o.text).join("|");
};
const errCode = async (expr) => {
  const r = await runBody(`Debug.Print ${expr}`);
  if (r.error) return -1; // トップレベル停止
  const p = r.paths[0];
  assert.ok(p.error, `${expr} は停止するはず`);
  return p.error.code;
};
const ALL = [...referenceAdvanced, ...referenceOverrides];
const STMT_SUPPORTED = ["Do...Loop", "Exit", "For Each...Next", "For...Next", "If...Then...Else"];

/* ---------- 角度 B群／契約第11章：宣言↔挙動マトリクス ---------- */

test("audit-vba matrix: ステータス内訳と status 必須・重複なし（契約 a/b）", () => {
  const count = (s) => ALL.filter((r) => r.status === s).length;
  assert.equal(ALL.length, 211);
  assert.equal(count("supported"), 132);
  assert.equal(count("unsupported"), 79);
  assert.equal(count("unverified"), 0);
  for (const r of ALL) assert.ok(["supported", "unsupported", "unverified"].includes(r.status), r.name);
  const names = ALL.map((r) => r.name);
  assert.equal(new Set(names).size, names.length, "name 重複なし");
  const baseNames = new Set(baseReference.map((r) => r.name));
  assert.deepEqual(
    referenceAdvanced.filter((r) => baseNames.has(r.name)).map((r) => r.name),
    [],
    "referenceAdvanced に基礎との素の重複なし",
  );
  for (const r of referenceOverrides) assert.ok(baseNames.has(r.name), `override 対象 ${r.name} が基礎に実在`);
});

test("audit-vba matrix: 対応関数81件とハンドラ81件が双方向に一致（契約 d/e）", () => {
  const supFns = ALL.filter(
    (r) => r.status === "supported" && !r.name.includes("Constants.") && !STMT_SUPPORTED.includes(r.name),
  );
  assert.equal(supFns.length, 81);
  assert.equal(Object.keys(advancedBuiltins).length, 81);
  for (const r of supFns) assert.ok(r.name.toLowerCase() in advancedBuiltins, `${r.name} のハンドラがある`);
  const supLower = new Set(supFns.map((r) => r.name.toLowerCase()));
  for (const k of Object.keys(advancedBuiltins)) assert.ok(supLower.has(k), `ハンドラ ${k} は対応項目に対応`);
});

test("audit-vba matrix: 全211件の example 実走（対応=実行可、未対応=停止）", async () => {
  for (const item of ALL) {
    const r = await runBody(item.example);
    const stopped = Boolean(r.error) || Boolean(r.paths?.[0]?.error);
    if (item.status === "supported")
      assert.ok(!stopped, `${item.name}（対応）の example が停止した: ${item.example}`);
    else
      assert.ok(stopped, `${item.name}（未対応）の example が黙って通った: ${item.example}`);
  }
});

test("audit-vba matrix: 未対応関数は名前を挙げて停止する（F-03）", async () => {
  for (const fn of ["CallByName", "CreateObject", "Dir", "Environ", "EOF", "FileAttr", "FileDateTime", "FileLen", "GetAllSettings", "GetAttr", "GetObject", "GetSetting", "Loc", "LOF", "MacID", "MacScript", "Shell", "Spc", "Tab"]) {
    const r = await runBody(`x = ${fn}("x")`);
    const msg = String(r.error?.message ?? r.paths?.[0]?.error?.message ?? "");
    assert.ok(r.error || r.paths?.[0]?.error, `${fn} は停止する`);
    assert.ok(msg.toLowerCase().includes(fn.toLowerCase()), `${fn} は名指しで停止する: ${msg}`);
  }
});

test("audit-vba matrix: 定数46件がメンバー名で引けて説明文の値と一致する", async () => {
  const consts = ALL.filter((r) => r.name.includes("Constants."));
  assert.equal(consts.length, 46);
  for (const c of consts) {
    const member = c.name.split(".")[1];
    const registered = advancedConstants[member.toLowerCase()];
    assert.notEqual(registered, undefined, `${c.name} が登録されている`);
    assert.equal(await out1(member), String(registered), `${c.name} が名前で引ける`);
    const dm = c.description.match(/10進数では (-?\d+)/) || c.description.match(/値は (-?\d+)/);
    assert.ok(dm, `${c.name} の説明に値がある`);
    assert.equal(Number(dm[1]), registered, `${c.name} の説明値と登録値が一致`);
  }
});

test("audit-vba matrix: テンプレート5件が実行でき主張値と一致する（契約 f）", async () => {
  const byId = {};
  for (const t of templatesAdvanced) {
    const r = await run(t.code);
    assert.ok(!r.error, `${t.id} -> ${JSON.stringify(r.error)}`);
    assert.ok(!r.paths[0].error, `${t.id} -> ${JSON.stringify(r.paths[0].error)}`);
    byId[t.id] = r.paths[0].outputs.map((o) => o.text);
  }
  assert.deepEqual(byId["vba-adv-deadline"], ["46067", "30"]);
  assert.deepEqual(byId["vba-adv-format"], ["1,234,567", "1,234.57", "1/15/2026"]);
  assert.deepEqual(byId["vba-adv-split-join"], ["りんご", "みかん", "ぶどう", "りんご / みかん / ぶどう"]);
  const loan = byId["vba-adv-loan"].map(Number);
  assert.ok(Math.abs(loan[0] - -8606.64297070824) < 1e-9, "Pmt は年金現価式の手計算と一致");
  assert.equal(loan[1], -500, "IPmt 第1期は元金×利率");
  assert.ok(Math.abs(loan[0] - (loan[1] + loan[2])) < 1e-9, "Pmt = IPmt + PPmt");
  assert.deepEqual(byId["vba-adv-branch"], ["A", "合格"]);
  // refs は全て合成カタログに存在し、コード中の高度項目は supported のみ
  const byName = new Map();
  for (const r of baseReference) byName.set(r.name, r);
  for (const r of referenceOverrides) byName.set(r.name, r);
  for (const r of referenceAdvanced) byName.set(r.name, r);
  for (const t of templatesAdvanced)
    for (const ref of t.refs) assert.ok(byName.has(ref), `${t.id}.refs: ${ref}`);
});

test("audit-vba matrix: 検索述語で全項目が自名にヒットし定数はメンバー名でも届く（D-05/F-02）", () => {
  const pred = (item, q) =>
    (item.name + " " + item.category + " " + item.description + " " + item.syntax)
      .toLowerCase()
      .includes(q.toLowerCase());
  for (const item of ALL) {
    assert.ok(pred(item, item.name), `${item.name} が自名で届く`);
    if (item.name.includes("Constants."))
      assert.ok(pred(item, item.name.split(".")[1]), `${item.name} がメンバー名で届く`);
  }
});

test("audit-vba matrix: 用語集は基礎と重複なし・ファイル名は precache 除外パターン一致（契約 g）", () => {
  const baseWords = new Set(baseGlossary.map((g) => g[0]));
  for (const [word] of glossaryAdvanced) assert.ok(!baseWords.has(word), `用語 ${word} が基礎と重複しない`);
  for (const f of ["reference-advanced.js", "templates-advanced.js", "glossary-advanced.js", "functions-advanced.js", "constants-advanced.js"])
    assert.ok(f.includes("-advanced"), `${f} は -advanced パターンに一致`);
});

test("audit-vba: 未知値（実行時に決まる値）は高度関数でも捏造せず伝播する", async () => {
  const out = await out1("Year(Date)");
  assert.ok(out.includes("実行時に決まる"), out);
  const out2 = await out1("Month(Now)");
  assert.ok(out2.includes("実行時に決まる"), out2);
});

/* ---------- 欠陥修正の固定（D1〜D8、D10） ---------- */

test("audit-vba D1: TimeValue(Null) はエラーでなく Null を返す（MS-VBAL 6.1.2.4.1.12）", async () => {
  assert.equal(await out1("TimeValue(Null)"), "Null");
  assert.equal(await out1('TimeValue("13:30:00")'), String((13 * 3600 + 30 * 60) / 86400));
});

test("audit-vba D2/D3: InStrRev／StrComp の Null 規則と空マッチの戻り値", async () => {
  assert.equal(await out1('InStrRev("abc", "", 5)'), "5"); // 空マッチは start を返す（MS-VBAL 戻り値表）
  assert.equal(await out1('InStrRev("abc", "")'), "3");
  assert.equal(await out1('InStrRev("abc", "x", 5)'), "0"); // start > Len は通常検索で 0
  assert.equal(await errCode('InStrRev("abc", "a", Null)'), 94);
  assert.equal(await errCode('InStrRev("abc", "a", 1, Null)'), 94);
  assert.equal(await out1('InStrRev(Null, "a")'), "Null");
  assert.equal(await errCode('StrComp("a", "b", Null)'), 94);
  assert.equal(await out1('StrComp(Null, "b")'), "Null");
});

test("audit-vba D4: 財務関数は非有限値を返さない（NPV／MIRR）", async () => {
  assert.equal(await errCode("NPV(-1, Array(100, 50))"), 11);
  assert.ok(Math.abs(Number(await out1("NPV(0.1, Array(100, 100))")) - 173.55371900826447) < 1e-9);
  assert.equal(await errCode("MIRR(Array(-100, -50, 200), -1, 0.1)"), 6);
  assert.ok(Number.isFinite(Number(await out1("MIRR(Array(-100, 50, 80), -1, 0.1)"))), "finance=-1 でも第0期のみ負なら正常値");
});

test("audit-vba D5: CDec は Decimal の定義域を超えるとオーバーフロー（6）", async () => {
  assert.equal(await errCode('CDec("1E30")'), 6);
  assert.equal(await out1('CDec("123.45")'), "123.45");
});

test("audit-vba D6: DateSerial／DateAdd／TimeSerial の範囲外はエラーになる", async () => {
  assert.equal(await errCode("DateSerial(10000, 1, 1)"), 5);
  assert.equal(await errCode("DateSerial(9999, 13, 1)"), 5);
  assert.equal(await errCode("DateSerial(2026, 40000, 1)"), 6); // Integer 引数の範囲外
  assert.equal(await errCode("TimeSerial(40000, 0, 0)"), 6);
  assert.equal(await errCode('DateAdd("yyyy", 1, DateSerial(9999, 6, 1))'), 6);
  assert.equal(await out1("DateSerial(2026, 1, 15)"), "46037");
  assert.equal(await out1("DateSerial(100, 1, 1)"), "-657434"); // 定義域の下限は有効
});

test("audit-vba D7: 負シリアル（1899-12-30 より前）の日付＋時刻が正しく往復する", async () => {
  assert.equal(await out1('CDate("1899/12/29 6:00")'), "-1.25"); // OLE 形式：-1.25 = 12/29 06:00
  assert.equal(await out1('Day(CDate("1899/12/29 6:00"))'), "29");
  assert.equal(await out1('Hour(CDate("1899/12/29 6:00"))'), "6");
  assert.equal(await out1("Hour(TimeSerial(0, 0, -1))"), "23"); // 前日の 23:59:59
  assert.equal(await out1("Day(TimeSerial(0, 0, -1))"), "29");
  assert.equal(await out1('Hour(DateAdd("h", 12, CDate("1899/12/29 6:00")))'), "18");
  assert.equal(await out1('Day(DateAdd("h", 12, CDate("1899/12/29 6:00")))'), "29");
  assert.equal(await out1('Hour(DateAdd("m", 1, CDate("1899/11/29 6:00")))'), "6");
  assert.equal(await out1('Day(DateAdd("m", 1, CDate("1899/11/29 6:00")))'), "29");
  // 正シリアル側の従来挙動は不変
  assert.equal(await out1('DateAdd("d", 30, DateSerial(2026, 1, 15))'), "46067");
  assert.equal(await out1("TimeSerial(13, 30, 0)"), String((13 * 3600 + 30 * 60) / 86400));
});

test("audit-vba D8: IsObject はエラー値をオブジェクトと判定しない", async () => {
  assert.equal(await out1("IsObject(CVErr(2042))"), "False");
  assert.equal(await out1("IsError(CVErr(2042))"), "True");
  assert.equal(await out1("IsObject(1)"), "False");
});

test("audit-vba D10: MonthName の caution が実際の Null 挙動（エラー94）と一致する", async () => {
  assert.equal(await errCode("MonthName(Null)"), 94); // 引数は Long 型（MS-VBAL）ゆえ 94 が正
  const item = ALL.find((r) => r.name === "MonthName");
  assert.ok(!item.caution.includes("Null を返します"), "caution が誤った Null 伝播を主張しない");
  assert.ok(item.caution.includes("Null"), "caution が Null の扱いに触れている");
});

test("audit-vba D11: Format の文字列書式は右詰めが既定で、大文字小文字のみの書式も効く", async () => {
  assert.equal(await out1('Format("ab", "@@@")'), " ab"); // プレースホルダは右から左へ埋める（Learn）
  assert.equal(await out1('Format("ab", "!@@@")'), "ab "); // ! で左から右へ
  assert.equal(await out1('Format("abcdef", "@@@")'), "def"); // 過剰分は右詰めで左端が落ちる
  assert.equal(await out1('Format("abcdef", "!@@@")'), "abc"); // 左詰めでは右端が落ちる
  assert.equal(await out1('Format("ab", "&&&")'), "ab");
  assert.equal(await out1('Format("HELLO", "<")'), "hello"); // Learn の使用例そのまま
  assert.equal(await out1('Format("This is it", ">")'), "THIS IS IT");
  assert.equal(await out1('Format("465043799", "@@@-@@-@@@@")'), "465-04-3799");
  assert.equal(await out1('Format("abc", ">&&&")'), "ABC"); // 既存挙動の回帰防止
});

/* ---------- F-03 観察の固定（停止自体の正直さ） ---------- */

test("audit-vba F-03: ファイル番号系ステートメントは黙って通らず停止する", async () => {
  for (const code of ['Open "C:\\x.txt" For Input As #1', "Close #1", 'Print #1, "x"', "Input #1, x", "Seek #1, 5", 'Write #1, "x"']) {
    const r = await runBody(code);
    assert.ok(r.error || r.paths?.[0]?.error, `${code} は停止する`);
  }
});
