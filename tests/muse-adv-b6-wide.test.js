// 高度モード ブロックB6・C班4（ワイド文字／変換系）の F-01 テスト。
// 対象: btowc, wctob, isw* 12件, towlower, towupper, wctomb,
// wcrtomb, mblen, mbrlen, c16rtomb, c32rtomb（計22件）。
// 前提はロケール "C" 固定。期待値は gcc 13 系を LC_ALL=C で
// 実走して裏付けた（btowc/wctob の境界、isw* の ASCII 分類、
// wctomb/wcrtomb の EILSEQ、mblen/mbrlen の -1／(size_t)-2、
// c16rtomb/c32rtomb の ASCII のみ成功）。
// (size_t)-1／-2 はモデルでは -1／-2 として返るため、int 変数へ
// 代入した形で観測する。
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
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => (typeof e === "string" ? e : `${e.category}:${e.message}`));
const out1 = async (code) => {
  const r = await run(code);
  assert.deepEqual(errors(r), [], `${code} -> ${JSON.stringify(errors(r))}`);
  return r.paths[0].outputs.map((o) => o.text).join("");
};
const expectError = async (code, pattern, category) => {
  const r = await run(code);
  const errs = errors(r);
  assert.ok(
    errs.some((e) => pattern.test(e) && (!category || e.startsWith(category + ":"))),
    `${code} -> ${JSON.stringify(errs)}`,
  );
};

// [コード, 期待出力]
const CASES = [
  /* ---------- btowc ---------- */
  [`printf("%d", btowc(65));`, "65"], // 典型: 'A'
  [`printf("%d", btowc(0));`, "0"], // 境界: NUL
  [`printf("%d", btowc(127));`, "127"], // 境界: ASCII 上限
  [`printf("%d", btowc(-1));`, "-1"], // 異常: EOF → WEOF
  [`printf("%d", btowc(128));`, "-1"], // 異常: 128 は "C" ロケールで無効
  [`printf("%d", btowc(255));`, "-1"], // 異常: 255 も無効
  [`printf("%d", btowc(256));`, "-1"], // 異常: 範囲外
  /* ---------- wctob ---------- */
  [`printf("%d", wctob(65));`, "65"],
  [`printf("%d", wctob(0));`, "0"],
  [`printf("%d", wctob(127));`, "127"],
  [`printf("%d", wctob(128));`, "-1"], // 1 バイトで表せない → EOF
  [`printf("%d", wctob(-1));`, "-1"], // WEOF → EOF
  [`printf("%d", wctob(12354));`, "-1"], // 'あ' は表せない
  /* ---------- isw* （典型・境界・異常） ---------- */
  [`printf("%d%d%d", iswalpha('a'), iswalpha('Z'), iswalpha('1'));`, "110"],
  [`printf("%d%d", iswalpha(233), iswalpha(-1));`, "00"], // 範囲外・WEOF は 0
  [`printf("%d%d%d", iswalnum('a'), iswalnum('5'), iswalnum('!'));`, "110"],
  [`printf("%d%d%d", iswblank(' '), iswblank('\\t'), iswblank('a'));`, "110"],
  [`printf("%d%d%d", iswcntrl(1), iswcntrl(127), iswcntrl('a'));`, "110"],
  [`printf("%d%d", iswdigit('5'), iswdigit('a'));`, "10"],
  [`printf("%d%d", iswgraph('a'), iswgraph(' '));`, "10"],
  [`printf("%d%d", iswlower('a'), iswlower('A'));`, "10"],
  [`printf("%d%d%d", iswprint('a'), iswprint(' '), iswprint(1));`, "110"],
  [`printf("%d%d", iswpunct('!'), iswpunct('a'));`, "10"],
  [`printf("%d%d%d", iswspace(' '), iswspace('\\t'), iswspace('a'));`, "110"],
  [`printf("%d%d", iswupper('A'), iswupper('a'));`, "10"],
  [`printf("%d%d%d", iswxdigit('f'), iswxdigit('F'), iswxdigit('g'));`, "110"],
  [`printf("%d", iswupper(256));`, "0"], // 範囲外は 0
  /* ---------- towlower / towupper ---------- */
  [`printf("%c", towlower('A'));`, "a"],
  [`printf("%c", towupper('a'));`, "A"],
  [`printf("%d", towlower('1'));`, "49"], // 対象外はそのまま
  [`printf("%d", towlower(256));`, "256"], // 範囲外はそのまま
  [`printf("%d", towupper(256));`, "256"],
  [`printf("%d", towlower(-1));`, "-1"], // WEOF はそのまま
  [`printf("%d", towupper(-1));`, "-1"],
  /* ---------- wctomb ---------- */
  [`char buf[8]; buf[1] = 0; int r = wctomb(buf, 65); printf("%d %s", r, buf);`, "1 A"],
  [`char buf[8]; buf[1] = 0; int r = wctomb(buf, 0); printf("%d", r); printf("[%d]", buf[0]);`, "1[0]"],
  [`char buf[8]; int r = wctomb(buf, 256); printf("%d", r);`, "-1"], // EILSEQ
  [`int r = wctomb(NULL, 65); printf("%d", r);`, "0"], // 状態問い合わせ
  /* ---------- wcrtomb ---------- */
  [`char buf[8]; buf[1] = 0; int r = (int)wcrtomb(buf, 66, NULL); printf("%d %s", r, buf);`, "1 B"],
  [`char buf[8]; int r = (int)wcrtomb(buf, 12354, NULL); printf("%d", r);`, "-1"],
  [`int r = (int)wcrtomb(NULL, 65, NULL); printf("%d", r);`, "1"], // 宛先 NULL は長さのみ
  [`int r = (int)wcrtomb(NULL, 256, NULL); printf("%d", r);`, "-1"],
  /* ---------- c16rtomb / c32rtomb ---------- */
  [`char buf[8]; buf[1] = 0; int r = (int)c16rtomb(buf, 67, NULL); printf("%d %s", r, buf);`, "1 C"],
  [`char buf[8]; int r = (int)c16rtomb(buf, 256, NULL); printf("%d", r);`, "-1"],
  [`char buf[8]; buf[1] = 0; int r = (int)c32rtomb(buf, 68, NULL); printf("%d %s", r, buf);`, "1 D"],
  [`char buf[8]; int r = (int)c32rtomb(buf, 12354, NULL); printf("%d", r);`, "-1"],
  /* ---------- mblen ---------- */
  [`printf("%d", mblen("A", 1));`, "1"],
  [`printf("%d", mblen("", 1));`, "0"], // NUL は 0
  [`printf("%d", mblen(NULL, 0));`, "0"], // 状態問い合わせ
  [`char s[2]; s[0] = 65; s[1] = 0; printf("%d", mblen(s, 1));`, "1"],
  /* ---------- mbrlen ---------- */
  [`printf("%d", mbrlen("A", 1, NULL));`, "1"],
  [`printf("%d", mbrlen("", 1, NULL));`, "0"],
  [`printf("%d", mbrlen(NULL, 0, NULL));`, "0"],
  [`int r = mbrlen("A", 0, NULL); printf("%d", r);`, "-2"], // n=0 は不完全 (size_t)-2
  /* ---------- 組み合わせ ---------- */
  // 文字コードの配列を分類して数える
  [
    `int codes[5] = {65, 49, 32, 97, 33}; int alpha = 0; int digit = 0; int space = 0; for (int i = 0; i < 5; i++) { alpha += iswalpha(codes[i]) ? 1 : 0; digit += iswdigit(codes[i]) ? 1 : 0; space += iswspace(codes[i]) ? 1 : 0; } printf("%d %d %d", alpha, digit, space);`,
    "2 1 1",
  ],
  // towupper で大文字化して char 配列へ入れ、文字列として出す
  [
    `char buf[4]; buf[0] = towupper('a'); buf[1] = towupper('b'); buf[2] = 0; printf("%s", buf);`,
    "AB",
  ],
  // btowc → towlower → wctob の往復
  [`printf("%c", wctob(towlower(btowc(65))));`, "a"],
  // wcrtomb を繰り返して文字列を組み立てる
  [
    `char buf[8]; buf[3] = 0; int a = (int)wcrtomb(buf, 72, NULL); int b = (int)wcrtomb(buf + 1, 105, NULL); int c = (int)wcrtomb(buf + 2, 33, NULL); printf("%d%d%d %s", a, b, c, buf);`,
    "111 Hi!",
  ],
];

for (const [code, expected] of CASES)
  test(`wide F-01: ${code}`, async () => {
    assert.equal(await out1(code), expected);
  });

/* ---------- 異常系: バイト 128..255 は無効（gcc 実測） ---------- */
test("wide F-01 abnormal: mblen/mbrlen reject bytes >= 128 in C locale", async () => {
  assert.equal(
    await out1(`unsigned char s[2]; s[0] = 130; s[1] = 0; printf("%d", mblen(s, 1));`),
    "-1",
  );
  assert.equal(
    await out1(`unsigned char s[2]; s[0] = 130; s[1] = 0; int r = mbrlen(s, 1, NULL); printf("%d", r);`),
    "-1",
  );
  assert.equal(
    await out1(`char s[2]; s[0] = 65; s[1] = 0; printf("%d", mblen(s, 0));`),
    "-1", // n=0 で非 NUL は不完全（gcc 実測）
  );
});

/* ---------- 異常系: 変換状態は NULL のみ ---------- */
test("wide F-01 abnormal: non-NULL mbstate pointer is unsupported", async () => {
  await expectError(
    `char buf[8]; int st; int r = (int)wcrtomb(buf, 65, &st); printf("%d", r);`,
    /変換状態引数は NULL のみ/,
    "未対応",
  );
  await expectError(
    `int st; printf("%d", mbrlen("A", 1, &st));`,
    /変換状態引数は NULL のみ/,
    "未対応",
  );
  await expectError(
    `char buf[8]; int st; int r = (int)c32rtomb(buf, 65, &st); printf("%d", r);`,
    /変換状態引数は NULL のみ/,
    "未対応",
  );
});

/* ---------- 異常系: 引数の個数 ---------- */
test("wide F-01 abnormal: wrong argument counts are compile errors", async () => {
  await expectError(`printf("%d", btowc(65, 66));`, /btowc は引数を1つだけ取ります/, "CompileError");
  await expectError(`printf("%d", iswalpha());`, /iswalpha は引数を1つだけ取ります/, "CompileError");
  await expectError(`char buf[8]; int r = wctomb(buf); printf("%d", r);`, /wctomb は引数を2つだけ取ります/, "CompileError");
});

/* ---------- テンプレート: 全件が最後まで実行でき出力が確定する ---------- */
test("wide F-01: advanced templates run to completion with expected output", async () => {
  const d = getDefinition("c");
  const expected = {
    "c-adv-wide-classify": "2 1 2 1\n",
    "c-adv-wide-case": "abc ABC\n",
    "c-adv-wide-btowc": "65 A\n-1 -1\n",
    "c-adv-wide-wcrtomb": "Hi! 3\n",
    "c-adv-wide-mblen": "1 1 1 A\n",
    "c-adv-wide-uchar": "A B 1 1\n",
    "c-adv-wide-eilseq": "cannot convert\n",
    "c-adv-wide-ident": "1\n",
  };
  assert.equal(cAdvanced.templates.length, 8);
  for (const t of cAdvanced.templates) {
    const r = await run(t.code);
    assert.deepEqual(errors(r), [], `${t.id} -> ${JSON.stringify(errors(r))}`);
    const out = r.paths[0].outputs.map((o) => o.text).join("");
    assert.equal(out, expected[t.id], t.id);
    // refs は基礎＋高度リファレンスに実在する名前だけを指す
    const refNames = new Set([
      ...d.reference.map((x) => x.name),
      ...cAdvanced.reference.map((x) => x.name),
    ]);
    for (const ref of t.refs) assert.ok(refNames.has(ref), `${t.id} の refs: ${ref}`);
  }
});

/* ---------- 用語集: 基礎と重ならず 10 件以上 ---------- */
test("wide F-01: advanced glossary does not overlap the base glossary", async () => {
  const d = getDefinition("c");
  const base = new Set(d.glossary.map(([term]) => term));
  assert.ok(cAdvanced.glossary.length >= 10);
  for (const [term, desc] of cAdvanced.glossary) {
    assert.ok(!base.has(term), `基礎用語集と重複: ${term}`);
    assert.ok(desc.length > 0, term);
  }
});

/* ---------- リファレンス整合: 実装項目は supported ---------- */
test("wide F-01: reference entries for implemented functions are supported", async () => {
  const d = getDefinition("c");
  const names = [
    "btowc", "wctob",
    "iswalnum", "iswalpha", "iswblank", "iswcntrl", "iswdigit", "iswgraph",
    "iswlower", "iswprint", "iswpunct", "iswspace", "iswupper", "iswxdigit",
    "towlower", "towupper",
    "wctomb", "wcrtomb", "mblen", "mbrlen", "c16rtomb", "c32rtomb",
  ];
  for (const n of names) {
    const item = cAdvanced.reference.find((r) => r.name === n);
    assert.ok(item, `高度リファレンスに ${n} がありません`);
    assert.equal(item.status, "supported", n);
  }
});
