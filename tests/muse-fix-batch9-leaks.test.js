import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ9（leaks班）R30-N33／R30-N34：エンジンが合成した変数の露出。
//
// N33（CloudFormation）: ハンドラ実行のためにエンジンが学習者のソース
// 末尾へ合成する「__macro_response = handler(event, None)」の代入
// ナレーションがトレースに残っていた。識別は名前パターンではなく出所
// （合成行＝学習者の行数を超える行番号＋代入先が合成変数そのもの）に
// 基づく。学習者が自分の行で書いた同名・類似名変数のステップは残す。
//
// N34（Power Apps）: Switch の比較用一時変数 __switch_<行> が最終状態
// vars に残っていた。合成代入ノード（internalSwitch）を出所として、
// 値を学習者の変数空間とは別の内部ストアで保持し、最終状態へ出さない。
// 学習者が自分で書いた __switch_N 同名変数は vars に残る。

const cf = getDefinition("cloudformation");
const pa = getDefinition("powerapps");
const cfRun = async (code, model) =>
  cf.simulate(code, model ?? structuredClone(cf.model.defaults));
const paRun = async (code, model) =>
  pa.simulate(code, model ?? structuredClone(pa.model.defaults));
const SYNTH_ASSIGN = "「__macro_response」に";

/* ---------------- N33: CloudFormation ---------------- */

test("R30-N33 all 6 templates expose no synthetic __macro_response assignment in trace or vars", async () => {
  assert.equal(cf.templates.length, 6);
  for (const t of cf.templates) {
    const r = await cfRun(t.code, t.model ?? structuredClone(cf.model.defaults));
    assert.ok(!r.error, `${t.id}: ${JSON.stringify(r.error)}`);
    assert.ok(r.paths.length >= 1, t.id);
    for (const p of r.paths) {
      for (const tr of p.trace || [])
        assert.ok(
          !tr.text.includes(SYNTH_ASSIGN),
          `${t.id}: trace leaks synthetic assignment: ${tr.text}`,
        );
      assert.ok(
        !Object.hasOwn(p.vars || {}, "__macro_response"),
        `${t.id}: final vars leak __macro_response`,
      );
    }
  }
});

test("R30-N33 handler-mode code exposes no synthetic assignment, handler narration remains", async () => {
  const code = `def handler(event, context):
    fragment = event["fragment"]
    fragment["Metadata"] = {"Stage": "test"}
    return {"requestId": event["requestId"], "status": "success", "fragment": fragment}`;
  const r = await cfRun(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  const trace = r.paths[0].trace;
  assert.ok(!trace.some((t) => t.text.includes(SYNTH_ASSIGN)));
  // ハンドラ呼び出し・返却のナレーション自体は消えていないこと
  assert.ok(trace.some((t) => t.text.includes("関数「handler」を呼び出します")));
  assert.ok(trace.some((t) => t.text.includes("を返します")));
  assert.ok(!Object.hasOwn(r.paths[0].vars, "__macro_response"));
});

test("R30-N33 learner-written __ variables (incl. the same name, on learner lines) stay in trace", async () => {
  const code = `def handler(event, context):
    __macro_response = 999
    __macro_custom = 42
    __mine = 7
    return {"requestId": event["requestId"], "status": "success", "fragment": event["fragment"]}`;
  const r = await cfRun(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  const texts = r.paths[0].trace.map((t) => t.text);
  // 学習者の行（2〜4行目）で書かれた代入はすべて残る
  assert.ok(texts.some((t) => t.includes("「__macro_response」に 999 を代入します")), texts.join(" / "));
  assert.ok(texts.some((t) => t.includes("「__macro_custom」に 42 を代入します")));
  assert.ok(texts.some((t) => t.includes("「__mine」に 7 を代入します")));
  // 合成行の代入（レスポンス辞書への代入）は現れない
  assert.ok(
    !texts.some((t) => t.includes(SYNTH_ASSIGN) && t.includes("'status': 'success'")),
    texts.join(" / "),
  );
});

test("R30-N33 failing handler still reports its error and leaks nothing", async () => {
  const code = `def handler(event, context):
    return {"requestId": event["requestId"], "status": "failure", "errorMessage": "ダメ", "fragment": event["fragment"]}`;
  const r = await cfRun(code);
  assert.match(r.paths[0].error.message, /マクロが失敗しました：ダメ/);
  assert.ok(!r.paths[0].trace.some((t) => t.text.includes(SYNTH_ASSIGN)));
});

test("R30-N33 no reference example leaks the synthetic assignment", async () => {
  for (const ref of cf.reference) {
    if (!ref.example) continue;
    const r = await cfRun(ref.example);
    for (const p of r.paths || [])
      for (const tr of p.trace || [])
        assert.ok(
          !tr.text.includes(SYNTH_ASSIGN),
          `reference ${ref.name}: ${tr.text}`,
        );
  }
});

/* ---------------- N34: Power Apps ---------------- */

test("R30-N34 Switch reference example (task repro) leaves no __switch_2 in final vars", async () => {
  const example = pa.reference.find((r) => r.name === "Switch").example;
  assert.equal(example, 'Set(Count, 2);\nSwitch(Count, 1, "一", "その他")');
  const r = await paRun(example);
  assert.ok(!r.error, JSON.stringify(r.error));
  const vars = r.paths[0].vars;
  assert.equal(vars.Count, 2);
  assert.ok(!Object.keys(vars).some((k) => k.startsWith("__switch")), JSON.stringify(vars));
  assert.ok(!("switchTemps" in r.paths[0]));
  // トレース側に合成名が出ないことは現状どおり維持
  assert.doesNotMatch(JSON.stringify(r.paths[0].trace), /__switch/);
  // Switch の意味論（既定値「その他」へ進む）も従来どおり
  assert.ok(r.paths[0].trace.some((t) => t.text.includes("その他")));
});

test("R30-N34 Switch result selection still works in all positions", async () => {
  // 一致する分岐
  let r = await paRun('Set(Count, 1);\nSwitch(Count, 1, Set(R, "一"), Set(R, "他"))');
  assert.equal(r.paths[0].vars.R, "一");
  assert.ok(!Object.keys(r.paths[0].vars).some((k) => k.startsWith("__switch")));
  // Set の直下（値として）
  r = await paRun('Set(Count, 2);\nSet(R, Switch(Count, 2, "二", "他"))');
  assert.equal(r.paths[0].vars.R, "二");
  assert.ok(!Object.keys(r.paths[0].vars).some((k) => k.startsWith("__switch")));
  // 連続する Switch（同一行・別行）
  r = await paRun('Switch(1, 1, Set(A, 10), Set(A, 20));\nSwitch(2, 2, Set(B, 30), Set(B, 40))');
  assert.equal(r.paths[0].vars.A, 10);
  assert.equal(r.paths[0].vars.B, 30);
  assert.ok(!Object.keys(r.paths[0].vars).some((k) => k.startsWith("__switch")));
});

test("R30-N34 learner-written __switch_N / __ variables stay in final vars", async () => {
  // Switch を使わず学習者が自分で書いた同名変数は消えない
  let r = await paRun("Set(__switch_2, 99);\nSet(Count, 1)");
  assert.equal(r.paths[0].vars.__switch_2, 99);
  // 合成一時変数と同名・同行で衝突しても、学習者の値は最終状態に残る
  // （合成値は内部ストア側で保持され、学習者の変数を上書きしない）
  r = await paRun('Set(__switch_1, 99); Switch(1, 1, "a", "b")');
  assert.equal(r.paths[0].vars.__switch_1, 99);
  // 一般の __ 始まり変数も残る
  r = await paRun('Set(__mine, 5); Switch(__mine, 5, "五", "他")');
  assert.equal(r.paths[0].vars.__mine, 5);
  assert.ok(!Object.keys(r.paths[0].vars).some((k) => k === "__switch_1" && r.paths[0].vars[k] === 5));
});

test("R30-N34 no powerapps reference example or template leaks synthetic vars", async () => {
  for (const ref of pa.reference) {
    if (!ref.example) continue;
    const r = await paRun(ref.example);
    for (const p of r.paths || []) {
      // 学習者の例に __switch 名は現れないため、vars のキーは合成漏れの証拠になる
      assert.ok(
        !Object.keys(p.vars || {}).some((k) => k.startsWith("__switch")),
        `reference ${ref.name}: ${JSON.stringify(p.vars)}`,
      );
      assert.doesNotMatch(JSON.stringify(p.trace), /__switch/, `reference ${ref.name}`);
      assert.ok(!("switchTemps" in p), `reference ${ref.name}`);
    }
  }
  for (const t of pa.templates) {
    const r = await paRun(t.code, t.model ?? undefined);
    for (const p of r.paths || [])
      assert.ok(!Object.keys(p.vars || {}).some((k) => k.startsWith("__switch")), t.id);
  }
});
