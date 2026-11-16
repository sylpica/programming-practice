import { test } from "node:test";
import assert from "node:assert/strict";
import { getDefinition } from "../js/types/registry.js";

// 修正バッチ13（Python班）：Codex監査ステップ5裁定で「現行でも有効（B）」と
// された Python 系18件（R7-17, 18, 19, 59, 135, 136, 137, 138, 139, 140,
// 141, 142, 143, 146, 147, 148, 149, 151）の回帰テスト。
// 正解はすべて実 CPython 3.12.3 の実測に基づく（findings-step5-python.md）。

const py = getDefinition("python");
const run = async (code) =>
  py.simulate(code, structuredClone(py.model.defaults));
const errors = (r) =>
  [r.error, ...(r.paths || []).map((p) => p.error)].filter(Boolean);
const outputs = (r) => r.paths.map((p) => p.outputs.map((o) => o.text));
const HOST_LEAK =
  /Maximum call stack|Cannot read properties|is not a function|undefined is not/;
const out1 = async (code) => {
  const r = await run(code);
  assert.deepEqual(errors(r), [], code);
  assert.equal(r.paths.length, 1, code);
  return outputs(r)[0];
};
const errKind = async (code, kind) => {
  const r = await run(code);
  const es = errors(r);
  assert.ok(es.length > 0, "must stop: " + code);
  assert.match(es[0].message, new RegExp("^" + kind + "："), es[0].message);
  assert.doesNotMatch(es[0].message, HOST_LEAK);
  return es[0].message;
};

/* ---------- R7-17：キーワード束縛で余分な位置引数が切り捨てられていた ---------- */

test("R7-17 round/pow with excess positional args raise TypeError", async () => {
  await errKind("print(round(1, 2, 3))", "TypeError");
  await errKind("print(pow(1, 2, 3, 4))", "TypeError");
  // 正当な形は壊さない
  assert.deepEqual(await out1("print(round(2, 3))"), ["2"]);
  assert.deepEqual(await out1("print(pow(2, 3, 4))"), ["0"]);
  assert.deepEqual(await out1("print(pow(2, 3))"), ["8"]);
});

/* ---------- R7-18：メソッドの引数個数検査の欠落 ---------- */

test("R7-18 set methods enforce arity", async () => {
  await errKind("x = {1, 2}\nx.add(1, 2)", "TypeError");
  await errKind("x = {1, 2}\nx.add()", "TypeError");
  await errKind("x = {1, 2}\nx.discard()", "TypeError");
  await errKind("x = {1, 2}\nx.remove(1, 2)", "TypeError");
  await errKind("x = {1, 2}\nx.clear(1)", "TypeError");
  await errKind("x = {1, 2}\nx.pop(1)", "TypeError");
  await errKind("x = {1, 2}\nx.copy(1)", "TypeError");
  assert.deepEqual(await out1("x = {1, 2}\nx.add(3)\nprint(sorted(x))"), ["[1, 2, 3]"]);
  assert.deepEqual(await out1("x = {1, 2}\nprint(x.copy())"), ["{1, 2}"]);
});

test("R7-18 tuple.count and range.count/index enforce exactly one argument", async () => {
  await errKind("print((1, 2).count())", "TypeError");
  await errKind("print((1, 2).count(1, 2))", "TypeError");
  await errKind("print(range(3).count())", "TypeError");
  await errKind("print(range(3).index(1, 2))", "TypeError");
  await errKind("print(range(3).index())", "TypeError");
  assert.deepEqual(await out1("print((1, 2, 1).count(1))"), ["2"]);
  assert.deepEqual(await out1("print(range(5).index(2))"), ["2"]);
  // tuple.index の start/stop は実 CPython でも合法（取り違えない）
  assert.deepEqual(await out1("print((1, 2, 1).index(1, 1))"), ["2"]);
});

/* ---------- R7-19：discard/remove の unhashable は TypeError ---------- */

test("R7-19 set discard/remove of unhashable raise TypeError, not KeyError", async () => {
  const m1 = await errKind("s = {1}\ns.discard([])", "TypeError");
  assert.match(m1, /ハッシュできない/);
  const m2 = await errKind("s = {1}\ns.remove([])", "TypeError");
  assert.match(m2, /ハッシュできない/);
  await errKind("print([] in {1})", "TypeError");
  // ハッシュ可能な通常形は壊さない
  assert.deepEqual(await out1("s = {1}\ns.discard(2)\nprint(s)"), ["{1}"]);
  await errKind("s = {1}\ns.remove(2)", "KeyError");
  // 実 CPython では dict.pop([]) は KeyError（TypeError ではない）：
  // 「ついでに直す」対象ではないことを固定する
  await errKind("d = {}\nd.pop([])", "KeyError");
  assert.deepEqual(await out1('d = {}\nprint(d.pop([], 5))'), ["5"]);
});

/* ---------- R7-59：range 属性と __annotations__ の項目・チップ解決 ---------- */

test("R7-59 reference gains range attributes and __annotations__ items", () => {
  assert.equal(py.reference.length, 215);
  const r = py.reference.find((x) => x.name === "rangeの属性");
  assert.ok(r);
  assert.equal(r.example, "r = range(1, 5, 2)\nprint(r.start, r.stop, r.step)");
  const a = py.reference.find((x) => x.name === "__annotations__");
  assert.ok(a);
});

test("R7-59 attribute reads resolve in scan and trace refs", async () => {
  assert.ok(py.scan("r = range(1, 5, 2)\nprint(r.start)").includes("rangeの属性"));
  assert.ok(py.scan("print((5).real)").includes("数値の属性"));
  assert.ok(
    py.scan('def f(x: int) -> str:\n    return "a"\nprint(f.__annotations__)').includes("__annotations__"),
  );
  const r = await run("r = range(1, 5, 2)\nprint(r.start, r.stop, r.step)");
  assert.deepEqual(outputs(r)[0], ["1 5 2"]);
  const refs = r.paths[0].trace.flatMap((t) => t.refs);
  assert.ok(refs.includes("rangeの属性"), JSON.stringify(refs));
});

/* ---------- R7-135：any/all は未確定要素を既知扱いにしない ---------- */

test("R7-135 any/all with unknown elements branch both ways", async () => {
  const r1 = await run(
    'x = input()\nif any([False, x]):\n    print("T")\nelse:\n    print("F")',
  );
  assert.equal(r1.paths.length, 2);
  assert.deepEqual(outputs(r1).map((o) => o[0]).sort(), ["F", "T"]);
  const r2 = await run(
    'x = input()\nif all([True, x]):\n    print("T")\nelse:\n    print("F")',
  );
  assert.equal(r2.paths.length, 2);
  assert.deepEqual(outputs(r2).map((o) => o[0]).sort(), ["F", "T"]);
  // イテレータ経由でも同じ
  const r3 = await run(
    'x = input()\nif any(iter([False, x])):\n    print("T")\nelse:\n    print("F")',
  );
  assert.equal(r3.paths.length, 2);
});

test("R7-135 decisive elements and empty inputs still settle immediately", async () => {
  assert.deepEqual(await out1("print(any([True, input()]))"), ["True"]);
  assert.deepEqual(await out1("print(all([False, input()]))"), ["False"]);
  assert.deepEqual(await out1("print(any([]))"), ["False"]);
  assert.deepEqual(await out1("print(all([]))"), ["True"]);
  assert.deepEqual(await out1("print(any([0, '', False]))"), ["False"]);
  assert.deepEqual(await out1("print(all([1, 'a', True]))"), ["True"]);
});

/* ---------- R7-136：map/filter/zip/enumerate/iter の遅延評価 ---------- */

const COUNT_FN =
  "n = 0\ndef f(x):\n    global n\n    n = n + 1\n    return x\n";

test("R7-136 map is lazy: creation calls the function zero times", async () => {
  assert.deepEqual(await out1(COUNT_FN + "m = map(f, [1, 2, 3])\nprint(n)"), ["0"]);
  assert.deepEqual(
    await out1(COUNT_FN + "print(list(map(f, [1, 2, 3])))\nprint(n)"),
    ["[1, 2, 3]", "3"],
  );
});

test("R7-136 filter is lazy and counts predicate calls on consumption", async () => {
  const code =
    "n = 0\ndef p(x):\n    global n\n    n = n + 1\n    return x % 2 == 1\n" +
    "f = filter(p, [1, 2, 3])\nprint(n)\nprint(list(f))\nprint(n)";
  assert.deepEqual(await out1(code), ["0", "[1, 3]", "3"]);
});

test("R7-136 iter(list) and enumerate are live views", async () => {
  assert.deepEqual(
    await out1("a = [1, 2, 3, 4]\nit = iter(a)\nprint(next(it))\na[1] = 9\na.append(5)\nprint(list(it))"),
    ["1", "[9, 3, 4, 5]"],
  );
  assert.deepEqual(
    await out1("a = [1, 2]\ne = enumerate(a)\nprint(next(e))\na.append(3)\nprint(list(e))"),
    ["(0, 1)", "[(1, 2), (2, 3)]"],
  );
});

test("R7-136 zip strict checks lengths during consumption", async () => {
  assert.deepEqual(
    await out1("z = zip([1], [2, 3], strict=True)\nprint(next(z))"),
    ["(1, 2)"],
  );
  await errKind("print(list(zip([1], [2, 3], strict=True)))", "ValueError");
  assert.deepEqual(await out1("print(list(zip([1, 2], [3, 4])))"), ["[(1, 3), (2, 4)]"]);
  // 同じイテレータを2回渡すと歩調を合わせて取る（従来どおり）
  assert.deepEqual(
    await out1("it = iter([1, 2, 3, 4])\nprint(list(zip(it, it)))"),
    ["[(1, 2), (3, 4)]"],
  );
});

test("R7-136 for-loop break and any() stop consuming early", async () => {
  assert.deepEqual(
    await out1(COUNT_FN + "for v in map(f, [1, 2, 3]):\n    break\nprint(n)"),
    ["1"],
  );
  assert.deepEqual(
    await out1(COUNT_FN + "print(any(f(x) > 0 for x in [0, 5, 9]))\nprint(n)"),
    ["True", "2"],
  );
  assert.deepEqual(
    await out1(COUNT_FN + "g = (f(x) for x in [1, 2, 3])\nprint(n)\nprint(list(g))\nprint(n)"),
    ["0", "[1, 2, 3]", "3"],
  );
});

/* ---------- R7-137：enumerate の start は __index__ 契約 ---------- */

test("R7-137 enumerate start follows the __index__ contract", async () => {
  assert.deepEqual(await out1('print(list(enumerate(["a"], True)))'), ["[(1, 'a')]"]);
  await errKind('print(list(enumerate(["a"], 1.5)))', "TypeError");
  await errKind('print(list(enumerate(["a"], "3")))', "TypeError");
  assert.deepEqual(await out1('print(list(enumerate(["a"], start=2)))'), ["[(2, 'a')]"]);
  assert.deepEqual(await out1('print(list(enumerate(["a", "b"])))'), ["[(0, 'a'), (1, 'b')]"]);
});

/* ---------- R7-138：round の bool は int として通常経路を通る ---------- */

test("R7-138 round treats bool as int on both arguments", async () => {
  assert.deepEqual(await out1("print(round(True, -1))"), ["0"]);
  assert.deepEqual(await out1("print(round(True))"), ["1"]);
  assert.deepEqual(await out1("print(round(1, True))"), ["1"]);
  assert.deepEqual(await out1("print(round(2.5, True))"), ["2.5"]);
  await errKind('print(round(False, "bad"))', "TypeError");
  await errKind("print(round(1.5, 1.0))", "TypeError");
  assert.deepEqual(await out1("print(round(1.5, None))"), ["2"]);
  assert.deepEqual(await out1("print(round(2.5))"), ["2"]);
});

/* ---------- R7-139：sum の補償加算は非有限値で通常加算へ ---------- */

test("R7-139 sum handles non-finite values like CPython", async () => {
  assert.deepEqual(await out1('print(sum([float("inf")]))'), ["inf"]);
  assert.deepEqual(await out1('print(sum([float("-inf")]))'), ["-inf"]);
  assert.deepEqual(await out1("print(sum([1e308, 1e308]))"), ["inf"]);
  assert.deepEqual(await out1('print(sum([float("inf"), float("-inf")]))'), ["nan"]);
  // 有限範囲では補償加算の精度を維持する
  assert.deepEqual(await out1("print(sum([1e16, 1.0, -1e16]))"), ["1.0"]);
  assert.deepEqual(await out1("print(sum([0.1] * 10))"), ["1.0"]);
  assert.deepEqual(await out1("print(sum([1, 2, 3]))"), ["6"]);
});

/* ---------- R7-140：位置＋キーワードの重複束縛 ---------- */

test("R7-140 duplicate positional+keyword bindings raise TypeError", async () => {
  await errKind("print(sum([1], 2, start=3))", "TypeError");
  await errKind('print(int("10", 2, base=8))', "TypeError");
  await errKind("print(list(enumerate([1], 1, start=2)))", "TypeError");
  await errKind('print("a-b".split("-", 1, maxsplit=1))', "TypeError");
  await errKind('print("a-b".split("-", maxsplit=1, sep="-"))', "TypeError");
  // キーワードだけの形は合法
  assert.deepEqual(await out1('print("a-b".split(sep="-"))'), ["['a', 'b']"]);
  assert.deepEqual(await out1('print("a-b-c".split("-", maxsplit=1))'), ["['a', 'b-c']"]);
  assert.deepEqual(await out1("print(sum([1], start=2))"), ["3"]);
});

/* ---------- R7-141：min/max の default は複数位置引数と併用不可 ---------- */

test("R7-141 min/max reject default with multiple positional arguments", async () => {
  await errKind("print(min(1, 2, default=9))", "TypeError");
  await errKind("print(max(1, 2, default=9))", "TypeError");
  assert.deepEqual(await out1("print(min([], default=9))"), ["9"]);
  assert.deepEqual(await out1("print(min(3, 1, 2))"), ["1"]);
});

/* ---------- R7-142：list.sort は位置引数を受け取らない ---------- */

test("R7-142 list.sort takes no positional arguments", async () => {
  await errKind("a = [2, 1]\na.sort(9)", "TypeError");
  assert.deepEqual(await out1("a = [2, 1]\na.sort()\nprint(a)"), ["[1, 2]"]);
  assert.deepEqual(await out1("a = [2, 1]\na.sort(reverse=True)\nprint(a)"), ["[2, 1]"]);
});

/* ---------- R7-143：list.insert の番号は __index__ 契約 ---------- */

test("R7-143 list.insert index follows the __index__ contract", async () => {
  const m = await errKind("a = [10, 20]\na.insert(1.5, 99)", "TypeError");
  assert.doesNotMatch(m, /引数の数が合いません/);
  await errKind('a = [10, 20]\na.insert("1", 99)', "TypeError");
  assert.deepEqual(await out1("a = [10, 20]\na.insert(True, 99)\nprint(a)"), ["[10, 99, 20]"]);
  assert.deepEqual(await out1("a = [10, 20]\na.insert(-1, 99)\nprint(a)"), ["[10, 99, 20]"]);
  assert.deepEqual(await out1("a = [10, 20]\na.insert(100, 99)\nprint(a)"), ["[10, 20, 99]"]);
});

/* ---------- R7-146／147：startswith/endswith の遅延検査と窓 ---------- */

test("R7-146 startswith/endswith check tuple candidates lazily", async () => {
  assert.deepEqual(await out1('print("a".startswith(("a", 1)))'), ["True"]);
  assert.deepEqual(await out1('print("a".endswith(("a", 1)))'), ["True"]);
  await errKind('print("a".startswith((1, "a")))', "TypeError");
  await errKind('print("a".endswith((1, "a")))', "TypeError");
  await errKind('print("b".startswith(("a", 1)))', "TypeError");
});

test("R7-147 startswith/endswith treat [start, end) as a window", async () => {
  assert.deepEqual(await out1('print("a".startswith("", 1, 0))'), ["False"]);
  assert.deepEqual(await out1('print("a".endswith("", 1, 0))'), ["False"]);
  assert.deepEqual(await out1('print("a".startswith("", 1))'), ["True"]);
  assert.deepEqual(await out1('print("hello".startswith("ell", 1, 4))'), ["True"]);
  assert.deepEqual(await out1('print("hello".endswith("ell", 1, 4))'), ["True"]);
  assert.deepEqual(await out1('print("hello".startswith("hello", 0, 4))'), ["False"]);
  assert.deepEqual(await out1('print("hello".endswith("lo"))'), ["True"]);
});

/* ---------- R7-148：文字列分類は CPython の Unicode プロパティどおり ---------- */

test("R7-148 isalpha/isalnum/isidentifier follow CPython Unicode properties", async () => {
  // U+0345（Mn・Other_Alphabetic）は isalpha でも isalnum でもない
  assert.deepEqual(await out1('print("\u0345".isalpha())'), ["False"]);
  assert.deepEqual(await out1('print("\u0345".isalnum())'), ["False"]);
  // U+2160（Nl）は isalpha ではないが isalnum
  assert.deepEqual(await out1('print("\u2160".isalpha())'), ["False"]);
  assert.deepEqual(await out1('print("\u2160".isalnum())'), ["True"]);
  // U+00BC（No）は isalnum
  assert.deepEqual(await out1('print("\u00bc".isalnum())'), ["True"]);
  // U+037A（Lm）は isalpha だが XID_Start ではないため isidentifier ではない
  assert.deepEqual(await out1('print("\u037a".isalpha())'), ["True"]);
  assert.deepEqual(await out1('print("\u037a".isidentifier())'), ["False"]);
  // U+00AA は XID_Start
  assert.deepEqual(await out1('print("\u00aa".isidentifier())'), ["True"]);
  // 結合文字は2文字目以降なら可、ZWNJ は不可（CPython 3.12 実測）
  assert.deepEqual(await out1('print("a\u0301".isidentifier())'), ["True"]);
  assert.deepEqual(await out1('print("a\u200c".isidentifier())'), ["False"]);
  assert.deepEqual(await out1('print("a\u200d".isidentifier())'), ["False"]);
  assert.deepEqual(await out1('print("_x9".isidentifier())'), ["True"]);
  assert.deepEqual(await out1('print("9x".isidentifier())'), ["False"]);
});

test("R7-148 islower/isupper follow Lowercase/Uppercase properties with Lt excluded", async () => {
  assert.deepEqual(await out1('print("\u0345".islower())'), ["True"]); // Mn だが Lowercase
  assert.deepEqual(await out1('print("\u00aa".islower())'), ["True"]); // Lo だが Lowercase
  assert.deepEqual(await out1('print("\u2160".isupper())'), ["True"]); // Nl だが Uppercase
  assert.deepEqual(await out1('print("\u2170".islower())'), ["True"]);
  // U+01C5（Lt・タイトルケース）はどちらでもない
  assert.deepEqual(await out1('print("\u01c5".isupper())'), ["False"]);
  assert.deepEqual(await out1('print("\u01c5".islower())'), ["False"]);
  // 通常形の回帰確認
  assert.deepEqual(await out1('print("abc".islower())'), ["True"]);
  assert.deepEqual(await out1('print("ABC".isupper())'), ["True"]);
  assert.deepEqual(await out1('print("a1".islower())'), ["True"]);
  assert.deepEqual(await out1('print("1A".isupper())'), ["True"]);
  assert.deepEqual(await out1('print("Ab".isupper())'), ["False"]);
  // 処置済みの isdigit/isnumeric は不変
  assert.deepEqual(await out1('print("\u00b2".isdigit())'), ["True"]);
  assert.deepEqual(await out1('print("\u2160".isnumeric())'), ["True"]);
});

/* ---------- R7-149：tpl-strings の explain の矛盾是正 ---------- */

test("R7-149 tpl-strings explanation no longer contradicts itself", () => {
  const t = py.templates.find((x) => x.id === "tpl-strings");
  assert.ok(t);
  assert.doesNotMatch(t.intro, /新しい文字列を戻り値として返します/);
  assert.match(t.intro, /split は.*リストを返します/);
  assert.match(t.intro, /strip・join・replace は新しい文字列/);
});

/* ---------- R7-151：scan／trace／教材 refs の到達性 ---------- */

test("R7-151 scan resolves method references and drops substring false hits", () => {
  const s = py.scan('print("a,b".split(","))');
  assert.ok(s.includes("str.split"), JSON.stringify(s));
  assert.ok(s.includes("print"));
  assert.ok(!s.includes("int"), JSON.stringify(s));
  assert.ok(py.scan('s = " x "\nprint(s.strip())').includes("str.strip"));
  // 型ヒントで曖昧なメソッドも解決する
  assert.ok(py.scan("a = [1, 2]\nprint(a.count(1))").includes("list.count"));
  // ヒントが無く候補が複数ある場合は誤リンクしない
  assert.ok(!py.scan("print(x.count(1))").includes("list.count"));
});

test("R7-151 trace refs carry method items on the executed line", async () => {
  const r = await run('print("a,b".split(","))');
  const refs = r.paths[0].trace.flatMap((t) => t.refs);
  assert.ok(refs.includes("str.split"), JSON.stringify(refs));
  assert.ok(refs.includes("print"));
});

test("R7-151 template refs come from analysis, not substring matching", () => {
  const calc = py.templates.find((t) => t.id === "tpl-calc");
  assert.ok(!calc.refs.includes("int"), JSON.stringify(calc.refs));
  assert.ok(calc.refs.includes("round"));
  const strings = py.templates.find((t) => t.id === "tpl-strings");
  for (const name of ["str.strip", "str.split", "str.join", "str.replace"])
    assert.ok(strings.refs.includes(name), name + " in " + JSON.stringify(strings.refs));
  const dictCount = py.templates.find((t) => t.id === "tpl-dict-count");
  assert.ok(dictCount.refs.includes("dict.get"));
  assert.ok(dictCount.refs.includes("dict.items"));
});

/* ---------- RG-56 回帰修正：内包表記の深い式にも深さ検査が働く ---------- */
// 根本原因は、深さ上限が JS スタック溢れ（RangeError）頼みだったこと。
// R7-151 の analyzeCode が parseProgram の実行回数を増やしてパーサを
// 最適化側へ寄せ、820重括弧でも溢れなくなった内包表記形がすり抜けた。
// 修正後は parseOr の明示カウンタで決定的に止まることを、温まった
// 状態（最適化後）でも含めて固定する。

const DEEP820 = "(".repeat(820) + "1" + ")".repeat(820);
const deepErr = async (code) => {
  const r = await run(code);
  const es = errors(r);
  assert.ok(es.length > 0, "must stop with depth error: " + code.slice(0, 40));
  assert.match(es[0].message, /入れ子が深すぎ/, es[0].message);
  assert.doesNotMatch(es[0].message, /文の終わり方が正しくありません/);
  assert.doesNotMatch(es[0].message, HOST_LEAK);
};

test("RG-56fix deep iterable in every comprehension form reports depth", async () => {
  const deepList = DEEP820.replace("1", "[1]");
  await deepErr("x = [y for y in " + deepList + "]");
  await deepErr("x = {y for y in " + deepList + "}");
  await deepErr("x = {y: y for y in " + deepList + "}");
  await deepErr("x = list(y for y in " + deepList + ")");
  // 2つ目の for 節の反復対象・条件・要素式も同根として止まる
  await deepErr("x = [z for y in [1] for z in " + deepList + "]");
  await deepErr("x = [y for y in [1] if " + DEEP820 + "]");
  await deepErr("x = [" + DEEP820.replace("1", "y") + " for y in [1]]");
  await deepErr("x = {" + DEEP820.replace("1", "y") + ": 1 for y in [1]}");
});

test("RG-56fix depth check survives parser warm-up (no stack-overflow reliance)", async () => {
  // パーサを十分に温めてからでも、深さエラーが消えないこと
  for (let i = 0; i < 200; i++)
    await run("print(1 + 2)\nx = [1, 2, 3]\nprint(len(x))");
  await deepErr("x = [y for y in " + DEEP820.replace("1", "[1]") + "]");
  await deepErr("x = " + DEEP820);
  await deepErr("x = " + "abs(".repeat(1200) + "-1" + ")".repeat(1200));
});

test("RG-56fix moderate nesting in comprehensions still evaluates", async () => {
  const mid = "(".repeat(40) + "[1, 2]" + ")".repeat(40);
  assert.deepEqual(await out1("x = [y for y in " + mid + "]\nprint(x)"), ["[1, 2]"]);
  assert.deepEqual(
    await out1("x = [y * 2 for y in [1, 2] if " + "(".repeat(30) + "y > 0" + ")".repeat(30) + "]\nprint(x)"),
    ["[2, 4]"],
  );
  // R7-136 の遅延性（ジェネレータ式を any が途中で止める）が壊れていない
  assert.deepEqual(
    await out1(COUNT_FN + "print(any(f(v) > 1 for v in [1, 2, 3]))\nprint(n)"),
    ["True", "2"],
  );
});
