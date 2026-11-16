// 修正バッチ9（pseudo-ui班）：R30-N1／R30-N2 の根治と再発防止。
// 擬似言語の種類定義が共有UI契約（js/app.js が読む model／semantics の
// 下位形状）に従わず、初期状態で実行不能／対応範囲・出典が表示されなかった
// 問題について、全16種の定義に対する契約テストで固定する。
// 一次資料：findings-r30-ui.md §2、findings-round30.md §2 の R30-N1／N2。
import test from "node:test";
import assert from "node:assert/strict";
import { definitions, getDefinition, validateDefinition } from "../js/types/registry.js";

const pseudo = getDefinition("pseudo");

test("バッチ9 全16種の model が共有UI契約形 { kind, title, hint, defaults } を満たす", () => {
  assert.equal(definitions.length, 16);
  for (const d of definitions) {
    assert.ok(d.model && typeof d.model === "object" && !Array.isArray(d.model), `${d.id} の model`);
    assert.ok(d.model.kind === "json" || d.model.kind === "sheet", `${d.id} の model.kind: ${d.model.kind}`);
    assert.equal(typeof d.model.title, "string", `${d.id} の model.title の型`);
    assert.ok(d.model.title.length > 0, `${d.id} の model.title が空`);
    assert.equal(typeof d.model.hint, "string", `${d.id} の model.hint の型`);
    assert.ok(d.model.hint.length > 0, `${d.id} の model.hint が空`);
    assert.ok(
      d.model.defaults && typeof d.model.defaults === "object" && !Array.isArray(d.model.defaults),
      `${d.id} の model.defaults がオブジェクトでない`,
    );
  }
});

test("バッチ9 全16種の semantics が共有UI契約形 { description, support, sources[].url } を満たす", () => {
  for (const d of definitions) {
    assert.equal(typeof d.semantics.description, "string", `${d.id} の semantics.description の型`);
    assert.ok(d.semantics.description.length > 0, `${d.id} の semantics.description が空`);
    assert.equal(typeof d.semantics.support, "string", `${d.id} の semantics.support の型`);
    assert.ok(d.semantics.support.length > 0, `${d.id} の semantics.support が空`);
    assert.ok(Array.isArray(d.semantics.sources) && d.semantics.sources.length > 0, `${d.id} の semantics.sources`);
    for (const source of d.semantics.sources) {
      assert.equal(typeof source.title, "string", `${d.id} の出典タイトルの型`);
      assert.ok(source.title.length > 0, `${d.id} の出典タイトルが空`);
      assert.equal(typeof source.url, "string", `${d.id} の出典 url の型（locator 等の別名では不可）`);
      assert.ok(source.url.startsWith("https://"), `${d.id} の出典 url: ${source.url}`);
    }
    // 共有UIがそのまま連結表示するため、文字列化して undefined が混ざらないこと
    const shown = d.semantics.description + " " + d.semantics.support;
    assert.ok(!shown.includes("undefined"), `${d.id} の対応範囲文に undefined が混ざる`);
  }
});

test("バッチ9 強化後の validateDefinition を全16種の現行定義が通る", () => {
  for (const d of definitions) assert.equal(validateDefinition(d), d, d.id);
});

test("バッチ9 validateDefinition は R30-N1／N2 型の不適合を検出する（再発防止の検出力）", () => {
  // R30-N1 型：model がエンジン形 { globals, args } のまま（defaults 等なし）
  assert.throws(
    () => validateDefinition({ ...pseudo, model: { globals: {}, args: [] } }),
    /model\.kind/,
  );
  assert.throws(
    () => validateDefinition({ ...pseudo, model: { kind: "json", title: "x", hint: "y" } }),
    /model\.defaults/,
  );
  // R30-N2 型：semantics が独自形 { sources[].locator, paragraphs } のまま
  assert.throws(
    () =>
      validateDefinition({
        ...pseudo,
        semantics: { sources: [{ title: "t", locator: "https://example.com/" }], paragraphs: ["x"] },
      }),
    /semantics\.description/,
  );
  assert.throws(
    () =>
      validateDefinition({
        ...pseudo,
        semantics: {
          description: "d",
          support: "s",
          sources: [{ title: "t", locator: "https://example.com/" }],
        },
      }),
    /sources/,
  );
});

test("バッチ9 擬似言語の model：defaults が JSON 化して \"undefined\" にならず、見出し・説明が表示できる", () => {
  assert.equal(pseudo.model.kind, "json");
  assert.equal(pseudo.model.title, "モデル大域変数・引数");
  assert.ok(pseudo.model.hint.includes("globals") && pseudo.model.hint.includes("args"));
  assert.deepEqual(pseudo.model.defaults, { globals: {}, args: [] });
  // js/app.js の fillSheet が行う初期値生成と同じ経路
  const initialText = JSON.stringify(pseudo.model.defaults, null, 2);
  assert.equal(typeof initialText, "string");
  assert.notEqual(initialText, "undefined");
  assert.deepEqual(JSON.parse(initialText), { globals: {}, args: [] });
});

test("バッチ9 擬似言語の semantics：旧 paragraphs の開示が description／support へ喪失なく移り、出典は IPA 公式URL", () => {
  assert.match(pseudo.semantics.description, /別紙2「擬似言語の記述形式」/);
  assert.match(pseudo.semantics.description, /簡易・高度の区別なく、最初から全部を対象にしています/);
  assert.match(pseudo.semantics.description, /試験問題の実例で確認できていない形は、未対応として名指しで止まります/);
  assert.match(pseudo.semantics.description, /÷ は、両辺が整数のとき商、実数を含むとき実数除算/);
  assert.match(pseudo.semantics.description, /and／or は短絡評価します/);
  assert.match(pseudo.semantics.support, /未対応は名指しで止めます/);
  assert.match(pseudo.semantics.support, /「ずつ減らす」「の値を〜減らす」は確認した試験問題の範囲で実例が無く未対応です/);
  assert.match(pseudo.semantics.support, /記述形式に無い演算子（\*、\/、==、!=、&&、\|\|、べき乗）も未対応/);
  assert.match(pseudo.semantics.support, /分岐パスの上限は2,000です/);
  assert.deepEqual(
    pseudo.semantics.sources.map((s) => s.url),
    [
      "https://www.ipa.go.jp/shiken/syllabus/doe3um0000002djj-att/shiken_yougo_ver5_1.pdf",
      "https://www.ipa.go.jp/shiken/syllabus/ps6vr7000000oett-att/fe_kamoku_b_sample.pdf",
    ],
  );
});

test("バッチ9 擬似言語は初期モデル（defaults の複製）で全テンプレートが実行できる", () => {
  for (const template of pseudo.templates) {
    const result = pseudo.simulate(template.code, structuredClone(pseudo.model.defaults));
    assert.equal(result.error, undefined, `${template.id} が初期モデルで致命的エラー: ${result.error?.message}`);
    assert.ok(result.paths.length >= 1, template.id);
    for (const path of result.paths) {
      assert.equal(path.error, undefined, `${template.id} のパスエラー: ${path.error?.message}`);
    }
  }
  // UIの初期状態（fee テンプレート＋初期JSON）相当：3パスで 100／300／500
  const fee = pseudo.templates.find((t) => t.id === "pseudo-fee");
  const initialModel = JSON.parse(JSON.stringify(pseudo.model.defaults, null, 2));
  const result = pseudo.simulate(fee.code, initialModel);
  assert.deepEqual(result.paths.map((p) => p.vars["戻り値"]), [100, 300, 500]);
});
