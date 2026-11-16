// 修正バッチ9（docs班）回帰テスト：文書ドリフトの機械照合（R30-N36〜N39）。
//
// 目的：RG-277 で是正した DEVELOPMENT.md の「現行」対応件数が第16種追加で
// 再び陳腐化した回帰（R30-DOC-N1／本バッチ R30-N36）を構造的に防ぐ。
// DEVELOPMENT.md／PROGRESS.md／docs/audit/REQUIREMENTS.md の「現在形主張」のうち
// 機械照合可能なものを、同じツリーの種類定義（js/types/registry.js の definitions）
// から実測した値と突き合わせ、将来ドリフトしたら npm test が落ちるようにする。
//
// 照合対象（主張 → 実測の対応）：
//  [DEV-1] DEVELOPMENT.md 共通基盤節の「N種類」「Nテンプレート」
//          → definitions.length／テンプレート総数。
//  [DEV-2] DEVELOPMENT.md「現行N件の対応項目の使用例はテストで全件実行される」（R30-N36・旧 L55）
//          → 対応（supported===true）総数。
//  [DEV-3] DEVELOPMENT.md「現行は対応N件／参照専用M件」（R30-N36・旧 L71）
//          → 対応総数／参照専用（supported===false）総数。
//  [DEV-4] DEVELOPMENT.md 最終の「現在の件数は次のとおり」段落（第16種追加の現在値段落）
//          → 種類別リファレンス数16種分・合計（対応／参照専用）・テンプレート総数・
//            用語集総数・新種（擬似言語）のテンプレート数と段階別内訳・用語数・
//            照合個票 reference-r2.json／reference-r6.json の行数（JSON 実測）。
//  [PRG-1] PROGRESS.md 全体目標の「対象は **全N種類**」→ definitions.length。
//  [PRG-2] PROGRESS.md 現在の状態表の cmd 行・PowerShell 行の「T教材／R参照」
//          → 各種類のテンプレート数／リファレンス数（PowerShell 行は R30-N37）。
//  [PRG-3] PROGRESS.md 現在の状態表の IPA擬似言語行の「R参照／T教材／G用語」
//          → 擬似言語の各実測。「独立検証全N回」（R30-N38）→ MUSE-ADD-PSEUDO.md に
//            記録された独立検証の実施回数（第1回〜第N回の記録数。定義件数からは
//            導けないため、同じツリーの監査記録を正本として照合する）。
//  [PRG-4] PROGRESS.md 第16種追加の節目 bullet のリファレンス総数（対応／参照専用・
//          pseudo 件数）・照合個票行数・テンプレート数・用語集数 → 各実測。
//          あわせて同 bullet の「第N回で新規問題なしを確認した」の N が [PRG-3] の
//          実施回数と一致すること（文書内部の整合）。
//  [PRG-5] PROGRESS.md 最後の「現在の状態（…時点）」bullet の
//          全N種類・T教材・Rリファレンス（対応／参照専用）・用語集G件 → 各実測。
//  [REQ-1] REQUIREMENTS.md 冒頭の「全N種類へ適用する」と R6 節冒頭の
//          「上の37項目は全N種類に適用する」（R30-N39）→ definitions.length。
//          あわせて同ファイルに「全15種類」の現在形主張が残っていないこと。
//  [REQ-2] REQUIREMENTS.md R6 節の現在値段落「現在はTテンプレート／Rリファレンス
//          （対応S・参照専用U）…IPA擬似言語のP件」→ 各実測。
//          （R6 節の種類別表そのものは tests/muse-fix-batch4-docs.test.js の
//          R25-N17 が照合済みのため、ここでは重複させない。）
//
// 対象外（意図的に照合しないものと、その理由）：
//  - 時点明示つきの履歴値：DEVELOPMENT.md のバッチ2〜8の連鎖段落や
//    PROGRESS.md の「現在の状態（修正バッチ8 時点）」bullet は、当時の値として
//    明示された履歴であり現在形主張ではない。現在形は各文書の最終段落／
//    最終 bullet（[DEV-4]／[PRG-5]）だけを正本として照合する。
//  - テスト総数（PROGRESS.md の「テスト3,937件」等）：テスト追加のたびに変わり、
//    バッチ自体の結果記録は統合側の担当であるため、本テストでは固定しない。
//  - 台帳の累計件数・グループ数：種類定義からは導けないため対象外。
//  - REQUIREMENTS.md R6 節の「15種類×4画面×2幅＝120配置、全104テンプレート」：
//    R6 実施時点（15種・104教材）の実績記録であり現在形主張ではないため対象外。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { definitions } from "../js/types/registry.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const num = (s) => Number(String(s).replace(/,/g, ""));

// ---- 実測（正本：種類定義） ----
const kinds = definitions.length;
const perKind = new Map(
  definitions.map((d) => [
    d.id,
    {
      refs: d.reference.length,
      supported: d.reference.filter((r) => r.supported === true).length,
      refOnly: d.reference.filter((r) => r.supported === false).length,
      templates: d.templates.length,
      glossary: (d.glossary || []).length,
      levels: d.templates.reduce((acc, t) => {
        acc[t.level] = (acc[t.level] || 0) + 1;
        return acc;
      }, {}),
    },
  ]),
);
const total = (key) => [...perKind.values()].reduce((a, v) => a + v[key], 0);
const REF_TOTAL = total("refs");
const SUPPORTED = total("supported");
const REF_ONLY = total("refOnly");
const TPL_TOTAL = total("templates");
const GLOSS_TOTAL = total("glossary");

const dev = read("../docs/DEVELOPMENT.md");
const prog = read("../PROGRESS.md");
const req = read("../docs/audit/REQUIREMENTS.md");

// 実測値そのものの健全性（照合の前提。種類定義側が壊れた場合にここで気付く）。
test("batch9-docs measured baseline: 16 kinds, every reference is supported or reference-only", () => {
  assert.equal(kinds, 16);
  for (const d of definitions) {
    const p = perKind.get(d.id);
    assert.equal(p.supported + p.refOnly, p.refs, `${d.id}: supported の値が true/false 以外`);
  }
  assert.equal(SUPPORTED + REF_ONLY, REF_TOTAL);
});

// ---------- [DEV-1] 共通基盤 ----------
test("batch9-docs DEV-1: DEVELOPMENT.md common-base kind/template counts match definitions", () => {
  const head = dev.split("## 種類ごとの対応範囲と制限")[0];
  assert.ok(head.length < dev.length, "共通基盤節の切り出しに失敗");
  const k = head.match(/(\d+)種類を `定義データ/);
  assert.ok(k, "共通基盤の「N種類を 定義データ」が見つからない");
  assert.equal(num(k[1]), kinds);
  const t = head.match(/([\d,]+)テンプレート/);
  assert.ok(t, "共通基盤の「Nテンプレート」が見つからない");
  assert.equal(num(t[1]), TPL_TOTAL);
});

// ---------- [DEV-2] R30-N36（旧 L55） ----------
test("batch9-docs DEV-2 (R30-N36): DEVELOPMENT.md 現行 supported count in the runnable-examples sentence", () => {
  const all = [...dev.matchAll(/現行([\d,]+)件の対応項目の使用例はテストで全件実行される/g)];
  assert.equal(all.length, 1, "対象文はちょうど1箇所であること（複製・欠落の検出）");
  assert.equal(num(all[0][1]), SUPPORTED, "現行の対応件数が実測と一致しない");
});

// ---------- [DEV-3] R30-N36（旧 L71） ----------
test("batch9-docs DEV-3 (R30-N36): DEVELOPMENT.md 現行 supported/reference-only counts", () => {
  const all = [...dev.matchAll(/現行は対応([\d,]+)件／参照専用([\d,]+)件/g)];
  assert.equal(all.length, 1, "対象文はちょうど1箇所であること");
  assert.equal(num(all[0][1]), SUPPORTED);
  assert.equal(num(all[0][2]), REF_ONLY);
});

// ---------- [DEV-4] 最終の現在値段落 ----------
test("batch9-docs DEV-4: DEVELOPMENT.md final counts paragraph matches per-kind measurements", () => {
  const idx = dev.lastIndexOf("現在の件数は次のとおり");
  assert.ok(idx >= 0, "最終の現在値段落が見つからない");
  const para = dev.slice(idx, dev.indexOf("\n\n", idx) < 0 ? undefined : dev.indexOf("\n\n", idx));
  const nameToId = {
    "Excel VBA": "vba",
    ImageJ: "imagej",
    CloudFormation: "cloudformation",
    "Power Automate": "powerautomate",
    AutoHotkey: "autohotkey",
    "UI.Vision": "uivision",
    "Power Apps": "powerapps",
    Python: "python",
    R: "r",
    C: "c",
    "C++": "cpp",
    "C#": "csharp",
    JavaScript: "javascript",
    cmd: "cmd",
    PowerShell: "powershell",
    "IPA擬似言語": "pseudo",
  };
  let listed = 0;
  for (const [name, id] of Object.entries(nameToId)) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = para.match(new RegExp(`${esc} ([\\d,]+)`));
    assert.ok(m, `最終段落に ${name} の件数がない`);
    assert.equal(num(m[1]), perKind.get(id).refs, `${name} の件数が実測と一致しない`);
    listed++;
  }
  assert.equal(listed, kinds);
  const sum = para.match(/合計 \*\*([\d,]+)件（対応([\d,]+)／参照専用([\d,]+)）\*\*/);
  assert.ok(sum, "最終段落の合計が見つからない");
  assert.equal(num(sum[1]), REF_TOTAL);
  assert.equal(num(sum[2]), SUPPORTED);
  assert.equal(num(sum[3]), REF_ONLY);
  const tpl = para.match(/テンプレートは全([\d,]+)件（新種([\d,]+)件：基礎(\d+)・実践(\d+)・応用(\d+)）/);
  assert.ok(tpl, "最終段落のテンプレート記述が見つからない");
  const pseudo = perKind.get("pseudo");
  assert.equal(num(tpl[1]), TPL_TOTAL);
  assert.equal(num(tpl[2]), pseudo.templates);
  assert.equal(num(tpl[3]), pseudo.levels["基礎"] || 0);
  assert.equal(num(tpl[4]), pseudo.levels["実践"] || 0);
  assert.equal(num(tpl[5]), pseudo.levels["応用"] || 0);
  const glo = para.match(/用語集は全([\d,]+)件（新種([\d,]+)語）/);
  assert.ok(glo, "最終段落の用語集記述が見つからない");
  assert.equal(num(glo[1]), GLOSS_TOTAL);
  assert.equal(num(glo[2]), pseudo.glossary);
  const rows = para.match(/reference-r2\.json` ([\d,]+)行／`docs\/audit\/reference-r6\.json` ([\d,]+)行/);
  assert.ok(rows, "最終段落の照合個票行数が見つからない");
  assert.equal(num(rows[1]), JSON.parse(read("../docs/audit/reference-r2.json")).length, "r2 行数");
  assert.equal(num(rows[2]), JSON.parse(read("../docs/audit/reference-r6.json")).length, "r6 行数");
});

// ---------- [PRG-1] 全体目標 ----------
test("batch9-docs PRG-1: PROGRESS.md goal states the measured kind count", () => {
  const m = prog.match(/対象は \*\*全(\d+)種類\*\*/);
  assert.ok(m, "全体目標の「全N種類」が見つからない");
  assert.equal(num(m[1]), kinds);
});

// ---------- [PRG-2] 状態表 cmd／PowerShell 行 ----------
test("batch9-docs PRG-2 (R30-N37): PROGRESS.md state-table cmd/PowerShell rows match measurements", () => {
  const cases = [
    ["コマンドプロンプト", "cmd"],
    ["PowerShell", "powershell"],
  ];
  for (const [label, id] of cases) {
    const line = prog.split("\n").find((l) => l.startsWith(`| ${label} |`));
    assert.ok(line, `状態表に ${label} 行がない`);
    const m = line.match(/(\d+)教材／(\d+)参照/);
    assert.ok(m, `${label} 行に「T教材／R参照」がない`);
    assert.equal(num(m[1]), perKind.get(id).templates, `${label} の教材数`);
    assert.equal(num(m[2]), perKind.get(id).refs, `${label} の参照（リファレンス）数`);
  }
});

// ---------- [PRG-3] 状態表 擬似言語行＋独立検証回数 ----------
const pseudoAudit = read("../docs/audit/MUSE-ADD-PSEUDO.md");
const verificationRounds = (() => {
  const found = [...pseudoAudit.matchAll(/独立検証（第(\d+)回/g)].map((m) => Number(m[1]));
  assert.ok(found.length > 0, "MUSE-ADD-PSEUDO.md に独立検証の記録がない");
  return Math.max(...found);
})();

test("batch9-docs PRG-3 (R30-N38): PROGRESS.md pseudo row counts and verification rounds match records", () => {
  // 実施回数の正本：MUSE-ADD-PSEUDO.md の「独立検証（第N回…）」記録（第1回〜第5回）。
  const distinct = new Set([...pseudoAudit.matchAll(/独立検証（第(\d+)回/g)].map((m) => Number(m[1])));
  assert.equal(distinct.size, verificationRounds, "独立検証の回記録が連続していない");
  const line = prog.split("\n").find((l) => l.startsWith("| IPA擬似言語 |"));
  assert.ok(line, "状態表に IPA擬似言語 行がない");
  const m = line.match(/(\d+)参照／(\d+)教材／(\d+)用語/);
  assert.ok(m, "擬似言語行に「R参照／T教材／G用語」がない");
  const pseudo = perKind.get("pseudo");
  assert.equal(num(m[1]), pseudo.refs);
  assert.equal(num(m[2]), pseudo.templates);
  assert.equal(num(m[3]), pseudo.glossary);
  const v = line.match(/独立検証全(\d+)回/);
  assert.ok(v, "擬似言語行に「独立検証全N回」がない");
  assert.equal(num(v[1]), verificationRounds, "独立検証の回数が監査記録の実態と一致しない");
});

// ---------- [PRG-4] 第16種追加 bullet ----------
test("batch9-docs PRG-4: PROGRESS.md pseudo-addition bullet totals match measurements", () => {
  const line = prog.split("\n").find((l) => l.includes("第16種追加（MUSE-ADD-PSEUDO"));
  assert.ok(line, "第16種追加の bullet が見つからない");
  const t = line.match(/リファレンスは \*\*([\d,]+)件（対応([\d,]+)／参照専用([\d,]+)）\*\*（pseudo ([\d,]+)件）/);
  assert.ok(t, "bullet のリファレンス総数が見つからない");
  assert.equal(num(t[1]), REF_TOTAL);
  assert.equal(num(t[2]), SUPPORTED);
  assert.equal(num(t[3]), REF_ONLY);
  assert.equal(num(t[4]), perKind.get("pseudo").refs);
  const rows = line.match(/r2 ([\d,]+)行／r6 ([\d,]+)行/);
  assert.ok(rows, "bullet の照合個票行数が見つからない");
  assert.equal(num(rows[1]), JSON.parse(read("../docs/audit/reference-r2.json")).length);
  assert.equal(num(rows[2]), JSON.parse(read("../docs/audit/reference-r6.json")).length);
  const tg = line.match(/テンプレートは([\d,]+)件、用語集は([\d,]+)件/);
  assert.ok(tg, "bullet のテンプレート／用語集数が見つからない");
  assert.equal(num(tg[1]), TPL_TOTAL);
  assert.equal(num(tg[2]), GLOSS_TOTAL);
  const fin = line.match(/第(\d+)回で新規問題なしを確認した/);
  assert.ok(fin, "bullet の最終検証回の記述が見つからない");
  assert.equal(num(fin[1]), verificationRounds, "状態表の回数と節目記述が矛盾する");
});

// ---------- [PRG-5] 最後の現在の状態 bullet ----------
test("batch9-docs PRG-5: PROGRESS.md latest current-state bullet matches measurements", () => {
  const lines = prog.split("\n").filter((l) => l.includes("現在の状態（"));
  assert.ok(lines.length >= 2, "現在の状態 bullet が想定より少ない");
  const last = lines[lines.length - 1];
  assert.ok(last.includes("修正バッチ13"), "最後の現在の状態 bullet は修正バッチ13時点のもののはず");
  const m = last.match(/全(\d+)種類、([\d,]+)教材、([\d,]+)リファレンス（対応([\d,]+)／参照専用([\d,]+)）、用語集([\d,]+)件/);
  assert.ok(m, "最後の現在の状態 bullet の数値列が見つからない");
  assert.equal(num(m[1]), kinds);
  assert.equal(num(m[2]), TPL_TOTAL);
  assert.equal(num(m[3]), REF_TOTAL);
  assert.equal(num(m[4]), SUPPORTED);
  assert.equal(num(m[5]), REF_ONLY);
  assert.equal(num(m[6]), GLOSS_TOTAL);
  // テスト総数は対象外（ファイル冒頭コメント参照：統合側の結果記録の担当）。
});

// ---------- [REQ-1] R30-N39 適用範囲 ----------
test("batch9-docs REQ-1 (R30-N39): REQUIREMENTS.md applicability declarations state the measured kind count", () => {
  const intro = req.match(/全(\d+)種類へ適用する/);
  assert.ok(intro, "冒頭の適用範囲宣言が見つからない");
  assert.equal(num(intro[1]), kinds);
  const r6 = req.split("## 新種類追加 R6の適用")[1];
  assert.ok(r6, "R6 節が見つからない");
  const head = r6.match(/上の37項目は全(\d+)種類に適用する/);
  assert.ok(head, "R6 節冒頭の適用範囲文が見つからない");
  assert.equal(num(head[1]), kinds);
  assert.ok(!req.includes("全15種類"), "「全15種類」の現在形主張が残っている");
});

// ---------- [REQ-2] R6 節の現在値段落 ----------
test("batch9-docs REQ-2: REQUIREMENTS.md R6 current-values paragraph matches measurements", () => {
  const r6 = req.split("## 新種類追加 R6の適用")[1];
  const m = r6.match(/現在は([\d,]+)テンプレート／([\d,]+)リファレンス（対応([\d,]+)・参照専用([\d,]+)/);
  assert.ok(m, "R6 節の現在値段落が見つからない");
  assert.equal(num(m[1]), TPL_TOTAL);
  assert.equal(num(m[2]), REF_TOTAL);
  assert.equal(num(m[3]), SUPPORTED);
  assert.equal(num(m[4]), REF_ONLY);
  const p = r6.match(/IPA擬似言語の([\d,]+)件/);
  assert.ok(p, "R6 節現在値段落の擬似言語件数が見つからない");
  assert.equal(num(p[1]), perKind.get("pseudo").refs);
  // 末尾段落の第16種適用明記との整合（R30-N39 の矛盾解消の固定）。
  assert.match(r6, /上の37項目と R6 の考え方は新種にも適用する/);
});
