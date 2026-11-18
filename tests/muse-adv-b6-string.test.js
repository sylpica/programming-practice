// 高度モード（ブロックB6）C班2（string/ctype）の回帰テスト。
// 対象は <string.h> 基本22件と <ctype.h> 14件の意味論実装
// （js/types/c/lib-string-advanced.js）と高度差分リファレンス
// （ref-string-advanced.js）。期待値は gcc 13.3.0 実走で裏付けた。
// strcmp/strncmp/memcmp の戻り値の絶対値は、配列経由の実走で
// 「最初に異なるバイト同士の符号なし差」になることを確認した
// ケースで検証する（文字列リテラル経由では glibc の別経路が
// 符号のみを返す場合があるため、絶対値の検証は配列で行う）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { applyAdvancedEngine } from "../js/types/c/advanced-engine.js";
import { cAdvanced } from "./helpers-b6.mjs";
applyAdvancedEngine(getDefinition("c"));

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
const out1 = async (code) => (await first(code)).outputs.map((o) => o.text).join("");
const expectError = async (code, pattern, category) => {
  const r = await run(code);
  const errs = errors(r);
  assert.ok(
    errs.some((e) => pattern.test(e) && (!category || e.startsWith(category + ":"))),
    `${code} -> ${JSON.stringify(errs)}`,
  );
};

/* ---------- memcpy ---------- */
test("B6S memcpy: typical element copy (int, 8 bytes = 2 elements)", async () => {
  // gcc 実測: memcpy(dst, src, 8) で int 配列は先頭2要素だけコピーされる。
  assert.equal(
    await out1(`int src[3] = {10, 20, 30}; int dst[3] = {0, 0, 0}; memcpy(dst, src, 8); printf("%d %d %d", dst[0], dst[1], dst[2]);`),
    "10 20 0",
  );
  assert.equal(
    await out1(`short a[3] = {1, 2, 3}; short b[3] = {0, 0, 0}; memcpy(b, a, 4); printf("%d %d %d", b[0], b[1], b[2]);`),
    "1 2 0",
  );
  assert.equal(
    await out1(`unsigned char u[4] = {1, 2, 3, 4}; unsigned char v[4] = {0, 0, 0, 0}; memcpy(v, u, 3); printf("%d %d %d %d", v[0], v[1], v[2], v[3]);`),
    "1 2 3 0",
  );
  // 戻り値は dest ポインタ。
  assert.equal(
    await out1(`char a[4] = {'a', 'b', 'c', 'd'}; char d[8]; char *r = memcpy(d, a, 4); printf("%c%c", r[0], r[3]);`),
    "ad",
  );
});
test("B6S memcpy: boundary (0 bytes) and abnormal cases", async () => {
  assert.equal(
    await out1(`int a[2] = {1, 2}; int b[2] = {7, 8}; memcpy(b, a, 0); printf("%d %d", b[0], b[1]);`),
    "7 8",
  );
  // 要素幅で割り切れないバイト数は未対応。
  await expectError(`int a[2] = {1, 2}; int b[2] = {0, 0}; memcpy(b, a, 3);`, /割り切れない/, "未対応");
  // 要素型の異なるオブジェクト間は未対応。
  await expectError(`int a[2] = {1, 2}; char b[8]; memcpy(b, a, 4);`, /要素型の異なる/, "未対応");
  // 範囲を超えるコピーは未定義動作。
  await expectError(`int a[2] = {1, 2}; int b[2] = {0, 0}; memcpy(b, a, 12);`, /範囲を超える/, "未定義動作");
  // 重なる memcpy は未定義動作。
  await expectError(`char buf[8] = "abcdef"; memcpy(buf + 1, buf, 3);`, /重なる/, "未定義動作");
  // 引数の個数。
  await expectError(`int a[1] = {1}; int b[1] = {0}; memcpy(b, a);`, /引数を3つ/, "CompileError");
});

/* ---------- memmove ---------- */
test("B6S memmove: overlapping copies in both directions", async () => {
  // gcc 実測: "abcdef" の先頭4文字を +2 へ動かすと "ababcd"。
  assert.equal(
    await out1(`char buf[8] = "abcdef"; memmove(buf + 2, buf, 4); printf("%s", buf);`),
    "ababcd",
  );
  // gcc 実測: 逆方向は "cdefef"。
  assert.equal(
    await out1(`char buf[8] = "abcdef"; memmove(buf, buf + 2, 4); printf("%s", buf);`),
    "cdefef",
  );
  await expectError(`int a[2] = {1, 2}; int b[2] = {0, 0}; memmove(b, a, 3);`, /割り切れない/, "未対応");
});

/* ---------- strcpy / strcat ---------- */
test("B6S strcpy: typical, return value, empty string", async () => {
  assert.equal(await out1(`char buf[16]; strcpy(buf, "hi"); printf("%s", buf);`), "hi");
  assert.equal(
    await out1(`char buf[16] = "ab"; char *r = strcpy(buf, "xy"); printf("%s %s", r, buf);`),
    "xy xy",
  );
  assert.equal(await out1(`char buf[4] = "abc"; strcpy(buf, ""); printf("[%s] %d", buf, buf[0]);`), "[] 0");
  // オフセット付きの宛先。
  assert.equal(await out1(`char buf[8] = "abc"; strcpy(buf + 1, "xy"); printf("%s", buf);`), "axy");
});
test("B6S strcpy: overflow stops as undefined behavior", async () => {
  await expectError(`char buf[4]; strcpy(buf, "toolong");`, /範囲を超える/, "未定義動作");
  await expectError(`strcpy("abc", "x");`, /文字列リテラルへの書き込み/, "未定義動作");
});
test("B6S strcat: typical, empty append, overflow and unterminated dest", async () => {
  assert.equal(await out1(`char buf[16] = "ab"; strcat(buf, "cd"); printf("%s", buf);`), "abcd");
  assert.equal(await out1(`char buf[8] = "ab"; strcat(buf, ""); printf("%s %d", buf, (int)strlen(buf));`), "ab 2");
  await expectError(`char buf[5] = "ab"; strcat(buf, "cdef");`, /範囲を超える/, "未定義動作");
  await expectError(`char buf[3] = {'a', 'b', 'c'}; strcat(buf, "x");`, /終端のヌル文字がありません/, "未定義動作");
});

/* ---------- strncpy / strncat ---------- */
test("B6S strncpy: NUL padding and truncation without terminator (gcc-verified)", async () => {
  // gcc 実測: strncpy(d, "ab", 5) は d[2..4] を 0 で埋め、d[5] は元のまま。
  assert.equal(
    await out1(`char buf[8]; strncpy(buf, "ab", 5); printf("%s %d %d %d", buf, buf[2], buf[3], buf[4]);`),
    "ab 0 0 0",
  );
  // gcc 実測: src が n 以上なら終端ヌルは書かれない。
  assert.equal(
    await out1(`char buf[8]; strncpy(buf, "abcdefgh", 3); printf("%d %d %d", buf[0], buf[1], buf[2]);`),
    "97 98 99",
  );
  // ヌル終端の無い src から n 文字だけ読むのは定義済み（gcc 実測）。
  assert.equal(
    await out1(`char src[3] = {'a', 'b', 'c'}; char buf[8]; strncpy(buf, src, 3); printf("%c%c%c", buf[0], buf[1], buf[2]);`),
    "abc",
  );
  await expectError(`char buf[4]; strncpy(buf, "ab", 5);`, /範囲を超える/, "未定義動作");
});
test("B6S strncat: appends at most n chars and always terminates (gcc-verified)", async () => {
  assert.equal(await out1(`char buf[16] = "ab"; strncat(buf, "cdef", 2); printf("%s", buf);`), "abcd");
  // gcc 実測: n が src より大きくても src 全体＋ヌルで止まる。
  assert.equal(await out1(`char buf[16] = "ab"; strncat(buf, "cdef", 10); printf("%s", buf);`), "abcdef");
  // gcc 実測: n=0 でも終端ヌルは維持される。
  assert.equal(await out1(`char buf[16] = "ab"; strncat(buf, "cdef", 0); printf("%s %d", buf, buf[2]);`), "ab 0");
  await expectError(`char buf[6] = "ab"; strncat(buf, "cdef", 4);`, /範囲を超える/, "未定義動作");
});

/* ---------- strcmp family ---------- */
test("B6S strcmp: glibc-style unsigned byte differences (gcc-verified on arrays)", async () => {
  assert.equal(await out1(`char a[8] = "abc"; char b[8] = "abd"; printf("%d", strcmp(a, b));`), "-1");
  assert.equal(await out1(`char a[8] = "abd"; char b[8] = "abc"; printf("%d", strcmp(a, b));`), "1");
  // gcc 実測（配列）: "ab" vs "abc" は 0 - 'c' = -99。
  assert.equal(await out1(`char a[8] = "ab"; char b[8] = "abc"; printf("%d", strcmp(a, b));`), "-99");
  // gcc 実測（配列）: 'B'(66) - 'a'(97) = -31。
  assert.equal(await out1(`char a[8] = "B"; char b[8] = "a"; printf("%d", strcmp(a, b));`), "-31");
  assert.equal(await out1(`printf("%d", strcmp("same", "same"));`), "0");
  assert.equal(await out1(`printf("%d", strcmp("", ""));`), "0");
  await expectError(`printf("%d", strcmp("a"));`, /引数を2つ/, "CompileError");
});
test("B6S strncmp / strcoll: bounded compare and C-locale collation", async () => {
  assert.equal(await out1(`printf("%d", strncmp("abc", "abd", 2));`), "0");
  assert.equal(await out1(`printf("%d", strncmp("abc", "abd", 3));`), "-1");
  assert.equal(await out1(`char a[8] = "ab"; char b[8] = "abc"; printf("%d", strncmp(a, b, 3));`), "-99");
  assert.equal(await out1(`printf("%d", strncmp("abc", "xyz", 0));`), "0");
  assert.equal(await out1(`printf("%d", strcoll("abc", "abd"));`), "-1");
  assert.equal(await out1(`printf("%d", strcoll("abc", "abc"));`), "0");
});
test("B6S memcmp: byte compare including embedded NUL (gcc-verified)", async () => {
  // gcc 実測: {1,2,3,4} vs {1,2,9,4} は 3 - 9 = -6。
  assert.equal(
    await out1(`char a[4] = {1, 2, 3, 4}; char b[4] = {1, 2, 9, 4}; printf("%d", memcmp(a, b, 4));`),
    "-6",
  );
  // 途中のヌルでも止まらない: {1,0,3} vs {1,0,4} は -1。
  assert.equal(
    await out1(`char a[3] = {1, 0, 3}; char b[3] = {1, 0, 4}; printf("%d", memcmp(a, b, 3));`),
    "-1",
  );
  // gcc 実測（配列）: 200 vs 100 は符号なし差 100。
  assert.equal(
    await out1(`unsigned char a[1] = {200}; unsigned char b[1] = {100}; printf("%d", memcmp(a, b, 1));`),
    "100",
  );
  assert.equal(await out1(`printf("%d", memcmp("abc", "abd", 0));`), "0");
  assert.equal(await out1(`printf("%d", memcmp("abc", "abc", 3));`), "0");
  // int オブジェクトは未対応。
  await expectError(`int a[2] = {1, 2}; int b[2] = {1, 2}; printf("%d", memcmp(a, b, 4));`, /のみ対応/, "未対応");
  // 範囲を超える比較は未定義動作。
  await expectError(`char a[2] = {'x', 'y'}; char b[2] = {'x', 'y'}; printf("%d", memcmp(a, b, 5));`, /範囲外/, "未定義動作");
});

/* ---------- strxfrm ---------- */
test("B6S strxfrm: identity transform in C locale, length query, glibc truncation", async () => {
  assert.equal(
    await out1(`char buf[16]; int n = strxfrm(buf, "abc", 16); printf("%s %d", buf, n);`),
    "abc 3",
  );
  // gcc 実測: dest=NULL, n=0 で必要長だけを返す。
  assert.equal(await out1(`int n = strxfrm(NULL, "abcdef", 0); printf("%d", n);`), "6");
  // gcc 実測: n=3 で長さ6の文字列は a,b,c の3文字が書かれヌルは付かない。
  assert.equal(
    await out1(`char buf[16]; int n = strxfrm(buf, "abcdef", 3); printf("%d %d %d %d", n, buf[0], buf[1], buf[2]);`),
    "6 97 98 99",
  );
  assert.equal(await out1(`char buf[16]; int n = strxfrm(buf, "", 16); printf("%d %d", n, buf[0]);`), "0 0");
  await expectError(`int n = strxfrm(NULL, "abc", 3);`, /NULL/, "未定義動作");
});

/* ---------- search functions ---------- */
test("B6S strchr/strrchr: found, terminator, conversion and NULL", async () => {
  assert.equal(await out1(`char buf[8] = "abcdef"; printf("%s", strchr(buf, 'd'));`), "def");
  assert.equal(await out1(`char buf[16] = "a/b/c"; printf("%s", strrchr(buf, '/'));`), "/c");
  // gcc 実測: 終端ヌルの検索はヌルへのポインタを返す（%s で空、
  // 逆参照で 0。ポインタ同士の == 比較はエンジン側の未対応形式の
  // ため、指す先の値で位置を裏付ける）。
  assert.equal(await out1(`char buf[8] = "abc"; char *p = strchr(buf, 0); printf("[%s] %d", p, *p);`), "[] 0");
  assert.equal(await out1(`char buf[8] = "abc"; printf("%d %d", strchr(buf, 'x') == NULL, strrchr(buf, 'x') == NULL);`), "1 1");
  // gcc 実測: 321 は char 変換で 'A'(65) として探す。
  assert.equal(await out1(`char buf[8] = "aAb"; printf("%s", strchr(buf, 321));`), "Ab");
  // 文字列リテラルからも探せる。
  assert.equal(await out1(`char *p = strchr("abc", 'b'); printf("%s", p);`), "bc");
});
test("B6S memchr: found, NUL byte, conversion and miss", async () => {
  assert.equal(await out1(`char buf[8] = "abcdef"; char *p = memchr(buf, 'd', 6); printf("%s", p);`), "def");
  // gcc 実測: ヌルバイトも探せる（範囲内のヌルは終端の1つだけで、
  // その手前は 'f'。逆参照の値で位置を裏付ける）。
  assert.equal(await out1(`char buf[8] = "abcdef"; char *p = memchr(buf, 0, 8); printf("%d %c", *p, *(p - 1));`), "0 f");
  assert.equal(await out1(`char buf[8] = "abcdef"; printf("%d", memchr(buf, 'z', 6) == NULL);`), "1");
  // n の範囲内だけを探す。
  assert.equal(await out1(`char buf[8] = "abcdef"; printf("%d", memchr(buf, 'd', 3) == NULL);`), "1");
  // int オブジェクトは未対応。
  await expectError(`int a[2] = {1, 2}; memchr(a, 1, 4);`, /のみ対応/, "未対応");
});
test("B6S strstr/strpbrk/strspn/strcspn", async () => {
  assert.equal(await out1(`char buf[16] = "hello"; printf("%s", strstr(buf, "ll"));`), "llo");
  assert.equal(await out1(`char buf[16] = "hello world"; printf("%s", strstr(buf, "world"));`), "world");
  // gcc 実測: 空の needle は haystack 自体を返す（先頭から読める）。
  assert.equal(await out1(`char buf[8] = "abc"; printf("%s", strstr(buf, ""));`), "abc");
  assert.equal(await out1(`char buf[8] = "abc"; printf("%d", strstr(buf, "z") == NULL);`), "1");
  assert.equal(await out1(`char buf[8] = "abc"; printf("%s", strpbrk(buf, "xb"));`), "bc");
  assert.equal(await out1(`char buf[8] = "abc"; printf("%d", strpbrk(buf, "xyz") == NULL);`), "1");
  // gcc 実測: strspn("aabca","ab")=3、strcspn("aabca","c")=3。
  assert.equal(await out1(`int n = strspn("aabca", "ab"); int m = strcspn("aabca", "c"); printf("%d %d", n, m);`), "3 3");
  assert.equal(await out1(`int n = strspn("xyz", "ab"); int m = strcspn("xyz", "ab"); printf("%d %d", n, m);`), "0 3");
  assert.equal(await out1(`int n = strspn("", "ab"); int m = strcspn("", "ab"); printf("%d %d", n, m);`), "0 0");
});

/* ---------- strtok ---------- */
test("B6S strtok: sequential tokens, delimiter rewrite, delimiter change (gcc-verified)", async () => {
  assert.equal(
    await out1(`char buf[16] = "a,b,c"; char *t = strtok(buf, ","); printf("%s", t); t = strtok(NULL, ","); printf("%s", t); t = strtok(NULL, ","); printf("%s", t); t = strtok(NULL, ","); printf("%d", t == NULL);`),
    "abc1",
  );
  // gcc 実測: "  a,b,,c " を ", " で割ると a, b, c。区切り位置は
  // ヌルに書き換わる（buf[3] と buf[5] が 0）。
  assert.equal(
    await out1(`char buf[16] = "  a,b,,c "; char *t = strtok(buf, ", "); printf("[%s]", t); t = strtok(NULL, ", "); printf("[%s]", t); t = strtok(NULL, ", "); printf("[%s]", t); printf(" %d %d", buf[3], buf[5]);`),
    "[a][b][c] 0 0",
  );
  // gcc 実測: 途中で区切り集合を変えられる。
  assert.equal(
    await out1(`char buf[16] = "a,b;c"; char *t = strtok(buf, ","); printf("%s ", t); t = strtok(NULL, ";"); printf("%s ", t); t = strtok(NULL, ";"); printf("%s", t);`),
    "a b c",
  );
  // 連続区切りだけの文字列はトークンなし。
  assert.equal(
    await out1(`char buf[8] = ",,,"; char *t = strtok(buf, ","); printf("%d", t == NULL);`),
    "1",
  );
  // 文字列リテラルは書き換えられないため未定義動作。
  await expectError(`char *t = strtok("a,b", ",");`, /文字列リテラル/, "未定義動作");
});

/* ---------- memset ---------- */
test("B6S memset: char fill, zero fill of numeric arrays, unsupported cases", async () => {
  assert.equal(await out1(`char buf[8]; memset(buf, 'A', 3); buf[3] = 0; printf("%s", buf);`), "AAA");
  // gcc 実測: 0xAB で埋めた unsigned char は 171。
  assert.equal(await out1(`unsigned char u[4]; memset(u, 171, 4); printf("%d %d", u[0], u[3]);`), "171 171");
  // gcc 実測: int 配列の 0 埋め。
  assert.equal(await out1(`int a[2] = {5, 6}; memset(a, 0, 8); printf("%d %d", a[0], a[1]);`), "0 0");
  assert.equal(await out1(`char buf[4] = "abc"; memset(buf, 0, 4); printf("%d %d", buf[0], buf[3]);`), "0 0");
  // 非 char への非0バイトは未対応。
  await expectError(`int a[2] = {1, 2}; memset(a, 1, 8);`, /バイト値 0 のみ/, "未対応");
  // 要素幅で割り切れないバイト数は未対応。
  await expectError(`int a[2] = {1, 2}; memset(a, 0, 6);`, /割り切れない/, "未対応");
  // 範囲超過は未定義動作。
  await expectError(`char buf[4]; memset(buf, 'A', 5);`, /範囲を超える/, "未定義動作");
});

/* ---------- strerror / strlen ---------- */
test("B6S strerror: glibc messages and unknown numbers", async () => {
  assert.equal(await out1(`printf("%s", strerror(0));`), "Success");
  assert.equal(await out1(`printf("%s", strerror(1));`), "Operation not permitted");
  assert.equal(await out1(`printf("%s", strerror(2));`), "No such file or directory");
  assert.equal(await out1(`printf("%s", strerror(13));`), "Permission denied");
  assert.equal(await out1(`printf("%s", strerror(22));`), "Invalid argument");
  // glibc 実測: 未知の番号は "Unknown error n"。
  assert.equal(await out1(`printf("%s", strerror(9999));`), "Unknown error 9999");
  assert.equal(await out1(`printf("%s", strerror(-1));`), "Unknown error -1");
  // 戻り値を char* 変数で受けても使える。
  assert.equal(await out1(`char *m = strerror(2); printf("%s", m);`), "No such file or directory");
});
test("B6S strlen: pointer, literal, empty, and abnormal arguments", async () => {
  assert.equal(await out1(`int n = strlen("hello"); printf("%d", n);`), "5");
  assert.equal(await out1(`char buf[8] = "abc"; int n = strlen(buf); printf("%d", n);`), "3");
  assert.equal(await out1(`int n = strlen(""); printf("%d", n);`), "0");
  assert.equal(await out1(`char buf[8] = "abc"; printf("%d", buf[strlen(buf)]);`), "0");
  await expectError(`char *p = NULL; printf("%d", strlen(p));`, /NULL/, "未定義動作");
  await expectError(`printf("%d", strlen(42));`, /文字列へのポインタ/, "CompileError");
});

/* ---------- ctype ---------- */
test("B6S ctype classifications: typical and boundary values (gcc-verified truth table)", async () => {
  const cases = [
    ["isalnum", "'a'", 1], ["isalnum", "'8'", 1], ["isalnum", "'!'", 0], ["isalnum", "-1", 0],
    ["isalpha", "'Z'", 1], ["isalpha", "'1'", 0],
    ["isblank", "' '", 1], ["isblank", "'\\t'", 1], ["isblank", "'\\n'", 0],
    ["iscntrl", "0", 1], ["iscntrl", "31", 1], ["iscntrl", "127", 1], ["iscntrl", "' '", 0],
    ["isdigit", "'7'", 1], ["isdigit", "'a'", 0],
    ["isgraph", "'!'", 1], ["isgraph", "' '", 0], ["isgraph", "127", 0],
    ["islower", "'a'", 1], ["islower", "'A'", 0],
    ["isprint", "' '", 1], ["isprint", "126", 1], ["isprint", "127", 0],
    ["ispunct", "'!'", 1], ["ispunct", "'a'", 0], ["ispunct", "'1'", 0], ["ispunct", "' '", 0],
    ["isspace", "'\\v'", 1], ["isspace", "'\\f'", 1], ["isspace", "'\\r'", 1], ["isspace", "'a'", 0],
    ["isupper", "'A'", 1], ["isupper", "'a'", 0],
    ["isxdigit", "'f'", 1], ["isxdigit", "'F'", 1], ["isxdigit", "'g'", 0],
  ];
  for (const [fn, arg, expected] of cases) {
    assert.equal(await out1(`printf("%d", ${fn}(${arg}));`), String(expected), `${fn}(${arg})`);
  }
  // 変数経由でも判定できる。
  assert.equal(await out1(`char c = 'g'; printf("%d", isxdigit(c));`), "0");
  assert.equal(await out1(`char c = '9'; printf("%d", isalnum(c));`), "1");
});
test("B6S ctype: out-of-range argument stops as undefined behavior", async () => {
  await expectError(`printf("%d", isalpha(256));`, /有効範囲/, "未定義動作");
  await expectError(`printf("%d", isdigit(-2));`, /有効範囲/, "未定義動作");
  await expectError(`printf("%d", isalpha("a"));`, /整数でなければ/, "CompileError");
  await expectError(`printf("%d", isalpha());`, /引数を1つ/, "CompileError");
});
test("B6S tolower/toupper: conversion, non-letters and EOF (gcc-verified)", async () => {
  assert.equal(await out1(`printf("%c %c %c", tolower('A'), tolower('Z'), tolower('a'));`), "a z a");
  assert.equal(await out1(`printf("%c %c %c", toupper('a'), toupper('z'), toupper('A'));`), "A Z A");
  assert.equal(await out1(`printf("%d %d", tolower('1'), toupper('1'));`), "49 49");
  // gcc 実測: EOF(-1) はそのまま返る。
  assert.equal(await out1(`printf("%d %d", tolower(-1), toupper(-1));`), "-1 -1");
  // 組み合わせ: 文字列を走査して大文字化する。
  assert.equal(
    await out1(`char buf[8] = "aBc"; int i = 0; while (buf[i] != 0) { buf[i] = toupper(buf[i]); i++; } printf("%s", buf);`),
    "ABC",
  );
});

/* ---------- combinations ---------- */
test("B6S combination: strcpy + strcat + strcmp + strlen pipeline", async () => {
  assert.equal(
    await out1(`char buf[32]; strcpy(buf, "foo"); strcat(buf, "bar"); printf("%s %d %d", buf, (int)strlen(buf), strcmp(buf, "foobar"));`),
    "foobar 6 0",
  );
  assert.equal(
    await out1(`char a[16]; char b[16]; strcpy(a, "key"); strcpy(b, "key"); printf("%d", strcmp(a, b) == 0 && strlen(a) == strlen(b));`),
    "1",
  );
});

/* ---------- reference items ---------- */
test("B6S reference: all 36 advanced items are supported and their examples run", async () => {
  const d = getDefinition("c");
  const items = cAdvanced.reference.filter((r) =>
    ["memcpy", "memmove", "strcpy", "strncpy", "strcat", "strncat", "memcmp", "strcmp", "strcoll", "strncmp", "strxfrm", "memchr", "strchr", "strcspn", "strpbrk", "strrchr", "strspn", "strstr", "strtok", "memset", "strerror", "strlen",
     "isalnum", "isalpha", "isblank", "iscntrl", "isdigit", "isgraph", "islower", "isprint", "ispunct", "isspace", "isupper", "isxdigit", "tolower", "toupper"].includes(r.name));
  assert.equal(items.length, 36);
  for (const item of items) {
    assert.equal(item.status, "supported", item.name);
    assert.ok(item.source.includes("cppreference"), item.name);
    assert.ok(item.returns, item.name);
    const r = await run(item.example);
    assert.deepEqual(errors(r), [], `${item.name} example: ${JSON.stringify(errors(r))}`);
  }
});
