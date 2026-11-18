// 高度A5班（C#＋JavaScript）監査・修正の回帰テスト。
// 期待値は実機照合に基づく: C# は dotnet SDK 8.0.428 実走（ブラインド
// 照合300件ファジングで検出）、JS は Node v24／ECMA-262 2027草案。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { mergeCatalog } from "../js/core/catalog.js";
import { loadAdvanced, clearAdvancedCache } from "../js/core/advanced-loader.js";

const run = async (id, code) => {
  const d = getDefinition(id);
  return d.simulate(code, structuredClone(d.model.defaults));
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const outputs = (r) => (r.paths || []).flatMap((p) => p.outputs.map((o) => o.text));
const cs = (body) => `using System;\nclass Program {\n static void Main() {\n${body}\n }\n}`;
const expectCsOut = async (body, expected) => {
  const r = await run("csharp", cs(body));
  assert.deepEqual(errors(r), [], `${body} -> errors`);
  assert.deepEqual(outputs(r), expected, body);
};
const expectJsErr = async (code, pattern, category) => {
  const r = await run("javascript", code);
  const es = errors(r);
  assert.ok(es.length > 0, `${code} -> no error`);
  assert.match(es[0], pattern, code);
  if (category) assert.ok(es[0].startsWith(category + ":"), `${code} -> ${es[0]}`);
};

/* ---------- F1: 整数除算・剰余の -0（c-family 共有） ---------- */
test("A5-F1 C#: integer division never yields -0", async () => {
  await expectCsOut(`Console.WriteLine(-1 / 3);`, ["0"]);
  await expectCsOut(`Console.WriteLine(1 / -3);`, ["0"]);
  await expectCsOut(`Console.WriteLine(-2 / 3);`, ["0"]);
  await expectCsOut(`Console.WriteLine(0 / -3);`, ["0"]);
  await expectCsOut(`Console.WriteLine(-4 / 5);`, ["0"]);
  await expectCsOut(`long a = -1L; Console.WriteLine(a / 3L);`, ["0"]);
  await expectCsOut(`int q = -7 / 2; Console.WriteLine(q);`, ["-3"]);
  await expectCsOut(`Console.WriteLine(-7 % 2);`, ["-1"]);
  // 浮動小数点の -0 は正当なため保持する（既存固定テストと整合）。
  await expectCsOut(`double d = -0.0; Console.WriteLine(d);`, ["-0"]);
  await expectCsOut(`Console.WriteLine(-1.0 / 3.0);`, ["-0.3333333333333333"]);
});
test("A5-F1 C/C++: integer division never yields -0", async () => {
  const rc = await run("c", `#include <stdio.h>\nint main(void){ printf("%d\\n", -1 / 3); printf("%d\\n", -7 / 2); return 0; }`);
  assert.deepEqual(errors(rc), [], JSON.stringify(errors(rc)));
  assert.deepEqual(outputs(rc), ["0\n", "-3\n"]);
  const rcpp = await run("cpp", `#include <iostream>\nint main(){ std::cout << -1 / 3; return 0; }`);
  assert.deepEqual(errors(rcpp), [], JSON.stringify(errors(rcpp)));
  assert.deepEqual(outputs(rcpp), ["0"]);
  // 注: stdlib div() の商も同根で正規化したが、div_t 変数の宣言が
  // 方言未対応のため観測可能な回帰テストは置けない（予防的修正）。
});

/* ---------- F2: prototype／constructor 読み書きの名指し ---------- */
test("A5-F2 JS: prototype/constructor stops name the property", async () => {
  await expectJsErr(`console.log(Array.prototype);`, /モデルでは未対応です：Array\.prototype/, "未対応");
  await expectJsErr(`let o = {a: 1}; console.log(o.constructor);`, /モデルでは未対応です：o\.constructor/, "未対応");
  await expectJsErr(`console.log("x".prototype);`, /未対応/, "未対応");
  await expectJsErr(`let o = {}; o.prototype = 1;`, /モデルでは未対応です：prototype/);
  await expectJsErr(`let o = {}; o["__proto__"] = 1;`, /モデルでは未対応です：__proto__/);
});

/* ---------- F3: Symbol キー呼び出しの名指し ---------- */
test("A5-F3 JS: symbol-keyed calls name the member", async () => {
  await expectJsErr(`console.log([10, 20, 30][Symbol.iterator]());`, /\[Symbol\.iterator\]/);
  await expectJsErr(`console.log(Math.abs[Symbol.hasInstance](Math.abs));`, /Math\.abs\[Symbol\.hasInstance\]/);
});

/* ---------- F4: Symbol キー代入は誤変換せず正直に停止 ---------- */
test("A5-F4 JS: symbol-key assignment stops honestly", async () => {
  await expectJsErr(
    `let o = {a: 2}; o[Symbol("s")] = 1;`,
    /Symbol キーのプロパティはモデルでは未対応です/,
    "未対応",
  );
  // 文字列キーの通常代入は従来どおり動作する。
  const r = await run("javascript", `let o = {a: 2}; o["b"] = 1; console.log(Object.keys(o));`);
  assert.deepEqual(errors(r), [], JSON.stringify(errors(r)));
});

/* ---------- F5: RegExp 例文が方言で実行できる ---------- */
test("A5-F5 JS: RegExp.prototype.exec/test examples run in the dialect", async () => {
  clearAdvancedCache();
  const d = getDefinition("javascript");
  const adv = await loadAdvanced(d, { refresh: true });
  const merged = mergeCatalog(
    { reference: d.reference, templates: d.templates, glossary: d.glossary || [] },
    adv,
  );
  for (const name of ["RegExp.prototype.exec", "RegExp.prototype.test"]) {
    const item = merged.reference.find((r) => r.name === name);
    assert.ok(item, name);
    const r = await run("javascript", item.example);
    assert.deepEqual(errors(r), [], `${name} example: ${item.example}`);
  }
});

/* ---------- F6: toLocale* の停止理由は caution と一致 ---------- */
test("A5-F6 JS: toLocaleDateString/TimeString stop reasons cite locale", async () => {
  await expectJsErr(`console.log(Date(0).toLocaleDateString());`, /Date\.prototype\.toLocaleDateString はロケール/, "未確認");
  await expectJsErr(`console.log(Date(0).toLocaleTimeString());`, /Date\.prototype\.toLocaleTimeString はロケール/, "未確認");
  // 現地時間系は従来の文言のまま。
  await expectJsErr(`console.log(Date(0).getHours());`, /Date\.prototype\.getHours は現地時間/, "未確認");
  await expectJsErr(`console.log(Date(0).toLocaleString());`, /Date\.prototype\.toLocaleString は現地時間/, "未確認");
});

/* ---------- F7: scan が有効カタログ（__catalogReference）を参照 ---------- */
test("A5-F7 scan: advanced items resolve when the merged catalog is active", async () => {
  for (const id of ["javascript", "csharp"]) {
    clearAdvancedCache();
    const d = getDefinition(id);
    const adv = await loadAdvanced(d, { refresh: true });
    const merged = mergeCatalog(
      { reference: d.reference, templates: d.templates, glossary: d.glossary || [] },
      adv,
    );
    try {
      d.__catalogReference = merged.reference;
      if (id === "javascript") {
        const found = d.scan(`console.log(Object.keys({a: 1}));`);
        assert.ok(found.includes("Object.keys"), JSON.stringify(found));
        // 簡易モード相当（基礎カタログ差し込み）では高度名は出ない。
        d.__catalogReference = d.reference;
        const base = d.scan(`console.log(Object.keys({a: 1}));`);
        assert.ok(!base.includes("Object.keys"), JSON.stringify(base));
      } else {
        const found = d.scan(`Console.WriteLine(Math.Max(1, 2));`);
        assert.ok(found.includes("Math.Max"), JSON.stringify(found));
      }
    } finally {
      delete d.__catalogReference;
    }
  }
});

/* ---------- F8: 基礎収載の正式名が検索で到達できる ---------- */
test("A5-F8 JS: base items carry ledger names as inventoryNames", async () => {
  const d = getDefinition("javascript");
  // js/app.js の refSearchText と同じ索引（name／category／description／
  // syntax／inventoryNames／scan の小文字連結）で照合する。
  const searchText = (r) =>
    [r.name, r.category, r.description, r.syntax, ...(r.inventoryNames || []), r.scan]
      .filter((x) => typeof x === "string")
      .join(" ")
      .toLowerCase();
  const cases = [
    ["Array.prototype.push", "push"],
    ["Array.prototype.pop", "pop"],
    ["Array.prototype.join", "join"],
    ["Iterator.prototype.join", "join"],
    ["%TypedArray%.prototype.join", "join"],
    ["Number.parseInt", "parseInt"],
    ["Number.NaN", "NaN"],
  ];
  for (const [query, owner] of cases) {
    const hit = d.reference.find(
      (r) => r.name === owner && searchText(r).includes(query.toLowerCase()),
    );
    assert.ok(hit, `${query} -> ${owner}`);
  }
});
