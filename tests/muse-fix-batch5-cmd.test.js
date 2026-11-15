// バッチ5（コア班・cmd）修正の回帰テスト。
// 対象：R26-N22（set /a の単独 % を剰余演算子として扱い、内部プレース
// ホルダ __CMD_VALUE_n__ が学習者向け文言へ漏れる経路を塞ぐ）／
// R26-N23（未定義変数の %名前% 展開を実 cmd どおりリテラル保持にする）。
// 一次情報：SS64 の set / echo / 環境変数展開の規則と実 cmd の挙動
// （未定義変数は展開されずに残る。定義済み空文字と未定義は区別される）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { definition as d } from "../js/types/cmd/index.js";

const run = (code, extra = {}, limits) =>
  d.simulate(code, { ...structuredClone(d.model.defaults), ...extra }, limits);
const errors = (r) =>
  [r.error, ...r.paths.map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const out = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
// 学習者向け表面（エラー・出力・トレース文）だけを走査する。内部状態の
// slots 台帳にキー名として残るのは表示ではないため対象にしない。
const learnerText = (r) => JSON.stringify([
  errors(r),
  out(r),
  (r.paths || []).flatMap((p) => (p.trace || []).map((t) => t.text)),
]);

// ---------- R26-N22：set /a の % は剰余 ----------
test("R26-N22: set /a x=5%0 is a divide-by-zero, with no placeholder in the message", () => {
  for (const code of ["set /a x=5%0", 'set /a "x=5%0"', "set /a x=5%%0"]) {
    const r = run(code);
    assert.ok(errors(r).some((e) => e.includes("set /a の0除算です")), code + " -> " + JSON.stringify(errors(r)));
    assert.ok(!learnerText(r).includes("__CMD_VALUE_"), code);
  }
});
test("R26-N22: set /a modulo with a bare % computes", () => {
  const r = run("set /a x=7%3\necho %x%");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["1"]]);
});
test("R26-N22: set /a still expands defined variables and dynamic values honestly", () => {
  const r = run("set /a y=3\nset /a x=%y%+1\necho %x%");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["4"]]);
  const u = run("set /a x=%RANDOM%");
  assert.ok(errors(u).some((e) => e.startsWith("未確認:")), JSON.stringify(errors(u)));
  assert.ok(!learnerText(u).includes("__CMD_VALUE_"), JSON.stringify(errors(u)));
});

// ---------- R26-N23：未定義変数はリテラル保持 ----------
test("R26-N23: echo %undefined% prints the literal, not the bare-echo status", () => {
  const r = run("echo %undefined%");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["%undefined%"]]);
  const bare = run("echo");
  assert.deepEqual(out(bare), [["ECHO は OFF です。"]]);
});
test("R26-N23: undefined names stay literal inside text, set and if comparisons", () => {
  const r = run("echo a%missing%b");
  assert.deepEqual(out(r), [["a%missing%b"]]);
  const s = run("set z=%undefined%\necho %z%");
  assert.deepEqual(out(s), [["%undefined%"]]);
  const i1 = run('if "%undefined%"=="%undefined%" echo match');
  assert.deepEqual(out(i1), [["match"]]);
  const i2 = run('if "%undefined%"=="x" echo match');
  assert.deepEqual(out(i2), [[]]);
});
test("R26-N23: defined-but-empty and dynamic variables still expand", () => {
  // set X= は削除（未定義化）なので、定義済み空は代入では作れない。
  // モデルの初期変数に空文字がある場合の区別は delayed 側ではなく
  // percent 側の定義判定で担保する：削除後は未定義としてリテラルが残る。
  const del = run("set x=hi\nset x=\necho [%x%]");
  assert.deepEqual(out(del), [["[%x%]"]]);
  const dyn = run("echo %ERRORLEVEL%");
  assert.deepEqual(out(dyn), [["0"]]);
  const cd = run("echo %CD%");
  assert.deepEqual(errors(cd), []);
  assert.ok(out(cd)[0][0].length > 0);
});
test("R26-N23: delayed expansion keeps its own rule (undefined -> empty)", () => {
  const r = run("setlocal EnableDelayedExpansion\nset x=hi\necho !x!");
  assert.deepEqual(errors(r), []);
  assert.deepEqual(out(r), [["hi"]]);
});
