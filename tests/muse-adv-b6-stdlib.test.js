// 高度モード ブロックB6・C班3（stdlib/stdio のうち stdlib 側）:
// <stdlib.h> 変換系・labs/llabs・rand/srand・malloc 系、
// <inttypes.h>、<assert.h>、<time.h> difftime の意味論テスト。
// 期待値は gcc 13.3.0 実走で裏付けた（各テストに実測値を記す）。
// モデルの裁定で実環境と異なる点（確保上限 16,777,216 超は NULL、
// 64ビット境界値は安全整数範囲外として「未確認」停止、atoi の
// 範囲外は処理系依存として停止）は、その旨を明記して検証する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { applyAdvancedEngine } from "../js/types/c/advanced-engine.js";
applyAdvancedEngine(getDefinition("c"));
import { referenceAdvanced as refItems } from "../js/types/c/ref-stdlib-advanced.js";

const run = async (code) => {
  const d = getDefinition("c");
  return d.simulate(code, structuredClone(d.model.defaults));
};
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const first = async (code) => {
  const r = await run(code);
  assert.deepEqual(errors(r), [], `${code} -> ${JSON.stringify(errors(r))}`);
  return r.paths[0];
};
const out1 = async (code) =>
  (await first(code)).outputs.map((o) => o.text).join("");
const vars1 = async (code) => (await first(code)).vars;
const expectError = async (code, pattern, category) => {
  const r = await run(code);
  const errs = errors(r);
  assert.ok(
    errs.some((e) => pattern.test(e) && (!category || e.startsWith(category + ":"))),
    `${code} -> ${JSON.stringify(errs)}`,
  );
};
const C = (body, inc = "#include <stdio.h>\n#include <stdlib.h>") =>
  `${inc}\nint main() {\n${body}\n return 0;\n}`;

/* ---------- atoi / atol / atoll（gcc 実測: -42 / 123456 / -9876543210） ---------- */
test("B6-stdlib atoi: 典型・境界・変換不能", async () => {
  assert.equal(await out1(C(`printf("%d", atoi("  -42abc"));`)), "-42");
  assert.equal(await out1(C(`printf("%d", atoi("+7"));`)), "7");
  assert.equal(await out1(C(`printf("%d", atoi("xyz"));`)), "0");
  assert.equal(await out1(C(`printf("%d", atoi(""));`)), "0");
  assert.equal(await out1(C(`printf("%d", atoi("2147483647"));`)), "2147483647");
  // 範囲外は処理系依存として停止（モデル裁定。gcc の値は -2147483648）。
  await expectError(C(`int v = atoi("2147483648");`), /atoi の結果が int で表せません/, "環境依存");
  await expectError(C(`int v = atoi("1", "2");`), /引数を1つ/, "CompileError");
});
test("B6-stdlib atol/atoll: 典型と組み合わせ", async () => {
  assert.equal((await vars1(C(`long v = atol("123456");`))).v, 123456);
  assert.equal((await vars1(C(`long long v = atoll("-9876543210");`))).v, -9876543210);
  assert.equal((await vars1(C(`long v = atol("  42x");`))).v, 42);
});

/* ---------- atof / strtod / strtof / strtold ---------- */
test("B6-stdlib atof/strtod: 典型・指数・16進・inf/nan", async () => {
  assert.equal(await out1(C(`printf("%f", atof("3.25xyz"));`)), "3.250000");
  assert.equal(await out1(C(`printf("%f", atof("  -1.5e2"));`)), "-150.000000");
  assert.equal(await out1(C(`printf("%f", atof("xyz"));`)), "0.000000");
  assert.equal(await out1(C(`printf("%f", strtod("2.5e1!", NULL));`)), "25.000000");
  assert.equal(await out1(C(`printf("%f", strtod("0x1p4", NULL));`)), "16.000000");
  assert.equal(await out1(C(`printf("%f", strtod("inf", NULL));`)), "inf");
  // nan は %f で "nan" と出る（gcc 実測）。
  assert.equal(await out1(C(`printf("%f", strtod("nan", NULL));`)), "nan");
  assert.equal(await out1(C(`printf("%f", atof(".5"));`)), "0.500000");
});
test("B6-stdlib strtof/strtold: float への丸めと long double", async () => {
  // gcc 実測: (double)strtof("0.1") = 0.10000000149011612。
  assert.equal((await vars1(C(`float f = strtof("0.1", NULL);`))).f, Math.fround(0.1));
  assert.equal(await out1(C(`printf("%f", strtof("0.5", NULL));`)), "0.500000");
  assert.equal(await out1(C(`printf("%f", (double)strtold("1.25", NULL));`)), "1.250000");
});
test("B6-stdlib strtod endptr: 残りの先頭を指す", async () => {
  // gcc 実測: strtod("2.5e1!") の endptr は '!' を指す。
  assert.equal(await out1(C(`char *e; double d = strtod("2.5e1!", &e); printf("%c", *e);`)), "!");
  assert.equal(await out1(C(`char *e; double d = strtod("abc", &e); printf("%f %c", d, *e);`)), "0.000000 a");
});

/* ---------- strtol 系: 基数判定・符号・空白・endptr ---------- */
test("B6-stdlib strtol: 基数0の自動判定（gcc 実測）", async () => {
  assert.equal(await out1(C(`printf("%d", (int)strtol("0x1F", NULL, 0));`)), "31");
  assert.equal(await out1(C(`printf("%d", (int)strtol("010", NULL, 0));`)), "8");
  assert.equal(await out1(C(`printf("%d", (int)strtol("42", NULL, 0));`)), "42");
  assert.equal(await out1(C(`printf("%d", (int)strtol("-0x10", NULL, 0));`)), "-16");
  // "08" は 8進として 0 だけ変換し、endptr は '8' を指す（gcc 実測）。
  assert.equal(await out1(C(`char *e; long v = strtol("08", &e, 0); printf("%d %c", (int)v, *e);`)), "0 8");
  // "0x" だけでは接頭辞は消費されず endptr は 'x' を指す（gcc 実測）。
  assert.equal(await out1(C(`char *e; long v = strtol("0x", &e, 0); printf("%d %c", (int)v, *e);`)), "0 x");
});
test("B6-stdlib strtol: 明示基数と空白・符号", async () => {
  assert.equal(await out1(C(`printf("%d", (int)strtol("ff", NULL, 16));`)), "255");
  assert.equal(await out1(C(`printf("%d", (int)strtol("101", NULL, 2));`)), "5");
  assert.equal(await out1(C(`printf("%d", (int)strtol("z", NULL, 36));`)), "35");
  assert.equal(await out1(C(`printf("%d", (int)strtol("  -101", NULL, 0));`)), "-101");
  assert.equal(await out1(C(`printf("%d", (int)strtol("+42", NULL, 10));`)), "42");
  await expectError(C(`long v = strtol("10", NULL, 37);`), /基数は 0 または 2〜36/, "未定義動作");
  await expectError(C(`long v = strtol("10", NULL, 1);`), /基数は 0 または 2〜36/, "未定義動作");
});
test("B6-stdlib strtol endptr: &p 書き戻しの同期", async () => {
  // gcc 実測: "42abc" の endptr は 'a'（オフセット2）を指す。
  const v = await vars1(C(`char *e; long x = strtol("42abc", &e, 10);`));
  assert.equal(v.x, 42);
  assert.equal(v.e.offset, 2);
  assert.equal(await out1(C(`char *e; long x = strtol("42abc", &e, 10); printf("%c", *e);`)), "a");
  // 変換なし: 値は 0 で endptr は元の先頭（空白・符号も含む）を指す。
  assert.equal(await out1(C(`char buf[8] = "abc"; char *e; long x = strtol(buf, &e, 10); printf("%d %c", (int)x, *e);`)), "0 a");
  // 末尾まで変換: endptr はヌル文字を指す。
  assert.equal(await out1(C(`char *e; long x = strtol("42", &e, 10); printf("%d", *e);`)), "0");
  // char 配列変数を渡す形でも endptr は同じオブジェクト内を指す。
  assert.equal(await out1(C(`char buf[8] = "12x"; char *e; long x = strtol(buf, &e, 10); printf("%d %c", (int)x, *e);`)), "12 x");
  // NULL は完全対応（書き戻しなしで動作する）。
  assert.equal(await out1(C(`printf("%d", (int)strtol("7", NULL, 10));`)), "7");
});
test("B6-stdlib strtol 系: あふれのクランプと精度規則", async () => {
  // long の範囲内（int を超える値）はそのまま返る（gcc 実測 2147483648）。
  assert.equal((await vars1(C(`long v = strtol("2147483648", NULL, 10);`))).v, 2147483648);
  assert.equal((await vars1(C(`long long v = strtoll("3000000000", NULL, 10);`))).v, 3000000000);
  // クランプ先の LONG_MAX / ULONG_MAX は安全整数範囲外のため、
  // エンジンの既存規則どおり「未確認」で停止する（gcc 実測では
  // 9223372036854775807 / 18446744073709551615 にクランプされる）。
  await expectError(C(`long v = strtol("99999999999999999999999999", NULL, 10);`), /安全に計算できる範囲外/, "未確認");
  await expectError(C(`long v = strtol("-99999999999999999999999999", NULL, 10);`), /安全に計算できる範囲外/, "未確認");
  await expectError(C(`unsigned long v = strtoul("-1", NULL, 10);`), /安全に計算できる範囲外/, "未確認");
  await expectError(C(`unsigned long long v = strtoull("18446744073709551615", NULL, 10);`), /安全に計算できる範囲外/, "未確認");
  assert.equal((await vars1(C(`unsigned long v = strtoul("42", NULL, 10);`))).v, 42);
  assert.equal((await vars1(C(`unsigned long long v = strtoull("123", NULL, 10);`))).v, 123);
});
test("B6-stdlib strtoimax/strtoumax/imaxabs（<inttypes.h>）", async () => {
  const inc = "#include <stdio.h>\n#include <stdlib.h>\n#include <inttypes.h>";
  assert.equal((await vars1(C(`long long v = strtoimax("-123", NULL, 10);`, inc))).v, -123);
  assert.equal((await vars1(C(`unsigned long long v = strtoumax("123", NULL, 10);`, inc))).v, 123);
  assert.equal(await out1(C(`printf("%d", (int)imaxabs(-7));`, inc)), "7");
});

/* ---------- labs / llabs ---------- */
test("B6-stdlib labs/llabs: 典型・浮動小数点変換・組み合わせ", async () => {
  assert.equal(await out1(C(`printf("%d", (int)labs(-5L));`)), "5");
  assert.equal(await out1(C(`printf("%d", (int)labs(5L));`)), "5");
  // long はモデルでは64ビット: -2147483648 の絶対値は 2147483648。
  assert.equal((await vars1(C(`long v = labs(-2147483648L);`))).v, 2147483648);
  assert.equal((await vars1(C(`long long v = llabs(-5000000000LL);`))).v, 5000000000);
  // 浮動小数点引数は対象型へ変換（切り捨て）されてから絶対値（gcc 実測 5）。
  assert.equal(await out1(C(`printf("%d", (int)labs(-5.9));`)), "5");
});

/* ---------- rand / srand ---------- */
test("B6-stdlib rand/srand: 実行時に決まる値のモデル", async () => {
  // srand は種を受け取るのみで、後続は通常どおり進む。
  assert.equal(await out1(C(`srand(42); printf("ok");`)), "ok");
  // rand の戻り値は未確定値として伝播し、分岐は両経路を探索する
  // （エンジンの未確定値の標準動作。実物の値は常に 0 以上）。
  const r = await run(C(`int x = rand(); if (x >= 0) printf("nonneg"); else printf("neg");`));
  assert.deepEqual(errors(r), []);
  assert.equal(r.paths.length, 2);
  // 未確定値は他の関数の入力でも捏造されず伝播する。
  const v = await vars1(C(`long x = labs(rand());`));
  assert.equal(v.x.kind, "unknown");
});

/* ---------- malloc / calloc / realloc / free / aligned_alloc ---------- */
test("B6-stdlib malloc: 書き込み・読み出し・文字列化", async () => {
  assert.equal(await out1(C(`char *m = malloc(4); m[0] = 'A'; m[1] = 'B'; m[2] = 0; printf("%s", m);`)), "AB");
  assert.equal(await out1(C(`int *p = malloc(8); *p = 42; printf("%d", *p);`)), "42");
  // 未初期化要素の読み取りは未定義動作（配列の未初期化要素と同じ）。
  await expectError(C(`char *m = malloc(4); printf("%d", m[0]);`), /未初期化/, "未定義動作");
  // 上限 16,777,216 超の要求は NULL（モデル裁定。gcc では成功する）。
  assert.equal(await out1(C(`char *m = malloc(16777217); printf("%d", m == NULL);`)), "1");
  // 非NULLポインタと NULL の比較はエンジン本体が未対応のため、
  // 真偽判定（ポインタを条件に置く形）で非NULLを確認する。
  assert.equal(await out1(C(`char *m = malloc(0); if (m) printf("nonnull"); else printf("null");`)), "nonnull");
});
test("B6-stdlib calloc: ゼロ初期化", async () => {
  assert.equal(await out1(C(`char *p = calloc(4, 1); printf("%d%d%d%d", p[0], p[1], p[2], p[3]);`)), "0000");
  assert.equal(await out1(C(`int *p = calloc(3, 4); printf("%d%d", p[0], p[2]);`)), "00");
  assert.equal(await out1(C(`char *p = calloc(16777217, 1); printf("%d", p == NULL);`)), "1");
});
test("B6-stdlib free: 解放後の参照・二重解放・NULL・内部ポインタ", async () => {
  assert.equal(await out1(C(`char *m = malloc(2); free(m); printf("ok");`)), "ok");
  assert.equal(await out1(C(`free(NULL); printf("ok");`)), "ok");
  await expectError(C(`char *m = malloc(2); m[0] = 'x'; free(m); printf("%c", m[0]);`), /寿命の切れた/, "未定義動作");
  await expectError(C(`char *m = malloc(2); free(m); free(m);`), /二重解放/, "未定義動作");
  await expectError(C(`char *m = malloc(4); free(m + 1);`), /先頭でない/, "未定義動作");
});
test("B6-stdlib realloc: 内容保持・NULL・0・旧ポインタ無効化", async () => {
  assert.equal(await out1(C(`char *m = malloc(2); m[0] = 'x'; m[1] = 'y'; m = realloc(m, 4); printf("%c%c", m[0], m[1]);`)), "xy");
  assert.equal(await out1(C(`char *m = realloc(NULL, 4); m[0] = 'z'; printf("%c", m[0]);`)), "z");
  assert.equal(await out1(C(`char *m = malloc(2); m = realloc(m, 0); printf("%d", m == NULL);`)), "1");
  // 拡張分は未初期化。
  await expectError(C(`char *m = malloc(1); m[0] = 'a'; m = realloc(m, 3); printf("%d", m[2]);`), /未初期化/, "未定義動作");
  // realloc 後、旧ポインタ経由の参照は寿命切れとして停止する。
  await expectError(C(`char *m = malloc(2); char *old = m; m = realloc(m, 4); printf("%c", old[0]);`), /寿命の切れた/, "未定義動作");
  // 上限超は NULL を返し、旧領域は維持される。
  assert.equal(await out1(C(`char *m = malloc(2); m[0] = 'q'; char *r = realloc(m, 16777217); printf("%d %c", r == NULL, m[0]);`)), "1 q");
});
test("B6-stdlib aligned_alloc: 正常系と不正アラインメント", async () => {
  assert.equal(await out1(C(`char *p = aligned_alloc(16, 32); p[0] = 1; printf("%d", p[0]);`)), "1");
  // 2の冪でないアラインメントは NULL（モデルの規則）。
  assert.equal(await out1(C(`char *p = aligned_alloc(3, 32); printf("%d", p == NULL);`)), "1");
  assert.equal(await out1(C(`char *p = aligned_alloc(16, 16777217); printf("%d", p == NULL);`)), "1");
});

/* ---------- assert ---------- */
test("B6-stdlib assert: 真は通過、偽は停止、未確定は伝播", async () => {
  const inc = "#include <stdio.h>\n#include <assert.h>";
  assert.equal(await out1(C(`assert(1); printf("ok");`, inc)), "ok");
  assert.equal(await out1(C(`int n = 3; assert(n == 3); printf("ok");`, inc)), "ok");
  await expectError(C(`assert(0); printf("ng");`, inc), /アサーションに失敗しました/);
  await expectError(C(`int n = 3; assert(n == 4);`, inc), /アサーションに失敗しました/);
  // 真偽が確定しない式は捏造せず、そのまま通過させる。
  assert.equal(await out1(C(`assert(rand() >= 0); printf("done");`, "#include <stdio.h>\n#include <stdlib.h>\n#include <assert.h>")), "done");
});

/* ---------- difftime ---------- */
test("B6-stdlib difftime: 差を double で返す", async () => {
  const inc = "#include <stdio.h>\n#include <time.h>";
  assert.equal(await out1(C(`printf("%f", difftime(100, 40));`, inc)), "60.000000");
  assert.equal(await out1(C(`printf("%f", difftime(40, 100));`, inc)), "-60.000000");
  assert.equal((await vars1(C(`double d = difftime(10, 7);`, inc))).d, 3);
});

/* ---------- リファレンス項目の検証 ---------- */
test("B6-stdlib reference: 全項目 supported で example が実行できる", async () => {
  assert.equal(refItems.length, 25);
  for (const item of refItems) {
    assert.equal(item.status, "supported", item.name);
    const r = await run(item.example);
    assert.deepEqual(errors(r), [], `${item.name}: ${JSON.stringify(errors(r))}`);
  }
});
