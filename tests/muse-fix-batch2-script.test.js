import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import {
  PracticeError,
  simulateScript,
  toLearnerError,
} from "../js/core/script.js";

// M-N2／M-N3（fix-batch2 script班）：JavaScript でホスト（V8）例外の英語
// 文言が学習者向け停止理由へ漏れる欠陥の回帰テスト。
// 変換層は js/core/script.js の toLearnerError で、例外の出口
// （run／executeProgram／simulateScript の catch）を通る。

const run = async (code) => {
  const d = getDefinition("javascript");
  return d.simulate(code, structuredClone(d.model.defaults));
};
const errOf = (r) =>
  r.error || r.paths?.find((p) => p.error)?.error || null;
const okPath = async (code) => {
  const r = await run(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1, JSON.stringify(r.paths?.map((p) => p.error)));
  assert.ok(!r.paths[0].error, JSON.stringify(r.paths[0].error));
  return r.paths[0];
};

const MIX_MSG = "BigIntと通常の数値は混ぜて演算できません";
const DIV0_MSG = "0で割ることはできません";
const CONVERT_MSG =
  "BigIntを通常の数値として使うことはできません（Number()による明示的な変換が必要です）";
const CONST_MSG = "const で宣言した変数には再代入できません";
const HOST_LEAK =
  /Cannot|Division by zero|Assignment to|Invalid array|Maximum|BigInts have|Do not know/;

// --- M-N2: BigInt 混在演算（全演算子・両順序・複合代入） ---
test("M-N2 BigInt mixed arithmetic is Japanese for every operator", async () => {
  for (const op of ["+", "-", "*", "/", "%", "<<", ">>", ">>>", "&", "|", "^"]) {
    for (const code of [
      `console.log(10n ${op} 1);`,
      `console.log(1 ${op} 10n);`,
    ]) {
      const e = errOf(await run(code));
      assert.ok(e, code);
      assert.equal(e.message, MIX_MSG, code);
      assert.equal(e.category, "TypeError", code);
      assert.doesNotMatch(e.message, HOST_LEAK, code);
    }
  }
  const compound = errOf(await run("let a = 10n;\na += 1;"));
  assert.equal(compound?.message, MIX_MSG);
  assert.equal(compound?.category, "TypeError");
});

test("M-N2 BigInt division and modulo by zero are Japanese", async () => {
  for (const op of ["/", "%"]) {
    const e = errOf(await run(`console.log(10n ${op} 0n);`));
    assert.ok(e, op);
    assert.equal(e.message, DIV0_MSG, op);
    assert.equal(e.category, "RangeError", op);
  }
  // 通常の数値の 0 除算は実 JavaScript どおり Infinity／NaN で、変換対象外。
  const p = await okPath("console.log(1 / 0);\nconsole.log(1 % 0);");
  assert.deepEqual(p.outputs.map((o) => o.text), ["Infinity", "NaN"]);
});

test("M-N2 BigInt unsigned right shift has its own Japanese reason", async () => {
  const e = errOf(await run("console.log(10n >>> 1n);"));
  assert.ok(e);
  assert.equal(
    e.message,
    "BigIntに符号なし右シフト（>>>）は使えません（>>を使ってください）",
  );
  assert.equal(e.category, "TypeError");
});

test("M-N2 BigInt to number conversion sites are Japanese", async () => {
  for (const code of [
    "console.log(+10n);",
    "console.log(Math.abs(10n));",
    "console.log(Math.floor(10n));",
    "console.log(Math.round(10n));",
    "const a = [1, 2];\na.length = 10n;",
  ]) {
    const e = errOf(await run(code));
    assert.ok(e, code);
    assert.equal(e.message, CONVERT_MSG, code);
    assert.equal(e.category, "TypeError", code);
  }
});

test("M-N2 invalid array length writes are Japanese", async () => {
  for (const v of ["-1", "1.5", "4294967296", '"x"']) {
    const e = errOf(await run(`const a = [1, 2];\na.length = ${v};`));
    assert.ok(e, v);
    assert.equal(
      e.message,
      "配列の長さが不正です（0以上の整数で指定してください）",
      v,
    );
    assert.equal(e.category, "RangeError", v);
  }
});

test("M-N2 oversized BigInt result is Japanese", async () => {
  const e = errOf(await run("console.log(1n << 999999999999999999999n);"));
  assert.ok(e);
  assert.equal(e.message, "BigIntの大きさが上限を超えました");
  assert.equal(e.category, "RangeError");
});

test("M-N2 BigInt same-type arithmetic still works", async () => {
  const p = await okPath(
    "console.log(10n + 20n);\nconsole.log(10n / 3n);\nconsole.log(10n % 3n);\nconsole.log(1n << 100n);",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), [
    "30n",
    "3n",
    "1n",
    "1267650600228229401496703205376n",
  ]);
});

// --- M-N3: const 再代入（全代入形式） ---
test("M-N3 const reassignment is Japanese for every assignment form", async () => {
  for (const code of [
    "const a = 1;\na = 2;",
    "const a = 1;\na += 2;",
    "const a = 1;\na -= 1;",
    "const a = 1;\na *= 2;",
    "const a = 1;\na /= 2;",
    "const a = 1;\na++;",
    "const a = 1;\na--;",
    "for (const i = 0; i < 3; i++) {\n  console.log(i);\n}",
  ]) {
    const e = errOf(await run(code));
    assert.ok(e, code);
    assert.equal(e.message, CONST_MSG, code);
    assert.equal(e.category, "TypeError", code);
    assert.doesNotMatch(e.message, HOST_LEAK, code);
  }
});

test("M-N3 const object contents and let reassignment still work", async () => {
  const p = await okPath(
    "const o = { x: 1 };\no.x = 2;\nlet a = 1;\na = 2;\na += 3;\nconsole.log(o.x);\nconsole.log(a);",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), ["2", "5"]);
});

// --- 兄弟表面：BigInt の増減が型を保つ ---
test("M-N2 sibling: BigInt increment and decrement keep the BigInt type", async () => {
  const p = await okPath(
    "let a = 10n;\nconsole.log(a++);\nconsole.log(a);\nconsole.log(typeof a);\na--;\nconsole.log(a);",
  );
  assert.deepEqual(p.outputs.map((o) => o.text), [
    "10n",
    "11n",
    "bigint",
    "10n",
  ]);
});

// --- 変換層の単体検証 ---
test("M-N2 toLearnerError maps every known host message", () => {
  const cases = [
    ["Cannot mix BigInt and other types, use explicit conversions", MIX_MSG, "TypeError"],
    ["Division by zero", DIV0_MSG, "RangeError"],
    ["Cannot convert a BigInt value to a number", CONVERT_MSG, "TypeError"],
    ["BigInts have no unsigned right shift, use >> instead", "BigIntに符号なし右シフト（>>>）は使えません（>>を使ってください）", "TypeError"],
    ["Invalid array length", "配列の長さが不正です（0以上の整数で指定してください）", "RangeError"],
    ["Maximum BigInt size exceeded", "BigIntの大きさが上限を超えました", "RangeError"],
    ["Do not know how to serialize a BigInt", "BigIntはJSONへ変換できません", "TypeError"],
    ["Assignment to constant variable", CONST_MSG, "TypeError"],
    ["Cannot read properties of undefined (reading 'x')", "null / undefined のプロパティは参照できません", "TypeError"],
    ["Cannot set properties of null (setting 'x')", "null / undefined へ書き込めません", "TypeError"],
  ];
  for (const [raw, message, category] of cases) {
    const pe = toLearnerError(new TypeError(raw));
    assert.ok(pe instanceof PracticeError, raw);
    assert.equal(pe.message, message, raw);
    assert.equal(pe.category, category, raw);
  }
});

test("M-N2 unknown host errors fall back to generic Japanese without internals", () => {
  const pe = toLearnerError(new Error("Some internal host detail XYZ-123"));
  assert.ok(pe instanceof PracticeError);
  assert.equal(pe.message, "処理中に予期しないエラーが発生しました");
  assert.doesNotMatch(pe.message, /XYZ|internal|host/i);
  // Error でない投げ値も汎用文言で受ける。
  assert.equal(
    toLearnerError("raw string failure").message,
    "処理中に予期しないエラーが発生しました",
  );
});

test("M-N2 model PracticeErrors pass through the conversion layer untouched", () => {
  const jp = new PracticeError("未定義の名前：x", 3, "ReferenceError");
  assert.equal(toLearnerError(jp), jp);
  // R の実物文言再現など、意図的な英語の PracticeError も潰さない。
  const en = new PracticeError("non-numeric argument to binary operator", 1, "エラー");
  assert.equal(toLearnerError(en), en);
  assert.equal(toLearnerError(en).message, "non-numeric argument to binary operator");
});

test("M-N2 conversion also applies at the simulateScript exit", () => {
  const host = simulateScript(
    "let a = 1 + 2;",
    { variables: {} },
    {
      dialect: "js",
      binary: () => {
        throw new TypeError(
          "Cannot mix BigInt and other types, use explicit conversions",
        );
      },
    },
  );
  assert.equal(host.paths[0].error.message, MIX_MSG);
  assert.equal(host.paths[0].error.category, "TypeError");

  const unknown = simulateScript(
    "let a = 1 + 2;",
    { variables: {} },
    {
      dialect: "js",
      binary: () => {
        throw new Error("opaque internal failure QRS-789");
      },
    },
  );
  assert.equal(
    unknown.paths[0].error.message,
    "処理中に予期しないエラーが発生しました",
  );
  assert.doesNotMatch(unknown.paths[0].error.message, /QRS|internal/);
});

// --- モデル側の正当な停止理由が汎用文言に潰れていないこと ---
test("M-N2 legitimate model errors keep their specific Japanese reasons", async () => {
  const undef = errOf(await run("console.log(x);"));
  assert.equal(undef?.message, "未定義の名前：x");
  assert.equal(undef?.category, "ReferenceError");
  const json = errOf(await run("console.log(JSON.stringify(10n));"));
  assert.equal(json?.message, "BigIntはJSONへ変換できません");
  assert.equal(json?.category, "TypeError");
  const nullRead = errOf(await run("let x = null;\nconsole.log(x.y);"));
  assert.equal(nullRead?.message, "null / undefined のプロパティは参照できません");
});

// --- 漏出の全数スイープ：どの入力でも英語ホスト文言が出ない ---
test("M-N2 no host wording leaks across the probe battery", async () => {
  const battery = [
    "console.log(10n + 1);", "console.log(10n / 0n);", "console.log(10n % 0n);",
    "console.log(10n >>> 1n);", "console.log(+10n);", "console.log(Math.abs(10n));",
    "const a = 1;\na = 2;", "const a = [1, 2];\na.length = -1;",
    "const a = [1, 2];\na.length = 10n;", "console.log(1n << 999999999999999999999n);",
    "let a = 10n;\na += 1;", "console.log(10n & 1);", "console.log(10n ^ 1);",
  ];
  for (const code of battery) {
    const r = await run(code);
    const errors = [
      r.error,
      ...(r.paths || []).map((p) => p.error),
    ].filter(Boolean);
    assert.ok(errors.length, code);
    for (const e of errors) {
      assert.doesNotMatch(e.message, HOST_LEAK, code);
      assert.match(e.message, /[\u3040-\u30ff]/, code);
    }
    for (const p of r.paths || [])
      for (const t of p.trace || [])
        if (t.kind === "error") assert.doesNotMatch(t.text, HOST_LEAK, code);
  }
});
