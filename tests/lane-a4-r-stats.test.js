import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { referenceAdvanced as refP3 } from "../js/types/r/reference-advanced-part3.js";
import { referenceAdvanced as refP4 } from "../js/types/r/reference-advanced-part4.js";
import { referenceAdvanced as refP5 } from "../js/types/r/reference-advanced-part5.js";
import { referenceAdvanced as refP6 } from "../js/types/r/reference-advanced-part6.js";
import { referenceAdvanced as refP7 } from "../js/types/r/reference-advanced-part7.js";
import { referenceAdvanced as refP8 } from "../js/types/r/reference-advanced-part8.js";
import { referenceAdvanced as refP9 } from "../js/types/r/reference-advanced-part9.js";
import { referenceAdvanced as refP10 } from "../js/types/r/reference-advanced-part10.js";

// 高度A4班 R統計（stats／utils）チームの独立監査回帰テスト。
// 期待値は実 R 4.3.3（Rscript）の実測で固定した（B4S の照合とは独立に採取）。
// 対象：台帳 RG-633 の開示裁定、C-12 宣言↔挙動マトリクス、独立差分プローブの代表値。

const B4S = [...refP3, ...refP4, ...refP5, ...refP6, ...refP7, ...refP8, ...refP9, ...refP10];
const byName = new Map(B4S.map((r) => [r.name, r]));
const MARKER = "【未対応の理由】";

const run = async (code) => {
  const d = getDefinition("r");
  return d.simulate(code, structuredClone(d.model.defaults));
};
const first = async (code) => {
  const r = await run(code);
  assert.equal(r.error, undefined, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1, JSON.stringify(r).slice(0, 300));
  assert.equal(r.paths[0].error, undefined, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};
const errOf = async (code) => {
  const r = await run(code);
  return [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
};
const errMatch = async (code, re) => {
  const errs = await errOf(code);
  assert.ok(errs.some((e) => re.test(e.message)), code + " -> " + JSON.stringify(errs));
};
const outputs = (p) => p.outputs.map((o) => o.text);
const outIs = async (code, expected) => {
  const p = await first(code);
  assert.deepEqual(outputs(p), expected, code);
};

// ---------- RG-633: 未対応の名指し停止 ----------
test("RG-633 tukey/smirnov/bw: named stop, no fabricated values", async () => {
  for (const [code, name] of [
    ["print(ptukey(3, 5, 10))", /ptukey/],
    ["print(qtukey(0.95, 5, 10))", /qtukey/],
    ["print(psmirnov(0.3, c(10, 12)))", /psmirnov/],
    ["print(qsmirnov(0.95, c(10, 12)))", /qsmirnov/],
    ["print(bw.ucv(c(1, 2, 3, 4, 5, 7, 9)))", /bw\.ucv/],
    ["print(bw.bcv(c(1, 2, 3, 4, 5, 7, 9)))", /bw\.bcv/],
    ["print(bw.SJ(c(1, 2, 3, 4, 5, 7, 9)))", /bw\.SJ/],
  ]) {
    await errMatch(code, name);
    const r = await run(code);
    assert.deepEqual(r.paths[0].outputs, [], code + " must not output a value");
  }
  for (const n of ["ptukey", "qtukey", "psmirnov", "qsmirnov", "bw.ucv", "bw.bcv", "bw.SJ"])
    assert.equal(byName.get(n).status, "unsupported", n);
});

// ---------- RG-633: runmed の NA 開示範囲 ----------
test("RG-633 runmed: NA scope matches disclosure", async () => {
  await outIs("print(runmed(c(5, 1, 4, 2, 3), 3))", ["c(5, 4, 2, 3, 3)"]);
  // na.action = "fail" は実 R 4.3.3 の文言どおり停止（実測）
  await errMatch(
    "print(runmed(c(1, NA, 3, 2, 5), 3, na.action=\"fail\"))",
    /runmed\(x, \.\., na\.action="na\.fail"\): have NAs starting at x\[2\]/,
  );
  await errMatch(
    "print(runmed(c(1, NaN, 3, 2, 5), 3, na.action=\"fail\"))",
    /have NAs starting at x\[2\]/,
  );
  // それ以外の na.action では誤った平滑値を返さず名指しで停止する
  for (const na of ["+Big_alternate", "-Big_alternate", "na.omit"])
    await errMatch(
      `print(runmed(c(1, NA, 3, 2, 5), 3, na.action="${na}"))`,
      /runmed の NA を含む入力/,
    );
  await errMatch("print(runmed(c(1, NA, 3, 2, 5), 3))", /runmed の NA を含む入力/);
  assert.ok(byName.get("runmed").caution.includes("名指しで停止します"));
});

// ---------- RG-633: .nknots.smspl はパーサ到達不能の開示どおり ----------
test("RG-633 .nknots.smspl: parser stop, not a false undefined-name error", async () => {
  assert.equal(byName.get(".nknots.smspl").status, "unsupported");
  assert.ok(byName.get(".nknots.smspl").description.includes("到達できない"));
  const r = await run(".nknots.smspl(100)");
  const errs = [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
  assert.ok(errs.length > 0, "must stop");
  assert.ok(!errs.some((e) => /未定義/.test(e.message)), JSON.stringify(errs));
});

// ---------- RG-633: 規模ガード（境界の内外） ----------
test("RG-633 signrank/wilcox scale guards", async () => {
  // ガード内は実 R 4.3.3 の値と一致
  await outIs("print(dsignrank(7, 5))", ["c(0.09374999999999999)"]);
  // n=400 の DP 構築は低速環境ではエンジンの時間上限（1200ms）に当たる
  // 場合があるため、まず1回温めてキャッシュを作ってから値を照合する
  // （所見 §5 の性能残存。キャッシュ後は高速に正確な値が返る）。
  await run("print(psignrank(100, 400))");
  await outIs("print(psignrank(100, 400))", ["c(2.0416982278670705e-114)"]);
  await outIs("print(qsignrank(0.5, 400))", ["c(40100)"]);
  await outIs("print(dwilcox(12, 4, 6))", ["c(0.08571428571428569)"]);
  // ガード外は名指し停止（dsignrank 系 n>400、dwilcox 系 DP セル数 >3e7 は m=n=105 で超過）
  await errMatch("print(dsignrank(100, 401))", /dsignrank 系は n が 400 以下/);
  await errMatch("print(psignrank(100, 401))", /dsignrank 系は n が 400 以下/);
  await errMatch("print(qsignrank(0.5, 401))", /dsignrank 系は n が 400 以下/);
  await errMatch("print(dwilcox(500, 105, 105))", /dwilcox 系は m, n が大きすぎるため/);
  await errMatch("print(pwilcox(500, 105, 105))", /dwilcox 系は m, n が大きすぎるため/);
  await errMatch("print(qwilcox(0.5, 105, 105))", /dwilcox 系は m, n が大きすぎるため/);
});

// ---------- RG-633: birthday の実 R 不具合を再現しない逸脱の開示 ----------
test("RG-633 birthday deviations are disclosed and sane", async () => {
  await outIs("print(pbirthday(23))", ["0.5072972343239854"]);
  await outIs("print(qbirthday())", ["23"]);
  await outIs("print(qbirthday(coincident=10))", ["1179"]);
  // 実 R は coincident < 2 で無限ループ（timeout 実測）。アプリは開示どおり 1 を返す
  await outIs("print(qbirthday(coincident=1))", ["1"]);
  assert.ok(byName.get("qbirthday").caution.includes("無限ループ"));
  // classes ベクトル: 実 R は警告後にゴミ値 -2079246038392.4644 を返す（実測）。
  // アプリは警告して先頭要素で計算した正しい値を返し、caution で開示する。
  const p = await first("print(pbirthday(23, classes=c(365, 100)))");
  assert.deepEqual(outputs(p), ["0.5072972343239854"]);
  assert.ok(p.trace.some((t) => t.kind === "warning" && /only the first used/.test(t.text)));
  assert.ok(byName.get("pbirthday").caution.includes("ゴミ値"));
});

// ---------- RG-633: p.adjust の n 引数（未実測だった文言を実 R 4.3.3 実測で裁定・修正） ----------
test("RG-633 p.adjust n argument wording matches real R", async () => {
  await errMatch("print(p.adjust(c(0.01, 0.04), n=NA))", /^n >= lp is not TRUE$/);
  await errMatch("print(p.adjust(c(0.01, 0.04), n=NaN))", /^n >= lp is not TRUE$/);
  await errMatch("print(p.adjust(c(0.01, 0.04), n=c(2, 3)))", /^the condition has length > 1$/);
  await errMatch("print(p.adjust(c(0.01, 0.04), n=NULL))", /^argument is of length zero$/);
  await errMatch("print(p.adjust(c(0.01, 0.04), n=1))", /^n >= lp is not TRUE$/);
  await errMatch("print(p.adjust(c(0.01, 0.04), n=TRUE))", /^n >= lp is not TRUE$/);
  // 文字列 n は as.numeric 変換されず、字句順の stopifnot を通過すると算術で停止する
  await errMatch("print(p.adjust(c(0.01, 0.04), n=\"a\"))", /^non-numeric argument to binary operator$/);
  await errMatch("print(p.adjust(c(0.01, 0.04), n=\"3\"))", /^non-numeric argument to binary operator$/);
  await errMatch("print(p.adjust(c(0.01, 0.04), n=\"0\"))", /^n >= lp is not TRUE$/);
  // method = "none" では算術が走らないため文字列 n でもそのまま返る（実 R 実測）
  await outIs("print(p.adjust(c(0.01, 0.04), n=\"a\", method=\"none\"))", ["c(0.01, 0.04)"]);
  await outIs("print(p.adjust(c(0.01, 0.04), n=3))", ["c(0.03, 0.08)"]);
});

// ---------- RG-633: formatUL/formatOL の近似開示 ----------
test("RG-633 formatUL/formatOL approximation is disclosed in caution", () => {
  assert.ok(byName.get("formatUL").caution.includes("formatRNum"));
  assert.ok(byName.get("formatUL").caution.includes("実 R と整形が異なることがあります"));
  assert.ok(byName.get("formatOL").caution.includes("formatRNum"));
  assert.ok(byName.get("formatOL").caution.includes("実 R と整形が異なることがあります"));
});

// ---------- RG-633: rWishart の example 開示 ----------
test("RG-633 rWishart example form and validation", async () => {
  assert.ok(byName.get("rWishart").caution.includes("diag(2)"));
  const p = await first("print(rWishart(2, 5, c(1, 0, 0, 1)))");
  assert.deepEqual(outputs(p), ["（実行時に決まる値）"]);
  // df が次元未満: 実 R（行列 Sigma）と同じ文言で停止する
  await errMatch("print(rWishart(2, 1, c(1, 0, 0, 1)))", /^inconsistent degrees of freedom and dimension$/);
});

// ---------- 追加指示: 未対応理由マーカーの形式統一（part3〜part10 全件） ----------
test("marker unification: every unsupported item in part3-10 uses the marker form", () => {
  const bad = B4S.filter((r) => r.status === "unsupported" && !r.description.includes(MARKER));
  assert.deepEqual(bad.map((r) => r.name), []);
});

// ---------- C-12: 宣言↔挙動マトリクス ----------
test("C-12 supported examples all execute (129)", async () => {
  const sup = B4S.filter((r) => r.status === "supported");
  assert.equal(sup.length, 129);
  for (const r of sup) {
    const res = await run(r.example);
    const errs = [res.error, ...(res.paths || []).map((p) => p.error)].filter(Boolean);
    assert.deepEqual(errs, [], `${r.name}: ${r.example} -> ${JSON.stringify(errs)}`);
  }
});

test("C-12 unsupported direct calls all stop (787)", async () => {
  const uns = B4S.filter((r) => r.status === "unsupported");
  assert.equal(uns.length, 787);
  let named = 0, parserStop = 0, notCallable = 0;
  for (const r of uns) {
    if (!/^[A-Za-z_.][A-Za-z0-9._]*$/.test(r.name)) { notCallable++; continue; }
    const res = await run(`${r.name}()`);
    const errs = [res.error, ...(res.paths || []).map((p) => p.error)].filter(Boolean);
    assert.ok(errs.length > 0, `${r.name} must stop`);
    const outs = (res.paths || []).flatMap((p) => p.outputs || []);
    assert.deepEqual(outs, [], `${r.name} must not output a value`);
    if (errs.some((e) => String(e.message).includes(r.name))) named++;
    else if (errs.some((e) => String(e.message).includes("式を解釈できません"))) parserStop++;
    else assert.fail(`${r.name}: stop without name or parser reason: ${JSON.stringify(errs)}`);
  }
  assert.equal(named, 759);
  assert.equal(parserStop, 12);
  assert.equal(notCallable, 16);
});

// ---------- 独立差分プローブの代表値（実 R 4.3.3 実測） ----------
test("independent probes: quantile types / var / sd (R23, R26)", async () => {
  await outIs("print(sd(c(1, 2, 3)))", ["1"]);
  await outIs("print(sd(5))", ["NA"]);
  await outIs("print(var(c(1, 2, 3)))", ["1"]);
  await outIs("print(quantile(c(1, 2, 3, 4), 0.25))", ["c(25% = 1.75)"]);
  await outIs("print(quantile(1:10, 0.25, type=1))", ["c(25% = 3)"]);
  await outIs("print(quantile(1:10, 0.25, type=3))", ["c(25% = 2)"]);
  await outIs("print(quantile(1:10, 0.25, type=9))", ["c(25% = 2.9375)"]);
});

test("independent probes: head/tail (R27), diffinv, convolve, combn, mahalanobis", async () => {
  await outIs("print(head(1:10))", ["c(1, 2, 3, 4, 5, 6)"]);
  await outIs("print(tail(1:10))", ["c(5, 6, 7, 8, 9, 10)"]);
  await outIs("print(head(1:10, -8))", ["c(1, 2)"]);
  await outIs("print(tail(1:10, -8))", ["c(9, 10)"]);
  await outIs("print(diffinv(c(1, 2, 3)))", ["c(0, 1, 3, 6)"]);
  await outIs("print(convolve(c(1, 2, 3), c(1, 2), type=\"open\"))", ["c(2, 5, 8, 3)"]);
  await outIs("print(combn(1:4, 2, FUN=\"sum\"))", ["c(3, 4, 5, 5, 6, 7)"]);
  await outIs(
    "print(mahalanobis(c(0, 0), c(1, 2), data.frame(a = c(1, 0), b = c(0, 1))))",
    ["c(5)"],
  );
  // combn の FUN = NULL は行列になるため開示どおり名指しで停止する
  await errMatch("print(combn(1:4, 2))", /combn: FUN = NULL/);
  // setNames の不足分は NA 埋め（F6 の同根確認）。値レベルで照合する：
  // 名前付き print 表示では基礎層 index.js 起因の RG-634 artifact
  // （NA 名が [object Object] と表示される）が残るため、names の NA 判定で見る。
  await outIs("print(is.na(names(setNames(1:3, c(\"foo\", \"bar\")))))", ["c(FALSE, FALSE, TRUE)"]);
  await outIs("print(setNames(1:3, c(\"foo\", \"bar\", \"baz\")))", ["c(foo = 1, bar = 2, baz = 3)"]);
});
