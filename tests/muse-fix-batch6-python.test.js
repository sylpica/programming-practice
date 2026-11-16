// 修正バッチ6（Python 班）回帰テスト。
// 対象：R27-N19（ハッシュ可能性の誤判定：関数・クラス・インスタンス・
//       range・メソッド参照・和集合型などが「ハッシュできない」と虚偽停止）
//       ／R27-N20（組み込み定数 Ellipsis・NotImplemented・__debug__ が
//       虚偽の NameError。エンジン定義＋リファレンス項目化）。
// 一次情報：実 CPython 3.12.3（当VM の python3）で全期待値を機械突合した。
// ハッシュ可能性の規則は CPython の仕様どおり：同一性でハッシュされる
// オブジェクト（関数・クラス・通常のインスタンス・メソッド参照・例外
// インスタンス等）は常時可、値でハッシュされるもの（range・frozenset・
// bytes・複素数・スライス・和集合型等）も可、list／dict／set／bytearray／
// ハッシュ不可要素を含む tuple／辞書ビューは不可。__debug__ への代入・
// 削除は SyntaxError（docs.python.org 3.12 組み込み定数の項）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { definition as d } from "../js/types/python/index.js";

const run = async (code) => d.simulate(code, structuredClone(d.model.defaults));
const outputs = (r) => (r.paths || []).flatMap((p) => p.outputs.map((o) => o.text));
const errText = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)]
    .filter(Boolean)
    .map((e) => e.message || String(e))
    .join("\n");

// ---------- R27-N19：ハッシュ可能な値がキー・集合要素になれる ----------
const HASHABLE = [
  ["builtin function as key", "d = {len: 1}\nprint(d[len])", ["1"]],
  ["builtin function set dedup", "print(len({len, len, int}))", ["2"]],
  ["exception classes in set", "print(len({ValueError, TypeError}))", ["2"]],
  ["type value via type()", "print({int: 1}[type(1)])", ["1"]],
  ["user function as key", "def f():\n    return 1\nd = {f: 'x'}\nprint(d[f])", ["x"]],
  ["class as key", "class C:\n    pass\nd = {C: 1}\nprint(d[C])", ["1"]],
  ["instance as key", "class C:\n    pass\nc = C()\nd = {c: 1}\nprint(d[c])", ["1"]],
  ["distinct instances distinct keys", "class C:\n    pass\nprint(len({C(): 1, C(): 2}))", ["2"]],
  ["range key by value", "d = {range(3): 'r'}\nprint(d[range(3)])", ["r"]],
  ["bound method key", "xs = [1]\nprint({xs.append: 3}[xs.append])", ["3"]],
  ["tuple of hashables", "print({(len, int): 1}[(len, int)])", ["1"]],
  ["union type key order-free", "print({int | str: 1}[str | int])", ["1"]],
  ["Ellipsis as key", "print({Ellipsis: 1}[Ellipsis])", ["1"]],
  ["NotImplemented as key", "print({NotImplemented: 1}[NotImplemented])", ["1"]],
  ["int/bool same key", "print({1: 'a', True: 'b'}[1])", ["b"]],
  [
    "exception instance via except-as",
    "try:\n    raise ValueError('x')\nexcept ValueError as e:\n    print(len({e}))",
    ["1"],
  ],
  ["setdefault/pop with builtin key", "d = {}\nd.setdefault(len, 7)\nprint(d.pop(len))", ["7"]],
];
for (const [label, code, want] of HASHABLE) {
  test(`R27-N19 hashable: ${label}`, async () => {
    const r = await run(code);
    assert.equal(errText(r), "", `${label}: ${errText(r)}`);
    assert.deepEqual(outputs(r), want, label);
  });
}

// ---------- R27-N19：ハッシュ不可は引き続き TypeError で名指し停止 ----------
const UNHASHABLE = [
  ["list key", "print({[1]: 1})"],
  ["list in set", "print(len({[1]}))"],
  ["tuple containing list", "print({(1, [2]): 1})"],
  ["dict as key", "print({{1: 2}: 1})"],
  ["dict keys view", "d = {1: 2}\nprint({d.keys(): 1})"],
  ["set as key", "print({{1, 2}: 1})"],
];
for (const [label, code] of UNHASHABLE) {
  test(`R27-N19 unhashable stays TypeError: ${label}`, async () => {
    const r = await run(code);
    assert.match(errText(r), /TypeError/, `${label}: ${errText(r)}`);
    assert.deepEqual(outputs(r), [], label);
  });
}

// ---------- R27-N20：組み込み定数が読める ----------
const CONSTANTS = [
  ["print(Ellipsis)", ["Ellipsis"]],
  ["print(NotImplemented)", ["NotImplemented"]],
  ["print(__debug__)", ["True"]],
  ["print(Ellipsis is Ellipsis)", ["True"]],
  ["print(Ellipsis is NotImplemented)", ["False"]],
  ["print(NotImplemented is NotImplemented)", ["True"]],
  // Ellipsis／NotImplemented への代入は実 CPython でも合法（通常の名前）。
  ["Ellipsis = 5\nprint(Ellipsis)", ["5"]],
];
for (const [code, want] of CONSTANTS) {
  test(`R27-N20 constant readable: ${code.split("\n")[0]}`, async () => {
    const r = await run(code);
    assert.equal(errText(r), "", `${code}: ${errText(r)}`);
    assert.deepEqual(outputs(r), want, code);
  });
}

// ---------- R27-N20：__debug__ への代入・削除は SyntaxError ----------
for (const [label, code] of [
  ["assign", "__debug__ = False"],
  ["delete", "del __debug__"],
]) {
  test(`R27-N20 __debug__ ${label} is SyntaxError`, async () => {
    const r = await run(code);
    assert.match(errText(r), /SyntaxError/, errText(r));
    assert.match(errText(r), /__debug__/, errText(r));
  });
}

// ---------- R27-N20：リファレンス項目化と台帳 r2 の Python 行同期 ----------
// 根拠：F-02 の規則（エンジンで実行できる名前はリファレンス項目を持つ）。
// 項目追加により Python の項目総数は 210 → 213 になる（本バッチで追加した
// Ellipsis／NotImplemented／__debug__ の3件のみ。他種の総数を固定する
// 既存テスト側の追随は統合側の作業であり、ここでは Python 側の実測を固定）。
test("R27-N20 reference items exist, run, and match r2 python rows", async () => {
  const names = ["Ellipsis", "NotImplemented", "__debug__"];
  assert.equal(d.reference.length, 215); // 213 + 修正バッチ13 Python班の属性項目2件
  for (const name of names) {
    const item = d.reference.find((x) => x.name === name);
    assert.ok(item, `reference item ${name}`);
    assert.equal(item.supported, true, `${name} supported`);
    // 項目の例が実際に動き、期待出力と一致する（F-02 の到達性）。
    const r = await run(item.example);
    assert.equal(errText(r), "", `${name} example: ${errText(r)}`);
    assert.deepEqual(outputs(r), [item.expected], `${name} example output`);
  }
  const r2 = JSON.parse(
    readFileSync(new URL("../docs/audit/reference-r2.json", import.meta.url), "utf8"),
  );
  const pyRows = r2.filter((x) => x.kind === "python");
  assert.equal(pyRows.length, d.reference.length);
  for (const name of names) {
    const row = pyRows.find((x) => x.name === name);
    assert.ok(row, `r2 python row ${name}`);
    assert.equal(row.supported, true, `r2 ${name} supported`);
    const item = d.reference.find((x) => x.name === name);
    assert.equal(row.fields.description, item.summary);
    assert.equal(row.fields.returns, item.returns);
    assert.equal(row.fields.example, item.example);
    assert.equal(row.fields.source, item.doc);
    assert.match(row.sha256, /^[0-9a-f]{64}$/);
  }
});
