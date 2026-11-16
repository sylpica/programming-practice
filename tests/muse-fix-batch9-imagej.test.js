// バッチ9（imagej 班）: R30-N21〜N25 の回帰テスト。
// 一次資料は ImageJ 実ソース（GitHub imagej/ImageJ master、2026-11-16 取得）:
// Variable.java convertToDouble()、Functions.java parseDouble／parseInt／
// 文字列関数群／replace／setPixel、Interpreter.java getStringTerm、
// ImageProcessor／ByteProcessor／ShortProcessor／FloatProcessor の setf／set。
import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefinition } from '../js/types/registry.js';

const d = getDefinition('imagej');
const run = async (code, model) => d.simulate(code, model || structuredClone(d.model.defaults));
const first = async (code, model) => {
  const r = await run(code, model);
  assert.equal(r.error, undefined, code + ' -> ' + (r.error && r.error.message));
  assert.equal(r.paths.length, 1, code);
  const p = r.paths[0];
  assert.equal(p.error, undefined, code + ' -> ' + (p.error && p.error.message));
  return p;
};
const outputs = (p) => p.outputs.map((o) => o.text);
const errors = (r) => {
  const list = [];
  if (r.error) list.push(r.error.message);
  for (const p of r.paths || []) if (p.error) list.push(p.error.message);
  return list;
};

/* ---------- R30-N21: 暗黙の文字列→数値変換は全体変換（Variable.java） ---------- */

test('R30-N21 partial parses are not performed: trailing junk makes the whole conversion NaN', async () => {
  assert.deepEqual(outputs(await first('print(abs("5abc"));')), ['NaN']);
  assert.deepEqual(outputs(await first('print(pow("2x", "3"));')), ['NaN']);
  assert.deepEqual(outputs(await first('print(Math.sqrt("16px"));')), ['NaN']);
  assert.deepEqual(outputs(await first('print(round("2.6kg"));')), ['NaN']);
  assert.deepEqual(outputs(await first('print(floor("3.9x"));')), ['NaN']);
  assert.deepEqual(outputs(await first('print(minOf("3x", 10));')), ['NaN']);
  assert.deepEqual(outputs(await first('x = "5 abc"; print(x * 2);')), ['NaN']);
});

test('R30-N21 unreadable strings are the definite value NaN, not undetermined', async () => {
  assert.deepEqual(outputs(await first('print(abs("abc"));')), ['NaN']);
  assert.deepEqual(outputs(await first('print(abs(""));')), ['NaN']);
  assert.deepEqual(outputs(await first('print(isNaN("abc"));')), ['1']);
  assert.deepEqual(outputs(await first('print(isNaN("5abc"));')), ['1']);
});

test('R30-N21 whole-string conversions that Java accepts keep working', async () => {
  assert.deepEqual(outputs(await first('print(abs(" 5 "));')), ['5']);
  assert.deepEqual(outputs(await first('print(abs("-3.5"));')), ['3.5']);
  assert.deepEqual(outputs(await first('print(abs("1e2"));')), ['100']);
  assert.deepEqual(outputs(await first('print(abs("Infinity"));')), ['Infinity']);
  assert.deepEqual(outputs(await first('print(isNaN("NaN"));')), ['1']);
});

test('R30-N21 converted indexes and loop conditions follow the NaN value', async () => {
  // charCodeAt("ABC", "1x"): 位置は NaN→(int)変換で 0 になるため 'A' = 65
  assert.deepEqual(outputs(await first('print(charCodeAt("ABC", "1x"));')), ['65']);
  // 配列添字 "1x" も NaN→0 となり先頭要素を指す（部分パースで要素1にはならない）
  assert.deepEqual(outputs(await first('a = newArray(10, 20, 30); print(a["1x"]);')), ['10']);
  // for の初期値 "1x" は NaN で、NaN < 3 は false となりループは実行されない
  assert.deepEqual(outputs(await first('for (i = "1x"; i < 3; i++) print("loop"); print("done");')), ['done']);
});

/* ---------- R30-N22: parseFloat／parseInt は Functions.parseDouble の空白規則 ---------- */

test('R30-N22 parseFloat/parseInt read the first space-separated token', async () => {
  assert.deepEqual(outputs(await first('print(parseFloat("12 abc"));')), ['12']);
  assert.deepEqual(outputs(await first('print(parseFloat("1 2"));')), ['1']);
  assert.deepEqual(outputs(await first('print(parseFloat(" 12 abc "));')), ['12']);
  assert.deepEqual(outputs(await first('print(parseInt("12 abc"));')), ['12']);
  assert.deepEqual(outputs(await first('print(parseInt("1 2"));')), ['1']);
});

test('R30-N22 the token is still whole-converted, and parseInt still rounds', async () => {
  assert.deepEqual(outputs(await first('print(parseFloat("5abc"));')), ['NaN']);
  assert.deepEqual(outputs(await first('print(parseFloat("abc"));')), ['NaN']);
  assert.deepEqual(outputs(await first('print(parseInt("3.9"));')), ['4']);
  assert.deepEqual(outputs(await first('print(parseInt("-3.5"));')), ['-3']);
  assert.deepEqual(outputs(await first('print(parseFloat(12.5));')), ['12.5']);
});

test('R30-N22 implicit conversion does NOT use the space rule (separate path from N21)', async () => {
  // 同じ "12 abc" でも、暗黙変換（Variable の全体変換）では NaN のまま
  assert.deepEqual(outputs(await first('print(abs("12 abc"));')), ['NaN']);
});

/* ---------- R30-N23: 文字列関数の第1引数は数値を文字列化する ---------- */

test('R30-N23 string functions stringify a numeric first argument', async () => {
  assert.deepEqual(outputs(await first('print(startsWith(123, "1"));')), ['1']);
  assert.deepEqual(outputs(await first('print(startsWith(123, "2"));')), ['0']);
  assert.deepEqual(outputs(await first('print(endsWith(123, "3"));')), ['1']);
  assert.deepEqual(outputs(await first('print(substring(12345, 1, 3));')), ['23']);
  assert.deepEqual(outputs(await first('print(indexOf(12321, "32"));')), ['2']);
  assert.deepEqual(outputs(await first('print(lastIndexOf(12321, "2"));')), ['3']);
  assert.deepEqual(outputs(await first('print(replace(111, "1", "9"));')), ['999']);
  assert.deepEqual(outputs(await first('print(toLowerCase(123));')), ['123']);
  assert.deepEqual(outputs(await first('print(toUpperCase(123));')), ['123']);
  assert.deepEqual(outputs(await first('print(trim(123));')), ['123']);
  assert.deepEqual(outputs(await first('print(charCodeAt(123, 0));')), ['49']);
  assert.deepEqual(outputs(await first('a = split(123); print(a.length);')), ['1']);
  assert.deepEqual(outputs(await first('print(String.trim(123));')), ['123']);
});

test('R30-N23 numeric receiver of method-style string calls is stringified too', async () => {
  assert.deepEqual(outputs(await first('s = 123; print(s.startsWith("1"));')), ['true']);
  assert.deepEqual(outputs(await first('s = 12345; print(s.substring(1, 3));')), ['23']);
});

/* テスト是正（修正バッチ13・R7-31）: 旧版のこのテストは lengthOf(123) → 3
   （数値を文字列化して長さを返す）を正として固定していたが、一次情報
   （Functions.java の lengthOf 実装: 文字列定数／文字列関数／変数（文字列値
   または配列）のみ受理し、数値は default 分岐で "String or array expected"
   エラー。数値変数も Variable.getString() が null のため同エラー）と矛盾
   するため、実物どおりエラー停止へ是正した。startsWith 等の他関数
   （getString 系で文字列化が正）は別経路であり、上の R30-N23 の断定は
   そのまま維持する */
test('R30-N23 corrected by R7-31: lengthOf does NOT stringify numbers (Functions.java)', async () => {
  for (const code of ['print(lengthOf(123));', 'print(lengthOf(1.5));', 'x = 123; print(lengthOf(x));']) {
    const r = await run(code + ' print("after");');
    assert.ok(errors(r).some((m) => /lengthOf には文字列か配列が必要です/.test(m)), code + ' -> ' + JSON.stringify(errors(r)));
    assert.ok(!JSON.stringify(r.paths).includes('after'), code);
  }
  // 文字列と配列は従来どおり長さを返す
  assert.deepEqual(outputs(await first('print(lengthOf("abc"));')), ['3']);
  assert.deepEqual(outputs(await first('a = newArray(1, 2, 3); print(lengthOf(a));')), ['3']);
});

/* ---------- R30-N24: replace の正規表現経路は Java のエラー意味論 ---------- */

test('R30-N24 an invalid regex pattern stops the macro (PatternSyntaxException)', async () => {
  const r = await run('print(replace("abc", "a(", "x")); print("after");');
  assert.ok(errors(r).some((m) => /正規表現パターン/.test(m)), JSON.stringify(errors(r)));
  assert.ok(!JSON.stringify(r.paths).includes('after'));
});

test('R30-N24 $& in the replacement stops the macro (IllegalArgumentException)', async () => {
  const r = await run('print(replace("abcabc", "ab", "$&")); print("after");');
  assert.ok(errors(r).some((m) => /置換文字列/.test(m)), JSON.stringify(errors(r)));
  assert.ok(!JSON.stringify(r.paths).includes('after'));
});

test('R30-N24 a reference to a non-existent group stops the macro (IndexOutOfBoundsException)', async () => {
  const r = await run('print(replace("abc", "a.", "$1")); print("after");');
  assert.ok(errors(r).some((m) => /存在しないグループ/.test(m)), JSON.stringify(errors(r)));
  assert.ok(!JSON.stringify(r.paths).includes('after'));
});

test('R30-N24 valid group references follow Java rules ($0 is the whole match)', async () => {
  assert.deepEqual(outputs(await first('print(replace("abcabc", "(a)(b)", "$2$1"));')), ['bacbac']);
  assert.deepEqual(outputs(await first('print(replace("abcabc", "ab", "$0"));')), ['abcabc']);
  assert.deepEqual(outputs(await first('print(replace("a1b2", "([0-9])", "[$1]"));')), ['a[1]b[2]']);
  // グループが2個のとき $10 は「グループ1＋文字 0」（JDK の桁取り規則）
  assert.deepEqual(outputs(await first('print(replace("abcabc", "(a)(b)", "$10"));')), ['a0ca0c']);
});

test('R30-N24 the replacement string is not validated when nothing matches (Java timing)', async () => {
  assert.deepEqual(outputs(await first('print(replace("xyz", "a.", "$&")); print("after2");')), ['xyz', 'after2']);
});

test('R30-N24 one-character patterns stay literal, including a literal $ replacement', async () => {
  // Functions.replace は pattern が1文字なら文字どおり置換し、$ を解釈しない
  assert.deepEqual(outputs(await first('print(replace("a+b", "+", "XYZ"));')), ['aXYZb']);
  assert.deepEqual(outputs(await first('print(replace("abc", "b", "$0"));')), ['a$0c']);
  assert.deepEqual(outputs(await first('print(replace("abc", "b", "x$"));')), ['ax$c']);
});

test('R30-N24 backslash escapes the next character in the replacement (regex path)', async () => {
  // マクロ文字列 "x\\y" の値は x\y。Java の置換では \ が次の1文字を文字どおりにするため xy になる
  assert.deepEqual(outputs(await first('print(replace("abc", "bc", "x\\\\y"));')), ['axy']);
  // 1文字パターン経路では置換文字列をそのまま連結する（\ もそのまま残る）
  assert.deepEqual(outputs(await first('print(replace("abc", "b", "x\\\\y"));')), ['ax\\yc']);
});

test('R30-N24 an empty pattern goes through replaceAll like Java', async () => {
  assert.deepEqual(outputs(await first('print(replace("abc", "", "x"));')), ['xaxbxcx']);
});

/* ---------- R30-N25: setPixel の画素型ごとの範囲変換（putPixel のクランプ規則） ----------
   バッチ9統合側の再裁定（2026-11-16）: マクロ setPixel(x, y, value) は Functions.java の
   setPixel() が (int) 変換して putPixel へ渡す経路であり、ByteProcessor.putPixel／
   ShortProcessor.putPixel は javadoc 明記のとおり範囲外をクランプしてからキャストする。
   R30 所見 F01A-N8 の期待値（キャスト折り返し）は putPixel のクランプ行の見落としのため、
   一次情報（現行 master 実ソース）に基づきクランプへ是正した。折り返しは setf 経由の
   2引数形の規則であり、本エンジンの setPixel（3引数形のみ）には適用しない。 */

test('R30-N25 8-bit setPixel clamps like ByteProcessor.putPixel', async () => {
  assert.deepEqual(outputs(await first('setPixel(0, 0, 300); print(getPixel(0, 0));')), ['255']);
  assert.deepEqual(outputs(await first('setPixel(0, 0, -5); print(getPixel(0, 0));')), ['0']);
  assert.deepEqual(outputs(await first('setPixel(0, 0, 256); print(getPixel(0, 0));')), ['255']);
  assert.deepEqual(outputs(await first('setPixel(0, 0, 255); print(getPixel(0, 0));')), ['255']);
  // (int) 切捨てが先: 300.9 → 300 → クランプで 255
  assert.deepEqual(outputs(await first('setPixel(0, 0, 300.9); print(getPixel(0, 0));')), ['255']);
});

test('R30-N25 16-bit setPixel clamps like ShortProcessor.putPixel', async () => {
  const code = 'newImage("s16", "16-bit black", 10, 10, 1); setPixel(0, 0, 70000); print(getPixel(0, 0)); setPixel(0, 0, -5); print(getPixel(0, 0)); setPixel(0, 0, 65535); print(getPixel(0, 0));';
  assert.deepEqual(outputs(await first(code)), ['65535', '0', '65535']);
});

test('R30-N25 32-bit float setPixel keeps the value (no range conversion)', async () => {
  const code = 'newImage("f32", "32-bit black", 10, 10, 1); setPixel(0, 0, 1.5); print(getPixel(0, 0)); setPixel(0, 0, 300); print(getPixel(0, 0));';
  assert.deepEqual(outputs(await first(code)), ['1.5', '300']);
});

test('R30-N25 RGB setPixel keeps the packed int value', async () => {
  const code = 'newImage("rgb", "RGB black", 10, 10, 1); setPixel(0, 0, 16711680); print(getPixel(0, 0));';
  assert.deepEqual(outputs(await first(code)), ['16711680']);
});
