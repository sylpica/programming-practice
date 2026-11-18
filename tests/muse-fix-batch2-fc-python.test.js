import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getDefinition } from "../js/types/registry.js";
const run = async (code) => {
  const d = getDefinition("python");
  return d.simulate(code, structuredClone(d.model.defaults));
};
const first = async (code) => {
  const r = await run(code);
  assert.ok(!r.error, JSON.stringify(r.error));
  assert.equal(r.paths.length, 1);
  return r.paths[0];
};
const out = (p) => p.outputs.map((o) => o.text);
const errMsg = async (code) => {
  const r = await run(code);
  const e = r.error || r.paths?.[0]?.error;
  assert.ok(e, "expected an error for: " + JSON.stringify(code));
  return e.message || String(e);
};
const py = getDefinition("python");
const cf = getDefinition("cloudformation");
const ref = (def, name) => def.reference.find((r) => r.name === name);

// ---- PY-01: set methods accept set arguments whose order is not determinable, and all arguments
test("PY-01 set.intersection with an order-undeterminable set argument computes", async () => {
  assert.deepEqual(out(await first("s = {1, 2, 3}\nprint(sorted(s.intersection({2, 3, 9})))")), ["[2, 3]"]);
  assert.deepEqual(out(await first("s = {1, 2, 3}\nprint(sorted(s.intersection({2, 3}, {3})))")), ["[3]"]);
});
test("PY-01 set methods take every argument and zero arguments return a copy", async () => {
  assert.deepEqual(out(await first("s = {1, 2, 3}\nprint(sorted(s.union({2}, {3})))")), ["[1, 2, 3]"]);
  assert.deepEqual(out(await first("s = {1, 2, 3}\nprint(sorted(s.difference({2}, {3})))")), ["[1]"]);
  assert.deepEqual(out(await first("s = {1, 2, 3}\ns.update({4}, {5})\nprint(sorted(s))")), ["[1, 2, 3, 4, 5]"]);
  assert.deepEqual(out(await first("s = {1, 2, 3}\nprint(sorted(s.union()))")), ["[1, 2, 3]"]);
  assert.deepEqual(out(await first("s = {1, 2, 3}\nprint(sorted(s.intersection()))")), ["[1, 2, 3]"]);
  assert.deepEqual(out(await first("s = {1, 2, 3}\ns.difference_update({1}, {2})\nprint(sorted(s))")), ["[3]"]);
  assert.deepEqual(out(await first("s = {1, 2, 3}\ns.intersection_update({2, 3}, {3})\nprint(sorted(s))")), ["[3]"]);
  assert.deepEqual(out(await first("s = {1, 2}\ns.update('ab')\nprint(len(s))")), ["4"]);
});

// ---- PY-02: str.isdigit follows the Unicode Digit property; isnumeric covers kanji numerals
test("PY-02 isdigit/isnumeric match CPython for fraction and digit characters", async () => {
  assert.deepEqual(out(await first("print('½'.isdigit(), '½'.isnumeric(), '²'.isdigit(), '¼'.isdigit(), '①'.isdigit(), '5'.isdigit())")), ["False True True False True True"]);
  assert.deepEqual(out(await first("print('²'.isdecimal(), 'Ⅷ'.isdigit(), 'Ⅷ'.isnumeric(), ''.isdigit(), ''.isnumeric())")), ["False False True False False"]);
  assert.deepEqual(out(await first("print('一'.isnumeric(), '十'.isnumeric(), '一'.isdigit())")), ["True True False"]);
});

// ---- PY-03 / PY-04: known non-iterables raise TypeError instead of indeterminate results
test("PY-03 list.extend with a known non-iterable is a TypeError", async () => {
  assert.match(await errMsg("xs = [1]\nxs.extend(5)"), /TypeError/);
  assert.match(await errMsg("xs = [1]\nxs.extend(None)"), /TypeError/);
});
test("PY-04 set methods, zip and join reject known non-iterables with TypeError", async () => {
  assert.match(await errMsg("s = {1, 2}\ns.update(5)"), /TypeError/);
  assert.match(await errMsg("s = {1, 2}\nprint(s.union(5))"), /TypeError/);
  assert.match(await errMsg("s = {1, 2}\nprint(s.intersection(None))"), /TypeError/);
  assert.match(await errMsg("print(list(zip(5, [1])))"), /TypeError/);
  assert.match(await errMsg("print(list(zip(None, [1])))"), /TypeError/);
  assert.match(await errMsg("print(','.join(5))"), /TypeError/);
  assert.match(await errMsg("print(','.join(None))"), /TypeError/);
});
test("PY-04 symmetric_difference takes exactly one argument", async () => {
  assert.match(await errMsg("s = {1, 2}\nprint(s.symmetric_difference({1}, {2}))"), /TypeError/);
  assert.match(await errMsg("s = {1, 2}\ns.symmetric_difference_update()"), /TypeError/);
});
test("PY-04 isinstance validates classinfo and computes determinate results", async () => {
  assert.match(await errMsg("print(isinstance(1, 5))"), /TypeError/);
  assert.match(await errMsg("print(isinstance(1, 'int'))"), /TypeError/);
  assert.match(await errMsg("print(isinstance(1, [int]))"), /TypeError/);
  assert.match(await errMsg("print(isinstance(1, None))"), /TypeError/);
  assert.match(await errMsg("print(isinstance(1, len))"), /TypeError/);
  // tuple classinfo is evaluated lazily from the front, as in CPython
  assert.deepEqual(out(await first("print(isinstance(1, (str, int)))")), ["True"]);
  assert.deepEqual(out(await first("print(isinstance(1, (int, 5)))")), ["True"]);
  assert.match(await errMsg("print(isinstance(1, (str, 5)))"), /TypeError/);
  assert.deepEqual(out(await first("print(isinstance(1, ((str,), int)))")), ["True"]);
  assert.deepEqual(out(await first("print(isinstance(1, ()))")), ["False"]);
  // union classinfo (Python 3.10+)
  assert.deepEqual(out(await first("print(isinstance(1, int | str), isinstance('a', int | str), isinstance(1.5, int | str))")), ["True True False"]);
  assert.deepEqual(out(await first("print(int | str)")), ["int | str"]);
  // object / type() / bool-is-int / exception classes
  assert.deepEqual(out(await first("print(isinstance(1, object), isinstance(None, object), isinstance(1, type(1)), isinstance(True, int), isinstance(1, float))")), ["True True True True False"]);
  assert.deepEqual(out(await first("print(isinstance(1, ValueError), isinstance(None, type(None)))")), ["False True"]);
  assert.deepEqual(out(await first("try:\n    raise ValueError('x')\nexcept ValueError as e:\n    print(isinstance(e, Exception), isinstance(e, ValueError), isinstance(e, TypeError))")), ["True True False"]);
});

// ---- R23-N9: numeric literal lexing follows the CPython grammar
test("R23-N9 invalid numeric literals are SyntaxError", async () => {
  for (const lit of ["1e", "1e+", "1e-", "1.5e", "1_", "1__0", "1_e2", "1_.5", "1._5", "1e_2", "0b102", "0o18", "0b1e", "0x1_", "0b1__0", "0o__17", "1x"]) {
    assert.match(await errMsg("print(" + lit + ")"), /SyntaxError/, lit);
  }
});
test("R23-N9 valid numeric literals keep working, including underscored exponents", async () => {
  const p = await first("print(1_000)\nprint(1e2)\nprint(1e1_0)\nprint(1.5_0)\nprint(1.5e1_0)\nprint(.5)\nprint(5.)\nprint(5.e2)\nprint(0x1_0)\nprint(0b_1)\nprint(0x_1)\nprint(077.0)\nprint(00)");
  assert.deepEqual(out(p), ["1000", "100.0", "10000000000.0", "1.5", "15000000000.0", "0.5", "5.0", "500.0", "16", "1", "1", "77.0", "0"]);
  // RG-11 leading-zero rule is preserved
  const m = await errMsg("print(0_1)");
  assert.match(m, /SyntaxError/);
  assert.ok(m.includes("0_1"), m);
});

// ---- R23-N10: a lone semicolon is a SyntaxError everywhere; one trailing semicolon is legal
test("R23-N10 empty statements are rejected, legal semicolons keep working", async () => {
  assert.match(await errMsg(";;;"), /SyntaxError/);
  assert.match(await errMsg(";x = 1"), /SyntaxError/);
  assert.match(await errMsg("x = 1;;\nprint(x)"), /SyntaxError/);
  assert.match(await errMsg("if True:\n    ;\n    print(1)"), /SyntaxError/);
  assert.match(await errMsg("if True:; print(1)"), /SyntaxError/);
  assert.match(await errMsg("def f(): ; return 1"), /SyntaxError/);
  assert.deepEqual(out(await first("x = 1;\nprint(x)")), ["1"]);
  assert.deepEqual(out(await first("x = 1; y = 2\nprint(x + y)")), ["3"]);
  assert.deepEqual(out(await first("if True: x = 1;\nprint(x)")), ["1"]);
  assert.deepEqual(out(await first("def f(): x = 1; return x\nprint(f())")), ["1"]);
});

// ---- R23-N11: assignment to a literal is a parse-time SyntaxError, never a false NameError
test("R23-N11 literal targets are SyntaxError regardless of the right-hand side", async () => {
  const m = await errMsg("1 = x");
  assert.match(m, /SyntaxError/);
  assert.doesNotMatch(m, /NameError/);
  assert.match(await errMsg("x = 5\n1 = x"), /SyntaxError/);
  assert.match(await errMsg("'a' = 5"), /SyntaxError/);
  assert.match(await errMsg("1 += 3"), /SyntaxError/);
  assert.match(await errMsg("(1, y) = (2, 3)"), /SyntaxError/);
  assert.match(await errMsg("[a, 1] = [1, 2]"), /SyntaxError/);
  assert.match(await errMsg("a = 1 = 5"), /SyntaxError/);
  assert.match(await errMsg("foo() = 3"), /SyntaxError/);
  assert.match(await errMsg("for 1 in [1, 2]:\n    pass"), /SyntaxError/);
  assert.match(await errMsg("print([x for 1 in [1]])"), /SyntaxError/);
  assert.match(await errMsg("del 1"), /SyntaxError/);
});
test("R23-N11 valid targets keep working", async () => {
  assert.deepEqual(out(await first("xs = [1, 2]\nxs[0] = 9\nprint(xs)")), ["[9, 2]"]);
  assert.deepEqual(out(await first("a, b = 1, 2\nprint(a, b)")), ["1 2"]);
  assert.deepEqual(out(await first("a = b = 5\nprint(a, b)")), ["5 5"]);
  assert.deepEqual(out(await first("a, *b = [1, 2, 3]\nprint(a, b)")), ["1 [2, 3]"]);
  assert.deepEqual(out(await first("xs = [1, 2, 3]\ndel xs[0]\nprint(xs)")), ["[2, 3]"]);
  assert.deepEqual(out(await first("for (a, b) in [(1, 2)]:\n    print(a + b)")), ["3"]);
});

// ---- R23-N6: math constants have reference items that match the real behaviour
test("R23-N6 math constant reference items exist, are supported, and their examples run", async () => {
  assert.equal(py.reference.length, 215); // +2 修正バッチ13 Python班（rangeの属性／__annotations__） // +1 修正バッチ3（R24 §3.2「数値の属性」）+44 修正バッチ4 Python追随班（例外44件）+3 修正バッチ6 R27-N20（組み込み定数 Ellipsis／NotImplemented／__debug__）
  assert.equal(cf.reference.length, 226); // +2 同項目の CloudFormation 伝播 // +1 同項目の CloudFormation 伝播 +44 例外44件の伝播 +3 修正バッチ6 R27-N20 組み込み定数の伝播
  for (const [name, expected] of [["math.pi", "3.141592653589793"], ["math.e", "2.718281828459045"], ["math.tau", "6.283185307179586"], ["math.inf", "inf"], ["math.nan", "nan"]]) {
    const item = ref(py, name);
    assert.ok(item, name);
    assert.equal(item.supported, true, name);
    assert.equal(item.expected, expected, name);
    assert.deepEqual(out(await first(item.example)), [expected], name);
  }
  assert.deepEqual(out(await first("import math\nprint(math.pi, math.e, math.tau, math.inf, math.nan)")), ["3.141592653589793 2.718281828459045 6.283185307179586 inf nan"]);
  assert.deepEqual(out(await first("from math import pi, inf\nprint(pi, inf)")), ["3.141592653589793 inf"]);
});

// ---- RA-16..RA-22: reference text corrections
// R24-N7（修正バッチ3）で例外の階層照合を実装したため、RA-16/RA-17 が固定していた
// 「完全一致のみ」「except Exception でも捕捉されてしまう」という開示は虚偽表示となり除去した。
// ここでは開示の不在と、階層照合の実挙動（親クラスで捕捉できる／BaseException 系は Exception で捕捉できない）を固定する。
test("RA-16 superseded by R24-N7: exception items no longer claim exact-name-only matching", () => {
  for (const name of ["ModuleNotFoundError", "UnicodeError", "FileNotFoundError", "LookupError", "ArithmeticError", "NameError"]) {
    assert.doesNotMatch(ref(py, name).caution, /完全一致/, name);
  }
});
test("RA-17 superseded by R24-N7: parent classes catch subclasses; Exception does not catch KeyboardInterrupt", async () => {
  assert.doesNotMatch(ref(py, "KeyboardInterrupt").caution, /except Exception でも捕捉されてしまう/);
  assert.doesNotMatch(ref(py, "Exception").caution, /except Exception でも捕捉されてしまう/);
  assert.deepEqual(out(await first("try:\n    raise IndexError('x')\nexcept LookupError:\n    print('caught')")), ["caught"]);
  assert.match(await errMsg("try:\n    raise KeyboardInterrupt()\nexcept Exception:\n    print('caught')"), /KeyboardInterrupt/);
});
test("RA-18 global item separates the global and nonlocal statements", () => {
  const g = ref(py, "global");
  assert.match(g.description, /global 文はモジュールレベル/);
  assert.match(g.description, /nonlocal 文は外側の関数/);
  assert.doesNotMatch(g.description, /モジュール全体の変数（global）や外側の関数の変数（nonlocal）を書き換えられるように宣言する/);
});
test("RA-19 comprehension and f-string returns describe their values", () => {
  assert.doesNotMatch(ref(py, "comprehension").returns, /戻り値なし/);
  assert.match(ref(py, "comprehension").returns, /リスト／集合／辞書/);
  assert.match(ref(py, "f-string").returns, /^str/);
});
test("RA-20 with is classified by its real partial-execution behaviour, caution stated once", async () => {
  const w = ref(py, "with");
  assert.equal(w.supported, true);
  assert.match(w.caution, /部分対応/);
  assert.match(w.caution, /本文は実行される/);
  assert.equal(w.caution.split("部分対応").length - 1, 1);
  assert.doesNotMatch(w.caution, /未対応として停止します/);
  // the behaviour itself is unchanged: body runs, with open(...) stops via open
  assert.deepEqual(out(await first(w.example)), ["本文を実行"]);
  assert.match(await errMsg('with open("x") as f:\n    pass'), /未対応|TypeError|NameError|停止/);
});
test("RA-21 math item discloses the determinate-computation range", () => {
  const m = ref(py, "math");
  assert.match(m.caution, /確定計算できるのは math\.sqrt／fabs／floor／ceil と定数（pi／e／tau／inf／nan）のみ/);
});
test("RA-22 dict item states the key condition as hashability", () => {
  const dk = ref(py, "dict");
  assert.match(dk.caution, /ハッシュ可能な値のみ使える/);
  assert.match(dk.caution, /リスト・辞書・集合や、それらを含むタプルはキーにできない/);
  assert.doesNotMatch(dk.caution, /変更可能な値は使えない/);
});

// ---- reference-r2 ledger stays in sync (changed rows follow the definitions, new rows exist)
test("r2 ledger rows for changed and new python items match the definitions", () => {
  const rows = JSON.parse(fs.readFileSync(new URL("../docs/audit/reference-r2.json", import.meta.url)));
  assert.equal(rows.length, 1323); // +4 修正バッチ13 Python班（属性項目2件×2種）＋統合時に C／C++ NULL項目3件・UI.Vision 3件で +6 // +2 修正バッチ3（「数値の属性」の Python 行＋CloudFormation 伝播行）+88 修正バッチ4 Python追随班（例外44件の Python 行＋CloudFormation 伝播行）+6 修正バッチ6 R27-N20（組み込み定数の Python 行＋CloudFormation 伝播行）+94 修正バッチ6 R27-N7（VBA 定数）+141 修正バッチ7 R28-N9（VBA 定数）+12 修正バッチ8（VBA 参照専用）+53 第16種 IPA擬似言語（MUSE-ADD-PSEUDO）
  assert.equal(rows.filter((r) => r.kind === "python").length, 215);
  assert.equal(rows.filter((r) => r.kind === "cloudformation").length, 226);
  const names = ["ModuleNotFoundError", "UnicodeError", "FileNotFoundError", "LookupError", "ArithmeticError", "NameError", "KeyboardInterrupt", "Exception", "global", "comprehension", "f-string", "with", "math", "dict", "math.pi", "math.e", "math.tau", "math.inf", "math.nan", "数値の属性"];
  for (const [kind, def] of [["python", py], ["cloudformation", cf]]) {
    for (const name of names) {
      const row = rows.find((r) => r.kind === kind && r.name === name);
      const item = ref(def, name);
      assert.ok(row, kind + " " + name);
      assert.deepEqual(row.fields, { description: item.description, returns: item.returns, caution: item.caution, example: item.example, source: item.source }, kind + " " + name);
      assert.equal(row.supported, item.supported, kind + " " + name);
    }
  }
  // 統合裁定：sha256 は fields の正規方式（sort_keys・ensure_ascii=False の JSON の sha256）で再計算された値に一致する
  const w = rows.find((r) => r.kind === "python" && r.name === "with");
  assert.equal(w.sha256, "f1947c28ca7b6ca59dc39bef99a072db0e9bbeeefb601420c998427ac9b957c5");
});
