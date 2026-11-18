// 高度モード ブロックB6・C班3（stdio 側）: sprintf / snprintf /
// sscanf の意味論テスト。期待値は gcc 13.3.0 実走で裏付けた。
// 書式の受理範囲は printf と共有（%d %i %s %f %c %u %% のみ）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { applyAdvancedEngine } from "../js/types/c/advanced-engine.js";
applyAdvancedEngine(getDefinition("c"));
import { referenceAdvanced as refItems } from "../js/types/c/ref-stdio-advanced.js";

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
const C = (body, inc = "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>") =>
  `${inc}\nint main() {\n${body}\n return 0;\n}`;

/* ---------- sprintf ---------- */
test("B6-stdio sprintf: 典型・戻り値・組み合わせ書式", async () => {
  // gcc 実測: sprintf(buf, "%d-%s", 42, "hi") は戻り値 5、buf は "42-hi"。
  assert.equal(await out1(C(`char buf[16]; int r = sprintf(buf, "%d-%s", 42, "hi"); printf("%d %s", r, buf);`)), "5 42-hi");
  assert.equal(await out1(C(`char buf[16]; sprintf(buf, "%f", 1.5); printf("%s", buf);`)), "1.500000");
  assert.equal(await out1(C(`char buf[16]; sprintf(buf, "100%%"); printf("%s", buf);`)), "100%");
  assert.equal(await out1(C(`char buf[16]; sprintf(buf, "%c%c", 'a', 'b'); printf("%s", buf);`)), "ab");
  // 書式を char 配列変数から渡す形も printf と同様に動く。
  assert.equal(await out1(C(`char fmt[8] = "%d"; char buf[8]; sprintf(buf, fmt, 7); printf("%s", buf);`)), "7");
  // ちょうど収まる境界（5文字＋NUL = 6要素）。
  assert.equal(await out1(C(`char buf[6]; int r = sprintf(buf, "12345"); printf("%d %s", r, buf);`)), "5 12345");
  // 宛先が配列の途中を指す場合は残り要素数が基準になる。
  assert.equal(await out1(C(`char buf[8] = "......."; char *p = buf + 5; sprintf(p, "ab"); printf("%s|%s", buf, p);`)), ".....ab|ab");
});
test("B6-stdio sprintf: 配列を超える書き込みは未定義動作", async () => {
  await expectError(C(`char buf[4]; sprintf(buf, "%s", "abcdefgh");`), /宛先の配列を超えています/, "未定義動作");
  await expectError(C(`char buf[6]; sprintf(buf, "123456");`), /宛先の配列を超えています/, "未定義動作");
  // printf と受理範囲を共有する: %x は未対応。
  await expectError(C(`char buf[16]; sprintf(buf, "%x", 1);`), /モデルで扱えません/, "未対応");
});

/* ---------- snprintf ---------- */
test("B6-stdio snprintf: 切り捨てと戻り値（gcc 実測）", async () => {
  // gcc 実測: サイズ8へ "abcdefghij" → 戻り値 10、buf は "abcdefg"。
  assert.equal(await out1(C(`char buf[8]; int r = snprintf(buf, 8, "%s", "abcdefghij"); printf("%d %s", r, buf);`)), "10 abcdefg");
  // gcc 実測: サイズ4へ 12345 → 戻り値 5、buf は "123"。
  assert.equal(await out1(C(`char buf[8]; int r = snprintf(buf, 4, "%d", 12345); printf("%d %s", r, buf);`)), "5 123");
  // サイズ1ではヌル文字だけが書かれる。
  assert.equal(await out1(C(`char buf[8]; int r = snprintf(buf, 1, "%d", 12345); printf("%d [%s]", r, buf);`)), "5 []");
  // サイズ0では何も書かず、戻り値だけが返る（宛先 NULL でも可）。
  assert.equal(await out1(C(`int r = snprintf(NULL, 0, "%d", 12345); printf("%d", r);`)), "5");
  // 切り捨てなしの通常形。
  assert.equal(await out1(C(`char buf[8]; int r = snprintf(buf, sizeof buf, "%d", 42); printf("%d %s", r, buf);`)), "2 42");
  // サイズが残り要素数以下なら、長い指定でも実際の書き込み分だけ。
  assert.equal(await out1(C(`char buf[8]; int r = snprintf(buf, 100, "ab"); printf("%d %s", r, buf);`)), "2 ab");
});
test("B6-stdio snprintf: 残り要素数を超える書き込みは未定義動作", async () => {
  await expectError(C(`char buf[4]; snprintf(buf, 100, "abcdefgh");`), /宛先の配列を超えています/, "未定義動作");
});

/* ---------- sscanf: 基本と戻り値 ---------- */
test("B6-stdio sscanf: 典型の組み合わせ（gcc 実測）", async () => {
  // gcc 実測: "123 4.5 hello X" を "%d %f %s %c" → 戻り値 4。
  const code = C(`int x; float f; char w[16]; char ch; int r = sscanf("123 4.5 hello X", "%d %f %s %c", &x, &f, w, &ch); printf("%d %d %s %c", r, x, w, ch);`);
  assert.equal(await out1(code), "4 123 hello X");
  const v = await vars1(C(`float f; int r = sscanf("4.5", "%f", &f);`));
  assert.equal(v.f, Math.fround(4.5));
  assert.equal(v.r, 1);
  // 入力文字列を char 配列変数から渡す形。
  assert.equal(await out1(C(`char in[16] = "10 20"; int a; int b; int r = sscanf(in, "%d %d", &a, &b); printf("%d %d %d", r, a, b);`)), "2 10 20");
});
test("B6-stdio sscanf: EOF（-1）と照合失敗（0）の区別（gcc 実測）", async () => {
  assert.equal(await out1(C(`int x; int r = sscanf("", "%d", &x); printf("%d", r);`)), "-1");
  assert.equal(await out1(C(`int x; int r = sscanf("   ", "%d", &x); printf("%d", r);`)), "-1");
  assert.equal(await out1(C(`int x; int r = sscanf("abc", "%d", &x); printf("%d", r);`)), "0");
  assert.equal(await out1(C(`int x; int r = sscanf("-", "%d", &x); printf("%d", r);`)), "0");
  // リテラル一致の後に EOF: 代入が無ければ -1（gcc 実測）。
  assert.equal(await out1(C(`int x; int r = sscanf("a", "a%d", &x); printf("%d", r);`)), "-1");
  // 抑止つき変換の後に EOF: 代入が無ければ -1（gcc 実測）。
  assert.equal(await out1(C(`int x; int r = sscanf("5", "%*d%d", &x); printf("%d", r);`)), "-1");
  // 1つ代入した後の EOF は、その個数を返す（gcc 実測）。
  assert.equal(await out1(C(`int x; int y; int r = sscanf("5 ", "%d %d", &x, &y); printf("%d", r);`)), "1");
});
test("B6-stdio sscanf: %i の基数自動判定と %u（gcc 実測）", async () => {
  assert.equal(await out1(C(`int x; int r = sscanf("0x1F", "%i", &x); printf("%d %d", r, x);`)), "1 31");
  assert.equal(await out1(C(`int x; int r = sscanf("010", "%i", &x); printf("%d %d", r, x);`)), "1 8");
  assert.equal(await out1(C(`int x; int r = sscanf("  -0x1A", "%i", &x); printf("%d %d", r, x);`)), "1 -26");
  assert.equal(await out1(C(`int x; int r = sscanf("0x", "%i", &x); printf("%d %d", r, x);`)), "1 0");
  // gcc 実測: "%u" で "-1" → 4294967295（unsigned int への変換）。
  assert.equal(await out1(C(`unsigned int u; int r = sscanf("-1", "%u", &u); printf("%d %u", r, u);`)), "1 4294967295");
  assert.equal(await out1(C(`unsigned int u; int r = sscanf("+12", "%u", &u); printf("%d %u", r, u);`)), "1 12");
});
test("B6-stdio sscanf: %f の諸形（gcc 実測）", async () => {
  assert.equal((await vars1(C(`float f; int r = sscanf("-2.5e2", "%f", &f);`))).f, -250);
  assert.equal((await vars1(C(`float f; int r = sscanf(".5", "%f", &f);`))).f, 0.5);
  assert.equal((await vars1(C(`float f; int r = sscanf("5.", "%f", &f);`))).f, 5);
  assert.equal((await vars1(C(`float f; int r = sscanf("0x10", "%f", &f);`))).f, 16);
  assert.equal((await vars1(C(`double d; int r = sscanf("1e", "%f", &d);`))).r, 1);
  // float 要素へは float 精度へ丸める。
  assert.equal((await vars1(C(`float f; int r = sscanf("0.1", "%f", &f);`))).f, Math.fround(0.1));
});
test("B6-stdio sscanf: 抑止・幅・%%・リテラル（gcc 実測）", async () => {
  assert.equal(await out1(C(`int x; int y; int r = sscanf("10 20 30", "%d %*d %d", &x, &y); printf("%d %d %d", r, x, y);`)), "2 10 30");
  assert.equal(await out1(C(`char w[8]; int r = sscanf("abcdef", "%3s", w); printf("%d %s", r, w);`)), "1 abc");
  // %3c はヌル文字を付けず3文字を読む。入力が2文字なら2文字で成功。
  assert.equal(await out1(C(`char c[4]; int r = sscanf("abcdef", "%3c", c); printf("%d %c%c%c", r, c[0], c[1], c[2]);`)), "1 abc");
  assert.equal(await out1(C(`char c[4]; int r = sscanf("ab", "%3c", c); printf("%d %c%c", r, c[0], c[1]);`)), "1 ab");
  // %c は空白を読み飛ばさない（gcc 実測: 先頭の空白がそのまま入る）。
  assert.equal(await out1(C(`char ch; int r = sscanf(" x", "%c", &ch); printf("%d %d", r, ch);`)), "1 32");
  // %% は代入を数えない。成功しても戻り値は代入個数のまま。
  assert.equal(await out1(C(`int x; int r = sscanf("100%", "%d%%", &x); printf("%d %d", r, x);`)), "1 100");
  assert.equal(await out1(C(`int r = sscanf("%", "%%"); printf("%d", r);`)), "0");
  assert.equal(await out1(C(`int r = sscanf("", "%%"); printf("%d", r);`)), "-1");
  // リテラル一致の要求: 'a' と '=' が一致した上で %d が失敗 → 0。
  assert.equal(await out1(C(`int x; int r = sscanf("a=b", "a=%d", &x); printf("%d", r);`)), "0");
  assert.equal(await out1(C(`int x; int r = sscanf("aXb", "a=%d", &x); printf("%d", r);`)), "0");
  assert.equal(await out1(C(`int x; int r = sscanf("a=5", "a=%d", &x); printf("%d %d", r, x);`)), "1 5");
});
test("B6-stdio sscanf: 代入先の型に合わせた変換と境界", async () => {
  // long 変数へ大きな値。
  assert.equal((await vars1(C(`long x; int r = sscanf("3000000000", "%d", &x);`))).x, 3000000000);
  // char 変数への %c 代入は vars にも同期する。
  assert.equal((await vars1(C(`char ch; int r = sscanf("X", "%c", &ch);`))).ch, 88);
  // %s の書き込みが代入先を超える場合は未定義動作として停止する。
  await expectError(C(`char w[4]; int r = sscanf("abcdef", "%s", w);`), /代入先の配列を超えています/, "未定義動作");
  // 幅で制限すれば収まる。
  assert.equal(await out1(C(`char w[4]; int r = sscanf("abcdef", "%3s", w); printf("%d %s", r, w);`)), "1 abc");
});
test("B6-stdio sscanf: 未対応の変換は正直に停止する", async () => {
  await expectError(C(`int x; int n2; int r = sscanf("12", "%d%n", &x, &n2);`), /%n はモデルで扱えません/, "未対応");
  await expectError(C(`long x; int r = sscanf("12", "%ld", &x);`), /長さ修飾子はモデルで扱えません/, "未対応");
  await expectError(C(`int x; int r = sscanf("12", "%2d", &x);`), /幅指定は %s と %c のみ/, "未対応");
  await expectError(C(`int x; int r = sscanf("12", "%x", &x);`), /%x はモデルで扱えません/, "未対応");
});

/* ---------- リファレンス項目の検証 ---------- */
test("B6-stdio reference: 全項目 supported で example が実行できる", async () => {
  assert.equal(refItems.length, 3);
  for (const item of refItems) {
    assert.equal(item.status, "supported", item.name);
    const r = await run(item.example);
    assert.deepEqual(errors(r), [], `${item.name}: ${JSON.stringify(errors(r))}`);
  }
});
