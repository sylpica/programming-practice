/* 統合第4弾（修正バッチ17）の統合是正の回帰テスト。
 *
 * 是正1（横断班 §5-5 の後退）: analyzeCode の exprHint が二項・単項
 * 演算の結果型を推論せず、演算式レシーバのメソッド解決は短名の一意性
 * だけが頼りだった。B7 統合で numbers.Complex.conjugate が増えた時点
 * で (3+4j).conjugate() の候補が2件になり解決が失われた（49034f2 で
 * は候補1件で偶然解決していた。統合再測: 是正前 scan 222/291、
 * 是正後 225/291 で complex.real／imag も回復）。数値の型昇格
 * （complex > float > int、真除算は int 同士でも float）と列の連結・
 * 反復を推論対象にする。
 *
 * 是正2（横断班 §5-6 の残存）: メソッド呼び出しの結果型が伝播せず、
 * ys = xs.copy() の後に ys.append(3) を書くと、高度カタログで同名
 * メソッドの候補が増えた分だけ解決が失われていた（簡易では偶然解決
 * していた）。解決できた項目の returns 宣言（「list: ...」の型接頭辞）
 * から結果型を得る。接頭辞が既知の型名でない場合は従来どおり解決
 * しない（誤リンクにしない）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";
import { loadAdvanced } from "../js/core/advanced-loader.js";
import { mergeCatalog } from "../js/core/catalog.js";
import "../js/types/python/advanced-engine.js";

const py = getDefinition("python");
const baseReference = py.reference;
const adv = await loadAdvanced(py);
const merged = mergeCatalog(
  { reference: py.reference, templates: py.templates, glossary: py.glossary },
  adv,
);

const scanWith = (catalogRef, code) => {
  if (catalogRef) py.__catalogReference = catalogRef;
  else delete py.__catalogReference;
  return py.scan(code);
};
const baseExample = (name) =>
  baseReference.find((r) => r.name === name)?.example;

test("統合是正1: 複素数リテラルの演算式レシーバが complex の項目へ解決される", () => {
  const scan = scanWith(merged.reference, "print((3+4j).conjugate())");
  assert.ok(scan.includes("complex.conjugate"), JSON.stringify(scan));
  assert.ok(scan.includes("complex.real") || true); // real は属性形の別項目
  const scanAttr = scanWith(
    merged.reference,
    "print((3+4j).real, (3+4j).imag)",
  );
  assert.ok(scanAttr.includes("complex.real"), JSON.stringify(scanAttr));
  assert.ok(scanAttr.includes("complex.imag"), JSON.stringify(scanAttr));
});

test("統合是正1: 単項マイナスの複素数リテラルも complex へ解決される", () => {
  const scan = scanWith(merged.reference, "print((-4j).conjugate())");
  assert.ok(scan.includes("complex.conjugate"), JSON.stringify(scan));
});

test("統合是正1: 真除算の結果は float、整数演算の結果は int へ解決される", () => {
  const scanF = scanWith(merged.reference, "print((4/2).is_integer())");
  assert.ok(scanF.includes("float.is_integer"), JSON.stringify(scanF));
  const scanI = scanWith(merged.reference, "print((1+2).bit_length())");
  assert.ok(scanI.includes("int.bit_length"), JSON.stringify(scanI));
});

test("統合是正1: 演算結果を代入した変数にも型が伝播する", () => {
  const scan = scanWith(
    merged.reference,
    "z = 3+4j\nprint(z.conjugate())",
  );
  assert.ok(scan.includes("complex.conjugate"), JSON.stringify(scan));
});

test("統合是正1: 文字列連結の結果は str へ解決される", () => {
  const scan = scanWith(merged.reference, "print(('a'+'b').upper())");
  assert.ok(scan.includes("str.upper"), JSON.stringify(scan));
});

test("統合是正2: copy() の結果型が伝播し、高度でも基礎の scan 解決が保たれる", () => {
  for (const [item, method] of [
    ["list.copy", "list.append"],
    ["set.copy", "set.add"],
  ]) {
    const code = baseExample(item);
    assert.ok(code, item + " の example が存在する");
    const simple = scanWith(null, code);
    const advanced = scanWith(merged.reference, code);
    assert.ok(simple.includes(method), `簡易 ${item}: ${JSON.stringify(simple)}`);
    assert.ok(
      advanced.includes(method),
      `高度 ${item}: ${JSON.stringify(advanced)}`,
    );
    assert.ok(advanced.includes(item), `高度 ${item} 自身: ${JSON.stringify(advanced)}`);
  }
});

test("統合是正2: import 経由の基礎項目も高度で解決が保たれる（§5-6 対照）", () => {
  for (const item of ["math.sqrt", "numpy.array"]) {
    const code = baseExample(item);
    const advanced = scanWith(merged.reference, code);
    assert.ok(
      advanced.includes(item),
      `高度 ${item}: ${JSON.stringify(advanced)}`,
    );
  }
});
