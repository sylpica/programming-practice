/* 高度A6班（C＋Pythonコア）監査の回帰テスト。
 * 対象：PYF-01〜05（Python）、CF-02〜07（C）。CF-01 は実測裁定の結果
 * 「欠陥ではない」と確定したため、glibc 実行時セマンティクスの符号表を
 * 固定するテストとして残す（下記コメント参照）。
 * 期待値の一次情報：CPython 3.12.3 実走／glibc（gcc 13.3.0）実行時実測。 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { loadAdvanced } from "../js/core/advanced-loader.js";
import { mergeCatalog } from "../js/core/catalog.js";

// js/worker.js の activateAdvanced と同一手順で高度モードを有効化する
async function activate(id) {
  const def = getDefinition(id);
  const loaded = await loadAdvanced(def);
  assert.ok(loaded && !(loaded.failed && loaded.failed.length), id);
  const merged = mergeCatalog(
    { reference: def.reference, templates: def.templates, glossary: def.glossary || [] },
    loaded,
  );
  def.__catalogReference = merged.reference;
  const em = loaded.engineModule;
  if (em && typeof em.applyAdvancedEngine === "function") {
    const hooked = em.applyAdvancedEngine(def, merged);
    if (hooked && hooked !== def) {
      if (typeof hooked.scan === "function") def.scan = hooked.scan;
      if (typeof hooked.simulate === "function") def.simulate = hooked.simulate;
    }
  }
  return { def, merged };
}
const pyAct = await activate("python");
const cAct = await activate("c");
const py = pyAct.def;
const cdef = cAct.def;

const runPy = (code) => py.simulate(code, structuredClone(py.model.defaults));
const runC = (code) => cdef.simulate(code, structuredClone(cdef.model.defaults));
// C は {category, message} 形、Python は文面自体が「TypeError：…」形で
// category を持たない。両形を文字列化する。
const errs = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) =>
      typeof e === "string" ? e : e.category ? `${e.category}:${e.message}` : e.message || String(e),
    );
const outs = (r) => (r.paths?.[0]?.outputs || []).map((o) => o.text).join("");
const C = (body, inc = "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <math.h>") =>
  `${inc}\nint main() {\n${body}\n return 0;\n}`;

/* ---------------- Python ---------------- */

test("A6 PYF-01: math.floor/ceil/trunc が __floor__/__ceil__/__trunc__ へ委譲する", async () => {
  const code = [
    "import math",
    "class M:",
    "    def __trunc__(self):",
    "        return 42",
    "    def __floor__(self):",
    "        return -7",
    "    def __ceil__(self):",
    "        return 9",
    "print(math.trunc(M()), math.floor(M()), math.ceil(M()))",
  ].join("\n");
  const r = await runPy(code);
  assert.deepEqual(errs(r), []);
  assert.equal(outs(r), "42 -7 9");
});

test("A6 PYF-01: ダンダーの戻り値が整数でなければ TypeError、通常の float は不変", async () => {
  const bad = await runPy(
    "import math\nclass M:\n    def __trunc__(self):\n        return 1.5\nprint(math.trunc(M()))",
  );
  assert.ok(errs(bad).some((e) => e.includes("TypeError")), JSON.stringify(errs(bad)));
  const plain = await runPy("import math\nprint(math.floor(2.5), math.ceil(2.5), math.trunc(-2.5))");
  assert.deepEqual(errs(plain), []);
  assert.equal(outs(plain), "2 3 -2");
});

test("A6 PYF-02: __length_hint__ 定義クラスでは object.__length_hint__ を名指して止まる", async () => {
  const stop = await runPy(
    "import operator\nclass C:\n    def __length_hint__(self):\n        return 5\nprint(operator.length_hint(C()))",
  );
  assert.ok(
    errs(stop).some((e) => e.includes("未対応") && e.includes("object.__length_hint__")),
    JSON.stringify(errs(stop)),
  );
  const lenOnly = await runPy(
    "import operator\nclass C:\n    def __len__(self):\n        return 4\nprint(operator.length_hint(C()))",
  );
  assert.deepEqual(errs(lenOnly), []);
  assert.equal(outs(lenOnly), "4");
  const neither = await runPy("import operator\nclass C:\n    pass\nprint(operator.length_hint(C(), 3))");
  assert.deepEqual(errs(neither), []);
  assert.equal(outs(neither), "3");
});

test("A6 PYF-03: anext の例題は anext 自身を名指して止まる", async () => {
  const item = pyAct.merged.reference.find((i) => i.name === "anext");
  assert.ok(item, "anext item exists");
  const r = await runPy(item.example);
  assert.ok(
    errs(r).some((e) => e.includes("未対応") && e.includes("「anext」")),
    JSON.stringify(errs(r)),
  );
});

test("A6 PYF-04: 未対応ダンダーは原因を名指して止まる（4件）", async () => {
  const cases = [
    [
      "class G:\n    def __mro_entries__(self, bases):\n        return (int,)\nclass C(G()):\n    pass",
      "object.__mro_entries__",
    ],
    [
      "class G:\n    def __mro_entries__(self, bases):\n        return (int,)\nC = type('C', (G(),), {})",
      "object.__mro_entries__",
    ],
    [
      "class D(dict):\n    def __missing__(self, k):\n        return 0\nprint(D()['k'])",
      "object.__missing__",
    ],
    [
      "class C:\n    def __complex__(self):\n        return 3 + 4j\nprint(complex(C()))",
      "object.__complex__",
    ],
    [
      "class B:\n    def __buffer__(self, flags):\n        return memoryview(b'ab')\nprint(bytes(memoryview(B())))",
      "object.__buffer__",
    ],
  ];
  for (const [code, name] of cases) {
    const r = await runPy(code);
    assert.ok(
      errs(r).some((e) => e.includes("未対応") && e.includes(name)),
      `${name} -> ${JSON.stringify(errs(r))}`,
    );
  }
  // dict 派生でないクラスの __missing__ は従来どおり __getitem__ の TypeError
  const plain = await runPy(
    "class P:\n    def __missing__(self, k):\n        return 0\nprint(P()['k'])",
  );
  assert.ok(
    errs(plain).some((e) => e.includes("TypeError") && e.includes("__getitem__")),
    JSON.stringify(errs(plain)),
  );
});

test("A6 PYF-05: 合成カタログに status と supported の矛盾が無い", () => {
  for (const item of pyAct.merged.reference) {
    if (item.status === "supported")
      assert.notEqual(item.supported, false, item.name);
    if (item.status === "unsupported" || item.status === "unverified")
      assert.notEqual(item.supported, true, item.name);
  }
  const fmt = pyAct.merged.reference.find((i) => i.name === "str.format");
  assert.equal(fmt.status, "supported");
  assert.equal(fmt.supported, true);
});

/* ---------------- C ---------------- */

test("A6 CF-02: ポインタの等価比較（NULL／同士）を具体評価する", async () => {
  const cases = [
    ['int *p = malloc(sizeof(int));\nif (p == NULL) { printf("null"); } else { printf("ok"); }', "ok"],
    ['int a[2];\nint *p = a;\nint *q = a;\nif (p == q) { printf("same"); }', "same"],
    ['int *p = malloc(sizeof(int));\nprintf("%d", p != NULL);', "1"],
    ['int *p = NULL;\nif (p == NULL) { printf("null"); }', "null"],
    ['int a[1];\nint b[1];\nprintf("%d", (a == b));', "0"],
    ['int a[3];\nint *p = a;\nint *q = a + 1;\nprintf("%d %d", p == q, p != q);', "0 1"],
  ];
  for (const [body, expected] of cases) {
    const r = await runC(C(body));
    assert.deepEqual(errs(r), [], body);
    assert.equal(outs(r), expected, body);
  }
  // 関係演算と非ゼロ整数との比較は従来どおり名指しで止める
  for (const body of [
    'int a[2];\nint *p = a;\nint *q = a + 1;\nif (p < q) { printf("lt"); }',
    'int *p = malloc(sizeof(int));\nif (p == 1) { printf("one"); }',
  ]) {
    const r = await runC(C(body));
    assert.ok(errs(r).some((e) => e.includes("このポインタ比較・演算は未対応です")), body);
  }
});

test("A6 CF-02: NULL ポインタへのアクセスは NULL と名指して止まる", async () => {
  for (const body of [
    'int *p = calloc(20000000, sizeof(int));\nprintf("%d", p[0]);',
    'int *p = calloc(20000000, sizeof(int));\np[0] = 1;',
    'int *p = NULL;\nprintf("%d", *p);',
  ]) {
    const r = await runC(C(body));
    assert.ok(
      errs(r).some((e) => e.startsWith("未定義動作:") && e.includes("NULLポインタ")),
      `${body} -> ${JSON.stringify(errs(r))}`,
    );
  }
});

test("A6 CF-03: ヒープ範囲外は要素幅（バイト単位）で判定し、範囲内は不変", async () => {
  const ok = await runC(C('int *p = malloc(2 * sizeof(int));\np[0] = 5;\np[1] = 6;\nprintf("%d %d", p[0], p[1]);'));
  assert.deepEqual(errs(ok), []);
  assert.equal(outs(ok), "5 6");
  for (const body of [
    'int *p = malloc(2 * sizeof(int));\np[7] = 1;',
    'int *p = malloc(2 * sizeof(int));\nprintf("%d", p[6]);',
    'int *p = malloc(2 * sizeof(int));\nprintf("%d", p[2]);',
    'int *p = malloc(2 * sizeof(int));\nint *q = p + 3;',
  ]) {
    const r = await runC(C(body));
    assert.ok(errs(r).some((e) => e.startsWith("未定義動作:")), `${body} -> ${JSON.stringify(errs(r))}`);
  }
  // 一つ先までのポインタ形成は可、スタック配列の範囲判定は不変
  const form = await runC(C('int *p = malloc(2 * sizeof(int));\nint *q = p + 2;\nprintf("formed");'));
  assert.deepEqual(errs(form), []);
  assert.equal(outs(form), "formed");
  const stack = await runC(C('int a[2];\na[7] = 1;'));
  assert.ok(errs(stack).some((e) => e.startsWith("未定義動作:")));
});

test("A6 CF-03回帰: ポインタ演算を挟む逆参照の要素型を取り違えない", async () => {
  // char 配列＋memchr の *(p - 1) 形（B6S memchr テストと同形）。
  // 演算式の typeOf は算術型へ畳まれるため、要素型はポインタ側から取る。
  const mem = await runC(C('char buf[8] = "abcdef";\nchar *p = memchr(buf, 0, 8);\nprintf("%d %c", *p, *(p - 1));'));
  assert.deepEqual(errs(mem), []);
  assert.equal(outs(mem), "0 f");
  // ヒープ int への演算経由の範囲内アクセスは通り、範囲外は止まる
  const ok = await runC(C('int *p = malloc(2 * sizeof(int));\n*(p + 1) = 3;\nprintf("%d", *(p + 1));'));
  assert.deepEqual(errs(ok), []);
  assert.equal(outs(ok), "3");
  const oob = await runC(C('int *p = malloc(2 * sizeof(int));\n*(p + 7) = 1;'));
  assert.ok(errs(oob).some((e) => e.startsWith("未定義動作:")), JSON.stringify(errs(oob)));
});

test("A6 CF-04: strerror(96) は glibc の文面と一致する", async () => {
  const r = await runC(C('printf("%s", strerror(96));'));
  assert.deepEqual(errs(r), []);
  assert.equal(outs(r), "Protocol family not supported");
});

test("A6 CF-06: 複素数型の宣言は型を名指して止まり、変数名 complex は使える", async () => {
  for (const [body, typeName] of [
    ['double complex z = 1.0 + 2.0 * I;', "double complex"],
    ['float complex w;', "float complex"],
    ['_Complex double z;', "double complex"],
  ]) {
    const r = await runC(C(body));
    assert.ok(
      errs(r).some((e) => e.includes(`型 ${typeName} の宣言は未対応です`)),
      `${body} -> ${JSON.stringify(errs(r))}`,
    );
  }
  const named = await runC(C('int complex = 3;\nprintf("%d", complex);'));
  assert.deepEqual(errs(named), []);
  assert.equal(outs(named), "3");
});

test("A6 CF-07: printf の %s は未確定値でも宣言型を検査する", async () => {
  const bad = await runC(C('printf("%s", rand());'));
  assert.ok(
    errs(bad).some((e) => e.startsWith("未定義動作:") && e.includes("printfの書式と引数型が一致しません")),
    JSON.stringify(errs(bad)),
  );
  const ok = await runC(C('printf("%d", rand());'));
  assert.deepEqual(errs(ok), []);
  assert.ok(outs(ok).includes("rand() の戻り値"), outs(ok));
});

/* CF-01 裁定の固定：定義域 NaN の符号は glibc の「実行時」セマンティクスが
 * 正本。signbit(f(リテラル)) を1つの printf 式に書くと gcc が MPFR で
 * コンパイル時畳み込みし、異なる符号（atanh→正など）を返すため、期待値の
 * 採取には使えない。以下は引数を実行時に与えて測った実測値であり、
 * アプリの固定符号表はこれと一致する（欠陥ではないことの回帰固定）。 */
test("A6 CF-01裁定: 定義域 NaN の signbit は glibc 実行時表と一致する", async () => {
  const cases = [
    ['printf("%d", signbit(log(-3.0)));', "1"],
    ['printf("%d", signbit(log2(-1.0)));', "1"],
    ['printf("%d", signbit(log1p(-2.0)));', "1"],
    ['printf("%d", signbit(log10(-5.0)));', "0"],
    ['printf("%d", signbit(asin(2.0)));', "0"],
    ['printf("%d", signbit(acos(3.0)));', "0"],
    ['printf("%d", signbit(atanh(2.0)));', "1"],
    ['printf("%d", signbit(atanh(-2.0)));', "1"],
    ['printf("%d", signbit(acosh(0.5)));', "1"],
    ['printf("%d", signbit(fmod(1.0, 0.0)));', "1"],
    ['printf("%d", signbit(fmod(-1.0, 0.0)));', "1"],
    ['printf("%d", signbit(remainder(1.0, 0.0)));', "1"],
    ['printf("%d", signbit(sqrt(-1.0)));', "1"],
    ['printf("%d", signbit(pow(-1.0, 0.5)));', "1"],
    ['printf("%d", signbit(tgamma(-1.0)));', "0"],
    ['double v = 0.0 / 0.0;\nprintf("%d", signbit(v));', "1"],
  ];
  for (const [body, expected] of cases) {
    const r = await runC(C(body));
    assert.deepEqual(errs(r), [], body);
    assert.equal(outs(r), expected, body);
  }
});

/* 共有核（c-family.js）への波及スモーク：C++／C# の基本経路 */
test("A6 共有核スモーク: C++ の nullptr 等価と配列範囲、C# の配列と null 比較", async () => {
  const cpp = getDefinition("cpp");
  const runCpp = (code) => cpp.simulate(code, structuredClone(cpp.model.defaults));
  const eq = await runCpp('int *p = nullptr;\nprintf("%d", p == nullptr);');
  assert.deepEqual(errs(eq), []);
  assert.equal(outs(eq), "1");
  const oob = await runCpp('int a[2];\na[5] = 1;');
  assert.ok(errs(oob).some((e) => e.startsWith("未定義動作:")));
  const cs = getDefinition("csharp");
  const runCs = (code) => cs.simulate(code, structuredClone(cs.model.defaults));
  const arr = await runCs('int[] a = {1, 2, 3};\nConsole.WriteLine(a[1]);');
  assert.deepEqual(errs(arr), []);
  assert.equal(outs(arr), "2");
});
